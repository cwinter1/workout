// ═══════════════════════════════════════════════════════
// SQUAT FORM COACH — Phase 1 MVP
// Fully self-contained mini-app: own state, own render(). Loads shared.js only for generic
// utilities (T, el, icons, beep, wake lock, fmt) — never touches the timer/session engine
// (startSession/renderPreview/etc.) or its localStorage keys (mf.progress/mf.sessions/...).
// IN-MEMORY ONLY. No localStorage key of any kind is written by this file, by design (Phase 1
// spec explicitly excludes persistence) — do not "fix" that without being asked.
// See memory/squat_coach.md for the full set of decisions and tunable constants.
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// EXERCISE CONFIG — squat is the only exercise today, but this object isolates every
// squat-specific number/threshold from the generic camera/pose/FSM plumbing above it, so a
// second calisthenics exercise (push-up, etc.) can plug in later as its own config rather than
// a rewrite. Anchor numbers below are first-pass estimates for an untrained phone-camera setup,
// not physiologically precise — recalibrate against real reps via the ?debug=1 overlay.
// ═══════════════════════════════════════════════════════
const SQUAT_EXERCISE = {
  name: 'Squat',
  romAngleTop: 170,      // knee angle (degrees) treated as "standing"
  romAngleBottom: 80,    // knee angle treated as full depth
  stabilityUnit: 0.02,   // 1 point lost per this many shoulder-widths of hip-x stdev
  jerkUnit: 4,           // most speculative constant in the system — calibrate against real reps
  valgusThreshold: 0.06, // normalized inward-knee-deviation threshold (shoulder-widths)
  leanThreshold: 45,     // degrees from vertical, torso lean flag
  positiveLines: ['Clean rep.', 'Solid rep. No flags.', 'Good depth. Controlled.', 'Consistent rep.'],
};

// ═══════════════════════════════════════════════════════
// PURE MATH HELPERS — no DOM, no globals besides Math. Kept standalone and side-effect-free so
// tests/squat-coach-flow.html can inline and exercise them directly.
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

// How far a knee has moved toward the hip-ankle midline, relative to the straight hip->ankle
// line at the knee's height, normalized by shoulder width. Positive = inward (valgus-direction).
// Orientation-agnostic: works the same whether the camera image is mirrored or not, since the
// "inward" direction is derived from where the ankle midline actually falls, not an assumed
// screen side.
function kneeInwardOffset(hip, knee, ankle, midlineX, shoW) {
  const t = tAtY(hip, ankle, knee.y);
  const predX = lerp(hip.x, ankle.x, t);
  const dir = Math.sign(midlineX - predX) || 1;
  return ((knee.x - predX) * dir) / (shoW || 1e-6);
}

// ═══════════════════════════════════════════════════════
// LANDMARK HELPERS — MediaPipe Pose's 33-point layout. Relevant indices: shoulders 11/12,
// hips 23/24, knees 25/26, ankles 27/28.
// ═══════════════════════════════════════════════════════
const LM = { LSHO: 11, RSHO: 12, LHIP: 23, RHIP: 24, LKNEE: 25, RKNEE: 26, LANK: 27, RANK: 28 };
const VIS_MIN = 0.6;

function hipCenterOf(lm) { return { x: (lm[LM.LHIP].x + lm[LM.RHIP].x) / 2, y: (lm[LM.LHIP].y + lm[LM.RHIP].y) / 2 }; }
function shoulderWidthOf(lm) { return Math.hypot(lm[LM.LSHO].x - lm[LM.RSHO].x, lm[LM.LSHO].y - lm[LM.RSHO].y); }

// Which side (or both) to trust for angle/lean math this frame, based on visibility confidence.
function pickWorkingSide(lm) {
  const leftVis = (lm[LM.LHIP].visibility + lm[LM.LKNEE].visibility + lm[LM.LANK].visibility) / 3;
  const rightVis = (lm[LM.RHIP].visibility + lm[LM.RKNEE].visibility + lm[LM.RANK].visibility) / 3;
  if (leftVis > VIS_MIN && rightVis > VIS_MIN && Math.abs(leftVis - rightVis) < 0.15) return 'both';
  return leftVis >= rightVis ? 'left' : 'right';
}

