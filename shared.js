// ═══════════════════════════════════════════════════════
// PALETTE & THEME — B · Restore · Dark
// ═══════════════════════════════════════════════════════
const T = {
  bg:      '#0e1116',
  fg:      '#e8e5dd',
  sub:     '#8a8478',
  card:    '#16191e',
  cardLine:'rgba(255,255,255,0.06)',
  accent:  '#7aa676',
  accentT: '#0e1116',
  hairline:'rgba(255,255,255,0.12)',
  mono:    'rgba(232,229,221,0.65)',
  pill:    'rgba(255,255,255,0.06)',
  display: '"Space Grotesk", system-ui, sans-serif',
  body:    '"Manrope", system-ui, sans-serif',
  mono_ff: '"JetBrains Mono", ui-monospace, monospace',
};

// ═══════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════
function el(tag, style) {
  const e = document.createElement(tag);
  if (style) e.style.cssText = style;
  return e;
}
function sectionHeader(text) {
  const h = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;`);
  h.textContent = text;
  return h;
}
function renderStat(key, val) {
  const row = el('div', `display:flex;justify-content:space-between;align-items:center;padding:16px;background:${T.card};border:1px solid ${T.hairline};border-radius:6px;`);
  const k = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  k.textContent = key;
  const v = el('div', `font-family:${T.display};font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;`);
  v.textContent = val;
  row.append(k, v);
  return row;
}
function fmt(s) {
  if (s < 0) s = 0;
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════
function iconPlay(c)  { return `<svg width="14" height="14" viewBox="0 0 14 14" fill="${c}"><polygon points="3,1 13,7 3,13"/></svg>`; }
function iconPause(c) { return `<svg width="14" height="16" viewBox="0 0 14 16" fill="${c}"><rect x="1" y="1" width="4" height="14" rx="1"/><rect x="9" y="1" width="4" height="14" rx="1"/></svg>`; }
function iconNext(c)  { return `<svg width="14" height="14" viewBox="0 0 14 14" fill="${c}" stroke="${c}" stroke-width="1"><polygon points="2,1 10,7 2,13"/><rect x="11" y="1" width="2" height="12" rx="1"/></svg>`; }
function iconCheck(c) { return `<svg width="16" height="16" viewBox="0 0 16 16" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,8 6,12 14,4"/></svg>`; }
function iconClose(c) { return `<svg width="14" height="14" viewBox="0 0 14 14" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>`; }
function iconArrow(c) { return `<svg width="16" height="16" viewBox="0 0 16 16" stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,4 10,8 6,12"/></svg>`; }

// ═══════════════════════════════════════════════════════
// EXERCISE DESCRIPTIONS & VIDEO IDS — shared by both programs
// ═══════════════════════════════════════════════════════
const EX_INFO = {
  'Cat–Cow':           { desc:'On all fours. Arch your back up toward the ceiling (Cat), then let it sink toward the floor while lifting your head (Cow). Move slowly with your breath.', gif:'cat cow yoga exercise' },
  "World's Greatest":  { desc:'Step into a deep lunge. Place the same-side hand on the floor, then rotate and reach the other hand toward the ceiling. Opens hips, thoracic spine, and chest at once.', gif:'world greatest stretch exercise' },
  'Hip 90/90 Switch':  { desc:'Sit with both knees bent at 90°. Rotate both legs to switch sides in one smooth movement. Keep your torso upright throughout.', gif:'hip 90 90 stretch mobility' },
  'Jumping Jacks':     { desc:'Start standing. Jump your feet wide while raising arms overhead, then jump back to start. Maintain a steady rhythm and light landing.', gif:'jumping jacks exercise cardio' },
  'Arm Circles':       { desc:'Stand with arms out to the sides. Make small to large circles forward, then reverse. Keep shoulders relaxed, not shrugged.', gif:'arm circles warm up exercise' },
  'High Knees':        { desc:'Run in place, driving each knee up to hip height. Pump your arms for rhythm. Stay on the balls of your feet.', gif:'high knees cardio exercise' },
  'Push-Up':           { desc:'Plank position, hands shoulder-width. Lower your chest to the floor with elbows at 45°, then push back up. Keep your body straight as a board.', gif:'push up exercise proper form' },
  'Squat':             { desc:'Feet shoulder-width, toes slightly out. Push hips back and down until thighs are parallel to the floor. Drive through your heels to stand.', gif:'bodyweight squat exercise form' },
  'Bent-over Row':     { desc:'Hinge at the hips with a flat back. Pull your elbows back and up, squeezing shoulder blades together. Control the lowering phase.', gif:'bent over row exercise dumbbell form' },
  'Glute Bridge':      { desc:'Lie on your back, feet flat. Push your hips toward the ceiling, squeezing your glutes at the top. Hold briefly, then lower slowly.', gif:'glute bridge exercise form' },
  'Dead Bug':          { desc:'Lie on your back, arms up, knees at 90°. Lower opposite arm and leg toward the floor while pressing your lower back down. Alternate sides.', gif:'dead bug exercise core' },
  "Child's Pose":      { desc:'Kneel and stretch your arms forward, forehead to the floor. Breathe into your lower back. Let gravity melt tension away.', gif:'child pose yoga stretch' },
  'Down Dog → Cobra':  { desc:'From downward dog, flow forward into cobra by lowering hips and lifting your chest. Reverse back to downdog. Let each breath guide the movement.', gif:'downward dog cobra yoga flow' },
  'Pigeon':            { desc:'From plank, bring one knee forward behind your wrist. Sink your hips and fold forward over the front leg. Deep hip opener — breathe through any tightness.', gif:'pigeon pose yoga hip opener' },
  'Box Breath':        { desc:'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. This activates your parasympathetic nervous system — the "rest and digest" response.', gif:'box breathing meditation relaxation' },
  'Chin Tucks':        { desc:'Sitting tall, gently pull your chin straight back (not down). You should feel a stretch at the base of your skull. Counteracts forward head posture.', gif:'chin tuck neck exercise posture' },
  'Thoracic Ext.':     { desc:'Place a foam roller or rolled towel across your mid-back. Gently extend over it, opening the chest. Move the roller up your spine segment by segment.', gif:'thoracic extension foam roller exercise' },
  'Doorway Pec':       { desc:'Stand in a doorway, arms at 90°. Lean forward until you feel a stretch across your chest. Hold and breathe deeply into the stretch.', gif:'doorway chest stretch pec stretch' },
  'Scapular CARs':     { desc:'Controlled articular rotations of the shoulder blade. Protract, elevate, retract, and depress in a full circle. Move slowly and intentionally.', gif:'scapular rotation exercise shoulder' },
  'Wall Slide':        { desc:'Stand with your back against a wall, arms in a goalpost position. Slide your arms overhead while keeping contact with the wall throughout.', gif:'wall slide exercise shoulder posture' },
  'Inchworm':          { desc:'Stand tall, hinge forward and walk your hands out to a plank. Pause, then walk your feet toward your hands and stand. Full-body activation — targets hamstrings, shoulders, and core with control.', gif:'inchworm exercise warm up mobility' },
  'Band Pull-Apart':   { desc:'Hold a resistance band at shoulder height. Pull it apart by squeezing your shoulder blades together. Control the return. Targets rear deltoids and rhomboids.', gif:'band pull apart exercise posture' },
  'Y-T-W on Floor':    { desc:'Lie face down. Raise arms into a Y, then T, then W shape — each targets different muscles of the upper back and rotator cuff. Lift only as high as you can without pain.', gif:'YTW exercise upper back floor' },
  'Wall Angels':       { desc:'Stand with your back flat against a wall, arms in a goalpost shape. Slowly raise your arms overhead while maintaining full contact with the wall.', gif:'wall angels exercise posture' },
  'Bird Dog':          { desc:'On all fours, extend one arm and the opposite leg simultaneously. Keep your hips level and core braced. Think "long," not "high."', gif:'bird dog exercise core stability' },
  'Sphinx':            { desc:'Lie on your belly, forearms flat. Gently press up, opening your chest. This is a passive lumbar extension — let gravity do the work while you breathe.', gif:'sphinx pose yoga backbend' },
  'Seated Twist':      { desc:'Sit cross-legged or with legs extended. Rotate your torso to one side, placing your hand behind you for support. Lengthen your spine with each inhale, deepen the twist with each exhale.', gif:'seated spinal twist yoga' },
  'Legs Up The Wall':  { desc:'Lie on your back with legs resting vertically up a wall. This inverts blood flow from your lower body — a powerful restorative pose for recovery.', gif:'legs up the wall yoga restorative' },
  'Belly Breathing':   { desc:'One hand on your chest, one on your belly. Breathe so only your belly hand rises. This activates the diaphragm and signals your nervous system to calm.', gif:'belly breathing diaphragm exercise' },
  'Neck Rolls':        { desc:'Slowly drop your ear to your shoulder, then roll your chin to your chest and to the other side. Move gently — never roll backward past neutral.', gif:'neck rolls stretch exercise' },
  'Ankle Circles':     { desc:'Lift one foot and draw large circles with your toes — clockwise then counterclockwise. Warms the ankle joint and improves foot proprioception.', gif:'ankle circles mobility exercise' },
  'Surya A':           { desc:'Sun Salutation A: Mountain → Forward Fold → Half Lift → Plank → Chaturanga → Updog → Downdog → repeat. Flow with your breath — inhale to lift, exhale to fold.', gif:'sun salutation A yoga flow' },
  'Standing Fold':     { desc:'Stand with feet together, hinge at the hips and let your torso hang heavy. Bend your knees slightly if needed. Let gravity lengthen your hamstrings and spine.', gif:'standing forward fold yoga hamstring' },
  'Warrior II':        { desc:'Wide stance, front knee bent over ankle, back leg straight. Arms stretched long at shoulder height. Gaze over your front hand. Ground through the outer edge of your back foot.', gif:'warrior 2 yoga pose' },
  'Triangle':          { desc:'Wide stance, front leg straight. Reach your front hand toward your shin or the floor, top arm toward the ceiling. Keep both sides of the torso long.', gif:'triangle pose yoga trikonasana' },
  'Tree Pose':         { desc:'Balance on one foot. Place the other foot on your calf or inner thigh (never the knee). Find a fixed gaze point. Press foot and leg together for stability.', gif:'tree pose yoga balance' },
  'Chair → Twist':     { desc:'Sink into Chair Pose (utkatasana), then bring hands to heart and twist one elbow outside the opposite knee. Alternate sides. Fires up legs and spine simultaneously.', gif:'chair pose twist yoga utkatasana' },
  'Bridge':            { desc:'Lie on your back, feet flat and hip-width. Press through your feet to lift your hips. Interlace your hands under your back and roll your shoulders under. Hold and breathe.', gif:'yoga bridge pose glutes exercise' },
  'Happy Baby':        { desc:'Lie on your back, grab the outer edges of your feet. Gently pull your knees toward your armpits. Rock side to side for a gentle spinal massage.', gif:'happy baby pose yoga ananda balasana' },
  'Supine Twist':      { desc:'Lie on your back. Draw one knee to your chest and let it cross over your body. Extend that arm out and look the other way. Breathe into the rotation.', gif:'supine spinal twist yoga pose' },
  'Savasana':               { desc:'Lie flat on your back, arms slightly away from the body, palms up. Close your eyes. Simply let your body be heavy. This is where your practice integrates.', gif:'savasana yoga final relaxation rest' },
  'Wall Sit':               { desc:'Back flat against a wall, slide down until thighs are parallel to the floor. Feet hip-width, knees directly over ankles. Hold the position — this is pure quad endurance.', gif:'wall sit exercise quad strength' },
  'Terminal Knee Extension':{ desc:'Anchor a resistance band behind you at knee height. Step into the loop with one leg. From a slight bend, press your knee straight against the band resistance. Isolates the VMO — the teardrop muscle that stabilises the kneecap.', gif:'terminal knee extension band exercise TKE' },
  'Straight Leg Raise':     { desc:'Lie on your back, one leg bent with foot flat. Tighten the quad of the straight leg, then lift it to the height of the bent knee. Lower slowly. Safe quad activation — no knee compression.', gif:'straight leg raise exercise quad rehab' },
  'Plank':                  { desc:'Forearms and toes on the floor, elbows under shoulders. Body in one straight line from head to heels — brace your core and squeeze your glutes. Don\'t let your hips sag or pike up.', gif:'plank exercise proper form' },
  'Dead Bug Hold':          { desc:'Lie on your back, arms reaching up, knees bent at 90°. Extend one arm overhead and the opposite leg straight out, hovering just above the floor. Press your lower back flat into the ground and hold — no arching.', gif:'dead bug hold exercise core' },
  'Glute Bridge Hold':      { desc:'Lie on your back, feet flat, knees bent. Drive your hips up until your body forms a straight line from shoulders to knees. Squeeze your glutes and hold at the top — don\'t let your hips drop.', gif:'glute bridge hold exercise' },
  'Farmer Carry Hold':      { desc:'Stand tall holding two even-weight objects at your sides — water bottles, a bag, whatever\'s on hand. Shoulders back, core braced, grip tight. Hold the position without shifting or leaning.', gif:'farmers carry hold exercise' },
};

function getExInfo(name) {
  return EX_INFO[name] || {
    desc: 'Follow the movement shown. Focus on control and breathing throughout.',
    gif: `${name.toLowerCase().replace(/[^a-z0-9 ]/g,' ')} exercise`,
  };
}

const YT_IDS = {
  'Cat–Cow':           'a0wyBGg4aWw',
  "World's Greatest":  'kk8RnOLzngc',
  'Hip 90/90 Switch':  'HUZimFZJZWU',
  'Jumping Jacks':     'uLVt6u15L98',
  'Arm Circles':       'mwDgFY86zck',
  'High Knees':        'D0GwAezTvtg',
  'Push-Up':           'Zi6c09DRGxk',
  'Squat':             'P-yaD24bUE8',
  'Bent-over Row':     '6TSP1TRMUzs',
  'Glute Bridge':      'wPM8icPu6H8',
  'Dead Bug':          'bxn9FBrt4-A',
  "Child's Pose":      'fzM3uSrr4-g',
  'Down Dog → Cobra':  'PWLLxEn4Nbs',
  'Pigeon':            '0_zPqA65Nok',
  'Box Breath':        'tEmt1Znux58',
  'Chin Tucks':        'O2kkwT6t3R0',
  'Thoracic Ext.':     'mPwvMNk6i70',
  'Doorway Pec':       'qv6el4OhHjA',
  'Scapular CARs':     'j9fWLr1KxFA',
  'Wall Slide':        'yOtlRQxwt3g',
  'Inchworm':          'g_9VhPX5HJA',
  'Band Pull-Apart':   'mCDy-WsNKcs',
  'Y-T-W on Floor':    'jV6TKLnA1EQ',
  'Wall Angels':       '1UU4VvklQ44',
  'Bird Dog':          'ee5DVxN_Tfw',
  'Sphinx':            'F5JVnU-hQ44',
  'Seated Twist':      '0hs1JY29Ggk',
  'Legs Up The Wall':  'xmcDj4Bf--0',
  'Belly Breathing':   'vUXOfpJVJJM',
  'Neck Rolls':        'ub_ho_zYN6I',
  'Ankle Circles':     'mzTQGYGI0Ng',
  'Surya A':           'AGXic1Kx-Qc',
  'Standing Fold':     'EVVmwPclv1U',
  'Warrior II':        'Mn6RSIRCV3w',
  'Triangle':          'upFYlxZHif0',
  'Tree Pose':         'yVE4XXFFO70',
  'Chair → Twist':     'dAcPG0lBahg',
  'Bridge':            'XMHf6FUGSmk',
  'Happy Baby':        'Ppku7i3ypGM',
  'Supine Twist':      'ezyMaQEaVaI',
  'Savasana':               '1VYlOKUdylM',
  'Wall Sit':               'JQ2JBphtUk8',
  'Terminal Knee Extension':'c9XfHNkB3d8',
  'Straight Leg Raise':     'oPNqN2VfkSY',
  'Plank':                  'A2b2EmIg0dA',
  'Dead Bug Hold':          'bxn9FBrt4-A',
  'Glute Bridge Hold':      'wPM8icPu6H8',
  'Farmer Carry Hold':      'lLAw6fUccKA',
};

// ═══════════════════════════════════════════════════════
// AUDIO / HAPTIC
// ═══════════════════════════════════════════════════════
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

let _currentAudio = null;
async function speakCue(text) {
  try {
    if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
    const audio = await puter.ai.txt2speech(text);
    _currentAudio = audio;
    audio.play();
  } catch {}
}

async function beep() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    const t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(660, t);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t); o.stop(t + 0.4);
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
  } catch {}
}
async function beepTick(freq) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    const t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.start(t); o.stop(t + 0.17);
  } catch {}
}

