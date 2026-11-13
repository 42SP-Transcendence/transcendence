import { databaseUrl, EnvValidationError, parseEnv, requiredText, z } from '@transcendence/schemas';

export const databaseEnvSchema = z.object({ DATABASE_URL: databaseUrl });

export const collectorEnvSchema = databaseEnvSchema.extend({
  SPTRANS_API_TOKEN: requiredText().regex(
    /^[0-9a-f]{64}$/i,
    'must be the 64-character hexadecimal token from the SPTrans developer portal',
  ),
});

export type CollectorEnv = z.output<typeof collectorEnvSchema>;

/**
 * Reads and validates what the collector needs to poll the Olho Vivo API and store the results.
 */
export function loadCollectorEnv(source: NodeJS.ProcessEnv = process.env): CollectorEnv {
  return parseEnv('collector', collectorEnvSchema, source);
}

/**
 * Reads and validates only the database connection, for entry points that never call the Olho Vivo API.
 */
export function loadDatabaseEnv(
  source: NodeJS.ProcessEnv = process.env,
): z.output<typeof databaseEnvSchema> {
  return parseEnv('collector', databaseEnvSchema, source);
}

/**
 * Runs a loader before anything starts, printing the problems and exiting with code 1 when the environment is invalid.
 */
export function orExit<T>(load: () => T): T {
  try {
    return load();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
