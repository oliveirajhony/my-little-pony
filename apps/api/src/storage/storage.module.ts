import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { AVATAR_STORAGE } from '../tokens';
import { MinioAvatarStorage } from './minio-avatar.storage';

// Binds the AvatarStorage port to its MinIO adapter and exposes it app-wide.
@Global()
@Module({
  providers: [
    {
      provide: AVATAR_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new MinioAvatarStorage({
          endPoint: config.minioEndpoint,
          port: config.minioPort,
          useSSL: false,
          accessKey: config.minioAccessKey,
          secretKey: config.minioSecretKey,
          bucket: config.minioBucket,
        }),
    },
  ],
  exports: [AVATAR_STORAGE],
})
export class StorageModule {}
