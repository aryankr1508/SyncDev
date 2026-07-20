export const EXECUTION_LIMITS = {
    source: 100000,
    stdin: 20000,
    output: 50000,
    timeout: 10000,
};

export const REMOTE_LANGUAGES = new Set([
    'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'kotlin',
]);
export const PREVIEW_LANGUAGES = new Set(['html', 'css', 'javascript', 'jsx', 'markdown']);

const formatValue = (value) => {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch (error) { return String(value); }
};

const bounded = (value, limit) => String(value || '').slice(0, limit);
const result = (overrides = {}) => ({
    stdout: '', stderr: '', exitCode: 0, duration: 0, status: 'success', ...overrides,
});

export const validateExecutionRequest = (request = {}) => {
    const language = String(request.language || '').toLowerCase();
    const source = typeof request.source === 'string' ? request.source : '';
    const stdin = typeof request.stdin === 'string' ? request.stdin : '';
    const timeout = Math.min(Math.max(Number(request.timeout) || 4000, 100), EXECUTION_LIMITS.timeout);
    if (!language) return { error: 'A language is required.' };
    if (source.length > EXECUTION_LIMITS.source) return { error: 'Source exceeds the 100 KB limit.' };
    if (stdin.length > EXECUTION_LIMITS.stdin) return { error: 'Standard input exceeds the 20 KB limit.' };
    return { value: { language, source, stdin, timeout, runtime: String(request.runtime || '') } };
};

const runJavaScript = ({ source, stdin, timeout, onOutput }) => {
    let worker;
    let finished = false;
    let timeoutId;
    let settleExecution;
    const startedAt = performance.now();
    const promise = new Promise((resolve) => {
        const settle = (next) => {
            if (finished) return;
            finished = true;
            window.clearTimeout(timeoutId);
            worker?.terminate();
            URL.revokeObjectURL(url);
            resolve(result({ duration: Math.round(performance.now() - startedAt), ...next }));
        };
        settleExecution = settle;
        const workerSource = `
            const format = ${formatValue.toString()};
            const maxOutput = ${EXECUTION_LIMITS.output}; let outputSize = 0;
            const send = (stream, values) => {
              let text = values.map(format).join(' ') + '\\n';
              if (outputSize >= maxOutput) return;
              text = text.slice(0, maxOutput - outputSize); outputSize += text.length;
              postMessage({ type: 'output', stream, text });
            };
            console = { log: (...v) => send('stdout', v), info: (...v) => send('stdout', v), warn: (...v) => send('stderr', v), error: (...v) => send('stderr', v) };
            self.onmessage = async () => { try {
              const stdin = ${JSON.stringify(stdin)};
              const value = await (async () => { ${source}\n })();
              if (value !== undefined) send('stdout', [value]);
              postMessage({ type: 'done' });
            } catch (error) { postMessage({ type: 'error', message: error?.stack || error?.message || String(error) }); } };
        `;
        const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
        worker = new Worker(url);
        timeoutId = window.setTimeout(() => settle({ status: 'timeout', exitCode: 124, stderr: `Execution timed out after ${timeout}ms.` }), timeout);
        worker.onmessage = ({ data }) => {
            if (data.type === 'output') onOutput?.(data.stream, data.text);
            if (data.type === 'done') settle({});
            if (data.type === 'error') settle({ status: 'error', exitCode: 1, stderr: bounded(data.message, EXECUTION_LIMITS.output) });
        };
        worker.onerror = (event) => settle({ status: 'error', exitCode: 1, stderr: event.message || 'Could not run JavaScript.' });
        worker.postMessage({ type: 'run' });
    });
    return { promise, cancel: () => {
        if (finished) return;
        settleExecution({ status: 'cancelled', exitCode: null, stderr: 'Execution cancelled.' });
    } };
};

const runValidation = ({ language, source }) => {
    const startedAt = performance.now();
    try {
        if (language === 'json') JSON.parse(source);
        if (language === 'yaml' && !/^\s*(?:---\s*$|[\w.-]+\s*:|\s*-\s+)/m.test(source)) throw new Error('YAML must contain a mapping or list.');
        return Promise.resolve(result({ stdout: `${language.toUpperCase()} is valid.\n`, duration: Math.round(performance.now() - startedAt) }));
    } catch (error) {
        return Promise.resolve(result({ status: 'error', exitCode: 1, stderr: `${error.message}\n`, duration: Math.round(performance.now() - startedAt) }));
    }
};

export const getRemoteExecutionEndpoint = () => {
    return process.env.REACT_APP_EXECUTION_ENDPOINT || '/api/execute';
};

const runRemote = async (request) => {
    const response = await fetch(getRemoteExecutionEndpoint(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return result({ status: 'error', exitCode: 1, stderr: `${body.message || 'Remote execution is unavailable.'}\n` });
    return result({ ...body, stdout: bounded(body.stdout, EXECUTION_LIMITS.output), stderr: bounded(body.stderr, EXECUTION_LIMITS.output) });
};

/** Start an execution using the provider-neutral request/result contract. */
export const startCodeExecution = (request, onOutput) => {
    const validation = validateExecutionRequest(request);
    if (validation.error) return { promise: Promise.resolve(result({ status: 'error', exitCode: 1, stderr: `${validation.error}\n` })), cancel: () => {} };
    const normalized = validation.value;
    if (normalized.language === 'javascript') return runJavaScript({ ...normalized, onOutput });
    if (normalized.language === 'json' || normalized.language === 'yaml') return { promise: runValidation(normalized), cancel: () => {} };
    if (REMOTE_LANGUAGES.has(normalized.language)) return { promise: runRemote(normalized), cancel: () => {} };
    return { promise: Promise.resolve(result({ status: 'error', exitCode: 1, stderr: `Execution is not available for ${normalized.language}.\n` })), cancel: () => {} };
};
