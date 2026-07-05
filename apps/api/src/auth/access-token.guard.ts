import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthUser = { id: string };

type AuthedRequest = Request & { user?: AuthUser };

/** Validates the Bearer access token and attaches `req.user = { id }`. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Autenticação necessária.');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7));
      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }
}

/** Injects the authenticated user attached by AccessTokenGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user) throw new UnauthorizedException('Autenticação necessária.');
    return request.user;
  },
);
