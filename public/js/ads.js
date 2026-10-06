// Ads: three AdSense boxes per page (top = below the menu, mid = mid-page,
// end = above the footer). Every box always shows: a dashed "Ad space"
// placeholder with room reserved, so nothing jumps when an ad fills (styles
// in css/theme.css). When AdSense marks the unit filled, the placeholder look
// goes and a small "Advertisement" label shows above it. The top and end
// boxes are written into the HTML by tools/menu.mjs (data-ad-placeholder, so
// the site-health robot can count them); this script adds any box a page is
// missing and puts the AdSense unit in each. All three boxes reuse the one
// responsive display unit (mcueastereggs.com, 2026-10-06). A box with no slot
// id stays a placeholder (no AdSense push).
(function () {
  // Never on sign-in, account or My Marvel pages.
  if (/^\/(account|me)(\/|\.html|$)/.test(location.pathname)) return;
  var CLIENT = 'ca-pub-7178251279168670';
  var SLOT = '7081225657';
  var SLOTS = { top: SLOT, mid: SLOT, end: SLOT };

  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
  document.head.appendChild(s);

  function box(name) {
    var d = document.createElement('div');
    d.className = 'ad-box';
    d.setAttribute('data-ad-box', name);
    d.setAttribute('data-ad-placeholder', name);
    d.innerHTML = '<div class="ad-label">Advertisement</div><div class="ad-ph">Ad space</div>';
    return d;
  }
  function fill(d, name) {
    if (!SLOTS[name] || d.querySelector('ins.adsbygoogle')) return;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CLIENT);
    ins.setAttribute('data-ad-slot', SLOTS[name]);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    d.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }
  function has(name) { return document.querySelector('.ad-box[data-ad-box="' + name + '"]'); }

  // Pages without the boxes in their HTML: place the missing ones.
  var main = document.querySelector('article') || document.querySelector('main') ||
    document.querySelector('.container') || document.body;
  var footer = document.querySelector('footer');
  var top = document.querySelector('nav.site-nav') || document.querySelector('header') || document.querySelector('h1');
  if (!has('top') && top && top.parentNode) top.parentNode.insertBefore(box('top'), top.nextSibling);
  // A page can name its mid spot with data-ad-mid (the quiz does, so the box
  // never lands between the question and result screens).
  var midAt = document.querySelector('[data-ad-mid]');
  if (!has('mid') && midAt && midAt.parentNode) {
    midAt.parentNode.insertBefore(box('mid'), midAt);
  } else if (!has('mid') && main.children.length > 3) {
    var kids = main.children;
    main.insertBefore(box('mid'), kids[Math.floor(kids.length / 2)]);
  }
  if (!has('end')) {
    if (footer && footer.parentNode) footer.parentNode.insertBefore(box('end'), footer);
    else document.body.appendChild(box('end'));
  }

  var names = ['top', 'mid', 'end'];
  names.forEach(function (n) { var d = has(n); if (d) fill(d, n); });
})();
