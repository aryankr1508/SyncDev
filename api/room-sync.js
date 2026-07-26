const {
    getConfig,
    request: supabaseRequest,
} = require('../server/supabase-rest');
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
    isSafeId,
    normalize,
    safeSecretMatch,
    snapshotCode,
} = require('../server/session-protocol');

const CLIENT_TTL = 30000;
const ROOM_ACTION_LIMIT = 180;
const ROOM_CREATE_LIMIT = 12;
const visits = new Map();

const sendJson = (response, status, body) => {
    response.setHeader('cache-control', 'no-store');
    response.status(status).json(body);
};

const isRateLimited = (key, limit) => {
    const now = Date.now();
    const active = (visits.get(key) || []).filter(
        (timestamp) => now - timestamp < 60000
    );
    active.push(now);
    visits.set(key, active);
    if (visits.size > 1000) {
        Array.from(visits.entries()).forEach(([entryKey, timestamps]) => {
            if (!timestamps.some((timestamp) => now - timestamp < 60000)) {
                visits.delete(entryKey);
            }
        });
    }
    return active.length > limit;
};

const readBody = (request) => {
    if (typeof request.body === 'string') {
        return JSON.parse(request.body || '{}');
    }
    return request.body || {};
};

const getRoom = async (roomId) => {
    const rooms = await supabaseRequest('syncdev_rooms', {
        query: {
            room_id: `eq.${roomId}`,
            select: [
                'room_id',
                'code',
                'revision',
                'author_id',
                'host_key_hash',
                'mode',
                'edit_policy',
                'language',
                'created_at',
                'expires_at',
                'updated_at',
            ].join(','),
            limit: '1',
        },
    });
    const room = rooms?.[0] || null;
    if (
        room?.expires_at &&
        new Date(room.expires_at).getTime() < Date.now()
    ) {
        await supabaseRequest('syncdev_rooms', {
            method: 'DELETE',
            query: { room_id: `eq.${roomId}` },
            prefer: 'return=minimal',
        });
        return null;
    }
    return room;
};

const getClient = async (roomId, clientId) => {
    const clients = await supabaseRequest('syncdev_room_clients', {
        query: {
            room_id: `eq.${roomId}`,
            client_id: `eq.${clientId}`,
            select: 'client_id,username,role,token_hash,seen_at',
            limit: '1',
        },
    });
    return clients?.[0] || null;
};

const authenticateClient = async ({
    roomId,
    clientId,
    clientToken,
    allowMissing = false,
}) => {
    const client = await getClient(roomId, clientId);
    if (!client && allowMissing) return null;
    if (
        !client ||
        !safeSecretMatch(
            normalize(clientToken, LIMITS.token),
            client.token_hash
        )
    ) {
        const error = new Error('Your room session is no longer authorized.');
        error.statusCode = 401;
        throw error;
    }
    return client;
};

const upsertClient = ({ roomId, clientId, username, role, clientToken }) =>
    supabaseRequest('syncdev_room_clients', {
        method: 'POST',
        query: { on_conflict: 'room_id,client_id' },
        body: [
            {
                room_id: roomId,
                client_id: clientId,
                username,
                role,
                token_hash: hashSecret(clientToken),
                seen_at: new Date().toISOString(),
            },
        ],
        prefer: 'resolution=merge-duplicates,return=minimal',
    });

const touchRoom = (roomId, patch = {}) =>
    supabaseRequest('syncdev_rooms', {
        method: 'PATCH',
        query: { room_id: `eq.${roomId}` },
        body: {
            ...patch,
            expires_at: createExpiry(),
            updated_at: new Date().toISOString(),
        },
        prefer: 'return=minimal',
    });

