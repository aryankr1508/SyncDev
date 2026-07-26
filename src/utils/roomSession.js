const sessionKey = (roomId) => `code-sync:room:${roomId}`;

const createSecret = () => {
    if (window.crypto?.randomUUID) {
        return `${window.crypto.randomUUID()}-${window.crypto.randomUUID()}`;
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
        .toString(36)
        .slice(2)}`;
};

export const createRoomCredentials = ({
    username,
    mode = 'interview',
    createRoom = false,
} = {}) => ({
    username: String(username || '').trim(),
    clientToken: createSecret(),
    hostKey: createRoom ? createSecret() : '',
    createRoom,
    mode,
});

export const rememberRoomSession = (roomId, session) => {
    try {
        window.sessionStorage.setItem(
            sessionKey(roomId),
            JSON.stringify({
                username: String(session?.username || '').trim(),
                clientToken: String(session?.clientToken || ''),
                hostKey: String(session?.hostKey || ''),
                createRoom: Boolean(session?.createRoom),
                mode: String(session?.mode || 'interview'),
            })
        );
    } catch (error) {
        // Session persistence is a convenience, not a runtime requirement.
    }
};

export const rememberRoomUser = (roomId, username) => {
    rememberRoomSession(
        roomId,
        createRoomCredentials({ username, createRoom: false })
    );
};

export const getRememberedRoomSession = (roomId) => {
    try {
        const cached = window.sessionStorage.getItem(sessionKey(roomId));
        if (!cached) return null;

        try {
            const session = JSON.parse(cached);
            if (!session?.username) return null;
            return {
                ...session,
                clientToken: session.clientToken || createSecret(),
            };
        } catch (error) {
            // Migrate the username-only format used by earlier releases.
            return createRoomCredentials({
                username: cached,
                createRoom: false,
            });
        }
    } catch (error) {
        return null;
    }
};

export const getRememberedRoomUser = (roomId) =>
    getRememberedRoomSession(roomId)?.username || null;

export const markRoomCreated = (roomId) => {
    const session = getRememberedRoomSession(roomId);
    if (!session) return;
    rememberRoomSession(roomId, { ...session, createRoom: false });
};

export const forgetRoomUser = (roomId) => {
    try {
        window.sessionStorage.removeItem(sessionKey(roomId));
    } catch (error) {
        // Nothing else is required when storage is unavailable.
    }
};
