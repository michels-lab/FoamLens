# FoamLens — Operación Granada G2: Field source-native command workbench
Date: 2026-10-21 · Issue: #177 · Independent branch: `feat/granada-177-g2-field-original-command-dock-20261021`

## Owner problem and engineering scope

Michel wants **all workspaces, especially Field/3D and A–D, to look intentionally organized**; essential controls should not disappear into accordions or overlap the scientific canvas. This PR changes the active desktop Field A navigation workbench, not the OpenFOAM science engine, private datasets or source case mapper.

### Three concrete delivered packages

1. **Always discoverable native camera controls:** moves the seven original button nodes from hidden `.fvNavPresets > .fvPresetRow` to a directly visible third workbench group. Keeps DOM source identity, data-fv-view, native event listeners and actual 7 distinct camera geometries (no new camera algorithm).
2. **Structured command hierarchy:** retains and rearranges original orbit/pan/zoom/fit/reset and projection/physical dimensions/measure/clear original nodes into three balanced, readable sections. Scoped styling at desktop, 1240px and 760px breakpoints, with larger keyboard/finger targets, visible focus, existing active states, and no overlay over the actual 3D canvas. The Field-only main-view wrapper is used; original B–D per-viewport source dropdowns, Field F1 #162 and F2 #175 are not touched.
3. **Keyboard, localization and provenance:** arrow/Home/End keyboard control for the seven camera choices, live English/Spanish group headings, audit of exact original source IDs and event identity (no case names or simulation values in export), plus Node regression tests and separate Ubuntu/Windows CI including original 3D navigation, multi-view and workspace suites.

### Files / ownership

- `desktop/src/FoamLensDesktop/frontend/v25-granada-field-source-dock.js` — auto-included by existing versioned native desktop extension loader, no Program.cs changes
- `desktop/tests/granada-177-g2-field-source-dock.test.cjs` — source-native DOM preservation and keyboard tests
- `.github/workflows/granada-177-g2-field-command-dock.yml` — isolated CI and inherited Field regressions
- This document — independent log, avoids racing active GIT_AUDIT_LOG writes in PR #179

## Acceptance boundaries

- In scope: **Field A original navigation toolbar** and scoped caption layout affordances for B–D. The separate source region visibility selectors and additional per-viewport F1/F2 controls remain in their own PRs.
- The main scientific viewport, canvas, legend, units, physical timestamp, field selectors and all Source OpenFOAM values remain owned by the original Field modules.
- Source-backed tests can prove node identity and exact seven camera actions remain available, but **cannot** prove the actual installed Windows DPI arrangement is visually pleasing, that all 2+ region cases render accurately, or that B–D avoids overlap. Collect exact native WebView2 captures at 1024/1280/1920 and Windows DPI 125/150/175/200%, after combining F1/F2, with a real owner case.
- No versions, installers, merges or public releases without explicit separate authorization. Issue #177 remains open.
- Reentry: review this module beside #162 and #175 in a fresh composite candidate; verify precise active DOM/ribbon ownership and run real native QA before integrating. If source IDs change upstream, fail fast rather than fabricating UI.

## Verification log

- Source inspection: stable main `v14-field-view.js` defines original IDs and seven `data-fv-view` directions; `Program.cs` auto-loads `v*-*.js` frontend extensions.
- New synthetic DOM runtime checks: to be determined from GitHub Actions exact PR HEAD.
- GitHub Actions Ubuntu/Windows: to be determined from exact PR HEAD.
- Installed Windows Setup + Portable and real multi-region user acceptance: pending.
