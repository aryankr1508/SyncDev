import React from 'react';
import { ActivityIcon, ShieldIcon } from './ui/Icons';
import ThemeToggle from './ui/ThemeToggle';

const WorkspaceHeader = ({
    sessionOpen,
    onToggleSession,
    eventCount = 0,
    currentRole = 'participant',
}) => (
    <header className="flex min-h-[112px] shrink-0 items-center justify-between gap-5 px-7 py-5 transition-colors sm:px-9">
        <p className="text-[12px] font-bold uppercase tracking-[0.26em] text-slate-500 dark:text-[#969db3]">
            Live workspace
        </p>

        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onToggleSession}
                aria-pressed={sessionOpen}
                className={`flex h-12 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold transition sm:px-4 ${
                    sessionOpen
                        ? 'border-sync/40 bg-sync/10 text-emerald-700 dark:text-sync'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sync/30 dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8]'
                }`}
            >
                <ActivityIcon className="h-4 w-8 text-sync" />
                <span className="hidden md:inline">Session evidence</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] dark:bg-white/5">
                    {eventCount}
                </span>
            </button>
            <div className="hidden h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-[12px] text-slate-600 shadow-sm dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8] sm:flex">
                <ShieldIcon className="h-5 w-5 text-[#10d978]" />
                {currentRole === 'observer'
                    ? 'Observer · read only'
                    : 'Evidence syncs automatically'}
            </div>
            <ThemeToggle compact />
        </div>
    </header>
);

export default WorkspaceHeader;
