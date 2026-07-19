import { executionReducer, initialExecutionState } from './useCodeExecution';

test('execution reducer records stream output and completion metadata', () => {
    expect(initialExecutionState.isOpen).toBe(false);
    let state = executionReducer(initialExecutionState, { type: 'START' });
    expect(state.isOpen).toBe(true);
    state = executionReducer(state, { type: 'OUTPUT', stream: 'stdout', text: 'hello\n' });
    state = executionReducer(state, { type: 'FINISH', result: { status: 'success', exitCode: 0, duration: 12 } });
    expect(state).toMatchObject({ status: 'success', stdout: 'hello\n', exitCode: 0, duration: 12 });
});

test('execution reducer bounds panel height and clears output', () => {
    const resized = executionReducer(initialExecutionState, { type: 'HEIGHT', value: 999 });
    expect(resized.height).toBe(520);
    expect(executionReducer({ ...resized, stdout: 'x' }, { type: 'CLEAR' }).stdout).toBe('');
});
