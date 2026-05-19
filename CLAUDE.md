# CLAUDE.md — Morning Flow / B·Restore PWA

## Project

Single-file HTML/CSS/JS PWA. No framework, no build step, no dependencies.
Deployed at: https://cwinter1.github.io/workout/
Working file: `c:\Users\crist\Downloads\index.html` — sync to this repo before every commit.

```
cp "c:/Users/crist/Downloads/index.html" "c:/Users/crist/Downloads/workout-repo/index.html"
```

---

## Git Workflow — NON-NEGOTIABLE

Never push directly to main. Use a branch.

```
git checkout -b feature/<short-topic>
# edit, test
git add index.html
git commit -m "..."
git push -u origin feature/<short-topic>
git checkout main
git rebase feature/<short-topic>
git push origin main
git branch -d feature/<short-topic>
git push origin --delete feature/<short-topic>
```

---

## Design System — B·Restore Dark

```javascript
const T = {
  bg:      '#0e1116',   // ink
  fg:      '#e8e5dd',   // paper
  accent:  '#7aa676',   // sage green
  accentT: '#0e1116',   // text on accent
  card:    '#16191e',
  hairline:'rgba(255,255,255,0.12)',
  mono:    'rgba(232,229,221,0.65)',
  pill:    'rgba(255,255,255,0.06)',
};
```

Fonts (Google Fonts, loaded in `<head>`):
- `Space Grotesk` — display headings, CTAs
- `Manrope` — body text
- `JetBrains Mono` — labels, metadata, monospace chips
- `Instrument Serif` — italic quote text (encouragement messages)

Style rules:
- No emojis
- No `input()` calls
- All layout via inline `el('tag', cssText)` — no external CSS classes
- `env(safe-area-inset-top/bottom)` used on all fixed top/bottom bars for iPhone notch

---

## Architecture

Single `<div id="root">` rendered entirely by JS. No HTML templates.

```
render()
  → renderHome()        — home screen with sleep check card + begin button
  → renderPreview()     — exercise preview with YouTube embed
  → renderSession()     — active timer + exercise display
  → renderMeditation()  — box breathing visualization
  → renderDone()        — post-workout screen with garmin card + photo + share
  → renderProgram()     — 4-week program overview
  → renderMeasurements()— body measurements log + garmin history + photo timeline
```

`state.view` controls which renderer fires. View transitions: set `state.view` then call `render()`.

---

## State

```javascript
const state = {
  week: 1,          // 1–4
  day: 0,           // 0–2 (maps to PROGRAM.days[0/1/2])
  progress: {},     // { 'w1d0': { done: true, at: timestamp }, ... }
  view: 'home',
  idx: 0,           // current position in state.timeline
  left: 0,          // seconds remaining on current exercise
  paused: false,
  timeline: [],     // flat array of timed items built by buildTimeline()
  lastDuration: 0,  // seconds, set in finishSession()
  startedAt: null,  // Date.now() set in startSession()
};
```

---

## Program Structure

3 day types, repeated across 4 weeks. `PROGRAM.days[0/1/2]`.

| Index | Tag | Title |
|-------|-----|-------|
| 0 | STRENGTH | Strength · Mobility |
| 1 | POSTURE | Posture · Desk Recovery |
| 2 | YOGA | Yoga · Active Recovery |

Each day has `phases` → each phase has `exercises` → each exercise has `variants[0..3]` (one per week).
`SESSION_MIN = 35`. Phase time allocation: stretch 4/35, warmup 5/35, main 18/35, yoga 5/35, meditation 3/35.

---

## YouTube Embeds

41 exercises each have a hardcoded video ID in `YT_IDS` constant (~line 231).

Pattern: thumbnail poster (`padding-top:56.25%` aspect-ratio div, YouTube thumbnail as CSS background) → tap replaces with `<iframe>` inside a `padding-top:56.25%` wrapper (absolute-positioned inside) via `youtube-nocookie.com/embed/{id}?autoplay=1&rel=0&modestbranding=1`.

