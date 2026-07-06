import type { MigrationInterface, QueryRunner } from 'typeorm';

// Estado de indexação (RAG) dos documentos-fonte: pipeline fila -> worker Python.
export class AddSourceFileIndexColumns1751933200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "source_files"
        ADD COLUMN "index_status" text NOT NULL DEFAULT 'indexing',
        ADD COLUMN "version" integer NOT NULL DEFAULT 1,
        ADD COLUMN "indexed_at" timestamptz
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "source_files"
        DROP COLUMN "indexed_at",
        DROP COLUMN "version",
        DROP COLUMN "index_status"
    `);
  }
}
