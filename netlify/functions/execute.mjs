// This function is deliberately a validating proxy. It never executes source code.
const LIMITS = { source: 100000, stdin: 20000, timeout: 10000 };
const LANGUAGES = new Set(['python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'kotlin']);
const visits = new Map();

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const limited = (key) => {
    const now = Date.now(); const current = (visits.get(key) || []).filter((time) => now - time < 60000);
    current.push(now); visits.set(key, current); return current.length > 12;
};

export default async (request) => {
    if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);
    const client = request.headers.get('x-nf-client-connection-ip') || 'anonymous';
    if (limited(client)) return json({ message: 'Execution rate limit exceeded. Try again in a minute.' }, 429);
    try {
        const body = await request.json();
        const language = String(body.language || '').toLowerCase();
        const source = body.source;
        const stdin = body.stdin || '';
        const timeout = Number(body.timeout) || 4000;
        if (!LANGUAGES.has(language) || typeof source !== 'string' || typeof stdin !== 'string' || source.length > LIMITS.source || stdin.length > LIMITS.stdin || timeout < 100 || timeout > LIMITS.timeout) return json({ message: 'Invalid execution request.' }, 400);
        const providerUrl = process.env.CODE_EXECUTION_PROVIDER_URL;
        const providerToken = process.env.CODE_EXECUTION_PROVIDER_TOKEN;
        if (!providerUrl || !providerToken) return json({ message: 'Remote execution is not configured. Set an isolated compiler provider before running this language.' }, 503);
        const response = await fetch(providerUrl, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${providerToken}` }, body: JSON.stringify({ language, source, stdin, timeout, runtime: String(body.runtime || '') }), signal: AbortSignal.timeout(timeout + 1500) });
        const output = await response.json();
        if (!response.ok) return json({ message: 'The execution provider rejected this run.' }, 502);
        return json({ stdout: String(output.stdout || '').slice(0, 50000), stderr: String(output.stderr || '').slice(0, 50000), exitCode: Number.isInteger(output.exitCode) ? output.exitCode : 1, duration: Number(output.duration) || 0, status: output.status || 'success' });
    } catch (error) {
        return json({ message: error.name === 'TimeoutError' ? 'Execution provider timed out.' : 'Execution provider is temporarily unavailable.' }, 502);
    }
};
