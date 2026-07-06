import type { SourceFileRepository } from '@my-little-pony/core';
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
import { sourceFileStorageKey } from '../storage/minio-source-file.storage';
import { SOURCE_FILE_REPOSITORY } from '../tokens';
import { InternalTokenGuard } from './internal-token.guard';

export class SourceFileContentResponse {
  @ApiProperty({ enum: ['file'], description: 'Sempre "file" — o worker lê os bytes do MinIO.' })
  kind!: 'file';

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty({ description: 'Chave do objeto no bucket de documentos-fonte.' })
  storageKey!: string;
}

@ApiTags('internal')
@SkipThrottle()
@ApiHeader({ name: 'X-Internal-Token', description: 'Token de serviço (INTERNAL_API_TOKEN)' })
@Controller('internal/source-files')
@UseGuards(InternalTokenGuard)
export class InternalSourceFilesController {
  constructor(@Inject(SOURCE_FILE_REPOSITORY) private readonly files: SourceFileRepository) {}

  @Get(':id/content')
  @ApiOperation({ summary: 'Descriptor de um documento-fonte (uso do serviço de indexação)' })
  @ApiOkResponse({ type: SourceFileContentResponse })
  async content(@Param('id', ParseUUIDPipe) id: string): Promise<SourceFileContentResponse> {
    const file = await this.files.findById(id);
    if (!file) throw new NotFoundException('Arquivo não encontrado.');
    return {
      kind: 'file',
      ownerId: file.ownerId,
      filename: file.filename,
      contentType: file.contentType,
      storageKey: sourceFileStorageKey(file.ownerId, file.id),
    };
  }
}
