/* eslint-disable no-console */
const { io } = require('socket.io-client');
const ACTIONS = require('../src/Actions');

const url = process.env.SYNCDEV_SMOKE_URL || 'http://localhost:5601';
const roomId = `smoke-${Date.now()}`;

const waitFor = (socket, event, predicate = () => true, timeout = 5000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timed out waiting for ${event}.`));
        }, timeout);
        const handler = (payload) => {
            if (!predicate(payload)) return;
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(payload);
        };
        socket.on(event, handler);
    });

const connect = () =>
    io(url, {
        forceNew: true,
        reconnection: false,
        transports: ['websocket'],
    });

const join = async (socket, payload) => {
    if (!socket.connected) await waitFor(socket, 'connect');
    const statePromise = waitFor(socket, ACTIONS.SESSION_STATE);
    socket.emit(ACTIONS.JOIN, payload);
    return statePromise;
};

const run = async () => {
    const host = connect();
    const participant = connect();
    const hostKey = `host-${roomId}`;

    try {
        const hostState = await join(host, {
            roomId,
            username: 'Host',
            clientToken: 'host-client-token',
            hostKey,
            createRoom: true,
            mode: 'interview',
        });
        if (hostState.currentUserRole !== 'host') {
            throw new Error('Creator did not receive the host role.');
        }

        const hostSeesParticipant = waitFor(
            host,
            ACTIONS.SESSION_STATE,
            (state) => state.clients.length === 2
        );
        const participantState = await join(participant, {
            roomId,
            username: 'Candidate',
            clientToken: 'candidate-client-token',
            createRoom: false,
        });
        await hostSeesParticipant;
        if (participantState.currentUserRole !== 'participant') {
            throw new Error('Guest did not receive the participant role.');
        }

        const hostTestStatePromise = waitFor(
            host,
            ACTIONS.SESSION_STATE,
            (state) => state.tests.length === 1
        );
        const participantTestStatePromise = waitFor(
            participant,
            ACTIONS.SESSION_STATE,
            (state) =>
                state.hiddenTestCount === 1 && state.tests.length === 0
        );
        host.emit(ACTIONS.SESSION_COMMAND, {
            action: 'test-upsert',
            test: {
                label: 'Private edge case',
                stdin: '41',
                expectedOutput: '42',
                hidden: true,
            },
        });
        await Promise.all([hostTestStatePromise, participantTestStatePromise]);

        const hostCodePromise = waitFor(
            host,
            ACTIONS.CODE_CHANGE,
            (payload) => payload.revision === 'revision-smoke-1'
        );
        participant.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code: 'console.log(Number(stdin) + 1);',
            revision: 'revision-smoke-1',
            language: 'javascript',
            eventId: 'revision-smoke-1',
        });
        await hostCodePromise;

        const checkpointPromise = waitFor(
            host,
            ACTIONS.SESSION_STATE,
            (state) =>
                state.events.some(
                    (event) =>
                        event.type === 'checkpoint' &&
                        event.metadata.title === 'Candidate approach'
                )
        );
        participant.emit(ACTIONS.SESSION_COMMAND, {
            action: 'checkpoint',
            title: 'Candidate approach',
            note: 'Validated the increment.',
        });
        await checkpointPromise;

        const observerStatePromise = waitFor(
            participant,
            ACTIONS.SESSION_STATE,
            (state) => state.currentUserRole === 'observer'
        );
        host.emit(ACTIONS.SESSION_COMMAND, {
            action: 'role',
            targetClientId: participant.id,
            role: 'observer',
        });
        await observerStatePromise;

        const rejectionPromise = waitFor(
            participant,
            'room-error',
            (error) => /read-only/i.test(error.message)
        );
        participant.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code: 'console.log("should not be accepted");',
            revision: 'revision-rejected',
            language: 'javascript',
        });
        await rejectionPromise;

        console.log(
            JSON.stringify({
                ok: true,
                roomId,
                verified: [
                    'host role',
                    'participant role',
                    'hidden test filtering',
                    'code propagation',
                    'checkpoint history',
                    'observer enforcement',
                ],
            })
        );
    } finally {
        host.disconnect();
        participant.disconnect();
    }
};

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
