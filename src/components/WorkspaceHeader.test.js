import { fireEvent, render, screen } from '@testing-library/react';
import { AppThemeProvider } from '../theme/AppThemeContext';
import WorkspaceHeader from './WorkspaceHeader';

const renderHeader = (overrides = {}) => {
    const props = {
        sessionOpen: false,
        activeSessionTab: 'timeline',
        onOpenTimeline: jest.fn(),
        onOpenSettings: jest.fn(),
        eventCount: 4,
        currentRole: 'host',
        mode: 'interview',
        ...overrides,
    };

    render(
        <AppThemeProvider>
            <WorkspaceHeader {...props} />
        </AppThemeProvider>
    );

    return props;
};

test('keeps activity and room settings as separate controls', () => {
    const props = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: /attempts 4/i }));
    expect(props.onOpenTimeline).toHaveBeenCalledTimes(1);
    expect(props.onOpenSettings).not.toHaveBeenCalled();

    fireEvent.click(
        screen.getByRole('button', { name: /open interview setup/i })
    );
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
});

test('renders mode-specific guidance instead of only changing color', () => {
    renderHeader({ mode: 'debugging' });

    expect(
        screen.getByRole('region', { name: /debugging session guide/i })
    ).toHaveAttribute('data-mode', 'debugging');
    expect(screen.getByText('Diagnostic loop')).toBeInTheDocument();
    expect(screen.getByText('Hypothesis')).toBeInTheDocument();
});
