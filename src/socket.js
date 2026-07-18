import { io } from 'socket.io-client';
import { NetlifyRoomTransport } from './utils/netlifyRoomTransport';

const getSocketUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }

    return process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:5001';
};

export const initSocket = () =>
    process.env.REACT_APP_SYNC_TRANSPORT === 'netlify' ||
    (!process.env.REACT_APP_BACKEND_URL &&
        window.location.hostname.endsWith('.netlify.app'))
        ? new NetlifyRoomTransport()
        : io(getSocketUrl(), {
              autoConnect: false,
              forceNew: true,
              reconnection: true,
              reconnectionAttempts: Infinity,
              reconnectionDelay: 500,
              reconnectionDelayMax: 5000,
              timeout: 10000,
              transports: ['websocket', 'polling'],
          });
