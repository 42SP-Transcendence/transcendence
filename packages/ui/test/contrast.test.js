import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const css = readFileSync(join(import.meta.dirname, '..', 'src', 'tokens.css'), 'utf8');

const TEXT = 4.5;
const NON_TEXT = 3;

const PAIRS = [
  ['ink', 'bg', TEXT],
  ['ink', 'surface', TEXT],
  ['ink', 'surface-2', TEXT],
  ['muted', 'bg', TEXT],
  ['muted', 'surface', TEXT],
  ['muted', 'surface-2', TEXT],
  ['brand', 'bg', TEXT],
  ['brand', 'surface', TEXT],
  ['button-ink', 'button', TEXT],
  ['led-ink', 'led', TEXT],
  ['led-text', 'bg', TEXT],
  ['led-text', 'surface', TEXT],
  ['alert', 'alert-soft', TEXT],
  ['alert', 'surface', TEXT],
  ['ok', 'ok-soft', TEXT],
  ['ok', 'surface', TEXT],
  ['warn', 'warn-soft', TEXT],
  ['warn', 'surface', TEXT],
  ['night-ink', 'night', TEXT],
  ['night-muted', 'night', TEXT],
  ['night-muted', 'night-2', TEXT],
  ['night-muted', 'night-3', TEXT],
  ['led', 'night', TEXT],
  ['led', 'night-2', TEXT],
  ['focus', 'bg', NON_TEXT],
  ['focus', 'surface', NON_TEXT],
  ['focus', 'surface-2', NON_TEXT],
];

/**
 * Reads the color tokens declared inside the first block that follows the given selector.
 */
function colorsAfter(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

/**
 * Returns the WCAG relative luminance of a six-digit hex color.
 */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns the WCAG contrast ratio between two hex colors.
 */
function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const light = colorsAfter('@theme');
const dark = { ...light, ...colorsAfter(":root:not([data-theme='light'])") };
const explicitDark = { ...light, ...colorsAfter(":root[data-theme='dark']") };

test('the explicit dark theme matches the system dark theme', () => {
  assert.deepEqual(explicitDark, dark);
});

for (const [name, palette] of [
  ['light', light],
  ['dark', dark],
]) {
  test(`every ${name} pair meets WCAG AA`, () => {
    const failures = PAIRS.filter(([fg, bg, minimum]) => {
      assert.ok(palette[fg] && palette[bg], `unknown token ${fg} or ${bg}`);
      return contrast(palette[fg], palette[bg]) < minimum;
    }).map(([fg, bg, minimum]) => {
      const ratio = contrast(palette[fg], palette[bg]).toFixed(2);
      return `${fg} on ${bg}: ${ratio} < ${minimum}`;
    });
    assert.deepEqual(failures, []);
  });
}
