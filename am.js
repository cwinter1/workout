// ═══════════════════════════════════════════════════════
// AM PROGRAM DATA — 4-week × 3-day/week
// ═══════════════════════════════════════════════════════
const PROGRAM = {
  weeks: 4,
  daysPerWeek: 3,
  phaseShare: { stretch: 4/35, warmup: 5/35, main: 18/35, yoga: 5/35, meditation: 3/35 },
  days: [
    {
      id: 'd1', title: 'Strength · Mobility', kicker: 'Full body bodyweight', tag: 'STRENGTH',
      phases: [
        { id:'stretch', name:'Bend', intent:'Wake up the joints before any load.', exercises:[
          { name:'Cat–Cow',           variants:['8 rounds · slow','10 rounds + breath hold','12 rounds + thread the needle','14 rounds + thoracic rotation'] },
          { name:"World's Greatest",  variants:['4 each side · easy','5 each · with reach','6 each · t-spine open','8 each · linger 2s top'] },
          { name:'Hip 90/90 Switch',  variants:['6 switches · slow','8 switches · lift hand','8 + forward fold','10 + transition lunge'] },
        ]},
        { id:'warmup', name:'Warm-up', intent:'Get the heart rate honest.', exercises:[
          { name:'Jumping Jacks', variants:['30 sec','40 sec','50 sec','60 sec · arm cross'] },
          { name:'Arm Circles',   variants:['20 fwd / 20 back','30 / 30','40 / 40','40 / 40 + scap pull'] },
          { name:'High Knees',    variants:['30 sec','40 sec','45 sec','60 sec · arms drive'] },
        ]},
        { id:'main', name:'Main Set', intent:'3 rounds. Move with control.', exercises:[
          { name:'Push-Up',                 variants:['Knees · 8 reps','Incline · 10 reps','Standard · 10 reps','Decline · 8 reps · 3s down'] },
          { name:'Squat',                    variants:['Bodyweight · 12','Tempo 3-1-1 · 10','Split Squat · 8 each','Bulgarian · 8 each · pause'] },
          { name:'Bent-over Row',            variants:['Backpack 2kg · 10','Backpack 4kg · 10','Backpack 6kg · 12','Backpack 8kg · 12 · slow'] },
          { name:'Glute Bridge',             variants:['2-leg · 12','2-leg + hold 3s · 10','Single-leg · 8 each','Single-leg + hold 3s · 8 each'] },
          { name:'Dead Bug',                 variants:['6 each side','8 each · tempo','10 each · long lever','10 each · band pull'] },
          { name:'Wall Sit',                 variants:['30 sec · feet parallel','40 sec · feet parallel','45 sec · single leg 15s each','60 sec · single leg 20s each'] },
          { name:'Terminal Knee Extension',  variants:['12 each leg · band light','15 each · band light','15 each · band medium · 2s hold','20 each · band medium · 2s hold'] },
        ]},
        { id:'yoga', name:'Yoga Cool-down', intent:'Tell the body the work is done.', exercises:[
          { name:"Child's Pose",    variants:['60 sec','75 sec','90 sec · side reach','90 sec · twisted'] },
          { name:'Down Dog → Cobra',variants:['5 rounds','6 rounds','8 rounds','8 rounds · 3s hold'] },
          { name:'Pigeon',          variants:['45 sec each','60 sec each','75 sec each · fold','90 sec each · bind'] },
        ]},
        { id:'meditation', name:'Meditation', intent:'Box breathing. 3 minutes of clear.', exercises:[
          { name:'Box Breath', variants:['4·4·4·4','4·4·4·4','5·5·5·5','6·6·6·6'] },
        ]},
      ],
    },
    {
      id: 'd2', title: 'Posture · Desk Recovery', kicker: 'Undo the chair', tag: 'POSTURE',
      phases: [
        { id:'stretch', name:'Bend', intent:'Open what sitting closed.', exercises:[
          { name:'Chin Tucks',    variants:['10 reps','12 reps · 2s hold','15 · 3s hold','15 · 5s hold'] },
          { name:'Thoracic Ext.',variants:['5 reps on roll','8 reps','10 reps · arms long','10 reps + breath'] },
          { name:'Doorway Pec',  variants:['30 sec each','45 sec each','60 sec each','60 sec + breath'] },
        ]},
        { id:'warmup', name:'Warm-up', intent:'Gentle activation.', exercises:[
          { name:'Scapular CARs', variants:['5 each direction','6 each','8 each · slow','10 each · slow'] },
          { name:'Wall Slide',    variants:['10 reps','12 reps','15 reps','15 reps · band'] },
          { name:'Inchworm',       variants:['4 reps slow','5 reps · pause at plank','6 reps + push-up at bottom','8 reps + push-up at bottom'] },
        ]},
        { id:'main', name:'Main Set', intent:'3 rounds. Posture under load.', exercises:[
          { name:'Band Pull-Apart',   variants:['15 reps · light','20 reps · light','15 reps · medium','20 reps · medium'] },
          { name:'Y-T-W on Floor',   variants:['5 each','6 each','8 each','8 each · 2s top'] },
          { name:'Wall Angels',      variants:['8 slow','10 slow','12 slow','15 slow · pause'] },
          { name:'Glute Bridge',     variants:['12','15 · 2s hold','Single-leg · 8 each','Single-leg · 10 each'] },
          { name:'Bird Dog',         variants:['8 each','10 each · 2s hold','10 each + diagonal pulse','12 each + reach'] },
          { name:'Straight Leg Raise',variants:['8 each · slow','10 each · 2s hold top','12 each · 3s hold top','15 each · 3s hold + ankle weight optional'] },
        ]},
        { id:'yoga', name:'Yoga Cool-down', intent:'Lengthen the front, settle the spine.', exercises:[
          { name:'Sphinx',           variants:['60 sec','75 sec','90 sec','90 sec + breath'] },
          { name:'Seated Twist',     variants:['45 sec each','60 sec each','75 sec each','90 sec each'] },
          { name:'Legs Up The Wall', variants:['60 sec','90 sec','120 sec','180 sec'] },
        ]},
        { id:'meditation', name:'Meditation', intent:'3 min · clear the head.', exercises:[
          { name:'Box Breath', variants:['4·4·4·4','4·4·4·4','5·5·5·5','6·6·6·6'] },
        ]},
      ],
    },
    {
      id: 'd3', title: 'Yoga · Active Recovery', kicker: 'A whole session of bend', tag: 'YOGA',
      phases: [
        { id:'stretch', name:'Bend', intent:'Land in the body.', exercises:[
          { name:'Belly Breathing', variants:['10 breaths','12 breaths','15 breaths','15 breaths · 6s exhale'] },
          { name:'Neck Rolls',      variants:['5 each way','6 each way','8 each way','10 each way'] },
          { name:'Ankle Circles',   variants:['10 each way','15 each','20 each','20 each · weighted'] },
        ]},
        { id:'warmup', name:'Sun A', intent:'Build heat through the spine.', exercises:[
          { name:'Surya A',       variants:['3 rounds','4 rounds','5 rounds','6 rounds · linger downdog'] },
          { name:'Standing Fold', variants:['45 sec','60 sec','75 sec','90 sec · ragdoll sway'] },
        ]},
        { id:'main', name:'Standing Flow', intent:'Hold, breathe, transition.', exercises:[
          { name:'Warrior II',    variants:['30 sec each','40 sec each','50 sec each','60 sec each · arms long'] },
          { name:'Triangle',      variants:['30 sec each','40 sec each','45 sec each','60 sec each'] },
          { name:'Tree Pose',     variants:['30 sec each','40 sec each','45 sec · arms up','60 sec · eyes closed'] },
          { name:'Chair → Twist', variants:['20 sec + 20 each','30 + 30 each','40 + 40 each','45 + 45 each'] },
          { name:'Bridge',        variants:['45 sec','60 sec','75 sec','90 sec · pulse'] },
        ]},
        { id:'yoga', name:'Floor Finish', intent:'Soft, low, slow.', exercises:[
          { name:'Happy Baby',   variants:['45 sec','60 sec','75 sec','90 sec'] },
          { name:'Supine Twist', variants:['45 sec each','60 sec each','75 sec each','90 sec each'] },
          { name:'Savasana',     variants:['90 sec','120 sec','150 sec','180 sec'] },
        ]},
        { id:'meditation', name:'Meditation', intent:'Sit. Breathe. Done.', exercises:[
          { name:'Box Breath', variants:['4·4·4·4','4·4·4·4','5·5·5·5','6·6·6·6'] },
        ]},
      ],
    },
  ],
};

