import { once } from 'node:events';
import { AnswerQuestion, type ExploreAnswer, ResolveActiveLlmConfig } from '@my-little-pony/core';
import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { AnswerExporter, type ExportFormat } from './answer-exporter';

const SAFE_STREAM_ERROR = 'Não consegui responder agora. Tente novamente em instantes.';
// Ping periódico durante silêncios (LLM em CPU) para proxies/LBs não derrubarem
// a conexão ociosa. Comentário SSE (`:`) — ignorado pelo cliente.
const HEARTBEAT_MS = 15_000;

export class ExploreRequest {
  @ApiProperty({ description: 'Pergunta em linguagem natural' })
  // Sem um decorator do class-validator, o ValidationPipe global (whitelist:true)
  // REMOVE este campo do body — a pergunta chegaria vazia ao use case.
  @IsString()
  q!: string;
}

export class ExportAnswerRequest {
  @ApiProperty({ enum: ['pdf', 'md'], description: 'Formato do arquivo' })
  // Decorators obrigatórios: sem eles o ValidationPipe (whitelist) remove o campo.
  @IsIn(['pdf', 'md'])
  format!: ExportFormat;

  @ApiProperty({ description: 'Markdown da resposta a exportar' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ required: false, description: 'Título (vira o nome do arquivo)' })
  @IsOptional()
  @IsString()
  title?: string;
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
  constructor(
    private readonly answerQuestion: AnswerQuestion,
    private readonly exporter: AnswerExporter,
    private readonly resolveLlm: ResolveActiveLlmConfig,
  ) {}

  @Post()
  @ApiOperation({ summary: 'RAG generativo sobre documentos e arquivos do usuário' })
  @ApiOkResponse({ type: ExploreResponse })
  async ask(@CurrentUser() user: AuthUser, @Body() body: ExploreRequest): Promise<ExploreAnswer> {
    // Provedor de LLM ativo do usuário (ou undefined => default do serviço).
    const llm = (await this.resolveLlm.execute({ ownerId: user.id })) ?? undefined;
    return this.answerQuestion.execute({ ownerId: user.id, q: body.q ?? '', llm });
  }

  /**
   * Exporta a resposta como PDF ou Markdown. Efêmero: gera na hora e devolve os
   * bytes (nada persistido). Rota autenticada — o conteúdo vem do próprio cliente.
   */
  @Post('export')
  @ApiOperation({ summary: 'Baixa a resposta como PDF ou Markdown (efêmero)' })
  async export(@Body() body: ExportAnswerRequest, @Res() res: Response): Promise<void> {
    const file = await this.exporter.export({
      format: body.format,
      title: body.title,
      content: body.content,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', String(file.bytes.byteLength));
    res.end(Buffer.from(file.bytes));
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

    // Resolve DEPOIS de registrar o close-handler (senão um disconnect durante
    // o lookup não abortaria). Provedor ativo do usuário (ou default do serviço).
    const llm = (await this.resolveLlm.execute({ ownerId: user.id })) ?? undefined;

    // Respeita backpressure: se o buffer do socket encheu (cliente lento), espera
    // o 'drain' antes de puxar o próximo evento — evita bufferização ilimitada.
    const write = async (chunk: string): Promise<void> => {
      if (res.write(chunk) || abort.signal.aborted) return;
      try {
        await once(res, 'drain', { signal: abort.signal });
      } catch {
        // abort durante o drain: encerra o loop na próxima checagem.
      }
    };

    const heartbeat = setInterval(() => {
      if (!abort.signal.aborted) res.write(':\n\n'); // comentário SSE = keep-alive
    }, HEARTBEAT_MS);

    try {
      for await (const event of this.answerQuestion.stream({
        ownerId: user.id, // SEMPRE do JWT
        q: body.q ?? '',
        signal: abort.signal,
        llm,
      })) {
        if (abort.signal.aborted) break;
        await write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      if (!abort.signal.aborted) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: SAFE_STREAM_ERROR })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }
}
