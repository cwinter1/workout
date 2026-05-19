---
name: user-context
description: Device, location, goals, and manual Garmin approach
metadata:
  type: user
---

- **Device**: iPhone, iOS Safari only — no Android, no desktop testing needed
- **Location**: Israel
- **Goal**: 4-week morning routine (35 min/day, 3 days/week) — track body metrics + Garmin data manually
- **Garmin**: Manual entry only, no API, no PC export. Two entry points:
  - Pre-workout (home screen): sleep score (0-100) + sleep hours + sleep minutes
  - Post-workout (done screen): total calories + active hours + active minutes
- **Data use**: Stored in `mf.garmin` for future personalized insights/encouragement. Not yet driving logic — accumulate history first.
- **Photo**: Front camera via `<input capture="user">`. Thumbnail (240×240 JPEG) stored in session record. Full image sent to camera roll via Web Share API.
- **Storage**: `localStorage` only — no backend, no sync, no account.

## Garmin future direction
Once enough history accumulates (~4+ weeks), Garmin data can inform:
- Encouragement message selection (e.g. low sleep score → recovery-focused message)
- Session recommendations (e.g. high fatigue → yoga day swap)
Not built yet. Do not wire up until user asks.
