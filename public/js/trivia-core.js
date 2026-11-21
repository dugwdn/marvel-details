// Matching rules for "Ask about any scene" (ADR-018), shared by the page and the tests.
// A word matches only at the start of a word ("thor" never finds "authority"); "eating"
// also finds "eats" and "eat". Facts that match every meaningful word in the question
// come first; when none does, the closest ones (at least half the words) are shown and
// marked as close. A word found in the fact's text counts more than one found only in
// the film's name, so "iron man clock" puts clocks in Iron Man films first.

const STOP = new Set(('a about an and any are as at be behind but by can could did do does for from had has ' +
  'have he her him his how i if in into is it its just me my of on or said say says she so some that the ' +
  'their them then there they this to us was we were what when where which who whom why will with would ' +
  'you your scene scenes movie movies film films mcu marvel').split(' '));

// Names fans use for the same person. Each question word also finds these.
const ALSO = {
  tony: ['stark'], stark: ['tony'], cap: ['captain', 'rogers'], steve: ['rogers'], rogers: ['steve'],
  natasha: ['romanoff', 'widow'], nat: ['natasha', 'romanoff'], bruce: ['banner', 'hulk'], banner: ['bruce'],
  peter: ['parker'], spidey: ['spider'], fury: ['nick'], bucky: ['barnes'], wanda: ['maximoff', 'scarlet'],
  rhodey: ['rhodes'], pepper: ['potts'], strange: ['stephen'], tchalla: ['panther'], clint: ['barton', 'hawkeye'],
};

const fold = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '');
const stem = w => (w.length > 5 && /(ing|ers)$/.test(w) ? w.slice(0, -3) : w.length > 4 && /(ed|es|er)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

/** The meaningful words of a question, as stems. */
export function terms(q) {
  return [...new Set(fold(q).replace(/[^\p{L}\p{N} ]+/gu, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(stem))];
}

const words = s => ' ' + fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
const found = (hay, w) => [w, ...(ALSO[w] || [])].some(x => hay.includes(' ' + x));

/** Facts that answer the question, best first: [{work, fact, score, close}]. */
export function ask(data, q) {
  const ws = terms(q);
  if (!ws.length) return [];
  const need = Math.max(1, Math.ceil(ws.length / 2));
  const out = [];
  for (const work of data.works) {
    const title = words(work.work);
    for (const fact of work.facts) {
      const text = words(fact.text + ' ' + (fact.scene || '') + ' ' + (fact.q || ''));
      let hits = 0, score = 0;
      for (const w of ws) {
        if (found(text, w)) { hits++; score += 3; } else if (found(title, w)) { hits++; score += 1; }
      }
      if (hits >= need) out.push({ work, fact, close: hits < ws.length, score: hits * 10 + score - fact.text.length / 2000 });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
