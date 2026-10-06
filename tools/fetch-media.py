"""Fetches the free-license photos listed in tools/media-wanted.json, checks
each license on Wikimedia, saves resized WebP copies under public/img and
records the credit in public/data/media-credits.json.

    python3 tools/fetch-media.py            # fetch everything not done yet
    python3 tools/fetch-media.py --only ID  # one item again
    node tools/build-credits.mjs && python3 tools/build-directory.py && node tools/build-media.mjs && node tools/menu.mjs

An item in media-wanted.json is one of:
  {"id": "groot", "kind": "portrait", "character": "groot", "actors": ["Vin Diesel"]}
      -> the main photo of the actor's Wikipedia article (first actor that has one)
  {"id": "cleveland", "kind": "place", "wiki": "East 9th Street", ...}
      -> the main photo of that Wikipedia article
  {"id": "sdcc-2019", "kind": "event", "file": "File:Some photo.jpg", ...}
      -> that exact Commons file
Optional fields copied to the credit: subject, alt, caption, films, pages, home, factSource.

Rules (CLAUDE.md, ADR-010): only free licenses (CC BY, CC BY-SA, CC0, public
domain) from Wikimedia Commons; never studio posters, stills or character art.
Wikipedia's API answers when the Commons API rate-limits, so all lookups go
through en.wikipedia.org. Requests are batched and paced.
"""
import io, json, re, sys, time, html, pathlib, urllib.error, urllib.parse, urllib.request

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
WANTED = ROOT / 'tools' / 'media-wanted.json'
CREDITS = PUBLIC / 'data' / 'media-credits.json'
API = 'https://en.wikipedia.org/w/api.php'
UA = 'MCUEasterEggsBot/1.0 (https://mcueastereggs.com)'
FREE = re.compile(r'^(CC BY(-SA)? [0-9.]+|CC0( 1\.0)?|Public domain)$', re.I)
PEOPLE = re.compile(r'actor|actress|comedian|performer|singer|rapper|musician|filmmaker|director|wrestler|model|voice|television|presenter|personality|athlete|writer|producer', re.I)
# Output sizes per kind: (crop ratio w:h or None, widths)
SIZES = {'portrait': ((3, 4), [480, 240]), 'place': ((16, 10), [960, 480]), 'event': ((16, 10), [960, 480])}
FOLDER = {'portrait': 'img/actors/dir', 'place': 'img/places', 'event': 'img/events'}


def fetch(url, timeout=30, tries=30):
    """GET with the Retry-After pacing Wikimedia asks for (it rate-limits shared IPs hard)."""
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504):
                raise
            wait = int(e.headers.get('Retry-After') or 0) or min(15 * (n + 1), 120)
        except Exception as e:
            wait = 15
        print(f'  waiting {wait}s (try {n + 1})', file=sys.stderr, flush=True)
        time.sleep(wait)
    raise RuntimeError('Wikimedia kept refusing: ' + url)


def get(params):
    params = {**params, 'format': 'json', 'formatversion': '2'}
    return json.loads(fetch(API + '?' + urllib.parse.urlencode(params)))


def download(url):
    return fetch(url, timeout=60)


def page_images(titles):
    """Main photo file name for each Wikipedia article, only when the article is about a person/place we asked for."""
    out = {}
    for i in range(0, len(titles), 20):
        chunk = titles[i:i + 20]
        d = get({'action': 'query', 'prop': 'pageimages|description', 'piprop': 'name',
                 'redirects': '1', 'titles': '|'.join(chunk)})
        q = d.get('query', {})
        back = {t: t for t in chunk}
        for n in q.get('normalized', []):
            back[n['to']] = back.get(n['from'], n['from'])
        for r in q.get('redirects', []):
            back[r['to']] = back.get(r['from'], r['from'])
        for p in q.get('pages', []):
            src = back.get(p['title'], p['title'])
            if p.get('missing') or 'pageimage' not in p:
                continue
            out[src] = {'file': 'File:' + p['pageimage'], 'description': p.get('description', ''), 'article': p['title']}
        time.sleep(1)
    return out


def strip(s):
    s = re.sub(r'<[^>]+>', '', html.unescape(s or '')).strip()
    return re.sub(r'\s+', ' ', s)


def image_info(file, width):
    d = get({'action': 'query', 'titles': file, 'prop': 'imageinfo',
             'iiprop': 'url|size|extmetadata', 'iiurlwidth': str(width)})
    p = d['query']['pages'][0]
    if 'imageinfo' not in p:
        return None
    ii = p['imageinfo'][0]
    m = ii.get('extmetadata', {})
    val = lambda k: strip(m.get(k, {}).get('value', ''))
    return {
        'title': p['title'], 'thumb': ii.get('thumburl') or ii['url'], 'w': ii['width'], 'h': ii['height'],
        'license': val('LicenseShortName'), 'licenseUrl': val('LicenseUrl'), 'author': val('Artist'),
        'nonfree': val('NonFree'), 'repo': p.get('imagerepository', ''), 'restrictions': val('Restrictions'),
    }


def license_ok(info):
    if not info or info['repo'] != 'shared':  # 'local' = an en.wikipedia upload, often non-free
        return False, 'not on Commons'
    if info['nonfree'] and info['nonfree'].lower() not in ('false', '0'):
        return False, 'non-free'
    lic = info['license'].replace('Public Domain', 'Public domain')
    if not FREE.match(lic):
        return False, 'license ' + info['license']
    if not info['author']:
        return False, 'no author'
    return True, lic


