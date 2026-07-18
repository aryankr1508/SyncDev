import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import {
    ArrowRightIcon,
    CopyIcon,
    PlusIcon,
    UserIcon,
} from '../components/ui/Icons';
import { copyText } from '../utils/clipboard';
import { rememberRoomUser } from '../utils/roomSession';

const createRoomId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const Home = () => {
    const navigate = useNavigate();
    const usernameInputRef = useRef(null);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = () => {
        const newRoomId = createRoomId();
        setRoomId(newRoomId);
        usernameInputRef.current?.focus();
        toast.success('New room ready — add your name to continue');
    };

    const copyRoomId = async () => {
        if (!roomId.trim()) return;
        try {
            await copyText(roomId.trim());
            toast.success('Room ID copied');
        } catch (error) {
            toast.error('Could not copy the room ID');
        }
    };

    const joinRoom = (event) => {
        event.preventDefault();
        const normalizedRoomId = roomId.trim();
        const normalizedUsername = username.trim();

        if (!normalizedRoomId || !normalizedUsername) {
            toast.error('Room ID and display name are required');
            return;
        }

        rememberRoomUser(normalizedRoomId, normalizedUsername);
        navigate(`/editor/${normalizedRoomId}`, {
            state: { username: normalizedUsername },
        });
    };

    return (
        <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f2f6f8] px-4 py-10 transition-colors duration-300 dark:bg-[#070a1b] sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(64,160,127,0.09),transparent_42%),linear-gradient(145deg,#f7fbfa_0%,#edf3f5_52%,#f5f7fb_100%)] dark:bg-[radial-gradient(circle_at_50%_44%,rgba(40,54,91,0.16),transparent_42%),linear-gradient(145deg,#07101e_0%,#080a1d_52%,#07091a_100%)]" />
            <div className="pointer-events-none absolute -left-32 -top-44 h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle_at_60%_62%,#64e3a8_0%,#16a66d_22%,#0d5b52_44%,#063447_61%,transparent_70%)] opacity-90 blur-[1px] motion-safe:animate-float-slow" />
            <div className="pointer-events-none absolute -bottom-56 -right-36 h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle_at_38%_35%,#62e1a7_0%,#14865d_25%,#0a4b4b_49%,#062838_63%,transparent_71%)] opacity-75 motion-safe:animate-float-slow-reverse" />
            <div className="pointer-events-none absolute left-[11%] top-[11%] h-1 w-1 rounded-full bg-white shadow-[0_0_12px_3px_rgba(115,246,255,0.8)]" />
            <div className="pointer-events-none absolute right-[13%] top-[18%] h-0.5 w-0.5 rounded-full bg-sync shadow-[0_0_10px_2px_rgba(74,237,136,0.7)]" />

            <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />

            <section className="relative w-full max-w-[430px] motion-safe:animate-rise-in">
                <div className="pointer-events-none absolute -inset-px rounded-[18px] bg-[linear-gradient(145deg,rgba(75,235,157,0.7),rgba(89,99,153,0.25)_45%,rgba(153,83,235,0.58))] opacity-80" />
                <div className="relative overflow-hidden rounded-[17px] bg-white/95 px-6 py-6 shadow-[0_32px_100px_rgba(45,75,80,0.16)] backdrop-blur-xl transition-colors duration-300 dark:bg-[#0b0e22]/95 dark:shadow-[0_32px_110px_rgba(0,0,0,0.55)] sm:px-8 sm:py-7">
                    <div className="pointer-events-none absolute inset-x-0 bottom-32 h-36 bg-[radial-gradient(ellipse_at_center,rgba(42,216,132,0.12),transparent_68%)]" />

                    <div className="relative flex items-start justify-center">
                        <BrandLogo className="w-40 sm:w-44" />
                        <span className="absolute right-0 top-1 inline-flex items-center gap-2 rounded-full border border-sync/10 bg-sync/10 px-3 py-1.5 text-[11px] font-semibold text-sync">
                            <span className="h-2 w-2 rounded-full bg-sync shadow-[0_0_10px_rgba(74,237,136,0.95)]" />
                            Live
                        </span>
                    </div>

                    <div className="relative mb-8 mt-7 text-center">
                        <h1 className="text-[27px] font-bold tracking-tight text-[#172033] dark:text-white sm:text-[30px]">
                            Join a <span className="text-sync">coding</span> room
                        </h1>
                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-[#8e93aa]">
                            Collaborate in real time with your team.
                            <br className="hidden sm:block" /> Paste a room ID and enter
                            your display name to join.
                        </p>
                    </div>

                    <form className="relative space-y-6" onSubmit={joinRoom}>
                        <label className="block">
                            <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-white/90">
                                Room ID
                            </span>
                            <span className="group relative block">
                                <input
                                    type="text"
                                    className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50/90 px-4 pr-12 text-sm font-medium text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-sync/70 focus:shadow-[0_0_0_3px_rgba(74,237,136,0.12),0_0_28px_rgba(74,237,136,0.08)] dark:border-[#343a55] dark:bg-[#0d1126]/90 dark:text-white dark:placeholder:text-[#777d97] dark:hover:border-[#4a5272]"
                                    placeholder="Paste your invitation ID"
                                    onChange={(event) => setRoomId(event.target.value)}
                                    value={roomId}
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                                <button
                                    type="button"
                                    onClick={copyRoomId}
                                    disabled={!roomId.trim()}
                                    className="absolute right-2 top-1/2 rounded-lg p-2 text-[#8c92aa] transition hover:bg-white/5 hover:text-sync disabled:cursor-default disabled:opacity-55"
                                    aria-label="Copy room ID"
                                >
                                    <CopyIcon className="h-4 w-4" />
                                </button>
                            </span>
                        </label>

                        <label className="block">
                            <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-white/90">
                                Display name
                            </span>
                            <span className="group relative block">
                                <input
                                    ref={usernameInputRef}
                                    type="text"
                                    className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50/90 px-4 pr-12 text-sm font-medium text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-sync/70 focus:shadow-[0_0_0_3px_rgba(74,237,136,0.12),0_0_28px_rgba(74,237,136,0.08)] dark:border-[#343a55] dark:bg-[#0d1126]/90 dark:text-white dark:placeholder:text-[#777d97] dark:hover:border-[#4a5272]"
                                    placeholder="How should we call you?"
                                    onChange={(event) => setUsername(event.target.value)}
                                    value={username}
                                    autoComplete="nickname"
                                    maxLength={32}
                                />
                                <UserIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c92aa] transition group-focus-within:text-sync" />
                            </span>
                        </label>

                        <button
                            className="group flex h-[52px] w-full items-center justify-center rounded-xl bg-[linear-gradient(100deg,#50d88d,#69e3b3)] px-5 text-sm font-extrabold text-[#07131a] shadow-[0_12px_34px_rgba(50,222,143,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_42px_rgba(50,222,143,0.38)] focus:outline-none focus:ring-4 focus:ring-sync/20 active:translate-y-0"
                            type="submit"
                        >
                            <span className="flex-1 text-center">Join room</span>
                            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </button>
                    </form>

                    <div className="relative my-5 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#848aa0]">
                        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                        or
                        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    </div>

                    <button
                        type="button"
                        onClick={createNewRoom}
                        className="group relative flex h-[50px] w-full items-center justify-center rounded-xl border border-sync/70 bg-sync/[0.025] px-5 text-sm font-bold text-sync transition duration-200 hover:-translate-y-0.5 hover:bg-sync/10 hover:shadow-[0_10px_30px_rgba(74,237,136,0.12)] focus:outline-none focus:ring-4 focus:ring-sync/10 active:translate-y-0"
                    >
                        <span className="flex-1 text-center">Create a new room</span>
                        <PlusIcon className="h-5 w-5 transition-transform group-hover:rotate-90" />
                    </button>

                    <footer className="relative mt-8 text-center text-xs text-slate-500 dark:text-[#83899e]">
                        Developed by{' '}
                        <a
                            href="https://aryankr1508.netlify.app/"
                            className="font-semibold text-sync transition hover:text-[#79f0b3] hover:underline hover:underline-offset-4"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Aryan Kumar
                        </a>
                    </footer>
                </div>
            </section>
        </main>
    );
};

export default Home;
