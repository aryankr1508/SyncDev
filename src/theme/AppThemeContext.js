import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CACHE_KEY = 'code-sync:application-theme:v1';
const AppThemeContext = createContext(null);

const getInitialTheme = () => {
    try {
        const cachedTheme = window.localStorage.getItem(CACHE_KEY);
        if (cachedTheme === 'light' || cachedTheme === 'dark') return cachedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    } catch (error) {
        return 'dark';
    }
};

export const AppThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.style.colorScheme = theme;
        try {
            window.localStorage.setItem(CACHE_KEY, theme);
        } catch (error) {
            // Theme selection still works when persistent storage is unavailable.
        }
    }, [theme]);

    const contextValue = useMemo(
        () => ({
            theme,
            setTheme,
            toggleTheme: () =>
                setTheme((currentTheme) =>
                    currentTheme === 'dark' ? 'light' : 'dark'
                ),
        }),
        [theme]
    );

    return (
        <AppThemeContext.Provider value={contextValue}>
            {children}
        </AppThemeContext.Provider>
    );
};

export const useAppTheme = () => {
    const context = useContext(AppThemeContext);
    if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
    return context;
};
