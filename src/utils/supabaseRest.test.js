const { request } = require('../../server/supabase-rest');

const response = {
    ok: true,
    status: 200,
    text: () => Promise.resolve('[]'),
};

describe('Supabase REST authentication headers', () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    beforeEach(() => {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        global.fetch = jest.fn(() => Promise.resolve(response));
    });

    afterAll(() => {
        if (originalUrl === undefined) delete process.env.SUPABASE_URL;
        else process.env.SUPABASE_URL = originalUrl;
        if (originalKey === undefined) {
            delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
            process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
        }
    });

    test('uses only apikey for modern server secrets', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_modern-test';
        await request('syncdev_rooms');

        const headers = global.fetch.mock.calls[0][1].headers;
        expect(headers.apikey).toBe('sb_secret_modern-test');
        expect(headers.authorization).toBeUndefined();
    });

    test('keeps Bearer authorization for legacy service-role JWTs', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy.jwt.value';
        await request('syncdev_rooms');

        const headers = global.fetch.mock.calls[0][1].headers;
        expect(headers.apikey).toBe('legacy.jwt.value');
        expect(headers.authorization).toBe('Bearer legacy.jwt.value');
    });
});
