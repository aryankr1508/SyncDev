import ACTIONS from '../Actions';

const POLL_INTERVAL = 1000;
const HEARTBEAT_INTERVAL = 12000;
const CODE_DEBOUNCE = 180;

const createClientId = () =>
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class NetlifyRoomTransport {
    constructor(endpoint = '/.netlify/functions/room-sync') {
        this.endpoint = endpoint;
        this.id = createClientId();
        this.connected = false;
        this.listeners = new Map();
        this.clients = new Map();
        this.roomId = '';
        this.username = '';
        this.lastRevision = '';
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

        if (this.roomId) {
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    action: 'leave',
                    roomId: this.roomId,
                    clientId: this.id,
                }),
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
            this.scheduleCodeUpdate(payload.code);
        }
        return this;
    }

    async request(body) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || `Sync request failed (${response.status})`);
        }
        return response.json();
    }

    async join({ roomId, username }) {
        this.roomId = roomId;
        this.username = username;
        this.startPolling();

        try {
            const state = await this.request({
                action: 'join',
                roomId,
                username,
                clientId: this.id,
            });
            this.applyState(state, username);
            this.failures = 0;
        } catch (error) {
            this.connected = false;
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
        if (!this.roomId || document.hidden) return;

        try {
            const query = new URLSearchParams({
                roomId: this.roomId,
                clientId: this.id,
            });
            const response = await fetch(`${this.endpoint}?${query}`);
            if (!response.ok) throw new Error(`Sync poll failed (${response.status})`);
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
        if (!this.connected || !this.roomId) return;
        try {
            await this.request({
                action: 'heartbeat',
                roomId: this.roomId,
                username: this.username,
                clientId: this.id,
            });
        } catch (error) {
            // Polling owns visible connection-state reporting and retries.
        }
    }

    scheduleCodeUpdate(code) {
        window.clearTimeout(this.codeTimer);
        this.codeTimer = window.setTimeout(async () => {
            const revision = `${Date.now()}-${this.id}`;
            this.lastRevision = revision;
            try {
                await this.request({
                    action: 'code',
                    roomId: this.roomId,
                    clientId: this.id,
                    code,
                    revision,
                });
            } catch (error) {
                this.connected = false;
                this.notify('connect_error', error);
            }
        }, CODE_DEBOUNCE);
    }

    applyState({ clients = [], code = '', revision = '', authorId = '' }, joinedUser) {
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
            if (authorId !== this.id) this.notify(ACTIONS.CODE_CHANGE, { code });
        }
    }
}
