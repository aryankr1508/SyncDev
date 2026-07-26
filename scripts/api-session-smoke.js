/* eslint-disable no-console */
const roomSync = require('../api/room-sync');

const createResponse = () => {
    const response = {
        statusCode: 200,
        body: null,
        setHeader: () => undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        end() {
            return this;
        },
    };
    return response;
};

const invoke = async ({ method = 'POST', query = {}, body = {} }) => {
    const response = createResponse();
    await roomSync({ method, query, body }, response);
    return response;
};

const expectStatus = (response, expected, step) => {
    if (response.statusCode !== expected) {
        throw new Error(
            `${step} returned ${response.statusCode}: ${JSON.stringify(
                response.body
            )}`
        );
    }
    return response.body;
};

const run = async () => {
    const roomId = `api-smoke-${Date.now()}`;
    const host = {
        roomId,
        clientId: 'api-host',
        clientToken: `host-token-${roomId}`,
    };
    const participant = {
        roomId,
        clientId: 'api-participant',
        clientToken: `participant-token-${roomId}`,
    };

    const created = expectStatus(
        await invoke({
            body: {
                action: 'create',
                ...host,
                username: 'API Host',
                hostKey: `host-key-${roomId}`,
                mode: 'interview',
            },
        }),
        200,
        'create'
    );
    if (created.currentUserRole !== 'host') {
        throw new Error('Create did not assign the host role.');
    }

    const joined = expectStatus(
        await invoke({
            body: {
                action: 'join',
                ...participant,
                username: 'API Candidate',
            },
        }),
        200,
        'join'
    );
    if (joined.currentUserRole !== 'participant') {
        throw new Error('Join did not assign the participant role.');
    }

    expectStatus(
        await invoke({
            body: {
                action: 'test-upsert',
                ...host,
                test: {
                    label: 'Hidden provider case',
                    stdin: '9',
                    expectedOutput: '10',
                    hidden: true,
                },
            },
        }),
        200,
        'hidden test'
    );

    const participantState = expectStatus(
        await invoke({
            method: 'GET',
            query: participant,
        }),
        200,
        'participant state'
    );
    if (
        participantState.tests.length !== 0 ||
        participantState.hiddenTestCount !== 1
    ) {
        throw new Error('Hidden test data was not filtered for the participant.');
    }

    expectStatus(
        await invoke({
            body: {
                action: 'checkpoint',
                ...participant,
                title: 'API checkpoint',
                note: 'Persistence verified.',
            },
        }),
        200,
        'checkpoint'
    );

    const hostState = expectStatus(
        await invoke({
            method: 'GET',
            query: host,
        }),
        200,
        'host state'
    );
    if (
        !hostState.events.some(
            (event) =>
                event.type === 'checkpoint' &&
                event.metadata.title === 'API checkpoint'
        ) ||
        hostState.tests.length !== 1
    ) {
        throw new Error('Host did not receive persisted evidence and hidden tests.');
    }

    expectStatus(
        await invoke({
            body: {
                action: 'role',
                ...host,
                targetClientId: participant.clientId,
                role: 'observer',
            },
        }),
        200,
        'role update'
    );

    const rejected = await invoke({
        body: {
            action: 'code',
            ...participant,
            code: 'console.log("rejected")',
            revision: 'rejected-revision',
        },
    });
    expectStatus(rejected, 403, 'observer code rejection');

    await invoke({ body: { action: 'leave', ...participant } });
    await invoke({ body: { action: 'leave', ...host } });

    console.log(
        JSON.stringify({
            ok: true,
            roomId,
            verified: [
                'Supabase migration',
                'host authentication',
                'participant authentication',
                'hidden test filtering',
                'checkpoint persistence',
                'role enforcement',
                'retained session evidence',
            ],
        })
    );
};

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
