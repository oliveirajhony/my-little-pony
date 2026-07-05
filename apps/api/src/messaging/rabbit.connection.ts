import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { DOCUMENTS_EXCHANGE } from './rabbit.constants';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection['createChannel']>>;

/**
 * Lazily-established RabbitMQ connection + channel. The topic exchange is
 * asserted on first use so producers and the consumer share one channel.
 */
@Injectable()
export class RabbitConnection implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitConnection.name);
  private connection?: Connection;
  private ready?: Promise<Channel>;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  channel(): Promise<Channel> {
    if (!this.ready) this.ready = this.connect();
    return this.ready;
  }

  private async connect(): Promise<Channel> {
    this.connection = await amqp.connect(this.config.rabbitmqUrl);
    const channel = await this.connection.createChannel();
    await channel.assertExchange(DOCUMENTS_EXCHANGE, 'topic', { durable: true });
    this.logger.log('connected to rabbitmq');
    return channel;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      const channel = await this.ready;
      await channel?.close();
      await this.connection?.close();
    } catch {
      // shutting down — best effort.
    }
  }
}
