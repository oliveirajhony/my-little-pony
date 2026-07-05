import { GenerateDocumentPdf } from '@my-little-pony/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitConnection } from './rabbit.connection';
import { DOCUMENTS_EXCHANGE, PDF_REQUESTED_QUEUE, RK_PDF_REQUESTED } from './rabbit.constants';

type PdfRequestedPayload = { documentId: string; ownerId: string };

/** Consome pedidos de PDF (emitidos no publish) e gera o arquivo no MinIO. */
@Injectable()
export class PdfGenerationConsumer implements OnModuleInit {
  private readonly logger = new Logger(PdfGenerationConsumer.name);

  constructor(
    private readonly connection: RabbitConnection,
    private readonly generatePdf: GenerateDocumentPdf,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.connection.channel();
    await channel.assertQueue(PDF_REQUESTED_QUEUE, { durable: true });
    await channel.bindQueue(PDF_REQUESTED_QUEUE, DOCUMENTS_EXCHANGE, RK_PDF_REQUESTED);
    // Um PDF por vez por processo — a renderização Chromium é pesada.
    await channel.prefetch(1);
    await channel.consume(PDF_REQUESTED_QUEUE, async (message) => {
      if (!message) return;

      let payload: PdfRequestedPayload;
      try {
        payload = JSON.parse(message.content.toString()) as PdfRequestedPayload;
      } catch (error) {
        this.logger.error(`dropping malformed pdf message: ${String(error)}`);
        channel.nack(message, false, false);
        return;
      }

      try {
        await this.generatePdf.execute({ documentId: payload.documentId });
        channel.ack(message);
      } catch (error) {
        if (message.fields.redelivered) {
          this.logger.error(`giving up on pdf message after retry: ${String(error)}`);
          channel.nack(message, false, false);
        } else {
          this.logger.warn(`transient error generating pdf, retrying: ${String(error)}`);
          channel.nack(message, false, true);
        }
      }
    });
    this.logger.log(`consuming ${PDF_REQUESTED_QUEUE}`);
  }
}
