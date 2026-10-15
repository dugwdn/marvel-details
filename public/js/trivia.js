// "Ask about any scene" on /trivia/ (ADR-018). Loads /data/trivia.json once and
// answers in the browser: no server, no account, nothing sent anywhere.
// Matching rules live in trivia-core.js (tested by test/trivia.test.mjs).
import { ask, terms } from './trivia-core.js';

const form = document.querySelector('[data-trivia-ask]');
const input = document.getElementById('tv-q');
const list = document.querySelector('[data-trivia-results]');
const status = document.querySelector('[data-trivia-status]');
const chips = document.querySelector('[data-trivia-chips]');
const moreWrap = document.querySelector('[data-trivia-more-wrap]');
const more = document.querySelector('[data-trivia-more]');
const PAGE = 20;
let data = null, answers = [], shown = 0, kind = '';

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function mark(text, words) {
  let html = esc(text);
  for (const w of words) html = html.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\p{L}\\p{N}']*)`, 'giu'), '$1<mark>$2</mark>');
  return html;
}

async function load() {
  if (!data) data = await (await fetch('/data/trivia.json')).json();
  return data;
}

function render(reset) {
  const q = input.value.trim();
  if (reset) { list.innerHTML = ''; shown = 0; }
  const pick = kind ? answers.filter(a => a.fact.kind === kind) : answers;
  if (!q) { status.textContent = ''; moreWrap.hidden = true; chips.hidden = true; return; }
  chips.hidden = !answers.length;
  if (!pick.length) {
    status.textContent = answers.length ? `Nothing under ${kind} for "${q}". Try All.` : `No answer for "${q}" yet. Try fewer or different words, or ask on the boards.`;
    moreWrap.hidden = true;
    return;
  }
  if (!shown) status.textContent = pick[0].close
    ? `No fact matches every word of "${q}" yet. These are the closest. Still stuck? Ask on the boards.`
    : `Answers for "${q}"`;
  const words = terms(q);
  const html = pick.slice(shown, shown + PAGE).map(a => `<li class="tv-answer${a.close ? ' tv-close' : ''}"><p class="tv-answer-meta"><a href="/trivia/${a.work.slug}#${a.fact.id}">${esc(a.work.work)}</a><span>${esc(a.fact.kind)}</span></p><p>${mark(a.fact.text, words)}</p></li>`).join('');
  list.insertAdjacentHTML('beforeend', html);
  shown = Math.min(pick.length, shown + PAGE);
  moreWrap.hidden = shown >= pick.length;
}

async function run() {
  const q = input.value.trim();
  const url = new URL(location.href);
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  if (!q) { answers = []; render(true); return; }
  status.textContent = 'Looking…';
  answers = ask(await load(), q);
  render(true);
  if (window.gtag) window.gtag('event', 'trivia_ask', { has_answer: answers.length > 0 });
}

form.addEventListener('submit', e => { e.preventDefault(); input.blur(); run(); });
let timer;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });
more.addEventListener('click', () => render(false));
chips.addEventListener('click', e => {
  const b = e.target.closest('button[data-kind]');
  if (!b) return;
  kind = b.dataset.kind;
  for (const c of chips.querySelectorAll('button')) c.setAttribute('aria-pressed', String(c === b));
  render(true);
});

const start = new URLSearchParams(location.search).get('q');
if (start) { input.value = start; run(); }