const COACH_CUES = {
  STRENGTH: [
    "Control the movement. Don't rush it.",
    "Breathe out on the effort.",
    "Shoulders down, core tight.",
    "Last rep counts the same as the first.",
    "Full range. Don't cheat the bottom.",
    "You're building something. Stay with it.",
    "Slow down the lowering phase.",
    "Form first. Intensity is a reward, not a shortcut.",
  ],
  POSTURE: [
    "Feel the stretch before you go deeper.",
    "Let gravity do the work.",
    "Chin tucked. Shoulders wide.",
    "This is the undoing. Let it happen slowly.",
    "Slow breath into the tight spot.",
  ],
  YOGA: [
    "Breath first, then depth.",
    "Every exhale, sink a little further.",
    "Stillness is the practice.",
    "No forcing. Find the edge and stay there.",
    "Let the floor hold you completely.",
  ],
};

const HOME_PHRASES = [
  "Thirty-five minutes. The rest of the day is yours.",
  "The hardest part is starting. You're already here.",
  "Your future self doesn't care how you felt this morning.",
  "Three days a week. That's all this asks.",
  "The desk will wait. The body won't.",
  "Show up. The results are a side effect.",
  "You don't negotiate with the morning. You just move.",
  "Movement is the answer to most of what's wrong.",
  "This is the one thing today that's entirely for you.",
  "Four weeks. You're inside it now.",
];

