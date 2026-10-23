'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let settings = {
  intervalMinutes: 45,
  lingerSeconds: 30,
  enabled: true,
  dailyGoalMl: 2000,
  cupMl: 250,
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  quietEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  language: 'auto',
  theme: 'light',
};
let saveTimer = null;

const $ = (id) => document.getElementById(id);
const LOCALES = {
  en: 'en', es: 'es', fr: 'fr', de: 'de', pt: 'pt-BR', hi: 'hi',
  ja: 'ja', ko: 'ko', zh: 'zh-CN', zhTW: 'zh-TW', id: 'id', vi: 'vi', th: 'th',
  bn: 'bn-u-nu-latn', ta: 'ta', ur: 'ur', fil: 'fil', ms: 'ms', tr: 'tr',
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], weekdays: [1, 2, 3, 4, 5], weekends: [0, 6] };

// Apply the cached theme immediately so the popup doesn't flash the wrong one
try {
  const cached = localStorage.getItem('wbTheme');
  if (cached === 'light' || cached === 'dark') document.documentElement.dataset.theme = cached;
  else if (cached === 'auto') delete document.documentElement.dataset.theme;
} catch (_) {}

const THEMES = ['auto', 'light', 'dark'];

function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'light' || settings.theme === 'dark') root.dataset.theme = settings.theme;
  else delete root.dataset.theme;
  try { localStorage.setItem('wbTheme', settings.theme); } catch (_) {}
  setSeg($('theme-chips'), THEMES.indexOf(settings.theme));
  syncSunMoon();
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (t !== 'light' && darkQuery.matches);
}

function syncSunMoon() {
  const btn = $('theme-toggle');
  if (btn) btn.setAttribute('aria-checked', String(isDark()));
}
darkQuery.addEventListener('change', syncSunMoon)

const lang = () => wbResolveLang(settings.language);
const t = (key, vars) => wbT(lang(), key, vars);
const locale = () => LOCALES[lang()] || 'en';
const fmtMl = (ml) => (ml >= 1000 ? `${(ml / 1000).toFixed(1).replace(/\.0$/, '')} L` : `${Math.round(ml)} ml`);

function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Segmented controls (sliding thumb) ─────────────────────────────────────
function initSeg(seg) {
  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  seg.prepend(thumb);
  seg.style.setProperty('--n', seg.querySelectorAll(':scope > button').length);
  seg.classList.add('none');
}

function setSeg(seg, index) {
  seg.classList.toggle('none', index < 0);
  if (index >= 0) seg.style.setProperty('--i', index);
  seg.querySelectorAll(':scope > button').forEach((b, i) => b.classList.toggle('active', i === index));
}

document.querySelectorAll('.seg').forEach(initSeg);

// ── Tabs ───────────────────────────────────────────────────────────────────
const tabButtons = [...document.querySelectorAll('.tab')];

function showTab(name) {
  setSeg($('tabs'), tabButtons.findIndex(b => b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'stats' || name === 'history') refreshStats();
}

tabButtons.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));

// ── Saving ─────────────────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  const status = $('save-status');
  status.textContent = t('saving');
  saveTimer = setTimeout(async () => {
    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });
    status.textContent = t('saved');
    setTimeout(() => { status.textContent = ''; }, 1800);
  }, 280);
}

// ── Chip groups ────────────────────────────────────────────────────────────
function activateChip(groupId, value) {
  const buttons = [...document.querySelectorAll(`#${groupId} > button`)];
  setSeg($(groupId), buttons.findIndex(c => Number(c.dataset.value) === value));
}

function bindChips(groupId, customInputId, key, onChange) {
  document.querySelectorAll(`#${groupId} > button`).forEach(chip => {
    chip.addEventListener('click', () => {
      settings[key] = Number(chip.dataset.value);
      activateChip(groupId, settings[key]);
      $(customInputId).value = '';
      onChange?.();
      scheduleSave();
    });
  });

  const input = $(customInputId);
  input.addEventListener('input', () => {
    const v = parseInt(input.value, 10);
    if (!v || v < Number(input.min || 1) || v > Number(input.max || Infinity)) return;
    settings[key] = v;
    activateChip(groupId, v);
    onChange?.();
    scheduleSave();
  });
}

bindChips('interval-chips', 'interval-custom', 'intervalMinutes');
bindChips('linger-chips',   'linger-custom',   'lingerSeconds');
bindChips('goal-chips',     'goal-custom',     'dailyGoalMl', () => refreshStats());
bindChips('cup-chips',      'cup-custom',      'cupMl',       () => renderLogButton());

// ── Master toggle ──────────────────────────────────────────────────────────
$('toggle-enabled').addEventListener('change', e => {
  settings.enabled = e.target.checked;
  scheduleSave();
});

