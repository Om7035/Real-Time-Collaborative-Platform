import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginRequest, RegisterRequest } from '../types/auth';
import { authAPI } from './auth.api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedAccessToken = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');
            const storedUser = localStorage.getItem('user');

            if (storedAccessToken && storedRefreshToken && storedUser) {
                try {
                    // Try to restore user object first for snappy UI
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setAccessToken(storedAccessToken);

                    // Then validate in background
                    const isValid = await authAPI.validate(storedAccessToken);
                    if (!isValid) {
                        console.log('Access token invalid or expired, refreshing...');
                        const newTokens = await authAPI.refresh(storedRefreshToken);
                        setAccessToken(newTokens.accessToken);
                        localStorage.setItem('accessToken', newTokens.accessToken);
                        localStorage.setItem('refreshToken', newTokens.refreshToken);
                    }
                } catch (error) {
                    console.error('Session restoration failed:', error);
                    logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (data: LoginRequest) => {
        console.log('Attempting login...', data.email);
        const responseData = await authAPI.login(data);
        console.log('Login successful');

        const { tokens, user: userData } = responseData;

        // Save to state
        setAccessToken(tokens.accessToken);
        setUser(userData);

        // Save to storage
        try {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
            console.error('Failed to save auth to localStorage:', e);
        }
    };

    const register = async (data: RegisterRequest) => {
        console.log('Attempting registration...', data.email);
        const responseData = await authAPI.register(data);
        console.log('Registration successful');

        const { tokens, user: userData } = responseData;

        setAccessToken(tokens.accessToken);
        setUser(userData);

        try {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
            console.error('Failed to save auth to localStorage:', e);
        }
    };

    const logout = () => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    };

    const value: AuthContextType = {
        user,
        accessToken,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
