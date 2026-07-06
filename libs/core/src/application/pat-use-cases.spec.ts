import { DomainError } from '../domain/errors.js';
import type { PersonalAccessToken } from '../domain/personal-access-token.js';
import {
  AuthenticatePersonalAccessToken,
  CreatePersonalAccessToken,
  ListPersonalAccessTokens,
  PurgeExpiredTokens,
  RevokePersonalAccessToken,
  UpdatePersonalAccessToken,
} from './pat-use-cases.js';
import type {
  AccessTokenGenerator,
  Clock,
  IdGenerator,
  PersonalAccessTokenRepository,
} from './ports.js';

let clockTime = new Date('2026-07-05T00:00:00.000Z');
const clock: Clock = { now: () => clockTime };

let seq = 0;
const ids: IdGenerator = { next: () => `t${++seq}` };

// Deterministic generator: raw "raw-N", hash "hash-of-raw-N".
let genSeq = 0;
const generator: AccessTokenGenerator = {
  generate: () => {
    genSeq += 1;
    return { raw: `raw-${genSeq}`, prefix: `mlp_pat_p${genSeq}`, hash: `hash:raw-${genSeq}` };
  },
  hash: (raw) => `hash:${raw}`,
};

class FakePatRepo implements PersonalAccessTokenRepository {
  byId = new Map<string, PersonalAccessToken>();
  async save(token: PersonalAccessToken) {
    this.byId.set(token.id, token);
  }
  async findByHash(tokenHash: string) {
    for (const t of this.byId.values()) if (t.toProps().tokenHash === tokenHash) return t;
    return null;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listActiveByOwner(ownerId: string) {
    return [...this.byId.values()].filter((t) => t.isOwnedBy(ownerId) && !t.revokedAt);
  }
  async deleteExpired(now: Date) {
    let removed = 0;
    for (const [id, t] of this.byId) {
      const exp = t.expiresAt;
      if (exp && exp.getTime() <= now.getTime()) {
        this.byId.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}

beforeEach(() => {
  seq = 0;
  genSeq = 0;
  clockTime = new Date('2026-07-05T00:00:00.000Z');
});

describe('CreatePersonalAccessToken', () => {
  it('creates a token, returns the raw value once and stores only the hash', async () => {
    const repo = new FakePatRepo();
    const uc = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { token, record } = await uc.execute({
      ownerId: 'u1',
      name: 'Claude Code',
      scopes: ['documents:read', 'documents:write'],
    });
    expect(token).toBe('raw-1');
    expect(record.prefix).toBe('mlp_pat_p1');
    expect(record.toProps().tokenHash).toBe('hash:raw-1');
    expect(record.expiresAt).toBeNull();
    expect(repo.byId.size).toBe(1);
  });

  it('sets an expiry when expiresInDays is given', async () => {
    const repo = new FakePatRepo();
    const uc = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { record } = await uc.execute({
      ownerId: 'u1',
      name: 'Temp',
      scopes: ['documents:read'],
      expiresInDays: 7,
    });
    expect(record.expiresAt).toEqual(new Date('2026-07-12T00:00:00.000Z'));
  });

  it('rejects an empty scope list', async () => {
    const repo = new FakePatRepo();
    const uc = new CreatePersonalAccessToken(repo, generator, ids, clock);
    await expect(uc.execute({ ownerId: 'u1', name: 'X', scopes: [] })).rejects.toThrow(DomainError);
  });
});

describe('AuthenticatePersonalAccessToken', () => {
  async function seed(
    repo: FakePatRepo,
    scopes: Parameters<typeof PersonalAccessToken.create>[0]['scopes'] = ['documents:read'],
  ) {
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    return create.execute({ ownerId: 'u1', name: 'K', scopes });
  }

  it('resolves a valid raw token and bumps lastUsedAt', async () => {
    const repo = new FakePatRepo();
    const { token } = await seed(repo);
    clockTime = new Date('2026-07-06T00:00:00.000Z');
    const auth = new AuthenticatePersonalAccessToken(repo, generator, clock);
    const resolved = await auth.execute({ raw: token });
    expect(resolved.ownerId).toBe('u1');
    expect(resolved.lastUsedAt).toEqual(clockTime);
  });

  it('rejects an unknown token', async () => {
    const repo = new FakePatRepo();
    const auth = new AuthenticatePersonalAccessToken(repo, generator, clock);
    await expect(auth.execute({ raw: 'nope' })).rejects.toThrow(DomainError);
  });

  it('rejects a revoked token', async () => {
    const repo = new FakePatRepo();
    const { token, record } = await seed(repo);
    const revoke = new RevokePersonalAccessToken(repo, clock);
    await revoke.execute({ ownerId: 'u1', id: record.id });
    const auth = new AuthenticatePersonalAccessToken(repo, generator, clock);
    await expect(auth.execute({ raw: token })).rejects.toThrow(DomainError);
  });

  it('rejects an expired token', async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { token } = await create.execute({
      ownerId: 'u1',
      name: 'K',
      scopes: ['documents:read'],
      expiresInDays: 1,
    });
    clockTime = new Date('2026-07-07T00:00:00.000Z');
    const auth = new AuthenticatePersonalAccessToken(repo, generator, clock);
    await expect(auth.execute({ raw: token })).rejects.toThrow(DomainError);
  });
});

describe('RevokePersonalAccessToken', () => {
  it("refuses to revoke another user's token", async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { record } = await create.execute({
      ownerId: 'u1',
      name: 'K',
      scopes: ['documents:read'],
    });
    const revoke = new RevokePersonalAccessToken(repo, clock);
    await expect(revoke.execute({ ownerId: 'u2', id: record.id })).rejects.toThrow(DomainError);
  });
});

describe('UpdatePersonalAccessToken', () => {
  it('edits name and scopes without changing the token hash', async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { record } = await create.execute({
      ownerId: 'u1',
      name: 'Old',
      scopes: ['documents:read'],
    });
    const hashBefore = record.toProps().tokenHash;
    const update = new UpdatePersonalAccessToken(repo);
    const edited = await update.execute({
      ownerId: 'u1',
      id: record.id,
      name: 'New',
      scopes: ['documents:read', 'documents:write'],
    });
    expect(edited.name).toBe('New');
    expect(edited.scopes).toEqual(['documents:read', 'documents:write']);
    expect(edited.toProps().tokenHash).toBe(hashBefore);
  });

  it('rejects an empty scope set', async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { record } = await create.execute({
      ownerId: 'u1',
      name: 'K',
      scopes: ['documents:read'],
    });
    const update = new UpdatePersonalAccessToken(repo);
    await expect(update.execute({ ownerId: 'u1', id: record.id, scopes: [] })).rejects.toThrow(
      DomainError,
    );
  });

  it("refuses to edit another user's token", async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    const { record } = await create.execute({
      ownerId: 'u1',
      name: 'K',
      scopes: ['documents:read'],
    });
    const update = new UpdatePersonalAccessToken(repo);
    await expect(update.execute({ ownerId: 'u2', id: record.id, name: 'x' })).rejects.toThrow(
      DomainError,
    );
  });
});

