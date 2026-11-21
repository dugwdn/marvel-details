// Replaces one named block of <url> entries in public/sitemap.xml (the rest of the file is kept as is).
// Used by build-trivia.mjs and build-theories.mjs so their pages stay listed at their final addresses.
import fs from 'node:fs';
import path from 'node:path';

export function sitemapBlock(root, name, label, paths, lastmod = new Date().toISOString().slice(0, 10)) {
  const file = path.join(root, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  const start = `    <!-- ${name}:start ${label} -->`, end = `    <!-- ${name}:end -->`;
  const re = new RegExp(`\\n    <!-- ${name}:start[^>]*-->[\\s\\S]*?<!-- ${name}:end -->`);
  // Keep the old date for pages already listed, so a rebuild does not claim every page changed.
  const old = new Map([...(xml.match(re)?.[0] || '').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));
  const urls = paths.map(p => {
    const loc = `https://mcueastereggs.com${p}`;
    return `    <url>\n        <loc>${loc}</loc>\n        <lastmod>${old.get(loc) || lastmod}</lastmod>\n        <changefreq>monthly</changefreq>\n        <priority>0.6</priority>\n    </url>`;
  });
  const block = `\n${start}\n${urls.join('\n')}\n${end}`;
  xml = re.test(xml) ? xml.replace(re, block) : xml.replace(/\n<\/urlset>/, `${block}\n</urlset>`);
  fs.writeFileSync(file, xml);
}
