// Morning Flow — Google Sheets sync endpoint
// Deploy as: Extensions → Apps Script → Deploy → New deployment → Web app
//   Execute as: Me | Who has access: Anyone
// Paste the /exec URL into the app under Measurements → Sheets sync
//
// IMPORTANT: editing this file in the repo does NOT update the live endpoint. This is the
// source of truth you copy into the actual Apps Script editor (bound to your Google Sheet), and
// after pasting an update there you must cut a NEW deployment version — Deploy → Manage
// deployments → pick the existing Web app deployment → Edit (pencil) → Version: New version →
// Deploy. Saving the script alone, or even running it manually from the editor, does not change
// what the already-deployed /exec URL serves; only a new deployment version does. The /exec URL
// itself stays the same across versions, so nothing in the app (`mf.syncUrl`) needs to change.
//
// Routes incoming payloads by their `type` field (added when Daily Routine + Measurements were
// wired into this same sync mechanism, alongside the original AM/Office session sync) into 3
// separate sheet tabs, each auto-created on first use with its own header row. A payload with no
// `type` at all (from a cached app build from before `type` existed) falls back to 'session' —
// the original, only-ever-existing shape — so nothing that used to work silently breaks.

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type || 'session';
    if (type === 'session') writeSession(data);
    else if (type === 'daily_routine') writeDailyRoutine(data);
    else if (type === 'measurement') writeMeasurement(data);
    else writeUnrouted(data); // forward-compatible: a future 4th type lands somewhere visible, not silently

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Unchanged column order/headers from before `type` existed — this sheet may already have real
// history in it, so its shape must stay stable rather than being redesigned alongside the split.
function writeSession(data) {
  const sheet = getOrCreateSheet('Sessions', [
    'Date', 'Week', 'Day', 'Day Title', 'Tag',
    'Duration (min)', 'Workout Rating',
    'Sleep Score', 'Sleep Hours', 'Sleep Mins',
    'Calories', 'Active Hours', 'Active Mins',
    'Performance Index'
  ]);
  const perf = computeIndex(data);
  sheet.appendRow([
    data.date,
    data.week,
    data.day != null ? data.day + 1 : '',
    data.dayTitle || '',
    data.dayTag || '',
    data.duration != null ? Math.round(data.duration / 60) : '',
    data.workoutRating || '',
    data.sleepScore != null ? data.sleepScore : '',
    data.sleepHours != null ? data.sleepHours : '',
    data.sleepMins  != null ? data.sleepMins  : '',
    data.calories   != null ? data.calories   : '',
    data.activeHours != null ? data.activeHours : '',
    data.activeMins  != null ? data.activeMins  : '',
    perf != null ? perf : '',
  ]);
}

function writeDailyRoutine(data) {
  const sheet = getOrCreateSheet('Daily Routine', [
    'Date', 'Total Reps', 'Total Hold (s)', 'Avg Quality', 'Steps (JSON)'
  ]);
  // Steps (JSON) carries the full per-step breakdown as one cell — step count/shape varies day
  // to day (timer vs reps vs hold steps), so there's no fixed set of columns that fits every
  // day without either truncating a longer one or leaving blank columns on a shorter one.
  sheet.appendRow([
    data.date,
    data.totalReps != null ? data.totalReps : '',
    data.totalHoldSeconds != null ? data.totalHoldSeconds : '',
    data.avgQuality != null ? data.avgQuality : '',
    data.resultsJson || '',
  ]);
}

function writeMeasurement(data) {
  const sheet = getOrCreateSheet('Measurements', [
    'Date', 'Weight (kg)', 'Waist (cm)', 'Hips (cm)', 'Resting HR', 'Energy (1-5)'
  ]);
  sheet.appendRow([
    data.date,
    data.weight != null ? data.weight : '',
    data.waist  != null ? data.waist  : '',
    data.hips   != null ? data.hips   : '',
    data.hr     != null ? data.hr     : '',
    data.energy != null ? data.energy : '',
  ]);
}

function writeUnrouted(data) {
  const sheet = getOrCreateSheet('Unrouted', ['Received At', 'Raw JSON']);
  sheet.appendRow([new Date().toISOString(), JSON.stringify(data)]);
}

// Duplicated (by necessity, different runtimes) from computePerformanceIndex() in shared.js —
// keep both in sync if this formula ever changes.
function computeIndex(data) {
  const sleep  = data.sleepScore    != null ? data.sleepScore / 100           : null;
  const rating = data.workoutRating != null ? data.workoutRating / 5          : null;
  const cals   = data.calories      != null ? Math.min(data.calories / 500, 1) : null;
  const vals = [sleep, rating, cals];
  const weights = [0.4, 0.4, 0.2];
  let total = 0, wSum = 0;
  vals.forEach((v, i) => { if (v !== null) { total += v * weights[i]; wSum += weights[i]; } });
  return wSum > 0 ? Math.round((total / wSum) * 100) : null;
}

// Test by running doGet — visit the /exec URL in browser to verify it's deployed
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: 'Morning Flow sync active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