// ═══════════════════════════════════════════════════════
// WAKE LOCK
// ═══════════════════════════════════════════════════════
let _wakeLock = null;
let _noSleepVideo = null;
function _ensureNoSleepVideo() {
  if (_noSleepVideo) return;
  _noSleepVideo = document.createElement('video');
  _noSleepVideo.setAttribute('playsinline', '');
  _noSleepVideo.setAttribute('muted', '');
  _noSleepVideo.loop = true;
  _noSleepVideo.style.cssText = 'position:fixed;top:-2px;left:-2px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
  _noSleepVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA2JtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiBwaWN0LXN0cnVjdD0wIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MiBrZXlpbnQ9MjUwIGtleWludF9taW49MjUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IHZidl9tYXhyYXRlPTc2OCB2YnZfYnVmc2l6ZT0zMDAwIGNyZl9tYXg9MC4wIG5hbF9ocmQ9bm9uZSBmaWxsZXI9MCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAPZWxpYnggAAAHNm1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAPoAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACFHRyYWsAAABcdGtoZAAAAA8AAAAAAAAAAAAAAAEAAAAAAAADhAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAIAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAnQAAAAAAAEAAAABhG1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAAAQAAAAZVxAAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAATBtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAADwc3RibAAAAQBzdHNkAAAAAAAAAAEAAADwYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAIAAIAASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAADZhdmNDASJAC//hABhnQgAlimRQWAAADxAAAWkAGPHCmWABAAZo6+PLIsAAAAAYc3R0cwAAAAAAAAABAAAAGQAAAgAAAAAUc3RzcwAAAAAAAAABAAAAAQAAAIhjdHRzAAAAAAAAABcAAAABAAACAAAAAAEAAAUAAAAAAQAAAgAAAAABAAAAAAAAAAEAAAIAAAAAAQAABQAAAAABAAACAAAAAAEAAAAAAAAAAQAAAgAAAAABAAACAAAAAAEAAAUAAAAAAQAAAgAAAAABAAAAAAAAAAEAAAIAAAAAAQAABQAAAAABAAACAAAAAAEAAAAAAAAAAQAAAgAAAAAcc3RzYwAAAAAAAAABAAAAAgAAAAgAAAABAAAATHN0c3oAAAAAAAAAAAAAABkAAADhAAAAbgAAAEsAAAAuAAAAKQAAACoAAAAnAAAAJgAAACcAAAAlAAAAJgAAACYAAAAlAAAAJQAAACYAAAAlAAAAJQAAACUAAAAlAAAAJQAAACUAAAAlAAAAJgAAAAhzdGNvAAAAAAAAAAEAAAAsAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY1Ni40MC4xMDE=';
  document.body.appendChild(_noSleepVideo);
}
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => { _wakeLock = null; });
      return;
    }
  } catch {}
  try { _ensureNoSleepVideo(); await _noSleepVideo.play(); } catch {}
}
function releaseWakeLock() {
  try { if (_wakeLock) { _wakeLock.release(); _wakeLock = null; } } catch {}
  try { if (_noSleepVideo) _noSleepVideo.pause(); } catch {}
}
// Re-acquire if page becomes visible again (iOS tab switch)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (state.view === 'session' || state.view === 'meditation')) acquireWakeLock();
});

