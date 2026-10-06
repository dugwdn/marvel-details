"""Writes public/characters/all/index.html (every MCU character) from
public/data/mcu-characters.json. Run after changing the data, then run
node tools/menu.mjs to add the banner and menu:
    python3 tools/build-directory.py && node tools/menu.mjs
"""
import json, html, pathlib, os

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'public'
data = json.loads((ROOT / 'data/mcu-characters.json').read_text())
titles = data['titles']
idx = {t['title']: i for i, t in enumerate(titles)}
e = lambda s: html.escape(s, quote=True)
year = lambda t: titles[idx[t]]['date'][:4]
films = sum(t['kind'] == 'film' for t in titles)
seasons = len(titles) - films
chars = data['characters']
N = len(chars)

def actor_line(c):
    played = [a for a in c['actors'] if not a.endswith(' (voice)')]
    voiced = [a[:-8] for a in c['actors'] if a.endswith(' (voice)') and a[:-8] not in played]
    parts = []
    if played: parts.append('Played by ' + ', '.join(map(e, played)))
    if voiced: parts.append(('voiced by ' if played else 'Voiced by ') + ', '.join(map(e, voiced)))
    return '; '.join(parts)

# Actor portraits (public/data/media-credits.json; their credits are on /credits), one per character page of the list.
_credits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data', 'media-credits.json')))
_pages = {c['page']: c['id'] for c in data['characters'] if c['page']}
PORTRAITS = {}
for _i in _credits['images']:  # list portrait first, else the photo on the character's own page
    _id = _i.get('character') or _pages.get(_i['page'])
    if _id and _id not in PORTRAITS:
        PORTRAITS[_id] = _i

def portrait(c):
    p = PORTRAITS.get(c['id'])
    if not p:
        return ''
    srcset = ''
    if p.get('srcset'):
        srcset = ' srcset="' + ', '.join(f'{f} {w}w' for w, f in p['srcset'].items()) + '" sizes="140px"'
    return (f'  <figure class="dir-photo"><img src="{p["file"]}"{srcset} alt="{e(p.get("alt") or p["subject"])}" width="{p["width"]}" height="{p["height"]}" loading="lazy" decoding="async">'
            '</figure>\n')  # credits live on /credits (Doug 2026-10-06)

def item(c):
    n = len(c['titles'])
    name = e(c['name'])
    if c['page']:
        name = f'<a href="{c["page"]}">{name}</a> <span class="dir-badge-full">Full page</span>'
    kinds = ('f' if c['films'] else '') + ('s' if c['shows'] else '')
    search = ' '.join([c['name']] + c['actors']).lower()
    lis = ''.join(f'<li>{e(t)} ({year(t)})</li>' for t in c['titles'])
    tags = '<span class="dir-badge-tag">Animated only</span>' if c['animatedOnly'] else ''
    return (
        f'<li class="dir-item" id="{c["id"]}" data-s="{e(search)}" data-t="{",".join(str(idx[t]) for t in c["titles"])}" '
        f'data-first="{c["firstDate"]}" data-n="{n}" data-k="{kinds}" data-a="{1 if c["animatedOnly"] else 0}">\n'
        f'  <div class="dir-top"><h3 class="dir-name">{name}</h3><span class="dir-count">{n} {"title" if n == 1 else "titles"}</span></div>\n'
        + portrait(c) +
        f'  <p class="dir-actor">{actor_line(c)}</p>\n'
        f'  <p class="dir-first">First appearance: <strong>{e(c["first"])} ({year(c["first"])})</strong> {tags}</p>\n'
        + (f'  <details><summary>All {n} titles</summary><ul>{lis}</ul></details>\n' if n > 1 else '')
        + '</li>'
    )

opts_f = ''.join(f'<option value="{i}">{e(t["title"])} ({t["date"][:4]})</option>' for i, t in enumerate(titles) if t['kind'] == 'film')
opts_s = ''.join(f'<option value="{i}">{e(t["title"])} ({t["date"][:4]})</option>' for i, t in enumerate(titles) if t['kind'] == 'series')
title = f'MCU Character List: {N} Characters From Every Marvel Movie and Series'
desc = (f'MCU character list: {N} Marvel Cinematic Universe characters from all {films} '
        f'movies and {seasons} Disney+ series seasons, with who plays them and where they first appear.')

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>{e(title)}</title>
    <meta name="description" content="{e(desc)}">
    <link rel="canonical" href="https://mcueastereggs.com/characters/all/">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{e(title)}">
    <meta property="og:description" content="{e(desc)}">
    <meta property="og:url" content="https://mcueastereggs.com/characters/all/">
    <meta name="google-adsense-account" content="ca-pub-7178251279168670">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/theme.css">
    <link rel="stylesheet" href="/css/directory.css">
</head>
<body>
    <nav class="site-nav"></nav>

    <main class="dir-main">
        <a href="/characters/" class="back-link">&larr; Back to Characters</a>
        <section class="character-header dir-head">
            <h1>MCU Character List</h1>
            <p><strong>{N}</strong> main and recurring characters from all {films} Marvel Cinematic Universe movies and {seasons} Disney+ series seasons released so far, with who plays them, where they first appear and every title they are in. Characters with a <span class="dir-badge-full">Full page</span> badge have a full story page on this site.</p>
            <p class="dir-source">Facts come from the studios' cast credits, as compiled in Wikipedia's MCU cast lists (checked {data["updated"]}). Small one-scene roles are not listed yet. Only released titles are counted: Avengers: Doomsday, VisionQuest and other upcoming titles are added when they come out. "Animated only" means the character has only appeared in an animated series such as What If...?, where many characters are alternate versions.</p>
        </section>

        <form class="dir-controls" role="search" onsubmit="return false">
            <label class="dir-field dir-search"><span>Search</span>
                <input type="search" id="dir-q" placeholder="Name or actor, like Loki or Hiddleston" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>
            <label class="dir-field"><span>Appears in</span>
                <select id="dir-t"><option value="">Any movie or series</option><optgroup label="Movies">{opts_f}</optgroup><optgroup label="Disney+ series">{opts_s}</optgroup></select></label>
            <label class="dir-field"><span>Show</span>
                <select id="dir-k"><option value="">Movies and series</option><option value="f">In at least one movie</option><option value="s">In at least one series</option><option value="live">Skip animated-only</option></select></label>
            <label class="dir-field"><span>Sort by</span>
                <select id="dir-o"><option value="n">Most appearances</option><option value="az">Name, A to Z</option><option value="first">First appearance</option></select></label>
        </form>
        <p class="dir-count-line" id="dir-count" aria-live="polite">Showing all {N} characters</p>

        <ol class="dir-list" id="dir-list">
{chr(10).join(item(c) for c in chars)}
        </ol>
        <p class="dir-none" id="dir-none" hidden>No characters match. Try a shorter name or clear the filters.</p>
    </main>

    <footer>
        <p>&copy; 2026 MCU Easter Eggs. Fan site, not affiliated with Marvel or Disney. <a href="/about">About</a></p>
    </footer>

    <script src="/js/directory.js"></script>
    <script src="/js/ads.js" defer></script>
</body>
</html>
'''
(ROOT / 'characters/all/index.html').write_text(page)
print(f'Wrote characters/all/index.html with {N} characters')
