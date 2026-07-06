import { AuthenticatePersonalAccessToken, DomainError, type PatScope } from '@my-little-pony/core';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export type PatPrincipal = { ownerId: string; scopes: PatScope[] };

export type PatRequest = Request & { pat?: PatPrincipal };

/**
 * Authenticates a Personal Access Token from the Authorization header and
 * attaches `req.pat = { ownerId, scopes }`. Missing/invalid tokens raise
 * 'invalid-token' (mapped to 401 by the domain exception filter).
 */
@Injectable()
export class PatGuard implements CanActivate {
  constructor(private readonly authenticate: AuthenticatePersonalAccessToken) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PatRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new DomainError('invalid-token');
    const token = await this.authenticate.execute({ raw: header.slice(7).trim() });
    request.pat = { ownerId: token.ownerId, scopes: token.scopes };
    return true;
  }
}
