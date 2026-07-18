import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/eclipse.css';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/go/go';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/php/php';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/swift/swift';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/mode/sass/sass';

import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/display/placeholder';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/match-highlighter';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/dialog/dialog.css';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/javascript-hint';
import 'codemirror/addon/hint/css-hint';
import 'codemirror/addon/hint/html-hint';
import 'codemirror/addon/hint/sql-hint';
import 'codemirror/addon/hint/anyword-hint';
import 'codemirror/addon/hint/show-hint.css';

import ACTIONS from '../Actions';
import { detectLanguage, LANGUAGE_MAP } from '../editor/languages';
import { EDITOR_THEME_MAP } from '../editor/themes';

const applyEditorThemeSurface = (editor, themeId) => {
    const theme = EDITOR_THEME_MAP[themeId] || EDITOR_THEME_MAP.dracula;
    const editorElement = editor.getWrapperElement();
    editorElement.style.setProperty('--editor-background', theme.background);
    editorElement.style.setProperty('--editor-gutter', theme.gutter);
    editorElement.style.setProperty('--editor-line-number', theme.lineNumber);
    editorElement.style.setProperty('--editor-placeholder', theme.placeholder);
    editorElement.style.setProperty('--editor-active-line', theme.activeLine);
    editorElement.style.setProperty('--editor-cursor', theme.cursor);
};

const Editor = ({
    socket,
    roomId,
    language,
    theme,
    fontSize,
    wordWrap,
    autoDetect,
    onCodeChange,
    onCursorChange,
    onLanguageDetected,
    onSave,
}) => {
    const editorRef = useRef(null);
    const textareaRef = useRef(null);
    const socketRef = useRef(socket);
    const callbacksRef = useRef({
        onCodeChange,
        onCursorChange,
        onLanguageDetected,
        onSave,
    });
    const autoDetectRef = useRef(autoDetect);
    const initialOptionsRef = useRef({ language, theme, fontSize, wordWrap });
    socketRef.current = socket;
    autoDetectRef.current = autoDetect;
    callbacksRef.current = {
        onCodeChange,
        onCursorChange,
        onLanguageDetected,
        onSave,
    };

    useEffect(() => {
        let detectionTimer;
        let hintTimer;
        const initialOptions = initialOptionsRef.current;
        const editor = Codemirror.fromTextArea(textareaRef.current, {
            mode: LANGUAGE_MAP[initialOptions.language]?.mode,
            theme: initialOptions.theme,
            autoCloseTags: true,
            autoCloseBrackets: {
                pairs: "()[]{}''\"\"``",
                explode: '[]{}',
            },
            matchBrackets: true,
            matchTags: { bothTags: true },
            styleActiveLine: true,
            highlightSelectionMatches: {
                showToken: /\w/,
                annotateScrollbar: true,
            },
            lineNumbers: true,
            lineWrapping: initialOptions.wordWrap,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            showCursorWhenSelecting: true,
            placeholder: 'Start typing your code...',
            extraKeys: {
                'Ctrl-Space': 'autocomplete',
                'Cmd-Space': 'autocomplete',
                'Ctrl-/': 'toggleComment',
                'Cmd-/': 'toggleComment',
                'Ctrl-F': 'findPersistent',
                'Cmd-F': 'findPersistent',
                Tab: (instance) => {
                    if (instance.somethingSelected()) {
                        instance.indentSelection('add');
                    } else {
                        instance.execCommand('insertSoftTab');
                    }
                },
                'Shift-Tab': 'indentLess',
                'Ctrl-S': () => callbacksRef.current.onSave(),
                'Cmd-S': () => callbacksRef.current.onSave(),
            },
        });
        editorRef.current = editor;

        const editorElement = editor.getWrapperElement();
        editorElement.classList.add(
            '!h-full',
            '!min-h-full',
            '!font-mono',
            '!leading-relaxed',
            '[&_.CodeMirror-gutters]:!border-r-0'
        );
        editorElement.style.fontSize = `${initialOptions.fontSize}px`;
        applyEditorThemeSurface(editor, initialOptions.theme);

        const reportCursor = () => {
            const cursor = editor.getCursor();
            callbacksRef.current.onCursorChange({
                line: cursor.line + 1,
                column: cursor.ch + 1,
                selected: editor.getSelection().length,
            });
        };

        const scheduleDetection = (code) => {
            if (!autoDetectRef.current) return;
            window.clearTimeout(detectionTimer);
            detectionTimer = window.setTimeout(() => {
                callbacksRef.current.onLanguageDetected(detectLanguage(code));
            }, 450);
        };

        editor.on('change', (instance, changes) => {
            const code = instance.getValue();
            callbacksRef.current.onCodeChange(code);
            scheduleDetection(code);

            if (changes.origin !== 'setValue' && socketRef.current?.connected) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
            }
        });

        editor.on('cursorActivity', reportCursor);
        editor.on('inputRead', (instance, change) => {
            const insertedText = change.text.join('');
            if (
                change.origin !== '+input' ||
                !/[\w.$]$/.test(insertedText) ||
                instance.state.completionActive
            ) {
                return;
            }

            window.clearTimeout(hintTimer);
            hintTimer = window.setTimeout(() => {
                const token = instance.getTokenAt(instance.getCursor());
                if (token.string.length >= 2 || insertedText === '.') {
                    instance.showHint({ completeSingle: false });
                }
            }, 280);
        });

        reportCursor();
        editor.focus();

        return () => {
            window.clearTimeout(detectionTimer);
            window.clearTimeout(hintTimer);
            editor.toTextArea();
            editorRef.current = null;
        };
    }, [roomId]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.setOption('mode', LANGUAGE_MAP[language]?.mode);
        editor.setOption('theme', theme);
        applyEditorThemeSurface(editor, theme);
        editor.setOption('lineWrapping', wordWrap);
        editor.getWrapperElement().style.fontSize = `${fontSize}px`;
        editor.refresh();

        if (autoDetect) {
            callbacksRef.current.onLanguageDetected(
                detectLanguage(editor.getValue())
            );
        }
    }, [autoDetect, fontSize, language, theme, wordWrap]);

    useEffect(() => {
        if (!socket) {
            return undefined;
        }

        const handleCodeChange = ({ code }) => {
            if (
                typeof code === 'string' &&
                editorRef.current &&
                code !== editorRef.current.getValue()
            ) {
                const cursor = editorRef.current.getCursor();
                editorRef.current.setValue(code);
                editorRef.current.setCursor(cursor);
            }
        };

        socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

        return () => {
            socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
        };
    }, [socket]);

    return (
        <div className="relative h-full min-h-[480px] overflow-hidden">
            <textarea
                ref={textareaRef}
                aria-label="Collaborative code editor"
                defaultValue=""
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[116px] border-l border-black/[0.035] bg-white/[0.025] dark:border-white/[0.07] dark:bg-black/[0.03]">
                <span
                    className="absolute left-3 right-2 top-5 h-1 rounded-full bg-sync shadow-[0_0_10px_rgba(83,226,156,0.25)]"
                    style={{
                        backgroundColor:
                            (EDITOR_THEME_MAP[theme] || EDITOR_THEME_MAP.dracula)
                                .preview,
                    }}
                />
            </div>
        </div>
    );
};

export default Editor;
