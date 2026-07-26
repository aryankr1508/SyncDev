import { useCallback, useReducer, useRef } from 'react';
import { startCodeExecution } from '../utils/codeRunner';

export const initialExecutionState = {
    status: 'idle',
    stdout: '',
    stderr: '',
    exitCode: null,
    duration: null,
    stdin: '',
    isOpen: false,
    height: 240,
    testResults: [],
};

export const executionReducer = (state, action) => {
    switch (action.type) {
        case 'START':
            return {
                ...state,
                status: 'running',
                stdout: '',
                stderr: '',
                exitCode: null,
                duration: null,
                isOpen: true,
                testResults: [],
            };
        case 'OUTPUT':
            return {
                ...state,
                [action.stream]: `${state[action.stream]}${action.text}`,
            };
        case 'FINISH':
            return {
                ...state,
                ...action.result,
                stdout:
                    action.result.stdout === undefined
                        ? state.stdout
                        : action.result.stdout,
                stderr:
                    action.result.stderr === undefined
                        ? state.stderr
                        : action.result.stderr,
                status: action.result.status || 'success',
            };
        case 'STOP':
            return {
                ...state,
                status: 'cancelled',
                exitCode: null,
                stderr: `${state.stderr}Execution cancelled.\n`,
            };
        case 'CLEAR':
            return {
                ...state,
                stdout: '',
                stderr: '',
                exitCode: null,
                duration: null,
                status: 'idle',
                testResults: [],
            };
        case 'STDIN':
            return { ...state, stdin: action.value };
        case 'OPEN':
            return { ...state, isOpen: action.value };
        case 'HEIGHT':
            return {
                ...state,
                height: Math.max(160, Math.min(520, action.value)),
            };
        default:
            return state;
    }
};

const comparable = (value) =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .trimEnd();

export const useCodeExecution = () => {
    const [state, dispatch] = useReducer(
        executionReducer,
        initialExecutionState
    );
    const activeRef = useRef(null);

    const run = useCallback(
        (request) => {
            if (activeRef.current) activeRef.current.cancel();
            dispatch({ type: 'START' });
            const execution = startCodeExecution(
                { ...request, stdin: request.stdin ?? state.stdin },
                (stream, text) =>
                    dispatch({ type: 'OUTPUT', stream, text })
            );
            activeRef.current = execution;
            return execution.promise.then((next) => {
                if (activeRef.current === execution) {
                    dispatch({ type: 'FINISH', result: next });
                    activeRef.current = null;
                }
                return next;
            });
        },
        [state.stdin]
    );

    const runSuite = useCallback(async ({ tests = [], ...request }) => {
        if (activeRef.current) activeRef.current.cancel();
        dispatch({ type: 'START' });

        let cancelled = false;
        let currentExecution = null;
        const controller = {
            cancel: () => {
                cancelled = true;
                currentExecution?.cancel();
            },
        };
        activeRef.current = controller;
        const startedAt = performance.now();
        const testResults = [];

        for (let index = 0; index < tests.length; index += 1) {
            if (cancelled) break;
            const test = tests[index];
            const captured = { stdout: '', stderr: '' };
            currentExecution = startCodeExecution(
                {
                    ...request,
                    stdin: test.stdin || '',
                },
                (stream, text) => {
                    captured[stream] = `${captured[stream]}${text}`;
                }
            );
            // Test runs are intentionally collected rather than streamed so a
            // hidden test never leaks its input through intermediate UI.
            const rawResult = await currentExecution.promise;
            const executionResult = {
                ...rawResult,
                stdout: rawResult.stdout || captured.stdout,
                stderr: rawResult.stderr || captured.stderr,
            };
            const passed =
                executionResult.status === 'success' &&
                comparable(executionResult.stdout) ===
                    comparable(test.expectedOutput);
            testResults.push({
                id: test.id,
                label: test.hidden
                    ? `Hidden test ${index + 1}`
                    : test.label,
                hidden: Boolean(test.hidden),
                passed,
                status: executionResult.status,
                duration: executionResult.duration,
                actual: test.hidden ? '' : executionResult.stdout,
                expected: test.hidden ? '' : test.expectedOutput,
                stderr: test.hidden ? '' : executionResult.stderr,
            });
        }

        if (cancelled) {
            const cancelledResult = {
                status: 'cancelled',
                exitCode: null,
                duration: Math.round(performance.now() - startedAt),
                stdout: '',
                stderr: 'Test run cancelled.\n',
                testResults,
            };
            if (activeRef.current === controller) {
                dispatch({ type: 'FINISH', result: cancelledResult });
                activeRef.current = null;
            }
            return cancelledResult;
        }

        const passed = testResults.filter((test) => test.passed).length;
        const summary = testResults
            .map(
                (test) =>
                    `${test.passed ? '✓' : '✕'} ${test.label}${
                        Number.isFinite(test.duration)
                            ? ` (${test.duration}ms)`
                            : ''
                    }`
            )
            .join('\n');
        const result = {
            status: passed === testResults.length ? 'success' : 'error',
            exitCode: passed === testResults.length ? 0 : 1,
            duration: Math.round(performance.now() - startedAt),
            stdout: `${summary}\n\n${passed}/${testResults.length} tests passed.\n`,
            stderr: '',
            testResults,
            total: testResults.length,
            passed,
        };
        if (activeRef.current === controller) {
            dispatch({ type: 'FINISH', result });
            activeRef.current = null;
        }
        return result;
    }, []);

    const stop = useCallback(() => {
        if (activeRef.current) {
            activeRef.current.cancel();
            activeRef.current = null;
            dispatch({ type: 'STOP' });
        }
    }, []);

    return { state, run, runSuite, stop, dispatch };
};
