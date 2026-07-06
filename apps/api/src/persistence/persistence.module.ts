import { Global, Module } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import {
  CONTACT_MESSAGE_REPOSITORY,
  DOCUMENT_REPOSITORY,
  PERSONAL_ACCESS_TOKEN_REPOSITORY,
  SOURCE_FILE_REPOSITORY,
  USER_REPOSITORY,
} from '../tokens';
import { ContactMessageOrmEntity } from './contact-message.orm-entity';
import { buildTypeOrmOptions } from './data-source';
import { DocumentOrmEntity } from './document.orm-entity';
import { PersonalAccessTokenOrmEntity } from './personal-access-token.orm-entity';
import { SourceFileOrmEntity } from './source-file.orm-entity';
import { TypeOrmContactMessageRepository } from './typeorm-contact-message.repository';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';
import { TypeOrmPersonalAccessTokenRepository } from './typeorm-personal-access-token.repository';
import { TypeOrmSourceFileRepository } from './typeorm-source-file.repository';
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
    {
      provide: CONTACT_MESSAGE_REPOSITORY,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmContactMessageRepository(dataSource.getRepository(ContactMessageOrmEntity)),
    },
    {
      provide: PERSONAL_ACCESS_TOKEN_REPOSITORY,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmPersonalAccessTokenRepository(
          dataSource.getRepository(PersonalAccessTokenOrmEntity),
        ),
    },
    {
      provide: SOURCE_FILE_REPOSITORY,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmSourceFileRepository(dataSource.getRepository(SourceFileOrmEntity)),
    },
  ],
  exports: [
    USER_REPOSITORY,
    DOCUMENT_REPOSITORY,
    CONTACT_MESSAGE_REPOSITORY,
    PERSONAL_ACCESS_TOKEN_REPOSITORY,
    SOURCE_FILE_REPOSITORY,
  ],
})
export class PersistenceModule {}
