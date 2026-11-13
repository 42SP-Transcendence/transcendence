import { databaseUrl, EnvValidationError, parseEnv, z } from '@transcendence/schemas';

export const apiEnvSchema = z.object({
  DATABASE_URL: databaseUrl,
  API_PORT: z.coerce
    .number({ error: 'must be a port number' })
    .int('must be a port number')
    .min(1, 'must be a port between 1 and 65535')
    .max(65_535, 'must be a port between 1 and 65535')
    .default(3001),
});

export type ApiEnv = z.output<typeof apiEnvSchema>;

/**
 * Reads and validates the api environment, throwing one EnvValidationError that lists every problem.
 */
export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return parseEnv('api', apiEnvSchema, source);
}

/**
 * Validates the environment before anything starts, printing the problems and exiting with code 1 when it is invalid.
 */
export function loadApiEnvOrExit(): ApiEnv {
  try {
    return loadApiEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
