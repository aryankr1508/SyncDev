import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username, isHost, isCurrent }) => (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-1 py-2.5 transition duration-200 hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.035]">
        <div className="relative shrink-0">
            <Avatar name={username} size={36} round="12px" textSizeRatio={2.2} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-sync shadow-[0_0_8px_rgba(74,237,136,0.75)] dark:border-[#080c20]" />
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-800 dark:text-white/90">
                    {username}
                </span>
                {isHost && (
                    <span className="rounded-full bg-sync/10 px-2 py-0.5 text-[9px] font-bold text-sync">
                        Host
                    </span>
                )}
            </div>
            {isCurrent && (
                <span className="mt-0.5 block text-[10px] text-slate-400 dark:text-[#727991]">You</span>
            )}
        </div>
    </div>
);

export default Client;
