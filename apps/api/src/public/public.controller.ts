import {
  type EventPublisher,
  GetDocumentPdf,
  GetPublicDocument,
  SubmitContactMessage,
} from '@my-little-pony/core';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { EVENT_PUBLISHER } from '../tokens';
import { ContactMessageDto, EmailDocumentDto } from './public.dto';

export class PublicDocumentResponse {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ description: 'HTML publicado' })
  content!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

@ApiTags('public')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public/documents')
export class PublicController {
  constructor(
    private readonly getPublicDocument: GetPublicDocument,
    private readonly getDocumentPdf: GetDocumentPdf,
    private readonly submitContact: SubmitContactMessage,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  @Get(':ownerId/:slug')
  @ApiOperation({ summary: 'Documento publicado, por autor + slug (anônimo, com cache)' })
  @ApiOkResponse({ type: PublicDocumentResponse })
  content(
    // ownerId malformado não pode existir: cai em 404 (não 500 do cast de uuid).
    @Param('ownerId', new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() }))
    ownerId: string,
    @Param('slug') slug: string,
  ): Promise<PublicDocumentResponse> {
    return this.getPublicDocument.execute(ownerId, slug);
  }

  @Get(':ownerId/:slug/pdf')
  @ApiOperation({ summary: 'PDF do documento publicado (gerado no publish, servido do storage)' })
  async pdf(
    @Param('ownerId', new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() }))
    ownerId: string,
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    // null = documento não publicado ou PDF ainda não gerado → 404 (UI trata como "gerando").
    const pdf = await this.getDocumentPdf.execute(ownerId, slug);
    if (!pdf) throw new NotFoundException();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.end(Buffer.from(pdf.data));
  }

  @Post(':ownerId/:slug/email')
  @HttpCode(202)
  // Endpoint anônimo que dispara e-mail — limite apertado contra abuso/spam.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Recebe o link do PDF por e-mail (assíncrono)' })
  async email(
    @Param('ownerId', new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() }))
    ownerId: string,
    @Param('slug') slug: string,
    @Body() dto: EmailDocumentDto,
  ): Promise<{ status: string }> {
    // 404 se o documento não existe ou não está publicado.
    await this.getPublicDocument.execute(ownerId, slug);
    await this.events.documentPdfEmailRequested({ ownerId, slug, recipient: dto.email });
    return { status: 'queued' };
  }

  @Post(':ownerId/:slug/contact')
  @HttpCode(202)
  // Endpoint anônimo — limite apertado contra spam.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Envia uma mensagem ao autor do documento' })
  async contact(
    @Param('ownerId', new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() }))
    ownerId: string,
    @Param('slug') slug: string,
    @Body() dto: ContactMessageDto,
  ): Promise<{ status: string }> {
    await this.submitContact.execute({
      ownerId,
      slug,
      fromName: dto.name,
      fromEmail: dto.email,
      message: dto.message,
    });
    return { status: 'received' };
  }
}
