import { z } from 'zod';

export class EnvValidationError extends Error {
  /**
   * Lists every invalid or missing variable of a service, without echoing any value.
   */
  constructor(
    readonly service: string,
    readonly problems: string[],
  ) {
    super(
      [
        `Invalid environment for ${service}:`,
        ...problems.map((problem) => `  - ${problem}`),
        'Compare your .env with .env.example.',
      ].join('\n'),
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Builds a required text variable whose message says only whether it is missing or empty.
 */
export function requiredText(): z.ZodString {
  return z.string({ error: 'is required' }).min(1, { error: 'is required', abort: true });
}

export const databaseUrl = requiredText().regex(
  /^postgres(ql)?:\/\/.+/,
  'must be a postgresql:// connection URL',
);

/**
 * Validates environment variables against a schema and returns the parsed values, or throws one error listing every problem.
 */
export function parseEnv<T extends z.ZodType>(
  service: string,
  schema: T,
  source: Record<string, string | undefined>,
): z.output<T> {
  const result = schema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  throw new EnvValidationError(
    service,
    result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  );
}
