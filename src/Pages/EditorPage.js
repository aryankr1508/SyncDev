import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import Editor from '../components/Editor';
import EditorStatusBar from '../components/EditorStatusBar';
import RoomSidebar from '../components/RoomSidebar';
import WorkspaceHeader from '../components/WorkspaceHeader';
import OutputPanel from '../components/OutputPanel';
import SessionLabPanel from '../components/SessionLabPanel';
import VerticalResizeHandle from '../components/ui/VerticalResizeHandle';
import { detectLanguage, LANGUAGE_MAP } from '../editor/languages';
import {
    EDITOR_THEME_MAP,
    resolveEditorTheme,
} from '../editor/themes';
import { useEditorPreferences } from '../hooks/useEditorPreferences';
import { useRoomSocket } from '../hooks/useRoomSocket';
import {
    getModeExperience,
    getModeThemeStyle,
} from '../session/modes';
import { useAppTheme } from '../theme/AppThemeContext';
import { copyText } from '../utils/clipboard';
import {
    forgetRoomUser,
    getRememberedRoomSession,
} from '../utils/roomSession';
import { PREVIEW_LANGUAGES } from '../utils/codeRunner';
import { useCodeExecution } from '../hooks/useCodeExecution';
import { downloadSessionReport } from '../utils/sessionReport';

