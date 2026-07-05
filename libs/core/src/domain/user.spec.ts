import { DomainError } from './errors.js';
import { User } from './user.js';

const now = new Date('2026-07-05T00:00:00.000Z');

function make(overrides: Partial<Parameters<typeof User.create>[0]> = {}) {
  return User.create({
    id: 'u1',
    name: 'Jhony Oliveira',
    email: 'Jhony@MLP.app',
    passwordHash: 'hashed',
    now,
    ...overrides,
  });
}

describe('User', () => {
  it('normalizes the email on creation (trim + lowercase)', () => {
    expect(make({ email: '  Jhony@MLP.app ' }).email).toBe('jhony@mlp.app');
  });

  it('rejects an invalid email', () => {
    expect(() => make({ email: 'not-an-email' })).toThrow(DomainError);
  });

  it('rejects an empty name', () => {
    expect(() => make({ name: '   ' })).toThrow(DomainError);
  });

  it('defaults avatarUrl to null', () => {
    expect(make().avatarUrl).toBeNull();
  });

  it('bumps updatedAt when the password hash changes', () => {
    const user = make();
    const later = new Date('2026-07-06T00:00:00.000Z');
    user.setPasswordHash('new-hash', later);
    expect(user.passwordHash).toBe('new-hash');
    expect(user.updatedAt).toEqual(later);
  });

  it('round-trips through props', () => {
    const props = make().toProps();
    expect(User.fromProps(props).email).toBe('jhony@mlp.app');
  });
});
