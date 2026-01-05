import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BlockEditor } from '../editor/BlockEditor';
import { AIPanel } from '../ai/AIPanel';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { Bot, PanelRightClose, Share2, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ShareModal } from './ShareModal';
import { ErrorBoundary } from './ErrorBoundary';
import axios from '../auth/axiosInstance';
import config from '../utils/config';

export const Workspace: React.FC = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const { user, accessToken } = useAuth();
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [docTitle, setDocTitle] = useState('Untitled Document');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleToggle = () => setAiPanelOpen(prev => !prev);
        window.addEventListener('toggle-ai-panel', handleToggle);
        return () => window.removeEventListener('toggle-ai-panel', handleToggle);
    }, []);

    useEffect(() => {
        if (!documentId || !accessToken) return;

        setIsLoading(true);
        axios.get(config.endpoints.documents.get(documentId), {
            headers: { Authorization: `Bearer ${accessToken}` }
        }).then(res => {
            if (res.data.success) {
                setDocTitle(res.data.data.title);
                setCurrentUserRole(res.data.data.currentUserRole);
                setError(null);
            }
        }).catch(err => {
            console.error(err);
            if (err.response?.status === 404) {
                setError('Document not found');
            } else if (err.response?.status === 403) {
                setError('You do not have permission to access this document');
            } else {
                setError('Failed to load document');
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [documentId, accessToken]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const startEditingTitle = () => {
        if (currentUserRole === 'viewer') return;
        setEditedTitle(docTitle);
        setIsEditingTitle(true);
    };

    const saveTitle = async () => {
        if (!editedTitle.trim() || editedTitle === docTitle) {
            setIsEditingTitle(false);
            return;
        }

        setIsSavingTitle(true);
        try {
            const response = await axios.patch(
                config.endpoints.documents.update(documentId!),
                { title: editedTitle.trim() }
            );
            if (response.data.success) {
                setDocTitle(editedTitle.trim());
                setIsEditingTitle(false);
            }
        } catch (error) {
            console.error('Failed to update title:', error);
        } finally {
            setIsSavingTitle(false);
        }
    };

    const cancelEditingTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle('');
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveTitle();
        } else if (e.key === 'Escape') {
            cancelEditingTitle();
        }
    };

    if (!documentId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-destructive">No document ID provided</h2>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading workspace...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-2xl font-bold text-destructive">{error}</h2>
                    <p className="text-muted-foreground">
                        {error.includes('not found') && 'This document may have been deleted or you may not have access to it.'}
                        {error.includes('permission') && 'Please request access from the document owner.'}
                        {!error.includes('not found') && !error.includes('permission') && 'Please try again or contact support.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen relative group bg-background">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-card border-b border-border">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} className="text-muted-foreground" />
                        </button>

                        {isEditingTitle ? (
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    onBlur={saveTitle}
                                    disabled={isSavingTitle}
                                    className="flex-1 px-3 py-1.5 text-lg font-semibold bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                                />
                                <button
                                    onClick={saveTitle}
                                    disabled={isSavingTitle}
                                    className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={cancelEditingTitle}
                                    disabled={isSavingTitle}
                                    className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={startEditingTitle}
                                disabled={currentUserRole === 'viewer'}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group/title",
                                    currentUserRole !== 'viewer' && "hover:bg-muted"
                                )}
                            >
                                <h1 className="text-lg font-semibold text-foreground truncate">
                                    {docTitle}
                                </h1>
                                {currentUserRole !== 'viewer' && (
                                    <Edit2 size={14} className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                )}
                            </button>
                        )}

                        {currentUserRole === 'viewer' && (
                            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded font-medium">
                                View Only
                            </span>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">

                        {/* Share Button */}
                        {currentUserRole === 'owner' && (
                            <button
                                onClick={() => setShareModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                <Share2 size={16} />
                                Share
                            </button>
                        )}

                        {/* AI Panel Toggle */}
                        <button
                            onClick={() => setAiPanelOpen(!aiPanelOpen)}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                aiPanelOpen
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            title={aiPanelOpen ? "Close AI Panel" : "Open AI Panel"}
                        >
                            {aiPanelOpen ? <PanelRightClose size={18} /> : <Bot size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 pt-[57px]">
                <ErrorBoundary>
                    <BlockEditor key={documentId} documentId={documentId!} />
                </ErrorBoundary>
            </div>

            {/* AI Panel */}
            {aiPanelOpen && (
                <div className="w-96 border-l border-border bg-card pt-[57px]">
                    <AIPanel documentId={documentId} socket={socket} userId={user?.id || ''} />
                </div>
            )}

            {/* Share Modal */}
            {shareModalOpen && documentId && (
                <ShareModal
                    isOpen={shareModalOpen}
                    documentId={documentId}
                    currentUserRole={currentUserRole}
                    onClose={() => setShareModalOpen(false)}
                />
            )}
        </div>
    );
};
