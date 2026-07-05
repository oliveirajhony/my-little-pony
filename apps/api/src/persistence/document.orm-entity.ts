import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'documents' })
@Index('documents_owner_idx', ['ownerId'])
export class DocumentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  excerpt!: string;

  @Column({ type: 'text', array: true })
  categories!: string[];

  @Column({ type: 'text', name: 'index_status' })
  indexStatus!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'text', name: 'storage_key', nullable: true })
  storageKey!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
