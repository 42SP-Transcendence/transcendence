import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteHeader } from './site-header';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace, refresh }),
}));

const ana = {
  id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
  email: 'ana@exemplo.com',
  displayName: 'Ana',
  role: 'user',
  locale: 'pt_BR',
};

/**
 * Builds a fetch Response with an optional JSON body.
 */
function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SiteHeader', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    replace.mockReset();
    refresh.mockReset();
  });

  it('offers sign-in and sign-up when there is no session', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: 'unauthenticated' }));
    render(<SiteHeader />);

    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
  });

  it('treats an unreachable API as signed out', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<SiteHeader />);

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows the signed-in name and signs out from the keyboard', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ana)).mockResolvedValueOnce(json(204));
    render(<SiteHeader />);

    const signOutButton = await screen.findByRole('button', { name: 'Sair' });
    expect(screen.getByText('Ana')).toBeInTheDocument();
    signOutButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    expect(replace).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps the session and announces it when sign-out fails', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ana)).mockResolvedValueOnce(json(500));
    render(<SiteHeader />);

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível sair agora. Tente de novo.',
    );
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('marks the current page in the main navigation', async () => {
    fetchMock.mockResolvedValueOnce(json(401));
    render(<SiteHeader />);

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Início' }));
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it('opens the small-screen menu and closes it with Escape, returning focus to the toggle', async () => {
    fetchMock.mockResolvedValueOnce(json(401));
    render(<SiteHeader />);

    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'menu-principal');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Fechar menu');

    screen.getByRole('link', { name: 'Início' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});
