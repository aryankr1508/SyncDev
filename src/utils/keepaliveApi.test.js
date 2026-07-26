jest.mock('../../server/supabase-rest', () => ({
    request: jest.fn(),
}));

const { request: supabaseRequest } = require('../../server/supabase-rest');
const keepaliveHandler = require('../../api/keepalive');

const createResponse = () => ({
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
        this.headers[name] = value;
    },
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const invoke = async ({
    method = 'GET',
    authorization = 'Bearer test-cron-secret',
} = {}) => {
    const response = createResponse();
    await keepaliveHandler(
        {
            method,
            headers: authorization ? { authorization } : {},
        },
        response
    );
    return response;
};

beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    supabaseRequest.mockReset();
    supabaseRequest.mockResolvedValue([]);
});

afterAll(() => {
    delete process.env.CRON_SECRET;
});

test('rejects requests without the configured cron authorization', async () => {
    const response = await invoke({ authorization: '' });

    expect(response.statusCode).toBe(401);
    expect(supabaseRequest).not.toHaveBeenCalled();
});

test('performs minimal real database queries for an authorized heartbeat', async () => {
    const response = await invoke();

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
        status: 'ok',
        database: 'active',
    });
    expect(supabaseRequest.mock.calls).toEqual([
        [
            'syncdev_rooms',
            { query: { select: 'room_id', limit: '1' } },
        ],
        [
            'syncdev_room_clients',
            { query: { select: 'client_id', limit: '1' } },
        ],
        [
            'syncdev_room_events',
            { query: { select: 'event_id', limit: '1' } },
        ],
    ]);
});

test('returns a service error without exposing database details', async () => {
    supabaseRequest.mockRejectedValue(
        Object.assign(new Error('private upstream detail'), {
            cause: 'sensitive response',
        })
    );
    const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

    const response = await invoke();

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({
        status: 'error',
        message: 'The database heartbeat failed.',
    });
    expect(JSON.stringify(response.body)).not.toContain('private upstream');
    consoleError.mockRestore();
});

test('allows only the GET method used by Vercel Cron', async () => {
    const response = await invoke({ method: 'POST' });

    expect(response.statusCode).toBe(405);
    expect(supabaseRequest).not.toHaveBeenCalled();
});
