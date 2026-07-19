import React, { useRef } from 'react';
import { copyText } from '../utils/clipboard';

const labels = { idle: 'Ready', running: 'Running', success: 'Completed', error: 'Failed', timeout: 'Timed out', cancelled: 'Cancelled' };

const OutputPanel = ({ execution, onStop, onRun, onCopy }) => {
    const { state, dispatch } = execution;
    const drag = useRef(null);
    if (!state.isOpen) return <button type="button" onClick={() => dispatch({ type: 'OPEN', value: true })} className="mx-5 mb-5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-[#293149] dark:text-slate-200">Show Output</button>;
    const beginResize = (event) => {
        drag.current = { y: event.clientY, height: state.height };
        const move = (moveEvent) => dispatch({ type: 'HEIGHT', value: drag.current.height + drag.current.y - moveEvent.clientY });
        const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
    };
    const copy = async () => { await copyText(`${state.stdout}${state.stderr}`); onCopy?.(); };
    return <section aria-label="Output panel" style={{ height: state.height }} className="mx-5 mb-5 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcff] shadow-sm dark:border-[#293149] dark:bg-[#080e20]">
        <div role="separator" aria-label="Resize output panel" onPointerDown={beginResize} className="h-2 shrink-0 cursor-ns-resize bg-slate-100 hover:bg-sync/30 dark:bg-white/[.04]" />
        <header className="flex min-h-[46px] items-center gap-2 border-b border-slate-200 px-3 dark:border-[#293149]">
            <strong className="text-xs text-slate-800 dark:text-slate-100">OUTPUT</strong><span className={`rounded px-2 py-1 text-[10px] font-bold ${state.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : state.status === 'running' ? 'bg-amber-400/15 text-amber-600' : state.status === 'idle' ? 'text-slate-500' : 'bg-red-500/10 text-red-600'}`}>{labels[state.status]}</span>
            <span className="ml-auto text-[11px] text-slate-500">{state.exitCode !== null && `Exit ${state.exitCode}`} {state.duration !== null && ` · ${state.duration}ms`}</span>
            <button type="button" onClick={onRun} disabled={state.status === 'running'} className="rounded px-2 py-1 text-xs font-bold text-sync hover:bg-sync/10 disabled:opacity-50">Run</button>
            <button type="button" onClick={onStop} disabled={state.status !== 'running'} className="rounded px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50">Stop</button>
            <button type="button" onClick={() => dispatch({ type: 'CLEAR' })} className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-white/10">Clear</button>
            <button type="button" onClick={copy} className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-white/10">Copy</button>
            <button type="button" aria-label="Collapse output" onClick={() => dispatch({ type: 'OPEN', value: false })} className="rounded px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-white/10">⌄</button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_220px]">
            <div tabIndex="0" aria-label="Execution output" className="min-h-0 overflow-auto p-3 font-mono text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sync/50"><pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{state.stdout || (state.status === 'idle' ? 'Run code to see output.' : '')}</pre>{state.stderr && <pre className="mt-2 whitespace-pre-wrap border-l-2 border-red-400 pl-3 text-red-600 dark:text-red-300">{state.stderr}</pre>}</div>
            <label className="flex min-h-[84px] flex-col border-t border-slate-200 p-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-[#293149] md:border-l md:border-t-0">Standard input<textarea aria-label="Standard input" value={state.stdin} onChange={(event) => dispatch({ type: 'STDIN', value: event.target.value })} placeholder="Input passed as stdin" className="mt-2 min-h-0 flex-1 resize-none rounded border border-slate-200 bg-white p-2 font-mono text-xs normal-case text-slate-700 outline-none focus:border-sync dark:border-[#293149] dark:bg-[#0b1023] dark:text-slate-200" /></label>
        </div>
    </section>;
};
export default OutputPanel;
