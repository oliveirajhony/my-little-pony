import type { MigrationInterface, QueryRunner } from 'typeorm';

// Revocable, scoped API credentials for external agents (MCP server).
export class CreatePersonalAccessTokens1751933000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "personal_access_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "prefix" text NOT NULL,
        "token_hash" text NOT NULL UNIQUE,
        "scopes" text[] NOT NULL DEFAULT '{}',
        "last_used_at" timestamptz,
        "expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "pat_owner_idx" ON "personal_access_tokens" ("owner_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "personal_access_tokens"');
  }
}
