import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import axios from '../auth/axiosInstance';
import config from '../utils/config';
import { DocumentMetadata } from '../types/document';
import { FileText, Plus, User, Trash2, Edit2, MoreVertical } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { accessToken, user } = useAuth();
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchDocuments = useCallback(async () => {
        if (!accessToken) return;

        try {
            const response = await axios.get(config.endpoints.documents.list);
            if (response.data.success) {
                setDocuments(response.data.data);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to load documents:', err);
            setError('Failed to load documents. Please try refreshing.');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const createDocument = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const response = await axios.post(
                config.endpoints.documents.create,
                { title: 'Untitled Page' }
            );
            if (response.data.success) {
                navigate(`/workspace/${response.data.data.id}`);
            } else {
                setError(response.data.error || 'Failed to create document');
            }
        } catch (error) {
            console.error('Failed to create document:', error);
            setError('Failed to create document. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteDocument = async (docId: string) => {
        if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }

        setDeletingId(docId);
        try {
            const response = await axios.delete(
                config.endpoints.documents.delete(docId)
            );
            if (response.data.success) {
                setDocuments(docs => docs.filter(d => d.id !== docId));
                setError(null);
            } else {
                setError(response.data.error || 'Failed to delete document');
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
            setError('Failed to delete document. Please try again.');
        } finally {
            setDeletingId(null);
            setMenuOpenId(null);
        }
    };



    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">My Documents</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Welcome back, {user?.email?.split('@')[0] || 'User'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={createDocument}
                                disabled={isCreating}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        New Document
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                        {error}
                    </div>
                )}

                {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-6 mb-4">
                            <FileText size={48} className="text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground mb-2">No documents yet</h2>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            Create your first document to start writing and collaborating with your team.
                        </p>
                        <button
                            onClick={createDocument}
                            disabled={isCreating}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                        >
                            <Plus size={20} />
                            Create Your First Document
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="group relative bg-card border border-border rounded-lg p-5 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                            >
                                <div
                                    onClick={() => navigate(`/workspace/${doc.id}`)}
                                    className="flex-1"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <FileText size={20} className="text-primary" />
                                            </div>
                                            <h3 className="font-semibold text-foreground line-clamp-1 flex-1">
                                                {doc.title || 'Untitled Document'}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <User size={14} />
                                            <span>
                                                {doc.ownerId === user?.id ? 'You' : 'Shared'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document Menu */}
                                {doc.ownerId === user?.id && (
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenId(menuOpenId === doc.id ? null : doc.id);
                                            }}
                                            className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreVertical size={18} className="text-muted-foreground" />
                                        </button>

                                        {menuOpenId === doc.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/workspace/${doc.id}`);
                                                        setMenuOpenId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                    Open
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteDocument(doc.id);
                                                    }}
                                                    disabled={deletingId === doc.id}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === doc.id ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive"></div>
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 size={14} />
                                                            Delete
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
