import { Global, Module } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { DOCUMENT_REPOSITORY, USER_REPOSITORY } from '../tokens';
import { buildTypeOrmOptions } from './data-source';
import { DocumentOrmEntity } from './document.orm-entity';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { UserOrmEntity } from './user.orm-entity';

// Owns the Postgres connection. Runs pending migrations on boot and exposes the
// UserRepository port bound to its TypeORM implementation.
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        ...buildTypeOrmOptions(config.databaseUrl),
        migrationsRun: true,
      }),
    }),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmUserRepository(dataSource.getRepository(UserOrmEntity)),
    },
    {
      provide: DOCUMENT_REPOSITORY,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmDocumentRepository(dataSource.getRepository(DocumentOrmEntity)),
    },
  ],
  exports: [USER_REPOSITORY, DOCUMENT_REPOSITORY],
})
export class PersistenceModule {}
