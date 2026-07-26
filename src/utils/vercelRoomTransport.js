import ACTIONS from '../Actions';

const POLL_INTERVAL = 1000;
const HEARTBEAT_INTERVAL = 12000;
const CODE_DEBOUNCE = 180;

const createClientId = () =>
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

class PollingRoomTransport {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.id = createClientId();
        this.connected = false;
        this.listeners = new Map();
        this.clients = new Map();
        this.roomId = '';
        this.username = '';
        this.clientToken = '';
        this.hostKey = '';
        this.lastRevision = '';
        this.lastStateVersion = '';
        this.failures = 0;
    }

    on(event, callback) {
        const callbacks = this.listeners.get(event) || new Set();
        callbacks.add(callback);
        this.listeners.set(event, callbacks);
        return this;
    }

    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
        return this;
    }

    removeAllListeners() {
        this.listeners.clear();
    }

    notify(event, payload) {
        this.listeners.get(event)?.forEach((callback) => callback(payload));
    }

    connect() {
        if (this.connected) return;
        this.connected = true;
        queueMicrotask(() => this.notify('connect'));
    }

    disconnect() {
        window.clearInterval(this.pollTimer);
        window.clearInterval(this.heartbeatTimer);
        window.clearTimeout(this.codeTimer);

        if (this.roomId && this.clientToken) {
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(
                    this.withCredentials({ action: 'leave' })
                ),
                keepalive: true,
            }).catch(() => undefined);
        }

        this.connected = false;
        this.notify('disconnect', 'io client disconnect');
    }

    emit(event, payload = {}) {
        if (event === ACTIONS.JOIN) {
            this.join(payload);
        } else if (event === ACTIONS.CODE_CHANGE) {
            this.scheduleCodeUpdate(payload);
        } else if (event === ACTIONS.SESSION_COMMAND) {
            this.sendCommand(payload);
        }
        return this;
    }

    withCredentials(body) {
        return {
            ...body,
            roomId: this.roomId,
            clientId: this.id,
            clientToken: this.clientToken,
        };
    }

    async request(body) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(this.withCredentials(body)),
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const error = new Error(
                result.message || `Sync request failed (${response.status})`
            );
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    async join({
        roomId,
        username,
        clientToken,
        hostKey,
        createRoom,
        mode,
    }) {
        this.roomId = roomId;
        this.username = username;
        this.clientToken = clientToken;
        this.hostKey = hostKey || '';
        this.startPolling();

        try {
            const state = await this.request({
                action: createRoom ? 'create' : 'join',
                username,
                hostKey: this.hostKey,
                mode,
            });
            this.applyState(state, username);
            this.failures = 0;
        } catch (error) {
            this.connected = false;
            this.notify('room-error', { message: error.message });
            this.notify('connect_error', error);
        }
    }

    startPolling() {
        window.clearInterval(this.pollTimer);
        window.clearInterval(this.heartbeatTimer);
        this.pollTimer = window.setInterval(() => this.poll(), POLL_INTERVAL);
        this.heartbeatTimer = window.setInterval(
            () => this.heartbeat(),
            HEARTBEAT_INTERVAL
        );
    }

    async poll() {
        if (!this.roomId || !this.clientToken || document.hidden) return;

        try {
            const query = new URLSearchParams({
                roomId: this.roomId,
                clientId: this.id,
                clientToken: this.clientToken,
            });
            const response = await fetch(`${this.endpoint}?${query}`);
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(
                    body.message || `Sync poll failed (${response.status})`
                );
            }
            this.applyState(await response.json());

            if (!this.connected) {
                this.connected = true;
                this.notify('connect');
            }
            this.failures = 0;
        } catch (error) {
            this.failures += 1;
            if (this.failures === 3) {
                this.connected = false;
                this.notify('connect_error', error);
            }
        }
    }

    async heartbeat() {
        if (!this.connected || !this.roomId || !this.clientToken) return;
        try {
            await this.request({ action: 'heartbeat' });
        } catch (error) {
            // Polling owns visible connection-state reporting and retries.
        }
    }

    scheduleCodeUpdate({ code, revision, language }) {
        window.clearTimeout(this.codeTimer);
        this.lastRevision = revision;
        this.codeTimer = window.setTimeout(async () => {
            try {
                await this.request({
                    action: 'code',
                    code,
                    revision,
                    language,
                    eventId: revision,
                });
            } catch (error) {
                this.connected = false;
                this.notify('room-error', { message: error.message });
                this.notify('connect_error', error);
            }
        }, CODE_DEBOUNCE);
    }

    async sendCommand(command) {
        try {
            const state = await this.request(command);
            if (state?.stateVersion) {
                this.applyState(
                    state,
                    undefined,
                    command.action === 'restore'
                );
            }
        } catch (error) {
            this.notify('room-error', { message: error.message });
        }
    }

    applyState(state = {}, joinedUser, forceCode = false) {
        const {
            clients = [],
            code = '',
            revision = '',
            authorId = '',
            stateVersion = '',
        } = state;
        const nextClients = new Map(
            clients.map((client) => [client.socketId, client])
        );

        this.clients.forEach((client, socketId) => {
            if (!nextClients.has(socketId)) {
                this.notify(ACTIONS.DISCONNECTED, {
                    socketId,
                    username: client.username,
                });
            }
        });

        const addedClient = clients.find(
            (client) => !this.clients.has(client.socketId)
        );
        if (joinedUser || addedClient) {
            this.notify(ACTIONS.JOINED, {
                clients,
                username: joinedUser || addedClient.username,
                socketId: addedClient?.socketId || this.id,
            });
        }
        this.clients = nextClients;

        if (revision && revision !== this.lastRevision) {
            this.lastRevision = revision;
            if (forceCode || authorId !== this.id) {
                this.notify(ACTIONS.CODE_CHANGE, { code, revision });
            }
        }

        if (!stateVersion || stateVersion !== this.lastStateVersion) {
            this.lastStateVersion = stateVersion;
            this.notify(ACTIONS.SESSION_STATE, state);
        }
    }
}

export class VercelRoomTransport extends PollingRoomTransport {
    constructor(endpoint = '/api/room-sync') {
        super(endpoint);
    }
}
