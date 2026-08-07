// ═══════════════════════════════════════════════════════
// PLANK — exercise-specific config + scoring, on top of form-coach-engine.js's generic machinery.
// Loaded by daily-routine.html. Requires form-coach-engine.js loaded first.
//
// Fundamentally different from the other 3 exercises: a plank has no reps at all, so this does
// NOT use the engine's rep FSM (newFsm/tickFsm) — it uses the engine's separate hold-tracker
// (newHold/tickHold/scoreHold) instead. Scoring is 3 dimensions, not 4 — Hold (did you sustain
// the target duration), Stability (how much the body-line deviation varied), Form (how far off
// the line on average) — there's no meaningful "Speed" for a static hold, and this config
// deliberately doesn't fabricate one. See memory/form_coach.md.
// ═══════════════════════════════════════════════════════
const PLANK_LEFT = [LM.LSHO, LM.LHIP, LM.LANK];
const PLANK_RIGHT = [LM.RSHO, LM.RHIP, LM.RANK];

const PLANK_EXERCISE = {
  name: 'Plank',
  holdBased: true,
  tolerance: 0.09,   // shoulder-widths of vertical deviation from the shoulder-ankle line
  formUnit: 0.06,
  stabilityUnit: 0.03,
  positiveLines: ['Solid hold.', 'Good line. Stay steady.', 'Clean hold.'],
  issueLines: {
    sag: 'Hips are sagging — lift them, brace your core.',
    pike: 'Hips are too high — lower into a straight line.',
  },
};

function plankWorkingLandmarks(lm, side) {
  if (side !== 'both') {
    const s = side === 'left' ? { sho: LM.LSHO, hip: LM.LHIP, ank: LM.LANK } : { sho: LM.RSHO, hip: LM.RHIP, ank: LM.RANK };
    return { shoulder: lm[s.sho], hip: lm[s.hip], ankle: lm[s.ank] };
  }
  return { shoulder: midpoint(lm[LM.LSHO], lm[LM.RSHO]), hip: midpoint(lm[LM.LHIP], lm[LM.RHIP]), ankle: midpoint(lm[LM.LANK], lm[LM.RANK]) };
}

// Positive = hips sagging (below the shoulder-ankle line); negative = hips piking up.
function plankDeviationOf(lm) {
  const side = pickWorkingSide(lm, PLANK_LEFT, PLANK_RIGHT);
  const working = plankWorkingLandmarks(lm, side);
  const scale = shoulderWidthOf(lm) || 1e-6;
  return verticalLineDeviation(working.shoulder, working.ankle, working.hip, scale);
}

// Advances a plank hold by one frame. Returns { inPosition } for the caller's live-warning UI.
function plankTick(hold, lm, ts) {
  const dev = plankDeviationOf(lm);
  return tickHold(hold, ts, dev, PLANK_EXERCISE);
}

function plankLiveFrameCheck(lm) {
  const cfg = PLANK_EXERCISE;
  const dev = plankDeviationOf(lm);
  if (dev > cfg.tolerance) return cfg.issueLines.sag;
  if (dev < -cfg.tolerance) return cfg.issueLines.pike;
  return null;
}

// scoreResult: the object returned by the engine's scoreHold(hold, targetMs, PLANK_EXERCISE).
function plankFeedback(scoreResult) {
  const cfg = PLANK_EXERCISE;
  const lines = [];
  if (scoreResult.holdScore < 6) lines.push(`Held ${Math.round(scoreResult.activeMs / 1000)}s. Try to hold the full time next set.`);
  if (Math.abs(scoreResult.avgDev) > cfg.formUnit) lines.push(scoreResult.avgDev > 0 ? cfg.issueLines.sag : cfg.issueLines.pike);
  if (!lines.length) return { text: cfg.positiveLines[Math.floor(Math.random() * cfg.positiveLines.length)], warn: false };
  return { text: lines.slice(0, 2).join(' '), warn: true };
}