**Never use `aspect-ratio:16/9` on the iframe directly** — it doesn't work on mobile Safari. Always use the padding-top container trick.

---

## localStorage Keys

| Key | Content |
|-----|---------|
| `mf.progress` | `{ 'w1d0': { done: true, at: ts } }` |
| `mf.sessions` | Array of session records (see below) |
| `mf.measurements` | Array of body measurement entries |
| `mf.garmin` | Array of garmin data entries (see below) |

### Session record shape
```javascript
{
  key: 'w1d0',
  at: timestamp,
  duration: seconds,
  week: 1,
  day: 0,
  dayTitle: 'Strength · Mobility',
  dayTag: 'STRENGTH',
  photo: 'data:image/jpeg;base64,...',  // 240×240 thumbnail, optional
}
```

### Garmin entry shapes
```javascript
// Pre-workout (saved from home screen sleep card)
{ type: 'pre', date: 'YYYY-MM-DD', at: ts, sleepScore: 76, sleepHours: 7, sleepMins: 30 }

// Post-workout (saved when "Bank it" is tapped on done screen)
{ type: 'post', sessionKey: 'w1d0', week: 1, day: 0, date: 'YYYY-MM-DD', at: ts, calories: 420, activeHours: 0, activeMins: 35 }
```

---

## Key Functions

### Message system
`pickMessage(streak, week, dayTag, total)` — returns coach-voice encouragement string.
Priority: streak milestones (2/3/5/7/10/14/21) → week+dayTag combo (12 messages) → general pool (14 messages).
Tone: dry delivery, genuine warmth, no exclamation marks, no hype.

### Session flow
1. `startSession()` — builds `state.timeline`, sets `state.startedAt`, sets view to `preview`
2. `tick()` — called every second via `timerInterval`, decrements `state.left`
3. `finishSession()` — saves to `mf.progress` + `mf.sessions`, sets view to `done`
4. `renderDone()` — shows encouragement, streak badge, stats, garmin post card, photo button, share/bank CTA

### Progress photo
`captureProgressPhoto(sessionKey)` — opens front camera via `<input capture="user">`, crops to 240×240 JPEG thumbnail (Canvas API), saves base64 to session record, sends full image to camera roll via Web Share API.

### Share card
`shareWorkout(streak, total, duration)` — draws 1080×1080 Canvas PNG (dark bg, workout title, streak number, encouragement quote in Instrument Serif italic), shares via Web Share API with image file, fallback to `a.download`.
Requires `await document.fonts.ready` before any Canvas text rendering.

---

## Screens — Key Details

### Home screen
Order: eyebrow (W·D counter) → day title → **Garmin sleep card** → Begin button → phase breakdown → this week → progress grid → 4-week program link → measurements link

Garmin sleep card: auto-saves on `onchange`, keyed by `dateKey()` (today's YYYY-MM-DD). Pre-fills if already entered today.

### Done screen
Order: "Session complete" tag → encouragement message (Instrument Serif italic 38px) → streak badge (if ≥2) → stats row → **Garmin post card** → **progress photo button** → [Share] [Bank it]

Garmin post data saves on "Bank it" tap.

### Measurements screen
Sections: change-since-start delta grid → log-today form (weight/waist/hips/HR + energy 1–5) → history list (last 8, with garmin sub-row) → photo timeline (horizontal scroll of session thumbnails)

---

## User Context

- **Device**: iPhone, iOS Safari only
- **Data**: `localStorage` only, no backend, no sync
- **Location**: Israel
- **Goal**: 4-week morning routine (35 min/day, 3 days/week) → track body metrics + garmin data manually
- **Garmin**: manual entry only (no API) — sleep score, sleep time pre-workout; calories + active time post-workout
- **Future**: Garmin data will inform encouragement/session recommendations once enough history accumulates

---

## What NOT to do

- Don't add a framework or build step
- Don't split into multiple files
- Don't use `aspect-ratio:16/9` on iframes
- Don't use emojis
- Don't add `input()` calls
- Don't connect the Garmin API — manual entry only by design
