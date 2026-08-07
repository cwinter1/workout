// ═══════════════════════════════════════════════════════
// DAILY ROUTINE — a fixed, same-every-day, 20-minute morning strength sequence: warmup, 2 sets
// each of push-ups/squats/plank, one set of lunges, cooldown. No week/day variation, no
// decision-making — the whole point is "just do the same thing" (see memory/daily_routine.md for
// the full spec this implements). Reachable from the AM home screen.
//
// Fully self-contained mini-app, same shape as squat-coach.js: own state, own render(). Loads
// shared.js (T/el/icons/beep/wake lock/dateKey), form-coach-engine.js (camera/pose/FSM/hold/
// generic scoring), and all 4 exercise-*.js files (squat/push-up/lunge/plank config+scoring).
// Never touches shared.js's timer/session engine or its localStorage keys — this program has its
// own persistence key, mf.dailyRoutine (see below), since there's no week/day concept here at all
// (a calendar-date completion log, not a progress grid).
//
// CRITICAL DOM rule, stricter than squat-coach.js's: the whole routine (all 9 steps) runs inside
// ONE continuously-live camera session — the same MediaStream/Pose instance the entire time, so
// the model only loads once and permission is only requested once. That means `render()` (which
// does root.innerHTML = '') must NEVER run again once the camera screen is built, for the ENTIRE
// routine, not just within one step — on iOS Safari specifically, detaching a live <video> element
// from the document (which innerHTML='' does, even if a JS reference is kept and the node is
// re-appended afterward) risks breaking the getUserMedia stream, not just visually blipping it.
// So step transitions call enterStep() (direct node patches), never render(), from the moment
// the camera screen first appears until the routine ends (Done screen, where the camera is
// deliberately stopped and a real render() is safe again).
// ═══════════════════════════════════════════════════════

const ROUTINE_STEPS = [
  { kind: 'timer', label: 'Warm-up', sub: 'Arm circles + leg swings', seconds: 30 },
  { kind: 'reps', label: 'Push-Ups', sub: 'Chest, shoulders, arms', exercise: 'pushup', target: 20, budget: '~2 min' },
  { kind: 'reps', label: 'Squats', sub: 'Legs, glutes', exercise: 'squat', target: 30, budget: '~2:30' },
  { kind: 'hold', label: 'Plank', sub: 'Core', exercise: 'plank', targetSeconds: 60, budget: '~1:30' },
  { kind: 'reps', label: 'Lunges', sub: 'Legs, balance (alternating)', exercise: 'lunge', target: 20, budget: '~2 min' },
  { kind: 'reps', label: 'Push-Ups', sub: 'Second set', exercise: 'pushup', target: 15, budget: '~1:30' },
  { kind: 'reps', label: 'Squats', sub: 'Second set', exercise: 'squat', target: 25, budget: '~2 min' },
  { kind: 'hold', label: 'Plank', sub: 'Core endurance', exercise: 'plank', targetSeconds: 45, budget: '~1 min' },
  { kind: 'timer', label: 'Cool-down', sub: 'Stretch — hips, hamstrings, shoulders', seconds: 120 },
];

// Maps a 'reps' step's `exercise` string to that exercise's config + engine wiring. Plank ('hold'
// kind) is handled separately below since it doesn't fit this rep-based shape at all.
const REP_EXERCISES = {
  pushup: { cfg: PUSHUP_EXERCISE, trackFn: pushupTrackPoint, sampleFn: pushupFrameSample, scoreRepFn: pushupScoreRep, liveCheckFn: pushupLiveFrameCheck },
  squat: { cfg: SQUAT_EXERCISE, trackFn: hipCenterOf, sampleFn: squatFrameSample, scoreRepFn: squatScoreRep, liveCheckFn: squatLiveFrameCheck },
  lunge: { cfg: LUNGE_EXERCISE, trackFn: hipCenterOf, sampleFn: lungeFrameSample, scoreRepFn: lungeScoreRep, liveCheckFn: lungeLiveFrameCheck },
};

// ═══════════════════════════════════════════════════════
// PERSISTENCE — mf.dailyRoutine: an array of { date: 'YYYY-MM-DD', completed: true, at, results }.
// A day only gets an entry if the routine was completed end-to-end (backing out early records
// nothing) — matches the spec's "just check off daily (yes/no)" rule literally: this is a
// calendar-date completion log, not a per-rep score archive. `results` (each step's label +
// overall score, where applicable) is kept too since it's already computed and genuinely useful
// on the Done screen and for a future "how am I trending" view — but the yes/no completion is the
// source of truth for the streak, not the scores.
// ═══════════════════════════════════════════════════════
function loadDailyRoutine() { try { return JSON.parse(localStorage.getItem('mf.dailyRoutine') || '[]'); } catch { return []; } }
function saveDailyRoutine(entries) { try { localStorage.setItem('mf.dailyRoutine', JSON.stringify(entries)); } catch {} }

