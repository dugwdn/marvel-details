// Ads: three AdSense boxes per page (below the top, mid-page, page end).
// Each box stays hidden until AdSense actually fills it, so empty or
// unapproved slots never show a blank space. To turn a box on, put the
// data-ad-slot number from AdSense into SLOTS below.
(function () {
  var CLIENT = 'ca-pub-7178251279168670';
  var SLOTS = { top: '', mid: '', end: '' };

  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + CLIENT;
  document.head.appendChild(s);

  var css = document.createElement('style');
  css.textContent =
    '.ad-box{display:none;margin:2rem auto;max-width:1600px;text-align:center}' +
    '.ad-box:has(ins[data-ad-status="filled"]){display:block}' +
    '.ad-box .ad-label{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:.25rem}';
  document.head.appendChild(css);

  function box(name) {
    var d = document.createElement('div');
    d.className = 'ad-box';
    d.setAttribute('data-ad-box', name);
    d.innerHTML = '<div class="ad-label">Advertisement</div>';
    if (SLOTS[name]) {
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', CLIENT);
      ins.setAttribute('data-ad-slot', SLOTS[name]);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      d.appendChild(ins);
    }
    return d;
  }

  var names = ['top', 'mid', 'end'];
  // Pages built with placeholder boxes: swap each placeholder for a real box.
  var placeholders = document.querySelectorAll('.ad-slot');
  var placed = [];
  placeholders.forEach(function (p, i) {
    if (i < 3) { var b = box(names[i]); p.replaceWith(b); placed.push(names[i]); }
    else p.remove();
  });

  // Other pages: place the boxes that are still missing.
  var main = document.querySelector('article') || document.querySelector('main') ||
    document.querySelector('.container') || document.body;
  var footer = document.querySelector('footer');
  var top = document.querySelector('header') || document.querySelector('h1');
  if (placed.indexOf('top') < 0 && top && top.parentNode) {
    top.parentNode.insertBefore(box('top'), top.nextSibling);
  }
  if (placed.indexOf('mid') < 0 && main.children.length > 3) {
    var kids = main.children;
    main.insertBefore(box('mid'), kids[Math.floor(kids.length / 2)]);
  }
  if (placed.indexOf('end') < 0) {
    if (footer && footer.parentNode) footer.parentNode.insertBefore(box('end'), footer);
    else document.body.appendChild(box('end'));
  }

  document.querySelectorAll('.ad-box ins.adsbygoogle').forEach(function () {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
})();