describe('PurgeExpiredTokens', () => {
  it('deletes only expired tokens and keeps active/never-expiring ones', async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    await create.execute({ ownerId: 'u1', name: 'never', scopes: ['documents:read'] });
    await create.execute({
      ownerId: 'u1',
      name: 'short',
      scopes: ['documents:read'],
      expiresInDays: 1,
    });
    await create.execute({
      ownerId: 'u1',
      name: 'long',
      scopes: ['documents:read'],
      expiresInDays: 30,
    });
    clockTime = new Date('2026-07-07T00:00:00.000Z'); // 2 days later
    const purge = new PurgeExpiredTokens(repo, clock);
    const removed = await purge.execute();
    expect(removed).toBe(1);
    const remaining = await repo.listActiveByOwner('u1');
    expect(remaining.map((t) => t.name).sort()).toEqual(['long', 'never']);
  });
});

describe('ListPersonalAccessTokens', () => {
  it('lists only the owner active tokens', async () => {
    const repo = new FakePatRepo();
    const create = new CreatePersonalAccessToken(repo, generator, ids, clock);
    await create.execute({ ownerId: 'u1', name: 'A', scopes: ['documents:read'] });
    const { record } = await create.execute({
      ownerId: 'u1',
      name: 'B',
      scopes: ['documents:read'],
    });
    await create.execute({ ownerId: 'u2', name: 'C', scopes: ['documents:read'] });
    const revoke = new RevokePersonalAccessToken(repo, clock);
    await revoke.execute({ ownerId: 'u1', id: record.id });
    const list = new ListPersonalAccessTokens(repo);
    const result = await list.execute({ ownerId: 'u1' });
    expect(result.map((t) => t.name)).toEqual(['A']);
  });
});
