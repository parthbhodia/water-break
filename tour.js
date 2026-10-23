'use strict';

// Guided tour: a spotlight on the important controls plus a bottom sheet that
// explains each one. Runs once on first open; "Take the tour" in Settings replays it.
// Shares globals ($, t, showTab) with popup.js, which is loaded before this file.

const TOUR_STEPS = [
  { tab: 'stats',    el: () => document.querySelector('#tab-stats .card.hero') },
  { tab: 'stats',    el: () => $('cup-chips').closest('.card') },
  { tab: 'settings', el: () => $('goal-chips').closest('.card') },
  { tab: 'settings', el: () => $('interval-chips').closest('.card') },
  { tab: 'settings', el: () => $('day-buttons').closest('.card') },
  { tab: 'settings', el: () => $('quiet-enabled').closest('.card') },
  { tab: null,       el: () => $('theme-toggle'), pad: 5 },
];

let tourIndex = -1;
let tourTimer = null;

function tourStep() {
  return TOUR_STEPS[tourIndex];
}

function startTour() {
  tourIndex = 0;
  document.body.classList.add('touring');
  $('tour').hidden = false;
  window.scrollTo(0, 0);
  renderTourStep();
}

function endTour(markDone = true) {
  clearTimeout(tourTimer);
  tourIndex = -1;
  $('tour').hidden = true;
  $('tour-spot').style.opacity = 0;
  document.body.classList.remove('touring');
  if (markDone) chrome.storage.local.set({ tourDone: true });
  showTab('stats');
  window.scrollTo(0, 0);
}

function renderTourStep() {
  const step = tourStep();
  const n = tourIndex + 1;
  const last = tourIndex === TOUR_STEPS.length - 1;

  $('tour-title').textContent = t(`tour${n}Title`);
  $('tour-body').textContent = t(`tour${n}Body`);
  $('tour-count').textContent = t('tourStep', { a: n, b: TOUR_STEPS.length });
  $('tour-skip').textContent = t('tourSkip');
  $('tour-skip').hidden = last;
  $('tour-back').textContent = t('tourBack');
  $('tour-back').hidden = tourIndex === 0;
  $('tour-next').textContent = t(last ? 'tourDone' : 'tourNext');
  $('tour-dots').replaceChildren(...TOUR_STEPS.map((_, i) => {
    const dot = document.createElement('i');
    dot.className = i === tourIndex ? 'on' : i < tourIndex ? 'done' : '';
    return dot;
  }));

  // Switching tabs replays a short fade; wait for it before measuring the target.
  const switching = step.tab && !$(`tab-${step.tab}`).classList.contains('active');
  if (step.tab) showTab(step.tab);
  $('tour-spot').style.opacity = 0;
  clearTimeout(tourTimer);
  tourTimer = setTimeout(() => placeSpotlight(true), switching ? 330 : 40);
}

function placeSpotlight(scrollIntoView) {
  if (tourIndex < 0) return;
  const step = tourStep();
  const el = step.el();
  if (!el) return;

  if (scrollIntoView) {
    const sheetTop = $('tour-sheet').getBoundingClientRect().top;
    const r = el.getBoundingClientRect();
    if (step.tab === null) window.scrollTo(0, 0);
    else if (r.bottom > sheetTop - 14 || r.top < 8) window.scrollBy(0, r.top - 12);
  }

  const r = el.getBoundingClientRect();
  const pad = step.pad ?? 6;
  const spot = $('tour-spot');
  spot.style.left = `${r.left - pad}px`;
  spot.style.top = `${r.top - pad}px`;
  spot.style.width = `${r.width + pad * 2}px`;
  spot.style.height = `${r.height + pad * 2}px`;
  spot.style.borderRadius = step.pad ? '24px' : '20px';
  spot.style.opacity = 1;
}

$('tour-next').addEventListener('click', () => {
  if (tourIndex >= TOUR_STEPS.length - 1) return endTour();
  tourIndex++;
  renderTourStep();
});

$('tour-back').addEventListener('click', () => {
  if (tourIndex > 0) {
    tourIndex--;
    renderTourStep();
  }
});

$('tour-skip').addEventListener('click', () => endTour());
$('btn-tour').addEventListener('click', startTour);

document.addEventListener('keydown', e => {
  if (tourIndex < 0) return;
  if (e.key === 'Escape') endTour();
  else if (e.key === 'ArrowRight' || e.key === 'Enter') $('tour-next').click();
  else if (e.key === 'ArrowLeft') $('tour-back').click();
});

window.addEventListener('scroll', () => placeSpotlight(false), { passive: true });
window.addEventListener('resize', () => placeSpotlight(false));

// Show the tour the first time the popup opens (after popup.js finished init).
async function maybeStartTour() {
  const { tourDone } = await chrome.storage.local.get({ tourDone: false });
  if (!tourDone) setTimeout(startTour, 450);
}

window.wbReady.then(maybeStartTour);
