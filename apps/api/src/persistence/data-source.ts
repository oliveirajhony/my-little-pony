import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { CreateUsers1751673600000 } from './migrations/1751673600000-CreateUsers';
import { UserOrmEntity } from './user.orm-entity';

// Entities and migrations are listed explicitly (not globbed) so they survive
// webpack bundling. synchronize is always off — schema changes go through
// migrations only.
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [UserOrmEntity],
    migrations: [CreateUsers1751673600000],
    synchronize: false,
  };
}

// Standalone DataSource for the TypeORM CLI (generate/run migrations by hand).
dotenv.config();
export default new DataSource(buildTypeOrmOptions(process.env.DATABASE_URL ?? ''));
