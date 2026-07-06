import type {
  DeindexRequested,
  DocumentPdfEmailRequested,
  DocumentPdfRequested,
  EventPublisher,
  IndexRequested,
} from '@my-little-pony/core';
import type { RabbitConnection } from './rabbit.connection';
import {
  DOCUMENTS_EXCHANGE,
  RK_DEINDEX_REQUESTED,
  RK_INDEX_REQUESTED,
  RK_PDF_EMAIL_REQUESTED,
  RK_PDF_REQUESTED,
} from './rabbit.constants';

/** EventPublisher port backed by a RabbitMQ topic exchange. */
export class RabbitEventPublisher implements EventPublisher {
  constructor(private readonly connection: RabbitConnection) {}

  async indexRequested(event: IndexRequested): Promise<void> {
    await this.publish(RK_INDEX_REQUESTED, event);
  }

  async deindexRequested(event: DeindexRequested): Promise<void> {
    await this.publish(RK_DEINDEX_REQUESTED, event);
  }

  async documentPdfRequested(event: DocumentPdfRequested): Promise<void> {
    await this.publish(RK_PDF_REQUESTED, event);
  }

  async documentPdfEmailRequested(event: DocumentPdfEmailRequested): Promise<void> {
    await this.publish(RK_PDF_EMAIL_REQUESTED, event);
  }

  private async publish(routingKey: string, event: unknown): Promise<void> {
    const channel = await this.connection.channel();
    channel.publish(DOCUMENTS_EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true,
    });
  }
}
