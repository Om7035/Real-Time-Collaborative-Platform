import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import './Editor.css';

interface EditorProps {
    ydoc: Y.Doc;
    synced: boolean;
}

export const Editor: React.FC<EditorProps> = ({ ydoc, synced }) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const [content, setContent] = useState('');
    const isUpdating = useRef(false);

    useEffect(() => {
        const yText = ydoc.getText('content');

        const observer = () => {
            if (!isUpdating.current) {
                setContent(yText.toString());
            }
        };

        yText.observe(observer);
        setContent(yText.toString());

        return () => {
            yText.unobserve(observer);
        };
    }, [ydoc]);

    const handleEditorChange = (value: string | undefined) => {
        if (!value || !synced) return;

        const yText = ydoc.getText('content');
        const currentContent = yText.toString();

        if (value !== currentContent) {
            isUpdating.current = true;

            ydoc.transact(() => {
                yText.delete(0, currentContent.length);
                yText.insert(0, value);
            });

            isUpdating.current = false;
        }
    };

    const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    };

    return (
        <div className="editor-container">
            {!synced && (
                <div className="editor-loading">
                    <div className="spinner"></div>
                    <p>Connecting to document...</p>
                </div>
            )}
            <MonacoEditor
                height="100%"
                defaultLanguage="markdown"
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                }}
            />
        </div>
    );
};
