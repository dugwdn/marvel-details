// Marvel quiz (/quiz/): the question data is well-formed and sourced, rounds
// are shuffled fairly, scoring and ranks add up, and quiz totals sync.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRound, pointsFor, scoreRound, quizRank, shuffle, ROUND } from '../public/js/quiz-core.js';
import { emptyState, sanitize, merge } from '../public/js/members-core.js';

const read = (p) => fs.readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');
const data = JSON.parse(read('data/quiz.json'));
const tier = (id) => data.tiers.find((t) => t.id === id);

// A repeatable random number source for tests.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test('four levels from easy to insanely hard, points rising', () => {
  assert.deepEqual(data.tiers.map((t) => t.id), ['easy', 'medium', 'hard', 'inevitable']);
  assert.equal(data.tiers.at(-1).level, 'Insanely hard');
  for (let i = 1; i < data.tiers.length; i++) assert.ok(data.tiers[i].points > data.tiers[i - 1].points);
});

test('every level has enough questions for a full round, and more to spare', () => {
  for (const t of data.tiers) {
    const n = data.questions.filter((q) => q.tier === t.id).length;
    assert.ok(n >= ROUND * 2, `${t.id} has only ${n} questions`);
  }
});

test('every question is well-formed and names where to check it', () => {
  const ids = new Set();
  for (const q of data.questions) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok(tier(q.tier), `${q.id}: unknown level`);
    assert.ok(q.q.trim().endsWith('?'), `${q.id}: question should end with ?`);
    assert.equal(q.wrong.length, 3, `${q.id}: needs 3 wrong answers`);
    assert.equal(new Set([q.a, ...q.wrong]).size, 4, `${q.id}: answers must all differ`);
    assert.ok(q.why && q.note, `${q.id}: needs an explanation and a scene note`);
    const film = data.films[q.film];
    assert.ok(film, `${q.id}: film "${q.film}" missing from films`);
    assert.match(film.url, /^https:\/\/en\.wikipedia\.org\/wiki\//);
  }
  assert.equal(new Set(data.questions.map((q) => q.q)).size, data.questions.length, 'no question asked twice');
});

test('a round has 10 questions of one level, shuffled, with the right answer marked', () => {
  const r = buildRound(data, 'hard', seeded(7));
  assert.equal(r.length, ROUND);
  assert.ok(r.every((q) => q.tier === 'hard'));
  assert.equal(new Set(r.map((q) => q.id)).size, ROUND);
  for (const q of r) assert.equal(q.choices[q.answer], q.a);
  const r2 = buildRound(data, 'hard', seeded(99));
  assert.notDeepEqual(r.map((q) => q.id), r2.map((q) => q.id), 'different seeds give different orders');
});

test('the right answer is not stuck in one spot', () => {
  const spots = [0, 0, 0, 0];
  const rand = seeded(3);
  for (let i = 0; i < 200; i++) for (const q of buildRound(data, 'easy', rand)) spots[q.answer]++;
  for (const n of spots) assert.ok(n > 300, `answer positions uneven: ${spots}`);
});

test('shuffle keeps every item', () => {
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], seeded(1)).sort(), [1, 2, 3, 4, 5]);
});

test('scoring: base points, streak bonus from the third in a row, perfect bonus', () => {
  const t = tier('medium'); // 20 a question
  assert.equal(pointsFor(t, false, 0), 0);
  assert.equal(pointsFor(t, true, 1), 20);
  assert.equal(pointsFor(t, true, 3), 30);
  const some = scoreRound(t, [true, true, true, false, true]);
  assert.deepEqual(some, { points: 20 + 20 + 30 + 0 + 20, right: 4, total: 5, bestStreak: 3, perfect: false });
  const all = scoreRound(t, Array(10).fill(true));
  assert.equal(all.points, 20 + 20 + 8 * 30 + 5 * 20);
  assert.ok(all.perfect);
  assert.equal(scoreRound(t, Array(10).fill(false)).points, 0);
});

test('quiz ranks: from Recruit at 0 to Inevitable at the top', () => {
  assert.equal(quizRank(0, data.ranks).current.title, 'Recruit');
  assert.equal(quizRank(99, data.ranks).toNext, 1);
  assert.equal(quizRank(100, data.ranks).current.title, 'Trainee');
  const top = quizRank(1e9, data.ranks);
  assert.equal(top.current.title, 'Inevitable');
  assert.equal(top.next, null);
  const mins = data.ranks.map((r) => r.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
});

test('quiz totals are kept in member data and merge by keeping the larger number', () => {
  assert.deepEqual(emptyState().quiz, { points: 0, games: 0, best: {} });
  const a = emptyState();
  a.quiz = { points: 500, games: 4, best: { easy: 150, hard: 40 } };
  const b = emptyState();
  b.quiz = { points: 300, games: 6, best: { easy: 100, medium: 220 } };
  assert.deepEqual(merge(a, b).quiz, { points: 500, games: 6, best: { easy: 150, hard: 40, medium: 220 } });
  assert.deepEqual(sanitize({ quiz: { points: -5, games: 'x', best: { 'BAD KEY': 9, easy: 3.7 } } }).quiz, { points: 0, games: 0, best: { easy: 3 } });
});

test('the quiz page is server-rendered with a real title, description, menu and back arrow', () => {
  const html = read('quiz/index.html');
  assert.match(html, /<title>Marvel Quiz[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/mcueastereggs\.com\/quiz\/">/);
  assert.match(html, /<h1>[^<]*Marvel Quiz/);
  assert.match(html, /class="back-button"/);
  assert.match(html, /<a href="\/quiz\/" aria-current="page">Quiz<\/a>/);
  for (const t of data.tiers) assert.ok(html.includes(`data-tier="${t.id}"`), `level button ${t.id}`);
  assert.match(read('sitemap.xml'), /mcueastereggs\.com\/quiz\//);
});

test('the menu has a Quiz button on every page and About is still linked', () => {
  const html = read('index.html');
  assert.match(html, /<a href="\/quiz\/">Quiz<\/a>/);
  assert.match(html, /href="\/about"/);
});
