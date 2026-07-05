import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { EMAIL_SENDER } from '../tokens';
import { NodemailerEmailSender } from './nodemailer-email-sender';

// Liga a porta EmailSender ao adapter SMTP (nodemailer), disponível app-wide.
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new NodemailerEmailSender({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          user: config.smtpUser,
          pass: config.smtpPass,
          from: config.mailFrom,
        }),
    },
  ],
  exports: [EMAIL_SENDER],
})
export class MailModule {}
