#!/usr/bin/env python3
"""Import scene trivia from the fan-run Marvel Cinematic Universe Wiki (ADR-018).

The wiki's text is CC BY-SA (https://www.fandom.com/licensing), so we may reuse
it with credit, a link to the page, the license, and a note that we edited it.
Only TEXT is imported: the wiki's pictures are film stills and stay off the site.

Reads every "<work>/Trivia" page in the wiki's Category:Trivia through its API,
turns each bullet into one plain fact and writes public/data/trivia.json.
Then: node tools/build-trivia.mjs && node tools/menu.mjs

  python3 tools/import-wiki-trivia.py            # fetch and write
  python3 tools/import-wiki-trivia.py --cache DIR  # reuse/keep downloaded pages in DIR
"""
import json, os, re, subprocess, sys, time, urllib.parse
from html.parser import HTMLParser

API = 'https://marvelcinematicuniverse.fandom.com/api.php'
WIKI = 'https://marvelcinematicuniverse.fandom.com/wiki/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data', 'trivia.json')
UA = 'Mozilla/5.0 (compatible; MCUEasterEggs/1.0; +https://mcueastereggs.com)'

# Sections we leave out: the page's table of contents, and lists of comics or
# other works that mention the film (not something you can spot on screen).
DROP_SECTIONS = re.compile(r'^(Contents|Works that Reference|Gallery|References$|External Links|See Also|Notes$)', re.I)
# Wiki pages that only list other trivia pages.
INDEX_PAGES = {'Movie', 'TV', 'Documentary'}
SKIP_CLASSES = ('mw-editsection', 'reference', 'thumb', 'gallery', 'toc', 'navbox', 'printfooter',
                'portable-infobox', 'mw-references-wrap', 'references', 'error', 'mw-empty-elt')


def kind_of(section):
    """Our filter chip for a fact, from the wiki section it sits in."""
    s = section.lower()
    if 'episode title' in s or 'episodes title' in s:
        return 'Episode titles'
    if 'comic' in s:
        return 'Comics references'
    if 'cinematic universe' in s or 'mcu' in s:
        return 'MCU connections'
    if any(w in s for w in ('production', 'casting', 'behind', 'statement', 'cast and crew', 'personal', 'filming', 'development', 'crew')):
        return 'Behind the scenes'
    if any(w in s for w in ('other movies', 'pop culture', 'disney', 'previous works', 'films', 'tv series', 'non-mcu', 'music')):
        return 'Pop culture'
    return 'Scene details'


