import {
  ActivateLlmProvider,
  AddLlmProvider,
  ListLlmProviders,
  RemoveLlmProvider,
} from '@my-little-pony/core';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { CreateLlmProviderDto } from './llm-provider.dto';
import { LlmProviderResponse, toLlmProviderResponse } from './llm-provider.response';

/**
 * Provedores de LLM configurados pelo usuário. A chave de API é cifrada no
 * `AddLlmProvider` (use-case) e NUNCA é devolvida — só o `apiKeyHint`.
 */
@ApiTags('llm-providers')
@ApiBearerAuth()
@Controller('users/me/llm-providers')
@UseGuards(AccessTokenGuard)
export class LlmProvidersController {
  constructor(
    private readonly list: ListLlmProviders,
    private readonly add: AddLlmProvider,
    private readonly activate: ActivateLlmProvider,
    private readonly remove: RemoveLlmProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os provedores de LLM do usuário (sem as chaves)' })
  @ApiOkResponse({ type: [LlmProviderResponse] })
  async listProviders(@CurrentUser() user: AuthUser): Promise<LlmProviderResponse[]> {
    const views = await this.list.execute({ ownerId: user.id });
    return views.map(toLlmProviderResponse);
  }

  @Post()
  @ApiOperation({ summary: 'Adiciona um provedor (a chave é cifrada e não reexibida)' })
  @ApiOkResponse({ type: LlmProviderResponse })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateLlmProviderDto,
  ): Promise<LlmProviderResponse> {
    const view = await this.add.execute({
      ownerId: user.id,
      label: body.label,
      backend: body.backend,
      baseUrl: body.baseUrl ?? '',
      model: body.model,
      apiKey: body.apiKey,
    });
    return toLlmProviderResponse(view);
  }

  @Post(':id/activate')
  @HttpCode(204)
  @ApiOperation({ summary: 'Ativa um provedor (desativa os outros do usuário)' })
  async activateProvider(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.activate.execute({ ownerId: user.id, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove um provedor' })
  async removeProvider(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.remove.execute({ ownerId: user.id, id });
  }
}
