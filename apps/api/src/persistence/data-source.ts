import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { ContactMessageOrmEntity } from './contact-message.orm-entity';
import { DocumentOrmEntity } from './document.orm-entity';
import { LlmProviderOrmEntity } from './llm-provider.orm-entity';
import { CreateUsers1751673600000 } from './migrations/1751673600000-CreateUsers';
import { CreateDocuments1751760000000 } from './migrations/1751760000000-CreateDocuments';
import { CreateContactMessages1751846400000 } from './migrations/1751846400000-CreateContactMessages';
import { AddDocumentPageConfig1751932800000 } from './migrations/1751932800000-AddDocumentPageConfig';
import { CreatePersonalAccessTokens1751933000000 } from './migrations/1751933000000-CreatePersonalAccessTokens';
import { CreateSourceFiles1751933100000 } from './migrations/1751933100000-CreateSourceFiles';
import { AddSourceFileIndexColumns1751933200000 } from './migrations/1751933200000-AddSourceFileIndexColumns';
import { CreateLlmProviders1751933300000 } from './migrations/1751933300000-CreateLlmProviders';
import { PersonalAccessTokenOrmEntity } from './personal-access-token.orm-entity';
import { SourceFileOrmEntity } from './source-file.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

// Entities and migrations are listed explicitly (not globbed) so they survive
// webpack bundling. synchronize is always off — schema changes go through
// migrations only.
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [
      UserOrmEntity,
      DocumentOrmEntity,
      ContactMessageOrmEntity,
      PersonalAccessTokenOrmEntity,
      SourceFileOrmEntity,
      LlmProviderOrmEntity,
    ],
    migrations: [
      CreateUsers1751673600000,
      CreateDocuments1751760000000,
      CreateContactMessages1751846400000,
      AddDocumentPageConfig1751932800000,
      CreatePersonalAccessTokens1751933000000,
      CreateSourceFiles1751933100000,
      AddSourceFileIndexColumns1751933200000,
      CreateLlmProviders1751933300000,
    ],
    synchronize: false,
  };
}

// Standalone DataSource for the TypeORM CLI (generate/run migrations by hand).
dotenv.config();
export default new DataSource(buildTypeOrmOptions(process.env.DATABASE_URL ?? ''));
