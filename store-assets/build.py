"""Regenerate the Chrome Web Store images.

Usage:  python store-assets/build.py
Needs Google Chrome (headless). Writes PNGs to store-assets/out/.
The popup/overlay inside the images are the real extension files, run with a
stubbed `chrome` API and seeded sample data.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'out'
PROJECT = ROOT.parent

CHROME = next((p for p in [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
] if os.path.exists(p)), None)
if not CHROME:
    sys.exit('Chrome or Edge not found')

STUB = '''<script>
const day = o => { const d = new Date(); d.setDate(d.getDate() - o);
  const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
const q = new URLSearchParams(location.search);
const state = {
  settings: { intervalMinutes: 45, lingerSeconds: 30, enabled: true, dailyGoalMl: 2000, cupMl: 250,
    activeDays: [1,2,3,4,5], quietEnabled: true, quietStart: '22:00', quietEnd: '07:00', language: q.get('lang') || 'en', theme: q.get('dark') ? 'dark' : 'light' },
  stats: { reminders: 5, drinkMl: 1450, lastDrinkTs: Date.now() - 14 * 60000,
    history: { [day(1)]: 2300, [day(2)]: 2150, [day(3)]: 2050, [day(4)]: 1700, [day(5)]: 2400, [day(6)]: 1500 } },
};
window.chrome = {
  i18n: { getUILanguage: () => 'en-US' },
  runtime: { sendMessage: async m => {
    if (m.type === 'GET_STATE') return { settings: state.settings, stats: state.stats, snoozedUntil: 0, quiet: false, offDay: false };
    return { ok: true }; } },
  alarms: { get: async () => ({ scheduledTime: Date.now() + 31 * 60000 }) },
  storage: { local: { get: async () => ({ tourDone: !q.get('tour') }), set: async () => {} } },
  tabs: { query: async () => [{ id: 1 }] },
};
if (q.get('dark')) {
  const d = document.createElement('style');
  d.textContent = ':root{--bg:#000;--card:#1c1c1e;--label:#fff;--label-2:rgba(235,235,245,.6);--label-3:rgba(235,235,245,.3);--sep:rgba(84,84,88,.55);--fill:rgba(118,118,128,.24);--blue:#0a84ff;--green:#30d158;--orange:#ff9f0a;--indigo:#7d7aff;--seg-thumb:#636366}';
  document.head.append(d);
}
if (q.get('static')) {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
  document.head.append(s);
}
window.addEventListener('load', () => setTimeout(() => {
  if (q.get('tab')) document.querySelector(`[data-tab="${q.get('tab')}"]`).click();
  setTimeout(() => { if (q.get('scroll')) document.scrollingElement.scrollTop = Number(q.get('scroll')); }, 150);
}, 200));
</script>'''


def build_popup_demo():
    html = (PROJECT / 'popup.html').read_text(encoding='utf-8')
    for name in ('popup.css', 'i18n.js', 'popup.js', 'tour.js'):
        html = html.replace(f'"{name}"', f'"../../{name}"')
    html = html.replace('<script src="../../i18n.js">', STUB + '<script src="../../i18n.js">')
    (SRC / 'popup-demo.html').write_text(html, encoding='utf-8')


def shot(page, query, width, height, name):
    url = (SRC / page).as_uri() + query
    out = OUT / name
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
           f'--window-size={width},{height}', '--virtual-time-budget=5000', '--run-all-compositor-stages-before-draw',
           '--allow-file-access-from-files', f'--screenshot={out}']
    cmd.append(url)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out


def main():
    OUT.mkdir(exist_ok=True)
    build_popup_demo()
    jobs = [
        ('compose.html', '?s=1', 1280, 800, '1-gentle-reminders-1280x800.png'),
        ('compose.html', '?s=2', 1280, 800, '2-daily-goal-1280x800.png'),
        ('compose.html', '?s=3', 1280, 800, '3-history-1280x800.png'),
        ('compose.html', '?s=4', 1280, 800, '4-schedule-dark-1280x800.png'),
        ('compose.html', '?s=5', 1280, 800, '5-languages-1280x800.png'),
        ('tiles.html', '?t=small', 440, 280, 'promo-small-440x280.png'),
        ('tiles.html', '?t=marquee', 1400, 560, 'promo-marquee-1400x560.png'),
    ]
    for page, query, w, h, name in jobs:
        print(shot(page, query, w, h, name))


if __name__ == '__main__':
    main()
