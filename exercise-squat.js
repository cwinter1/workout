// ═══════════════════════════════════════════════════════
// SQUAT — exercise-specific config + scoring, on top of form-coach-engine.js's generic machinery.
// Loaded by both squat-coach.html (standalone) and daily-routine.html (as one of 4 exercises in
// the sequenced routine). Requires form-coach-engine.js loaded first. See memory/form_coach.md.
// ═══════════════════════════════════════════════════════
const SQUAT_EXERCISE = {
  name: 'Squat',
  angleField: 'kneeAngle',
  angleTop: 170,          // knee angle (degrees) treated as "standing"
  angleBottom: 80,        // knee angle treated as full depth
  stabilityUnit: 0.02,    // 1 point lost per this many shoulder-widths of hip-x stdev
  jerkUnit: 4,            // most speculative constant in the system — calibrate against real reps
  valgusThreshold: 0.06,  // normalized inward-knee-deviation threshold (shoulder-widths)
  leanThreshold: 45,      // degrees from vertical, torso lean flag
  positiveLines: ['Clean rep.', 'Solid rep. No flags.', 'Good depth. Controlled.', 'Consistent rep.'],
  // Corrective copy, not just diagnosis — "what to do about it," not only "what went wrong."
  // Single source of truth used by both the live in-rep warning and the post-rep feedback line.
  issueLines: {
    rom: 'Go lower — aim for thighs parallel to the ground.',
    valgus: 'Knees caving in — push them out over your toes.',
    lean: 'Leaning forward — keep your chest up.',
    stability: 'Steady the bottom — brace your core.',
    speed: 'Slow down — control the descent.',
    form: 'Focus on knee alignment and torso lean next set.', // summary-level catch-all for form
  },
  // Secondary, camera-angle-robust depth check (hip vs. knee height at the bottom frame) — see
  // scoreDepth in form-coach-engine.js for how this combines with the angle-based score.
  depthRatioFn(bottomFrame) {
    return (bottomFrame.working.hip.y - bottomFrame.working.knee.y) / bottomFrame.scale;
  },
};

// Squat's own {shoulder,hip,knee,ankle} working-set shape — a push-up's differs (shoulder/elbow/
// wrist/hip/ankle), so this stays local rather than becoming a forced-generic engine shape.
function squatWorkingLandmarks(lm, side) {
  if (side !== 'both') {
    const s = side === 'left'
      ? { sho: LM.LSHO, hip: LM.LHIP, knee: LM.LKNEE, ank: LM.LANK }
      : { sho: LM.RSHO, hip: LM.RHIP, knee: LM.RKNEE, ank: LM.RANK };
    return { shoulder: lm[s.sho], hip: lm[s.hip], knee: lm[s.knee], ankle: lm[s.ank] };
  }
  return {
    shoulder: midpoint(lm[LM.LSHO], lm[LM.RSHO]), hip: midpoint(lm[LM.LHIP], lm[LM.RHIP]),
    knee: midpoint(lm[LM.LKNEE], lm[LM.RKNEE]), ankle: midpoint(lm[LM.LANK], lm[LM.RANK]),
  };
}

// Squat's sampleFn passed to the engine's tickFsm. Only the squat-specific extra fields; the
// engine already fills in {ts, trackX, trackY, scale, phase}.
function squatFrameSample(lm, ts, trackPt, scale) {
  const side = pickWorkingSide(lm, LEFT_LEG, RIGHT_LEG);
  const working = squatWorkingLandmarks(lm, side);
  return {
    kneeAngle: angleAt(working.hip, working.knee, working.ankle),
    working,
    bothVisible: bothSidesVisible(lm, LEFT_LEG, RIGHT_LEG),
    lHip: lm[LM.LHIP], rHip: lm[LM.RHIP], lKnee: lm[LM.LKNEE], rKnee: lm[LM.RKNEE],
    lAnk: lm[LM.LANK], rAnk: lm[LM.RANK],
  };
}

// Every function below references SQUAT_EXERCISE directly rather than taking it as a `cfg`
// parameter — there's only ever one squat config, and a parameter here just creates a chance to
// pass the wrong (or no) config by accident. Only the generic engine functions (scoreDepth,
// scoreLateralStability, scoreSmoothness) take cfg explicitly, since those genuinely serve any
// exercise. Matches exercise-pushup.js/exercise-lunge.js's pattern.
function squatScoreForm(repBuf, bottomFrame) {
  const cfg = SQUAT_EXERCISE;
  const midFrames = repBuf.filter((f) => f.bothVisible && f.phase !== null);
  let valgusFlagged = false;
  let maxOffset = 0;
  if (midFrames.length) {
    let flaggedCount = 0;
    midFrames.forEach((f) => {
      const midlineX = (f.lAnk.x + f.rAnk.x) / 2;
      const offL = jointInwardOffset(f.lHip, f.lKnee, f.lAnk, midlineX, f.scale);
      const offR = jointInwardOffset(f.rHip, f.rKnee, f.rAnk, midlineX, f.scale);
      const off = Math.max(offL, offR);
      if (off > maxOffset) maxOffset = off;
      if (off > cfg.valgusThreshold) flaggedCount++;
    });
    valgusFlagged = flaggedCount >= 3;
  }

  // Forward-lean proxy at the deepest frame only. 2D landmarks cannot see the spine — this
  // measures torso angle from vertical, nothing more. Feedback copy must say "leaning forward,"
  // never "back rounding"/"arching."
  const torso = {
    x: bottomFrame.working.shoulder.x - bottomFrame.working.hip.x,
    y: bottomFrame.working.shoulder.y - bottomFrame.working.hip.y,
  };
  const torsoLen = Math.hypot(torso.x, torso.y);
  const leanDeg = torsoLen < 1e-6 ? 0 : Math.acos(clamp(-torso.y / torsoLen, -1, 1)) * 180 / Math.PI;
  const leanFlagged = leanDeg > cfg.leanThreshold;

  let score = 10;
  if (valgusFlagged) score -= 3;
  if (leanFlagged) score -= 3;
  return { score: clamp(score, 1, 10), valgusFlagged, leanFlagged, leanDeg, maxOffset };
}

