import {
  type Clock,
  CreateDocument,
  DeleteDocument,
  type DocumentRepository,
  GetDocument,
  type IdGenerator,
  ListDocuments,
  PublishDocument,
  SaveDraft,
  UnpublishDocument,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CLOCK, DOCUMENT_REPOSITORY, ID_GENERATOR } from '../tokens';
import { DocumentsController } from './documents.controller';

@Module({
  controllers: [DocumentsController],
  providers: [
    {
      provide: CreateDocument,
      inject: [DOCUMENT_REPOSITORY, ID_GENERATOR, CLOCK],
      useFactory: (repo: DocumentRepository, ids: IdGenerator, clock: Clock) =>
        new CreateDocument(repo, ids, clock),
    },
    {
      provide: SaveDraft,
      inject: [DOCUMENT_REPOSITORY, CLOCK],
      useFactory: (repo: DocumentRepository, clock: Clock) => new SaveDraft(repo, clock),
    },
    {
      provide: GetDocument,
      inject: [DOCUMENT_REPOSITORY],
      useFactory: (repo: DocumentRepository) => new GetDocument(repo),
    },
    {
      provide: ListDocuments,
      inject: [DOCUMENT_REPOSITORY],
      useFactory: (repo: DocumentRepository) => new ListDocuments(repo),
    },
    {
      provide: DeleteDocument,
      inject: [DOCUMENT_REPOSITORY],
      useFactory: (repo: DocumentRepository) => new DeleteDocument(repo),
    },
    {
      provide: PublishDocument,
      inject: [DOCUMENT_REPOSITORY, CLOCK],
      useFactory: (repo: DocumentRepository, clock: Clock) => new PublishDocument(repo, clock),
    },
    {
      provide: UnpublishDocument,
      inject: [DOCUMENT_REPOSITORY, CLOCK],
      useFactory: (repo: DocumentRepository, clock: Clock) => new UnpublishDocument(repo, clock),
    },
  ],
})
export class DocumentsModule {}
