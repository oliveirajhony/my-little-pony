import { DomainError } from '../domain/errors.js';
import { User } from '../domain/user.js';
import { MIN_PASSWORD_LENGTH } from './auth-use-cases.js';
import type { Clock, PasswordHasher, RefreshTokenStore, UserRepository } from './ports.js';

export class GetProfile {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('user-not-found');
    return user;
  }
}

export class UpdateProfile {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    userId: string,
    input: { name?: string; email?: string; avatarUrl?: string | null },
  ): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('user-not-found');

    if (input.email !== undefined) {
      const email = User.assertValidEmail(input.email);
      if (email !== user.email) {
        const existing = await this.users.findByEmail(email);
        if (existing && existing.id !== userId) throw new DomainError('email-taken');
        user.changeEmail(email, this.clock.now());
      }
    }
    if (input.name !== undefined) user.rename(input.name, this.clock.now());
    if (input.avatarUrl !== undefined) user.setAvatar(input.avatarUrl, this.clock.now());

    await this.users.save(user);
    return user;
  }
}

export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly store: RefreshTokenStore,
  ) {}

  async execute(userId: string, input: { current: string; next: string }): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('user-not-found');
    if (!(await this.hasher.verify(user.passwordHash, input.current))) {
      throw new DomainError('bad-credentials');
    }
    if (input.next.length < MIN_PASSWORD_LENGTH) throw new DomainError('weak-password');

    user.setPasswordHash(await this.hasher.hash(input.next), this.clock.now());
    await this.users.save(user);
    // Changing the password invalidates every existing session.
    await this.store.revokeAllForUser(userId);
  }
}
