import { useEffect, useReducer } from 'react';

const CACHE_KEY = 'code-sync:editor-preferences:v2';
const defaults = {
    theme: 'dracula',
    fontSize: 16,
    wordWrap: true,
};
const validThemes = new Set([
    'dracula',
    'material-darker',
    'monokai',
    'eclipse',
]);

const loadPreferences = () => {
    try {
        const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY));
        return {
            theme: validThemes.has(cached?.theme) ? cached.theme : defaults.theme,
            fontSize: Number.isFinite(cached?.fontSize)
                ? Math.min(22, Math.max(12, cached.fontSize))
                : defaults.fontSize,
            wordWrap:
                typeof cached?.wordWrap === 'boolean'
                    ? cached.wordWrap
                    : defaults.wordWrap,
        };
    } catch (error) {
        return defaults;
    }
};

const preferenceReducer = (state, action) => {
    switch (action.type) {
        case 'SET_THEME':
            return validThemes.has(action.value)
                ? { ...state, theme: action.value }
                : state;
        case 'SET_FONT_SIZE':
            return {
                ...state,
                fontSize: Math.min(22, Math.max(12, action.value)),
            };
        case 'TOGGLE_WORD_WRAP':
            return { ...state, wordWrap: !state.wordWrap };
        default:
            return state;
    }
};

export const useEditorPreferences = () => {
    const [preferences, dispatch] = useReducer(
        preferenceReducer,
        undefined,
        loadPreferences
    );

    useEffect(() => {
        const cacheTimer = window.setTimeout(() => {
            try {
                window.localStorage.setItem(CACHE_KEY, JSON.stringify(preferences));
            } catch (error) {
                // Private browsing can disable storage without affecting the editor.
            }
        }, 150);

        return () => window.clearTimeout(cacheTimer);
    }, [preferences]);

    return [preferences, dispatch];
};
