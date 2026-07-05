import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../auth/security.module';
import { ConfigModule } from '../config/config.module';
import { DocumentsModule } from '../documents/documents.module';
import { HealthController } from '../health/health.controller';
import { DomainExceptionFilter } from '../http/domain-exception.filter';
import { InternalModule } from '../internal/internal.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { PublicModule } from '../public/public.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RedisModule } from '../redis/redis.module';
import { SearchModule } from '../search/search.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    RedisModule,
    RateLimitModule,
    MessagingModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    PublicModule,
    SearchModule,
    InternalModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