// ── Weekdays ───────────────────────────────────────────────────────────────
function sameDays(a, b) {
  return a.length === b.length && a.every(d => b.includes(d));
}

function renderDays() {
  const fmt = new Intl.DateTimeFormat(locale(), { weekday: 'narrow' });
  const long = new Intl.DateTimeFormat(locale(), { weekday: 'long' });
  const box = $('day-buttons');
  box.replaceChildren(...DAY_ORDER.map(d => {
    const ref = new Date(2024, 0, 7 + d); // 7 Jan 2024 was a Sunday
    const btn = document.createElement('button');
    btn.className = 'day' + (settings.activeDays.includes(d) ? ' on' : '');
    btn.textContent = fmt.format(ref);
    btn.title = long.format(ref);
    btn.setAttribute('aria-pressed', settings.activeDays.includes(d));
    btn.addEventListener('click', () => {
      const days = new Set(settings.activeDays);
      if (days.has(d)) { if (days.size > 1) days.delete(d); } else days.add(d);
      settings.activeDays = [...days].sort();
      renderDays();
      scheduleSave();
    });
    return btn;
  }));

  const names = Object.keys(PRESETS);
  setSeg($('day-presets'), names.findIndex(n => sameDays(PRESETS[n], settings.activeDays)));
}

document.querySelectorAll('#day-presets > button').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.activeDays = [...PRESETS[btn.dataset.preset]];
    renderDays();
    scheduleSave();
  });
});

// ── Quiet hours ────────────────────────────────────────────────────────────
function syncQuietUi() {
  $('quiet-times').classList.toggle('disabled', !settings.quietEnabled);
}

$('quiet-enabled').addEventListener('change', e => {
  settings.quietEnabled = e.target.checked;
  syncQuietUi();
  scheduleSave();
});

[['quiet-start', 'quietStart'], ['quiet-end', 'quietEnd']].forEach(([id, key]) => {
  $(id).addEventListener('change', e => {
    if (!e.target.value) return;
    settings[key] = e.target.value;
    scheduleSave();
  });
});

// ── Theme ──────────────────────────────────────────────────────────────────
document.querySelectorAll('#theme-chips > button').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.theme = btn.dataset.themeValue;
    applyTheme();
    scheduleSave();
  });
});

$('theme-toggle').addEventListener('click', () => {
  settings.theme = isDark() ? 'light' : 'dark';
  applyTheme();
  scheduleSave();
});

// ── Language ───────────────────────────────────────────────────────────────
function renderLanguageOptions() {
  const sel = $('language');
  sel.replaceChildren(
    new Option(t('languageAuto'), 'auto'),
    ...Object.entries(WB_LANGUAGES).map(([code, name]) => new Option(name, code))
  );
  sel.value = settings.language;
}

$('language').addEventListener('change', e => {
  settings.language = e.target.value;
  applyI18n();
  scheduleSave();
});

function applyI18n() {
  document.documentElement.lang = lang();
  document.documentElement.dir = wbIsRtl(lang()) ? 'rtl' : 'ltr';
  document.documentElement.style.setProperty('--dir', wbIsRtl(lang()) ? -1 : 1);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $('theme-toggle').setAttribute('aria-label', t('theme'));
  $('quiet-start').setAttribute('aria-label', t('quietStart'));
  $('quiet-end').setAttribute('aria-label', t('quietEnd'));
  renderLanguageOptions();
  renderDays();
  renderLogButton();
  refreshStats();
}

// ── Preview ────────────────────────────────────────────────────────────────
$('btn-preview').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await chrome.runtime.sendMessage({ type: 'PREVIEW', tabId: tab?.id });
  window.close();
});

// ── Log water ──────────────────────────────────────────────────────────────
function renderLogButton() {
  $('btn-log').textContent = t('logCup', { n: settings.cupMl });
}

async function logMl(ml) {
  await chrome.runtime.sendMessage({ type: 'DRANK', ml });
  refreshStats();
}

$('btn-log').addEventListener('click', () => logMl(settings.cupMl));

document.querySelectorAll('#quick-add .pill').forEach(btn => {
  btn.addEventListener('click', () => logMl(Number(btn.dataset.ml)));
});

function addCustomMl() {
  const input = $('quick-custom');
  const v = parseInt(input.value, 10);
  if (!v || v < 10 || v > 2000) return;
  input.value = '';
  logMl(v);
}
$('btn-quick-custom').addEventListener('click', addCustomMl);
$('quick-custom').addEventListener('keydown', e => { if (e.key === 'Enter') addCustomMl(); });

// ── Stats & history ────────────────────────────────────────────────────────
const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

