import { Module } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { loadApiEnv } from '../config/env';
import { MailService } from './mail.service';
import { MAIL_FROM, MAIL_TRANSPORT } from './mail.tokens';

/**
 * Builds the SMTP transport from the validated environment, authenticating only when a user is set.
 */
function transportFactory(): Transporter {
  const env = loadApiEnv();
  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
}

/**
 * Returns the sender name and address used on every email.
 */
function fromFactory(): string {
  return loadApiEnv().SMTP_FROM;
}

@Module({
  providers: [
    { provide: MAIL_TRANSPORT, useFactory: transportFactory },
    { provide: MAIL_FROM, useFactory: fromFactory },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
