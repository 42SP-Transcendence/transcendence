import { z } from 'zod';

export const WAIT_REPORT_MAX_MINUTES = 180;
export const WAIT_REPORT_CLOCK_SKEW_SECONDS = 120;
export const WAIT_OUTCOMES = ['boarded', 'gave_up'] as const;

/**
 * Builds the error map that tells a missing field apart from an invalid one.
 */
function requiredOr(required: string, invalid: string): z.core.$ZodErrorMap {
  return (issue) => (issue.input === undefined ? required : invalid);
}

/**
 * Builds the schema for an ISO 8601 timestamp with a time zone, parsed into a Date.
 */
function timestampSchema(field: 'started_at' | 'ended_at') {
  return z
    .string({ error: requiredOr(`${field}_required`, `${field}_invalid`) })
    .pipe(z.iso.datetime({ offset: true, abort: true, error: `${field}_invalid` }))
    .transform((value) => new Date(value));
}

export const waitReportSchema = z
  .object({
    lineVariantId: z
      .string({ error: requiredOr('line_variant_required', 'line_variant_invalid') })
      .pipe(z.uuid({ error: 'line_variant_invalid' })),
    stopId: z
      .string({ error: requiredOr('stop_required', 'stop_invalid') })
      .regex(/^[1-9]\d{0,17}$/, { abort: true, error: 'stop_invalid' }),
    startedAt: timestampSchema('started_at'),
    endedAt: timestampSchema('ended_at'),
    outcome: z.enum(WAIT_OUTCOMES, { error: requiredOr('outcome_required', 'outcome_invalid') }),
  })
  .superRefine(({ startedAt, endedAt }, ctx) => {
    const latest = Date.now() + WAIT_REPORT_CLOCK_SKEW_SECONDS * 1000;
    if (startedAt.getTime() > latest) {
      ctx.addIssue({ code: 'custom', path: ['startedAt'], message: 'started_in_future' });
    }
    if (endedAt.getTime() > latest) {
      ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'ended_in_future' });
    }
    if (endedAt.getTime() <= startedAt.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'ended_before_started' });
    } else if (endedAt.getTime() - startedAt.getTime() > WAIT_REPORT_MAX_MINUTES * 60 * 1000) {
      ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'wait_too_long' });
    }
  });

export type WaitOutcome = (typeof WAIT_OUTCOMES)[number];
export type WaitReportInput = z.input<typeof waitReportSchema>;
export type WaitReport = z.output<typeof waitReportSchema>;
