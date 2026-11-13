import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EnvValidationError } from '@transcendence/schemas';

import { apiEnvSchema, loadApiEnv } from './env';

const DATABASE_URL = 'postgresql://transcendence:secret-password@postgres:5432/transcendence';

/**
 * Returns the error thrown by loading the given environment.
 */
function failure(source: NodeJS.ProcessEnv): EnvValidationError {
  try {
    loadApiEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected the environment to be rejected');
}

describe('loadApiEnv', () => {
  it('parses a valid environment and defaults the port', () => {
    expect(loadApiEnv({ DATABASE_URL })).toEqual({ DATABASE_URL, API_PORT: 3001 });
    expect(loadApiEnv({ DATABASE_URL, API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  it('explains a missing DATABASE_URL', () => {
    expect(failure({}).message).toBe(
      [
        'Invalid environment for api:',
        '  - DATABASE_URL: is required',
        'Compare your .env with .env.example.',
      ].join('\n'),
    );
    expect(failure({ DATABASE_URL: '' }).problems).toEqual(['DATABASE_URL: is required']);
  });

  it('lists every problem at once without echoing values', () => {
    const error = failure({
      DATABASE_URL: 'mysql://root:secret-password@db/app',
      API_PORT: '99999',
    });

    expect(error.problems).toEqual([
      'DATABASE_URL: must be a postgresql:// connection URL',
      'API_PORT: must be a port between 1 and 65535',
    ]);
    expect(error.message).not.toContain('secret-password');
  });

  it('declares every variable in .env.example', () => {
    const example = readFileSync(join(process.cwd(), '..', '..', '.env.example'), 'utf8');
    const declared = new Set(example.split('\n').map((line) => line.split('=')[0]?.trim()));

    expect(Object.keys(apiEnvSchema.shape).filter((key) => !declared.has(key))).toEqual([]);
  });
});
