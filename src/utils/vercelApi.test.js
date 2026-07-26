jest.mock('../../server/sandbox-execution', () => ({
    EXECUTABLE_LANGUAGES: new Set(['java', 'python', 'c', 'cpp', 'sql']),
    runInVercelSandbox: jest.fn(),
}));

const roomSyncHandler = require('../../api/room-sync');
const executeHandler = require('../../api/execute');
const { createHash } = require('crypto');
const {
    runInVercelSandbox,
} = require('../../server/sandbox-execution');

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
        const clientToken = 'client-secret';
        const tokenHash = createHash('sha256')
            .update(clientToken)
            .digest('hex');
        const room = {
            room_id: 'room-1',
            code: 'const ready = true;',
            revision: 'r1',
            author_id: 'other-client',
            host_key_hash: 'host-hash',
            mode: 'interview',
            edit_policy: 'everyone',
            language: 'javascript',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            updated_at: new Date().toISOString(),
        };
        const client = {
            client_id: 'client-1',
            username: 'Aryan',
            role: 'participant',
            token_hash: tokenHash,
            seen_at: new Date().toISOString(),
        };
        global.fetch
            .mockImplementationOnce(() => fetchResult([room]))
            .mockImplementationOnce(() => fetchResult(null, 201))
            .mockImplementationOnce(() => fetchResult(null, 204))
            .mockImplementationOnce(() => fetchResult([client]))
            .mockImplementationOnce(() => fetchResult(null, 204))
            .mockImplementationOnce(() => fetchResult([room]))
            .mockImplementationOnce(() => fetchResult([client]))
            .mockImplementationOnce(() => fetchResult([]))
            .mockImplementationOnce(() => fetchResult([]));

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
                    clientToken,
                },
            },
            response
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            code: 'const ready = true;',
            revision: 'r1',
            authorId: 'other-client',
            currentUserRole: 'participant',
            clients: [
                {
                    socketId: 'client-1',
                    username: 'Aryan',
                    role: 'participant',
                },
            ],
        });
        expect(global.fetch).toHaveBeenCalledTimes(9);
    });

    test('requires an authenticated room session before returning history', async () => {
        const response = createResponse();
        await roomSyncHandler(
            {
                method: 'GET',
                query: { roomId: 'room-1', clientId: 'client-1' },
            },
            response
        );

        expect(response.statusCode).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

describe('Vercel execution API', () => {
    const originalProviderUrl = process.env.CODE_EXECUTION_PROVIDER_URL;
    const originalProviderToken =
        process.env.CODE_EXECUTION_PROVIDER_TOKEN;

    beforeEach(() => {
        delete process.env.CODE_EXECUTION_PROVIDER_URL;
        delete process.env.CODE_EXECUTION_PROVIDER_TOKEN;
        runInVercelSandbox.mockReset();
    });

    afterAll(() => {
        if (originalProviderUrl === undefined) {
            delete process.env.CODE_EXECUTION_PROVIDER_URL;
        } else {
            process.env.CODE_EXECUTION_PROVIDER_URL = originalProviderUrl;
        }
        if (originalProviderToken === undefined) {
            delete process.env.CODE_EXECUTION_PROVIDER_TOKEN;
        } else {
            process.env.CODE_EXECUTION_PROVIDER_TOKEN =
                originalProviderToken;
        }
    });

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

    test('runs Java through the isolated Vercel sandbox by default', async () => {
        runInVercelSandbox.mockResolvedValue({
            stdout: 'Hello Java\n',
            stderr: '',
            exitCode: 0,
            duration: 112,
            status: 'success',
            provider: 'vercel-sandbox',
        });
        const response = createResponse();

        await executeHandler(
            {
                method: 'POST',
                headers: {},
                body: {
                    language: 'java',
                    source:
                        'public class Main { public static void main(String[] args) {} }',
                },
            },
            response
        );

        expect(response.statusCode).toBe(200);
        expect(runInVercelSandbox).toHaveBeenCalledWith(
            expect.objectContaining({
                language: 'java',
                timeout: 4000,
            })
        );
        expect(response.body).toMatchObject({
            stdout: 'Hello Java\n',
            status: 'success',
            provider: 'vercel-sandbox',
        });
    });
});
