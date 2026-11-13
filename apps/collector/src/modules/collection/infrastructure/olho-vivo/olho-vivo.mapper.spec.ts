import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Direction, LineCode } from '@transcendence/core';

import { OlhoVivoMappingError, toLineVariants, toPositions } from './olho-vivo.mapper';

/**
 * Reads a recorded Olho Vivo response from the repository fixtures.
 */
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(process.cwd(), '..', '..', 'fixtures', 'olho-vivo', `${name}.json`), 'utf8'),
  );
}

describe('toPositions', () => {
  it('converts the recorded /Posicao/Linha response', () => {
    expect(toPositions(fixture('posicao-linha-2506'))).toEqual({
      referenceClock: '00:18',
      vehicles: [
        {
          vehiclePrefix: '12601',
          observedAt: new Date('2026-11-06T03:17:27Z'),
          lat: -23.547621499999998,
          lon: -46.6407745,
          accessible: true,
        },
      ],
    });
  });

  it('returns an empty list when no bus is running', () => {
    expect(toPositions(fixture('posicao-linha-35274'))).toEqual({
      referenceClock: '00:18',
      vehicles: [],
    });
  });

  it('accepts a numeric prefix', () => {
    const body = {
      hr: '07:00',
      vs: [{ p: 12601, a: false, ta: '2026-11-06T10:00:00Z', py: -23.5, px: -46.6 }],
    };

    expect(toPositions(body).vehicles[0]?.vehiclePrefix).toBe('12601');
  });

  it('rejects responses that break the contract', () => {
    const vehicle = { p: '1', a: true, ta: '2026-11-06T10:00:00Z', py: -23.5, px: -46.6 };
    const broken = [
      null,
      { vs: [] },
      { hr: '25:00', vs: [] },
      { hr: '07:00' },
      { hr: '07:00', vs: [{ ...vehicle, ta: 'yesterday' }] },
      { hr: '07:00', vs: [{ ...vehicle, py: 200 }] },
      { hr: '07:00', vs: [{ ...vehicle, p: ' ' }] },
      { hr: '07:00', vs: [{ ...vehicle, a: 'yes' }] },
    ];

    for (const body of broken) {
      expect(() => toPositions(body)).toThrow(OlhoVivoMappingError);
    }
  });
});

describe('toLineVariants', () => {
  it('keeps both directions of the requested line from the recorded search', () => {
    const variants = toLineVariants(fixture('linha-buscar-8000'), LineCode.parse('8000-10'));

    expect(variants).toEqual([
      {
        sourceId: 1273,
        line: LineCode.of('8000', 10),
        direction: Direction.MAIN_TO_SECONDARY,
        circular: false,
        terminalMain: 'PÇA. RAMOS DE AZEVEDO',
        terminalSecondary: 'TERM. LAPA',
      },
      {
        sourceId: 34041,
        line: LineCode.of('8000', 10),
        direction: Direction.SECONDARY_TO_MAIN,
        circular: false,
        terminalMain: 'PÇA. RAMOS DE AZEVEDO',
        terminalSecondary: 'TERM. LAPA',
      },
    ]);
  });

  it('returns nothing when the search has no variant of that line', () => {
    expect(toLineVariants(fixture('linha-buscar-8000'), LineCode.parse('8000-21'))).toEqual([]);
  });

  it('rejects malformed lines', () => {
    const line = LineCode.parse('8000-10');
    const item = { cl: 1273, lc: false, lt: '8000', sl: 1, tl: 10, tp: 'A', ts: 'B' };

    expect(() => toLineVariants({}, line)).toThrow(OlhoVivoMappingError);
    expect(() => toLineVariants([{ ...item, sl: 3 }], line)).toThrow(OlhoVivoMappingError);
    expect(() => toLineVariants([{ ...item, lt: '80 00' }], line)).toThrow(OlhoVivoMappingError);
    expect(() => toLineVariants([{ ...item, cl: '1273' }], line)).toThrow(OlhoVivoMappingError);
  });
});
