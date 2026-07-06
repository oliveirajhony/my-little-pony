import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  AnswerQuestion,
  type CacheStore,
  type Clock,
  type ContactMessageRepository,
  CreateDocument,
  DeleteDocument,
  type DocumentRepository,
  type EventPublisher,
  GetDocument,
  GetProfile,
  type IdGenerator,
  ListContactMessages,
  ListDocuments,
  MarkContactMessageRead,
  type PasswordHasher,
  PublishDocument,
  SaveDraft,
  SearchDocuments,
  UnpublishDocument,
  UpdateProfile,
  type UserRepository,
} from '@my-little-pony/core';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CACHE_STORE,
  CLOCK,
  CONTACT_MESSAGE_REPOSITORY,
  DOCUMENT_REPOSITORY,
  EVENT_PUBLISHER,
  ID_GENERATOR,
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../tokens';
import { buildMcpServer } from './build-mcp-server';
import { PatGuard, type PatRequest } from './pat.guard';
import type { McpUseCases } from './tool-context';
import { ToolContext } from './tool-context';

/**
 * MCP endpoint (Streamable HTTP, stateless). Each POST is authenticated by a
 * Personal Access Token, then handled by a fresh MCP server whose tools run
 * scoped to the token owner. Tools reach the same core use-cases as the HTTP
 * controllers — the MCP surface is just another primary adapter.
 */
@ApiExcludeController()
@Controller('mcp')
@UseGuards(PatGuard)
export class McpController {
  private readonly useCases: McpUseCases;

  constructor(
    @Inject(DOCUMENT_REPOSITORY) docs: DocumentRepository,
    @Inject(CONTACT_MESSAGE_REPOSITORY) messages: ContactMessageRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(CLOCK) clock: Clock,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) events: EventPublisher,
    @Inject(PASSWORD_HASHER) hasher: PasswordHasher,
    @Inject(CACHE_STORE) cache: CacheStore,
    searchDocuments: SearchDocuments,
    answerQuestion: AnswerQuestion,
  ) {
    this.useCases = {
      listDocuments: new ListDocuments(docs),
      createDocument: new CreateDocument(docs, ids, clock),
      getDocument: new GetDocument(docs),
      saveDraft: new SaveDraft(docs, clock),
      deleteDocument: new DeleteDocument(docs),
      publishDocument: new PublishDocument(docs, clock, events),
      unpublishDocument: new UnpublishDocument(docs, clock),
      listMessages: new ListContactMessages(messages),
      markMessageRead: new MarkContactMessageRead(messages, clock),
      getProfile: new GetProfile(users),
      updateProfile: new UpdateProfile(users, hasher, clock),
      searchDocuments,
      answerQuestion,
      cache,
    };
  }

  @Post()
  @HttpCode(200)
  async handle(@Req() req: PatRequest, @Res() res: Response): Promise<void> {
    if (!req.pat) throw new UnauthorizedException();
    const ctx = new ToolContext(req.pat.ownerId, this.useCases);
    const server = buildMcpServer(ctx, req.pat.scopes);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  // Stateless server: there is no session stream to open or terminate.
  @Get()
  getNotAllowed(): never {
    throw new MethodNotAllowedException('Use POST para o MCP (Streamable HTTP stateless).');
  }

  @Delete()
  deleteNotAllowed(): never {
    throw new MethodNotAllowedException('Use POST para o MCP (Streamable HTTP stateless).');
  }
}
