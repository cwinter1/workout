// ═══════════════════════════════════════════════════════
// FORM COACH ENGINE — shared camera/pose/scoring machinery for every camera-based exercise
// coach in this repo (squat-coach.js, daily-routine.js). Extracted from the original
// squat-coach.js once a second and third consumer needed the same camera/FSM/scoring plumbing —
// see memory/form_coach.md for the extraction history and the "why generic, why not" reasoning
// for each piece below.
//
// This file is exercise-AGNOSTIC by design: it has no knowledge of "squat" or "push-up" or any
// specific exercise. Every exercise-specific number (which joints to track, angle anchors,
// thresholds, feedback copy) lives in that exercise's own config object, defined by its caller
// (SQUAT_EXERCISE in squat-coach.js; PUSHUP_EXERCISE/LUNGE_EXERCISE/PLANK_EXERCISE in
// daily-routine.js). Do not add exercise-specific logic here — that defeats the entire point of
// the extraction. If a new exercise needs a genuinely new kind of primitive (not just new
// numbers), add the primitive here generically, the way pointToLineSignedDistance was added for
// push-up/plank's body-line check rather than duplicating squat's line-deviation math.
//
// Squat-Coach-local WARN_COLOR from before is now here too, since every camera coach wants the
// same red "you're doing this wrong" state — still NOT added to shared.js's T object. See
// memory/form_coach.md.
// ═══════════════════════════════════════════════════════
const WARN_COLOR = '#c9564a';

// ═══════════════════════════════════════════════════════
// PURE MATH HELPERS — no DOM, no globals besides Math.
// ═══════════════════════════════════════════════════════
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function stddev(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
  return Math.sqrt(variance);
}

// Interior angle at point b, between vectors b->a and b->c, in degrees.
function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
  if (m1 < 1e-6 || m2 < 1e-6) return null;
  const cos = clamp((v1.x * v2.x + v1.y * v2.y) / (m1 * m2), -1, 1);
  return Math.acos(cos) * 180 / Math.PI;
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Parametric t along p1->p2 where y === targetY (degenerate near-horizontal segment -> 0.5).
function tAtY(p1, p2, targetY) {
  const dy = p2.y - p1.y;
  if (Math.abs(dy) < 1e-6) return 0.5;
  return (targetY - p1.y) / dy;
}

// Parametric t along p1->p2 where x === targetX (degenerate near-vertical segment -> 0.5).
function tAtX(p1, p2, targetX) {
  const dx = p2.x - p1.x;
  if (Math.abs(dx) < 1e-6) return 0.5;
  return (targetX - p1.x) / dx;
}

// How far a joint (e.g. a knee) has moved toward a midline, relative to the straight line between
// two reference points (e.g. hip->ankle) at the joint's height, normalized by `scale`. Positive =
// toward the midline. Orientation-agnostic: works the same whether the camera image is mirrored
// or not, since "toward the midline" is derived from where the midline actually falls, not an
// assumed screen side. Originally squat's knee-valgus check; reused as-is by lunge's
// knee-over-toe check.
function jointInwardOffset(start, joint, end, midlineX, scale) {
  const t = tAtY(start, end, joint.y);
  const predX = lerp(start.x, end.x, t);
  const dir = Math.sign(midlineX - predX) || 1;
  return ((joint.x - predX) * dir) / (scale || 1e-6);
}

// Vertical deviation of `point` from the line through p1->p2, evaluated at point's own x (via
// linear interpolation), normalized by `scale`. Positive = point is BELOW the line (larger y, in
// image y-down coordinates); negative = above it. Built for near-horizontal reference lines (a
// body's shoulder-to-ankle line during a push-up or plank), where this is the meaningful,
// sign-STABLE quantity — unlike a generic perpendicular distance, this doesn't flip sign
// depending on which horizontal direction p1->p2 happens to point (i.e. which way the person is
// facing the camera), only on genuinely-above-vs-below. Used for hip sag/pike checks.
function verticalLineDeviation(p1, p2, point, scale) {
  const predictedY = lerp(p1.y, p2.y, tAtX(p1, p2, point.x));
  return (point.y - predictedY) / (scale || 1e-6);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility, b.visibility) };
}

// ═══════════════════════════════════════════════════════
// LANDMARK CONSTANTS — MediaPipe Pose's 33-point layout. Only the subset any exercise here
// actually uses; add more as needed (see MediaPipe's official landmark map for the rest).
// ═══════════════════════════════════════════════════════
const LM = {
  LSHO: 11, RSHO: 12, LELB: 13, RELB: 14, LWRI: 15, RWRI: 16,
  LHIP: 23, RHIP: 24, LKNEE: 25, RKNEE: 26, LANK: 27, RANK: 28,
};
const VIS_MIN = 0.6;

