import type { MigrationInterface, QueryRunner } from 'typeorm';

// Documentos-fonte importados (só leitura) — metadados; os bytes vivem no MinIO.
export class CreateSourceFiles1751933100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "source_files" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "filename" text NOT NULL,
        "kind" text NOT NULL,
        "content_type" text NOT NULL,
        "size_bytes" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX "source_files_owner_idx" ON "source_files" ("owner_id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "source_files"');
  }
}
