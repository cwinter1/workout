---
name: architecture-decisions
description: Key technical choices and the reasoning behind them — iframe trick, single-file constraint, photo storage
metadata:
  type: feedback
---

## Never use `aspect-ratio:16/9` on iframes
Use the padding-top container trick instead.

**Why:** iframes have no intrinsic dimensions on mobile Safari — `aspect-ratio` CSS is ignored entirely. The app broke silently on iOS after tap-to-play until this was fixed.

**How to apply:** Every YouTube embed must use a `position:relative; padding-top:56.25%` outer div with the iframe inside as `position:absolute; inset:0; width:100%; height:100%`.

```javascript
const wrap = document.createElement('div');
wrap.style.cssText = 'position:relative;width:100%;padding-top:56.25%;';
const iframe = document.createElement('iframe');
iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;display:block;';
```

## Plain multi-file static site — no framework, no build step, no ES modules
**Revised after 3rd use of this repo.** Originally a single `index.html`. User explicitly asked for physical file separation for maintainability ("the file will be smaller and more accessible... I have used this repo already 3 times") — see "Office program" below for the resulting 5-file layout.

**Why not a build step or ES modules:** A bundler would require npm/build tooling, breaking the direct-file editing workflow (edit in Downloads, open directly in mobile Safari). ES modules (`type="module"`, `import`/`export`) were considered and rejected: module scripts are blocked by CORS when loaded via `file://`, which would break testing by opening the file directly in Safari — the whole reason the "no build step" constraint exists in the first place. Classic `<script src="...">` tags have no such restriction and were the actual driver of choosing plain-script splitting over ES modules.

**How to apply:** Never suggest splitting into framework components, adding React/Vue, ES modules, or introducing a build step. Splitting into more plain `.js` files loaded via classic `<script src>` (sharing one global scope, same as if it were all one file) is fine and is the established pattern — see `am.js`/`office.js`/`shared.js`.

## Photo storage: hybrid approach
Thumbnail (240×240 JPEG ~15KB) stored in localStorage session record. Full image sent to camera roll via Web Share API.

**Why:** localStorage has a ~5MB cap. Storing full-resolution photos would fill it in ~20 sessions. Web Share API routes the full image to the OS camera roll where it belongs.

**How to apply:** `captureProgressPhoto()` always produces both: thumbnail in `sessions[n].photo`, full file via `navigator.share({ files: [file] })`.

## All DOM via `el(tag, cssText)` utility
No HTML templates, no innerHTML for layout. Every element is created with `el()` and styled with inline cssText.

**Why:** Keeps everything in JS, consistent with a no-framework single-file approach.

## `env(safe-area-inset-top/bottom)` on all fixed bars
**Why:** iPhone notch and home indicator area. Without this, the top nav and bottom bar overlap system UI on newer iPhones.

## YouTube thumbnails as CSS background on a `padding-top:56.25%` div
Tap poster → replace with iframe (same padding-top wrapper). The poster is a zero-JS static image load that avoids loading the YouTube player until the user taps.

## Office program: separate HTML page, separate JS file, linked by real navigation
Added a 4-week, 2x/week isometric core routine (Plank, Wall Sit, Dead Bug Hold, Glute Bridge Hold, Farmer Carry Hold — 3 rounds, hold time 30→60s across weeks, 30s rest) alongside the original AM program. This went through two revisions before landing on the current shape — both are worth knowing so they aren't re-tried:

1. **First version:** built inside `index.html` as a `state.mode` ('home'/'office') that a Home/Office toggle at the top of the home screen switched, re-rendering the same screen in place with different data.
2. **Second version (user pushback: "keep morning routine as is, just add a link"):** kept everything in one `index.html`, but replaced the toggle with an "Office · Core Reset" nav-link button (same style as "4-week program"/"Measurements") that switched `state.view` to a second in-app view (`officeHome`) with its own back button. AM home screen itself was untouched. Still one file, still one `state.mode` flag threaded through `abortSession()`/`finishSession()`/`renderDone()` to decide which "sub-app" was active.
3. **Current version (user pushback: wants real architectural separation — "I've used this repo already 3 times," wants smaller/more accessible files for future work):** split into genuinely separate files —`index.html` + `am.js` for the AM program, `office.html` + `office.js` for Office, and `shared.js` holding everything both need. The two `.html` files are linked by plain `window.location.href` navigation (a real page load), not by an in-app view switch.

