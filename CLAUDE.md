# CLAUDE.md — Morning Flow / B·Restore PWA

## Purpose & Identity

**Morning Flow** is a personal morning wellness app built for Chris — a senior data engineer in Israel who spends most of the day at a desk. The name **B·Restore** (B = body) means exactly what it says: restore the body from what desk work does to it.

The app is a 4-week structured morning routine: 35 minutes, 3 days/week. It's not a gym app. It's a quiet, daily practice to undo the physical cost of knowledge work — tight hips, rounded shoulders, stiff spine — through bodyweight strength, posture work, and yoga. Box breathing ends every session.

The app title is in Hebrew: **Morning Flow · כריס** (כריס = Chris). Layout is `lang="he" dir="rtl"`. This is an iOS Safari app for one person in Israel — no backend, no account, no Android, no desktop.

**Design philosophy**: dry delivery, genuine warmth, no hype. The message system reflects this — no exclamation marks, no coach-voice enthusiasm. Acknowledge what actually happened.

---

## Non-Negotiable Constraints

- Plain multi-file static site — no framework, no build step, no bundler. Splitting into multiple files is allowed (see "File Structure" below) as long as every file is loaded via plain `<script src="...">` (classic scripts, not ES modules) so it still works when opened directly via `file://`. **One documented exception**: `squat-coach.html`'s "Start Camera" flow and `daily-routine.html`'s "Start Routine" flow both need `getUserMedia`, which requires a secure context (https/`localhost`) — those two pages cannot be exercised via plain `file://`, since that's a browser platform rule, not something this app's code controls. See `memory/form_coach.md`.
- iOS Safari only — every layout and API decision must work on iPhone
- `localStorage` only — no backend, no account. **One documented exception**: a best-effort, opt-in `syncToSheets()` (`shared.js`) POSTs a copy of session/Daily-Routine/measurement records to a Google Apps Script URL you paste in yourself (`mf.syncUrl`, empty by default) — off-device durability + trend analysis, not a second source of truth. `localStorage` is unaffected either way and stays authoritative. See `memory/data_shapes.md`'s "Google Sheets sync" section.
- No emojis anywhere
- No Garmin API — manual entry only, by design
- Never push directly to main

---

## File Structure

As of the Daily Routine addition, this is a 14-file static site, not a single `index.html`:

