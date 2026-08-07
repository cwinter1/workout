// ═══════════════════════════════════════════════════════
// LUNGE — exercise-specific config + scoring, on top of form-coach-engine.js's generic machinery.
// Loaded by daily-routine.html. Requires form-coach-engine.js loaded first.
//
// Unlike squat/push-up, a lunge's "depth" joint isn't a fixed side — it's whichever leg is
// currently the FRONT (more bent) leg, which alternates rep to rep. Every frame, both legs' knee
// angles are computed and the more-bent one is treated as "front" for that frame — see
// lungeFrameSample below. Rep counting itself still uses the generic hip-center FSM (a lunge's
// overall body still dips vertically like a squat, just on a split stance), so reps count
// regardless of which leg is forward — matching the routine's "20 total" spec rather than
// tracking each side separately.
// See memory/form_coach.md.
// ═══════════════════════════════════════════════════════
const LUNGE_EXERCISE = {
  name: 'Lunge',
  angleField: 'frontKneeAngle',
  angleTop: 165,
  angleBottom: 85,
  stabilityUnit: 0.025,
  jerkUnit: 4,
  kneeOverToeThreshold: 0.12, // shoulder-widths the front knee may extend past the front ankle
  positiveLines: ['Clean rep.', 'Good depth. Balanced.', 'Solid rep. No flags.', 'Consistent rep.'],
  issueLines: {
    rom: 'Drop your back knee closer to the ground.',
    kneeOverToe: 'Front knee is going past your toes — sit back more.',
    stability: 'Steady your balance — brace your core.',
    speed: 'Slow down — control the descent.',
    form: 'Focus on front-knee position and balance next set.',
  },
  depthRatioFn(bottomFrame) {
    const f = bottomFrame.front;
    if (!f) return null;
    return (f.hip.y - f.knee.y) / bottomFrame.scale;
  },
};

// Picks the more-bent leg (smaller knee angle) as "front" this frame. Falls back to whichever
// side has a valid angle if the other is degenerate (e.g. a landmark pair collapsed to ~0 length).
function lungeFrontLeg(lm) {
  const leftAngle = angleAt(lm[LM.LHIP], lm[LM.LKNEE], lm[LM.LANK]);
  const rightAngle = angleAt(lm[LM.RHIP], lm[LM.RKNEE], lm[LM.RANK]);
  let side;
  if (leftAngle == null) side = 'right';
  else if (rightAngle == null) side = 'left';
  else side = leftAngle <= rightAngle ? 'left' : 'right';
  const front = side === 'left'
    ? { hip: lm[LM.LHIP], knee: lm[LM.LKNEE], ankle: lm[LM.LANK] }
    : { hip: lm[LM.RHIP], knee: lm[LM.RKNEE], ankle: lm[LM.RANK] };
  return { side, front, angle: side === 'left' ? leftAngle : rightAngle };
}

function lungeFrameSample(lm) {
  const { side, front, angle } = lungeFrontLeg(lm);
  return { frontKneeAngle: angle, frontSide: side, front };
}

// How far the front knee has traveled past the front ankle (toward the direction the leg is
// stepping), normalized by scale. Positive = past the toe. Derived from the hip->ankle direction
// so it works regardless of which physical side of the frame the front leg is on: stanceDir is
// the direction FROM the hip TO the ankle (i.e. "forward"); the knee is "past the toe" once it's
// gone further in that same direction than the ankle itself.
function lungeKneeOverToeOffset(front, scale) {
  const stanceDir = Math.sign(front.ankle.x - front.hip.x) || 1;
  return ((front.knee.x - front.ankle.x) * stanceDir) / (scale || 1e-6);
}

function lungeScoreForm(bottomFrame) {
  const cfg = LUNGE_EXERCISE;
  const f = bottomFrame.front;
  const overToe = f ? lungeKneeOverToeOffset(f, bottomFrame.scale) : 0;
  const kneeOverToeFlagged = overToe > cfg.kneeOverToeThreshold;
  return { score: clamp(kneeOverToeFlagged ? 6 : 10, 1, 10), kneeOverToeFlagged, overToe };
}

function lungeLiveFrameCheck(lm, fsmPhase) {
  const cfg = LUNGE_EXERCISE;
  const { front, angle } = lungeFrontLeg(lm);
  const scale = shoulderWidthOf(lm) || 1e-6;
  const overToe = lungeKneeOverToeOffset(front, scale);
  if (overToe > cfg.kneeOverToeThreshold) return cfg.issueLines.kneeOverToe;
  if (fsmPhase === 'bottom' && angle != null && angle > cfg.angleBottom + 25) return cfg.issueLines.rom;
  return null;
}

function lungeRepFeedback(r) {
  const cfg = LUNGE_EXERCISE;
  const issues = [];
  if (r.rom.score <= 4) issues.push(cfg.issueLines.rom);
  if (r.form.kneeOverToeFlagged) issues.push(cfg.issueLines.kneeOverToe);
  if (r.stability.score <= 4) issues.push(cfg.issueLines.stability);
  if (r.speed.score <= 4) issues.push(cfg.issueLines.speed);
  if (!issues.length) return { text: cfg.positiveLines[Math.floor(Math.random() * cfg.positiveLines.length)], warn: false };
  return { text: issues.slice(0, 2).join(' '), warn: true };
}

function lungeScoreRep(repBuf) {
  const cfg = LUNGE_EXERCISE;
  const rom = scoreDepth(repBuf, cfg);
  const stability = scoreLateralStability(repBuf, cfg);
  const speed = scoreSmoothness(repBuf, cfg);
  const form = lungeScoreForm(rom.bottomFrame);
  const overall = Math.round(((rom.score + stability.score + speed.score + form.score) / 4) * 10) / 10;
  const rep = { ts: repBuf[repBuf.length - 1].ts, rom, stability, speed, form, overall };
  const fb = lungeRepFeedback(rep);
  rep.feedback = fb.text;
  rep.hasIssue = fb.warn;
  return rep;
}