function workingLandmarks(lm, side) {
  if (side !== 'both') {
    const s = side === 'left'
      ? { sho: LM.LSHO, hip: LM.LHIP, knee: LM.LKNEE, ank: LM.LANK }
      : { sho: LM.RSHO, hip: LM.RHIP, knee: LM.RKNEE, ank: LM.RANK };
    return { shoulder: lm[s.sho], hip: lm[s.hip], knee: lm[s.knee], ankle: lm[s.ank] };
  }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility, b.visibility) });
  return {
    shoulder: mid(lm[LM.LSHO], lm[LM.RSHO]), hip: mid(lm[LM.LHIP], lm[LM.RHIP]),
    knee: mid(lm[LM.LKNEE], lm[LM.RKNEE]), ankle: mid(lm[LM.LANK], lm[LM.RANK]),
  };
}

function bothLegsVisible(lm) {
  return lm[LM.LHIP].visibility > VIS_MIN && lm[LM.RHIP].visibility > VIS_MIN &&
         lm[LM.LKNEE].visibility > VIS_MIN && lm[LM.RKNEE].visibility > VIS_MIN &&
         lm[LM.LANK].visibility > VIS_MIN && lm[LM.RANK].visibility > VIS_MIN;
}

// ═══════════════════════════════════════════════════════
// REP DETECTION STATE MACHINE — standing -> descending -> bottom -> ascending -> standing.
// Debounced (multi-consecutive-frame) transitions over a smoothed hip-center y trajectory, so
// single-frame landmark jitter never flips the phase. Pure function of (lm, ts) plus a mutable
// `fsm` object the caller owns — kept this way (not module-level closures) so
// tests/squat-coach-flow.html can construct a fresh `fsm` per test case.
// ═══════════════════════════════════════════════════════
const DEBOUNCE_FRAMES = 4;
const BOTTOM_DEBOUNCE_FRAMES = 3;
const REP_ABANDON_MS = 8000;
const MIN_REP_MS = 300;

function newFsm() {
  return {
    fsmState: 'standing', debounceCount: 0,
    hipYHist: [], prevSmoothedY: null, topBaselineY: null,
    repBuf: [], repStartMs: 0,
  };
}

function frameSample(lm, side, working, kneeAngle, ts, hipC, shoW) {
  return {
    ts, hipX: hipC.x, hipY: hipC.y, shoW, kneeAngle, working,
    bothVisible: bothLegsVisible(lm),
    lHip: lm[LM.LHIP], rHip: lm[LM.RHIP], lKnee: lm[LM.LKNEE], rKnee: lm[LM.RKNEE],
    lAnk: lm[LM.LANK], rAnk: lm[LM.RANK],
    phase: null, // filled in by tickFsm after the transition for this frame is decided
  };
}