def get(url):
    for attempt in range(4):
        r = subprocess.run(['curl', '-s', '--max-time', '60', '-A', UA, url], capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.startswith('{'):
            return json.loads(r.stdout)
        time.sleep(3 * (attempt + 1))
    raise RuntimeError('could not fetch ' + url)


def trivia_titles():
    titles, cont = [], ''
    while True:
        d = get(f'{API}?action=query&list=categorymembers&cmtitle=Category:Trivia&cmlimit=500&format=json'
                + (f'&cmcontinue={urllib.parse.quote(cont)}' if cont else ''))
        titles += [m['title'] for m in d['query']['categorymembers'] if m['title'].endswith('/Trivia')]
        cont = d.get('continue', {}).get('cmcontinue')
        if not cont:
            return sorted(titles)


class Bullets(HTMLParser):
    """Collects every <li> with the h2/h3/h4 headings above it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.h = {2: '', 3: '', 4: ''}
        self.in_h, self.htext, self.skip = 0, '', 0
        self.li = []        # open <li> buffers (nested lists)
        self.items = []     # (headings, text, depth)

    def handle_starttag(self, tag, a):
        void = tag in ('br', 'img', 'hr', 'wbr', 'input', 'meta', 'link', 'source')
        if self.skip:
            if not void:
                self.skip += 1
            return
        cls = (dict(a).get('class') or '').split()
        if not void and (any(c in cls for c in SKIP_CLASSES) or tag in ('style', 'script', 'figure', 'table', 'sup')):
            self.skip = 1
            return
        if tag in ('h2', 'h3', 'h4'):
            self.in_h, self.htext = int(tag[1]), ''
        elif tag == 'li':
            self.li.append('')
        elif tag == 'br' and self.li:
            self.li[-1] += ' '

    def handle_endtag(self, tag):
        if self.skip:
            self.skip -= 1
            return
        if tag in ('h2', 'h3', 'h4') and self.in_h:
            self.h[self.in_h] = re.sub(r'\s+', ' ', self.htext).strip()
            for k in range(self.in_h + 1, 5):
                self.h[k] = ''
            self.in_h = 0
        elif tag == 'li' and self.li:
            text = self.li.pop()
            self.items.append((dict(self.h), re.sub(r'\s+', ' ', text).strip(), len(self.li)))

    def handle_data(self, d):
        if self.skip:
            return
        if self.in_h:
            self.htext += d
        elif self.li:
            self.li[-1] += d


def tidy(t):
    t = re.sub(r'\[\d+\]|\[citation needed\]|\[edit\]', '', t, flags=re.I)
    t = re.sub(r'\s+([,.;:!?])', r'\1', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if t and t[-1] not in '.!?"”)':
        t += '.'
    return t


def facts_from(html):
    p = Bullets()
    p.feed(html)
    # A nested <li> closes before its parent, so children arrive first. Group them
    # under the parent that follows; a parent ending in ":" gets its children joined in.
    out, pending = [], []
    for h, text, depth in p.items:
        section = next((h[k] for k in (2, 3, 4) if h[k]), '')
        sub = ' / '.join(x for x in (h[2], h[3], h[4]) if x)
        if depth > 0:
            # Nested items arrive before their parent; their text is also inside the parent's text.
            pending.append(text)
            continue
        if pending:
            # The parent's own text already contains its children's text: keep only the lead-in
            # and list the children after it.
            lead = text
            for c in pending:
                lead = lead.replace(c, '')
            lead = lead.strip()
            if lead.endswith(':'):
                lead = lead[:-1].rstrip() + ': '
            elif lead:
                lead = lead.rstrip() + ' '
            text = lead + '; '.join(c.rstrip('.') for c in pending)
            pending = []
        if DROP_SECTIONS.search(section):
            continue
        text = tidy(text)
        if len(text) < 30:
            continue
        out.append({'section': sub, 'kind': kind_of(sub), 'text': text})
    return out


def slug_of(work):
    w = re.sub(r'\s*\((film|TV series|series|special|one-shot|short)\)\s*$', '', work, flags=re.I)
    return re.sub(r'[^a-z0-9]+', '-', w.lower().replace('&', 'and').replace("'", '')).strip('-')


def main():
    cache = None
    if '--cache' in sys.argv:
        cache = sys.argv[sys.argv.index('--cache') + 1]
        os.makedirs(cache, exist_ok=True)
    works, seen = [], set()
    for title in trivia_titles():
        fn = cache and os.path.join(cache, urllib.parse.quote(title, safe='') + '.json')
        if fn and os.path.exists(fn):
            d = json.load(open(fn))
        else:
            d = get(f'{API}?action=parse&page={urllib.parse.quote(title)}&format=json&prop=text|revid&disablelimitreport=1')
            if fn:
                json.dump(d, open(fn, 'w'))
            time.sleep(0.5)
        if 'parse' not in d:
            continue
        work = title[:-len('/Trivia')]
        if work in INDEX_PAGES:
            continue
        facts = facts_from(d['parse']['text']['*'])
        if len(facts) < 3:      # stubs about unmade projects
            continue
        slug = slug_of(work)
        while slug in seen:
            slug += '-2'
        seen.add(slug)
        for i, f in enumerate(facts, 1):
            f['id'] = f'{slug}-{i}'
        works.append({
            'slug': slug,
            'work': re.sub(r'\s*\((film|TV series)\)\s*$', '', work),
            'source': WIKI + urllib.parse.quote(title.replace(' ', '_')),
            'revid': d['parse'].get('revid'),
            'facts': facts,
        })
    data = {
        'source': 'Marvel Cinematic Universe Wiki (Fandom), fan-edited',
        'license': 'CC BY-SA 3.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by-sa/3.0/',
        'note': 'Text adapted from the wiki: split into single facts, footnote marks removed. Not yet checked by us.',
        'imported': time.strftime('%Y-%m-%d'),
        'works': works,
    }
    with open(OUT, 'w') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(works)} titles, {sum(len(w["facts"]) for w in works)} facts -> {os.path.relpath(OUT)}')


if __name__ == '__main__':
    main()
