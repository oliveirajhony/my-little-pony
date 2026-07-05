import type { DocumentIndexRequested, EventPublisher } from '@my-little-pony/core';
import type { RabbitConnection } from './rabbit.connection';
import { DOCUMENTS_EXCHANGE, RK_INDEX_REQUESTED } from './rabbit.constants';

/** EventPublisher port backed by a RabbitMQ topic exchange. */
export class RabbitEventPublisher implements EventPublisher {
  constructor(private readonly connection: RabbitConnection) {}

  async documentIndexRequested(event: DocumentIndexRequested): Promise<void> {
    const channel = await this.connection.channel();
    channel.publish(DOCUMENTS_EXCHANGE, RK_INDEX_REQUESTED, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true,
    });
  }
}
