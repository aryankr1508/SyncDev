import { fireEvent, render, screen } from '@testing-library/react';
import SessionLabPanel from './SessionLabPanel';

const renderPanel = (overrides = {}) => {
    const props = {
        open: true,
        activeTab: 'settings',
        onTabChange: jest.fn(),
        onClose: jest.fn(),
        roomId: 'room-1',
        session: {
            mode: 'interview',
            editPolicy: 'everyone',
            revision: 'revision-1',
            events: [],
            tests: [],
        },
        clients: [],
        currentRole: 'host',
        isRunning: false,
        onCheckpoint: jest.fn(),
        onRestore: jest.fn(),
        onAddTest: jest.fn(),
        onDeleteTest: jest.fn(),
        onRunTests: jest.fn(),
        onSettings: jest.fn(),
        onExport: jest.fn(),
        ...overrides,
    };

    render(<SessionLabPanel {...props} />);
    return props;
};

test('closes the session drawer from its outside-click layer', () => {
    const props = renderPanel();

    fireEvent.click(
        screen.getByRole('button', { name: /close session drawer/i })
    );

    expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('does not close the session drawer when interacting inside it', () => {
    const props = renderPanel();

    fireEvent.click(screen.getByLabelText(/session mode/i));

    expect(props.onClose).not.toHaveBeenCalled();
});
