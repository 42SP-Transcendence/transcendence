import type { ImportReport } from '../application/import-gtfs.use-case';
import { formatImportReport } from './import-report';

/**
 * Builds a report with the same row counts for every file.
 */
function report(overrides: Partial<ImportReport>): ImportReport {
  const counts = { rows: 2, imported: 2 };
  return {
    status: 'imported',
    files: {
      calendar: counts,
      frequencies: counts,
      routes: counts,
      stop_times: counts,
      stops: counts,
      trips: counts,
    },
    issues: [],
    ...overrides,
  };
}

describe('formatImportReport', () => {
  it('shows the feed version and the rows of each file', () => {
    const text = formatImportReport(
      report({
        feedId: 3,
        version: {
          contentHash: 'abcdef0123456789',
          validFrom: new Date('2023-10-01T00:00:00Z'),
          validTo: new Date('2027-06-01T00:00:00Z'),
        },
      }),
    );

    expect(text).toContain('GTFS import imported');
    expect(text).toContain('Feed 3: sha256 abcdef012345, valid from 2023-10-01 to 2027-06-01');
    expect(text).toMatch(/stop_times\.txt\s+2\s+2/);
    expect(text).toContain('0 issue(s)');
  });

  it('lists at most 50 issues and counts the rest', () => {
    const issues = Array.from({ length: 52 }, (_, i) => ({
      file: 'stops' as const,
      line: i + 2,
      message: 'invalid stop_lat "x"',
    }));

    const text = formatImportReport(report({ status: 'rejected', issues }));

    expect(text).toContain('stops.txt line 2: invalid stop_lat "x"');
    expect(text).not.toContain('line 53');
    expect(text).toContain('...and 2 more');
  });
});
