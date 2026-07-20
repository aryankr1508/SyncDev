const { getConfig, request: supabaseRequest } = require('../server/supabase-rest');

const CLIENT_TTL = 30000;
const ROOM_ID_LIMIT = 128;
const USERNAME_LIMIT = 32;
const CLIENT_ID_LIMIT = 100;
const CODE_LIMIT = 500000;

const normalize = (value, limit) => String(value || '').trim().slice(0, limit);

const sendJson = (response, status, body) => {
    response.setHeader('cache-control', 'no-store');
    response.status(status).json(body);
};

const ensureRoom = (roomId) =>
    supabaseRequest('syncdev_rooms', {
        method: 'POST',
        query: { on_conflict: 'room_id' },
        body: [{ room_id: roomId }],
        prefer: 'resolution=ignore-duplicates,return=minimal',
    });

const upsertClient = (roomId, clientId, username) =>
    supabaseRequest('syncdev_room_clients', {
        method: 'POST',
        query: { on_conflict: 'room_id,client_id' },
        body: [
            {
                room_id: roomId,
                client_id: clientId,
                username,
                seen_at: new Date().toISOString(),
            },
        ],
        prefer: 'resolution=merge-duplicates,return=minimal',
    });

const getRoomState = async (roomId) => {
    const staleBefore = new Date(Date.now() - CLIENT_TTL).toISOString();

    await supabaseRequest('syncdev_room_clients', {
        method: 'DELETE',
        query: {
            room_id: `eq.${roomId}`,
            seen_at: `lt.${staleBefore}`,
        },
        prefer: 'return=minimal',
    });

    const [rooms, clients] = await Promise.all([
        supabaseRequest('syncdev_rooms', {
            query: {
                room_id: `eq.${roomId}`,
                select: 'code,revision,author_id,updated_at',
                limit: '1',
            },
        }),
        supabaseRequest('syncdev_room_clients', {
            query: {
                room_id: `eq.${roomId}`,
                select: 'client_id,username,seen_at',
                order: 'seen_at.asc',
            },
        }),
    ]);

    const room = rooms?.[0] || {};
    if (
        clients?.length === 0 &&
        room.updated_at &&
        new Date(room.updated_at).getTime() < Date.now() - CLIENT_TTL
    ) {
        await supabaseRequest('syncdev_rooms', {
            method: 'DELETE',
            query: { room_id: `eq.${roomId}` },
            prefer: 'return=minimal',
        });
        return { clients: [], code: '', revision: '', authorId: '' };
    }

    return {
        clients: (clients || []).map((client) => ({
            socketId: client.client_id,
            username: client.username,
        })),
        code: room.code || '',
        revision: room.revision || '',
        authorId: room.author_id || '',
    };
};

const readBody = (request) => {
    if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
    return request.body || {};
};

module.exports = async function handler(request, response) {
    if (request.method === 'OPTIONS') {
        response.status(204).end();
        return;
    }

    try {
        if (request.method === 'GET') {
            if (request.query.health === '1') {
                getConfig();
                sendJson(response, 200, {
                    status: 'ok',
                    transport: 'vercel-supabase',
                });
                return;
            }

            const roomId = normalize(request.query.roomId, ROOM_ID_LIMIT);
            if (!roomId) {
                sendJson(response, 400, { message: 'Room ID is required.' });
                return;
            }

            sendJson(response, 200, await getRoomState(roomId));
            return;
        }

        if (request.method !== 'POST') {
            sendJson(response, 405, { message: 'Method not allowed.' });
            return;
        }

        const body = readBody(request);
        const action = normalize(body.action, 20);
        const roomId = normalize(body.roomId, ROOM_ID_LIMIT);
        const clientId = normalize(body.clientId, CLIENT_ID_LIMIT);

        if (!roomId || !clientId) {
            sendJson(response, 400, {
                message: 'Room ID and client ID are required.',
            });
            return;
        }

        if (action === 'join' || action === 'heartbeat') {
            const username = normalize(body.username, USERNAME_LIMIT);
            if (!username) {
                sendJson(response, 400, { message: 'Username is required.' });
                return;
            }

            await ensureRoom(roomId);
            await upsertClient(roomId, clientId, username);
            sendJson(
                response,
                200,
                action === 'join' ? await getRoomState(roomId) : { ok: true }
            );
            return;
        }

        if (action === 'code') {
            if (typeof body.code !== 'string' || body.code.length > CODE_LIMIT) {
                sendJson(response, 400, { message: 'Code payload is invalid or too large.' });
                return;
            }

            await ensureRoom(roomId);
            await supabaseRequest('syncdev_rooms', {
                method: 'PATCH',
                query: { room_id: `eq.${roomId}` },
                body: {
                    code: body.code,
                    revision: normalize(body.revision, 160),
                    author_id: clientId,
                    updated_at: new Date().toISOString(),
                },
                prefer: 'return=minimal',
            });
            sendJson(response, 200, { ok: true });
            return;
        }

        if (action === 'leave') {
            await supabaseRequest('syncdev_room_clients', {
                method: 'DELETE',
                query: {
                    room_id: `eq.${roomId}`,
                    client_id: `eq.${clientId}`,
                },
                prefer: 'return=minimal',
            });

            const state = await getRoomState(roomId);
            if (state.clients.length === 0) {
                await supabaseRequest('syncdev_rooms', {
                    method: 'DELETE',
                    query: { room_id: `eq.${roomId}` },
                    prefer: 'return=minimal',
                });
            }
            sendJson(response, 200, state);
            return;
        }

        sendJson(response, 400, { message: 'Unknown sync action.' });
    } catch (error) {
        console.error('Room synchronization error:', error.message, error.cause || '');
        sendJson(response, error.statusCode || 500, {
            message:
                error.statusCode === 503
                    ? error.message
                    : 'Room synchronization is temporarily unavailable.',
        });
    }
};
