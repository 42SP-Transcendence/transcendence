import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('links to the privacy policy and the terms of use', () => {
    render(<SiteFooter />);

    const nav = screen.getByRole('navigation', { name: 'Rodapé' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Política de Privacidade' }));
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    );
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
  });
});
