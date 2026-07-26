import React from 'react';
import Avatar from 'react-avatar';

const Client = ({
    username,
    role = 'participant',
    isCurrent,
    canManageRole,
    onRoleChange,
}) => (
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
                <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        role === 'host'
                            ? 'bg-sync/10 text-sync'
                            : role === 'observer'
                              ? 'bg-violet-500/10 text-violet-500'
                              : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-[#8992a8]'
                    }`}
                >
                    {role}
                </span>
            </div>
            {canManageRole ? (
                <select
                    value={role}
                    onChange={(event) => onRoleChange(event.target.value)}
                    className="mt-1 w-full cursor-pointer bg-transparent text-[10px] font-semibold text-slate-400 outline-none dark:text-[#727991]"
                    aria-label={`Change ${username}'s role`}
                >
                    <option value="participant">Can edit</option>
                    <option value="observer">Read only</option>
                </select>
            ) : (
                isCurrent && (
                    <span className="mt-0.5 block text-[10px] text-slate-400 dark:text-[#727991]">
                        You
                    </span>
                )
            )}
        </div>
    </div>
);

export default Client;
