import {
  CreatePersonalAccessToken,
  ListPersonalAccessTokens,
  RevokePersonalAccessToken,
  UpdatePersonalAccessToken,
} from '@my-little-pony/core';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { CreatePatDto, UpdatePatDto } from './pat.dto';
import {
  CreatedPersonalAccessTokenResponse,
  PersonalAccessTokenResponse,
  toPatResponse,
} from './pat.response';

const IdParam = new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() });

@ApiTags('personal-access-tokens')
@ApiBearerAuth()
@Controller('users/me/tokens')
@UseGuards(AccessTokenGuard)
export class PersonalAccessTokensController {
  constructor(
    private readonly createToken: CreatePersonalAccessToken,
    private readonly listTokens: ListPersonalAccessTokens,
    private readonly updateToken: UpdatePersonalAccessToken,
    private readonly revokeToken: RevokePersonalAccessToken,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os tokens de acesso ativos do usuário' })
  @ApiOkResponse({ type: [PersonalAccessTokenResponse] })
  async list(@CurrentUser() user: AuthUser) {
    const tokens = await this.listTokens.execute({ ownerId: user.id });
    return tokens.map(toPatResponse);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um token (o valor é retornado uma única vez)' })
  @ApiCreatedResponse({ type: CreatedPersonalAccessTokenResponse })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatDto) {
    const { token, record } = await this.createToken.execute({
      ownerId: user.id,
      name: dto.name,
      scopes: dto.scopes,
      expiresInDays: dto.expiresInDays ?? null,
    });
    return { ...toPatResponse(record), token };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita nome e/ou escopos (não altera o valor do token)' })
  @ApiOkResponse({ type: PersonalAccessTokenResponse })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', IdParam) id: string,
    @Body() dto: UpdatePatDto,
  ) {
    const token = await this.updateToken.execute({
      ownerId: user.id,
      id,
      name: dto.name,
      scopes: dto.scopes,
    });
    return toPatResponse(token);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoga um token' })
  @ApiNoContentResponse()
  async revoke(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    await this.revokeToken.execute({ ownerId: user.id, id });
  }
}
