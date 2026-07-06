import {
  type PatScope,
  PersonalAccessToken,
  type PersonalAccessTokenRepository,
} from '@my-little-pony/core';
import { IsNull, type Repository } from 'typeorm';
import { PersonalAccessTokenOrmEntity } from './personal-access-token.orm-entity';

/** PersonalAccessTokenRepository port backed by TypeORM + Postgres. */
export class TypeOrmPersonalAccessTokenRepository implements PersonalAccessTokenRepository {
  constructor(private readonly repo: Repository<PersonalAccessTokenOrmEntity>) {}

  async save(token: PersonalAccessToken): Promise<void> {
    await this.repo.save(this.toOrm(token));
  }

  async findByHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    const row = await this.repo.findOne({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<PersonalAccessToken | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listActiveByOwner(ownerId: string): Promise<PersonalAccessToken[]> {
    const rows = await this.repo.find({
      where: { ownerId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('expires_at IS NOT NULL AND expires_at <= :now', { now })
      .execute();
    return result.affected ?? 0;
  }

  private toDomain(row: PersonalAccessTokenOrmEntity): PersonalAccessToken {
    return PersonalAccessToken.fromProps({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      prefix: row.prefix,
      tokenHash: row.tokenHash,
      scopes: row.scopes as PatScope[],
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    });
  }

  private toOrm(token: PersonalAccessToken): PersonalAccessTokenOrmEntity {
    const props = token.toProps();
    const row = new PersonalAccessTokenOrmEntity();
    row.id = props.id;
    row.ownerId = props.ownerId;
    row.name = props.name;
    row.prefix = props.prefix;
    row.tokenHash = props.tokenHash;
    row.scopes = props.scopes;
    row.lastUsedAt = props.lastUsedAt;
    row.expiresAt = props.expiresAt;
    row.createdAt = props.createdAt;
    row.revokedAt = props.revokedAt;
    return row;
  }
}
