import React from 'react';
import { ShieldIcon } from './ui/Icons';
import ThemeToggle from './ui/ThemeToggle';

const WorkspaceHeader = () => (
    <header className="flex min-h-[112px] shrink-0 items-center justify-between gap-5 px-7 py-5 transition-colors sm:px-9">
        <p className="text-[12px] font-bold uppercase tracking-[0.26em] text-slate-500 dark:text-[#969db3]">
            Live workspace
        </p>

        <div className="flex items-center gap-2">
            <div className="hidden h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-[12px] text-slate-600 shadow-sm dark:border-[#26304a] dark:bg-[#0b1125] dark:text-[#b2b7c8] sm:flex">
                <ShieldIcon className="h-5 w-5 text-[#10d978]" />
                Changes sync automatically
            </div>
            <ThemeToggle compact />
        </div>
    </header>
);

export default WorkspaceHeader;
