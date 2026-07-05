import { randomBytes } from 'node:crypto';
import type { TokenService } from '@my-little-pony/core';
import type { JwtService, JwtSignOptions } from '@nestjs/jwt';

/** TokenService adapter: JWT access tokens + opaque random refresh tokens. */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly accessTtl: string,
  ) {}

  signAccessToken(userId: string): Promise<string> {
    // `expiresIn` is typed as a strict ms-style template literal; the TTL comes
    // from validated config as a plain string, so narrow it at the boundary.
    const expiresIn = this.accessTtl as JwtSignOptions['expiresIn'];
    return this.jwt.signAsync({ sub: userId }, { expiresIn });
  }

  generateRefreshToken(): string {
    // Opaque, high-entropy token — the server is the source of truth (Redis),
    // so it carries no claims.
    return randomBytes(32).toString('hex');
  }
}
