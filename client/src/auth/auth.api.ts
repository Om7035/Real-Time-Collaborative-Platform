import axiosLib, { AxiosInstance } from 'axios';
import { AuthTokens, LoginRequest, RegisterRequest, AuthResponseData } from '../types/auth';
import config from '../utils/config';

/**
 * We use a dedicated axios instance for Auth API to avoid 
 * side-effects from the global axiosInstance (like attaching stale tokens 
 * to login/register requests or global 401 handling).
 */
const authClient: AxiosInstance = axiosLib.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

const handleApiError = (error: any, defaultMessage: string) => {
    if (axiosLib.isAxiosError(error)) {
        console.error(`Auth API Error [${error.config?.url}]:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        if (!error.response) {
            throw new Error(`Connection Error: Cannot reach the server at ${config.apiUrl}. Please ensure the backend is running.`);
        }

        if (error.response.data?.error) {
            throw new Error(error.response.data.error);
        }

        if (error.response.status === 401) {
            throw new Error('Unauthorized: Invalid credentials.');
        }

        if (error.response.status === 404) {
            throw new Error('API Error: Endpoint not found. Check VITE_API_URL.');
        }
    }

    console.error('Non-Axios Auth Error:', error);
    throw new Error(error.message || defaultMessage);
};

class AuthAPI {
    async register(request: RegisterRequest): Promise<AuthResponseData> {
        try {
            const response = await authClient.post(config.endpoints.auth.register, request);

            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Invalid response format from server');
            }

            if (response.data.success === false) {
                throw new Error(response.data.error || 'Registration failed');
            }

            // Return data.data as per our contract
            return response.data.data;
        } catch (error: any) {
            return handleApiError(error, 'Registration failed');
        }
    }

    async login(request: LoginRequest): Promise<AuthResponseData> {
        try {
            const response = await authClient.post(config.endpoints.auth.login, request);

            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Invalid response format from server');
            }

            if (response.data.success === false) {
                throw new Error(response.data.error || 'Login failed');
            }

            return response.data.data;
        } catch (error: any) {
            return handleApiError(error, 'Login failed');
        }
    }

    async refresh(refreshToken: string): Promise<AuthTokens> {
        try {
            const response = await authClient.post(config.endpoints.auth.refresh, { refreshToken });
            if (!response.data?.success) {
                throw new Error(response.data?.error || 'Token refresh failed');
            }
            return response.data.data;
        } catch (error: any) {
            return handleApiError(error, 'Session expired');
        }
    }

    async validate(token: string): Promise<boolean> {
        try {
            const response = await authClient.post(config.endpoints.auth.validate, { token });
            return !!(response.data?.success && response.data?.data?.valid);
        } catch {
            return false;
        }
    }
}

export const authAPI = new AuthAPI();
