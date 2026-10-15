#!/usr/bin/env python3
"""Copy the checked fan-theory research into public/data/theories.json (ADR-018).

Research lives in the shared project folder (written by the research step, every
claim with a source URL). This keeps only the fields the pages use, puts the
most-discussed theories first (TOP), and refuses entries that break the rules
in test/trivia.test.mjs. Then: node tools/build-theories.mjs && node tools/menu.mjs
  python3 tools/import-theories.py [path/to/theories-research.json]
"""
import json, os, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/Marvel-Details/fan-theories/theories-research.json'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data', 'theories.json')
# Most talked-about first (research report 2026-10-15: cast and crew asked about it, outlets covering it).
TOP = ['ant-man-inside-thanos', 'peter-parker-in-iron-man-2', 'stan-lee-watcher', 'no-way-home-three-spider-men',
       'agnes-is-agatha', 'doom-is-tony-variant', 'soul-stone-in-wakanda-or-heimdall', 'mephisto-in-wandavision',
       'cap-worthy-since-ultron', 'quantum-realm-time-heist', 'ultron-lives-inside-vision', 'time-heist-created-doom',
       'rhodey-skrull-since-civil-war', 'loki-disguised-as-banner', 'uncle-ben-suitcase', 'bucky-killed-tonys-parents',
       'fury-skrull-since-winter-soldier', 'endgame-rat-is-ant-man-rat', 'riri-sold-her-soul', 'adult-toussaint-other-timeline']
KEEP = ('id', 'title', 'one_line', 'summary', 'films', 'characters', 'status', 'status_note', 'status_source',
        'evidence', 'against', 'origin', 'popularity', 'coverage', 'hook', 'open_question')

items = json.load(open(SRC))
out, skipped = [], []
for t in items:
    ok = (t['status'] == 'open' or (t.get('status_source') or '').startswith('https://')) and \
        len(t.get('evidence') or []) >= 2 and all((e.get('source') or '').startswith('https://') for e in t['evidence']) and t.get('against')
    if not ok:
        skipped.append(t['id'])
        continue
    x = {k: t.get(k) for k in KEEP}
    x['rank'] = TOP.index(t['id']) if t['id'] in TOP else 50
    out.append(x)
json.dump({'source': 'Fan theories from Reddit and fan forums, retold in our own words; see each theory for its sources.',
           'theories': out}, open(OUT, 'w'), indent=1, ensure_ascii=False)
print(f'{len(out)} theories written; skipped (need a second sourced clue or a verdict source): {skipped}')
