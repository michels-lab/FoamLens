# Changelog

## Desktop v1.6.1 — Unreleased

- Reorganized the Field command surface around a real contextual application sidebar for 3D, Spatial Profile, Time Series, Solver Logs and Split without leaking irrelevant controls across workspaces.
- Kept Case / Region / Field / Component selection independently available for synchronized views A/B/C/D and preserved per-view scientific ownership.
- Kept physical-time playback visible in the Ribbon, moved the canonical 256 MB / 512 MB / 1 GB / 2 GB frame-cache control beside it, and removed duplicated internal Field navigation and horizontal Ribbon scrolling.
- Reduced unnecessary Field rendering by coalescing layout work and avoiding hidden 2D/3D redraws, while preventing duplicate B / Difference / C / D render cascades.
- Fixed a high-resolution multi-panel export race by flushing pending layout work before explicit-size 3D rerendering; Windows packaged smoke confirms the 1800×1200 source render and 2400×1600 panel export path.
- Added dedicated CI coverage for Findings evidence handoff, preserving provenance-rich Markdown/JSON export, Copy for ChatGPT and prefilled GitHub issue workflows without synthesizing scientific evidence.
- Reconciled About with the canonical Michel Duarte portrait and official Michel's Lab parent-brand lockup while preserving FoamLens as the primary product identity and canonical social links.
- Removed stale About/version literals and made packaged frontend/Desktop identity derive from assembly metadata instead of historical string replacement.
- Reconciled the root proprietary license from the legacy OpenFOAM PostPlotter name to FoamLens / Michel's Lab.
- Made the extracted Desktop app-root path derive from assembly version metadata so future releases do not continue using a hard-coded v1.6.0 runtime directory.
- Hardened packaged launch smoke to require a visibly rendered FoamLens launch surface and retain useful blank-screen diagnostics before scientific/runtime smoke proceeds.

## Desktop v1.6.0 — 2026-10-06

- Reworked FoamLens navigation into a coherent Ribbon-first workspace model with explicit Data, 3D / Field, Analysis, Export, and View scopes.
- Promoted Field View to a true top-level workspace and retired the legacy Data `fieldViewTab`, hidden `modeField` fallback, and `setDataView('field3d')` navigation path.
- Added Field-internal 3D, Spatial Profile, Time Series, Solver Logs, and explicit Split views, with one always-visible physical-time transport.
- Made 3D, comparison controls, plot controls, and Analysis tools permanently owned by their correct workspaces instead of moving DOM trees between sections.
- Added stable independent 2D plot surfaces for Data, Analysis, and Field while retaining one scientific renderer and one interaction implementation for hover, pins, selection, legend drag/resize, export, and plot calculations.
- Added persistent cross-session state for top-level workspace, Case/Region context, Data/Analysis/Field plot views, pinned points, active series, Field layout, Split companion, Inspector, comparison settings, view names, and panel sizing.
- Added a context store so Case/Region state is independent of selector DOM and can be restored safely after a project is loaded.
- Made Analysis-derived result creation navigation-neutral; results no longer silently switch hidden Data views, and explicit Open Time Series / Open Spatial Profile handoffs are available from the Ribbon.
- Clarified 2D Curve Δ versus Strict 3D Δ workflows.
- Added Activity Manager ownership, contextual scope rules, Findings export, anti-leak regressions, stable plot-surface regressions, and session-persistence regressions.
- Expanded the Windows packaged runtime smoke to cycle Field → Data → Analysis → Data → Field, verify permanent plot-surface parents, and round-trip persisted session state.
- Preserved real OpenFOAM QuickCup regression, independent VTK streamline validation, portable Windows smoke, installed-app smoke, updater checksum verification, and read-only scientific behavior as release gates.

## Desktop v1.5.1 — 2026-10-05

- Added a native automatic-update check against the official FoamLens GitHub Releases endpoint.
- Added a manual **Updates / Actualizaciones** Ribbon action.
- Added semantic version comparison so only newer releases are offered.
- Added verified installer download: FoamLens now requires the matching installer SHA-256 file and refuses to launch a mismatched installer.
- Added installer SHA-256 generation to CI and GitHub Release assets.
- Preserved local-first behavior: update checks never upload OpenFOAM project or simulation data.
- Closed the FoamLens Desktop v1.5.0 release audit with final run #674 and published asset evidence.

## Desktop v1.5.0 — 2026-10-05

- Unified the validated v1.5 development lines into one release candidate.
- Added independent B13 streamline validation against VTK and retained reproducible validation evidence in CI.
- Added high-resolution 3D WebGL rerendering for scientific multi-panel exports instead of upscaling viewport rasters.
- Added controlled baseline/optimized performance benchmarking and preserved progressive field loading, adaptive prefetch and viewport-aware loading.
- Added persistent Field Workspace layout, per-view presentation names, comparison status, contextual help and resizable panels.
- Added vector-glyph analysis controls with magnitude-proportional or normalized arrow length, normalized XYZ ROI sampling and quantitative sampling diagnostics.
- Added scientific provenance overlays to the primary and synchronized 3D views, including case, region, field, association, units/dimensions, physical time, synchronization context and source identity.
- Preserved real OpenFOAM QuickCup regression, portable Windows smoke testing and installed-app smoke testing as release gates.

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