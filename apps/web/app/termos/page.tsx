import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Termos de Uso · Observatório' };

/**
 * Sign-in page at /termos.
 */
export default function Termspage(){
  return (
    <div className="px-gutter py-section mx-auto w-full max-w-2xl">
      <p className="font-led text-led-text text-xl">4710-10</p>
      <h1 className="font-display text-4xl font-extrabold">Termos de Uso · Observatório</h1>
    </div>
  );
}