// Live, per-frame corrective check while a rep is actively in progress (fsmPhase !== 'standing').
// Deliberately more reactive/noisier than the debounced per-rep checks above (single-frame
// threshold, no multi-frame debounce) — acceptable for a live indicator, where a brief flicker
// costs far less than the rep-scoring FSM's false transitions would.
function squatLiveFrameCheck(lm, fsmPhase) {
  const cfg = SQUAT_EXERCISE;
  const side = pickWorkingSide(lm, LEFT_LEG, RIGHT_LEG);
  const working = squatWorkingLandmarks(lm, side);

  if (bothSidesVisible(lm, LEFT_LEG, RIGHT_LEG)) {
    const midlineX = (lm[LM.LANK].x + lm[LM.RANK].x) / 2;
    const scale = shoulderWidthOf(lm) || 1e-6;
    const offL = jointInwardOffset(lm[LM.LHIP], lm[LM.LKNEE], lm[LM.LANK], midlineX, scale);
    const offR = jointInwardOffset(lm[LM.RHIP], lm[LM.RKNEE], lm[LM.RANK], midlineX, scale);
    if (Math.max(offL, offR) > cfg.valgusThreshold) return cfg.issueLines.valgus;
  }

  const torso = { x: working.shoulder.x - working.hip.x, y: working.shoulder.y - working.hip.y };
  const torsoLen = Math.hypot(torso.x, torso.y);
  const leanDeg = torsoLen < 1e-6 ? 0 : Math.acos(clamp(-torso.y / torsoLen, -1, 1)) * 180 / Math.PI;
  if (leanDeg > cfg.leanThreshold) return cfg.issueLines.lean;

  if (fsmPhase === 'bottom') {
    const kneeAngle = angleAt(working.hip, working.knee, working.ankle);
    if (kneeAngle != null && kneeAngle > cfg.angleBottom + 25) return cfg.issueLines.rom;
  }

  return null;
}

// Returns { text, warn } — warn=true means at least one issue was flagged, which callers use to
// decide whether to color the feedback text WARN_COLOR (red) or the neutral sub color.
function squatRepFeedback(r) {
  const cfg = SQUAT_EXERCISE;
  const issues = [];
  if (r.rom.score <= 4) issues.push(cfg.issueLines.rom);
  if (r.form.valgusFlagged) issues.push(cfg.issueLines.valgus);
  if (r.form.leanFlagged) issues.push(cfg.issueLines.lean);
  if (r.stability.score <= 4) issues.push(cfg.issueLines.stability);
  if (r.speed.score <= 4) issues.push(cfg.issueLines.speed);
  if (!issues.length) return { text: cfg.positiveLines[Math.floor(Math.random() * cfg.positiveLines.length)], warn: false };
  return { text: issues.slice(0, 2).join(' '), warn: true };
}

// Scores one completed rep's frame buffer end-to-end.
function squatScoreRep(repBuf) {
  const cfg = SQUAT_EXERCISE;
  const rom = scoreDepth(repBuf, cfg);
  const stability = scoreLateralStability(repBuf, cfg);
  const speed = scoreSmoothness(repBuf, cfg);
  const form = squatScoreForm(repBuf, rom.bottomFrame);
  const overall = Math.round(((rom.score + stability.score + speed.score + form.score) / 4) * 10) / 10;
  const rep = { ts: repBuf[repBuf.length - 1].ts, rom, stability, speed, form, overall };
  const fb = squatRepFeedback(rep);
  rep.feedback = fb.text;
  rep.hasIssue = fb.warn;
  return rep;
}

function squatSummaryFeedback(avgs) {
  const cfg = SQUAT_EXERCISE;
  const dims = [
    ['rom', avgs.rom], ['stability', avgs.stability], ['speed', avgs.speed], ['form', avgs.form],
  ];
  dims.sort((a, b) => a[1] - b[1]);
  const lines = [];
  if (avgs.overall >= 7) lines.push('Consistent set.');
  if (dims[0][1] < 7) lines.push(cfg.issueLines[dims[0][0]]);
  if (!lines.length) lines.push('Set logged.');
  return lines.join(' ');
}
