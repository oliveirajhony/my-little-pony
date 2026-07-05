import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

// Default tier is generous (covers autosave/CRUD/public reads); auth and search
// routes tighten it per-route via @Throttle. Counters live in Redis so the
// limit holds across API instances. Tracked by IP.
export const DEFAULT_TTL_MS = 60_000;
export const DEFAULT_LIMIT = 120;

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [REDIS],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: DEFAULT_TTL_MS, limit: DEFAULT_LIMIT }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
