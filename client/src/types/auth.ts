export interface User {
    id: string;
    email: string;
    role: 'user' | 'admin';
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponseData {
    tokens: AuthTokens;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}
