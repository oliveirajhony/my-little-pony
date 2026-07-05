import { ChangePassword, GetProfile, UpdateProfile } from '@my-little-pony/core';
import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { toUserView } from './user-view';
import type { ChangePasswordDto, UpdateProfileDto } from './users.dto';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly getProfile: GetProfile,
    private readonly updateProfile: UpdateProfile,
    private readonly changePassword: ChangePassword,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return toUserView(await this.getProfile.execute(user.id));
  }

  @Patch('me')
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return toUserView(await this.updateProfile.execute(user.id, dto));
  }

  @Patch('me/password')
  @HttpCode(204)
  async updatePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.changePassword.execute(user.id, { current: dto.current, next: dto.next });
  }
}
