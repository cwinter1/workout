---
name: squat-coach
description: Squat Form Coach — camera/MediaPipe decisions, testing limitations, tunable scoring constants
metadata:
  type: feedback
---

## What this is

Phase 1 MVP of a real-time squat form coach: `squat-coach.html` + `squat-coach.js`, reachable from
the AM home screen via a "Squat Form Coach" nav-link button (same style/pattern as "Office · Core
Reset"/"Q·Flow"/"Measurements"). Opens the phone camera, overlays a live skeleton via on-device
pose detection, scores each rep on 4 dimensions (range of motion, stability, speed, form), and
shows a post-set summary. Squat is explicitly the proof-of-concept for this feature — more
calisthenics exercises are planned once this lands.

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
thresholds, feedback-line pool) isolated in the single `SQUAT_EXERCISE` config object at the top of
the file. Adding a second calisthenics exercise later should mean adding its own config object and
scoring functions, not a rewrite of the camera/FSM plumbing — this was a deliberate, if light,
concession to "don't build for hypothetical futures," made because the user explicitly said more
exercises are planned next.

## Pure-logic tests

`tests/squat-coach-flow.html` follows the same pattern as `tests/session-flow.html` — inline
`assert()` runner, opened directly in a browser, no build step. It covers only the pure math/FSM/
scoring functions (angle math, rep-detection state machine including jitter-debounce behavior,
knee-valgus and lean-angle formulas, all 4 scoring dimensions) — camera/MediaPipe integration
itself is out of scope, matching `session-flow.html`'s own precedent of testing pure logic only.
