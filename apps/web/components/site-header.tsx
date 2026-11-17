'use client';

import type { AuthUser } from '@transcendence/schemas';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getCurrentUser, signOut } from '../lib/auth-client';
import { MAIN_LINKS } from '../lib/site-links';

type Session = { status: 'loading' } | { status: 'guest' } | { status: 'user'; user: AuthUser };

const focusRing =
  'focus-visible:outline-focus rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2';

/**
 * Site header with the brand, the main navigation and the session area, collapsing into a menu on small screens.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuOpen = menuOpenOn === pathname;

  useEffect(() => {
    let active = true;
    void getCurrentUser().then((user) => {
      if (active) {
        setSession(user ? { status: 'user', user } : { status: 'guest' });
      }
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    /**
     * Closes the small-screen menu on Escape and gives focus back to its toggle.
     */
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpenOn(null);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  /**
   * Ends the session, then shows the signed-out header and goes home.
   */
  async function handleSignOut() {
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await signOut();
      setSession({ status: 'guest' });
      setMenuOpenOn(null);
      router.replace('/');
      router.refresh();
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-line bg-surface border-b">
      <div className="px-gutter mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <Link
          href="/"
          className={`font-display flex items-center gap-2 text-xl font-extrabold ${focusRing}`}
        >
          <span aria-hidden="true" className="bg-led size-3 rounded-full" />
          Observatório
        </Link>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
          className={`border-muted min-h-11 border-2 px-3 py-1.5 font-bold md:hidden ${focusRing}`}
        >
          {menuOpen ? 'Fechar menu' : 'Menu'}
        </button>
        <div
          id="menu-principal"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-4 pb-2 md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:pb-0`}
        >
          <nav aria-label="Principal">
            <ul className="flex flex-col gap-1 md:flex-row md:gap-4">
              {MAIN_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`aria-[current=page]:decoration-led inline-flex min-h-11 items-center px-1 font-bold underline-offset-8 aria-[current=page]:underline aria-[current=page]:decoration-4 ${focusRing}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-h-11 flex-wrap items-center gap-3" aria-live="polite">
            {session.status === 'guest' ? (
              <>
                <Link
                  href="/entrar"
                  className={`inline-flex min-h-11 items-center px-1 font-bold ${focusRing}`}
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className={`bg-button text-button-ink hover:bg-button-hover inline-flex min-h-11 items-center px-4 font-bold ${focusRing}`}
                >
                  Criar conta
                </Link>
              </>
            ) : null}
            {session.status === 'user' ? (
              <>
                <p className="text-muted max-w-full truncate md:max-w-48">
                  Olá, <span className="text-ink font-bold">{session.user.displayName}</span>
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className={`border-muted min-h-11 border-2 px-4 font-bold disabled:cursor-not-allowed disabled:opacity-70 ${focusRing}`}
                >
                  {signingOut ? 'Saindo…' : 'Sair'}
                </button>
                {signOutFailed ? (
                  <p role="alert" className="text-alert w-full text-sm font-bold">
                    Não foi possível sair agora. Tente de novo.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
