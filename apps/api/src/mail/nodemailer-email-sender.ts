import type { EmailSender } from '@my-little-pony/core';
import { createTransport, type Transporter } from 'nodemailer';

export type NodemailerOptions = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/** EmailSender sobre SMTP (dev: Mailpit; prod: provedor via env). */
export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(options: NodemailerOptions) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      // Mailpit não exige auth; só liga credenciais se houver usuário.
      auth: options.user ? { user: options.user, pass: options.pass } : undefined,
    });
    this.from = options.from;
  }

  async send(input: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
