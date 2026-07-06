import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../auth/security.module';
import { ConfigModule } from '../config/config.module';
import { DocumentsModule } from '../documents/documents.module';
import { HealthController } from '../health/health.controller';
import { DomainExceptionFilter } from '../http/domain-exception.filter';
import { InternalModule } from '../internal/internal.module';
import { MailModule } from '../mail/mail.module';
import { McpModule } from '../mcp/mcp.module';
import { MessagesModule } from '../messages/messages.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PdfModule } from '../pdf/pdf.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { PersonalAccessTokensModule } from '../personal-access-tokens/pat.module';
import { PublicModule } from '../public/public.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RedisModule } from '../redis/redis.module';
import { SearchModule } from '../search/search.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PersistenceModule,
    RedisModule,
    RateLimitModule,
    MessagingModule,
    SecurityModule,
    StorageModule,
    PdfModule,
    MailModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    PublicModule,
    SearchModule,
    InternalModule,
    MessagesModule,
    PersonalAccessTokensModule,
    McpModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
