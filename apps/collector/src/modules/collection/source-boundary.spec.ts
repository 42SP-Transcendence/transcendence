import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE = join(process.cwd(), 'src');
const OLHO_VIVO = join('modules', 'collection', 'infrastructure', 'olho-vivo');
const SPTRANS_FIELD =
  /\.(?:py|px|ta|hr|vs|cl|lt|tl|sl|tp|ts|lc)\b|\[['"](?:py|px|ta|hr|vs|cl|lt|tl|sl|tp|ts|lc)['"]\]/;

/**
 * Lists every TypeScript file under a folder.
 */
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return files(path);
    }
    return path.endsWith('.ts') ? [path] : [];
  });
}

describe('Olho Vivo boundary', () => {
  it('keeps SPTrans field names inside infrastructure/olho-vivo', () => {
    const leaks = files(SOURCE)
      .map((path) => relative(SOURCE, path))
      .filter((path) => !path.startsWith(OLHO_VIVO) && !path.endsWith('.spec.ts'))
      .filter((path) => SPTRANS_FIELD.test(readFileSync(join(SOURCE, path), 'utf8')));

    expect(leaks).toEqual([]);
  });

  it('would catch a leak', () => {
    expect(SPTRANS_FIELD.test('const lat = body.py;')).toBe(true);
    expect(SPTRANS_FIELD.test("const clock = body['hr'];")).toBe(true);
    expect(SPTRANS_FIELD.test('const lat = position.lat;')).toBe(false);
  });
});