const recordEvent = ({
    roomId,
    type,
    revision,
    actor,
    code = '',
    metadata = {},
    eventId,
}) =>
    supabaseRequest('syncdev_room_events', {
        method: 'POST',
        query: { on_conflict: 'event_id' },
        body: [
            {
                event_id: normalize(eventId, 160) || createId(),
                room_id: roomId,
                event_type: type,
                revision: normalize(revision, 160),
                actor_id: actor.client_id,
                actor_name: actor.username,
                code: snapshotCode(code),
                metadata,
            },
        ],
        prefer: 'resolution=ignore-duplicates,return=minimal',
    });

const cleanupStaleClients = (roomId) =>
    supabaseRequest('syncdev_room_clients', {
        method: 'DELETE',
        query: {
            room_id: `eq.${roomId}`,
            seen_at: `lt.${new Date(Date.now() - CLIENT_TTL).toISOString()}`,
        },
        prefer: 'return=minimal',
    });

const getRoomState = async (roomId, currentClient) => {
    await cleanupStaleClients(roomId);

    const [room, clients, events, tests] = await Promise.all([
        getRoom(roomId),
        supabaseRequest('syncdev_room_clients', {
            query: {
                room_id: `eq.${roomId}`,
                select: 'client_id,username,role,seen_at',
                order: 'seen_at.asc',
            },
        }),
        supabaseRequest('syncdev_room_events', {
            query: {
                room_id: `eq.${roomId}`,
                select:
                    'event_id,event_type,revision,actor_id,actor_name,code,metadata,created_at',
                order: 'created_at.desc',
                limit: String(LIMITS.events),
            },
        }),
        supabaseRequest('syncdev_room_tests', {
            query: {
                room_id: `eq.${roomId}`,
                select:
                    'test_id,label,stdin,expected_output,is_hidden,created_by,created_at',
                order: 'created_at.asc',
                limit: String(LIMITS.tests),
            },
        }),
    ]);

    if (!room) {
        const error = new Error('This room does not exist or has expired.');
        error.statusCode = 404;
        throw error;
    }

    const isHost = currentClient?.role === 'host';
    const visibleTests = (tests || [])
        .filter((test) => isHost || !test.is_hidden)
        .map((test) => ({
            id: test.test_id,
            label: test.label,
            stdin: test.stdin,
            expectedOutput: test.expected_output,
            hidden: Boolean(test.is_hidden),
            createdBy: test.created_by,
            createdAt: test.created_at,
        }));
    const orderedEvents = (events || []).reverse().map((event) => ({
        id: event.event_id,
        type: event.event_type,
        revision: event.revision,
        actorId: event.actor_id,
        actorName: event.actor_name,
        code: event.code,
        metadata: event.metadata || {},
        createdAt: event.created_at,
    }));
    const mappedClients = (clients || []).map((client) => ({
        socketId: client.client_id,
        username: client.username,
        role: client.role,
    }));
    const clientVersion = mappedClients
        .map((client) => `${client.socketId}:${client.role}`)
        .join('|');
    const latestEvent = orderedEvents[orderedEvents.length - 1];

    return {
        clients: mappedClients,
        code: room.code || '',
        revision: room.revision || '',
        authorId: room.author_id || '',
        mode: room.mode || 'interview',
        editPolicy: room.edit_policy || 'everyone',
        language: room.language || 'javascript',
        createdAt: room.created_at,
        expiresAt: room.expires_at,
        currentUserRole: currentClient?.role || 'participant',
        events: orderedEvents,
        tests: visibleTests,
        hiddenTestCount: (tests || []).filter((test) => test.is_hidden).length,
        stateVersion: [
            room.updated_at,
            latestEvent?.id || '',
            clientVersion,
            visibleTests.map((test) => test.id).join('|'),
        ].join(':'),
    };
};

const requireRole = (client, allowed) => {
    if (!allowed.includes(client.role)) {
        const error = new Error('Your room role does not allow this action.');
        error.statusCode = 403;
        throw error;
    }
};

