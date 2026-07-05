import { type RefreshTokenStore, SessionIssuer, type TokenService } from '@my-little-pony/core';
import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { SystemClock, UuidIdGenerator } from '../infra/system-adapters';
import { REDIS } from '../redis/redis.module';
import {
  CLOCK,
  ID_GENERATOR,
  PASSWORD_HASHER,
  REFRESH_TOKEN_STORE,
  TOKEN_SERVICE,
} from '../tokens';
import { AccessTokenGuard } from './access-token.guard';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { durationToSeconds } from './duration';
import { JwtTokenService } from './jwt-token.service';
import { RedisRefreshTokenStore } from './redis-refresh-token.store';

// Binds the framework-free ports to their concrete adapters and exposes the
// shared session machinery + access guard to the feature modules.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ secret: config.jwtAccessSecret }),
    }),
  ],
  providers: [
    AccessTokenGuard,
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: TOKEN_SERVICE,
      inject: [JwtService, APP_CONFIG],
      useFactory: (jwt: JwtService, config: AppConfig) =>
        new JwtTokenService(jwt, config.jwtAccessTtl),
    },
    {
      provide: REFRESH_TOKEN_STORE,
      inject: [REDIS],
      useFactory: (redis: import('ioredis').Redis) => new RedisRefreshTokenStore(redis),
    },
    {
      provide: SessionIssuer,
      inject: [TOKEN_SERVICE, REFRESH_TOKEN_STORE, APP_CONFIG],
      useFactory: (tokens: TokenService, store: RefreshTokenStore, config: AppConfig) =>
        new SessionIssuer(tokens, store, durationToSeconds(config.jwtRefreshTtl)),
    },
  ],
  exports: [
    JwtModule,
    AccessTokenGuard,
    SessionIssuer,
    PASSWORD_HASHER,
    ID_GENERATOR,
    CLOCK,
    TOKEN_SERVICE,
    REFRESH_TOKEN_STORE,
  ],
})
export class SecurityModule {}
