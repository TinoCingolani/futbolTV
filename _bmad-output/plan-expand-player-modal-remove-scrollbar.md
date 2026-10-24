---
title: 'Expand match player modal size, eliminate scrollbar, and preserve 16:9 player bounds'
type: 'bugfix'
ticket: ''
created: '2026-10-24'
status: 'built'
baseline_revision: 'b58c60fca5c31e060c95455fdbeb12bf50079590'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When entering a match or stream, the player modal window is constrained to a small box (max-w-5xl) leaving significant unused screen space, and the player frame displays a scrollbar and/or is partially cut off instead of displaying the entire stream player smoothly.

**Approach:** Expand the modal window width and height to occupy the vast majority of the viewport (w-full max-w-[96vw] h-[93vh] to 95vh), enforce `min-h-0` and `overflow-hidden` on the player container with flex-1, apply `scrolling="no"` and CSS overflow prevention on the iframe, and ensure headers/footers do not wrap or squeeze video viewport height.

</frozen-after-approval>

## Implementation Notes

- Initial oneshot expanded the modal dialog to `96vw` and `95vh`, but forcing `width: 100%; height: 100%` on the iframe caused it to take a ~2.3:1 aspect ratio on widescreen displays. Embedded 16:9 players (JWPlayer, Clappr) scaled up to the width and overflowed vertically, clipping the top scoreboard and bottom player controls.
- Adjusted `#stream-iframe` to maintain strict 16:9 proportional bounds via `aspect-ratio: 16 / 9; max-width: 100% !important; max-height: 100% !important; width: auto !important; height: auto !important; margin: auto !important;`.
- Verified via headless browser inspection: on 1920x1080 and laptop viewports, the iframe computes to exact 1.777:1 ratio (1414×795), ensuring both the top scoreboard and bottom controls remain 100% visible inside the modal frame without cropping.

## Plan Change Log
- iteration 1: Fixed aspect-ratio clipping where `width: 100%; height: 100%` forced ultra-wide iframe geometry, causing vertical overflow of 16:9 video content. Added `aspect-ratio: 16/9` with auto dimensions and 100% max bounds.

## Review Triage Log
- quick: `false` (Syntax claim): Verified on disk; `app.js` had proper template string quotes and evaluated cleanly with `node -c app.js`.
- quick: `medium` -> `patch`: Added `lucide.createIcons()` in `closePlayerModal` when resetting theater button icon.
- quick: `low` -> `patch`: Removed fixed pixel cap `2xl:max-w-[1850px]` to ensure 96vw coverage on large 1440p/4K monitors.
- quick: `low` -> `patch`: Prevented channel/options subheader wrapping using horizontal scroll with `no-scrollbar` to protect video height.
- quick: `medium` -> `patch`: Handled `.theater-active` on parent `#player-modal` to remove padding and ensure full 100vw × 100vh viewport expansion without control clipping.

## Verification

**Manual checks (if no CLI):**
- Open `http://localhost:3000` or `index.html` in browser.
- Click any match or channel "Ver Transmisión" / "Reproducir".
- Verify modal occupies 95%+ of the screen width and height.
- Verify stream player iframe renders in full 16:9 ratio with the top scoreboard and bottom control bar completely visible and centered.
- Click the Theater Mode toggle button and verify it expands to 100% of the screen seamlessly.
