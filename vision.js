'use strict';

// Native horizontal scrolling remains available without JavaScript.
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.v3-demo-track');
  const previous = carousel.querySelector('[data-carousel-prev]');
  const next = carousel.querySelector('[data-carousel-next]');
  const position = carousel.querySelector('.v3-carousel-position');
  const cards = [...track.querySelectorAll('.clip-card')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  function update() {
    queued = false;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
    const first = cards[0];
    const step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0) : 1;
    const current = Math.min(cards.length, Math.max(1, Math.round(track.scrollLeft / step) + 1));
    position.textContent = `Example ${current} of ${cards.length} · Scroll or use the arrows to explore`;
  }
  function move(direction) {
    const width = cards[0]?.getBoundingClientRect().width || track.clientWidth;
    track.scrollBy({left: direction * (width + parseFloat(getComputedStyle(track).gap || 0)), behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, {passive: true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      track.scrollTo({left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduced.matches ? 'instant' : 'smooth'});
    }
  });
  window.addEventListener('resize', update);
  update();
});
