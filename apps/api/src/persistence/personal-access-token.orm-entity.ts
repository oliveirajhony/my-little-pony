import type { PatScope } from '@my-little-pony/core';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'personal_access_tokens' })
@Index('pat_owner_idx', ['ownerId'])
export class PersonalAccessTokenOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  prefix!: string;

  @Column({ type: 'text', name: 'token_hash', unique: true })
  tokenHash!: string;

  @Column({ type: 'text', array: true })
  scopes!: PatScope[];

  @Column({ type: 'timestamptz', name: 'last_used_at', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;
}
