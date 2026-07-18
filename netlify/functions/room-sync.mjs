import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const CLIENT_TTL = 30000;
const ROOM_ID_LIMIT = 128;
const USERNAME_LIMIT = 32;
const CODE_LIMIT = 500000;

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
        },
    });

const normalize = (value, limit) => String(value || '').trim().slice(0, limit);
const roomHash = (roomId) =>
    createHash('sha256').update(roomId).digest('hex');

const getRoomState = async (store, roomId) => {
    const prefix = `rooms/${roomHash(roomId)}`;
    const now = Date.now();
    let code = (await store.get(`${prefix}/code`, { type: 'json' })) || {};
    const { blobs = [] } = await store.list({ prefix: `${prefix}/clients/` });
    const entries = await Promise.all(
        blobs.map(async ({ key }) => ({
            key,
            client: await store.get(key, { type: 'json' }),
        }))
    );
    const activeEntries = entries.filter(
        ({ client }) => client && now - client.seenAt < CLIENT_TTL
    );

    await Promise.all(
        entries
            .filter(({ client }) => !client || now - client.seenAt >= CLIENT_TTL)
            .map(({ key }) => store.delete(key))
    );

    if (
        activeEntries.length === 0 &&
        code.updatedAt &&
        now - code.updatedAt >= CLIENT_TTL
    ) {
        await store.delete(`${prefix}/code`);
        code = {};
    }

    return {
        clients: activeEntries.map(({ client }) => ({
            socketId: client.clientId,
            username: client.username,
        })),
        code: code.code || '',
        revision: code.revision || '',
        authorId: code.authorId || '',
    };
};

export default async (request) => {
    const store = getStore({ name: 'syncdev-rooms', consistency: 'strong' });

    try {
        if (request.method === 'GET') {
            const url = new URL(request.url);
            if (url.searchParams.get('health') === '1') {
                return json({ status: 'ok', transport: 'netlify-blobs' });
            }
            const roomId = normalize(
                url.searchParams.get('roomId'),
                ROOM_ID_LIMIT
            );
            if (!roomId) return json({ message: 'Room ID is required.' }, 400);
            return json(await getRoomState(store, roomId));
        }

        if (request.method !== 'POST') {
            return json({ message: 'Method not allowed.' }, 405);
        }

        const body = await request.json();
        const action = normalize(body.action, 20);
        const roomId = normalize(body.roomId, ROOM_ID_LIMIT);
        const clientId = normalize(body.clientId, 100);
        if (!roomId || !clientId) {
            return json({ message: 'Room ID and client ID are required.' }, 400);
        }

        const prefix = `rooms/${roomHash(roomId)}`;
        const clientKey = `${prefix}/clients/${clientId}`;

        if (action === 'join' || action === 'heartbeat') {
            const username = normalize(body.username, USERNAME_LIMIT);
            if (!username) return json({ message: 'Username is required.' }, 400);
            await store.setJSON(clientKey, {
                clientId,
                username,
                seenAt: Date.now(),
            });
            return action === 'join'
                ? json(await getRoomState(store, roomId))
                : json({ ok: true });
        }

        if (action === 'code') {
            if (typeof body.code !== 'string' || body.code.length > CODE_LIMIT) {
                return json({ message: 'Code payload is invalid or too large.' }, 400);
            }
            await store.setJSON(`${prefix}/code`, {
                code: body.code,
                revision: normalize(body.revision, 160),
                authorId: clientId,
                updatedAt: Date.now(),
            });
            return json({ ok: true });
        }

        if (action === 'leave') {
            await store.delete(clientKey);
            const state = await getRoomState(store, roomId);
            if (state.clients.length === 0) {
                await store.delete(`${prefix}/code`);
            }
            return json({ ok: true });
        }

        return json({ message: 'Unknown sync action.' }, 400);
    } catch (error) {
        console.error('Room sync error', error);
        return json({ message: 'Room synchronization is temporarily unavailable.' }, 500);
    }
};
