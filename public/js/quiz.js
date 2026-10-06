// The Marvel quiz page (/quiz/). Pick a level, answer 10 shuffled questions,
// see why after each one, then get points and a quiz rank at the end.
// Scoring and shuffling live in quiz-core.js (tested); totals are kept by
// members.js (this device, synced to the account when signed in).
import { buildRound, pointsFor, scoreRound, quizRank } from './quiz-core.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const signedIn = () => { try { return localStorage.getItem('dym-signed-in') === '1'; } catch { return false; } };
const members = () => window.dymMembers;
const lifetime = () => (members() ? members().state.quiz.points : 0);
const track = (name, params) => { try { window.gtag && window.gtag('event', name, params); } catch { /* ignore */ } };

let data = null;
let tier = null;
let round = [];
let at = 0;
let results = [];
let streak = 0;
let score = 0;
let timer = null;
let deadline = 0;

function show(id) {
  for (const s of ['quiz-start', 'quiz-play', 'quiz-end']) $(s).hidden = s !== id;
  $(id).querySelector('h2, .quiz-q')?.focus({ preventScroll: true });
  $(id).scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function start(tierId) {
  tier = data.tiers.find((t) => t.id === tierId);
  if (!tier) return;
  round = buildRound(data, tier.id);
  at = 0; results = []; streak = 0; score = 0;
  $('quiz-level').textContent = `${tier.name} · ${tier.level}`;
  show('quiz-play');
  ask();
  track('quiz_start', { quiz_level: tier.id });
}

function ask() {
  const q = round[at];
  $('quiz-count').textContent = `Question ${at + 1} of ${round.length}`;
  $('quiz-score').textContent = score;
  $('quiz-streak').textContent = streak;
  $('quiz-question').textContent = q.q;
  const film = data.films[q.film];
  $('quiz-film').textContent = film ? `From ${film.title}` : '';
  $('quiz-choices').innerHTML = q.choices.map((c, i) =>
    `<li><button type="button" class="quiz-choice" data-i="${i}"><span class="quiz-letter" aria-hidden="true">${'ABCD'[i]}</span> ${esc(c)}</button></li>`).join('');
  $('quiz-choices').querySelectorAll('.quiz-choice').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));
  $('quiz-feedback').hidden = true;
  $('quiz-question').focus({ preventScroll: true });
  startTimer();
}

function startTimer() {
  clearInterval(timer);
  const bar = $('quiz-timer');
  if (!tier.seconds) { bar.hidden = true; return; }
  bar.hidden = false;
  deadline = Date.now() + tier.seconds * 1000;
  const tick = () => {
    const left = Math.max(0, deadline - Date.now());
    bar.querySelector('span').style.width = `${(left / (tier.seconds * 1000)) * 100}%`;
    $('quiz-time').textContent = Math.ceil(left / 1000);
    if (!left) answer(-1);
  };
  tick();
  timer = setInterval(tick, 200);
}

function answer(i) {
  clearInterval(timer);
  const q = round[at];
  const buttons = $('quiz-choices').querySelectorAll('.quiz-choice');
  if (buttons[0]?.disabled) return; // already answered
  const ok = i === q.answer;
  streak = ok ? streak + 1 : 0;
  const pts = pointsFor(tier, ok, streak);
  score += pts;
  results.push(ok);
  buttons.forEach((b, n) => {
    b.disabled = true;
    if (n === q.answer) b.classList.add('is-right');
    else if (n === i) b.classList.add('is-wrong');
  });
  $('quiz-score').textContent = score;
  $('quiz-streak').textContent = streak;
  const film = data.films[q.film];
  const head = ok
    ? `Right! +${pts}${pts > tier.points ? ' (streak bonus)' : ''}`
    : (i === -1 ? 'Out of time.' : 'Not quite.');
  $('quiz-verdict').textContent = head;
  $('quiz-verdict').className = `quiz-verdict ${ok ? 'is-right' : 'is-wrong'}`;
  $('quiz-answer').innerHTML = `Answer: <strong>${esc(q.a)}</strong>`;
  $('quiz-why').textContent = q.why;
  $('quiz-source').innerHTML = film
    ? `Where to check: ${esc(film.title)}, ${esc(q.note)} <a href="${esc(film.url)}" rel="nofollow noopener" target="_blank">About the film</a>`
    : esc(q.note);
  $('quiz-next').textContent = at + 1 < round.length ? 'Next question' : 'See my score';
  $('quiz-feedback').hidden = false;
  $('quiz-next').focus({ preventScroll: true });
}

function next() {
  at += 1;
  if (at < round.length) ask();
  else finish();
}

function finish() {
  const r = scoreRound(tier, results);
  const before = quizRank(lifetime(), data.ranks);
  members()?.addQuizResult(tier.id, r.points);
  const total = members() ? lifetime() : r.points;
  const after = quizRank(total, data.ranks);
  $('quiz-end-points').textContent = r.points.toLocaleString();
  $('quiz-end-right').textContent = `${r.right} of ${r.total} right · best streak ${r.bestStreak}${r.perfect ? ' · perfect round bonus!' : ''}`;
  $('quiz-end-rank').textContent = after.current.title;
  $('quiz-end-total').textContent = total.toLocaleString();
  $('quiz-end-up').hidden = after.index <= before.index;
  $('quiz-end-up').innerHTML = `Promoted! You're now <strong>${esc(after.current.title)}</strong>.`;
  $('quiz-end-next').innerHTML = after.next
    ? `<strong>${after.toNext.toLocaleString()}</strong> more points to reach <strong>${esc(after.next.title)}</strong>.`
    : 'Top quiz rank. Nothing left to prove.';
  const bar = $('quiz-end-bar');
  bar.setAttribute('aria-valuenow', Math.round(after.progress * 100));
  bar.querySelector('span').style.width = `${Math.round(after.progress * 100)}%`;
  $('quiz-save').hidden = signedIn();
  const harder = data.tiers[data.tiers.indexOf(tier) + 1];
  $('quiz-harder').hidden = !harder || r.right < Math.ceil(r.total * 0.7);
  if (harder) { $('quiz-harder').textContent = `Try ${harder.name} (${harder.level})`; $('quiz-harder').dataset.tier = harder.id; }
  show('quiz-end');
  track('quiz_complete', { quiz_level: tier.id, score: r.points, correct: r.right });
}

async function init() {
  try {
    data = await fetch('/data/quiz.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error('quiz.json'))));
  } catch {
    $('quiz-error').hidden = false;
    return;
  }
  document.querySelectorAll('[data-tier]').forEach((b) => {
    b.disabled = false;
    b.addEventListener('click', () => start(b.dataset.tier));
  });
  $('quiz-next').addEventListener('click', next);
  $('quiz-again').addEventListener('click', () => start(tier.id));
  $('quiz-pick').addEventListener('click', () => show('quiz-start'));
  $('quiz-quit').addEventListener('click', () => { clearInterval(timer); show('quiz-start'); });
}
init();
