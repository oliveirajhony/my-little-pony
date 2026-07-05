import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('produces a hash different from the plaintext', async () => {
    const hash = await hasher.hash('super-secret-123');
    expect(hash).not.toBe('super-secret-123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('verifies the correct password', async () => {
    const hash = await hasher.hash('super-secret-123');
    expect(await hasher.verify(hash, 'super-secret-123')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('super-secret-123');
    expect(await hasher.verify(hash, 'wrong')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await hasher.verify('not-a-hash', 'whatever')).toBe(false);
  });
});
