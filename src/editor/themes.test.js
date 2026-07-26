import {
    AUTO_EDITOR_THEME,
    DEFAULT_EDITOR_THEME_BY_APP_THEME,
    EDITOR_THEMES,
    resolveEditorTheme,
} from './themes';

test('matches the editor palette to the application theme by default', () => {
    expect(resolveEditorTheme(AUTO_EDITOR_THEME, 'light')).toBe(
        DEFAULT_EDITOR_THEME_BY_APP_THEME.light
    );
    expect(resolveEditorTheme(AUTO_EDITOR_THEME, 'dark')).toBe(
        DEFAULT_EDITOR_THEME_BY_APP_THEME.dark
    );
});

test('keeps a manually selected editor theme independent of the app theme', () => {
    expect(resolveEditorTheme('dracula', 'light')).toBe('dracula');
    expect(resolveEditorTheme('idea', 'dark')).toBe('idea');
});

test('offers multiple light and dark editor palettes', () => {
    const appearances = EDITOR_THEMES.reduce(
        (counts, theme) => ({
            ...counts,
            [theme.appearance]: (counts[theme.appearance] || 0) + 1,
        }),
        {}
    );

    expect(appearances.light).toBeGreaterThanOrEqual(3);
    expect(appearances.dark).toBeGreaterThanOrEqual(3);
});
