import React from 'react';
import { getModeExperience } from '../session/modes';
import {
    ActivityIcon,
    ModeIcon,
    SettingsIcon,
    ShieldIcon,
} from './ui/Icons';
import ThemeToggle from './ui/ThemeToggle';

const WorkspaceHeader = ({
    sessionOpen,
    activeSessionTab,
    onOpenTimeline,
    onOpenSettings,
    eventCount = 0,
    currentRole = 'participant',
    mode = 'interview',
}) => {
    const experience = getModeExperience(mode);
    const timelineActive =
        sessionOpen && activeSessionTab === 'timeline';
    const settingsActive =
        sessionOpen && activeSessionTab === 'settings';

    return (
        <header className="relative z-10 shrink-0 px-4 pb-4 pt-4 transition-colors sm:px-6 sm:pt-5">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="mode-chip inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em]">
                            <ModeIcon
                                icon={experience.icon}
                                className="h-3.5 w-3.5"
                            />
                            {experience.shortLabel}
                        </span>
                        <span className="hidden text-[10px] font-semibold text-slate-400 lg:inline">
                            {experience.purpose}
                        </span>
                    </div>
                    <p className="mt-2 truncate text-[13px] font-extrabold text-slate-800 dark:text-white">
                        {experience.workspaceTitle}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#26304a] dark:bg-[#0b1125] dark:shadow-none">
                        <button
                            type="button"
                            onClick={onOpenTimeline}
                            aria-pressed={timelineActive}
                            className={`flex items-center gap-2 px-3 text-[11px] font-bold transition sm:px-4 ${
                                timelineActive
                                    ? 'mode-action-active'
                                    : 'text-slate-600 hover:bg-slate-50 dark:text-[#b2b7c8] dark:hover:bg-white/[0.035]'
                            }`}
                        >
                            <ActivityIcon className="mode-accent-text h-4 w-8" />
                            <span className="hidden md:inline">
                                {experience.timelineTab}
                            </span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-white/5">
                                {eventCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            aria-pressed={settingsActive}
                            aria-label={`Open ${experience.settingsTitle}`}
                            title={experience.settingsTitle}
                            className={`flex w-12 items-center justify-center border-l border-slate-200 transition dark:border-[#26304a] ${
                                settingsActive
                                    ? 'mode-action-active'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-[#8992a8] dark:hover:bg-white/[0.035] dark:hover:text-white'
                            }`}
                        >
                            <SettingsIcon
                                className={`h-5 w-5 transition-transform ${
                                    settingsActive ? 'rotate-45' : ''
                                }`}
                            />
                        </button>
                    </div>
                    <div className="hidden h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-[11px] text-slate-600 shadow-sm dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8] xl:flex">
                        <ShieldIcon className="h-5 w-5 text-[#10d978]" />
                        {currentRole === 'observer'
                            ? 'Observer · read only'
                            : experience.liveStatus}
                    </div>
                    <ThemeToggle compact />
                </div>
            </div>

            <section
                data-mode={mode}
                className="mode-guide mt-4 flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 sm:gap-4 sm:px-4"
                aria-label={`${experience.shortLabel} session guide`}
            >
                <span className="mode-guide-icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <ModeIcon
                        icon={experience.icon}
                        className="h-6 w-6"
                    />
                </span>
                <div className="relative min-w-0 flex-1">
                    <p className="mode-accent-text text-[9px] font-extrabold uppercase tracking-[0.2em]">
                        {experience.missionTitle}
                    </p>
                    <p className="mt-1 max-w-3xl text-[11px] font-medium leading-4 text-slate-600 dark:text-[#a8b0c4]">
                        {experience.missionPrompt}
                    </p>
                </div>
                <div className="relative hidden shrink-0 gap-1.5 lg:flex">
                    {experience.focusPoints.map((point, index) => (
                        <span
                            key={point}
                            className="mode-focus-pill rounded-lg px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-wide"
                        >
                            <span className="mode-accent-text mr-1">
                                0{index + 1}
                            </span>
                            {point}
                        </span>
                    ))}
                </div>
            </section>
        </header>
    );
};

export default WorkspaceHeader;
