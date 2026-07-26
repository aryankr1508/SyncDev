export const EDITOR_THEMES = [
    {
        id: 'dracula',
        label: 'Dracula',
        appearance: 'dark',
        codeMirrorTheme: 'dracula',
        background: '#171b2c',
        gutter: '#151a2b',
        lineNumber: '#69708a',
        placeholder: '#777d94',
        activeLine: 'rgba(188, 147, 249, 0.07)',
        cursor: '#53e29c',
        preview: '#bd93f9',
    },
    {
        id: 'material-darker',
        label: 'Material Dark',
        appearance: 'dark',
        codeMirrorTheme: 'material-darker',
        background: '#212121',
        gutter: '#212121',
        lineNumber: '#616161',
        placeholder: '#6f7477',
        activeLine: 'rgba(128, 203, 196, 0.055)',
        cursor: '#80cbc4',
        preview: '#80cbc4',
    },
    {
        id: 'monokai',
        label: 'Monokai',
        appearance: 'dark',
        codeMirrorTheme: 'monokai',
        background: '#272822',
        gutter: '#272822',
        lineNumber: '#75715e',
        placeholder: '#75715e',
        activeLine: 'rgba(255, 255, 255, 0.045)',
        cursor: '#f8f8f0',
        preview: '#f92672',
    },
    {
        id: 'eclipse',
        label: 'GitHub Light',
        appearance: 'light',
        codeMirrorTheme: 'eclipse',
        background: '#ffffff',
        gutter: '#f5f7fa',
        lineNumber: '#9aa1ad',
        placeholder: '#a6acb8',
        activeLine: 'rgba(65, 132, 228, 0.065)',
        cursor: '#1f2937',
        preview: '#3f7f5f',
    },
    {
        id: 'idea',
        label: 'IntelliJ Light',
        appearance: 'light',
        codeMirrorTheme: 'idea',
        background: '#ffffff',
        gutter: '#f4f6f8',
        lineNumber: '#8a94a4',
        placeholder: '#98a2b3',
        activeLine: 'rgba(37, 99, 235, 0.055)',
        cursor: '#2563eb',
        preview: '#2563eb',
    },
    {
        id: 'neo',
        label: 'Paper Light',
        appearance: 'light',
        codeMirrorTheme: 'neo',
        background: '#fbfcfe',
        gutter: '#f1f5f9',
        lineNumber: '#94a3b8',
        placeholder: '#9ca3af',
        activeLine: 'rgba(5, 150, 105, 0.055)',
        cursor: '#059669',
        preview: '#059669',
    },
    {
        id: 'solarized-light',
        label: 'Solarized Light',
        appearance: 'light',
        codeMirrorTheme: 'solarized light',
        background: '#fdf6e3',
        gutter: '#f4edda',
        lineNumber: '#93a1a1',
        placeholder: '#93a1a1',
        activeLine: 'rgba(38, 139, 210, 0.065)',
        cursor: '#268bd2',
        preview: '#b58900',
    },
];

export const EDITOR_THEME_MAP = EDITOR_THEMES.reduce((themeMap, theme) => {
    themeMap[theme.id] = theme;
    return themeMap;
}, {});

export const AUTO_EDITOR_THEME = 'auto';
export const EDITOR_THEME_IDS = EDITOR_THEMES.map((theme) => theme.id);

export const DEFAULT_EDITOR_THEME_BY_APP_THEME = Object.freeze({
    light: 'idea',
    dark: 'dracula',
});

export const resolveEditorTheme = (themePreference, appTheme) => {
    if (EDITOR_THEME_MAP[themePreference]) return themePreference;
    return (
        DEFAULT_EDITOR_THEME_BY_APP_THEME[appTheme] ||
        DEFAULT_EDITOR_THEME_BY_APP_THEME.dark
    );
};