const createRoom = async ({
    roomId,
    clientId,
    username,
    clientToken,
    hostKey,
    mode,
}) => {
    if (!hostKey) {
        const error = new Error('A host credential is required to create a room.');
        error.statusCode = 400;
        throw error;
    }

    const existing = await getRoom(roomId);
    if (
        existing &&
        !safeSecretMatch(hostKey, existing.host_key_hash)
    ) {
        const error = new Error('A room with this ID already exists.');
        error.statusCode = 409;
        throw error;
    }

    if (!existing) {
        await supabaseRequest('syncdev_rooms', {
            method: 'POST',
            body: [
                {
                    room_id: roomId,
                    host_key_hash: hashSecret(hostKey),
                    mode: MODES.has(mode) ? mode : 'interview',
                    expires_at: createExpiry(),
                },
            ],
            prefer: 'return=minimal',
        });
    } else {
        await touchRoom(roomId);
    }

    await upsertClient({
        roomId,
        clientId,
        username,
        role: 'host',
        clientToken,
    });

    const host = await getClient(roomId, clientId);
    if (!existing) {
        await recordEvent({
            roomId,
            type: 'settings',
            revision: '',
            actor: host,
            metadata: {
                action: 'created',
                mode: MODES.has(mode) ? mode : 'interview',
            },
        });
    }
    return host;
};

