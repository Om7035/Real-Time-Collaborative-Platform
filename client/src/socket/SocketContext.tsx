import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket, socketClient } from './socket.client';
import { useAuth } from '../auth/AuthContext';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false, connectionError: null });

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { accessToken, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            const socketInstance = socketClient.connect(accessToken);
            setSocket(socketInstance);
            setConnectionError(null);

            const onConnect = () => {
                setIsConnected(true);
                setConnectionError(null);
            };
            const onDisconnect = () => setIsConnected(false);
            const onError = (err: Error) => {
                console.error('Socket connection error:', err);
                setConnectionError(err.message);
            };

            socketInstance.on('connect', onConnect);
            socketInstance.on('disconnect', onDisconnect);
            socketInstance.on('connect_error', onError);

            if (socketInstance.connected) {
                setIsConnected(true);
            }

            return () => {
                socketInstance.off('connect', onConnect);
                socketInstance.off('disconnect', onDisconnect);
                socketInstance.off('connect_error', onError);
                socketClient.disconnect();
                setSocket(null);
                setIsConnected(false);
                setConnectionError(null);
            };
        }
    }, [isAuthenticated, accessToken]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
