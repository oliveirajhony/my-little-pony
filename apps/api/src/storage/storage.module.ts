import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { AVATAR_STORAGE, DOCUMENT_PDF_STORAGE, SOURCE_FILE_STORAGE } from '../tokens';
import { MinioAvatarStorage } from './minio-avatar.storage';
import { MinioDocumentPdfStorage } from './minio-document-pdf.storage';
import { MinioSourceFileStorage } from './minio-source-file.storage';

// Binds the storage ports (avatar, document PDF, source files) to their MinIO
// adapters and exposes them app-wide.
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
    {
      provide: DOCUMENT_PDF_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new MinioDocumentPdfStorage({
          endPoint: config.minioEndpoint,
          port: config.minioPort,
          useSSL: false,
          accessKey: config.minioAccessKey,
          secretKey: config.minioSecretKey,
          bucket: config.minioBucket,
        }),
    },
    {
      provide: SOURCE_FILE_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new MinioSourceFileStorage({
          endPoint: config.minioEndpoint,
          port: config.minioPort,
          useSSL: false,
          accessKey: config.minioAccessKey,
          secretKey: config.minioSecretKey,
          bucket: config.minioBucket,
        }),
    },
  ],
  exports: [AVATAR_STORAGE, DOCUMENT_PDF_STORAGE, SOURCE_FILE_STORAGE],
})
export class StorageModule {}
