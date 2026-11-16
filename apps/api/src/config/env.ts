import { databaseUrl, EnvValidationError, parseEnv, z } from '@transcendence/schemas';

/**
 * Builds a port variable that falls back to the given default when absent.
 */
function port(fallback: number) {
  return z.coerce
    .number({ error: 'must be a port number' })
    .int('must be a port number')
    .min(1, 'must be a port between 1 and 65535')
    .max(65_535, 'must be a port between 1 and 65535')
    .default(fallback);
}

const optionalText = z
  .string()
  .optional()
  .transform((value) => value || undefined);

export const apiEnvSchema = z.object({
  DATABASE_URL: databaseUrl,
  API_PORT: port(3001),
  SMTP_HOST: z.string().min(1, 'is required').default('localhost'),
  SMTP_PORT: port(1025),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: z
    .string()
    .min(1, 'is required')
    .default('Observatório dos Ônibus <nao-responda@observatorio.local>'),
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