// Advances `fsm` by one frame. Returns a completed rep's frame buffer (array), or null if no
// rep completed this frame. Caller is responsible for scoring the returned buffer.
function tickFsm(fsm, lm, ts) {
  const side = pickWorkingSide(lm);
  const working = workingLandmarks(lm, side);
  const kneeAngle = angleAt(working.hip, working.knee, working.ankle);
  const hipC = hipCenterOf(lm);
  const shoW = shoulderWidthOf(lm) || 1e-6;

  fsm.hipYHist.push(hipC.y);
  if (fsm.hipYHist.length > 5) fsm.hipYHist.shift();
  const smoothedY = fsm.hipYHist.reduce((a, b) => a + b, 0) / fsm.hipYHist.length;
  const velocity = fsm.prevSmoothedY == null ? 0 : smoothedY - fsm.prevSmoothedY; // + = moving down
  fsm.prevSmoothedY = smoothedY;
  if (fsm.topBaselineY == null) fsm.topBaselineY = smoothedY;

  const DESCEND_DELTA = 0.4 * shoW;
  const RETURN_DELTA = 0.3 * shoW;

  const sample = frameSample(lm, side, working, kneeAngle, ts, hipC, shoW);
  let completed = null;

  if (fsm.fsmState === 'standing') {
    fsm.topBaselineY += (smoothedY - fsm.topBaselineY) * 0.05; // slow EMA — self-calibrates to stance/distance
    if (smoothedY - fsm.topBaselineY > DESCEND_DELTA) {
      if (++fsm.debounceCount >= DEBOUNCE_FRAMES) {
        fsm.fsmState = 'descending'; fsm.debounceCount = 0; fsm.repBuf = []; fsm.repStartMs = ts;
      }
    } else fsm.debounceCount = 0;
  } else if (fsm.fsmState === 'descending') {
    sample.phase = 'descending'; fsm.repBuf.push(sample);
    if (velocity <= 0) { if (++fsm.debounceCount >= BOTTOM_DEBOUNCE_FRAMES) { fsm.fsmState = 'bottom'; fsm.debounceCount = 0; } }
    else fsm.debounceCount = 0;
    if (ts - fsm.repStartMs > REP_ABANDON_MS) { fsm.fsmState = 'standing'; fsm.debounceCount = 0; fsm.repBuf = []; }
  } else if (fsm.fsmState === 'bottom') {
    sample.phase = 'bottom'; fsm.repBuf.push(sample);
    if (velocity < 0) { if (++fsm.debounceCount >= BOTTOM_DEBOUNCE_FRAMES) { fsm.fsmState = 'ascending'; fsm.debounceCount = 0; } }
    else fsm.debounceCount = 0;
  } else if (fsm.fsmState === 'ascending') {
    sample.phase = 'ascending'; fsm.repBuf.push(sample);
    if (smoothedY - fsm.topBaselineY < RETURN_DELTA) {
      if (++fsm.debounceCount >= DEBOUNCE_FRAMES) {
        fsm.fsmState = 'standing'; fsm.debounceCount = 0;
        if (ts - fsm.repStartMs > MIN_REP_MS) completed = fsm.repBuf;
        fsm.repBuf = [];
      }
    } else fsm.debounceCount = 0;
  }

  return completed;
}

// ═══════════════════════════════════════════════════════
// SCORING — 4 dimensions per completed rep, plus dry feedback copy.
// ═══════════════════════════════════════════════════════
function scoreRom(repBuf, cfg) {
  const angles = repBuf.map(f => f.kneeAngle).filter(a => a != null);
  const minAngle = angles.length ? Math.min(...angles) : cfg.romAngleTop;
  const angleScore = clamp(Math.round(1 + 9 * (cfg.romAngleTop - minAngle) / (cfg.romAngleTop - cfg.romAngleBottom)), 1, 10);

  const bottomFrame = repBuf.reduce((min, f) => (f.hipY > min.hipY ? f : min), repBuf[0]);
  const yRatio = (bottomFrame.working.hip.y - bottomFrame.working.knee.y) / bottomFrame.shoW; // ~0 at parallel, + deeper
  const yScore = clamp(Math.round(1 + 9 * clamp((yRatio + 0.5) / 1.0, 0, 1)), 1, 10);

  return { score: Math.round((angleScore + yScore) / 2), minAngle, bottomFrame };
}

function scoreStability(repBuf, cfg) {
  const holdFrames = repBuf.filter(f => f.phase === 'bottom');
  const sample = holdFrames.length >= 5 ? holdFrames : repBuf;
  const normX = sample.map(f => f.hipX / f.shoW);
  const stdevX = stddev(normX);
  return { score: clamp(Math.round(10 - stdevX / cfg.stabilityUnit), 1, 10), stdevX };
}

