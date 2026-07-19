import React, { useRef } from 'react';
import { copyText } from '../utils/clipboard';
import VerticalResizeHandle from './ui/VerticalResizeHandle';

const labels = { idle: 'Ready', running: 'Running', success: 'Completed', error: 'Failed', timeout: 'Timed out', cancelled: 'Cancelled' };

const OutputPanel = ({ execution, onStop, onRun, onCopy }) => {
    const { state, dispatch } = execution;
    const panelRef = useRef(null);
    if (!state.isOpen) return null;
    const copy = async () => { await copyText(`${state.stdout}${state.stderr}`); onCopy?.(); };
    return <section ref={panelRef} aria-label="Output panel" style={{ height: state.height }} className="mx-3 mb-4 flex max-h-[38vh] min-h-[180px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcff] shadow-sm dark:border-[#293149] dark:bg-[#080e20] sm:mx-5 sm:mb-5">
        <VerticalResizeHandle
            ariaLabel="Resize output panel"
            currentHeight={() => panelRef.current?.getBoundingClientRect().height || state.height}
            direction={-1}
            minHeight={160}
            maxHeight={520}
            onResize={(height) => dispatch({ type: 'HEIGHT', value: height })}
        />
        <header className="flex min-h-[46px] flex-wrap items-center gap-1.5 border-b border-slate-200 px-3 py-1 dark:border-[#293149] sm:gap-2">
            <strong className="text-xs text-slate-800 dark:text-slate-100">OUTPUT</strong><span className={`rounded px-2 py-1 text-[10px] font-bold ${state.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : state.status === 'running' ? 'bg-amber-400/15 text-amber-600' : state.status === 'idle' ? 'text-slate-500' : 'bg-red-500/10 text-red-600'}`}>{labels[state.status]}</span>
            <span className="ml-auto hidden text-[11px] text-slate-500 sm:inline">{state.exitCode !== null && `Exit ${state.exitCode}`} {state.duration !== null && ` · ${state.duration}ms`}</span>
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
