import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';

export const REDIS = Symbol('REDIS');

// Single shared ioredis client, built from the validated config. Reused for the
// refresh-token store now and cache/rate-limit in later plans.
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new Redis(config.redisUrl),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
