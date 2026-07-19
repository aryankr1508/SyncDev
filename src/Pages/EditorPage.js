import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import Editor from '../components/Editor';
import EditorStatusBar from '../components/EditorStatusBar';
import RoomSidebar from '../components/RoomSidebar';
import WorkspaceHeader from '../components/WorkspaceHeader';
import OutputPanel from '../components/OutputPanel';
import VerticalResizeHandle from '../components/ui/VerticalResizeHandle';
import { detectLanguage, LANGUAGE_MAP } from '../editor/languages';
import { useEditorPreferences } from '../hooks/useEditorPreferences';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { copyText } from '../utils/clipboard';
import {
    forgetRoomUser,
    getRememberedRoomUser,
} from '../utils/roomSession';
import { PREVIEW_LANGUAGES } from '../utils/codeRunner';
import { useCodeExecution } from '../hooks/useCodeExecution';

const EditorPage = () => {
    const codeRef = useRef('');
    const editorFrameRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const username = useMemo(
        () => location.state?.username || getRememberedRoomUser(roomId),
        [location.state?.username, roomId]
    );
    const { clients, socket, status } = useRoomSocket({ roomId, username });
    const [preferences, updatePreferences] = useEditorPreferences();
    const [languageChoice, setLanguageChoice] = useState('auto');
    const [detectedLanguage, setDetectedLanguage] = useState('javascript');
    const [cursor, setCursor] = useState({ line: 1, column: 1, selected: 0 });
    const [source, setSource] = useState('');
    const execution = useCodeExecution();

    const effectiveLanguage =
        languageChoice === 'auto' ? detectedLanguage : languageChoice;

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
    };

    const runCode = () => {
        if (!codeRef.current.trim()) {
            toast('Add code before running it');
            return;
        }
        execution.run({ language: effectiveLanguage, source: codeRef.current, timeout: 4000 });
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

    if (!username) return <Navigate to="/" replace />;

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#f7f9fb] p-3 transition-colors duration-300 dark:bg-[#020817] sm:p-5">
            <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1760px] gap-4 lg:h-[calc(100vh-40px)] lg:min-h-[650px] lg:grid-cols-[285px_minmax(0,1fr)]">
                <RoomSidebar
                    clients={clients}
                    socketId={socket?.id}
                    status={status}
                    onCopyRoom={copyRoomId}
                    onLeave={leaveRoom}
                />

                <section className={`relative flex min-w-0 flex-col rounded-[20px] border border-slate-200/90 bg-white transition-colors duration-300 dark:border-[#1b243c] dark:bg-[#070c1e] ${preferences.editorHeight ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_58%_42%,rgba(34,39,77,0.16),transparent_44%)] dark:block" />
                    <WorkspaceHeader />

                    <div
                        ref={editorFrameRef}
                        style={preferences.editorHeight
                            ? {
                                flex: '0 0 auto',
                                height: `${preferences.editorHeight}px`,
                            }
                            : undefined}
                        className="relative mx-3 min-h-[440px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors dark:border-[#293149] dark:bg-[#0b1023] dark:shadow-none sm:mx-5 lg:min-h-[160px]"
                    >
                        <Editor
                            socket={socket}
                            roomId={roomId}
                            language={effectiveLanguage}
                            theme={preferences.theme}
                            fontSize={preferences.fontSize}
                            wordWrap={preferences.wordWrap}
                            autoDetect={languageChoice === 'auto'}
                            onCodeChange={(code) => {
                                codeRef.current = code;
                                setSource(code);
                            }}
                            onCursorChange={setCursor}
                            onLanguageDetected={setDetectedLanguage}
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
                        connectionStatus={status}
                        onLanguageChange={changeLanguage}
                        onPreferenceChange={updatePreferences}
                        onRun={runCode}
                        onShowOutput={() => execution.dispatch({ type: 'OPEN', value: true })}
                        isRunning={execution.state.status === 'running'}
                    />

                    <OutputPanel
                        execution={execution}
                        onRun={runCode}
                        onStop={execution.stop}
                        onCopy={() => toast.success('Output copied')}
                    />
                </section>
            </div>
        </main>
    );
};

export default EditorPage;
