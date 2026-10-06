// The Universe Map opens as a full-screen window over the site.
// Back, the close button and the Esc key all return to where the visitor came
// from on this site, or to the home page if they arrived from somewhere else.
(function () {
  function leaveMap(e) {
    let fromSite = false;
    try {
      fromSite = document.referrer && new URL(document.referrer).origin === location.origin &&
        new URL(document.referrer).pathname !== location.pathname;
    } catch (err) { /* bad referrer: go home */ }
    if (fromSite && history.length > 1) {
      if (e) e.preventDefault();
      history.back();
      return true;
    }
    // Otherwise the link's own href ("/") takes them home.
    return false;
  }

  const back = document.getElementById('map-back');
  const close = document.getElementById('map-close');
  if (back) back.addEventListener('click', leaveMap);
  if (close) close.addEventListener('click', leaveMap);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Let Esc close the search box or the details panel first.
    if (document.activeElement && document.activeElement.id === 'search-input') return;
    const details = document.getElementById('details-section');
    if (details && details.style.display !== 'none') return;
    if (!leaveMap()) location.href = '/';
  });

  if (back) back.focus({ preventScroll: true });
})();
