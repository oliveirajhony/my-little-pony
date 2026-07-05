import {
  type CacheStore,
  CreateDocument,
  DeleteDocument,
  GetDocument,
  ListDocuments,
  PublishDocument,
  publicDocumentKey,
  SaveDraft,
  UnpublishDocument,
} from '@my-little-pony/core';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { CACHE_STORE } from '../tokens';
import {
  DocumentDetailResponse,
  DocumentListResponse,
  DocumentSummaryResponse,
} from './document.response';
import { toDocumentDetail, toDocumentSummary } from './document-view';
import { CreateDocumentDto, ListDocumentsDto, SaveDraftDto } from './documents.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// Malformed ids can't exist: fail like "not found" (not the 500 a raw uuid
// cast in Postgres would throw). Mirrors PublicController.
const IdParam = new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() });

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
    @Inject(CACHE_STORE) private readonly cache: CacheStore,
  ) {}

  private invalidatePublic(ownerId: string, slug: string): Promise<void> {
    return this.cache.delete(publicDocumentKey(ownerId, slug));
  }

  @Get()
  @ApiOperation({ summary: 'Lista os documentos do usuário (busca + filtros)' })
  @ApiOkResponse({ type: DocumentListResponse })
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
  @ApiCreatedResponse({ type: DocumentDetailResponse })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return toDocumentDetail(
      await this.createDocument.execute({ ownerId: user.id, title: dto.title }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Documento completo (com conteúdo)' })
  @ApiOkResponse({ type: DocumentDetailResponse })
  async get(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    return toDocumentDetail(await this.getDocument.execute({ id, ownerId: user.id }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Autosave (concorrência otimista por versão)' })
  @ApiOkResponse({ type: DocumentDetailResponse })
  async save(
    @CurrentUser() user: AuthUser,
    @Param('id', IdParam) id: string,
    @Body() dto: SaveDraftDto,
  ) {
    const detail = toDocumentDetail(
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
    // Keep the public page fresh when a published document is edited.
    if (detail.status === 'published') await this.invalidatePublic(user.id, detail.slug);
    return detail;
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publica (gera slug único e marca para indexação)' })
  @ApiOkResponse({ type: DocumentSummaryResponse })
  async publish(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    const summary = toDocumentSummary(await this.publishDocument.execute({ id, ownerId: user.id }));
    await this.invalidatePublic(user.id, summary.slug);
    return summary;
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Despublica (volta a rascunho)' })
  @ApiOkResponse({ type: DocumentSummaryResponse })
  async unpublish(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    const summary = toDocumentSummary(
      await this.unpublishDocument.execute({ id, ownerId: user.id }),
    );
    await this.invalidatePublic(user.id, summary.slug);
    return summary;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove o documento' })
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    await this.deleteDocument.execute({ id, ownerId: user.id });
  }
}
