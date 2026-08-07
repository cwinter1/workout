// Contract test tying the app's syncToSheets() payload shapes to apps-script/Code.gs's routing
// logic — the one real integration point in this repo with no shared type system and no runtime
// contract check otherwise. A silent key-name mismatch on either side (e.g. renaming a field in
// one file without the other) would currently ship without any test failing; this closes that
// gap by running the ACTUAL Code.gs source (via Node's `vm` module, stubbing just enough of the
// Apps Script runtime — SpreadsheetApp/ContentService — to execute it) against payload shapes
// built the same way shared.js/daily-routine.js/am.js construct them for real.
//
// Node-only (not a browser test like tests/*.html) since Code.gs needs `fs`+`vm`, and isn't
// something a browser can load directly anyway — it runs in Google's Apps Script runtime, never
// in this app's own pages. Run with: node tests/apps-script-sync.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`PASS ${msg}`);
  else { console.log(`FAIL ${msg}`); failures++; }
}

// Stubs just enough of SpreadsheetApp's surface for Code.gs's getOrCreateSheet()/appendRow() calls
// to run — an in-memory { name -> { headers, rows } } map standing in for a real spreadsheet.
function makeFakeSpreadsheetApp() {
  const sheets = {};
  const sheetHandle = (name) => ({
    appendRow(row) {
      if (!sheets[name].headers) sheets[name].headers = row;
      else sheets[name].rows.push(row);
    },
    setFrozenRows() {},
    getRange() { return { setFontWeight() {} }; },
  });
  const ss = {
    getSheetByName: (name) => (sheets[name] ? sheetHandle(name) : null),
    insertSheet: (name) => { sheets[name] = { headers: null, rows: [] }; return sheetHandle(name); },
  };
  return { SpreadsheetApp: { getActiveSpreadsheet: () => ss }, sheets };
}

function loadCodeGs() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  const fake = makeFakeSpreadsheetApp();
  const sandbox = {
    SpreadsheetApp: fake.SpreadsheetApp,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ _text: text, setMimeType() { return this; } }),
    },
    console, JSON, Date, Math,
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { ctx: sandbox, sheets: fake.sheets };
}

function post(ctx, payload) {
  return ctx.doPost({ postData: { contents: JSON.stringify(payload) } });
}

const { ctx, sheets } = loadCodeGs();

// ── type: 'session' — the payload shape shared.js's "Bank it" handler actually sends ──
post(ctx, {
  type: 'session', date: '2026-08-07', week: 1, day: 0, dayTitle: 'Strength · Mobility',
  dayTag: 'STRENGTH', duration: 2100, workoutRating: 4, sleepScore: 76, sleepHours: 7,
  sleepMins: 30, calories: 420, activeHours: 0, activeMins: 35,
});
assert(!!sheets['Sessions'], 'type:session creates/writes to a "Sessions" tab');
assert(sheets['Sessions'].headers.length === 14, `Sessions header has 14 columns, unchanged from before the type split (got ${sheets['Sessions'].headers.length})`);
assert(sheets['Sessions'].rows[0][0] === '2026-08-07' && sheets['Sessions'].rows[0][2] === 1,
  `session row has the right date and 1-indexed day (got ${JSON.stringify(sheets['Sessions'].rows[0])})`);
assert(typeof sheets['Sessions'].rows[0][13] === 'number', 'session row includes a computed Performance Index');

// ── type: 'daily_routine' — the shape daily-routine.js's finishRoutine() actually sends ──
post(ctx, {
  type: 'daily_routine', date: '2026-08-07', totalReps: 45, totalHoldSeconds: 105,
  avgQuality: 7.4, resultsJson: JSON.stringify([{ label: 'Push-Ups', completedReps: 20 }]),
});
assert(!!sheets['Daily Routine'], 'type:daily_routine creates/writes to a "Daily Routine" tab, separate from Sessions');
assert(sheets['Daily Routine'].rows[0][1] === 45 && sheets['Daily Routine'].rows[0][2] === 105 && sheets['Daily Routine'].rows[0][3] === 7.4,
  `daily_routine row has totalReps/totalHoldSeconds/avgQuality in the right columns (got ${JSON.stringify(sheets['Daily Routine'].rows[0])})`);
assert(JSON.parse(sheets['Daily Routine'].rows[0][4])[0].label === 'Push-Ups', 'resultsJson round-trips through the sheet cell intact');

// ── type: 'measurement' — the shape am.js's Measurements "Save entry" actually sends ──
post(ctx, { type: 'measurement', date: '2026-08-07', weight: 81.2, waist: 88, hips: null, hr: 60, energy: 4 });
assert(!!sheets['Measurements'], 'type:measurement creates/writes to a "Measurements" tab, separate from the other two');
assert(sheets['Measurements'].rows[0][1] === 81.2 && sheets['Measurements'].rows[0][2] === 88,
  `measurement row has weight/waist in the right columns (got ${JSON.stringify(sheets['Measurements'].rows[0])})`);
assert(sheets['Measurements'].rows[0][3] === '', `a null field (hips) writes as a blank cell, not the string "null" (got ${JSON.stringify(sheets['Measurements'].rows[0][3])})`);

// ── backward compat: a payload with no `type` at all (an older cached client build) ──
post(ctx, { date: '2026-07-01', week: 2, day: 1, duration: 1800 });
assert(sheets['Sessions'].rows.length === 2, `a payload with no type field falls back to 'session' (Sessions now has 2 rows, got ${sheets['Sessions'].rows.length})`);

// ── forward compat: a type this version of Code.gs doesn't know about yet ──
post(ctx, { type: 'some_future_type', foo: 'bar' });
assert(!!sheets['Unrouted'], 'an unrecognized future type lands in an "Unrouted" catch-all tab, not dropped or thrown');
assert(sheets['Unrouted'].rows[0][1].includes('some_future_type'), 'Unrouted row preserves the raw payload JSON for later inspection');

// ── doGet health check (what visiting the /exec URL directly in a browser should return) ──
const health = JSON.parse(ctx.doGet()._text);
assert(health.ok === true, 'doGet() health check returns ok:true');

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
