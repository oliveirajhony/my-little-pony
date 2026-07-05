import { type Clock, type DocumentRepository, MarkDocumentIndexed } from '@my-little-pony/core';
import { Global, Module } from '@nestjs/common';
import { CLOCK, DOCUMENT_REPOSITORY, EVENT_PUBLISHER } from '../tokens';
import { IndexCompletionConsumer } from './index-completion.consumer';
import { RabbitConnection } from './rabbit.connection';
import { RabbitEventPublisher } from './rabbit-event-publisher';

// Owns the RabbitMQ connection, the EventPublisher port and the completion
// consumer that projects indexing results back onto documents.
@Global()
@Module({
  providers: [
    RabbitConnection,
    IndexCompletionConsumer,
    {
      provide: EVENT_PUBLISHER,
      inject: [RabbitConnection],
      useFactory: (connection: RabbitConnection) => new RabbitEventPublisher(connection),
    },
    {
      provide: MarkDocumentIndexed,
      inject: [DOCUMENT_REPOSITORY, CLOCK],
      useFactory: (repo: DocumentRepository, clock: Clock) => new MarkDocumentIndexed(repo, clock),
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class MessagingModule {}
