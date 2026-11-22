// Phones show four menu tabs; "More" opens every section as a sheet under the header bar
// (styles in css/theme.css, "Phones: four tabs"). Without JavaScript the link opens it through #site-nav.
const nav = document.getElementById('site-nav');
const more = nav && nav.querySelector('.site-nav-more');
if (nav && more) {
  const header = document.querySelector('header.site-bar');
  const setOpen = (open) => {
    if (open && header) nav.style.setProperty('--nav-top', `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`);
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    more.setAttribute('aria-expanded', String(open));
    if (!open && location.hash === '#site-nav') history.replaceState(null, '', location.pathname + location.search);
  };
  more.addEventListener('click', (e) => {
    e.preventDefault();
    setOpen(!nav.classList.contains('is-open'));
    if (nav.classList.contains('is-open')) nav.querySelector('a:not(.site-nav-more)')?.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); more.focus(); }
  });
  // Back from a section page, or a wider screen: the sheet starts closed.
  window.addEventListener('pageshow', () => setOpen(false));
  matchMedia('(min-width: 641px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
}
