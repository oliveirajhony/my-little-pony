import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactMessages1751846400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contact_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "from_name" text NOT NULL,
        "from_email" text NOT NULL,
        "message" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "read_at" timestamptz
      )
    `);
    // Inbox do autor: lista por dono, mais recentes primeiro.
    await queryRunner.query(
      'CREATE INDEX "contact_messages_owner_idx" ON "contact_messages" ("owner_id", "created_at" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "contact_messages"');
  }
}
