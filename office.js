// ═══════════════════════════════════════════════════════
// OFFICE PROGRAM DATA — isometric core reset, 4-week × 2-day/week
// ═══════════════════════════════════════════════════════
const OFFICE_PROGRAM = {
  weeks: 4,
  daysPerWeek: 2,
  rounds: 3,
  restSeconds: 30,
  holdSeconds: [30, 40, 50, 60],
  title: 'Office · Core Reset',
  kicker: 'Isometric strength, no shower needed',
  exercises: [
    { name: 'Plank' },
    { name: 'Wall Sit' },
    { name: 'Dead Bug Hold' },
    { name: 'Glute Bridge Hold' },
    { name: 'Farmer Carry Hold' },
  ],
};

const OFFICE_ROUND_INTENTS = [
  'First pass. Find the position, then hold it.',
  'Second pass. You know the shapes now.',
  "Last pass. Hold what's left to hold.",
];

const OFFICE_ROUND_NAMES = ['1st Round', '2nd Round', '3rd Round'];

const OFFICE_PHRASES = [
  "Fifteen minutes. No shower required.",
  "Twice a week is all this asks.",
  "The chair did the damage. This undoes a little of it.",
  "Quick, quiet, done before anyone notices you left your desk.",
  "No equipment. No sweat. No excuse.",
];

function officeDay() {
  return {
    id: 'office', title: OFFICE_PROGRAM.title, kicker: OFFICE_PROGRAM.kicker, tag: 'OFFICE',
    phases: [0, 1, 2].map(r => ({
      id: `round${r}`, name: OFFICE_ROUND_NAMES[r], intent: OFFICE_ROUND_INTENTS[r],
      exercises: OFFICE_PROGRAM.exercises,
    })),
  };
}

function officeSessionSeconds(week) {
  const hold = OFFICE_PROGRAM.holdSeconds[week - 1];
  const n = OFFICE_PROGRAM.exercises.length * OFFICE_PROGRAM.rounds;
  return n * hold + (n - 1) * OFFICE_PROGRAM.restSeconds;
}

function buildOfficeTimeline(week) {
  const hold = OFFICE_PROGRAM.holdSeconds[week - 1];
  const day = officeDay();
  const out = [];
  day.phases.forEach((ph, pi) => {
    ph.exercises.forEach((ex, ei) => {
      out.push({ phaseIdx:pi, phaseId:ph.id, phaseName:ph.name, intent:ph.intent,
        exIdx:ei, exName:ex.name, variant:`${hold} sec hold`, seconds:hold, kind:'exercise' });
      const isVeryLast = pi === day.phases.length - 1 && ei === ph.exercises.length - 1;
      if (!isVeryLast) {
        out.push({ phaseIdx:pi, phaseId:ph.id, phaseName:ph.name, intent:'',
          exIdx:-1, exName:'Rest', variant:'', seconds:OFFICE_PROGRAM.restSeconds, kind:'rest' });
      }
    });
  });
  return out;
}

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let state = {
  view: 'home',
  week: 1, day: 0,
  timeline: [],
  idx: 0,
  left: 0,
  paused: false,
  progress: {},
};

try { state.progress = JSON.parse(localStorage.getItem('mf.progress') || '{}'); } catch {}

const PROGRESS_PREFIX = 'o';
const TOTAL_SESSIONS = OFFICE_PROGRAM.weeks * OFFICE_PROGRAM.daysPerWeek;

function nextSession() {
  for (let w = 1; w <= OFFICE_PROGRAM.weeks; w++)
    for (let d = 0; d < OFFICE_PROGRAM.daysPerWeek; d++)
      if (!state.progress[`o${w}d${d}`]) return { week: w, day: d };
  return { week: OFFICE_PROGRAM.weeks, day: OFFICE_PROGRAM.daysPerWeek - 1 };
}
let _resumedActiveSession = false;
if (resumeActiveSession()) {
  _resumedActiveSession = true;
} else {
  const ns = nextSession();
  state.week = ns.week; state.day = ns.day;
}

function currentDay() { return officeDay(); }
function buildSessionTimeline() { return buildOfficeTimeline(state.week); }
function defaultSessionSeconds() { return officeSessionSeconds(state.week); }

function pickOfficeMessage(streak, week, total) {
  if (total === 1) return "First office session. Fifteen minutes, no shower required.";
  if (total === TOTAL_SESSIONS) return "Eight sessions. Four weeks of office breaks, done.";
  if (streak === 21) return "Twenty-one days of showing up somewhere. Habit, not willpower.";
  if (streak === 14) return "Two weeks straight. The break is starting to feel normal.";
  if (streak === 10) return "Ten days in a row. The desk didn't win today either.";
  if (streak === 7)  return "A full week without skipping. Most people never start.";
  if (streak === 5)  return "Five in a row. This is just part of the day now.";
  if (streak === 3)  return "Three straight. The chair is starting to notice.";
  if (streak === 2)  return "Two in a row. That's the harder one done.";

  const pool = [
    "Fifteen minutes, no equipment, no sweat. That's the whole point.",
    "The hold gets longer. The excuse doesn't get any better.",
    "Nobody in the office knows you just did this. That's fine.",
    "Core braced, spine long. That's what a desk chair can't teach you.",
    "A quiet fifteen minutes in the middle of the day. Underrated.",
    "Isometric work doesn't look like much from the outside. It adds up anyway.",
    "Still no shower needed. Still counts.",
    `${total} sessions in. Same desk, less damage.`,
    "The body doesn't know it's a work day. It just knows you moved.",
  ];
  return pool[total % pool.length];
}

