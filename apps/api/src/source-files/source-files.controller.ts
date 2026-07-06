import {
  DeleteSourceFile,
  DomainError,
  GetSourceFileContent,
  ImportSourceFile,
  ListSourceFiles,
} from '@my-little-pony/core';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { SourceFileResponse, toSourceFileResponse } from './source-file.response';

const IdParam = new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() });

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Forma mínima do upload do multer (evita depender de @types/multer).
type UploadedDocument = { buffer: Buffer; mimetype: string; size: number; originalname: string };

@ApiTags('source-files')
@ApiBearerAuth()
@Controller('source-files')
@UseGuards(AccessTokenGuard)
export class SourceFilesController {
  constructor(
    private readonly importFile: ImportSourceFile,
    private readonly listFiles: ListSourceFiles,
    private readonly getContent: GetSourceFileContent,
    private readonly deleteFile: DeleteSourceFile,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os documentos-fonte importados do usuário' })
  @ApiOkResponse({ type: [SourceFileResponse] })
  async list(@CurrentUser() user: AuthUser) {
    const files = await this.listFiles.execute({ ownerId: user.id });
    return files.map(toSourceFileResponse);
  }

  @Post()
  @ApiOperation({ summary: 'Importa um documento-fonte (PDF, DOCX, DOC, MD ou HTML)' })
  @ApiCreatedResponse({ type: SourceFileResponse })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: UploadedDocument) {
    if (!file?.buffer?.length) throw new DomainError('invalid-file');
    const created = await this.importFile.execute({
      ownerId: user.id,
      filename: file.originalname,
      contentType: file.mimetype || 'application/octet-stream',
      data: file.buffer,
    });
    return toSourceFileResponse(created);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Serve os bytes do arquivo para pré-visualização' })
  async serve(
    @CurrentUser() user: AuthUser,
    @Param('id', IdParam) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, content } = await this.getContent.execute({ ownerId: user.id, id });
    res.setHeader('Content-Type', content.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.end(Buffer.from(content.data));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga um documento-fonte' })
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    await this.deleteFile.execute({ ownerId: user.id, id });
  }
}
