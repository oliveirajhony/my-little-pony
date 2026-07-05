import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../auth/security.module';
import { ConfigModule } from '../config/config.module';
import { HealthController } from '../health/health.controller';
import { DomainExceptionFilter } from '../http/domain-exception.filter';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    RedisModule,
    SecurityModule,
    StorageModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
