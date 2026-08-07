---
name: daily-routine
description: Daily Routine — the fixed 9-step camera-coached sequence, its persistence shape, and the grilled decisions behind its scope
metadata:
  type: feedback
---

## What this is

A fixed, same-every-day, ~20-minute morning strength routine: warmup, 2 sets each of push-ups/
squats/plank, 1 set of lunges, cooldown — see the exact sequence in `daily-routine.js`'s
`ROUTINE_STEPS`. No week/day variation, no decision-making by design (Chris's own framing: "same
reps every day... no variation, no decision-making... just check off daily"). This is a genuinely
different shape from the AM program (`am.js`) — there's no 4-week progression, no day-type
rotation, just one fixed sequence repeated daily and a calendar-date completion log.

Built as the second consumer of the shared form-coaching engine (`memory/form_coach.md`) — Squat
Coach shipped first as the proof-of-concept; this feature is what push-up/lunge/plank were built
for.

## Grilled decisions before building

Three real forks were confirmed with Chris before implementation, since guessing wrong on any of
them meant redoing substantial work:

1. **Is the routine itself a real feature, or just context for wanting push-up/plank/lunge
   coaches?** → Build it as a real feature (a 4th "program," much simpler than AM/Office since
   there's no variation to track — just a daily yes/no).
2. **One camera-coach page with an exercise picker, or a page per exercise?** → Neither, exactly —
   Chris's answer ("the idea is this is the workout, only a few exercises") reframed the question:
   this isn't a general-purpose multi-exercise picker tool, it's one fixed sequence with 4
   exercise types embedded in it. That's what led to the actual shape: one sequencer
   (`daily-routine.js`) driving through fixed steps, not a standalone "pick an exercise" screen.
3. **Do the camera coaches launch automatically as each routine step comes up, or stay
   separate manual links (like Squat Coach)?** → Launch automatically — the whole routine runs
   inside one continuous camera session from "Start Routine" to the Done screen, not 9 separate
   manual camera launches.

## The 9-step sequence and why "budget" times aren't enforced timers

`ROUTINE_STEPS` (in `daily-routine.js`) encodes Chris's exact spec: Warm-up (30s) → Push-Ups ×20 →
Squats ×30 → Plank 60s → Lunges ×20 (alternating, total) → Push-Ups ×15 → Squats ×25 → Plank 45s →
Cool-down (2min). The per-exercise time estimates in the original spec (e.g. "~2 min" for 20
push-ups) are stored as a `budget` label shown on the landing screen's step list, but **not**
enforced as a cutoff — a `'reps'`/`'hold'` step advances purely on reaching its rep/duration
target, taking as long as it actually takes. Only the two `'timer'`-kind steps (warmup, cooldown,
which have no rep/hold concept at all) use their listed duration as a real countdown. Forcing a
time-based cutoff on the camera-scored steps would work against the whole point of scoring real
reps — a slow, controlled set shouldn't get cut off early just because it ran past a rough time
estimate.

## Continuous camera session across all 9 steps — the DOM rule that follows from it

Unlike Squat Coach (one live camera "screen" per set), Daily Routine's camera/pose session spans
the **entire routine**. `startRoutine()` requests the camera and calls `render()` exactly once;
every subsequent step transition (`enterStep()`, called from `finishCurrentStep()`) patches the
existing DOM nodes directly rather than calling `render()` again — verified end-to-end in this
sandbox (a headless-browser check confirmed the `<video>` element's DOM node identity is preserved
across all 9 step transitions). See `memory/form_coach.md`'s "Fully outside the session-engine
contract" section for the full reasoning (the iOS Safari risk of detaching a live `<video>` via
`innerHTML = ''`, even when a JS reference is kept and the node re-appended afterward).

One Pose instance is reused for the whole routine too (`form-coach-engine.js`'s `ensurePose()`),
not recreated per exercise — avoids re-loading the WASM model up to 8 times in 20 minutes.

`stopCamera()` (called on `pagehide` and the back button, in addition to `finishRoutine()`) also
clears the active step timer (`clearTimerInterval()`), not just the camera/pose loop — a gap a
review round caught: backgrounding the app mid-`'timer'`-kind step (warmup/cooldown) used to leave
the countdown `setInterval` running after the camera died, which could still fire
`finishCurrentStep()` → `enterStep()` against a dead camera stream with no way to resume.

## Camera setup check — runs once, before step 0

Chris: "a real case where the camera/phone is in one place will be ok for plank or I will need to
refocus... maybe a quick test/check that all is set ok." The routine alternates repeatedly between
standing exercises (squat/lunge) and floor exercises (push-up/plank), and there's no practical way
to reposition the phone mid-routine — so `enterSetupCheck()` runs once, before step 0, confirming
the SAME fixed placement can track both a standing pose and a floor pose before committing to it
for the full 20 minutes. See `memory/form_coach.md`'s "Camera setup check" section for the full
design (confirm-streak mechanics, the live progress indicator, the trouble hint, and why it never
blocks — "Skip Setup Check" is always available, same escape-hatch philosophy as "Skip This Step"
below).

## Always-available "Skip This Step" — an explicit escape hatch

Every step (including the two timer-only ones) has a persistent "Skip This Step" button, separate
from the auto-advance-on-target-reached path. This matters because camera-based rep/hold detection
can fail for reasons outside the user's control (bad lighting, awkward framing, a genuinely missed
rep) — without a manual override, a tracking failure could strand someone mid-routine with no way
forward except backing out entirely (which records nothing at all, see persistence below). A
skipped step still gets recorded in that day's results (marked `skipped: true`) rather than being
silently dropped, so the Done screen's step list stays complete even when a step didn't finish
normally.

## Persistence: `mf.dailyRoutine`, a calendar-date completion log — not a per-rep score archive

```javascript
// mf.dailyRoutine — array
{
  date: 'YYYY-MM-DD',  // dateKey(), from shared.js
  completed: true,      // always true — an entry only exists if the routine was completed
  at: timestamp,
  results: [             // one entry per step, for the Done screen and the Progress screen
    { label: 'Push-Ups', kind: 'reps', target: 20, completedReps: 20, overall: 7.1, skipped: false },
    { label: 'Plank', kind: 'hold', target: 60, heldSeconds: 60, overall: 7.0, skipped: false },
    { label: 'Warm-up', kind: 'timer', skipped: false },
    // ...
  ],
  // Added for the Progress/Evolution screen (Chris: "how many reps, evaluation... projection,
  // track and see evolution") — computed once at save time by computeDayStats(results) rather
  // than recomputed from `results` on every render.
  totalReps: 45,         // sum of completedReps across every 'reps'-kind step that day
  totalHoldSeconds: 105, // sum of heldSeconds across every 'hold'-kind step that day
  avgQuality: 7.4,       // mean `overall` across every scored step; null if nothing was scorable
}
```

This is a **new, dedicated key** — not folded into `mf.progress`/`mf.sessions` (the AM/Office
week-and-day-indexed shape) the way Office's data shares those keys via a prefix. There's no
week/day dimension here at all, just calendar dates, so a new key matches Q·Flow's own precedent
of using its own prefix rather than forcing a mismatched shape into the existing one. This is also
why the Progress/Evolution screen (`renderProgress()`) is a new bespoke calendar-date grid rather
than a reuse of `shared.js`'s week×day `renderProgressGrid()` — see `memory/form_coach.md`'s
"Progress / Evolution screen" section for the full reasoning.

**A day only gets an entry if the routine was completed end-to-end** (`finishRoutine()`, reached
by advancing past the last step — whether each individual step along the way was fully completed
or skipped). Backing out early via the close button records nothing — this is a deliberate,
literal reading of Chris's own rule ("just check off daily, yes/no"): the completion log is a
calendar-date yes/no signal, not a partial-credit or per-rep score archive. The `results` array is
still saved alongside it (already computed, genuinely useful for the Done screen and the Progress
screen) but is not itself the source of truth for the streak.

**A skipped step with zero real progress is unscored, consistently across both step kinds.** A
skipped `'reps'` step with 0 completed reps gets `overall: null` (excluded from `avgQuality`). A
`'hold'` step used to get a real numeric `overall` from `scoreHold()` even at `heldSeconds: 0`
(e.g. skipped before ever getting into position) — a review round caught this inconsistency (the
same "skipped before doing anything" case scored two different ways depending on step kind, which
would skew the evolution trend), so `summarizeStep()` now also treats a zero-active-time hold as
`overall: null`.

## Streak calculation

`dailyRoutineStreak()` mirrors `shared.js`'s `getStreak()` shape (consecutive calendar days ending
today or yesterday) but is a fresh, small implementation scoped to `mf.dailyRoutine`'s own
date-string array, since `getStreak()` itself works off `mf.sessions`' week/day-keyed records and
timestamp-based day extraction — not a natural fit to reuse here without more contortion than just
writing the ~15-line equivalent directly against plain date strings.