const EditorPage = () => {
    const codeRef = useRef('');
    const revisionRef = useRef('');
    const editorFrameRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const roomSession = useMemo(
        () =>
            location.state?.roomSession ||
            getRememberedRoomSession(roomId),
        [location.state?.roomSession, roomId]
    );
    const {
        clients,
        socket,
        status,
        session,
        sendCommand,
    } = useRoomSocket({ roomId, roomSession });
    const [preferences, updatePreferences] = useEditorPreferences();
    const { theme: appTheme } = useAppTheme();
    const [languageChoice, setLanguageChoice] = useState('auto');
    const [detectedLanguage, setDetectedLanguage] = useState('javascript');
    const [cursor, setCursor] = useState({ line: 1, column: 1, selected: 0 });
    const [source, setSource] = useState('');
    const [sessionPanel, setSessionPanel] = useState({
        open: false,
        tab: 'timeline',
    });
    const execution = useCodeExecution();
    const currentRole = session.currentUserRole || 'participant';
    const experience = getModeExperience(session.mode);
    const isReadOnly =
        currentRole === 'observer' ||
        (session.editPolicy === 'host-only' && currentRole !== 'host');

    const effectiveLanguage =
        languageChoice === 'auto' ? detectedLanguage : languageChoice;
    const resolvedEditorTheme = resolveEditorTheme(
        preferences.theme,
        appTheme
    );
    const editorTheme = EDITOR_THEME_MAP[resolvedEditorTheme];
    const editorFrameStyle = {
        ...(preferences.editorHeight
            ? {
                  flex: '0 0 auto',
                  height: `${preferences.editorHeight}px`,
              }
            : {}),
        backgroundColor: editorTheme.background,
        borderColor:
            editorTheme.appearance === 'dark' ? '#303851' : '#d9e2ec',
        boxShadow:
            appTheme === 'light' && editorTheme.appearance === 'dark'
                ? '0 18px 45px rgba(15, 23, 42, 0.16)'
                : '0 10px 30px rgba(30, 55, 80, 0.07)',
    };

    const toggleSessionPanel = (tab) => {
        setSessionPanel((current) => ({
            tab,
            open: !(current.open && current.tab === tab),
        }));
    };

    const copyRoomId = async () => {
        try {
            await copyText(roomId);
            toast.success('Room ID copied to your clipboard');
        } catch (error) {
            toast.error('Could not copy the room ID');
        }
    };

    const leaveRoom = () => {
        forgetRoomUser(roomId);
        navigate('/');
    };

    const changeLanguage = (event) => {
        const nextLanguage = event.target.value;
        setLanguageChoice(nextLanguage);

        if (nextLanguage === 'auto') {
            const detected = detectLanguage(codeRef.current);
            setDetectedLanguage(detected);
            toast.success(`Detected ${LANGUAGE_MAP[detected].label}`);
        } else {
            toast.success(`Language set to ${LANGUAGE_MAP[nextLanguage].label}`);
        }

        const nextEffectiveLanguage =
            nextLanguage === 'auto'
                ? detectLanguage(codeRef.current)
                : nextLanguage;
        if (currentRole === 'host') {
            sendCommand({
                action: 'settings',
                language: nextEffectiveLanguage,
            });
        }
    };

    const ensureRevision = () => {
        if (!revisionRef.current) {
            revisionRef.current = `${Date.now()}-${
                socket?.id || 'session'
            }-run`;
        }
        return revisionRef.current;
    };

    const recordExecution = (action, result, revision) => {
        sendCommand({
            action,
            source: codeRef.current,
            revision,
            language: effectiveLanguage,
            status: result.status,
            exitCode: result.exitCode,
            duration: result.duration,
            stdout: result.stdout,
            stderr: result.stderr,
            total: result.total,
            passed: result.passed,
            eventId: `${Date.now()}-${socket?.id || 'run'}-${action}`,
        });
    };

    const runCode = async () => {
        if (isReadOnly) {
            toast.error('Your room role is read only');
            return;
        }
        if (!codeRef.current.trim()) {
            toast('Add code before running it');
            return;
        }
        const revision = ensureRevision();
        const result = await execution.run({
            language: effectiveLanguage,
            source: codeRef.current,
            timeout: 4000,
        });
        recordExecution('run', result, revision);
    };

    const runTests = async () => {
        if (isReadOnly || session.tests.length === 0) return;
        if (!codeRef.current.trim()) {
            toast('Add code before running the evaluation suite');
            return;
        }
        const revision = ensureRevision();
        const result = await execution.runSuite({
            language: effectiveLanguage,
            source: codeRef.current,
            timeout: 4000,
            tests: session.tests,
        });
        recordExecution('test-run', result, revision);
        if (result.status === 'success') {
            toast.success(`${result.passed}/${result.total} tests passed`);
        } else if (result.status !== 'cancelled') {
            toast.error(`${result.passed}/${result.total} tests passed`);
        }
    };

    const previewDocument = useMemo(() => {
        if (effectiveLanguage === 'markdown') {
            const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return escaped
                .replace(/^### (.*)$/gm, '<h3>$1</h3>')
                .replace(/^## (.*)$/gm, '<h2>$1</h2>')
                .replace(/^# (.*)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }
        if (effectiveLanguage === 'html') return source;
        if (effectiveLanguage === 'css') return `<style>${source}</style><main class="syncdev-preview">CSS preview</main>`;
        if (effectiveLanguage === 'javascript') return `<main class="syncdev-preview">JavaScript preview</main><script>${source}</script>`;
        return '';
    }, [effectiveLanguage, source]);

    if (!roomSession?.username || !roomSession?.clientToken) {
        return <Navigate to="/" replace />;
    }

    return (
        <main
            style={getModeThemeStyle(session.mode)}
            className="mode-theme app-workspace-canvas min-h-screen overflow-x-hidden p-3 transition-colors duration-300 sm:p-5"
        >
            <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1760px] gap-4 lg:h-[calc(100vh-40px)] lg:min-h-[650px] lg:grid-cols-[285px_minmax(0,1fr)]">
                <RoomSidebar
                    clients={clients}
                    socketId={socket?.id}
                    status={status}
                    mode={session.mode}
                    currentRole={currentRole}
                    onRoleChange={(targetClientId, role) =>
                        sendCommand({
                            action: 'role',
                            targetClientId,
                            role,
                        })
                    }
                    onCopyRoom={copyRoomId}
                    onLeave={leaveRoom}
                />

                <section className={`relative flex min-w-0 flex-col rounded-[20px] border border-white/80 bg-white/90 shadow-[0_22px_70px_rgba(52,72,98,0.1)] backdrop-blur-xl transition-colors duration-300 dark:border-[#1b243c] dark:bg-[#070c1e] dark:shadow-none ${preferences.editorHeight ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    <div className="workspace-mode-glow pointer-events-none absolute inset-0" />
                    <WorkspaceHeader
                        sessionOpen={sessionPanel.open}
                        activeSessionTab={sessionPanel.tab}
                        onOpenSettings={() =>
                            toggleSessionPanel('settings')
                        }
                        eventCount={session.events.length}
                        currentRole={currentRole}
                        mode={session.mode}
                    />

                    <div
                        ref={editorFrameRef}
                        style={editorFrameStyle}
                        data-editor-appearance={editorTheme.appearance}
                        className="relative mx-3 min-h-[440px] flex-1 overflow-hidden rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 sm:mx-5 lg:min-h-[160px]"
                    >
                        <Editor
                            socket={socket}
                            roomId={roomId}
                            language={effectiveLanguage}
                            theme={resolvedEditorTheme}
                            fontSize={preferences.fontSize}
                            wordWrap={preferences.wordWrap}
                            placeholder={experience.editorPlaceholder}
                            autoDetect={languageChoice === 'auto'}
                            onCodeChange={(code) => {
                                codeRef.current = code;
                                setSource(code);
                            }}
                            onRevisionChange={(revision) => {
                                if (revision) revisionRef.current = revision;
                            }}
                            onCursorChange={setCursor}
                            onLanguageDetected={setDetectedLanguage}
                            readOnly={isReadOnly}
                            onSave={() =>
                                toast.success('Your changes are already synced', {
                                    id: 'sync-confirmation',
                                })
                            }
                        />
                        <div className="absolute inset-x-0 bottom-0 z-30">
                            <VerticalResizeHandle
                                ariaLabel="Resize code editor"
                                currentHeight={() =>
                                    editorFrameRef.current?.getBoundingClientRect().height || 440
                                }
                                minHeight={280}
                                maxHeight={() => Math.max(320, Math.min(900, window.innerHeight - 180))}
                                onResize={(height) =>
                                    updatePreferences({
                                        type: 'SET_EDITOR_HEIGHT',
                                        value: height,
                                    })
                                }
                                onReset={() =>
                                    updatePreferences({ type: 'RESET_EDITOR_HEIGHT' })
                                }
                            />
                        </div>
                    </div>

                    {source.trim() && PREVIEW_LANGUAGES.has(effectiveLanguage) && effectiveLanguage !== 'jsx' && (
                        <details className="mx-3 mt-4 max-h-[32vh] shrink-0 overflow-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-[#293149] dark:bg-[#080e20] sm:mx-5">
                            <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">Sandboxed web preview</summary>
                            <iframe title="Sandboxed web preview" sandbox="allow-scripts" srcDoc={previewDocument} className="mt-3 h-48 w-full rounded-lg border border-slate-200 bg-white dark:border-[#293149]" />
                        </details>
                    )}

                    <EditorStatusBar
                        cursor={cursor}
                        languageChoice={languageChoice}
                        detectedLanguage={detectedLanguage}
                        preferences={preferences}
                        appTheme={appTheme}
                        resolvedEditorTheme={resolvedEditorTheme}
                        connectionStatus={status}
                        onLanguageChange={changeLanguage}
                        onPreferenceChange={updatePreferences}
                        onRun={runCode}
                        onShowOutput={() => execution.dispatch({ type: 'OPEN', value: true })}
                        isRunning={execution.state.status === 'running'}
                        canRun={!isReadOnly}
                        runLabel={experience.runLabel}
                        runningLabel={experience.runningLabel}
                    />

                    <OutputPanel
                        execution={execution}
                        onRun={runCode}
                        onStop={execution.stop}
                        onCopy={() => toast.success('Output copied')}
                        canRun={!isReadOnly}
                        title={experience.outputTitle}
                        runLabel={experience.runLabel}
                    />

                    <SessionLabPanel
                        open={sessionPanel.open}
                        activeTab={sessionPanel.tab}
                        onTabChange={(tab) =>
                            setSessionPanel({ open: true, tab })
                        }
                        onClose={() =>
                            setSessionPanel((current) => ({
                                ...current,
                                open: false,
                            }))
                        }
                        roomId={roomId}
                        session={session}
                        clients={clients}
                        currentRole={currentRole}
                        isRunning={execution.state.status === 'running'}
                        onCheckpoint={({ title, note }) =>
                            sendCommand({
                                action: 'checkpoint',
                                title,
                                note,
                                eventId: `${Date.now()}-${
                                    socket?.id || 'checkpoint'
                                }`,
                            })
                        }
                        onRestore={(event) => {
                            sendCommand({
                                action: 'restore',
                                eventId: event.id,
                            });
                            toast.success('Restoring the selected revision');
                        }}
                        onAddTest={(test) =>
                            sendCommand({ action: 'test-upsert', test })
                        }
                        onDeleteTest={(testId) =>
                            sendCommand({ action: 'test-delete', testId })
                        }
                        onRunTests={runTests}
                        onSettings={(settings) =>
                            sendCommand({ action: 'settings', ...settings })
                        }
                        onExport={(report) => {
                            downloadSessionReport(report, roomId);
                            toast.success('Session report downloaded');
                        }}
                    />
                </section>
            </div>
        </main>
    );
};

export default EditorPage;
