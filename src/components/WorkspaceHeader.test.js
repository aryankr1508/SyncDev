import { fireEvent, render, screen } from '@testing-library/react';
import { AppThemeProvider } from '../theme/AppThemeContext';
import WorkspaceHeader from './WorkspaceHeader';

const renderHeader = (overrides = {}) => {
    const props = {
        sessionOpen: false,
        activeSessionTab: 'timeline',
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

test('keeps activity informational and uses the gear as the settings control', () => {
    const props = renderHeader();

    expect(screen.getByLabelText(/attempts: 4 activity events/i)).toBeInTheDocument();
    expect(
        screen.queryByRole('button', { name: /attempts/i })
    ).not.toBeInTheDocument();

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
