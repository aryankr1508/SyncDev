import { VercelRoomTransport } from './vercelRoomTransport';

const response = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
});

describe('VercelRoomTransport authentication settling', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('retries a transient 401 immediately after joining', async () => {
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce(
                response(401, { message: 'Session is settling.' })
            )
            .mockResolvedValueOnce(
                response(200, { stateVersion: 'ready' })
            );
        const transport = new VercelRoomTransport();
        transport.roomId = 'room-1';
        transport.clientToken = 'token-1';
        transport.sessionReadyAt = Date.now();

        await expect(
            transport.request({ action: 'checkpoint' })
        ).resolves.toEqual({ stateVersion: 'ready' });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('does not retry an expired or genuinely invalid session', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(
            response(401, { message: 'Session expired.' })
        );
        const transport = new VercelRoomTransport();
        transport.roomId = 'room-1';
        transport.clientToken = 'invalid-token';
        transport.sessionReadyAt = Date.now() - 10000;

        await expect(
            transport.request({ action: 'checkpoint' })
        ).rejects.toThrow('Session expired.');
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
