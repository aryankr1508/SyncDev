import {
    EXECUTION_LIMITS,
    getRemoteExecutionEndpoint,
    startCodeExecution,
    validateExecutionRequest,
} from './codeRunner';

test('normalizes a provider-neutral execution request', () => {
    expect(validateExecutionRequest({ language: 'PYTHON', source: 'print(1)', stdin: 'x', timeout: 99999 }).value).toMatchObject({ language: 'python', timeout: EXECUTION_LIMITS.timeout });
});

test('rejects oversized execution source before selecting a runner', async () => {
    const execution = startCodeExecution({ language: 'javascript', source: 'x'.repeat(EXECUTION_LIMITS.source + 1) });
    await expect(execution.promise).resolves.toMatchObject({ status: 'error', exitCode: 1 });
});

test('reports unsupported languages without executing them', async () => {
    await expect(startCodeExecution({ language: 'sql', source: 'select 1' }).promise).resolves.toMatchObject({ status: 'error', stderr: expect.stringMatching(/not available/) });
});

test('selects the Vercel execution endpoint for Vercel builds', () => {
    const previousTransport = process.env.REACT_APP_SYNC_TRANSPORT;
    process.env.REACT_APP_SYNC_TRANSPORT = 'vercel';
    expect(getRemoteExecutionEndpoint()).toBe('/api/execute');
    if (previousTransport === undefined) {
        delete process.env.REACT_APP_SYNC_TRANSPORT;
    } else {
        process.env.REACT_APP_SYNC_TRANSPORT = previousTransport;
    }
});
