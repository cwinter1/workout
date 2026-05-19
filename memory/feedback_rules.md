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
**Why:** Breaks the single-file PWA pattern; not applicable to browser JS anyway.

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
