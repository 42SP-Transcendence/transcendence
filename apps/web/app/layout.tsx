import './globals.css';

import type { Metadata } from 'next';
import { Archivo, Atkinson_Hyperlegible, Doto } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-atkinson',
  display: 'swap',
});

const doto = Doto({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-doto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Observatório',
  description: 'Citizen observatory for São Paulo buses.',
};

/**
 * Root layout shared by every page: design system fonts and colors, skip link, header, main landmark and footer.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${atkinson.variable} ${doto.variable}`}>
      <body className="bg-bg text-ink flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#conteudo"
          className="focus:bg-button focus:text-button-ink focus:outline-focus sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-10 focus:rounded-sm focus:px-4 focus:py-3 focus:font-bold focus:outline-3 focus:outline-offset-2"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
