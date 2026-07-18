import { useEffect, useReducer } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import { initSocket } from '../socket';

const initialState = {
    socket: null,
    clients: [],
    status: 'connecting',
};

const roomReducer = (state, action) => {
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
        default:
            return state;
    }
};

export const useRoomSocket = ({ roomId, username }) => {
    const [state, dispatch] = useReducer(roomReducer, initialState);

    useEffect(() => {
        if (!username) return undefined;

        const socket = initSocket();
        dispatch({ type: 'SOCKET_READY', socket });

        const handleConnect = () => {
            dispatch({ type: 'CONNECTED' });
            toast.dismiss('socket-error');
            socket.emit(ACTIONS.JOIN, { roomId, username });
        };

        const handleConnectionError = (error) => {
            console.error('Socket connection error', error);
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

        const handleRoomError = ({ message }) => {
            toast.error(message || 'Could not join this room.');
        };

        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectionError);
        socket.on('disconnect', handleDisconnect);
        socket.on(ACTIONS.JOINED, handleJoined);
        socket.on(ACTIONS.DISCONNECTED, handleClientLeft);
        socket.on('room-error', handleRoomError);
        socket.connect();

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [roomId, username]);

    return state;
};