function phaseSeconds(totalMin) {
  const s = PROGRAM.phaseShare, total = totalMin * 60;
  return {
    stretch: Math.round(total * s.stretch),
    warmup:  Math.round(total * s.warmup),
    main:    Math.round(total * s.main),
    yoga:    Math.round(total * s.yoga),
    meditation: 180,
  };
}

function buildTimeline(dayIdx, week, totalMin) {
  const day = PROGRAM.days[dayIdx];
  const totals = phaseSeconds(totalMin);
  const out = [];
  day.phases.forEach((ph, pi) => {
    if (ph.id === 'meditation') {
      out.push({ phaseIdx:pi, phaseId:ph.id, phaseName:ph.name, intent:ph.intent,
        exIdx:0, exName:ph.exercises[0].name, variant:ph.exercises[0].variants[week-1],
        seconds:totals.meditation, kind:'meditation' });
      return;
    }
    const each = Math.max(20, Math.round(totals[ph.id] / ph.exercises.length));
    ph.exercises.forEach((ex, ei) => {
      out.push({ phaseIdx:pi, phaseId:ph.id, phaseName:ph.name, intent:ph.intent,
        exIdx:ei, exName:ex.name, variant:ex.variants[week-1], seconds:each, kind:'exercise' });
      if (ph.id === 'main' && ei < ph.exercises.length - 1) {
        out.push({ phaseIdx:pi, phaseId:ph.id, phaseName:ph.name, intent:'',
          exIdx:-1, exName:'Rest', variant:'', seconds:30, kind:'rest' });
      }
    });
  });
  return out;
}

const SESSION_MIN = 35;

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

const PROGRESS_PREFIX = 'w';
const TOTAL_SESSIONS = 12;

function nextSession() {
  for (let w = 1; w <= PROGRAM.weeks; w++)
    for (let d = 0; d < PROGRAM.daysPerWeek; d++)
      if (!state.progress[`w${w}d${d}`]) return { week: w, day: d };
  return { week: PROGRAM.weeks, day: PROGRAM.daysPerWeek - 1 };
}
let _resumedActiveSession = false;
if (resumeActiveSession()) {
  _resumedActiveSession = true;
} else {
  const ns = nextSession();
  state.week = ns.week; state.day = ns.day;
}

function currentDay() { return PROGRAM.days[state.day]; }
function buildSessionTimeline() { return buildTimeline(state.day, state.week, SESSION_MIN); }
function defaultSessionSeconds() { return SESSION_MIN * 60; }

function pickMessage(streak, week, dayTag, total) {
  // Milestone streaks — exact matches first
  if (total === 1)   return "First one done. Now it's real.";
  if (total === 12)  return "Twelve sessions. You finished the program.";
  if (streak === 21) return "Twenty-one days. The research says it's a habit by now. The research is right.";
  if (streak === 14) return "Two weeks without a gap. Most people quit before this.";
  if (streak === 10) return "Ten days straight. That's not momentum — that's a new baseline.";
  if (streak === 7)  return "A full week. Most people have already stopped. You haven't.";
  if (streak === 5)  return "Five in a row. You're not deciding anymore — you're just doing it.";
  if (streak === 3)  return "Three straight. Your body is starting to expect this.";
  if (streak === 2)  return "Two in a row. The second one is the one that matters.";

  // Week + day-type combos — a bit of context about what they just did
  const combo = `${week}-${dayTag}`;
  const comboMessages = {
    '1-STRENGTH': "Week one, strength day. The baseline is set.",
    '1-POSTURE':  "Posture work on day two. The desk undone.",
    '1-YOGA':     "First yoga session behind you. That one's about patience, not performance.",
    '2-STRENGTH': "Second week, first strength day. The numbers don't lie yet — but they will.",
    '2-POSTURE':  "Posture day again. You're reinforcing something that took years to build wrong.",
    '2-YOGA':     "Week two yoga done. The range of motion is already shifting, even if you can't feel it.",
    '3-STRENGTH': "Three weeks of strength work. You're past the point where it was a question.",
    '3-POSTURE':  "Posture work, week three. Your body is relearning what upright feels like.",
    '3-YOGA':     "Week three yoga. The poses that felt unfamiliar in week one are starting to settle.",
    '4-STRENGTH': "Final strength day. This is what four weeks of showing up looks like.",
    '4-POSTURE':  "Last posture session. You've done the quiet work. It compounds.",
    '4-YOGA':     "Last yoga session of the program. You built something real here.",
  };
  if (comboMessages[combo]) return comboMessages[combo];

  // General methodology pool — why this stuff works, without being a coach
  const pool = [
    "Mobility work is the tax you pay so strength training doesn't break you.",
    "The posture session isn't the glamorous one. It's also the one most people skip.",
    "You don't build fitness in the sessions. You build it in the recovery between them.",
    "Ten minutes of this a day is worth more than an hour you only do twice a month.",
    "The body adapts to what you consistently ask of it. You're asking.",
    "Consistency without intensity beats intensity without consistency. Every time.",
    "Done. Another session you'll never have to do for the first time again.",
    "Quiet work. No drama. This is what it looks like.",
    "The streak is a byproduct. The practice is the thing.",
    `${total} sessions. You keep showing up.`,
    "Another one in the books. It adds up whether you feel it today or not.",
    "Not every session feels good. This one counts the same.",
    "The gap between wanting to and doing it is exactly this — showing up when you don't have to.",
    "One more session behind you. That's the whole job.",
  ];
  return pool[total % pool.length];
}

