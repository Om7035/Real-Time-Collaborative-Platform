import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Users, Link as LinkIcon, Trash2, Clock } from 'lucide-react';
import { inviteAPI } from '../api/invite.api';
import { Invite, UserRole } from '../types/document';
import { useAuth } from '../auth/AuthContext';
import axios from 'axios';
import config from '../utils/config';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    currentUserRole: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, documentId, currentUserRole }) => {
    interface Collaborator {
        userId: string;
        email: string;
        role: string;
    }

    const { user, accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState<'invite' | 'manage'>('invite');
    const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInvites = React.useCallback(async () => {
        if (currentUserRole !== 'owner') return;
        try {
            const data = await inviteAPI.list(documentId);
            setInvites(data);
        } catch (err) {
            console.error(err);
        }
    }, [currentUserRole, documentId]);

    const loadCollaborators = React.useCallback(async () => {
        try {
            const response = await axios.get(config.endpoints.documents.get(documentId), {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.data.success) {
                setCollaborators(response.data.data.collaborators || []);
            }
        } catch (err) {
            console.error(err);
        }
    }, [documentId, accessToken]);

    useEffect(() => {
        if (isOpen && activeTab === 'manage') {
            loadInvites();
            loadCollaborators();
        }
    }, [isOpen, activeTab, loadInvites, loadCollaborators]);

    const handleCreateLink = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const invite = await inviteAPI.create(documentId, {
                role,
                expiresIn: 604800, // 7 days (default)
                maxUses: null // Unlimited
            });
            const link = `${window.location.origin}/invite/${invite.id}`;
            setGeneratedLink(link);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRevoke = async (token: string) => {
        try {
            await inviteAPI.revoke(token);
            loadInvites();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveCollaborator = async (targetUserId: string) => {
        try {
            // We need an API for this: DELETE /documents/:id/invite/:targetUserId
            // Wait, the endpoints object uses 'invite' for adding. 
            // Let's assume we can add a delete endpoint or use the one we built in session 1.
            // Looking at config, we only have invite endpoints. 
            // We need to use axios directly effectively or update config.
            // Session 1 summary: "Implemented /documents/:id/invite/:targetUserId (DELETE)"
            await axios.delete(`${config.apiUrl}/api/documents/${documentId}/invite/${targetUserId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            loadCollaborators();
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Share Document</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-border">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'invite' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('invite')}
                    >
                        Invite
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'manage' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('manage')}
                    >
                        Manage Access
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'invite' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRole(UserRole.VIEWER)}
                                        className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${role === UserRole.VIEWER ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-accent'}`}
                                    >
                                        Viewer
                                    </button>
                                    <button
                                        onClick={() => setRole(UserRole.EDITOR)}
                                        className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${role === UserRole.EDITOR ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-accent'}`}
                                    >
                                        Editor
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {role === UserRole.VIEWER ? 'Can view the document but cannot make changes.' : 'Can view and edit the document.'}
                                </p>
                            </div>

                            {!generatedLink ? (
                                <button
                                    onClick={handleCreateLink}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? <span className="animate-spin">⏳</span> : <LinkIcon size={18} />}
                                    Generate Link
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-3 bg-accent rounded-md border border-border">
                                        <div className="flex-1 truncate text-sm font-medium font-mono">{generatedLink}</div>
                                        <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                                            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setGeneratedLink(null)}
                                        className="text-xs text-primary hover:underline w-full text-center"
                                    >
                                        Generate new link
                                    </button>
                                </div>
                            )}

                            {error && <div className="text-sm text-red-500 text-center">{error}</div>}
                        </div>
                    )}

                    {activeTab === 'manage' && (
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-1">
                            {/* Collaborators */}
                            <div>
                                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <Users size={16} /> Users
                                </h3>
                                <div className="space-y-3">
                                    {collaborators.length === 0 && <p className="text-sm text-muted-foreground italic">No collaborators yet.</p>}
                                    {collaborators.map((c) => (
                                        <div key={c.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                    {c.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{c.email}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{c.role}</div>
                                                </div>
                                            </div>
                                            {currentUserRole === 'owner' && c.userId !== user?.id && (
                                                <button
                                                    onClick={() => handleRemoveCollaborator(c.userId)}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors"
                                                    title="Remove User"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Links */}
                            {currentUserRole === 'owner' && (
                                <div className="pt-4 border-t border-border">
                                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <LinkIcon size={16} /> Active Links
                                    </h3>
                                    <div className="space-y-3">
                                        {invites.length === 0 && <p className="text-sm text-muted-foreground italic">No active links.</p>}
                                        {invites.map((invite) => (
                                            <div key={invite.id} className="flex items-center justify-between p-2 rounded-md border border-border text-sm">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium capitalize">{invite.role}</span>
                                                        <span className="text-xs text-muted-foreground bg-accent px-1.5 rounded">
                                                            {invite.usedCount} uses
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never expires'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRevoke(invite.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Revoke Link"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
