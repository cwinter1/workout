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
