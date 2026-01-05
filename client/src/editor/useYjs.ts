

import { useEffect, useState, useRef, useMemo } from 'react';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { Socket } from '../socket/socket.client';

export type YjsStatus = 'connecting' | 'syncing' | 'ready' | 'error';

interface JoinResponse {
    success: boolean;
    state?: Uint8Array;
    awareness?: Uint8Array;
    role?: string;
    error?: string;
}

export const useYjs = (sessionId: string | undefined, socket: Socket | null, user: { name: string; color: string } | null) => {
    // 1. Stable Y.Doc and Awareness
    const [ydoc] = useState(() => new Y.Doc());
    const [awareness] = useState(() => new Awareness(ydoc));

    // 2. State Machine
    const [status, setStatus] = useState<YjsStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    // 3. Refs for stability
    const isJoined = useRef(false);

    // 4. Stable Provider Creation (POJO that mimics Tiptap expectations)
    const provider = useMemo(() => {
        const eventHandlers: Map<string, Set<Function>> = new Map();

        return {
            doc: ydoc,
            document: ydoc, // Alias for some extensions
            awareness: awareness,
            // Events
            on: (event: string, handler: Function) => {
                if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
                eventHandlers.get(event)!.add(handler);
            },
            off: (event: string, handler: Function) => {
                eventHandlers.get(event)?.delete(handler);
            },
            emit: (event: string, ...args: any[]) => {
                eventHandlers.get(event)?.forEach(fn => fn(...args));
            },
            destroy: () => eventHandlers.clear(),
            disconnect: () => { },
            connect: () => { },
        };
    }, [ydoc, awareness]);

    useEffect(() => {
        if (!socket || !sessionId || !user) return;

        let isMounted = true;
        setStatus('connecting');

        const joinSession = () => {
            if (isJoined.current) return;

            console.log('[useYjs] Joining session:', sessionId);
            setStatus('syncing');

            // Set local user
            awareness.setLocalStateField('user', {
                name: user.name,
                color: user.color,
            });

            socket.emit('session:join', sessionId, (response: JoinResponse) => {
                if (!isMounted) return;

                if (response.success && response.state) {
                    try {
                        console.log('[useYjs] Joined session. Applying state...');

                        // Parse state
                        const state = response.state instanceof Uint8Array
                            ? response.state
                            : new Uint8Array(response.state);

                        // Apply state
                        Y.applyUpdate(ydoc, state);

                        // Apply awareness
                        if (response.awareness) {
                            const awState = response.awareness instanceof Uint8Array
                                ? response.awareness
                                : new Uint8Array(response.awareness);
                            applyAwarenessUpdate(awareness, awState, 'remote');
                        }

                        if (response.role) setRole(response.role);

                        isJoined.current = true;
                        setStatus('ready');
                    } catch (err) {
                        console.error('[useYjs] Sync error:', err);
                        setError('Failed to process document data');
                        setStatus('error');
                    }
                } else {
                    console.error('[useYjs] Join error:', response.error);
                    setError(response.error || 'Failed to join document session');
                    setStatus('error');
                }
            });
        };

        const onReconnect = () => {
            if (!isMounted) return;
            console.log('[useYjs] Reconnecting...');
            isJoined.current = false;
            joinSession();
        };

        const onDisconnect = () => {
            if (!isMounted) return;
            console.log('[useYjs] Disconnected');
            setStatus('connecting');
            isJoined.current = false;
        };

        // Real-time Updates
        const onSessionUpdate = (update: Uint8Array) => {
            // console.log('[useYjs] Received update', update.byteLength);
            Y.applyUpdate(ydoc, new Uint8Array(update));
        };
        const onAwarenessUpdate = (update: Uint8Array) => applyAwarenessUpdate(awareness, new Uint8Array(update), 'remote');

        // Outgoing Updates
        const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin !== 'remote' && isJoined.current) socket.emit('session:update', sessionId, update);
        };
        const handleAwarenessChange = ({ added, updated, removed }: any, origin: unknown) => {
            if (origin === 'local' && isJoined.current) {
                const update = encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]);
                socket.emit('awareness:update', update);
            }
        };

        // Bind Listeners
        socket.on('connect', onReconnect);
        socket.on('disconnect', onDisconnect);
        socket.on('session:update', onSessionUpdate);
        socket.on('awareness:update', onAwarenessUpdate);

        ydoc.on('update', handleDocUpdate);
        awareness.on('update', handleAwarenessChange);

        // Initial Trigger
        if (socket.connected) {
            joinSession();
        }

        return () => {
            isMounted = false;
            socket.off('connect', onReconnect);
            socket.off('disconnect', onDisconnect);
            socket.off('session:update', onSessionUpdate);
            socket.off('awareness:update', onAwarenessUpdate);
            ydoc.off('update', handleDocUpdate);
            awareness.off('update', handleAwarenessChange);

            if (isJoined.current && socket.connected) {
                socket.emit('session:leave', sessionId);
            }
            isJoined.current = false;
        };
    }, [socket, sessionId, ydoc, awareness, user]);

    return { ydoc, provider, status, error, role };
};
