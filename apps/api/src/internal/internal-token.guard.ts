import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';

/** Constant-time string equality — avoids leaking the secret via timing. */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // timingSafeEqual throws on length mismatch; token length isn't secret, so
  // short-circuiting on it is fine.
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/** Service-to-service auth: the Python worker sends X-Internal-Token. */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-internal-token'];
    // Reject arrays (duplicate headers) and missing values before comparing.
    if (typeof token !== 'string' || !safeEqual(token, this.config.internalApiToken)) {
      throw new UnauthorizedException('Token de serviço inválido.');
    }
    return true;
  }
}
