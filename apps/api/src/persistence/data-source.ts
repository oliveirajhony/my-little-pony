import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { ContactMessageOrmEntity } from './contact-message.orm-entity';
import { DocumentOrmEntity } from './document.orm-entity';
import { CreateUsers1751673600000 } from './migrations/1751673600000-CreateUsers';
import { CreateDocuments1751760000000 } from './migrations/1751760000000-CreateDocuments';
import { CreateContactMessages1751846400000 } from './migrations/1751846400000-CreateContactMessages';
import { UserOrmEntity } from './user.orm-entity';

// Entities and migrations are listed explicitly (not globbed) so they survive
// webpack bundling. synchronize is always off — schema changes go through
// migrations only.
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [UserOrmEntity, DocumentOrmEntity, ContactMessageOrmEntity],
    migrations: [
      CreateUsers1751673600000,
      CreateDocuments1751760000000,
      CreateContactMessages1751846400000,
    ],
    synchronize: false,
  };
}

// Standalone DataSource for the TypeORM CLI (generate/run migrations by hand).
dotenv.config();
export default new DataSource(buildTypeOrmOptions(process.env.DATABASE_URL ?? ''));