function renderGoal(ml, goal) {
  const pct = goal > 0 ? Math.min(ml / goal, 1) : 0;
  const ring = $('ring-fg');
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);
  ring.classList.toggle('done', ml >= goal);
  $('goal-drinks').textContent = ml.toLocaleString(locale());
  $('goal-target').textContent = goal.toLocaleString(locale());
  $('goal-title').textContent = ml >= goal ? t('goalReached') : t('mlToGo', { n: (goal - ml).toLocaleString(locale()) });
}

function lastSevenDays(stats) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    out.push({ date: d, ml: i === 0 ? stats.drinkMl : (stats.history[key] || 0), today: i === 0 });
  }
  return out;
}

function renderHistory(stats, goal) {
  const days = lastSevenDays(stats);
  const H = 130;
  const top = Math.max(goal, ...days.map(d => d.ml)) * 1.1;
  const chart = $('chart');
  const short = new Intl.DateTimeFormat(locale(), { weekday: 'short' });

  chart.replaceChildren(
    ...days.map((d, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      const h = Math.round((d.ml / top) * H);
      const bar = document.createElement('div');
      bar.className = 'bar' + (d.ml >= goal ? ' hit' : '') + (d.today ? ' today' : '');
      bar.style.height = `${h}px`;
      bar.style.animationDelay = `${i * 40}ms`;
      bar.title = `${short.format(d.date)} · ${d.ml} ml`;
      wrap.append(bar);
      if (d.ml > 0) {
        const v = document.createElement('span');
        v.className = 'bar-val';
        v.style.bottom = `${h}px`;
        v.textContent = (d.ml / 1000).toFixed(1);
        wrap.append(v);
      }
      return wrap;
    }),
    Object.assign(document.createElement('div'), { className: 'goal-line' })
  );
  chart.querySelector('.goal-line').style.bottom = `${Math.round((goal / top) * H)}px`;

  $('chart-days').replaceChildren(...days.map(d => {
    const s = document.createElement('span');
    s.textContent = d.today ? t('todayShort') : short.format(d.date);
    if (d.today) s.className = 'today';
    return s;
  }));
  $('chart-note').textContent = t('goalLine', { n: goal.toLocaleString(locale()) });

  const avg = days.reduce((a, d) => a + d.ml, 0) / days.length;
  const best = Math.max(...days.map(d => d.ml));
  // Streak counts back from today; an unfinished today doesn't break it.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].ml >= goal) streak++;
    else if (!(i === days.length - 1)) break;
  }
  $('hist-avg').textContent = fmtMl(avg);
  $('hist-best').textContent = fmtMl(best);
  $('hist-streak').textContent = t(streak === 1 ? 'day' : 'days', { n: streak });
}

async function refreshStats() {
  const { settings: current, stats, snoozedUntil, quiet, offDay } =
    await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  const goal = current.dailyGoalMl;

  renderGoal(stats.drinkMl ?? 0, goal);
  renderHistory(stats, goal);
  $('stat-total').textContent = stats.reminders ?? 0;

  if (stats.lastDrinkTs) {
    const mins = Math.round((Date.now() - stats.lastDrinkTs) / 60000);
    $('stat-last').textContent = mins < 1 ? t('justNow') : t('minAgo', { n: mins });
  } else {
    $('stat-last').textContent = '—';
  }

  const alarm = await chrome.alarms.get('water-break-reminder');
  if (alarm) {
    const mins = Math.max(0, Math.round((alarm.scheduledTime - Date.now()) / 60000));
    $('stat-next').textContent = mins < 1 ? `<1 ${t('min')}` : `${mins} ${t('min')}`;
  } else {
    $('stat-next').textContent = t('disabled');
  }

  const snoozed = snoozedUntil && Date.now() < snoozedUntil;
  const snoozeEl = $('snooze-notice');
  snoozeEl.hidden = !snoozed;
  if (snoozed) {
    const at = new Date(snoozedUntil).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    snoozeEl.textContent = t('snoozedUntil', { time: at });
  }
  $('quiet-notice').hidden = !quiet;
  $('quiet-notice').textContent = t('quietNotice');
  $('offday-notice').hidden = !offDay;
  $('offday-notice').textContent = t('offDayNotice');
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const { settings: saved } = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  Object.assign(settings, saved);

  $('toggle-enabled').checked = settings.enabled;
  activateChip('interval-chips', settings.intervalMinutes);
  activateChip('linger-chips', settings.lingerSeconds);
  activateChip('goal-chips', settings.dailyGoalMl);
  activateChip('cup-chips', settings.cupMl);

  $('quiet-enabled').checked = settings.quietEnabled;
  $('quiet-start').value = settings.quietStart;
  $('quiet-end').value = settings.quietEnd;
  syncQuietUi();

  applyTheme();
  showTab('stats');
  applyI18n();
}

// tour.js waits on this so it can start once the popup is ready
window.wbReady = init().catch(console.error);
