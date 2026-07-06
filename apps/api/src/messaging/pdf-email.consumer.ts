import type { DocumentRepository, EmailSender } from '@my-little-pony/core';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { renderPdfEmail } from '../mail/pdf-email.template';
import { DOCUMENT_REPOSITORY, EMAIL_SENDER } from '../tokens';
import { RabbitConnection } from './rabbit.connection';
import { DOCUMENTS_EXCHANGE, PDF_EMAIL_QUEUE, RK_PDF_EMAIL_REQUESTED } from './rabbit.constants';

type PdfEmailPayload = { ownerId: string; slug: string; recipient: string };

/** Consome pedidos de "receber por e-mail" e envia o link do PDF público. */
@Injectable()
export class PdfEmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(PdfEmailConsumer.name);

  constructor(
    private readonly connection: RabbitConnection,
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepository,
    @Inject(EMAIL_SENDER) private readonly mailer: EmailSender,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = await this.connection.channel();
    await channel.assertQueue(PDF_EMAIL_QUEUE, { durable: true });
    await channel.bindQueue(PDF_EMAIL_QUEUE, DOCUMENTS_EXCHANGE, RK_PDF_EMAIL_REQUESTED);
    await channel.consume(PDF_EMAIL_QUEUE, async (message) => {
      if (!message) return;

      let payload: PdfEmailPayload;
      try {
        payload = JSON.parse(message.content.toString()) as PdfEmailPayload;
      } catch (error) {
        this.logger.error(`dropping malformed email message: ${String(error)}`);
        channel.nack(message, false, false);
        return;
      }

      try {
        // Reconfirma que o documento ainda está publicado; se não, não envia.
        const doc = await this.repo.findPublishedBySlug(payload.ownerId, payload.slug);
        if (doc) {
          const downloadUrl = `${this.config.apiPublicUrl}/public/documents/${payload.ownerId}/${payload.slug}/pdf`;
          const documentUrl = `${this.config.webOrigin}/d/${payload.ownerId}/${payload.slug}`;
          const email = renderPdfEmail({ title: doc.title, downloadUrl, documentUrl });
          await this.mailer.send({
            to: payload.recipient,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        }
        channel.ack(message);
      } catch (error) {
        if (message.fields.redelivered) {
          this.logger.error(`giving up on email message after retry: ${String(error)}`);
          channel.nack(message, false, false);
        } else {
          this.logger.warn(`transient error sending email, retrying: ${String(error)}`);
          channel.nack(message, false, true);
        }
      }
    });
    this.logger.log(`consuming ${PDF_EMAIL_QUEUE}`);
  }
}
