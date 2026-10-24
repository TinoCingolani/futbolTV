---
title: 'Add anti-ad and popup blocker toggle to stream player'
type: 'feature'
ticket: ''
created: '2026-10-24'
status: 'built'
baseline_revision: 'dbbc8ec63c6e10152a901b18078f412a9aaee6d2'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Third-party streaming sources in the player modal open intrusive ads, popups, and redirects on user click.

**Approach:** Implement an Anti-Popups / Sandbox mode toggle in the stream player header (active by default). When active, apply strict iframe sandbox permissions (`allow-scripts allow-same-origin allow-forms allow-presentation`) to prevent popups and redirects, and allow users to toggle it off if a specific stream requires popups/less restriction to play.

</frozen-after-approval>

## Implementation Notes

- Added `btn-anti-ads` toggle button in the player modal toolbar (`index.html`).
- Set strict `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"` on `stream-iframe` by default, blocking popups (`window.open`) and unwanted top-level window redirection.
- Added `isAntiAdsActive = true;` in `app.js` guaranteeing that protection starts enabled every time the player modal is opened.
- Implemented `toggleAntiAds()` and `updateAntiAdsButtonUI()` allowing users to toggle it off if an external player requires unrestricted permissions to load.
- Verified in browser with automated subagent: verified active ON state upon load, verified sandbox attribute, verified toggling to OFF and back to ON.

## Plan Change Log

## Review Triage Log

## Verification

**Manual checks (if no CLI):**
- Inspect player modal toolbar in index.html to ensure anti-popup button is visible with clear active indicator (Passed).
- Verify stream-iframe receives sandbox attributes when anti-popup is active (Passed).
- Verify toggling the button reloads the iframe with or without sandbox as expected (Passed).
