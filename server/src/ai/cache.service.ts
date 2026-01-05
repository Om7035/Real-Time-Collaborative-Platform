import logger from '../utils/logger';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class CacheService {
    private cache: Map<string, CacheEntry<string>> = new Map();
    private ttl: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(ttlSeconds: number = 3600) {
        this.ttl = ttlSeconds * 1000;
        this.startCleanup();
    }

    set(key: string, value: string): void {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(key, { value, expiresAt });
        logger.debug('Cache set', { key, expiresAt });
    }

    get(key: string): string | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            logger.debug('Cache entry expired', { key });
            return null;
        }

        logger.debug('Cache hit', { key });
        return entry.value;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        this.cache.delete(key);
        logger.debug('Cache entry deleted', { key });
    }

    clear(): void {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let deletedCount = 0;

            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                logger.debug('Cache cleanup completed', { deletedCount });
            }
        }, 60000);
    }

    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    getStats(): { size: number; ttl: number } {
        return {
            size: this.cache.size,
            ttl: this.ttl,
        };
    }
}

export const cacheService = new CacheService();
