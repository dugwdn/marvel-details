#!/usr/bin/env python3
"""Adds fan-spotted scene details (ADR-018) to public/data/trivia.json.

tools/scene-details.json holds the details fans spotted on screen (r/MovieDetails and the
articles that collect them): what is in the frame, the scene, the question it answers and
where it was reported. Each becomes a fact on its film's trivia page and in the Ask box.
The wiki importer (tools/import-wiki-trivia.py) runs this at its end, so the two stay together.
Run: python3 tools/import-scene-details.py && node tools/build-trivia.mjs && node tools/menu.mjs
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'scene-details.json')
OUT = os.path.join(HERE, '..', 'public', 'data', 'trivia.json')

# What fans saw on screen goes under one heading; links to other films and making-of notes
# join the wiki's own groups.
KIND = {'Callback': 'MCU connections', 'Behind the scenes': 'Behind the scenes'}
SPOTTED = 'Spotted on screen'


def slug_of(work):
    return re.sub(r'[^a-z0-9]+', '-', work.lower().replace('&', 'and').replace("'", '')).strip('-')


def merge(data, details):
    for w in data['works']:
        w['facts'] = [f for f in w['facts'] if not f.get('spotted')]
    by_name = {w['work'].lower(): w for w in data['works']}
    added = 0
    for d in details:
        urls = [s['url'] for s in d.get('sources', []) if str(s.get('url', '')).startswith('https://')]
        if not urls or len(d['detail']) < 30:
            continue
        w = by_name.get(d['work'].lower())
        if not w:
            w = {'slug': slug_of(d['work']), 'work': d['work'], 'source': None, 'revid': None, 'facts': []}
            data['works'].append(w)
            by_name[d['work'].lower()] = w
        fact = {'id': 'sd-' + d['id'], 'kind': KIND.get(d['kind'], SPOTTED), 'spotted': d['kind'],
                'text': d['detail'], 'scene': d['scene'], 'q': d['question'], 'sources': urls}
        if d.get('spotted_by'):
            fact['by'] = re.sub(r'\s*\((?:per|via)[^)]*\)\s*$', '', d['spotted_by'])
        w['facts'].append(fact)
        added += 1
    # Spotted details first on each page: they are the scene-level answers people ask for.
    for w in data['works']:
        w['facts'].sort(key=lambda f: 0 if f.get('spotted') else 1)
    data['works'].sort(key=lambda w: w['work'].lower())
    return added


def main():
    data = json.load(open(OUT))
    added = merge(data, json.load(open(SRC)))
    with open(OUT, 'w') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'{added} spotted scene details added -> {os.path.relpath(OUT)}')


if __name__ == '__main__':
    main()
