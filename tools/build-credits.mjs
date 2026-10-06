// Writes public/credits.html from public/data/media-credits.json.
// Run after changing the credits file: node tools/build-credits.mjs, then node tools/menu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/media-credits.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const imgs = data.images.map((i) =>
  `<li><strong>${esc(i.subject)}</strong><br>Photo: ${esc(i.author)}, <a href="${esc(i.licenseUrl)}" rel="nofollow noopener">${esc(i.license)}</a>, <a href="${esc(i.sourceUrl)}" rel="nofollow noopener">via Wikimedia Commons</a>.<br>Used on <a href="${esc(i.page)}">${esc(i.page)}</a>.</li>`
).join('\n            ');
const vids = data.videos.map((v) =>
  `<li><strong>${esc(v.title)}</strong><br>Channel: ${esc(v.channel)}, <a href="${esc(v.sourceUrl)}" rel="nofollow noopener">watch on YouTube</a>.<br>Used on <a href="${esc(v.page)}">${esc(v.page)}</a>.</li>`
).join('\n            ');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>Photo and Video Credits | Details You Missed</title>
    <meta name="description" content="Who took each photo on the site, the license it is under, and where each trailer comes from.">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #333; background: #f5f5f5; }
        .container { max-width: 1600px; margin: 0 auto; padding: 2rem 16px; }
        .content { max-width: 760px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 8px; }
        h1 { font-size: 2rem; margin-bottom: .75rem; }
        h2 { font-size: 1.3rem; margin: 1.5rem 0 .5rem; }
        p { margin-bottom: 1rem; }
        footer { background: #222; color: #fff; text-align: center; padding: 2rem; margin-top: 3rem; }
        @media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } .content { background: #1c1c1c; } }
    </style>
    <link rel="stylesheet" href="/css/theme.css">
</head>
<body>
    <main class="container">
        <div class="content">
            <h1>Photo and Video Credits</h1>
            <p>We never use studio posters, film stills or character art. Photos here are free-license pictures from Wikimedia Commons, credited to the people who took them. Trailers are official uploads, played with YouTube's own player.</p>
            <h2>Photos (${data.images.length})</h2>
            <ul class="credits-list">
            ${imgs}
            </ul>
            <h2>Trailers (${data.videos.length})</h2>
            <ul class="credits-list">
            ${vids}
            </ul>
            <p>Not affiliated with Marvel or Disney. The same list is in <a href="/data/media-credits.json">media-credits.json</a>.</p>
        </div>
    </main>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'credits.html'), html);
console.log('credits.html written');
