import type { ImportReport } from '../application/import-gtfs.use-case';
import { GTFS_FILES } from '../domain/schedule';

const LISTED_ISSUES = 50;

/**
 * Formats a date as YYYY-MM-DD in UTC.
 */
function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Renders the import report as plain text: the feed version, rows per file and the skipped rows with their reasons.
 */
export function formatImportReport(report: ImportReport): string {
  const lines = [`GTFS import ${report.status}`];
  if (report.version && report.feedId !== undefined) {
    lines.push(
      `Feed ${report.feedId}: sha256 ${report.version.contentHash.slice(0, 12)}, valid from ${day(report.version.validFrom)} to ${day(report.version.validTo)}`,
    );
  }
  lines.push('', `${'file'.padEnd(16)}${'rows'.padStart(10)}${'imported'.padStart(10)}`);
  for (const file of GTFS_FILES) {
    const { rows, imported } = report.files[file];
    lines.push(
      `${`${file}.txt`.padEnd(16)}${String(rows).padStart(10)}${String(imported).padStart(10)}`,
    );
  }
  lines.push('', `${report.issues.length} issue(s)`);
  for (const issue of report.issues.slice(0, LISTED_ISSUES)) {
    lines.push(`  ${issue.file}.txt line ${issue.line}: ${issue.message}`);
  }
  if (report.issues.length > LISTED_ISSUES) {
    lines.push(`  ...and ${report.issues.length - LISTED_ISSUES} more`);
  }
  return lines.join('\n');
}
