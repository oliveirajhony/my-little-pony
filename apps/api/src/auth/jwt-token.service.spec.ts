import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const secret = 'x'.repeat(32);
  const jwt = new JwtService({ secret });
  const service = new JwtTokenService(jwt, '15m');

  it('signs an access token carrying the user id as sub', async () => {
    const token = await service.signAccessToken('u1');
    const payload = jwt.verify<{ sub: string }>(token, { secret });
    expect(payload.sub).toBe('u1');
  });

  it('generates unique, opaque, hex refresh tokens', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