Its day-diffing (`daysBetween()`) is deliberately **not** raw millisecond subtraction between `Date`
objects — a first version mixed a UTC-parsed date string (`new Date('2026-08-06')` parses as UTC
midnight) against a local-midnight `Date` object (`new Date(); .setHours(0,0,0,0)`), which disagree
by Israel's UTC offset even before accounting for DST, and additionally assumed every calendar day
is exactly 24h (false on the two nights/year DST actually shifts, which matters for a
Israel-only app). Fixed by parsing each `'YYYY-MM-DD'` string into y/m/d components and diffing them
as `Date.UTC(...)` day-numbers instead — immune to both the offset mismatch and DST, since it never
constructs a local-time `Date` at all.

## Exercise-specific landmark generators needed for real synthetic testing

While building the end-to-end integration test for this feature, a first attempt reused the same
synthetic "squat-style" landmark generator (hip-center moving, shoulders fixed) for the push-up
step too — since push-up's rep detection tracks **shoulder**-center motion, not hip-center, this
produced landmarks where the tracked point never moved, so no rep was ever detected. Not a bug in
the app — a bug in the test's synthetic data. Fixed by writing a dedicated push-up-shaped generator
(shoulders/hips/ankles all shifting together, elbow bending) for that step's verification. Worth
remembering for any future exercise addition: the synthetic test landmarks must actually move the
same point (`trackFn`) that exercise's own FSM call tracks, or the test will silently exercise
nothing.

## Testing limitation

Same as Squat Coach — `getUserMedia` needs a secure context, so `daily-routine.html`'s "Start
Routine" flow can't be verified via `file://`, only on the live GitHub Pages URL after pushing. See
`memory/form_coach.md`'s "Testing limitation" section for the full detail (including that this
sandbox's proxy blocks the MediaPipe CDN entirely, so the real library's global names are
unverified until a real device test — everything else about this feature, including the full
9-step sequence and the persistence/streak logic, was verified end-to-end in this sandbox with
MediaPipe stubbed).

## QA process for future changes

Chris asked for future changes to this feature to go through a repeatable multi-persona review
(frontend/backend/architect/qa/project-manager), not a one-off — see
`.claude/skills/form-coach-qa-review/SKILL.md` for the process itself, and
`memory/form_coach.md`'s "Distance-readable sizing"/"Camera setup check"/"Progress / Evolution
screen" sections for what the most recent round actually found and fixed.
