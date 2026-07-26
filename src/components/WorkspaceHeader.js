import React from 'react';
import { getModeExperience } from '../session/modes';
import { ActivityIcon, ShieldIcon } from './ui/Icons';
import ThemeToggle from './ui/ThemeToggle';

const WorkspaceHeader = ({
    sessionOpen,
    onToggleSession,
    eventCount = 0,
    currentRole = 'participant',
    mode = 'interview',
}) => {
    const experience = getModeExperience(mode);

    return (
        <header className="flex min-h-[112px] shrink-0 items-center justify-between gap-5 px-7 py-5 transition-colors sm:px-9">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="mode-chip rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em]">
                        {experience.shortLabel}
                    </span>
                    <span className="hidden text-[10px] font-semibold text-slate-400 lg:inline">
                        {experience.purpose}
                    </span>
                </div>
                <p className="mt-2 truncate text-[13px] font-extrabold text-slate-800 dark:text-white">
                    {experience.workspaceTitle}
                </p>
                <p className="mt-0.5 hidden text-[10px] text-slate-500 dark:text-[#8992a8] md:block">
                    {experience.workspaceGoal}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleSession}
                    aria-pressed={sessionOpen}
                    className={`flex h-12 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold transition sm:px-4 ${
                        sessionOpen
                            ? 'mode-action-active'
                            : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8]'
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
                <div className="hidden h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-[11px] text-slate-600 shadow-sm dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8] xl:flex">
                    <ShieldIcon className="h-5 w-5 text-[#10d978]" />
                    {currentRole === 'observer'
                        ? 'Observer · read only'
                        : experience.liveStatus}
                </div>
                <ThemeToggle compact />
            </div>
        </header>
    );
};

export default WorkspaceHeader;
