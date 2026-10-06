#!/usr/bin/env node

/**
 * Build script for individual callback pages
 * Reads data/callbacks.json and creates individual HTML files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addMenu } from './tools/menu.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the callbacks data
const callbacksPath = path.join(__dirname, 'public/data/callbacks.json');
const callbacksData = JSON.parse(fs.readFileSync(callbacksPath, 'utf8'));

const movies = {
  'iron-man-1': { title: 'Iron Man', year: 2008, slug: 'iron-man-1' },
  'iron-man-2': { title: 'Iron Man 2', year: 2010, slug: 'iron-man-2' },
  'iron-man-3': { title: 'Iron Man 3', year: 2013, slug: 'iron-man-3' },
  'avengers-1': { title: 'The Avengers', year: 2012, slug: 'avengers-1' },
  'endgame': { title: 'Avengers: Endgame', year: 2019, slug: 'endgame' }
};

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
}

const publicDir = path.join(__dirname, 'public');
const pageExists = (rel) => fs.existsSync(path.join(publicDir, rel));
const characterPages = callbacksData.characterPages || {};

// A character gets a link only when its page exists; everyone else stays plain text.
function generateCharactersList(characters = []) {
  return characters.map(char => {
    const slug = characterPages[char];
    return slug && pageExists(`characters/${slug}.html`)
      ? `<li><a href="/characters/${slug}">${escapeHtml(char)}</a></li>`
      : `<li>${escapeHtml(char)}</li>`;
  }).join('');
}

function articleTitle(slug) {
  const html = fs.readFileSync(path.join(publicDir, 'articles', `${slug}.html`), 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || slug;
  return title.replace(/\s*\|\s*MCU Easter Eggs\s*$/i, '').trim();
}

// Only articles that have a page are listed.
function generateArticlesList(articles = []) {
  return articles
    .filter(slug => pageExists(`articles/${slug}.html`))
    .map(slug => `<li><a href="/articles/${slug}">${escapeHtml(articleTitle(slug))}</a></li>`)
    .join('');
}

// Scene locator (no invented timestamps). Missing locator = nothing shown.
function sceneHtml(part) {
  return part.scene ? `<span class="timestamp">Scene: ${escapeHtml(part.scene)}</span>` : '';
}

function sourceHtml(source) {
  if (!source || !/^https:\/\//.test(source.url || '')) return '';
  return `<p class="callback-source">Source: <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.name || source.url)}</a></p>`;
}

function generateCallbackPage(callback, prev, next) {
  const foreshadowMovie = movies[callback.foreshadow.movieId];
  const fulfillmentMovie = movies[callback.fulfillment.movieId];

  const charactersHtml = generateCharactersList(callback.relatedCharacters);
  const articlesHtml = generateArticlesList(callback.relatedArticles);
  const articlesBlock = articlesHtml ? `
                <div class="metadata-item">
                    <h3>Related Articles</h3>
                    <ul class="metadata-list">
                        ${articlesHtml}
                    </ul>
                </div>` : '';
  const prevLink = prev
    ? `<a href="/callbacks/callback-${prev.id}" class="nav-link prev">← ${escapeHtml(prev.title)}</a>`
    : '<a href="/callbacks/" class="nav-link prev">← All Callbacks</a>';
  const nextLink = next
    ? `<a href="/callbacks/callback-${next.id}" class="nav-link">${escapeHtml(next.title)} →</a>`
    : '<a href="/callbacks/" class="nav-link">All Callbacks →</a>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>${escapeHtml(callback.title)} | MCU Easter Eggs</title>
    <meta name="description" content="${escapeHtml(callback.explanation.substring(0, 150))}...">
    <meta name="keywords" content="Marvel, MCU, callback, ${escapeHtml(callback.type)}, ${escapeHtml(foreshadowMovie.title)}, ${escapeHtml(fulfillmentMovie.title)}">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/callbacks.css">
    <style>
        .callback-detail-page {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 2rem;
            color: #d63447;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .back-link:hover {
            transform: translateX(-4px);
        }

        .detail-header {
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid #e5e5e5;
        }

        .detail-header h1 {
            font-size: 2.2rem;
            margin: 0 0 1rem 0;
        }

        .type-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #d63447 0%, #a72535 100%);
            color: white;
            border-radius: 8px;
            font-weight: 600;
            text-transform: capitalize;
            margin-bottom: 1rem;
        }

        .detail-section {
            margin-bottom: 2.5rem;
        }

        .detail-section h2 {
            font-size: 1.4rem;
            margin: 0 0 1.5rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .section-icon {
            font-size: 1.6rem;
        }

        .movie-detail {
            background: linear-gradient(135deg, #f9f3f0 0%, #fef5f3 100%);
            border-left: 4px solid #d63447;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }

        .fulfillment .movie-detail {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            border-left-color: #2196F3;
        }

        .movie-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #333;
        }

        .fulfillment .movie-title {
            color: #1565c0;
        }

        .timestamp {
            display: inline-block;
            background: white;
            padding: 0.3rem 0.8rem;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 1rem;
        }

        .description {
            font-size: 1rem;
            line-height: 1.7;
            color: #555;
            margin: 1rem 0 0 0;
        }

        .explanation-box {
            background: linear-gradient(135deg, #fff8e1 0%, #fffde7 100%);
            border-left: 4px solid #fbc02d;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 1.5rem;
        }

        .explanation-box p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.7;
            color: #5d4037;
        }

        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }

        .metadata-item {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e5e5e5;
        }

        .metadata-item h3 {
            margin: 0 0 1rem 0;
            font-size: 0.95rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666;
        }

        .metadata-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .metadata-list li {
            padding: 0.5rem 0;
            font-size: 0.95rem;
            color: #555;
        }

        .metadata-list li::before {
            content: '→ ';
            color: #d63447;
            font-weight: bold;
            margin-right: 0.5rem;
        }

        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #e5e5e5;
        }

        .nav-link {
            color: #d63447;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .nav-link:hover {
            color: #a72535;
            transform: translateX(4px);
        }

        .nav-link.prev {
            transform: translateX(0);
        }

        .nav-link.prev:hover {
            transform: translateX(-4px);
        }

        @media (prefers-color-scheme: dark) {
            .detail-header {
                border-color: #444;
            }

            .movie-detail {
                background: #2a2a2a;
                color: #ddd;
            }

            .fulfillment .movie-detail {
                background: #2a2a2a;
            }

            .movie-title {
                color: #ddd;
            }

            .description {
                color: #aaa;
            }

            .timestamp {
                background: #333;
                color: #aaa;
            }

            .explanation-box {
                background: #3a3a2a;
                color: #ddd;
            }

            .explanation-box p {
                color: #bbb;
            }

            .metadata-item {
                background: #2a2a2a;
                border-color: #444;
            }

            .metadata-item h3 {
                color: #aaa;
            }

            .metadata-list li {
                color: #aaa;
            }

            .navigation {
                border-color: #444;
            }
        }

        .callback-source {
            margin: 1rem 0 0 0;
            font-size: 0.95rem;
        }

        .callback-source a {
            color: var(--dym-link, #a72535);
            font-weight: 600;
        }
    </style>
    <meta name="google-adsense-account" content="ca-pub-7178251279168670">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="callback-detail-page">
        <a href="/callbacks/" class="back-link">← Back to All Callbacks</a>

        <header class="detail-header">
            <h1>${escapeHtml(callback.title)}</h1>
            <span class="type-badge">${escapeHtml(callback.type)}</span>
        </header>

        <!-- Foreshadow Section -->
        <section class="detail-section foreshadow">
            <h2><span class="section-icon">⚡</span> Foreshadowed In</h2>
            <div class="movie-detail">
                <div class="movie-title">${escapeHtml(foreshadowMovie.title)} (${foreshadowMovie.year})</div>
                ${sceneHtml(callback.foreshadow)}
                <p class="description">${escapeHtml(callback.foreshadow.description)}</p>
            </div>
        </section>

        <!-- Fulfillment Section -->
        <section class="detail-section fulfillment">
            <h2><span class="section-icon">✓</span> Fulfilled In</h2>
            <div class="movie-detail">
                <div class="movie-title">${escapeHtml(fulfillmentMovie.title)} (${fulfillmentMovie.year})</div>
                ${sceneHtml(callback.fulfillment)}
                <p class="description">${escapeHtml(callback.fulfillment.description)}</p>
            </div>
        </section>

        <!-- Explanation -->
        <section class="detail-section">
            <h2><span class="section-icon">💡</span> Analysis</h2>
            <div class="explanation-box">
                <p>${escapeHtml(callback.explanation)}</p>
            </div>
            ${sourceHtml(callback.source)}
        </section>

        <!-- Metadata -->
        <section class="detail-section">
            <div class="metadata-grid">
                <div class="metadata-item">
                    <h3>Related Characters</h3>
                    <ul class="metadata-list">
                        ${charactersHtml}
                    </ul>
                </div>${articlesBlock}
            </div>
        </section>

        <!-- Navigation -->
        <nav class="navigation">
            ${prevLink}
            ${nextLink}
        </nav>
    </div>
    <script src="/js/ads.js" defer></script>
    <footer>
    </footer>
</body>
</html>`;

  // Site banner, menu, GA4, member and search scripts and footer links:
  // the same chrome tools/menu.mjs writes into every page.
  return addMenu(html, `callbacks/callback-${callback.id}.html`);
}

// Create callback pages
const callbacksDir = path.join(publicDir, 'callbacks');
const list = callbacksData.callbacks;
const keep = new Set();

list.forEach((callback, index) => {
  for (const part of [callback.foreshadow, callback.fulfillment]) {
    if (!movies[part.movieId]) throw new Error(`${callback.id}: unknown movieId ${part.movieId}`);
  }
  const filename = `callback-${callback.id}.html`;
  keep.add(filename);
  const html = generateCallbackPage(callback, list[index - 1], list[index + 1]);
  fs.writeFileSync(path.join(callbacksDir, filename), html, 'utf8');
  console.log(`✓ Created ${filename}`);
});

// Pages for callbacks that were removed from the data are deleted
// (their addresses redirect to /callbacks/ via public/_redirects).
for (const name of fs.readdirSync(callbacksDir)) {
  if (/^callback-cb-\d+\.html$/.test(name) && !keep.has(name)) {
    fs.unlinkSync(path.join(callbacksDir, name));
    console.log(`✗ Removed ${name}`);
  }
}

console.log(`\n✓ Generated ${list.length} callback pages`);