// Quantity (total reps + total hold seconds) and quality (average score across scored steps) for
// one day's results array — computed once at save time and stored on the entry, rather than
// recomputed from `results` every time the progress view renders. `avgQuality` is null (not 0)
// when nothing was scorable that day (e.g. every step was skipped before any rep/hold completed)
// — a real, distinct case from "scored 0", so the progress grid can render it as "done, unscored"
// rather than as a bad quality day.
function computeDayStats(results) {
  const totalReps = results.reduce((a, r) => a + (r.kind === 'reps' ? (r.completedReps || 0) : 0), 0);
  const totalHoldSeconds = results.reduce((a, r) => a + (r.kind === 'hold' ? (r.heldSeconds || 0) : 0), 0);
  const scored = results.filter((r) => typeof r.overall === 'number');
  const avgQuality = scored.length ? Math.round((scored.reduce((a, r) => a + r.overall, 0) / scored.length) * 10) / 10 : null;
  return { totalReps, totalHoldSeconds, avgQuality };
}

function recordRoutineCompletion(results) {
  const entries = loadDailyRoutine();
  const today = dateKey();
  const idx = entries.findIndex((e) => e.date === today);
  const entry = Object.assign({ date: today, completed: true, at: Date.now(), results }, computeDayStats(results));
  if (idx !== -1) entries[idx] = entry; else entries.push(entry);
  saveDailyRoutine(entries);
  return entry;
}

// All-time rollup for the progress screen's summary row — "quantity" (total reps ever completed)
// and "quality" (average score across every day that had a scorable step), alongside the streak.
function dailyRoutineAllTimeStats() {
  const entries = loadDailyRoutine().filter((e) => e.completed);
  const totalReps = entries.reduce((a, e) => a + (e.totalReps || 0), 0);
  const scored = entries.filter((e) => typeof e.avgQuality === 'number');
  const avgQuality = scored.length ? Math.round((scored.reduce((a, e) => a + e.avgQuality, 0) / scored.length) * 10) / 10 : null;
  return { daysCompleted: entries.length, totalReps, avgQuality };
}

// Consecutive-day streak ending today or yesterday, same shape as shared.js's getStreak() but
// scoped to this program's own completion log (a plain calendar-date sequence, not week/day keys
// — there's no equivalent concept here).
// Diffs two 'YYYY-MM-DD' local-calendar-date strings (as produced by dateKey()) as UTC-anchored
// day numbers, so the result is an exact calendar-day count regardless of DST. The previous
// version mixed a UTC-parsed date string (`new Date('2026-08-06')` parses as UTC midnight) against
// a local-midnight `Date` object (`new Date(); .setHours(0,0,0,0)`) — those disagree by Israel's
// UTC offset (2-3h) even before DST, and a raw ms-division-by-86400000 additionally assumes every
// calendar day is exactly 24h, which is false on the two nights/year DST actually shifts.
function daysBetween(dateStrA, dateStrB) {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function dailyRoutineStreak() {
  const entries = loadDailyRoutine().filter((e) => e.completed);
  if (!entries.length) return 0;
  const days = [...new Set(entries.map((e) => e.date))].sort();
  if (daysBetween(days[days.length - 1], dateKey()) > 1) return 0;
  let streak = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    if (daysBetween(days[i], days[i + 1]) === 1) streak++; else break;
  }
  return streak;
}

// '#7aa676' + alpha -> 'rgba(122,166,118,alpha)'. Used by the progress grid to shade T.accent
// into a quality heatmap without introducing any hue outside the existing palette — only opacity
// varies, so this stays inside CLAUDE.md's "don't add colors outside T" rule (WARN_COLOR is the
// one already-documented exception; this doesn't add a second one, it just tints the first).
function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let state = {
  view: 'landing',   // 'landing' | 'step' | 'done' | 'progress'
  stepIdx: 0,
  cameraStatus: 'idle',
  facingMode: 'user',
  poseReady: false,
  stepActive: false,  // 'Begin' pressed for the current reps/hold step
  inSetup: false,      // true while the pre-routine camera-placement check is active
  results: [],         // per-step summaries accumulated across the whole routine
  debug: /[?&]debug=1/.test(location.search),
};

// Pre-routine camera setup check — confirms the SAME fixed phone placement works for both a
// standing pose (squats/lunges) and a floor pose (push-ups/plank), since the routine alternates
// between them and re-positioning the phone mid-routine isn't practical. See enterSetupCheck().
let setupPhase = 'standing'; // 'standing' | 'floor'
let setupStreak = { standing: 0, floor: 0 };
let setupConfirmed = { standing: false, floor: false };
let setupPhaseStartTs = 0;

let poseReadyStreak = 0;
let stepFsm = null, stepReps = [], stepHold = null;
let timerRemaining = 0, timerHandle = null;

let videoEl = null, canvasEl = null, canvasCtx = null;
let backBtn, stepCounterEl, stepTitleEl, stepSubEl, progressEl, chipsRowEl, chipEls, framePromptEl, feedbackEl, beginBtn, skipBtn, debugEl;

function root() { return document.getElementById('root'); }

function render() {
  const r = root();
  r.innerHTML = '';
  r.style.cssText = `height:100dvh;display:flex;flex-direction:column;position:relative;overflow:hidden;background:${T.bg};color:${T.fg};font-family:${T.body};-webkit-font-smoothing:antialiased;`;
  const view = el('div', 'height:100%;display:flex;flex-direction:column;animation:rise .25s ease;');
  if (state.view === 'landing') view.appendChild(renderLanding());
  else if (state.view === 'step') view.appendChild(renderRoutineShell());
  else if (state.view === 'done') view.appendChild(renderDone());
  else if (state.view === 'progress') view.appendChild(renderProgress());
  r.appendChild(view);
}

