import { AuthenticateUser, Logout, RefreshSession, RegisterUser } from '@my-little-pony/core';
import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { toUserView } from '../users/user-view';
import type { LoginDto, RegisterDto } from './auth.dto';
import { durationToSeconds } from './duration';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly authenticate: AuthenticateUser,
    private readonly refreshSession: RefreshSession,
    private readonly logout: Logout,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.registerUser.execute(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: toUserView(result.user), accessToken: result.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authenticate.execute(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: toUserView(result.user), accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Sessão não encontrada. Entre novamente.');
    const tokens = await this.refreshSession.execute(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  async logoutHandler(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.logout.execute(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/auth',
      maxAge: durationToSeconds(this.config.jwtRefreshTtl) * 1000,
    });
  }
}
