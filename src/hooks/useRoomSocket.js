import { useCallback, useEffect, useReducer } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import { initSocket } from '../socket';
import { markRoomCreated } from '../utils/roomSession';

export const initialRoomState = {
    socket: null,
    clients: [],
    status: 'connecting',
    session: {
        revision: '',
        events: [],
        tests: [],
        hiddenTestCount: 0,
        currentUserRole: 'participant',
        mode: 'interview',
        editPolicy: 'everyone',
        language: 'javascript',
    },
};

export const roomReducer = (state, action) => {
    switch (action.type) {
        case 'SOCKET_READY':
            return { ...state, socket: action.socket };
        case 'CONNECTED':
            return { ...state, status: 'connected' };
        case 'DISCONNECTED':
            return { ...state, status: 'disconnected' };
        case 'CLIENTS_UPDATED':
            return { ...state, clients: action.clients };
        case 'CLIENT_LEFT':
            return {
                ...state,
                clients: state.clients.filter(
                    (client) => client.socketId !== action.socketId
                ),
            };
        case 'SESSION_UPDATED':
            return {
                ...state,
                clients: action.session.clients || state.clients,
                session: {
                    ...state.session,
                    ...action.session,
                },
            };
        default:
            return state;
    }
};

export const useRoomSocket = ({ roomId, roomSession }) => {
    const [state, dispatch] = useReducer(roomReducer, initialRoomState);
    const username = roomSession?.username;

    useEffect(() => {
        if (!username || !roomSession?.clientToken) return undefined;

        const socket = initSocket();
        dispatch({ type: 'SOCKET_READY', socket });

        const handleConnect = () => {
            dispatch({ type: 'CONNECTED' });
            toast.dismiss('socket-error');
            socket.emit(ACTIONS.JOIN, {
                roomId,
                username,
                clientToken: roomSession.clientToken,
                hostKey: roomSession.hostKey,
                createRoom: roomSession.createRoom,
                mode: roomSession.mode,
            });
        };

        const handleConnectionError = (error) => {
            console.error('Room connection error', error);
            dispatch({ type: 'DISCONNECTED' });
            toast.error('Connection lost. Retrying automatically…', {
                id: 'socket-error',
            });
        };

        const handleDisconnect = (reason) => {
            if (reason !== 'io client disconnect') {
                dispatch({ type: 'DISCONNECTED' });
            }
        };

        const handleJoined = ({ clients, username: joinedUser }) => {
            dispatch({ type: 'CLIENTS_UPDATED', clients });
            if (joinedUser !== username) {
                toast.success(`${joinedUser} joined the room.`);
            }
        };

        const handleClientLeft = ({ socketId, username: departedUser }) => {
            dispatch({ type: 'CLIENT_LEFT', socketId });
            if (departedUser) toast(`${departedUser} left the room.`);
        };

        const handleSessionState = (session) => {
            dispatch({ type: 'SESSION_UPDATED', session });
            if (
                roomSession.createRoom &&
                session.currentUserRole === 'host'
            ) {
                markRoomCreated(roomId);
            }
        };

        const handleRoomError = ({ message }) => {
            toast.error(message || 'Could not join this room.', {
                id: 'room-error',
            });
        };

        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectionError);
        socket.on('disconnect', handleDisconnect);
        socket.on(ACTIONS.JOINED, handleJoined);
        socket.on(ACTIONS.DISCONNECTED, handleClientLeft);
        socket.on(ACTIONS.SESSION_STATE, handleSessionState);
        socket.on('room-error', handleRoomError);
        socket.connect();

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [roomId, roomSession, username]);

    const sendCommand = useCallback(
        (command) => {
            state.socket?.emit(ACTIONS.SESSION_COMMAND, command);
        },
        [state.socket]
    );

    return { ...state, sendCommand };
};
