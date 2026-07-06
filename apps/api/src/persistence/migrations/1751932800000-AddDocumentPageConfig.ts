import type { MigrationInterface, QueryRunner } from 'typeorm';

// Persists the editor's page setup (paper, orientation, background colour,
// margins) and the per-document theme, previously ephemeral in the browser.
export class AddDocumentPageConfig1751932800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "documents" ADD COLUMN "page_config" jsonb');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "page_config"');
  }
}
