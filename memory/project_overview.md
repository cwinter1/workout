---
name: project-overview
description: What this app is, where it lives, the working file location, and how to ship
metadata:
  type: project
---

Single-file HTML/CSS/JS PWA. No framework, no build step, no dependencies.

**Working file**: `c:\Users\crist\Downloads\index.html`
**Repo**: `c:\Users\crist\Downloads\workout-repo\`
**Live URL**: https://cwinter1.github.io/workout/

Before every commit, sync the working file:
```
cp "c:/Users/crist/Downloads/index.html" "c:/Users/crist/Downloads/workout-repo/index.html"
```

**Why:** Everything is edited in Downloads/index.html and loaded directly in mobile Safari for testing. The repo is a deployment target, not a dev environment.

**How to apply:** Never edit `workout-repo/index.html` directly. Always sync from Downloads first.

## Git workflow (non-negotiable)
Never push to main directly. Branch → edit → rebase main → push → delete branch.
```
git checkout -b feature/<short-topic>
git add index.html
git commit -m "..."
git push -u origin feature/<short-topic>
git checkout main
git rebase feature/<short-topic>
git push origin main
git branch -d feature/<short-topic>
git push origin --delete feature/<short-topic>
```

## Program structure

Two programs, switched via a Home/Office toggle at the top of the home screen (`state.mode`, 'home' or 'office'). `currentDay()` returns the active program's "day" data regardless of mode — most render code is shared.

**AM program** (`state.mode === 'home'`) — 3 day types × 4 weeks. `PROGRAM.days[0/1/2]`:
- Index 0: STRENGTH — Strength · Mobility
- Index 1: POSTURE — Posture · Desk Recovery
- Index 2: YOGA — Yoga · Active Recovery

`SESSION_MIN = 35`. Phase time allocation: stretch 4/35, warmup 5/35, main 18/35, yoga 5/35, meditation 3/35.

**Office program** (`state.mode === 'office'`) — `OFFICE_PROGRAM`, one isometric circuit × 4 weeks × 2 sessions/week (8 total). Same 5 exercises every session (Plank, Wall Sit, Dead Bug Hold, Glute Bridge Hold, Farmer Carry Hold), 3 rounds, 30s rest between holds. Hold time increases by week: 30/40/50/60 sec — so total session length grows from ~15 min (week 1) to ~22 min (week 4), it isn't pinned to a fixed duration. `officeDay()` builds a synthetic "day" whose 3 "phases" are the 3 rounds; `buildOfficeTimeline(week)` builds the flat timeline the same way `buildTimeline()` does for the AM program.

## View routing
`state.view` → `render()` calls the matching renderer:
- `home` → `renderHome()`
- `preview` → `renderPreview()`
- `session` → `renderSession()`
- `meditation` → `renderMeditation()`
- `done` → `renderDone()`
- `program` → `renderProgram()`
- `measurements` → `renderMeasurements()`
