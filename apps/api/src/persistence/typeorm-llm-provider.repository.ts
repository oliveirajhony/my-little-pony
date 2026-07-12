import { type LlmBackend, LlmProvider, type LlmProviderRepository } from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { LlmProviderOrmEntity } from './llm-provider.orm-entity';

/** LlmProviderRepository port backed by TypeORM + Postgres. */
export class TypeOrmLlmProviderRepository implements LlmProviderRepository {
  constructor(private readonly repo: Repository<LlmProviderOrmEntity>) {}

  async listByOwner(ownerId: string): Promise<LlmProvider[]> {
    const rows = await this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<LlmProvider | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActive(ownerId: string): Promise<LlmProvider | null> {
    const row = await this.repo.findOne({ where: { ownerId, isActive: true } });
    return row ? this.toDomain(row) : null;
  }

  async save(provider: LlmProvider): Promise<void> {
    await this.repo.save(this.toOrm(provider));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async deactivateAllForOwner(ownerId: string): Promise<void> {
    await this.repo.update({ ownerId }, { isActive: false });
  }

  private toDomain(row: LlmProviderOrmEntity): LlmProvider {
    return LlmProvider.fromProps({
      id: row.id,
      ownerId: row.ownerId,
      label: row.label,
      backend: row.backend as LlmBackend,
      baseUrl: row.baseUrl,
      model: row.model,
      apiKeyEncrypted: row.apiKeyEncrypted,
      apiKeyHint: row.apiKeyHint,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }

  private toOrm(provider: LlmProvider): LlmProviderOrmEntity {
    const props = provider.toProps();
    const row = new LlmProviderOrmEntity();
    row.id = props.id;
    row.ownerId = props.ownerId;
    row.label = props.label;
    row.backend = props.backend;
    row.baseUrl = props.baseUrl;
    row.model = props.model;
    row.apiKeyEncrypted = props.apiKeyEncrypted;
    row.apiKeyHint = props.apiKeyHint;
    row.isActive = props.isActive;
    row.createdAt = props.createdAt;
    return row;
  }
}
