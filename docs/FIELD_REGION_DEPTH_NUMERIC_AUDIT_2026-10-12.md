# Field 3D — finite-depth transparent-region sorting audit
Date: 2026-10-12

## Reproduced production defect
The fallback `fvRegionRenderLayers` sorted physical regions by camera depth using a center computed as `(boundsMin+boundsMax)/2` and a projection evaluated as `(center-eye)*forward/length`. Two finite but large same-sign mesh bounds could overflow these intermediates even though midpoint and normalized view-axis depth were finite.

A direct V8 execution of the actual, unchanged `main` renderer with two measured finite-depth regions, names deliberately ordered to expose numeric ties, produced the incorrect transparent order `near → far`: both depths overflowed and the lexical fallback won.

## Minimal correction and negative/positive reproduction
- Compute center as `min/2+max/2` on each axis.
- Normalize view direction before multiplication: `(position-eye)*(forward/length)`.
- Existing camera-axis, opacity, shared depth buffer and drawing behavior are preserved.
- The identical production renderer harness on this branch now produces `far → near`, not the baseline `near → far`.
- A source-executed regression is appended to `desktop/tests/field-view.test.cjs`; static JavaScript compilation and direct V8 execution passed in the preparation environment.

## Evidence boundary
These are arithmetic, source-executed renderer checks, **not** physical GPU proof of arbitrary intersecting alpha layers or multi-million-cell VRAM. Issue #40 remains open. Final Windows installed/portable UI, native WebView2 and QuickCup tests are required on this PR's exact source SHA before merge. No release authorized.
