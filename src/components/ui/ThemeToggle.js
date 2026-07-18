import React from 'react';
import { useAppTheme } from '../../theme/AppThemeContext';
import { MoonIcon, SunIcon } from './Icons';

const ThemeToggle = ({ compact = false, className = '' }) => {
    const { theme, toggleTheme } = useAppTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-sync/50 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sync/15 dark:border-[#2a344e] dark:bg-[#0a1023] dark:text-[#c6cad6] dark:shadow-none dark:hover:text-white ${compact ? 'h-12 w-12 p-0' : ''} ${className}`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} application theme`}
            title={`Application theme: ${isDark ? 'Dark' : 'Light'}`}
        >
            <span className="relative h-5 w-5">
                <SunIcon
                    className={`absolute h-5 w-5 transition duration-300 ${
                        isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
                    }`}
                />
                <MoonIcon
                    className={`absolute h-5 w-5 transition duration-300 ${
                        isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'
                    }`}
                />
            </span>
            {!compact && <span>{isDark ? 'Dark' : 'Light'} app</span>}
        </button>
    );
};

export default ThemeToggle;