function navBackButtonTo(href, onBefore) {
  const b = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`);
  b.innerHTML = iconClose(T.fg);
  b.onclick = () => { if (onBefore) onBefore(); window.location.href = href; };
  return b;
}

// ─────────────────────────────────────────────────────
// LANDING SCREEN
// ─────────────────────────────────────────────────────
function renderLanding() {
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = 'Daily Routine';
  hdr.append(navBackButtonTo('index.html'), title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:8px 22px 40px;display:flex;flex-direction:column;gap:20px;`);

  const streak = dailyRoutineStreak();
  const todayDone = loadDailyRoutine().some((e) => e.date === dateKey() && e.completed);

  const statusRow = el('div', `display:flex;align-items:baseline;gap:14px;`);
  const streakNum = el('div', `font-family:${T.mono_ff};font-size:40px;font-weight:500;line-height:0.9;color:${T.fg};`);
  streakNum.textContent = String(streak);
  const streakLbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  streakLbl.textContent = streak === 1 ? 'day streak' : 'day streak';
  statusRow.append(streakNum, streakLbl);
  if (todayDone) {
    const doneTag = el('div', `margin-left:auto;font-family:${T.mono_ff};font-size:11px;color:${T.accent};letter-spacing:1px;text-transform:uppercase;align-self:center;`);
    doneTag.textContent = 'Done today';
    statusRow.appendChild(doneTag);
  }

  const explainer = el('div', `font-size:14px;line-height:1.6;color:${T.sub};`);
  explainer.textContent = 'Same reps, same order, every day. No variation, no decisions — the camera counts reps and holds for you; just show up and move.';

  const stepsCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:4px 16px;`);
  ROUTINE_STEPS.forEach((s, i) => {
    const row = el('div', `display:flex;justify-content:space-between;align-items:center;padding:12px 0;${i < ROUTINE_STEPS.length - 1 ? `border-bottom:1px solid ${T.hairline};` : ''}`);
    const l = el('div', `font-size:13px;color:${T.fg};`);
    l.textContent = s.label + (s.sub && s.sub.includes('set') ? ` — ${s.sub}` : '');
    const r2 = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};`);
    r2.textContent = s.kind === 'timer' ? fmt(s.seconds) : s.kind === 'hold' ? `${s.targetSeconds}s hold` : `× ${s.target}`;
    row.append(l, r2);
    stepsCard.appendChild(row);
  });

  const startBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:20px 22px;display:flex;align-items:center;justify-content:center;gap:12px;font-family:${T.display};font-weight:700;font-size:16px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  startBtn.innerHTML = `${iconPlay(T.accentT)} Start Routine`;
  startBtn.onclick = startRoutine;

  const errBox = el('div', `padding:12px 14px;background:${T.pill};border-radius:6px;font-size:13px;color:${T.sub};line-height:1.5;display:${(state.cameraStatus === 'denied' || state.cameraStatus === 'error') ? 'block' : 'none'};`);
  errBox.textContent = state.cameraStatus === 'denied'
    ? 'Camera access was denied. Check your browser\'s site settings and try again.'
    : 'Could not start the camera. Try reloading the page.';

  const progressBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 16px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;width:100%;`);
  progressBtn.innerHTML = `<span>Progress — reps, quality, evolution</span><span style="opacity:0.6">${iconArrow(T.fg)}</span>`;
  progressBtn.onclick = () => { state.view = 'progress'; render(); };

  scroll.append(statusRow, explainer, stepsCard, startBtn, progressBtn, errBox);

  const wrap = el('div', `display:flex;flex-direction:column;height:100%;`);
  wrap.append(hdr, scroll);
  return wrap;
}

// ─────────────────────────────────────────────────────
// ROUTINE SHELL — built exactly once per routine attempt. Every step transition after this
// patches these same nodes (enterStep) — see the module docblock for why render() must not
// run again until the routine ends.
// ─────────────────────────────────────────────────────
function renderRoutineShell() {
  const wrap = el('div', `position:relative;flex:1;background:#000;overflow:hidden;`);

  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('muted', '');
  videoEl.muted = true;
  videoEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';

  canvasEl = document.createElement('canvas');
  canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
  canvasCtx = canvasEl.getContext('2d');
  videoEl.addEventListener('loadedmetadata', () => { canvasEl.width = videoEl.videoWidth; canvasEl.height = videoEl.videoHeight; });

  const topBar = el('div', `position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,12px) + 10px) 16px 10px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(${T.bg}cc, transparent);`);
  const topRow = el('div', `display:flex;align-items:center;justify-content:space-between;gap:10px;`);
  backBtn = navBackButtonTo('index.html', stopCamera);
  const titleWrap = el('div', `text-align:center;flex:1;`);
  // Font sizes on this screen are deliberately large — the phone is propped up a few feet away
  // during a set, not held close, so everything here needs to read at a glance across a room
  // (Chris's own framing: "the human eye can't see things bright... make it human usage right
  // size"). progressEl (the live rep/time counter) and feedbackEl (live corrective cues) are the
  // two things actually read *during* a rep, so they get the largest bumps.
  stepCounterEl = el('div', `font-family:${T.mono_ff};font-size:13px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  stepTitleEl = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;`);
  titleWrap.append(stepCounterEl, stepTitleEl);
  topRow.append(backBtn, titleWrap, el('div', 'width:36px;'));

  stepSubEl = el('div', `font-family:${T.mono_ff};font-size:15px;color:${T.mono};letter-spacing:1px;text-align:center;`);
  progressEl = el('div', `font-family:${T.display};font-weight:700;font-size:72px;text-align:center;color:${T.fg};line-height:1.05;`);

  chipsRowEl = el('div', `display:flex;gap:6px;`);
  const mkChip = (label) => {
    const chip = el('div', `flex:1;background:${T.pill};border-radius:4px;padding:8px 6px;text-align:center;`);
    // white-space:nowrap+ellipsis is a safety net against wrapping to 2 lines on a narrow phone
    // (e.g. iPhone SE, 375px) — "Stability" at 11px is close to the chip's available width there.
    const lbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
    lbl.textContent = label;
    const val = el('div', `font-family:${T.display};font-weight:700;font-size:24px;margin-top:2px;`);
    val.textContent = '—';
    chip.append(lbl, val);
    chip._lbl = lbl; chip._val = val; chip._box = chip;
    return chip;
  };
  chipEls = [mkChip('ROM'), mkChip('Stability'), mkChip('Speed'), mkChip('Form')];
  chipsRowEl.append(...chipEls);

  framePromptEl = el('div', `font-family:${T.mono_ff};font-size:15px;color:${T.fg};letter-spacing:1px;text-align:center;background:${T.pill};border-radius:6px;padding:10px;`);
  framePromptEl.textContent = 'Get in frame, step back so your full body is visible.';

  topBar.append(topRow, stepSubEl, progressEl, chipsRowEl, framePromptEl);

  debugEl = el('div', `position:absolute;top:190px;left:16px;right:16px;font-family:${T.mono_ff};font-size:10px;color:${T.accent};background:${T.bg}dd;border-radius:6px;padding:8px;line-height:1.6;display:${state.debug ? 'block' : 'none'};`);

  const bottomBar = el('div', `position:absolute;left:0;right:0;bottom:0;padding:10px 16px calc(env(safe-area-inset-bottom,14px) + 10px);display:flex;flex-direction:column;gap:10px;background:linear-gradient(transparent, ${T.bg}cc);`);
  feedbackEl = el('div', `font-family:${T.mono_ff};font-size:19px;font-weight:600;color:${T.sub};text-align:center;min-height:24px;line-height:1.3;`);

  beginBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:19px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  beginBtn.onclick = beginStep;

  skipBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.sub};border-radius:6px;padding:14px;font-family:${T.mono_ff};font-size:14px;letter-spacing:1.5px;text-transform:uppercase;width:100%;`);
  skipBtn.textContent = 'Skip This Step';
  skipBtn.onclick = () => { if (state.inSetup) exitSetupCheck(); else finishCurrentStep(true); };

  bottomBar.append(feedbackEl, beginBtn, skipBtn);

  wrap.append(videoEl, canvasEl, topBar, debugEl, bottomBar);

  // enterSetupCheck() runs after the shell exists (needs the nodes above); deferred to a
  // microtask so this function can finish returning the built wrap first. The camera-placement
  // check always runs once, first, before step 0 — see enterSetupCheck()'s own comment.
  Promise.resolve().then(() => enterSetupCheck());

  return wrap;
}

// ─────────────────────────────────────────────────────
// CAMERA SETUP CHECK — runs once, before step 0. Confirms the SAME fixed phone placement works
// for both a standing pose (squats/lunges) and a floor pose (push-ups/plank) — the routine
// alternates between them repeatedly and there's no practical way to reposition the phone
// mid-routine, so it's worth 15-20 seconds up front to catch a bad angle before it costs a whole
// step's tracking. See memory/daily_routine.md.
// ─────────────────────────────────────────────────────
const SETUP_PROMPTS = {
  standing: 'Stand where you’ll do squats and lunges — get your whole body in frame.',
  floor: 'Now get into a push-up or plank position at the SAME spot — keep your whole body in frame.',
};
const SETUP_CONFIRM_STREAK = 12;
const SETUP_TROUBLE_MS = 8000;

function setSetupChipState(chipEl, confirmed) {
  chipEl._val.innerHTML = confirmed ? iconCheck(T.accentT) : '—';
  chipEl._box.style.background = confirmed ? T.accent : T.pill;
  chipEl._val.style.color = confirmed ? T.accentT : T.fg;
  chipEl._lbl.style.color = confirmed ? T.accentT : T.mono;
}

function enterSetupCheck() {
  state.inSetup = true;
  setupPhase = 'standing';
  setupStreak = { standing: 0, floor: 0 };
  setupConfirmed = { standing: false, floor: false };
  setupPhaseStartTs = performance.now();

  clearTimerInterval();
  stepCounterEl.textContent = 'Camera Check';
  stepTitleEl.textContent = 'Set Up Your Phone';
  stepSubEl.textContent = 'One placement needs to work for standing AND floor exercises.';
  progressEl.textContent = '';
  feedbackEl.textContent = '';
  feedbackEl.style.color = T.sub;

  framePromptEl.style.display = 'block';
  framePromptEl.textContent = SETUP_PROMPTS.standing;

  beginBtn.style.display = 'none';
  skipBtn.textContent = 'Skip Setup Check';

  chipsRowEl.style.display = 'flex';
  chipEls[0]._lbl.textContent = 'Standing';
  chipEls[1]._lbl.textContent = 'Floor';
  chipEls[2]._box.style.display = 'none';
  chipEls[3]._box.style.display = 'none';
  setSetupChipState(chipEls[0], false);
  setSetupChipState(chipEls[1], false);
}

function confirmSetupPhase(phase) {
  setupConfirmed[phase] = true;
  setSetupChipState(chipEls[phase === 'standing' ? 0 : 1], true);
  if (phase === 'standing') {
    setupPhase = 'floor';
    setupPhaseStartTs = performance.now();
    framePromptEl.textContent = SETUP_PROMPTS.floor;
    feedbackEl.textContent = '';
  } else {
    framePromptEl.style.display = 'none';
    feedbackEl.textContent = 'Setup looks good. Starting your routine…';
    feedbackEl.style.color = T.accent;
    setTimeout(() => { if (state.inSetup) exitSetupCheck(); }, 1200);
  }
}

// Leaves the setup check for step 0 — reached either by both phases confirming naturally, or by
// the user tapping "Skip Setup Check" at any point. Restores the shell's shared nodes (4-chip
// row, "Skip This Step" label) to their normal per-step meaning before enterStep(0) reuses them.
function exitSetupCheck() {
  state.inSetup = false;
  skipBtn.textContent = 'Skip This Step';
  chipEls[2]._box.style.display = 'block';
  chipEls[3]._box.style.display = 'block';
  enterStep(0);
}

function tickSetupCheck(lm) {
  const coreVis = visibilityAvg(lm, CORE_LANDMARKS);
  if (coreVis > 0.5) setupStreak[setupPhase]++; else setupStreak[setupPhase] = 0;

  // A live count on the active phase's chip — without this, a correctly-framed user standing
  // still sees nothing change for several seconds (nothing between the initial '—' and either a
  // checkmark or the 8s trouble hint), which reads as frozen rather than working.
  if (!setupConfirmed[setupPhase]) {
    const activeChip = chipEls[setupPhase === 'standing' ? 0 : 1];
    activeChip._val.textContent = setupStreak[setupPhase] > 0 ? String(setupStreak[setupPhase]) : '—';
  }

  if (state.debug && debugEl) {
    debugEl.textContent = `setup:${setupPhase} coreVis:${coreVis.toFixed(2)} streak:${setupStreak[setupPhase]}`;
  }

  if (!setupConfirmed[setupPhase] && setupStreak[setupPhase] >= SETUP_CONFIRM_STREAK) {
    confirmSetupPhase(setupPhase);
    return;
  }

  const elapsed = performance.now() - setupPhaseStartTs;
  if (!setupConfirmed[setupPhase] && elapsed > SETUP_TROUBLE_MS) {
    feedbackEl.textContent = 'Having trouble? Try moving the phone higher or farther back so your whole body fits in frame.';
    feedbackEl.style.color = WARN_COLOR;
  }
}

// progressEl defaults to 72px (see renderRoutineShell) for the common short formats ("0:30",
// "12 / 30"), but the hold-step format ("0:00 / 1:00", up to 11 chars) would overflow/wrap a
// ~358px-wide content area at that size — shrink it for longer strings rather than risk clipping
// the single most important thing on this screen.
function setProgressText(text) {
  progressEl.textContent = text;
  progressEl.style.fontSize = text.length <= 7 ? '72px' : text.length <= 9 ? '56px' : '44px';
}

// ─────────────────────────────────────────────────────
// STEP TRANSITIONS — patch the existing shell's nodes; never call render() (see module docblock).
// ─────────────────────────────────────────────────────
function enterStep(idx) {
  state.stepIdx = idx;
  if (idx >= ROUTINE_STEPS.length) { finishRoutine(); return; }
  const step = ROUTINE_STEPS[idx];

  state.stepActive = false;
  stepFsm = newFsm();
  stepReps = [];
  stepHold = newHold();
  clearTimerInterval();

  stepCounterEl.textContent = `Step ${idx + 1} / ${ROUTINE_STEPS.length}`;
  stepTitleEl.textContent = step.label;
  stepSubEl.textContent = step.sub;
  feedbackEl.textContent = '';
  feedbackEl.style.color = T.sub;

  const isCamera = step.kind !== 'timer';
  chipsRowEl.style.display = 'none';
  framePromptEl.style.display = isCamera && !state.poseReady ? 'block' : 'none';
  beginBtn.style.display = isCamera ? 'block' : 'none';
  beginBtn.disabled = isCamera && !state.poseReady;
  beginBtn.style.opacity = beginBtn.disabled ? '0.4' : '1';
  beginBtn.textContent = step.kind === 'hold' ? 'Begin Hold' : 'Begin Set';

  if (step.kind === 'timer') {
    setProgressText(fmt(step.seconds));
    timerRemaining = step.seconds;
    startTimerCountdown(step);
  } else if (step.kind === 'reps') {
    setProgressText(`0 / ${step.target}`);
  } else if (step.kind === 'hold') {
    setProgressText(`0:00 / ${fmt(step.targetSeconds)}`);
  }
}

function startTimerCountdown(step) {
  timerHandle = setInterval(() => {
    timerRemaining--;
    setProgressText(fmt(Math.max(0, timerRemaining)));
    if (timerRemaining <= 1 && timerRemaining > 0) beep();
    if (timerRemaining <= 0) { clearTimerInterval(); finishCurrentStep(false); }
  }, 1000);
}

function clearTimerInterval() { if (timerHandle) clearInterval(timerHandle); timerHandle = null; }

function beginStep() {
  const step = ROUTINE_STEPS[state.stepIdx];
  if (step.kind === 'timer' || !state.poseReady) return;
  state.stepActive = true;
  beginBtn.style.display = 'none';
  framePromptEl.style.display = 'none';
  chipsRowEl.style.display = 'flex';
  if (step.kind === 'hold') {
    chipEls[0]._lbl.textContent = 'Hold'; chipEls[1]._lbl.textContent = 'Stability'; chipEls[2]._lbl.textContent = 'Form';
    chipEls[3]._box.style.display = 'none';
  } else {
    chipEls[0]._lbl.textContent = 'ROM'; chipEls[1]._lbl.textContent = 'Stability'; chipEls[2]._lbl.textContent = 'Speed'; chipEls[3]._lbl.textContent = 'Form';
    chipEls[3]._box.style.display = 'block';
  }
  chipEls.forEach((c) => updateChip(c, null));
  feedbackEl.textContent = step.kind === 'hold' ? 'Ready — get into position.' : 'Ready — start your first rep.';
  feedbackEl.style.color = T.sub;
}

// Called either automatically (target reached) or manually (Skip button). `skipped` only affects
// the feedback line, not whether the result is recorded — a partially-done step still contributes
// whatever was captured before moving on, matching the routine's "no getting stuck" design goal.
function finishCurrentStep(skipped) {
  clearTimerInterval();
  const step = ROUTINE_STEPS[state.stepIdx];
  state.results.push(summarizeStep(step, skipped));
  enterStep(state.stepIdx + 1);
}

function summarizeStep(step, skipped) {
  if (step.kind === 'timer') return { label: step.label, kind: 'timer', skipped };
  if (step.kind === 'hold') {
    const scored = scoreHold(stepHold, step.targetSeconds * 1000, PLANK_EXERCISE);
    // A hold with zero active time (e.g. skipped before ever getting into position) is unscored,
    // matching the 'reps' branch below treating 0 completed reps as null rather than a real score
    // — otherwise a same-shape "skipped before doing anything" case gets counted into the day's
    // avgQuality for hold steps but excluded for reps steps, skewing the evolution trend.
    const overall = scored.activeMs > 0 ? scored.overall : null;
    return { label: step.label, kind: 'hold', target: step.targetSeconds, heldSeconds: Math.round(scored.activeMs / 1000), overall, skipped };
  }
  const overall = stepReps.length ? Math.round((stepReps.reduce((a, r) => a + r.overall, 0) / stepReps.length) * 10) / 10 : null;
  return { label: step.label, kind: 'reps', target: step.target, completedReps: stepReps.length, overall, skipped };
}

function updateChip(chipEl, score) {
  const good = score != null && score >= 8;
  const bad = score != null && score <= 4;
  chipEl._val.textContent = score == null ? '—' : String(score);
  chipEl._box.style.background = good ? T.accent : bad ? WARN_COLOR : T.pill;
  chipEl._val.style.color = good ? T.accentT : bad ? '#fff' : T.fg;
  chipEl._lbl.style.color = good ? T.accentT : bad ? '#fff' : T.mono;
}

// ─────────────────────────────────────────────────────
// DONE SCREEN
// ─────────────────────────────────────────────────────
function renderDone() {
  const streak = dailyRoutineStreak();
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = 'Day Complete';
  hdr.append(navBackButtonTo('index.html'), title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:8px 22px 40px;display:flex;flex-direction:column;gap:20px;`);

  const checkWrap = el('div', `text-align:center;padding:16px 0;`);
  const checkNum = el('div', `font-family:${T.display};font-weight:700;font-size:56px;line-height:1;color:${T.accent};`);
  checkNum.textContent = String(streak);
  const checkLbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;margin-top:6px;`);
  checkLbl.textContent = 'Day Streak';
  checkWrap.append(checkNum, checkLbl);

  const list = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:4px 16px;`);
  state.results.forEach((r, i) => {
    const row = el('div', `display:flex;justify-content:space-between;align-items:center;padding:12px 0;${i < state.results.length - 1 ? `border-bottom:1px solid ${T.hairline};` : ''}`);
    const l = el('div', `font-size:13px;color:${T.fg};`);
    l.textContent = r.label + (r.skipped ? ' (skipped)' : '');
    const v = el('div', `font-family:${T.mono_ff};font-size:12px;color:${T.mono};`);
    if (r.kind === 'timer') v.textContent = '—';
    else if (r.kind === 'hold') v.textContent = `${r.heldSeconds}/${r.target}s${r.overall != null ? ` · ${r.overall.toFixed(1)}` : ''}`;
    else v.textContent = `${r.completedReps}/${r.target}${r.overall != null ? ` · ${r.overall.toFixed(1)}` : ''}`;
    row.append(l, v);
    list.appendChild(row);
  });

  const doneBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  doneBtn.textContent = 'Back to Workout';
  doneBtn.onclick = () => { window.location.href = 'index.html'; };

  scroll.append(checkWrap, list, doneBtn);
  const wrap = el('div', `display:flex;flex-direction:column;height:100%;`);
  wrap.append(hdr, scroll);
  return wrap;
}