// Standard leg landmark triples — shared by any lower-body exercise (squat, lunge) that picks a
// working leg by visibility. Not exercise-specific itself (just landmark indices), so it lives
// here rather than being duplicated in exercise-squat.js and exercise-lunge.js.
const LEFT_LEG = [LM.LHIP, LM.LKNEE, LM.LANK];
const RIGHT_LEG = [LM.RHIP, LM.RKNEE, LM.RANK];

function shoulderWidthOf(lm) { return Math.hypot(lm[LM.LSHO].x - lm[LM.RSHO].x, lm[LM.LSHO].y - lm[LM.RSHO].y); }
function hipCenterOf(lm) { return midpoint(lm[LM.LHIP], lm[LM.RHIP]); }
function shoulderCenterOf(lm) { return midpoint(lm[LM.LSHO], lm[LM.RSHO]); }

// Generic "which side is more trustworthy this frame" — takes the two sides' relevant landmark
// index lists directly (not hardcoded to legs), so it works for a leg triple (squat/lunge), an
// arm+torso set (push-up), or anything else a future exercise needs.
function pickWorkingSide(lm, leftIdxs, rightIdxs) {
  const leftVis = leftIdxs.reduce((a, i) => a + lm[i].visibility, 0) / leftIdxs.length;
  const rightVis = rightIdxs.reduce((a, i) => a + lm[i].visibility, 0) / rightIdxs.length;
  if (leftVis > VIS_MIN && rightVis > VIS_MIN && Math.abs(leftVis - rightVis) < 0.15) return 'both';
  return leftVis >= rightVis ? 'left' : 'right';
}

function bothSidesVisible(lm, leftIdxs, rightIdxs) {
  return leftIdxs.every((i) => lm[i].visibility > VIS_MIN) && rightIdxs.every((i) => lm[i].visibility > VIS_MIN);
}

// Average visibility across an arbitrary landmark index list — used for each exercise's own
// "is the pose confidently detected" streak check (which landmarks count as "core" differs per
// exercise, so this stays a small reusable primitive rather than a hardcoded streak tracker).
function visibilityAvg(lm, idxs) { return idxs.reduce((a, i) => a + lm[i].visibility, 0) / idxs.length; }

// ═══════════════════════════════════════════════════════
// REP DETECTION STATE MACHINE — standing -> descending -> bottom -> ascending -> standing.
// Generic over WHICH point's y-motion drives detection (hip-center for squat/lunge,
// shoulder-center for push-up) via `trackFn`/`scaleFn`, and over what per-frame data the caller
// wants captured into repBuf via `sampleFn` — the engine only owns the phase machinery, never the
// exercise-specific angle/form math. Debounced (multi-consecutive-frame) transitions over a
// smoothed trajectory, so single-frame landmark jitter never flips the phase.
// ═══════════════════════════════════════════════════════
// Time-based, not frame-count-based (see the real-device fix below): DEBOUNCE_MS/
// BOTTOM_DEBOUNCE_MS are chosen to match the original frame-count thresholds (4 and 3 frames)
// at the ~33ms/frame rate every synthetic test in this repo assumed, so nothing changes at that
// rate — but a transition now fires once the condition has genuinely held for this many real
// milliseconds, however many (or few) processed frames that took.
const DEBOUNCE_MS = 130;         // was DEBOUNCE_FRAMES = 4, at 33ms/frame
const BOTTOM_DEBOUNCE_MS = 100;  // was BOTTOM_DEBOUNCE_FRAMES = 3, at 33ms/frame
const REP_ABANDON_MS = 8000;
const MIN_REP_MS = 300;

function newFsm() {
  return {
    fsmState: 'standing', debounceStartMs: null,
    trackYHist: [], prevSmoothedY: null, topBaselineY: null,
    repBuf: [], repStartMs: 0,
  };
}

