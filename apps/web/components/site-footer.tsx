import Link from 'next/link';

import { LEGAL_LINKS } from '../lib/site-links';

/**
 * Site footer with the project credit and the links to the legal pages.
 */
export function SiteFooter() {
  return (
    <footer className="border-line border-t">
      <div className="px-gutter mx-auto flex max-w-5xl flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <p className="text-muted">Observatório dos Ônibus · ft_transcendence · 42 São Paulo</p>
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="focus-visible:outline-focus inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
