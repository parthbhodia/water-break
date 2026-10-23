(function () {
  'use strict';

  if (window.__waterBreakLoaded) return;
  window.__waterBreakLoaded = true;

  let overlay = null;
  let countdownInterval = null;

  // ── Build overlay DOM ──────────────────────────────────────────────────

  function buildOverlay(message, lingerSeconds, labels) {
    const el = document.createElement('div');
    el.id = 'wb-overlay';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', labels.aria);
    if (labels.dir) el.dir = labels.dir;
    if (labels.theme === 'light' || labels.theme === 'dark') el.dataset.theme = labels.theme;
    el.innerHTML = `
      <div id="wb-backdrop"></div>
      <div id="wb-scene">
        <div id="wb-drop-wrap">
          <div class="wb-drop-top"></div>
          <div class="wb-drop"></div>
          <div class="wb-ripple"></div>
          <div class="wb-ripple"></div>
          <div class="wb-ripple"></div>
        </div>
      <div id="wb-card">
        <div id="wb-card-message">${escHtml(message)}</div>
        <div id="wb-meter"><span style="width:${Math.max(0, Math.min(100, Number(labels.pct) || 0))}%"></span></div>
        <div id="wb-card-progress">${escHtml(labels.progress)}</div>
        <div id="wb-card-timer">${escHtml(labels.timer).replace('{n}', `<span id="wb-countdown">${lingerSeconds}</span>`)}</div>
        <div id="wb-card-actions">
          <button class="wb-btn" id="wb-btn-drank">${escHtml(labels.drank)}</button>
          <button class="wb-btn" id="wb-btn-snooze">${escHtml(labels.snooze)}</button>
        </div>
      </div>
      </div>
    `;
    return el;
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Floating particles ─────────────────────────────────────────────────

  function spawnParticles(count = 10) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!overlay) return;
        const p = document.createElement('div');
        p.className = 'wb-particle';
        const size = 4 + Math.random() * 10;
        p.style.cssText = `
          left: ${Math.random() * 100}vw;
          bottom: ${Math.random() * 30}vh;
          width: ${size}px;
          height: ${size}px;
          opacity: ${0.4 + Math.random() * 0.6};
          animation-duration: ${1.5 + Math.random() * 2}s;
          animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(p);
        p.addEventListener('animationend', () => p.remove());
      }, i * 120);
    }
  }

  // ── Show / dismiss ─────────────────────────────────────────────────────

  function showWater(message, lingerSeconds, labels) {
    if (overlay) return;

    overlay = buildOverlay(message, lingerSeconds, labels);
    document.body.appendChild(overlay);
    spawnParticles();

    let remaining = lingerSeconds;
    const countdownEl = overlay.querySelector('#wb-countdown');

    countdownInterval = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = remaining;
      if (remaining <= 0) dismiss(false);
    }, 1000);

    overlay.querySelector('#wb-btn-drank').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'DRANK' }); // logs the saved cup size
      dismiss(true);
    });

    overlay.querySelector('#wb-btn-snooze').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'SNOOZE' });
      dismiss(true);
    });

    // ESC to snooze
    document.addEventListener('keydown', onEsc);
  }

  function onEsc(e) {
    if (e.key === 'Escape') {
      chrome.runtime.sendMessage({ type: 'SNOOZE' });
      dismiss(true);
    }
  }

  function dismiss(immediate) {
    clearInterval(countdownInterval);
    document.removeEventListener('keydown', onEsc);

    if (!overlay) return;

    if (immediate) {
      overlay.remove();
      overlay = null;
    } else {
      overlay.style.animation = 'wb-dismiss 0.4s ease forwards';
      setTimeout(() => {
        if (overlay) { overlay.remove(); overlay = null; }
      }, 400);
    }
  }

  // ── Message handler ────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SHOW_WATER') {
      showWater(msg.message || '💧 Time to drink water!', msg.lingerSeconds || 30, msg.labels);
      sendResponse({ ok: true });
    }
    if (msg.type === 'DISMISS_WATER') {
      dismiss(true);
      sendResponse({ ok: true });
    }
  });
})();
