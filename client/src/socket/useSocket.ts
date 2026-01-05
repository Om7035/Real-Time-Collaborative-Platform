import { useEffect, useState } from 'react';
import { Socket, socketClient } from './socket.client';
import { useAuth } from '../auth/AuthContext';

export const useSocket = (): Socket | null => {
    const { accessToken, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            const socketInstance = socketClient.connect(accessToken);
            setSocket(socketInstance);

            return () => {
                socketClient.disconnect();
                setSocket(null);
            };
        }
    }, [isAuthenticated, accessToken]);

    return socket;
};
