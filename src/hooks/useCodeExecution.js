import { useCallback, useReducer, useRef } from 'react';
import { startCodeExecution } from '../utils/codeRunner';

export const initialExecutionState = { status: 'idle', stdout: '', stderr: '', exitCode: null, duration: null, stdin: '', isOpen: true, height: 270 };

export const executionReducer = (state, action) => {
    switch (action.type) {
        case 'START': return { ...state, status: 'running', stdout: '', stderr: '', exitCode: null, duration: null, isOpen: true };
        case 'OUTPUT': return { ...state, [action.stream]: `${state[action.stream]}${action.text}` };
        case 'FINISH': return { ...state, ...action.result, stdout: `${state.stdout}${action.result.stdout || ''}`, stderr: `${state.stderr}${action.result.stderr || ''}`, status: action.result.status || 'success' };
        case 'STOP': return { ...state, status: 'cancelled', exitCode: null, stderr: `${state.stderr}Execution cancelled.\n` };
        case 'CLEAR': return { ...state, stdout: '', stderr: '', exitCode: null, duration: null, status: 'idle' };
        case 'STDIN': return { ...state, stdin: action.value };
        case 'OPEN': return { ...state, isOpen: action.value };
        case 'HEIGHT': return { ...state, height: Math.max(160, Math.min(520, action.value)) };
        default: return state;
    }
};

export const useCodeExecution = () => {
    const [state, dispatch] = useReducer(executionReducer, initialExecutionState);
    const activeRef = useRef(null);
    const run = useCallback((request) => {
        if (activeRef.current) activeRef.current.cancel();
        dispatch({ type: 'START' });
        const execution = startCodeExecution({ ...request, stdin: state.stdin }, (stream, text) => dispatch({ type: 'OUTPUT', stream, text }));
        activeRef.current = execution;
        execution.promise.then((next) => {
            if (activeRef.current === execution) { dispatch({ type: 'FINISH', result: next }); activeRef.current = null; }
        });
    }, [state.stdin]);
    const stop = useCallback(() => { if (activeRef.current) { activeRef.current.cancel(); activeRef.current = null; dispatch({ type: 'STOP' }); } }, []);
    return { state, run, stop, dispatch };
};
