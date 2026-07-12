import type { LlmBackend } from '@my-little-pony/core';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'llm_providers' })
@Index('llm_providers_owner_idx', ['ownerId'])
export class LlmProviderOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'text' })
  label!: string;

  @Column({ type: 'text' })
  backend!: LlmBackend;

  @Column({ type: 'text', name: 'base_url' })
  baseUrl!: string;

  @Column({ type: 'text' })
  model!: string;

  /** Chave de API CIFRADA (AES-GCM). Local sem chave => null. */
  @Column({ type: 'text', name: 'api_key_encrypted', nullable: true })
  apiKeyEncrypted!: string | null;

  @Column({ type: 'text', name: 'api_key_hint', nullable: true })
  apiKeyHint!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive!: boolean;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