function pickDoneMessage(streak, week, total) {
  return pickMessage(streak, week, currentDay().tag, total);
}

// ═══════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════
function renderPhaseChips(day) {
  const totals = phaseSeconds(SESSION_MIN);
  const wrap = el('div', ``);
  wrap.appendChild(sectionHeader('Session breakdown'));
  const list = el('div', `margin-top:10px;display:flex;flex-direction:column;gap:4px;`);
  day.phases.forEach((ph, i) => {
    const mins = ph.id === 'meditation' ? 3 : Math.round(totals[ph.id] / 60);
    const pct = Math.min(100, (mins / SESSION_MIN) * 100);
    const row = el('div', `display:flex;align-items:center;gap:8px;`);
    const num = el('span', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};width:18px;letter-spacing:1px;`);
    num.textContent = `0${i+1}`;
    const name = el('span', `font-family:${T.display};font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`);
    name.textContent = ph.name;
    const bar = el('div', `flex:1;height:6px;background:${T.pill};border-radius:2px;position:relative;`);
    const fill = el('div', `position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${i === day.phases.length-1 ? T.accent : T.fg};border-radius:2px;`);
    bar.appendChild(fill);
    const time = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};width:28px;text-align:right;`);
    time.textContent = `${mins}m`;
    row.append(num, name, bar, time);
    list.appendChild(row);
  });
  wrap.appendChild(list);
  return wrap;
}

