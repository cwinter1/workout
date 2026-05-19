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
