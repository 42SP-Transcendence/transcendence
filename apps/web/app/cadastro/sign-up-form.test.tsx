import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignUpForm } from './sign-up-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const user = {
  id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
  email: 'ana@exemplo.com',
  displayName: 'Ana',
  role: 'user',
  locale: 'pt_BR',
};

/**
 * Builds a fetch Response with a JSON body.
 */
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Fills every sign-up field with valid values.
 */
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await userEvent.type(screen.getByLabelText('Nome de exibição'), 'Ana');
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-bem-longa');
}

describe('SignUpForm', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    replace.mockReset();
  });

  it('shows the password minimum as a hint linked to the field', () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Use pelo menos 12 caracteres.',
    );
  });

  it('shows Portuguese validation messages, links them to the fields and focuses the first invalid one', async () => {
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText('Nome de exibição'), 'Ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const email = screen.getByLabelText('E-mail');
    const password = screen.getByLabelText('Senha');
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Informe um e-mail válido, como nome@exemplo.com.');
    expect(password).toHaveAccessibleDescription(
      'Use pelo menos 12 caracteres. A senha precisa ter pelo menos 12 caracteres.',
    );
    expect(screen.getByLabelText('Nome de exibição')).not.toHaveAttribute('aria-invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs up, signs in with the same credentials and goes home', async () => {
    fetchMock.mockResolvedValueOnce(json(201, user)).mockResolvedValueOnce(json(200, user));
    render(<SignUpForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/signup',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/login',
      expect.objectContaining({
        credentials: 'include',
        body: JSON.stringify({ email: 'ana@exemplo.com', password: 'senha-bem-longa' }),
      }),
    );
  });

  it('puts email_taken on the email field and focuses it', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { message: 'email_taken' }));
    render(<SignUpForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const email = screen.getByLabelText('E-mail');
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAccessibleDescription(
      'Já existe uma conta com este e-mail. Entre nela ou use outro e-mail.',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('maps 400 issues back onto their fields and focuses the first one', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        message: 'validation_failed',
        issues: [
          { field: 'password', code: 'password_too_long' },
          { field: 'displayName', code: 'display_name_too_short' },
        ],
      }),
    );
    render(<SignUpForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const displayName = screen.getByLabelText('Nome de exibição');
    await waitFor(() => expect(displayName).toHaveFocus());
    expect(displayName).toHaveAccessibleDescription(
      'É assim que outras pessoas vão ver você no Observatório. O nome precisa ter pelo menos 2 caracteres.',
    );
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Use pelo menos 12 caracteres. A senha pode ter no máximo 128 caracteres.',
    );
  });

  it('disables the button while the request is in flight', async () => {
    let resolve: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    render(<SignUpForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const pending = await screen.findByRole('button', { name: 'Criando conta…' });
    expect(pending).toBeDisabled();
    resolve(json(500, {}));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Algo deu errado do nosso lado. Tente de novo em instantes.',
    );
  });
});