// ═══════════════════════════════════════════════════════
// SESSION HISTORY + MEASUREMENTS STORAGE
// ═══════════════════════════════════════════════════════
function saveProgress()      { try { localStorage.setItem('mf.progress', JSON.stringify(state.progress)); } catch {} }
function loadSessions()      { try { return JSON.parse(localStorage.getItem('mf.sessions') || '[]'); } catch { return []; } }
function saveSessions(s)     { try { localStorage.setItem('mf.sessions', JSON.stringify(s)); } catch {} }
function loadMeasurements()  { try { return JSON.parse(localStorage.getItem('mf.measurements') || '[]'); } catch { return []; } }
function saveMeasurements(m) { try { localStorage.setItem('mf.measurements', JSON.stringify(m)); } catch {} }
function loadGarmin()        { try { return JSON.parse(localStorage.getItem('mf.garmin') || '[]'); } catch { return []; } }
function saveGarmin(g)       { try { localStorage.setItem('mf.garmin', JSON.stringify(g)); } catch {} }
function loadSyncUrl()       { return localStorage.getItem('mf.syncUrl') || ''; }
function saveSyncUrl(u)      { if (u) localStorage.setItem('mf.syncUrl', u); else localStorage.removeItem('mf.syncUrl'); }

function computePerformanceIndex(sleepScore, workoutRating, calories) {
  const vals = [sleepScore != null ? sleepScore / 100 : null,
                workoutRating != null ? workoutRating / 5 : null,
                calories != null ? Math.min(calories / 500, 1) : null];
  const weights = [0.4, 0.4, 0.2];
  let total = 0, wSum = 0;
  vals.forEach((v, i) => { if (v !== null) { total += v * weights[i]; wSum += weights[i]; } });
  return wSum > 0 ? Math.round((total / wSum) * 100) : null;
}

function syncToSheets(payload) {
  const url = loadSyncUrl();
  if (!url) return;
  try { fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); } catch {}
}

function dateKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getStreak() {
  const sessions = loadSessions();
  if (!sessions.length) return 0;
  const dayKeys = [...new Set(sessions.map(s => {
    const d = new Date(s.at);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }))].sort();
  const last = new Date(sessions[sessions.length - 1].at);
  const today = new Date(); today.setHours(0,0,0,0); last.setHours(0,0,0,0);
  if ((today - last) / 86400000 > 1) return 0;
  let streak = 1;
  for (let i = dayKeys.length - 2; i >= 0; i--) {
    const a = dayKeys[i].split('-').map(Number);
    const b = dayKeys[i+1].split('-').map(Number);
    const da = new Date(a[0], a[1], a[2]);
    const db = new Date(b[0], b[1], b[2]);
    if ((db - da) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

function captureProgressPhoto(sessionKey) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) { resolve(null); return; }

      // Thumbnail: 240×240 square crop, stored in session
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(url);
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        const thumb = canvas.toDataURL('image/jpeg', 0.75);

        // Save thumbnail to session record
        const sessions = loadSessions();
        const idx = sessions.findIndex(s => s.key === sessionKey);
        if (idx !== -1) { sessions[idx].photo = thumb; saveSessions(sessions); }

        // Send full image to camera roll via Web Share API
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Progress photo' }); } catch {}
        }
        resolve(thumb);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function shareWorkout(streak, total, duration) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  await document.fonts.ready;

  ctx.fillStyle = '#0e1116'; ctx.fillRect(0, 0, 1080, 1080);

  // header line
  ctx.fillStyle = '#7aa676'; ctx.fillRect(80, 108, 920, 3);
  ctx.fillStyle = '#7aa676';
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillText('MORNING FLOW', 80, 96);

  // workout title
  const parts = currentDay().title.toUpperCase().split(' · ');
  ctx.fillStyle = '#e8e5dd';
  ctx.font = '700 84px "Space Grotesk", sans-serif';
  ctx.fillText(parts[0], 80, 240);
  if (parts[1]) { ctx.fillStyle = '#7aa676'; ctx.fillText(parts[1], 80, 336); }

  // meta
  ctx.fillStyle = '#8a8478';
  ctx.font = '500 26px "JetBrains Mono", monospace';
  ctx.fillText(`WEEK ${state.week} · DAY ${state.day + 1} · ${Math.round(duration / 60)} MIN`, 80, 410);

  // divider
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(80, 460, 920, 1);

  // streak number
  ctx.fillStyle = '#e8e5dd';
  ctx.font = '700 140px "Space Grotesk", sans-serif';
  ctx.fillText(`${streak}`, 80, 620);
  ctx.fillStyle = '#8a8478';
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillText(`DAY STREAK · ${total} SESSIONS TOTAL`, 80, 668);

  // encouragement
  ctx.fillStyle = '#e8e5dd';
  ctx.font = 'italic 400 34px "Instrument Serif", serif';
  const msg = pickDoneMessage(streak, state.week, total);
  ctx.fillText(`"${msg}"`, 80, 770);

  // footer
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(80, 860, 920, 1);
  ctx.fillStyle = '#8a8478';
  ctx.font = '400 20px "JetBrains Mono", monospace';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(dateStr, 80, 920);
  ctx.fillText('cwinter1.github.io/workout', 80, 958);

  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      const file = new File([blob], 'morning-flow.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Morning Flow', text: `${streak} day streak — Week ${state.week} done.` }); } catch {}
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'morning-flow.png';
        a.click();
      }
      resolve();
    }, 'image/png');
  });
}