function renderHome(root) {
  const day = PROGRAM.days[state.day];
  const totalDone = Object.keys(state.progress).filter(k => k.startsWith('w')).length;

  const scroll = el('div', `flex:1;overflow-y:auto;padding-top:calc(env(safe-area-inset-top,12px) + 16px);`);
  const pad = el('div', `padding:0 22px;display:flex;flex-direction:column;gap:22px;`);

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

  // day title
  const titleWrap = el('div', ``);
  const parts = day.title.split(' · ');
  const titleDiv = el('div', `font-family:${T.display};font-size:44px;font-weight:700;line-height:0.95;text-transform:uppercase;letter-spacing:-1.2px;`);
  parts.forEach((p, i) => {
    const d2 = el('div', i === 1 ? `color:${T.accent};` : '');
    d2.textContent = p;
    titleDiv.appendChild(d2);
  });
  const kickerDiv = el('div', `margin-top:8px;font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  kickerDiv.textContent = `${day.kicker} · ${SESSION_MIN} min`;
  titleWrap.append(titleDiv, kickerDiv);

  // Garmin sleep card
  const todayStr = dateKey();
  const todayGarmin = loadGarmin().find(g => g.type === 'pre' && g.date === todayStr) || {};
  const sleepCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:8px;padding:14px 16px;`);
  const sleepHdr = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;`);
  sleepHdr.textContent = 'Garmin — last night';
  const sleepFields = el('div', `display:flex;gap:16px;`);

  const mkSleepField = (label, inp) => {
    const wrap = el('div', `flex:1;`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${T.mono};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;`);
    lbl.textContent = label;
    wrap.append(lbl, inp);
    return wrap;
  };
  const inpStyle = `background:transparent;border:none;border-bottom:1px solid ${T.hairline};outline:none;font-family:${T.display};font-weight:700;font-size:24px;color:${T.fg};width:100%;padding:2px 0;`;

  const scoreInp = el('input', inpStyle);
  scoreInp.type = 'number'; scoreInp.min = 0; scoreInp.max = 100; scoreInp.placeholder = '76';
  if (todayGarmin.sleepScore != null) scoreInp.value = todayGarmin.sleepScore;

  const sleepTimeRow = el('div', `display:flex;align-items:baseline;gap:4px;`);
  const hInp = el('input', inpStyle + 'width:44px;');
  hInp.type = 'number'; hInp.min = 0; hInp.max = 12; hInp.placeholder = '7';
  if (todayGarmin.sleepHours != null) hInp.value = todayGarmin.sleepHours;
  const hLbl = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};`);
  hLbl.textContent = 'h';
  const mInp = el('input', inpStyle + 'width:44px;');
  mInp.type = 'number'; mInp.min = 0; mInp.max = 59; mInp.placeholder = '30';
  if (todayGarmin.sleepMins != null) mInp.value = todayGarmin.sleepMins;
  const mLbl = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};`);
  mLbl.textContent = 'm';
  sleepTimeRow.append(hInp, hLbl, mInp, mLbl);

  const saveSleep = () => {
    const score = parseFloat(scoreInp.value);
    const hours = parseInt(hInp.value);
    const mins  = parseInt(mInp.value);
    if (isNaN(score) && isNaN(hours) && isNaN(mins)) return;
    const garmin = loadGarmin().filter(g => !(g.type === 'pre' && g.date === todayStr));
    const entry = { type: 'pre', date: todayStr, at: Date.now() };
    if (!isNaN(score)) entry.sleepScore = score;
    if (!isNaN(hours)) entry.sleepHours = hours;
    if (!isNaN(mins))  entry.sleepMins  = mins;
    garmin.push(entry);
    saveGarmin(garmin);
  };
  scoreInp.onchange = saveSleep;
  hInp.onchange = saveSleep;
  mInp.onchange = saveSleep;

  sleepFields.append(mkSleepField('Sleep score', scoreInp), mkSleepField('Sleep time', sleepTimeRow));
  sleepCard.append(sleepHdr, sleepFields);

  // BEGIN button
  const beginBtn = el('button', `appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;font-family:${T.display};font-weight:700;font-size:18px;letter-spacing:0.5px;text-transform:uppercase;width:100%;`);
  const beginL = el('span', `display:flex;align-items:center;gap:12px;`);
  beginL.innerHTML = `${iconPlay(T.accentT)} Begin`;
  const beginR = el('span', `font-family:${T.mono_ff};font-size:13px;font-weight:500;`);
  beginR.textContent = `${SESSION_MIN}:00`;
  beginBtn.append(beginL, beginR);
  beginBtn.onclick = startSession;

  // Squat Form Coach — placed right under Begin so it's visible without scrolling (previously
  // buried at the bottom of bottomLinks, below Program/Office/Q·Flow/Measurements, which read as
  // "no link" to a quick glance). Styled with an accent border, not the plain hairline used by
  // the other nav links below, since it's a distinct feature (a live camera tool), not another
  // page in the same "browse my program" family as Program/Measurements.
  const squatCard = el('button', `appearance:none;border:1px solid ${T.accent};background:transparent;color:${T.fg};border-radius:6px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;width:100%;`);
  const squatCardL = el('div', ``);
  const squatCardTitle = el('div', `font-family:${T.display};font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;`);
  squatCardTitle.textContent = 'Squat Form Coach';
  const squatCardSub = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1px;margin-top:4px;`);
  squatCardSub.textContent = 'Camera-based rep scoring';
  squatCardL.append(squatCardTitle, squatCardSub);
  const squatCardIcon = el('span', `opacity:0.8;flex-shrink:0;`);
  squatCardIcon.innerHTML = iconArrow(T.accent);
  squatCard.append(squatCardL, squatCardIcon);
  squatCard.onclick = () => { window.location.href = 'squat-coach.html'; };

  // phase breakdown
  const phaseBreak = renderPhaseChips(day);

  // This week
  const weekSection = renderWeekSection(PROGRAM.daysPerWeek, 'w', pickDay, d2 => PROGRAM.days[d2].tag);

  // 4-week progress grid
  const progGrid = renderProgressGrid(PROGRAM.weeks, PROGRAM.daysPerWeek, 'w', pickDay);

  // Full program link + office link + measurements link
  const bottomLinks = el('div', `display:flex;flex-direction:column;gap:8px;`);
  const progBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 16px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;width:100%;`);
  progBtn.innerHTML = `<span>4-week program</span><span style="opacity:0.6">${iconArrow(T.fg)}</span>`;
  progBtn.onclick = () => { state.view = 'program'; render(); };
  const officeBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 16px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;width:100%;`);
  officeBtn.innerHTML = `<span>Office · Core Reset</span><span style="opacity:0.6">${iconArrow(T.fg)}</span>`;
  officeBtn.onclick = () => { window.location.href = 'office.html'; };
  const qflowBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 16px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;width:100%;`);
  qflowBtn.innerHTML = `<span>Q·Flow</span><span style="opacity:0.6">${iconArrow(T.fg)}</span>`;
  qflowBtn.onclick = () => { window.location.href = 'https://cwinter1.github.io/workflow-Qigong/'; };
  const measBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 16px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;width:100%;`);
  measBtn.innerHTML = `<span>Measurements</span><span style="opacity:0.6">${iconArrow(T.fg)}</span>`;
  measBtn.onclick = () => { state.view = 'measurements'; render(); };
  bottomLinks.append(progBtn, officeBtn, qflowBtn, measBtn);

  const phraseCard = el('div', `padding:12px 0;`);
  const phraseText = el('div', `font-family:"Instrument Serif",serif;font-size:20px;font-style:italic;line-height:1.35;color:${T.sub};`);
  phraseText.textContent = HOME_PHRASES[totalDone % HOME_PHRASES.length];
  phraseCard.appendChild(phraseText);

  pad.append(eyebrow, titleWrap, phraseCard, sleepCard, beginBtn, squatCard, phaseBreak, weekSection, progGrid, bottomLinks, el('div', `height:40px;`));
  scroll.appendChild(pad);
  root.appendChild(scroll);
}

function pickDay(w, d) {
  state.week = w; state.day = d;
  startSession();
}

// ═══════════════════════════════════════════════════════
// MEASUREMENTS
// ═══════════════════════════════════════════════════════
function renderMeasurements(root) {
  const measurements = loadMeasurements();
  const first = measurements[0];
  const latest = measurements[measurements.length - 1];

  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px)+12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const backBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" stroke="${T.fg}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,2 4,7 10,12"/></svg>`;
  backBtn.onclick = () => { state.view = 'home'; render(); };
  const hdrTitle = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  hdrTitle.textContent = 'Measurements';
  hdr.append(backBtn, hdrTitle);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:0 22px;`);
  const body = el('div', `display:flex;flex-direction:column;gap:24px;padding-bottom:40px;margin-top:8px;`);

  // delta summary (if more than one entry)
  if (measurements.length >= 2) {
    const deltaSection = el('div', ``);
    deltaSection.appendChild(sectionHeader('Change since start'));
    const grid = el('div', `margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;`);
    const fields = [['Weight', 'weight', 'kg'], ['Waist', 'waist', 'cm'], ['Hips', 'hips', 'cm'], ['Resting HR', 'hr', 'bpm']];
    fields.forEach(([label, key, unit]) => {
      if (latest[key] == null || first[key] == null) return;
      const delta = latest[key] - first[key];
      const sign = delta > 0 ? '+' : '';
      const card = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:14px;`);
      const lbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
      lbl.textContent = label;
      const val = el('div', `font-family:${T.display};font-weight:700;font-size:22px;margin-top:6px;`);
      val.textContent = `${latest[key]} ${unit}`;
      const diff = el('div', `font-family:${T.mono_ff};font-size:11px;margin-top:4px;color:${delta === 0 ? T.mono : delta < 0 ? T.accent : '#c07a7a'};`);
      diff.textContent = `${sign}${delta} from start`;
      card.append(lbl, val, diff);
      grid.appendChild(card);
    });
    deltaSection.appendChild(grid);
    body.appendChild(deltaSection);
  }

  // entry form
  const formSection = el('div', ``);
  formSection.appendChild(sectionHeader('Log today'));
  const form = el('div', `margin-top:10px;display:flex;flex-direction:column;gap:8px;background:${T.card};border:1px solid ${T.hairline};border-radius:8px;padding:16px;`);

  const fields = [
    { key: 'weight', label: 'Weight (kg)',    type: 'number', step: '0.1', placeholder: '72.5' },
    { key: 'waist',  label: 'Waist (cm)',     type: 'number', step: '0.5', placeholder: '85' },
    { key: 'hips',   label: 'Hips (cm)',      type: 'number', step: '0.5', placeholder: '95' },
    { key: 'hr',     label: 'Resting HR',     type: 'number', step: '1',   placeholder: '62' },
  ];
  const inputs = {};
  fields.forEach(f => {
    const row = el('div', `display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${T.hairline};`);
    const lbl = el('label', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
    lbl.textContent = f.label;
    const inp = el('input', `background:transparent;border:none;outline:none;font-family:${T.display};font-weight:700;font-size:18px;color:${T.fg};width:100px;text-align:right;`);
    inp.type = f.type; inp.step = f.step; inp.placeholder = f.placeholder;
    // Pre-fill from latest entry
    if (latest?.[f.key] != null) inp.value = latest[f.key];
    inputs[f.key] = inp;
    row.append(lbl, inp);
    form.appendChild(row);
  });

  // energy row
  const energyRow = el('div', `display:flex;align-items:center;justify-content:space-between;padding:10px 0;`);
  const energyLbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  energyLbl.textContent = 'Energy (1-5)';
  let energyVal = 3;
  const energyBtns = el('div', `display:flex;gap:6px;`);
  [1,2,3,4,5].forEach(n => {
    const b = el('button', `appearance:none;border:none;width:32px;height:32px;border-radius:4px;font-family:${T.mono_ff};font-size:12px;font-weight:600;cursor:pointer;`);
    b.textContent = n;
    b.dataset.n = n;
    b.style.background = n === energyVal ? T.accent : T.pill;
    b.style.color = n === energyVal ? T.accentT : T.fg;
    b.onclick = () => {
      energyVal = n;
      energyBtns.querySelectorAll('button').forEach(btn => {
        const v = parseInt(btn.dataset.n);
        btn.style.background = v === energyVal ? T.accent : T.pill;
        btn.style.color = v === energyVal ? T.accentT : T.fg;
      });
    };
    energyBtns.appendChild(b);
  });
  energyRow.append(energyLbl, energyBtns);
  form.appendChild(energyRow);
  formSection.appendChild(form);

  const saveBtn = el('button', `margin-top:10px;appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:16px 22px;font-family:${T.display};font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;width:100%;`);
  saveBtn.textContent = 'Save entry';
  saveBtn.onclick = () => {
    const entry = { date: new Date().toISOString(), energy: energyVal };
    fields.forEach(f => { const v = parseFloat(inputs[f.key].value); if (!isNaN(v)) entry[f.key] = v; });
    const list = loadMeasurements();
    list.push(entry);
    saveMeasurements(list);
    state.view = 'measurements';
    render();
  };
  formSection.appendChild(saveBtn);
  body.append(formSection);

  // history
  if (measurements.length) {
    const garminAll = loadGarmin();
    const histSection = el('div', ``);
    histSection.appendChild(sectionHeader('History'));
    const histList = el('div', `margin-top:10px;display:flex;flex-direction:column;gap:6px;`);
    [...measurements].reverse().slice(0, 8).forEach(m => {
      const dKey = dateKey(new Date(m.date).getTime());
      const gPre  = garminAll.find(g => g.type === 'pre'  && g.date === dKey) || {};
      const gPost = garminAll.find(g => g.type === 'post' && g.date === dKey) || {};
      const row = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:12px 14px;`);
      const top2 = el('div', `display:flex;align-items:baseline;justify-content:space-between;`);
      const dateStr = new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const d = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1px;`);
      d.textContent = dateStr;
      const vals = el('div', `font-family:${T.display};font-size:13px;font-weight:600;color:${T.fg};`);
      const parts2 = [];
      if (m.weight) parts2.push(`${m.weight}kg`);
      if (m.waist)  parts2.push(`${m.waist}cm`);
      if (m.energy) parts2.push(`E${m.energy}`);
      vals.textContent = parts2.join(' · ');
      top2.append(d, vals);
      row.appendChild(top2);
      // garmin sub-row
      const garminParts = [];
      if (gPre.sleepScore != null) garminParts.push(`Sleep ${gPre.sleepScore}`);
      if (gPre.sleepHours != null || gPre.sleepMins != null) {
        const h = gPre.sleepHours ?? 0, mn = gPre.sleepMins ?? 0;
        garminParts.push(`${h}h${mn > 0 ? mn + 'm' : ''}`);
      }
      if (gPost.calories != null) garminParts.push(`${gPost.calories} kcal`);
      if (garminParts.length) {
        const sub = el('div', `margin-top:5px;font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1px;`);
        sub.textContent = garminParts.join(' · ');
        row.appendChild(sub);
      }
      histList.appendChild(row);
    });
    histSection.appendChild(histList);
    body.appendChild(histSection);
  }

  // photo timeline — sessions that have a progress photo
  const sessionsWithPhotos = loadSessions().filter(s => s.photo);
  if (sessionsWithPhotos.length) {
    const photoSection = el('div', ``);
    photoSection.appendChild(sectionHeader('Progress photos'));
    const strip = el('div', `margin-top:10px;display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;`);
    strip.style.scrollbarWidth = 'none';
    [...sessionsWithPhotos].reverse().forEach(s => {
      const cell = el('div', `flex-shrink:0;display:flex;flex-direction:column;gap:4px;align-items:center;`);
      const img = document.createElement('img');
      img.src = s.photo;
      img.style.cssText = `width:72px;height:72px;border-radius:6px;object-fit:cover;border:1px solid ${T.hairline};`;
      const dateLbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${T.mono};letter-spacing:1px;text-align:center;`);
      dateLbl.textContent = new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const tagLbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${T.accent};letter-spacing:1px;`);
      tagLbl.textContent = `W${s.week}D${s.day + 1}`;
      cell.append(img, dateLbl, tagLbl);
      strip.appendChild(cell);
    });
    photoSection.appendChild(strip);
    body.appendChild(photoSection);
  }

  // Sheets sync URL card
  const syncSection = el('div', ``);
  syncSection.appendChild(sectionHeader('Google Sheets sync'));
  const syncCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:8px;padding:14px 16px;`);
  const syncInp = el('input', `background:transparent;border:none;border-bottom:1px solid ${T.hairline};outline:none;font-size:13px;color:${T.fg};width:100%;padding:4px 0;`);
  syncInp.type = 'url'; syncInp.placeholder = 'Paste Apps Script /exec URL…';
  syncInp.value = loadSyncUrl();
  syncInp.addEventListener('change', () => saveSyncUrl(syncInp.value.trim()));
  const syncNote = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};margin-top:8px;letter-spacing:0.5px;`);
  syncNote.textContent = 'After Bank it, session data is sent to your sheet.';
  syncCard.append(syncInp, syncNote);
  syncSection.appendChild(syncCard);
  body.appendChild(syncSection);

  scroll.appendChild(body);
  root.append(hdr, scroll);
}