// trackFn(lm) => {x,y} — the point whose y-motion drives descend/ascend detection.
// scaleFn(lm) => number — a body-scale reference (shoulder width works for every exercise so
//   far) used to normalize the movement thresholds so they scale with distance from the camera.
// sampleFn(lm, ts, trackPt, scale) => object|undefined — exercise-specific per-frame fields
//   (e.g. squat's kneeAngle + raw hip/knee/ankle landmarks) merged into the generic sample
//   ({ts, trackX, trackY, scale, phase}) the engine always includes. Only frames captured while
//   NOT 'standing' get sampleFn's fields computed — the engine already skips them otherwise
//   (see below), so sampleFn is only ever called when it's actually needed.
//
// Returns a completed rep's frame buffer (array), or null if no rep completed this frame. Caller
// scores the returned buffer with its own exercise-specific scorer.
function tickFsm(fsm, lm, ts, trackFn, scaleFn, sampleFn) {
  const trackPt = trackFn(lm);
  const scale = scaleFn(lm) || 1e-6;

  fsm.trackYHist.push(trackPt.y);
  if (fsm.trackYHist.length > 5) fsm.trackYHist.shift();
  const smoothedY = fsm.trackYHist.reduce((a, b) => a + b, 0) / fsm.trackYHist.length;
  const velocity = fsm.prevSmoothedY == null ? 0 : smoothedY - fsm.prevSmoothedY; // + = moving down
  fsm.prevSmoothedY = smoothedY;
  if (fsm.topBaselineY == null) fsm.topBaselineY = smoothedY;

  const DESCEND_DELTA = 0.4 * scale;
  const RETURN_DELTA = 0.3 * scale;

  let completed = null;

  const pushSample = (phase) => {
    const base = { ts, trackX: trackPt.x, trackY: trackPt.y, scale, phase };
    fsm.repBuf.push(sampleFn ? Object.assign(base, sampleFn(lm, ts, trackPt, scale)) : base);
  };

  if (fsm.fsmState === 'standing') {
    // Only let the baseline adapt toward a NEW, higher (smaller-y) "top" position — never toward
    // a larger-y value, which is exactly what a descent looks like. A leaky EMA with no such gate
    // will chase the tracked point's position even during a real, slow, controlled rep, absorbing
    // the delta before DESCEND_DELTA is ever crossed — verified against descent speeds from 0.5s
    // to 20s in a standalone simulation. This directional clamp is structurally immune to that
    // regardless of speed: once smoothedY exceeds the baseline, adaptation simply stops until the
    // tracked point is back above it. See memory/form_coach.md for the full history (a first
    // attempted fix, gating on a velocity threshold instead, only pushed the failure point out to
    // ~3s rather than eliminating it).
    if (smoothedY < fsm.topBaselineY) {
      fsm.topBaselineY += (smoothedY - fsm.topBaselineY) * 0.05;
    }
    if (smoothedY - fsm.topBaselineY > DESCEND_DELTA) {
      if (fsm.debounceStartMs == null) fsm.debounceStartMs = ts;
      if (ts - fsm.debounceStartMs >= DEBOUNCE_MS) {
        fsm.fsmState = 'descending'; fsm.debounceStartMs = null; fsm.repBuf = []; fsm.repStartMs = ts;
      }
    } else fsm.debounceStartMs = null;
  } else if (fsm.fsmState === 'descending') {
    pushSample('descending');
    if (velocity <= 0) {
      if (fsm.debounceStartMs == null) fsm.debounceStartMs = ts;
      if (ts - fsm.debounceStartMs >= BOTTOM_DEBOUNCE_MS) { fsm.fsmState = 'bottom'; fsm.debounceStartMs = null; }
    } else fsm.debounceStartMs = null;
    if (ts - fsm.repStartMs > REP_ABANDON_MS) { fsm.fsmState = 'standing'; fsm.debounceStartMs = null; fsm.repBuf = []; }
  } else if (fsm.fsmState === 'bottom') {
    pushSample('bottom');
    if (velocity < 0) {
      if (fsm.debounceStartMs == null) fsm.debounceStartMs = ts;
      if (ts - fsm.debounceStartMs >= BOTTOM_DEBOUNCE_MS) { fsm.fsmState = 'ascending'; fsm.debounceStartMs = null; }
    } else fsm.debounceStartMs = null;
  } else if (fsm.fsmState === 'ascending') {
    pushSample('ascending');
    if (smoothedY - fsm.topBaselineY < RETURN_DELTA) {
      if (fsm.debounceStartMs == null) fsm.debounceStartMs = ts;
      if (ts - fsm.debounceStartMs >= DEBOUNCE_MS) {
        fsm.fsmState = 'standing'; fsm.debounceStartMs = null;
        if (ts - fsm.repStartMs > MIN_REP_MS) completed = fsm.repBuf;
        fsm.repBuf = [];
      }
    } else fsm.debounceStartMs = null;
  }

  return completed;
}

