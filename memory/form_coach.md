---
name: form-coach
description: Shared camera/MediaPipe form-coaching engine — architecture, MediaPipe decisions, testing limitations, tunable scoring constants for squat/push-up/lunge/plank
metadata:
  type: feedback
---

## What this is

A real-time, on-device form-coaching system used by two features: the standalone **Squat Form
Coach** (`squat-coach.html`) and the **Daily Routine** (`daily-routine.html`, see
`memory/daily_routine.md` for that feature's own decisions). Both open the phone camera, overlay a
live skeleton via on-device pose detection, and score movement across several dimensions with
live, actionable, red-flagged feedback. Squat shipped first as the proof-of-concept; push-up,
lunge, and plank were added once the daily routine needed them, at which point the squat-only code
was refactored into a shared engine (see below) rather than duplicated three more times.

## Architecture: shared engine + one file per exercise + page-specific orchestration

| File | Role |
|------|------|
| `form-coach-engine.js` | Exercise-**agnostic**: pure math (angle/line-deviation helpers), the generic rep-detection state machine (`newFsm`/`tickFsm`), generic rep scorers (`scoreDepth`/`scoreLateralStability`/`scoreSmoothness`), the hold-based tracker for static exercises (`newHold`/`tickHold`/`scoreHold`), and the camera/pose lifecycle (one shared `Pose` instance via `ensurePose`, `startCameraStream`/`stopCameraStream`, `startFrameLoop`/`stopFrameLoop`, `drawSkeleton`). Also owns `WARN_COLOR` (see below) and landmark constants (`LM`, `LEFT_LEG`/`RIGHT_LEG`). Never references a specific exercise by name — if a new exercise needs a genuinely new *kind* of primitive, it goes here; if it just needs new *numbers*, it goes in that exercise's own file. |
| `exercise-squat.js` | Squat's config (`SQUAT_EXERCISE`) + scoring (`squatScoreForm`/`squatLiveFrameCheck`/`squatRepFeedback`/`squatScoreRep`/`squatSummaryFeedback`) + its own landmark-selection shape (`squatWorkingLandmarks`, `squatFrameSample`). |
| `exercise-pushup.js` | Push-up's config (`PUSHUP_EXERCISE`) + equivalent scoring functions, tracking shoulder-center motion (not hip-center) and a body-line sag/pike check instead of knee valgus. |
| `exercise-lunge.js` | Lunge's config (`LUNGE_EXERCISE`) + scoring — picks whichever leg is more bent as "front" each frame (see below), still uses hip-center for rep detection (a lunge still dips vertically like a squat). |
| `exercise-plank.js` | Plank's config (`PLANK_EXERCISE`) — **not** rep-based at all, uses the engine's hold-tracker instead of the FSM. |
| `squat-coach.js` / `daily-routine.js` | Page-specific orchestration only: state, `render()`, DOM. `squat-coach.js` is a single-exercise standalone flow; `daily-routine.js` sequences all 4 exercises through 9 fixed steps (own document, `memory/daily_routine.md`). |

Every `exercise-*.js` file's own scoring functions reference their config directly (e.g.
`squatScoreForm()` reads `SQUAT_EXERCISE` internally) rather than taking it as a parameter — there
is only ever one config per exercise, and an explicit parameter is just a chance to pass the wrong
one by accident. This was actually a real bug caught during `daily-routine.js`'s integration
testing: `exercise-squat.js` was first written taking `cfg` as a parameter (matching how the
original single-exercise `squat-coach.js` had called it) while `exercise-pushup.js`/
`exercise-lunge.js` were written the other way; `daily-routine.js`'s generic `REP_EXERCISES` map
called all three uniformly with 2 arguments, throwing on the mismatched one. Standardized on the
implicit-reference style everywhere. Only the truly generic engine functions (`scoreDepth`,
`scoreLateralStability`, `scoreSmoothness`) take `cfg` explicitly, since those really do serve any
exercise.

## Home-screen entry points

