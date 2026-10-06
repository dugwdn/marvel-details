// Quiz logic shared by the browser (public/js/quiz.js) and the tests
// (test/quiz.test.mjs). No DOM, no storage, no network.
// Data: public/data/quiz.json (tiers, ranks, films, questions).

export const ROUND = 10; // questions per round
export const STREAK_AT = 3; // answers in a row before the streak bonus starts
export const PERFECT_BONUS = 5; // a perfect round adds this many base points

// Fisher-Yates shuffle on a copy. rand is injectable so tests are repeatable.
export function shuffle(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One round: up to ROUND questions of the tier, shuffled, each with its four
// choices shuffled. answer = index of the right choice.
export function buildRound(data, tierId, rand = Math.random) {
  const pool = data.questions.filter((q) => q.tier === tierId);
  return shuffle(pool, rand).slice(0, ROUND).map((q) => {
    const choices = shuffle([q.a, ...q.wrong], rand);
    return { ...q, choices, answer: choices.indexOf(q.a) };
  });
}

// Points for one right answer: the tier's base, plus half again once the
// streak (counting this answer) reaches STREAK_AT. Wrong answers score 0.
export function pointsFor(tier, correct, streak) {
  if (!correct) return 0;
  return tier.points + (streak >= STREAK_AT ? Math.floor(tier.points / 2) : 0);
}

// Plays a list of true/false answers through the scoring rules.
export function scoreRound(tier, results) {
  let streak = 0;
  let best = 0;
  let points = 0;
  let right = 0;
  for (const ok of results) {
    streak = ok ? streak + 1 : 0;
    best = Math.max(best, streak);
    if (ok) right++;
    points += pointsFor(tier, ok, streak);
  }
  const perfect = results.length > 0 && right === results.length;
  if (perfect) points += tier.points * PERFECT_BONUS;
  return { points, right, total: results.length, bestStreak: best, perfect };
}

// Quiz rank from lifetime points. ranks: [{ id, title, min }].
export function quizRank(points, ranks) {
  const ladder = [...ranks].sort((x, y) => x.min - y.min);
  let index = 0;
  ladder.forEach((r, i) => { if (points >= r.min) index = i; });
  const current = ladder[index];
  const next = ladder[index + 1] || null;
  const progress = next ? Math.min(1, (points - current.min) / (next.min - current.min)) : 1;
  return { index, current, next, toNext: next ? next.min - points : 0, progress };
}
