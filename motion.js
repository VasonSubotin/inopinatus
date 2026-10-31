'use strict';

(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene = document.querySelector('.hero-sequence');
  const hero = scene?.querySelector('.hero');
  const video = scene?.querySelector('.hero-video');
  const toggle = scene?.querySelector('.film-toggle');
  const modal = document.querySelector('#video-dialog');
  const heroActions = scene ? [...scene.querySelectorAll('.hero-content a, .hero-bottom a')] : [];
  const saveData = navigator.connection?.saveData === true;
  const clamp = value => Math.min(1, Math.max(0, value));
  let userReduced = false;
  try {userReduced = sessionStorage.getItem('seaqr-reduce-motion') === 'true';} catch {}
  const switchButton = document.querySelector('.motion-switch');
  let enabled = false;
  let scheduled = false;
  let heroOnScreen = !!scene && scene.getBoundingClientRect().top < innerHeight;
  let userPaused = false;
  let manualPlay = false;
  let revealObserver;
  let playPending = false;

  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const revealSelectors = [
    '.section-top', '.intro-grid > *', '.hardware-display', '.platform-steps article',
    '.evidence-heading > *', '.clip-card', '.application-heading > *', '.application-card',
    '.field-photo', '.field-copy', '.development-strip', '.company-grid > *',
    '.closing-cta .wrap > *', '.page-hero .eyebrow', '.page-hero h1', '.page-hero .lead',
    '.hero-product', '.principle-grid > *', '.product-card', '.architecture-grid > *',
    '.method-grid > *', '.discipline-grid > *', '.pilot-steps > *', '.field-detail-grid > *',
    '.company-mission .wrap > *', '.team-grid > *', '.contact-page aside', '.contact-page form'
  ].join(',');
  const reveals = [...document.querySelectorAll(revealSelectors)];
  const photoFrames = [...document.querySelectorAll('.field-photo')];

  function configureReveals() {
    revealObserver?.disconnect();
    if (!enabled) {
      reveals.forEach(element => element.classList.add('is-visible'));
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08, rootMargin: '0px 0px -4% 0px'});
    reveals.forEach(element => {
      // Never conceal content that is already in view or has already been seen.
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight * .94) element.classList.add('is-visible');
      element.classList.add('reveal-item');
      const siblings = [...element.parentElement.children];
      const stagger = Math.min(siblings.indexOf(element), 2) * 75;
      element.style.setProperty('--reveal-delay', `${stagger}ms`);
      if (!element.classList.contains('is-visible')) revealObserver.observe(element);
    });
  }

  function updateFilmButton() {
    if (!toggle || !video) return;
    const playing = !video.paused;
    toggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    toggle.querySelector('.film-toggle-label').textContent = playing ? 'Pause film' : 'Play film';
    toggle.querySelector('.film-toggle-icon').textContent = playing ? 'Ⅱ' : '▶';
  }

  async function syncFilm() {
    if (!video) return;
    const automaticPlayback = enabled && !saveData;
    const shouldPlay = (automaticPlayback || manualPlay) && !userPaused && heroOnScreen &&
      !document.hidden && !modal?.open;
    if (!shouldPlay) {
      video.pause();
      updateFilmButton();
      return;
    }
    if (video.paused && !playPending) {
      playPending = true;
      video.muted = true;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      try {
        await video.play();
        if (document.hidden || !heroOnScreen || modal?.open || userPaused || (!enabled && !manualPlay)) video.pause();
      } catch {
        // A blocked autoplay remains a working, explicit play control over a poster.
      } finally {
        playPending = false;
        updateFilmButton();
      }
    }
  }

  function updateScroll() {
    scheduled = false;
    if (!enabled) return;
    // Read geometry first; transform/opacity writes below do not change page layout.
    const viewportHeight = innerHeight;
    const pageRange = document.documentElement.scrollHeight - viewportHeight;
    const sceneRect = scene?.getBoundingClientRect();
    const stageHeight = hero?.offsetHeight || 0;
    const photoPositions = photoFrames.map(element => ({element, rect: element.getBoundingClientRect()}));
    progress.style.transform = `scaleX(${pageRange > 0 ? clamp(scrollY / pageRange) : 0})`;
    if (sceneRect && hero) {
      const p = clamp(-sceneRect.top / Math.max(1, sceneRect.height - stageHeight));
      const small = innerWidth <= 800;
      hero.style.setProperty('--film-inset', `${p * (small ? 14 : 40)}px`);
      hero.style.setProperty('--film-footer', `${p * (small ? 73 : 88)}px`);
      hero.style.setProperty('--film-scale', String(1.055 - p * .055));
      hero.style.setProperty('--copy-opacity', String(clamp(1 - p * 1.7)));
      hero.style.setProperty('--copy-shift', `${-p * 72}px`);
      hero.style.setProperty('--bottom-opacity', String(clamp(1 - p * 2)));
      hero.style.setProperty('--outro-opacity', String(clamp((p - .45) / .4)));
      const hidden = p > .58;
      if (hero.classList.contains('hero-copy-hidden') !== hidden) {
        hero.classList.toggle('hero-copy-hidden', hidden);
        // Keep the document heading available to assistive technology; skip faded links.
        heroActions.forEach(action => {action.inert = hidden;});
      }
    }
    photoPositions.forEach(({element, rect}) => {
      if (rect.bottom > 0 && rect.top < viewportHeight) {
        const center = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        element.style.setProperty('--photo-drift', `${Math.max(-15, Math.min(15, center * -20))}px`);
      }
    });
  }

  function requestUpdate() {
    if (!scheduled && enabled) {
      scheduled = true;
      requestAnimationFrame(updateScroll);
    }
  }

  function configureMotion() {
    enabled = !preference.matches && !userReduced && 'IntersectionObserver' in window;
    if (switchButton) {
      switchButton.disabled = preference.matches;
      switchButton.textContent = preference.matches ? 'Reduced motion' : enabled ? 'Motion on' : 'Motion off';
      switchButton.setAttribute('aria-pressed', String(enabled));
      switchButton.setAttribute('aria-label', preference.matches ? 'Reduced motion follows your device preference' : enabled ? 'Reduce page motion' : 'Enable page motion');
    }
    root.classList.toggle('motion-enabled', enabled);
    configureReveals();
    if (!enabled) {
      progress.style.transform = 'scaleX(0)';
      if (hero) {
        hero.classList.remove('hero-copy-hidden');
        heroActions.forEach(action => {action.inert = false;});
        hero.style.setProperty('--copy-opacity', '1');
        hero.style.setProperty('--copy-shift', '0px');
        hero.style.setProperty('--bottom-opacity', '1');
        hero.style.setProperty('--film-inset', '0px');
        hero.style.setProperty('--film-footer', '0px');
        hero.style.setProperty('--outro-opacity', '0');
      }
      if (!manualPlay) video?.classList.remove('is-ready');
    }
    syncFilm();
    requestUpdate();
  }

  if (video) {
    toggle.hidden = false;
    video.addEventListener('playing', () => {video.classList.add('is-ready'); updateFilmButton();});
    video.addEventListener('pause', updateFilmButton);
    video.addEventListener('error', () => {
      video.classList.remove('is-ready');
      toggle.hidden = true;
    });
    toggle.addEventListener('click', () => {
      if (!video.paused) {userPaused = true; manualPlay = false;}
      else {userPaused = false; manualPlay = true;}
      syncFilm();
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        heroOnScreen = entries[0].isIntersecting;
        syncFilm();
      }, {threshold: 0});
      observer.observe(hero);
    }
    document.addEventListener('visibilitychange', syncFilm);
    if (modal) new MutationObserver(syncFilm).observe(modal, {attributes: true, attributeFilter: ['open']});
  }

  switchButton?.addEventListener('click', () => {
    userReduced = !userReduced;
    manualPlay = false;
    userPaused = false;
    try {sessionStorage.setItem('seaqr-reduce-motion', String(userReduced));} catch {}
    configureMotion();
  });

  preference.addEventListener('change', () => {
    if (preference.matches) {manualPlay = false; userPaused = false;}
    configureMotion();
  });
  window.addEventListener('scroll', requestUpdate, {passive: true});
  window.addEventListener('resize', requestUpdate, {passive: true});
  window.addEventListener('pageshow', requestUpdate);
  // Filtering and mission tabs can expose previously hidden content without a scroll.
  document.addEventListener('click', requestUpdate);
  configureMotion();
  if (enabled && scene && scrollY < 80) root.classList.add('hero-intro');
})();
