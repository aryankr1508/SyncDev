import React, { useMemo, useState } from 'react';
import { getModeExperience } from '../session/modes';
import { createSessionReport } from '../utils/sessionReport';
import { PlayIcon, PlusIcon } from './ui/Icons';

const tabClass = (active) =>
    `rounded-lg px-3 py-2 text-[11px] font-bold transition ${
        active
            ? 'mode-tab-active'
            : 'text-slate-500 hover:bg-slate-100 dark:text-[#8f98af] dark:hover:bg-white/5'
    }`;

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sync dark:border-[#2b354f] dark:bg-[#0a1023] dark:text-slate-100';

const eventLabels = {
    code: 'Revision',
    checkpoint: 'Checkpoint',
    restore: 'Restored',
    run: 'Run',
    'test-run': 'Test run',
    settings: 'Controls',
    role: 'Role change',
};

const eventDot = {
    checkpoint: 'bg-violet-400',
    restore: 'bg-amber-400',
    run: 'bg-sky-400',
    'test-run': 'bg-sync',
    settings: 'bg-slate-400',
    role: 'bg-pink-400',
    code: 'bg-slate-300 dark:bg-slate-600',
};

const shortRevision = (revision) =>
    revision ? String(revision).slice(0, 12) : 'not saved';

const formatEventDetails = (event) => {
    if (!event) return '';
    const metadata = event.metadata || {};
    if (event.type === 'checkpoint') return metadata.title || 'Untitled';
    if (event.type === 'run') {
        return `${metadata.language || 'Code'} · ${metadata.status || 'complete'}`;
    }
    if (event.type === 'test-run') {
        return `${metadata.passed || 0}/${metadata.total || 0} passed`;
    }
    if (event.type === 'role') {
        return `${metadata.username || 'Participant'} → ${metadata.role || 'participant'}`;
    }
    if (event.type === 'settings') {
        return metadata.action === 'created'
            ? 'Room created'
            : `${metadata.mode || 'Room'} · ${
                  metadata.editPolicy || 'everyone'
              }`;
    }
    if (event.type === 'restore') {
        return `From ${shortRevision(metadata.restoredRevision)}`;
    }
    return shortRevision(event.revision);
};

const TimelineTab = ({
    events,
    currentRole,
    experience,
    onCheckpoint,
    onRestore,
}) => {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const resolvedIndex =
        events.length === 0
            ? -1
            : selectedIndex < 0
              ? events.length - 1
              : Math.min(selectedIndex, events.length - 1);
    const selected = resolvedIndex >= 0 ? events[resolvedIndex] : null;
    const canCheckpoint = currentRole !== 'observer';

    const createCheckpoint = (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onCheckpoint({ title: title.trim(), note: note.trim() });
        setTitle('');
        setNote('');
    };

    return (
        <div className="space-y-4">
            {canCheckpoint && (
                <form
                    onSubmit={createCheckpoint}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#29344e] dark:bg-white/[0.025]"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <span className="mode-chip flex h-6 w-6 items-center justify-center rounded-lg">
                            <PlusIcon className="h-3.5 w-3.5" />
                        </span>
                        <strong className="text-xs text-slate-800 dark:text-white">
                            {experience.checkpointAction}
                        </strong>
                    </div>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={80}
                        placeholder={experience.checkpointTitlePlaceholder}
                        className={inputClass}
                    />
                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={500}
                        placeholder={experience.checkpointNotePlaceholder}
                        className={`${inputClass} mt-2 min-h-[68px] resize-none`}
                    />
                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="mt-2 w-full rounded-lg bg-sync px-3 py-2 text-xs font-extrabold text-[#062015] transition hover:brightness-105 disabled:opacity-45"
                    >
                        Save evidence
                    </button>
                </form>
            )}

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                            {experience.timelineTab} timeline
                        </h3>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[#818aa2]">
                            {events.length} immutable session events
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={resolvedIndex <= 0}
                            onClick={() =>
                                setSelectedIndex((current) =>
                                    current < 0
                                        ? Math.max(0, events.length - 2)
                                        : Math.max(0, current - 1)
                                )
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-35 dark:border-[#2b354f]"
                            aria-label="Previous session event"
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            disabled={
                                resolvedIndex < 0 ||
                                resolvedIndex >= events.length - 1
                            }
                            onClick={() =>
                                setSelectedIndex((current) =>
                                    Math.min(
                                        events.length - 1,
                                        (current < 0
                                            ? events.length - 1
                                            : current) + 1
                                    )
                                )
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-35 dark:border-[#2b354f]"
                            aria-label="Next session event"
                        >
                            →
                        </button>
                    </div>
                </div>

                {events.length > 0 ? (
                    <>
                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, events.length - 1)}
                            value={Math.max(0, resolvedIndex)}
                            onChange={(event) =>
                                setSelectedIndex(Number(event.target.value))
                            }
                            className="mb-3 w-full accent-[var(--mode-accent)]"
                            aria-label="Replay session timeline"
                        />
                        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                            {events
                                .slice()
                                .reverse()
                                .map((event, reverseIndex) => {
                                    const index =
                                        events.length - reverseIndex - 1;
                                    return (
                                        <button
                                            key={event.id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedIndex(index)
                                            }
                                            className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                                                index === resolvedIndex
                                                    ? 'mode-action-active'
                                                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-[#29344e] dark:hover:bg-white/[0.025]'
                                            }`}
                                        >
                                            <span
                                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                                    eventDot[event.type] ||
                                                    eventDot.code
                                                }`}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8c95aa]">
                                                    {eventLabels[event.type] ||
                                                        event.type}
                                                    <span className="normal-case font-medium">
                                                        {new Date(
                                                            event.createdAt
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                    {formatEventDetails(event)}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                                                    {event.actorName ||
                                                        'Unknown participant'}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-[#2a354e]">
                        {experience.emptyTimeline}
                    </div>
                )}
            </section>

            {selected && (
                <section className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3 dark:border-[#29344e] dark:bg-[#080e20]">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Selected evidence
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-800 dark:text-white">
                                {formatEventDetails(selected)}
                            </p>
                        </div>
                        {currentRole === 'host' && selected.code && (
                            <button
                                type="button"
                                onClick={() => onRestore(selected)}
                                className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                            >
                                Restore
                            </button>
                        )}
                    </div>
                    {selected.code ? (
                        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-[10px] leading-4 text-slate-200">
                            {selected.code}
                        </pre>
                    ) : (
                        <p className="mt-3 text-[10px] text-slate-400">
                            This event records session metadata and has no code
                            snapshot.
                        </p>
                    )}
                </section>
            )}
        </div>
    );
};

const TestsTab = ({
    tests,
    hiddenTestCount,
    currentRole,
    isRunning,
    experience,
    onAddTest,
    onDeleteTest,
    onRunTests,
}) => {
    const [draft, setDraft] = useState({
        label: '',
        stdin: '',
        expectedOutput: '',
        hidden: false,
    });
    const isHost = currentRole === 'host';

    const addTest = (event) => {
        event.preventDefault();
        if (!draft.label.trim()) return;
        onAddTest({ ...draft, label: draft.label.trim() });
        setDraft({
            label: '',
            stdin: '',
            expectedOutput: '',
            hidden: false,
        });
    };

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-3 dark:border-[#29344e]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                            {experience.testsTitle}
                        </h3>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-[#818aa2]">
                            {experience.testsDescription}
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={
                            isRunning ||
                            tests.length === 0 ||
                            currentRole === 'observer'
                        }
                        onClick={onRunTests}
                        className="flex items-center gap-1.5 rounded-lg bg-sync px-3 py-2 text-[10px] font-extrabold text-[#062015] disabled:opacity-40"
                    >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Run suite
                    </button>
                </div>
                {!isHost && hiddenTestCount > 0 && (
                    <p className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                        The host has configured {hiddenTestCount} hidden test
                        {hiddenTestCount === 1 ? '' : 's'}. Inputs and expected
                        outputs remain private.
                    </p>
                )}
            </section>

            <div className="space-y-2">
                {tests.map((test) => (
                    <article
                        key={test.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-[#29344e] dark:bg-white/[0.025]"
                    >
                        <div className="flex items-center gap-2">
                            <strong className="min-w-0 flex-1 truncate text-xs text-slate-800 dark:text-slate-100">
                                {test.label}
                            </strong>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    test.hidden
                                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-sync'
                                }`}
                            >
                                {test.hidden ? 'Hidden' : 'Visible'}
                            </span>
                            {isHost && (
                                <button
                                    type="button"
                                    onClick={() => onDeleteTest(test.id)}
                                    className="text-[10px] font-bold text-rose-500"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        {isHost && (
                            <div className="mt-2 grid gap-2 text-[10px] sm:grid-cols-2">
                                <pre className="overflow-auto rounded-lg bg-white p-2 text-slate-600 dark:bg-[#080e20] dark:text-slate-300">
                                    stdin: {test.stdin || '∅'}
                                </pre>
                                <pre className="overflow-auto rounded-lg bg-white p-2 text-slate-600 dark:bg-[#080e20] dark:text-slate-300">
                                    expected: {test.expectedOutput || '∅'}
                                </pre>
                            </div>
                        )}
                    </article>
                ))}
                {tests.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-400 dark:border-[#29344e]">
                        No evaluation cases have been configured.
                    </p>
                )}
            </div>

            {isHost && (
                <form
                    onSubmit={addTest}
                    className="rounded-xl border border-slate-200 p-3 dark:border-[#29344e]"
                >
                    <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-white">
                        {experience.addTestTitle}
                    </h3>
                    <input
                        className={inputClass}
                        value={draft.label}
                        maxLength={80}
                        placeholder={experience.testLabelPlaceholder}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                label: event.target.value,
                            }))
                        }
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <textarea
                            className={`${inputClass} min-h-[76px] resize-none font-mono`}
                            value={draft.stdin}
                            placeholder="Standard input"
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    stdin: event.target.value,
                                }))
                            }
                        />
                        <textarea
                            className={`${inputClass} min-h-[76px] resize-none font-mono`}
                            value={draft.expectedOutput}
                            placeholder="Expected output"
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    expectedOutput: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={draft.hidden}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    hidden: event.target.checked,
                                }))
                            }
                            className="accent-emerald-500"
                        />
                        {experience.hiddenTestLabel}
                    </label>
                    <button
                        type="submit"
                        disabled={!draft.label.trim()}
                        className="mt-3 w-full rounded-lg border border-sync/50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-sync/10 disabled:opacity-40 dark:text-sync"
                    >
                        Add test
                    </button>
                </form>
            )}
        </div>
    );
};

const ControlsTab = ({
    roomId,
    session,
    clients,
    currentRole,
    experience,
    onSettings,
    onExport,
}) => {
    const report = useMemo(
        () => createSessionReport({ roomId, session, clients }),
        [clients, roomId, session]
    );
    const isHost = currentRole === 'host';

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-3 dark:border-[#29344e]">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                    Room governance
                </h3>
                <div className="mt-3 grid gap-3">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Session mode
                        <select
                            value={session.mode}
                            disabled={!isHost}
                            onChange={(event) =>
                                onSettings({ mode: event.target.value })
                            }
                            className={`${inputClass} mt-1.5 normal-case`}
                        >
                            <option value="interview">Technical interview</option>
                            <option value="training">Training session</option>
                            <option value="debugging">Debugging room</option>
                        </select>
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Editing permission
                        <select
                            value={session.editPolicy}
                            disabled={!isHost}
                            onChange={(event) =>
                                onSettings({
                                    editPolicy: event.target.value,
                                })
                            }
                            className={`${inputClass} mt-1.5 normal-case`}
                        >
                            <option value="everyone">
                                Host and participants
                            </option>
                            <option value="host-only">Host only</option>
                        </select>
                    </label>
                </div>
                {!isHost && (
                    <p className="mt-3 text-[10px] text-slate-400">
                        Only the host can change room governance.
                    </p>
                )}
            </section>

            <section className="rounded-xl border border-slate-200 p-3 dark:border-[#29344e]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                            {experience.reportTitle}
                        </h3>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-[#818aa2]">
                            {experience.reportDescription}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onExport(report)}
                        className="rounded-lg bg-sync px-3 py-2 text-[10px] font-extrabold text-[#062015]"
                    >
                        Export .md
                    </button>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[9px] leading-4 text-slate-300">
                    {report}
                </pre>
            </section>
        </div>
    );
};

const SessionLabPanel = ({
    open,
    onClose,
    roomId,
    session,
    clients,
    currentRole,
    isRunning,
    onCheckpoint,
    onRestore,
    onAddTest,
    onDeleteTest,
    onRunTests,
    onSettings,
    onExport,
}) => {
    const [tab, setTab] = useState('timeline');
    const experience = getModeExperience(session.mode);
    if (!open) return null;

    return (
        <aside className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[410px] flex-col border-l border-slate-200 bg-white/98 shadow-[-24px_0_70px_rgba(30,45,70,0.18)] backdrop-blur-xl dark:border-[#26314a] dark:bg-[#070d1f]/98 dark:shadow-[-28px_0_80px_rgba(0,0,0,0.48)]">
            <header className="border-b border-slate-200 px-4 py-4 dark:border-[#26314a]">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="mode-accent-text text-[9px] font-bold uppercase tracking-[0.2em]">
                            {experience.purpose}
                        </p>
                        <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                            Session evidence
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-wide">
                            <span className="mode-chip rounded-full px-2 py-1">
                                {session.mode}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500 dark:bg-white/5 dark:text-[#9aa3b8]">
                                {currentRole}
                            </span>
                            <span className="font-mono normal-case text-slate-400">
                                rev {shortRevision(session.revision)}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-500 transition hover:bg-slate-100 dark:border-[#2b354f] dark:hover:bg-white/5"
                        aria-label="Close session evidence"
                    >
                        ×
                    </button>
                </div>

                <div className="mode-surface mt-4 rounded-xl border p-3">
                    <p className="text-[10px] leading-4 text-slate-600 dark:text-[#a2aabd]">
                        {experience.description}
                    </p>
                    <ol className="mt-3 grid grid-cols-4 gap-1">
                        {experience.workflow.map((step, index) => (
                            <li
                                key={step}
                                className="rounded-lg bg-white/80 px-1 py-2 text-center text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-[#9da6ba]"
                            >
                                <span className="mode-accent-text mb-1 block">
                                    0{index + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>

                <nav className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.035]">
                    <button
                        type="button"
                        className={tabClass(tab === 'timeline')}
                        onClick={() => setTab('timeline')}
                    >
                        {experience.timelineTab}
                    </button>
                    <button
                        type="button"
                        className={tabClass(tab === 'tests')}
                        onClick={() => setTab('tests')}
                    >
                        {experience.testsTab}
                    </button>
                    <button
                        type="button"
                        className={tabClass(tab === 'controls')}
                        onClick={() => setTab('controls')}
                    >
                        {experience.reportTab}
                    </button>
                </nav>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {tab === 'timeline' && (
                    <TimelineTab
                        events={session.events || []}
                        currentRole={currentRole}
                        experience={experience}
                        onCheckpoint={onCheckpoint}
                        onRestore={onRestore}
                    />
                )}
                {tab === 'tests' && (
                    <TestsTab
                        tests={session.tests || []}
                        hiddenTestCount={session.hiddenTestCount || 0}
                        currentRole={currentRole}
                        isRunning={isRunning}
                        experience={experience}
                        onAddTest={onAddTest}
                        onDeleteTest={onDeleteTest}
                        onRunTests={onRunTests}
                    />
                )}
                {tab === 'controls' && (
                    <ControlsTab
                        roomId={roomId}
                        session={session}
                        clients={clients}
                        currentRole={currentRole}
                        experience={experience}
                        onSettings={onSettings}
                        onExport={onExport}
                    />
                )}
            </div>
        </aside>
    );
};

export default SessionLabPanel;
