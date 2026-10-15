// Writes the message board pages (ADR-015) from public/data/boards.json:
//   /boards/            the hub: every board, newest posts
//   /boards/<slug>      one board: its threads and "Start a thread"
//   /boards/thread      one thread (?id=), filled in by public/js/discuss.js
//   /boards/rules       discussion rules
//   /boards/moderate    moderator page (noindex)
// Run after editing boards.json: node tools/build-boards.mjs && node tools/menu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.join(path.dirname(SELF), '..', 'public');
const SITE = 'https://mcueastereggs.com';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const boards = (root = ROOT) => JSON.parse(fs.readFileSync(path.join(root, 'data', 'boards.json'), 'utf8')).boards;

function page({ url, title, desc, body, noindex = false, ads = true, jsonld = null }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>${esc(title)} | MCU Easter Eggs</title>
    <meta name="description" content="${esc(desc)}">
${noindex ? '    <meta name="robots" content="noindex, follow">' : `    <link rel="canonical" href="${SITE}${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${SITE}${url}">
    <meta property="og:type" content="website">`}
${jsonld ? `    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}    <link rel="stylesheet" href="/css/discuss.css">
</head>
<body>
    <main class="container">
        <div class="d-boards">
${body}
        </div>
    </main>
    <footer><p>&copy; 2026 MCU Easter Eggs. Not affiliated with Marvel or Disney.</p></footer>
${ads ? '    <script src="/js/ads.js" defer></script>\n' : ''}    <script type="module" src="/js/discuss.js"></script>
</body>
</html>
`;
}

const back = (href, label) => `            <p><a class="back-button" href="${href}">&larr; ${esc(label)}</a></p>`;

export function hub(list) {
  const cards = list.map(b => `                <a class="bcard-d" href="/boards/${b.slug}" data-board-name="${b.slug}" data-label="${esc(b.name)}"><b>${esc(b.name)}</b><span class="t">${esc(b.blurb)}</span><span class="n" data-count="${b.slug}"></span></a>`).join('\n');
  return page({
    url: '/boards/',
    title: 'MCU Message Boards and Fan Theories',
    desc: 'Talk about MCU easter eggs, fan theories, deleted scenes and upcoming Marvel movies with other fans. Free to read; post with a free account.',
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'MCU Message Boards', url: `${SITE}/boards/` },
    body: `${back('/', 'Home')}
            <h1>MCU Message Boards</h1>
            <p>Talk about the details you spotted, your fan theories and what is coming next. Reading is free; posting takes a free account. Every article, scene, callback and character page also has its own discussion at the bottom. <a href="/boards/rules">Discussion rules</a></p>
            <section aria-labelledby="h-boards"><h2 id="h-boards">Boards</h2>
            <div class="bgrid">
${cards}
            </div></section>
            <section aria-labelledby="h-recent"><h2 id="h-recent">Newest posts</h2><ul class="d-recent" data-recent><li class="small">Loading…</li></ul></section>`,
  });
}

export function board(b, list) {
  return page({
    url: `/boards/${b.slug}`,
    title: `${b.name} | MCU Message Boards`,
    desc: `${b.blurb} A message board on MCU Easter Eggs.`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: b.name, description: b.blurb, url: `${SITE}/boards/${b.slug}` },
    body: `${back('/boards/', 'All boards')}
            <h1>${esc(b.name)}</h1>
            <p>${esc(b.blurb)}</p>
            <p class="d-starter">${esc(b.starter)}</p>
            <section class="d-board" data-board="${b.slug}" aria-label="Threads"></section>
            <p class="small"><a href="/boards/rules">Discussion rules</a> · <a href="/boards/">All boards</a></p>
            <span hidden>${list.map(x => `<span data-board-name="${x.slug}" data-label="${esc(x.name)}"></span>`).join('')}</span>`,
  });
}

export function thread(list) {
  return page({
    url: '/boards/thread', title: 'Thread', desc: 'A thread on the MCU Easter Eggs message boards.', noindex: true,
    body: `            <p><a class="back-button" href="/boards/" data-thread-board>&larr; All boards</a></p>
            <h1 data-thread-title>Thread</h1>
            <section class="disc" data-thread-view aria-label="Thread"></section>
            <span hidden>${list.map(x => `<span data-board-name="${x.slug}" data-label="${esc(x.name)}"></span>`).join('')}</span>`,
  });
}

export function rules() {
  return page({
    url: '/boards/rules', title: 'Discussion Rules', desc: 'How to post on MCU Easter Eggs: be civil, mark spoilers, name your sources, no hate, no spam.',
    body: `${back('/boards/', 'All boards')}
            <h1>Discussion rules</h1>
            <ol class="rules">
                <li><b>Be civil.</b> Argue with the idea, not the person. No insults, threats or slurs.</li>
                <li><b>Hide spoilers.</b> Wrap anything that gives away a recent movie or show like this: &gt;!Tony snaps!&lt;. Readers tap it to see it.</li>
                <li><b>Name your source.</b> Rumors and leaks are fine on Coming Soon and Rumors if you say where you read them and call them rumors.</li>
                <li><b>Nothing made up about real people.</b> Actors, directors and crew are real people. No invented quotes or claims about their private lives.</li>
                <li><b>No spam or selling.</b> At most two links a post. A new account's first links wait for a quick check.</li>
                <li><b>No pirated links.</b> Do not post links to leaked footage or illegal streams.</li>
                <li><b>13 or older.</b> You need to be 13 or older to make an account.</li>
            </ol>
            <h2>Hide, Block and Report</h2>
            <p>Every post has a big Hide button (hides that post for you) and a Block button (hides everything that person posts, for you only). When enough readers hide or report a post, it moves for everyone into a "Hidden" section at the end, with a note saying how many readers hid it. Report sends a post to our moderators, who can remove it or block the account.</p>
            <p>Questions or an appeal: email <a href="mailto:doug@webdesignnerd.com">doug@webdesignnerd.com</a>.</p>`,
  });
}

export function moderate() {
  return page({
    url: '/boards/moderate', title: 'Moderate', desc: 'Moderator page.', noindex: true, ads: false,
    body: `            <h1>Moderate the boards</h1>
            <div id="mod"><p class="small">Loading…</p></div>`,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const list = boards();
  const dir = path.join(ROOT, 'boards');
  fs.mkdirSync(dir, { recursive: true });
  const out = { 'index.html': hub(list), 'thread.html': thread(list), 'rules.html': rules(), 'moderate.html': moderate() };
  for (const b of list) out[`${b.slug}.html`] = board(b, list);
  for (const [name, html] of Object.entries(out)) {
    fs.writeFileSync(path.join(dir, name), html);   // then node tools/menu.mjs adds the banner, menu, footer and versions
  }
  console.log(`Wrote ${Object.keys(out).length} board pages.`);
}
