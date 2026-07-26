import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
});

test('renders the room join experience', () => {
    render(<App />);

    expect(
        screen.getByRole('heading', { name: /join a coding room/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    expect(
        screen.getByRole('button', { name: /create a new room/i })
    ).toBeInTheDocument();
});

test('creates a room and moves focus to the display name', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /create a new room/i }));

    expect(screen.getByPlaceholderText(/invitation id/i).value).not.toBe('');
    expect(screen.getByPlaceholderText(/how should we call you/i)).toHaveFocus();
});

test('explains and previews each room workflow before creation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /create a new room/i }));

    expect(
        screen.getByRole('radio', {
            name: /interview evaluate problem-solving/i,
        })
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Observe')).toBeInTheDocument();

    fireEvent.click(
        screen.getByRole('radio', {
            name: /debugging resolve issues systematically/i,
        })
    );

    expect(screen.getByText('Reproduce')).toBeInTheDocument();
    expect(
        screen.getByText(/preserve reproduction steps, hypotheses/i)
    ).toBeInTheDocument();
});

test('switches and persists the application theme', () => {
    render(<App />);
    const startedInDarkMode = document.documentElement.classList.contains('dark');
    const nextTheme = startedInDarkMode ? 'light' : 'dark';

    fireEvent.click(
        screen.getByRole('button', {
            name: /switch to (?:light|dark) application theme/i,
        })
    );

    expect(document.documentElement.classList.contains('dark')).toBe(
        !startedInDarkMode
    );
    expect(window.localStorage.getItem('code-sync:application-theme:v1')).toBe(
        nextTheme
    );
    expect(
        screen.getByRole('button', {
            name: new RegExp(
                `switch to ${startedInDarkMode ? 'dark' : 'light'}`,
                'i'
            ),
        })
    ).toBeInTheDocument();
});
