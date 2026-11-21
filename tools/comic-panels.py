"""Wrap each article's sections in comic-strip panels.

Inside <article>, everything after the title and byline becomes panels: the
intro is the opening (splash) panel, and each top-level <h2> starts a new
panel. Safe to run again: it skips articles already wrapped.
Run: python3 tools/comic-panels.py
"""
import re, sys
from html.parser import HTMLParser
from pathlib import Path

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr'}

class TopLevel(HTMLParser):
    """Records the offsets of the article's direct children."""
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text, self.depth, self.kids = text, 0, []
        self.lines = [0]
        for m in re.finditer('\n', text): self.lines.append(m.end())
    def off(self):
        l, c = self.getpos(); return self.lines[l-1] + c
    def handle_starttag(self, tag, attrs):
        if self.depth == 0: self.kids.append([tag, self.off(), None])
        if tag not in VOID: self.depth += 1
        elif self.depth == 0: self.kids[-1][2] = self.off() + len(self.get_starttag_text())
    def handle_endtag(self, tag):
        if tag in VOID: return
        self.depth -= 1
        if self.depth == 0: self.kids[-1][2] = self.text.index('>', self.off()) + 1

def wrap(html):
    m = re.search(r'(<article[^>]*>)(.*?)(\n\s*</article>)', html, re.S)
    if not m or 'comic-panel' in m.group(2): return None
    body = m.group(2); p = TopLevel(body); p.feed(body)
    kids = p.kids
    # Title and byline stay above the strip.
    start = 0
    while start < len(kids) and (kids[start][0] == 'h1' or (start <= 2 and 'article-meta' in body[kids[start][1]:kids[start][2]][:80]) or (start == 1 and kids[start][0] == 'p' and body[kids[start][1]:kids[start][2]].startswith('<p><strong>By '))):
        start += 1
    groups, cur = [], []
    for k in kids[start:]:
        chunk = body[k[1]:k[2]]
        if k[0] == 'h2' and cur: groups.append(cur); cur = []
        if 'class="next-article"' in chunk:
            if cur: groups.append(cur); cur = []
            groups.append([('next', chunk)]); continue
        cur.append((k[0], chunk))
    if cur: groups.append(cur)
    head = body[:kids[start][1]].rstrip() if start < len(kids) else body
    out = [head, '\n\n                <div class="comic-strip">']
    for i, g in enumerate(groups):
        if g[0][0] == 'next':
            out.append('\n                </div>\n\n                ' + g[0][1]); continue
        words = len(re.sub('<[^>]+>', ' ', ''.join(c for _, c in g)).split())
        cls = 'comic-panel' + (' comic-splash' if i == 0 else '') + (' comic-wide' if words > 110 or i == 0 else '')
        inner = '\n                    '.join(c for _, c in g)
        out.append(f'\n                    <section class="{cls}">\n                    {inner}\n                    </section>')
    if not any(g[0][0] == 'next' for g in groups): out.append('\n                </div>')
    return html[:m.start(2)] + ''.join(out) + html[m.end(2):]

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent / 'public' / 'articles'
    for f in sorted(root.glob('*.html')):
        if f.name == 'index.html': continue
        new = wrap(f.read_text())
        if new: f.write_text(new); print('wrapped', f.name)
