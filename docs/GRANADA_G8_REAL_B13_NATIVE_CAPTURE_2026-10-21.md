# FoamLens GRANADA G8 — real installed + portable Time Series recapture

2026-10-21. This is **an isolated test-only branch stacked on the original G7 Windows B13 PR #207**, not an edit to PR #207, #205 or #209 and not a source merge.

## Provenance and goal
- Original 36-image genuine B13 installed+portable Windows test [run 39653782246](https://github.com/michels-lab/FoamLens/actions/runs/39653782246), source `ddbd8405c9d4d1c7efc7f0e065a82fce16208c4f`, showed **Data → Time Series compact** as a very narrow graph beside a dominant imported-case sidebar. Other 35 capture slots are independent evidence and must remain available.
- Source owner PR #209 provides `v28-granada-compact-timeseries.js`, pinned **exactly** at `062799febaedd0f93eda47dfcc58050da50281ed`, after its dedicated two-OS original-selector tests passed. Pinning fails closed on any head movement.
- The existing original 16-science/CAD/Field case-source hashes, G7 #205 exact pin, five B13 metal/mold cases, installer/portable EULA/shortcuts/install/uninstall, SHA artifact parity and original 36 visual-integrity slots are preserved.
- The only workflow delta is new G8 pinned source stage + original source tests in ephemeral Windows checkout before creating AppBundle.zip and requiring the exact new module inside the bundle. No product source on the original owner branches is altered and no releases are published.

## Acceptance/evidence boundaries
- A green CI can establish source pinning, test suite consistency, native bundling and capture provenance. **It does NOT establish** layout attractiveness, chart bounds/units, human sign-off, correct physics beyond existing source-backed checks, physical OS DPI 125–200%, or final release readiness.
- After success, inspect the NEW installed and portable `time-series-compact.png`, with at least `field-compact.png`, `field-compare-compact.png`, `analysis-compact.png` to ensure no regressions. Measure that original Time Series selects are visible and the actual plot is wider; examine legend, axis, tooltips, overlays and import panel keyboard behavior.
- Distinctness/canonical image provenance must pass for all 36 captures. Physical DPI tests and owner aesthetic acceptance remain separate.
- Keep original source PR #209 draft until the real captures and runtime observations are reviewed; stable final release is possible only after all cross-product source, scientific, Windows installed and distribution gates, with **no release candidates**.

## Status
- Source staged on separate branch; GitHub CI/run results must be recorded against exact final branch SHA after workflow completes. No G8 runtime success or aesthetic approval is claimed at document creation.
