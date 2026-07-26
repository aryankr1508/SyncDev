import { VercelRoomTransport } from './vercelRoomTransport';
import ACTIONS from '../Actions';

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
                response(200, {
                    clients: [],
                    stateVersion: 'created',
                })
            )
            .mockResolvedValueOnce(
                response(401, { message: 'Session is settling.' })
            )
            .mockResolvedValueOnce(
                response(200, { stateVersion: 'ready' })
            );
        const transport = new VercelRoomTransport();
        let command;
        transport.on(ACTIONS.SESSION_STATE, () => {
            command = transport.request({ action: 'checkpoint' });
        });

        await transport.join({
            roomId: 'room-1',
            username: 'Host',
            clientToken: 'token-1',
            hostKey: 'host-key',
            createRoom: true,
            mode: 'interview',
        });
        await expect(command).resolves.toEqual({ stateVersion: 'ready' });
        window.clearInterval(transport.pollTimer);
        window.clearInterval(transport.heartbeatTimer);
        expect(global.fetch).toHaveBeenCalledTimes(3);
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
