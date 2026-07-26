/* eslint-disable no-console */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chromePath =
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const appUrl = process.env.SYNCDEV_UI_URL || 'http://localhost:3100';
const mode = process.env.SYNCDEV_SMOKE_MODE || 'interview';
const modeUi = {
    interview: {
        selector: 'Interview',
        workspace: 'Interview workspace',
        purpose: 'evaluate problem-solving',
        timeline: 'Attempts',
        tests: 'Evaluation',
        titlePlaceholder: 'Approach, breakthrough, or final solution',
        notePlaceholder: 'What did the candidate reason about or decide?',
        testPlaceholder: 'Requirement or edge case',
    },
    training: {
        selector: 'Training',
        workspace: 'Learning workspace',
        purpose: 'teach through practice',
        timeline: 'Progress',
        tests: 'Exercises',
        titlePlaceholder: 'Concept or exercise completed',
        notePlaceholder:
            'What did the learner understand or still need help with?',
        testPlaceholder: 'Exercise objective',
    },
    debugging: {
        selector: 'Debugging',
        workspace: 'Debugging workspace',
        purpose: 'resolve issues systematically',
        timeline: 'Investigation',
        tests: 'Verification',
        titlePlaceholder: 'Symptom, hypothesis, root cause, or fix',
        notePlaceholder:
            'What evidence supports this finding or decision?',
        testPlaceholder: 'Failure scenario or regression',
    },
}[mode];
if (!modeUi) throw new Error(`Unsupported smoke-test mode: ${mode}`);
const debugPort = Number(process.env.CHROME_DEBUG_PORT) || 9333;
const screenshotPath =
    process.env.SYNCDEV_SCREENSHOT ||
    path.join(process.cwd(), 'tmp', 'session-ui-smoke.png');
const delay = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForJson = async (url, timeout = 10000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) return response.json();
        } catch (error) {
            // Chrome is still starting.
        }
        await delay(100);
    }
    throw new Error('Chrome DevTools did not become available.');
};

const connectCdp = async (webSocketUrl) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const listeners = new Map();
    let commandId = 0;

    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (!message.id) {
            listeners
                .get(message.method)
                ?.forEach((callback) => callback(message.params));
            return;
        }
        if (!pending.has(message.id)) return;
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
    };
    await new Promise((resolve, reject) => {
        socket.onopen = resolve;
        socket.onerror = reject;
    });

    return {
        send(method, params = {}) {
            commandId += 1;
            const id = commandId;
            socket.send(JSON.stringify({ id, method, params }));
            return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
            });
        },
        on(method, callback) {
            const callbacks = listeners.get(method) || new Set();
            callbacks.add(callback);
            listeners.set(method, callbacks);
        },
        close() {
            socket.close();
        },
    };
};