const joinRoom = async ({
    roomId,
    clientId,
    username,
    clientToken,
    hostKey,
}) => {
    const room = await getRoom(roomId);
    if (!room) {
        const error = new Error(
            'Room not found. Ask the host to create it before joining.'
        );
        error.statusCode = 404;
        throw error;
    }

    let role = 'participant';
    if (hostKey && safeSecretMatch(hostKey, room.host_key_hash)) {
        role = 'host';
    }

    await upsertClient({
        roomId,
        clientId,
        username,
        role,
        clientToken,
    });
    await touchRoom(roomId);
    return getClient(roomId, clientId);
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
                    sessionProtocol: 2,
                });
                return;
            }

            const roomId = normalize(request.query.roomId, LIMITS.roomId);
            const clientId = normalize(request.query.clientId, LIMITS.clientId);
            const clientToken = normalize(
                request.query.clientToken,
                LIMITS.token
            );
            if (
                !roomId ||
                !clientId ||
                !clientToken ||
                !isSafeId(roomId) ||
                !isSafeId(clientId)
            ) {
                sendJson(response, 400, {
                    message: 'Room credentials are required.',
                });
                return;
            }
            const client = await authenticateClient({
                roomId,
                clientId,
                clientToken,
            });
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (request.method !== 'POST') {
            sendJson(response, 405, { message: 'Method not allowed.' });
            return;
        }

        const body = readBody(request);
        const action = normalize(body.action, 30);
        const roomId = normalize(body.roomId, LIMITS.roomId);
        const clientId = normalize(body.clientId, LIMITS.clientId);
        const clientToken = normalize(body.clientToken, LIMITS.token);
        if (
            !roomId ||
            !clientId ||
            !clientToken ||
            !isSafeId(roomId) ||
            !isSafeId(clientId)
        ) {
            sendJson(response, 400, {
                message: 'Room ID, client ID, and session token are required.',
            });
            return;
        }

        const clientIp = normalize(
            String(request.headers?.['x-forwarded-for'] || 'anonymous').split(
                ','
            )[0],
            80
        );
        const rateLimit =
            action === 'create' ? ROOM_CREATE_LIMIT : ROOM_ACTION_LIMIT;
        if (isRateLimited(`${clientIp}:${action}`, rateLimit)) {
            sendJson(response, 429, {
                message: 'Too many room actions. Try again in a minute.',
            });
            return;
        }

        if (action === 'create' || action === 'join') {
            const username = normalize(body.username, LIMITS.username);
            if (!username) {
                sendJson(response, 400, { message: 'Username is required.' });
                return;
            }
            const client =
                action === 'create'
                    ? await createRoom({
                          roomId,
                          clientId,
                          username,
                          clientToken,
                          hostKey: normalize(body.hostKey, LIMITS.token),
                          mode: normalize(body.mode, 20),
                      })
                    : await joinRoom({
                          roomId,
                          clientId,
                          username,
                          clientToken,
                          hostKey: normalize(body.hostKey, LIMITS.token),
                      });
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        const client = await authenticateClient({
            roomId,
            clientId,
            clientToken,
        });

        if (action === 'heartbeat') {
            await supabaseRequest('syncdev_room_clients', {
                method: 'PATCH',
                query: {
                    room_id: `eq.${roomId}`,
                    client_id: `eq.${clientId}`,
                },
                body: { seen_at: new Date().toISOString() },
                prefer: 'return=minimal',
            });
            sendJson(response, 200, { ok: true });
            return;
        }

        if (action === 'code') {
            const room = await getRoom(roomId);
            if (
                !canEdit(client.role, room.edit_policy)
            ) {
                sendJson(response, 403, {
                    message: 'The host has made this room read-only for you.',
                });
                return;
            }
            if (
                typeof body.code !== 'string' ||
                body.code.length > LIMITS.code
            ) {
                sendJson(response, 400, {
                    message: 'Code payload is invalid or too large.',
                });
                return;
            }
            const revision = normalize(body.revision, 160) || createId();
            await touchRoom(roomId, {
                code: body.code,
                revision,
                author_id: clientId,
                language: normalize(body.language, 40) || room.language,
            });
            await recordEvent({
                roomId,
                type: 'code',
                revision,
                actor: client,
                code: body.code,
                eventId: body.eventId || revision,
            });
            sendJson(response, 200, { ok: true, revision });
            return;
        }

        if (action === 'checkpoint') {
            requireRole(client, ['host', 'participant']);
            const room = await getRoom(roomId);
            const title = normalize(body.title, 80);
            if (!title) {
                sendJson(response, 400, {
                    message: 'Checkpoint title is required.',
                });
                return;
            }
            await recordEvent({
                roomId,
                type: 'checkpoint',
                revision: room.revision,
                actor: client,
                code: room.code,
                metadata: {
                    title,
                    note: normalize(body.note, 500),
                },
                eventId: body.eventId,
            });
            await touchRoom(roomId);
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'restore') {
            requireRole(client, ['host']);
            const eventId = normalize(body.eventId, 160);
            const events = await supabaseRequest('syncdev_room_events', {
                query: {
                    room_id: `eq.${roomId}`,
                    event_id: `eq.${eventId}`,
                    select: 'event_id,revision,code',
                    limit: '1',
                },
            });
            const target = events?.[0];
            if (!target || typeof target.code !== 'string') {
                sendJson(response, 404, {
                    message: 'Replay snapshot was not found.',
                });
                return;
            }
            const revision = createId();
            await touchRoom(roomId, {
                code: target.code,
                revision,
                author_id: clientId,
            });
            await recordEvent({
                roomId,
                type: 'restore',
                revision,
                actor: client,
                code: target.code,
                metadata: {
                    sourceEventId: target.event_id,
                    restoredRevision: target.revision,
                },
            });
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'settings') {
            requireRole(client, ['host']);
            const room = await getRoom(roomId);
            const mode = MODES.has(body.mode) ? body.mode : room.mode;
            const editPolicy = EDIT_POLICIES.has(body.editPolicy)
                ? body.editPolicy
                : room.edit_policy;
            const language = normalize(body.language, 40) || room.language;
            await touchRoom(roomId, {
                mode,
                edit_policy: editPolicy,
                language,
            });
            await recordEvent({
                roomId,
                type: 'settings',
                revision: room.revision,
                actor: client,
                metadata: { mode, editPolicy, language },
            });
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'role') {
            requireRole(client, ['host']);
            const targetClientId = normalize(
                body.targetClientId,
                LIMITS.clientId
            );
            const role = normalize(body.role, 20);
            if (!targetClientId || !ASSIGNABLE_ROLES.has(role)) {
                sendJson(response, 400, {
                    message: 'A valid participant role is required.',
                });
                return;
            }
            const target = await getClient(roomId, targetClientId);
            if (!target || target.role === 'host') {
                sendJson(response, 400, {
                    message: 'The host role cannot be reassigned here.',
                });
                return;
            }
            await supabaseRequest('syncdev_room_clients', {
                method: 'PATCH',
                query: {
                    room_id: `eq.${roomId}`,
                    client_id: `eq.${targetClientId}`,
                },
                body: { role },
                prefer: 'return=minimal',
            });
            await recordEvent({
                roomId,
                type: 'role',
                revision: (await getRoom(roomId)).revision,
                actor: client,
                metadata: { username: target.username, role },
            });
            await touchRoom(roomId);
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'test-upsert') {
            requireRole(client, ['host']);
            const test = body.test || {};
            const testId = normalize(test.id, 160) || createId();
            const label = normalize(test.label, 80);
            const stdin = String(test.stdin || '').slice(0, 20000);
            const expectedOutput = String(test.expectedOutput || '').slice(
                0,
                50000
            );
            if (!label) {
                sendJson(response, 400, {
                    message: 'Test label is required.',
                });
                return;
            }
            const existingTests = await supabaseRequest(
                'syncdev_room_tests',
                {
                    query: {
                        room_id: `eq.${roomId}`,
                        select: 'test_id',
                        limit: String(LIMITS.tests + 1),
                    },
                }
            );
            const isExistingTest = (existingTests || []).some(
                (entry) => entry.test_id === testId
            );
            if (
                !isExistingTest &&
                (existingTests || []).length >= LIMITS.tests
            ) {
                sendJson(response, 409, {
                    message: `A room can contain up to ${LIMITS.tests} evaluation cases.`,
                });
                return;
            }
            await supabaseRequest('syncdev_room_tests', {
                method: 'POST',
                query: { on_conflict: 'room_id,test_id' },
                body: [
                    {
                        room_id: roomId,
                        test_id: testId,
                        label,
                        stdin,
                        expected_output: expectedOutput,
                        is_hidden: Boolean(test.hidden),
                        created_by: clientId,
                    },
                ],
                prefer: 'resolution=merge-duplicates,return=minimal',
            });
            await touchRoom(roomId);
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'test-delete') {
            requireRole(client, ['host']);
            await supabaseRequest('syncdev_room_tests', {
                method: 'DELETE',
                query: {
                    room_id: `eq.${roomId}`,
                    test_id: `eq.${normalize(body.testId, 160)}`,
                },
                prefer: 'return=minimal',
            });
            await touchRoom(roomId);
            sendJson(response, 200, await getRoomState(roomId, client));
            return;
        }

        if (action === 'run' || action === 'test-run') {
            requireRole(client, ['host', 'participant']);
            const room = await getRoom(roomId);
            const source =
                typeof body.source === 'string' &&
                body.source.length <= LIMITS.code
                    ? body.source
                    : room.code;
            const revision = normalize(body.revision, 160) || room.revision;
            if (source !== room.code || revision !== room.revision) {
                await touchRoom(roomId, {
                    code: source,
                    revision,
                    author_id: clientId,
                    language: normalize(body.language, 40) || room.language,
                });
            } else {
                await touchRoom(roomId);
            }
            await recordEvent({
                roomId,
                type: action,
                revision,
                actor: client,
                code: source,
                metadata: cleanRunMetadata(body),
                eventId: body.eventId,
            });
            sendJson(response, 200, await getRoomState(roomId, client));
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
            await touchRoom(roomId);
            sendJson(response, 200, { ok: true });
            return;
        }

        sendJson(response, 400, { message: 'Unknown room action.' });
    } catch (error) {
        console.error(
            'Room synchronization error:',
            error.message,
            error.cause || ''
        );
        sendJson(response, error.statusCode || 500, {
            message:
                error.statusCode && error.statusCode < 500
                    ? error.message
                    : error.statusCode === 503
                      ? error.message
                      : 'Room synchronization is temporarily unavailable.',
        });
    }
};