// ═══════════════════════════════════════════════════════
// GENERIC UI BUILDERS — shared between AM and Office home screens
// ═══════════════════════════════════════════════════════
function renderWeekSection(count, prefix, pickFn, tagForIndex) {
  const weekSection = el('div', ``);
  weekSection.appendChild(sectionHeader('This week'));
  const weekRow = el('div', `display:flex;gap:6px;margin-top:10px;`);
  for (let d2 = 0; d2 < count; d2++) {
    const done = !!state.progress[`${prefix}${state.week}d${d2}`];
    const isToday = d2 === state.day;
    const btn = el('button', `flex:1;border:none;background:${done ? T.accent : T.card};color:${done ? T.accentT : T.fg};border-radius:6px;padding:14px 12px;text-align:left;${isToday && !done ? `outline:1.5px solid ${T.accent};outline-offset:-1.5px;` : ''}`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:10px;letter-spacing:1.5px;opacity:0.7;text-transform:uppercase;`);
    lbl.textContent = `D${d2+1}`;
    const status = el('div', `font-family:${T.display};font-weight:700;font-size:18px;margin-top:6px;line-height:1;text-transform:uppercase;letter-spacing:0.5px;`);
    status.textContent = done ? 'Done' : isToday ? 'Today' : 'Open';
    const tag = el('div', `font-family:${T.mono_ff};font-size:10px;margin-top:6px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;`);
    tag.textContent = tagForIndex(d2);
    btn.append(lbl, status, tag);
    btn.onclick = () => pickFn(state.week, d2);
    weekRow.appendChild(btn);
  }
  weekSection.appendChild(weekRow);
  return weekSection;
}

function renderProgressGrid(weeksCount, daysCount, prefix, pickFn) {
  const wrap = el('div', ``);
  wrap.appendChild(sectionHeader(`${weeksCount}-week progress`));
  const grid = el('div', `margin-top:10px;display:grid;grid-template-columns:auto repeat(${daysCount},1fr);gap:6px;align-items:center;`);
  grid.appendChild(el('span', ``));
  for (let d = 0; d < daysCount; d++) {
    const lbl = el('span', `font-family:${T.mono_ff};font-size:9px;color:${T.mono};letter-spacing:1px;text-transform:uppercase;text-align:center;`);
    lbl.textContent = `D${d+1}`;
    grid.appendChild(lbl);
  }
  for (let w = 1; w <= weeksCount; w++) {
    const wlbl = el('span', `font-family:${T.mono_ff};font-size:9px;color:${T.mono};letter-spacing:1px;`);
    wlbl.textContent = `W${w}`;
    grid.appendChild(wlbl);
    for (let d = 0; d < daysCount; d++) {
      const done = !!state.progress[`${prefix}${w}d${d}`];
      const btn = el('button', `border:none;height:28px;border-radius:2px;background:${done ? T.accent : T.pill};width:100%;`);
      btn.onclick = () => pickFn(w, d);
      grid.appendChild(btn);
    }
  }
  wrap.appendChild(grid);
  return wrap;
}

function renderControls() {
  const ctrls = el('div', `padding:14px 22px;display:flex;gap:10px;flex-shrink:0;padding-bottom:calc(env(safe-area-inset-bottom,14px)+14px);`);
  const pauseBtn = el('button', `flex:2;appearance:none;border:none;background:${T.fg};color:${T.bg};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:10px;`);
  pauseBtn.id = 'pause-btn';
  pauseBtn.innerHTML = `${state.paused ? iconPlay(T.bg) : iconPause(T.bg)} ${state.paused ? 'Resume' : 'Pause'}`;
  pauseBtn.onclick = togglePause;
  const skipBtn = el('button', `flex:1;appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:8px;`);
  skipBtn.innerHTML = `${iconNext(T.fg)} Skip`;
  skipBtn.onclick = skipExercise;
  ctrls.append(pauseBtn, skipBtn);
  return ctrls;
}

function togglePause() {
  state.paused = !state.paused;
  saveActiveSession();
  const btn = document.getElementById('pause-btn');
  if (btn) btn.innerHTML = `${state.paused ? iconPlay(T.bg) : iconPause(T.bg)} ${state.paused ? 'Resume' : 'Pause'}`;
}

// ═══════════════════════════════════════════════════════
// ACTIVE SESSION PERSISTENCE
// Survives an accidental refresh/reload mid-workout (or iOS backgrounding
// the tab) by saving just enough to rebuild state.timeline from scratch via
// the page's own buildSessionTimeline() — not the timeline array itself.
// ═══════════════════════════════════════════════════════
function saveActiveSession() {
  try {
    localStorage.setItem('mf.activeSession', JSON.stringify({
      prefix: PROGRESS_PREFIX,
      week: state.week, day: state.day,
      idx: state.idx, left: state.left,
      paused: state.paused, startedAt: state.startedAt,
      view: state.view === 'preview' ? 'preview' : 'session',
    }));
  } catch {}
}

function clearActiveSession() {
  try { localStorage.removeItem('mf.activeSession'); } catch {}
}

function resumeActiveSession() {
  try {
    const saved = JSON.parse(localStorage.getItem('mf.activeSession') || 'null');
    if (!saved || saved.prefix !== PROGRESS_PREFIX) return false;
    // Reject checkpoints saved by an older version of this code that didn't
    // record `view` — silently defaulting those to 'session' is exactly the
    // "resume skips the video" bug. Safer to not resume at all than to guess.
    if (saved.view !== 'preview' && saved.view !== 'session') {
      clearActiveSession();
      return false;
    }
    state.week = saved.week;
    state.day = saved.day;
    state.timeline = buildSessionTimeline();
    if (!state.timeline.length) return false;
    state.idx = Math.min(saved.idx, state.timeline.length - 1);
    state.left = Math.min(saved.left, state.timeline[state.idx].seconds);
    state.paused = !!saved.paused;
    state.startedAt = saved.startedAt;
    state.view = saved.view;
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// SESSION ENGINE
// Relies on hooks each page (am.js / office.js) must define before
// calling render(): state, currentDay(), nextSession(), buildSessionTimeline(),
// defaultSessionSeconds(), pickDoneMessage(streak, week, total),
// PROGRESS_PREFIX, TOTAL_SESSIONS, render().
// ═══════════════════════════════════════════════════════
let timerInterval = null;

function startSession() {
  clearInterval(timerInterval);
  // iOS unlock: play a silent 1-sample buffer synchronously inside the tap handler
  try {
    const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
  state.timeline = buildSessionTimeline();
  state.idx = 0;
  state.left = state.timeline[0].seconds;
  state.paused = false;
  state.startedAt = Date.now();
  state.view = 'preview';
  saveActiveSession();
  acquireWakeLock();
  render();
}

// Advances to the next timeline item the same way whether the previous one
// expired naturally or was skipped: rest items auto-continue straight into
// their own running timer, exercise items always land on the video/preview
// screen first. Never call this on the last item — call finishSession() instead.
function advanceToNextItem() {
  state.idx++;
  state.left = state.timeline[state.idx].seconds;
  if (state.timeline[state.idx].kind === 'rest') {
    state.view = 'session';
    saveActiveSession();
    render();
    startTimer();
  } else {
    state.view = 'preview';
    saveActiveSession();
    render();
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (state.paused) return;
    state.left--;
    if (state.left <= 0) {
      clearInterval(timerInterval);
      beep();
      if (state.idx + 1 < state.timeline.length) {
        advanceToNextItem();
      } else {
        finishSession();
      }
    } else {
      saveActiveSession();
      if (state.left <= 10 && state.left > 0) beepTick(state.left <= 3 ? 880 : 440);
      updateTimerDisplay();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const cur = state.timeline[state.idx];

  const numEl = document.getElementById('timer-num');
  if (numEl) numEl.textContent = fmt(state.left);

  const medCountdown = document.getElementById('med-countdown');
  if (medCountdown) {
    medCountdown.textContent = fmt(state.left);
    const { label, scale, phaseDur, withinPhase } = getMedState();
    const boxEl = document.getElementById('med-box');
    const labelEl = document.getElementById('med-label');
    const countEl = document.getElementById('med-count');
    if (boxEl) boxEl.style.transform = `scale(${scale})`;
    if (labelEl) labelEl.textContent = label;
    if (countEl) countEl.textContent = Math.max(0, phaseDur - withinPhase);
  }

  const progEl = document.getElementById('session-prog');
  if (progEl) {
    const totalSec = state.timeline.reduce((a, t) => a + t.seconds, 0);
    const doneSec = state.timeline.slice(0, state.idx).reduce((a, t) => a + t.seconds, 0) + (cur.seconds - state.left);
    progEl.style.width = `${(doneSec / totalSec) * 100}%`;
  }

  if (cur.phaseId === 'main' && cur.kind !== 'rest') {
    const tag = currentDay().tag;
    const cues = (typeof COACH_CUES !== 'undefined' && COACH_CUES[tag]) || [];
    if (cues.length) {
      const elapsed = cur.seconds - state.left;
      if (elapsed === 1 || (elapsed > 0 && elapsed % 20 === 0)) {
        speakCue(cues[Math.floor(elapsed / 20) % cues.length]);
      }
    }
  }
}

function getMedState() {
  const cur = state.timeline[state.idx];
  const m = cur.variant.match(/(\d+)/g);
  const phases = m ? m.slice(0, 4).map(Number) : [4, 4, 4, 4];
  const cycleSec = phases.reduce((a, b) => a + b, 0);
  const elapsed = cur.seconds - state.left;
  const inCycle = elapsed % cycleSec;
  const phaseLabels = ['Inhale', 'Hold', 'Exhale', 'Hold'];
  let phaseIdx = 0, accum = 0, withinPhase = 0;
  for (let i = 0; i < 4; i++) {
    if (inCycle < accum + phases[i]) { phaseIdx = i; withinPhase = inCycle - accum; break; }
    accum += phases[i];
  }
  const phaseDur = phases[phaseIdx];
  let scale = 0.55;
  if (phaseIdx === 0) scale = 0.55 + 0.45 * (withinPhase / phaseDur);
  else if (phaseIdx === 1) scale = 1;
  else if (phaseIdx === 2) scale = 1 - 0.45 * (withinPhase / phaseDur);
  return { phases, phaseIdx, withinPhase, phaseDur, label: phaseLabels[phaseIdx], scale };
}

function skipExercise() {
  clearInterval(timerInterval);
  if (state.idx + 1 < state.timeline.length) {
    advanceToNextItem();
  } else {
    finishSession();
  }
}

function abortSession() {
  clearInterval(timerInterval);
  releaseWakeLock();
  clearActiveSession();
  const ns = nextSession();
  state.week = ns.week; state.day = ns.day;
  state.view = 'home';
  render();
}

function finishSession() {
  clearInterval(timerInterval);
  releaseWakeLock();
  clearActiveSession();
  const key = `${PROGRESS_PREFIX}${state.week}d${state.day}`;
  const now = Date.now();
  const duration = state.startedAt ? Math.round((now - state.startedAt) / 1000) : defaultSessionSeconds();
  state.progress[key] = { done: true, at: now };
  saveProgress();
  const sessions = loadSessions();
  const cd = currentDay();
  sessions.push({ key, at: now, duration, week: state.week, day: state.day, dayTitle: cd.title, dayTag: cd.tag });
  saveSessions(sessions);
  state.lastDuration = duration;
  state.view = 'done';
  render();
}

// ═══════════════════════════════════════════════════════
// PREVIEW — video + description before each exercise
// ═══════════════════════════════════════════════════════
function renderPreview(root) {
  const cur = state.timeline[state.idx];
  const day_ = currentDay();
  const info = getExInfo(cur.exName);

  // header
  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;`);
  const closeBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  closeBtn.innerHTML = iconClose(T.fg);
  closeBtn.onclick = abortSession;
  const hdrMid = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;text-align:center;`);
  hdrMid.innerHTML = `<div>W${state.week}·D${state.day+1}</div><div style="margin-top:2px;opacity:0.6;">${cur.phaseName}</div>`;
  hdr.append(closeBtn, hdrMid, el('div', `width:36px;`));

  // phase progress bars
  const phaseBars = el('div', `padding:0 22px;display:flex;gap:4px;flex-shrink:0;`);
  day_.phases.forEach((ph, i) => {
    const col = el('div', `flex:1;display:flex;flex-direction:column;gap:4px;`);
    const bar = el('div', `height:3px;background:${i <= cur.phaseIdx ? T.accent : T.pill};`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${i === cur.phaseIdx ? T.fg : T.mono};letter-spacing:1px;text-transform:uppercase;`);
    lbl.textContent = ph.name.split(' ')[0];
    col.append(bar, lbl);
    phaseBars.appendChild(col);
  });

  // scrollable body
  const body = el('div', `flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:18px;`);

  const upTag = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
  upTag.textContent = state.idx === 0 ? 'First up' : 'Up next';

  const exTitle = el('div', `font-family:${T.display};font-weight:700;font-size:38px;line-height:0.95;text-transform:uppercase;letter-spacing:-1px;`);
  exTitle.textContent = cur.exName;

  // chips row
  const chips = el('div', `display:flex;gap:8px;flex-wrap:wrap;`);
  const makeChip = (label, val) => {
    const chip = el('div', `display:inline-flex;align-items:center;gap:8px;background:${T.pill};border:1px solid ${T.hairline};border-radius:4px;padding:8px 12px;`);
    const lbl2 = el('span', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
    lbl2.textContent = label;
    const div = el('span', `width:1px;height:14px;background:${T.hairline};`);
    const val2 = el('span', `font-family:${T.mono_ff};font-size:13px;color:${T.fg};`);
    val2.textContent = val;
    chip.append(lbl2, div, val2);
    return chip;
  };
  chips.append(makeChip(`Week ${state.week}`, cur.variant), makeChip('Duration', fmt(cur.seconds)));

  // Tutorial embed — thumbnail poster, tap loads YouTube iframe inline
  const ytId = YT_IDS[cur.exName];
  const gifBox = el('div', `width:100%;border-radius:8px;overflow:hidden;border:1px solid ${T.hairline};background:#000;`);
  if (ytId) {
    const poster = el('div', `position:relative;width:100%;padding-top:56.25%;cursor:pointer;background:#111 url(https://img.youtube.com/vi/${ytId}/hqdefault.jpg) center/cover no-repeat;`);
    const overlay = el('div', `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,0.38);`);
    const playBtn = el('div', `width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;`);
    playBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 4.5l13 7-13 7V4.5z" fill="#111"/></svg>`;
    const playLbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:#fff;letter-spacing:1.5px;text-transform:uppercase;`);
    playLbl.textContent = 'Tap to watch';
    overlay.append(playBtn, playLbl);
    poster.appendChild(overlay);
    poster.onclick = () => {
      gifBox.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:100%;padding-top:56.25%;';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;display:block;';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      gifBox.appendChild(wrap);
    };
    gifBox.appendChild(poster);
  } else {
    const fb = el('div', `padding:20px;font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:1px;`);
    fb.textContent = 'No tutorial available';
    gifBox.appendChild(fb);
  }

  // How-to
  const descBox = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:6px;padding:16px;`);
  const descTitle = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;`);
  descTitle.textContent = 'How to do it';
  const descText = el('div', `font-size:14px;color:${T.fg};line-height:1.65;`);
  descText.textContent = info.desc;
  descBox.append(descTitle, descText);

  // Intent
  const intentBox = el('div', `display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:${T.pill};border-radius:6px;`);
  const intentIcon = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.accent};flex-shrink:0;margin-top:2px;letter-spacing:1px;`);
  intentIcon.textContent = cur.kind === 'meditation' ? 'MED' : 'TIP';
  const intentText = el('div', `font-size:13px;color:${T.sub};line-height:1.5;`);
  intentText.textContent = cur.intent;
  intentBox.append(intentIcon, intentText);

  body.append(upTag, exTitle, chips, gifBox, descBox, intentBox, el('div', `height:20px;`));

  // CTA
  const ctaWrap = el('div', `padding:14px 22px;padding-bottom:calc(env(safe-area-inset-bottom,14px)+14px);flex-shrink:0;`);
  const ctaBtn = el('button', `width:100%;appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:20px 22px;font-family:${T.display};font-weight:700;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:12px;`);
  ctaBtn.innerHTML = `${iconPlay(T.accentT)} <span>Ready — Let's go</span>`;
  ctaBtn.onclick = () => {
    state.view = 'session';
    render();
    // 3-2-1 countdown overlay before timer starts
    const ov = el('div', `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:${T.bg}cc;z-index:999;`);
    const num = el('div', `font-family:${T.display};font-weight:700;font-size:120px;color:${T.fg};line-height:1;`);
    ov.appendChild(num);
    document.body.appendChild(ov);
    let count = 3;
    const tick = () => {
      num.textContent = count;
      beepTick(count === 1 ? 880 : 440);
      if (count === 1) {
        setTimeout(() => { ov.remove(); startTimer(); }, 900);
      } else {
        count--;
        setTimeout(tick, 1000);
      }
    };
    tick();
  };
  ctaWrap.appendChild(ctaBtn);

  root.append(hdr, phaseBars, body, ctaWrap);

}

