// Scene trivia and fan theories (ADR-018).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, terms } from '../public/js/trivia-core.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const trivia = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/trivia.json'), 'utf8'));
const KINDS = ['Scene details', 'MCU connections', 'Comics references', 'Behind the scenes', 'Pop culture', 'Episode titles'];

test('every trivia fact has an id, a known kind and a source', () => {
  assert.ok(trivia.works.length >= 50, 'expected most MCU films and shows');
  assert.equal(trivia.license, 'CC BY-SA 3.0');
  const ids = new Set();
  for (const w of trivia.works) {
    assert.match(w.slug, /^[a-z0-9-]+$/);
    assert.ok(w.source.startsWith('https://marvelcinematicuniverse.fandom.com/wiki/') || w.facts.every(f => f.source), `${w.work} has no source`);
    for (const f of w.facts) {
      assert.ok(!ids.has(f.id), `duplicate id ${f.id}`);
      ids.add(f.id);
      assert.ok(KINDS.includes(f.kind), `${f.id} kind ${f.kind}`);
      assert.ok(f.text.length >= 30 && !/\[\d+\]/.test(f.text), `${f.id} text`);
      if (f.source) assert.match(f.source, /^https:\/\//);
    }
  }
});

test('every film and show has its trivia page, with its facts and the credit link', () => {
  for (const w of trivia.works) {
    const html = fs.readFileSync(path.join(ROOT, 'trivia', `${w.slug}.html`), 'utf8');
    assert.ok(html.includes(`id="${w.facts[0].id}"`), `${w.slug} is missing its first fact`);
    assert.ok(html.includes('href="/credits#trivia"'), `${w.slug} has no license link`);
    assert.ok(/<h1>[^<]+<\/h1>/.test(html));
  }
  const credits = fs.readFileSync(path.join(ROOT, 'credits.html'), 'utf8');
  assert.ok(credits.includes('id="trivia"') && credits.includes(trivia.license), 'credits page names the trivia license');
});

test('the ask box has a visible label and asks for a small keyboard', () => {
  const html = fs.readFileSync(path.join(ROOT, 'trivia/index.html'), 'utf8');
  assert.match(html, /<label class="tv-ask-label" for="tv-q">/);
  const input = html.match(/<input id="tv-q"[^>]*>/)[0];
  for (const a of ['inputmode="search"', 'enterkeyhint="search"', 'autocomplete="off"', 'autocorrect="off"', 'autocapitalize="off"', 'spellcheck="false"']) assert.ok(input.includes(a), a);
});

test('asking: words match only at the start of a word, and natural questions still answer', () => {
  assert.deepEqual(terms('What time was it on the clock?'), ['time', 'clock']);
  const shawarma = ask(trivia, 'shawarma');
  assert.ok(shawarma.length > 0 && shawarma.every(a => /shawarma/i.test(a.fact.text)));
  assert.ok(ask(trivia, 'thor').every(a => /\bthor/i.test(a.fact.text + ' ' + a.work.work)), '"thor" must never match inside "authority"');
  const plate = ask(trivia, 'what license plate is on the car');
  assert.ok(plate.length && !plate[0].close && /license plate/i.test(plate[0].fact.text));
  assert.deepEqual(ask(trivia, 'the of and'), []);
});

const theoriesFile = path.join(ROOT, 'data/theories.json');
test('every fan theory is sourced and every verdict is backed', { skip: !fs.existsSync(theoriesFile) }, () => {
  const { theories } = JSON.parse(fs.readFileSync(theoriesFile, 'utf8'));
  assert.ok(theories.length >= 20);
  const ids = new Set();
  for (const t of theories) {
    assert.match(t.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`);
    ids.add(t.id);
    assert.ok(['open', 'partly', 'confirmed', 'debunked'].includes(t.status), `${t.id} status`);
    if (t.status !== 'open') assert.match(t.status_source || '', /^https:\/\//, `${t.id}: a ${t.status} verdict needs a source`);
    assert.ok(t.evidence?.length >= 2, `${t.id} needs at least two clues`);
    for (const e of t.evidence) assert.match(e.source || '', /^https:\/\//, `${t.id} clue without a source`);
    assert.ok(t.against?.length >= 1, `${t.id} needs a case against`);
    if (t.origin?.origin_url) assert.match(t.origin.origin_url, /^https:\/\//);
    const html = fs.readFileSync(path.join(ROOT, 'theories', `${t.id}.html`), 'utf8');
    assert.ok(html.includes('class="th-board"'), `${t.id} page has no evidence board`);
  }
});
