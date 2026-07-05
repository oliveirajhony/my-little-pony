import type { DocumentRepository } from '@my-little-pony/core';
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DOCUMENT_REPOSITORY } from '../tokens';
import { InternalTokenGuard } from './internal-token.guard';

export class DocumentContentResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: 'HTML do editor, para o serviço indexar' })
  content!: string;

  @ApiProperty()
  version!: number;
}

@ApiTags('internal')
@SkipThrottle()
@ApiHeader({ name: 'X-Internal-Token', description: 'Token de serviço (INTERNAL_API_TOKEN)' })
@Controller('internal/documents')
@UseGuards(InternalTokenGuard)
export class InternalController {
  constructor(@Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository) {}

  @Get(':id/content')
  @ApiOperation({ summary: 'Conteúdo bruto de um documento (uso do serviço de indexação)' })
  @ApiOkResponse({ type: DocumentContentResponse })
  async content(@Param('id', ParseUUIDPipe) id: string): Promise<DocumentContentResponse> {
    const doc = await this.documents.findById(id);
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return {
      id: doc.id,
      ownerId: doc.ownerId,
      title: doc.title,
      content: doc.content,
      version: doc.version,
    };
  }
}
