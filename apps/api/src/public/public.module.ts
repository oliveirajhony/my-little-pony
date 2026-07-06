import {
  type CacheStore,
  type Clock,
  type ContactMessageRepository,
  type DocumentPdfStorage,
  type DocumentRepository,
  GetDocumentPdf,
  GetPublicDocument,
  type IdGenerator,
  SubmitContactMessage,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import {
  CACHE_STORE,
  CLOCK,
  CONTACT_MESSAGE_REPOSITORY,
  DOCUMENT_PDF_STORAGE,
  DOCUMENT_REPOSITORY,
  ID_GENERATOR,
} from '../tokens';
import { PublicController } from './public.controller';

const PUBLIC_CACHE_TTL_SECONDS = 60;

@Module({
  controllers: [PublicController],
  providers: [
    {
      provide: GetPublicDocument,
      inject: [DOCUMENT_REPOSITORY, CACHE_STORE],
      useFactory: (repo: DocumentRepository, cache: CacheStore) =>
        new GetPublicDocument(repo, cache, PUBLIC_CACHE_TTL_SECONDS),
    },
    {
      provide: GetDocumentPdf,
      inject: [DOCUMENT_REPOSITORY, DOCUMENT_PDF_STORAGE],
      useFactory: (repo: DocumentRepository, storage: DocumentPdfStorage) =>
        new GetDocumentPdf(repo, storage),
    },
    {
      provide: SubmitContactMessage,
      inject: [DOCUMENT_REPOSITORY, CONTACT_MESSAGE_REPOSITORY, ID_GENERATOR, CLOCK],
      useFactory: (
        docs: DocumentRepository,
        messages: ContactMessageRepository,
        ids: IdGenerator,
        clock: Clock,
      ) => new SubmitContactMessage(docs, messages, ids, clock),
    },
  ],
})
export class PublicModule {}
