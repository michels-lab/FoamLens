# Changelog

## Desktop v1.5.0 — 2026-10-05

- Added independent VTK-based B13 streamline geometry validation with mesh-aware interpolation and in-mesh termination.
- Added true high-resolution 3D rerendering for thesis/paper multi-panel exports.
- Added a controlled baseline-vs-optimized A/B performance benchmark using identical frame sequences and cleared caches.
- Added persistent Field Workspace layouts, resizable splitters, saved control groups and custom 3D view names.
- Added comparison status chips and contextual Field Workspace help.
- Preserved custom viewport names in scientific multi-panel exports.
- Validated the combined v1.5.0 candidate against the real QuickCup/B13 fixture in portable and installed Windows builds.


## Desktop v1.4.9 — 2026-10-03

- Added the compact Word-style ribbon with contextual scientific controls.
- Added advanced streamline seeding/integration controls and corrected the 64-seed cap.
- Added linked/independent multi-view cameras and visual settings.
- Added 3D-defined Spatial Profiles.
- Added Exact / Nearest / Interpolated physical-time synchronization with per-view timing badges.
- Added signed, absolute and percent 3D differences, plus Swap A/B and Copy A→B workflows.
- Added thesis/paper multi-panel figure export with 1-up, 2-up, 2×2 and 3D + Profile layouts.
- Added progressive field presentation, adaptive prefetch, viewport-aware loading and performance/cache telemetry.
- Validated against the real B13-derived OpenFOAM multi-case runtime fixture in both portable and installed Windows builds.


## v29

- Added a dedicated **Solver logs** data view, separate from probes and spatial profiles.
- Added automatic recognition of `foamLog`-style files such as `p_rgh_0` through `p_rgh_5`.
- Groups solver-log files by family and sub-iteration instead of treating them as unrelated curves.
- Added log-family and sub-iteration selectors with previous/next navigation.
- Recognizes related families such as final residual and iteration-count outputs.
- Supports detection from a `logs/` folder and compatible standalone log files.

## v28

- Added quick visibility controls for complete spatial-profile families.
- Family visibility now persists while using Play, Previous/Next, or the profile time slider.
- Added automatic case-family comparison shortcuts.
- Added expanded curve metrics including extrema locations, averages, velocity RMS, Uy zero crossings, and difference metrics.
- Added configurable physical reference lines and custom X/Y references.
- Added one-click Thesis Figure mode and high-resolution thesis export preset.
- Corrected temperature-difference display so ΔT is not treated as an absolute temperature during K/°C switching.

## v27

- Added bidirectional legend resizing.
- Legend typography, row spacing, padding, and line samples scale with legend width.
- Added separate inner/outer resize edges and a resize corner for side legends.

## v26

- Added contextual case-family coloring for spatial profiles.
- Spatial-profile family members share a color while detected variants use different line styles.
- Time-series/probe plots continue to use color by physical variable.
- Added detected family/variant information to the case manager.

## v25

- Added automatic scientific tick precision and scientific notation where needed.
- Added friendly liquid-fraction labeling while retaining original OpenFOAM field names.
- Added automatic `Velocity magnitude |U|` and `Velocity XY` derived fields.
- Added Difference plots with maximum absolute difference and its X position.
- Added Compare heights mode for spatial profiles.
- Added profile time slider, previous/next navigation, and Play/Pause animation.
- Added optional locked axes during animation.
- Added chart zoom controls and Fit-to-workspace behavior.
- Improved curve counters and duplicate-series protection.

## v24

- Added resizable/collapsible settings sidebar.
- Added independent horizontal/vertical scrolling for the chart workspace.
- Added resizable side legend and quick case visibility controls.

## v23

- Added intelligent classification of OpenFOAM time-series data versus spatial profiles.
- Added automatic detection of horizontal/vertical profile orientation.
- Added support for spatial-profile metadata such as line height and simulation time.
- Added spatial-profile comparison workflows without mixing profiles with probe time series.

## v22

- Added an eye toggle to hide/show complete cases without deleting them.
- Hidden cases are excluded from plots, legends, previews, metadata counts, and CSV export while retaining their loaded data and styling.
- Series belonging to hidden cases are visually dimmed in the detected-series panel.

## v21

- Added smart recursive OpenFOAM folder scanning.
- Detects nested `postProcessing/probes` outputs even when they are several directories below the selected folder.
- Groups detected outputs by OpenFOAM case root and proposes them as separate cases.
- Added a confirmation dialog with selectable cases and editable case names.
- Added compatible-output detection for probe/sampler folders that are not literally named `probes`.
- Avoids silently merging multiple detected cases into one dataset.

## v20

- Updated About / Developer section.
- Embedded the developer portrait directly in the application for offline use.
- Displayed the full portrait vertically instead of cropping it to a square.
- Preserved the OpenFOAM PostPlotter plotting and case-comparison functionality from v16–v19.

## v16

- Added case and individual-file deletion controls.
- Continued multi-case plotting, scientific figure editing, export controls, and detected-series management.