import type { SourceFileKind } from '@my-little-pony/core';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'source_files' })
@Index('source_files_owner_idx', ['ownerId'])
export class SourceFileOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'text' })
  filename!: string;

  @Column({ type: 'text' })
  kind!: SourceFileKind;

  @Column({ type: 'text', name: 'content_type' })
  contentType!: string;

  @Column({ type: 'bigint', name: 'size_bytes' })
  sizeBytes!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
