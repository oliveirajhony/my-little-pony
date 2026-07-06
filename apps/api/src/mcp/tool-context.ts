import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import {
  AnswerQuestion,
  type CacheStore,
  CreateDocument,
  DeleteDocument,
  type Document,
  DomainError,
  GetDocument,
  GetProfile,
  ListContactMessages,
  ListDocuments,
  MarkContactMessageRead,
  type PageConfigPatch,
  type PatScope,
  PublishDocument,
  publicDocumentKey,
  SaveDraft,
  SearchDocuments,
  UnpublishDocument,
  UpdateProfile,
} from '@my-little-pony/core';
import type { ZodRawShape } from 'zod';

/** The core use-cases and adapters an MCP tool may reach. */
export interface McpUseCases {
  listDocuments: ListDocuments;
  createDocument: CreateDocument;
  getDocument: GetDocument;
  saveDraft: SaveDraft;
  deleteDocument: DeleteDocument;
  publishDocument: PublishDocument;
  unpublishDocument: UnpublishDocument;
  listMessages: ListContactMessages;
  markMessageRead: MarkContactMessageRead;
  getProfile: GetProfile;
  updateProfile: UpdateProfile;
  searchDocuments: SearchDocuments;
  answerQuestion: AnswerQuestion;
  cache: CacheStore;
}

export type DocumentPatch = {
  title?: string;
  content?: string;
  slug?: string;
  categories?: string[];
  pageConfig?: PageConfigPatch;
};

/** Per-request context: the authenticated owner plus the use-cases. */
export class ToolContext {
  constructor(
    readonly ownerId: string,
    readonly uc: McpUseCases,
  ) {}

  /**
   * Reads the current version, applies the patch and saves — hiding optimistic
   * concurrency from the agent. Retries once on a stale version, then keeps the
   * public cache fresh for published documents.
   */
  async saveDocument(id: string, patch: DocumentPatch): Promise<Document> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const current = await this.uc.getDocument.execute({ id, ownerId: this.ownerId });
      try {
        const saved = await this.uc.saveDraft.execute({
          id,
          ownerId: this.ownerId,
          expectedVersion: current.version,
          ...patch,
        });
        if (saved.status === 'published') {
          await this.uc.cache.delete(publicDocumentKey(this.ownerId, saved.slug));
        }
        return saved;
      } catch (error) {
        if (error instanceof DomainError && error.code === 'stale-version') {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
}

/** A single MCP tool: metadata, required scope, zod input shape and handler. */
export type ToolDef = {
  name: string;
  title: string;
  description: string;
  scope: PatScope;
  inputSchema: ZodRawShape;
  annotations?: ToolAnnotations;
  handle: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
};
