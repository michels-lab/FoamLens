# Field 3D — large-coordinate camera midpoint audit (2026-10-12)

## Source and diagnosis
The production `fvRegionUnionBounds` camera union previously calculated each midpoint as `(min+max)/2`. Two individually finite, same-sign OpenFOAM coordinates can make `min+max` overflow, incorrectly producing an infinite camera center even for a zero-span region.

## Bounded correction
Compute `min/2+max/2` for each axis, preserving finite same-sign extremes, valid physical zero, existing bounding-box validity checks, and the current renderer and UI. The original mathematical result is unchanged in ordinary cases within rounding limits.

## Regression evidence
`desktop/tests/field-region-camera-midpoint.test.cjs` executes the actual production union functions with finite `1e308` coordinates, a legitimate zero-origin region and invalid bounds. The CI test suite manifest mandates that every `.test.cjs` file be executed exactly once; the Windows workflow now includes this test.

Original candidate exact-head Windows and real QuickCup CI #38237340437 passed. This PR must receive new combined candidate CI after FoamLens PR #87 was integrated on main (merge `1fa6fcc2dfa27fb25144a6b066dab4379331e71d`). Do not treat the earlier standalone run as evidence for the new combined integration, and do not publish a release. Complex intersecting transparency and large-scene real GPU VRAM remain separate issue #40 evidence.
