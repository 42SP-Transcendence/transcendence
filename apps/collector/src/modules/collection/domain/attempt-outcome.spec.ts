import { classifyPositions } from './attempt-outcome';

describe('classifyPositions', () => {
  const requestedAt = new Date('2026-11-18T15:00:00Z');

  it('is empty when the line has no bus running', () => {
    expect(classifyPositions([], requestedAt)).toBe('empty');
  });

  it('is ok when the newest position is at most three minutes old', () => {
    expect(
      classifyPositions(
        [new Date('2026-11-18T14:50:00Z'), new Date('2026-11-18T14:57:00Z')],
        requestedAt,
      ),
    ).toBe('ok');
  });

  it('is stale when even the newest position is over three minutes old', () => {
    expect(
      classifyPositions(
        [new Date('2026-11-18T14:40:00Z'), new Date('2026-11-18T14:56:59Z')],
        requestedAt,
      ),
    ).toBe('stale');
  });

  it('does not flag one lagging bus when another one is fresh', () => {
    expect(
      classifyPositions(
        [new Date('2026-11-18T13:00:00Z'), new Date('2026-11-18T14:59:30Z')],
        requestedAt,
      ),
    ).toBe('ok');
  });
});
