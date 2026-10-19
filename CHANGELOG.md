## Unreleased — source-based scientific Mesh & Geometry audit (#150)

- Add an on-demand checkMesh report panel to Data, with local text import and scientifically labeled mesh topology, bounding box, non-orthogonality, skewness, aspect ratio, openness, area and volume metrics.
- Treat missing metrics as unreported rather than zero; separate multiple region outputs without mixing data; show source warnings/failures and export an auditable JSON.
- Keep advanced polyMesh geometry diagnosis, cell-level visualization and optional native checkMesh execution as future work. No version change or public release in this development candidate.

# Changelog

## Desktop v1.8.10 — 2026-10-19 · Field multi-view and responsive toolbar

- Reveal a permanent **+ Add view** control in 3D Field Workspace; display up to four panels from the same imported OpenFOAM case or different imported cases without introducing fake values.
- Expose case, region, property and component selection individually in each pane instead of hiding comparison settings in the inspector.
- Drag a view's heading to rearrange WebGL panes while retaining its scientific state; zoom each pane with +/− buttons, independently by default, with optional linked cameras.
- Prevent Ribbon Compare/Camera/Cache/playback overlap on compact desktops by wrapping groups and measuring actual chrome height.
- Scientific, Field quick and exact Windows Setup/Portable candidate checks passed on PR #144 before the release version bump. This release has its own final version/build/checksum gates.

## Desktop v1.8.9 — 2026-10-18

