import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { AuthRequestError } from './auth-client';

const fieldCodes: Record<string, string> = { email_taken: 'email' };

/**
 * Puts an API error on the form: field issues and field-specific codes go to their inputs, the rest to the root alert.
 */
export function applyServerError<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  const failure = error instanceof AuthRequestError ? error : null;
  const code = failure?.code ?? 'unexpected_error';
  const issues = (failure?.issues ?? []).filter((issue) => fields.includes(issue.field as Path<T>));
  const fieldOfCode = fieldCodes[code];
  if (fieldOfCode && fields.includes(fieldOfCode as Path<T>)) {
    issues.push({ field: fieldOfCode, code });
  }
  if (issues.length === 0) {
    setError('root.server', { type: 'server', message: code });
    return;
  }
  const ordered = fields.flatMap((field) => issues.filter((issue) => issue.field === field));
  ordered.forEach((issue, index) => {
    setError(
      issue.field as Path<T>,
      { type: 'server', message: issue.code },
      { shouldFocus: index === 0 },
    );
  });
}
