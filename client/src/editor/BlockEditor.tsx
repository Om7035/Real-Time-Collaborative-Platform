import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import { CodeBlockWithCopy } from './extensions/CodeBlockWithCopy';
import { useAuth } from '../auth/AuthContext';
import { useYjs } from './useYjs';
import { useDocumentSession } from './useDocumentSession';
import { useSocket } from '../socket/SocketContext';
import { getRandomColor } from '../lib/utils';
import { EditorToolbar } from './EditorToolbar';
import './BlockEditor.css';

interface BlockEditorProps {
    documentId: string;
}

interface EditorInnerProps {
    ydoc: any;
    provider: any;
    role: string | null;
}

const EditorInner: React.FC<EditorInnerProps> = ({ ydoc, provider, role }) => {
    // Debug logging
    console.log('[EditorInner] Initializing with:', {
        ydocDefined: !!ydoc,
        providerDefined: !!provider,
        role
    });

    // Force toolbar re-render when editor state changes
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    // Build extensions array - only add CollaborationCursor when provider is ready
    const extensions = React.useMemo(() => {
        const baseExtensions = [
            StarterKit.configure({
                codeBlock: false, // Disable default code block
            }),
            CodeBlockWithCopy,
            Underline,
            Placeholder.configure({
                placeholder: 'Start writing... Type "/" for commands',
            }),
            Collaboration.configure({
                document: ydoc,
            }),
        ];

        // Only add CollaborationCursor if provider and provider.doc exist
        if (provider && provider.doc) {
            baseExtensions.push(
                CollaborationCursor.configure({
                    provider: provider,
                    user: {
                        name: 'User',
                        color: '#3b82f6',
                    },
                })
            );
        }

        return baseExtensions;
    }, [ydoc, provider]);

    const editor = useEditor({
        extensions,
        editable: role !== 'viewer',
        editorProps: {
            attributes: {
                class: 'focus:outline-none',
                spellcheck: 'false',
            },
            handleDOMEvents: {
                // Prevent formatting from "sticking" when cursor moves
                blur: () => {
                    return false;
                },
            },
        },
        // Critical: Force re-render on every editor update to sync toolbar state
        onUpdate: () => {
            forceUpdate();
        },
        onSelectionUpdate: () => {
            forceUpdate();
        },
    }, [ydoc, provider]);

    React.useEffect(() => {
        if (editor && role) {
            editor.setEditable(role !== 'viewer');
        }
    }, [editor, role]);

    if (!editor) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse p-8">
                <div className="h-2 w-full max-w-md bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress origin-left"></div>
                </div>
                <p className="mt-4 font-medium text-lg">Initializing editor...</p>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            {/* Toolbar - Floating at top */}
            {editor && role !== 'viewer' && (
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                    <div className="max-w-4xl mx-auto">
                        <EditorToolbar editor={editor} />
                    </div>
                </div>
            )}

            {/* View Only Banner */}
            {role === 'viewer' && (
                <div className="sticky top-0 z-10 bg-amber-50 border-b border-amber-200">
                    <div className="max-w-4xl mx-auto px-8 py-3">
                        <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Only Mode
                        </div>
                    </div>
                </div>
            )}

            {/* White Document Canvas */}
            <div className="max-w-4xl mx-auto px-8 py-12">
                <div
                    className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-200px)] px-16 py-12"
                    onClick={() => role !== 'viewer' && editor?.chain().focus().run()}
                >
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
};

export const BlockEditor: React.FC<BlockEditorProps> = ({ documentId }) => {
    const { user } = useAuth();
    const { socket } = useSocket();

    // 1. Session Management (Backend handshake)
    const { session, status: sessionStatus, error: sessionError, requestSession } = useDocumentSession(documentId);

    // 2. User Info
    const userColor = React.useMemo(() => getRandomColor(user?.email || 'anon'), [user?.email]);
    const userInfo = React.useMemo(() => ({
        name: user?.email?.split('@')[0] || 'Anonymous',
        color: userColor,
    }), [user, userColor]);

    // 3. Y.js Logic (Only active when session exists)
    // We pass undefined if no session, which prevents useYjs from doing anything
    const { ydoc, provider, status: yjsStatus, role, error: yjsError } = useYjs(
        session?.sessionId,
        socket,
        userInfo
    );

    // Initial Trigger for Session
    React.useEffect(() => {
        if (documentId && sessionStatus === 'idle') {
            requestSession();
        }
    }, [documentId, sessionStatus, requestSession]);

    // Combined Error State
    const error = sessionError || yjsError;
    const isReady = sessionStatus === 'ready' && yjsStatus === 'ready' && provider && ydoc;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-destructive p-8" data-testid="editor-error">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
                <p className="text-muted-foreground text-center max-w-md">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    Reload Page
                </button>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse p-8">
                <div className="h-2 w-full max-w-md bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress origin-left"></div>
                </div>
                <p className="mt-4 font-medium text-lg">
                    {sessionStatus === 'requesting'
                        ? 'Requesting secure session...'
                        : 'Synchronizing document...'}
                </p>
            </div>
        );
    }

    return (
        <EditorInner
            ydoc={ydoc}
            provider={provider}
            role={role || session?.role || 'viewer'}
        />
    );
};
