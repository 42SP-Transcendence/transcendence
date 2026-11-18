const STALE_AFTER_MS = 3 * 60_000;

export type PositionsOutcome = 'ok' | 'stale' | 'empty';

/**
 * Classifies a valid answer: no buses is empty, buses whose newest position is over three minutes old are stale, anything else is ok.
 */
export function classifyPositions(observedAt: Date[], requestedAt: Date): PositionsOutcome {
  if (observedAt.length === 0) {
    return 'empty';
  }
  const newest = Math.max(...observedAt.map((instant) => instant.getTime()));
  return requestedAt.getTime() - newest > STALE_AFTER_MS ? 'stale' : 'ok';
}
