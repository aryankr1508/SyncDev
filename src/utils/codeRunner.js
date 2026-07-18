const formatValue = (value) => {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch (error) {
        return String(value);
    }
};

export const runJavaScript = (code, timeout = 4000) =>
    new Promise((resolve, reject) => {
        const workerSource = `
            const format = ${formatValue.toString()};
            const output = [];
            const send = (level, values) => {
                const line = values.map(format).join(' ');
                output.push(line);
                self.postMessage({ type: 'output', level, line });
            };
            self.console = {
                log: (...values) => send('log', values),
                info: (...values) => send('info', values),
                warn: (...values) => send('warn', values),
                error: (...values) => send('error', values),
            };
            self.onmessage = async () => {
                try {
                    const value = await (async () => {
                        ${code}
                    })();
                    if (value !== undefined) output.push(format(value));
                    self.postMessage({ type: 'done', output });
                } catch (error) {
                    self.postMessage({
                        type: 'error',
                        message: error?.stack || error?.message || String(error),
                    });
                }
            };
        `;
        const workerUrl = URL.createObjectURL(
            new Blob([workerSource], { type: 'text/javascript' })
        );
        const worker = new Worker(workerUrl);
        let output = [];

        const cleanup = () => {
            window.clearTimeout(timeoutId);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error('Execution timed out after 4 seconds'));
        }, timeout);

        worker.onmessage = ({ data }) => {
            if (data.type === 'output') {
                output = [...output, data.line];
                return;
            }
            cleanup();
            if (data.type === 'error') reject(new Error(data.message));
            else resolve(data.output || output);
        };
        worker.onerror = (event) => {
            cleanup();
            reject(new Error(event.message || 'Could not run this code'));
        };
        worker.postMessage({ run: true });
    });
