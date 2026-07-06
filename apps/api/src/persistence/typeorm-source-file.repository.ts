import { SourceFile, type SourceFileKind, type SourceFileRepository } from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { SourceFileOrmEntity } from './source-file.orm-entity';

/** SourceFileRepository port backed by TypeORM + Postgres. */
export class TypeOrmSourceFileRepository implements SourceFileRepository {
  constructor(private readonly repo: Repository<SourceFileOrmEntity>) {}

  async save(file: SourceFile): Promise<void> {
    await this.repo.save(this.toOrm(file));
  }

  async findById(id: string): Promise<SourceFile | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async listByOwner(ownerId: string): Promise<SourceFile[]> {
    const rows = await this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: SourceFileOrmEntity): SourceFile {
    return SourceFile.fromProps({
      id: row.id,
      ownerId: row.ownerId,
      filename: row.filename,
      kind: row.kind as SourceFileKind,
      contentType: row.contentType,
      // bigint chega como string do Postgres — converte de volta pra número.
      sizeBytes: Number(row.sizeBytes),
      createdAt: row.createdAt,
      indexStatus: row.indexStatus,
      version: row.version,
      indexedAt: row.indexedAt,
    });
  }

  private toOrm(file: SourceFile): SourceFileOrmEntity {
    const props = file.toProps();
    const row = new SourceFileOrmEntity();
    row.id = props.id;
    row.ownerId = props.ownerId;
    row.filename = props.filename;
    row.kind = props.kind;
    row.contentType = props.contentType;
    row.sizeBytes = String(props.sizeBytes);
    row.createdAt = props.createdAt;
    row.indexStatus = props.indexStatus;
    row.version = props.version;
    row.indexedAt = props.indexedAt;
    return row;
  }
}
