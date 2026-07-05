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
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { toUserView } from '../users/user-view';
import { LoginDto, RegisterDto } from './auth.dto';
import { AccessTokenResponse, AuthResponse } from './auth.response';
import { durationToSeconds } from './duration';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  @ApiOperation({ summary: 'Cria conta e inicia sessão' })
  @ApiCreatedResponse({ type: AuthResponse })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.registerUser.execute(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: toUserView(result.user), accessToken: result.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica e inicia sessão' })
  @ApiOkResponse({ type: AuthResponse })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authenticate.execute(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: toUserView(result.user), accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renova o access token via cookie de refresh' })
  @ApiOkResponse({ type: AccessTokenResponse })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Sessão não encontrada. Entre novamente.');
    const tokens = await this.refreshSession.execute(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Encerra a sessão e revoga o refresh' })
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
