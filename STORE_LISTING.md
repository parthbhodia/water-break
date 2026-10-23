# Water Break — Chrome Web Store submission kit

Everything below is ready to paste into the Chrome Web Store developer dashboard.
Localized names and short descriptions already live in `_locales/*/messages.json`.

## Listing basics

| Field | Value |
|---|---|
| Name (≤75) | Water Break – Hydration Reminder & Water Tracker |
| Short description (≤132) | Gentle drink-water reminders while you browse. Track your daily hydration goal, set quiet hours, snooze anytime. |
| Category | Productivity (alternative: Lifestyle) |
| Language | English (+ 18 localized listings, see `_locales/`) |
| Single purpose | Remind the user to drink water at regular intervals and track their daily water intake. |

## Long description (English)

Source of truth: `store-assets/description-en.txt` (plain text; the store shows line breaks, emojis and bullets as typed).

💧 Water Break is a hydration reminder and water tracker for Chrome. It reminds you to drink water while you work, study or browse, and helps you reach your daily water goal, with a calm, beautiful reminder instead of a harsh alarm.

It's easy to forget to drink water during long screen sessions. Choose how often you want to be reminded, and a gentle water-drop card appears right on the page you're reading. Tap "I drank water" and get back to what you were doing.

✨ WHAT YOU CAN DO
⏰ Get drink-water reminders every 20 minutes up to every few hours, or set any custom interval
🥤 Log a cup with one tap, or snooze the reminder for 10 minutes
🎯 Track your daily water intake in ml, with a progress ring toward your goal
⚙️ Set your own daily hydration goal and cup size, and quick-add 150, 330 or 500 ml (or any amount)
📊 Review the last 7 days with a chart, daily average, best day and goal streak
📅 Choose which days of the week reminders run: workdays only, weekends off, whatever fits your routine
🌙 Set quiet hours so you're never reminded at night
☀️ Switch between light and dark mode with the sun and moon switch, or follow your system
🔔 Get a system notification on pages where the on-page reminder can't appear
🌍 Use it in 19 languages: English, Español, Français, Deutsch, Português, Türkçe, हिन्दी, বাংলা, தமிழ், اردو, 日本語, 한국어, 简体中文, 繁體中文, Bahasa Indonesia, Bahasa Melayu, Filipino, Tiếng Việt and ไทย
🧭 Learn the settings that matter in a short guided tour the first time you open it

👩‍💻 WHO IT'S FOR
Office and remote workers, students, developers, gamers, and anyone who spends hours at a screen and wants a simple healthy habit: drinking enough water, taking short breaks and staying focused.

🚀 HOW IT WORKS
1. Click the Water Break icon and pick your reminder interval and daily goal.
2. Keep browsing. When it's time, a reminder appears on your page.
3. Tap "I drank water" to log your cup, or log any amount from the popup.

🔒 PRIVATE BY DESIGN
No account, no ads, no tracking, no analytics. Your water log stays on your device, and Water Break makes no network requests. Your settings can sync through your own Chrome account if you use Chrome Sync.

❓ WHY DOES IT NEED ACCESS TO WEB PAGES?
To show the reminder on the page you're viewing, Water Break runs a small script on web pages. It only draws and removes the reminder card. It does not read, collect or send page content or your browsing history.

💬 Have an idea or found a bug? Use the support link on this page. Feedback is welcome.

## Keywords to work into the description naturally

water reminder, drink water reminder, hydration reminder, water tracker, hydration tracker, daily water intake, water break, stay hydrated, health reminder, break reminder.

## Permission justifications (dashboard "Privacy practices" tab)

| Permission | Justification |
|---|---|
| `storage` | Saves the user's settings (interval, goal, cup size, schedule, language) and their daily water log. |
| `alarms` | Schedules the periodic reminder at the interval the user chose; works while the service worker is asleep. |
| `notifications` | Shows a system notification as a fallback when the on-page reminder can't be shown (e.g. chrome:// pages, new tab, PDF viewer). |
| Content script on `http://*/*` and `https://*/*` | Displays the reminder card on the page the user is viewing. The script only renders the card and reads nothing from the page. |
| Remote code | None. No remote code is loaded or executed. |

