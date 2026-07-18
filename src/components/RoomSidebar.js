import React from 'react';
import BrandLogo from './ui/BrandLogo';
import Client from './Client';
import { ActivityIcon, CopyIcon, ExitIcon } from './ui/Icons';

const statusDetails = {
    connected: {
        label: 'Connected',
        helper: 'You are live in the room',
        dot: 'bg-sync shadow-[0_0_12px_rgba(74,237,136,0.9)]',
    },
    connecting: {
        label: 'Connecting',
        helper: 'Joining the live workspace',
        dot: 'animate-pulse bg-amber-400',
    },
    disconnected: {
        label: 'Reconnecting',
        helper: 'Restoring your connection',
        dot: 'animate-pulse bg-rose-400',
    },
};

const RoomSidebar = ({ clients, socketId, status, onCopyRoom, onLeave }) => {
    const connection = statusDetails[status];
    const hostId = clients[0]?.socketId;

    return (
        <aside className="relative z-20 flex min-h-[650px] flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white/95 px-4 py-5 text-slate-800 backdrop-blur-xl transition-colors duration-300 dark:border-[#1b2741] dark:bg-[#061024]/95 dark:text-white lg:h-full lg:px-5">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_bottom,rgba(52,224,145,0.11),transparent_70%)]" />

            <BrandLogo className="relative mx-auto my-1 w-[230px]" />

            <div className="relative mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#293550] dark:bg-[#0b132a] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                    <span className={`h-3 w-3 rounded-full ${connection.dot}`} />
                    {connection.label}
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-[12px] text-slate-500 dark:text-[#8c94ac]">{connection.helper}</p>
                    <ActivityIcon className="h-5 w-16 shrink-0 text-sync/60" />
                </div>
            </div>

            <div className="relative my-5 h-px bg-slate-200 dark:bg-[#202b43]" />

            <section className="relative min-h-0 flex-1">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#9299ae]">
                        In this room
                    </h2>
                    <span className="min-w-8 rounded-full bg-sync/[0.08] px-2.5 py-1 text-center text-[11px] font-bold text-slate-500 dark:bg-white/[0.05] dark:text-white/85">
                        {clients.length}
                    </span>
                </div>

                <div className="grid max-h-36 grid-cols-2 gap-x-3 overflow-y-auto sm:grid-cols-3 lg:max-h-[calc(100vh-440px)] lg:grid-cols-1">
                    {clients.map((client) => (
                        <Client
                            key={client.socketId}
                            username={client.username}
                            isHost={client.socketId === hostId}
                            isCurrent={client.socketId === socketId}
                        />
                    ))}
                </div>
            </section>

            <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-1">
                <button
                    type="button"
                    onClick={onCopyRoom}
                    className="group flex h-[54px] items-center justify-center gap-3 rounded-xl bg-[linear-gradient(100deg,#35de82,#31e895)] text-sm font-bold text-[#041912] shadow-[0_10px_28px_rgba(49,218,139,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-sync/15 active:translate-y-0"
                >
                    <CopyIcon className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
                    Copy room ID
                </button>
                <button
                    type="button"
                    onClick={onLeave}
                    className="group flex h-[54px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-rose-400/40 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-400/10 dark:border-[#303a55] dark:bg-[#080f22]/80 dark:text-white/85 dark:hover:bg-rose-400/[0.06] dark:hover:text-white"
                >
                    <span className="flex-1 text-center">Leave room</span>
                    <ExitIcon className="h-[18px] w-[18px] text-rose-500 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </aside>
    );
};

export default RoomSidebar;