// ─────────────────────────────────────────────────────
// PROGRESS / EVOLUTION SCREEN — reached from the landing screen (state.view = 'progress'), never
// from inside a live routine, so a plain render() here is always safe. "Quality" is shown via
// color (a heatmap shading of T.accent — see withAlpha above — never a color outside the
// established palette+WARN_COLOR exception); "quantity" and the numeric "rate" are shown as plain
// stats, not folded into cell color, so both stay independently readable rather than one
// crowding out the other in a single small square.
// ─────────────────────────────────────────────────────
const PROGRESS_WEEKS_SHOWN = 8;

function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const s = new Date(d);
  s.setDate(d.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s;
}

// Not-done -> neutral pill (matches the AM/Office progress grid's own "not done" treatment).
// Done-but-unscored -> a dim, flat accent tint (distinct from both "not done" and any real score).
// Done + poor quality (<=4) -> solid WARN_COLOR. Done + score 5-10 -> T.accent shaded from a faint
// tint up to fully solid, so a glance across weeks reads as a literal quality gradient, not just
// a binary streak checklist.
function qualityCellStyle(entry) {
  if (!entry) return { bg: T.pill, fg: T.mono };
  if (entry.avgQuality == null) return { bg: withAlpha(T.accent, 0.3), fg: T.fg };
  if (entry.avgQuality <= 4) return { bg: WARN_COLOR, fg: '#fff' };
  const opacity = clamp(0.35 + ((entry.avgQuality - 5) / 5) * 0.65, 0.35, 1);
  return { bg: withAlpha(T.accent, opacity), fg: entry.avgQuality >= 7.5 ? T.accentT : T.fg };
}

