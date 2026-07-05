import { ChangePassword, GetProfile, UpdateProfile } from '@my-little-pony/core';
import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { UserResponse } from './user.response';
import { toUserView } from './user-view';
import { ChangePasswordDto, UpdateProfileDto } from './users.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly getProfile: GetProfile,
    private readonly updateProfile: UpdateProfile,
    private readonly changePassword: ChangePassword,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @ApiOkResponse({ type: UserResponse })
  async me(@CurrentUser() user: AuthUser) {
    return toUserView(await this.getProfile.execute(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza nome, e-mail ou avatar' })
  @ApiOkResponse({ type: UserResponse })
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return toUserView(await this.updateProfile.execute(user.id, dto));
  }

  @Patch('me/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Troca a senha e revoga as sessões' })
  @ApiNoContentResponse()
  async updatePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.changePassword.execute(user.id, { current: dto.current, next: dto.next });
  }
}
