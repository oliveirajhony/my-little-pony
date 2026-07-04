import { describe, expect, it } from 'vitest';
import { authenticate, DEMO_USER } from './mock-auth';

describe('authenticate', () => {
  it('succeeds with the demo credentials', async () => {
    await expect(authenticate(DEMO_USER.email, DEMO_USER.password, 0)).resolves.toEqual({
      ok: true,
    });
  });

  it('trims the email before comparing', async () => {
    await expect(authenticate('  demo@mlp.app ', '123456', 0)).resolves.toEqual({ ok: true });
  });

  it('rejects a malformed email', async () => {
    await expect(authenticate('nope', '123456', 0)).resolves.toEqual({
      ok: false,
      reason: 'invalid-email',
    });
  });

  it('rejects an empty password', async () => {
    await expect(authenticate('demo@mlp.app', '', 0)).resolves.toEqual({
      ok: false,
      reason: 'empty-password',
    });
  });

  it('rejects wrong credentials', async () => {
    await expect(authenticate('demo@mlp.app', 'wrong', 0)).resolves.toEqual({
      ok: false,
      reason: 'bad-credentials',
    });
  });
});
