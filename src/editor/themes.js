export const EDITOR_THEMES = [
    {
        id: 'dracula',
        label: 'Dracula',
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
        background: '#ffffff',
        gutter: '#f5f7fa',
        lineNumber: '#9aa1ad',
        placeholder: '#a6acb8',
        activeLine: 'rgba(65, 132, 228, 0.065)',
        cursor: '#1f2937',
        preview: '#3f7f5f',
    },
];

export const EDITOR_THEME_MAP = EDITOR_THEMES.reduce((themeMap, theme) => {
    themeMap[theme.id] = theme;
    return themeMap;
}, {});
