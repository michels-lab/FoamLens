## Desktop v1.8.23 — GRANADA Field recovery and scientific comparisons (2026-11-24)

- **Field A–D recovery:** linked time/camera preferences remain saved, but the effective linkage suspends when A lacks a valid mesh or loaded physical field/time. Other panes use their actual stored timestamps and locally fitted cameras, with a visible reason; valid A restores effective linkage. No synthetic t=0 or fake mesh.
- **Unavailable case diagnosis:** show detected complete mesh and compatible field-region counts, original case name and source-directory guidance in A; do not run Allclean or the solver. B14's actual disk inventory is not known.
- **Layout:** equal balanced scenes by default (independent sizes still selectable), align real header heights across visible comparison panes, reclaim hidden companion columns and use theme-compatible scrollbar styling.
- **Scientific analysis:** integrated interactive 2D/3D curves and difference chart, exact aligned sample cursor and time-weighted error integrals (#375); up to eight spatial profiles with shared coordinate grid, actual-time compatibility, length-weighted errors and bound JSON/CSV (#376).
- **Visual feedback:** collision-aware XYZ labels and adaptive tick density, compact scientific legends with full-value tooltips, transparent comparison region ordering and camera preservation when primary geometry is unavailable. Source diagnosis now lists indexed meshes, compatible fields, original time ranges and missing mesh components when present in the inventory.
- **Responsive 3D + Profile:** measured workspace width and view count control side-by-side or stacked layouts, saved space priority, plot height and reset; no duplicate source controls.
- **Publication:** exact source Windows build, QuickCup, native visual and integrity gates retained. Owner manual B14/C14 verification after publication; no physical validation or claimed completed UI acceptance.

## Desktop v1.8.22 — GRANADA integrated comparison and native scientific timeline (2026-11-23)

- **Field comparison deck:** persistent Automatic, Two columns and Widest safe row arrangements; independent scene sizes or shared compact, balanced and large scene-height presets, responsive to the actual panel width, one-click layout reset. No new horizontal scrollbars or changes to individual source, camera, region or physical time.
- **Scientific Case Health — native postrun timeline:** load actual OpenFOAM reduction CSVs locally, immediately inspect original saved times, choose two numeric metrics with independent Y scales, synchronized exact-sample cursor, selectable saved-sample window, export selected source samples to CSV and both plots as SVG. No interpolation of missing CFD states or inferred units. Original case ownership and physical validation remain explicitly unverified.
- **Physical-time navigation:** find original samples within a user-entered interval in seconds, navigate previous/next actual output, inspect and jump to window-specific extrema for each selected metric, and view indexed time coverage without implying source ownership.
- **Integrated Field A–D:** all independently selectable loaded cases, native metal/mold regions, physical dimensions and source-aware comparison, strict field associations, original frames and clocks.
- **Integrated Data and Analysis:** source-specific Time Series units/axes, dual-variable and profiles integrity, multi-region energy and thermocouple guards, solidification-front geometry and OBJ reconstruction, phase/momentum source provenance, CAD surface validation and 2D/3D equivalence safeguards.
- **Publication:** owner explicitly requested the next stable Windows release for post-release manual review. Exact-source automated Windows build, installed and Portable launch, visual and checksum gates remain mandatory. Physical review of B14/C14 and C3D-04/05 is not claimed. Authenticode optional for direct GitHub distribution; SmartScreen may warn.

## Desktop v1.8.21 — Original 3D case-catalog and initial canvas recovery (2026-11-19)

- **Regression reported by owner:** v1.8.20 could enter Field with A on a B14 case lacking any 3D-ready region/field/timestamp; linked B/C/D then remained blank even if their own selected case contained loaded 3D fields. The user's older v1.8.18 screenshot demonstrated that actual OpenFOAM mesh rendering worked when both sources were ready.
- **A initialization:** on first mount with no rendered scene, use a genuinely renderable imported case if the current Data-context selection has incomplete mesh/field inventories. Do not overwrite already active A meshes or explicit later case changes. If no case has real compatible 3D mesh and fields, keep a scientifically truthful unavailable state.
- **B/C/D catalog:** show every loaded original case in each independent per-view Case picker; annotate entries with unavailable 3D inventories instead of secretly filtering them out. Preserve explicit choices when the selected case is still indexing, and refresh its original field/component catalog as data arrive.
- **Validation:** original source-backed B/C/D multi-case regression and empty-A recovery tests, Field playback/camera and multi-DPI regressions, QuickCup and native Windows Setup/Portable/visual gates required. No fake frames, interpolation or data; no CSS changes in this operation.
- **Published stable verified:** [FoamLens v1.8.21](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.21) is non-draft/non-prerelease with actual Windows Setup and Portable executables plus both SHA-256 sidecars. [Exact-source QuickCup/installed/portable/native visual release](https://github.com/michels-lab/FoamLens/actions/runs/44594122858) and [independent public executable/sidecar integrity audit](https://github.com/michels-lab/FoamLens/actions/runs/44595471470) passed. Owner's B14/C14 cases and physical Windows visual acceptance remain separate from fixture CI.

## Desktop v1.8.20 — FoamLens native Field A/B/C/D text and layout repair (2026-11-18)

- **Owner visual evidence:** fixed-height 30px native OpenFOAM metal/mold selectors displayed gradRho, Magnitude, T and Value with cut-off letter baselines. Region dropdown controls now have auto height and at least 44px with explicit text line boxes, two proportional columns and no overflow scrollbars.
- **Actual root cause of caption overlap:** F2 inserts a real Size drag grip between the 3D scene and caption, creating **four** viewport children. The previous 3-row CSS subgrid caused B's case/field title to collide with dimensional measurements. Replace nested subgrid with normal per-view flex layout and pair real toolbar heights in each actual visual row, including manual source/region expansion.
- **Caption/source text:** keep case/field/timestamp descriptors and measurements in normal, bounded block flow; avoid clipped/overpainted long OpenFOAM names in 3D captions and statistics. Legends and physical data still derive from the original loaded field, without approximation.
- **A/B/C/D/Δ order:** derived difference viewport moves after extra case views, so C and D remain next to one another. The per-row toolbar matcher never pairs mismatched source views.
- **Published stable verified:** [v1.8.20 Windows Setup and Portable plus both SHA-256 sidecars](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.20) are publicly available, non-draft/non-prerelease. [Exact source d1d1d9bd passed original QuickCup, native installed/Portable and 36-view screenshot gate](https://github.com/michels-lab/FoamLens/actions/runs/44405665755) and [independent actual public binary and SHA-256 downloaded verification](https://github.com/michels-lab/FoamLens/actions/runs/44407597973). Physical monitor DPI, owner final appearance approval and CFD solver validation are separate from these automated tests.

## Desktop v1.8.19 — FoamLens Field no-scroll viewport repair (2026-11-18)

- **Owner screenshot correction:** v1.8.18 horizontally scrollable pair view was not acceptable. Remove the imposed 350px minimum pair tracks and scrollbar gutters; two real OpenFOAM renderers now share the available width, without forced horizontal scrolling or narrower viewport clipping.
- **Aligned panes without toolbar scrolling:** native CSS subgrid coordinates the per-pair source editor, real OpenFOAM GPU canvas and bottom legends so A/B and C/D draw on the same baseline. No 154px height clamp or vertical scrollbar in individual toolbars.
- **Clear case choice:** direct original case picker visible in each A/B/C/D pane. Field/Region/Component and optional metal/mold styling are user-expandable only; unchanged source-backed data, original field selectors and independent times/cameras/legends.
- **Regression:** replaced tests that incorrectly required scrollbars with source checks explicitly forbidding them; retained original independently editable per-view Case assertions, keyboard and actual OpenFOAM field integration.
- **Stable release verified:** [v1.8.19](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.19) is publicly published with 64-bit Windows Setup and Portable and both SHA-256 sidecars. Exact released source commit [`16d3d323`](https://github.com/michels-lab/FoamLens/commit/16d3d3239b9b1baf1876eb493ffdf9025a38083d) passed native QuickCup, installed and portable runtime/visual provenance and publication [run #44393085250](https://github.com/michels-lab/FoamLens/actions/runs/44393085250) (SUCCESS). Independent verification of actually downloaded public binaries and SHA-256 checksums [run #44395146854](https://github.com/michels-lab/FoamLens/actions/runs/44395146854) also SUCCESS. Physical Windows monitor DPI and owner's visual approval remain separate; unsigned GitHub binaries may show SmartScreen.

## Desktop v1.8.18 — Granada Field A–D alignment, readable controls and atomic physical-time playback (2026-11-18)

- **Layout:** eliminate the single-column comparison collapse at 980px. Keep the original A/B and C/D 3D scenes beside their peers with two explicit 350px-minimum tracks and horizontal scrolling in narrow native workspaces.
- **Legibility and ergonomics:** all 3D viewbars have equal height, internal scrolling for advanced options and larger source, time, camera, physical-region and zoom/Fit controls. Original per-view case/region/field/component selectors remain directly editable (#366).
- **Source-backed animation:** the original Field A–D metal/mold GPU layers are staged and swapped atomically without clearing the previously completed real OpenFOAM frame mid-read (source commit 963aa710); source tests now guard against half-painted scenes (e7f3ecb).
- **Accuracy:** no new CFD values, altered files, invented times or forced case selection. Source-backed independent B/C/D controls and synchronized mode are retained.
- **Published release verified:** v1.8.18 is [publicly available as stable Windows Setup and Portable with both SHA-256 sidecars](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.18). Exact source commit [`e5b502e`](https://github.com/michels-lab/FoamLens/commit/e5b502e8356f964f117820e16a5cb5cda300083b) passed the [protected original QuickCup, native Windows, 36-view UI provenance and release gate](https://github.com/michels-lab/FoamLens/actions/runs/44381050449); the [independent audit of actually downloaded public Setup/Portable and real SHA-256 checksums](https://github.com/michels-lab/FoamLens/actions/runs/44382486071) also passed. Native screenshot automation is not proof of physical DPI 125–200% or owner aesthetic acceptance; direct GitHub binaries may be unsigned and trigger Windows SmartScreen.

## Desktop v1.8.17 — Granada large OpenFOAM 3D scientific integrity and source fingerprint (2026-11-17)

- **3D Difference large-mesh crash removed:** original `Math.max(...finite)` source range calculation threw `RangeError: Maximum call stack size exceeded` for a 300,000-cell sample. Native OpenFOAM-derived 3D difference statistics now stream across finite measurements in O(N), without copying full-field arrays or spreading values into the JavaScript argument stack (#361).
- **Fail closed on false 3D A−B:** original primary/comparison field lengths must both match the real mesh `cellCount`; no truncation to the shorter array is permitted. Invalid/all-nonfinite frame clears previous difference geometry data, range and layout rather than showing stale physics. Added direct tests for actual controller invalidation (#361).
- **OpenFOAM benchmark exact-tree identity:** `FoamLens-case-tree-sha256-v2` accounts for relative directory names, including empty physical-time folders; old or cross-version file-only fingerprints cannot falsely validate equivalent first/repeat cases. Numeric nested metadata/log folders are no longer classified as physical time fields; report JSON remains private-path-free (#362).
- **Scientific evidence:** original-field regression checks including 300,000 values, typed array/iterator no-copy stress, original Windows Field playback, original QuickCup B13, benchmark 3,008 synthetic-files Windows/Ubuntu, native WebView2 and repository boundary checks passed on their development commits. **Final v1.8.17 exact-build Windows Setup/Portable, 36-workspace and release checks must independently pass before publication.** Synthetic datasets are not a measured speedup against the owner's 184.8-second 3,008-file case; #117 remains open.
- **Channel:** Stable GitHub Windows Setup + Portable only (no RC). Unsigned binary distribution with SHA-256 verification is allowed; independent physical DPI, final owner UI approval and CFD experimental validation remain separate acceptance criteria. Public Web frontend v51 and original OpenFOAM solvers unchanged.

## Desktop v1.8.16 — Granada scientific Field integrity and multi-view performance (2026-11-17)

- **Fail-closed physical OpenFOAM frames B/C/D:** a missing or unsuccessful field result cannot leave a previously measured mesh, scalar/vector values, probe, difference, color range or time/synchronization badge visible as if it belonged to the new physical frame. A stale earlier asynchronous result cannot overwrite a newer valid frame (#357).
- **Parallel independent C/D frame acquisition:** multi-region C and D are each limited to their own genuine original case/field/time and GPU renderer. Their two frame loads now start concurrently instead of C blocking D; no invented OpenFOAM timestamps or interpolation (#357).
- **Native Field B selector performance:** reuse real Case/Region/Field/Component option nodes during playback; update only on real case/region/catalog/component changes, retaining user selections and focus (#356).
- **Scientific regressions:** direct source-owned tests cover failed/late frame loads, 256 stable selector refreshes, source changes, B physical-time invalidation and concurrent C/D completion. Native Setup/Portable and original QuickCup acceptance must be rechecked for this exact source commit before publication.
- **Scope:** original CFD solvers, private data, scientific numerical values and the public Web v51 front end are unchanged. Direct Windows GitHub binaries can be distributed unsigned with real SHA-256 sidecars and SmartScreen disclosure; native CSS viewport screenshots do not certify physical OS DPI, owner aesthetics or independent scientific validation.

## Desktop v1.8.15 — Granada original native Windows release (2026-11-17)

- **Independent physical OpenFOAM clocks in Field A–D:** do not substitute missing or blank source time with `t = 0`; preserve valid original zero and scientific-notation times with source labels escaped. Scientific provenance regressions added (#351).
- **Time Series source identity:** preserve original OpenFOAM names/dimensions and explicit dimensionless liquid-fraction semantics; source-backed histories and dual-series UI remain subject to real case compatibility (#350).
- **Native visual release gate:** original Setup and Portable are tested at 1140 × 820 and 640 × 900 CSS viewport sizes. Required G5 workspaces are Home, About, Data, Field, Time Series, Field comparison, Analysis, Review and Live. The 36-cell original Windows matrix is generated from genuine WinForms/WebView2 CDP screenshots, **not** synthetic graphics or simulated measurements (#352, pending integration #353).
- **Independent native screenshot provenance:** capture-specific, process-local SHA-bound receipts distinguish genuinely independent Setup and Portable launches even when deterministic screens have identical pixels; spoofed, missing and tampered receipts remain fail-closed. Screenshot verification does not replace physical DPI inspection, aesthetic approval or numerical validation.
- **Windows build and distribution:** actual original QuickCup B13 metal/mold, VTK and UI tests remain mandatory. Stable direct GitHub release is allowed **unsigned**, with exact SHA-256 checksum sidecars for both Setup and Portable and explicit Windows SmartScreen notice. No RC, no invented digital publisher identity, no private simulation files in public assets.
- **Scope and limitations:** native physical Windows DPI 125/150/175/200% and owner visual acceptance are separate from CSS-wide/compact screenshot validation. Publishing must not silently substitute test-only files for a true exact-main application build.

## Unreleased — Operación Granada CAD F4: original OpenFOAM geometry staging per distribution (#348)

- **New CAD & Geometry tool**: choose `Foundation v13/v14 (review installed version)` or `OpenFOAM.com`, assign optional **model-owned roles** (`metal / mold / interface / wall / inlet / outlet / other / unassigned`) to original named CAD parts and use **Prepare OpenFOAM geometry ZIP**. The button is disabled until a distribution has been selected and every visible source region has explicitly confirmed geometry units. Roles are annotations **selected by the user**, never inferred from file names or converted automatically into `cellZones`, `faceZones` or metal–mold interfaces.
- **Retained original physics/provenance**: `cgOpenFoamPrepare` calls the existing native `cgVisibleRegionBatch`, reuses the **byte-exact binary STL files already converted to SI meters**, preserving each original source model, part name, topological warnings, scale, unit, triangle count, bounding volume and source provenance. Only visible parts enter the package; names and geometry dictionary keys are unique even if different models contain same-name parts.
- **Correct, explicitly chosen OpenFOAM layout**: Foundation v13-style `staging/constant/geometry/*.stl` with `type triSurface; file "..." ;`; OpenFOAM.com `staging/constant/triSurface/*.stl` with `type triSurfaceMesh;` keyed by STL filename. The downloaded ZIP contains a **non-runnable `staging/system/snappyHexMesh.geometry.foamlens` geometry-only snippet**, a `staging/system/blockMesh.bounds.foamlens.json` report of actual minimum/maximum/size XYZ in meters, `preparation.json` source-region/role/edition provenance and `README-OPENFOAM-STAGING.txt` safe manual integration steps.
- **No invented meshing:** the manifest explicitly marks `installedOpenFoamVerified: false`, `openFoamCaseMutated: false`, `volumeMeshCreated: false` and `toolsExecuted: []`. The bundle never writes to a working case, runs `blockMesh`/`snappyHexMesh`, generates a runnable mesh dictionary, chooses the physical simulation domain/inside point/refinement or claims a valid `polyMesh` or metal–mold interface. An individual `surfaceCheck` (existing optional native tool) and independent CFD engineering review remain necessary.
- **Safety/validation**: blocks unknown distribution or dimensions, missing/unsupported part roles, unsafe names, duplicate output keys, unverifiable original triangle/part identity, absent finite SI bounds or oversized native ZIP; topology warnings require explicit confirmation before export. No original STL/OBJ/ZIP/FreeCAD/OCCT engine is replaced.
- **Automated original-code regressions**: `desktop/tests/cad-openfoam-staging.test.cjs` tests both distributions, archive content/CRC, SI numeric bounds, exact binary STL bytes, same-name source parts, original metadata, role selection/empty defaults, hidden regions and fail-closed physical sources. `desktop/tests/cad-openfoam-staging-ui.test.cjs` executes actual edition/role/ZIP-export controller, topological consent and all target/unit guards. Both run via CAD scientific fast suite, native CAD Windows/Ubuntu assembly suite and full Windows build test manifest.
- **Merged:** [PR #348](https://github.com/michels-lab/FoamLens/pull/348), commit `958c9b7dc41aadee5ad3326a0abc389834000689`. At merge: CAD native assembly suites on **Windows and Ubuntu** and original CAD fast checks **SUCCESS**, zero observed failures; longer WebView2/QuickCup validation remained in progress. No release, RC or Developer Edition. CAD [#148](https://github.com/michels-lab/FoamLens/issues/148) remains open for **real** complete dictionaries, version verification, multi-region volumetric meshing and installed CFD acceptance.

## Unreleased — Operación Granada CAD F3: original model/part hierarchy and source-owned isolation (#347)

- **Visible CAD & Geometry improvement:** original imported STL/OBJ/ZIP and FreeCAD/OCCT triangulated CAD models now appear in an **expandable model → original named-part tree** rather than a flat group of checkboxes. Each model retains its own group, geometry/topology metrics, warning text and unit-confirmation selector; expanded/collapsed state survives source-selection refresh. Each part has explicit **Select / Seleccionar** and **Isolate / Aislar** commands, in addition to its existing independent visibility checkbox.
- **Actual assembly visibility controls:** global `Show all parts`, `Hide all parts`, `Restore previous visibility` and visible-part counters; per-model `Show all its parts` and `Hide all its parts`. Isolating one named part hides the other parts and models, activates the actual original part in the existing export/surfaceCheck selector and **highlights its triangles in the original CAD preview**. Restoring recovers exactly the previous model and part selection (including explicitly hidden named parts); subsequent manual edits discard the old restoration snapshot.
- **No scientific misattribution:** newly added pure functions `cgVisibilitySnapshot/Restore`, `cgSetPartsVisibility`, `cgSetPartVisibility`, `cgIsolatePart` and `cgVisiblePartTotals` retain original model references and part names, preserve `Map` data, source units and triangles and **reject stale assemblies atomically before restoration**. A new CAD import invalidates a previous snapshot; source names are escaped for HTML/attribute safety.
- The existing `cgVisibleRegionBatch` **continues exporting only selected visible named regions as separate binary STL in confirmed SI meters**, with the original ZIP manifest and unit/topology provenance. Individual STL export is now disabled/rejected if the selected named part or its owning model is hidden. Neither command modifies an OpenFOAM case nor creates a volumetric mesh. Existing FreeCAD/OpenCascade conversion and WSL `surfaceCheck` remain unchanged.
- New `desktop/tests/cad-assembly-visibility.test.cjs` executes the **original production CAD core, tree markup, event handlers and original region batch export** across two assemblies with same-name parts, mm/cm sources, isolate/restore, global/model/part show/hide, select highlighting contract, stale-snapshot rejection, HTML-escaped names and source-visible export. Registered exactly once in the full Windows build suite, added to original CAD fast checks, and a dedicated CAD UI workflow on **Windows and Ubuntu**.
- **Merged:** [PR #347](https://github.com/michels-lab/FoamLens/pull/347), commit `ca65e84d48f6b38f11ecb6c40c0074048ab4fed4`. At merge: **14 SUCCESS, 0 FAILED** including Windows/Ubuntu CAD UI and original CAD fast suite; extended QuickCup and native WebView2 checks separately pending. No RC, Developer Edition or new stable release. [CAD F3 #147](https://github.com/michels-lab/FoamLens/issues/147) and [CAD F4/F5 #148](https://github.com/michels-lab/FoamLens/issues/148) remain open for native assembly/part-name preservation, guided multi-region meshing preparation and installed visual/physical acceptance.

## Unreleased — Operación Granada Field G9: original multi-view spatial CSV export (#346)

- **New visible product command:** `Export A–D CSV / Exportar CSV A–D` beside Field's native `Compare A–D profiles` control. The export is enabled **only for an active 3D + Spatial Profile A–D comparison**, and downloads the original sampled curves with the existing native `downloadText` function. No new renderer, installer permission, server or processing engine.
- **One tidy CSV row per original Field value:** original view A/B/C/D, case ID and case name, region, field, component, **cell/face/point storage association**, original OpenFOAM dimensions, unit, source-local physical time in seconds, monotonically ordered distance along the shared A→B line, query XYZ coordinates in meters, raw measured sampled value, original A/B line endpoints, requested and valid sample counts. The XYZ columns are the **requested world-coordinate query locations of the existing source sampler**, not invented nearest cell centroid locations. Values are not time-aligned or transformed into display units.
- **Strict source provenance and complete-export gate:** validates that 2–4 compared view identifiers and their canonical original Field-series IDs still match loaded OpenFOAM case, region, field, component, association, dimensions, unit and timestamp; validates unchanged physical line endpoints, finite ordered physical positions and values, length and sample count of each original curve. Missing, stale or corrupt data from any active source prevents downloading a **partial or misleading CSV**, preserving all original curves and Data filters.
- UTF‑8 BOM and RFC-compatible quoted CSV text with CRLF for Excel; imported OpenFOAM case names containing quotes, commas or newlines remain readable and leading spreadsheet formula markers are neutralized. Original finite numeric values including negatives are exported as numbers.
- Added `desktop/tests/field-multiview-profile-csv.test.cjs` to exercise the **production Field source resolver and original CSV builder/export action** with B3/C3, T-volume/T-surface/Ux, four distinct real-source timestamps, XYZ point geometry and negative preflights; CI registered in Field F2 **Windows and Ubuntu** and exactly once in the comprehensive Windows build.
- **Merged:** [PR #346](https://github.com/michels-lab/FoamLens/pull/346), commit `006b882efaf844421db141043cfcf97f76bb4350`. At merge: **14 successful checks, 0 failed**, including Field F2 Windows/Ubuntu; extended WebView2 and QuickCup tests still in progress. No RC, Developer Edition or new stable release; next major functional block is existing CAD & Geometry workflows for part/assembly organization (without rebuilding native STL/STEP/IGES import/export already available).

## Unreleased — Operación Granada Field G8: compare actual A–D spatial profiles in one graph (#345)

- **New visible Field function:** `Compare A–D profiles / Comparar perfiles A–D` takes an existing world-XYZ A→B line, samples the **actual loaded source data in every active 3D viewport** and shows all curves together in the original `3D + Profile` plot, rather than forcing users to choose each source and losing other-case curves to a single original variable/time filter. The button changes to `Exit comparison / Salir de comparación` with an accessible pressed-state indicator.
- The **original source-owning sampler**, not a new renderer, produces separate derived curves for each viewport with its source case, region, field, component, storage, XYZ endpoints, finite sample positions and physical timestamp. A source replay/refresh updates its existing curve ID instead of duplicating it. Captured independent physical times are explicitly shown; **no false common time or interpolation is generated**.
- **Preflight before any curve replacement:** at least two real loaded views and a nondegenerate XYZ line, ≥2 original spatial samples intersecting each selected mesh, verified case/region/field/component ownership, finite measured time and at most two Y-axis dimensional groups. A missing or misidentified frame, out-of-bounds line or incompatible third dimensional quantity aborts **without overwriting the prior curves**. Verified scalar T on cells and faces can share a physical Y axis; a verified U component gets a separate Y axis.
- The temporary Field-only comparison hooks into the **original Data chart and its axis renderer**, bypassing Data's independent case/region/time/variable filters solely for the A–D profiles generated by the explicit comparison. **Data filter settings and original case selections are never rewritten**. Exiting the comparison, changing a source selector, hiding/removing an active view, switching back to 3D only or leaving Field restores the native filtering behavior, without deleting unrelated imported series.
- Added `desktop/tests/field-multiview-profile-comparison.test.cjs` to execute the production Field and Data graph paths against independent B3/C3 metal/mold, T volume/face, Ux vector and t=0.2/0.3/0.4/0.5 physical snapshots; includes repeat replacement, out-of-mesh and stale-source preflight, mismatched physical dimensions, isolated Data filter restoration and removed-viewport invalidation. Included in Field F2 Windows/Ubuntu CI, original multi-panel/transport regressions and the Windows full build test suite.
- **Integrated:** [PR #345](https://github.com/michels-lab/FoamLens/pull/345), squash commit `e8db0d4272b3756c3b0782d4347139e9d130706d`. At integration, Field F2 Windows+Ubuntu and transport/loaded-cases checks succeeded; full native build and QuickCup checks have separately tracked statuses. **No new release, RC or Developer Edition**. Next product work: direct comparison export and CAD/Geometry per-part workflows; runtime performance last.

## Unreleased — Native Windows packaged G58 regression correction (#344)

- Fixed the real native Windows WebView2 packaging smoke test, which had continued to require the old bare-string `option.value==='T'` for an original B13 field even after the scientific source selector in [PR #341](https://github.com/michels-lab/FoamLens/pull/341) correctly migrated to structured `[name,storage,kind]`. This stale check was the **sole reported failed G58 gate** in the previous full Windows builds; all other G58 layout/visibility checks passed.
- The existing `Program.cs` witness now requires a **scalar original T field with explicitly recognized OpenFOAM volume, surface, or point association**. It still fails on unknown storage, malformed IDs or an unverified display-only `T`. Real source identifiers, chart visibility, Build/Cancel accessibility, 2 independent source slots, overflow checks, physical-time data and screenshots are unchanged.
- Added exact embedded native expression tests to `granada-176-timeseries-ui.spec.cjs` on Windows and Ubuntu, with the actual native Program.cs change triggering T2 CI. Original WebView2 packaged runner results remain a separate build gate; this entry does not claim full packaged success until the workflow finishes.
- Merged in [PR #344](https://github.com/michels-lab/FoamLens/pull/344), SHA `38a71d728978c992658b314b016192d298b096de`. No new release, RC, Developer Edition or OpenFOAM data modification.

## Unreleased — Operación Granada Field G7: spatial profiles from any A–D original 3D view (#343)

- **Functional extension of Field 3D + Spatial Profile**: added a visible `Profile from view / Perfil desde vista` selector for original loaded view A, B, C or D, and an `Update profile / Actualizar perfil` command. The existing shared 3D A→B world-XYZ line can now sample **the actual selected viewport's loaded mesh, OpenFOAM field values, region, field component, storage association and physical timestamp**, rather than always reading Field A.
- Each original viewport source preserves an **independent derived spatial-profile series**, its own id, original source view, case, region, field, component, storage, real time, two XYZ endpoints and finite sample coverage. Adding B/C/D profiles does not replace A's curve. Selecting a different world-XYZ line removes only curves generated for the previous line, leaving unrelated imported profile datasets untouched.
- Source guards reject a case, region, field or component whose selector no longer matches the **loaded frame** (e.g., a still-loading case change). Invalid physical time or a line outside the usable measured mesh does not fabricate profile points or timelines. Sampling still uses the existing original `fwSampleFieldAtPoint` method and does not claim mesh or variable equivalence across cases.
- New `desktop/tests/field-multiview-profile-source.test.cjs` executes the **original production Field sampler and original four-view source resolver** with independent B3 metal/C3 mold cases, volume/surface samples, vector Ux, original times 0.2/0.3/0.4/0.5 seconds, stale-case rejection, old-line cleanup and single-view fallback. The preexisting strict no-invented-time fixture remains active. Registered in Field F2 Windows/Ubuntu workflows and in the Windows monolithic test manifest exactly once.
- Merged in [PR #343](https://github.com/michels-lab/FoamLens/pull/343), commit `215ea3721a561bb15e03e92b3ab2b89b1505be7d`. Scientific Field viewport geometry checks Windows/Ubuntu SUCCESS at merge; remaining native checks have independent status. Follows [#342](https://github.com/michels-lab/FoamLens/pull/342) cross-viewport source duplication. **No release, RC, Developer Edition or source-case modification**; next product priorities are richer multicaso/multivariable plot interaction and CAD per-part tools.

## Unreleased — Operación Granada Field G6: copy original 3D sources between viewports (#342)

- **New visible Field tool in views B/C/D:** `Copy source / Copiar fuente` selects any other currently available A/B/C/D viewport as a donor and copies its original **case, region, field and vector component** to the chosen target. A donor stays untouched; the destination's camera, projection, physical-time playback target, overlays and separate visual appearance are not overwritten.
- Source copying performs a **preflight against the real available original OpenFOAM case, region, field and component** before changing the destination. Missing/incompatible sources, invalid components and ambiguous same-name volume/face/point groups are rejected instead of silently copying a different scientific variable. Only the destination's independent playback and stale Probe are invalidated.
- Fixed the older `Copy A → B settings` command: it now **really copies the case** from A (previously it skipped case ID), and retains its established optional copied visual settings. B/C/D source mirrors still invoke the original native selection handlers and refresh each target once.
- The existing native source selectors are now **open by default in A/B/C/D** for quick editing, retaining their per-view collapse behavior and keyboard Escape/focus restoration. A compact responsive, bilingual copy-source selector is local to each receiving viewport.
- New executable regression `desktop/tests/field-source-copy.test.cjs` covers A→B→C→D, D→B across independent B3 metal and C3 mold sources, missing and ambiguous fields, vector components, independent donor and playback isolation, and the original A→B action. New test wired into Windows build suite and Field G2 on Windows/Ubuntu; Field G2 succeeded on both at PR #342.
- Merged in [PR #342](https://github.com/michels-lab/FoamLens/pull/342), commit `aca3a660`. Field UX #177 and scientific multiregion Field F1 #145 remain open for other functionality and actual installed/physical acceptance. **No new release/RC/Developer Edition**; performance and installer proofs intentionally deferred.

## Unreleased — Operación Granada T1: exact OpenFOAM field association and independent source-case selection (#341)

- Fixed the original Time Series field selector choosing the first same-name group. Cell/volume `T`, face/surface `T`, and point `T` now have **distinct structured selector tokens** (original `name`, `storage`, `kind`) and are resolved only on exact source identity, not a display label. Ambiguous duplicates fail closed rather than reading the first group.
- Generated 3D global and Probe histories have unique **fieldHistoryKeys, canonical series identifiers and quantity/source provenance** for different OpenFOAM storage associations. Plot labels indicate Cells/Faces/Points, and evidence records the original source `storage` and `fieldKind`; original dimensions and real physical-time samples remain unchanged.
- Fixed manual history **Case** switching: selecting a different case in Data → Time Series no longer snaps back to the case shown in Field 3D, while the dependent region/field/component choices refresh for the actual selected case.
- The existing source catalog now counts distinct fields per case, region, name, storage and kind, not just field name. It does not read frame contents during inventory.
- New original-controller regression `desktop/tests/field-timeseries-association.test.cjs` exercises B3/metal and C3/mold, volume/surface/point `T`, component choices, invalid times, original keys, scientific source evidence, manual cross-case switching, and data-safe unusual field names. Expanded catalog regression verifies the visible count of three independent `T` associations. Tests are wired into Windows desktop CI and Windows+Ubuntu T1/T2 suites.
- Merged in [PR #341](https://github.com/michels-lab/FoamLens/pull/341), commit `a21f21dc`. Source/catalog/T2/runtime/CI ownership tests passed on the PR; expanded Windows WebView2/QuickCup checks have independent completion status. No new stable release, RC or Developer Edition; installed Windows visual/DPI and real imported-case acceptance remain outstanding.

## Unreleased — Operación Granada T1: atomic dual-source histories and provenance (#340)

- Requesting two independent 3D OpenFOAM time histories is now **transactional**: if either slot fails to yield a real curve (global field, pinned Probe or spatial profile), the chart retains its previous curves; the original generation epoch, cancellation and unit/dimension gates remain in place.
- Selecting the **same case/region/field/Probe/profile source twice** or a draft without a trustworthy source identity now raises a bilingual actionable error, instead of deduplicating two requested histories into one misleadingly reported curve.
- The 3D history selector now respects the earlier T1 physical-time inventory gate and does not offer fields whose original time labels have no valid finite timestamp.
- The success/status line identifies each source's original **case, region, field/component, finite samples, total original times, and measured first/last sample time**. No interpolation, synthetic values or source-file changes.
- Added original-code two-slot B3 metal/C3 mold regression: 2 compatible T sources, T vs U with Y axes separated by verified units/dimensions, missing source 1/2, identical keys, unknown key, incompatible K/°C, disabled Source 2 and physical time normalization. T2 source-owned DOM and cancel tests passed Ubuntu/Windows on PR #340; Windows runtime and original fixture checks have independent outcomes.
- Integrated in main via [PR #340](https://github.com/michels-lab/FoamLens/pull/340), commit `a61a8b1d`. No published release, RC or Developer Edition. Installed Setup/Portable, user visual/DPI review and general scientific validation remain independent gates.

## Unreleased — Operación Granada T1: indexed physical time inventory across cases/regions (#339)

- The existing Time Series 3D field-source catalog now validates **explicit finite OpenFOAM timestamps**, rejects null/empty/boolean/NaN/Infinity instead of fabricating t=0, deduplicates equivalent numeric labels (0, 0.0 and zero strings), and records valid first/last source time per case/region/field.
- Fields with zero valid indexed physical times no longer appear buildable; malformed source time metadata is reported as a partial catalog warning without hiding other valid metal/mold fields. The bilingual summary discloses distinct source-case and case-region counts.
- Existing postProcessing time series are still separate from potential source-backed 3D field histories; only an explicit Build reads frames or constructs curves. Scientific original values, history generator, cancellation and file paths are unchanged.
- Original source-derived B3 metal/C3 mold regression and T1/T2 catalog CI on Ubuntu/Windows were **SUCCESS** on PR #339; installed Windows Setup/Portable UX, owner visual/DPI acceptance and other release gates are distinct. Integrated in main as `c1b64e9a` without a new stable release.

## Unreleased — Operación Granada Field A–D · pause-all control (#338)

- Add a visible, bilingual **Pause all / Pausar todas** action to the 3D Field header. One deliberate click pauses A's original transport and cancels the independent B/C/D measured-time players.
- The command does **not** relink cameras, visual settings or physical time, change case/region/field/component, or reset a viewport's chosen OpenFOAM timestamp. The existing **Synchronize views** switch remains separate and fully optional.
- Extend the original Field loop/playback test to exercise production stop sequencing, timer cancellation, real click binding, bilingual labeling and per-view time preservation. Full Windows installed-app visual acceptance remains outstanding. No RC, stable tag, version bump or release.

## Desktop v1.8.14 — 2026-11-12 · verified multi-case Time Series Y-axis dimensions

- Compare two independent cases or regions on one numeric Y axis only when both original field identities, unit labels and seven OpenFOAM dimension exponents are present and compatible. Previously two missing units and dimensions could accidentally yield the same empty comparison key, implying equality without physical evidence.
- Keep verified compatible K/K source histories and verified dimensionless phase fractions on the same scale. Separate K/Celsius (no implicit conversion), empty or unknown units, malformed dimension arrays, missing field identity and unit '-' on dimensional physical fields onto independent Y axes. Never infer physical measurements.
- Extend the original dual-timeseries regression across distinct case histories, known velocity fields, incomplete postProcessing metadata and dimensionless alpha values. The exact-source stable release must still pass original QuickCup, installed Windows Setup/Portable and both SHA-256 and postpublication audits; full multi-case field-history validation and user visual acceptance remain separate.

## Desktop v1.8.13 — 2026-11-12 · Field F2 and Time Series T1 source fixes

- Isolate source metadata discovery errors by imported case and physical region. An unavailable mold inventory no longer silently hides valid metal fields or other imported cases, and only genuine indexed scalar/vector fields with listed physical times count as available.
- Preserve the existing distinction between imported measured curves and unparsed 3D fields, and keep valid history-builder selectors available even when postProcessing time series already exist. Report a localized **partial catalog** warning rather than misleadingly claiming every source was inspected.
- Never read source field frames, infer physical values or claim missing files were measured during selector refresh; original cancellable, source-time and dimension-checked history generation remains unchanged.
- Add regression executing the actual source inventory and renderer across two cases, a deliberately unavailable mold region, existing imported curves, correct remaining fields and visible warning. Actual packaged Windows/QuickCup acceptance is validated by the tagged release job; owner visual acceptance on physical 125–200% DPI displays remains separate.

### Field F2 — view-scoped responsive Physical regions (#149)

- Make A/B/C/D's real Physical regions field/component/opacity controls responsive to **each individual viewport width**, not just overall Windows width. CSS container queries fold four fixed-minimum columns into two at 570 CSS px and one at 340 CSS px, preventing clipped controls in side-by-side comparisons and scaled displays.
- Preserve exact OpenFOAM region source selection, visibility, fields, components, colors and per-region opacity; let long region names wrap and prevent selector/range intrinsic widths from causing horizontal scrolling.
- Add regression to the existing Field F2 suite. Physical Windows scaling at 125–200% still needs visual owner acceptance; do not infer measured device validation; original v1.8.12 downloads remain unchanged.

## Unreleased — Operación Granada: measured equivalent observables 2D ↔ 3D (#154)

- Add an independent Analysis tool to compare two user-designated 2D/3D cases by **measured equivalent observable** rather than subtracting unrelated OpenFOAM meshes.
- Explicit user confirmation of physical location/region/normalization equivalence; strict source provenance and compatible OpenFOAM dimensions/units. Convert verified Celsius/Kelvin, pressure kPa/Pa, power kW/W; no unknown scale assumptions.
- Interpolate only inside overlapping original physical times; calculate bias (3D−2D), RMSE, MAE, max absolute difference and sample provenance. Display source curve comparison; export aligned CSV and JSON evidence.
- Add scientific regression and actual packaged Windows WebView2 smoke. This partial implementation does **not** certify mesh dimensionality, spatial equivalence, field-to-field differences or owner experimental accuracy. No version bump/release. Scope tracked in #154.

## Unreleased — Operación Granada #156: source-backed phase/momentum evidence explorer

- Add a separate Analysis explorer for Case → Analysis Type → Original Variable → Component → Material Region → Phase Subset → Statistic, sourcing only actual written OpenFOAM field times and field-header kind/dimensions. Reuse editable per-region Field Mapping, existing scalar/vector field ingestion, cell alignment, phase classification, and pmStats.
- Preserve missing/unknown metadata as unavailable rather than guessing that a field name, cell count, liquid fraction, or vector component is valid. Explicit partition and physical-time coverage, invalid fraction rejection, sampled/unweighted caveat and excluded source times.
- Plot only discrete real source times without invented interpolation; export source-provenanced local JSON with observations separate from unprovided physical interpretation. No solver mutation, new automatic cause/recrystallization/recalescence verdict or version bump.
- Independent Ubuntu/Windows regression + original Phase/Momentum, mapping and mechanism suites; original active Field/CAD/2D–3D/Energy/Thermocouple/Health PRs untouched. Full physical dictionary interpretation, heterogeneous cells and installed Setup/Portable acceptance remain open.

## Unreleased — Operación Granada #117: real OpenFOAM source benchmark evidence (candidate)

- Add independent read-only `tools/benchmark-real-case.cjs` to capture source-file enumeration, sequential SHA-256 content-reading cost, file/byte/type counts and sampled Node memory, with first/repeat labels and cross-pass full-content SHA-256 identity verification.
- Integrate existing genuine UI Import Performance export optionally, but keep actual WebView2 first-interaction/parser timings **separate** from the CLI source I/O measurements. If no UI report was provided, leave those metrics absent. No invented owner speedups, OS-cold cache proof, dataset-to-UI cryptographic binding or whole-process/GPU/RAM claims.
- Bounded path-private output; reject symlinks, changed/incomplete sources, invalid labels and output files inside source case. Suppress OS exception file paths in CLI errors. Export only coarse types, times, byte counts and aggregate digest.
- Add independent Linux/Windows tests covering synthetic 3,008 real-created files and 10k metadata entries, privacy canaries, same-size scientific-content modification and canceled scans, plus existing performance comparison and parser regressions. Does not change the actual Windows import algorithm or release; owner real-case benchmark/optimization remains outstanding.

## Unreleased — P0 G43 original wide Field Play class-independent safety (candidate only)

- Guard the original Field Play button at true 1025–1250px independently of stale `gfwCompact` status; G16's old compact-only rule could not match the observed 1140px/70px native failure with `gfwCompact=false`.
- Preserve original compact 640px, Play handlers and scientific values, add computed-style telemetry and adversarial source regression on Ubuntu/Windows. Installed/Portable repeated native and physical DPI evidence required; `#230` and release `#238` stay open. No release.

## Unreleased — Operación Granada #155 · Scientific Case Health (candidate)

- Reuse the existing Case Discovery, foamLog, Diagnostic/PIMPLE, checkMesh and Energy audits to create a **source-backed per-case scientific evidence ledger**; do not duplicate these physics engines.
- New Analysis tool categorizes field inventory, written physical times, controlDict, explicitly sourced runtime End/fatal events, Courant history with case-configured maxCo only, solver residual/continuity evidence, fvSolution/PIMPLE, checkMesh warnings, field dimension/BC metadata, regions/interfaces and energy data coverage.
- Six honest states (verified, warning, error, insufficient information, not analyzed, not applicable), original-source evidence, user-supplied log/checkMesh attribution limitations, explicit export and no global CFD validity certificate.
- Source data and optional local report files remain local. Independent fast Linux/Windows regression covers complete/partial/fatal cases; existing scientific auditors remain unmodified. Full owner-case experiment and installed Windows Setup/Portable acceptance remain pending. **No release.**

## Unreleased — Granada #151 · conditional multi-region energy conservation

- Add a source-only Analysis companion to the existing automatic Energy Audit, with two named regions, physical stored-energy curves [J], opposite oriented interface power curves [W], optional independent boundary/source terms and explicit sign controls.
- Require user verification of interface area/normals, total (sensible + latent when relevant) storage evidence, and accounting for all other sources/losses before producing **conditional** numerical residuals and interface reciprocity.
- Check real source region/path/column and incompatible OpenFOAM dimensions, physical units and time-range overlap; do not infer unknown energy, double-count source series, or extrapolate. Report per-region ΔE, energy exchanges and residuals; export local provenance JSON and interface CSV.
- Independent Linux/Windows scientific validation and versioned extension loader checks; leave existing Field/CAD/2D–3D PRs and shared native Windows build files untouched. Geometry verification, actual case and installed Setup/Portable remain outstanding. No release.

## Unreleased — CAD & Geometry STL/OBJ surface inspection candidate (#147, #148)

- Add a dedicated, local surface-inspection overlay to the Windows frontend for ASCII/binary STL and named OBJ components, with independent named-part visibility, orbit/zoom/preset views, XYZ bounds; multi-source overlays require per-file unit confirmation and surface topology warnings.
- Detect degenerate triangles, open/nonmanifold edges and inconsistent winding; give only a qualified enclosed-volume estimate for closed, consistently wound triangle surfaces, not proof of CAD/mesh validity.
- Export a selected named **surface** as ASCII STL in meters with a provenance manifest, requiring explicit selection of source coordinate units. No simulation files are modified; no OpenFOAM solver or mesher is executed.
- STEP/IGES/BREP kernel-based conversion, comprehensive surface and self-intersection certification, native worker isolation, OpenFOAM edition-aware surface installation, standalone meshing and owner interactive acceptance remain pending.
- Candidate branch only, with dedicated regression and packaged WebView2 smoke gates; **not released**.

## Unreleased — Operación Granada #152 · Thermocouple physical XYZ mapping candidate

- Add an independent Analysis companion to the existing Experimental Validation and 3D Probe History tools: measured sensor XYZ and unit → actual currently loaded OpenFOAM region/case cell face-containment check, *plus separate verification of the simulated probe's own containing cell*.
- Reuse source-backed field-sampled 3D Probe histories and CSV/TXT parsing; require explicit physical co-location tolerance, sensor metadata, time/temperature columns, Kelvin/Celsius units and experiment time shift. Block unmatched regions/cases, invalid 3D topology, missing/duplicate/nonfinite measurements, unverified points and absence of physical-time overlap.
- Compare real Kelvin time histories with no extrapolation: paired count, RMSE, MAE, bias and maximum difference; plot source/experiment and export locally on demand. Sensitivity uses only independently sampled, same-case/region/field-family 3D probe histories, each with separately verified cell containment; never fabricates spatial values.
- Independent Ubuntu/Windows scientific, preexisting probe and Experimental Validation regressions. Owner experiment, irregular polyhedral meshes, packaged WebView2 and installer acceptance remain open; no release.

## Unreleased — CAD & Geometry STL/OBJ surface inspection candidate (#147, #148)

- Add a dedicated, local surface-inspection overlay to the Windows frontend for ASCII/binary STL and named OBJ components, with independent named-part visibility, orbit/zoom/preset views, XYZ bounds; multi-source overlays require per-file unit confirmation and surface topology warnings.
- Detect degenerate triangles, open/nonmanifold edges and inconsistent winding; give only a qualified enclosed-volume estimate for closed, consistently wound triangle surfaces, not proof of CAD/mesh validity.
- Export a selected named **surface** as ASCII STL in meters with a provenance manifest, requiring explicit selection of source coordinate units. No simulation files are modified; no OpenFOAM solver or mesher is executed.
- STEP/IGES/BREP kernel-based conversion, comprehensive surface and self-intersection certification, native worker isolation, OpenFOAM edition-aware surface installation, standalone meshing and owner interactive acceptance remain pending.
- Candidate branch only, with dedicated regression and packaged WebView2 smoke gates; **not released**.

## Unreleased — Granada #151 · conditional multi-region energy conservation

- Add a source-only Analysis companion to the existing automatic Energy Audit, with two named regions, physical stored-energy curves [J], opposite oriented interface power curves [W], optional independent boundary/source terms and explicit sign controls.
- Require user verification of interface area/normals, total (sensible + latent when relevant) storage evidence, and accounting for all other sources/losses before producing **conditional** numerical residuals and interface reciprocity.
- Check real source region/path/column and incompatible OpenFOAM dimensions, physical units and time-range overlap; do not infer unknown energy, double-count source series, or extrapolate. Report per-region ΔE, energy exchanges and residuals; export local provenance JSON and interface CSV.
- Independent Linux/Windows scientific validation and versioned extension loader checks; leave existing Field/CAD/2D–3D PRs and shared native Windows build files untouched. Geometry verification, actual case and installed Setup/Portable remain outstanding. No release.

## Unreleased — CAD & Geometry STL/OBJ surface inspection candidate (#147, #148)

- Add a dedicated, local surface-inspection overlay to the Windows frontend for ASCII/binary STL and named OBJ components, with independent named-part visibility, orbit/zoom/preset views, XYZ bounds; multi-source overlays require per-file unit confirmation and surface topology warnings.
- Detect degenerate triangles, open/nonmanifold edges and inconsistent winding; give only a qualified enclosed-volume estimate for closed, consistently wound triangle surfaces, not proof of CAD/mesh validity.
- Export a selected named **surface** as ASCII STL in meters with a provenance manifest, requiring explicit selection of source coordinate units. No simulation files are modified; no OpenFOAM solver or mesher is executed.
- STEP/IGES/BREP kernel-based conversion, comprehensive surface and self-intersection certification, native worker isolation, OpenFOAM edition-aware surface installation, standalone meshing and owner interactive acceptance remain pending.
- Candidate branch only, with dedicated regression and packaged WebView2 smoke gates; **not released**.

## Unreleased — Time Series field-source discovery (#146)

- Keep Time Series controls and `Create time series from 3D OpenFOAM fields` visible even when no existing curve is loaded.
- Display distinct counts of preexisting measured curves versus eligible source-backed OpenFOAM 3D fields, without inventing temporal values.
- Open the existing explicit history builder when the case has real fields and no time-series data; no automatic expensive field loading.
- Candidate only: final Windows scientific validation and multi-column source-file handling remain pending.

# Changelog

## Unreleased — Mesh & Geometry Auditor: measured checkMesh report (#150)

- Import an existing local checkMesh log into Data and inspect source-reported mesh/region counts, geometry bounds, skewness, non-orthogonality, cell volumes and warnings.
- Explicitly mark absent metrics unknown rather than zero; display independent region reports and provenance limitations, with JSON export.
- Include fast parser tests and a native Windows WebView2 smoke to verify the module actually appears in the packaged app. No automatic solver execution, geometry correction or native polyMesh inspection yet.

## Unreleased — FoamLENS Developer (internal-only variant)

- Add separately compiled `FoamLensDeveloper.exe` and optional isolated Developer installer, independent settings/log/cache and WebView2 profile. This is **not** a hidden menu in regular FoamLens.
- Developer-only runtime/renderer error evidence and explicit UI inspection, local redacted AI troubleshooting prompt and JSON downloads, session clear, capped incident history and privacy safeguards.
- Native-only embedded audit resource, regression and real Windows Developer smoke gate; build script makes a local developer binary without uploading public assets.
- Work in progress (#158); not included in published Desktop v1.8.10.

## Desktop v1.8.12 — 2026-11-12 · Field single-case A / multi-region source selection

- Fix the original Windows Field viewport A identifier so resize height, maximize/restore and reset controls mount in A as well as B, without cloning DOM or creating extra cases (PR #313).
- Open a single loaded OpenFOAM case with **only A** unless the user explicitly requests a comparison. On subsequent Field entry, do not resurrect a previous same-case B automatically (PR #313).
- For each independent 3D view A/B/C/D, default to only the currently selected physical region. Preserve user-explicit physical-region visibility across frames and case changes; **Show all regions**, **Only selected region** and per-region checkboxes can combine metal, mold/sand and other genuine physical regions in one viewport without adding B (PRs #313, #314).
- Fix the per-region field selection handler to use the selected region's actual indexed field catalog, rather than an out-of-scope collection, and keep source-backed component/opacity settings independent per view (PR #314).
- Restore the original installed Windows multiregion WebView2/QuickCup GPU smoke by explicitly enabling both source metal+mold regions before checking measured arrays, time stamps, distinct meshes, same canvas/WebGL, composition and GPU buffer provenance. The independent *asymmetric missing-frame case* likewise explicitly selects mold before validating genuine geometry-only fallback and truthful missing-data legends. **These are opt-in scene tests, not a return to auto-visible mold** (PR #314 plus follow-up).\n- Update the original **View B Windows WebView2** multi-region/XYZ smoke to select secondary physical regions through B's actual checkbox controls, then require genuinely loaded mesh overlays and measured independent X/Y/Z dimensions. No automatic second region is reintroduced.
- Preserve the original exact-source Setup and Portable Windows smoke, original science tests, screenshot/digest binding, both SHA-256 files and post-release integrity audit. Authenticode code-signing is optional for unsigned direct GitHub binaries, and Windows may warn about an unknown publisher. No RC; no claim of owner-machine end-to-end performance acceleration.

## Desktop v1.8.11 — 2026-11-11 · Granada integrated Windows desktop release (published)

- Package the current original Windows source rather than the legacy v1.8.10 shipped binary; keep Web frontend v51 and native Desktop versions aligned.
- Include Field's original simultaneous 3D + Spatial Profile interface and updated A–D physical-region field/component selectors (integrated PRs #278 and #307).
- Include keyboard-accessible Analysis chart/series resizing and CAD multi-region ZIP round-trip plus optional installed OpenCascade/FreeCAD STEP/IGES/BREP import (PRs #295, #301 and #303); external kernel availability is still environment-dependent.
- Include Time Series preview/pin navigation recovery after delayed WebView2 mount, with original controls preserved (PR #309).
- Direct GitHub distribution can publish unsigned Setup and Portable at no signing-certificate cost, with an explicit unsigned/SmartScreen warning. Exact-source Windows validation, screenshot-to-binary binding, both SHA-256 sidecars and postpublication audit remain mandatory. Authenticode publisher verification remains enforced only when a signing certificate is supplied; no RC.

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