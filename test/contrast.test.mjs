// Keeps the site readable: checks the contrast of the main color pairs in
// public/css/theme.css against WCAG AA (4.5:1 for normal text, 3:1 for large
// text or UI parts). The color variables are read from the CSS itself, so
// changing a token to something hard to read fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/css/theme.css', import.meta.url), 'utf8');

const lum = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [0, 2, 4].map((i) => f(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

function tokens(block) {
  const out = {};
  for (const [, k, v] of block.matchAll(/(--dym-[\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) out[k] = v;
  return out;
}
const light = tokens(css.match(/:root\s*\{([^}]*)\}/)[1]);
const dark = { ...light, ...tokens(css.match(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/)[1]) };

// [name, text, background, minimum]
const fixed = [
  ['ink on yellow (comic boxes, current menu page, Save pressed)', '#111111', '#ffd60a', 4.5],
  ['white on red-dark (badges, buttons)', '#ffffff', light['--dym-red-dark'], 4.5],
  ['member chip: white text on near-black', '#ffffff', '#111111', 4.5],
  ['member chip: yellow numbers on near-black', '#ffd60a', '#111111', 4.5],
  ['search box: ink on white', '#111111', '#ffffff', 4.5],
  ['search box: placeholder on white', '#4a4a55', '#ffffff', 4.5],
  ['search result kind label on white', '#8e1620', '#ffffff', 4.5],
  ['search result kind label on selected (yellow)', '#8e1620', '#ffd60a', 4.5],
  ['footer text on footer dark', '#c9c9d4', '#14141f', 4.5],
  ['footer links on footer dark', '#ffffff', '#14141f', 4.5],
  ['footer heading yellow on footer dark', '#ffd60a', '#14141f', 4.5],
  ['spoiler label white on near-black', '#ffffff', '#111111', 4.5],
  ['comic panel red links on white', '#b3202b', '#ffffff', 4.5],
  ['map glass text on dark glass', '#cfe9f5', '#071726', 4.5],
  ['map glass headings on dark glass', '#9be6ff', '#071726', 4.5],
];
for (const [name, fg, bg, min] of fixed) {
  test(`contrast: ${name}`, () => {
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
  });
}

for (const [mode, t] of [['light', light], ['dark', dark]]) {
  const pairs = [
    ['text on page', '--dym-text', '--dym-bg'],
    ['text on card', '--dym-text', '--dym-surface'],
    ['text on raised card', '--dym-text', '--dym-surface-2'],
    ['muted text on page', '--dym-muted', '--dym-bg'],
    ['muted text on card', '--dym-muted', '--dym-surface'],
    ['muted text on raised card', '--dym-muted', '--dym-surface-2'],
    ['links on page', '--dym-link', '--dym-bg'],
    ['links on card', '--dym-link', '--dym-surface'],
    ['links on raised card', '--dym-link', '--dym-surface-2'],
  ];
  for (const [name, fg, bg] of pairs) {
    test(`contrast (${mode}): ${name}`, () => {
      assert.ok(t[fg] && t[bg], `${fg} or ${bg} missing from theme.css`);
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `${t[fg]} on ${t[bg]} is ${r.toFixed(2)}:1, needs 4.5:1`);
    });
  }
}

test('contrast: every menu button color holds white text (the current page holds ink on yellow)', () => {
  const colors = [...css.matchAll(/nav\.site-nav a(?::nth-child\([^)]*\))?\s*\{[^}]*--hero:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);
  assert.ok(colors.length >= 9, `found only ${colors.length} menu colors`);
  for (const c of colors) {
    if (c.toLowerCase() === '#ffd60a') continue;
    assert.ok(ratio('#ffffff', c) >= 4.5, `white on menu button ${c} is ${ratio('#ffffff', c).toFixed(2)}:1`);
  }
});

test('contrast: red used as text is always --dym-link, never the brighter --dym-red', () => {
  const bad = css.split('\n').filter((l) => /(^|[\s;{])color:\s*var\(--dym-red\)/.test(l));
  assert.deepEqual(bad, [], 'use var(--dym-link) for red text');
});

test('contrast: no text smaller than 14px is set in theme.css', () => {
  const small = [...css.matchAll(/(?:font-size:\s*|font:\s*[\w ]*?\s)(\d*\.?\d+)rem/g)].filter((m) => parseFloat(m[1]) < 0.875).map((m) => m[0]);
  assert.deepEqual(small, [], 'body text and labels are 14px (.875rem) or larger');
});
