const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const {
    ASSIGNABLE_ROLES,
    EDIT_POLICIES,
    LIMITS,
    MODES,
    canEdit,
    cleanRunMetadata,
    createExpiry,
    createId,
    hashSecret,
    isEditorRole,
    isSafeId,
    normalize,
    snapshotCode,
} = require('./server/session-protocol');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || true,
        methods: ['GET', 'POST'],
    },
});

const rooms = new Map();
const clients = new Map();

const createRoom = ({ roomId, hostKey, mode }) => ({
    roomId,
    hostKeyHash: hashSecret(hostKey),
    mode: MODES.has(mode) ? mode : 'interview',
    editPolicy: 'everyone',
    language: 'javascript',
    code: '',
    revision: '',
    authorId: '',
    events: [],
    tests: [],
    codeEventTimer: null,
    createdAt: new Date().toISOString(),
    expiresAt: createExpiry(),
    updatedAt: new Date().toISOString(),
});

const recordEvent = (
    room,
    { type, revision, actor, code = '', metadata = {}, eventId }
) => {
    const id = normalize(eventId, 160) || createId();
    if (room.events.some((event) => event.id === id)) return;
    room.events.push({
        id,
        type,
        revision: normalize(revision, 160),
        actorId: actor.clientId,
        actorName: actor.username,
        code: snapshotCode(code),
        metadata,
        createdAt: new Date().toISOString(),
    });
    room.events = room.events.slice(-LIMITS.events);
    room.updatedAt = new Date().toISOString();
};

const roomClients = (roomId) =>
    Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map((socketId) => clients.get(socketId))
        .filter(Boolean)
        .map((client) => ({
            socketId: client.clientId,
            username: client.username,
            role: client.role,
        }));

const getSessionState = (room, client) => {
    const visibleTests = room.tests
        .filter((test) => client.role === 'host' || !test.hidden)
        .map((test) => ({ ...test }));
    const connectedClients = roomClients(room.roomId);
    const latestEvent = room.events[room.events.length - 1];

    return {
        clients: connectedClients,
        code: room.code,
        revision: room.revision,
        authorId: room.authorId,
        mode: room.mode,
        editPolicy: room.editPolicy,
        language: room.language,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        currentUserRole: client.role,
        events: room.events,
        tests: visibleTests,
        hiddenTestCount: room.tests.filter((test) => test.hidden).length,
        stateVersion: [
            room.updatedAt,
            latestEvent?.id || '',
            connectedClients
                .map((entry) => `${entry.socketId}:${entry.role}`)
                .join('|'),
            visibleTests.map((test) => test.id).join('|'),
        ].join(':'),
    };
};

const emitSessionState = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    Array.from(io.sockets.adapter.rooms.get(roomId) || []).forEach(
        (socketId) => {
            const client = clients.get(socketId);
            if (client) {
                io.to(socketId).emit(
                    ACTIONS.SESSION_STATE,
                    getSessionState(room, client)
                );
            }
        }
    );
};

const emitJoined = (roomId, joinedClient) => {
    const connectedClients = roomClients(roomId);
    connectedClients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
            clients: connectedClients,
            username: joinedClient.username,
            socketId: joinedClient.clientId,
        });
    });
};

const reject = (socket, message) => {
    socket.emit('room-error', { message });
};

const requireHost = (socket, client) => {
    if (client.role !== 'host') {
        reject(socket, 'Only the room host can perform this action.');
        return false;
    }
    return true;
};

app.get('/health', (request, response) => {
    response.json({
        status: 'ok',
        connectedClients: io.engine.clientsCount,
        activeRooms: rooms.size,
        sessionProtocol: 2,
    });
});

const isDevelopmentServer =
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'server:dev';

