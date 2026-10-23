// Water Break — background service worker
// Fires a hydration reminder at a configurable interval, tracks a daily goal,
// and respects quiet hours.

importScripts('i18n.js');

const ALARM_NAME = 'water-break-reminder';
const NOTIFICATION_ID = 'water-break-reminder';
const DEFAULT_INTERVAL_MINUTES = 45;
const SNOOZE_MINUTES = 10;
const HISTORY_DAYS = 14;


// ─── Storage helpers ───────────────────────────────────────────────────────

async function getSettings() {
  const { settings } = await chrome.storage.sync.get({ settings: {} });
  return {
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    lingerSeconds: 30,
    enabled: true,
    dailyGoalMl: 2000,
    cupMl: 250,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    language: 'auto',
    theme: 'light',
    quietEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    ...settings,
  };
}

async function saveSettings(patch) {
  const current = await getSettings();
  await chrome.storage.sync.set({ settings: { ...current, ...patch } });
}

async function getSnoozedUntil() {
  const { snoozedUntil } = await chrome.storage.session.get({ snoozedUntil: 0 });
  return snoozedUntil;
}

function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Stats are per-day: the counters roll over at local midnight and the
// previous day's drink count is kept in `history`.
async function getStats() {
  const { stats } = await chrome.storage.local.get({ stats: {} });
  const today = dateKey();
  const s = {
    reminders: 0,
    drinkMl: stats.drinkMl ?? (stats.drinks || 0) * 250, // v1.1 stored glasses
    lastDrinkTs: null,
    ...stats,
    date: stats.date || today,
  };
  // history maps date → ml; small legacy values were glasses
  s.history = Object.fromEntries(
    Object.entries(stats.history || {}).map(([k, v]) => [k, v < 50 ? v * 250 : v])
  );

  if (s.date !== today) {
    if (s.drinkMl > 0) s.history[s.date] = s.drinkMl;
    const keep = Object.keys(s.history).sort().slice(-HISTORY_DAYS);
    s.history = Object.fromEntries(keep.map((k) => [k, s.history[k]]));
    s.date = today;
    s.reminders = 0;
    s.drinkMl = 0;
  }
  delete s.drinks;
  return s;
}

async function saveStats(stats) {
  await chrome.storage.local.set({ stats });
}

async function recordDrink(ml) {
  const [stats, settings] = await Promise.all([getStats(), getSettings()]);
  const amount = Number(ml) > 0 ? Math.round(Number(ml)) : settings.cupMl;
  stats.drinkMl += amount;
  stats.lastDrinkTs = Date.now();
  await saveStats(stats);
  return stats;
}

async function incrementReminders() {
  const stats = await getStats();
  stats.reminders += 1;
  await saveStats(stats);
}

async function snooze() {
  await chrome.storage.session.set({ snoozedUntil: Date.now() + SNOOZE_MINUTES * 60 * 1000 });
}

// ─── Quiet hours ───────────────────────────────────────────────────────────

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inQuietHours(settings, now = new Date()) {
  if (!settings.quietEnabled) return false;
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  if (start === end) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  // Window may wrap past midnight (e.g. 22:00 → 07:00)
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

function isActiveDay(settings, now = new Date()) {
  return (settings.activeDays || []).includes(now.getDay());
}

// ─── Alarm management ─────────────────────────────────────────────────────

async function scheduleAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  if (!settings.enabled) return;
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: settings.intervalMinutes,
    periodInMinutes: settings.intervalMinutes,
  });
}

// ─── Show reminder ─────────────────────────────────────────────────────────

function pickMessage(lang) {
  const list = wbMessages(lang);
  return list[Math.floor(Math.random() * list.length)];
}

// Tabs worth trying, best first: the requested tab, the focused window's
// active tab, then the active tab of any other window.
async function candidateTabIds(preferredId) {
  const ids = [];
  if (preferredId) ids.push(preferredId);
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const others = await chrome.tabs.query({ active: true });
  for (const t of [...focused, ...others]) ids.push(t.id);
  return [...new Set(ids)];
}

