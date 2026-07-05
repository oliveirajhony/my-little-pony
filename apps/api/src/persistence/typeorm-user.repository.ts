import { DomainError, User, type UserRepository } from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { isUniqueViolation } from './pg-unique-violation';
import { UserOrmEntity } from './user.orm-entity';

// Unique index on the normalized email (see
// migrations/1751673600000-CreateUsers.ts).
const EMAIL_UNIQUE_INDEX = 'users_email_unique';

/** UserRepository port backed by TypeORM. Maps rows <-> domain aggregate. */
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly repo: Repository<UserOrmEntity>) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email: User.normalizeEmail(email) } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    try {
      await this.repo.save(this.toOrm(user));
    } catch (error) {
      if (isUniqueViolation(error, EMAIL_UNIQUE_INDEX)) {
        throw new DomainError('email-taken');
      }
      throw error;
    }
  }

  private toDomain(row: UserOrmEntity): User {
    return User.fromProps({
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toOrm(user: User): UserOrmEntity {
    const props = user.toProps();
    const row = new UserOrmEntity();
    row.id = props.id;
    row.name = props.name;
    row.email = props.email;
    row.passwordHash = props.passwordHash;
    row.avatarUrl = props.avatarUrl;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    return row;
  }
}
