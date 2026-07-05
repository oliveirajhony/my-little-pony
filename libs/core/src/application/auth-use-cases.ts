import { DomainError } from '../domain/errors.js';
import { User } from '../domain/user.js';
import type {
  Clock,
  IdGenerator,
  PasswordHasher,
  RefreshTokenStore,
  TokenService,
  UserRepository,
} from './ports.js';

export type AuthTokens = { accessToken: string; refreshToken: string };
export type AuthResult = AuthTokens & { user: User };

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Issues and rotates sessions: a short-lived access token plus an opaque
 * refresh token persisted server-side with a TTL. Shared by register and login.
 */
export class SessionIssuer {
  constructor(
    private readonly tokens: TokenService,
    private readonly store: RefreshTokenStore,
    private readonly refreshTtlSeconds: number,
  ) {}

  async issue(userId: string): Promise<AuthTokens> {
    const accessToken = await this.tokens.signAccessToken(userId);
    const refreshToken = this.tokens.generateRefreshToken();
    await this.store.issue({ userId, token: refreshToken, ttlSeconds: this.refreshTtlSeconds });
    return { accessToken, refreshToken };
  }

  async rotate(oldToken: string): Promise<AuthTokens> {
    const userId = await this.store.resolve(oldToken);
    if (!userId) throw new DomainError('stale-token');
    await this.store.revoke(oldToken);
    return this.issue(userId);
  }

  revoke(token: string): Promise<void> {
    return this.store.revoke(token);
  }
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly session: SessionIssuer,
  ) {}

  async execute(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const email = User.assertValidEmail(input.email);
    const name = User.assertValidName(input.name);
    if (input.password.length < MIN_PASSWORD_LENGTH) throw new DomainError('weak-password');
    if (await this.users.findByEmail(email)) throw new DomainError('email-taken');

    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create({
      id: this.ids.next(),
      name,
      email,
      passwordHash,
      now: this.clock.now(),
    });
    await this.users.save(user);

    const tokens = await this.session.issue(user.id);
    return { user, ...tokens };
  }
}

export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly session: SessionIssuer,
  ) {}

  async execute(input: { email: string; password: string }): Promise<AuthResult> {
    const email = User.normalizeEmail(input.email);
    const user = await this.users.findByEmail(email);
    // Verify against a found user, or a throwaway to keep timing uniform; either
    // way a mismatch is the same generic error (never reveal which failed).
    const ok = user ? await this.hasher.verify(user.passwordHash, input.password) : false;
    if (!user || !ok) throw new DomainError('bad-credentials');

    const tokens = await this.session.issue(user.id);
    return { user, ...tokens };
  }
}

export class RefreshSession {
  constructor(private readonly session: SessionIssuer) {}

  execute(refreshToken: string): Promise<AuthTokens> {
    return this.session.rotate(refreshToken);
  }
}

export class Logout {
  constructor(private readonly session: SessionIssuer) {}

  execute(refreshToken: string): Promise<void> {
    return this.session.revoke(refreshToken);
  }
}
