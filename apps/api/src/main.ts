import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';
import { APP_CONFIG } from './config/config.module';
import type { AppConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Strip unknown fields and coerce DTO types; unknown props are rejected.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Read the port from the validated config, not raw process.env — the
  // ConfigModule has already failed the boot if anything is missing.
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
  Logger.log(`api listening on :${config.port}`, 'Bootstrap');
}

void bootstrap();
