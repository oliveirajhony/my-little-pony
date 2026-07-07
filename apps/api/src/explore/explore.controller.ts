import { AnswerQuestion, type ExploreAnswer } from '@my-little-pony/core';
import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
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

  /**
   * Streaming (SSE) do Explorar. `ownerId` vem SEMPRE do JWT (nunca do corpo).
   * Throttle próprio (mais restrito — a conexão fica aberta). Aborta a geração
   * upstream quando o cliente desconecta (`res` fecha).
   */
  @Post('stream')
  // Limite menor que o /explore: cada stream segura uma conexão por bem mais tempo.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'RAG generativo em streaming (Server-Sent Events)' })
  async stream(
    @CurrentUser() user: AuthUser,
    @Body() body: ExploreRequest,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // desliga o buffering do nginx
    res.flushHeaders?.();

    const abort = new AbortController();
    res.on('close', () => abort.abort()); // cliente saiu → corta a geração upstream

    try {
      for await (const event of this.answerQuestion.stream({
        ownerId: user.id, // SEMPRE do JWT
        q: body.q ?? '',
        signal: abort.signal,
      })) {
        if (abort.signal.aborted) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      if (!abort.signal.aborted) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: SAFE_STREAM_ERROR })}\n\n`);
      }
    } finally {
      res.end();
    }
  }
}

const SAFE_STREAM_ERROR = 'Não consegui responder agora. Tente novamente em instantes.';
