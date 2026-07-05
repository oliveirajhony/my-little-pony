import { DomainError } from '../domain/errors.js';
import { User } from '../domain/user.js';
import type { Clock, PasswordHasher, RefreshTokenStore, UserRepository } from './ports.js';
import { ChangePassword, GetProfile, UpdateProfile } from './profile-use-cases.js';

const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };

class FakeUsers implements UserRepository {
  byId = new Map<string, User>();
  async findByEmail(email: string) {
    for (const u of this.byId.values()) if (u.email === User.normalizeEmail(email)) return u;
    return null;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async save(u: User) {
    this.byId.set(u.id, u);
  }
}

const hasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (hash, plain) => hash === `hashed:${plain}`,
};

function seedUser(users: FakeUsers, id = 'u1', email = 'a@b.co') {
  const user = User.create({
    id,
    name: 'J',
    email,
    passwordHash: 'hashed:current-pass',
    now: clock.now(),
  });
  users.byId.set(id, user);
  return user;
}

describe('profile use cases', () => {
  it('gets the profile by id', async () => {
    const users = new FakeUsers();
    seedUser(users);
    expect((await new GetProfile(users).execute('u1')).email).toBe('a@b.co');
  });

  it('throws when the user is missing', async () => {
    await expect(new GetProfile(new FakeUsers()).execute('ghost')).rejects.toThrow(
      /user-not-found/,
    );
  });

  it('updates name and email', async () => {
    const users = new FakeUsers();
    seedUser(users);
    const updated = await new UpdateProfile(users, clock).execute('u1', {
      name: 'Jhony',
      email: 'New@Mail.com',
    });
    expect(updated.name).toBe('Jhony');
    expect(updated.email).toBe('new@mail.com');
  });

  it('rejects changing to an email owned by someone else', async () => {
    const users = new FakeUsers();
    seedUser(users, 'u1', 'a@b.co');
    seedUser(users, 'u2', 'taken@b.co');
    await expect(
      new UpdateProfile(users, clock).execute('u1', { email: 'taken@b.co' }),
    ).rejects.toThrow(/email-taken/);
  });

  it('changes the password and revokes all sessions', async () => {
    const users = new FakeUsers();
    seedUser(users);
    const revoked: string[] = [];
    const store = {
      issue: async () => {},
      resolve: async () => null,
      revoke: async () => {},
      revokeAllForUser: async (id: string) => {
        revoked.push(id);
      },
    } satisfies RefreshTokenStore;

    await new ChangePassword(users, hasher, clock, store).execute('u1', {
      current: 'current-pass',
      next: 'brand-new-pass',
    });

    expect((await users.findById('u1'))?.passwordHash).toBe('hashed:brand-new-pass');
    expect(revoked).toEqual(['u1']);
  });

  it('rejects a wrong current password', async () => {
    const users = new FakeUsers();
    seedUser(users);
    const store = {
      issue: async () => {},
      resolve: async () => null,
      revoke: async () => {},
      revokeAllForUser: async () => {},
    } satisfies RefreshTokenStore;
    await expect(
      new ChangePassword(users, hasher, clock, store).execute('u1', {
        current: 'wrong',
        next: 'brand-new-pass',
      }),
    ).rejects.toThrow(DomainError);
  });
});