// ═══════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════
function renderSession(root) {
  const cur = state.timeline[state.idx];
  const day_ = currentDay();
  const totalSec = state.timeline.reduce((a, t) => a + t.seconds, 0);
  const doneSec = state.timeline.slice(0, state.idx).reduce((a, t) => a + t.seconds, 0);

  if (cur.kind === 'meditation') { renderMeditation(root); return; }
  if (cur.kind === 'rest') { renderRest(root); return; }

  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px) + 12px) 22px 12px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;`);
  const closeBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  closeBtn.innerHTML = iconClose(T.fg);
  closeBtn.onclick = abortSession;
  const hdrMid = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;`);
  hdrMid.textContent = `W${state.week}·D${state.day+1}·${String(state.idx+1).padStart(2,'0')}/${String(state.timeline.length).padStart(2,'0')}`;
  hdr.append(closeBtn, hdrMid, el('div', `width:36px;`));

  // phase bars
  const phaseBars = el('div', `padding:0 22px;display:flex;gap:4px;flex-shrink:0;`);
  day_.phases.forEach((ph, i) => {
    const col = el('div', `flex:1;display:flex;flex-direction:column;gap:4px;`);
    const bar = el('div', `height:3px;background:${i <= cur.phaseIdx ? T.accent : T.pill};`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${i === cur.phaseIdx ? T.fg : T.mono};letter-spacing:1px;text-transform:uppercase;`);
    lbl.textContent = ph.name.split(' ')[0];
    col.append(bar, lbl);
    phaseBars.appendChild(col);
  });

  const body = el('div', `flex:1;padding:20px 22px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;`);

  const phaseTag = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
  phaseTag.textContent = `${cur.phaseName} — ${cur.intent}`;

  const exTitle = el('div', `font-family:${T.display};font-weight:700;font-size:42px;line-height:0.95;text-transform:uppercase;letter-spacing:-1px;`);
  exTitle.textContent = cur.exName;

  const variant = el('div', `font-family:${T.mono_ff};font-size:13px;color:${T.fg};letter-spacing:0.5px;`);
  variant.textContent = cur.variant;

  // big flat timer card
  const timerCard = el('div', `border:1px solid ${T.hairline};border-radius:6px;padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-end;`);
  const timerL = el('div', ``);
  const timerLbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  timerLbl.textContent = 'Remaining';
  const timerNum = el('div', `font-family:${T.mono_ff};font-size:64px;font-weight:500;color:${T.fg};letter-spacing:-3px;line-height:0.9;margin-top:4px;font-variant-numeric:tabular-nums;`);
  timerNum.id = 'timer-num';
  timerNum.textContent = fmt(state.left);
  timerL.append(timerLbl, timerNum);
  const timerR = el('div', `text-align:right;max-width:140px;`);
  const nextLbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  nextLbl.textContent = 'Next';
  const nextName = el('div', `font-family:${T.display};font-weight:700;font-size:14px;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;color:${T.fg};`);
  nextName.textContent = state.timeline[state.idx + 1]?.exName || 'Complete';
  timerR.append(nextLbl, nextName);
  timerCard.append(timerL, timerR);

  // session progress bar
  const progWrap = el('div', ``);
  const progHdr = el('div', `display:flex;justify-content:space-between;font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  const sessLeft = el('span', ``); sessLeft.textContent = 'Session';
  const sessRight = el('span', ``); sessRight.textContent = fmt(totalSec - doneSec) + ' left';
  progHdr.append(sessLeft, sessRight);
  const progBg = el('div', `height:4px;background:${T.pill};margin-top:6px;`);
  const progFill = el('div', `height:100%;width:${(doneSec/totalSec)*100}%;background:${T.accent};`);
  progFill.id = 'session-prog';
  progBg.appendChild(progFill);
  progWrap.append(progHdr, progBg);

  body.append(phaseTag, exTitle, variant, timerCard, progWrap);

  root.append(hdr, phaseBars, body, renderControls());
}

// ═══════════════════════════════════════════════════════
// REST
// ═══════════════════════════════════════════════════════
function renderRest(root) {
  const cur = state.timeline[state.idx];
  const day_ = currentDay();
  const totalSec = state.timeline.reduce((a, t) => a + t.seconds, 0);
  const doneSec = state.timeline.slice(0, state.idx).reduce((a, t) => a + t.seconds, 0);
  const nextEx = state.timeline[state.idx + 1];

  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px)+12px) 22px 12px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;`);
  const closeBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  closeBtn.innerHTML = iconClose(T.fg);
  closeBtn.onclick = abortSession;
  const hdrMid = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;`);
  hdrMid.textContent = `W${state.week}·D${state.day+1} — ${cur.phaseName}`;
  hdr.append(closeBtn, hdrMid, el('div', `width:36px;`));

  const phaseBars = el('div', `padding:0 22px;display:flex;gap:4px;flex-shrink:0;`);
  day_.phases.forEach((ph, i) => {
    const col = el('div', `flex:1;display:flex;flex-direction:column;gap:4px;`);
    const bar = el('div', `height:3px;background:${i <= cur.phaseIdx ? T.accent : T.pill};`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${i === cur.phaseIdx ? T.fg : T.mono};letter-spacing:1px;text-transform:uppercase;`);
    lbl.textContent = ph.name.split(' ')[0];
    col.append(bar, lbl);
    phaseBars.appendChild(col);
  });

  const body = el('div', `flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;gap:24px;`);

  const restLabel = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.accent};letter-spacing:3px;text-transform:uppercase;`);
  restLabel.textContent = 'Rest';

  const timerNum = el('div', `font-family:${T.mono_ff};font-size:96px;font-weight:500;color:${T.fg};letter-spacing:-4px;line-height:1;font-variant-numeric:tabular-nums;`);
  timerNum.id = 'timer-num';
  timerNum.textContent = fmt(state.left);

  const nextWrap = el('div', `text-align:center;`);
  const nextLbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;`);
  nextLbl.textContent = 'Up next';
  const nextName = el('div', `font-family:${T.display};font-weight:700;font-size:20px;text-transform:uppercase;letter-spacing:0.5px;color:${T.fg};margin-top:4px;`);
  nextName.textContent = nextEx?.exName || 'Complete';
  nextWrap.append(nextLbl, nextName);

  const progBg = el('div', `width:100%;height:4px;background:${T.pill};border-radius:2px;`);
  const progFill = el('div', `height:100%;width:${(doneSec/totalSec)*100}%;background:${T.accent};`);
  progFill.id = 'session-prog';
  progBg.appendChild(progFill);

  body.append(restLabel, timerNum, nextWrap, progBg);
  root.append(hdr, phaseBars, body, renderControls());
}

// ═══════════════════════════════════════════════════════
// MEDITATION
// ═══════════════════════════════════════════════════════
function renderMeditation(root) {
  const cur = state.timeline[state.idx];
  const { label, scale, phaseDur, withinPhase } = getMedState();

  const hdr = el('div', `padding:calc(env(safe-area-inset-top,12px)+12px) 22px 12px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;`);
  const closeBtn = el('button', `appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;`);
  closeBtn.innerHTML = iconClose(T.fg);
  closeBtn.onclick = abortSession;
  const hdrMid = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;`);
  hdrMid.textContent = `Meditation · ${cur.variant}`;
  hdr.append(closeBtn, hdrMid, el('div', `width:36px;`));

  const body = el('div', `flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;gap:32px;`);

  // box breathing visual
  const boxWrap = el('div', `position:relative;width:260px;height:260px;display:flex;align-items:center;justify-content:center;`);
  const outerRing = el('div', `position:absolute;inset:0;border-radius:8px;border:1px solid ${T.hairline};`);
  const breathBox = el('div', `width:220px;height:220px;border-radius:8px;background:${T.accent}22;border:1.5px solid ${T.accent};transform:scale(${scale});transition:transform 1s linear;display:flex;align-items:center;justify-content:center;flex-direction:column;`);
  breathBox.id = 'med-box';
  const breathLabel = el('div', `font-family:${T.display};font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${T.fg};`);
  breathLabel.id = 'med-label';
  breathLabel.textContent = label;
  const breathCount = el('div', `font-family:${T.mono_ff};font-size:36px;font-weight:500;color:${T.accent};margin-top:6px;font-variant-numeric:tabular-nums;letter-spacing:-1px;`);
  breathCount.id = 'med-count';
  breathCount.textContent = Math.max(0, phaseDur - withinPhase);
  breathBox.append(breathLabel, breathCount);
  boxWrap.append(outerRing, breathBox);

  const timeRemain = el('div', `text-align:center;`);
  const timeLbl = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};letter-spacing:2px;text-transform:uppercase;`);
  timeLbl.textContent = 'Time remaining';
  const timeNum = el('div', `font-family:${T.mono_ff};font-size:32px;font-weight:500;color:${T.fg};margin-top:4px;font-variant-numeric:tabular-nums;letter-spacing:-1px;`);
  timeNum.id = 'med-countdown';
  timeNum.textContent = fmt(state.left);
  timeRemain.append(timeLbl, timeNum);

  body.append(boxWrap, timeRemain);
  root.append(hdr, body, renderControls());
}

// ═══════════════════════════════════════════════════════
// DONE
// ═══════════════════════════════════════════════════════
function renderDone(root) {
  const total = Object.keys(state.progress).filter(k => k.startsWith(PROGRESS_PREFIX)).length;
  const totalMax = TOTAL_SESSIONS;
  const streak = getStreak();
  const duration = state.lastDuration || defaultSessionSeconds();
  const sessionKey = `${PROGRESS_PREFIX}${state.week}d${state.day}`;
  const msg = pickDoneMessage(streak, state.week, total);

  const scroll = el('div', `flex:1;overflow-y:auto;padding:calc(env(safe-area-inset-top,12px)+36px) 22px 0;`);
  const body = el('div', `display:flex;flex-direction:column;gap:24px;`);

  // top — encouragement
  const top = el('div', `display:flex;flex-direction:column;gap:10px;`);
  const tag = el('div', `font-family:${T.mono_ff};font-size:11px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
  tag.textContent = 'Session complete';
  const msgDiv = el('div', `font-family:"Instrument Serif",serif;font-size:38px;line-height:1.15;color:${T.fg};font-style:italic;`);
  msgDiv.textContent = msg;
  top.append(tag, msgDiv);

  // streak badge
  if (streak >= 2) {
    const badge = el('div', `display:flex;align-items:center;gap:14px;padding:16px 18px;background:${T.card};border:1px solid ${T.accent}44;border-radius:8px;`);
    const num = el('div', `font-family:${T.display};font-size:48px;font-weight:700;color:${T.accent};line-height:1;`);
    num.textContent = streak;
    const right = el('div', ``);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.accent};letter-spacing:2px;text-transform:uppercase;`);
    lbl.textContent = 'Day streak';
    const sub = el('div', `font-size:13px;color:${T.sub};margin-top:4px;`);
    sub.textContent = streak === 2 ? 'Two in a row. Keep it going.' :
                      streak === 3 ? 'Three straight. The pattern is set.' :
                      streak === 7 ? 'A full week without missing.' :
                      `Don't break the chain.`;
    right.append(lbl, sub);
    badge.append(num, right);
    body.appendChild(top);
    body.appendChild(badge);
  } else {
    body.appendChild(top);
  }

  // stats
  const stats = el('div', `display:flex;flex-direction:column;gap:8px;`);
  const durationMin = Math.round(duration / 60);
  [
    ['Duration',  `${durationMin} min`],
    ['Session',   `Week ${state.week} · Day ${state.day + 1}`],
    ['Program',   `${total} of ${totalMax} done`],
  ].forEach(([k, v]) => stats.appendChild(renderStat(k, v)));
  body.appendChild(stats);

  // Workout rating card (1–5)
  let workoutRating = null;
  const ratingCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:8px;padding:14px 16px;`);
  const ratingHdr = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;`);
  ratingHdr.textContent = 'How was the session?';
  const ratingRow = el('div', `display:flex;gap:8px;`);
  [1,2,3,4,5].forEach(n => {
    const btn = el('button', `flex:1;appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.sub};border-radius:6px;padding:10px 0;font-family:${T.display};font-weight:700;font-size:18px;`);
    btn.textContent = n;
    btn.onclick = () => {
      workoutRating = n;
      ratingRow.querySelectorAll('button').forEach((b, i) => {
        b.style.background = i + 1 === n ? T.accent : 'transparent';
        b.style.color = i + 1 === n ? T.accentT : T.sub;
        b.style.border = `1px solid ${i + 1 === n ? T.accent : T.hairline}`;
      });
    };
    ratingRow.appendChild(btn);
  });
  ratingCard.append(ratingHdr, ratingRow);
  body.appendChild(ratingCard);

  // Garmin post-workout card
  const existingPost = loadGarmin().find(g => g.type === 'post' && g.sessionKey === sessionKey) || {};
  const garminCard = el('div', `background:${T.card};border:1px solid ${T.hairline};border-radius:8px;padding:14px 16px;`);
  const garminHdr = el('div', `font-family:${T.mono_ff};font-size:10px;color:${T.mono};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;`);
  garminHdr.textContent = 'Garmin — post workout';
  const garminFields = el('div', `display:flex;gap:16px;`);

  const gInpStyle = `background:transparent;border:none;border-bottom:1px solid ${T.hairline};outline:none;font-family:${T.display};font-weight:700;font-size:24px;color:${T.fg};width:100%;padding:2px 0;`;
  const mkGField = (label, inp) => {
    const wrap = el('div', `flex:1;`);
    const lbl = el('div', `font-family:${T.mono_ff};font-size:9px;color:${T.mono};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;`);
    lbl.textContent = label;
    wrap.append(lbl, inp);
    return wrap;
  };

  const calInp = el('input', gInpStyle);
  calInp.type = 'number'; calInp.min = 0; calInp.placeholder = '420';
  if (existingPost.calories != null) calInp.value = existingPost.calories;

  const activeRow = el('div', `display:flex;align-items:baseline;gap:4px;`);
  const ahInp = el('input', gInpStyle + 'width:44px;');
  ahInp.type = 'number'; ahInp.min = 0; ahInp.max = 5; ahInp.placeholder = '0';
  if (existingPost.activeHours != null) ahInp.value = existingPost.activeHours;
  const ahLbl = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};`);
  ahLbl.textContent = 'h';
  const amInp = el('input', gInpStyle + 'width:44px;');
  amInp.type = 'number'; amInp.min = 0; amInp.max = 59; amInp.placeholder = '35';
  if (existingPost.activeMins != null) amInp.value = existingPost.activeMins;
  const amLbl = el('span', `font-family:${T.mono_ff};font-size:11px;color:${T.mono};`);
  amLbl.textContent = 'm';
  activeRow.append(ahInp, ahLbl, amInp, amLbl);

  garminFields.append(mkGField('Total calories', calInp), mkGField('Active time', activeRow));
  garminCard.append(garminHdr, garminFields);
  body.appendChild(garminCard);

  // Photo button
  const photoBtn = el('button', `appearance:none;background:transparent;border:1px solid ${T.hairline};color:${T.fg};border-radius:6px;padding:14px 22px;font-family:${T.mono_ff};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;`);
  const photoIcon = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${T.fg}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="12" height="9" rx="1.5"/><circle cx="7" cy="7.5" r="2.3"/><path d="M4.5 3l1-2h3l1 2"/></svg>`;
  photoBtn.innerHTML = `${photoIcon} <span>Progress photo</span>`;
  photoBtn.onclick = async () => {
    photoBtn.querySelector('span').textContent = 'Opening camera...';
    photoBtn.disabled = true;
    const thumb = await captureProgressPhoto(sessionKey);
    if (thumb) {
      photoBtn.style.background = T.card;
      photoBtn.style.border = `1px solid ${T.accent}44`;
      const img = document.createElement('img');
      img.src = thumb;
      img.style.cssText = `width:32px;height:32px;border-radius:4px;object-fit:cover;`;
      photoBtn.innerHTML = '';
      photoBtn.append(img);
      const lbl = document.createElement('span');
      lbl.textContent = 'Photo saved';
      photoBtn.append(lbl);
    } else {
      photoBtn.querySelector('span').textContent = 'Progress photo';
      photoBtn.disabled = false;
    }
  };
  body.appendChild(photoBtn);

  body.appendChild(el('div', `height:24px;`));
  scroll.appendChild(body);

  // CTA row
  const ctaWrap = el('div', `padding:14px 22px;padding-bottom:calc(env(safe-area-inset-bottom,14px)+14px);display:flex;gap:10px;flex-shrink:0;`);

  const shareBtn = el('button', `flex:1;appearance:none;border:1px solid ${T.hairline};background:transparent;color:${T.fg};border-radius:6px;padding:18px;font-family:${T.display};font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;`);
  shareBtn.textContent = 'Share';
  shareBtn.onclick = async () => {
    shareBtn.textContent = 'Building...';
    shareBtn.disabled = true;
    await shareWorkout(streak, total, duration);
    shareBtn.textContent = 'Share';
    shareBtn.disabled = false;
  };

  const bankBtn = el('button', `flex:2;appearance:none;border:none;background:${T.accent};color:${T.accentT};border-radius:6px;padding:18px 22px;font-family:${T.display};font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:10px;`);
  bankBtn.innerHTML = `${iconCheck(T.accentT)} Bank it`;
  bankBtn.onclick = () => {
    const cal = parseFloat(calInp.value);
    const ah  = parseInt(ahInp.value);
    const am  = parseInt(amInp.value);
    if (!isNaN(cal) || !isNaN(ah) || !isNaN(am)) {
      const garmin = loadGarmin().filter(g => !(g.type === 'post' && g.sessionKey === sessionKey));
      const entry = { type: 'post', sessionKey, week: state.week, day: state.day, date: dateKey(), at: Date.now() };
      if (!isNaN(cal)) entry.calories    = cal;
      if (!isNaN(ah))  entry.activeHours = ah;
      if (!isNaN(am))  entry.activeMins  = am;
      garmin.push(entry);
      saveGarmin(garmin);
    }
    // save rating to session record
    const sessions = loadSessions();
    const si = sessions.findIndex(s => s.key === sessionKey);
    if (si !== -1 && workoutRating != null) { sessions[si].workoutRating = workoutRating; saveSessions(sessions); }
    // sync to sheets
    const preG = loadGarmin().find(g => g.type === 'pre' && g.sessionKey === sessionKey) || {};
    // `type` disambiguates this row from the daily_routine/measurement payloads sent by
    // daily-routine.js/am.js's Measurements screen — all 3 flow through the same syncToSheets()
    // endpoint, so the receiving Apps Script needs a field to route on. See memory/data_shapes.md.
    syncToSheets({
      type: 'session',
      date: dateKey(), week: state.week, day: state.day,
      dayTitle: currentDay().title, dayTag: currentDay().tag,
      duration: duration,
      workoutRating: workoutRating,
      sleepScore: preG.sleepScore ?? null,
      sleepHours: preG.sleepHours ?? null, sleepMins: preG.sleepMins ?? null,
      calories: isNaN(cal) ? null : cal,
      activeHours: isNaN(ah) ? null : ah, activeMins: isNaN(am) ? null : am,
    });
    const ns = nextSession();
    state.week = ns.week; state.day = ns.day;
    state.view = 'home';
    render();
  };
  ctaWrap.append(shareBtn, bankBtn);

  root.append(scroll, ctaWrap);
}