### Host permission justification (paste into the "Host permission" field)

> Water Break's single purpose is to remind the user to drink water. The reminder is shown as a small card on top of whichever web page the user is currently viewing, so a reminder can appear on any site. This requires a content script on all http and https pages. The script only creates and removes the reminder card (a div with the message, a progress bar, and two buttons) when the extension's background worker sends it a message. It does not read, collect, store, or transmit page content, URLs, form data, or browsing history, and it makes no network requests. On pages where the content script cannot run (chrome:// pages, the new tab page, the PDF viewer), the extension falls back to a system notification instead.

Why a narrower match pattern would not work: the reminder has to appear on whatever site the user happens to be on when the timer fires; there is no fixed list of sites. Reviewers sometimes ask about `activeTab` — it does not fit, because the reminder is triggered by a timer, not by the user clicking the extension.

Data usage disclosures to tick: **no** personally identifiable information, health information*, financial, authentication, location, web history, user activity, or website content collected.

\* Water intake is stored locally on the device and never transmitted by the developer. If you'd rather be conservative, disclose "Health information — stored locally only" and explain that nothing leaves the device.

Certify: data isn't sold, isn't used for unrelated purposes, isn't used for creditworthiness.

## Privacy policy (host this at a public URL, link it in the dashboard)

> **Water Break — Privacy Policy**
> Last updated: 23 October 2026
>
> Water Break does not collect, transmit, sell, or share any personal data. The extension has no servers and makes no network requests.
>
> **What is stored:** your settings (reminder interval, daily goal, cup size, reminder days, quiet hours, language) and your daily water log. Settings are stored with `chrome.storage.sync`, which Chrome may sync across your signed-in devices through your Google account. Your water log is stored with `chrome.storage.local` on your device only.
>
> **Page access:** the extension injects a small reminder card into web pages. It does not read, collect, or modify page content.
>
> **Third parties:** none. No analytics, advertising, or tracking code is included.
>
> **Deleting your data:** uninstall the extension, or clear its data from chrome://extensions.
>
> **Contact:** parthbhodia08@gmail.com

Quick hosting options: GitHub Pages, a Notion public page, or a Gist rendered through a Pages site — it only needs a stable public URL.

## Screenshot plan (1280×800, up to 5; first one matters most)

Capture on a clean browser profile at 1280×800 with a realistic page behind the reminder (a docs page or article, not a blank tab). Use the light theme for 1–3 and dark for 4. Add a one-line caption bar on top of each.

1. **"Gentle reminders that don't get in the way"** — the on-page reminder card (light) over a blurred article. This is the hero shot.
2. **"Hit your daily goal"** — popup, Today tab: progress ring partway, Log a cup button, quick-add chips.
3. **"See your week at a glance"** — popup, History tab with 7 bars, goal line, and the streak tile.
4. **"Made for your schedule"** — popup Settings: weekday circles, quiet hours, goal. Dark mode.
5. **"Speaks your language"** — a collage: the reminder card in Japanese, Spanish, Hindi, Korean next to each other. Strong for non-English markets.

Optional: record a 10–15 s screen capture of a reminder appearing and being tapped, and upload it as the promo video.

## Promo tiles

- Small tile 440×280: blue gradient squircle icon with the white drop, "Water Break" in bold, tagline "Stay hydrated while you browse".
- Marquee 1400×560 (optional but required for featuring): the reminder card on the right, text on the left.

## Pre-submit checklist

- [ ] Load unpacked from `chrome://extensions`, then test: preview, snooze, Esc, log a cup, quiet hours, weekday off-days, notification fallback on a `chrome://` page, language switch, light and dark.
- [ ] Reload already-open tabs once after install; check the notification fallback appears on tabs that haven't been reloaded.
- [ ] Check every `_locales/*/messages.json` with a native reader (they were machine-written).
- [ ] Replace `23 October 2026` and `parthbhodia08@gmail.com` in the privacy policy and host it.
- [ ] Zip the folder contents (not the folder itself). Exclude this file if you prefer: `STORE_LISTING.md`.
- [ ] Bump `version` in `manifest.json` for every resubmission.
