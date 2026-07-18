const sessionKey = (roomId) => `code-sync:room:${roomId}`;

export const rememberRoomUser = (roomId, username) => {
    try {
        window.sessionStorage.setItem(sessionKey(roomId), username);
    } catch (error) {
        // Session persistence is a convenience, not a runtime requirement.
    }
};

export const getRememberedRoomUser = (roomId) => {
    try {
        return window.sessionStorage.getItem(sessionKey(roomId));
    } catch (error) {
        return null;
    }
};

export const forgetRoomUser = (roomId) => {
    try {
        window.sessionStorage.removeItem(sessionKey(roomId));
    } catch (error) {
        // Nothing else is required when storage is unavailable.
    }
};