// ═══════════════════════════════════════════════════════
// PROGRAM
// ═══════════════════════════════════════════════════════
function renderProgram(root) {
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px)+12px) 22px 12px;display:flex;align-items:center;gap:14px;flex-shrink:0;`);
  const backBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" stroke="${T.fg}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,2 4,7 10,12"/></svg>`;
  backBtn.onclick = () => { state.view = 'home'; render(); };
  const title = el('div', `font-family:${T.display};font-weight:700;font-size:22px;text-transform:uppercase;letter-spacing:0.5px;`);
  title.textContent = '4-Week Program';
  hdr.append(backBtn, title);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:0 22px;`);
  const body = el('div', `display:flex;flex-direction:column;gap:28px;padding-bottom:40px;margin-top:8px;`);

  PROGRAM.days.forEach((day, di) => {
    const daySection = el('div', ``);
    const dayHdr = el('div', `margin-bottom:14px;`);
    const dayTag = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
    dayTag.textContent = `Day ${di + 1} · ${day.tag}`;
    const dayTitle = el('div', `font-family:${T.display};font-weight:700;font-size:28px;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;margin-top:4px;`);
    dayTitle.textContent = day.title;
    const daySub = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};margin-top:4px;letter-spacing:1px;`);
    daySub.textContent = day.kicker;
    dayHdr.append(dayTag, dayTitle, daySub);

    const phaseList = el('div', `display:flex;flex-direction:column;gap:6px;`);
    day.phases.forEach(ph => {
      const phCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:14px;`);
      const phHdr = el('div', `display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;`);
      const phName = el('div', `font-family:${T.display};font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;`);
      phName.textContent = ph.name;
      const phIntent = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:0.5px;max-width:200px;text-align:right;`);
      phIntent.textContent = ph.intent;
      phHdr.append(phName, phIntent);

      const exList = el('div', `display:flex;flex-direction:column;gap:4px;`);
      ph.exercises.forEach((ex, ei) => {
        const row = el('div', `display:flex;align-items:baseline;gap:8px;`);
        const num = el('span', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1px;flex-shrink:0;`);
        num.textContent = `${ei+1}.`;
        const name = el('span', `font-size:13px;color:${T.fg};`);
        name.textContent = ex.name;
        const week1 = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};margin-left:auto;flex-shrink:0;`);
        week1.textContent = `W1: ${ex.variants[0]}`;
        row.append(num, name, week1);
        exList.appendChild(row);
      });
      phCard.append(phHdr, exList);
      phaseList.appendChild(phCard);
    });

    // week progression for this day
    const weekProg = el('div', `margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;`);
    [1,2,3,4].forEach(w => {
      const done = !!state.progress[`w${w}d${di}`];
      const btn = el('button', `border:none;background:${done ? T.accent : T.pill};color:${done ? T.accentT : T.mono};border-radius:4px;padding:10px 6px;font-family:${T.mono_ff};font-size:10px;letter-spacing:1px;text-transform:uppercase;`);
      btn.textContent = done ? `W${w} ✓` : `W${w}`;
      btn.onclick = () => pickDay(w, di);
      weekProg.appendChild(btn);
    });

    daySection.append(dayHdr, phaseList, weekProg);
    body.appendChild(daySection);
  });

  scroll.appendChild(body);
  root.append(hdr, scroll);
}

// ═══════════════════════════════════════════════════════
// RENDER DISPATCH
// ═══════════════════════════════════════════════════════
function render() {
  const root = document.getElementById('root');
  root.innerHTML = '';
  root.style.cssText = `height:100dvh;display:flex;flex-direction:column;background:${T.bg};color:${T.fg};font-family:${T.body};-webkit-font-smoothing:antialiased;overflow:hidden;animation:rise .25s ease;`;

  if (state.view === 'home')              renderHome(root);
  else if (state.view === 'preview')      renderPreview(root);
  else if (state.view === 'session')      renderSession(root);
  else if (state.view === 'done')         renderDone(root);
  else if (state.view === 'program')      renderProgram(root);
  else if (state.view === 'measurements') renderMeasurements(root);
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
render();
if (_resumedActiveSession) {
  acquireWakeLock();
  if (state.view === 'session') startTimer();
}
