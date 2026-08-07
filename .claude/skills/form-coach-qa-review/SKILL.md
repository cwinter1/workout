---
name: form-coach-qa-review
description: Multi-persona QA review (frontend/backend/architect/qa/project-manager) for changes to the camera-based form-coach feature — squat-coach.js, daily-routine.js, form-coach-engine.js, exercise-*.js. Run before shipping any change that touches camera/pose lifecycle, rep/hold scoring, the setup check, or the progress/evolution screen.
---

# Form Coach QA Review

## Why this exists

Chris asked, in the round that added the camera setup check and the Progress/Evolution screen,
for future changes to this feature to go through a repeatable multi-persona review — not a
one-time pass that leaves nothing behind. This skill is that durable artifact: run it (or follow
it manually) before shipping a change to any of the camera/pose/scoring files, the same way it
was run for that round.

## When to use this

Any change touching: `form-coach-engine.js`, `exercise-squat.js`, `exercise-pushup.js`,
`exercise-lunge.js`, `exercise-plank.js`, `squat-coach.js`, `daily-routine.js`. Skip it for
changes that are purely cosmetic and confined to `am.js`/`office.js`/`shared.js` (this app's other
programs) — those aren't in scope here.

## The review

Spawn 5 independent review agents (general-purpose, each framed with one persona below — this
repo has no repo-specific `architect`/`backend-engineer`/`qa`/`project-manager` agent types the
way the sibling `news` repo does, so frame the persona directly in the prompt). Run them in
parallel, read-only (no edits), each reporting findings ranked by severity
(blocking/should-fix/nice-to-have) with file:line citations.

1. **Frontend** — live-camera-screen legibility (the phone is propped a few feet away during a
   set, not held close — font sizes must read at a glance), layout risk on a narrow viewport
   (375px iPhone SE is the floor, not 390px), `T`-object/palette compliance (no new colors outside
   `T` + the two documented exceptions: `WARN_COLOR`, `withAlpha(T.accent, …)`), home-screen
   discoverability.
2. **Backend/logic** — FSM/scoring correctness, the setup-check state machine (streak
   increment/reset, the confirm→exit→enterStep(0) handoff, double-invocation risk around the
   `setTimeout` in `confirmSetupPhase`), persistence correctness (`computeDayStats`,
   `dailyRoutineAllTimeStats`, `dailyRoutineStreak` — including DST/timezone-safe date math, since
   this app is Israel-only and DST-affected), resource cleanup (every `setInterval`/camera
   stream/wake-lock has a clear path on every exit, including backgrounding mid-step).
3. **Architect** — does new code respect the file's own documented DOM rule (`render()` must never
   run again once the live camera screen is built, for the whole routine — see
   `daily-routine.js`'s module docblock)? Is the shared engine (`form-coach-engine.js`) still
   exercise-agnostic? Is the persistence shape consistent with the rest of the app's localStorage
   design (own key, no collision, matches Q·Flow's own-prefix precedent)?
4. **QA** — run `node --check` on every touched file; grep every call site and cross-check the
   callee is actually defined in scope, matching real `<script src>` load order (this caught a
   real bug once: `skipBtn.onclick` called an undefined `skipSetupCheck()` instead of the real
   `exitSetupCheck()` — hunt for that exact class of typo/mismatch every time); confirm
   `tests/form-coach-flow.html` covers any new pure-logic function (state-machine/DOM-coupled
   logic like the setup check is NOT expected to be covered there — see "Testing philosophy"
   below); actually run the test suite (headless Playwright or a real browser), don't just read it.
5. **Project manager** — re-read the user's actual request verbatim and map each line to what the
   code does, PASS/PARTIAL/GAP with a citation. Don't let a code-quality lens substitute for
   checking the literal ask was met.

After all 5 report, triage every finding yourself (agent findings are advisory, not automatically
correct — verify against real code before acting, matching this repo's own review-discipline
convention) and fix what's real before considering the change done.

## Testing philosophy (what's automated vs. not)

- **Pure logic** (math, FSM transitions fed synthetic landmarks, scoring formulas, persistence
  helpers like `computeDayStats`/`withAlpha`/`qualityCellStyle`) — belongs in
  `tests/form-coach-flow.html`, run via a real browser or headless Playwright. This is the
  regression suite; keep it green and extend it for every new pure function.
- **DOM/camera-integration flows** (the setup-check state machine, the full 9-step routine
  sequencing, screen transitions) — deliberately NOT part of `tests/form-coach-flow.html`,
  matching this repo's existing convention that camera/MediaPipe integration isn't unit-tested,
  only exercised for real. Verify these with an ad hoc headless-Playwright harness during the
  review round (stub `Pose`/`getUserMedia`/`startFrameLoop` — see the harness built for the
  camera-setup-check + progress-screen work for the pattern) and/or a real Tier 2 device check.
  Don't try to force this into the pure-logic suite — it doesn't fit the same shape and forcing it
  in risks a brittle, DOM-coupled test file.
- **Tier 2 (real device, live GitHub Pages URL)** is still the only tier that validates the actual
  camera permission prompt, MediaPipe CDN globals, and real rep/hold detection against a real
  body. Nothing in this skill replaces that — see `memory/form_coach.md`'s Testing limitation
  section.

## Known findings from the most recent review round (2026-08-07), for reference

Fixed: `stopCamera()` now also clears the step timer (was leaving a `setInterval` running after
backgrounding mid-timer-step); `dailyRoutineStreak()`'s day-diff math rewritten to be DST-safe
(was mixing a UTC-parsed date string against a local-midnight `Date` object); a skipped hold step
with zero active time is now treated as unscored (`overall: null`), matching how a skipped
reps step with zero completed reps is already treated, so both feed `computeDayStats`'s
`avgQuality` consistently; `squat-coach.js`'s live rep counter enlarged from 28px to 72px to
actually match `daily-routine.js`'s equivalent (it hadn't, despite a comment claiming parity);
`daily-routine.js`'s `progressEl` now shrinks its font size for the longer hold-format string
(`"0:00 / 1:00"`, 11 chars) instead of risking a wrap/clip at a fixed 72px; the setup check now
shows a live streak count on the active phase's chip instead of staying static until either a
checkmark or the 8-second trouble hint fires.

Accepted, not changed: the Progress/Evolution screen is a new bespoke 7-column calendar heatmap
(`renderProgress()`), not a literal reuse of `shared.js`'s `renderProgressGrid()` (the AM/Office
week×day grid) — that component is keyed by week/day, a shape Daily Routine's calendar-date-only
data model doesn't have (see `memory/daily_routine.md`'s persistence section), so forcing it in
would misuse a mismatched shape rather than honor "use the CSS in the site as base." The new
screen still only draws from `T` tokens + `el()` + the two documented color exceptions.
