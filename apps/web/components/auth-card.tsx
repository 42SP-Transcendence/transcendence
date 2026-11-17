import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
}

/**
 * Centered card that frames an authentication form with a heading and a link to the other auth page.
 */
export function AuthCard({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthCardProps) {
  return (
    <div className="px-gutter flex flex-1 items-center justify-center py-12">
      <div className="bg-surface flex w-full max-w-md flex-col gap-6 rounded-lg p-6 sm:p-8">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="text-muted">{description}</p>
        </header>
        {children}
        <p className="text-muted">
          {footerText}{' '}
          <Link
            href={footerHref}
            className="text-ink focus-visible:outline-focus rounded-sm font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
