import { DomainError } from './errors.js';
import { PersonalAccessToken } from './personal-access-token.js';

const now = new Date('2026-07-05T00:00:00.000Z');

function make(overrides: Partial<Parameters<typeof PersonalAccessToken.create>[0]> = {}) {
  return PersonalAccessToken.create({
    id: 't1',
    ownerId: 'u1',
    name: 'Claude Code',
    prefix: 'mlp_pat_ab12',
    tokenHash: 'hash',
    scopes: ['documents:read'],
    expiresAt: null,
    now,
    ...overrides,
  });
}

describe('PersonalAccessToken.create', () => {
  it('trims the name and stores the scopes', () => {
    const token = make({ name: '  Meu token  ', scopes: ['documents:read', 'documents:write'] });
    expect(token.name).toBe('Meu token');
    expect(token.scopes).toEqual(['documents:read', 'documents:write']);
    expect(token.lastUsedAt).toBeNull();
    expect(token.revokedAt).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(() => make({ name: '   ' })).toThrow(DomainError);
  });

  it('rejects an empty scope list', () => {
    expect(() => make({ scopes: [] })).toThrow(DomainError);
  });

  it('rejects an unknown scope', () => {
    expect(() => make({ scopes: ['documents:read', 'bogus' as never] })).toThrow(DomainError);
  });
});

describe('validity (isActive)', () => {
  it('is active when neither revoked nor expired', () => {
    expect(make().isActive(now)).toBe(true);
  });

  it('is inactive once revoked', () => {
    const token = make();
    token.revoke(now);
    expect(token.isActive(now)).toBe(false);
  });

  it('is inactive at or after the expiry instant', () => {
    const token = make({ expiresAt: new Date('2026-07-06T00:00:00.000Z') });
    expect(token.isActive(new Date('2026-07-05T23:59:59.000Z'))).toBe(true);
    expect(token.isActive(new Date('2026-07-06T00:00:00.000Z'))).toBe(false);
    expect(token.isActive(new Date('2026-07-07T00:00:00.000Z'))).toBe(false);
  });

  it('never expires when expiresAt is null', () => {
    expect(make({ expiresAt: null }).isActive(new Date('2099-01-01T00:00:00.000Z'))).toBe(true);
  });
});

describe('permissions (scopes)', () => {
  it('reports whether it holds a scope', () => {
    const token = make({ scopes: ['documents:read', 'messages:read'] });
    expect(token.hasScope('documents:read')).toBe(true);
    expect(token.hasScope('documents:write')).toBe(false);
  });

  it('replaces scopes via setScopes (validated)', () => {
    const token = make();
    token.setScopes(['documents:write', 'documents:publish']);
    expect(token.scopes).toEqual(['documents:write', 'documents:publish']);
  });

  it('rejects setting an empty scope list', () => {
    expect(() => make().setScopes([])).toThrow(DomainError);
  });

  it('rejects setting an unknown scope', () => {
    expect(() => make().setScopes(['nope' as never])).toThrow(DomainError);
  });

  it('exposes scopes as a copy (no external mutation)', () => {
    const token = make();
    token.scopes.push('profile:write');
    expect(token.scopes).toEqual(['documents:read']);
  });
});

describe('security / lifecycle', () => {
  it('renames without touching other fields; empty name rejected', () => {
    const token = make();
    token.rename('Novo nome');
    expect(token.name).toBe('Novo nome');
    expect(() => token.rename('  ')).toThrow(DomainError);
  });

  it('revoke is idempotent (keeps the first revocation time)', () => {
    const token = make();
    token.revoke(now);
    const later = new Date('2026-07-10T00:00:00.000Z');
    token.revoke(later);
    expect(token.revokedAt).toEqual(now);
  });

  it('records last usage via touch', () => {
    const token = make();
    const used = new Date('2026-07-06T12:00:00.000Z');
    token.touch(used);
    expect(token.lastUsedAt).toEqual(used);
  });

  it('checks ownership', () => {
    const token = make({ ownerId: 'u1' });
    expect(token.isOwnedBy('u1')).toBe(true);
    expect(token.isOwnedBy('u2')).toBe(false);
  });
});