function renderProgress() {
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const backBtn2 = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`);
  backBtn2.innerHTML = iconClose(T.fg);
  backBtn2.onclick = () => { state.view = 'landing'; render(); };
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = 'Progress';
  hdr.append(backBtn2, title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:8px 22px 40px;display:flex;flex-direction:column;gap:22px;`);

  const totals = dailyRoutineAllTimeStats();
  const streak = dailyRoutineStreak();
  const entries = loadDailyRoutine();
  const byDate = {};
  entries.forEach((e) => { byDate[e.date] = e; });

  const statGrid = el('div', `display:grid;grid-template-columns:1fr 1fr;gap:10px;`);
  const mkStat = (label, val) => {
    const c = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:14px;`);
    const l = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
    l.textContent = label;
    const v = el('div', `font-family:${T.display};font-weight:700;font-size:26px;margin-top:6px;`);
    v.textContent = val;
    c.append(l, v);
    return c;
  };
  statGrid.append(
    mkStat('Day Streak', String(streak)),
    mkStat('Days Completed', String(totals.daysCompleted)),
    mkStat('Total Reps', String(totals.totalReps)),
    mkStat('Avg. Quality Rate', totals.avgQuality != null ? totals.avgQuality.toFixed(1) : '—'),
  );

  const gridSection = el('div', ``);
  gridSection.appendChild(sectionHeader(`${PROGRESS_WEEKS_SHOWN}-week evolution`));
  const grid = el('div', `margin-top:10px;display:grid;grid-template-columns:repeat(7,1fr);gap:6px;`);
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l) => {
    const lbl = el('span', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};text-align:center;`);
    lbl.textContent = l;
    grid.appendChild(lbl);
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const gridStart = startOfWeek(new Date(today.getTime() - (PROGRESS_WEEKS_SHOWN - 1) * 7 * 86400000));
  for (let i = 0; i < PROGRESS_WEEKS_SHOWN * 7; i++) {
    const date = new Date(gridStart.getTime() + i * 86400000);
    const key = dateKey(date.getTime());
    const entry = byDate[key];
    const style = qualityCellStyle(entry);
    const cell = el('div', `height:32px;border-radius:4px;background:${style.bg};display:flex;align-items:center;justify-content:center;font-family:${T.mono_ff};font-size:10px;color:${style.fg};${date > today ? 'opacity:0.25;' : ''}`);
    cell.textContent = String(date.getDate());
    grid.appendChild(cell);
  }
  gridSection.appendChild(grid);

  const legend = el('div', `font-size:12px;color:${T.sub};line-height:1.6;`);
  legend.textContent = 'Darker green = higher quality that day. Red = a rough day, form-wise. Gray = not done.';

  scroll.append(statGrid, gridSection, legend);

  const wrap = el('div', `display:flex;flex-direction:column;height:100%;`);
  wrap.append(hdr, scroll);
  return wrap;
}

