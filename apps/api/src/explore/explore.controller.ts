import { AnswerQuestion, type ExploreAnswer } from '@my-little-pony/core';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';

export class ExploreRequest {
  @ApiProperty({ description: 'Pergunta em linguagem natural' })
  q!: string;
}

export class ExploreSourceResponse {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  snippet!: string;

  @ApiProperty({ enum: ['native', 'file'] })
  kind!: 'native' | 'file';

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  slug!: string | null;
}

export class ExploreResponse {
  @ApiProperty({ description: 'Resposta gerada por IA, ancorada nas fontes' })
  answer!: string;

  @ApiProperty({ description: 'Se a resposta foi fundamentada em trechos relevantes' })
  grounded!: boolean;

  @ApiProperty({ type: [ExploreSourceResponse] })
  sources!: ExploreSourceResponse[];
}

@ApiTags('explore')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@ApiBearerAuth()
@Controller('explore')
@UseGuards(AccessTokenGuard)
export class ExploreController {
  constructor(private readonly answerQuestion: AnswerQuestion) {}

  @Post()
  @ApiOperation({ summary: 'RAG generativo sobre documentos e arquivos do usuário' })
  @ApiOkResponse({ type: ExploreResponse })
  ask(@CurrentUser() user: AuthUser, @Body() body: ExploreRequest): Promise<ExploreAnswer> {
    return this.answerQuestion.execute({ ownerId: user.id, q: body.q ?? '' });
  }
}