Both features get a card on the AM home screen (`am.js`'s `renderHome()`), immediately after the
Begin button so neither is buried under the sleep card/phase breakdown/week grid/progress grid —
see the "moved from the bottom nav list" note originally written for Squat Coach below, which
applies to both. **Daily Routine's card is placed first and uses a filled accent background**
(matching Begin's visual weight) rather than Squat Coach's outlined style — a deliberate signal
that it's the primary daily practice now, with Squat Coach as the secondary, standalone tool.

First shipped (Squat Coach only) as a 5th button appended to the bottom-of-home-screen nav list
(alongside "4-week program"/"Office · Core Reset"/"Q·Flow"/"Measurements"). After the first
real-device test, Chris reported it as effectively missing — it was buried below the sleep card,
Begin button, phase breakdown, week section, and progress grid, easy to miss on a quick glance.

## Real-device test #1 (Squat Coach): rep counting was silently broken, feedback was invisible as a result

The camera and skeleton overlay worked, but reps were never counted — which also meant the
per-rep feedback line and colored score chips never appeared (no completed rep, no scoring). Root
cause, found by re-deriving the FSM's math rather than guessing at thresholds: `topBaselineY` (the
"standing" reference the FSM measures descent against) adapted via a leaky EMA on **every** frame
spent in the `'standing'` state, with no gate on whether the body was actually still — so during a
real, even moderately fast squat, the baseline kept chasing the hip position while the debounce
counter was still accumulating, absorbing the delta before `DESCEND_DELTA` was ever crossed. A
standalone Node simulation (sweeping synthetic descent speeds from 0.5s to 20s) confirmed this
concretely: with the original code, anything slower than roughly a 2-2.5 second descent never
triggered `'descending'` at all, and a first attempted fix (gating the EMA on a small velocity
threshold) only pushed that failure point out to ~3s rather than eliminating it — the same
simulation showed the gated version *still* failing on a 3s+ descent, since a slow enough motion's
frame-to-frame velocity can be smaller than any reasonable "stillness" threshold.

**The actual fix**: clamp the baseline's adaptation *direction* instead of gating on speed at all
— it may only move toward a smaller-y ("more upright") value, never toward a larger-y ("more
depth") one. Since a descent is by definition an increase in y, this makes it structurally
impossible for the baseline to be dragged along with a real rep regardless of how slowly it's
performed: the moment the tracked point's smoothed y exceeds the baseline, adaptation simply stops
until it's back above it. The same Node simulation confirmed detection holds at every tested speed
from 0.5s to 20s — this is now `form-coach-engine.js`'s `tickFsm`, generic over which point is
tracked (hip-center for squat/lunge, shoulder-center for push-up), so every rep-based exercise
inherits the fix. `tests/form-coach-flow.html` has a dedicated regression test for this
(`testSlowDescentRegression`, a ~5s synthetic descent) plus a comment walking through why the
first attempted fix wasn't enough — worth reading before touching this logic again.

## Real-device test #1 (same session): live, actionable, red-flagged feedback added

Two related asks after the same test: (1) feedback described what went wrong but not what to do
about it ("Not reaching full depth." rather than an instruction); (2) feedback only ever appeared
*after* a rep completed, and since rep-counting was broken (see above), it effectively never
appeared at all — but even once fixed, waiting until rep-end for the first signal is a real gap
against the original spec's "live text feedback while squatting." Both addressed together, and
both patterns now apply uniformly across all 4 exercises:

- **Actionable copy**: each exercise's `issueLines` is the single source of truth for corrective
  text ("Go lower — aim for thighs parallel to the ground.", "Knees caving in — push them out over
  your toes.", "Hips are sagging — lift them, brace your core.", etc.), used by both the live
  in-rep/in-hold check and the post-rep/post-hold feedback line — never diagnosis-only strings.
- **Live, per-frame warning**: each exercise's `*LiveFrameCheck` function runs every frame while a
  rep is actively in progress — form checks (valgus/lean/sag-pike/knee-over-toe) run continuously;
  depth-style checks only once the FSM reaches `'bottom'` (before that, the user hasn't reached
  their deepest point yet, so a live depth judgment would be premature). Deliberately more
  reactive/noisier than the debounced per-rep checks (no multi-frame debounce) — acceptable for a
  live indicator, where a brief flicker costs far less than the rep-scoring FSM's false transitions
  would. Plank's `plankLiveFrameCheck` is the same idea applied continuously throughout a hold,
  since there's no rep boundary to wait for at all.
- **Red as a real UI state**: the repo's `T` palette (`CLAUDE.md`'s "Design System") has no
  red/warning color and is explicitly "do not add colors outside T" — but Chris directly asked for
  red-on-wrong feedback. `WARN_COLOR = '#c9564a'` lives in `form-coach-engine.js` (not
  `shared.js`'s `T` object) — the shared palette stays untouched for AM/Office, and every camera
  coach feature gets this one explicitly-requested exception. Used for: the live in-rep/in-hold
  warning text, the post-rep/post-hold feedback line (red if any issue was flagged, neutral `T.sub`
  if clean), live score chips (a 3rd "bad" state alongside "good"/neutral, for score ≤ 4), and
  summary-screen stat numbers.

## Fully outside the session-engine contract

Neither `squat-coach.js` nor `daily-routine.js` calls `shared.js`'s session-engine functions
(`startSession`/`renderPreview`/etc.) or defines the "contract" (`currentDay()`, `nextSession()`,
`PROGRESS_PREFIX`, `TOTAL_SESSIONS`, etc. — see `architecture_decisions.md`'s "Office program"
section). Both borrow only generic utilities from `shared.js`: `T`, `el()`, icons, `beep()`,
`acquireWakeLock()`/`releaseWakeLock()`, `dateKey()`. Each has its own `state` and its own
`render()`. This is a legitimate, confirmed-safe reuse — none of `shared.js`'s top-level code runs
eagerly against session-engine names (only inside an unfired `visibilitychange` callback closure).

**Critical rule inside both files:** once the live camera/canvas is up, `render()` (which does
`root.innerHTML = ''`) must never be called again — on iOS Safari specifically, detaching a live
`<video>` element from the document (which `innerHTML = ''` does, even to a node a JS variable
still references and re-appends afterward) risks breaking the `getUserMedia` stream outright, not
just a visual blip. `squat-coach.js` only has one "screen" this applies to (the camera view, for
the duration of one set). `daily-routine.js` is stricter still: the **entire 9-step routine** runs
inside one continuously-live camera session — `render()` is called exactly once (`startRoutine()`)
and never again until the routine ends (`finishRoutine()`, where the camera is deliberately
stopped and a real `render()` is safe again). Step transitions call `enterStep()`-style direct
node patches, not `render()` — verified end-to-end in this sandbox (a headless
browser check confirmed the `<video>` DOM node's identity is preserved across all 9 step
transitions, not recreated).

## In-memory only for Squat Coach — Daily Routine persists a completion log

`squat-coach.js` still writes no localStorage key of any kind (Phase 1 scope, unchanged). Daily
Routine is different: it persists a `mf.dailyRoutine` completion log — see
`memory/daily_routine.md` for that shape and reasoning. Don't add persistence to Squat Coach
without being asked — see `CLAUDE.md`'s "What NOT to Do."

## MediaPipe API choice: legacy Solutions API, not Tasks Vision

Google's actively-maintained Pose Landmarker (`@mediapipe/tasks-vision`) requires ES-module
`import` syntax in the browser — a direct conflict with this repo's "classic `<script src>` only"
rule. Chose the older `@mediapipe/pose` "Solutions" API instead: classic-script globals (`Pose`,
`drawConnectors`, `drawLandmarks`, `POSE_CONNECTIONS`), Google-frozen/deprecated but still served
indefinitely via jsDelivr regardless (published npm packages don't get pulled from jsDelivr).

Camera capture itself is **not** driven by `@mediapipe/camera_utils`'s `Camera` helper —
`form-coach-engine.js` calls `navigator.mediaDevices.getUserMedia()` directly and drives the
pose-send loop with its own `requestAnimationFrame`, so front/rear camera selection and stream
teardown are under direct control rather than an unverified third-party wrapper whose `facingMode`
support couldn't be confirmed from this sandbox (see below). Only `drawing_utils.js` and `pose.js`
are loaded — `camera_utils.js` is intentionally not included on either page.

`daily-routine.html` reuses the **same** `Pose` instance across all 9 steps (`ensurePose()` just
re-registers the `onResults` callback on an existing instance rather than constructing a new one)
— important since re-initializing MediaPipe's WASM model per exercise would mean doing it up to 8
times in one 20-minute routine.

## Testing limitation: these pages cannot be tested via `file://`

`getUserMedia` requires a secure context (https or `localhost`) — this is a browser platform rule,
not something this app's code controls. Unlike every other page in this repo, neither Squat Coach
nor Daily Routine can be tested by opening the file directly or sharing it to the phone the way
`index.html`/`office.html` normally are (see `CLAUDE.md`'s "Working File & Git Sync"). The landing
screens (no camera yet) load fine via `file://`, but the "Start Camera"/"Start Routine" flows need
at least `localhost`. Real verification happens only after pushing, on the live GitHub Pages URL.

This sandbox's own network egress proxy blocks `cdn.jsdelivr.net` entirely (confirmed via a direct
`curl`, HTTP 403 at the tunnel), so the MediaPipe scripts' real global-export names
(`Pose`/`drawConnectors`/`drawLandmarks`/`POSE_CONNECTIONS`) were never verified against the live
files during implementation — only against secondary sources (real usage examples in other public
repos). Both `startCamera()`-equivalent functions are defensive about this: `ensurePose()` runs
inside the same `try` block as `getUserMedia`, so if `Pose` turns out to be undefined (CDN failure,
ad-blocker, etc.) it surfaces as a clear error message instead of hanging — confirmed via a
headless-browser run in this sandbox that a `Pose is not defined` exception (simulating the CDN
being unreachable) is caught cleanly. The **first thing to check** once either page is opened for
real: dev-tools console, confirm `typeof Pose/drawConnectors/drawLandmarks/POSE_CONNECTIONS` are
not `"undefined"`.

Every other piece of real-device verification in this sandbox (rep counting, live red warnings,
the full 9-step routine sequence, the `<video>` DOM-node-identity-preserved-across-steps check) was
done with the MediaPipe globals **stubbed** (a fake `Pose` constructor feeding synthetic landmark
frames via a captured `onResults` callback) — this validates the app's own logic and wiring
thoroughly, but the actual MediaPipe library's real behavior (its real global names, its real
`Pose`/`drawConnectors` API shape) remains unverified until a real device test.

## Tunable scoring constants — calibrate against real reps

Every `*_EXERCISE` config is a first-pass estimate for an untrained phone-camera setup, not
physiologically precise:

**Squat** (`exercise-squat.js`): `angleTop`/`angleBottom` (170°/80°, knee-angle depth anchors),
`stabilityUnit` (0.02), `jerkUnit` (4, the single most speculative constant in the whole system),
`valgusThreshold` (0.06), `leanThreshold` (45°, an explicit 2D lean-angle proxy — 2D landmarks
can't see the spine, feedback copy says "leaning forward" never "back rounding"/"arching").

**Push-up** (`exercise-pushup.js`): `angleTop`/`angleBottom` (165°/75°, elbow-angle depth anchors),
`bodyLineThreshold` (0.12, hip sag/pike sensitivity). No `depthRatioFn` secondary check — unlike
squat's hip-vs-knee-height comparison, push-up has no equally reliable 2D-camera-angle-robust
proxy, so ROM scoring here is angle-only.

**Lunge** (`exercise-lunge.js`): `angleTop`/`angleBottom` (165°/85°, front-knee-angle anchors),
`kneeOverToeThreshold` (0.12). "Front leg" is picked fresh every frame as whichever leg currently
has the smaller knee angle (`lungeFrontLeg`) — reps are counted in total regardless of which leg is
forward (matching the routine's "20 total, alternating" spec), not tracked per side.

**Plank** (`exercise-plank.js`): `tolerance` (0.09, body-line deviation allowed before flagged),
`formUnit` (0.06), `stabilityUnit` (0.03). Plank's config only has 3 scoring dimensions (Hold,
Stability, Form) — there's no meaningful "Speed" for a static hold, and the config deliberately
doesn't fabricate one just to fill a 4th slot.

A `?debug=1` query flag on `squat-coach.html` overlays raw metric values next to the mapped scores
on the camera screen (`daily-routine.html` has a lighter debug line — step/phase/coreVis only, not
per-exercise angle detail, since it moves through 4 different exercises) — the practical way to
calibrate these against Chris's actual body/phone/camera distance, since no camera exists in this
sandbox to generate real pose data.

## Pure-logic tests

`tests/form-coach-flow.html` (superseding the original `tests/squat-coach-flow.html`, deleted)
loads the **real source files directly** (`<script src="../form-coach-engine.js">` etc.) rather
than inlining copies the way `tests/session-flow.html` does — a deliberate improvement now that
the engine is shared across multiple consumers, so there's no risk of an inlined test copy quietly
drifting out of sync with what actually ships. Covers: the engine's pure math and generic scorers,
the generic rep FSM (including the jitter-debounce and slow-descent-regression cases) exercised
through squat's own landmark shape, the hold-tracker (`newHold`/`tickHold`/`scoreHold`), and each
of the 4 exercises' own config/scoring/live-check functions including a full synthetic FSM cycle
per rep-based exercise, plus (as of the camera-setup-check/progress-screen round below)
`daily-routine.js`'s pure persistence/progress-grid helpers — `computeDayStats`, `withAlpha`,
`qualityCellStyle`, `dailyRoutineAllTimeStats`, `dailyRoutineStreak`. 67 assertions as of this
writing (up from 48; `daily-routine.js`'s trailing `render()` call is harmless in this test
context since it only reaches the camera-free landing screen). Camera/MediaPipe integration itself
stays out of scope, matching `session-flow.html`'s own precedent of testing pure logic only — the
camera/routine-sequencing *wiring* (setup check, step sequencing, screen transitions) is instead
verified via an ad hoc headless-Playwright harness during each review round (stub `Pose`/
`getUserMedia`/`startFrameLoop`, drive frames by hand) rather than folded into this suite, and via
real Tier 2 device checks — see `.claude/skills/form-coach-qa-review/SKILL.md` for the full
process, added specifically so this multi-persona review became a repeatable practice rather than
a one-off.

## Distance-readable sizing on the live camera screen (Chris: "the human eye can't see things
bright... make it human usage right size")

The phone is propped up a few feet away during a set, not held close — the original font sizes
(borrowed from the rest of the app's normal-reading-distance UI) were too small to read at a
glance mid-rep. Both `squat-coach.js` and `daily-routine.js` now size their live-read elements
much larger: the primary rep/hold counter (`daily-routine.js`'s `progressEl`, `squat-coach.js`'s
`repCounterEl`) at 72px, live corrective feedback text at 19px, chip values at 24px. `progressEl`
shrinks dynamically for the longer hold-format string (`"0:00 / 1:00"`, up to 11 characters) via
`setProgressText()` rather than risking a wrap/clip at a fixed 72px — anything ≤7 chars stays at
72px, ≤9 chars drops to 56px, longer drops to 44px. Chip labels got a `white-space:nowrap` +
ellipsis safety net against wrapping on a narrow (375px, iPhone SE-class) viewport, where a 4-chip
row with an 11px label like "Stability" has little margin to spare.

## Camera setup check — one fixed placement, standing AND floor

Chris's concern: "a real case where the camera/phone is in one place will be ok for plank or I
will need to refocus" — the routine alternates between standing exercises (squat/lunge) and floor
exercises (push-up/plank) with no practical way to reposition the phone mid-routine, so a bad
placement wouldn't surface until minutes in. `daily-routine.js`'s `enterSetupCheck()` runs once,
before step 0: confirms a standing pose is trackable (`SETUP_CONFIRM_STREAK = 12` consecutive
frames with core-landmark visibility > 0.5), then the same for a floor pose at the same spot, then
auto-advances into the routine. A live count on the active phase's chip (mirroring the number of
consecutive good frames so far) gives continuous visible progress rather than nothing changing for
several seconds; an "having trouble" hint in `WARN_COLOR` appears after `SETUP_TROUBLE_MS = 8000`ms
without a confirm, but never blocks — "Skip Setup Check" is always available, matching the
routine's existing "no getting stuck" design goal (see `memory/daily_routine.md`'s "Always-available
Skip This Step" section). Reuses the same shell nodes as step 0 (chips repurposed as
Standing/Floor indicators) rather than building new DOM, respecting the "never call `render()`
again once the camera is live" rule above.

## Progress / Evolution screen — reps, quality, and rate over time

Chris: "At the end I get how many reps, evaluation. This allows to see the projection, track and
see evolution" plus "use week progress path but change the colour ... not only done also quality
and quantity and add rate." `daily-routine.js`'s `renderProgress()` is a new screen (reachable from
the landing screen), showing: a stat grid (day streak, days completed, total reps, average quality
rate) and an 8-week, 7-column calendar heatmap where each day's cell is colored via
`qualityCellStyle()` — not-done stays the neutral `T.pill`, done-but-unscored gets a dim flat
accent tint, done with `avgQuality <= 4` is solid `WARN_COLOR`, and everything from 5-10 shades
`T.accent` from a faint tint up to fully solid via the new `withAlpha(hex, alpha)` helper (hex →
rgba string, only opacity varies — no new hue, so this stays inside the "no colors outside `T`"
rule the same minimal way `WARN_COLOR` already does).

This is a **new, bespoke grid**, not a literal reuse of `shared.js`'s `renderProgressGrid()` (the
AM/Office week×day grid) — that component is keyed by week 1-4 × day 0-2, a shape Daily Routine's
calendar-date-only persistence (see `memory/daily_routine.md`) doesn't have. Forcing the existing
component in would have meant fitting a mismatched shape rather than honoring "use the CSS in the
site as base" (which the new screen does — `T` tokens + `el()` only, no new styling system).
Reviewed and confirmed as the right call during the multi-persona QA round (architect: consistent;
project-manager: a defensible reinterpretation, flagged for confirmation with Chris rather than
treated as a silent gap).

`computeDayStats(results)` computes `totalReps`/`totalHoldSeconds`/`avgQuality` once at save time
(stored on the `mf.dailyRoutine` entry — see `memory/daily_routine.md`'s persistence section for
the full shape). `avgQuality` is `null`, not `0`, when nothing that day was actually scorable — a
skipped hold step with zero active time is now treated the same as a skipped reps step with zero
completed reps (both `overall: null`, excluded from the average) after a review round caught the
two being scored inconsistently.
