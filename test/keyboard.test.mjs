// Doug's standing rule (2026-10-06): whenever a typing box is needed, the box and everything needed to know what
// goes in it stay visible while the on-screen keyboard is out, and the keyboard is as small as possible.
// Every page loads /js/keyboard.js (keeps the box, its label and button above the keyboard) and lets Android
// shrink the page around the keyboard (both written by `node tools/menu.mjs`); every typing box has a visible
// label and asks for the smallest keyboard that fits what's typed.
// The on-screen check is scripts/keyboard-check.mjs (Playwright, 390x640 with a 300px keyboard).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles } from '../tools/check-links.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const pages = htmlFiles(PUBLIC);
const jsFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? (e.name === 'vendor' ? [] : jsFiles(p)) : p.endsWith('.js') ? [p] : [];
});
// Pages and the scripts and generators that write typing boxes into them.
const sources = [...pages, ...jsFiles(PUBLIC), ...['tools/menu.mjs', 'tools/build-directory.py', 'build-callbacks.js'].map((f) => path.join(ROOT, f))];
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const TYPING = ['text', 'search', 'email', 'tel', 'url', 'number', 'password'];

test('every page loads the keyboard helper and lets the page shrink around the keyboard', () => {
  assert.ok(pages.length > 50);
  for (const p of pages) {
    const html = fs.readFileSync(p, 'utf8');
    assert.match(html, /<script type="module" src="\/js\/keyboard\.js(\?v=[0-9a-f]+)?"><\/script>/, p);
    assert.match(html, /<meta name="viewport" content="[^"]*interactive-widget=resizes-content/, p);
  }
});

test('every typing box asks for a small keyboard and has a visible label', () => {
  let n = 0;
  for (const f of sources) {
    const src = fs.readFileSync(f, 'utf8');
    for (const [tag] of src.matchAll(/<input\b[^>]*>/g)) {
      const type = attr(tag, 'type') ?? 'text';
      if (!TYPING.includes(type) || /\s(readonly|hidden)\b/.test(tag)) continue;
      n++;
      const where = `${path.relative(ROOT, f)}: ${tag.slice(0, 90)}`;
      assert.match(attr(tag, 'inputmode') ?? '', /^(text|search|numeric|decimal|tel|email|url)$/, where);
      assert.match(attr(tag, 'enterkeyhint') ?? '', /^(go|done|next|send|search|enter)$/, where);
      assert.equal(attr(tag, 'autocomplete'), 'off', where);
      assert.equal(attr(tag, 'autocorrect'), 'off', where);
      assert.equal(attr(tag, 'spellcheck'), 'false', where);
      assert.match(attr(tag, 'autocapitalize') ?? '', /^(off|characters|words|sentences)$/, where);
      // A label for it, or a label wrapped around it (placeholder text alone disappears while typing).
      const id = attr(tag, 'id');
      const at = src.indexOf(tag);
      const before = src.slice(0, at);
      const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
      const labelled = wrapped || (id && new RegExp(`<label\\b[^>]*\\sfor="${id}"`).test(src));
      assert.ok(labelled, `${where} has no label`);
    }
    for (const [tag] of src.matchAll(/<textarea\b[^>]*>/g)) {
      throw new Error(`${f}: a new textarea needs the keyboard attributes and a line in this test: ${tag}`);
    }
  }
  assert.ok(n > 90, `found ${n} typing boxes`);
});

test('the header search label shows when the search is opened on a small screen or a touch screen', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/theme.css'), 'utf8');
  assert.match(css, /header\.site-bar\.search-open \.site-search-label \{\s*position: static;/);
  assert.match(css, /@media \(min-width: 801px\) and \(pointer: coarse\) \{[\s\S]*?\.site-search-label \{\s*position: static;/);
});

test('the callbacks search has a visible label', () => {
  const html = fs.readFileSync(path.join(PUBLIC, 'callbacks/index.html'), 'utf8');
  assert.ok(html.includes('<label for="callback-search" class="filter-label">Search:</label>'));
});
