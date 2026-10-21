# FoamLens GRANADA G8 — real installed + portable Time Series recapture

2026-10-21. This is **an isolated test-only branch stacked on the original G7 Windows B13 PR #207**, not an edit to PR #207, #205 or #209 and not a source merge.

## Provenance and goal
- Original 36-image genuine B13 installed+portable Windows test [run 39653782246](https://github.com/michels-lab/FoamLens/actions/runs/39653782246), source `ddbd8405c9d4d1c7efc7f0e065a82fce16208c4f`, showed **Data → Time Series compact** as a very narrow graph beside a dominant imported-case sidebar. Other 35 capture slots are independent evidence and must remain available.
- Source owner PR #209 provides `v28-granada-compact-timeseries.js`, pinned **exactly** at `a2fa8ac52815949652c89f37b0f95d86d9b15719`, after its dedicated two-OS original-selector tests passed. Pinning fails closed on any head movement.
- The existing original 16-science/CAD/Field case-source hashes, G7 #205 exact pin, five B13 metal/mold cases, installer/portable EULA/shortcuts/install/uninstall, SHA artifact parity and original 36 visual-integrity slots are preserved.
- The only workflow delta is new G8 pinned source stage + original source tests in ephemeral Windows checkout before creating AppBundle.zip and requiring the exact new module inside the bundle. No product source on the original owner branches is altered and no releases are published.

## New native screenshot geometry gate
- Added `tools/granada_g8_native_plot_visibility_gate.py` and five independent positive/negative screenshot regression cases. After existing genuine B13 Setup/Portable evidence, the workflow enforces 640×900 real PNG geometry with >=480px horizontal light-plot span on at least five independent chart rows for BOTH distributions. It records `granada-g8-chart-footprint.json` inside the original evidence upload.
- Old genuine G7 screenshot had about 220px chart footprint and would fail this gate. Original G8 (before series-list visibility repair) had about 598px in each app distribution. Pixel footprint is not accuracy, scroll/zoom, physical DPI or aesthetic acceptance.
- Earlier CI run 39665642578 failed safely on an outdated pinned #209 head as that owner advanced. No incorrect code was packaged or accepted. The latest workflow pin must match current exact G8 head before rerun.

## Acceptance/evidence boundaries
- A green CI can establish source pinning, test suite consistency, native bundling and capture provenance. **It does NOT establish** layout attractiveness, chart bounds/units, human sign-off, correct physics beyond existing source-backed checks, physical OS DPI 125–200%, or final release readiness.
- After success, inspect the NEW installed and portable `time-series-compact.png`, with at least `field-compact.png`, `field-compare-compact.png`, `analysis-compact.png` to ensure no regressions. Measure that original Time Series selects are visible and the actual plot is wider; examine legend, axis, tooltips, overlays and import panel keyboard behavior.
- Distinctness/canonical image provenance must pass for all 36 captures. Physical DPI tests and owner aesthetic acceptance remain separate.
- Keep original source PR #209 draft until the real captures and runtime observations are reviewed; stable final release is possible only after all cross-product source, scientific, Windows installed and distribution gates, with **no release candidates**.

## Status
- Source staged on separate branch; GitHub CI/run results must be recorded against exact final branch SHA after workflow completes. No G8 runtime success or aesthetic approval is claimed at document creation.
