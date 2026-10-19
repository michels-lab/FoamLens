# Operación Granada #153 — 3D Solidification Front Tracker (source-backed partial implementation)

Status: **independent unreleased scientific candidate**. Branch `feat/granada-153-source-backed-front-proxy-20261019`; does not touch active Field #162, CAD #164, 2D/3D #165, Energy #166, Thermocouple #167, Health #168 or Phase/Momentum #169 pull requests.

## Audited existing functionality

- `v14-isosurface.js` already reconstructs 3D scalar-field iso-surfaces by marching tetrahedra over the original OpenFOAM polyMesh. This new tracker **does not rewrite** that renderer and **does not label its face-crossing proxy as an exact iso-surface**.
- `v13-solidification-analysis.js` already analyzes 1D liquid/solid-fraction time-series derivatives, time intervals and melting; that code remains unchanged.
- `v14-field-view.js` already loads reconstructed and partitioned OpenFOAM polyMesh states, associates source scalar fields with actual cells and regions at physically written output times, and handles dynamic mesh snapshots. Its `fvLoadFrameData` and `fvFieldGroups` are reused, not duplicated.

## New read-only Analysis workflow

**Analysis → Granada · 3D Solidification Front Tracker** selects:
- Actual source OpenFOAM case, physical region and original dimensionless **volume scalar**. Explicit owner checkbox confirms that the chosen field represents **liquid fraction αL**, not any other dimensionless field.
- Solid/mushy and mushy/liquid thresholds with 0 ≤ low ≤ high ≤ 1, original iso threshold in (0,1), and centroid displacement axis X/Y/Z.

For each original physical output time (up to a safe **240 snapshots; no silent truncation**):
1. Load the exact source field and source mesh snapshot. Reject non-source, nonfinite, invalid, missing, surface/point-associated or non-dimensionless data; reject partial partition/mesh mismatches rather than inventing cells.
2. Verify raw face offsets/owners/neighbours, face-vertex coordinates, source cell centers, positive oriented tetrahedral cell volumes, signed-volume consistency and face-shell area closure. PolyMesh irregularity caveats remain; geometry is not claimed fully certified for concave/overlapping/defective cells.
3. Compute **actual geometric volume [m³]** and fractional volume for solid/mushy/liquid, unweighted category **cell counts**, and *volume-weighted* source liquid fraction (unlike simply counting equal-sized cells). Check all phase volumes sum to independently computed total mesh volume.
4. Scan only actual **internal cell faces** where neighboring cell-centered liquid fractions straddle the user iso-threshold. Sum original face areas and compute the face-area-weighted centroid in physical coordinates. This is explicitly a **CELL-FACE CROSSING PROXY**, not the actual mathematically reconstructed iso-surface area or a unique local front location.
5. Across consecutive source times, report only **apparent motion of the crossing-face centroid**. It is unavailable if source outputs are missing between two samples, source mesh runtime identity changes, geometry/region does not match, or the front vanishes. A centroid displacement never automatically represents a local propagation speed or accounts for front splitting.
6. Display phase-fraction evolution as **disconnected original source-time points** and detailed per-time phase volumes/interface proxy measurements. The record of excluded physical times and reasons is retained. Optional local JSON/CSV export only after a fresh run; changed inputs or case identity invalidate results.

## Scientific constraints

- Original field source paths, physical times, mesh counts/dynamic state, temperature independent of alpha, and interpretation limits accompany the exported dataset.
- For partially invalid cases, no silent numerical repair or averaging, and no recalescence, nucleation or microstructure inference.
- Physical mesh units are assumed OpenFOAM SI meters (as per OpenFOAM mesh conventions); original user CAD/STL unit confirmation is a **separate** future integration and cannot be inferred here.
- The runtime mesh identity guard is conservative within the current session, not a persistent verified mesh hash. External mesh modifications or pathological mixed/higher-order geometry require independent verification.
- No numerical 3D front is tracked when alphaL, its physical region/time, or a usable source polyMesh is unavailable. That is a correct **not available**, not a zero front.

## Remaining issue #153 acceptance

- True source-backed 3D reconstructed iso-surface area and geometrically justified front location/velocity with continuity across times, disconnected-front tracking, and phase-interface localization beyond crossing-face proxies.
- Verified source **thermal gradients** along the interface, cross-region/cross-case front observables and mesh-deformation/mesh-motion-aware comparisons.
- High-volume streaming/worker execution to avoid synchronous mesh topology work for large meshes; complete irregular, nonconvex and moving mesh geometrical validation.
- User original datasets, Windows Setup/Portable WebView2 installed and science visual acceptance, consolidated PR integration and release authorization.

## Regression

`node desktop/tests/solidification-front-proxy.spec.cjs` validates exact oriented cubic cell volumes (including unequal cell sizes), front face area/centroid, thresholds, missing/nonfinite alpha, unclosed/reversed faces and true missing-time/mesh-identity velocity safeguards.

`node desktop/tests/solidification-front-loader.spec.cjs` ensures real native versioned module injection and preserved original Field/isoface and phase-signal engines.

Independent Ubuntu/Windows action `.github/workflows/granada-solidification-front.yml` also runs original `isosurface.test.cjs`, `solidification-analysis.test.cjs`, and `physical-3d-scale.test.cjs`. **The action is not an installed acceptance or permission to release.**
