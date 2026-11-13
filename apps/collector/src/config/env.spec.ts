import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EnvValidationError } from '@transcendence/schemas';

import { collectorEnvSchema, loadCollectorEnv, loadDatabaseEnv } from './env';

const DATABASE_URL = 'postgresql://transcendence:change-me@postgres:5432/transcendence';
const SPTRANS_API_TOKEN = 'ab'.repeat(32);

/**
 * Returns the problems found when loading the collector environment.
 */
function problems(source: NodeJS.ProcessEnv): string[] {
  try {
    loadCollectorEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe('collector environment', () => {
  it('accepts the database URL and a 64-character hexadecimal token', () => {
    expect(loadCollectorEnv({ DATABASE_URL, SPTRANS_API_TOKEN })).toEqual({
      DATABASE_URL,
      SPTRANS_API_TOKEN,
    });
  });

  it('requires the token, as left empty in .env.example', () => {
    expect(problems({ DATABASE_URL, SPTRANS_API_TOKEN: '' })).toEqual([
      'SPTRANS_API_TOKEN: is required',
    ]);
  });

  it('rejects a malformed token without echoing it', () => {
    const malformed = 'not-a-token-but-still-secret';
    let message = '';
    try {
      loadCollectorEnv({ DATABASE_URL, SPTRANS_API_TOKEN: malformed });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(
      'SPTRANS_API_TOKEN: must be the 64-character hexadecimal token from the SPTrans developer portal',
    );
    expect(message).not.toContain(malformed);
  });

  it('lets the GTFS import run with the database alone', () => {
    expect(loadDatabaseEnv({ DATABASE_URL })).toEqual({ DATABASE_URL });
    expect(problems({})).toEqual(['DATABASE_URL: is required', 'SPTRANS_API_TOKEN: is required']);
  });

  it('declares every variable in .env.example', () => {
    const example = readFileSync(join(process.cwd(), '..', '..', '.env.example'), 'utf8');
    const declared = new Set(example.split('\n').map((line) => line.split('=')[0]?.trim()));

    expect(Object.keys(collectorEnvSchema.shape).filter((key) => !declared.has(key))).toEqual([]);
  });
});
