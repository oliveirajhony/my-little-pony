import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1751760000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "slug" text NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "content" text NOT NULL DEFAULT '',
        "excerpt" text NOT NULL DEFAULT '',
        "categories" text[] NOT NULL DEFAULT '{}',
        "index_status" text NOT NULL DEFAULT 'none',
        "version" integer NOT NULL DEFAULT 0,
        "storage_key" text,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "search_tsv" tsvector GENERATED ALWAYS AS (
          to_tsvector('portuguese',
            coalesce("title", '') || ' ' || coalesce("excerpt", '') || ' ' || coalesce("content", ''))
        ) STORED
      )
    `);
    await queryRunner.query('CREATE INDEX "documents_owner_idx" ON "documents" ("owner_id")');
    await queryRunner.query(
      'CREATE INDEX "documents_search_idx" ON "documents" USING GIN ("search_tsv")',
    );
    await queryRunner.query(
      'CREATE INDEX "documents_categories_idx" ON "documents" USING GIN ("categories")',
    );
    // Published slugs are unique per author (public URL is /d/:ownerId/:slug).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "documents_published_slug_idx" ON "documents" ("owner_id", "slug") WHERE "status" = 'published'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "documents"');
  }
}
