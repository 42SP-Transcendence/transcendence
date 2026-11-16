import { protocolReminderEmail } from './protocol-reminder';

describe('protocolReminderEmail', () => {
  it('names the protocol and its registration date in São Paulo time', () => {
    const email = protocolReminderEmail({
      protocolNumber: '2026-0012345',
      registeredAt: new Date('2026-11-06T01:30:00Z'),
    });

    expect(email.subject).toBe('Seu protocolo 2026-0012345 está há 10 dias sem resposta');
    expect(email.text).toContain('registrado no 156 em 05/11/2026');
    expect(email.text).toContain('marque o protocolo como respondido');
  });
});
