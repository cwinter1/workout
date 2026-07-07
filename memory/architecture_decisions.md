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

## Single file, no framework, no build step
**Why:** Deployed via GitHub Pages as a single `index.html`. No npm, no bundler, no split files. Adding a framework would require a build pipeline and break the direct-file editing workflow.

**How to apply:** Never suggest splitting into components, adding React/Vue, or introducing a build step.

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

## Office program: second mode, not a second app
Added a 4-week, 2x/week isometric core routine (Plank, Wall Sit, Dead Bug Hold, Glute Bridge Hold, Farmer Carry Hold — 3 rounds, hold time 30→60s across weeks, 30s rest) alongside the original AM program, toggled from a Home/Office switch at the top of the home screen.

**Why this shape:** The AM program's session engine (timer, preview/session/rest views, controls, wake lock, Garmin cards, done-screen flow, share card) is entirely reusable — only the *data* differs (what a "day" is, how many sessions/week, what the hold time is). Building a second app or a fully separate screen tree would have duplicated hundreds of lines for no benefit.

**How it's wired in:**
- `currentDay()` returns `officeDay()` when `state.mode === 'office'`, else `PROGRAM.days[state.day]` — every render function that used to reach into `PROGRAM.days[state.day]` directly now calls `currentDay()`.
- Office "phases" are the 3 rounds through the 5-exercise circuit (named `'1st Round'/'2nd Round'/'3rd Round'` — the phase-bar UI derives its short label from the first word of the phase name, so plain `'Round 1'/'Round 2'/'Round 3'` would all collapse to the same label).
- `buildOfficeTimeline(week)` produces the same flat item shape as `buildTimeline()` (`phaseIdx/phaseId/phaseName/intent/exIdx/exName/variant/seconds/kind`), so `renderPreview`/`renderSession`/`renderRest`/`renderControls`/`updateTimerDisplay`/`skipExercise` needed zero changes.
- Progress keys are prefixed by mode (`w` vs `o`) in the same `mf.progress` object/`mf.sessions` array — no new localStorage keys. `nextOfficeSession()` mirrors `nextSession()` but scans 4 weeks × 2 days instead of 4 × 3.
- `state.mode` is runtime-only, defaults to `'home'` on boot, and is recomputed (along with `state.week/day`) whenever the toggle is clicked.
- Office done-screen message pool (`pickOfficeMessage`) and home-screen phrase pool (`OFFICE_PHRASES`) are separate from the AM ones — different tone context (office break, no shower) even though the dry/no-exclamation voice rule is the same.
