# Design Spec: Move Projects Category Above Teams

**Date:** 2026-09-14  
**Status:** Approved  

## Goal
Reorder categories in `index.html` so that the `projects` window section appears directly before the `teams` window section in document flow.

## Context & Requirements
- Target repository: Personal single-page portfolio.
- Currently, `<main class="desktop">` contains window sections in the sequence:
  1. `#about` (`README.md`)
  2. `#teams` (`teams.log`)
  3. `#projects` (`projects/`)
  4. `#contributions` (`contribs.patch`)
  5. `#contact` (`contact.msg`)
- Requirement: Move the `#projects` section above the `#teams` section.

## Architecture & Layout
- Reorder elements directly within `index.html` under `<main class="desktop">`.
- New element sequence:
  1. `#about` (`README.md`)
  2. `#projects` (`projects/`)
  3. `#teams` (`teams.log`)
  4. `#contributions` (`contribs.patch`)
  5. `#contact` (`contact.msg`)

## Impact & Compatibility
- **CSS (`styles.css`):** The layout uses standard vertical flex flow. No CSS changes are needed.
- **JavaScript (`script.js`):**
  - Window controls (minimize, maximize, close) select all elements matching `.window` dynamically.
  - Heatmap and copy behaviors target specific selectors (`[data-heat-grid]`, etc.), completely independent of section order.
- **Accessibility:** Preserves intuitive top-to-bottom reading and tabbing order for screen readers.

## Verification
- Inspect `index.html` to ensure `#projects` section is cleanly positioned directly after `#about` and before `#teams`.
- Verify no duplicate or truncated tags.
