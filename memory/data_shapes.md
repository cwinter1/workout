---
name: data-shapes
description: All localStorage keys and full record schemas for sessions, measurements, and Garmin entries
metadata:
  type: reference
---

## localStorage keys

| Key | Content |
|-----|---------|
| `mf.progress` | `{ 'w1d0': { done: true, at: ts } }` |
| `mf.sessions` | Array of session records |
| `mf.measurements` | Array of body measurement entries |
| `mf.garmin` | Array of Garmin data entries |
| `mf.activeSession` | In-progress session checkpoint (see below) — lets an accidental refresh/reload resume instead of restarting |
| `mf.dailyRoutine` | Array of Daily Routine calendar-date completion records — see `memory/daily_routine.md` for the full shape |
| `mf.syncUrl` | Google Apps Script `/exec` URL, pasted once on the Measurements screen — see "Google Sheets sync" below |

## Active session checkpoint
```javascript
{
  prefix: 'w',        // or 'o' — must match the page's own PROGRESS_PREFIX to be resumed
  week: 1, day: 0,
  idx: 4,             // position in state.timeline
  left: 23,           // seconds remaining on that item
  paused: false,
  startedAt: 1234567890, // Date.now() from when the session began, for duration calc
}
```
Written by `saveActiveSession()` in `shared.js` on every timer tick and on every `state.idx` transition (start, skip, exercise/rest change). Read by `resumeActiveSession()` at boot — rebuilds `state.timeline` fresh via the page's own `buildSessionTimeline()` rather than storing the timeline itself, so it can't go stale if the program data changes. Cleared by `clearActiveSession()` when a session finishes normally or is aborted via the close (X) button. A page only resumes a checkpoint whose `prefix` matches its own — an in-progress Office session sitting in this key is ignored by `am.js` and vice versa.

## Session record
```javascript
{
  key: 'w1d0',           // 'w' prefix = AM program (am.js), 'o' prefix = Office program (office.js), e.g. 'o1d0'
  at: timestamp,
  duration: seconds,
  week: 1,               // 1–4
  day: 0,                // AM: 0–2. Office: 0–1
  dayTitle: 'Strength · Mobility',  // Office sessions: 'Office · Core Reset'
  dayTag: 'STRENGTH',    // Office sessions use 'OFFICE'
  photo: 'data:image/jpeg;base64,...',  // 240×240 thumbnail, optional
}
```

There is no `mode` field — the `key` prefix alone disambiguates which program a record belongs to (AM's `finishSession()` in `shared.js` builds the key from `am.js`'s `PROGRESS_PREFIX = 'w'`; Office's from `office.js`'s `PROGRESS_PREFIX = 'o'`).

`mf.progress` keys are prefixed the same way: `w{week}d{day}` for the AM program (12 total, `am.js`'s `TOTAL_SESSIONS`), `o{week}d{day}` for Office (8 total, `office.js`'s `TOTAL_SESSIONS`). Both `index.html` (`am.js`) and `office.html` (`office.js`) read/write the *same* `mf.progress` object and `mf.sessions` array — they are two separate pages with two separate in-memory `state` objects, connected only through this shared `localStorage` (same origin, same keys). There is no `state.mode` anymore — that was an artifact of an earlier single-file version; each page now only ever deals with its own program.

## Garmin entry shapes
```javascript
// Pre-workout — saved from home screen sleep card, keyed by date
{
  type: 'pre',
  date: 'YYYY-MM-DD',   // dateKey() — today's date
  at: timestamp,
  sleepScore: 76,        // 0–100
  sleepHours: 7,
  sleepMins: 30,
}

// Post-workout — saved when "Bank it" is tapped on done screen
{
  type: 'post',
  sessionKey: 'w1d0',
  week: 1,
  day: 0,
  date: 'YYYY-MM-DD',
  at: timestamp,
  calories: 420,
  activeHours: 0,
  activeMins: 35,
}
```

## Measurement entry
```javascript
{
  at: timestamp,
  weight: 80.5,          // kg
  waist: 90,             // cm
  hips: 100,             // cm
  hr: 62,                // resting heart rate
  energy: 3,             // 1–5
}
```

