import type { MigrationInterface, QueryRunner } from 'typeorm';

// Provedores de LLM configurados por usuário (Explorar/RAG). A chave de API é
// guardada CIFRADA (api_key_encrypted); só o hint (máscara) é exibível.
export class CreateLlmProviders1751933300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "llm_providers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "label" text NOT NULL,
        "backend" text NOT NULL,
        "base_url" text NOT NULL,
        "model" text NOT NULL,
        "api_key_encrypted" text,
        "api_key_hint" text,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "llm_providers_owner_idx" ON "llm_providers" ("owner_id")',
    );
    // No máximo um provedor ativo por dono.
    await queryRunner.query(
      'CREATE UNIQUE INDEX "llm_providers_one_active_per_owner" ON "llm_providers" ("owner_id") WHERE "is_active"',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "llm_providers"');
  }
}
