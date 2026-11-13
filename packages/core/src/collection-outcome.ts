export const COLLECTION_OUTCOMES = [
  'ok',
  'stale',
  'empty',
  'auth_failed',
  'collector_failed',
] as const;

export type CollectionOutcome = (typeof COLLECTION_OUTCOMES)[number];

/**
 * Tells whether a text is one of the collection outcomes, such as a value read back from the database.
 */
export function isCollectionOutcome(value: string): value is CollectionOutcome {
  return (COLLECTION_OUTCOMES as readonly string[]).includes(value);
}
