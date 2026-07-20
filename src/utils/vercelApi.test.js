const roomSyncHandler = require('../../api/room-sync');
const executeHandler = require('../../api/execute');

const createResponse = () => {
    const response = {
        statusCode: 200,
        body: undefined,
        headers: {},
        setHeader: jest.fn((key, value) => {
            response.headers[key] = value;
        }),
        status: jest.fn((statusCode) => {
            response.statusCode = statusCode;
            return response;
        }),
        json: jest.fn((body) => {
            response.body = body;
            return response;
        }),
        end: jest.fn(),
    };
    return response;
};

const fetchResult = (body, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body === null ? '' : JSON.stringify(body)),
    });

describe('Vercel room synchronization API', () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    beforeEach(() => {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
        global.fetch = jest.fn();
    });

    afterAll(() => {
        if (originalUrl === undefined) delete process.env.SUPABASE_URL;
        else process.env.SUPABASE_URL = originalUrl;
        if (originalServiceKey === undefined) {
            delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
            process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
        }
    });

    test('rejects an incomplete room request before accessing storage', async () => {
        const response = createResponse();
        await roomSyncHandler(
            { method: 'POST', query: {}, body: { action: 'join' } },
            response
        );

        expect(response.statusCode).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('joins a room and returns the persisted room state', async () => {
        global.fetch
            .mockImplementationOnce(() => fetchResult(null, 201))
            .mockImplementationOnce(() => fetchResult(null, 201))
            .mockImplementationOnce(() => fetchResult(null, 204))
            .mockImplementationOnce(() =>
                fetchResult([
                    {
                        code: 'const ready = true;',
                        revision: 'r1',
                        author_id: 'other-client',
                    },
                ])
            )
            .mockImplementationOnce(() =>
                fetchResult([
                    {
                        client_id: 'client-1',
                        username: 'Aryan',
                        seen_at: new Date().toISOString(),
                    },
                ])
            );

        const response = createResponse();
        await roomSyncHandler(
            {
                method: 'POST',
                query: {},
                body: {
                    action: 'join',
                    roomId: 'room-1',
                    clientId: 'client-1',
                    username: 'Aryan',
                },
            },
            response
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            code: 'const ready = true;',
            revision: 'r1',
            authorId: 'other-client',
            clients: [{ socketId: 'client-1', username: 'Aryan' }],
        });
        expect(global.fetch).toHaveBeenCalledTimes(5);
    });
});

describe('Vercel execution API', () => {
    test('rejects unsupported methods', async () => {
        const response = createResponse();
        await executeHandler({ method: 'GET', headers: {} }, response);
        expect(response.statusCode).toBe(405);
    });

    test('validates an execution request before contacting a provider', async () => {
        global.fetch = jest.fn();
        const response = createResponse();
        await executeHandler(
            {
                method: 'POST',
                headers: {},
                body: { language: 'unsupported', source: 'noop' },
            },
            response
        );
        expect(response.statusCode).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
