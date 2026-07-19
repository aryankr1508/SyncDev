import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OutputPanel from './OutputPanel';

test('shows terminal controls and accepts stdin', () => {
    const execution = { state: { status: 'success', stdout: 'Hello\n', stderr: '', exitCode: 0, duration: 4, stdin: '', isOpen: true, height: 270 }, dispatch: jest.fn() };
    render(<OutputPanel execution={execution} onRun={jest.fn()} onStop={jest.fn()} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/standard input/i), { target: { value: 'Ada' } });
    expect(execution.dispatch).toHaveBeenCalledWith({ type: 'STDIN', value: 'Ada' });
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
});
