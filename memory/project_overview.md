---
name: project-overview
description: What this app is, where it lives, the working files, and how to ship
metadata:
  type: project
---

Plain multi-file HTML/CSS/JS static site. No framework, no build step, no dependencies. Two real pages (`index.html` = AM program, `office.html` = Office program) sharing an engine file (`shared.js`) — see `memory/architecture_decisions.md` for why it's split this way instead of one file or ES modules.

**Working files**: `c:\Users\crist\Downloads\{index.html, office.html, shared.js, am.js, office.js}` — all 5 must live in the same folder, since the `.html` files reference the `.js` files by relative path and `office.html` is reached from `index.html` via a real link.
**Repo**: `c:\Users\crist\Downloads\workout-repo\`
**Live URL**: https://cwinter1.github.io/workout/

Before every commit, sync all 5 working files:
```
cp "c:/Users/crist/Downloads/index.html"  "c:/Users/crist/Downloads/workout-repo/index.html"
cp "c:/Users/crist/Downloads/office.html" "c:/Users/crist/Downloads/workout-repo/office.html"
cp "c:/Users/crist/Downloads/shared.js"   "c:/Users/crist/Downloads/workout-repo/shared.js"
cp "c:/Users/crist/Downloads/am.js"       "c:/Users/crist/Downloads/workout-repo/am.js"
cp "c:/Users/crist/Downloads/office.js"   "c:/Users/crist/Downloads/workout-repo/office.js"
```

**Why:** Everything is edited in Downloads and loaded directly in mobile Safari for testing (all files must load via `file://` without a server, which is why classic `<script src>` was used instead of ES modules — modules are CORS-blocked over `file://`). The repo is a deployment target, not a dev environment.

**How to apply:** Never edit the `workout-repo/` copies directly. Always sync from Downloads first — for all 5 files, not just `index.html`.

## Git workflow (non-negotiable)
Never push to main directly. Branch → edit → rebase main → push → delete branch.
```
git checkout -b feature/<short-topic>
git add index.html office.html shared.js am.js office.js
git commit -m "..."
git push -u origin feature/<short-topic>
git checkout main
git rebase feature/<short-topic>
git push origin main
git branch -d feature/<short-topic>
git push origin --delete feature/<short-topic>
```

## Program structure

Two independent pages, linked by real navigation (`window.location.href`, not an in-app view switch):

**`index.html` + `am.js`** — the AM program. 3 day types × 4 weeks. `PROGRAM.days[0/1/2]`:
- Index 0: STRENGTH — Strength · Mobility
- Index 1: POSTURE — Posture · Desk Recovery
- Index 2: YOGA — Yoga · Active Recovery

`SESSION_MIN = 35`. Phase time allocation: stretch 4/35, warmup 5/35, main 18/35, yoga 5/35, meditation 3/35.

**`office.html` + `office.js`** — the Office program. `OFFICE_PROGRAM`, one isometric circuit × 4 weeks × 2 sessions/week (8 total). Same 5 exercises every session (Plank, Wall Sit, Dead Bug Hold, Glute Bridge Hold, Farmer Carry Hold), 3 rounds, 30s rest between holds. Hold time increases by week: 30/40/50/60 sec — so total session length grows from ~15 min (week 1) to ~22 min (week 4), it isn't pinned to a fixed duration. `officeDay()` builds a synthetic "day" whose 3 "phases" are the 3 rounds; `buildOfficeTimeline(week)` builds the flat timeline the same way `buildTimeline()` does for the AM program.

**`shared.js`** — the engine both pages load: palette, icons, `EX_INFO`/`YT_IDS`, audio/wake-lock, all `mf.*` localStorage helpers, `getStreak`, `captureProgressPhoto`, `shareWorkout`, the generic `renderWeekSection`/`renderProgressGrid` UI builders, and the entire session engine + `renderPreview`/`renderSession`/`renderRest`/`renderMeditation`/`renderControls`/`renderDone`. These generic functions call small "contract" functions each page defines (`currentDay()`, `nextSession()`, `buildSessionTimeline()`, `defaultSessionSeconds()`, `pickDoneMessage()`, plus `PROGRESS_PREFIX`/`TOTAL_SESSIONS` constants) — full details in `memory/architecture_decisions.md`.

`localStorage` (`mf.progress`, `mf.sessions`, etc.) is the only thing connecting the two pages — both are same-origin so it's naturally shared; there is no other cross-page state.

## View routing
Each page has its own `render()` dispatching on its own `state.view`:

**`am.js`**: `home` → `renderHome()` · `preview` → `renderPreview()` · `session` → `renderSession()` · `done` → `renderDone()` · `program` → `renderProgram()` · `measurements` → `renderMeasurements()` (meditation is handled inside `renderSession()` when `cur.kind === 'meditation'`, delegating to `renderMeditation()`)

**`office.js`**: `home` → `renderHome()` · `preview` → `renderPreview()` · `session` → `renderSession()` · `done` → `renderDone()` (no `program`/`measurements` views — Office links back to `index.html` for those)
