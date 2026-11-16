import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInForm } from './sign-in-form';

const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

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
 * Fills the sign-in form and submits it with the keyboard only.
 */
async function submitWithKeyboard() {
  await userEvent.tab();
  await userEvent.keyboard('ana@exemplo.com');
  await userEvent.tab();
  await userEvent.keyboard('qualquer-senha');
  await userEvent.keyboard('{Enter}');
}

describe('SignInForm', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    replace.mockReset();
  });

  it('shows required messages and focuses the first invalid field', async () => {
    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    const password = screen.getByLabelText('Senha');
    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription('Informe sua senha.');
  });

  it('signs in from the keyboard and goes home', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
        email: 'ana@exemplo.com',
        displayName: 'Ana',
        role: 'user',
        locale: 'pt_BR',
      }),
    );
    render(<SignInForm />);
    await submitWithKeyboard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it.each([
    [401, 'invalid_credentials', 'E-mail ou senha incorretos. Confira e tente de novo.'],
    [403, 'account_suspended', 'Esta conta está suspensa e não pode entrar no momento.'],
  ])('announces a %i %s in the alert region', async (status, message, text) => {
    fetchMock.mockResolvedValueOnce(json(status, { message }));
    render(<SignInForm />);
    await submitWithKeyboard();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(text));
    expect(replace).not.toHaveBeenCalled();
  });

  it('announces a network failure in the alert region', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<SignInForm />);
    await submitWithKeyboard();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.',
      ),
    );
  });
});
