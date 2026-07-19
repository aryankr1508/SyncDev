import React from 'react';
import { LANGUAGES, LANGUAGE_MAP } from '../editor/languages';
import { EDITOR_THEMES, EDITOR_THEME_MAP } from '../editor/themes';
import {
    ChevronIcon,
    CodeIcon,
    PlayIcon,
    SettingsIcon,
} from './ui/Icons';

const controlClass =
    'flex h-12 items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sync/10 dark:border-[#2b354f] dark:bg-[#0a1023] dark:text-[#c0c4d1] dark:shadow-none dark:hover:border-[#3a4664] dark:hover:bg-white/[0.035]';
const popoverClass =
    'absolute bottom-[58px] z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(30,45,70,0.2)] dark:border-[#303952] dark:bg-[#090f22] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]';

const LANGUAGE_BADGES = {
    javascript: 'JS',
    typescript: 'TS',
    jsx: 'JSX',
    tsx: 'TSX',
    html: '<>',
    css: '#',
    python: 'PY',
    java: 'JV',
    cpp: 'C++',
    csharp: 'C#',
};

const EditorStatusBar = ({
    cursor,
    languageChoice,
    detectedLanguage,
    preferences,
    connectionStatus,
    onLanguageChange,
    onPreferenceChange,
    onRun,
    isRunning,
}) => {
    const effectiveLanguage =
        languageChoice === 'auto' ? detectedLanguage : languageChoice;
    const language = LANGUAGE_MAP[effectiveLanguage] || LANGUAGE_MAP.plain;
    const editorTheme =
        EDITOR_THEME_MAP[preferences.theme] || EDITOR_THEME_MAP.dracula;

    const chooseEditorTheme = (event, themeId) => {
        onPreferenceChange({ type: 'SET_THEME', value: themeId });
        event.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
        <footer className="relative z-30 mx-5 mb-5 mt-5 flex min-h-[88px] shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 shadow-sm transition-colors dark:border-[#252e47] dark:bg-[#080e20] dark:text-[#9299ae]">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                <details className="group relative">
                    <summary
                        className={`${controlClass} min-w-[160px] cursor-pointer list-none gap-3 px-4 [&::-webkit-details-marker]:hidden`}
                        title="Compiler syntax theme"
                    >
                        <span
                            className="h-5 w-5 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                            style={{ backgroundColor: editorTheme.preview }}
                        />
                        <span className="flex-1 text-left text-xs font-semibold">
                            {editorTheme.label}
                        </span>
                        <ChevronIcon className="h-4 w-4 transition group-open:rotate-180" />
                    </summary>
                    <div className={`${popoverClass} left-0 w-60`}>
                        <p className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-[#7e869f]">
                            Compiler syntax theme
                        </p>
                        {EDITOR_THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                type="button"
                                onClick={(event) => chooseEditorTheme(event, theme.id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition ${
                                    preferences.theme === theme.id
                                        ? 'bg-sync/10 text-slate-900 dark:text-white'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-[#a4aabd] dark:hover:bg-white/5'
                                }`}
                            >
                                <span
                                    className="h-5 w-5 rounded-full border border-black/10 dark:border-white/10"
                                    style={{ backgroundColor: theme.preview }}
                                />
                                <span className="flex-1 text-xs font-semibold">{theme.label}</span>
                                {preferences.theme === theme.id && <span className="text-sync">✓</span>}
                            </button>
                        ))}
                    </div>
                </details>

                <button
                    type="button"
                    onClick={() => onLanguageChange({ target: { value: 'auto' } })}
                    className={`${controlClass} w-12 justify-center ${
                        languageChoice === 'auto' ? '!border-sync/40 !text-sync' : ''
                    }`}
                    title="Auto-detect language"
                    aria-pressed={languageChoice === 'auto'}
                >
                    <CodeIcon className="h-5 w-5" />
                </button>

                <label className={`${controlClass} relative min-w-[190px] px-4`}>
                    <span className="pointer-events-none flex h-5 min-w-5 items-center justify-center rounded bg-amber-300 px-1 font-mono text-[9px] font-black text-[#2d2703]">
                        {LANGUAGE_BADGES[effectiveLanguage] || language.label.slice(0, 2).toUpperCase()}
                    </span>
                    <select
                        value={languageChoice}
                        onChange={onLanguageChange}
                        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-xs font-semibold text-slate-700 outline-none dark:text-[#c0c4d1]"
                        title="Language mode"
                    >
                        <option value="auto">Auto · {language.label}</option>
                        {LANGUAGES.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronIcon className="pointer-events-none absolute right-3 h-4 w-4" />
                </label>

                <details className="group relative">
                    <summary className={`${controlClass} w-12 cursor-pointer list-none justify-center font-mono text-sm [&::-webkit-details-marker]:hidden`} title="Font size">
                        Aa
                    </summary>
                    <div className={`${popoverClass} left-0 flex w-44 items-center justify-between`}>
                        <button
                            type="button"
                            onClick={() => onPreferenceChange({ type: 'SET_FONT_SIZE', value: preferences.fontSize - 1 })}
                            className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            A−
                        </button>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{preferences.fontSize}px</span>
                        <button
                            type="button"
                            onClick={() => onPreferenceChange({ type: 'SET_FONT_SIZE', value: preferences.fontSize + 1 })}
                            className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            A+
                        </button>
                    </div>
                </details>

                <details className="group relative">
                    <summary className={`${controlClass} w-12 cursor-pointer list-none justify-center [&::-webkit-details-marker]:hidden`} title="Editor settings">
                        <SettingsIcon className="h-5 w-5 transition group-open:rotate-45" />
                    </summary>
                    <div className={`${popoverClass} left-0 w-56`}>
                        <button
                            type="button"
                            onClick={() => onPreferenceChange({ type: 'TOGGLE_WORD_WRAP' })}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-[#b8bdcc] dark:hover:bg-white/5"
                        >
                            Word wrap
                            <span className={`relative h-5 w-9 rounded-full transition ${preferences.wordWrap ? 'bg-sync' : 'bg-slate-300 dark:bg-white/15'}`}>
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${preferences.wordWrap ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                        </button>
                        <p className="px-3 pb-1 pt-2 text-[10px] leading-4 text-slate-400 dark:text-[#737c95]">
                            Auto-close pairs, matching brackets, autocomplete and syntax detection are active.
                        </p>
                    </div>
                </details>
            </div>

            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-4">
                {cursor.selected > 0 && <span className="hidden xl:inline">Sel {cursor.selected}</span>}
                <span>Ln {cursor.line}, Col {cursor.column}</span>
                <span className="hidden md:inline">Spaces: 4</span>
                <span className="hidden xl:inline">UTF-8</span>
                <span className="hidden 2xl:inline">LF</span>
                <span className={`inline-flex h-7 items-center gap-2 rounded-lg px-3 font-bold uppercase ${
                    connectionStatus === 'connected'
                        ? 'bg-sync/[0.07] text-[#0ecb6f]'
                        : 'bg-amber-400/10 text-amber-500'
                }`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-[#18dd78] shadow-[0_0_8px_rgba(24,221,120,0.65)]' : 'animate-pulse bg-amber-400'}`} />
                    {connectionStatus === 'connected' ? 'Live' : 'Syncing'}
                </span>

                <div className="flex h-12 rounded-xl bg-[linear-gradient(100deg,#32dc82,#2de68f)] text-[#031a11] shadow-[0_10px_26px_rgba(45,224,135,0.2)]">
                    <button
                        type="button"
                        onClick={onRun}
                        disabled={isRunning}
                        className="flex min-w-[84px] items-center justify-center gap-2 rounded-l-xl px-4 text-sm font-extrabold transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                    >
                        <PlayIcon className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
                        {isRunning ? 'Running' : 'Run'}
                    </button>
                    <details className="group relative rounded-r-xl border-l border-black/10">
                        <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center transition hover:bg-black/5 [&::-webkit-details-marker]:hidden" title="Run options">
                            <ChevronIcon className="h-4 w-4 transition group-open:rotate-180" />
                        </summary>
                        <div className={`${popoverClass} -right-0 w-56 text-slate-700 dark:text-[#c0c4d1]`}>
                            <button type="button" onClick={onRun} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5">
                                <PlayIcon className="h-4 w-4 text-sync" />
                                Run with configured runtime
                            </button>
                            <p className="px-3 pb-1 pt-2 text-[10px] leading-4 text-slate-400">JavaScript runs locally. Other runtimes use a configured isolated provider and stop after 4 seconds.</p>
                        </div>
                    </details>
                </div>
            </div>
        </footer>
    );
};

export default EditorStatusBar;
