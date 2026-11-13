import { COLLECTION_OUTCOMES, isCollectionOutcome } from './collection-outcome.js';

describe('CollectionOutcome', () => {
  it('lists the outcomes stored in collection_attempts', () => {
    expect(COLLECTION_OUTCOMES).toEqual([
      'ok',
      'stale',
      'empty',
      'auth_failed',
      'collector_failed',
    ]);
  });

  it('recognizes only those values', () => {
    expect(isCollectionOutcome('stale')).toBe(true);
    expect(isCollectionOutcome('timeout')).toBe(false);
  });
});
