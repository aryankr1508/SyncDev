const {
    EXECUTABLE_LANGUAGES,
    runInVercelSandbox,
} = require('../server/sandbox-execution');

const LIMITS = { source: 100000, stdin: 20000, timeout: 10000 };
const LANGUAGES = new Set([
    'python',
    'java',
    'c',
    'cpp',
    'csharp',
    'go',
    'rust',
    'php',
    'ruby',
    'kotlin',
    'sql',
]);
const visits = new Map();

const sendJson = (response, status, body) => {
    response.setHeader('cache-control', 'no-store');
    response.status(status).json(body);
};

const limited = (key) => {
    const now = Date.now();
    const current = (visits.get(key) || []).filter((time) => now - time < 60000);
    current.push(now);
    visits.set(key, current);
    return current.length > 12;
};

const readBody = (request) => {
    if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
    return request.body || {};
};

const runConfiguredProvider = async ({
    providerUrl,
    providerToken,
    language,
    source,
    stdin,
    timeout,
    runtime,
}) => {
    const providerResponse = await fetch(providerUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
            language,
            source,
            stdin,
            timeout,
            runtime,
        }),
        signal: AbortSignal.timeout(timeout + 1500),
    });
    const output = await providerResponse.json();
    if (!providerResponse.ok) {
        const error = new Error('The execution provider rejected this run.');
        error.code = 'PROVIDER_REJECTED';
        throw error;
    }
    return output;
};

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        sendJson(response, 405, { message: 'Method not allowed.' });
        return;
    }

    const client = String(request.headers['x-forwarded-for'] || 'anonymous')
        .split(',')[0]
        .trim();
    if (limited(client)) {
        sendJson(response, 429, {
            message: 'Execution rate limit exceeded. Try again in a minute.',
        });
        return;
    }

    try {
        const body = readBody(request);
        const language = String(body.language || '').toLowerCase();
        const source = body.source;
        const stdin = body.stdin || '';
        const timeout = Number(body.timeout) || 4000;

        if (
            !LANGUAGES.has(language) ||
            typeof source !== 'string' ||
            typeof stdin !== 'string' ||
            source.length > LIMITS.source ||
            stdin.length > LIMITS.stdin ||
            timeout < 100 ||
            timeout > LIMITS.timeout
        ) {
            sendJson(response, 400, { message: 'Invalid execution request.' });
            return;
        }

        const providerUrl = process.env.CODE_EXECUTION_PROVIDER_URL;
        const providerToken = process.env.CODE_EXECUTION_PROVIDER_TOKEN;
        let output;
        if (providerUrl && providerToken) {
            output = await runConfiguredProvider({
                providerUrl,
                providerToken,
                language,
                source,
                stdin,
                timeout,
                runtime: String(body.runtime || ''),
            });
        } else if (EXECUTABLE_LANGUAGES.has(language)) {
            output = await runInVercelSandbox({
                language,
                source,
                stdin,
                timeout,
            });
        } else {
            sendJson(response, 503, {
                message: `${language} execution is not enabled yet. Java, Python, C, C++, SQL, and browser JavaScript are currently supported.`,
            });
            return;
        }

        sendJson(response, 200, {
            stdout: String(output.stdout || '').slice(0, 50000),
            stderr: String(output.stderr || '').slice(0, 50000),
            exitCode: Number.isInteger(output.exitCode) ? output.exitCode : 1,
            duration: Number(output.duration) || 0,
            status: output.status || 'success',
            provider: output.provider || 'configured-provider',
        });
    } catch (error) {
        console.error('Isolated execution failed.', {
            name: error.name,
            code: error.code,
            message: error.message,
        });
        const status =
            error.code === 'SANDBOX_NOT_CONFIGURED' ? 503 : 502;
        sendJson(response, status, {
            message:
                error.name === 'TimeoutError' ||
                error.code === 'SANDBOX_TIMEOUT'
                    ? 'Execution provider timed out.'
                    : error.code === 'SANDBOX_NOT_CONFIGURED'
                      ? error.message
                      : error.code === 'PROVIDER_REJECTED'
                        ? error.message
                        : 'The isolated execution service is temporarily unavailable.',
        });
    }
};
