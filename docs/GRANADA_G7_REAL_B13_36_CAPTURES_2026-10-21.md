# FoamLens / GRANADA G7 — genuine B13 installed + portable visual proof
2026-10-21. Source base: G5 repair PR #203 with 36/36 original native images verified; G7 source from owner #205 SHA fa864aac7c92b39dff6801e9ef1067008f6b986c.

## Why
Previous QuickCup B13 36/36 all-tabs image integrity passed, but compact Field/Analysis showed a too-wide fixed left sidebar, squeezed 3D/graph and Ribbon overflow. G7 changes this. Old images CANNOT be used to approve the new layout.

## Exact safe procedure
- New stacked branch from #203, no mutation of G5 original or G7 original owners.
- Original workflow .github/workflows/granada-177-real-openfoam-field-f1.yml still downloads **five real B13 cases** through its existing trusted private fixture workflow and checks 0/metal/T, 0/mold/T, 9.8/metal/T and 9.8/mold/T SHA with asymmetric missing-frame enforcement.
- Windows runner pins all original 16 scientific/CAD/UX owners, grafts original G5 native source capture, then pins G7 PR #205 SHA via git ls-remote and git fetch. G7 code and source-owned tests are copied ONLY into the temporary CI checkout and tested there; if the source owner moved, fail before any screenshot.
- The source-owned v27-granada-compact-workbench.js is included in AppBundle.zip and original WinForms/WebView2 compiled app. Native physical Field metal/mold View B/XYZ, Portable and real Inno Setup installed smoke follow.
- Existing actual 36-capture gate, screenshot SHA and distinct-pixel audit, installed/portable SHA artifact parity, screenshot review pack and EULA wizard tests MUST remain unchanged and pass.

## Explicit limits
- G7 CSS only activates in Field and Analysis at <=1024 CSS px. Captures are wide/compact 1140/640px **viewport**, not physical Windows OS DPI 125/150/175/200 or independent owner visual approval.
- Expected result after success: 36/36 real runtime captures with provenance and human-visual-status REQUIRES_HUMAN_REVIEW. Source/capture integrity passing cannot certify attractive layout or correct experimental calibration.
- No release tags, no RC, no final Setup/Portable public binary, no merges into main, no credential or research data exposure.
- Human review must inspect at minimum Field-compact, Field-compare-compact, Analysis-compact, time-series-compact, both installed and portable, and verify the new full-width chart/3D remains visible with scientific controls reachable.
- After evidence, send corrective UX feedback to original source owner #205, and only later integrate safely with the wider 12-owner composition #206.