- **Windows installer consent correction:** show the shipped bilingual taskbar-pinning guide on the final Setup page as an explicitly **unchecked** optional action. The installation never pins anything automatically; the user may choose whether to read the instructions.
- **Preserve optional desktop shortcut:** keep the unchecked `desktopicon` Tasks-page action, program entry, welcome and full EULA agreement, installed app launch, silent installation behavior, update integrity and clean uninstall. Silent installs skip the final-page guide.
- **Governance and regression:** align Inno Setup `[Run]` with the Michel's Lab cross-app Windows installer validator; update both Windows icon/packaging and actual Setup task-choice tests to enforce the new consent contract.
- **Scientific behavior unchanged:** OpenFOAM measurements, physical-time playback loops, seven camera views, multi-case profile comparison, retryable indexed profile import, true-scale 3D visualization and physical units are unaffected. Exact source QuickCup/VTK, native installed/portable, rendered UI and published SHA-256 checks remain release gates.
- **Limitations:** the owner's measured cold/warm 3,008-file OpenFOAM performance comparison and review of the user's original case remain pending (#117); do not claim a verified speedup without that evidence.

## Desktop v1.8.8 — 2026-10-18

- **Repair incomplete multi-case Profiles imports:** indexing previously allowed one partially unreadable `postProcessing` profile to clear *every* pending file in that case. The native-backed parser now reports each source file's actual outcome, and only exact successfully parsed, nonempty measured profiles are removed from the retry queue. Missing and failed data remain explicitly pending instead of being represented as valid curves.
- **Retry pending profiles from the existing project:** an enabled **Retry pending profiles** action in the active case-comparison panel retries only selected indexed OpenFOAM sources, waits safely for an in-flight parse, and keeps previously loaded curves and independently selected cases intact. There is no need to re-import an entire case or falsely synthesize a spatial profile from log data, time folders or 3D mesh fields.
- **Scientific provenance and regression:** per-case remaining profile counts are truthful, stale in-flight files cannot delete newly reindexed replacements, and failed or empty files stay retriable. Check partial parse failures, source replacement and successful second load using production code; retain exact 3,008-curve and physical-time alignment validation.
- **Protected Windows release:** QuickCup/VTK, installed and Portable Windows tests, Data comparison controls and the actual public Setup/Portable SHA-256 verification must all pass before distribution. A passing synthetic test does not establish a measured speedup on the owner's 3,008-file device dataset.

## Desktop v1.8.7 — 2026-10-17

- **Live case selection in Data:** in an active Profiles or Time series comparison, checking, unchecking, selecting all or clearing previously imported OpenFOAM cases now updates actual plotted curves immediately. Users no longer need to repeatedly click Compare to apply each change.
- **Real-source integrity:** reuse existing scientifically loaded time series and spatial profiles, preserving case provenance, dual-variable axes and physical time. Source-derived indexed `postProcessing` profile files are hydrated only on demand for the selected cases; imported mesh fields, solver logs and timesteps remain distinct from actual spatial profile outputs.
- **Asynchronous case safety:** a selection epoch and single-flight lazy-profile synchronization prevent a late previous load from repainting a stale curve after a user changes the comparison.
- **Release checks:** production-source live-selection regression with async race tests, all existing Data/Field and 3,008-series scientific tests, real QuickCup/VTK, installed Windows Setup/Portable and SHA-256 post-publication artifact verification required.
- **Benchmark caveat:** the user's exact 3,008-file real-case cold/warm loading speedup remains unmeasured; no invented values are advertised.

## Desktop v1.8.6 — 2026-10-15

- **Continuous 3D Field playback:** the visible Ribbon player repeats the physically available OpenFOAM time sequence automatically: after the last valid snapshot it starts again from the first. The playback timer awaits each real frame load before scheduling the next; no duplicate clocks, invented intermediate field values or temporal interpolation. Manual pause, speed changes, single-frame cases and late asynchronous results are handled safely.
- **Readable Play/Pause:** the Field toolbar reserves real space for the full Play / Pause label with a permanent ↻ loop indicator instead of truncating the word to `Pla` in a 28px Ribbon column. The 3D time slider, speed and actual physical-time readout remain separate, accessible controls.
- **Seven clearly labeled camera views:** Isometric, Front +Z, Back −Z, Left −X, Right +X, Top +Y and Bottom −Y have visible names, directional tooltips, keyboard/accessibility labels and selected-view feedback. Camera view choices are available in the contextual Camera menu even on narrow screens.
- **Release regression gates:** repeat several full physical-time cycles and test pause during pending file load, speed changes, existing workspace controls, native Windows camera/button visibility at actual viewport sizes, QuickCup/VTK and packed Setup/Portable before public release. Publish actual SHA-256 verified artifacts only after exact-main build succeeds.
- **Scientific integrity:** do not fabricate missing frames or hide field load errors to achieve looping. Source OpenFOAM physical timestamps, coordinate units, color ranges and calculations are unchanged.

## Desktop v1.8.5 — 2026-10-15

- **True Scale 3D by default:** orthographic Field View retains X/Y/Z *proportions* from original OpenFOAM `polyMesh` source coordinates; Perspective is an explicit alternative. No hidden axis/thickness stretching, invented geometry or modified scientific values.
- **Fit Model from physical corner geometry:** camera fits all eight corners of visible region mesh bounds in its current orientation, accounting for actual viewport aspect and nominal 14% margin; invalid/unrepresentable coordinates do not corrupt the view.
- **Graduated XYZ rulers:** optional mesh bounding box and physical minimum/maximum/extents with SI m/mm/µm readouts, refreshed when the camera, view presets or source data change.
- **Real vertex measurement:** click two exterior `polyMesh` vertices for a Euclidean source-distance result, independently of projection, with clear/reset controls; no guessed/interpolated hit coordinates.
- **Independent measured region legends:** primary and every visible secondary region have separate field, time, physical units, minimum/maximum and colormap. Uniform values render a constant swatch instead of a false gradient; geometry-only data are never represented as measured fields.
- **Validation gates:** require production physical-coordinate regressions, real QuickCup/VTK, installed + Portable Windows visual/native smoke, and post-publication SHA-256 verification before public distribution.
- **Benchmark caveat:** no claim of improved owner-device cold/warm runtime for the original 3,008-file 2D case without re-measurement.

## Desktop v1.8.4 — 2026-10-15

- **Field workspace polish:** repair native cache-menu geometry and camera controls with seven distinct, legible orientation presets, compact Ribbon layout, preserved physical-time readout and correct Data/Field ownership. Spatial Profiles, Time Series and Solver Logs remain in Data; 3D field visualization remains in Field. Preserve the selected Data view across session restoration.
- **Two-variable spatial profiles:** independently named physical quantities (for example, temperature and liquid fraction) can share case/line/time selections, compare on separate Y axes and synchronize playback with no fabricated samples.
- **Responsive scientific imports:** native folder enumeration makes detected files available before the optional structural-cache checkpoint writes to disk. Structural inventory classifies physical-time folders including decomposed `processorN` cases, with checksum-protected local metadata. OpenFOAM data still come from authoritative files and separately verified scientific caches.
- **Large-time-grid profile controls:** indexed selection for 3,008+ physical-time profiles replaces repeated linear matching while preserving scientific tolerance and the original first-match display label. No interpolation or raw measurement values are modified.
- **Reproducible performance evidence:** privacy-safe import timing exports can be compared locally with `tools/compare-import-performance.cjs`; incompatible datasets or missing audit measurements are not silently treated as validated speedups.
- **Scientific regression gates:** require QuickCup/VTK, native cache integrity, numerical dual-variable/profile playback, 3,008-series import checks, Windows portable and installed-app smokes, camera/cache geometry, visual screenshots and cryptographic artifact validation before publishing.
- **Important limitation:** the earlier owner screenshot showed 3,008 files taking 184.8 seconds in an older version. This release does **not** claim an owner-device cold/warm speedup until that same real case is retested. All calculations retain measured physical units and provenance.

## Desktop v1.8.3 — 2026-10-13

- **Native scientific disk cache:** persist supported parsed OpenFOAM temporal columns/probes and completed ASCII scalar/vector/tensor fields, including native field metadata and boundary patches. Reimporting unchanged results can reuse the decoded scientific arrays rather than repeating the parser.
- **Stale scientific data protection:** validate source length, last-write UTC timestamp and full source SHA-256 even when the file was replaced with identical size/time; validate the cached payload SHA-256, reject torn/corrupt/unsupported data, and never cache a source modified during a cold parse.
- **Scientific completeness:** preserve numerical precision, physical dimensions, probe coordinates and field metadata, including IEEE non-finite values. No mesh/curve decimation; incomplete/unsupported fields remain on the normal parser path.
- **Resource control:** separate user-private temporal and field caches, bounded entry sizes and opportunistic disk quota, atomic writes, readonly fallback and explicit `FOAMLENS_DISABLE_TEMPORAL_CACHE=1` opt-out. No external cache service or telemetry upload.
- **Executable acceptance:** compile and execute the real native cache integrity self-test before full OpenFOAM/VTK QuickCup, installed and portable Windows WebView2, EULA, screenshots and SHA-256 release checks. The v1.8.2 fast-2D import workflow remains intact.
- **Benchmark limitation:** faster owner-machine 3,008-file cold/warm import is **not claimed** without running the same actual model and comparing its exported performance report; native content hashing has a cost and does not make unchanged files free to read.

## Desktop v1.8.2 — 2026-10-12

- **Faster scientific 2D workspace startup:** opening large OpenFOAM imports (256+ files/curves) no longer waits at 95% for every solver coupling audit, quantitative difference, phase-front crossing and Health analysis to finish. Open the first scientific data view when parsed data are ready; request deeper calculations when you need them.
- **Truthful numerical provenance:** show **NOT YET ANALYZED**, never a fabricated healthy verdict or a zero finding count, while the full scientific audit is pending. Provide an explicit **Run full scientific audit** option, and automatically compute it when the user opens the Review workspace. Invalidate results when another case is imported.
- **Scalable comparisons:** replace repeated scan-per-variable shared-probe comparisons with a one-pass case/field/probe index preserving matching by canonical field and physical probe number. Large case file lists show an initial 80 rows with **Show next 150** and **Show all** options; individual provenance and removal remain available.
- **Instrumentation:** log stage times for parsing, derived data, data selectors, first usable workspace and on-demand audit; correct misleading direct-import stage labels. Timings are per run, not made-up hardware benchmarks.
- **Regression and release gates:** source-executed 3,008-curve fast-path tests, O(N) scientific shared-probe checks, QuickCup/VTK, Windows Portable/installed WebView2, scientific screenshots, EULA/shortcuts and checksums. No claim that the owner's recorded 184.8-second load is resolved until they test the published v1.8.2 on the same case.

## Desktop v1.8.1 — 2026-10-12

- **Field 3D WebGL2 transparency**: release unused weighted-blended transparency GPU scratch targets when returning to opaque/hidden/unsupported scenes, clean shader vertex attributes on draw failure, and correctly report the active transparency mode for each physical render frame. Real QuickCup, crossed-fragment rendering and native Windows scientific-screenshot regression gates were retained.
- **Real-case GPU diagnostics**: add bounded, PID/SHA-attributed Windows GPU-process-counter sampling only **after real OpenFOAM metal/mold has loaded and rendered**, independently for portable and installed FoamLens. Keep counter provenance, transient unavailability and source timestamp explicit; never misrepresent process counters as physical GPU total VRAM.
- **Windows Setup choice**: provide independent unchecked options for a desktop shortcut and user-selected instructions to pin FoamLens to the Windows taskbar. Respect Windows pinning controls; do not silently alter existing taskbar pins. Exercise opt-in/opt-out, actual installation, uninstallation, Welcome/EULA and portable/installed launch.
- **Regression hardening**: preserve the real running FoamLens host PID across PowerShell GPU sampler imports, publish sampling handshake markers atomically, and validate that minimized WebView2 advances rather than requiring a non-portable hidden-timer cadence. Rebuild the installer choice test with no duplicate functions after CI exposed an invalid generated script.
- **Release safety**: retain the actual OpenFOAM QuickCup/VTK physical-science suite, exact-head Windows executable/installer smoke, source-tagged Home/About/Data/Field screenshots at wide and compact sizes, SHA-256 asset checks and automatic updater checksum verification. Microsoft Store remains paused, and owner visual/hardware review is post-release.

## Desktop v1.8.0 — 2026-10-08

- Replaced owner-rejected orbit brackets and cardinal ticks with the arc-free layered-field identity across the product mark, lockup, app SVG, and regenerated seven-size native Windows icon (launcher, installer, shortcuts and taskbar). Canonical sources are shared through Michel's Lab.
- Enlarged and centered the Home launch logo, product name, description, action buttons and processing notice; strengthened native runtime geometry and contrast checks.
- Reorganized the Field workspace into a compact one-row primary Ribbon plus mutually exclusive Inspect, Compare and Camera subbars, so scientific 3D views use more of the available window.
- Restored accessible isometric, front, back, left, right, top and bottom camera presets, and moved Orbit/Pan/Zoom tools into the contextual Camera subbar.
- Displayed independent case/region selectors for View A, View B and additional views in the 3D sidebar; default is one 3D view and additional views require explicit Compare/Add View.
- Validated the real OpenFOAM QuickCup integration, VTK scientific references, desktop portable/installable runtime, native screenshot geometry, checksum-bound installer evidence and branding/icon consistency.
- **Microsoft Store / MSIX generation remains indefinitely paused at the owner's request.** This release supplies only the Windows portable executable and installer, each with SHA-256. No publisher signature is implied.

## Desktop v1.7.0 — 2026-10-08

- Rebuilt the FoamLens workspace interface around the official layered-field visual identity, with coherent controls and spacing throughout the app.
- Made the product identity and About / Updates permanently accessible in the global application shell.
- Condensed Field / 3D tools into contextual one-at-a-time subbars, improving available scientific viewport space.
- Restored a single default 3D viewport; secondary comparison views appear only when explicitly requested, with synchronized case selectors.
- Kept Data discovery settings free of unrelated 3D controls and maintained Data, Field, and Analysis workspace separation.
- Reworked the initial About viewport to show the FoamLens mark, developer portrait, Michel's Lab identity and slogan `TOOLS WITH IDENTITY.`, and five named social links without scrolling at normal desktop sizes.
- Improved native OpenFOAM large-field import feedback with preparing, waiting/stalled and completion/error cleanup states, without fabricating measured progress.
- Preserved real OpenFOAM QuickCup and VTK scientific regression gates, Windows portable/installed smoke tests, automated native screenshots, screenshot-to-installer SHA-256 validation, and Microsoft Store MSIX build checks.
- Aligned release publication with owner authorization and automated exact-artifact validation; final visual review remains post-release. Microsoft Store certification and executable signing are not implied.

## Desktop v1.6.2 — 2026-10-08

- Prevented incorrect Field Mapping suggestions when a plausible field name contradicts explicit OpenFOAM SI dimensions; preserved safe name-based mapping when metadata is unavailable.
- Expanded scientific regressions for misleading field names, incompatible dimensions, and incomplete field metadata.
- Prevented temporal A−B/RMSE/% differences and derived exports between sources with explicitly mismatched SI dimensions or units, while allowing native visualization and non-guessing behavior for unavailable metadata.
- Completed About's recognizable Instagram/GitHub icon presentation and the Michel's Lab canonical `TOOLS WITH IDENTITY.` slogan while preserving the original approved product logo, portrait and parent-brand assets.
- Reconciled the post-migration scientific/branding audit, prioritized open work, and retained local-first operation, existing visual layout, and read-only OpenFOAM analysis.
- Retained validation requirements for real QuickCup/VTK regression, direct Windows portable + installer launch, and separate Microsoft Store MSIX packaging. No Microsoft Store certification or Authenticode certificate is implied.

## Desktop v1.6.1 — 2026-10-06

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