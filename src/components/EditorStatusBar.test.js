import { fireEvent, render, screen } from '@testing-library/react';
import EditorStatusBar from './EditorStatusBar';

const renderStatusBar = (preferenceChange = jest.fn()) =>
    render(
        <EditorStatusBar
            cursor={{ line: 1, column: 1, selected: 0 }}
            languageChoice="auto"
            detectedLanguage="javascript"
            preferences={{
                theme: 'auto',
                fontSize: 16,
                wordWrap: true,
            }}
            appTheme="light"
            resolvedEditorTheme="idea"
            connectionStatus="connected"
            onLanguageChange={jest.fn()}
            onPreferenceChange={preferenceChange}
            onRun={jest.fn()}
            onShowOutput={jest.fn()}
            isRunning={false}
        />
    );

test('shows the light editor fallback when matching the application', () => {
    renderStatusBar();

    expect(screen.getByText('Match app · IntelliJ Light')).toBeInTheDocument();
    expect(screen.getByText('Recommended for light app')).toBeInTheDocument();
    expect(screen.getByText('Dark editor themes')).toBeInTheDocument();
});

test('allows a dark editor palette while the application remains light', () => {
    const preferenceChange = jest.fn();
    renderStatusBar(preferenceChange);

    fireEvent.click(screen.getByRole('button', { name: /dracula dark/i }));

    expect(preferenceChange).toHaveBeenCalledWith({
        type: 'SET_THEME',
        value: 'dracula',
    });
});
