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
stopped and a real `render()` is safe again). Step transitions call `updateStepUI`-style direct
node patches (`enterStep()`), not `render()` — verified end-to-end in this sandbox (a headless
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
per rep-based exercise. 48 assertions as of this writing. Camera/MediaPipe integration itself stays
out of scope, matching `session-flow.html`'s own precedent of testing pure logic only — the
camera/routine-sequencing *wiring* itself was verified separately via headless-browser runs with
MediaPipe stubbed (see "Testing limitation" above), not as part of this pure-logic suite.
