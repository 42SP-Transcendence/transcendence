import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineCode } from './line-code.js';

describe('LineCode', () => {
  it('shows the code and names it as a bus line', () => {
    render(<LineCode code="4710-10" />);

    expect(screen.getByLabelText('Linha 4710-10')).toHaveTextContent('4710-10');
  });

  it('uses the text tone and medium size by default', () => {
    render(<LineCode code="4710-10" />);

    expect(screen.getByText('4710-10')).toHaveClass('font-led', 'text-led-text', 'text-xl');
  });

  it('applies the chosen variants and keeps extra classes', () => {
    render(<LineCode code="8000-10" tone="sign" size="lg" className="mt-2" />);

    const code = screen.getByText('8000-10');
    expect(code).toHaveClass('bg-night', 'text-led', 'text-4xl', 'mt-2');
    expect(code).not.toHaveClass('text-led-text');
  });
});
