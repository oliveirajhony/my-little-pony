import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';
import { APP_CONFIG } from './config/config.module';
import type { AppConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  app.use(cookieParser());
  // Strip unknown fields and coerce DTO types; unknown props are rejected.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Allow the web app to call the API with credentials (the refresh cookie).
  app.enableCors({ origin: config.webOrigin, credentials: true });

  const openApi = new DocumentBuilder()
    .setTitle('my-little-pony API')
    .setDescription('Documentos, autenticação e usuários.')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi));

  await app.listen(config.port);
  Logger.log(`api on :${config.port} — docs at /docs`, 'Bootstrap');
}

void bootstrap();
