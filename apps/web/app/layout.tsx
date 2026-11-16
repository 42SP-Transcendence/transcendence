import './globals.css';

import type { Metadata } from 'next';
import { Archivo, Atkinson_Hyperlegible, Doto } from 'next/font/google';
import type { ReactNode } from 'react';

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
 * Root layout shared by every page, loading the design system fonts and colors.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${atkinson.variable} ${doto.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
