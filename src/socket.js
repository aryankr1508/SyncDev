import { io } from 'socket.io-client';
import {
    NetlifyRoomTransport,
    VercelRoomTransport,
} from './utils/netlifyRoomTransport';

const getSocketUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }

    return process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:5001';
};

export const initSocket = () => {
    const transport = process.env.REACT_APP_SYNC_TRANSPORT;
    const isNetlify = window.location.hostname.endsWith('.netlify.app');
    const isVercel = window.location.hostname.endsWith('.vercel.app');

    if (transport === 'vercel' || (!process.env.REACT_APP_BACKEND_URL && isVercel)) {
        return new VercelRoomTransport();
    }

    if (transport === 'netlify' || (!process.env.REACT_APP_BACKEND_URL && isNetlify)) {
        return new NetlifyRoomTransport();
    }

    return io(getSocketUrl(), {
        autoConnect: false,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
    });
};