// Resolves true if an in-page overlay was shown. Pages without our content
// script (chrome:// pages, new tab, PDF viewer, tabs opened before install)
// reject the message, so the caller can fall back to a notification.
async function showOverlay(payload, preferredTabId) {
  for (const id of await candidateTabIds(preferredTabId)) {
    try {
      const res = await chrome.tabs.sendMessage(id, { type: 'SHOW_WATER', ...payload });
      if (res?.ok) return true;
    } catch (_) {
      // no receiver in this tab — try the next one
    }
  }
  return false;
}

function showNotification(message, progress, lang) {
  chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: wbT(lang, 'appName'),
    message: `${message}
${wbT(lang, 'notifProgress', { a: progress.drinkMl, b: progress.goalMl })}`,
    buttons: [{ title: wbT(lang, 'notifDrank') }, { title: wbT(lang, 'notifSnooze') }],
    requireInteraction: true,
    priority: 2,
  });
}

async function showReminder({ forPreview = false, tabId = null } = {}) {
  const settings = await getSettings();

  if (!forPreview) {
    if (!settings.enabled) return;
    if (!isActiveDay(settings)) return;
    if (inQuietHours(settings)) return;
    if (Date.now() < (await getSnoozedUntil())) return;
    await incrementReminders();
  }

  const lang = wbResolveLang(settings.language);
  const stats = await getStats();
  const message = pickMessage(lang);
  const progress = { drinkMl: stats.drinkMl, goalMl: settings.dailyGoalMl };
  const labels = {
    drank: wbT(lang, 'overlayDrank', { n: settings.cupMl }),
    snooze: wbT(lang, 'overlaySnooze'),
    timer: wbT(lang, 'overlayTimer', { n: '{n}' }),
    pct: progress.goalMl > 0 ? Math.round((progress.drinkMl / progress.goalMl) * 100) : 0,
    progress: wbT(lang, 'overlayProgress', { a: progress.drinkMl, b: progress.goalMl }),
    aria: wbT(lang, 'overlayAria'),
    dir: wbIsRtl(lang) ? 'rtl' : 'ltr',
    theme: settings.theme,
  };

  const shown = await showOverlay(
    { message, lingerSeconds: settings.lingerSeconds, labels },
    tabId
  );
  if (!shown) showNotification(message, progress, lang);
}

// ─── Event listeners ──────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await showReminder();
  }
});

chrome.notifications.onButtonClicked.addListener(async (id, buttonIndex) => {
  if (id !== NOTIFICATION_ID) return;
  if (buttonIndex === 0) await recordDrink();
  else await snooze();
  chrome.notifications.clear(id);
});

chrome.notifications.onClicked.addListener((id) => {
  if (id === NOTIFICATION_ID) chrome.notifications.clear(id);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'SNOOZE': {
        await snooze();
        sendResponse({ ok: true });
        break;
      }
      case 'DRANK': {
        const stats = await recordDrink(msg.ml);
        sendResponse({ ok: true, drinkMl: stats.drinkMl });
        break;
      }
      case 'SAVE_SETTINGS': {
        const before = await getSettings();
        await saveSettings(msg.settings);
        const after = await getSettings();
        // Only restart the countdown when the schedule itself changed
        if (before.enabled !== after.enabled || before.intervalMinutes !== after.intervalMinutes) {
          await scheduleAlarm();
        }
        sendResponse({ ok: true });
        break;
      }
      case 'GET_STATE': {
        const [settings, stats, snoozedUntil] = await Promise.all([
          getSettings(),
          getStats(),
          getSnoozedUntil(),
        ]);
        sendResponse({
          settings,
          stats,
          snoozedUntil,
          quiet: inQuietHours(settings),
          offDay: !isActiveDay(settings),
        });
        break;
      }
      case 'PREVIEW': {
        await showReminder({ forPreview: true, tabId: msg.tabId });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({});
    }
  })();
  return true; // keep channel open for async response
});

chrome.runtime.onInstalled.addListener(async () => {
  await scheduleAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleAlarm();
});
