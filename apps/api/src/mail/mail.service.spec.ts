import type { SendMailOptions } from 'nodemailer';

import { MailService } from './mail.service';

const FROM = 'Observatório <nao-responda@example.com>';

describe('MailService', () => {
  it('sends a plain-text email from the configured sender', async () => {
    const sent: SendMailOptions[] = [];
    const service = new MailService(
      {
        /**
         * Records the message instead of delivering it.
         */
        sendMail: async (options: SendMailOptions) => {
          sent.push(options);
          return {};
        },
      } as never,
      FROM,
    );

    await service.send('pessoa@example.com', 'Assunto', 'Corpo');

    expect(sent).toEqual([
      { from: FROM, to: 'pessoa@example.com', subject: 'Assunto', text: 'Corpo' },
    ]);
  });

  it('propagates transport failures', async () => {
    const service = new MailService(
      {
        /**
         * Fails like an unreachable SMTP server.
         */
        sendMail: async () => {
          throw new Error('connection refused');
        },
      } as never,
      FROM,
    );

    await expect(service.send('pessoa@example.com', 'Assunto', 'Corpo')).rejects.toThrow(
      'connection refused',
    );
  });
});
