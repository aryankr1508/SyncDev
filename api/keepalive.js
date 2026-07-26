const { request: supabaseRequest } = require('../server/supabase-rest');

const sendJson = (response, status, body) => {
    response.setHeader('cache-control', 'no-store');
    response.status(status).json(body);
};

module.exports = async function handler(request, response) {
    if (request.method !== 'GET') {
        sendJson(response, 405, { message: 'Method not allowed.' });
        return;
    }

    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers?.authorization;
    if (
        !cronSecret ||
        authorization !== `Bearer ${cronSecret}`
    ) {
        sendJson(response, 401, { message: 'Unauthorized.' });
        return;
    }

    try {
        await Promise.all([
            supabaseRequest('syncdev_rooms', {
                query: {
                    select: 'room_id',
                    limit: '1',
                },
            }),
            supabaseRequest('syncdev_room_clients', {
                query: {
                    select: 'client_id',
                    limit: '1',
                },
            }),
            supabaseRequest('syncdev_room_events', {
                query: {
                    select: 'event_id',
                    limit: '1',
                },
            }),
        ]);
        sendJson(response, 200, {
            status: 'ok',
            database: 'active',
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error(
            'Supabase keepalive failed:',
            error.message,
            error.cause || ''
        );
        sendJson(response, 503, {
            status: 'error',
            message: 'The database heartbeat failed.',
        });
    }
};
