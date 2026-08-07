---
name: squat-coach
description: Squat Form Coach — camera/MediaPipe decisions, testing limitations, tunable scoring constants
metadata:
  type: feedback
---

## What this is

Phase 1 MVP of a real-time squat form coach: `squat-coach.html` + `squat-coach.js`, reachable from
the AM home screen via a prominent "Squat Form Coach" card right under the Begin button (see
"Home-screen entry point" below). Opens the phone camera, overlays a live skeleton via on-device
pose detection, scores each rep on 4 dimensions (range of motion, stability, speed, form), and
shows a post-set summary. Squat is explicitly the proof-of-concept for this feature — more
calisthenics exercises are planned once this lands.

## Home-screen entry point: moved from the bottom nav list to right under Begin

First shipped as a 5th button appended to the bottom-of-home-screen nav list (alongside "4-week
program"/"Office · Core Reset"/"Q·Flow"/"Measurements"). After the first real-device test, Chris
reported it as effectively missing — it was buried below the sleep card, Begin button, phase
breakdown, week section, and progress grid, easy to miss on a quick glance. Moved to a distinct,
accent-outlined card immediately after the Begin button (`am.js`'s `renderHome()`), so it's visible
without scrolling. Styled differently from the plain-hairline nav-list buttons below it, since it's
a distinct feature (a live camera tool) rather than another "browse my program" page in the same
family as Program/Measurements.

## Real-device test #1: rep counting was silently broken, feedback was invisible as a result

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
depth") one. Since a descent is by definition an increase in hip-y, this makes it structurally
impossible for the baseline to be dragged along with a real squat regardless of how slowly it's
performed: the moment `smoothedY` exceeds the baseline, adaptation simply stops until the person is
back above it. The same Node simulation confirmed detection holds at every tested speed from 0.5s
to 20s. `tests/squat-coach-flow.html` has a dedicated regression test for this (`testRepFsmSlowDescent`,
a ~5s synthetic descent) plus a note in its comments walking through why the first attempted fix
wasn't enough — worth reading before touching this logic again.

## Real-device test #1 (same session): live, actionable, red-flagged feedback added

Two related asks after the same test: (1) feedback described what went wrong but not what to do
about it ("Not reaching full depth." rather than an instruction); (2) feedback only ever appeared
*after* a rep completed, and since rep-counting was broken (see above), it effectively never
appeared at all — but even once fixed, waiting until rep-end for the first signal is a real gap
against the original spec's "live text feedback while squatting." Both addressed together:

- **Actionable copy**: `SQUAT_EXERCISE.issueLines` is now the single source of truth for corrective
  text ("Go lower — aim for thighs parallel to the ground.", "Knees caving in — push them out over
  your toes.", etc.), used by both the live in-rep check and the post-rep summary line, instead of
  diagnosis-only strings scattered inline in `repFeedback()`.
- **Live, per-frame warning**: `liveFrameCheck(lm, fsmPhase, cfg)` runs every frame while a rep is
  actively in progress (`fsm.fsmState !== 'standing'`) — valgus and lean checks run continuously;
  the depth check only once the FSM reaches `'bottom'` (before that, the user hasn't reached their
  deepest point yet, so a live depth judgment would be premature). This is deliberately more
  reactive/noisier than the debounced per-rep checks (no multi-frame debounce) — acceptable for a
  live indicator, where a brief flicker costs far less than the rep-scoring FSM's false transitions
  would.
- **Red as a real UI state**: the repo's `T` palette (`CLAUDE.md`'s "Design System") has no
  red/warning color and is explicitly "do not add colors outside T" — but Chris directly asked for
  red-on-wrong feedback. Added `WARN_COLOR = '#c9564a'` as a **Squat-Coach-local constant, not
  added to `shared.js`'s `T` object** — the shared palette stays untouched for AM/Office, and this
  one feature gets its explicitly-requested red state. Used for: the live in-rep warning text, the
  post-rep feedback line (red if any issue was flagged, neutral `T.sub` if clean), the 4 live score
  chips (a 3rd "bad" state added alongside the existing "good"/neutral, for score ≤ 4), and the
  summary screen's stat-card numbers.

## Fully outside the session-engine contract

Unlike `office.html`/`office.js`, this page never calls `shared.js`'s session-engine functions
(`startSession`/`renderPreview`/etc.) and never defines the "contract" (`currentDay()`,
`nextSession()`, `PROGRESS_PREFIX`, `TOTAL_SESSIONS`, etc. — see `architecture_decisions.md`'s
"Office program" section). It borrows only generic utilities from `shared.js`: `T`, `el()`, icons,
`beep()`, `acquireWakeLock()`/`releaseWakeLock()`. It has its own `state` and its own `render()`.
This is a legitimate, confirmed-safe reuse — none of `shared.js`'s top-level code runs eagerly
against session-engine names (only inside an unfired `visibilitychange` callback closure).

**Critical rule inside `squat-coach.js`:** once the live camera/canvas is up, `render()` (which
does `root.innerHTML = ''`) must never be called again — it would kill the active `getUserMedia`
stream and tear down the pose-detection loop. The camera screen's DOM is built once; all
live updates (rep counter, chips, feedback line) patch existing node references directly, the
same pattern `shared.js`'s own `updateTimerDisplay()` uses during an active timer.

## In-memory only — no persistence, by design

Phase 1 scope explicitly excludes persistence. `squat-coach.js` writes no `mf.*` localStorage key
and no new key of any kind. Do not add persistence here without being asked — see `CLAUDE.md`'s
"What NOT to Do."

## MediaPipe API choice: legacy Solutions API, not Tasks Vision

Google's actively-maintained Pose Landmarker (`@mediapipe/tasks-vision`) requires ES-module
`import` syntax in the browser — a direct conflict with this repo's "classic `<script src>` only"
rule. Chose the older `@mediapipe/pose` "Solutions" API instead: classic-script globals (`Pose`,
`drawConnectors`, `drawLandmarks`, `POSE_CONNECTIONS`), Google-frozen/deprecated but still served
indefinitely via jsDelivr regardless (published npm packages don't get pulled from jsDelivr).

Camera capture itself is **not** driven by `@mediapipe/camera_utils`'s `Camera` helper —
`squat-coach.js` calls `navigator.mediaDevices.getUserMedia()` directly and drives the pose-send
loop with its own `requestAnimationFrame`, so front/rear camera selection and stream teardown are
under direct control rather than an unverified third-party wrapper whose `facingMode` support
couldn't be confirmed from this sandbox (see below). Only `drawing_utils.js` and `pose.js` are
loaded — `camera_utils.js` is intentionally not included.

## Testing limitation: this page cannot be tested via `file://`

`getUserMedia` requires a secure context (https or `localhost`) — this is a browser platform rule,
not something this app's code controls. Unlike every other page in this repo, Squat Coach cannot
be tested by opening the file directly or sharing it to the phone the way `index.html`/`office.html`
normally are (see `CLAUDE.md`'s "Working File & Git Sync"). The landing screen (no camera yet)
loads fine via `file://`, but the "Start Camera" flow needs at least `localhost`. Real verification
happens only after pushing, on the live GitHub Pages URL
(`https://cwinter1.github.io/workout/squat-coach.html`).

This sandbox's own network egress proxy blocks `cdn.jsdelivr.net` entirely (confirmed via a direct
`curl`, HTTP 403 at the tunnel), so the MediaPipe scripts' real global-export names
(`Pose`/`drawConnectors`/`drawLandmarks`/`POSE_CONNECTIONS`) were never verified against the live
files during implementation — only against secondary sources (real usage examples in other public
repos). `startCamera()` is defensive about this: `ensurePose()` runs inside the same `try` block as
`getUserMedia`, so if `Pose` turns out to be undefined (CDN failure, ad-blocker, etc.) it surfaces
as a clear "Could not start the camera" message on the landing screen instead of hanging on
"requesting" forever — confirmed via a headless-browser run in this sandbox that a `Pose is not
defined` exception (simulating the CDN being unreachable) is caught cleanly. The **first thing to
check** once this page is opened for real: dev-tools console, confirm
`typeof Pose/drawConnectors/drawLandmarks/POSE_CONNECTIONS` are not `"undefined"`.

## Tunable scoring constants — calibrate against real reps

All of `SQUAT_EXERCISE` in `squat-coach.js` is a first-pass estimate for an untrained phone-camera
setup, not physiologically precise:
- `romAngleTop` (170°) / `romAngleBottom` (80°) — knee-angle anchors for the depth score.
- `stabilityUnit` (0.02 shoulder-widths per point lost) — hip-x jitter tolerance.
- `jerkUnit` (4) — the single most speculative constant in the system; governs the speed/smoothness
  score.
- `valgusThreshold` (0.06 shoulder-widths) — knee cave-in sensitivity.
- `leanThreshold` (45°) — forward-lean flag. Explicitly a 2D lean-angle proxy, not spinal-rounding
  detection — 2D landmarks can't see the spine. Feedback copy says "leaning forward," never "back
  rounding"/"arching," to avoid overclaiming what's actually measured.

A `?debug=1` query flag on `squat-coach.html` overlays the raw metric values (`minAngle`, working
side, FSM state, core visibility) next to the mapped scores on the camera screen — the practical
way to calibrate these against Chris's actual body/phone/camera distance, since no camera exists
in this sandbox to generate real pose data.

## Forward-compatible structure for a second exercise

Squat is the only exercise implemented, but the camera/pose-loop/rep-FSM/rendering plumbing in
`squat-coach.js` is written generically, with every squat-specific number (angle anchors,
thresholds, feedback-line pool, and now `issueLines`' corrective copy) isolated in the single
`SQUAT_EXERCISE` config object at the top of the file. Adding a second calisthenics exercise later
should mean adding its own config object and scoring functions, not a rewrite of the camera/FSM
plumbing — this was a deliberate, if light, concession to "don't build for hypothetical futures,"
made because the user explicitly said more exercises are planned next.

## Pure-logic tests

`tests/squat-coach-flow.html` follows the same pattern as `tests/session-flow.html` — inline
`assert()` runner, opened directly in a browser, no build step. It covers only the pure math/FSM/
scoring functions (angle math, rep-detection state machine including jitter-debounce behavior and
the slow-descent regression case above, knee-valgus and lean-angle formulas, all 4 scoring
dimensions, `liveFrameCheck`'s live corrective cues, and `repFeedback`'s warn flag) — camera/
MediaPipe integration itself is out of scope, matching `session-flow.html`'s own precedent of
testing pure logic only. 30 assertions as of the real-device-test-#1 fixes above.
