// ═══════════════════════════════════════════════════════
// SQUAT FORM COACH — Phase 1 MVP
// Fully self-contained mini-app: own state, own render(). Loads shared.js only for generic UI
// utilities (T, el, icons, beep, wake lock, fmt), form-coach-engine.js for the generic camera/
// pose/FSM/scoring machinery, and exercise-squat.js for squat's own config/scoring — never
// touches the timer/session engine (startSession/renderPreview/etc.) or its localStorage keys
// (mf.progress/mf.sessions/...). IN-MEMORY ONLY. No localStorage key of any kind is written by
// this file, by design (Phase 1 spec explicitly excludes persistence) — do not "fix" that
// without being asked.
// See memory/form_coach.md for the full set of decisions and tunable constants.
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
let poseReadyStreak = 0;
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
  const bad = score != null && score <= 4;
  chipEl._val.textContent = score == null ? '—' : String(score);
  chipEl._box.style.background = good ? T.accent : bad ? WARN_COLOR : T.pill;
  chipEl._val.style.color = good ? T.accentT : bad ? '#fff' : T.fg;
  const lbl = chipEl.firstChild;
  if (lbl) lbl.style.color = good ? T.accentT : bad ? '#fff' : T.mono;
}

function updateLiveChips(rep) {
  updateChip(chipRomEl, rep.rom.score);
  updateChip(chipStabilityEl, rep.stability.score);
  updateChip(chipSpeedEl, rep.speed.score);
  updateChip(chipFormEl, rep.form.score);
  if (feedbackEl) {
    feedbackEl.textContent = rep.feedback;
    feedbackEl.style.color = rep.hasIssue ? WARN_COLOR : T.sub;
  }
}

// ─────────────────────────────────────────────────────
// SUMMARY SCREEN
// ─────────────────────────────────────────────────────
function avgOf(reps, pick) {
  if (!reps.length) return 0;
  return Math.round((reps.reduce((a, r) => a + pick(r), 0) / reps.length) * 10) / 10;
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
    const good = reps.length && val >= 8, bad = reps.length && val <= 4;
    const v = el('div', `font-family:${T.display};font-weight:700;font-size:24px;margin-top:6px;color:${good ? T.accent : bad ? WARN_COLOR : T.fg};`);
    v.textContent = reps.length ? val : '—';
    c.append(l, v);
    return c;
  };
  grid.append(mkStatCard('ROM / Depth', avgs.rom), mkStatCard('Stability', avgs.stability), mkStatCard('Speed', avgs.speed), mkStatCard('Form', avgs.form));

  const feedbackCard = el('div', `padding:14px 16px;background:${T.pill};border-radius:6px;font-size:14px;color:${T.fg};line-height:1.5;`);
  feedbackCard.textContent = reps.length ? squatSummaryFeedback(avgs) : 'No reps were detected in this set.';

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
// CAMERA + POSE LIFECYCLE — thin wiring around form-coach-engine.js's shared machinery.
// ─────────────────────────────────────────────────────
async function startCamera() {
  state.cameraStatus = 'requesting';
  state.view = 'camera';
  render();
  try {
    ensurePose(onPoseResults); // inside the try — a CDN load failure (Pose undefined) must surface as an error, not hang
    await startCameraStream(videoEl, state.facingMode);
    state.cameraStatus = 'active';
    startFrameLoop(_pose, videoEl, () => state.cameraStatus === 'active');
    acquireWakeLock();
  } catch (e) {
    state.cameraStatus = (e && e.name === 'NotAllowedError') ? 'denied' : 'error';
    state.view = 'landing';
    render();
  }
}

function stopCamera() {
  stopFrameLoop();
  stopCameraStream();
  state.cameraStatus = 'idle';
  releaseWakeLock();
}

window.addEventListener('pagehide', stopCamera);

function onPoseResults(results) {
  const lm = results.poseLandmarks;
  drawSkeleton(canvasCtx, canvasEl, lm, T.accent, T.fg);
  if (!lm) { poseReadyStreak = 0; return; }

  const coreVis = visibilityAvg(lm, [LM.LSHO, LM.RSHO, LM.LHIP, LM.RHIP, LM.LKNEE, LM.RKNEE, LM.LANK, LM.RANK]);
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
    const side = pickWorkingSide(lm, LEFT_LEG, RIGHT_LEG);
    const working = squatWorkingLandmarks(lm, side);
    const angle = angleAt(working.hip, working.knee, working.ankle);
    const baseline = fsm.topBaselineY == null ? '—' : fsm.topBaselineY.toFixed(3);
    debugEl.textContent = `side:${side} kneeAngle:${angle ? angle.toFixed(1) : '—'} fsm:${fsm.fsmState} coreVis:${coreVis.toFixed(2)} baseline:${baseline}`;
  }

  if (state.setActive) {
    // Live corrective warning while a rep is actively in progress — captured on the phase
    // *before* tickFsm runs, so a rep that completes on this exact frame isn't briefly
    // overwritten with a stale live warning (the post-rep feedback below takes precedence).
    const phaseBeforeTick = fsm.fsmState;
    if (phaseBeforeTick !== 'standing' && feedbackEl) {
      const warn = squatLiveFrameCheck(lm, phaseBeforeTick);
      feedbackEl.textContent = warn || 'In progress…';
      feedbackEl.style.color = warn ? WARN_COLOR : T.sub;
    }

    const completedRep = tickFsm(fsm, lm, performance.now(), hipCenterOf, shoulderWidthOf, squatFrameSample);
    if (completedRep) {
      const rep = squatScoreRep(completedRep);
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
  if (feedbackEl) { feedbackEl.textContent = 'Ready — start your first squat.'; feedbackEl.style.color = T.sub; }
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
