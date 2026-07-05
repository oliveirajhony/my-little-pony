import {
  CreateDocument,
  DeleteDocument,
  GetDocument,
  ListDocuments,
  PublishDocument,
  SaveDraft,
  UnpublishDocument,
} from '@my-little-pony/core';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { toDocumentDetail, toDocumentSummary } from './document-view';
import { CreateDocumentDto, ListDocumentsDto, SaveDraftDto } from './documents.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(AccessTokenGuard)
export class DocumentsController {
  constructor(
    private readonly createDocument: CreateDocument,
    private readonly saveDraft: SaveDraft,
    private readonly getDocument: GetDocument,
    private readonly listDocuments: ListDocuments,
    private readonly deleteDocument: DeleteDocument,
    private readonly publishDocument: PublishDocument,
    private readonly unpublishDocument: UnpublishDocument,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os documentos do usuário (busca + filtros)' })
  async list(@CurrentUser() user: AuthUser, @Query() query: ListDocumentsDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const result = await this.listDocuments.execute({
      ownerId: user.id,
      q: query.q,
      status: query.status,
      category: query.category,
      page,
      limit,
    });
    return {
      items: result.items.map(toDocumentSummary),
      total: result.total,
      page,
      limit,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Cria um documento (rascunho)' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return toDocumentDetail(
      await this.createDocument.execute({ ownerId: user.id, title: dto.title }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Documento completo (com conteúdo)' })
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return toDocumentDetail(await this.getDocument.execute({ id, ownerId: user.id }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Autosave (concorrência otimista por versão)' })
  async save(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SaveDraftDto) {
    return toDocumentDetail(
      await this.saveDraft.execute({
        id,
        ownerId: user.id,
        expectedVersion: dto.version,
        title: dto.title,
        content: dto.content,
        slug: dto.slug,
        categories: dto.categories,
      }),
    );
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publica (gera slug único e marca para indexação)' })
  async publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return toDocumentSummary(await this.publishDocument.execute({ id, ownerId: user.id }));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Despublica (volta a rascunho)' })
  async unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return toDocumentSummary(await this.unpublishDocument.execute({ id, ownerId: user.id }));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove o documento' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.deleteDocument.execute({ id, ownerId: user.id });
  }
}
