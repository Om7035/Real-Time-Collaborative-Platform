import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inviteAPI } from '../api/invite.api';
import { useAuth } from '../auth/AuthContext';
import { InviteInfo } from '../api/invite.api';
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const InviteLanding: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [info, setInfo] = useState<InviteInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);

    useEffect(() => {
        const checkInvite = async () => {
            try {
                const data = await inviteAPI.get(token!);
                setInfo(data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            checkInvite();
        }
    }, [token]);

    const handleAccept = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        setIsAccepting(true);
        try {
            const result = await inviteAPI.accept(token!);
            navigate(`/workspace/${result.documentId}`);
        } catch (err) {
            setError((err as Error).message);
            setIsAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold">Invite Invalid</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center text-primary hover:underline mt-4"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-8 text-center space-y-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle size={32} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">You&apos;ve been invited!</h1>
                    <p className="text-muted-foreground">
                        You have been invited to collaborate on:
                    </p>
                    <div className="p-3 bg-accent rounded-lg font-medium text-foreground text-lg">
                        {info?.documentTitle}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Role: <span className="capitalize font-medium text-foreground">{info?.role}</span>
                    </div>
                </div>

                <div className="pt-4">
                    {!isAuthenticated ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Please log in to accept this invitation.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                Log In to Accept
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                        >
                            {isAccepting ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Accept Invitation <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
