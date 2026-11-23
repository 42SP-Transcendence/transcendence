import { WAIT_REPORT_MAX_MINUTES, waitReportSchema } from './wait-report.js';

/**
 * Returns an ISO timestamp the given number of minutes away from now.
 */
function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

const valid = {
  lineVariantId: '0193a6f2-7c1e-7d4b-9a3e-2f5c8b1d4e60',
  stopId: '340015329',
  startedAt: '2026-11-23T11:20:00-03:00',
  endedAt: '2026-11-23T11:47:00-03:00',
  outcome: 'boarded',
};

/**
 * Returns the error codes of a failed parse, one list per field.
 */
function codes(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string[]> {
  const byField: Record<string, string[]> = {};
  for (const issue of result.error?.issues ?? []) {
    const field = issue.path.join('.');
    byField[field] = [...(byField[field] ?? []), issue.message];
  }
  return byField;
}

describe('waitReportSchema', () => {
  it('parses a valid report and turns the timestamps into dates', () => {
    expect(waitReportSchema.parse(valid)).toEqual({
      ...valid,
      startedAt: new Date('2026-11-23T14:20:00Z'),
      endedAt: new Date('2026-11-23T14:47:00Z'),
    });
  });

  it('accepts both outcomes', () => {
    expect(waitReportSchema.parse({ ...valid, outcome: 'gave_up' }).outcome).toBe('gave_up');
  });

  it('reports missing fields as required', () => {
    expect(codes(waitReportSchema.safeParse({}))).toEqual({
      lineVariantId: ['line_variant_required'],
      stopId: ['stop_required'],
      startedAt: ['started_at_required'],
      endedAt: ['ended_at_required'],
      outcome: ['outcome_required'],
    });
  });

  it('rejects malformed values with a code on each field', () => {
    const result = waitReportSchema.safeParse({
      lineVariantId: 'linha-8000',
      stopId: '0',
      startedAt: '23/11/2026 11:20',
      endedAt: 42,
      outcome: 'arrived',
    });

    expect(codes(result)).toEqual({
      lineVariantId: ['line_variant_invalid'],
      stopId: ['stop_invalid'],
      startedAt: ['started_at_invalid'],
      endedAt: ['ended_at_invalid'],
      outcome: ['outcome_invalid'],
    });
  });

  it('rejects a timestamp without a time zone', () => {
    const result = waitReportSchema.safeParse({ ...valid, startedAt: '2026-11-23T11:20:00' });

    expect(codes(result)).toEqual({ startedAt: ['started_at_invalid'] });
  });

  it('rejects a stop id that is not a GTFS number', () => {
    expect(codes(waitReportSchema.safeParse({ ...valid, stopId: '34001a' }))).toEqual({
      stopId: ['stop_invalid'],
    });
  });

  it('rejects a wait that ends before or when it starts', () => {
    expect(codes(waitReportSchema.safeParse({ ...valid, endedAt: valid.startedAt }))).toEqual({
      endedAt: ['ended_before_started'],
    });
    expect(
      codes(waitReportSchema.safeParse({ ...valid, endedAt: '2026-11-23T11:00:00-03:00' })),
    ).toEqual({ endedAt: ['ended_before_started'] });
  });

  it('rejects times in the future beyond a small clock skew', () => {
    const result = waitReportSchema.safeParse({
      ...valid,
      startedAt: minutesFromNow(10),
      endedAt: minutesFromNow(30),
    });

    expect(codes(result)).toEqual({
      startedAt: ['started_in_future'],
      endedAt: ['ended_in_future'],
    });
  });

  it('tolerates a phone clock a little ahead of the server', () => {
    const result = waitReportSchema.safeParse({
      ...valid,
      startedAt: minutesFromNow(-20),
      endedAt: minutesFromNow(1),
    });

    expect(result.success).toBe(true);
  });

  it(`accepts a wait of exactly ${WAIT_REPORT_MAX_MINUTES} minutes and rejects a longer one`, () => {
    const startedAt = minutesFromNow(-WAIT_REPORT_MAX_MINUTES - 5);

    expect(
      waitReportSchema.safeParse({ ...valid, startedAt, endedAt: minutesFromNow(-5) }).success,
    ).toBe(true);
    expect(
      codes(waitReportSchema.safeParse({ ...valid, startedAt, endedAt: minutesFromNow(-4) })),
    ).toEqual({ endedAt: ['wait_too_long'] });
  });

  it('skips the cross-field rules while a field is invalid', () => {
    const result = waitReportSchema.safeParse({
      ...valid,
      outcome: 'arrived',
      endedAt: valid.startedAt,
    });

    expect(codes(result)).toEqual({ outcome: ['outcome_invalid'] });
  });
});
