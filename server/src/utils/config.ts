import dotenv from 'dotenv';

dotenv.config();

interface Config {
    nodeEnv: string;
    port: number;
    host: string;
    jwt: {
        secret: string;
        refreshSecret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
    ai: {
        huggingfaceApiKey: string;
        rateLimitPerMinute: number;
        cacheTTL: number;
    };
    storage: {
        path: string;
        type: 'file' | 'database';
    };
    cors: {
        origin: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    mongoUri: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
};

export const config: Config = {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3000),
    host: getEnv('HOST', '0.0.0.0'),
    jwt: {
        secret: getEnv('JWT_SECRET', 'ros+rND4MvgzjqCF0tecz501W+vAWdLwHKJHkj4MEAw='),
        refreshSecret: getEnv('JWT_REFRESH_SECRET', '/LIvHd5eZoRLW97LwcqMe2mYdSa4PqI4mk80Opgmy4w='),
        accessExpiry: getEnv('JWT_ACCESS_EXPIRY', '15m'),
        refreshExpiry: getEnv('JWT_REFRESH_EXPIRY', '7d'),
    },
    ai: {
        huggingfaceApiKey: getEnv('HUGGINGFACE_API_KEY', ''),
        rateLimitPerMinute: getEnvNumber('AI_RATE_LIMIT_PER_MINUTE', 100), // Higher for dev
        cacheTTL: getEnvNumber('AI_CACHE_TTL_SECONDS', 3600),
    },
    storage: {
        path: getEnv('STORAGE_PATH', './storage/documents'),
        type: (getEnv('STORAGE_TYPE', 'file') as 'file' | 'database'),
    },
    cors: {
        origin: getEnv('CORS_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000'),
    },
    rateLimit: {
        windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
        maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },
    mongoUri: getEnv('MONGO_URI', 'mongodb://127.0.0.1:27017/oggg'), // Default to local DB for dev
};

export default config;
