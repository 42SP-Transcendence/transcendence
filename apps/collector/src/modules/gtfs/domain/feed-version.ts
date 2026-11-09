import { createHash } from 'node:crypto';

import { GTFS_FILES, type GtfsFiles } from './schedule';

/**
 * Hashes the GTFS files in a fixed order, so the same content always maps to the same feed version.
 */
export function feedContentHash(files: GtfsFiles): string {
  const hash = createHash('sha256');
  for (const file of GTFS_FILES) {
    hash.update(`${file}\n`);
    hash.update(files[file]);
  }
  return hash.digest('hex');
}