// ─────────────────────────────────────────────────────
// CAMERA + POSE LIFECYCLE
// ─────────────────────────────────────────────────────
async function startRoutine() {
  state.cameraStatus = 'requesting';
  state.view = 'step';
  render(); // the ONLY render() call for the rest of the routine — see module docblock
  try {
    ensurePose(onPoseResults);
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
  // A timer-kind step's countdown (startTimerCountdown) runs on a plain setInterval, independent
  // of the camera/pose loop — without this, backgrounding the app mid-warmup/cooldown (pagehide
  // -> stopCamera) kills the camera but leaves the countdown running, which can still fire
  // finishCurrentStep() -> enterStep() against a dead camera stream with no way to resume.
  clearTimerInterval();
  state.cameraStatus = 'idle';
  releaseWakeLock();
}

function finishRoutine() {
  stopCamera();
  recordRoutineCompletion(state.results);
  state.view = 'done';
  render();
}

window.addEventListener('pagehide', stopCamera);

const CORE_LANDMARKS = [LM.LSHO, LM.RSHO, LM.LELB, LM.RELB, LM.LWRI, LM.RWRI, LM.LHIP, LM.RHIP, LM.LKNEE, LM.RKNEE, LM.LANK, LM.RANK];

function onPoseResults(results) {
  const lm = results.poseLandmarks;
  drawSkeleton(canvasCtx, canvasEl, lm, T.accent, T.fg);
  if (!lm) {
    poseReadyStreak = 0;
    // Mirrors poseReadyStreak's own reset above — a dropped frame during the setup check should
    // reset that phase's confirm streak too, not just the post-setup pose-ready one.
    if (state.inSetup) setupStreak[setupPhase] = 0;
    return;
  }

  if (state.inSetup) { tickSetupCheck(lm); return; }

  const step = ROUTINE_STEPS[state.stepIdx];
  const coreVis = visibilityAvg(lm, CORE_LANDMARKS);
  if (coreVis > 0.5) poseReadyStreak++; else poseReadyStreak = 0;

  if (step.kind !== 'timer') {
    if (!state.poseReady && poseReadyStreak >= 10) {
      state.poseReady = true;
      if (!state.stepActive) { framePromptEl.style.display = 'none'; beginBtn.disabled = false; beginBtn.style.opacity = '1'; }
    } else if (state.poseReady && poseReadyStreak === 0 && !state.stepActive) {
      state.poseReady = false;
      framePromptEl.style.display = 'block';
      beginBtn.disabled = true; beginBtn.style.opacity = '0.4';
    }
  }

  if (state.debug && debugEl) {
    debugEl.textContent = `step:${state.stepIdx} kind:${step.kind} active:${state.stepActive} coreVis:${coreVis.toFixed(2)}`;
  }

  if (!state.stepActive) return;

  if (step.kind === 'reps') {
    const ex = REP_EXERCISES[step.exercise];
    const phaseBeforeTick = stepFsm.fsmState;
    if (phaseBeforeTick !== 'standing') {
      const warn = ex.liveCheckFn(lm, phaseBeforeTick);
      feedbackEl.textContent = warn || 'In progress…';
      feedbackEl.style.color = warn ? WARN_COLOR : T.sub;
    }
    const completedRep = tickFsm(stepFsm, lm, performance.now(), ex.trackFn, shoulderWidthOf, ex.sampleFn);
    if (completedRep) {
      const rep = ex.scoreRepFn(completedRep);
      stepReps.push(rep);
      setProgressText(`${stepReps.length} / ${step.target}`);
      updateChip(chipEls[0], rep.rom.score);
      updateChip(chipEls[1], rep.stability.score);
      updateChip(chipEls[2], rep.speed.score);
      updateChip(chipEls[3], rep.form.score);
      feedbackEl.textContent = rep.feedback;
      feedbackEl.style.color = rep.hasIssue ? WARN_COLOR : T.sub;
      beep();
      if (stepReps.length >= step.target) finishCurrentStep(false);
    }
  } else if (step.kind === 'hold') {
    const warn = plankLiveFrameCheck(lm);
    feedbackEl.textContent = warn || 'Holding…';
    feedbackEl.style.color = warn ? WARN_COLOR : T.sub;
    plankTick(stepHold, lm, performance.now());
    const heldSeconds = Math.floor(stepHold.activeMs / 1000);
    setProgressText(`${fmt(heldSeconds)} / ${fmt(step.targetSeconds)}`);
    if (stepHold.activeMs >= step.targetSeconds * 1000) {
      const scored = scoreHold(stepHold, step.targetSeconds * 1000, PLANK_EXERCISE);
      updateChip(chipEls[0], scored.holdScore);
      updateChip(chipEls[1], scored.stabilityScore);
      updateChip(chipEls[2], scored.formScore);
      const fb = plankFeedback(scored);
      feedbackEl.textContent = fb.text;
      feedbackEl.style.color = fb.warn ? WARN_COLOR : T.sub;
      beep();
      finishCurrentStep(false);
    }
  }
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
// ?view=progress deep-links straight to the Progress/Evolution screen — lets the AM home screen
// link directly there instead of always landing on the routine's own landing screen first.
if (/[?&]view=progress\b/.test(location.search)) state.view = 'progress';
render();