// ═══════════════════════════════════════════════════════
// GENERIC REP SCORERS — the 3 dimensions that mean the same thing for any rep-based exercise
// (depth-via-angle, lateral stability at the hold point, movement smoothness). Form scoring stays
// exercise-specific (the actual checks differ too much: knee valgus vs. knee-over-toe vs. hip
// sag/pike) and is NOT provided here — see each exercise's own scoreForm in its config's module.
// ═══════════════════════════════════════════════════════

// cfg: { angleField, angleTop, angleBottom, depthRatioFn?(bottomFrame) => number|null }
// `angleField` is the name of the exercise-specific angle sampleFn already put on each frame
// (e.g. 'kneeAngle', 'elbowAngle'). `depthRatioFn` is an optional secondary, camera-angle-robust
// depth check (squat/lunge use one based on hip-vs-knee height; push-up doesn't have an
// equivalent 2D-robust proxy and omits it).
function scoreDepth(repBuf, cfg) {
  const angles = repBuf.map((f) => f[cfg.angleField]).filter((a) => a != null);
  const minAngle = angles.length ? Math.min(...angles) : cfg.angleTop;
  const angleScore = clamp(Math.round(1 + 9 * (cfg.angleTop - minAngle) / (cfg.angleTop - cfg.angleBottom)), 1, 10);

  const bottomFrame = repBuf.reduce((min, f) => (f.trackY > min.trackY ? f : min), repBuf[0]);
  let score = angleScore;
  if (cfg.depthRatioFn) {
    const yRatio = cfg.depthRatioFn(bottomFrame);
    if (yRatio != null) {
      const yScore = clamp(Math.round(1 + 9 * clamp((yRatio + 0.5) / 1.0, 0, 1)), 1, 10);
      score = Math.round((angleScore + yScore) / 2);
    }
  }
  return { score, minAngle, bottomFrame };
}

// cfg: { stabilityUnit, holdPhase? } — stdev of the tracked point's x-position (normalized by
// scale) across the rep's hold frames if there were enough of them, else the whole rep.
function scoreLateralStability(repBuf, cfg) {
  const holdFrames = repBuf.filter((f) => f.phase === (cfg.holdPhase || 'bottom'));
  const sample = holdFrames.length >= 5 ? holdFrames : repBuf;
  const normX = sample.map((f) => f.trackX / f.scale);
  const stdevX = stddev(normX);
  return { score: clamp(Math.round(10 - stdevX / cfg.stabilityUnit), 1, 10), stdevX };
}

// cfg: { jerkUnit } — average absolute jerk (frame-to-frame change in vertical velocity of the
// tracked point, normalized by scale). Lower jerk = smoother/more controlled = higher score.
function scoreSmoothness(repBuf, cfg) {
  const vs = [];
  for (let i = 1; i < repBuf.length; i++) {
    const dt = (repBuf[i].ts - repBuf[i - 1].ts) / 1000;
    if (dt > 0) vs.push((repBuf[i].trackY - repBuf[i - 1].trackY) / dt);
  }
  const js = [];
  for (let i = 1; i < vs.length; i++) {
    const dt = (repBuf[i + 1].ts - repBuf[i].ts) / 1000;
    if (dt > 0) js.push(Math.abs(vs[i] - vs[i - 1]) / dt);
  }
  const avgAbsJerk = js.length ? js.reduce((a, b) => a + b, 0) / js.length : 0;
  const normJerk = avgAbsJerk * (repBuf[0] ? repBuf[0].scale : 1);
  return { score: clamp(Math.round(10 - normJerk / cfg.jerkUnit), 1, 10), normJerk };
}

// ═══════════════════════════════════════════════════════
// HOLD-BASED TRACKING — for static-hold exercises (plank) that have no reps at all. Continuously
// accumulates "time spent in an acceptable position" toward a target duration, plus a running
// sample of a caller-supplied alignment deviation for form/stability scoring. Deliberately NOT
// built on the rep FSM above — a hold has no descend/ascend cycle to detect, and forcing one
// through the FSM would be a worse fit than a dedicated, much simpler model.
// ═══════════════════════════════════════════════════════
function newHold() {
  return { activeMs: 0, lastTs: null, deviationSamples: [] };
}

