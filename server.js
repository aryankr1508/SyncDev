const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || true,
        methods: ['GET', 'POST'],
    },
});

const userSocketMap = new Map();
const roomCodeMap = new Map();

const getAllConnectedClients = (roomId) =>
    Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
        socketId,
        username: userSocketMap.get(socketId),
    }));

app.get('/health', (request, response) => {
    response.json({
        status: 'ok',
        connectedClients: io.engine.clientsCount,
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

    socket.on(ACTIONS.JOIN, ({ roomId, username } = {}) => {
        const normalizedRoomId = String(roomId || '').trim();
        const normalizedUsername = String(username || '').trim().slice(0, 32);

        if (!normalizedRoomId || !normalizedUsername) {
            socket.emit('room-error', { message: 'Room ID and username are required.' });
            return;
        }

        userSocketMap.set(socket.id, normalizedUsername);
        socket.join(normalizedRoomId);

        const clients = getAllConnectedClients(normalizedRoomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username: normalizedUsername,
                socketId: socket.id,
            });
        });

        if (roomCodeMap.has(normalizedRoomId)) {
            socket.emit(ACTIONS.CODE_CHANGE, {
                code: roomCodeMap.get(normalizedRoomId),
            });
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code } = {}) => {
        if (roomId && typeof code === 'string') {
            roomCodeMap.set(roomId, code);
            socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
        }
    });

    socket.on('disconnecting', () => {
        const username = userSocketMap.get(socket.id);

        socket.rooms.forEach((roomId) => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
                    socketId: socket.id,
                    username,
                });

                if (io.sockets.adapter.rooms.get(roomId)?.size === 1) {
                    roomCodeMap.delete(roomId);
                }
            }
        });

        userSocketMap.delete(socket.id);
    });
});

const PORT = Number(process.env.PORT) || 5001;
server.listen(PORT, () => console.log(`Code Sync listening on port ${PORT}`));