if (isDevelopmentServer) {
    app.get('/', (request, response) => {
        response.json({
            service: 'SyncDev realtime server',
            status: 'ok',
            frontend: 'http://localhost:3000',
        });
    });
} else {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (request, response) => {
        response.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on(
        ACTIONS.JOIN,
        ({
            roomId,
            username,
            clientToken,
            hostKey,
            createRoom: shouldCreate,
            mode,
        } = {}) => {
            const normalizedRoomId = normalize(roomId, LIMITS.roomId);
            const normalizedUsername = normalize(username, LIMITS.username);
            const normalizedToken = normalize(clientToken, LIMITS.token);
            const normalizedHostKey = normalize(hostKey, LIMITS.token);

            if (
                !normalizedRoomId ||
                !normalizedUsername ||
                !normalizedToken ||
                !isSafeId(normalizedRoomId)
            ) {
                reject(socket, 'Room ID, display name, and session token are required.');
                return;
            }

            let room = rooms.get(normalizedRoomId);
            if (shouldCreate) {
                if (!normalizedHostKey) {
                    reject(socket, 'A host credential is required to create a room.');
                    return;
                }
                if (
                    room &&
                    room.hostKeyHash !== hashSecret(normalizedHostKey)
                ) {
                    reject(socket, 'A room with this ID already exists.');
                    return;
                }
                if (!room) {
                    room = createRoom({
                        roomId: normalizedRoomId,
                        hostKey: normalizedHostKey,
                        mode,
                    });
                    rooms.set(normalizedRoomId, room);
                }
            } else if (!room) {
                reject(
                    socket,
                    'Room not found. Ask the host to create it before joining.'
                );
                return;
            }

            const role =
                normalizedHostKey &&
                room.hostKeyHash === hashSecret(normalizedHostKey)
                    ? 'host'
                    : 'participant';
            const client = {
                socketId: socket.id,
                clientId: socket.id,
                username: normalizedUsername,
                tokenHash: hashSecret(normalizedToken),
                role,
                roomId: normalizedRoomId,
            };
            clients.set(socket.id, client);
            socket.join(normalizedRoomId);
            room.updatedAt = new Date().toISOString();

            if (
                shouldCreate &&
                room.events.length === 0 &&
                role === 'host'
            ) {
                recordEvent(room, {
                    type: 'settings',
                    revision: '',
                    actor: client,
                    metadata: { action: 'created', mode: room.mode },
                });
            }

            emitJoined(normalizedRoomId, client);
            if (room.revision || room.code) {
                socket.emit(ACTIONS.CODE_CHANGE, {
                    code: room.code,
                    revision: room.revision,
                });
            }
            emitSessionState(normalizedRoomId);
        }
    );

    socket.on(
        ACTIONS.CODE_CHANGE,
        ({ roomId, code, revision, language, eventId } = {}) => {
            const client = clients.get(socket.id);
            const room = rooms.get(normalize(roomId, LIMITS.roomId));
            if (!client || !room || client.roomId !== room.roomId) return;
            if (
                !canEdit(client.role, room.editPolicy)
            ) {
                reject(socket, 'The host has made this room read-only for you.');
                return;
            }
            if (typeof code !== 'string' || code.length > LIMITS.code) {
                reject(socket, 'Code payload is invalid or too large.');
                return;
            }

            room.code = code;
            room.revision = normalize(revision, 160) || createId();
            room.authorId = client.clientId;
            room.language = normalize(language, 40) || room.language;
            room.updatedAt = new Date().toISOString();
            socket.to(room.roomId).emit(ACTIONS.CODE_CHANGE, {
                code,
                revision: room.revision,
            });
            clearTimeout(room.codeEventTimer);
            const snapshot = {
                code,
                revision: room.revision,
                eventId: eventId || room.revision,
                actor: { ...client },
            };
            room.codeEventTimer = setTimeout(() => {
                recordEvent(room, {
                    type: 'code',
                    revision: snapshot.revision,
                    actor: snapshot.actor,
                    code: snapshot.code,
                    eventId: snapshot.eventId,
                });
                emitSessionState(room.roomId);
            }, 180);
        }
    );

    socket.on(ACTIONS.SESSION_COMMAND, (command = {}) => {
        const client = clients.get(socket.id);
        const room = client ? rooms.get(client.roomId) : null;
        if (!client || !room) {
            reject(socket, 'Join the room before using session controls.');
            return;
        }
        const action = normalize(command.action, 30);

        if (action === 'checkpoint') {
            if (!isEditorRole(client.role)) {
                reject(socket, 'Observers cannot create checkpoints.');
                return;
            }
            const title = normalize(command.title, 80);
            if (!title) {
                reject(socket, 'Checkpoint title is required.');
                return;
            }
            recordEvent(room, {
                type: 'checkpoint',
                revision: room.revision,
                actor: client,
                code: room.code,
                metadata: {
                    title,
                    note: normalize(command.note, 500),
                },
                eventId: command.eventId,
            });
        } else if (action === 'restore') {
            if (!requireHost(socket, client)) return;
            const target = room.events.find(
                (event) => event.id === normalize(command.eventId, 160)
            );
            if (!target || typeof target.code !== 'string') {
                reject(socket, 'Replay snapshot was not found.');
                return;
            }
            const previousRevision = target.revision;
            room.code = target.code;
            room.revision = createId();
            room.authorId = client.clientId;
            recordEvent(room, {
                type: 'restore',
                revision: room.revision,
                actor: client,
                code: room.code,
                metadata: {
                    sourceEventId: target.id,
                    restoredRevision: previousRevision,
                },
            });
            io.to(room.roomId).emit(ACTIONS.CODE_CHANGE, {
                code: room.code,
                revision: room.revision,
            });
        } else if (action === 'settings') {
            if (!requireHost(socket, client)) return;
            if (MODES.has(command.mode)) room.mode = command.mode;
            if (EDIT_POLICIES.has(command.editPolicy)) {
                room.editPolicy = command.editPolicy;
            }
            room.language = normalize(command.language, 40) || room.language;
            recordEvent(room, {
                type: 'settings',
                revision: room.revision,
                actor: client,
                metadata: {
                    mode: room.mode,
                    editPolicy: room.editPolicy,
                    language: room.language,
                },
            });
        } else if (action === 'role') {
            if (!requireHost(socket, client)) return;
            const target = clients.get(normalize(command.targetClientId, 100));
            const role = normalize(command.role, 20);
            if (
                !target ||
                target.roomId !== room.roomId ||
                target.role === 'host' ||
                !ASSIGNABLE_ROLES.has(role)
            ) {
                reject(socket, 'A valid participant role is required.');
                return;
            }
            target.role = role;
            recordEvent(room, {
                type: 'role',
                revision: room.revision,
                actor: client,
                metadata: { username: target.username, role },
            });
        } else if (action === 'test-upsert') {
            if (!requireHost(socket, client)) return;
            const test = command.test || {};
            const id = normalize(test.id, 160) || createId();
            const label = normalize(test.label, 80);
            if (!label) {
                reject(socket, 'Test label is required.');
                return;
            }
            const next = {
                id,
                label,
                stdin: String(test.stdin || '').slice(0, 20000),
                expectedOutput: String(test.expectedOutput || '').slice(
                    0,
                    50000
                ),
                hidden: Boolean(test.hidden),
                createdBy: client.clientId,
                createdAt: new Date().toISOString(),
            };
            const index = room.tests.findIndex((entry) => entry.id === id);
            if (index >= 0) room.tests[index] = next;
            else if (room.tests.length < LIMITS.tests) room.tests.push(next);
        } else if (action === 'test-delete') {
            if (!requireHost(socket, client)) return;
            room.tests = room.tests.filter(
                (test) => test.id !== normalize(command.testId, 160)
            );
        } else if (action === 'run' || action === 'test-run') {
            if (!isEditorRole(client.role)) {
                reject(socket, 'Observers cannot execute code.');
                return;
            }
            if (
                typeof command.source === 'string' &&
                command.source.length <= LIMITS.code
            ) {
                room.code = command.source;
            }
            room.revision =
                normalize(command.revision, 160) || room.revision || createId();
            room.language = normalize(command.language, 40) || room.language;
            room.authorId = client.clientId;
            recordEvent(room, {
                type: action,
                revision: room.revision,
                actor: client,
                code: room.code,
                eventId: command.eventId,
                metadata: cleanRunMetadata({
                    ...command,
                    language: room.language,
                }),
            });
        } else {
            reject(socket, 'Unknown room action.');
            return;
        }

        room.updatedAt = new Date().toISOString();
        emitSessionState(room.roomId);
    });

    socket.on('disconnecting', () => {
        const client = clients.get(socket.id);
        if (!client) return;

        socket.to(client.roomId).emit(ACTIONS.DISCONNECTED, {
            socketId: client.clientId,
            username: client.username,
        });
        clients.delete(socket.id);
        queueMicrotask(() => emitSessionState(client.roomId));
    });
});

const PORT = Number(process.env.PORT) || 5001;
const roomCleanupTimer = setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
        if (new Date(room.expiresAt).getTime() > now) return;
        clearTimeout(room.codeEventTimer);
        rooms.delete(roomId);
    });
}, 60 * 60 * 1000);
roomCleanupTimer.unref?.();

server.listen(PORT, () =>
    console.log(`Code Sync listening on port ${PORT}`)
);