function pickDoneMessage(streak, week, total) {
  return pickOfficeMessage(streak, week, total);
}

// ═══════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════
function renderOfficeBreakdown(week) {
  const hold = OFFICE_PROGRAM.holdSeconds[week - 1];
  const totalSec = officeSessionSeconds(week);
  const wrap = el('div', ``);
  wrap.appendChild(sectionHeader('Session breakdown'));
  const list = el('div', `margin-top:10px;display:flex;flex-direction:column;gap:4px;`);
  [
    ['Hold time', `${hold} sec / exercise`],
    ['Rounds', `${OFFICE_PROGRAM.rounds} × ${OFFICE_PROGRAM.exercises.length} exercises`],
    ['Rest', `${OFFICE_PROGRAM.restSeconds} sec between`],
    ['Total', `~${Math.round(totalSec / 60)} min`],
  ].forEach(([k, v]) => list.appendChild(renderStat(k, v)));
  wrap.appendChild(list);
  return wrap;
}

function renderHome(root) {
  const day = officeDay();
  const totalDone = Object.keys(state.progress).filter(k => k.startsWith('o')).length;
  const sessionSeconds = officeSessionSeconds(state.week);

  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px)+12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const backBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" stroke="${T.fg}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,2 4,7 10,12"/></svg>`;
  backBtn.onclick = () => { window.location.href = 'index.html'; };
  const hdrTitle = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  hdrTitle.textContent = 'Office · Core Reset';
  hdr.append(backBtn, hdrTitle);

  const scroll = el('div', `flex:1;overflow-y:auto;`);
  const pad = el('div', `padding:8px 22px 0;display:flex;flex-direction:column;gap:22px;`);

  // numeric eyebrow
  const eyebrow = el('div', `display:flex;align-items:baseline;gap:14px;`);
  const mono = el('div', `font-family:${T.mono_ff};font-size:52px;font-weight:500;line-height:0.9;letter-spacing:-2px;color:${T.fg};`);
  const dot = el('span', `color:${T.accent};`); dot.textContent = '·';
  mono.textContent = `W${state.week}`;
  mono.appendChild(dot);
  mono.appendChild(document.createTextNode(`D${state.day+1}`));
  const line = el('div', `flex:1;height:1px;background:${T.hairline};align-self:center;`);
  const cnt = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;`);
  cnt.textContent = `${totalDone}/${TOTAL_SESSIONS}`;
  eyebrow.append(mono, line, cnt);

  // kicker
  const kickerDiv = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  kickerDiv.textContent = `${day.kicker} · ~${Math.round(sessionSeconds / 60)} min`;

  // phrase
  const phraseCard = el('div', `padding:4px 0;`);
  const phraseText = el('div', `font-family:"Instrument Serif",serif;font-size:20px;font-style:italic;line-height:1.35;color:${T.sub};`);
  phraseText.textContent = OFFICE_PHRASES[totalDone % OFFICE_PHRASES.length];
  phraseCard.appendChild(phraseText);

  // BEGIN button
  const beginBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;font-family:${T.display};font-weight:700;font-size:18px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  const beginL = el('span', `display:flex;align-items:center;gap:12px;`);
  beginL.innerHTML = `${iconPlay(T.accentT)} Begin`;
  const beginR = el('span', `font-family:${T.mono_ff};font-size:13px;font-weight:500;`);
  beginR.textContent = fmt(sessionSeconds);
  beginBtn.append(beginL, beginR);
  beginBtn.onclick = startSession;

  const breakdown = renderOfficeBreakdown(state.week);
  const weekSection = renderWeekSection(OFFICE_PROGRAM.daysPerWeek, 'o', pickDay, () => 'OFFICE');
  const progGrid = renderProgressGrid(OFFICE_PROGRAM.weeks, OFFICE_PROGRAM.daysPerWeek, 'o', pickDay);

  pad.append(eyebrow, kickerDiv, phraseCard, beginBtn, breakdown, weekSection, progGrid, el('div', `height:40px;`));
  scroll.appendChild(pad);
  root.append(hdr, scroll);
}

function pickDay(w, d) {
  state.week = w; state.day = d;
  startSession();
}

// ═══════════════════════════════════════════════════════
// RENDER DISPATCH
// ═══════════════════════════════════════════════════════
function render() {
  const root = document.getElementById('root');
  root.innerHTML = '';
  root.style.cssText = `height:100dvh;display:flex;flex-direction:column;background:${T.bg};color:${T.fg};font-family:${T.body};-webkit-font-smoothing:antialiased;overflow:hidden;animation:rise .25s ease;`;

  if (state.view === 'home')         renderHome(root);
  else if (state.view === 'preview') renderPreview(root);
  else if (state.view === 'session') renderSession(root);
  else if (state.view === 'done')    renderDone(root);
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
render();
if (_resumedActiveSession) {
  acquireWakeLock();
  if (state.view === 'session') startTimer();
}
