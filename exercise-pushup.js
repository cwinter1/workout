// ═══════════════════════════════════════════════════════
// PUSH-UP — exercise-specific config + scoring, on top of form-coach-engine.js's generic
// machinery. Loaded by daily-routine.html. Requires form-coach-engine.js loaded first.
// See memory/form_coach.md.
// ═══════════════════════════════════════════════════════
const PUSHUP_LEFT = [LM.LSHO, LM.LELB, LM.LWRI, LM.LHIP, LM.LANK];
const PUSHUP_RIGHT = [LM.RSHO, LM.RELB, LM.RWRI, LM.RHIP, LM.RANK];

const PUSHUP_EXERCISE = {
  name: 'Push-Up',
  angleField: 'elbowAngle',
  angleTop: 165,           // elbow angle (degrees) treated as "locked out"
  angleBottom: 75,         // elbow angle treated as full depth
  stabilityUnit: 0.02,
  jerkUnit: 4,
  bodyLineThreshold: 0.12, // shoulder-widths of vertical deviation from the shoulder-ankle line
  positiveLines: ['Clean rep.', 'Solid rep. No flags.', 'Full range. Controlled.', 'Consistent rep.'],
  issueLines: {
    rom: 'Lower your chest closer to the ground.',
    sag: 'Hips are sagging — brace your core, keep a straight line.',
    pike: 'Hips are too high — lower them into a straight line.',
    stability: 'Steady your base — brace your core.',
    speed: 'Slow down — control the lowering phase.',
    form: 'Focus on keeping a straight line from shoulders to ankles.',
  },
};

function pushupWorkingLandmarks(lm, side) {
  if (side !== 'both') {
    const s = side === 'left'
      ? { sho: LM.LSHO, elb: LM.LELB, wri: LM.LWRI, hip: LM.LHIP, ank: LM.LANK }
      : { sho: LM.RSHO, elb: LM.RELB, wri: LM.RWRI, hip: LM.RHIP, ank: LM.RANK };
    return { shoulder: lm[s.sho], elbow: lm[s.elb], wrist: lm[s.wri], hip: lm[s.hip], ankle: lm[s.ank] };
  }
  return {
    shoulder: midpoint(lm[LM.LSHO], lm[LM.RSHO]), elbow: midpoint(lm[LM.LELB], lm[LM.RELB]),
    wrist: midpoint(lm[LM.LWRI], lm[LM.RWRI]), hip: midpoint(lm[LM.LHIP], lm[LM.RHIP]),
    ankle: midpoint(lm[LM.LANK], lm[LM.RANK]),
  };
}

// Positive = hips sagging (below the shoulder-ankle line); negative = hips piking up.
function pushupBodyLineDeviation(working, scale) {
  return verticalLineDeviation(working.shoulder, working.ankle, working.hip, scale);
}

// Push-up's trackFn for the engine's rep FSM — the chest/shoulder line moving down toward the
// floor and back up, analogous to hip-center for squat/lunge.
function pushupTrackPoint(lm) { return shoulderCenterOf(lm); }

function pushupFrameSample(lm, ts, trackPt, scale) {
  const side = pickWorkingSide(lm, PUSHUP_LEFT, PUSHUP_RIGHT);
  const working = pushupWorkingLandmarks(lm, side);
  return {
    elbowAngle: angleAt(working.shoulder, working.elbow, working.wrist),
    working,
    bodyLineDev: pushupBodyLineDeviation(working, scale),
  };
}

function pushupScoreForm(repBuf) {
  const cfg = PUSHUP_EXERCISE;
  const midFrames = repBuf.filter((f) => f.phase !== null);
  let sagFlagged = false, pikeFlagged = false, maxAbsDev = 0;
  if (midFrames.length) {
    let sagCount = 0, pikeCount = 0;
    midFrames.forEach((f) => {
      if (Math.abs(f.bodyLineDev) > maxAbsDev) maxAbsDev = Math.abs(f.bodyLineDev);
      if (f.bodyLineDev > cfg.bodyLineThreshold) sagCount++;
      else if (f.bodyLineDev < -cfg.bodyLineThreshold) pikeCount++;
    });
    sagFlagged = sagCount >= 3;
    pikeFlagged = pikeCount >= 3;
  }
  let score = 10;
  if (sagFlagged || pikeFlagged) score -= 4;
  return { score: clamp(score, 1, 10), sagFlagged, pikeFlagged, maxAbsDev };
}

function pushupLiveFrameCheck(lm, fsmPhase) {
  const cfg = PUSHUP_EXERCISE;
  const side = pickWorkingSide(lm, PUSHUP_LEFT, PUSHUP_RIGHT);
  const working = pushupWorkingLandmarks(lm, side);
  const scale = shoulderWidthOf(lm) || 1e-6;
  const dev = pushupBodyLineDeviation(working, scale);
  if (dev > cfg.bodyLineThreshold) return cfg.issueLines.sag;
  if (dev < -cfg.bodyLineThreshold) return cfg.issueLines.pike;
  if (fsmPhase === 'bottom') {
    const angle = angleAt(working.shoulder, working.elbow, working.wrist);
    if (angle != null && angle > cfg.angleBottom + 25) return cfg.issueLines.rom;
  }
  return null;
}

function pushupRepFeedback(r) {
  const cfg = PUSHUP_EXERCISE;
  const issues = [];
  if (r.rom.score <= 4) issues.push(cfg.issueLines.rom);
  if (r.form.sagFlagged) issues.push(cfg.issueLines.sag);
  if (r.form.pikeFlagged) issues.push(cfg.issueLines.pike);
  if (r.stability.score <= 4) issues.push(cfg.issueLines.stability);
  if (r.speed.score <= 4) issues.push(cfg.issueLines.speed);
  if (!issues.length) return { text: cfg.positiveLines[Math.floor(Math.random() * cfg.positiveLines.length)], warn: false };
  return { text: issues.slice(0, 2).join(' '), warn: true };
}

// No depthRatioFn — push-up has no reliable 2D-camera-angle-robust secondary depth check the way
// squat's hip-vs-knee height comparison is (a push-up's "depth" reads very differently from the
// side vs. head-on, with no simple robust proxy), so ROM scoring here is angle-only.
function pushupScoreRep(repBuf) {
  const cfg = PUSHUP_EXERCISE;
  const rom = scoreDepth(repBuf, cfg);
  const stability = scoreLateralStability(repBuf, cfg);
  const speed = scoreSmoothness(repBuf, cfg);
  const form = pushupScoreForm(repBuf);
  const overall = Math.round(((rom.score + stability.score + speed.score + form.score) / 4) * 10) / 10;
  const rep = { ts: repBuf[repBuf.length - 1].ts, rom, stability, speed, form, overall };
  const fb = pushupRepFeedback(rep);
  rep.feedback = fb.text;
  rep.hasIssue = fb.warn;
  return rep;
}
