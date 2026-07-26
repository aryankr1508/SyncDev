import {
    createRoomCredentials,
    getRememberedRoomSession,
    markRoomCreated,
    rememberRoomSession,
} from './roomSession';

beforeEach(() => window.sessionStorage.clear());

test('persists private host credentials and marks a created room as joined', () => {
    const credentials = createRoomCredentials({
        username: 'Aryan',
        createRoom: true,
        mode: 'training',
    });
    rememberRoomSession('room-1', credentials);

    expect(getRememberedRoomSession('room-1')).toMatchObject({
        username: 'Aryan',
        createRoom: true,
        mode: 'training',
    });
    expect(credentials.clientToken).not.toBe('');
    expect(credentials.hostKey).not.toBe('');

    markRoomCreated('room-1');
    expect(getRememberedRoomSession('room-1').createRoom).toBe(false);
});
