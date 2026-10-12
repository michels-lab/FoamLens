# Field 3D fallback physical-depth acceptance — 2026-10-12

- Keep the already-approved UI, WebGL passes and triangle-sort cap intact.
- Missing, boolean, blank, partial or reversed XYZ mesh bounds cannot be assigned a fictitious position at zero during metal/mold fallback transparency ordering. They use an explicitly unknown fallback depth and deterministic region label tie-break.
- Preserve measured zero coordinates, numeric OpenFOAM values, opaque-first depth writes, selected primary region and existing probe/export rendering.
- Source-executed physical-depth checks plus production renderer harness regression and exact-head Windows/QuickCup CI are required.
- **Still open:** true intersection/copanar alpha quality on real owner device and real multi-million-cell hardware RAM/VRAM/performance. This code guard alone does not close issue #40 or authorize a release.