## Helper functions
```javascript
function loadGarmin()  { try { return JSON.parse(localStorage.getItem('mf.garmin') || '[]'); } catch { return []; } }
function saveGarmin(g) { try { localStorage.setItem('mf.garmin', JSON.stringify(g)); } catch {} }
function dateKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

## Garmin upsert pattern (pre entry)
```javascript
function saveSleep(score, hours, mins) {
  const garmin = loadGarmin();
  const today = dateKey();
  const idx = garmin.findIndex(g => g.type === 'pre' && g.date === today);
  const entry = { type: 'pre', date: today, at: Date.now(), sleepScore: score, sleepHours: hours, sleepMins: mins };
  if (idx !== -1) garmin[idx] = entry; else garmin.push(entry);
  saveGarmin(garmin);
}
```

## Google Sheets sync — best-effort, off-device copy for durability + trend analysis

`localStorage` is still the source of truth for everything in this app (`CLAUDE.md`'s
"Non-Negotiable Constraints" is correct that there's no backend/account) — but there IS one
real, intentional exception to "no sync": `shared.js`'s `syncToSheets(payload)` fires a
fire-and-forget `POST` (`mode: 'no-cors'`, so the response is unreadable and a failure is silent —
this is a best-effort backup, not a guaranteed write) to a Google Apps Script `/exec` URL you paste
once into the "Google Sheets sync" card on the Measurements screen (`loadSyncUrl()`/
`saveSyncUrl()`, key `mf.syncUrl`). If `mf.syncUrl` is empty, `syncToSheets()` is a no-op — nothing
is sent anywhere by default.

This existed narrowly for AM/Office's "Bank it" flow only until Chris asked to "keep data
save[d]... be able to do future analysis... see the relation between process and time" —
extended at that point to also cover Daily Routine completions and Measurements entries, so all
three land in the same external, analyzable, durable-beyond-one-device copy. Every payload now
carries a `type` field so the receiving Apps Script can route rows correctly:

```javascript
// type: 'session' — AM/Office, sent from shared.js's "Bank it" handler
{ type: 'session', date: 'YYYY-MM-DD', week: 1, day: 0, dayTitle: 'Strength · Mobility',
  dayTag: 'STRENGTH', duration: 2100, workoutRating: 4,
  sleepScore: 76, sleepHours: 7, sleepMins: 30, calories: 420, activeHours: 0, activeMins: 35 }

// type: 'daily_routine' — sent from daily-routine.js's finishRoutine()
{ type: 'daily_routine', date: 'YYYY-MM-DD', totalReps: 45, totalHoldSeconds: 105,
  avgQuality: 7.4,
  resultsJson: '[{"label":"Push-Ups","kind":"reps","target":20,"completedReps":20,"overall":7.1,"skipped":false}, ...]' }

// type: 'measurement' — sent from am.js's Measurements "Save entry" handler
{ type: 'measurement', date: 'YYYY-MM-DD', weight: 80.5, waist: 90, hips: 100, hr: 62, energy: 3 }
```

`daily_routine`'s per-step detail is a single JSON-stringified `resultsJson` cell, not flat
columns — the step count/shape varies day to day (timer vs reps vs hold steps, warmup/cooldown
included), so there's no fixed column mapping that wouldn't either truncate data on a longer day
or leave empty columns on a shorter one. `date` is `dateKey()`-style (`YYYY-MM-DD`) on all three
payload types, including `measurement` (whose own stored `entry.date` is a full ISO timestamp,
`new Date().toISOString()`) — so a Sheet grouping/pivoting by date works the same way regardless of
which payload type a row came from.

**The Apps Script endpoint itself is not part of this repo** — it's an external script you host in
your own Google account (Chris's), reached only via the pasted `/exec` URL. Extending which
payload `type`s exist here doesn't automatically make your script route/columnize them; the script
side needs its own update to handle `daily_routine`/`measurement` rows (e.g. writing to separate
sheet tabs keyed on `type`, or parsing `resultsJson`) if you want them to land somewhere useful
rather than just failing silently or landing in whatever the script's default/catch-all behavior
is.
