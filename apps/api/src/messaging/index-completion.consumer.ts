import { MarkDocumentIndexed } from '@my-little-pony/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitConnection } from './rabbit.connection';
import { DOCUMENTS_EXCHANGE, INDEX_COMPLETED_QUEUE, RK_INDEX_COMPLETED } from './rabbit.constants';

type CompletedPayload = { documentId: string; status: 'ready' | 'failed'; chunkCount?: number };

/** Consumes indexing-completion events from the Python worker and applies them. */
@Injectable()
export class IndexCompletionConsumer implements OnModuleInit {
  private readonly logger = new Logger(IndexCompletionConsumer.name);

  constructor(
    private readonly connection: RabbitConnection,
    private readonly markIndexed: MarkDocumentIndexed,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.connection.channel();
    await channel.assertQueue(INDEX_COMPLETED_QUEUE, { durable: true });
    await channel.bindQueue(INDEX_COMPLETED_QUEUE, DOCUMENTS_EXCHANGE, RK_INDEX_COMPLETED);
    await channel.consume(INDEX_COMPLETED_QUEUE, async (message) => {
      if (!message) return;

      let payload: CompletedPayload;
      try {
        payload = JSON.parse(message.content.toString()) as CompletedPayload;
      } catch (error) {
        this.logger.error(`dropping malformed completion message: ${String(error)}`);
        // Not valid JSON — retrying would never fix it. Drop without requeue.
        channel.nack(message, false, false);
        return;
      }

      try {
        await this.markIndexed.execute({
          documentId: payload.documentId,
          status: payload.status,
        });
        channel.ack(message);
      } catch (error) {
        if (message.fields.redelivered) {
          this.logger.error(`giving up on completion message after retry: ${String(error)}`);
          channel.nack(message, false, false);
        } else {
          this.logger.warn(
            `transient error processing completion message, retrying: ${String(error)}`,
          );
          channel.nack(message, false, true);
        }
      }
    });
    this.logger.log(`consuming ${INDEX_COMPLETED_QUEUE}`);
  }
}
