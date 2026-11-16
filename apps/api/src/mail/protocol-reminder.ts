export interface ProtocolReminder {
  protocolNumber: string;
  registeredAt: Date;
}

export interface EmailContent {
  subject: string;
  text: string;
}

/**
 * Writes the reminder sent when a 156 protocol has gone 10 days without an answer.
 */
export function protocolReminderEmail({
  protocolNumber,
  registeredAt,
}: ProtocolReminder): EmailContent {
  const date = registeredAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return {
    subject: `Seu protocolo ${protocolNumber} está há 10 dias sem resposta`,
    text: [
      'Olá!',
      '',
      `O protocolo ${protocolNumber}, registrado no 156 em ${date}, completou 10 dias sem resposta marcada no Observatório dos Ônibus.`,
      '',
      'Se a Prefeitura já respondeu, marque o protocolo como respondido no app.',
      'Se ainda não houve resposta, você pode cobrar pelo 156 informando o número do protocolo.',
      '',
      'Este é um e-mail automático, não é preciso respondê-lo.',
      'Observatório dos Ônibus',
    ].join('\n'),
  };
}
