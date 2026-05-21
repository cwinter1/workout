# CLAUDE.md — Morning Flow / B·Restore PWA

## Purpose & Identity

**Morning Flow** is a personal morning wellness app built for Chris — a senior data engineer in Israel who spends most of the day at a desk. The name **B·Restore** (B = body) means exactly what it says: restore the body from what desk work does to it.

The app is a 4-week structured morning routine: 35 minutes, 3 days/week. It's not a gym app. It's a quiet, daily practice to undo the physical cost of knowledge work — tight hips, rounded shoulders, stiff spine — through bodyweight strength, posture work, and yoga. Box breathing ends every session.

The app title is in Hebrew: **Morning Flow · כריס** (כריס = Chris). Layout is `lang="he" dir="rtl"`. This is an iOS Safari app for one person in Israel — no backend, no account, no Android, no desktop.

**Design philosophy**: dry delivery, genuine warmth, no hype. The message system reflects this — no exclamation marks, no coach-voice enthusiasm. Acknowledge what actually happened.

---

## Non-Negotiable Constraints

- Single `index.html` — no split files, no framework, no build step
- iOS Safari only — every layout and API decision must work on iPhone
- `localStorage` only — no backend, no sync, no account
- No emojis anywhere
- No Garmin API — manual entry only, by design
- Never push directly to main

---

## Working File & Git Sync

**Working file**: `c:\Users\crist\Downloads\index.html` (edited here, tested locally in mobile Safari via file sharing)
**Repo**: `c:\Users\crist\Downloads\workout-repo\`
**Live URL**: https://cwinter1.github.io/workout/

Before every commit, sync:
```
cp "c:/Users/crist/Downloads/index.html" "c:/Users/crist/Downloads/workout-repo/index.html"
```

Never edit `workout-repo/index.html` directly. Always sync from Downloads first.

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

Do not introduce colors outside the T object.

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

### Utility functions (~line 46)
- `el(tag, cssText)` — creates an element with inline style
- `sectionHeader(text)` — JetBrains Mono uppercase chip label
- `renderStat(key, val)` — key/value row card used in session stats
- `fmt(seconds)` — formats seconds as `M:SS`

### Icon functions (~line 69)
All inline SVG. `iconPlay`, `iconPause`, `iconNext`, `iconCheck`, `iconClose`, `iconArrow` — each takes a color string.

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

`state.progress` key format: `w${week}d${day}` — e.g. `w2d1`.

---

## Program Data (~line 79)

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
| `T` | ~line 27 | Palette + font family refs |
| `PROGRAM` | ~line 79 | Full 3-day × 4-week program data |
| `EX_INFO` | ~line 179 | 41 exercises → `{ desc, gif }`. `desc` is a 1–2 sentence plain-language cue. `gif` is a search query string for a YouTube thumbnail search. |
| `YT_IDS` | ~line 230 | 41 exercises → hardcoded YouTube video ID |
| `SESSION_MIN` | ~line 335 | `35` — total session minutes |

`getExInfo(name)` (~line 223) looks up `EX_INFO[name]`, with a fallback for unknown exercises.

---

## Key Functions

### Session lifecycle (~line 743)
1. `startSession()` — builds `state.timeline` via `buildTimeline()`, sets `state.startedAt = Date.now()`, sets view to `preview`
2. `startTimer()` (~line 759) — 1-second interval; on expiry: `beep()`, advance `state.idx`, show next preview, or call `finishSession()`
3. `updateTimerDisplay()` (~line 781) — partial DOM updates during session (no full re-render); updates `#timer-num`, `#med-countdown`, `#med-box`, progress bar
4. `finishSession()` (~line 1096) — saves `mf.progress` + `mf.sessions` record, sets `state.lastDuration`, sets view to `done`
5. `abortSession()` (~line 1088) — clears timer, calls `nextSession()` to re-advance, goes home
6. `pickDay(w, d)` (~line 754) — sets `state.week/day`, immediately starts session (used from week chips and progress grid taps)

### Box breathing (~line 807)
`getMedState()` — parses the variant string (e.g. `'5·5·5·5'`) to extract 4 phase durations (inhale/hold/exhale/hold). Computes current phase and scale for the animated breathing box (0.55→1.0 on inhale, 1.0 on hold, 1.0→0.55 on exhale). Called every tick via `updateTimerDisplay()`.

### Streak & session history (~line 352)
`getStreak()` — loads `mf.sessions`, extracts unique calendar days, counts consecutive days ending today. Returns 0 if the last session wasn't today or yesterday.

### Message system (~line 374)
`pickMessage(streak, week, dayTag, total)` — priority order:
1. Total session milestones: 1st session, 12th session (program complete)
2. Streak milestones: 2/3/5/7/10/14/21 consecutive days
3. Week + day-type combos: 12 specific messages (one per W1–4 × STRENGTH/POSTURE/YOGA)
4. General pool: 14 rotating messages based on `total % pool.length`

Tone: dry delivery, genuine warmth. Short sentences. No exclamation marks. No superlatives. Acknowledge the real thing.

### Progress photo (~line 424)
`captureProgressPhoto(sessionKey)` — opens front camera via `<input type="file" capture="user">`. Crops square from center, produces 240×240 JPEG thumbnail (~15KB) stored in `sessions[n].photo`. Full-res image sent to camera roll via `navigator.share({ files: [file] })`.

### Share card (~line 468)
`shareWorkout(streak, total, duration)` — draws 1080×1080 Canvas PNG: dark background, workout title (accent second word), W·D·min meta, streak number in 140px Space Grotesk, encouragement quote in 34px Instrument Serif italic, footer with date + `cwinter1.github.io/workout`. Requires `await document.fonts.ready` before any Canvas text.

### Audio/haptic (~line 1519)
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

### Helpers (~line 341)
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
- **Data**: `localStorage` only — no backend, no sync
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

---

## What NOT to Do

- Don't add a framework or build step
- Don't split into multiple files
- Don't use `aspect-ratio:16/9` on iframes — use the padding-top container trick
- Don't connect the Garmin API — manual entry only by design
- Don't add emojis
- Don't push directly to main
- Don't add colors outside the T object
- Don't introduce new fonts — only the 4 already loaded
- Don't store full-resolution photos in localStorage — thumbnail only, full image via Web Share API
