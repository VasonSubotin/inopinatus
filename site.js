'use strict';

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
function closeMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
  navigation?.classList.remove('is-open');
}
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
});
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
window.matchMedia('(max-width: 1000px)').addEventListener('change', closeMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

// Independent, keyboard-accessible tab groups with shareable application URLs.
document.querySelectorAll('[data-tabs]').forEach(group => {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  function select(tab, updateURL = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (updateURL && tab.dataset.hash) history.replaceState(null, '', `#${tab.dataset.hash}`);
  }
  function selectFromURL() {
    const target = tabs.find(tab => `#${tab.dataset.hash}` === location.hash);
    if (target) select(target);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab, true));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(tabs[next], true);
        tabs[next].focus();
      }
    });
  });
  selectFromURL();
  window.addEventListener('hashchange', selectFromURL);
});

const filters = [...document.querySelectorAll('[data-filter]')];
function filterClips(value, updateURL = false) {
  if (!filters.some(button => button.dataset.filter === value)) value = 'all';
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
  let count = 0;
  document.querySelectorAll('.library .clip-card').forEach(card => {
    card.hidden = value !== 'all' && card.dataset.category !== value;
    if (!card.hidden) count++;
  });
  const counter = document.querySelector('#result-count');
  if (counter) counter.textContent = `${count} ${count === 1 ? 'example' : 'examples'}`;
  if (updateURL) {
    const url = new URL(location.href);
    if (value === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', value);
    history.replaceState(null, '', url);
  }
}
filters.forEach(button => button.addEventListener('click', () => filterClips(button.dataset.filter, true)));
if (filters.length) filterClips(new URLSearchParams(location.search).get('filter') || 'all');

const dialog = document.querySelector('#video-dialog');
const player = dialog?.querySelector('video');
let videoOpener;
function stopPlayer() {
  player?.pause();
  player?.removeAttribute('src');
  player?.load();
  dialog?.querySelector('iframe')?.remove();
  dialog?.querySelector('.dialog-still')?.remove();
}
function openVideo(id, opener) {
  const clip = (window.SEAQR_DEMOS || []).find(item => item.id === id);
  if (!clip || !dialog) return;
  stopPlayer();
  videoOpener = opener;
  document.querySelector('#video-dialog-title').textContent = clip.title;
  document.querySelector('#video-dialog-category').textContent = `${clip.label} / ${clip.duration}`;
  document.querySelector('#video-dialog-description').textContent = clip.description;
  document.querySelector('#video-dialog-note').textContent = clip.note;
  dialog.classList.toggle('comparison-player', !!clip.comparison);
  const oldLegend = dialog.querySelector('.comparison-legend');
  oldLegend?.remove();
  if (clip.comparison) {
    const legend = document.createElement('div');
    legend.className = 'comparison-legend';
    ['Original imagery', 'Recorded tracking output'].forEach(label => {
      const span = document.createElement('span');
      span.textContent = label;
      legend.append(span);
    });
    dialog.querySelector('.dialog-player').prepend(legend);
  }
  player.hidden = clip.provider === 'vimeo' || clip.kind === 'image';
  if (clip.kind === 'image') {
    const image = document.createElement('img');
    image.className = 'dialog-still';
    image.src = clip.src;
    image.alt = clip.alt;
    dialog.querySelector('.dialog-player').append(image);
  } else if (clip.provider === 'vimeo') {
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${clip.vimeoId}?autoplay=1&dnt=1`;
    iframe.title = clip.title;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    dialog.querySelector('.dialog-player').append(iframe);
  } else {
    player.poster = clip.poster;
    player.src = clip.src;
  }
  dialog.showModal();
  document.body.classList.add('dialog-open');
  if (clip.provider !== 'vimeo' && clip.kind !== 'image') player.play().catch(() => {});
}
document.querySelectorAll('[data-video]').forEach(button => {
  button.addEventListener('click', () => openVideo(button.dataset.video, button));
});
dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog?.addEventListener('close', () => {
  stopPlayer();
  document.body.classList.remove('dialog-open');
  videoOpener?.focus({preventScroll: true});
});

// Forms remain entirely browser-local until a contact destination is agreed.
const form = document.querySelector('#contact-form');
let enquiry = '';
if (form) {
  const interest = new URLSearchParams(location.search).get('interest');
  const select = form.elements.interest;
  if ([...select.options].some(option => option.value === interest)) select.value = interest;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    document.querySelector('#copy-enquiry').textContent = 'Copy enquiry ↗';
    enquiry = `SEAQR enquiry\n\nName: ${data.get('name').trim()}\nEmail: ${data.get('email').trim()}\nOrganization: ${data.get('organization').trim()}\nInterest: ${data.get('interest')}\n\n${data.get('message').trim()}`;
    const status = document.querySelector('#form-status');
    status.textContent = 'Your enquiry is ready to review. Nothing has been sent. You can copy it or save a text file below.';
    status.hidden = false;
    const preview = document.createElement('pre');
    preview.className = 'enquiry-preview';
    preview.textContent = enquiry;
    status.append(preview);
    document.querySelector('.enquiry-actions').hidden = false;
  });
  form.addEventListener('input', () => {
    document.querySelector('#form-status').hidden = true;
    document.querySelector('.enquiry-actions').hidden = true;
    enquiry = '';
  });
  document.querySelector('#copy-enquiry').addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(enquiry);
      button.textContent = 'Copied ✓';
    } catch {
      button.textContent = 'Copy from the preview above';
    }
  });
  document.querySelector('#download-enquiry').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([enquiry], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SEAQR-enquiry.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
document.querySelectorAll('a[data-interest]').forEach(link => {
  if (link.getAttribute('href')?.startsWith('contact.html')) {
    const url = new URL(link.href);
    url.searchParams.set('interest', link.dataset.interest);
    link.href = url.href;
  }
});
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
