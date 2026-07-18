import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import Editor from '../components/Editor';
import EditorStatusBar from '../components/EditorStatusBar';
import RoomSidebar from '../components/RoomSidebar';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { detectLanguage, LANGUAGE_MAP } from '../editor/languages';
import { useEditorPreferences } from '../hooks/useEditorPreferences';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { copyText } from '../utils/clipboard';
import {
    forgetRoomUser,
    getRememberedRoomUser,
} from '../utils/roomSession';
import { runJavaScript } from '../utils/codeRunner';

const EditorPage = () => {
    const codeRef = useRef('');
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
    const [isRunning, setIsRunning] = useState(false);

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

    const runCode = async () => {
        if (effectiveLanguage !== 'javascript') {
            toast.error('The in-browser runner currently supports JavaScript');
            return;
        }
        if (!codeRef.current.trim()) {
            toast('Add some JavaScript before running it');
            return;
        }

        setIsRunning(true);
        try {
            const output = await runJavaScript(codeRef.current);
            toast.success(output.length ? output.join('\n') : 'Code ran successfully', {
                duration: 5000,
            });
        } catch (error) {
            toast.error(error.message.split('\n')[0], { duration: 5000 });
        } finally {
            setIsRunning(false);
        }
    };

    if (!username) return <Navigate to="/" replace />;

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#f7f9fb] p-3 transition-colors duration-300 dark:bg-[#020817] sm:p-5">
            <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1760px] gap-4 lg:h-[calc(100vh-40px)] lg:min-h-[720px] lg:grid-cols-[285px_minmax(0,1fr)]">
                <RoomSidebar
                    clients={clients}
                    socketId={socket?.id}
                    status={status}
                    onCopyRoom={copyRoomId}
                    onLeave={leaveRoom}
                />

                <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white transition-colors duration-300 dark:border-[#1b243c] dark:bg-[#070c1e]">
                    <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_58%_42%,rgba(34,39,77,0.16),transparent_44%)] dark:block" />
                    <WorkspaceHeader />

                    <div className="mx-5 min-h-[480px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors dark:border-[#293149] dark:bg-[#0b1023] dark:shadow-none">
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
                            }}
                            onCursorChange={setCursor}
                            onLanguageDetected={setDetectedLanguage}
                            onSave={() =>
                                toast.success('Your changes are already synced', {
                                    id: 'sync-confirmation',
                                })
                            }
                        />
                    </div>

                    <EditorStatusBar
                        cursor={cursor}
                        languageChoice={languageChoice}
                        detectedLanguage={detectedLanguage}
                        preferences={preferences}
                        connectionStatus={status}
                        onLanguageChange={changeLanguage}
                        onPreferenceChange={updatePreferences}
                        onRun={runCode}
                        isRunning={isRunning}
                    />
                </section>
            </div>
        </main>
    );
};

export default EditorPage;
