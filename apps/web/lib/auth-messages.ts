import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@transcendence/schemas';

const messages: Record<string, string> = {
  email_required: 'Informe seu e-mail.',
  email_invalid: 'Informe um e-mail válido, como nome@exemplo.com.',
  password_required: 'Informe sua senha.',
  password_too_short: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  password_too_long: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  display_name_required: 'Informe o nome que vai aparecer no seu perfil.',
  display_name_too_short: `O nome precisa ter pelo menos ${DISPLAY_NAME_MIN_LENGTH} caracteres.`,
  display_name_too_long: `O nome pode ter no máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
  email_taken: 'Já existe uma conta com este e-mail. Entre nela ou use outro e-mail.',
  invalid_credentials: 'E-mail ou senha incorretos. Confira e tente de novo.',
  account_suspended: 'Esta conta está suspensa e não pode entrar no momento.',
  validation_failed: 'Alguns dados não foram aceitos. Revise os campos destacados.',
  network_error: 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.',
  unexpected_error: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
};

export const passwordHint = `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;

/**
 * Translates a stable error code from the schemas or the API into Portuguese text.
 */
export function errorMessage(code: string | undefined): string | undefined {
  if (code === undefined) {
    return undefined;
  }
  return messages[code] ?? messages.unexpected_error;
}
