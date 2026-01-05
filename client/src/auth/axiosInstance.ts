import axios from 'axios';
import config from '../utils/config';

const axiosInstance = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401s
axiosInstance.interceptors.response.use(
    (response) => {
        // Use import.meta.env for Vite instead of process.env
        const isDev = import.meta.env.DEV;
        if (isDev) {
            console.log(`API Success: ${response.config.url}`, response.status);
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Authentication expired or invalid');
            // We don't automatically clear storage here to avoid loop during refresh
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
