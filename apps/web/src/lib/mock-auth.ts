import { isValidEmail } from './validation';

export const DEMO_USER = { email: 'demo@mlp.app', password: '123456' } as const;

export type AuthError = 'invalid-email' | 'empty-password' | 'bad-credentials';

export type AuthResult = { ok: true } | { ok: false; reason: AuthError };

export const AUTH_MESSAGES: Record<AuthError, string> = {
  'invalid-email': 'Confira o e-mail digitado.',
  'empty-password': 'Digite sua senha.',
  'bad-credentials': 'E-mail ou senha incorretos.',
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mocked authentication. Validates format first, then simulates a network
 * round-trip before comparing against the demo user. `delayMs` is 0 in tests.
 */
export async function authenticate(
  email: string,
  password: string,
  delayMs = 900,
): Promise<AuthResult> {
  if (!isValidEmail(email)) return { ok: false, reason: 'invalid-email' };
  if (password.length === 0) return { ok: false, reason: 'empty-password' };

  await wait(delayMs);

  const ok = email.trim() === DEMO_USER.email && password === DEMO_USER.password;
  return ok ? { ok: true } : { ok: false, reason: 'bad-credentials' };
}
