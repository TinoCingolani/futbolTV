---
title: 'Rebrand to futbolTV, fold other sports with preview, and simplify page'
type: 'feature'
ticket: ''
created: '2026-10-25'
status: 'built'
baseline_revision: '1024debcf7f31ee7e28a596aeb5e7902853f0796'
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

**Problem:** In the "Personalizada" filter, non-football sports (F1, UFC, Boxeo, Tenis, etc.) take up large vertical space on initial load, pushing football matches down. Additionally, the site still uses the legacy brand "SportsHub Live", and user requested to make the page as simple and fast as possible.

**Approach:** 
1. Rebrand the application to "futbolTV" across navbar, document title, and footer.
2. In the "Personalizada" view, render the "Otros Deportes (F1, UFC, Boxeo...)" section collapsed by default, displaying a compact preview of upcoming events (sport name, time, title) and an expand/collapse toggle button.
3. Streamline page performance and visual complexity: minimize unnecessary animations/DOM overhead, optimize typography and styling to make the interface lightweight, clean, and instant to load.

</frozen-after-approval>

## Implementation Notes

- Updated `index.html`:
  - Set `<title>futbolTV - Eventos & Canales en Vivo</title>`.
  - Rebranded logo and navbar to "futbolTV" with modern emerald-to-cyan gradient and clean subtitle.
  - Streamlined Hero banner from a tall 300px block to an ultra-fast, compact bar (~70px height on desktop), keeping real-time stat counters intact while bringing live event listings above the fold.
  - Updated footer to "futbolTV • Conectado a tadeoallende/repos-web".
- Updated `app.js`:
  - Added `isOtherSportsExpanded = false;` to state (collapsed by default).
  - Renamed category 0 to "Otros Deportes (F1, UFC, Tenis, Boxeo...)".
  - Implemented `renderOtherSportsCollapsedPreview` showing section header, "Plegado" badge, toggle button, and a sleek preview grid of upcoming events with custom sport badges (`🏎️ F1`, `🥊 UFC`, `🎾 Tenis`, `🥊 Boxeo`, `⚾ MLB`, `🏍️ MotoGP`), formatted start times, live indicators, and direct play buttons.
  - Added `toggleOtherSportsSection()` for seamless expanding/collapsing.
  - Added secondary fold action button at the bottom of the expanded section so users can fold it back without scrolling up.
- Updated `styles.css` & `README.md` to reflect `futbolTV`.
- Verified in browser with automated subagent: verified title, compact hero, default folded state with event preview, smooth expansion, folding, and 0 console errors.

## Plan Change Log

## Review Triage Log

- quick lens: 0 defects found. All criteria met and verified in live browser.

## Verification

**Manual checks (if no CLI):**
- Inspect index.html brand title and navbar: displays "futbolTV" with clean modern styling (Passed).
- Inspect "Personalizada" filter: "Otros Deportes" appears collapsed by default with preview grid of upcoming non-football events (Passed).
- Test clicking expand/collapse toggle: expands smoothly to show all other sports cards, and collapses back when toggled (Passed).
- Verify page is clean, fast, and responsive with no console errors (Passed).
