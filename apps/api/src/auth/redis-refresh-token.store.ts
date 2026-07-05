import type { RefreshTokenStore } from '@my-little-pony/core';
import type Redis from 'ioredis';

const tokenKey = (token: string) => `refresh:${token}`;
const userSetKey = (userId: string) => `refresh-user:${userId}`;

/**
 * RefreshTokenStore adapter over Redis. Each token maps to its userId with a
 * TTL; a per-user set tracks a user's live tokens so they can be revoked in bulk
 * (e.g. on password change).
 */
export class RedisRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly redis: Redis) {}

  async issue(input: { userId: string; token: string; ttlSeconds: number }): Promise<void> {
    await this.redis.set(tokenKey(input.token), input.userId, 'EX', input.ttlSeconds);
    await this.redis.sadd(userSetKey(input.userId), input.token);
    await this.redis.expire(userSetKey(input.userId), input.ttlSeconds);
  }

  resolve(token: string): Promise<string | null> {
    return this.redis.get(tokenKey(token));
  }

  async revoke(token: string): Promise<void> {
    const userId = await this.redis.get(tokenKey(token));
    await this.redis.del(tokenKey(token));
    if (userId) await this.redis.srem(userSetKey(userId), token);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const tokens = await this.redis.smembers(userSetKey(userId));
    const pipeline = this.redis.pipeline();
    for (const token of tokens) pipeline.del(tokenKey(token));
    pipeline.del(userSetKey(userId));
    await pipeline.exec();
  }
}
