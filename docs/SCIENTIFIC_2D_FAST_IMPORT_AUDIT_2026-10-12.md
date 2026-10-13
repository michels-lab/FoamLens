# FoamLENS scientific 2D import performance audit — 2026-10-12

## Owner-observed regression (v1.8.1, Windows)
Evidence: user-provided actual application screenshot, **3,008 / 3,008 files**, **184.8 s elapsed**, **95%** and "Updating analyses", with the "Build derived data" stage running and the first two stage labels incorrectly displaying "Waiting". The files-processed count is **not evidence of a completed scientific analysis**. This is an observed owner-device stall; no machine specifications, file sizes, hardware benchmark or cause timing breakdown have been supplied.

## Verified source-level causes and changes
The existing `finalizeBulkImportWorkspace` unconditionally ran `refreshDifferenceControls()`, `refreshCouplingDiagnostics()`, `renderPhaseFront()` and `computeWorkspaceHealthProgressive()` before closing the import overlay. These routines include repeated full-series scans, solver residual comparisons, pressure-coupling heatmap and phase-front crossing tables. None is necessary to index the output files and begin viewing 2D results. Opening Ready previously called `workspaceHealth()` again, potentially recomputing solver findings. Rendering the file-manager originally materialized **every individual file row** at once.

The integrated fix in the performance candidate:
1. For imports of **at least 256 files or loaded curves**, open the scientific workspace from loaded data after generating essential derived velocity series and selectors; **do not** run cross-case difference checks, coupling/phase-front calculations or full Health audit in the critical path. Small case imports retain their previous full-analysis behavior.
2. Show the honest **NOT YET ANALYZED** state, explicitly not a numerical-health verdict, on Overview and Ready; provide **Run full scientific audit** on Overview. Opening Review automatically invokes the progressive full scientific health+coupling+difference audit, with clear progress, and clears the pending status only on successful completion. Selecting the relevant Analysis/Data/Profile view still invokes its own scientific computations.
3. Replace an `O(number_of_variables × number_of_curves)` shared-probe variable scan with an `O(number_of_curves + number_of_shared_probe_memberships)` index, without changing the physical matching criterion: same case pairing, same field canonical name and same physical probe index.
4. Initially render at most **80** individual file rows per case, with explicit **Show next 150** and **Show all** controls preserving individual-file removal and provenance. Do not build thousands of DOM rows just to open a case.
5. Fix direct/raw file import stage labels so completed Prepare/Case steps no longer display misleading "Waiting".
6. Record `[FoamLens import performance]` stage timings (derivedSeries, selectors, dataViews, firstVisibleWorkspace, totalMs; auditMs when explicitly run), file count and selected mode. These timings cover *finalization* only; do not misrepresent them as end-to-end I/O or 2D dataset load times.

## Automated evidence
- `desktop/tests/scientific-fast-import.test.cjs` runs the actual production finalization function in a sandbox with **3,008 representative curves**, blocks every eager heavy diagnostic, proves the first plot and case explorer are reachable, verifies the uncomputed-health state, and checks explicit audit and smaller-case compatibility.
- `desktop/tests/scientific-import-index.test.cjs` runs the real indexed timeseries variable-selection function against **3,008 synthetic physical-series pairs**, imposes a linear visit budget and verifies long file list pagination and that Show all remains available.
- Exact-head Windows CI with real OpenFOAM QuickCup/VTK, portable + installed WebView2 smoke, EULA, optional shortcut tasks, visual screenshots and live software release gates is still required. Synthetic fixture timings do **not** prove 184.8 s has been eliminated on the owner's particular 2D dataset.

## Next professional engineering blocks, not yet completed
- Record end-to-end import stage telemetry on the actual user case, including folder enumeration, metadata, raw disk bytes and file type mix, native parser CPU, finalization and first-interaction latency.
- Native persistent indexed case catalog and cache of field/probe metadata and times; invalidate with mtime, file size, canonical directory, content hash or reliable stable key. Avoid rereading unchanged solver output.
- Proper worker pipeline for parse/derive/scientific audit with bounded memory, cancellation, incremental snapshots, and stress tests on 3k/10k time steps plus million-cell 2D/3D physical meshes. Scientific numerical equivalence must precede any GPU acceleration claim.
- Profile `renderList`, `draw`, file parser text decoding and DOM list virtualisation against owner dataset; instrument memory high-water and cold/warm loads.
- A *larger installer* is acceptable for stable bundled native scientific dependencies if their licensing and checksums are audited; the binary's size is **not** a scientific performance metric.

**Status:** code candidate implemented; owner-hardware before/after benchmark pending. No v1.8.2 release until exact tested binaries pass.
