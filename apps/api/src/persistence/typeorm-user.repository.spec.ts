import { DomainError, User } from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import type { UserOrmEntity } from './user.orm-entity';

function uniqueViolation(constraint: string) {
  return {
    name: 'QueryFailedError',
    driverError: { code: '23505', constraint },
  };
}

function aUser(): User {
  return User.create({
    id: 'user-1',
    name: 'Alguém',
    email: 'alguem@example.com',
    passwordHash: 'hash',
    now: new Date(),
  });
}

describe('TypeOrmUserRepository.save', () => {
  it('maps a unique-violation on the email index to email-taken', async () => {
    const fakeRepo = {
      save: vi.fn().mockRejectedValue(uniqueViolation('users_email_unique')),
    } as unknown as Repository<UserOrmEntity>;
    const repository = new TypeOrmUserRepository(fakeRepo);

    const error = await repository.save(aUser()).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('email-taken');
  });

  it('rethrows unrelated errors untouched', async () => {
    const otherError = new Error('connection reset');
    const fakeRepo = {
      save: vi.fn().mockRejectedValue(otherError),
    } as unknown as Repository<UserOrmEntity>;
    const repository = new TypeOrmUserRepository(fakeRepo);

    await expect(repository.save(aUser())).rejects.toBe(otherError);
  });
});
