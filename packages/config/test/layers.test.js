import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import nest from '../eslint/nest.js';

const cwd = join(import.meta.dirname, 'fixtures', 'layers');

/**
 * Lints the fixture project with the Nest config and returns the boundary errors per file.
 */
async function boundaryErrors() {
  const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: nest });
  const results = await eslint.lintFiles(['src/**/*.ts']);
  return Object.fromEntries(
    results.map((result) => [
      result.filePath.slice(cwd.length + 1),
      result.messages
        .filter((message) => message.ruleId === 'boundaries/dependencies')
        .map((message) => message.message),
    ]),
  );
}

test('an import of infrastructure inside domain fails the lint', async () => {
  const errors = await boundaryErrors();

  assert.deepEqual(errors['src/modules/sample/domain/outward.ts'], [
    'domain/ only imports domain/ (imports point inward)',
  ]);
});

test('imports that point inward pass', async () => {
  const errors = await boundaryErrors();

  assert.deepEqual(errors['src/modules/sample/domain/inward.ts'], []);
  assert.deepEqual(errors['src/modules/sample/application/use-case.ts'], []);
  assert.deepEqual(errors['src/modules/sample/infrastructure/clock.ts'], []);
});
