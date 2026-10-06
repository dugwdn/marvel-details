// Trailer cards: swap in YouTube's own player (youtube-nocookie) only when clicked,
// so a page with 50 trailers loads none of them up front.
// Faces spotlight: rotates every few seconds; stops on hover, focus, Pause or reduced motion.
(() => {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.yt-play');
    if (!btn) return;
    const card = btn.closest('.yt-tile');
    const frame = document.createElement('div');
    frame.className = 'trailer-frame';
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1`;
    f.title = btn.dataset.title;
    f.loading = 'lazy';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    frame.appendChild(f);
    btn.replaceWith(frame);
    card.classList.add('is-playing');
    if (window.gtag) window.gtag('event', 'play_trailer', { video_id: btn.dataset.yt });
  });

  for (const box of document.querySelectorAll('.faces-spotlight')) {
    const slides = [...box.querySelectorAll('.spot-slide')];
    if (slides.length < 2) continue;
    let i = 0;
    let timer = null;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let paused = still;
    const pauseBtn = box.querySelector('.spot-pause');
    const show = (n) => {
      slides[i].hidden = true;
      i = (n + slides.length) % slides.length;
      slides[i].hidden = false;
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { stop(); if (!paused) timer = setInterval(() => show(i + 1), +box.dataset.rotate || 6000); };
    const label = () => {
      pauseBtn.textContent = paused ? '▶' : '❚❚';
      pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    };
    box.querySelector('.spot-next').addEventListener('click', () => { show(i + 1); start(); });
    box.querySelector('.spot-prev').addEventListener('click', () => { show(i - 1); start(); });
    pauseBtn.addEventListener('click', () => { paused = !paused; label(); start(); });
    box.addEventListener('mouseenter', stop);
    box.addEventListener('mouseleave', start);
    box.addEventListener('focusin', stop);
    box.addEventListener('focusout', start);
    label();
    start();
  }
})();
