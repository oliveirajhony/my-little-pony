import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { CACHE_STORE } from '../tokens';

export const REDIS = Symbol('REDIS');

import { RedisCacheStore } from './redis-cache.store';

// Single shared ioredis client, built from the validated config. Backs the
// refresh-token store, the cache and (later) rate limiting.
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new Redis(config.redisUrl),
    },
    {
      provide: CACHE_STORE,
      inject: [REDIS],
      useFactory: (redis: Redis) => new RedisCacheStore(redis),
    },
  ],
  exports: [REDIS, CACHE_STORE],
})
export class RedisModule {}
