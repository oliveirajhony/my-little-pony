import { SearchDocuments } from '@my-little-pony/core';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';

export class SearchResultResponse {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty({ description: 'Trecho relevante do conteúdo' })
  snippet!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;
}

@ApiTags('search')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@ApiBearerAuth()
@Controller('search')
@UseGuards(AccessTokenGuard)
export class SearchController {
  constructor(private readonly searchDocuments: SearchDocuments) {}

  @Get()
  @ApiOperation({ summary: 'Busca semântica no conteúdo (proxy ao serviço Python)' })
  @ApiOkResponse({ type: [SearchResultResponse] })
  search(@CurrentUser() user: AuthUser, @Query('q') q: string): Promise<SearchResultResponse[]> {
    return this.searchDocuments.execute({ ownerId: user.id, q: q ?? '' });
  }
}
