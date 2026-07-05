import { DomainError } from '../domain/errors.js';
import { User } from '../domain/user.js';
import {
  AuthenticateUser,
  Logout,
  RefreshSession,
  RegisterUser,
  SessionIssuer,
} from './auth-use-cases.js';
import type {
  Clock,
  IdGenerator,
  PasswordHasher,
  RefreshTokenStore,
  TokenService,
  UserRepository,
} from './ports.js';

class FakeUserRepository implements UserRepository {
  private byId = new Map<string, User>();
  async findByEmail(email: string) {
    for (const user of this.byId.values()) {
      if (user.email === User.normalizeEmail(email)) return user;
    }
    return null;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async save(user: User) {
    this.byId.set(user.id, user);
  }
}

// Reversible "hash" for tests: prefix the plaintext. verify() checks the prefix.
const fakeHasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (hash, plain) => hash === `hashed:${plain}`,
};

class FakeStore implements RefreshTokenStore {
  tokens = new Map<string, string>();
  async issue({ userId, token }: { userId: string; token: string; ttlSeconds: number }) {
    this.tokens.set(token, userId);
  }
  async resolve(token: string) {
    return this.tokens.get(token) ?? null;
  }
  async revoke(token: string) {
    this.tokens.delete(token);
  }
  async revokeAllForUser(userId: string) {
    for (const [token, uid] of this.tokens) if (uid === userId) this.tokens.delete(token);
  }
}

let refreshCounter = 0;
const fakeTokens: TokenService = {
  signAccessToken: async (userId) => `access:${userId}`,
  generateRefreshToken: () => `refresh:${++refreshCounter}`,
};

const ids: IdGenerator = { next: () => 'u1' };
const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };

function wire() {
  const users = new FakeUserRepository();
  const store = new FakeStore();
  const session = new SessionIssuer(fakeTokens, store, 604800);
  return {
    users,
    store,
    session,
    register: new RegisterUser(users, fakeHasher, ids, clock, session),
    login: new AuthenticateUser(users, fakeHasher, session),
    refresh: new RefreshSession(session),
    logout: new Logout(session),
  };
}

describe('auth use cases', () => {
  it('registers a user and issues a session', async () => {
    const { register, users } = wire();
    const result = await register.execute({
      name: 'Jhony',
      email: 'Jhony@MLP.app',
      password: 'longenough1',
    });
    expect(result.user.email).toBe('jhony@mlp.app');
    expect(result.accessToken).toBe('access:u1');
    expect(result.refreshToken).toMatch(/^refresh:/);
    expect(await users.findByEmail('jhony@mlp.app')).not.toBeNull();
  });

  it('rejects a weak password', async () => {
    const { register } = wire();
    await expect(
      register.execute({ name: 'J', email: 'a@b.co', password: 'short' }),
    ).rejects.toThrow(DomainError);
  });

  it('rejects a duplicate email', async () => {
    const { register } = wire();
    await register.execute({ name: 'J', email: 'a@b.co', password: 'longenough1' });
    await expect(
      register.execute({ name: 'K', email: 'a@b.co', password: 'longenough1' }),
    ).rejects.toThrow(/email-taken/);
  });

  it('logs in with correct credentials', async () => {
    const { register, login } = wire();
    await register.execute({ name: 'J', email: 'a@b.co', password: 'longenough1' });
    const result = await login.execute({ email: 'a@b.co', password: 'longenough1' });
    expect(result.accessToken).toBe('access:u1');
  });

  it('rejects wrong credentials with a generic error', async () => {
    const { register, login } = wire();
    await register.execute({ name: 'J', email: 'a@b.co', password: 'longenough1' });
    await expect(login.execute({ email: 'a@b.co', password: 'nope' })).rejects.toThrow(
      /bad-credentials/,
    );
    await expect(login.execute({ email: 'ghost@b.co', password: 'x' })).rejects.toThrow(
      /bad-credentials/,
    );
  });

  it('rotates the refresh token, invalidating the old one', async () => {
    const { register, refresh, store } = wire();
    const { refreshToken } = await register.execute({
      name: 'J',
      email: 'a@b.co',
      password: 'longenough1',
    });
    const rotated = await refresh.execute(refreshToken);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    expect(await store.resolve(refreshToken)).toBeNull();
    expect(await store.resolve(rotated.refreshToken)).toBe('u1');
  });

  it('rejects refresh with an unknown token', async () => {
    const { refresh } = wire();
    await expect(refresh.execute('bogus')).rejects.toThrow(/stale-token/);
  });

  it('logout revokes the refresh token', async () => {
    const { register, logout, store } = wire();
    const { refreshToken } = await register.execute({
      name: 'J',
      email: 'a@b.co',
      password: 'longenough1',
    });
    await logout.execute(refreshToken);
    expect(await store.resolve(refreshToken)).toBeNull();
  });
});
