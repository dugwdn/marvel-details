"""Finds an official trailer on YouTube for every MCU film and series in
public/data/mcu-characters.json and records it in public/data/media-credits.json
(videos with "film"). Each pick is checked with youtube.com/oembed: the channel
must be an official Marvel/Sony/Disney channel or a licensed trailer channel,
and the video title must name the film and say trailer or teaser.

    python3 tools/find-trailers.py          # titles that have no trailer yet
    python3 tools/find-trailers.py --all    # look again for every title
    node tools/build-media.mjs && node tools/build-credits.mjs && node tools/menu.mjs

Picks can be pinned by hand in tools/media-wanted.json under "trailers"
({"film": "Thor", "youtubeId": "..."}); a pinned id is still checked.
"""
import json, re, sys, time, pathlib, unicodedata, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CREDITS = ROOT / 'public' / 'data' / 'media-credits.json'
CHARS = ROOT / 'public' / 'data' / 'mcu-characters.json'
WANTED = ROOT / 'tools' / 'media-wanted.json'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
# Same list as test/media.test.mjs. Best first.
CHANNELS = ['Marvel Entertainment', 'Marvel Studios', 'Disney Plus', 'Sony Pictures Entertainment',
            'Movieclips Trailers', 'Movieclips', 'Rotten Tomatoes Trailers', 'Rotten Tomatoes Classic Trailers', 'Fandango']


def http(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', 'replace')


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = s.replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


STOP = {'the', 'of', 'and', 'a', 'in', 'season', 'marvel', 'marvels', 's'}


def key_words(title):
    t = re.sub(r'\s+season\s+\d+$', '', title)
    return [w for w in norm(t).split() if w not in STOP] or norm(t).split()


def oembed(vid):
    try:
        return json.loads(http('https://www.youtube.com/oembed?format=json&url=' +
                               urllib.parse.quote(f'https://www.youtube.com/watch?v={vid}')))
    except Exception:
        return None


def matches(title, info):
    if not info or info.get('author_name') not in CHANNELS:
        return False
    vt = norm(info['title'])
    if not re.search(r'\b(trailer|teaser)\b', vt):
        return False
    if re.search(r'\b(reaction|review|breakdown|explained|recap|fan made|fanmade|concept)\b', vt):
        return False
    return all(re.search(rf'\b{w}\b', vt) for w in key_words(title))


def score(info):
    t = norm(info['title'])
    return (CHANNELS.index(info['author_name']), 0 if 'official trailer' in t else 1, 0 if 'teaser' not in t else 1)


def search(title, year):
    q = f'{re.sub(r" season (\d+)$", r" season \1", title)} official trailer {year}'
    page = http('https://www.youtube.com/results?search_query=' + urllib.parse.quote(q))
    ids = []
    for v in re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', page):
        if v not in ids:
            ids.append(v)
    return ids[:10]


def main():
    data = json.loads(CHARS.read_text())
    credits = json.loads(CREDITS.read_text())
    pins = {p['film']: p['youtubeId'] for p in json.loads(WANTED.read_text()).get('trailers', [])}
    have = {v['film'] for v in credits['videos'] if v.get('film')}
    titles = [t for t in data['titles'] if '--all' in sys.argv or t['title'] not in have]
    # A series gets one trailer per season title, e.g. "Loki season 2".
    found, missed = 0, []
    for t in titles:
        title, year = t['title'], t['date'][:4]
        cands = [pins[title]] if title in pins else search(title, year)
        best = None
        for vid in cands:
            info = oembed(vid)
            time.sleep(0.4)
            if matches(title, info) and (not best or score(info) < score(best[1])):
                best = (vid, info)
        if not best:
            missed.append(title)
            print('  none', title)
            continue
        vid, info = best
        credits['videos'] = [v for v in credits['videos'] if v.get('film') != title or v.get('page') != '/'] + [{
            'page': '/', 'film': title, 'year': int(year), 'kind': 'official' if info['author_name'].startswith(('Marvel', 'Disney', 'Sony')) else 'licensed',
            'youtubeId': vid, 'title': info['title'], 'channel': info['author_name'],
            'sourceUrl': f'https://www.youtube.com/watch?v={vid}', 'verified': time.strftime('%Y-%m-%d') + ' via youtube.com/oembed',
        }]
        found += 1
        print(f'  ok   {title}: {info["title"]} [{info["author_name"]}]')
        time.sleep(1)
    out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else CREDITS
    out.write_text(json.dumps(credits, indent=1, ensure_ascii=False) + '\n')
    print(f'{found} trailers saved, {len(missed)} titles with none: {", ".join(missed)}')


if __name__ == '__main__':
    main()
