// Every MCU Character page: search, filter and sort the list that is already
// on the page (the list itself is plain HTML so search engines can read it).
(function () {
  var list = document.getElementById('dir-list');
  if (!list) return;
  var items = Array.prototype.slice.call(list.children);
  var q = document.getElementById('dir-q');
  var t = document.getElementById('dir-t');
  var k = document.getElementById('dir-k');
  var o = document.getElementById('dir-o');
  var count = document.getElementById('dir-count');
  var none = document.getElementById('dir-none');
  var total = items.length;
  var name = function (li) { return li.querySelector('.dir-name').textContent.replace('Full page', '').replace(/^["'\s]+/, '').trim(); };

  // Remember filters in the address so a filtered list can be shared.
  var params = new URLSearchParams(location.search);
  if (params.get('q')) q.value = params.get('q');
  if (params.get('in')) t.value = params.get('in');
  if (params.get('show')) k.value = params.get('show');
  if (params.get('sort')) o.value = params.get('sort');

  function apply() {
    var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var title = t.value, kind = k.value, shown = 0;
    items.forEach(function (li) {
      var ok = words.every(function (w) { return li.dataset.s.indexOf(w) !== -1; });
      if (ok && title) ok = (',' + li.dataset.t + ',').indexOf(',' + title + ',') !== -1;
      if (ok && kind === 'f') ok = li.dataset.k.indexOf('f') !== -1;
      if (ok && kind === 's') ok = li.dataset.k.indexOf('s') !== -1;
      if (ok && kind === 'live') ok = li.dataset.a === '0';
      li.hidden = !ok;
      if (ok) shown++;
    });
    var sorted = items.slice();
    if (o.value === 'az') sorted.sort(function (a, b) { return name(a).localeCompare(name(b)); });
    else if (o.value === 'first') sorted.sort(function (a, b) { return a.dataset.first.localeCompare(b.dataset.first) || name(a).localeCompare(name(b)); });
    else sorted.sort(function (a, b) { return b.dataset.n - a.dataset.n || name(a).localeCompare(name(b)); });
    sorted.forEach(function (li) { list.appendChild(li); });
    count.textContent = shown === total ? 'Showing all ' + total + ' characters' : 'Showing ' + shown + ' of ' + total + ' characters';
    none.hidden = shown !== 0;
    var p = new URLSearchParams();
    if (q.value.trim()) p.set('q', q.value.trim());
    if (title) p.set('in', title);
    if (kind) p.set('show', kind);
    if (o.value !== 'n') p.set('sort', o.value);
    var s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }

  var timer;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
  [t, k, o].forEach(function (el) { el.addEventListener('change', apply); });
  apply();

  // Opening a link to one character (#loki) shows it even if filters hide it.
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.hidden) { q.value = ''; t.value = ''; k.value = ''; apply(); }
    if (target) { target.classList.add('dir-hit'); target.scrollIntoView(); }
  }
})();