const run = async () => {
    if (!fs.existsSync(chromePath)) {
        throw new Error(`Chrome was not found at ${chromePath}.`);
    }
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    const profile = fs.mkdtempSync(
        path.join(os.tmpdir(), 'syncdev-ui-smoke-')
    );
    const chrome = spawn(
        chromePath,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            `--remote-debugging-port=${debugPort}`,
            `--user-data-dir=${profile}`,
            '--window-size=1600,1000',
            appUrl,
        ],
        { stdio: 'ignore' }
    );

    let cdp;
    try {
        const pages = await waitForJson(
            `http://127.0.0.1:${debugPort}/json/list`
        );
        const page = pages.find((entry) => entry.type === 'page');
        if (!page) throw new Error('Chrome did not create a page target.');
        cdp = await connectCdp(page.webSocketDebuggerUrl);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        await cdp.send('Network.enable');

        const requestTrace = new Map();
        const credentialLabels = new Map();
        const credentialLabel = (token) => {
            if (!credentialLabels.has(token)) {
                credentialLabels.set(
                    token,
                    `credential-${credentialLabels.size + 1}`
                );
            }
            return credentialLabels.get(token);
        };
        cdp.on('Network.requestWillBeSent', ({ requestId, request }) => {
            if (!request.url.includes('/api/room-sync')) return;
            const url = new URL(request.url);
            let body = {};
            try {
                body = JSON.parse(request.postData || '{}');
            } catch (error) {
                // Invalid JSON is surfaced by the API response.
            }
            requestTrace.set(requestId, {
                method: request.method,
                action:
                    body.action ||
                    (url.searchParams.get('health') ? 'health' : 'poll'),
                clientId:
                    body.clientId || url.searchParams.get('clientId') || '',
                credential: credentialLabel(
                    body.clientToken ||
                        url.searchParams.get('clientToken') ||
                        'none'
                ),
                status: 'pending',
            });
        });
        cdp.on('Network.responseReceived', ({ requestId, response }) => {
            const entry = requestTrace.get(requestId);
            if (entry) entry.status = response.status;
        });

        const evaluate = async (expression) => {
            const result = await cdp.send('Runtime.evaluate', {
                expression,
                awaitPromise: true,
                returnByValue: true,
            });
            if (result.exceptionDetails) {
                throw new Error(
                    result.exceptionDetails.exception?.description ||
                        'Browser evaluation failed.'
                );
            }
            return result.result.value;
        };

        const waitFor = async (expression, timeout = 10000) => {
            const started = Date.now();
            while (Date.now() - started < timeout) {
                if (await evaluate(expression)) return;
                await delay(120);
            }
            const context = await evaluate(
                `document.body.innerText.slice(0, 1800)`
            );
            throw new Error(
                `UI condition timed out: ${expression}\nRendered text:\n${context}`
            );
        };

        const clickText = (text, selector = 'button') =>
            evaluate(`(() => {
                const node = Array.from(document.querySelectorAll(${JSON.stringify(
                    selector
                )})).find((entry) => entry.textContent.trim().includes(${JSON.stringify(
                    text
                )}));
                if (!node) return false;
                node.click();
                return true;
            })()`);
        const setValue = (placeholder, value) =>
            evaluate(`(() => {
                const node = Array.from(document.querySelectorAll('input, textarea')).find(
                    (entry) => entry.placeholder === ${JSON.stringify(
                        placeholder
                    )}
                );
                if (!node) return false;
                const prototype = node instanceof HTMLTextAreaElement
                    ? HTMLTextAreaElement.prototype
                    : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(prototype, 'value').set.call(
                    node,
                    ${JSON.stringify(value)}
                );
                node.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            })()`);

        await waitFor(
            `document.body.innerText.includes('Create a new room')`
        );
        await clickText('Create a new room');
        if (mode !== 'interview') await clickText(modeUi.selector);
        await setValue('How should we call you?', 'UI Smoke Host');
        await clickText('Start private room');
        await waitFor(`location.pathname.startsWith('/editor/')`);
        await waitFor(
            `document.body.innerText.includes(${JSON.stringify(
                modeUi.workspace
            )}) &&
             document.body.innerText.includes('host')`
        );

        await clickText(modeUi.timeline);
        await waitFor(
            `document.body.innerText.toLowerCase().includes(${JSON.stringify(
                modeUi.purpose
            )})`
        );
        await setValue(
            modeUi.titlePlaceholder,
            'UI smoke checkpoint'
        );
        await setValue(
            modeUi.notePlaceholder,
            'Verify replay evidence through the rendered interface.'
        );
        await clickText('Save evidence');
        try {
            await waitFor(
                `document.body.innerText.includes('UI smoke checkpoint')`
            );
        } catch (error) {
            console.error(
                'Sanitized room request trace:',
                JSON.stringify(Array.from(requestTrace.values()))
            );
            throw error;
        }

        await clickText(modeUi.tests);
        await setValue(modeUi.testPlaceholder, 'Increment visible case');
        await setValue('Standard input', '41');
        await setValue('Expected output', '42');
        await clickText('Add test');
        await waitFor(
            `document.body.innerText.includes('Increment visible case')`
        );

        await evaluate(`(() => {
            const wrapper = document.querySelector('.CodeMirror');
            if (!wrapper?.CodeMirror) return false;
            wrapper.CodeMirror.setValue('console.log(Number(stdin) + 1);');
            return true;
        })()`);
        await clickText('Run suite');
        await waitFor(
            `document.body.innerText.includes('1/1 tests passed')`,
            15000
        );
        await clickText(modeUi.timeline, 'aside button');
        await waitFor(`document.body.innerText.includes('1/1 passed')`);

        const capture = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
        });
        fs.writeFileSync(screenshotPath, Buffer.from(capture.data, 'base64'));

        console.log(
            JSON.stringify({
                ok: true,
                screenshotPath,
                verified: [
                    'private room creation',
                    `${mode} guided workflow`,
                    'host role',
                    'lab notebook drawer',
                    'checkpoint creation',
                    'test creation',
                    'JavaScript evaluation suite',
                    'revision-linked test evidence',
                ],
            })
        );
    } finally {
        cdp?.close();
        chrome.kill('SIGTERM');
        await delay(250);
        fs.rmSync(profile, { recursive: true, force: true });
    }
};

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
