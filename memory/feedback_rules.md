---
name: feedback-rules
description: Confirmed decisions, tone choices, and hard rules for this project
metadata:
  type: feedback
---

## Message tone: dry delivery, genuine warmth, no exclamation marks
User selected "Tone C" from three options.

**Why:** The app is a personal morning practice tool. Hype-voice ("crush it!", "amazing work!") would feel hollow after day 3. The messages should feel like a coach who respects the user's intelligence.

**How to apply:** `pickMessage()` — short sentences with honest weight. No exclamation marks. No superlatives. Acknowledge the real thing that happened, not a performance of enthusiasm.

## No emojis anywhere
**Why:** User preference. Consistent with the B·Restore design system.

## No `input()` calls
**Why:** Not applicable to browser JS anyway.

## No Garmin API
**Why:** User explicitly chose manual entry. Simple concrete fields only. The API route would require OAuth, a server, and complexity that serves no purpose for a personal single-device app.

**How to apply:** All Garmin data entry is via plain `<input>` fields in the UI. Never suggest connecting the Garmin Connect API.

## Terse responses, no trailing summaries
**Why:** User preference carried from global settings. Don't recap what was just done.

## Never push directly to main
**Why:** Non-negotiable workflow rule. See [[project-overview]].

## Design system: B·Restore Dark
Colors are fixed. Do not introduce new colors outside the T object.
```javascript
const T = {
  bg:      '#0e1116',
  fg:      '#e8e5dd',
  accent:  '#7aa676',
  accentT: '#0e1116',
  card:    '#16191e',
  hairline:'rgba(255,255,255,0.12)',
  mono:    'rgba(232,229,221,0.65)',
  pill:    'rgba(255,255,255,0.06)',
};
```

Fonts (all loaded from Google Fonts):
- `Space Grotesk` — display headings, CTAs
- `Manrope` — body text
- `JetBrains Mono` — labels, metadata, chips
- `Instrument Serif` — italic quote text (encouragement messages)

## Office program: confirmed decisions
Reached via a nav link ("Office · Core Reset" button on the AM home screen, same style as "4-week program"/"Measurements") that does a **real page navigation** to `office.html` — not a replacement for the AM program, not an in-app view switch, not a separate installable app.

**Two revisions before this landed:**
1. First version: a Home/Office toggle at the top of the home screen that re-rendered the whole screen in place. User rejected — "morning routine should keep as is, just add a link/button" to navigate to Office as its own screen.
2. Second version: kept it as one file, replaced the toggle with a nav-link button to an in-app `officeHome` view (own back button, AM home screen untouched). User then asked for genuine architectural separation ("thinking more as an architectural perspective, not user flow... I have used this repo already 3 times") — confirmed via `AskUserQuestion`: (a) real separate HTML files linked by navigation, not just more `<script>` files under one page, and (b) link-only, no separate "Add to Home Screen" entry for Office.
3. Current version: `index.html`/`am.js` (AM) + `office.html`/`office.js` (Office) + `shared.js` (engine both use). See `memory/architecture_decisions.md` for the full "contract" pattern. **The AM home screen (`am.js`'s `renderHome`) must never be touched by Office-specific logic — that boundary is now enforced by the file split itself, not just convention.**

- One exercise sequence repeated every session (not alternating day types) — Plank, Wall Sit, Dead Bug Hold, Glute Bridge Hold, Farmer Carry Hold.
- Hold time uniform across all 5 exercises, same value every exercise: 30/40/50/60 sec across weeks 1–4.
- 3 rounds through the circuit, 30 sec rest between every hold (including between rounds).
- Session length is **not** pinned to 15 min — it grows with hold time (~15 min week 1 → ~22 min week 4). "Fifteen minutes" in the original ask was the starting point, not a hard cap enforced every week.
- Farmer Carry is a **static loaded hold** (stand braced, holding whatever's on hand — no walking, no set kg progression) to fit the isometric/office/no-space framing, not a walking farmer's carry.
- Video preview shown before every occurrence of every exercise (all 15 per session), same as the AM program — not just the first time each exercise appears.
- Done screen keeps full parity with the AM program (Garmin post card, photo capture, rating, share) — not trimmed down despite the "no sweat, no shower" framing.
- Office gets its own encouragement message pool (`pickOfficeMessage`) and home phrase pool (`OFFICE_PHRASES`) — do not reuse the AM ones, tone context differs (office break vs. morning practice) even though the dry/no-exclamation voice rule is identical.
