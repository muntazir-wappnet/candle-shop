import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    private readonly redis: Redis;

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            throw new Error('REDIS_URL is not defined');
        }
        this.redis = new Redis(redisUrl);
    }

    async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<void> {
        if (ttlSeconds) {
            await this.redis.set(
                key,
                value,
                'EX',
                ttlSeconds,
            );
            return;
        }

        await this.redis.set(key, value);
    }

    async get(
        key: string,
    ): Promise<string | null> {
        return this.redis.get(key);
    }

    async del(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async exists(
        key: string,
    ): Promise<boolean> {
        const result = await this.redis.exists(key);
        return result === 1;
    }

    async increment(
        key: string,
    ): Promise<number> {
        return this.redis.incr(key);
    }

    async expire(
        key: string,
        ttlSeconds: number,
    ): Promise<number> {
        return this.redis.expire(
            key,
            ttlSeconds,
        );
    }

    async ttl(
        key: string,
    ): Promise<number> {
        return this.redis.ttl(key);
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }

    getClient() {
        return this.redis;
    }
}