**Why real separate pages, not just more `<script>` files under one `index.html`:** the user asked for this specifically ("thinking more as an architectural perspective, not user flow") — confirmed via `AskUserQuestion` before building. Real navigation means each page is a fully independent, self-contained mini-app: no `state.mode` flag, no cross-cutting `isOffice` branches anywhere in the engine. `index.html`'s `state` and `office.html`'s `state` are two separate JS objects that only ever interact through `localStorage` (which *is* shared, since both pages are served from the same origin/path) — never through in-memory state.

**The "contract" pattern in `shared.js`:** `shared.js` holds the entire generic session engine (`startSession`/`startTimer`/`updateTimerDisplay`/`skipExercise`/`abortSession`/`finishSession`, plus `renderPreview`/`renderSession`/`renderRest`/`renderMeditation`/`renderControls`/`renderDone`, plus `shareWorkout`). These functions are written against a small set of names that each page-specific file (`am.js`/`office.js`) must define before `render()` is ever called:
- `state` — the page's own timeline/progress/view state (loaded from the shared `mf.progress`/`mf.sessions` localStorage keys)
- `currentDay()` — returns the active "day" object (`{ title, kicker, tag, phases }`); `am.js`'s is `PROGRAM.days[state.day]`, `office.js`'s is `officeDay()`
- `nextSession()` — scans `state.progress` for the first incomplete session and returns `{ week, day }`; each page scans its own key prefix/dimensions
- `buildSessionTimeline()` — returns the flat timeline array (`phaseIdx/phaseId/phaseName/intent/exIdx/exName/variant/seconds/kind`) for the current `state.week`/`state.day`
- `defaultSessionSeconds()` — fallback duration if `state.startedAt` wasn't set
- `pickDoneMessage(streak, week, total)` — the encouragement message for the done screen and share card
- `PROGRESS_PREFIX` (`'w'` or `'o'`) and `TOTAL_SESSIONS` (`12` or `8`) — constants used to build progress keys and compute the "X of Y done" counts
- `render()` — each page's own view dispatcher (different view sets: AM has `program`/`measurements`, Office doesn't)

Adding a third program later means: write its data + a `renderHome()` + these seven contract items in a new page-specific `.js`, link a new thin `.html` shell to it, and it gets the entire session/timer/done-screen engine for free from `shared.js`.

**Other specifics:**
- Office "phases" are the 3 rounds through the 5-exercise circuit (named `'1st Round'/'2nd Round'/'3rd Round'` — the phase-bar UI derives its short label from the first word of the phase name, so plain `'Round 1'/'Round 2'/'Round 3'` would all collapse to the same label).
- `EX_INFO`/`YT_IDS` (exercise descriptions + YouTube IDs) live in `shared.js` since both programs' exercises look up the same tables, including reused entries (Office's `Wall Sit` reuses the AM entry verbatim).
- `COACH_CUES` (AM-only voice-cue pool) lives in `am.js`, not `shared.js` — `shared.js`'s `updateTimerDisplay()` guards its reference with `typeof COACH_CUES !== 'undefined'` so Office (which never defines it) doesn't error; Office's timeline never has `phaseId === 'main'` anyway so the guarded branch never actually needs to fire there.
- Progress keys are prefixed (`w` vs `o`) in the same `mf.progress` object/`mf.sessions` array — no new localStorage keys, both pages read/write the same two keys.
- Office done-screen message pool (`pickOfficeMessage`, in `office.js`) and home-screen phrase pool (`OFFICE_PHRASES`) are separate from the AM ones — different tone context (office break, no shower) even though the dry/no-exclamation voice rule is the same.
- The Office screen deliberately has no Garmin sleep card (unlike AM home) — it's a midday break screen, not a morning one; the Garmin *post*-workout card on the done screen is unchanged/shared for both.
- `office.html` doesn't load `js.puter.com` (used only for AM's `speakCue()` voice cues) or the `apple-mobile-web-app-capable` meta tags — user confirmed Office should be link-only, not its own "Add to Home Screen" entry.