function scoreSpeed(repBuf, cfg) {
  const vs = [];
  for (let i = 1; i < repBuf.length; i++) {
    const dt = (repBuf[i].ts - repBuf[i - 1].ts) / 1000;
    if (dt > 0) vs.push((repBuf[i].hipY - repBuf[i - 1].hipY) / dt);
  }
  const js = [];
  for (let i = 1; i < vs.length; i++) {
    const dt = (repBuf[i + 1].ts - repBuf[i].ts) / 1000;
    if (dt > 0) js.push(Math.abs(vs[i] - vs[i - 1]) / dt);
  }
  const avgAbsJerk = js.length ? js.reduce((a, b) => a + b, 0) / js.length : 0;
  const normJerk = avgAbsJerk * (repBuf[0] ? repBuf[0].shoW : 1);
  return { score: clamp(Math.round(10 - normJerk / cfg.jerkUnit), 1, 10), normJerk };
}

function scoreForm(repBuf, cfg, bottomFrame) {
  const midFrames = repBuf.filter(f => f.bothVisible && f.phase !== null);
  let valgusFlagged = false;
  let maxOffset = 0;
  if (midFrames.length) {
    let flaggedCount = 0;
    midFrames.forEach(f => {
      const midlineX = (f.lAnk.x + f.rAnk.x) / 2;
      const offL = kneeInwardOffset(f.lHip, f.lKnee, f.lAnk, midlineX, f.shoW);
      const offR = kneeInwardOffset(f.rHip, f.rKnee, f.rAnk, midlineX, f.shoW);
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

function repFeedback(r, cfg) {
  const issues = [];
  if (r.rom.score <= 4) issues.push('Not reaching full depth.');
  if (r.form.valgusFlagged) issues.push('Knees tracking inward.');
  if (r.form.leanFlagged) issues.push('Leaning forward more than expected.');
  if (r.stability.score <= 4) issues.push('Noticeable sway at the bottom.');
  if (r.speed.score <= 4) issues.push('Movement was jerky, not controlled.');
  if (!issues.length) return cfg.positiveLines[Math.floor(Math.random() * cfg.positiveLines.length)];
  return issues.slice(0, 2).join(' ');
}

// Scores one completed rep's frame buffer end-to-end.
function scoreRep(repBuf, cfg) {
  const rom = scoreRom(repBuf, cfg);
  const stability = scoreStability(repBuf, cfg);
  const speed = scoreSpeed(repBuf, cfg);
  const form = scoreForm(repBuf, cfg, rom.bottomFrame);
  const overall = Math.round(((rom.score + stability.score + speed.score + form.score) / 4) * 10) / 10;
  const rep = { ts: repBuf[repBuf.length - 1].ts, rom, stability, speed, form, overall };
  rep.feedback = repFeedback(rep, cfg);
  return rep;
}

// ═══════════════════════════════════════════════════════
// STATE + DOM — everything below this line touches the DOM/camera and is not meant to be
// exercised by tests/squat-coach-flow.html (which covers only the pure functions above).
// ═══════════════════════════════════════════════════════
let state = {
  view: 'landing',        // 'landing' | 'camera' | 'summary'
  facingMode: 'user',      // 'user' | 'environment'
  cameraStatus: 'idle',    // 'idle' | 'requesting' | 'active' | 'denied' | 'error'
  poseReady: false,
  setActive: false,
  reps: [],                // this set's completed rep score objects — in-memory only
  lastRep: null,
  debug: /[?&]debug=1/.test(location.search),
};

let fsm = newFsm();
let pose = null, mediaStream = null, rafId = null, frameBusy = false, poseReadyStreak = 0;
let videoEl = null, canvasEl = null, canvasCtx = null;
let repCounterEl = null, framePromptEl = null, beginSetBtn = null, finishSetBtn = null;
let chipRomEl = null, chipStabilityEl = null, chipSpeedEl = null, chipFormEl = null, feedbackEl = null;
let debugEl = null;

function root() { return document.getElementById('root'); }

function render() {
  const r = root();
  r.innerHTML = '';
  r.style.cssText = `height:100dvh;display:flex;flex-direction:column;position:relative;overflow:hidden;background:${T.bg};color:${T.fg};font-family:${T.body};-webkit-font-smoothing:antialiased;`;
  const view = el('div', 'height:100%;display:flex;flex-direction:column;animation:rise .25s ease;');
  if (state.view === 'landing') view.appendChild(renderLanding());
  else if (state.view === 'camera') view.appendChild(renderCamera());
  else if (state.view === 'summary') view.appendChild(renderSummary());
  r.appendChild(view);
}

function navBackButton() {
  const backBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`);
  backBtn.innerHTML = iconClose(T.fg);
  backBtn.onclick = () => { stopCamera(); window.location.href = 'index.html'; };
  return backBtn;
}

// ─────────────────────────────────────────────────────
// LANDING SCREEN
// ─────────────────────────────────────────────────────
function renderLanding() {
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = 'Squat Form Coach';
  hdr.append(navBackButton(), title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:8px 22px 40px;display:flex;flex-direction:column;gap:20px;`);

  const tag = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
  tag.textContent = 'Phase 1 — Squat';

  const explainer = el('div', `font-size:15px;line-height:1.6;color:${T.fg};`);
  explainer.textContent = 'Uses your phone camera to track a skeleton overlay while you squat, and scores each rep on depth, stability, speed, and form. Nothing is recorded or uploaded — scoring happens on-device and disappears when you leave this page.';

  const card = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:10px;`);
  const cardTitle = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;`);
  cardTitle.textContent = 'Camera';
  const toggleRow = el('div', `display:flex;gap:8px;`);
  const mkFacingBtn = (mode, label) => {
    const active = state.facingMode === mode;
    const b = el('button', `flex:1;appearance:none;border:1px solid ${active ? T.accent : T.hairline};background:${active ? T.accent : 'transparent'};color:${active ? T.accentT : T.fg};border-radius:6px;padding:12px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1px;text-transform:uppercase;`);
    b.textContent = label;
    b.onclick = () => { state.facingMode = mode; render(); };
    return b;
  };
  toggleRow.append(mkFacingBtn('user', 'Front'), mkFacingBtn('environment', 'Rear'));
  card.append(cardTitle, toggleRow);

  const startBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:20px 22px;display:flex;align-items:center;justify-content:center;gap:12px;font-family:${T.display};font-weight:700;font-size:16px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  startBtn.innerHTML = `${iconPlay(T.accentT)} Start Camera`;
  startBtn.onclick = startCamera;

  if (state.cameraStatus === 'denied' || state.cameraStatus === 'error') {
    const err = el('div', `padding:12px 14px;background:${T.pill};border-radius:6px;font-size:13px;color:${T.sub};line-height:1.5;`);
    err.textContent = state.cameraStatus === 'denied'
      ? 'Camera access was denied. Check your browser\'s site settings and try again.'
      : 'Could not start the camera. Try reloading the page.';
    scroll.append(tag, explainer, card, startBtn, err);
  } else {
    scroll.append(tag, explainer, card, startBtn);
  }

  const wrap = el('div', `display:flex;flex-direction:column;height:100%;`);
  wrap.append(hdr, scroll);
  return wrap;
}

// ─────────────────────────────────────────────────────
// CAMERA SCREEN — built once per entry into this view; never re-rendered while live (see
// module docblock). All live updates below go through direct node references, not render().
// ─────────────────────────────────────────────────────
function renderCamera() {
  const wrap = el('div', `position:relative;flex:1;background:#000;overflow:hidden;`);

  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('muted', '');
  videoEl.muted = true;
  videoEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';

  canvasEl = document.createElement('canvas');
  canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
  canvasCtx = canvasEl.getContext('2d');

  videoEl.addEventListener('loadedmetadata', () => {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
  });

  const topBar = el('div', `position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,12px) + 10px) 16px 10px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(${T.bg}cc, transparent);`);
  const topRow = el('div', `display:flex;align-items:center;justify-content:space-between;gap:10px;`);
  const backBtn = navBackButton();
  const repCounter = el('div', `font-family:${T.mono_ff};font-size:13px;color:${T.fg};letter-spacing:1px;`);
  repCounterEl = repCounter;
  updateRepCounterText();
  topRow.append(backBtn, repCounter, el('div', 'width:36px;'));

  const chipsRow = el('div', `display:flex;gap:6px;`);
  const mkChip = (label) => {
    const chip = el('div', `flex:1;background:${T.pill};border-radius:4px;padding:8px 6px;text-align:center;`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:8px;color:${T.mono};letter-spacing:1px;text-transform:uppercase;`);
    lbl.textContent = label;
    const val = el('div', `font-family:${T.display};font-weight:700;font-size:16px;margin-top:2px;`);
    val.textContent = '—';
    chip.append(lbl, val);
    chip._val = val; chip._box = chip;
    return chip;
  };
  const chipRom = mkChip('ROM'), chipStability = mkChip('Stability'), chipSpeed = mkChip('Speed'), chipForm = mkChip('Form');
  chipRomEl = chipRom; chipStabilityEl = chipStability; chipSpeedEl = chipSpeed; chipFormEl = chipForm;
  chipsRow.append(chipRom, chipStability, chipSpeed, chipForm);
  chipsRow.style.display = state.setActive ? 'flex' : 'none';

  const framePrompt = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.fg};letter-spacing:1px;text-align:center;background:${T.pill};border-radius:6px;padding:10px;`);
  framePrompt.textContent = 'Get in frame, step back so your full body is visible.';
  framePromptEl = framePrompt;
  framePrompt.style.display = (!state.poseReady && !state.setActive) ? 'block' : 'none';

  topBar.append(topRow, chipsRow, framePrompt);

  const debugBox = el('div', `position:absolute;top:120px;left:16px;right:16px;font-family:${T.mono_ff};font-size:10px;color:${T.accent};background:${T.bg}dd;border-radius:6px;padding:8px;line-height:1.6;display:${state.debug ? 'block' : 'none'};`);
  debugEl = debugBox;

  const bottomBar = el('div', `position:absolute;left:0;right:0;bottom:0;padding:10px 16px calc(env(safe-area-inset-bottom,14px) + 10px);display:flex;flex-direction:column;gap:10px;background:linear-gradient(transparent, ${T.bg}cc);`);
  const feedback = el('div', `font-family:${T.mono_ff};font-size:12px;color:${T.sub};text-align:center;min-height:16px;`);
  feedbackEl = feedback;

  const beginBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:16px;font-family:${T.display};font-weight:700;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;width:100%;opacity:${state.poseReady ? '1' : '0.4'};`);
  beginBtn.textContent = 'Begin Set';
  beginBtn.disabled = !state.poseReady;
  beginBtn.onclick = beginSet;
  beginSetBtn = beginBtn;
  beginBtn.style.display = state.setActive ? 'none' : 'block';

  const finishBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};border-radius:6px;padding:16px;font-family:${T.display};font-weight:700;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  finishBtn.textContent = 'Finish Set';
  finishBtn.onclick = finishSet;
  finishSetBtn = finishBtn;
  finishBtn.style.display = state.setActive ? 'block' : 'none';

  bottomBar.append(feedback, beginBtn, finishBtn);

  wrap.append(videoEl, canvasEl, topBar, debugBox, bottomBar);
  return wrap;
}

function updateRepCounterText() {
  if (repCounterEl) repCounterEl.textContent = `${state.reps.length} REP${state.reps.length === 1 ? '' : 'S'}`;
}

function updateChip(chipEl, score) {
  if (!chipEl) return;
  const good = score != null && score >= 8;
  chipEl._val.textContent = score == null ? '—' : String(score);
  chipEl._box.style.background = good ? T.accent : T.pill;
  chipEl._val.style.color = good ? T.accentT : T.fg;
  const lbl = chipEl.firstChild;
  if (lbl) lbl.style.color = good ? T.accentT : T.mono;
}

function updateLiveChips(rep) {
  updateChip(chipRomEl, rep.rom.score);
  updateChip(chipStabilityEl, rep.stability.score);
  updateChip(chipSpeedEl, rep.speed.score);
  updateChip(chipFormEl, rep.form.score);
  if (feedbackEl) feedbackEl.textContent = rep.feedback;
}

// ─────────────────────────────────────────────────────
// SUMMARY SCREEN
// ─────────────────────────────────────────────────────
function avgOf(reps, pick) {
  if (!reps.length) return 0;
  return Math.round((reps.reduce((a, r) => a + pick(r), 0) / reps.length) * 10) / 10;
}

function summaryFeedback(avgs) {
  const dims = [['depth', avgs.rom], ['stability', avgs.stability], ['speed control', avgs.speed], ['form', avgs.form]];
  dims.sort((a, b) => a[1] - b[1]);
  const lines = [];
  if (avgs.overall >= 7) lines.push('Consistent set.');
  if (dims[0][1] < 7) lines.push(`${dims[0][0][0].toUpperCase()}${dims[0][0].slice(1)} was the main gap this set.`);
  if (!lines.length) lines.push('Set logged.');
  return lines.join(' ');
}

function renderSummary() {
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = 'Set Summary';
  hdr.append(navBackButton(), title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:8px 22px 40px;display:flex;flex-direction:column;gap:22px;`);

  const reps = state.reps;
  const avgs = {
    rom: avgOf(reps, r => r.rom.score), stability: avgOf(reps, r => r.stability.score),
    speed: avgOf(reps, r => r.speed.score), form: avgOf(reps, r => r.form.score),
    overall: avgOf(reps, r => r.overall),
  };

  const countLine = el('div', `font-family:${T.mono_ff};font-size:12px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  countLine.textContent = `${reps.length} rep${reps.length === 1 ? '' : 's'} scored`;

  const overallWrap = el('div', `text-align:center;padding:20px 0;`);
  const overallNum = el('div', `font-family:${T.display};font-weight:700;font-size:64px;line-height:1;color:${T.fg};`);
  overallNum.textContent = reps.length ? avgs.overall.toFixed(1) : '—';
  const overallLbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;margin-top:6px;`);
  overallLbl.textContent = 'Overall';
  overallWrap.append(overallNum, overallLbl);

  const grid = el('div', `display:grid;grid-template-columns:1fr 1fr;gap:10px;`);
  const mkStatCard = (label, val) => {
    const c = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:14px;`);
    const l = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
    l.textContent = label;
    const v = el('div', `font-family:${T.display};font-weight:700;font-size:24px;margin-top:6px;`);
    v.textContent = reps.length ? val : '—';
    c.append(l, v);
    return c;
  };
  grid.append(mkStatCard('ROM / Depth', avgs.rom), mkStatCard('Stability', avgs.stability), mkStatCard('Speed', avgs.speed), mkStatCard('Form', avgs.form));

  const feedbackCard = el('div', `padding:14px 16px;background:${T.pill};border-radius:6px;font-size:14px;color:${T.fg};line-height:1.5;`);
  feedbackCard.textContent = reps.length ? summaryFeedback(avgs) : 'No reps were detected in this set.';

  const repeatBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  repeatBtn.textContent = 'Repeat Set';
  repeatBtn.onclick = () => {
    state.reps = []; state.lastRep = null; state.setActive = false; state.poseReady = false;
    fsm = newFsm(); poseReadyStreak = 0;
    startCamera(); // sets state.view = 'camera' and renders once, then (re)requests the stream
  };

  const backBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  backBtn.textContent = 'Back to Workout';
  backBtn.onclick = () => { window.location.href = 'index.html'; };

  scroll.append(countLine, overallWrap, grid, feedbackCard, repeatBtn, backBtn);

  const wrap = el('div', `display:flex;flex-direction:column;height:100%;`);
  wrap.append(hdr, scroll);
  return wrap;
}

// ─────────────────────────────────────────────────────
// CAMERA + POSE LIFECYCLE
// ─────────────────────────────────────────────────────
function ensurePose() {
  if (pose) return pose;
  pose = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
  pose.setOptions({
    modelComplexity: 1,       // 0 lite / 1 full / 2 heavy — drop to 0 if real-device FPS is poor
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults(onPoseResults);
  return pose;
}

async function startCamera() {
  state.cameraStatus = 'requesting';
  state.view = 'camera';
  render();
  try {
    ensurePose(); // inside the try — a CDN load failure (Pose undefined) must surface as an error, not hang
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: false,
    });
    videoEl.srcObject = mediaStream;
    await videoEl.play();
    state.cameraStatus = 'active';
    frameBusy = false;
    rafId = requestAnimationFrame(frameLoop);
    acquireWakeLock();
  } catch (e) {
    state.cameraStatus = (e && e.name === 'NotAllowedError') ? 'denied' : 'error';
    state.view = 'landing';
    render();
  }
}

function stopCamera() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  try { if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop()); } catch {}
  mediaStream = null;
  state.cameraStatus = 'idle';
  releaseWakeLock();
}

window.addEventListener('pagehide', stopCamera);

function frameLoop() {
  if (state.cameraStatus !== 'active') return;
  if (!frameBusy && videoEl && videoEl.readyState >= 2) {
    frameBusy = true;
    pose.send({ image: videoEl }).catch(() => {}).finally(() => { frameBusy = false; });
  }
  rafId = requestAnimationFrame(frameLoop);
}

function onPoseResults(results) {
  if (!canvasCtx || !canvasEl.width) return;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const lm = results.poseLandmarks;
  if (!lm) {
    poseReadyStreak = 0;
    canvasCtx.restore();
    return;
  }

  drawConnectors(canvasCtx, lm, POSE_CONNECTIONS, { color: T.accent, lineWidth: 3 });
  drawLandmarks(canvasCtx, lm, { color: T.fg, lineWidth: 1, radius: 3 });
  canvasCtx.restore();

  const coreVis = [LM.LSHO, LM.RSHO, LM.LHIP, LM.RHIP, LM.LKNEE, LM.RKNEE, LM.LANK, LM.RANK]
    .reduce((a, i) => a + lm[i].visibility, 0) / 8;
  if (coreVis > 0.5) poseReadyStreak++; else poseReadyStreak = 0;

  if (!state.poseReady && poseReadyStreak >= 10) {
    state.poseReady = true;
    if (framePromptEl) framePromptEl.style.display = 'none';
    if (beginSetBtn) { beginSetBtn.disabled = false; beginSetBtn.style.opacity = '1'; }
  } else if (state.poseReady && poseReadyStreak === 0 && !state.setActive) {
    state.poseReady = false;
    if (framePromptEl) framePromptEl.style.display = 'block';
    if (beginSetBtn) { beginSetBtn.disabled = true; beginSetBtn.style.opacity = '0.4'; }
  }

  if (state.debug && debugEl) {
    const side = pickWorkingSide(lm);
    const working = workingLandmarks(lm, side);
    const angle = angleAt(working.hip, working.knee, working.ankle);
    debugEl.textContent = `side:${side} kneeAngle:${angle ? angle.toFixed(1) : '—'} fsm:${fsm.fsmState} coreVis:${coreVis.toFixed(2)}`;
  }

  if (state.setActive) {
    const completedRep = tickFsm(fsm, lm, performance.now());
    if (completedRep) {
      const rep = scoreRep(completedRep, SQUAT_EXERCISE);
      state.reps.push(rep);
      state.lastRep = rep;
      updateRepCounterText();
      updateLiveChips(rep);
      beep();
    }
  }
}

function beginSet() {
  if (!state.poseReady) return;
  state.setActive = true;
  fsm = newFsm();
  state.reps = [];
  state.lastRep = null;
  updateRepCounterText();
  if (framePromptEl) framePromptEl.style.display = 'none';
  if (beginSetBtn) beginSetBtn.style.display = 'none';
  if (finishSetBtn) finishSetBtn.style.display = 'block';
  const chipsRow = chipRomEl ? chipRomEl.parentElement : null;
  if (chipsRow) chipsRow.style.display = 'flex';
}

function finishSet() {
  state.setActive = false;
  stopCamera();
  state.view = 'summary';
  render();
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
render();