| File | Contents |
|------|----------|
| `index.html` | Thin shell — head boilerplate + `<script src="shared.js">` + `<script src="am.js">` |
| `office.html` | Thin shell — head boilerplate + `<script src="shared.js">` + `<script src="office.js">` |
| `shared.js` | Engine shared by both timed programs: palette (`T`), `el()`/icons, `EX_INFO`/`YT_IDS`, audio/haptic, wake lock, all `mf.*` localStorage helpers, `getStreak()`, `captureProgressPhoto()`, `shareWorkout()`, generic `renderWeekSection()`/`renderProgressGrid()`, the whole session engine (`startSession`/`startTimer`/`updateTimerDisplay`/`skipExercise`/`abortSession`/`finishSession`), and the shared render functions (`renderPreview`/`renderSession`/`renderRest`/`renderMeditation`/`renderControls`/`renderDone`) |
| `am.js` | AM-program-only: `PROGRAM` data, `COACH_CUES`, `HOME_PHRASES`, `pickMessage()`, `renderHome()`/`renderPhaseChips()`/`renderProgram()`/`renderMeasurements()`, its own `state`/`render()`/`nextSession()`/`currentDay()`. `renderHome()` also holds the Daily Routine and Squat Form Coach nav cards (see below) |
| `office.js` | Office-program-only: `OFFICE_PROGRAM` data, `OFFICE_PHRASES`, `pickOfficeMessage()`, `renderHome()`/`renderOfficeBreakdown()`, its own `state`/`render()`/`nextSession()`/`currentDay()` |
| `form-coach-engine.js` | Exercise-agnostic camera/pose form-coaching engine shared by `squat-coach.js` and `daily-routine.js`: pure math, the generic rep-detection FSM, generic rep scorers, the hold-based tracker (static exercises), the camera/pose lifecycle (one shared `Pose` instance), `WARN_COLOR`. See `memory/form_coach.md` |
| `exercise-squat.js` / `exercise-pushup.js` / `exercise-lunge.js` / `exercise-plank.js` | Each exercise's own config + scoring, built on `form-coach-engine.js`'s generics. Loaded by whichever page(s) need that exercise. See `memory/form_coach.md` |
| `squat-coach.html` / `squat-coach.js` | Standalone single-exercise camera form coach — fully self-contained, own `state`/`render()`. Sits entirely outside the session-engine "contract" below, since it's continuous camera analysis, not a phase/timer timeline. See `memory/form_coach.md` |
| `daily-routine.html` / `daily-routine.js` | The fixed, same-every-day 9-step camera-coached routine (warmup → 2× push-ups/squats/plank → lunges → cooldown) — sequences all 4 exercises inside ONE continuous camera session, prefaced by a one-time camera-placement setup check (confirms one fixed phone spot tracks both standing and floor poses). Also outside the session-engine contract; has its own persistence key (`mf.dailyRoutine`, a calendar-date completion log, not the AM/Office week/day shape) and its own Progress/Evolution screen (a bespoke calendar-date quality heatmap, reps + quality + rate over time — not a reuse of `shared.js`'s week×day `renderProgressGrid()`, which doesn't fit this feature's date-only data model). See `memory/daily_routine.md` and `memory/form_coach.md` |
| `apps-script/Code.gs` | The Google Apps Script source for the `syncToSheets()` receiving endpoint — checked into this repo as the source of truth, but editing it here does NOT affect the live `/exec` URL by itself; changes must be pasted into the actual Apps Script editor and redeployed as a new Web app version. Routes incoming payloads by `type` (`session`/`daily_routine`/`measurement`) into 3 separate sheet tabs. See `memory/data_shapes.md`'s "Google Sheets sync" section |

**Why this shape, not ES modules or a bundler:** `index.html`, `office.html`, `squat-coach.html`, and `daily-routine.html` are independent pages linked by plain `<a>`/`window.location` navigation (a real page load, not an in-app view switch) — see `memory/architecture_decisions.md` for the full reasoning and the "contract" functions (`currentDay()`, `nextSession()`, `buildSessionTimeline()`, `pickDoneMessage()`, `PROGRESS_PREFIX`, `TOTAL_SESSIONS`) each timed-program page-specific file must define before `shared.js`'s generic engine functions are called. Neither `squat-coach.js` nor `daily-routine.js` implements this contract — neither has a phase/timer timeline to hand off to `shared.js`'s engine.

**Editing rule:** touching AM-only content → edit `am.js`. Touching Office-only content → edit `office.js`. Touching the generic camera/pose/FSM/scoring machinery shared by every exercise coach → edit `form-coach-engine.js`, never a page-specific file. Touching one exercise's own numbers/checks → edit that exercise's own `exercise-*.js`, never `form-coach-engine.js`. Touching Squat Coach's screens/flow → edit `squat-coach.js`/`.html` only. Touching Daily Routine's sequencing/screens → edit `daily-routine.js`/`.html` only. Touching the timer/session/done-screen engine, Garmin/measurements storage, or anything both timed programs use → edit `shared.js`. Don't reintroduce inline `<script>` blocks in any `.html` file — keep them as thin shells.

---

## Working File & Git Sync

**Working files**: `c:\Users\crist\Downloads\{index.html, office.html, shared.js, am.js, office.js}` (edited here, tested locally in mobile Safari via file sharing — all 5 files must be present in the same folder since they reference each other by relative path)
**Repo**: `c:\Users\crist\Downloads\workout-repo\`
**Live URL**: https://cwinter1.github.io/workout/

Before every commit, sync all 5 files:
```
cp "c:/Users/crist/Downloads/index.html"  "c:/Users/crist/Downloads/workout-repo/index.html"
cp "c:/Users/crist/Downloads/office.html" "c:/Users/crist/Downloads/workout-repo/office.html"
cp "c:/Users/crist/Downloads/shared.js"   "c:/Users/crist/Downloads/workout-repo/shared.js"
cp "c:/Users/crist/Downloads/am.js"       "c:/Users/crist/Downloads/workout-repo/am.js"
cp "c:/Users/crist/Downloads/office.js"   "c:/Users/crist/Downloads/workout-repo/office.js"
```

Never edit the `workout-repo/` copies directly. Always sync from Downloads first.

Every file added since the original 5 (`form-coach-engine.js`, `exercise-squat.js`,
`exercise-pushup.js`, `exercise-lunge.js`, `exercise-plank.js`, `squat-coach.html`/`.js`,
`daily-routine.html`/`.js`) follows the same Downloads → `workout-repo/` sync convention once
they're part of the local working set — but unlike the original 5, opening `squat-coach.html` or
`daily-routine.html` directly via `file://`/phone-file-sharing only gets you as far as the landing
screen; the "Start Camera"/"Start Routine" flow requires a secure context (https/`localhost`) and
can only be verified for real on the live GitHub Pages URL. See `memory/form_coach.md`.

### Git workflow (non-negotiable)
```
git checkout -b feature/<short-topic>
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
  bg:       '#0e1116',                    // ink — page background
  fg:       '#e8e5dd',                    // paper — primary text
  sub:      '#8a8478',                    // subdued text
  card:     '#16191e',                    // card background
  cardLine: 'rgba(255,255,255,0.06)',     // subtle card separator
  accent:   '#7aa676',                    // sage green — CTAs, done states
  accentT:  '#0e1116',                    // text on accent background
  hairline: 'rgba(255,255,255,0.12)',     // borders
  mono:     'rgba(232,229,221,0.65)',     // muted mono text
  pill:     'rgba(255,255,255,0.06)',     // unfilled pill/chip background
  display:  '"Space Grotesk", system-ui, sans-serif',
  body:     '"Manrope", system-ui, sans-serif',
  mono_ff:  '"JetBrains Mono", ui-monospace, monospace',
};
```

Fonts (Google Fonts, loaded in `<head>`):
- `Space Grotesk` — display headings, CTAs, large numbers
- `Manrope` — body text
- `JetBrains Mono` — labels, metadata, chips, section headers
- `Instrument Serif` — italic quote text (encouragement messages on done screen and share card)

Style rules:
- All layout via `el('tag', cssText)` — no external CSS classes, no innerHTML for layout
- `env(safe-area-inset-top/bottom)` on all fixed top/bottom bars (iPhone notch + home indicator)
- `height:100dvh` on root — dynamic viewport height, essential for iOS Safari
- Page transition: `animation:rise .25s ease` on every `render()` call

Do not introduce colors outside the T object. **Two documented exceptions**: `form-coach-engine.js`
defines its own `WARN_COLOR` (not added to `T`) for a red "you're doing this wrong" state, used by
every camera form-coach feature (Squat Coach, Daily Routine) on live feedback, score chips, and
summary stats — a feature-specific, explicitly-requested exception, not a change to the shared
design system used by AM/Office. `daily-routine.js`'s `withAlpha(hex, alpha)` (hex → rgba string)
is a narrower second exception used only to shade `T.accent`/`WARN_COLOR` into the Progress
screen's quality-heatmap grid — it varies opacity only, introduces no new hue, so it's a lesser
exception than `WARN_COLOR` rather than a second independent one. See `memory/form_coach.md`.

---

## Architecture

Single `<div id="root">` rendered entirely by JS. `render()` clears `root.innerHTML` and dispatches to the matching view renderer based on `state.view`.

```
render()
  → renderHome()          — home screen
  → renderPreview()       — exercise preview (GIF + description) before each exercise
  → renderSession()       — active timer + exercise display
  → renderMeditation()    — box breathing visualization (called within session flow)
  → renderDone()          — post-workout completion screen
  → renderProgram()       — 4-week program overview
  → renderMeasurements()  — body measurements log + Garmin history + photo timeline
```

View transitions: set `state.view`, then call `render()`.

### Utility functions (`shared.js` ~line 20)
- `el(tag, cssText)` — creates an element with inline style
- `sectionHeader(text)` — JetBrains Mono uppercase chip label
- `renderStat(key, val)` — key/value row card used in session stats
- `fmt(seconds)` — formats seconds as `M:SS`

### Icon functions (`shared.js` ~line 45)
All inline SVG. `iconPlay`, `iconPause`, `iconNext`, `iconCheck`, `iconClose`, `iconArrow` — each takes a color string.

Note: this "Architecture" section (and the State/Program Data/Key Constants/Key Functions sections below it) describes the AM program specifically. See `memory/architecture_decisions.md` for how the Office program (`office.html`/`office.js`) mirrors this same structure with its own data and its own copies of `state`/`render()`/`nextSession()`/`currentDay()`.

---

## State

```javascript
let state = {
  view: 'home',
  week: 1,          // 1–4
  day: 0,           // 0–2 (maps to PROGRAM.days[0/1/2])
  timeline: [],     // flat array of timed items built by buildTimeline()
  idx: 0,           // current position in state.timeline
  left: 0,          // seconds remaining on current item
  paused: false,
  progress: {},     // { 'w1d0': { done: true, at: timestamp }, ... }
  lastDuration: 0,  // seconds of just-completed session
  startedAt: null,  // Date.now() set in startSession()
};
```

`state.progress` is loaded from `mf.progress` on boot. `nextSession()` scans it and auto-advances `state.week` and `state.day` to the first incomplete session. If all 12 are done, it defaults to W4D3.

`state.progress` key format: `w${week}d${day}` — e.g. `w2d1`. This is the AM program's own `state`, declared in `am.js`; the Office program (`office.js`) declares its own separate `state` object but both read/write the *same* `mf.progress` localStorage object, disambiguated by key prefix (`w` vs `o`) — see `memory/data_shapes.md`.

---

## Program Data (`am.js` ~line 4)

`PROGRAM.days[0/1/2]` — 3 day types, each repeated 4 times across the program.

| Index | Tag | Title | Kicker |
|-------|-----|-------|--------|
| 0 | STRENGTH | Strength · Mobility | Full body bodyweight |
| 1 | POSTURE | Posture · Desk Recovery | Undo the chair |
| 2 | YOGA | Yoga · Active Recovery | A whole session of bend |

Each day has `phases` → each phase has `exercises` → each exercise has `variants[0..3]` (one per week, 0-indexed).

Phase structure per day: stretch → warmup → main → yoga → meditation.

Phase time allocation: `SESSION_MIN = 35`. Proportional via `PROGRAM.phaseShare`:
- stretch: 4/35 (~4 min)
- warmup: 5/35 (~5 min)
- main: 18/35 (~18 min)
- yoga: 5/35 (~5 min)
- meditation: hardcoded 180s (3 min) — not proportional

`phaseSeconds(totalMin)` returns per-phase seconds. `buildTimeline(dayIdx, week, totalMin)` creates the flat timeline array: each exercise gets `Math.max(20, Math.round(phaseTotal / numExercises))` seconds. Meditation is always one item at 180s.

### Day 0 — STRENGTH · Mobility

**Stretch (Bend)** — "Wake up the joints before any load."
- Cat–Cow: 8 rounds · slow / 10 rounds + breath hold / 12 rounds + thread the needle / 14 rounds + thoracic rotation
- World's Greatest: 4 each side · easy / 5 each · with reach / 6 each · t-spine open / 8 each · linger 2s top
- Hip 90/90 Switch: 6 switches · slow / 8 switches · lift hand / 8 + forward fold / 10 + transition lunge

**Warm-up** — "Get the heart rate honest."
- Jumping Jacks: 30 sec / 40 sec / 50 sec / 60 sec · arm cross
- Arm Circles: 20 fwd / 20 back / 30/30 / 40/40 / 40/40 + scap pull
- High Knees: 30 sec / 40 sec / 45 sec / 60 sec · arms drive

**Main Set** — "3 rounds. Move with control."
- Push-Up: Knees · 8 / Incline · 10 / Standard · 10 / Decline · 8 · 3s down
- Squat: Bodyweight · 12 / Tempo 3-1-1 · 10 / Split Squat · 8 each / Bulgarian · 8 each · pause
- Bent-over Row: Backpack 2kg · 10 / 4kg · 10 / 6kg · 12 / 8kg · 12 · slow
- Glute Bridge: 2-leg · 12 / 2-leg + hold 3s · 10 / Single-leg · 8 each / Single-leg + hold 3s · 8 each
- Dead Bug: 6 each side / 8 each · tempo / 10 each · long lever / 10 each · band pull

**Yoga Cool-down** — "Tell the body the work is done."
- Child's Pose: 60 sec / 75 sec / 90 sec · side reach / 90 sec · twisted
- Down Dog → Cobra: 5 rounds / 6 rounds / 8 rounds / 8 rounds · 3s hold
- Pigeon: 45 sec each / 60 sec each / 75 sec each · fold / 90 sec each · bind

**Meditation** — "Box breathing. 3 minutes of clear."
- Box Breath: 4·4·4·4 / 4·4·4·4 / 5·5·5·5 / 6·6·6·6

### Day 1 — POSTURE · Desk Recovery

**Stretch (Bend)** — "Open what sitting closed."
- Chin Tucks: 10 reps / 12 · 2s hold / 15 · 3s hold / 15 · 5s hold
- Thoracic Ext.: 5 reps on roll / 8 reps / 10 reps · arms long / 10 reps + breath
- Doorway Pec: 30 sec each / 45 sec each / 60 sec each / 60 sec + breath

**Warm-up** — "Gentle activation."
- Scapular CARs: 5 each direction / 6 each / 8 each · slow / 10 each · slow
- Wall Slide: 10 reps / 12 reps / 15 reps / 15 reps · band
- March in Place: 40 sec / 45 sec / 50 sec / 60 sec · arms

**Main Set** — "3 rounds. Posture under load."
- Band Pull-Apart: 15 reps · light / 20 reps · light / 15 reps · medium / 20 reps · medium
- Y-T-W on Floor: 5 each / 6 each / 8 each / 8 each · 2s top
- Wall Angels: 8 slow / 10 slow / 12 slow / 15 slow · pause
- Glute Bridge: 12 / 15 · 2s hold / Single-leg · 8 each / Single-leg · 10 each
- Bird Dog: 8 each / 10 each · 2s hold / 10 each + diagonal pulse / 12 each + reach

**Yoga Cool-down** — "Lengthen the front, settle the spine."
- Sphinx: 60 sec / 75 sec / 90 sec / 90 sec + breath
- Seated Twist: 45 sec each / 60 sec each / 75 sec each / 90 sec each
- Legs Up The Wall: 60 sec / 90 sec / 120 sec / 180 sec

**Meditation** — "3 min · clear the head."
- Box Breath: 4·4·4·4 / 4·4·4·4 / 5·5·5·5 / 6·6·6·6

### Day 2 — YOGA · Active Recovery

**Stretch (Bend)** — "Land in the body."
- Belly Breathing: 10 breaths / 12 breaths / 15 breaths / 15 breaths · 6s exhale
- Neck Rolls: 5 each way / 6 each way / 8 each way / 10 each way
- Ankle Circles: 10 each way / 15 each / 20 each / 20 each · weighted

**Warm-up (Sun A)** — "Build heat through the spine."
- Surya A: 3 rounds / 4 rounds / 5 rounds / 6 rounds · linger downdog
- Standing Fold: 45 sec / 60 sec / 75 sec / 90 sec · ragdoll sway

**Main Set (Standing Flow)** — "Hold, breathe, transition."
- Warrior II: 30 sec each / 40 sec each / 50 sec each / 60 sec each · arms long
- Triangle: 30 sec each / 40 sec each / 45 sec each / 60 sec each
- Tree Pose: 30 sec each / 40 sec each / 45 sec · arms up / 60 sec · eyes closed
- Chair → Twist: 20 sec + 20 each / 30+30 each / 40+40 each / 45+45 each
- Bridge: 45 sec / 60 sec / 75 sec / 90 sec · pulse

**Yoga Cool-down (Floor Finish)** — "Soft, low, slow."
- Happy Baby: 45 sec / 60 sec / 75 sec / 90 sec
- Supine Twist: 45 sec each / 60 sec each / 75 sec each / 90 sec each
- Savasana: 90 sec / 120 sec / 150 sec / 180 sec

**Meditation** — "Sit. Breathe. Done."
- Box Breath: 4·4·4·4 / 4·4·4·4 / 5·5·5·5 / 6·6·6·6

---

## Key Constants

| Constant | Location | Description |
|----------|----------|-------------|
| `T` | `shared.js` ~line 4 | Palette + font family refs |
| `PROGRAM` | `am.js` ~line 4 | Full 3-day × 4-week program data |
| `EX_INFO` | `shared.js` ~line 60 | ~45 exercises → `{ desc, gif }`, shared by both programs. `desc` is a 1–2 sentence plain-language cue. `gif` is a search query string for a YouTube thumbnail search. |
| `YT_IDS` | `shared.js` ~line 143 | Same exercise set → hardcoded YouTube video ID |
| `SESSION_MIN` | `am.js` ~line 179 | `35` — AM program session minutes |
| `OFFICE_PROGRAM` | `office.js` ~line 4 | Office program data — 4-week × 2-day/week isometric circuit |

`getExInfo(name)` (`shared.js` ~line 111) looks up `EX_INFO[name]`, with a fallback for unknown exercises.

---

## Key Functions

All session-engine functions below live in `shared.js` and are generic across both programs — they call page-specific "contract" functions (`currentDay()`, `nextSession()`, `buildSessionTimeline()`, `pickDoneMessage()`) that `am.js`/`office.js` each define. See `memory/architecture_decisions.md` for the full contract.

### Session lifecycle (`shared.js` ~line 496)
1. `startSession()` — builds `state.timeline` via `buildSessionTimeline()` (page-specific), sets `state.startedAt = Date.now()`, sets view to `preview`
2. `startTimer()` (~line 517) — 1-second interval; on expiry: `beep()`, advance `state.idx`, show next preview, or call `finishSession()`
3. `updateTimerDisplay()` (~line 546) — partial DOM updates during session (no full re-render); updates `#timer-num`, `#med-countdown`, `#med-box`, progress bar
4. `finishSession()` (~line 625) — saves `mf.progress` + `mf.sessions` record (keyed by page-specific `PROGRESS_PREFIX`), sets `state.lastDuration`, sets view to `done`
5. `abortSession()` (~line 616) — clears timer, calls `nextSession()` (page-specific) to re-advance, goes home
6. `pickDay(w, d)` — page-specific (`am.js` ~line 421, `office.js` ~line 206) — sets `state.week/day`, immediately starts session (used from week chips and progress grid taps)

### Box breathing (`shared.js` ~line 583)
`getMedState()` — parses the variant string (e.g. `'5·5·5·5'`) to extract 4 phase durations (inhale/hold/exhale/hold). Computes current phase and scale for the animated breathing box (0.55→1.0 on inhale, 1.0 on hold, 1.0→0.55 on exhale). Called every tick via `updateTimerDisplay()`. Only ever exercised by the AM program — Office's timeline has no `kind:'meditation'` items.

### Streak & session history (`shared.js` ~line 285)
`getStreak()` — loads `mf.sessions` (both AM and Office records, shared array), extracts unique calendar days, counts consecutive days ending today. Returns 0 if the last session wasn't today or yesterday.

### Message system
`am.js`'s `pickMessage(streak, week, dayTag, total)` (~line 212) — priority order:
1. Total session milestones: 1st session, 12th session (program complete)
2. Streak milestones: 2/3/5/7/10/14/21 consecutive days
3. Week + day-type combos: 12 specific messages (one per W1–4 × STRENGTH/POSTURE/YOGA)
4. General pool: 14 rotating messages based on `total % pool.length`

`office.js`'s `pickOfficeMessage(streak, week, total)` (~line 102) follows the same milestone/streak/pool structure but without the day-type combo tier (Office has no day-type variation). Both are wrapped by a page-local `pickDoneMessage(streak, week, total)` that `shared.js`'s `renderDone()`/`shareWorkout()` call by that fixed name.

Tone: dry delivery, genuine warmth. Short sentences. No exclamation marks. No superlatives. Acknowledge the real thing.

### Progress photo (`shared.js` ~line 307)
`captureProgressPhoto(sessionKey)` — opens front camera via `<input type="file" capture="user">`. Crops square from center, produces 240×240 JPEG thumbnail (~15KB) stored in `sessions[n].photo`. Full-res image sent to camera roll via `navigator.share({ files: [file] })`.

### Share card (`shared.js` ~line 351)
`shareWorkout(streak, total, duration)` — draws 1080×1080 Canvas PNG: dark background, workout title (accent second word), W·D·min meta, streak number in 140px Space Grotesk, encouragement quote in 34px Instrument Serif italic, footer with date + `cwinter1.github.io/workout`. Requires `await document.fonts.ready` before any Canvas text. Generic — pulls the title from `currentDay()` and the quote from `pickDoneMessage()`, both page-specific.

### Audio/haptic (`shared.js` ~line 189)
`beep()` — Web Audio API sine wave at 660Hz for 0.4s + `navigator.vibrate([60,30,60])`. Called on exercise transition.

---

## Screens — Detail

### Home screen
Content order (top to bottom):
1. Eyebrow — `W{n}·D{n}` in 52px mono, total progress counter `{done}/12`
2. Day title — uppercase in display font (second word in accent), kicker below in mono
3. Garmin sleep card — score (0–100) + hours + minutes; auto-saves on `onchange`; pre-fills if already entered today (keyed by `dateKey()`)
4. Begin button — sage green CTA, shows `35:00`
5. Session breakdown — phase chips with proportional progress bars
6. This week — D1/D2/D3 cards showing Done/Today/Open; today has accent outline
7. 4-week progress grid — 4×3 grid, tappable cells (calls `pickDay`)
8. Links — "4-week program" and "Measurements" nav buttons

### Preview screen
Shows before each exercise in the session. Content:
- Phase progress bars at top (accent = completed phases)
- "First up" / "Up next" label in accent
- Exercise name large (38px display)
- Chips: week variant, duration
- YouTube thumbnail poster (tap → replaces with iframe)
- Exercise description from `EX_INFO`
- Phase intent text
- "Start" CTA (launches timer, switches to session view)

### Session screen
Active timer view:
- Top: W·D header + phase name + progress bar (full-width)
- Center: exercise name + variant + countdown in large mono
- Controls: Pause/Resume, Next
- Exercise description visible during session

### Meditation screen
Animated box — scales 0.55→1.0 on inhale, holds at 1.0, shrinks on exhale, holds. Label shows current phase (Inhale/Hold/Exhale/Hold) with countdown. Triggered from session when current item has `kind: 'meditation'`.

### Done screen
Content order:
1. "Session complete" tag in accent mono
2. Encouragement message — `pickMessage()` result in 38px Instrument Serif italic
3. Streak badge — only if streak ≥ 2; shows number large in accent
4. Stats row — week, day, duration
5. Garmin post card — calories, active hours + minutes; saves on "Bank it" tap
6. Progress photo button — calls `captureProgressPhoto()`
7. [Share] [Bank it] CTAs

### Program screen
3-day breakdown with all phases and exercises. Each day shows W1 variant. Week buttons at bottom of each day — tappable (calls `pickDay`).

### Measurements screen
Sections:
1. Change-since-start delta grid (weight/waist/hips/HR/energy)
2. Log-today form — weight (kg), waist (cm), hips (cm), HR (resting), energy 1–5
3. History list — last 8 entries with Garmin sub-row
4. Photo timeline — horizontal scroll of session photo thumbnails (72×72)

---

## YouTube Embeds

Pattern: `padding-top:56.25%` outer div (CSS background = YouTube thumbnail) → tap replaces div content with `<iframe>` inside identical `padding-top:56.25%` wrapper, `position:absolute;inset:0;width:100%;height:100%`. URL: `youtube-nocookie.com/embed/{id}?autoplay=1&rel=0&modestbranding=1`.

**Never use `aspect-ratio:16/9` on the iframe directly.** iframes have no intrinsic dimensions on mobile Safari — `aspect-ratio` is silently ignored. The padding-top trick is the only approach that works on iOS.

---

## localStorage

| Key | Content |
|-----|---------|
| `mf.progress` | `{ 'w1d0': { done: true, at: ts } }` |
| `mf.sessions` | Array of session records |
| `mf.measurements` | Array of measurement entries |
| `mf.garmin` | Array of Garmin entries (pre + post) |

### Session record
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
// Pre-workout — home screen sleep card, keyed by date (upserts)
{ type: 'pre', date: 'YYYY-MM-DD', at: ts, sleepScore: 76, sleepHours: 7, sleepMins: 30 }

// Post-workout — done screen "Bank it" tap
{ type: 'post', sessionKey: 'w1d0', week: 1, day: 0, date: 'YYYY-MM-DD', at: ts, calories: 420, activeHours: 0, activeMins: 35 }
```

### Measurement entry
```javascript
{ at: timestamp, weight: 80.5, waist: 90, hips: 100, hr: 62, energy: 3 }
```

### Helpers (`shared.js` ~line 250)
`loadSessions / saveSessions / loadMeasurements / saveMeasurements / loadGarmin / saveGarmin` — all wrap localStorage with try/catch. `dateKey(ts?)` returns `YYYY-MM-DD`.

### Garmin upsert pattern (pre entry)
```javascript
const garmin = loadGarmin().filter(g => !(g.type === 'pre' && g.date === todayStr));
garmin.push(entry);
saveGarmin(garmin);
```

---

## Garmin — Future Direction

Once ~4+ weeks of data accumulate, Garmin data can inform:
- Encouragement message selection (low sleep score → recovery-focused message)
- Session recommendations (high fatigue → yoga day swap)

Not built yet. Do not wire up until asked.

---

## User Context

- **Device**: iPhone, iOS Safari only
- **Location**: Israel
- **Data**: `localStorage` only — no backend or account; an opt-in Google Sheets sync exists for off-device durability/analysis (see "Non-Negotiable Constraints" above), but `localStorage` stays the source of truth
- **Goal**: 4-week morning routine → track body metrics + Garmin data manually
- **Garmin**: Manual entry — no API, no PC export. Two entry points: pre-workout sleep data, post-workout activity data.

---

## memory/ folder

`memory/` in the repo root stores Claude's project memory for this app — persistent notes about architecture decisions, feedback rules, data shapes, and user context. These are read by Claude at the start of sessions to pick up context without re-reading the whole codebase. Do not delete or restructure this folder.

Files:
- `MEMORY.md` — index of all memory files
- `project_overview.md` — what the app is and how to ship
- `user_context.md` — device, goals, Garmin approach
- `architecture_decisions.md` — iframe trick, single-file constraint, photo storage
- `feedback_rules.md` — tone, confirmed decisions, what not to do
- `data_shapes.md` — all localStorage schemas with helpers
- `form_coach.md` — shared camera/MediaPipe engine architecture, MediaPipe decisions, testing limitations, tunable scoring constants
- `daily_routine.md` — the fixed 9-step camera-coached routine, its persistence shape, grilled decisions behind its scope

---

## What NOT to Do

- Don't add a framework, bundler, or build step
- Don't use ES modules (`type="module"`/`import`/`export`) — classic `<script src>` only, so the site still works opened directly via `file://`
- Don't put programlogy content (`am.js`/`office.js` specifics like `PROGRAM`/`OFFICE_PROGRAM`, `COACH_CUES`, message pools) into `shared.js` — it should stay generic and reusable by both programs
- Don't use `aspect-ratio:16/9` on iframes — use the padding-top container trick
- Don't connect the Garmin API — manual entry only by design
- Don't add emojis
- Don't push directly to main
- Don't add colors outside the T object
- Don't introduce new fonts — only the 4 already loaded
- Don't store full-resolution photos in localStorage — thumbnail only, full image via Web Share API
- Don't add persistence to Squat Form Coach without being asked — Phase 1 is explicitly in-memory only, no `mf.*` key or any other localStorage key
- Don't wire Squat Coach or Daily Routine into `shared.js`'s session-engine contract (`currentDay()`/`nextSession()`/etc.) — both are continuous camera analysis, not a phase/timer timeline, and stay outside that contract by design
- Don't put exercise-specific numbers/checks (angle anchors, thresholds, feedback copy) into `form-coach-engine.js` — it should stay exercise-agnostic and reusable by every camera coach; that content belongs in that exercise's own `exercise-*.js`
- Don't call `render()` again once a camera coach's live view is up (Squat Coach's one screen, or Daily Routine's entire 9-step session) — on iOS Safari, detaching a live `<video>` element from the document (which `root.innerHTML = ''` does) risks breaking the camera stream outright, not just a visual blip. Patch existing DOM nodes directly instead
