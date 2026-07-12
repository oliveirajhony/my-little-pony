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
  private closing = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  channel(): Promise<Channel> {
    if (!this.ready) this.ready = this.connect();
    return this.ready;
  }

  private async connect(): Promise<Channel> {
    const connection = await amqp.connect(this.config.rabbitmqUrl);
    this.connection = connection;
    // Sem um listener de 'error', um fechamento inesperado do socket (broker
    // reiniciando, rede oscilando) vira exceção não capturada e derruba o
    // processo inteiro. Logamos e, no 'close', esquecemos a conexão para que a
    // próxima chamada a channel() reconecte preguiçosamente.
    connection.on('error', (err) => this.logger.error(`erro na conexão rabbitmq: ${err.message}`));
    connection.on('close', () => {
      if (this.closing) return;
      this.logger.warn('conexão rabbitmq fechada — reconecta no próximo uso');
      this.ready = undefined;
      this.connection = undefined;
    });
    const channel = await connection.createChannel();
    channel.on('error', (err) => this.logger.error(`erro no canal rabbitmq: ${err.message}`));
    await channel.assertExchange(DOCUMENTS_EXCHANGE, 'topic', { durable: true });
    this.logger.log('connected to rabbitmq');
    return channel;
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    try {
      const channel = await this.ready;
      await channel?.close();
      await this.connection?.close();
    } catch {
      // shutting down — best effort.
    }
  }
}