def license_url(lic, given):
    if given:
        return given.replace('http://', 'https://').rstrip('/')
    m = re.match(r'CC (BY(?:-SA)?) ([0-9.]+)', lic)
    if m:
        return f'https://creativecommons.org/licenses/{m.group(1).lower()}/{m.group(2)}'
    if lic.startswith('CC0'):
        return 'https://creativecommons.org/publicdomain/zero/1.0'
    return 'https://commons.wikimedia.org/wiki/Commons:Public_domain'


def crop(img, ratio, top_bias):
    if not ratio:
        return img
    rw, rh = ratio
    w, h = img.size
    if w * rh > h * rw:  # too wide: trim the sides evenly
        nw = h * rw // rh
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = w * rh // rw  # too tall: keep the top (faces sit high in portraits)
    y = int((h - nh) * top_bias)
    return img.crop((0, y, w, y + nh))


def save(item, data):
    ratio, widths = SIZES[item['kind']]
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
    img = crop(img, ratio, 0.15 if item['kind'] == 'portrait' else 0.5)
    folder = PUBLIC / FOLDER[item['kind']]
    folder.mkdir(parents=True, exist_ok=True)
    out = {}
    for i, w in enumerate(widths):
        w = min(w, img.width)
        h = round(img.height * w / img.width)
        name = item['id'] + ('' if i == 0 else f'-{w}') + '.webp'
        img.resize((w, h), Image.LANCZOS).save(folder / name, 'WEBP', quality=74, method=6)
        out[w] = f'/{FOLDER[item["kind"]]}/{name}'
    first = max(out)
    return out[first], first, round(img.height * first / img.width), out


def main():
    wanted = json.loads(WANTED.read_text())
    credits = json.loads(CREDITS.read_text())
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    have = {i.get('id') for i in credits['images']}
    todo = [w for w in wanted['items'] if (w['id'] == only if only else w['id'] not in have)]
    print(f'{len(todo)} to fetch')

    # 1) resolve article titles to their main photo, in batches
    tries = {}
    for w in todo:
        if w.get('file'):
            continue
        names = [w['wiki']] if w.get('wiki') else [a for a in w.get('actors', []) if a]
        cands = []
        for n in names:
            cands.append(n)
        tries[w['id']] = cands
    found = page_images(sorted({c for cs in tries.values() for c in cs}))
    # Second pass for people whose plain name is a different person or a list page.
    for w in todo:
        if w['kind'] == 'portrait' and w['id'] in tries:
            miss = [c for c in tries[w['id']] if not (found.get(c) and PEOPLE.search(found[c]['description']))]
            if len(miss) == len(tries[w['id']]):
                tries[w['id']] += [f'{c} ({s})' for c in miss for s in ('actor', 'actress')]
    extra = sorted({c for cs in tries.values() for c in cs} - set(found))
    found.update(page_images([c for c in extra if c.endswith(')')]))

    skipped = []
    for w in todo:
        file, article, who = w.get('file'), w.get('wiki'), None
        if not file:
            for c in tries[w['id']]:
                hit = found.get(c)
                if hit and (w['kind'] != 'portrait' or PEOPLE.search(hit['description'])):
                    file, article = hit['file'], hit['article']
                    who = re.sub(r' \((actor|actress)\)$', '', c)
                    break
        if not file:
            skipped.append((w['id'], 'no main photo on Wikipedia'))
            continue
        width = SIZES[w['kind']][1][0]
        info = image_info(file, width * 2 if w['kind'] == 'portrait' else width)
        ok, why = license_ok(info)
        if not ok:
            skipped.append((w['id'], f'{file}: {why}'))
            continue
        src, fw, fh, sizes = save(w, download(info['thumb']))
        subject = who if w['kind'] == 'portrait' else (w.get('subject') or article)
        entry = {
            'id': w['id'], 'kind': w['kind'], 'page': w.get('page', '/characters/all'), 'file': src,
            'width': fw, 'height': fh, 'srcset': {str(k): v for k, v in sorted(sizes.items())},
            'subject': subject, 'alt': (w.get('alt') or subject).replace('{actor}', subject),
            'author': info['author'][:120], 'license': why, 'licenseUrl': license_url(why, info['licenseUrl']),
            'sourceUrl': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(info['title'].replace(' ', '_'), safe=':/()_,.-\''),
            'changes': 'cropped and resized',
        }
        for k in ('character', 'caption', 'films', 'pages', 'home', 'factSource'):
            if k in w:
                entry[k] = w[k]
        credits['images'] = [i for i in credits['images'] if i.get('id') != w['id']] + [entry]
        CREDITS.write_text(json.dumps(credits, indent=1, ensure_ascii=False) + '\n')  # keep progress if a later item fails
        print(f'  ok  {w["id"]}: {subject} ({why}, {info["author"][:40]})')
        time.sleep(1)

    credits['updated'] = time.strftime('%Y-%m-%d')
    CREDITS.write_text(json.dumps(credits, indent=1, ensure_ascii=False) + '\n')
    for s in skipped:
        print('  skip', *s)
    print(f'{len(todo) - len(skipped)} saved, {len(skipped)} skipped')


if __name__ == '__main__':
    main()
