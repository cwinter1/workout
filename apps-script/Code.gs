// Morning Flow — Google Sheets sync endpoint
// Deploy as: Extensions → Apps Script → Deploy → New deployment → Web app
//   Execute as: Me | Who has access: Anyone
// Paste the /exec URL into the app under Measurements → Sheets sync

const SHEET_NAME = 'Sessions';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Date', 'Week', 'Day', 'Day Title', 'Tag',
        'Duration (min)', 'Workout Rating',
        'Sleep Score', 'Sleep Hours', 'Sleep Mins',
        'Calories', 'Active Hours', 'Active Mins',
        'Performance Index'
      ]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    }

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

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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