// `deviation`: a signed alignment-deviation value the caller computes per frame from landmarks
// (e.g. verticalLineDeviation for plank's body-line check). `cfg: { tolerance }` — |deviation|
// within tolerance counts as "in position" and accrues hold time; outside it, the clock still
// runs (an imperfect hold still counts toward the duration — this isn't a rep gate) but the
// sample is recorded for the form/stability scores to reflect it. Returns { inPosition } for the
// caller's live warning UI.
function tickHold(hold, ts, deviation, cfg) {
  const inPosition = Math.abs(deviation) <= cfg.tolerance;
  if (hold.lastTs != null) hold.activeMs += Math.min(ts - hold.lastTs, 200); // cap a dropped-frame gap
  hold.lastTs = ts;
  hold.deviationSamples.push(deviation);
  if (hold.deviationSamples.length > 600) hold.deviationSamples.shift(); // cap memory for a very long hold
  return { inPosition };
}

// cfg: { formUnit, stabilityUnit } — targetMs is the exercise config's target hold duration.
// `avgDev` (signed, unlike avgAbsDev) lets a caller tell which DIRECTION the deviation tended —
// e.g. plank's summary feedback uses its sign to say "sagging" vs. "too high" specifically,
// rather than just "form was off."
function scoreHold(hold, targetMs, cfg) {
  const holdScore = clamp(Math.round(10 * clamp(hold.activeMs / targetMs, 0, 1)), 1, 10);
  const samples = hold.deviationSamples;
  const avgDev = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
  const avgAbsDev = samples.length ? samples.reduce((a, b) => a + Math.abs(b), 0) / samples.length : 0;
  const formScore = clamp(Math.round(10 - avgAbsDev / cfg.formUnit), 1, 10);
  const stabilityScore = clamp(Math.round(10 - stddev(samples) / cfg.stabilityUnit), 1, 10);
  const overall = Math.round(((holdScore + formScore + stabilityScore) / 3) * 10) / 10;
  return { holdScore, formScore, stabilityScore, overall, activeMs: hold.activeMs, avgAbsDev, avgDev };
}

// ═══════════════════════════════════════════════════════
// CAMERA + POSE LIFECYCLE — one shared MediaPipe Pose instance, reused across an entire session
// (critical for daily-routine.js, which moves through several exercises back-to-back: creating a
// fresh Pose instance per exercise would mean re-loading the WASM model up to 8 times in one
// routine). squat-coach.js, with only one exercise, benefits less but uses the same path for
// consistency and so a future addition doesn't need to special-case it.
// ═══════════════════════════════════════════════════════
let _pose = null;
function ensurePose(onResults) {
  if (_pose) { _pose.onResults(onResults); return _pose; }
  _pose = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
  _pose.setOptions({
    modelComplexity: 1,       // 0 lite / 1 full / 2 heavy — drop to 0 if real-device FPS is poor
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  _pose.onResults(onResults);
  return _pose;
}

let _mediaStream = null;
async function startCameraStream(videoEl, facingMode) {
  _mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
    audio: false,
  });
  videoEl.srcObject = _mediaStream;
  await videoEl.play();
}

function stopCameraStream() {
  try { if (_mediaStream) _mediaStream.getTracks().forEach((t) => t.stop()); } catch {}
  _mediaStream = null;
}

let _rafId = null, _frameBusy = false;
// `isActiveFn()` is polled each frame so the loop stops itself the moment the caller's own
// "still running" flag goes false, without the caller needing to track/cancel the rAF handle.
function startFrameLoop(pose, videoEl, isActiveFn) {
  _frameBusy = false;
  function loop() {
    if (!isActiveFn()) { _rafId = null; return; }
    if (!_frameBusy && videoEl && videoEl.readyState >= 2) {
      _frameBusy = true;
      pose.send({ image: videoEl }).catch(() => {}).finally(() => { _frameBusy = false; });
    }
    _rafId = requestAnimationFrame(loop);
  }
  _rafId = requestAnimationFrame(loop);
}

function stopFrameLoop() { if (_rafId) cancelAnimationFrame(_rafId); _rafId = null; }

// Draws the pose skeleton onto `canvasEl` (assumed already sized to the video's native
// resolution — see each caller's `loadedmetadata` handler). Clears the canvas first, so it's safe
// to call every frame including when `lm` is falsy (clears without drawing).
function drawSkeleton(ctx, canvasEl, lm, connectorColor, landmarkColor) {
  if (!ctx || !canvasEl.width) return;
  ctx.save();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (lm) {
    drawConnectors(ctx, lm, POSE_CONNECTIONS, { color: connectorColor, lineWidth: 3 });
    drawLandmarks(ctx, lm, { color: landmarkColor, lineWidth: 1, radius: 3 });
  }
  ctx.restore();
}
