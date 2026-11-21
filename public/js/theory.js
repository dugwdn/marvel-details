// Fan theory pages (ADR-018): "Do you buy it?" vote, Ask a friend, and "Your trail" of theories read.
// The vote needs no account: this browser keeps a random id so it votes once per theory (the server stores
// only a scrambled form of it). The trail lives only in this browser.
const LABEL = { buy: 'Buy it', unsure: 'Not sure', no: 'No way' };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window: works for this page only */ } },
};

function voterId() {
  let id = store.get('mcu-voter', '');
  if (!/^[\w-]{16,64}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    store.set('mcu-voter', id);
  }
  return id;
}

const vote = document.querySelector('[data-vote]');
if (vote) {
  const page = vote.dataset.vote, bars = vote.querySelector('[data-vote-bars]'), note = vote.querySelector('[data-vote-note]');
  const show = ({ counts, mine }) => {
    for (const b of vote.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === mine));
    if (!mine) return;
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    bars.innerHTML = Object.keys(LABEL).map(k => {
      const pct = Math.round((counts[k] || 0) * 100 / total);
      return `<div class="th-bar"><span>${LABEL[k]}</span><i style="--w:${pct}%"></i><span>${pct}%</span></div>`;
    }).join('');
    bars.hidden = false;
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    note.textContent = `${n === 1 ? 'You are the first fan to vote.' : `${n} fans voted.`} Tap another answer to change yours.`;
  };
  const ask = (init) => fetch('/api/vote' + (init ? '' : `?p=${encodeURIComponent(page)}&v=${voterId()}`), init)
    .then(r => r.ok ? r.json() : null).then(d => d && show(d)).catch(() => {});
  ask();
  vote.addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    ask({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p: page, v: b.dataset.v, voter: voterId() }) });
    if (window.gtag) window.gtag('event', 'theory_vote', { theory: page.split('/')[1], answer: b.dataset.v });
  });
}

const share = document.querySelector('[data-share]');
if (share) share.addEventListener('click', async () => {
  const out = document.querySelector('[data-share-out]');
  const data = { title: share.dataset.share, text: `MCU fan theory: ${share.dataset.share}. Do you buy it?`, url: share.dataset.url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    out.textContent = 'Link copied. Paste it to a friend.';
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    out.textContent = `Copy this link: ${data.url}`;
  }
  out.hidden = false;
  if (window.gtag) window.gtag('event', 'ask_a_friend', { theory: data.url.split('/').pop() });
});

// Your trail: the theories read in order, newest last (at most 8), shown once there are two.
const oq = document.querySelector('[data-trail-id]');
if (oq) {
  const id = oq.dataset.trailId;
  const trail = store.get('mcu-trail', []).filter(x => x && x.id !== id).slice(-7);
  trail.push({ id, t: oq.dataset.trailTitle });
  store.set('mcu-trail', trail);
  const box = oq.querySelector('[data-trail]');
  if (trail.length > 1) {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    box.querySelector('ol').innerHTML = trail.map(x => x.id === id ? `<li aria-current="page">${esc(x.t)}</li>` : `<li><a href="/theories/${encodeURIComponent(x.id)}">${esc(x.t)}</a></li>`).join('');
    box.hidden = false;
  }
}
