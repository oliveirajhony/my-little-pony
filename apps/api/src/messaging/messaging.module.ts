import {
  type Clock,
  type DocumentPdfStorage,
  type DocumentRepository,
  type EmailSender,
  GenerateDocumentPdf,
  MarkDocumentIndexed,
  type PdfRenderer,
  SendDocumentPdfEmail,
} from '@my-little-pony/core';
import { Global, Module } from '@nestjs/common';
import {
  CLOCK,
  DOCUMENT_PDF_STORAGE,
  DOCUMENT_REPOSITORY,
  EMAIL_SENDER,
  EVENT_PUBLISHER,
  PDF_RENDERER,
} from '../tokens';
import { IndexCompletionConsumer } from './index-completion.consumer';
import { PdfEmailConsumer } from './pdf-email.consumer';
import { PdfGenerationConsumer } from './pdf-generation.consumer';
import { RabbitConnection } from './rabbit.connection';
import { RabbitEventPublisher } from './rabbit-event-publisher';

// Owns the RabbitMQ connection, the EventPublisher port and the consumers that
// project indexing results and generate PDFs off published documents.
@Global()
@Module({
  providers: [
    RabbitConnection,
    IndexCompletionConsumer,
    PdfGenerationConsumer,
    PdfEmailConsumer,
    {
      provide: EVENT_PUBLISHER,
      inject: [RabbitConnection],
      useFactory: (connection: RabbitConnection) => new RabbitEventPublisher(connection),
    },
    {
      provide: SendDocumentPdfEmail,
      inject: [EMAIL_SENDER],
      useFactory: (mailer: EmailSender) => new SendDocumentPdfEmail(mailer),
    },
    {
      provide: MarkDocumentIndexed,
      inject: [DOCUMENT_REPOSITORY, CLOCK],
      useFactory: (repo: DocumentRepository, clock: Clock) => new MarkDocumentIndexed(repo, clock),
    },
    {
      provide: GenerateDocumentPdf,
      inject: [DOCUMENT_REPOSITORY, PDF_RENDERER, DOCUMENT_PDF_STORAGE],
      useFactory: (repo: DocumentRepository, renderer: PdfRenderer, storage: DocumentPdfStorage) =>
        new GenerateDocumentPdf(repo, renderer, storage),
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class MessagingModule {}
