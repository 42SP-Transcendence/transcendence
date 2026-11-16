import { Inject, Injectable } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

import { MAIL_FROM, MAIL_TRANSPORT } from './mail.tokens';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: Pick<Transporter, 'sendMail'>,
    @Inject(MAIL_FROM) private readonly from: string,
  ) {}

  /**
   * Sends a plain-text email from the configured sender to one recipient.
   */
  async send(to: string, subject: string, text: string): Promise<void> {
    await this.transport.sendMail({ from: this.from, to, subject, text });
  }
}
