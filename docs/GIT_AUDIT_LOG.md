# FoamLens Git Audit Log

> Living engineering log for the FoamLens repository.  
> Repository: `michels-lab/FoamLens`  
> Primary branch: `main` · latest verified stable at candidate start: `v1.6.1`  
> Generated from GitHub history on 2026-09-28. Times below are UTC unless noted otherwise.

## 2026-10-19 — Developer section annotations with persistent location/comment and IA handoff (#158)

- Owner requested direct pinpointing of specific FoamLENS Developer sections, with a remembered comment for each that **survives closing/reopening Developer**, and all comments auto-included in subsequent exported IA debugging context.
- Implemented **Point to section** (click interception), per-element CSS anchor/route/section label/viewport position, user-authored text, created/edited timestamps, editable/deletable note list, Locate/highlight and explicit Save. Stored under dedicated Developer WebView2 localStorage key, up to 100 notes, 2,000 characters per note.
- `Developer/Audit.js` now includes the structured `sectionAnnotations` in local JSON snapshot and annotated IA prompt, with best-effort path/secret redaction at export. Existing Run Audit checks/errors remain a distinct source of evidence and never substitute a human annotation. Annotation text is not captured from other app forms.
- Regression `desktop/tests/developer-twin-audit.test.cjs` verifies saving, app reload persistence, edit/delete, exact section and full note in exported prompt, plus no accidental credential/path inclusion. Native packaged Developer WebView2 smoke now saves a real annotation via UI and validates prompt identity.
- Candidate branch/PR #159, not yet published. This is developer-only software QA; public FoamLENS and scientific Mesh Auditor #150 must stay separate.

## 2026-10-19 — Developer-only twin and AI-exportable software audit candidate (#158)

- User corrected prior interpretation: **not** a Developer button inside the public app. FoamLens Developer must be a separately compiled Windows twin for programmer-only distribution. Share core scientific/UI frontend with normal FoamLENS but isolate binary, installer AppId, program folder, WebView2 profile, cache and host logs.
- Developer variant is built by `-p:FoamLensDeveloper=true`, resulting in `FoamLensDeveloper.exe`; developer Audit.js is embedded only when the developer compile constant is active. Regular `FoamLens.exe` / AppBundle do not contain developer audit tools. Developer Setup has its own AppId and uninstaller. Automatic/public updater disabled on Developer.
- Developer audit captures actually observed JavaScript/window/promise/WebView2 failures and runs bounded, explicit UI checks for missing controls, duplicate IDs, clipping/overlap, device scaling and limited performance data. Includes local actions and source context without recording input field values. Locally exports sanitized JSON or AI troubleshooting prompt with evidence and honest coverage limitations; no automatic uploads.
- Privacy: best-effort redaction of paths, query credentials and Bearer secrets; manual review before sharing a report is mandatory. This is **not** exhaustive source auditing, silent monitoring of all computers, authentication, an AI model embedded into FoamLens, or a guarantee of scientific correctness.
- Build & evidence: local script `desktop/developer/build-developer.ps1`, `desktop/installer/FoamLensDeveloper.iss`, WebView2 real-audit smoke and `desktop/tests/developer-twin-audit.test.cjs`. **Candidate / unmerged at entry**, exact CI and installed acceptance pending; neither edition's public release bumped. Technical documentation `docs/FOAMLENS_DEVELOPER_EDITION_2026-10-19.md`. Scientific Mesh Auditor #150 remains separate.

## 2026-10-19 — Full FoamLENS pending work inventory from other conversations added to main roadmap (documentation-only)

- Owner required permanently preserving **both** newer CAD/STEP/IGES/STL, independent A/B/C/D physical regions and XYZ dimension overlays, Time Series `Variable 0` fixes **and** all previously identified scientific features in other chats. This work adds a canonical plan without claiming completion or shipping new executables.
- **Canonical plan:** `docs/DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md`; tracked features: [#145](https://github.com/michels-lab/FoamLens/issues/145) A–D region/dimensions, [#146](https://github.com/michels-lab/FoamLens/issues/146) Time Series catalog/generation, [#147](https://github.com/michels-lab/FoamLens/issues/147) CAD viewer STEP/IGES/STL/OBJ/BREP, [#148](https://github.com/michels-lab/FoamLens/issues/148) edition-aware STL/OpenFOAM surface export and later meshing, [#149](https://github.com/michels-lab/FoamLens/issues/149) resizable unobstructed viewports/DPI.
- **Additional scientific pending work recovered from other chats and issued:** [#150](https://github.com/michels-lab/FoamLens/issues/150) checkMesh Mesh & Geometry Auditor, [#151](https://github.com/michels-lab/FoamLens/issues/151) multiregion energy and interface conservation, [#152](https://github.com/michels-lab/FoamLens/issues/152) physical-coordinate Thermocouple Mapping with experimental CSV/TXT, [#153](https://github.com/michels-lab/FoamLens/issues/153) real 3D solidification front/phase volumes, [#154](https://github.com/michels-lab/FoamLens/issues/154) comparable observables between 2D and 3D meshes, [#155](https://github.com/michels-lab/FoamLens/issues/155) Scientific Case Health, [#156](https://github.com/michels-lab/FoamLens/issues/156) Phase Change / Momentum, configurable Field Mapping and derived-field checks.
- Existing [#117](https://github.com/michels-lab/FoamLens/issues/117) original 3,008-file cold/warm workload, and [#131](https://github.com/michels-lab/FoamLens/issues/131) owner/device Windows acceptance remain independently open. Follow-up of `v1.8.10` must not conflate green fixture CI with those real-case measurements.
- **Product constraints:** remain generic read-only scientific OpenFOAM analysis. QuickCup C14/B14/B15/B16/C15/C16 can be test fixtures but not production constants/labels; no CFD solver execution in CI. Audit existing scientific modules before implementing extensions. Source-backed measurements, dimensional consistency, physical mesh provenance, experimental coordinates and no implicit falsification.
- Code in branch `feat/field-per-view-regions-dimensions-20261019` is **unmerged experimental work**, not completed/validated. New scope is documentation only on a separate branch/PR; no version bump, no release and no claims of new features being operative in v1.8.10. Future tasks update plan + bitácora with source SHA/CI and Windows Setup + Portable evidence.

## 2026-10-19 — Time Series field discoverability and Variable 0 fix candidate (#146)

- Root cause confirmed: `v14-dual-timeseries.js` hid the entire Time Series focus panel when `timeSeriesOptionsBase()` was empty. That hid its child `fwDataFieldHistories` builder even though actual OpenFOAM 3D fields were present in `fvFieldGroups`.
- Implemented **separate read-only source inventory** from `fwFieldTsReadyCases`, `fvReadyRegions` and `fvFieldGroups`, keeping same-named properties distinct by case and region; preserve vector X/Y/Z/magnitude as relevant. New Time Series hint distinguishes existing measured series counts from available source 3D fields.
- **Zero existing curves now keeps the panel and generation path visible**, and expands the existing Build field histories control when a real 3D field is available. No fabricated time history and no automatic reading of every time-directory on selector entry. Actual `fwBuildFieldTimeSeries` remains the explicit calculated-data path.
- Executable regression `desktop/tests/timeseries-source-catalog.test.cjs` passed with multiple real-identity cases/regions and vector fields; connected to fast and Windows CI. **Candidate only**, version/release not changed. Remaining #146: header-bearing multi-column postProcessing parser correctness, scientific real-case generation verification and user-specific Time Series acceptance.

## Maintenance rule

This file is the durable project bitácora. After any meaningful Git operation—commit, branch change, pull request action, release/prerelease, CI failure or recovery, packaging change, or important prerelease finding—append/update the relevant section here. Do not rely only on chat history.

## 2026-10-18 — Windows installer taskbar-help consent reconciliation (candidate; unreleased)

- Tracked finding: issue #137; master cross-app installer validator requires an explicit **unchecked final-page** `[Run]` action for the bilingual TaskbarPinning guide, not solely an unchecked `[Tasks]` checkbox.
- On development branch `fix/installer-final-page-taskbar-consent-20261018`, remove the extra Tasks-page `taskbarhelp` entry and expose the existing Notepad guide in `[Run]` using `nowait postinstall skipifsilent unchecked`. Preserve the existing optional unchecked desktop shortcut and shipped bilingual guide. Do not invoke unsupported automatic taskbar pinning.
- Update `tools/test_installer_shortcuts.ps1` to require the exact final-page consent flags, reject old task-based wiring, and continue verifying installed shortcuts, guide contents, silent opt-in/opt-out installation and uninstall.
- Local source-pattern assertion: passed for the changed `.iss` script; packaged Windows CI, interactive wizard screenshot and master validator recheck remain **pending** at this entry. No tag, version increment or public release authorized for this candidate.

## 2026-10-18 — Desktop v1.8.9 release candidate (owner explicitly authorized)

- The owner authorized completing the outstanding FoamLens tasks and publishing a release. Candidate PR #143 includes the corrected Inno `[Run]` unchecked taskbar instructions and updated packaging/installer tests; see issue #137.
- Align Windows `AssemblyVersion`, `FileVersion`, `Version`, Inno Setup fallback, frontend/Desktop About fallback and README with `1.8.9`; add matching changelog notes to ensure immutable versioned release artifacts.
- Scope is an installer consent bugfix, not new scientific algorithms or a claim of real owner-case speedup. Issue #117 remains explicitly open for cold/warm 3,008-file measurements; #131 should be reconciled only against verified exact binary acceptance evidence.
- **Validation / release status at candidate creation:** Windows CI and master governance recheck pending. Do not state published Setup/Portable, SHA-256 integrity, or Windows interactive wizard passes until the exact v1.8.9 main run verifies them.

## 2026-10-18 — Desktop v1.8.9 publicly released and checksum verified

- Owner explicitly authorized the release. PR [#143](https://github.com/michels-lab/FoamLens/pull/143) merged with release-triggering main commit `ca3f1e6e804cc33c84ff76a6f27f066a6f985ff5` after exact candidate head `26a60f5c4fa6a83515436759e93b63ba3fc946a3` passed the four candidate workflows.
- Public immutable normal release: https://github.com/michels-lab/FoamLens/releases/tag/v1.8.9, published 2026-10-18 08:38:21 UTC; draft=false, prerelease=false.
- Exact main Windows CI [#39111599721](https://github.com/michels-lab/FoamLens/actions/runs/39111599721) **SUCCESS**: QuickCup/VTK, Windows release build, actual Portable/Setup, real installed launch/uninstall, bilingual Setup/EULA controls, desktop icon/taskbar optional-help contract, packaged scientific runtime smoke and rendered Home/About/Data/Field at two sizes.
- Main scientific fast-import, loaded-case comparison and published release audit workflows also succeeded for the release commit. Main publish job **SUCCESS** through `Verify actual newly published Windows Setup and Portable checksums` after GitHub redownload.
- Published binaries: `FoamLens-Portable-v1.8.9.exe` (73,870,471 bytes), `FoamLens-Setup-v1.8.9.exe` (68,525,781 bytes), with a separate `.sha256` file for each. These are the real published assets, not candidate build artifacts.
- Source compatibility: optional desktop shortcut remains unchecked; taskbar help is a separate, explicitly unchecked final-page choice (`postinstall skipifsilent unchecked`). No unsupported silent taskbar pinning. The initial candidate failed because two historical tests asserted the old Tasks-page behavior and the native shortcut test had a brittle line-matching expression; tests were corrected, then all exact candidate and main checks passed. Release contains no changes to measured OpenFOAM numerical inputs.
- Remaining manual scientific evidence: owner's real 3,008-file cold/warm case benchmark, memory and interactive-plot timing (#117). Owner-specific screenshots and review (#131) remain separate; neither is claimed completed by generic CI.

## 2026-10-18 — Field viewport controls and Ribbon collision repair (PR #144, candidate)

- Owner's v1.8.9 Windows screenshot exposed a real UI discoverability regression: Field's `+ Add 3D View` was inside an intentionally hidden header, B/C/D case+field selectors were buried in the inspector, and the quick Camera/Compare/Cache/physical-time ribbon painted over neighboring controls at compact width.
- **Implemented in PR #144:** visible `+ Add view` on the permanent 3D card header, supporting up to four views of the **same or different already-imported OpenFOAM cases**. Each viewport now has directly accessible independent source-backed case, property, region and component selectors. No duplication or fabrication of field values or geometry.
- Added view-header drag/drop reordering, with keyboard arrow fallback, retaining the existing DOM WebGL renderer/canvas/probe/time metadata; per-view +/- camera zoom, independent by default, with an explicit shared-camera toggle.
- Corrected Field Ribbon intrinsic group sizing and measured wrap rows so the 7 camera presets, playback, cache, Compare and Camera buttons do not overlap. Existing data-only Profiles / Time Series ownership, true-aspect ratio, physical units and scientific OpenFOAM parsers remain unchanged.
- Executable regression `desktop/tests/field-multiview-ux.test.cjs` covers independent/linked camera zoom, binding identity, pane reordering and toolbar constraints; added to Windows full CI and Field fast CI.
- Candidate branch `feat/field-multiview-drag-zoom-20261018`. **No release or version bump** authorized by this screenshot. Exact packaged Windows screenshots, high-DPI viewport interaction and owner real-case review remain pending until verified; issue #117 real 3,008-file measured performance remains open.

## 2026-10-19 — FoamLens Desktop v1.8.10 release authorized; exact version candidate

- Owner explicitly requested finishing the formerly unmerged PR #144 **and actually publishing a new release**. Previous release v1.8.9 did not include the screenshot-driven 3D controls and Ribbon corrections.
- PR #144 base commit `3c01dbe43d8f44055be6c80f0589030cd5016fb7` completed QuickCup/VTK, full Windows Setup/Portable installed-source tests and field playback/camera/native scientific cache CI successfully. Earlier candidate failed the outdated single-row native smoke gate; the corrected exact WebView2 gate rejects real panel overlap/clipping and verifies Add/Import/Property/Zoom controls.
- Release candidate metadata updated coherently to **1.8.10**: .NET `Version`, `AssemblyVersion`, `FileVersion`, Inno fallback `MyAppVersion`, frontend/About fallback, README and changelog. These are the *same* tested UI/physics code paths; no OpenFOAM numerics, geometry units or proprietary dataset changed.
- Required remaining acceptance at candidate creation: the exact version-bumped PR SHA must pass quick Field/camera, QuickCup/VTK and complete Windows installed + portable smoke. Merge squash commit must start with `release:`; only the resulting `main` workflow may publish new v1.8.10 Setup/Portable and validate public SHA-256 redownload.
- Benchmarks on owner's original 3,008-file case (#117) and owner-specific visual review (#131) remain distinct and cannot be claimed as completed by fixture testing.

## 2026-10-19 — Desktop v1.8.10 public release completed, installed and SHA-256 verified

- Owner explicitly required **merging and actually publishing** all screenshot-driven Field fixes. PR [#144](https://github.com/michels-lab/FoamLens/pull/144) was merged by squash as release-triggering `main` commit `768413b1f5ba7c6c77be0ddad98fbd741d210f48`. Prior branch candidate `b35b0a4f726dbcd5035020d2d4d7836f5459a3e4` passed all six matching workflows, including native scientific cache, Data comparison, quick Field playback and full Windows Setup/Portable tests.
- **Release verified live:** https://github.com/michels-lab/FoamLens/releases/tag/v1.8.10 — published 2026-10-19 12:33:26 UTC, draft=false, prerelease=false.
- [Exact published-main build](https://github.com/michels-lab/FoamLens/actions/runs/39251777721): QuickCup/VTK **success**; full Windows build and real installer/portable scientific/visual acceptance **success**; `Publish after automated candidate validation` **success**, including the public Setup/Portable redownload checksum verification step.
- Published assets: `FoamLens-Portable-v1.8.10.exe` (73,876,105 bytes), `FoamLens-Setup-v1.8.10.exe` (68,526,622 bytes), plus independent `.sha256` files for both.
- User-visible fixes: permanent **+ Add view** and **Import case** on the 3D card, independently selectable imported case/region/field/component per A–D view; same-case comparisons; pan/drag reorder viewport headings; per-view +/− zoom with optional linked cameras; Field Ribbon wrapping without Cache/Compare/Camera/physical-time overlap.
- The earlier single-row Ribbon smoke restriction was removed **only** in favor of stronger real WebView2 checks of bounding-box non-overlap, no clipping, visible Add/Import and per-view controls. Physical mesh aspect ratio, scientific sample values and playback clocks remain source-backed.
- Outstanding unrelated owner-specific proof: run a measured cold/warm benchmark on the original 3,008-file case (#117), and verify original desktop screenshots/on-device review (#131). Neither blocks the now-published v1.8.10 and neither is falsely marked done.

## Current repository state

| Item | State |
|---|---|
| Current public release at candidate start | `v1.6.1` — FoamLens v1.6.1, normal release |
| Latest stable v1.6.1 merge head | `45d18c43b845fafb45c9497aaa011d92c64d5b8c` — v1.6.1 PR #19 |
| Validated v1.6.1 main head at candidate start | `4c408b3d5d0b75982a1d98504cabeeb47fd4e048` — Windows CI #922 SUCCESS / Store CI #6 SUCCESS |
| Stable v1.6.1 assets | Portable and Setup `v1.6.1.exe`, each with SHA-256 |
| Real regression fixture | `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13` |
| Latest prerelease | `v1.3.0-rc.1` — legacy prerelease retained for history |

## Important project milestones

- **2026-09-24** — repository history begins with `Initial release: OpenFOAM PostPlotter v20`.
- **2026-09-27** — Windows packaging/release line progressed through v1.0.0, v1.0.1, v1.0.2, v1.1.0, v1.2.0, and a published v1.3.0 release on `main`.
- **2026-09-28** — development continued on `development/v1.3.0-general-discovery` for the broader general OpenFOAM v1.3.0 work, with PR #1 opened as a draft against `main`.
- **2026-09-28** — master-spec audit/regression hardening added physical-time playback cache/prefetch, solver corrector + termination parsing, and stronger Windows visual smoke tests.
- **2026-09-28** — `v1.3.0-rc.1` prerelease was published from the development branch with portable EXE, SHA-256, and installer assets.
- **2026-09-28** — prerelease testing exposed UI defects: hidden sidebar lacked an obvious restore affordance and the Cases popover could be covered by navigation. Commit `3ddc9b6` fixed both; Actions run #189 passed.
- **2026-09-28** — prerelease testing exposed a background-execution defect: scanner yields depended on `requestAnimationFrame`, so scientific work could stall when the WebView stopped producing render frames. The pipeline was changed to a render-independent task scheduler and guarded by regression tests; Windows minimized-window smoke validation passed in run #191.
- **2026-09-28** — prerelease review found Watch Run technically functional but too browser-oriented and too sparse for the desktop product. It was upgraded to a read-only live OpenFOAM run monitor with explicit RUNNING/COMPLETED/FAILED state, physical-time progress, deltaT, Courant, latest residual, coupling/corrector state, execution/clock time, five-second refresh, manual refresh/stop, and a Numerical Performance handoff. Actions run #192 passed.
- **2026-09-28** — Review/Case Auditor identity was hardened after prerelease screenshots showed mixed case selector/health/root state. Commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **2026-09-28** — native Windows branding was added to the EXE, form/taskbar, installer and shortcuts. Commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed.

## Releases

| Published | Tag | Name | Type | Target | Assets |
|---|---|---|---|---|---|
| 2026-09-27 02:44:44 UTC | `v1.0.0` | FoamLens v1.0.0 | Release | `main` | `FoamLens-Portable-v1.0.0.exe`, `FoamLens-Portable-v1.0.0.exe.sha256`, `FoamLens-Setup-v1.0.0.exe` |
| 2026-09-27 03:01:21 UTC | `v1.0.1` | FoamLens v1.0.1 | Release | `main` | `FoamLens-Portable-v1.0.1.exe`, `FoamLens-Portable-v1.0.1.exe.sha256`, `FoamLens-Setup-v1.0.1.exe` |
| 2026-09-27 03:22:51 UTC | `v1.0.2` | FoamLens v1.0.2 | Release | `main` | `FoamLens-Portable-v1.0.2.exe`, `FoamLens-Portable-v1.0.2.exe.sha256`, `FoamLens-Setup-v1.0.2.exe` |
| 2026-09-27 04:04:32 UTC | `v1.1.0` | FoamLens v1.1.0 | Release | `main` | `FoamLens-Portable-v1.1.0.exe`, `FoamLens-Portable-v1.1.0.exe.sha256`, `FoamLens-Setup-v1.1.0.exe` |
| 2026-09-27 22:37:10 UTC | `v1.2.0` | FoamLens v1.2.0 | Release | `main` | `FoamLens-Portable-v1.2.0.exe`, `FoamLens-Portable-v1.2.0.exe.sha256`, `FoamLens-Setup-v1.2.0.exe` |
| 2026-09-27 23:25:42 UTC | `v1.3.0` | FoamLens v1.3.0 | Release | `main` | `FoamLens-Portable-v1.3.0.exe`, `FoamLens-Portable-v1.3.0.exe.sha256`, `FoamLens-Setup-v1.3.0.exe` |
| 2026-09-28 18:18:03 UTC | `v1.3.0-rc.1` | FoamLens Desktop v1.3.0-rc.1 | Pre-release | `development/v1.3.0-general-discovery` | `FoamLens-Portable-v1.3.0-rc.1.exe`, `FoamLens-Portable-v1.3.0-rc.1.exe.sha256`, `FoamLens-Setup-v1.3.0-rc.1.exe` |
| 2026-09-28 20:04:27 UTC | `v1.3.1` | FoamLens v1.3.1 | Release | `main` | `FoamLens-Portable-v1.3.1.exe`, `FoamLens-Portable-v1.3.1.exe.sha256`, `FoamLens-Setup-v1.3.1.exe` |
| 2026-09-29 17:28:32 UTC | `v1.3.2` | FoamLens v1.3.2 | Release | `main` | `FoamLens-Portable-v1.3.2.exe`, `FoamLens-Portable-v1.3.2.exe.sha256`, `FoamLens-Setup-v1.3.2.exe` |
| 2026-09-29 19:59:43 UTC | `v1.4.0` | FoamLens v1.4.0 | Release | `main` | Windows portable, SHA-256 and installer assets |
| 2026-09-30 06:42:45 UTC | `v1.4.1` | FoamLens v1.4.1 | Release | `main` | Windows portable, SHA-256 and installer assets |
| 2026-09-30 09:25:48 UTC | `v1.4.2` | FoamLens v1.4.2 | Release | `main` | `FoamLens-Portable-v1.4.2.exe`, `FoamLens-Portable-v1.4.2.exe.sha256`, `FoamLens-Setup-v1.4.2.exe` |

## Pull requests

| # | Created | State | Draft | Head → Base | Current head SHA | Title |
|---:|---|---|---|---|---|---|
| 1 | 2026-09-28 09:16:04 UTC | merged | no | `development/v1.3.0-general-discovery` → `main` | `d5a94b527ae6` | Release FoamLens Desktop v1.3.1 |
| 2 | 2026-09-29 17:25:23 UTC | merged | no | `release/v1.3.2` → `main` | `f5e6ab835da5` | Release FoamLens Desktop v1.3.2 |

## Complete commit history visible from the development branch

This table records every commit currently reachable from `development/v1.3.0-general-discovery`, oldest first.

| # | Date | SHA | Commit |
|---:|---|---|---|
| 1 | 2026-09-24 21:39:42 UTC | `1c12b7a480b6` | Initial release: OpenFOAM PostPlotter v20 |
| 2 | 2026-09-24 23:20:03 UTC | `849bc8f78d08` | Release OpenFOAM PostPlotter v22 |
| 3 | 2026-09-24 23:20:06 UTC | `a7ddd943ee76` | Document v22 smart case import and case visibility |
| 4 | 2026-09-24 23:20:08 UTC | `372a424803da` | Update changelog for v22 |
| 5 | 2026-09-25 20:50:19 UTC | `d8551a3d0c77` | Release OpenFOAM PostPlotter v29 |
| 6 | 2026-09-25 20:50:23 UTC | `4baca068e69e` | Update README for v29 |
| 7 | 2026-09-25 20:50:26 UTC | `eb1b20d00d27` | Document v23-v29 changes |
| 8 | 2026-09-27 02:08:34 UTC | `d38d69e4bff3` | Add FoamLens Desktop v1 Windows build |
| 9 | 2026-09-27 02:10:14 UTC | `b11ffdfd62af` | Fix Windows path separator in FoamLens Desktop host |
| 10 | 2026-09-27 02:12:58 UTC | `9af4e44fc0db` | Include FoamLens installer in Windows artifact |
| 11 | 2026-09-27 02:34:28 UTC | `87d37175dd3d` | Build and publish FoamLens Windows installer |
| 12 | 2026-09-27 02:35:23 UTC | `f46f58ad363d` | Rename project branding to FoamLens |
| 13 | 2026-09-27 02:35:25 UTC | `ebc960dd49eb` | Document FoamLens Windows installer workflow |
| 14 | 2026-09-27 02:35:52 UTC | `4010114eaadc` | Fix FoamLens Windows build expression escaping |
| 15 | 2026-09-27 02:42:37 UTC | `16bac95fd403` | Publish FoamLens installer to GitHub Releases |
| 16 | 2026-09-27 02:48:09 UTC | `d75261a6fb05` | Rename FoamLens portable Windows build |
| 17 | 2026-09-27 02:48:17 UTC | `8afe751612f2` | Document FoamLens portable build naming |
| 18 | 2026-09-27 02:48:19 UTC | `a39886c220ea` | Document FoamLens portable build naming |
| 19 | 2026-09-27 02:58:00 UTC | `b6e2b348ca4c` | Fix FoamLens Desktop controls and native bridge |
| 20 | 2026-09-27 02:59:39 UTC | `951b86a891cb` | Release FoamLens Desktop v1.0.1 control fix |
| 21 | 2026-09-27 03:21:18 UTC | `0a25bf5daa0b` | Detect raw OpenFOAM solver logs in FoamLens v1.0.2 |
| 22 | 2026-09-27 04:02:55 UTC | `84d8c6debd82` | Synchronize Spatial Profiles by physical time in v1.1.0 |
| 23 | 2026-09-27 22:29:01 UTC | `c84ba3c4cbbd` | Add capability-driven Phase Change and Momentum analysis in v1.2.0 |
| 24 | 2026-09-27 22:30:43 UTC | `cfa8878ae761` | Fix Phase Change Momentum regression test syntax |
| 25 | 2026-09-27 22:32:34 UTC | `d4c485d66af9` | Harden Phase Change Momentum test harness |
| 26 | 2026-09-27 22:35:21 UTC | `bd16cf052713` | Use real multiline OpenFOAM metadata fixture |
| 27 | 2026-09-27 23:24:02 UTC | `3519bab807f6` | Build general OpenFOAM discovery model in v1.3.0 |
| 28 | 2026-09-27 23:32:58 UTC | `07a3de7c0ab3` | Start v1.3.0 general discovery from v1.2.0 baseline |
| 29 | 2026-09-27 23:39:11 UTC | `08fa233d55f8` | Add general temporal alignment and difference core |
| 30 | 2026-09-27 23:39:43 UTC | `42bf382967ae` | Add temporal alignment regression suite |
| 31 | 2026-09-27 23:39:59 UTC | `b5996406231a` | Inject v1.3 temporal analysis into Desktop frontend |
| 32 | 2026-09-27 23:40:08 UTC | `f960cabf2850` | Run v1.3 temporal alignment checks in CI |
| 33 | 2026-09-27 23:42:00 UTC | `9b3fdb0bc950` | Add general numerical performance and run-log analysis |
| 34 | 2026-09-27 23:42:23 UTC | `064ad9b4bdc0` | Add numerical performance regression suite |
| 35 | 2026-09-27 23:42:35 UTC | `94531fba57bd` | Load modular v1.3 Desktop analysis extensions |
| 36 | 2026-09-27 23:42:43 UTC | `643fa3a053c5` | Bundle and test modular v1.3 numerical analysis |
| 37 | 2026-09-27 23:43:33 UTC | `8a197ba8f25f` | Add reproducible temporal comparison exports |
| 38 | 2026-09-27 23:43:40 UTC | `3a4e4a6d745b` | Test reproducible comparison export metadata |
| 39 | 2026-09-27 23:44:08 UTC | `a624b46315be` | Fix adaptive deltaT association with next physical time |
| 40 | 2026-09-27 23:44:30 UTC | `479a4df14b06` | Clarify published v1.2.0 versus v1.3 development |
| 41 | 2026-09-27 23:44:39 UTC | `c69a074c93ba` | Mark Desktop v1.3.0 as development |
| 42 | 2026-09-27 23:46:26 UTC | `03beaaea3999` | Add general derived physical analysis |
| 43 | 2026-09-27 23:46:41 UTC | `f82a33b6b2f3` | Add general physical analysis regression suite |
| 44 | 2026-09-27 23:46:49 UTC | `5c573eb739af` | Run general physical analysis regressions in CI |
| 45 | 2026-09-27 23:48:00 UTC | `fd8ce3d98f93` | Expand general Field Mapping roles |
| 46 | 2026-09-27 23:48:16 UTC | `9126ba838f8b` | Add expanded Field Mapping regression suite |
| 47 | 2026-09-27 23:48:23 UTC | `8d33b2d63ce0` | Run expanded Field Mapping regressions in CI |
| 48 | 2026-09-27 23:49:28 UTC | `cd219a3db2ab` | Add generic vector magnitude derivation |
| 49 | 2026-09-27 23:49:43 UTC | `5a4a542fbc6a` | Add generic vector-field regression suite |
| 50 | 2026-09-27 23:49:49 UTC | `6fcd001e5c3a` | Run generic vector-field regressions in CI |
| 51 | 2026-09-27 23:50:36 UTC | `43388856e809` | Add native progress and cancellation controls |
| 52 | 2026-09-27 23:52:31 UTC | `1a44a89aabb9` | Add cancellable native folder and foamLog operations |
| 53 | 2026-09-27 23:52:44 UTC | `c512d00d72aa` | Add native cancellation and background regressions |
| 54 | 2026-09-27 23:52:54 UTC | `3faf291880cb` | Run native cancellation regressions in CI |
| 55 | 2026-09-27 23:53:34 UTC | `db078a414e19` | Test malformed and missing OpenFOAM data handling |
| 56 | 2026-09-27 23:54:41 UTC | `66bb588ddb0a` | Extend raw solver logs with deltaT and outer-iteration series |
| 57 | 2026-09-27 23:54:49 UTC | `bee07c4556ec` | Test deltaT and coupling extensions to legacy solver logs |
| 58 | 2026-09-27 23:55:19 UTC | `61a3a41eb715` | Hide temporal comparison controls without compatible data |
| 59 | 2026-09-27 23:55:22 UTC | `f2fd803d13ed` | Hide numerical controls without solver-log data |
| 60 | 2026-09-27 23:55:23 UTC | `810c0b3d68f9` | Hide physical analysis controls without temporal data |
| 61 | 2026-09-27 23:55:26 UTC | `f622409e0b05` | Hide vector controls without compatible XYZ fields |
| 62 | 2026-09-27 23:55:34 UTC | `21a06257aabb` | Add capability-driven UI regression |
| 63 | 2026-09-27 23:55:42 UTC | `c939ec90c312` | Run capability-driven UI regression in CI |
| 64 | 2026-09-27 23:56:00 UTC | `9b0b0b437142` | Decouple vector tools from physical-analysis visibility |
| 65 | 2026-09-27 23:56:08 UTC | `e70e888b223f` | Guard independent capability panel visibility |
| 66 | 2026-09-27 23:56:30 UTC | `0cdbe9acbd29` | Fix outer-iteration regression assertion |
| 67 | 2026-09-27 23:56:51 UTC | `41ee1a87ceb2` | Make Native temporal alignment the default view |
| 68 | 2026-09-27 23:56:57 UTC | `8f6c0b6d2016` | Test Native as default temporal alignment |
| 69 | 2026-09-27 23:57:32 UTC | `75570492d5b7` | Validate complete v1.3 extension syntax in CI |
| 70 | 2026-09-28 00:00:36 UTC | `dc682987a12f` | Add quantitative spatial profile comparison |
| 71 | 2026-09-28 00:00:55 UTC | `4ed1fcf6a206` | Add spatial quantitative comparison regressions |
| 72 | 2026-09-28 00:01:04 UTC | `89ab8109d1ba` | Run spatial quantitative regressions in CI |
| 73 | 2026-09-28 00:01:52 UTC | `9a7ce114a9c7` | Propagate physical units and dimensions through derived analysis |
| 74 | 2026-09-28 00:02:06 UTC | `4a4ce76444e4` | Test derived units and dimension safety |
| 75 | 2026-09-28 00:02:19 UTC | `60ce3e36826f` | Correct units for temporal difference curves |
| 76 | 2026-09-28 00:02:27 UTC | `38c6fa35bcea` | Test temporal difference curve units |
| 77 | 2026-09-28 00:04:07 UTC | `f57642c8ef61` | Add physical-time versus timestep-index numerical plots |
| 78 | 2026-09-28 00:04:18 UTC | `c98c81fa09f1` | Test physical-time and timestep-index solver plots |
| 79 | 2026-09-28 00:16:45 UTC | `8a3b75fb0492` | Respect active case and region in temporal analysis |
| 80 | 2026-09-28 00:16:48 UTC | `2146041449a2` | Respect active case and region in physical analysis |
| 81 | 2026-09-28 00:16:50 UTC | `fdcd3092f630` | Respect active case and region in numerical analysis |
| 82 | 2026-09-28 00:16:52 UTC | `7b5979e30acc` | Respect active case and region in vector analysis |
| 83 | 2026-09-28 00:17:30 UTC | `de523fa823fc` | Strengthen multi-region analysis context |
| 84 | 2026-09-28 00:17:47 UTC | `af96715ac35a` | Add multi-region analysis regression suite |
| 85 | 2026-09-28 00:18:00 UTC | `b7d53466dc52` | Run multi-region analysis regressions in CI |
| 86 | 2026-09-28 00:20:03 UTC | `27d18eb0db84` | Scope Field Mapping by case and region |
| 87 | 2026-09-28 00:20:30 UTC | `9efb0d0d2836` | Separate mapping-edit region from analysis region |
| 88 | 2026-09-28 00:20:43 UTC | `274f867c1425` | Test region-scoped Field Mapping |
| 89 | 2026-09-28 00:21:15 UTC | `bcc995f9a328` | Update Field Mapping regression for regional signature |
| 90 | 2026-09-28 00:21:53 UTC | `14bfb1bb6f9e` | Make Field Mapping capabilities region-aware |
| 91 | 2026-09-28 00:22:05 UTC | `1a90e75a6a3d` | Test regional capability and workspace persistence |
| 92 | 2026-09-28 00:27:24 UTC | `3359e7699c39` | Remove case-name family and variant inference |
| 93 | 2026-09-28 00:27:42 UTC | `df03a6487e60` | Add no-case-name-inference regression suite |
| 94 | 2026-09-28 00:29:23 UTC | `37d6534e09ee` | Remove inferred case families and variants from product logic |
| 95 | 2026-09-28 00:29:36 UTC | `395d729e061e` | Remove redundant case-identity override module |
| 96 | 2026-09-28 00:30:38 UTC | `abf1d967e66d` | Test base product against case-name inference |
| 97 | 2026-09-28 00:31:18 UTC | `9e4c33561b21` | Run case-name neutrality regression in CI |
| 98 | 2026-09-28 00:31:52 UTC | `5c311c63e4e9` | Expand real fixed and adaptive OpenFOAM integration coverage |
| 99 | 2026-09-28 00:32:50 UTC | `d9b4d139edcc` | Fix case-name neutrality test syntax |
| 100 | 2026-09-28 00:33:24 UTC | `3c232da2336d` | Guard product code from fixture-specific names |
| 101 | 2026-09-28 00:33:50 UTC | `754e85d3bd86` | Mark v51 workspace and About as development |
| 102 | 2026-09-28 00:34:36 UTC | `91bb2c27be6c` | Add development version consistency regression |
| 103 | 2026-09-28 00:34:49 UTC | `a795ad20ebc6` | Run development version consistency regression |
| 104 | 2026-09-28 00:36:21 UTC | `a85504e4c919` | Expand OpenFOAM dimension and SI unit interpretation |
| 105 | 2026-09-28 00:37:57 UTC | `42678b82be1a` | Translate Data Catalog SI-unit header |
| 106 | 2026-09-28 00:38:15 UTC | `fe13347f91b8` | Add OpenFOAM dimensions and SI-unit regressions |
| 107 | 2026-09-28 00:38:33 UTC | `e0a8d206b813` | Run dimensions and SI-unit regressions in CI |
| 108 | 2026-09-28 00:39:52 UTC | `b83a0f15ef5b` | Catalog FoamLens derived data with provenance |
| 109 | 2026-09-28 00:40:20 UTC | `6abe57e7cbcb` | Add derived Data Catalog provenance regressions |
| 110 | 2026-09-28 00:40:39 UTC | `69b3f44821b6` | Run derived Data Catalog provenance regressions |
| 111 | 2026-09-28 00:41:23 UTC | `71197abc139f` | Fix isolated dimensions test harness |
| 112 | 2026-09-28 00:42:28 UTC | `495c73a66749` | Align UI copy with neutral case identity and derived catalog |
| 113 | 2026-09-28 00:43:37 UTC | `3e3ba84068a3` | Add reproducible selected-series exports |
| 114 | 2026-09-28 00:43:59 UTC | `1f7fd50357fe` | Add reproducible series export regressions |
| 115 | 2026-09-28 00:44:15 UTC | `b607013ce14c` | Run reproducible export regressions in CI |
| 116 | 2026-09-28 00:45:03 UTC | `fe953b7d5aa2` | Update dimensions regression for explicit derived units |
| 117 | 2026-09-28 00:46:25 UTC | `0ce8ff883134` | Add explicit descriptive case tags |
| 118 | 2026-09-28 00:46:46 UTC | `0d6d01f31e05` | Include descriptive case tags in reproducible exports |
| 119 | 2026-09-28 00:47:07 UTC | `b94535415daf` | Add descriptive case-tag regression suite |
| 120 | 2026-09-28 00:47:33 UTC | `0a61dad28e98` | Make case-tag neutrality regression behavior-based |
| 121 | 2026-09-28 00:48:13 UTC | `3ed1a10fef68` | Run descriptive case-tag regressions in CI |
| 122 | 2026-09-28 00:48:20 UTC | `e6ee52662e3b` | Test case tags in reproducible exports |
| 123 | 2026-09-28 00:50:10 UTC | `9a8522274c3d` | Add physical-coordinate spatial gradient analysis |
| 124 | 2026-09-28 00:50:49 UTC | `007ac1cfa3f2` | Test nonuniform physical-coordinate gradients |
| 125 | 2026-09-28 00:51:06 UTC | `e7255c623da3` | Allow Physical Analysis from spatial-profile capability |
| 126 | 2026-09-28 00:52:43 UTC | `f478bb171755` | Add general flow-signal analysis |
| 127 | 2026-09-28 00:53:14 UTC | `10c203cbbd03` | Add provenance to flow analysis summaries |
| 128 | 2026-09-28 05:27:57 UTC | `fd6f4b7e5849` | Add general flow-analysis regression suite |
| 129 | 2026-09-28 05:28:14 UTC | `29cb19e94c28` | Run general Flow Analysis regressions in CI |
| 130 | 2026-09-28 05:29:47 UTC | `1a7387c1a170` | Add explicit solidification and remelting analysis |
| 131 | 2026-09-28 05:30:13 UTC | `cdbab12e175f` | Add solidification/remelting regression suite |
| 132 | 2026-09-28 05:30:31 UTC | `d9e141405f21` | Run solidification/remelting regressions in CI |
| 133 | 2026-09-28 05:31:53 UTC | `529194d91e71` | Add explicit general Thermal Analysis |
| 134 | 2026-09-28 05:32:18 UTC | `365ea581ad73` | Add general Thermal Analysis regressions |
| 135 | 2026-09-28 05:32:51 UTC | `2bada2b2b6d0` | Gate new physical modules by available data |
| 136 | 2026-09-28 05:33:06 UTC | `315918698867` | Run Thermal Analysis regressions in CI |
| 137 | 2026-09-28 05:35:02 UTC | `d0720b9a2787` | Separate General Analysis from Difference UI |
| 138 | 2026-09-28 05:36:07 UTC | `c7fbed778aa2` | Place v13-temporal-alignment in General Analysis |
| 139 | 2026-09-28 05:36:21 UTC | `5e6e4398b2fb` | Place v13-numerical-performance in General Analysis |
| 140 | 2026-09-28 05:36:34 UTC | `14e9c74e8911` | Place v13-physical-analysis in General Analysis |
| 141 | 2026-09-28 05:36:43 UTC | `2a2e3befb6dc` | Place v13-vector-fields in General Analysis |
| 142 | 2026-09-28 05:36:56 UTC | `2d3684638614` | Place v13-flow-analysis in General Analysis |
| 143 | 2026-09-28 05:37:09 UTC | `b0bd873b2d4c` | Place v13-solidification-analysis in General Analysis |
| 144 | 2026-09-28 05:37:18 UTC | `469f69f2fbd3` | Place v13-thermal-analysis in General Analysis |
| 145 | 2026-09-28 05:37:50 UTC | `52364cab270d` | Add General Analysis UI organization regression |
| 146 | 2026-09-28 05:38:11 UTC | `badef2e31ba4` | Run Analysis UI organization regression in CI |
| 147 | 2026-09-28 05:38:51 UTC | `2181b60d4691` | Use unequivocal heating interval in Thermal regression |
| 148 | 2026-09-28 05:40:21 UTC | `42857ae1346d` | Preserve postProcessing provenance on temporal series |
| 149 | 2026-09-28 05:40:54 UTC | `e10f3385862d` | Preserve volume and surface provenance in Energy Balance |
| 150 | 2026-09-28 05:41:31 UTC | `767a44e1539c` | Export postProcessing provenance with selected series |
| 151 | 2026-09-28 05:41:49 UTC | `743ea3e1f244` | Show Energy Balance source types in Data Catalog provenance |
| 152 | 2026-09-28 05:43:31 UTC | `ecb1f9a2dcc4` | Test volume and surface Energy Balance provenance |
| 153 | 2026-09-28 05:43:41 UTC | `7f858c785698` | Test postProcessing provenance in reproducible exports |
| 154 | 2026-09-28 05:43:54 UTC | `747bf1169b6b` | Test Energy Balance source types in Data Catalog |
| 155 | 2026-09-28 05:47:26 UTC | `5e87f6f71e8d` | Complete general Flow Analysis regressions |
| 156 | 2026-09-28 05:47:44 UTC | `7749a69b2f0e` | Run general Flow Analysis regressions in CI |
| 157 | 2026-09-28 05:47:53 UTC | `ff594d2f32d9` | Parse large Desktop temporal files incrementally |
| 158 | 2026-09-28 05:48:32 UTC | `25c1721c362f` | Add incremental temporal parser regressions |
| 159 | 2026-09-28 05:49:19 UTC | `e8ddf7f9fc63` | Run incremental temporal parser regressions in CI |
| 160 | 2026-09-28 05:51:36 UTC | `946d0292b0db` | Add cancellable native temporal-file parser |
| 161 | 2026-09-28 05:51:41 UTC | `beae43e5b5c0` | Parse large Desktop OpenFOAM fields incrementally |
| 162 | 2026-09-28 05:52:18 UTC | `fcdbefb1643c` | Add incremental OpenFOAM field parser regressions |
| 163 | 2026-09-28 05:52:26 UTC | `008f4da8569a` | Use cancellable native streaming for large temporal files |
| 164 | 2026-09-28 05:52:41 UTC | `ee28a78e9189` | Run incremental field parser regressions in CI |
| 165 | 2026-09-28 05:53:07 UTC | `8e90d29e49df` | Keep concurrent temporal operations isolated |
| 166 | 2026-09-28 05:53:31 UTC | `dff78dbef8eb` | Test native temporal streaming progress and cancellation |
| 167 | 2026-09-28 05:54:13 UTC | `2e8e77d8fc51` | Test native streaming temporal parser |
| 168 | 2026-09-28 05:55:34 UTC | `697ec0d10b1f` | Add cancellable native OpenFOAM field streaming parser |
| 169 | 2026-09-28 05:56:17 UTC | `79f4fe5e92b8` | Expand neutral general case comparison table |
| 170 | 2026-09-28 05:56:42 UTC | `9f44cb5308d5` | Add neutral general case-comparison regressions |
| 171 | 2026-09-28 05:57:06 UTC | `df49a99bc0a4` | Run neutral general case-comparison regressions in CI |
| 172 | 2026-09-28 05:57:14 UTC | `af327050d3c1` | Use cancellable native streaming for large OpenFOAM fields |
| 173 | 2026-09-28 05:57:46 UTC | `335b9e656427` | Add native OpenFOAM field streaming regressions |
| 174 | 2026-09-28 05:58:12 UTC | `a5804a833716` | Run native field streaming regressions in CI |
| 175 | 2026-09-28 05:58:28 UTC | `52e5dca514cd` | Fix native temporal metadata regression assertion |
| 176 | 2026-09-28 05:59:57 UTC | `a97b15bf144d` | Update Phase Momentum regression for streaming field parser |
| 177 | 2026-09-28 06:02:09 UTC | `04c6274b92d3` | Update temporal cancellation regression for unified data reads |
| 178 | 2026-09-28 06:04:36 UTC | `3c6dcc86f794` | Fix OpenFOAM field parser factory naming collision |
| 179 | 2026-09-28 06:05:02 UTC | `6cf21a77fc5d` | Update native field streaming factory regressions |
| 180 | 2026-09-28 06:26:55 UTC | `4669d0cb2dc7` | Support ASCII tensor field payloads |
| 181 | 2026-09-28 06:28:28 UTC | `1538beafa6fb` | Keep field parser core self-contained |
| 182 | 2026-09-28 06:30:35 UTC | `de560a8747ea` | Cover tensor fields in incremental parser |
| 183 | 2026-09-28 06:34:56 UTC | `0aac3e63e835` | Stress-test large incremental datasets |
| 184 | 2026-09-28 08:01:01 UTC | `26a2f0fc2be6` | Harden bilingual UI and Review presentation |
| 185 | 2026-09-28 08:08:19 UTC | `3cca331710f8` | Update regressions for bilingual UI markup |
| 186 | 2026-09-28 08:12:59 UTC | `a500ba7ab5ef` | Update case-tag regression for corrected Spanish copy |
| 187 | 2026-09-28 08:36:03 UTC | `31220b7e2be2` | Run QuickCup regression on Linux |
| 188 | 2026-09-28 08:59:28 UTC | `11501db3225a` | Complete bilingual UI audit and overflow hardening |
| 189 | 2026-09-28 09:10:39 UTC | `78501c8b4838` | Add Windows executable startup smoke test |
| 190 | 2026-09-28 09:10:58 UTC | `18e447632526` | Run packaged EXE smoke test in Windows CI |
| 191 | 2026-09-28 09:13:47 UTC | `bea07b55cf02` | Smoke-test installed Windows build |
| 192 | 2026-09-28 09:17:08 UTC | `80af3128c2c3` | Reconcile main history into v1.3.0 development |
| 193 | 2026-09-28 09:46:38 UTC | `94a59ed87a04` | Expand real OpenFOAM master-spec regression coverage |
| 194 | 2026-09-28 09:47:00 UTC | `851332602ce3` | Cover playback performance and write-interval regressions |
| 195 | 2026-09-28 09:48:04 UTC | `fada2ce22ca1` | Add runtime visual smoke validation |
| 196 | 2026-09-28 09:48:19 UTC | `562336e18ba3` | Capture runtime visual smoke artifacts |
| 197 | 2026-09-28 09:50:31 UTC | `fe2c93af63d3` | Cover complete temporal difference metrics |
| 198 | 2026-09-28 09:54:23 UTC | `ab75602eaaaf` | Document v1.3.0 master-spec regression audit |
| 199 | 2026-09-28 18:03:16 UTC | `892875618214` | Cache and prefetch Spatial Profile playback frames |
| 200 | 2026-09-28 18:04:31 UTC | `88e788746490` | Track solver correctors and run termination |
| 201 | 2026-09-28 18:05:28 UTC | `eeb2d744b346` | Test solver correctors and termination status |
| 202 | 2026-09-28 18:06:02 UTC | `900035267071` | Harden runtime visual smoke checks |
| 203 | 2026-09-28 18:08:16 UTC | `94e5629b642b` | Refine visual smoke clipping check |
| 204 | 2026-09-28 18:10:27 UTC | `f053e2727c36` | Update v1.3.0 audit after final regression hardening |
| 205 | 2026-09-28 18:40:01 UTC | `3ddc9b6795b7` | Fix sidebar restore handle and Cases panel stacking |

## GitHub Actions history

Every workflow run currently returned by the repository Actions history, oldest first.

| Run | Date | Event | Ref | SHA | Result |
|---:|---|---|---|---|---|
| #1 | 2026-09-27 02:08:48 UTC | push | `main` | `d38d69e4bff3` | failure |
| #2 | 2026-09-27 02:10:16 UTC | push | `main` | `b11ffdfd62af` | success |
| #3 | 2026-09-27 02:13:00 UTC | push | `main` | `9af4e44fc0db` | success |
| #4 | 2026-09-27 02:34:30 UTC | push | `main` | `87d37175dd3d` | failure |
| #5 | 2026-09-27 02:35:27 UTC | push | `main` | `ebc960dd49eb` | failure |
| #6 | 2026-09-27 02:35:54 UTC | push | `main` | `4010114eaadc` | success |
| #7 | 2026-09-27 02:42:39 UTC | push | `main` | `16bac95fd403` | success |
| #8 | 2026-09-27 02:48:11 UTC | push | `main` | `d75261a6fb05` | success |
| #9 | 2026-09-27 02:48:21 UTC | push | `main` | `a39886c220ea` | success |
| #10 | 2026-09-27 02:58:02 UTC | push | `main` | `b6e2b348ca4c` | success |
| #11 | 2026-09-27 02:59:43 UTC | push | `main` | `951b86a891cb` | success |
| #12 | 2026-09-27 03:21:23 UTC | push | `main` | `0a25bf5daa0b` | success |
| #13 | 2026-09-27 04:03:01 UTC | push | `main` | `84d8c6debd82` | success |
| #14 | 2026-09-27 22:29:08 UTC | push | `main` | `c84ba3c4cbbd` | failure |
| #15 | 2026-09-27 22:30:50 UTC | push | `main` | `cfa8878ae761` | failure |
| #16 | 2026-09-27 22:32:42 UTC | push | `main` | `d4c485d66af9` | failure |
| #17 | 2026-09-27 22:35:30 UTC | push | `main` | `bd16cf052713` | success |
| #18 | 2026-09-27 23:24:09 UTC | push | `main` | `3519bab807f6` | success |
| #19 | 2026-09-27 23:40:10 UTC | push | `development/v1.3.0-general-discovery` | `f960cabf2850` | success |
| #20 | 2026-09-27 23:42:02 UTC | push | `development/v1.3.0-general-discovery` | `9b3fdb0bc950` | success |
| #21 | 2026-09-27 23:42:25 UTC | push | `development/v1.3.0-general-discovery` | `064ad9b4bdc0` | success |
| #22 | 2026-09-27 23:42:37 UTC | push | `development/v1.3.0-general-discovery` | `94531fba57bd` | success |
| #23 | 2026-09-27 23:42:45 UTC | push | `development/v1.3.0-general-discovery` | `643fa3a053c5` | failure |
| #24 | 2026-09-27 23:43:35 UTC | push | `development/v1.3.0-general-discovery` | `8a197ba8f25f` | failure |
| #25 | 2026-09-27 23:43:42 UTC | push | `development/v1.3.0-general-discovery` | `3a4e4a6d745b` | failure |
| #26 | 2026-09-27 23:44:11 UTC | push | `development/v1.3.0-general-discovery` | `a624b46315be` | success |
| #27 | 2026-09-27 23:44:45 UTC | push | `development/v1.3.0-general-discovery` | `c69a074c93ba` | success |
| #28 | 2026-09-27 23:46:28 UTC | push | `development/v1.3.0-general-discovery` | `03beaaea3999` | success |
| #29 | 2026-09-27 23:46:43 UTC | push | `development/v1.3.0-general-discovery` | `f82a33b6b2f3` | success |
| #30 | 2026-09-27 23:46:51 UTC | push | `development/v1.3.0-general-discovery` | `5c573eb739af` | success |
| #31 | 2026-09-27 23:48:02 UTC | push | `development/v1.3.0-general-discovery` | `fd8ce3d98f93` | success |
| #32 | 2026-09-27 23:48:18 UTC | push | `development/v1.3.0-general-discovery` | `9126ba838f8b` | success |
| #33 | 2026-09-27 23:48:24 UTC | push | `development/v1.3.0-general-discovery` | `8d33b2d63ce0` | success |
| #34 | 2026-09-27 23:49:31 UTC | push | `development/v1.3.0-general-discovery` | `cd219a3db2ab` | success |
| #35 | 2026-09-27 23:49:45 UTC | push | `development/v1.3.0-general-discovery` | `5a4a542fbc6a` | success |
| #36 | 2026-09-27 23:49:51 UTC | push | `development/v1.3.0-general-discovery` | `6fcd001e5c3a` | success |
| #37 | 2026-09-27 23:50:39 UTC | push | `development/v1.3.0-general-discovery` | `43388856e809` | success |
| #38 | 2026-09-27 23:52:33 UTC | push | `development/v1.3.0-general-discovery` | `1a44a89aabb9` | success |
| #39 | 2026-09-27 23:52:46 UTC | push | `development/v1.3.0-general-discovery` | `c512d00d72aa` | success |
| #40 | 2026-09-27 23:52:56 UTC | push | `development/v1.3.0-general-discovery` | `3faf291880cb` | success |
| #41 | 2026-09-27 23:53:36 UTC | push | `development/v1.3.0-general-discovery` | `db078a414e19` | success |
| #42 | 2026-09-27 23:54:43 UTC | push | `development/v1.3.0-general-discovery` | `66bb588ddb0a` | success |
| #43 | 2026-09-27 23:54:51 UTC | push | `development/v1.3.0-general-discovery` | `bee07c4556ec` | failure |
| #44 | 2026-09-27 23:55:21 UTC | push | `development/v1.3.0-general-discovery` | `61a3a41eb715` | failure |
| #45 | 2026-09-27 23:55:23 UTC | push | `development/v1.3.0-general-discovery` | `f2fd803d13ed` | failure |
| #46 | 2026-09-27 23:55:26 UTC | push | `development/v1.3.0-general-discovery` | `810c0b3d68f9` | failure |
| #47 | 2026-09-27 23:55:28 UTC | push | `development/v1.3.0-general-discovery` | `f622409e0b05` | failure |
| #48 | 2026-09-27 23:55:37 UTC | push | `development/v1.3.0-general-discovery` | `21a06257aabb` | failure |
| #49 | 2026-09-27 23:55:44 UTC | push | `development/v1.3.0-general-discovery` | `c939ec90c312` | failure |
| #50 | 2026-09-27 23:56:02 UTC | push | `development/v1.3.0-general-discovery` | `9b0b0b437142` | failure |
| #51 | 2026-09-27 23:56:10 UTC | push | `development/v1.3.0-general-discovery` | `e70e888b223f` | failure |
| #52 | 2026-09-27 23:56:32 UTC | push | `development/v1.3.0-general-discovery` | `0cdbe9acbd29` | success |
| #53 | 2026-09-27 23:56:53 UTC | push | `development/v1.3.0-general-discovery` | `41ee1a87ceb2` | success |
| #54 | 2026-09-27 23:56:59 UTC | push | `development/v1.3.0-general-discovery` | `8f6c0b6d2016` | success |
| #55 | 2026-09-27 23:57:34 UTC | push | `development/v1.3.0-general-discovery` | `75570492d5b7` | success |
| #56 | 2026-09-28 00:00:38 UTC | push | `development/v1.3.0-general-discovery` | `dc682987a12f` | success |
| #57 | 2026-09-28 00:00:57 UTC | push | `development/v1.3.0-general-discovery` | `4ed1fcf6a206` | success |
| #58 | 2026-09-28 00:01:06 UTC | push | `development/v1.3.0-general-discovery` | `89ab8109d1ba` | success |
| #59 | 2026-09-28 00:01:55 UTC | push | `development/v1.3.0-general-discovery` | `9a7ce114a9c7` | success |
| #60 | 2026-09-28 00:02:08 UTC | push | `development/v1.3.0-general-discovery` | `4a4ce76444e4` | success |
| #61 | 2026-09-28 00:02:21 UTC | push | `development/v1.3.0-general-discovery` | `60ce3e36826f` | success |
| #62 | 2026-09-28 00:02:29 UTC | push | `development/v1.3.0-general-discovery` | `38c6fa35bcea` | success |
| #63 | 2026-09-28 00:04:09 UTC | push | `development/v1.3.0-general-discovery` | `f57642c8ef61` | success |
| #64 | 2026-09-28 00:04:20 UTC | push | `development/v1.3.0-general-discovery` | `c98c81fa09f1` | success |
| #65 | 2026-09-28 00:16:47 UTC | push | `development/v1.3.0-general-discovery` | `8a3b75fb0492` | success |
| #66 | 2026-09-28 00:16:50 UTC | push | `development/v1.3.0-general-discovery` | `2146041449a2` | success |
| #67 | 2026-09-28 00:16:52 UTC | push | `development/v1.3.0-general-discovery` | `fdcd3092f630` | success |
| #68 | 2026-09-28 00:16:54 UTC | push | `development/v1.3.0-general-discovery` | `7b5979e30acc` | success |
| #69 | 2026-09-28 00:17:32 UTC | push | `development/v1.3.0-general-discovery` | `de523fa823fc` | success |
| #70 | 2026-09-28 00:17:49 UTC | push | `development/v1.3.0-general-discovery` | `af96715ac35a` | success |
| #71 | 2026-09-28 00:18:01 UTC | push | `development/v1.3.0-general-discovery` | `b7d53466dc52` | success |
| #72 | 2026-09-28 00:20:05 UTC | push | `development/v1.3.0-general-discovery` | `27d18eb0db84` | failure |
| #73 | 2026-09-28 00:20:33 UTC | push | `development/v1.3.0-general-discovery` | `9efb0d0d2836` | failure |
| #74 | 2026-09-28 00:20:45 UTC | push | `development/v1.3.0-general-discovery` | `274f867c1425` | failure |
| #75 | 2026-09-28 00:21:17 UTC | push | `development/v1.3.0-general-discovery` | `bcc995f9a328` | success |
| #76 | 2026-09-28 00:21:55 UTC | push | `development/v1.3.0-general-discovery` | `14bfb1bb6f9e` | success |
| #77 | 2026-09-28 00:22:07 UTC | push | `development/v1.3.0-general-discovery` | `1a90e75a6a3d` | success |
| #78 | 2026-09-28 00:27:26 UTC | push | `development/v1.3.0-general-discovery` | `3359e7699c39` | success |
| #79 | 2026-09-28 00:27:45 UTC | push | `development/v1.3.0-general-discovery` | `df03a6487e60` | success |
| #80 | 2026-09-28 00:29:26 UTC | push | `development/v1.3.0-general-discovery` | `37d6534e09ee` | success |
| #81 | 2026-09-28 00:29:38 UTC | push | `development/v1.3.0-general-discovery` | `395d729e061e` | success |
| #82 | 2026-09-28 00:30:40 UTC | push | `development/v1.3.0-general-discovery` | `abf1d967e66d` | success |
| #83 | 2026-09-28 00:31:21 UTC | push | `development/v1.3.0-general-discovery` | `9e4c33561b21` | failure |
| #84 | 2026-09-28 00:31:54 UTC | push | `development/v1.3.0-general-discovery` | `5c311c63e4e9` | failure |
| #85 | 2026-09-28 00:32:52 UTC | push | `development/v1.3.0-general-discovery` | `d9b4d139edcc` | success |
| #86 | 2026-09-28 00:33:25 UTC | push | `development/v1.3.0-general-discovery` | `3c232da2336d` | success |
| #87 | 2026-09-28 00:33:53 UTC | push | `development/v1.3.0-general-discovery` | `754e85d3bd86` | success |
| #88 | 2026-09-28 00:34:38 UTC | push | `development/v1.3.0-general-discovery` | `91bb2c27be6c` | success |
| #89 | 2026-09-28 00:34:51 UTC | push | `development/v1.3.0-general-discovery` | `a795ad20ebc6` | success |
| #90 | 2026-09-28 00:36:24 UTC | push | `development/v1.3.0-general-discovery` | `a85504e4c919` | success |
| #91 | 2026-09-28 00:37:59 UTC | push | `development/v1.3.0-general-discovery` | `42678b82be1a` | success |
| #92 | 2026-09-28 00:38:17 UTC | push | `development/v1.3.0-general-discovery` | `fe13347f91b8` | success |
| #93 | 2026-09-28 00:38:35 UTC | push | `development/v1.3.0-general-discovery` | `e0a8d206b813` | failure |
| #94 | 2026-09-28 00:39:54 UTC | push | `development/v1.3.0-general-discovery` | `b83a0f15ef5b` | failure |
| #95 | 2026-09-28 00:40:23 UTC | push | `development/v1.3.0-general-discovery` | `6abe57e7cbcb` | failure |
| #96 | 2026-09-28 00:40:42 UTC | push | `development/v1.3.0-general-discovery` | `69b3f44821b6` | failure |
| #97 | 2026-09-28 00:41:25 UTC | push | `development/v1.3.0-general-discovery` | `71197abc139f` | failure |
| #98 | 2026-09-28 00:42:31 UTC | push | `development/v1.3.0-general-discovery` | `495c73a66749` | failure |
| #99 | 2026-09-28 00:43:40 UTC | push | `development/v1.3.0-general-discovery` | `3e3ba84068a3` | failure |
| #100 | 2026-09-28 00:44:01 UTC | push | `development/v1.3.0-general-discovery` | `1f7fd50357fe` | failure |
| #101 | 2026-09-28 00:44:17 UTC | push | `development/v1.3.0-general-discovery` | `b607013ce14c` | failure |
| #102 | 2026-09-28 00:45:05 UTC | push | `development/v1.3.0-general-discovery` | `fe953b7d5aa2` | success |
| #103 | 2026-09-28 00:46:27 UTC | push | `development/v1.3.0-general-discovery` | `0ce8ff883134` | success |
| #104 | 2026-09-28 00:46:47 UTC | push | `development/v1.3.0-general-discovery` | `0d6d01f31e05` | success |
| #105 | 2026-09-28 00:47:09 UTC | push | `development/v1.3.0-general-discovery` | `b94535415daf` | success |
| #106 | 2026-09-28 00:47:35 UTC | push | `development/v1.3.0-general-discovery` | `0a61dad28e98` | success |
| #107 | 2026-09-28 00:48:15 UTC | push | `development/v1.3.0-general-discovery` | `3ed1a10fef68` | success |
| #108 | 2026-09-28 00:48:22 UTC | push | `development/v1.3.0-general-discovery` | `e6ee52662e3b` | success |
| #109 | 2026-09-28 00:50:13 UTC | push | `development/v1.3.0-general-discovery` | `9a8522274c3d` | failure |
| #110 | 2026-09-28 00:50:51 UTC | push | `development/v1.3.0-general-discovery` | `007ac1cfa3f2` | failure |
| #111 | 2026-09-28 00:51:08 UTC | push | `development/v1.3.0-general-discovery` | `e7255c623da3` | success |
| #112 | 2026-09-28 00:52:45 UTC | push | `development/v1.3.0-general-discovery` | `f478bb171755` | success |
| #113 | 2026-09-28 00:53:16 UTC | push | `development/v1.3.0-general-discovery` | `10c203cbbd03` | success |
| #114 | 2026-09-28 05:27:59 UTC | push | `development/v1.3.0-general-discovery` | `fd6f4b7e5849` | success |
| #115 | 2026-09-28 05:28:16 UTC | push | `development/v1.3.0-general-discovery` | `29cb19e94c28` | success |
| #116 | 2026-09-28 05:29:49 UTC | push | `development/v1.3.0-general-discovery` | `1a7387c1a170` | success |
| #117 | 2026-09-28 05:30:15 UTC | push | `development/v1.3.0-general-discovery` | `cdbab12e175f` | success |
| #118 | 2026-09-28 05:30:33 UTC | push | `development/v1.3.0-general-discovery` | `d9e141405f21` | success |
| #119 | 2026-09-28 05:31:55 UTC | push | `development/v1.3.0-general-discovery` | `529194d91e71` | success |
| #120 | 2026-09-28 05:32:20 UTC | push | `development/v1.3.0-general-discovery` | `365ea581ad73` | success |
| #121 | 2026-09-28 05:32:53 UTC | push | `development/v1.3.0-general-discovery` | `2bada2b2b6d0` | success |
| #122 | 2026-09-28 05:33:07 UTC | push | `development/v1.3.0-general-discovery` | `315918698867` | failure |
| #123 | 2026-09-28 05:35:04 UTC | push | `development/v1.3.0-general-discovery` | `d0720b9a2787` | failure |
| #124 | 2026-09-28 05:36:09 UTC | push | `development/v1.3.0-general-discovery` | `c7fbed778aa2` | failure |
| #125 | 2026-09-28 05:36:23 UTC | push | `development/v1.3.0-general-discovery` | `5e6e4398b2fb` | failure |
| #126 | 2026-09-28 05:36:36 UTC | push | `development/v1.3.0-general-discovery` | `14e9c74e8911` | failure |
| #127 | 2026-09-28 05:36:45 UTC | push | `development/v1.3.0-general-discovery` | `2a2e3befb6dc` | failure |
| #128 | 2026-09-28 05:36:57 UTC | push | `development/v1.3.0-general-discovery` | `2d3684638614` | failure |
| #129 | 2026-09-28 05:37:12 UTC | push | `development/v1.3.0-general-discovery` | `b0bd873b2d4c` | failure |
| #130 | 2026-09-28 05:37:21 UTC | push | `development/v1.3.0-general-discovery` | `469f69f2fbd3` | failure |
| #131 | 2026-09-28 05:37:52 UTC | push | `development/v1.3.0-general-discovery` | `52364cab270d` | failure |
| #132 | 2026-09-28 05:38:13 UTC | push | `development/v1.3.0-general-discovery` | `badef2e31ba4` | failure |
| #133 | 2026-09-28 05:38:54 UTC | push | `development/v1.3.0-general-discovery` | `2181b60d4691` | success |
| #134 | 2026-09-28 05:40:23 UTC | push | `development/v1.3.0-general-discovery` | `42857ae1346d` | success |
| #135 | 2026-09-28 05:40:56 UTC | push | `development/v1.3.0-general-discovery` | `e10f3385862d` | success |
| #136 | 2026-09-28 05:41:35 UTC | push | `development/v1.3.0-general-discovery` | `767a44e1539c` | success |
| #137 | 2026-09-28 05:41:51 UTC | push | `development/v1.3.0-general-discovery` | `743ea3e1f244` | success |
| #138 | 2026-09-28 05:43:33 UTC | push | `development/v1.3.0-general-discovery` | `ecb1f9a2dcc4` | success |
| #139 | 2026-09-28 05:43:43 UTC | push | `development/v1.3.0-general-discovery` | `7f858c785698` | success |
| #140 | 2026-09-28 05:43:56 UTC | push | `development/v1.3.0-general-discovery` | `747bf1169b6b` | success |
| #141 | 2026-09-28 05:47:28 UTC | push | `development/v1.3.0-general-discovery` | `5e87f6f71e8d` | success |
| #142 | 2026-09-28 05:47:47 UTC | push | `development/v1.3.0-general-discovery` | `7749a69b2f0e` | success |
| #143 | 2026-09-28 05:47:56 UTC | push | `development/v1.3.0-general-discovery` | `ff594d2f32d9` | success |
| #144 | 2026-09-28 05:48:34 UTC | push | `development/v1.3.0-general-discovery` | `25c1721c362f` | success |
| #145 | 2026-09-28 05:49:21 UTC | push | `development/v1.3.0-general-discovery` | `e8ddf7f9fc63` | success |
| #146 | 2026-09-28 05:51:38 UTC | push | `development/v1.3.0-general-discovery` | `946d0292b0db` | success |
| #147 | 2026-09-28 05:51:43 UTC | push | `development/v1.3.0-general-discovery` | `beae43e5b5c0` | success |
| #148 | 2026-09-28 05:52:20 UTC | push | `development/v1.3.0-general-discovery` | `fcdbefb1643c` | success |
| #149 | 2026-09-28 05:52:29 UTC | push | `development/v1.3.0-general-discovery` | `008f4da8569a` | success |
| #150 | 2026-09-28 05:52:43 UTC | push | `development/v1.3.0-general-discovery` | `ee28a78e9189` | success |
| #151 | 2026-09-28 05:53:09 UTC | push | `development/v1.3.0-general-discovery` | `8e90d29e49df` | success |
| #152 | 2026-09-28 05:53:33 UTC | push | `development/v1.3.0-general-discovery` | `dff78dbef8eb` | success |
| #153 | 2026-09-28 05:54:15 UTC | push | `development/v1.3.0-general-discovery` | `2e8e77d8fc51` | failure |
| #154 | 2026-09-28 05:55:36 UTC | push | `development/v1.3.0-general-discovery` | `697ec0d10b1f` | failure |
| #155 | 2026-09-28 05:56:19 UTC | push | `development/v1.3.0-general-discovery` | `79f4fe5e92b8` | failure |
| #156 | 2026-09-28 05:56:44 UTC | push | `development/v1.3.0-general-discovery` | `9f44cb5308d5` | failure |
| #157 | 2026-09-28 05:57:08 UTC | push | `development/v1.3.0-general-discovery` | `df49a99bc0a4` | failure |
| #158 | 2026-09-28 05:57:16 UTC | push | `development/v1.3.0-general-discovery` | `af327050d3c1` | failure |
| #159 | 2026-09-28 05:57:48 UTC | push | `development/v1.3.0-general-discovery` | `335b9e656427` | failure |
| #160 | 2026-09-28 05:58:14 UTC | push | `development/v1.3.0-general-discovery` | `a5804a833716` | failure |
| #161 | 2026-09-28 05:58:30 UTC | push | `development/v1.3.0-general-discovery` | `52e5dca514cd` | failure |
| #162 | 2026-09-28 05:59:59 UTC | push | `development/v1.3.0-general-discovery` | `a97b15bf144d` | failure |
| #163 | 2026-09-28 06:02:12 UTC | push | `development/v1.3.0-general-discovery` | `04c6274b92d3` | failure |
| #164 | 2026-09-28 06:04:38 UTC | push | `development/v1.3.0-general-discovery` | `3c6dcc86f794` | failure |
| #165 | 2026-09-28 06:05:04 UTC | push | `development/v1.3.0-general-discovery` | `6cf21a77fc5d` | success |
| #166 | 2026-09-28 06:26:58 UTC | push | `development/v1.3.0-general-discovery` | `4669d0cb2dc7` | failure |
| #167 | 2026-09-28 06:28:32 UTC | push | `development/v1.3.0-general-discovery` | `1538beafa6fb` | failure |
| #168 | 2026-09-28 06:30:39 UTC | push | `development/v1.3.0-general-discovery` | `de560a8747ea` | success |
| #169 | 2026-09-28 06:35:00 UTC | push | `development/v1.3.0-general-discovery` | `0aac3e63e835` | success |
| #170 | 2026-09-28 08:01:17 UTC | push | `development/v1.3.0-general-discovery` | `26a2f0fc2be6` | failure |
| #171 | 2026-09-28 08:08:31 UTC | push | `development/v1.3.0-general-discovery` | `3cca331710f8` | failure |
| #172 | 2026-09-28 08:13:02 UTC | push | `development/v1.3.0-general-discovery` | `a500ba7ab5ef` | failure |
| #173 | 2026-09-28 08:36:12 UTC | push | `development/v1.3.0-general-discovery` | `31220b7e2be2` | success |
| #174 | 2026-09-28 08:59:44 UTC | push | `development/v1.3.0-general-discovery` | `11501db3225a` | success |
| #175 | 2026-09-28 09:10:42 UTC | push | `development/v1.3.0-general-discovery` | `78501c8b4838` | success |
| #176 | 2026-09-28 09:11:00 UTC | push | `development/v1.3.0-general-discovery` | `18e447632526` | success |
| #177 | 2026-09-28 09:13:50 UTC | push | `development/v1.3.0-general-discovery` | `bea07b55cf02` | success |
| #178 | 2026-09-28 09:46:40 UTC | push | `development/v1.3.0-general-discovery` | `94a59ed87a04` | success |
| #179 | 2026-09-28 09:47:02 UTC | push | `development/v1.3.0-general-discovery` | `851332602ce3` | success |
| #180 | 2026-09-28 09:48:06 UTC | push | `development/v1.3.0-general-discovery` | `fada2ce22ca1` | success |
| #181 | 2026-09-28 09:48:21 UTC | push | `development/v1.3.0-general-discovery` | `562336e18ba3` | success |
| #182 | 2026-09-28 09:50:34 UTC | push | `development/v1.3.0-general-discovery` | `fe2c93af63d3` | success |
| #183 | 2026-09-28 18:03:22 UTC | push | `development/v1.3.0-general-discovery` | `892875618214` | success |
| #184 | 2026-09-28 18:04:35 UTC | push | `development/v1.3.0-general-discovery` | `88e788746490` | success |
| #185 | 2026-09-28 18:05:32 UTC | push | `development/v1.3.0-general-discovery` | `eeb2d744b346` | success |
| #186 | 2026-09-28 18:06:06 UTC | push | `development/v1.3.0-general-discovery` | `900035267071` | failure |
| #187 | 2026-09-28 18:08:20 UTC | push | `development/v1.3.0-general-discovery` | `94e5629b642b` | success |
| #188 | 2026-09-28 18:18:05 UTC | push | `v1.3.0-rc.1` | `f053e2727c36` | success |
| #189 | 2026-09-28 18:40:05 UTC | push | `development/v1.3.0-general-discovery` | `3ddc9b6795b7` | success |

## Current open prerelease QA items

- **Review / Case Auditor context consistency:** resolved in commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **Native Windows icon:** resolved in commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed packaging, portable smoke, installer build and installed-app smoke.
- **Background execution:** resolved in commit `4a3701bb400a51cb907afbdc6de42de125c6418c`; Actions run #191 passed the real minimized-window runtime smoke.
- **Watch Run desktop UX:** implementation upgraded in commit `128e68e022a4a82fe4f9a2ea7384503fa93a4c04`; Actions run #192 passed.
- **Review / Case Auditor context consistency:** Smart Import now binds detected cases by stable source/root identity and carries the resolved `caseId` through the load pipeline instead of re-looking up mutable display names. Review uses a shared case-context binder and stamps all audit output with that same `caseId`. Run #193 passed.
- **Native Windows branding:** native FoamLens icon is embedded in the EXE, assigned to the window/taskbar and used by installer/shortcuts. Run #194 passed.


## Subsequent changes after the baseline history snapshot

| Date | SHA | Change | Validation |
|---|---|---|---|
| 2026-09-28 | `ac013cc25bea` | Add complete Git development audit log | Documentation baseline |
| 2026-09-28 | `43b62231af6f` | Keep scientific work running outside render frames | Run #190 success |
| 2026-09-28 | `4a3701bb400a` | Smoke-test minimized background execution | Run #191 success |
| 2026-09-28 | `128e68e022a4` | Upgrade Watch Run for desktop monitoring | Run #192 success |
| 2026-09-28 | `fafce7e97fa8` | Keep Review data bound to the selected case | Run #193 success |
| 2026-09-28 | `5e1d00de11dc` | Add native FoamLens Windows icon | Run #194 success |

### GitHub Actions after the baseline snapshot

| Run | Ref | SHA | Result |
|---:|---|---|---|
| #190 | `development/v1.3.0-general-discovery` | `43b62231af6f` | success |
| #191 | `development/v1.3.0-general-discovery` | `4a3701bb400a` | success |
| #192 | `development/v1.3.0-general-discovery` | `128e68e022a4` | success |
| #193 | `development/v1.3.0-general-discovery` | `fafce7e97fa8` | success |
| #194 | `development/v1.3.0-general-discovery` | `5e1d00de11dc` | success |

## How to update this log

When a new change is made, record the actual commit SHA and CI result after the operation completes. When a prerelease bug is found, add it as an open QA item first; move it into the milestone/commit history only after the fix is committed and validated. Releases should record the exact tag, target and generated binary assets.


## 2026-09-28 — v1.3.1 release preparation

- Desktop semantic version bumped from `1.3.0` to `1.3.1` before merging PR #1.
- Reason: the `main` workflow publishes the GitHub Release from the desktop project version; keeping `1.3.0` would overwrite/reuse the existing `v1.3.0` release instead of creating a new patch release.
- Target release after CI + merge: `v1.3.1`.


## 2026-09-28 — FoamLens Desktop v1.3.1 released

- PR #1 (`Release FoamLens Desktop v1.3.1`) was marked ready and merged into `main`.
- Merge commit: `97060108c7cbed8d06310644195a7c2ee0989562`.
- Development head merged: `d5a94b527ae6eec76a8ce1cef9ca5b61dd0a2d57`.
- Final development validation: GitHub Actions run #195 — success.
- Main/release validation: GitHub Actions run #196 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Tag `v1.3.1` points to the merge commit above.
- Published GitHub Release: `FoamLens v1.3.1`.
- Release assets:
  - `FoamLens-Portable-v1.3.1.exe`
  - `FoamLens-Portable-v1.3.1.exe.sha256`
  - `FoamLens-Setup-v1.3.1.exe`
- Release published at 2026-09-28 20:04:27 UTC.

## 2026-09-29 — v1.3.2 release correction

- GitHub already published normal release `v1.3.1` from merge commit `97060108c7cbed8d06310644195a7c2ee0989562`; Actions run #196 passed.
- Post-release inspection found that the binary still carried internal `development / release candidate` wording even though the functional prerelease QA fixes were included.
- The existing `v1.3.1` artifacts are intentionally not being silently replaced from a different commit. A clean patch release is being prepared instead.
- Branch `release/v1.3.2` was created directly from `main` commit `3735424af6f6413b72fbfe7e101a97040448fa40`.
- v1.3.2 removes development/RC wording, reports frontend `v51` and Desktop `v1.3.2`, stores new workspace payloads as `productVersion: v51`, and updates README/version regressions accordingly.
- CI on release branches is enabled through the `release/**` workflow branch pattern. Actions run #198 completed successfully: real QuickCup regression, complete scientific/UI suites, portable EXE smoke, native icon checks, minimized background execution, installer build and installed-app smoke all passed.

| #198 | 2026-09-29 | `release/v1.3.2` | `ada3a9168610` | success | v1.3.2 release correction; full Windows + QuickCup validation passed. |


## 2026-09-29 — FoamLens Desktop v1.3.2 released

- Release branch: `release/v1.3.2`.
- Release preparation commit: `ada3a9168610ddec3bf56973e4dc1aef85568db8`.
- Release validation record commit: `f5e6ab835da5f2767df657b40d1f85a816b8e27b`.
- PR #2 (`Release FoamLens Desktop v1.3.2`) merged into `main`.
- Merge commit: `368655e5b4f9aaddb4f528d530318612f7cb6b19`.
- Release-branch validation: GitHub Actions run #198 — success.
- Main/release validation: GitHub Actions run #199 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Minimized/background execution smoke: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Published GitHub Release: `FoamLens v1.3.2`.
- Release type: normal release, not prerelease.
- Release assets:
  - `FoamLens-Portable-v1.3.2.exe`
  - `FoamLens-Portable-v1.3.2.exe.sha256`
  - `FoamLens-Setup-v1.3.2.exe`
- Release published at 2026-09-29 17:28:32 UTC.
- `v1.3.1` was left intact; its assets were not silently replaced.


## 2026-09-29 — v1.4.0 Field View development started

- Development branch: `development/v1.4.0-field-view`, created directly from released `main` v1.3.2 commit `2ab17037bcc6922f25ed2f28d9e2a493a33fa327`.
- Native Desktop bridge extended with read-only, cancellable ASCII OpenFOAM `polyMesh` parsing for `points`, `faces`, `owner`, and `neighbour`.
- Frontend extension loading generalized from `v13-*.js` to `v*-*.js`; the new viewer lives in isolated module `v14-field-view.js` rather than modifying the monolithic v51 frontend.
- Added the **Field View** data tab with WebGL mesh rendering, boundary-surface scalar coloring, mesh edges, camera orbit/zoom, color maps, locked color ranges and physical-time playback.
- Added vector-field visualization with magnitude/component selection, velocity glyphs and configurable streamlines derived from the actual instantaneous cell-centred OpenFOAM vector field.
- Streamlines use local inverse-distance vector interpolation with midpoint integration; this is an explicit FoamLens approximation and is not claimed to reproduce ParaView/VTK interpolation bit-for-bit.
- Added default-region and named-region `constant/polyMesh` discovery.
- Fixed multi-region eligibility so cases such as `metal` / `mold` are visualizable when a meshed named region has compatible volume fields.
- Decomposed processor fields are not silently mapped onto a reconstructed mesh; Field View requests reconstruction when topology/count alignment cannot be established.
- Initial fallback QA exposed and fixed an over-escaped ASCII `points` parser regex (`point-count-mismatch` on a valid cube).
- Initial WebGL QA exposed and fixed a renderer-factory naming typo before release.
- Dedicated regression: `desktop/tests/field-view.test.cjs` validates a synthetic OpenFOAM cube, region discovery, multi-region availability, physical-time navigation, colormaps, streamline integration, native bridge wiring, vector/streamline product wiring and generic versioned module loading.
- Real QuickCup regression remains green, but the QuickCup fixture repository does not version `polyMesh`; therefore mesh geometry itself is currently regression-tested with the synthetic OpenFOAM fixture. QuickCup's `controlDict` uses `writeFormat ascii`, matching the supported mesh format.
- Validation progression:
  - Run #200: failed only in the new Field View cube parser.
  - Run #201: failed on the same fallback parser after the separate renderer typo was fixed.
  - Run #202: success after fixing ASCII point parsing.
  - Runs #203 and #204: success with vector glyphs and their regression coverage.
  - Run #206: **success** after the multi-region fix and dedicated multi-region test; real QuickCup regression, all legacy suites, Field View suite, portable EXE smoke, installer build and installed-app smoke all passed.
- Final validated code SHA for run #206: `919131e08b4edaa65e458bcbf955b73f06c62847`.
- Documentation-only scope record added afterward in `docs/v1.4.0-field-view-spec.md`; no release was published and `main` remains v1.3.2.


### 2026-09-29 — v1.4.0 development packaging and final Field View validation

- Branch-only Desktop version advanced to `1.4.0` so development artifacts are not mislabeled as the stable v1.3.2 release.
- v1.4 uses an isolated local app-bundle root (`FoamLens/Desktop/1.4.0/app`); the public `main` release remains v1.3.2.
- The version overlay identifies this branch as `Desktop v1.4.0 development` while the retained v51 base remains release-clean.
- Added vector glyphs derived from the actual cell-centred vector field, alongside streamlines.
- Fixed Field View availability for named multi-regions such as `metal` / `mold`.
- Fixed colormap legend synchronization so Viridis, Turbo and cool–warm legends match the colors actually rendered on the mesh.
- Run #211 validated the complete v1.4.0 development build identity, full scientific/UI suites, real QuickCup regression, portable EXE smoke, installer and installed-app smoke.
- Runs #212/#213 validated the colormap legend correction.
- **Final validation: GitHub Actions run #213 — success.**
- Final tested head: `c3cd5651e99211a4af4168fb8ecac063bcbf0f41`.
- Run #213 artifact: `FoamLens-Windows-v1.4.0` (artifact id `11058631160`).
- No GitHub Release was published and `main` was not modified.


## 2026-09-29 — FoamLens Desktop v1.4.0 released

- Development branch: `development/v1.4.0-field-view`.
- PR #3 (`Release FoamLens Desktop v1.4.0`) merged into `main`.
- Merge commit: `361821e98ee77bb7bf39ec250a50d71f97566e52`.
- Main/release validation: GitHub Actions run #214 — **success**.
- Real QuickCup regression: success.
- 3D OpenFOAM Field View regression: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Published GitHub Release: `FoamLens v1.4.0`.
- Release type: normal release, not prerelease.
- Tag: `v1.4.0`.
- Release target: `main`.
- Release published at 2026-09-29 19:59:43 UTC.
- Release assets:
  - `FoamLens-Portable-v1.4.0.exe` — 72,864,903 bytes.
  - `FoamLens-Portable-v1.4.0.exe.sha256` — 96 bytes.
  - `FoamLens-Setup-v1.4.0.exe` — 67,776,500 bytes.
- v1.4.0 introduces the OpenFOAM Field View with transient mesh coloring, physical-time playback, vector glyphs, streamlines, multi-region support, and synchronized colormap legends.


## 2026-09-29 — v1.4.1 post-release hotfix + thesis-analysis expansion

Branch: `fix/v1.4.1-field-view-discovery` (created from released `main` v1.4.0).

### Field View hotfix
- Fixed versioned frontend extension injection so v14 modules are inserted inside the main FoamLens frontend IIFE rather than an unrelated inner/later IIFE.
- Field View remains discoverable even when no compatible 3D dataset is available and reports the missing requirement instead of disappearing.
- Added Overview quick access to 3D Field View.
- Added packaged-executable smoke validation for the actual mounted Field View UI.
- Final Field View smoke path validated in the portable and installed Desktop build.

### Sidebar UX
- Added persistent collapsible/expandable sidebar sections.
- Section state is stored locally and restored across sessions.
- Case-management-heavy content is compactable so it no longer dominates the working sidebar.

### Smart Import version grouping
- Detected case/version groups are exposed in Smart Import.
- Users can select/deselect a detected version group in one action while preserving per-case selection.

### Dual-variable Time-Series Focus
- Added optional second simultaneous variable for time-series comparison.
- Supports independent left/right Y axes for quantities with different units (for example temperature and liquid fraction).
- Existing single-variable workflow remains valid.

### Formal convergence audit
- Added explicit linear-solver and PIMPLE/nonlinear coupling evidence.
- Keeps same-solve initial→final residual convergence separate from cross-outer coupling convergence.
- Adds formal coupling-ratio metrics and regression coverage.

### Automatic momentum mechanism audit
- Detects mapped Darcy, buoyancy and pressure-gradient acceleration fields generically.
- Calculates per-cell magnitude statistics and local mechanism ratios.
- Reports median/P95/fraction > 1 and excluded near-zero denominators.
- Can create physical-time evolution curves without temporal extrapolation.
- Does not convert ratios into causal/mechanism verdicts.

### postProcessing provenance correction
- Multi-column OpenFOAM reductions now preserve per-column identity instead of assigning every column the field inferred from the filename.
- `sum(energyFlux)`, `sum(heatFlux)`, `volIntegrate(h)`, etc. preserve operation + field metadata.
- Parsed function-object metadata now includes `operation`, `weightField`, `patch`, `patches` and `cellZone`.

### Automatic Energy Audit
- Added automatic detection of OpenFOAM energy-flux decomposition.
- Checks the OpenFOAM v14 identity `energyFlux = energyAdvectiveFlux + heatFlux` over common physical times.
- Reports absolute and relative closure residuals plus integrated advective/diffusive/total/residual energies.
- Detects sensible-energy inventory only when provenance supports a rho-weighted volume integral of specific energy.
- Detects integrated latent-heat power when compatible volume-reduction provenance is present.
- Does not impose an unverified conservation sign convention across boundary/sensible/latent terms.
- Can create derived closure-residual and cumulative-boundary-energy curves.

### Validation
- Run #241: success after per-column postProcessing provenance regression.
- Runs #236–#239: success for automatic momentum mechanism audit and CI wiring.
- Runs #233–#235: success for formal convergence audit and CI wiring.
- Runs #230–#232: success for dual-variable Time-Series Focus and CI wiring.
- Runs #227–#229: success for Smart Import version grouping and CI wiring.
- Runs #224–#226: success for persistent collapsible sidebar sections and CI wiring.
- **Run #244: SUCCESS** at head `64a13fff1b018b986a0e0581b59c9692644d3e1b`.
  - Real QuickCup regression: success.
  - Automatic Energy Audit regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063691879`).
- No GitHub Release was published from the hotfix branch; `main` remains the released v1.4.0 until the branch is intentionally promoted.


## 2026-09-29 — Experimental validation workflow

### Evidence boundary from the thesis project
- The QuickCup project audit explicitly states that the repository **does not currently contain a numeric experimental Quick-Cup thermocouple time series** (CSV/XLSX/raw points).
- Therefore FoamLens does not report experimental RMSE/MAE or event errors from repository data and no synthetic values are treated as thesis results.
- The validation workflow is prepared for a future raw or digitized experimental curve.

### Simulation vs experiment module
- Added `v14-experimental-validation.js`.
- Imports experimental `.csv`, `.txt`, `.dat` and `.tsv` time-temperature tables.
- Supports comma, semicolon, tab and whitespace delimiters.
- Semicolon-delimited files with decimal commas are parsed without confusing decimal commas for separators.
- Time and temperature columns are auto-detected but remain explicitly selectable.
- Experimental temperature units can be declared as K or °C.
- Experimental time alignment uses an explicit user-defined time shift; no hidden automatic shift is applied.
- Comparison is restricted to the shared physical-time interval and never extrapolates.
- Reports:
  - RMSE of T(t);
  - MAE of T(t);
  - mean bias (simulation − experiment);
  - maximum absolute temperature difference;
  - Tmin and its time;
  - thermal-rebound candidate amplitude, peak time and maximum positive dT/dt.
- An optional liquid-fraction series provides independent phase evidence:
  - alphaL onset/completion threshold-crossing times;
  - phase-defined solidification duration;
  - liquid-fraction trend during the simulated thermal-rebound candidate.
- A positive dT/dt interval is **not** automatically labelled recalescence. Phase evidence is displayed separately as solidifying, remelting, approximately stationary or unavailable.
- Can add the aligned experimental temperature curve and ΔT(sim−exp) residual to the standard Time-Series plot.

### Regression and packaging
- Run #247 exposed an actual delimiter-detection bug: decimal commas in semicolon CSV files biased the first implementation toward comma separation.
- Fixed delimiter detection to prefer a consistent tabular column count across sampled rows.
- **Run #248: SUCCESS** at code head `5854f4dcc5cbcd3b32e600ef772aa3c773bc2dd2`.
  - Simulation-vs-experiment regression: success.
  - Real QuickCup regression: success.
  - All previous Field View/sidebar/import/convergence/momentum/energy regressions: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063823771`).
- No GitHub Release was published; this remains on the v1.4.1 hotfix/development branch.


## 2026-09-29 — Field View interior slice reconstruction

### Mesh topology
- Extended the native OpenFOAM ASCII `polyMesh` result with full volumetric connectivity:
  - flattened face-point indices;
  - face offsets;
  - owner labels;
  - neighbour labels.
- The browser fallback parser exposes the same connectivity, so native and web paths share the same slice algorithm.

### Interior Slice
- Added a real interior slice reconstruction to Field View rather than a near-plane cell-centre point filter.
- Reconstructs point values from adjacent cell-centred values using inverse-distance weighting.
- Decomposes each polyhedral cell into tetrahedra formed by the reconstructed cell centre and triangulated cell faces.
- Intersects those tetrahedra with an arbitrary X/Y/Z plane and interpolates the selected scalar/vector-component values at the intersection vertices.
- Controls added:
  - Show slice;
  - plane normal X/Y/Z;
  - normalized plane position;
  - slice opacity.
- Slice updates with the physical-time playback, selected field/component and current colormap/range.
- When a slice is active the boundary surface is rendered as translucent contextual geometry without depth-writing over the interior cut.
- The UI explicitly states that the cell-to-point reconstruction/tetrahedralization is not claimed to be bit-identical to ParaView/VTK.

### Validation
- Synthetic unit-cube regression checks a plane at `x=0.37`:
  - every slice vertex lies on the requested plane;
  - a uniform cell value remains uniform on the slice;
  - reconstructed cross-sectional area is 1.0.
- Native parser regression verifies full face/owner/neighbour connectivity is exported.
- Field View regression verifies slice controls and WebGL buffers remain wired.
- **Run #253: SUCCESS** at code head `ef6506953af2bd9484542ffa99e71ec87bcdb5a4`.
  - Field View/slice regression: success.
  - Real QuickCup regression: success (QuickCup repository still does not track a polyMesh fixture, so the actual thesis mesh is not represented by this fixture).
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11063484823`).
- No GitHub Release was published from this branch.


## 2026-09-29 — Field View iso-surface / contour reconstruction

### Iso-surface
- Added a reconstructed 3D iso-surface / contour layer to Field View for the currently selected scalar or vector component.
- Uses the same volumetric reconstruction basis as interior slices:
  - cell-centred values;
  - inverse-distance cell-to-point reconstruction;
  - polyhedral cell tetrahedralization.
- Extracts the constant-value surface with marching tetrahedra.
- Removes duplicate reconstructed triangles by tolerance-based geometric keys and rejects degenerate triangles.
- User controls:
  - Show iso-surface;
  - explicit iso value (default `0.5`);
  - opacity;
  - use-current-midrange helper.
- For liquid fraction, `alphaL = 0.5` can be viewed directly as a mid-front contour; temperature can use an explicitly selected isotherm.
- Iso-surfaces update with:
  - physical-time playback;
  - selected field/component;
  - color map;
  - locked/unlocked display range.
- When an interior slice or iso-surface is active, the external boundary surface is rendered as translucent context rather than depth-occluding the interior geometry.
- FoamLens explicitly describes the reconstruction as marching tetrahedra on reconstructed cell-centred data and does not claim bit-identical ParaView/VTK output.

### Regression
- Dedicated test: `desktop/tests/isosurface.test.cjs`.
- Analytic tetrahedron regression verifies a linear scalar field produces the expected `phi = 0.5` plane and triangle area.
- Four-edge tetrahedron intersections are triangulated into finite non-degenerate triangles.
- Out-of-range iso values produce no geometry.
- Product wiring regression verifies controls, WebGL iso buffers and physical-time update hooks.

### Validation
- **GitHub Actions run #260: SUCCESS**.
- Validated head: `1b0acb91076a55bd7bca9dde2b450c83c5c51619`.
- Real QuickCup regression: success.
- Field View + iso-surface regression: success.
- All previous sidebar/import/dual-series/convergence/momentum/energy/experimental-validation suites: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11068679330`).
- No GitHub Release was published from the hotfix branch.


## 2026-09-29 — 3D Field View probe / picking

### Probe interaction
- Added a dedicated 3D probe mode to Field View.
- Clicking rendered geometry performs a true 3D ray cast against the triangles currently represented by FoamLens rather than selecting the nearest screen pixel.
- Supported pick targets:
  - boundary surface;
  - interior slice;
  - iso-surface.
- Boundary-surface picks resolve the exact owner cell and report that cell-centred field value.
- Slice picks use barycentric interpolation of the reconstructed slice vertex values.
- Iso-surface picks report the selected constant iso value.
- For reconstructed interior geometry, FoamLens also reports the nearest cell explicitly as an approximation; it is labelled as nearest rather than presented as an exact containing-cell lookup.
- Probe readout reports:
  - source geometry;
  - selected field;
  - value and inferred unit;
  - physical time;
  - X/Y/Z;
  - cell / nearest-cell identity when available.
- A 3-axis marker is rendered at the picked 3D location.
- Pointer-drag motion is separated from clicking so orbiting the camera does not accidentally create a probe.
- Probe state is cleared whenever the displayed physical-time frame/field changes so FoamLens never leaves a stale value from a previous timestep on screen.

### Numerical implementation
- Canvas coordinates are unprojected through the inverse current model-view-projection matrix.
- Ray / triangle intersection uses Möller–Trumbore geometry.
- Slice scalar values are interpolated with barycentric coordinates.
- When several triangles lie along the ray, the nearest positive intersection is selected.

### Regression
- Dedicated test: `desktop/tests/field-probe.test.cjs`.
- Validates:
  - 4×4 matrix inversion on identity;
  - a known ray/triangle intersection;
  - barycentric interpolation;
  - nearest-hit selection;
  - iso constant-value picking;
  - rejection of parallel/outside rays;
  - UI controls and WebGL marker-buffer wiring;
  - fixture-name neutrality.

### Validation
- **GitHub Actions run #264: SUCCESS**.
- Validated head: `4d481d8a4c33a4783e2b677d4937ced121990472`.
- Real QuickCup regression: success.
- 3D Field View, slice, iso-surface and probe regressions: success.
- All previous scientific/UI regressions: success.
- Portable EXE smoke: success.
- Installer build: success.
- Installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11069760533`).
- No GitHub Release was published from the hotfix branch.


## 2026-09-30 — Field View iso-surfaces / contours

### 3D iso-surface reconstruction
- Added reconstructed constant-value surfaces to Field View through `v14-isosurface.js`.
- Uses marching tetrahedra over the same volumetric reconstruction used by Interior Slice:
  - cell-centred field values;
  - adjacent-cell inverse-distance point reconstruction;
  - cell-centre tetrahedralization;
  - edge interpolation at the requested iso value.
- Does not approximate an iso-surface by merely selecting nearby cell centres.
- Controls added:
  - Show iso-surface;
  - numeric iso value;
  - opacity;
  - Use current midrange.
- Typical thesis use:
  - liquid fraction `alphaL = 0.5` to inspect a mid solidification front;
  - an explicitly selected temperature to inspect an isotherm.
- Iso-surfaces update during physical-time playback and use the current field, component, colormap and locked/display range.
- Surface geometry becomes translucent when an interior slice or iso-surface is active so the interior visualization remains visible.
- Implementation remains explicit that reconstruction is not claimed to be bit-identical to ParaView/VTK.

### Regression
- Added a marching-tetrahedra linear-field regression:
  - tetrahedron vertices with scalar values `[0,1,1,1]`;
  - requested iso `0.5`;
  - reconstructed triangle lies exactly on `x+y+z=0.5`;
  - expected triangle area is `sqrt(3)/8`.
- Run #266 exposed a test-harness error only (`near` helper missing); the geometry implementation itself was not the failing assertion.
- Fixed the regression helper without changing the iso algorithm.
- **Run #267: SUCCESS** at head `3efeeb81617b42ba7bf7e8a47f4b9c0f3ead1f6c`.
  - Real QuickCup regression: success.
  - Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the development/hotfix branch.


## 2026-09-30 — Strict 3D difference field comparison

### Difference view
- Extended synchronized side-by-side 3D case comparison with an optional third viewport for a signed difference field.
- Difference definition is explicit: `Δ = Primary − Comparison`.
- Difference visualization uses a symmetric cool–warm range around zero.
- The same resolved physical-time synchronization used by side-by-side comparison is preserved.
- FoamLens refuses to calculate a 3D difference unless meshes are topologically and geometrically equivalent.
- Compatibility checks include:
  - point count;
  - face count;
  - cell count;
  - internal/boundary face count;
  - point coordinates within a geometry-scaled tolerance;
  - face offsets;
  - face-point connectivity;
  - owner labels;
  - neighbour labels.
- FoamLens does not subtract unrelated meshes merely because they happen to have the same number of cells.
- If compatibility fails, the UI reports the mismatch reason rather than displaying a false difference.

### Regression
- Added `desktop/tests/field-compare.test.cjs`.
- Regression checks:
  - identical meshes accepted;
  - moved geometry rejected;
  - changed connectivity rejected;
  - signed difference follows Primary − Comparison;
  - absolute-difference helper remains numerically correct;
  - color range remains symmetric around zero;
  - third viewport and compatibility wiring remain present.
- Added dedicated CI step: `Test strict 3D difference field comparison`.
- **Run #270: SUCCESS** at head `efd8ca7669d819f689f0ca96b00950911a94ce61`.
  - Real QuickCup regression: success.
  - 3D Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Strict 3D difference regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Volume-weighted polyhedral cell centroids

### Geometry precision
- Replaced the previous mean-of-face-centres cell location approximation in both the native Desktop polyMesh parser and the JavaScript fallback.
- Cell centres are now calculated as volume-weighted polyhedral centroids using signed tetrahedral integration.
- OpenFOAM face orientation is respected:
  - stored internal-face orientation is outward for the owner cell and reversed for the neighbour cell;
  - boundary faces retain their stored outward orientation.
- A local mean-face-centre reference is used only for numerical stability; it does not define the final centroid.
- Degenerate cells fall back explicitly to the previous mean-face-centre reference rather than returning invalid coordinates.
- `CellCenterMethod` now reports:
  - `volume-weighted-polyhedral`; or
  - `volume-weighted-polyhedral-with-mean-face-fallback:N` when a fallback was required.
- This improves the geometric basis used by vector glyph placement, streamline interpolation, interior slices, iso-surfaces and 3D picking.

### Regression
- Added an asymmetric square-pyramid regression whose exact centroid is `(0, 0, 0.75)`.
- The former mean-face-centres method would place the same cell at `z = 0.8`, so the test distinguishes the new method from the old approximation.
- Unit-cube mesh parsing and all existing Field View regressions remain green.
- **Run #273: SUCCESS** at head `ba28cdb7af0669dcfe97bda5ef03683676b1ab78`.
  - Real QuickCup regression: success.
  - 3D Field View regression: success.
  - Iso-surface regression: success.
  - 3D probe-picking regression: success.
  - Strict 3D difference regression: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Native binary OpenFOAM polyMesh support

### Binary mesh parser
- Extended the Desktop-native `parseOpenFOAMMesh` path from ASCII-only text reads to byte-oriented mesh parsing.
- ASCII and binary now converge into one common topology/geometry builder so validation, volume-weighted centroids, boundary triangulation and edge extraction cannot diverge by file format.
- Supported native binary layouts:
  - contiguous point/vector lists;
  - contiguous `owner` / `neighbour` label lists;
  - OpenFOAM `faceCompactList` binary faces represented by offsets + flattened labels.
- Reads optional OpenFOAM `arch` metadata for:
  - LSB / MSB endianness;
  - 32/64-bit labels;
  - 32/64-bit scalars.
- A 64-bit label that cannot fit FoamLens' current in-memory integer indexing is rejected explicitly instead of truncating.
- For binary headers without `arch`, FoamLens uses the common LSB / label32 / scalar64 ABI and reports the format as `binary-lsb-label32-scalar64-assumed` rather than hiding the assumption.
- Unsupported/unknown binary face layouts are rejected with an explicit reason.
- Browser/JavaScript fallback intentionally remains ASCII-only; binary support is a Desktop-native capability.

### Native smoke regression
- Added an in-process binary polyMesh self-test executed on every Desktop smoke run.
- The fixture is a real byte-level one-cell cube using:
  - `format binary`;
  - `arch "LSB;label=32;scalar=64"`;
  - `vectorField` points;
  - `faceCompactList` faces;
  - binary `labelList` owner/neighbour.
- The production parser must recover 8 points, 6 faces, 1 cell and centroid `(0.5, 0.5, 0.5)`.
- Because the self-test runs inside `--smoke-test`, it validates both the portable EXE and the installed EXE.
- **Run #277: SUCCESS** at head `83e1146baba23eb3bdf4a29d0f57e9a9d58c435b`.
  - Real QuickCup regression: success.
  - Full Field View suite: success.
  - Native binary mesh self-test in portable EXE: success.
  - Portable EXE smoke: success.
  - Installer build: success.
  - Native binary mesh self-test in installed EXE: success.
  - Installed-app smoke: success.
  - Windows artifact upload: success.
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Time-varying / dynamic OpenFOAM mesh playback

### Dynamic mesh discovery
- Extended Field View mesh discovery beyond `constant/[region/]polyMesh` to recognize `<time>/[region/]polyMesh` snapshots.
- Supports the common moving-mesh case where a timestep writes only `points` while `faces`, `owner` and `neighbour` remain inherited from the previous valid topology.
- Supports topology-changing snapshots when a later physical time writes replacement topology components.
- Mesh state resolution is causal in physical time: FoamLens selects the most recent valid mesh state with `t_mesh <= t_field`; it never borrows a future mesh state.
- If no complete `constant/polyMesh` exists, FoamLens requires a complete same-time dynamic snapshot before inheritance begins. Partial files from unrelated earlier times are not combined to fabricate a mesh basis.
- Legacy v1.4.0 static mesh inventories remain compatible and are interpreted as static constant meshes.

### Playback and geometry synchronization
- Field playback now resolves mesh geometry before loading each transient field frame.
- When the resolved mesh snapshot changes, FoamLens rebuilds:
  - boundary surface geometry;
  - mesh edges;
  - volume-weighted cell centroids;
  - spatial hash used by vector interpolation;
  - slice / iso-surface geometry state;
  - 3D probe state;
  - streamline/vector geometry on the refreshed mesh.
- User camera orientation/zoom is preserved across dynamic-mesh playback rather than reset on every geometry change.
- The time readout/status explicitly reports the active mesh state (`constant` or mesh physical time).
- Native ASCII/binary polyMesh parsing is reused for dynamic snapshots; browser fallback remains ASCII-only as documented.

### Regression
- Added `desktop/tests/dynamic-mesh.test.cjs`.
- Coverage verifies:
  - constant and time-directory polyMesh discovery;
  - points-only moving meshes inheriting constant topology;
  - topology replacement at the correct physical time;
  - strict rejection of future mesh geometry;
  - complete-basis requirement when constant mesh is absent;
  - 3D readiness only when at least one field time has a valid mesh state;
  - playback wiring preserves camera while geometry changes.
- Run #284 exposed a backward-compatibility regression in the existing synthetic/static mesh inventory test.
- Fixed legacy `complete:true` inventories to resolve as static constant meshes.

### Validation
- **GitHub Actions run #285: SUCCESS** at head `64257bb97da6faef29345ac6da548b5899d1725b`.
- Real QuickCup regression: success.
- Existing Field View regression: success.
- Dynamic mesh regression: success.
- Iso-surface / 3D probe / strict 3D difference regressions: success.
- Sidebar/import/dual-series/convergence/momentum/energy/experimental-validation regressions: success.
- Portable EXE build and smoke: success.
- Installer build and installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11075183630`).
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — v1.4.1 candidate final reconciliation

### Requested UX/features closed
- Smart Import groups detected cases by version and supports group select/deselect while preserving per-case control.
- Large case-management block is moved to the end of the sidebar at runtime and is collapsed by default.
- Sidebar sections are individually collapsible/expandable with persistent state.
- Time-Series Focus supports an optional second simultaneous variable with independent left/right Y axes.
- Field View is always discoverable, has an Overview quick action and reports missing 3D prerequisites instead of disappearing.

### Thesis/scientific-analysis gaps closed
- Formal linear-solver vs PIMPLE/nonlinear convergence audit.
- Automatic momentum-mechanism audit.
- Automatic OpenFOAM energy audit with provenance and closure checks.
- Simulation-vs-experiment validation with RMSE/MAE/bias and independent phase evidence.
- Dual temperature/liquid-fraction plotting for coupled solidification inspection.
- 3D slices, iso-surfaces, probe picking, synchronized case comparison and strict signed difference fields.
- Volume-weighted polyhedral cell centroids.
- Native ASCII/binary polyMesh support.
- Time-varying/dynamic mesh playback synchronized causally in physical time.

### Remaining explicit non-blocking boundaries
- 3D Field View renders cell-, internal-face-, and point-associated scalar/vector fields with explicit association semantics. `surface*Field` boundary-patch values remain unrendered until explicit `polyMesh/boundary` patch topology and per-patch values are preserved; FoamLens does not fabricate them.
- Browser fallback remains ASCII-only for polyMesh; native Desktop supports binary.
- FoamLens streamline and reconstructed slice/iso algorithms are documented approximations and are not claimed bit-identical to ParaView/VTK.
- The QuickCup repository does not version its actual polyMesh, so real thesis-mesh rendering cannot be CI-regressed from that repository; real QuickCup fields/postProcessing are still regression-tested.

### Documentation reconciliation
- Updated Field View specification from the obsolete first-v1.4 slice to the actual v1.4.1 candidate capability set.
- Desktop README now distinguishes the public v1.4.0 release from the v1.4.1 candidate.
- Root README corrected from stale Desktop v1.3.2 to public v1.4.0 and documents the validated v1.4.1 candidate features.

### Final candidate validation
- **GitHub Actions run #288: SUCCESS** at tested code head `7e478c3df54d1f97bbf41846374d6c94adccffcb`.
- Real QuickCup regression: success.
- All scientific/UI regressions: success.
- Dynamic mesh regression: success.
- Field View / slice / iso / probe / strict 3D difference regressions: success.
- Version/release-label consistency regression: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11075137890`).
- Root README was updated afterward as documentation only; no product code changed after the tested head.
- v1.4.1 has **not** been published as a GitHub Release yet.


## 2026-09-30 — Field View point / internal-face field associations

### Association-aware 3D rendering
- Extended Field View beyond cell-centred `vol*Field` data without converting other associations into fake cell values.
- The field selector now exposes the association explicitly:
  - **Cell** for `vol*Field`;
  - **Face (internalField)** for `surface*Field`;
  - **Point** for `point*Field`.
- `point*Field` values are rendered directly on the actual mesh vertices used by each boundary triangle.
- `surface*Field internalField` values are rendered on the actual internal mesh faces. Internal polygonal faces are triangulated for WebGL while retaining the exact source face identity.
- At run #297, the external boundary still remained neutral/translucent because explicit `boundaryField` patch values were not yet mapped. This limitation was subsequently closed and validated in run #310 (see the later surfaceField boundary-patch section); FoamLens never substituted owner-cell values or fabricated boundary-face data.
- Association-specific size checks are enforced against:
  - cell count for volume fields;
  - internal-face count for surface fields;
  - point count for point fields.
- A mismatch produces an explicit field/mesh association-count error.

### Interior analysis and vectors
- Interior Slice and Iso-surface remain explicitly cell-centred-volume operations.
- Selecting a Face or Point field disables/clears those controls rather than silently coercing the data to cells.
- Iso-surface code contains its own independent volume-association guard so programmatic calls cannot bypass the UI restriction.
- Vector glyphs and streamlines remain based on a `volVectorField`; Face/Point vector fields are available for direct coloring/components but are not silently used as cell-centred streamline input.

### Association-aware 3D Probe
- Volume-field boundary picks retain exact owner-cell semantics.
- Point-field boundary picks interpolate the actual point values barycentrically on the hit triangle.
- Surface-field picks ray-cast against the rendered internal-face triangles and return the exact internal face id/value.
- Probe readout reports the field association and the appropriate element identity instead of always presenting every hit as a cell.

### Regression and validation
- Extended the existing Field View and 3D Probe regression suites rather than creating redundant parallel test harnesses.
- Added checks for:
  - direct point-vertex coloring;
  - internal-face triangulation and preserved face identity;
  - Cell / Face / Point selector wiring;
  - association-specific element counts;
  - exact internal-face probe ids;
  - explicit prevention of Face/Point → Cell coercion.
- Run #294 exposed only an overly strict test tolerance on `Float32Array` values (`0.10000000149` vs `0.1`); production rendering was not the failing logic.
- Run #296 exposed only a stale test token from an intermediate helper signature; the final architecture intentionally preserves `fvFieldGroups(..., storage='volume')` as the default contract and requests `'any'` only where the main Field View selector needs all associations.
- **GitHub Actions run #297: SUCCESS** at head `3eb42874d6d3e45c8101024c038e69db0f0bf617`.
  - Real QuickCup regression: success.
  - Field View association regression: success.
  - Dynamic mesh regression: success.
  - Iso-surface regression: success.
  - Association-aware 3D Probe regression: success.
  - Strict 3D difference regression: success.
  - All existing scientific/UI suites: success.
  - Portable EXE build + smoke: success.
  - Installer build + installed-app smoke: success.
  - Windows artifact upload: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077332065`, 135,204,904 bytes).
- No GitHub Release was published from the hotfix/development branch.


## 2026-09-30 — Explicit surfaceField boundary-patch rendering

### Boundary topology and values
- Added native and fallback parsing of `polyMesh/boundary` patch topology.
- Mesh results now preserve patch name/type plus exact `startFace` / `nFaces` ranges and boundary-triangle face identities.
- Native ASCII OpenFOAM field parsing now preserves explicit `boundaryField` patch values after parsing `internalField`.
- Supported explicit patch payloads:
  - uniform scalar/vector values;
  - nonuniform scalar/vector lists with strict count validation.
- Patches without an explicit numeric `value` remain unavailable; FoamLens does not substitute owner-cell values or invent patch data.

### Field View
- `surface*Field` now renders:
  - real `internalField` values on internal faces; and
  - explicit patch values on the exact boundary faces defined by `polyMesh/boundary`.
- Missing/symbolic patch values remain neutral context.
- Display range includes explicit boundary values when present.
- Field association readout reports boundary coverage as explicit faces / total boundary faces.
- 3D Probe can resolve an explicitly rendered boundary face and preserve its global face identity / patch association.
- Native Desktop payloads are preferred; ASCII text parsing remains available as fallback.

### Validation
- Dedicated regression: `desktop/tests/surface-boundary.test.cjs`.
- Tests cover exact patch ranges, uniform/nonuniform scalar/vector values, magnitude/components, strict list-count rejection, symbolic/missing values, native payload preservation, fallback parsing and probe/render wiring.
- **GitHub Actions run #310: SUCCESS** at head `ecb5f124ad42071752b1e0bf767193cb89297248`.
- Real QuickCup regression: success.
- All Field View / dynamic mesh / slice / iso / probe / difference / association regressions: success.
- All scientific/UI regressions: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077418978`, 135,226,247 bytes).
- No GitHub Release was published from the candidate branch.


## 2026-09-30 — pointField interior Slice / Iso reconstruction

### Association semantics
- Interior Slice and Iso-surface now support both:
  - cell-centred `vol*Field` data; and
  - point-associated `point*Field` data.
- Point-associated reconstruction preserves the actual OpenFOAM point values at mesh vertices.
- Each cell receives only an auxiliary centre value needed for the existing cell-centre tetrahedralization:
  - primary method: 3D affine least-squares reconstruction from the cell's real point values;
  - fallback: inverse-distance weighting only when the local point geometry is rank-deficient / cannot support the affine solve.
- Face-associated `surface*Field` data remains excluded from Interior Slice / Iso; FoamLens does not silently reconstruct face data into a volumetric field.

### Analytic regression
- Added `desktop/tests/point-interior.test.cjs`.
- Synthetic tetrahedron with exact linear point field `phi = x` verifies:
  - reconstructed cell-centre value = 0.25;
  - Slice at `x = 0.5` lies exactly on that plane and interpolates `phi = 0.5`;
  - Slice cross-sectional area = 0.125;
  - Iso-surface `phi = 0.5` reconstructs the same cross-section with area = 0.125.
- Updated the older Field View association contract so Point is explicitly supported for interior reconstruction while Face remains distinct.

### Validation
- **GitHub Actions run #315: SUCCESS** at head `8326ccf3c45d4c0762e6ff9eaaec5b62e7ce9302`.
- Point-interior regression: success.
- Field View / dynamic mesh / slice / iso / probe / explicit boundary / strict 3D difference regressions: success.
- Real QuickCup regression: success.
- All scientific/UI regressions: success.
- Portable EXE build + smoke: success.
- Installer build + installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (artifact id `11077801222`, 135,228,265 bytes).
- No GitHub Release was published from the candidate branch.


## 2026-09-30 — Decomposed surfaceField rendering

- Extended decomposed Field View to surface*Field internal faces and explicit physical boundary patches.
- Internal values are aligned by explicit processor internal-face ranges; missing/extra partitions and count mismatches remain rejected.
- Processor-local physical boundary faces are translated to exact global composite face ids.
- Artificial processor interface patches remain topology-only and are excluded from physical rendering/coverage.
- Run #330 reached the new product checks but failed on a test-only source-file assertion.
- The assertion was corrected without changing product logic.
- **Run #331: SUCCESS** at head `0c86da6b5a7ef0ff125c0d14bcd13aabf720fb09`.
- Real QuickCup regression, decomposed Field View, surface-boundary, dynamic mesh, Slice, Iso, 3D Probe, strict 3D difference, all scientific/UI suites, portable smoke, installer and installed-app smoke: success.
- Artifact: `FoamLens-Windows-v1.4.1` (id `11079714552`, 135239220 bytes).
- No GitHub Release was published from this branch.


## 2026-09-30 — v1.4.1 candidate freeze after decomposed Field View completion

### Requested workflow/UX closure
- Smart Import groups detected cases by version and supports group select/deselect while preserving individual case selection.
- The large case-management card is moved to the end of the sidebar at runtime and defaults collapsed.
- Sidebar cards are individually collapsible/expandable with persistent state.
- Time-Series Focus supports two simultaneous variables with independent left/right Y axes.
- Field View remains discoverable even when 3D prerequisites are missing and is directly accessible from Overview.

### Thesis/post-processing closure
- Formal linear-solver vs PIMPLE/nonlinear convergence audit.
- Automatic momentum-mechanism audit.
- Automatic OpenFOAM energy audit with source provenance and closure checks.
- Simulation-vs-experiment validation with RMSE/MAE/bias and separate phase evidence.
- Association-aware Cell / Face / Point Field View.
- Interior Slice and Iso reconstruction for volume and point fields.
- Vector glyphs, streamlines, 3D probe/picking, synchronized comparison and strict signed difference fields.
- ASCII + native binary polyMesh.
- Dynamic/time-varying mesh playback.
- Processor-decomposed volume, point and surface fields with explicit matching processor mesh states.
- Physical surfaceField boundary patches are mapped to composite global faces; artificial processor-interface patches are excluded from physical rendering and coverage.

### Final product-code validation
- Latest product-code validation: **GitHub Actions run #331 — SUCCESS**.
- Tested product-code head: `0c86da6b5a7ef0ff125c0d14bcd13aabf720fb09`.
- Run #331 artifact: `FoamLens-Windows-v1.4.1`.
- Artifact id: `11079714552`.
- Artifact size: 135,239,220 bytes.
- Real QuickCup regression: success.
- Decomposed Field View + surface-boundary regression: success.
- Dynamic mesh / Slice / Iso / 3D Probe / strict 3D difference regressions: success.
- All scientific/UI regressions: success.
- Portable EXE smoke: success.
- Installer build + installed-app smoke: success.

### Candidate state
- Commits after the tested product-code head through the current documentation reconciliation are documentation-only.
- No v1.4.1 GitHub Release has been published from this candidate branch.
- Remaining boundaries are explicit/non-blocking rather than missing requested features:
  - browser fallback polyMesh remains ASCII-only while Desktop native supports binary;
  - streamlines and reconstructed Slice/Iso algorithms are documented FoamLens approximations and are not claimed bit-identical to ParaView/VTK;
  - face-associated surfaceField data is not silently converted into a volumetric field for Slice/Iso;
  - the QuickCup repository still does not version its actual thesis polyMesh, so the exact thesis mesh cannot be CI-regressed from that repository.


## 2026-09-30 — Real B13 Solver Logs ingestion defect isolated and fixed

### Real-case evidence
- Full reference case branch: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- B13 contains 89 log-like files, including `log.foamMultiRun` and native `foamLog` members such as `logs/p_rgh_0`, `logs/h_0`, and `logs/CourantMax_0`.
- Real `foamLog` time tokens are written with a unit suffix, for example `0.001s` and `0.002s`.

### Root cause
- The JavaScript parser already accepted a leading numeric prefix from tokens such as `0.001s`.
- The Windows native batch parser used `double.TryParse(...)` on the complete token, so `0.001s` was rejected.
- Native parsing therefore returned empty time/value arrays; `solverLogSeriesFromParsed` correctly refused to create zero-length series, leaving the Solver Logs UI at 0 despite the files being present.

### Structural fix
- Branch: `fix/v1.4.2-real-case-ingestion`.
- Commit: `46de7e60b27c410e6c49b9f411fdce5e95b1d049`.
- Native `ParseFoamLogAsync` now uses the same leading-number grammar as the browser parser.
- Added a native executable smoke regression that parses a temporary real-format sample:
  - `0.001s\t0.0062232`
  - `0.002s\t0.0207126`
- The regression validates both parsed time and value arrays and fails the Windows smoke test if suffix handling regresses.

### Validation
- GitHub Actions run #333: **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- GitHub Release publication: **SKIPPED** on the fix branch; no release was duplicated.


## 2026-09-30 — Complete B13 real-case ingestion and UX closure

### Real B13 3D Field View
- Full fixture: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- B13 exposes a default/root `constant/polyMesh` plus complete named-region meshes for `metal` and `mold`.
- Its transient scalar/vector fields are associated with named regions, especially `metal` and `mold`.
- Root cause of `3D data unavailable`: Field View previously populated the region selector from every complete mesh and selected the first one. The empty/default mesh region sorted before `metal`/`mold`, so Field View selected a mesh-only region even though the case was globally 3D-capable.
- Structural fix: `fvReadyRegions(caseObj)` is now the shared source of truth for 3D-ready regions. Region selection prefers regions with a complete mesh and compatible scalar/vector field association at a valid mesh time.
- B13 therefore exposes `metal` and `mold` as ready regions instead of opening on the mesh-only default region.
- Product commit: `7062d783a1908bf6c5d274df7d1a1ebc93a033c7`.
- Regression commit: `d815ca59288522e7b3e283103f8908fc6fb082ad`.

### Complete B13 regression fixture
- CI QuickCup fixture checkout now uses branch `foamlens-real-fixture-b13` instead of the older repository `main` fixture state.
- The real integration test explicitly validates complete `metal`/`mold` meshes, `metal/T`, `metal/U`, `mold/T`, and Field View readiness.
- CI fixture commit: `68714a15646346592288507ec122b75d194fa0fe`.
- Real B13 regression passed in runs #335 and #343.

### Time-Series Focus variable-selection regression
- Root cause: the dual-variable extension inserted an empty `All variables` option into Variable 1 and reused the original autoinit/empty-state semantics. Refresh/reset/show-all actions could therefore leave the primary selector empty and disable Variable 2.
- Structural fix:
  - Variable 1 now contains only real detected variables.
  - `tsdPrimaryChoice` preserves an available selection or selects the first real variable.
  - Variable 2 remains optional and excludes the selected primary variable.
  - `Show all variables` is now an explicit button mode rather than an empty primary selection.
  - The button visibly reports the show-all state, and selecting a real primary/secondary variable exits that mode.
- Product commits:
  - `c506df4d45dc25f3f5425f5fd4c3ddf7b004f5f3`
  - `a5e6e3c13146a2aebb6182d65d84ba3dea81f862`
- Regression commits:
  - `b8a66722858f3ff90e8cbeea45e424fe61262a74`
  - `a404e45f4cc427ea7c125cab20dedad16a8082e7`

### Global sidebar toggle / scrollbar collision
- Root cause: the expanded-state toggle was centered directly on the sidebar boundary with `left: calc(var(--sidebar-w) - 17px)`, overlapping the scroll/resize rail.
- Structural fix:
  - Expanded toggle moved into the sidebar header area with a fixed gap from the right boundary.
  - Brand area reserves space for the control.
  - Collapsed-state fixed reopen control remains reachable at the left edge.
- Product commit: `13b02bb1ad7d467bece21e4b8b1204af13a7a8d0`.
- Regression commit: `d4595d92da7f835e9e1369eef95faa06ead21d31`.

### Final validation
- GitHub Actions run #343: **SUCCESS**.
- Complete B13 real OpenFOAM integration regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- Collapsible/global sidebar regression: **SUCCESS**.
- Dual-variable Time-Series Focus regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**. No release was created or replaced.


## 2026-09-30 — FoamLens Desktop v1.4.2 development build validated

### Version identity
- Current published Desktop release remains **v1.4.1**.
- Fix branch build identity advanced to **v1.4.2** without creating a release.
- Desktop project, assembly/file versions, isolated runtime bundle path, Field View visible build identity, root README, Desktop README and version-consistency regression were aligned.
- Version bump commit: `d10fa4485c1215d266c88e4f3c54e5209896fb73`.
- Desktop README alignment: `2043bf78164db3fe60d00d932b0629b4253bd3f1`.
- Version-test alignment: `3be75c9dc02760e1de77c9706491502425011626`.

### Final validation
- GitHub Actions run #346: **SUCCESS**.
- Complete B13 real OpenFOAM integration regression: **SUCCESS**.
- Native Solver Logs suffix parsing regression: **SUCCESS**.
- 3D Field View + ready-region selection regression: **SUCCESS**.
- Dual-variable Time-Series Focus regression: **SUCCESS**.
- Sidebar/scrollbar regression: **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.2`.
- Artifact id: `11084015589`.
- GitHub Release publication: **SKIPPED**. No v1.4.2 release or tag was created.


## 2026-09-30 — Global actionable diagnostics + full test-suite audit (v1.4.2 development)

### User-facing diagnostic contract
- FoamLens now treats error/incompatibility reporting as an application-wide contract rather than a per-panel convenience.
- Interactive failures are routed through the shared `flIssueDescriptor / flSetIssue / flClearIssue` system where applicable.
- Actionable diagnostics expose:
  - **Problem** — what operation/input is invalid or unavailable.
  - **Cause** — the detected technical reason/evidence.
  - **Try / Qué cambiar** — the next concrete corrective action.
  - Context when known: analysis/view, field, region, physical time, component, source path and expected input.
- `flSetIssue` also exposes structured metadata on the rendered status element:
  - `data-issue-code`
  - `data-issue-problem`
  - `data-issue-cause`
  - `data-issue-action`
  - corrective action in the element title.
- The diagnostic regression now executes `flSetIssue` / `flClearIssue` against a DOM-like element instead of only checking source strings.

### Analysis/capability visibility
- Flow Analysis, Thermal Analysis, Solidification / Remelting and Physical Analysis no longer disappear merely because their required source data are missing.
- They remain visible and report `analysis-source-missing` with the required input.
- Existing global capability tools (Temporal Alignment, Numerical Performance, Generic Vector Fields) remain visible and diagnostic when unavailable.
- This prevents “missing capability” from being mistaken for “feature does not exist”.

### Silent user actions removed
Previously silent/no-op paths were replaced with actionable diagnostics for:
- Difference Plot selection / missing comparable pair / missing temporal or spatial overlap.
- Smart Import with no selected cases.
- Watch Run read/monitor failures.
- Solver-log playback with insufficient times or sub-iterations.
- Phase Front calculation/export without compatible profiles/results.
- PNG, SVG and CSV export with no visible compatible data.
- Missing Flow/Thermal/Solidification analysis result before export.
- Coupling Audit without case/residual evidence or without enough samples.
- Generic Vector Magnitude refresh failures.
- Iso-surface invalid association, invalid numeric iso value and out-of-range iso value.

### Real B13 Phase/Momentum regression
- Reference fixture: `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`.
- Real file `B13_prghPressure_airGapOF14/0/metal/alphat` is an ASCII `volScalarField` with `internalField uniform 0;`.
- The real-case regression now verifies:
  - B13 `alphat` remains in the volume-field inventory.
  - Its source-file reference is preserved.
  - The parser accepts it as a supported uniform scalar.
  - `Scalar value` resolves to a finite zero value instead of “No compatible values”.
  - statistics remain finite and report min/max/mean/std = 0.
- Uniform fields with no expanded mesh-cell count no longer pretend that the single stored uniform value means “one physical cell”; the UI explicitly reports that the mesh cell count was not expanded.

### Native field-routing finding
- Desktop now routes every native-backed OpenFOAM field through the native field parser first, regardless of file size; small fields are no longer excluded by the former >4 MB routing threshold.
- Browser/JS fallback remains available when native parsing itself fails.

### Binary field limitation corrected
- **Binary OpenFOAM field payloads remain explicitly unsupported by the field-analysis parser at this stage.**
- Binary `polyMesh` support does not imply binary field-value support.
- An earlier diagnostic incorrectly suggested that using the Desktop/native reader would solve `binary-format`; this was corrected.
- The actionable remedy now accurately tells the user to use/produce an ASCII field for that field/time (and reload it) until binary field-value decoding is implemented.
- Regression prevents reintroducing the false “native routing failed” instruction.

### Iso-surface / pointField diagnostic reconciliation
- Face-associated surface fields remain intentionally excluded from volumetric iso-surface reconstruction.
- Iso-surface now reports `iso-surface-association-incompatible` and directs the user to a volume/cell or point scalar field.
- Invalid and out-of-range iso values receive dedicated corrective guidance.
- pointField interior Slice/Iso reconstruction remains covered numerically.
- Two regressions still expected the old explanatory sentence after the product moved to structured diagnostics; both tests were updated to assert the stronger actionable contract instead of restoring obsolete wording.

### Coupling Audit / Vector Fields
- Coupling Audit now explains when no case/root residual evidence exists and when the loaded evidence is insufficient.
- Generic Vector Fields exposes missing X/Y/Z groups, invalid selection/alignment and post-creation refresh failures to the user instead of relying only on console warnings.

### Test-suite audit findings
- Current suite: **50 `desktop/tests/*.test.cjs` files**.
- A new suite-manifest regression enumerates every test file and every workflow test command and requires:
  - every test file to execute exactly once,
  - no test file to be omitted,
  - no duplicate workflow execution,
  - no workflow reference to a nonexistent test.
- This closes the previously observed duplicated Flow Analysis execution and guards against future hidden/unexecuted test files.
- Audit found that several older UI/wiring tests relied heavily on `source.includes(...)`. Those checks remain useful for structural contracts, but critical runtime behavior is now additionally covered by:
  - real B13 integration,
  - executed parser/analysis functions,
  - executed global diagnostic rendering,
  - native portable smoke,
  - installed-app smoke.
- Intermediate CI failures during this audit exposed stale test expectations rather than product regressions; the stale expectations were reconciled only after verifying the newer behavior.

### Final validation
- Tested product head: `4046e498627b5e6d14cc4160f056ee35d6fa7515`.
- GitHub Actions run **#385 — SUCCESS**.
- Complete B13 real OpenFOAM regression: **SUCCESS**.
- Real B13 `alphat` Phase/Momentum parsing/statistics regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- pointField interior Slice/Iso regression: **SUCCESS**.
- Global actionable diagnostics regression: **SUCCESS**.
- CI suite manifest (50 tests, exactly once each): **SUCCESS**.
- Portable Windows executable smoke: **SUCCESS**.
- Installer build + installed-app smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**. No release/tag was created or replaced.


## 2026-09-30 — FoamLens Desktop v1.4.2 published

### Publication
- GitHub Release: **FoamLens v1.4.2**.
- Tag: `v1.4.2`.
- Type: **normal release** (not draft, not prerelease).
- Published: **2026-09-30 09:25:48 UTC**.
- Release/tag commit: `7d4a14c1b4238d0c87dd4276219357d9bff6ebdc`.
- The release commit's parent is the fully tested product head `4046e498627b5e6d14cc4160f056ee35d6fa7515`; the child commit is documentation-only.

### Published Windows assets
- `FoamLens-Portable-v1.4.2.exe` — 72,975,495 bytes.
- `FoamLens-Portable-v1.4.2.exe.sha256` — 96 bytes.
- `FoamLens-Setup-v1.4.2.exe` — 67,864,788 bytes.

### Release validation basis
- GitHub Actions run **#385 — SUCCESS** on the tested product head.
- Complete real B13 OpenFOAM regression: **SUCCESS**.
- Real B13 `alphat` Phase/Momentum parsing/statistics: **SUCCESS**.
- Global actionable diagnostics contract: **SUCCESS**.
- 50-test CI manifest, each test exactly once: **SUCCESS**.
- 3D Field View, pointField Slice/Iso, Solver Logs, portable EXE smoke, installer build and installed-app smoke: **SUCCESS**.

### Post-publication rule
- The `v1.4.2` tag is immutable for this release and is not moved by later documentation-only commits.
- Future product changes must advance to a new version rather than replacing the published v1.4.2 binary assets.


## 2026-09-30 — FoamLens Desktop v1.4.3 Field View / performance development candidate

### User-observed defects and requirements
- Real v1.4.2 Field View testing exposed several usability and visualization issues:
  - thin rectangular/vertical/horizontal lines could cross the application UI;
  - 3D navigation lacked explicit orbit/pan/zoom and standard-view controls;
  - no interactive XYZ orientation gizmo was available;
  - the temperature legend could display visually indistinguishable values such as `1500 / 1500 / 1500` even when the underlying range was nonzero;
  - changing physical time could make visual controls feel blocked while a native field was being parsed;
  - temporal navigation needed cache/prefetch rather than repeated cold reads;
  - synchronized 3D analysis needed independent case/region/field/component selections and more than two simultaneous views;
  - the synchronized 3D layout needed video export.

### Cross-application canvas overlay root cause
- The base frontend applied `canvas{position:absolute;inset:0;width:100%;height:100%}` globally.
- Any analysis or 3D canvas that did not explicitly override that rule could therefore be positioned against the wrong containing block and visually cross unrelated UI, including the sidebar.
- The misleading `Physical time [s]` text seen in the overlay came from a 2D plot canvas, not from a Field View control.
- Structural fix: absolute full-area positioning is now scoped only to the primary 2D chart canvas:
  - `.chartwrap > canvas#canvas{position:absolute;inset:0;width:100%;height:100%}`
- Product commit: `e42ddcf112be2409a4ea75a6ab3a152a7be939b6`.

### Non-blocking native OpenFOAM field parsing
- Async file reads alone did not keep Field View responsive because CPU-heavy parsing resumed on the WinForms/WebView UI synchronization context.
- `HandleOpenFoamFieldAsync` now dispatches parsing and ASCII boundary decoding through a cancellable `Task.Run` worker and uses `ConfigureAwait(false)` inside that worker.
- Camera, opacity and other visual controls can therefore continue receiving UI events while a new field timestep is parsed.
- Regression explicitly requires the worker dispatch and cancellation token.
- Product commit: `5e9a50325372b1223ad6d754fbde269e53323061`.

### 3D navigation and orientation
- Field View now exposes explicit:
  - Orbit;
  - Pan;
  - Zoom;
  - Fit;
  - Reset;
  - Front / Back / Left / Right / Top / Bottom / Isometric views.
- An interactive XYZ gizmo is rendered inside the viewport, follows camera orientation and allows X/Y/Z click-to-view navigation.
- Middle/right drag remains a pan fallback; wheel zoom and double-click Fit are supported.
- Product commit: `be886d64c0bd4a2eb213f5651841660d2d160228`.
- Navigation regression: `feb046533ab9e21f16bacf5ffc4a34e60b67813b`.

### Intelligent scientific color ranges
- The former single `Lock color range` control was replaced by explicit modes:
  - Smart / current frame;
  - Global / all physical times;
  - Manual.
- Legend/statistics now expose Min, Max, mean and Δ.
- Numeric formatting increases precision automatically when a small field span sits on top of a large absolute value.
- Numerically uniform fields are represented explicitly as a uniform field rather than a misleading full gradient.
- Slice and iso-surface rendering use the same selected scientific range contract as the main surface.
- Product commits:
  - `b745377468b2fe97046dc8e248ae6924dc086036`
  - `b4a33c1f2b21bcc1c4f1083be37e2389bab9390f`
  - `bef20ee832df22311e8b8a87d974e8d3e4cb5292`.

### One bounded field cache + temporal prefetch
- Audit found that the base frontend already retained parsed fields in `pmFieldCache`, but that cache had no memory bound.
- A second Field View-only retention cache would have made a visible 512 MB budget misleading, so the architecture was consolidated instead.
- The shared OpenFOAM field cache is now bounded and LRU-evicted with:
  - tracked retained bytes;
  - configurable limit (256 MB / 512 MB / 1 GB / 2 GB from Field View);
  - recency touch on reads;
  - explicit trim/stat/clear helpers.
- Field View keeps only in-flight request deduplication and prefetches neighboring frames in the order next, next+1, previous.
- A transient implementation error that made the cache clear helper recursive was detected during the same audit and corrected before the final candidate.
- Product commits:
  - `ff367366ece31fff818c6568cdea56656d6e3e80`
  - correction `aa3ad831d3de6e64bf4aa3720b58514a28bae15f`
  - shared-cache Field View integration `684b18571b41693bc357df607bf54d260708058e`.

### Independent and multi-view 3D analysis
- Synchronized comparison no longer assumes “same field in a second case”.
- View 2 can independently select case, region, field and component; the same case may be selected to compare two different variables.
- Additional synchronized Views 3 and 4 can be added, for up to four simultaneous 3D viewports.
- Physical time and camera orientation remain synchronized; each viewport may represent a different quantity.
- Shared color ranges and strict signed 3D differences are only applied when the two relevant views represent the same field/component/association/dimensions.
- View 2 now uses the same generic field loader as Field View so cell-, point- and internal-face-associated fields are handled according to their real association instead of exposing options that silently required a volume field.
- Strict 3D difference remains deliberately limited to compatible cell-associated volume fields.
- Product commits:
  - independent View 2: `58efbe93db56bfbd571e74b4249f23a81c2d8145`
  - Views 3/4: `0d4eecc16d32d8625a6dd726a68bbc0fcdb04c76`
  - association-aware View 2: `18d476dec12dd41aea944c5640b1848ef358738e`.

### Multi-view animation / video export
- New module: `v14-animation-export.js`.
- Export controls include:
  - start/end physical time;
  - frame step;
  - 24/30/60 FPS;
  - 720p / 1080p / 1440p / 4K;
  - Auto (MP4 when supported), MP4 or WebM.
- Export preloads the requested physical-time frames and calculates an independent global color range for every visible 3D viewport before recording.
- Visible synchronized viewports are composited into one output video with view labels, physical time and range information.
- Video export uses the browser/WebView `MediaRecorder` + canvas `captureStream` capability and falls back to a supported encoded MIME type.
- Product commits:
  - animation export: `84376d18dbf4f00113dde7f8fc954c2a460e73ad`
  - fixed per-view video-range plumbing: `80d378d7b041b6833f1e19b59e2567ec0099fff8`
  - comparison descriptors/ranges: `3fe4410506c0e2dbf632e2fe6fae4d6af6ff4e1f`.
- Boundary: CI validates syntax/wiring and application packaging, but actual user-side codec availability still depends on the installed WebView2 runtime; the exporter reports when the requested encoding is unavailable.

### v1.4.3 development identity / CI
- Desktop project, assembly/file versions, runtime-bundle isolation, Field View identity, frontend export provenance and documentation were aligned to `v1.4.3`.
- Public release remains `v1.4.2`; no `v1.4.3` tag or GitHub Release was created.
- CI branch matching was generalized to `development/**` so current and future development branches receive the full Windows build without publishing.
- Intermediate CI findings were corrected rather than ignored:
  - run #387 exposed stale v1.4.2 version-test expectations;
  - runs #393/#394 exposed the old Field View cache-test expectation after cache consolidation.
- Those were stale regression expectations, not reasons to restore the obsolete implementation.

### Final development-candidate validation
- Tested product head: `f3afd81a31abf02544f334c1179acf5accf0573c`.
- GitHub Actions run **#397 — SUCCESS**.
- Real OpenFOAM QuickCup/B13 regression: **SUCCESS**.
- Frontend JavaScript validation: **SUCCESS**.
- Version consistency: **SUCCESS**.
- Native OpenFOAM field streaming / off-UI-thread regression: **SUCCESS**.
- 3D Field View regression: **SUCCESS**.
- Decomposed Field View regression: **SUCCESS**.
- Iso-surface and 3D probe regressions: **SUCCESS**.
- Strict 3D difference / multi-view regression: **SUCCESS**.
- CI suite manifest: **SUCCESS**.
- Bilingual/overflow audits: **SUCCESS**.
- Portable Windows executable build + smoke: **SUCCESS**.
- Installer build + installed-application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11091020217`.
- Artifact size: 135,282,594 bytes.
- Artifact digest: `sha256:4e59fbed846d4ef38a367463b460e8a8d4cb67a9addc57ca25c93412ee41d1a6`.
- GitHub Release publication: **SKIPPED**. v1.4.3 remains a development candidate for real user-side visual/video testing.

### Candidate rule
- The validated product head above must remain identifiable even if documentation-only commits follow it.
- Any product-code change after `f3afd81a31abf02544f334c1179acf5accf0573c` requires a new full CI candidate before it is treated as the v1.4.3 test build.


## 2026-09-30 — v1.4.3 packaged-runtime smoke strengthened

### Why the runtime smoke was expanded
- The earlier v1.4.3 candidate (#397) proved product regressions, B13 integration, packaging and installer startup, but the Windows smoke only verified that Field View mounted.
- New runtime checks now execute inside the packaged WebView2 application rather than only inspecting source strings.

### Runtime 3D UI checks
- The packaged EXE now verifies at runtime that these controls/APIs actually mount:
  - Orbit / Pan / Zoom / Fit / Reset;
  - XYZ orientation gizmo;
  - Current / Global / Manual color-range modes;
  - comparison controls;
  - animation/video panel.
- The smoke programmatically presses `+ Add 3D view` twice and verifies synchronized Views 3 and 4 create their viewport, canvas and controls without duplicate DOM IDs.
- It verifies the original 2D chart canvas remains `position:absolute`, while the Field View canvas is not globally forced absolute. This directly guards the cross-application canvas-overlay defect.
- It invokes standard camera/pan/orbit UI controls inside the real WebView2 runtime.
- Run #399 confirmed this complete 3D runtime UI block passed in the packaged EXE.

### Real WebView2 video primitive smoke
- Initial run #399 failed after the 3D checks because the test harness returned an unresolved JavaScript Promise directly through `ExecuteScriptAsync`; WebView2 serialized the Promise object as `{}`.
- This was a smoke-harness defect, not evidence that video encoding failed.
- The harness was corrected to:
  - launch the async recorder inside WebView2;
  - store the resolved result in `window.__foamLensVideoSmokeResult`;
  - have C# poll that result with an explicit 8-second deadline;
  - require a non-empty encoded Blob.
- The smoke exercises the same browser primitives used by FoamLens export: `HTMLCanvasElement.captureStream` + `MediaRecorder`, with MP4/WebM capability negotiation.
- Product behavior was not weakened to make the test pass.

### New validated candidate
- Tested head: `c56e5e951f512b696f5a73cd8920be742bca33f4`.
- GitHub Actions run **#401 — SUCCESS**.
- Real QuickCup/B13 regression job: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Packaged portable EXE runtime smoke: **SUCCESS**, including:
  - v1.4.3 3D controls/APIs;
  - View 3 + View 4 runtime creation;
  - canvas layout isolation;
  - scientific color-range modes;
  - actual WebView2 canvas-video encoding producing a non-empty Blob.
- Installer build: **SUCCESS**.
- Installed-app runtime smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11091436790`.
- Artifact size: 135,289,646 bytes.
- Artifact digest: `sha256:dc64e7ae95b975f651f5efac2df062b56d16cfd36a4d00696f4cfe7300d95582`.
- GitHub Release publication remains **SKIPPED**; v1.4.2 is still the public stable release.

### Important limitation still being closed
- B13 is currently validated through the dedicated real OpenFOAM integration job, while the packaged Windows smoke uses mounted UI plus a synthetic recording canvas.
- The next CI hardening target is loading the private B13 fixture into the packaged WebView2 application during smoke, if this can be done through a smoke-only bridge without introducing fixture-specific behavior into the product UI or scientific logic.


## 2026-09-30 — B13 rendered inside packaged Windows FoamLens

### Why a second real-case path was needed
- The existing QuickCup integration job already validated the real B13 files on Linux, but it did not prove that the packaged Windows application could traverse the same Smart Import -> case metadata -> Field View -> native field/mesh bridge -> WebGL path.
- A smoke-only, fixture-agnostic runtime helper was therefore injected only when the executable starts with `--smoke-test`.
- Normal FoamLens runs do not expose this helper and contain no B13-specific scientific logic.

### Smoke-only packaged real-case path
- The runtime helper receives native file references for any OpenFOAM case and uses the real FoamLens functions:
  - `runProjectScan(files)`;
  - Smart Import candidate creation;
  - `importSelectedAsCases()`;
  - Data / Field View navigation;
  - normal region/field selectors;
  - `fvLoadSelection()`;
  - normal native mesh/field parsing and WebGL rendering.
- C# then requires the rendered frame to report:
  - a 3D-ready case;
  - nonzero mesh cells;
  - nonzero field values;
  - a finite field range;
  - nonzero rendered surface vertices;
  - an active WebGL context;
  - `gl.getError() == 0`;
  - the requested region/field when the smoke environment specifies them.
- CI requests `region=metal` and `field=T`; those names exist only in workflow fixture configuration, not in FoamLens product selection logic.
- Product/runtime-helper commit: `b60948f8bdae626bb77cca38c2e6c9d11189c880`.

### Windows path incompatibility discovered
- A direct Windows checkout of QuickCup failed before FoamLens could start because OpenFOAM output contains filenames legal on Linux but impossible on NTFS, notably `phaseChangeSource:alpha1`.
- This is not confined to an unrelated case: B13 itself contains `phaseChangeSource:alpha1` at many physical times.
- QuickCup/thesis files were not renamed or modified.

### Windows-safe real fixture staging
- The Linux real-fixture job now creates a temporary Windows-safe B13 runtime copy.
- It omits only path components that Windows cannot represent (invalid NTFS characters, trailing dot/space, reserved device names) and rejects case-insensitive path collisions.
- Required inputs are asserted after staging, including:
  - `constant/metal/polyMesh/points`;
  - `constant/metal/polyMesh/faces`;
  - `constant/metal/polyMesh/owner`;
  - `0/metal/T`.
- Run #407 staging result:
  - **4,584 files copied byte-for-byte**;
  - **101 NTFS-impossible paths omitted**;
  - omitted examples are the `phaseChangeSource:alpha1` field at successive physical times.
- The staged B13 artifact is uploaded from Linux and downloaded by Windows; Windows no longer git-checks out the private QuickCup repository.
- CI staging commit: `487395afecceeea6962afcd5a1cf329d242f1b0b`.
- Final extracted-path correction for portable and installed smoke: `a407131baa9a8b837a55fccb0c1fec8bfb434f52`.

### Fully validated v1.4.3 candidate
- Tested product/CI head: `a407131baa9a8b837a55fccb0c1fec8bfb434f52`.
- GitHub Actions run **#407 — SUCCESS**.
- Linux real QuickCup/B13 integration: **SUCCESS**.
- Windows-safe B13 fixture preparation/upload/download: **SUCCESS**.
- Full Windows scientific/UI regression suite: **SUCCESS**.
- Portable EXE build: **SUCCESS**.
- Portable packaged-runtime smoke: **SUCCESS**, including:
  - runtime multi-view controls;
  - View 3/4 creation;
  - canvas isolation;
  - WebView2 video encoding;
  - real Smart Import of staged B13;
  - real `metal/T` Field View load;
  - nonzero mesh/field/render geometry;
  - finite field range;
  - WebGL context with zero GL error.
- Installer build: **SUCCESS**.
- Installed-app smoke: **SUCCESS**, repeating the same real B13 packaged-runtime path.
- Final Windows artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11092386284`.
- Artifact size: 135,252,937 bytes.
- Artifact digest: `sha256:92463f2d32b49db87d36a6f1d86e1cf71dadf118db70646edcbb6b3ceafa72f8`.
- Temporary staged fixture artifact: `QuickCup-B13-Windows-runtime`, artifact id `11091897433`, one-day retention.
- GitHub Release publication remains **SKIPPED**. Public stable remains v1.4.2.

### Candidate rule
- `a407131baa9a8b837a55fccb0c1fec8bfb434f52` is now the strongest validated v1.4.3 product candidate.
- Any product-code or workflow behavior change after that head requires a new full validation run before replacing it as the candidate.


## 2026-09-30 — v1.4.3 late-time thermal visualization closed on real B13 packaged runtime

### Why this check was added
- User testing of v1.4.2 showed a Field View legend of `1500 / 1500 / 1500` even around `t = 9.8 s`, although the real simulation was known to have thermal evolution.
- Direct inspection of the B13 OpenFOAM fixture established:
  - `t = 0 s`: `internalField uniform 1500`;
  - `t = 9.8 s`: 6400 cell values, min `1417.57 K`, max `1481.90 K`, span `64.33 K`;
  - `t = 9.9 s`: min `1417.56 K`, max `1481.56 K`, span `64.00 K`.
- Therefore a `1500 / 1500 / 1500` legend is correct only for the initial uniform frame and incorrect for the late-time B13 field.

### Smoke contract strengthened
- The smoke-only OpenFOAM import helper can now request a specific physical time.
- The packaged runtime reports:
  - selected physical time;
  - field min/max;
  - field span;
  - rendered legend text;
  - cells/points/value count;
  - WebGL status/error;
  - active 3D plot title/info.
- CI now requests:
  - region: `metal`;
  - field: `T`;
  - physical time: `9.8 s`;
  - minimum acceptable field span: `1 K`.
- Portable and installed application smokes fail if the late B13 frame collapses back to an effectively uniform field.

### Final validation
- Tested head: `dd3348ce268db23ad330573b34aa62e06a035d40`.
- GitHub Actions run **#416 — SUCCESS**.
- Real QuickCup/B13 regression: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Portable packaged runtime smoke: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- WebView2 video primitive smoke:
  - MIME: `video/mp4;codecs=avc1`;
  - encoded blob non-empty.
- Portable B13 runtime evidence at `t = 9.8 s`:
  - case: `B13_prghPressure_airGapOF14`;
  - region: `metal`;
  - field: `T`;
  - association/storage: cell / volume;
  - cells: `6400`;
  - points: `13122`;
  - values: `6400`;
  - min: `1417.57 K`;
  - max: `1481.90 K`;
  - span: `64.33 K`;
  - WebGL error: `0`;
  - surface vertices: `78720`;
  - legend: `T [K] · 1,418 · 1,450 · 1,482 · current · Δ 64`;
  - active header: `3D OpenFOAM Field View · Mesh + transient fields`.
- Installed runtime returned the same numerical and rendering evidence.
- Visual screenshots confirm a visible late-time thermal gradient and no cross-application canvas overlay lines.

### Candidate artifact
- Artifact: `FoamLens-Windows-v1.4.3`.
- Artifact id: `11112882822`.
- Artifact size: `135,326,030 bytes`.
- Artifact digest: `sha256:0c913f1afb2f5e1c970feb6ded50b94acb5e6aa336518de0847a410aded39bb6`.
- Artifact contains:
  - portable EXE;
  - portable SHA-256 file;
  - installer EXE;
  - portable B13 smoke screenshot;
  - installed B13 smoke screenshot;
  - portable runtime evidence log;
  - installed runtime evidence log.
- GitHub Release publication remains **SKIPPED**. Public stable remains v1.4.2 until explicit promotion of v1.4.3.

### Candidate rule
- Any product-code change after `dd3348ce268db23ad330573b34aa62e06a035d40` requires a new full candidate run before promotion.


## 2026-09-30 — FoamLens Desktop v1.4.4 Field Workspace candidate

### Scope closed in this candidate
- Field View is promoted from the Data sub-tabs to a first-class top-level application mode alongside Overview, Data, Analysis, Review and Live.
- The legacy Data `Field View` tab remains hidden in the new workflow; existing routes to `field3d` redirect into the top-level Field workspace.
- Field Workspace supports simultaneous 3D + 2D diagnostics instead of forcing the user to choose one or the other.
- Companion plot options include Spatial Profile, Time Series, Solver Logs or None.
- Spatial Profile can follow the 3D physical time while the 3D renderer remains mounted.
- `+ Add 3D View` is visible in the Field Workspace header.
- Up to four synchronized 3D viewports remain supported.
- Each 3D viewport retains independent case / region / field / component selectors.
- Visible synchronized 3D views remain eligible for the same animation/video export.

### Real 3D Case selector defect
- User testing showed the Case selector could visually change while the renderer stayed bound to the previous case.
- Root cause: the Case `onchange` path called `fvRefreshSelectors(false)`, which discarded the explicit user selection and reselected the active context case.
- The Case selector now routes through `fvHandleCaseChange()`.
- Case switching now invalidates stale frame, prefetch, global-range, mesh, field, vector, streamline, slice and Probe state before rebuilding the selected case.
- The handler preserves the explicitly selected case and verifies that both `fvState.caseId` and `fvCase().id` remain bound to it after loading.

### End-to-end multi-case selector smoke
- The QuickCup fixture branch contains one complete transient 3D runtime fixture (B13); the sibling V12/V13 directories do not contain the full generated 3D payload.
- CI therefore creates distinct smoke case identities backed by the same complete B13 payload. This tests selector/state mechanics without pretending that the incomplete sibling fixtures are complete CFD results.
- Portable and installed runtime smoke both import four 3D-ready case identities.
- The smoke changes the real `#fvCase` select value and dispatches a real bubbling `change` event.
- It waits for `fvState.caseId` and `fvCase().name` to change before continuing.
- Validated transition: `SmokeCase_A -> B13_prghPressure_airGapOF14`.
- Runtime evidence confirms:
  - `caseCount = 4`;
  - `readyCaseCount = 4`;
  - `caseSwitchChanged = true`;
  - switched case ID differs from initial case ID;
  - renderer case ID equals switched case ID;
  - final rendered case is `B13_prghPressure_airGapOF14`.

### Field Workspace runtime evidence
- Portable and installed smoke both confirm:
  - top-level `Field View` navigation is visible;
  - `Field Workspace` is the active application mode;
  - the 3D panel is mounted under `fw3DHost`;
  - Spatial Profile is mounted simultaneously under `fw2DHost`;
  - companion mode is `profile`;
  - `+ Add 3D View` is visible;
  - View 3 and View 4 can mount without duplicate DOM IDs;
  - the main 3D canvas is not affected by the old global absolute-canvas defect.
- Final smoke screenshot visually confirms the split workspace with 3D and Spatial Profile shown at the same time.

### Probe visibility
- Probe now exposes explicit ON/OFF state.
- Disabling Probe clears the WebGL marker rather than only changing the control label/cursor.
- A high-contrast overlay marker/reticle follows the picked point.
- Probe marker size is configurable: S / M / L.
- Runtime rendering updates the overlay position after camera redraws.

### Vector and streamline resolution
- Vectors and Streamlines now have independent collapsible control blocks beneath their ON/OFF toggles.
- Vector resolution options:
  - Adaptive;
  - 150;
  - 300;
  - 600;
  - 1200;
  - 2400 glyphs.
- Glyph size is independently adjustable.
- Vector sampling no longer relies only on a raw every-N-cells stride; it uses the spatial hash to distribute glyph samples across the domain and reports the actual glyph count.
- Synchronized View 2 uses the same vector-resolution and glyph-size controls instead of a hard-coded 280 glyphs.
- Streamline seed density can be raised up to 400 seeds and is independent from vector glyph density.
- Streamline controls remain separated from vector controls.

### Navigation cleanup
- Field View is now part of the base navigation model (`workspace/data/field/analysis/review/live`).
- The Workspace fallback only creates a Field navigation button if the base button is absent.
- Fallback click wiring is added only when that fallback button was actually created, preventing duplicate Field navigation listeners.

### Scientific regression retained
- B13 `metal/T` at `t = 9.8 s` remains the late-time thermal runtime reference.
- Portable and installed smoke both report:
  - 6400 cell values;
  - 13122 mesh points;
  - min `1417.57 K`;
  - max `1481.90 K`;
  - span `64.33 K`;
  - legend `1,418 / 1,450 / 1,482 · current · Δ 64`;
  - WebGL error `0`.
- The video primitive smoke again produced a non-empty MP4/H.264-compatible blob in WebView2.

### Final v1.4.4 candidate validation
- Tested head: `71ce31ed83b50b0c76896b8a5ef7abe7b445f5b0`.
- GitHub Actions run **#452 — SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full Windows regression suite: **SUCCESS**.
- Field View regression: **SUCCESS**.
- Probe regression: **SUCCESS**.
- 3D comparison/multi-view regression: **SUCCESS**.
- Portable packaged runtime smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Artifact upload: **SUCCESS**.
- Artifact: `FoamLens-Windows-v1.4.4`.
- Artifact id: `11122496658`.
- Artifact size: `135,161,390 bytes`.
- Artifact digest: `sha256:ea4c7a2d0f8453b0e94b6c931c8f90fd7bd893f49a85599897d71a8a1f631654`.
- GitHub Release publication remains **not performed** for v1.4.4 in this development branch.

### Candidate rule
- Any product-code change after `71ce31ed83b50b0c76896b8a5ef7abe7b445f5b0` requires a new full candidate run before promotion.


## 2026-09-30 — FoamLens Desktop v1.4.5 multi-view legend / Probe patch line

### Why v1.4.5 exists
- Public v1.4.4 was already tagged and published from commit `93b04a4c5cac5e591519eb0f49e1939ab85a437c`.
- Subsequent real-user testing of that release exposed two visible multi-view defects:
  - an added 3D viewport could render its field but show no local color scale/legend;
  - Probe could be enabled while the added viewport gave insufficient visual feedback, making it look as if Probe did nothing.
- The v1.4.4 tag/assets are not moved or replaced. These post-release fixes are promoted as v1.4.5.

### Per-viewport scientific legend
- View 2 and dynamically added Views 3/4 now own an independent `fcLegend` element inside their viewport.
- Legend rendering uses the field/component actually selected for that viewport, its dimensions/unit and its active display range.
- Non-uniform fields show min / midpoint / max plus Δ.
- Numerically uniform fields are explicitly labelled uniform instead of drawing a misleading gradient.
- Extra-view upload refreshes the local legend on every field/frame change.
- Comparison View 2 refreshes its legend on synchronized frame loads and visual-range changes.
- The legend is anchored to the viewport itself, so different variables/cases may display different scientifically meaningful scales simultaneously.

### Probe in synchronized / added 3D views
- Probe state is shared with the Field View Probe ON/OFF control, but every comparison viewport now installs its own click picking path.
- View 2 and Views 3/4 perform picking against their own mesh, association and field values rather than reusing the primary view's data.
- Each additional viewport owns a high-contrast `fcProbeMarker` overlay.
- Clicking geometry while Probe is ON stores a viewport-specific probe result, redraws its marker and updates the per-view statistics grid.
- Changing case / region / field / component clears the stale probe for that viewport.
- Probe OFF prevents comparison-view picking and keeps probe markers from being presented as active selections.

### Multi-view continuity retained from v1.4.4 development work
- Field View remains a first-class top-level application mode.
- 3D + Spatial Profile can remain mounted simultaneously.
- `+ Add 3D View` remains visible in Field Workspace.
- Up to four synchronized 3D viewports are supported with independent case / region / field / component.
- Visible synchronized views remain included in the same video export.
- Vector resolution / glyph size and streamline seed density remain independently adjustable.
- Safe 3D case switching continues to invalidate stale case work before binding the renderer to the newly selected case.

### Release discipline
- v1.4.4 remains the immutable historical release containing the behavior seen in the user's screenshot.
- v1.4.5 is the patch release line for the post-v1.4.4 multi-view legend / Probe fixes.
- Public release before promotion: v1.4.4.
- Development identity: v1.4.5 / frontend v51.


### Final v1.4.5 candidate validation
- Tested product head: `6bd6ed194ea5da284a9b14f39a5a67ce112415ee`.
- GitHub Actions run **#485 — SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Windows-safe multi-case runtime fixture preparation/upload/download: **SUCCESS**.
- Full Windows scientific/UI regression suite: **SUCCESS**.
- Field View regression: **SUCCESS**.
- 3D Probe regression: **SUCCESS**.
- 3D comparison / multi-view regression: **SUCCESS**.
- Portable EXE build: **SUCCESS**.
- Portable packaged-runtime smoke: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- Development-branch Release publication: **SKIPPED**, as expected.

### Packaged-runtime evidence for the reported v1.4.4 defects
- The packaged WebView2 smoke enables synchronized View 2 through the public UI/runtime API.
- It selects a distinct comparison case and verifies that the selection persists in the actual rendered View 2 descriptor.
- It optionally switches View 2 to a field distinct from the primary viewport.
- It requires the secondary viewport's `#fcLegend` to:
  - be present;
  - not carry the hidden class;
  - have nonzero rendered width/height;
  - contain non-empty scientific legend text.
- It enables the shared Probe control, clicks multiple real positions in the View 2 canvas and requires:
  - a View 2 probe descriptor;
  - a finite selected value;
  - a visible `#fcProbeMarker` with nonzero dimensions;
  - updated selected-value statistics.
- A failure in either the local View 2 legend or the secondary Probe marker makes the packaged smoke fail.

### Candidate artifact
- Artifact: `FoamLens-Windows-v1.4.5`.
- Artifact id: `11130930049`.
- Artifact size: `135,195,504 bytes`.
- Artifact digest: `sha256:8b427192f8e21b9b1118b698880daf8cc54077dd6eeaaae9413a97ff51348ccc`.
- Multi-case runtime fixture artifact: `QuickCup-MultiCase-Windows-runtime`.
- Runtime fixture artifact id: `11129997074`.
- v1.4.4 remains unchanged and historical; promotion target is v1.4.5.


## 2026-10-02 — FoamLens post-v1.4.5 pending roadmap

### Roadmap policy
- This section intentionally records **pending / proposed work**, not completed product behavior.
- An item remains pending until product code, regressions and packaged-runtime evidence exist.
- Completed items should be moved into a dated validation section rather than silently removed from this roadmap.
- Current public release at the time this roadmap was written: **v1.4.5**.

### P0 — Scientific visualization / trust
- **Streamline seeding and integration controls**
  - add explicit seed modes: Plane / Line / Box-Volume / Patch;
  - expose seed density independently from vector glyph density;
  - add Forward / Backward / Both integration direction;
  - expose max integration length, max steps and integration step controls;
  - report actual streamline count and integration-point count;
  - support coloring streamlines by velocity magnitude or another compatible scalar field;
  - validate representative streamline paths against ParaView/VTK before calling the feature thesis-grade.
- **Vector glyph analysis controls**
  - keep Adaptive / fixed glyph-count resolution and glyph-size controls;
  - add normalized-length vs magnitude-proportional arrow modes;
  - allow region/ROI-based glyph sampling;
  - report requested vs actually rendered glyph count;
  - validate spatial sampling against the underlying vector field rather than only visual density.
- **Per-viewport visual independence**
  - allow every 3D viewport to own its own colormap, color-range mode, opacity, vector/streamline visibility, Slice/Iso settings and Probe state when desired;
  - add an explicit Sync visual settings toggle rather than implicitly sharing all visualization controls;
  - retain independent scientific legends for every viewport.
- **Scientific provenance in the viewport**
  - make field association, dimensions/units, physical time, region, case and parser/source provenance visible without opening the catalog;
  - expose when a frame is Exact / Nearest / Interpolated in multi-case synchronized views.

### P0 — Multi-view / case comparison
- **Camera synchronization groups**
  - add Link cameras ON/OFF;
  - allow one viewport to be rotated independently without breaking the others;
  - provide Re-sync camera and Fit all actions.
- **Time synchronization modes per comparison**
  - Exact / Nearest / Interpolated physical-time synchronization;
  - explicit per-view Δt badges when times are not exact;
  - prevent silent index-based equivalence.
- **Generalized 3D difference**
  - choose any two compatible visible views as A and B;
  - support signed difference, absolute difference and percent difference where scientifically valid;
  - keep strict association / dimensions / mesh-compatibility checks.
- **Multi-case matrix workflow**
  - quicker Case A / B / C / D assignment;
  - copy visual settings from one viewport to another;
  - swap views without rebuilding the workspace.

### P1 — 3D + 2D linked analysis
- **Interactive profile definition from the 3D view**
  - draw a line in 3D and immediately generate a Spatial Profile along it;
  - support axis-aligned and arbitrary lines;
  - show the sampled line/plane visibly inside the 3D viewport.
- **Probe-to-profile linking**
  - selecting a 3D Probe should optionally move a cursor/marker on the Spatial Profile;
  - selecting a point on a Spatial Profile should optionally highlight the corresponding 3D location.
- **Synchronized companion plots**
  - keep Spatial Profile / Time Series / Solver Logs simultaneously available beside 3D;
  - make the physical-time link explicit and reversible;
  - allow more than one 2D companion panel when screen space permits.
- **Cross-case profile comparison**
  - overlay profiles from multiple selected 3D cases/fields at the same physical time;
  - display difference / relative difference without extrapolating beyond common support.

### P1 — Animation / video
- **Camera-path / keyframe animation**
  - save camera keyframes and interpolate orbit / pan / zoom through the exported animation.
- **Scientific video overlays**
  - configurable case / field / region / time / legend / Δt labels;
  - optional watermark/provenance and thesis-safe title block.
- **Multi-view video layouts**
  - 1-up / 2-up / 2×2 templates;
  - optional 3D + Spatial Profile composition in the same video;
  - preserve an independent fixed global color range for each viewport across the full recording.
- **Export quality controls**
  - bitrate/quality presets;
  - frame-step and playback-speed controls;
  - explicit codec/fallback reporting for MP4/WebM.

### P1 — Performance / responsiveness
- **Progressive frame rendering**
  - update the visible viewport as soon as its required field is ready instead of waiting for hidden or secondary views.
- **Viewport-aware loading**
  - prioritize active/visible viewports;
  - lazy-load hidden secondary views;
  - cancel stale case/time/field requests aggressively.
- **GPU/resource reuse**
  - reuse mesh and WebGL buffers when only field values change;
  - avoid rebuilding equivalent geometry across synchronized views.
- **Cache telemetry**
  - show hit/miss/prefetch counts in addition to retained MB;
  - expose a clear-cache action;
  - distinguish mesh cache from field cache.
- **Playback prefetch policy**
  - adaptive prefetch depth based on current playback speed and measured parse time.

### P1 — Export / thesis workflow
- **Multi-panel thesis figure export**
  - export 3D + Spatial Profile / comparison views as one high-resolution figure;
  - consistent margins, labels, legends and physical-time caption.
- **Per-view export**
  - export an individual viewport without hiding the others first.
- **Reusable figure presets**
  - save camera, field, range, legend and layout presets for repeatable thesis figures.

### P2 — Workspace / usability
- **Persistent Field Workspace layouts**
  - save and restore viewport count, case/field assignments, companion plots, splitter positions and synchronization settings.
- **Per-view rename / labels**
  - user labels such as Baseline / Pressure BC / Fixed Value for presentations and exports.
- **Visual comparison status bar**
  - compact always-visible summary of linked camera, linked time, active Probe, vector glyph count and streamline count.
- **Keyboard/mouse discoverability**
  - viewport help overlay for orbit / pan / zoom / Probe shortcuts.
- **Resizable multi-view panels**
  - drag splitters between 3D viewports and companion plots instead of fixed equal columns.

### Recommended next implementation order
1. Streamline seeding/integration controls + ParaView validation.
2. Per-viewport visual settings and camera-link toggle.
3. Interactive 3D-defined Spatial Profile.
4. Generalized A/B 3D difference and explicit time-sync modes.
5. Multi-panel thesis/video export.
6. Performance pass with viewport-aware loading and GPU-buffer reuse.

### Already closed before this roadmap
- top-level Field Workspace;
- simultaneous 3D + Spatial Profile workflow;
- visible Add 3D View and up to four synchronized views;
- safe 3D case switching;
- independent added-view legends;
- Probe marker/picking in added 3D views;
- adjustable vector glyph resolution / size;
- adjustable streamline seed density;
- synchronized multi-view video export;
- late-time B13 thermal-range validation;
- packaged portable + installed runtime evidence for v1.4.5.

## 2026-10-03 — v1.4.6 visible-version validation repaired and completed

- Development branch: `development/v1.4.6-visible-version`.
- Product change already present on the branch: persistent visible FoamLens Desktop v1.4.6 identity across the desktop UI/runtime.
- Previous Windows builds on 2026-10-02 failed after the real QuickCup regression had already passed because `desktop/tests/native-performance.test.cjs` still expected the historical runtime-smoke text `FoamLens v1.4.5 3D runtime UI smoke passed` while `Program.cs` correctly emitted the v1.4.6 identity.
- Fix commit: `a80ffd51d7a13c3dfc12e28df863aea6df917d09` — `test: align native runtime smoke with v1.4.6`.
- The fix changed only the stale regression expectation/name/error text; production runtime behavior was not altered.
- GitHub Actions run **#494** (`37104141077`) completed **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Native background progress/cancellation regression: **SUCCESS**; this was the step that had blocked the previous v1.4.6 builds.
- 3D Field View, point-field reconstruction, decomposed meshes, dynamic mesh, iso-surfaces, 3D Probe, explicit surface fields, strict 3D difference, Smart Import, dual Time-Series Focus, convergence, momentum, energy, experimental validation, contextual UI, diagnostics and bilingual/overflow regressions: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke with real OpenFOAM fixture: **SUCCESS**.
- Windows installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows build artifact upload: **SUCCESS**.
- Release publication: **SKIPPED**, expected for a development-branch push.
- Artifact: `FoamLens-Windows-v1.4.6`, id `11267431426`, size `135,196,674 bytes`, digest `sha256:63089cb91f640ca78ea7cb7c19217947bb2500251d1c97b547c84a8ed652d015`.
- Multi-case runtime fixture artifact: `QuickCup-MultiCase-Windows-runtime`, id `11267780761`, size `326,073,834 bytes`, digest `sha256:32d37d99429fa308cdfc410d08866d6419fbe5f6ccbe152a84039d6fabffdaa7`.
- Public release remains **v1.4.5**; v1.4.6 is validated and ready for promotion when explicitly requested.


## 2026-10-03 — Compact Word-style ribbon navigation validated

- Development branch: \`development/v1.4.7-ribbon-navigation\`.
- Validated product head: \`36bc401b0a130776cc8629ae5e479406992b5893\`.
- Base product identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no release-version promotion was performed.

### UI organization
- Added \`desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js\`.
- Replaced the visible legacy top mode bar/tool cluster with a compact Word-style ribbon only after the ribbon mounts successfully.
- Ribbon tabs:
  - Home;
  - Data;
  - 3D / Field;
  - Plots;
  - Analysis;
  - Compare;
  - Export;
  - View.
- Major actions are icon-first with small text labels beneath the icons rather than text-heavy buttons.
- The implementation exposes 54 ribbon actions while preserving the existing scientific/runtime handlers instead of duplicating their logic.
- Project / Case / Region context and workspace save/open controls remain visible in the ribbon context strip.
- Ribbon tabs navigate directly to their corresponding workspace where appropriate.
- Legacy \`modeNavBar\` and the old top tool row are hidden only after successful ribbon installation.

### Existing controls reused rather than replaced
- Data import: Add files / Add folder.
- Data views: Time Series / Spatial Profiles / Solver Logs / Catalog.
- Field Workspace: Add 3D View / Configure views / Split / 3D focus / Plot focus.
- Scientific inspection: Probe / Slice / Vectors / Streamlines.
- Camera: Fit / Reset.
- Analysis: General / Coupling / Front tracking / Difference / Field Mapping / Phase Change-Momentum.
- 3D comparison: Compare 3D / Add view / Configure / Difference.
- Export: PNG / SVG / CSV / Thesis Figure / Video.
- View: sidebar / fit / theme / language.

### Cases menu integration
- The existing Case visibility panel is re-homed under the ribbon instead of being left inside the now-hidden legacy toolbar.
- Ribbon action click propagation is contained so the legacy document-level outside-click handler does not immediately close the Case menu.
- Packaged runtime smoke verified:
  - \`casePanelOpen = true\`;
  - \`casePanelParent = flRibbon\`.

### Regression / smoke issues found during validation
- Run #499 exposed a stale source-audit assumption: the test searched for fully materialized ribbon tab IDs even though the module generates them dynamically. The test was corrected to audit the stable tab definitions / ID builders.
- Run #501 reached packaged runtime and proved the ribbon runtime smoke itself passed, but a historical Field View smoke still required the legacy \`modeField\` navigation button to be visible.
- Runs #504/#505 confirmed:
  - ribbon runtime smoke passed;
  - Cases menu mounted/opened correctly;
  - \`fieldRibbonVisible = true\`;
  - the remaining failure was only the historical legacy-navigation assertion.
- The final smoke now validates the visible ribbon Field tab and checks the hidden state on the legacy navigation container (\`modeNavBar\`) instead of querying the hidden child button's own computed \`display\`.

### Automated coverage
- Added \`desktop/tests/ribbon-ui.test.cjs\`.
- Added the ribbon audit to \`.github/workflows/build-foamlens-desktop.yml\`.
- Source audit result: 8 ribbon tabs / 54 actions, with all required existing-control targets present.
- WebView2 startup smoke verifies:
  - ribbon mounted;
  - all expected tabs/actions exist;
  - icon / small-label hierarchy exists;
  - Field tab activates the Field workspace;
  - legacy top navigation/tool row is hidden;
  - Project / Case / Region context is preserved;
  - Cases menu is re-homed and opens from the ribbon.

### Final validation
- GitHub Actions run **#506** (\`37106117480\`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full scientific/UI regression suite: **SUCCESS**.
- 3D Field View, pointField reconstruction, decomposed meshes, dynamic mesh, iso-surfaces, Probe, explicit surface fields and strict 3D difference: **SUCCESS**.
- Ribbon source audit: **SUCCESS**.
- Bilingual / overflow audits: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- The packaged smoke reports the new \`3D / Field\` ribbon navigation visible while Field Workspace, B13 multi-case switching, local legends and synchronized View 2 Probe remain functional.
- Portable checksum creation: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Candidate artifacts
- Windows build artifact: \`FoamLens-Windows-v1.4.6\`.
- Artifact id: \`11267549547\`.
- Size: \`135,241,030 bytes\`.
- Digest: \`sha256:3bfda8cfaebe01e6808861cbf675b5d8f069cf8f2fde81e5bf514154d505d975\`.
- Multi-case runtime fixture: \`QuickCup-MultiCase-Windows-runtime\`.
- Fixture artifact id: \`11268047374\`.
- Size: \`326,073,834 bytes\`.
- Digest: \`sha256:b7e56eb16b0c5138894c9ae12ec02055be4be02d0ebaaa2bfcffe2389ba5bc6c\`.

### Promotion state
- No merge to \`main\`.
- No public release created.
- Public release remains **v1.4.5**.
- Ribbon branch is validated and ready for user review / later promotion.

## 2026-10-03 — v1.4.8 scientific workspace: advanced streamlines, independent views and 3D-defined profiles

- Development branch: `development/v1.4.8-scientific-workspace`.
- Validated product head: `aee2581127c3771b93b4c7fda3177009dd25c652`.
- Base executable/version identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no release-version promotion was performed.
- This line implements the next three prioritized scientific-workspace improvements after the ribbon validation.

### 1. Advanced streamline controls

#### Density bug resolved
- The UI had advertised up to 400 streamline seeds, but `fvSeedPlane()` internally clamped the request to 64.
- The seed-count contract is now 1–400 and the requested Plane/Line/Box count is honored exactly.
- Regression evidence:
  - Plane request 100 -> 100 seeds;
  - Plane request 400 -> 400 seeds;
  - Line request 73 -> 73 seeds;
  - Box request 125 -> 125 seeds.
- The packaged real-case smoke also reports `streamlineSeed400 = 400`.

#### New seeding modes
- Plane.
- Line.
- Box / Volume.
- Boundary patch.
- Boundary-patch mode seeds from actual OpenFOAM boundary faces, ignores processor patches and nudges the seed toward the owner-cell center to avoid immediate integration outside the domain.

#### Integration controls
- Forward / Backward / Both direction.
- Integration step expressed as a percentage of domain diagonal.
- Maximum integration steps per direction.
- Maximum physical path length expressed as a percentage of domain diagonal.
- Streamline metadata now reports actual seed count, generated streamline count and integration-point count.

#### Integration regression
- Uniform-field regression verifies forward and backward propagation.
- Maximum path length is enforced from accumulated geometric distance.
- Both-direction integration produces the combined two-sided path rather than silently behaving as a forward-only trace.
- Synchronized View 2 now uses the same advanced streamline settings rather than the previous Plane-only defaults.

### 2. Independent multi-view cameras and visual settings

#### Camera control
- Added `Link cameras` ON/OFF.
- Added `Re-sync`.
- Added `Fit all`.
- When cameras are linked, View 2 / additional views continue to derive camera orientation and relative distance from the primary view.
- When cameras are unlinked, each comparison viewport owns its own camera state and supports independent orbit, pan, wheel zoom and fit.

#### Visual synchronization
- Added `Sync visual settings` ON/OFF.
- With sync enabled, comparison views retain the shared visual behavior.
- With sync disabled, View 2 can independently control:
  - colormap;
  - opacity;
  - surface visibility;
  - mesh edges;
  - Slice;
  - Iso;
  - Vectors;
  - Streamlines.
- Views 3/4 can independently control:
  - colormap;
  - opacity;
  - surface visibility;
  - mesh edges;
  - Slice;
  - Iso.
- Independent visual mode also prevents the comparison view from forcing a shared display range onto the primary viewport.

#### Runtime evidence
- The packaged WebView2 smoke disables camera linking, zooms View 2 and verifies:
  - `independentCameraChanged = true`;
  - `primaryCameraUnaffected = true`.
- The same smoke disables visual synchronization, applies View 2 opacity independently and verifies:
  - `independentVisualApplied = true`;
  - `linkedCameras = false`;
  - `syncedVisuals = false`.
- Existing View 2 local legend and Probe-marker runtime checks continue to pass.

### 3. Spatial Profile defined directly from the 3D geometry

#### Interactive workflow
- Added `Draw profile` to Field Workspace and the 3D/Field ribbon.
- The user selects point A and point B directly on rendered 3D geometry.
- Picking reuses the same rendered-geometry ray-casting path as the existing Probe tool rather than estimating coordinates from screen position.
- A high-contrast A→B overlay is rendered on the 3D viewport and follows camera redraws.
- Line sampling is configurable from 20 to 500 samples; default is 160.
- Added `Clear line`.

#### Native Spatial Profile integration
- The A→B result is inserted into FoamLens as a normal Spatial Profile series rather than a separate ad-hoc plot.
- Generated series metadata includes:
  - `datasetType = profile`;
  - `profileAxis = s`;
  - `profileLine = 3D A→B`;
  - `profileCoordUnit = m`;
  - `derivedKind = field3d_line_profile`;
  - saved point A / point B / sample count.
- Sampling reuses `fwSampleFieldAtPoint()` and the currently loaded 3D field.
- The same derived profile is refreshed when the active 3D frame changes.

#### Real QuickCup runtime evidence
- B13 real-case smoke at the established late-time reference generated:
  - 160 requested profile samples;
  - 160 finite samples;
  - `profile3DDerivedKind = field3d_line_profile`;
  - `profile3DError = ""`;
  - A→B length = `0.05586143571373727 m`.
- The companion remains the normal Spatial Profile workflow.

### Ribbon integration
- 3D / Field ribbon now exposes:
  - Profile line;
  - Link cameras;
  - Re-sync;
  - Visual sync;
  - Fit all.
- Active state is reflected for Profile line, Link cameras and Visual sync.

### Regression history
- Run #507 validated the advanced-streamline implementation independently: **SUCCESS**.
- Runs #508–#513 exposed stale exact-source assertions in the historical comparison test after camera/legend signatures changed; real QuickCup regression continued to pass. Those tests were updated to validate linked-or-independent camera behavior and palette-aware per-viewport legends.
- Run #514 then completed the full scientific/UI suite, portable smoke, installer smoke and artifact upload successfully.
- Run #518 intentionally strengthened the packaged smoke for independent camera/visual behavior and initially failed because the smoke attempted to access encapsulated `fvState` from global WebView2 scope. Product behavior was not the failing condition.
- The comparison runtime API now exposes primary and comparison view state through `getViewStates()`, and the smoke validates through that public API instead of breaking module encapsulation.

### Final validation
- GitHub Actions run **#520** (`37108477817`): **SUCCESS**.
- Tested product head: `aee2581127c3771b93b4c7fda3177009dd25c652`.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full scientific/UI regression suite: **SUCCESS**.
- 3D Difference regression after independent-view changes: **SUCCESS**.
- Field View / pointField / decomposed mesh / dynamic mesh / iso-surface / Probe / surface-field regressions: **SUCCESS**.
- Advanced streamline regression: **SUCCESS**.
- A→B Spatial Profile regression: **SUCCESS**.
- Ribbon / bilingual / overflow regressions: **SUCCESS**.
- Portable Windows build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- Portable checksum: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Run #520 packaged evidence
- Real B13 reference remained:
  - 6400 cells;
  - 13122 points;
  - `T` at `t = 9.8 s`;
  - min `1417.57 K`;
  - max `1481.90 K`;
  - span `64.33 K`;
  - WebGL error `0`.
- Advanced streamline controls mounted: true.
- 400 requested Plane seeds -> 400 actual seeds.
- 3D A→B profile: 160 points / 160 finite values / `0.05586143571373727 m`.
- Independent View 2 camera changed while primary camera remained unchanged.
- Independent View 2 visual settings applied successfully.
- View 2 local legend remained visible and Probe marker remained functional.

### Candidate artifacts
- Windows build artifact: `FoamLens-Windows-v1.4.6`.
- Artifact id: `11268294037`.
- Size: `135,247,453 bytes`.
- Digest: `sha256:6680f3d074c517faf2d05fff304c4afda69f22bd3cebb4aab2aef5e6cb1dba22`.
- Multi-case runtime fixture: `QuickCup-MultiCase-Windows-runtime`.
- Fixture artifact id: `11269275359`.
- Size: `326,073,834 bytes`.
- Digest: `sha256:24f48cfa5abb90851ba7b9bc3c241fb025a988d6d3078e4cbf7dcd31bda2e442`.

### Scientific validation boundary
- The streamline implementation is covered by analytical/unit regressions, full application regressions and real QuickCup packaged-runtime smoke.
- Direct path-by-path comparison of representative FoamLens streamlines against ParaView/VTK has **not yet been performed**.
- Therefore this work should not yet be described as ParaView-validated or thesis-grade streamline equivalence until that cross-tool validation is completed.

### Promotion state
- No merge to `main`.
- No public release created.
- Public release remains **v1.4.5**.
- The `development/v1.4.8-scientific-workspace` product head is validated and ready for user review / later promotion.

## 2026-10-03 — v1.4.9 scientific compare, thesis export and progressive performance validated

- Development branch: \`development/v1.4.9-compare-export-performance\`.
- Validated product head: \`dd20752a957bf196728dce0922921b37f48655e8\`.
- Base executable/version identity remains FoamLens Desktop v1.4.6 / frontend v51 on this development branch; no public version bump or release promotion was performed.
- This line implements the next three prioritized blocks after the v1.4.8 scientific workspace: advanced 3D comparison, thesis/paper multi-panel export, and progressive performance/cache behavior.

### 1. Scientific 3D comparison

#### Physical-time synchronization
- View 2 / comparison views now support:
  - \`Exact\`;
  - \`Nearest\`;
  - \`Interpolated\`.
- Added \`fcTimeBracket()\`, \`fcResolveTime()\`, \`fcInterpolateValues()\` and synchronized scalar/vector loaders.
- Interpolated frames retain the requested physical target time and report the two source times plus interpolation weight.
- Per-viewport time badges are now visible for:
  - A / primary;
  - B / View 2;
  - C / View 3;
  - D / View 4;
  - Difference.
- Nearest mode displays \`Δt\`; Interpolated mode displays its lower↔upper source times.

#### Interpolation safety
- FoamLens refuses temporal interpolation instead of fabricating a result when the two bracketing frames are not scientifically compatible.
- Interpolation is rejected if:
  - field association/storage changes;
  - field dimensions change;
  - field array sizes differ;
  - meshes are not equivalent under the existing strict mesh-equivalence check.
- Vector fields use the same synchronization model. Bracketing vector frames are loaded against compatible meshes and each vector component is interpolated independently.
- Decomposed OpenFOAM vector fields continue to use the existing partition reconstruction path before interpolation.

#### Generalized 3D Difference
- Added Difference modes:
  - Signed: \`A − B\`;
  - Absolute: \`|A − B|\`;
  - Percent of primary A: \`100·(A − B)/max(|A|, ε)\`.
- Added configurable percent epsilon \`ε\` to protect near-zero denominators.
- Signed and Percent use a symmetric difference range; Absolute uses a nonnegative range.
- Difference labels now explicitly identify Signed / Absolute / Percent instead of always describing the viewport as signed.
- Difference colormap is mode-aware:
  - Signed / Percent: diverging cool-warm;
  - Absolute: sequential Turbo.

#### Comparison workflow
- Added \`Swap A/B\`.
- Added \`Copy A → B settings\`.
- Copy A→B transfers compatible region / field / component selections and, when visual sync is disabled, primary visual settings into View 2.
- Swap A/B preserves the physical-time reference, changes the primary and comparison cases deterministically, and avoids the former asynchronous component-selection race.
- Ribbon Compare now exposes both workflows directly.

#### Runtime evidence
- WebView2 startup smoke verified:
  - \`syncModes = ["nearest","exact","interpolate"]\`;
  - \`differenceModes = ["signed","absolute","percent"]\`;
  - interpolation smoke at target \`0.25\` between times \`0\` and \`1\` returned \`weight = 0.25\`, \`interpolated = true\`, \`Δt = 0\`;
  - percent-difference smoke for A=10 / B=8 returned \`20\`;
  - View 3 / View 4 time badges mounted.
- Real multi-case packaged smoke executed the public comparison workflows and verified:
  - \`copySettingsApplied = true\`;
  - \`swapApplied = true\`;
  - \`swapRestored = true\`.
- Existing independent-camera, independent-visual, local-legend and Probe-marker smokes continue to pass.

### 2. Thesis / paper multi-panel export

- Added \`desktop/src/FoamLensDesktop/frontend/v16-multipanel-export.js\`.
- Public runtime API: \`window.FoamLensMultiPanelExport\`.
- Automatically discovers available scientific panels from:
  - primary 3D Field View;
  - View 2 / View 3 / View 4;
  - 3D Difference;
  - current 2D plot / Spatial Profile.
- Supports up to four panels in one composition.
- Layout presets:
  - Auto;
  - 1-up;
  - 2-up;
  - 2×2;
  - 3D + Profile.
- Output presets:
  - Thesis \`2400×1600\`;
  - Thesis Hi-Res \`3200×2000\`;
  - Paper \`2400×1800\`;
  - Presentation \`1920×1080\`.
- Multi-panel figures include:
  - A/B/C/D panel labels;
  - case / field / component / time annotations;
  - per-panel scientific range bar and min/max where applicable;
  - optional custom figure title.
- The current plot / Spatial Profile reuses the existing high-resolution export-composition path when available.
- Separate-panel export now uses the same annotated scientific-composition path rather than exporting an unlabeled raw canvas.
- Export is available from the Ribbon \`Export → Multi-panel\`.

#### Runtime evidence
- Packaged and installed WebView2 smoke composed a real two-panel figure from Primary + View 2.
- Verified:
  - \`multiPanelSourceCount = 2\`;
  - width \`2400\`;
  - height \`1600\`;
  - total \`3,840,000\` output pixels.

#### Export boundary
- The final composition canvas is high-resolution.
- 2D plots can be re-rendered through FoamLens's high-resolution plot export path.
- 3D panels are currently sampled from the viewport's existing WebGL canvas. This work does **not** yet provide an arbitrary-resolution offscreen 3D rerender, so the source raster resolution of each 3D panel remains bounded by its rendered viewport.

### 3. Progressive performance, cache telemetry and viewport-aware loading

#### Progressive frame presentation
- Field View now presents the main surface, statistics, legend and time/status first.
- FoamLens then yields through \`requestAnimationFrame\` so the browser can paint before constructing heavier derived geometry.
- Slice / Iso are built after that paint opportunity.
- Streamlines and prefetch continue after the main frame presentation.
- The existing frame sequence guard is re-checked after the yield, so stale frame work is still cancelled.

#### Adaptive prefetch
- Added \`desktop/src/FoamLensDesktop/frontend/v16-progressive-performance.js\`.
- Prefetch detects navigation direction instead of always loading a fixed neighboring pattern.
- Prefetch depth adapts to observed frame latency:
  - slower frame history → more frames ahead;
  - faster frame history → smaller look-ahead.
- One frame behind the current navigation direction remains eligible for quick reversal.
- Prefetch uses the existing field cache (\`fvLoadFieldSetCached\`) rather than maintaining a duplicate cache.
- Idle scheduling uses \`requestIdleCallback\` where available, with a non-blocking fallback.
- Prefetch is cancelled when Field Workspace is hidden or when the document becomes hidden.

#### Viewport-aware loading
- Visible additional 3D comparison viewports are refreshed concurrently.
- Off-screen additional views are deferred to idle work.
- Video export deliberately bypasses that optimization and uses the exhaustive original refresh path so exported frames are complete.

#### Telemetry
- Added a \`Performance / cache\` panel and Ribbon \`View → Performance\`.
- Telemetry includes:
  - last frame time;
  - average frame time;
  - prefetch hit rate;
  - mesh reuse / mesh build counts;
  - field-cache entries / memory;
  - deferred viewport count.
- Existing GPU/mesh buffers continue to be reused when the mesh remains unchanged; the new work exposes and measures that reuse rather than claiming a separate GPU architecture.

#### Real-case runtime evidence
- Run #539 packaged smoke on the B13-derived runtime fixture reported:
  - \`performancePanelMounted = true\`;
  - \`performanceLoads = 6\`;
  - \`performanceCacheEntries = 4\`;
  - portable \`performanceLastMs ≈ 507.7 ms\`;
  - portable \`performanceAvgMs ≈ 2085.35 ms\`.
- Installed smoke reported approximately:
  - \`performanceLoads = 6\`;
  - \`performanceCacheEntries = 4\`;
  - \`performanceLastMs ≈ 520.9 ms\`;
  - \`performanceAvgMs ≈ 2017.45 ms\`.
- These numbers are runtime telemetry from the smoke sequence, **not** a controlled before/after benchmark and must not be presented as a measured percentage speedup.

### Ribbon integration
- Compare:
  - Swap A/B;
  - Copy A→B.
- Export:
  - Multi-panel.
- View:
  - Performance.

### Automated coverage
- Updated \`desktop/tests/field-compare.test.cjs\` to cover:
  - exact / nearest / interpolated physical-time resolution;
  - interpolation bracketing and weights;
  - rejection outside the available time range;
  - safe scalar and vector interpolation guards;
  - signed / absolute / percent differences;
  - epsilon protection;
  - mode-specific ranges / palettes;
  - per-viewport time badges;
  - Swap A/B and Copy A→B workflow exposure.
- Added \`desktop/tests/multipanel-performance.test.cjs\` covering:
  - multipanel source discovery and composition;
  - Thesis / Paper / Presentation presets;
  - 1-up / 2-up / 2×2 / 3D+Profile layouts;
  - scientific labels / ranges;
  - annotated individual-panel export;
  - progressive rendering yield ordering;
  - stale-frame cancellation;
  - direction-aware adaptive prefetch;
  - cache telemetry;
  - viewport-aware loading;
  - exhaustive video-export exception;
  - ribbon discoverability.
- Workflow now runs **60** scientific/UI regression steps before packaging.

### Regression / validation history
- Early runs #522–#529 were development checkpoints while implementation and exact-source tests were changing.
- Run #529 reached the strict 3D Difference test; the remaining failure was a stale assertion requiring \`coolwarm\` for every Difference mode. The product had intentionally become mode-aware, using Turbo for Absolute and cool-warm for Signed/Percent.
- The regression was updated to require the mode-aware behavior rather than the obsolete fixed palette.
- Run #532 then completed the full 60-test suite, portable smoke, installer smoke and artifact upload successfully with interpolation, multipanel and performance runtime checks.
- Run #538 completed successfully after final comparison-label and annotated-export refinements.
- Run #539 strengthened the packaged runtime smoke again by actually executing Copy A→B, Swap A/B, and Swap back to the original state. All three operations passed in the portable and installed application.

### Final validation
- GitHub Actions run **#539** (\`37110806229\`): **SUCCESS**.
- Validated product head: \`dd20752a957bf196728dce0922921b37f48655e8\`.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full 60-test scientific/UI suite: **SUCCESS**.
- Strict 3D Difference: **SUCCESS**.
- Interpolation / percent-difference runtime math: **SUCCESS**.
- Multi-panel composition runtime smoke: **SUCCESS**.
- Progressive-performance telemetry runtime smoke: **SUCCESS**.
- Copy A→B runtime smoke: **SUCCESS**.
- Swap A/B + restore runtime smoke: **SUCCESS**.
- Existing Field View / Probe / multi-view / streamlines / 3D-profile regressions: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable runtime smoke: **SUCCESS**.
- Portable checksum: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application runtime smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Candidate artifacts
- Windows build artifact: \`FoamLens-Windows-v1.4.6\`.
- Artifact id: \`11270101823\`.
- Size: \`135,272,548 bytes\`.
- Digest: \`sha256:7d6d7ef5d793a335f805f53939251fe3a4a2c88cc5d425b9785a72e04ec490ef\`.
- Multi-case runtime fixture: \`QuickCup-MultiCase-Windows-runtime\`.
- Fixture artifact id: \`11269927034\`.
- Size: \`326,073,834 bytes\`.
- Digest: \`sha256:b1cc5153349936ba6fb65d9a189637d7f1dc1ab1e8bd73e1cc1ca61a53ea22ed\`.

### Remaining scientific / performance boundaries
- Streamline path-by-path comparison against ParaView/VTK remains pending; the streamline module should not yet be described as ParaView-equivalent.
- Progressive-performance mechanisms are active and instrumented, but no controlled before/after benchmark has been run, so no quantitative speedup claim is warranted.
- High-resolution multipanel composition does not yet rerender WebGL 3D scenes offscreen at arbitrary export resolution.

### Promotion state
- No merge to \`main\`.
- No public release created.
- Public release remains **v1.4.5**.
- \`development/v1.4.9-compare-export-performance\` is validated and ready for user review / later promotion.

## 2026-10-03 — FoamLens Desktop v1.4.9 public release published

- Release tag: `v1.4.9`.
- Release name: **FoamLens v1.4.9**.
- GitHub release id: `402430264`.
- Published at: `2026-10-03T09:15:07Z`.
- Release commit / tag source: `597d8d2a9d6fa35a1745e1ee713fb72f7faddf47`.
- Promotion method: clean non-forced fast-forward of `main` after rebuilding the release commit on top of the previous `main` head so the main-only roadmap/audit history was preserved.
- Pull request #6 is closed as merged at the same release commit.
- GitHub Actions run **#542** (`37112111383`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Full 60-test scientific/UI regression suite: **SUCCESS**.
- Portable Windows executable build and packaged runtime smoke: **SUCCESS**.
- Installer build and installed-application runtime smoke: **SUCCESS**.
- Publish GitHub Release step: **SUCCESS**.

### Public release assets
- `FoamLens-Portable-v1.4.9.exe`
  - asset id: `607513824`
  - size: `73,101,447 bytes`
  - digest: `sha256:b81626968d6c9a4e9868c7cd9621c99e90ba82a9ca3ab381cccf5ba4d7c6bb8e`
- `FoamLens-Portable-v1.4.9.exe.sha256`
  - asset id: `607513823`
  - size: `96 bytes`
  - digest: `sha256:60351c726c897136f7b6df2b870f30a508f4dfd50a9a5c8f69aacc9f9667aaef`
- `FoamLens-Setup-v1.4.9.exe`
  - asset id: `607513821`
  - size: `67,928,528 bytes`
  - digest: `sha256:444c6d616bafe5a87b3efc21ee62de9945881b3f9ebda06b4ad8df0fd89ca80c`

### Actions artifact
- `FoamLens-Windows-v1.4.9`
  - artifact id: `11270470033`
  - size: `135,272,702 bytes`
  - digest: `sha256:80cca9523ef6c3f1208766e276b618b1bcde1c9bb122cf54c35e658913de9b22`

### State
- **v1.4.9 is now the current public FoamLens Desktop release.**
- Release is not marked draft or prerelease.

## 2026-10-05 — v1.5.0 validation/export/performance boundaries closed

- Development branch: \`development/v1.5.0-validation-export-benchmark\`.
- Validated product head: \`01845b0bce089c910dfd054c380724ab1638f6cf\`.
- Public release remains **FoamLens Desktop v1.4.9**. No version bump, merge to \`main\`, or public release was performed.
- This development line closes the three scientific / export / performance boundaries left explicitly open after v1.4.9:
  1. independent streamline geometry validation against VTK;
  2. true high-resolution WebGL 3D rerendering for multipanel export;
  3. controlled baseline-vs-optimized performance benchmarking.

### 1. Independent streamline validation against VTK

#### Reference implementation
- Added \`desktop/tests/streamline-vtk-reference-input.cjs\` to generate deterministic B13 streamline inputs directly from the real OpenFOAM mesh and \`U\` field.
- Added \`desktop/tests/vtk_streamline_reference.py\` using:
  - VTK 9.7.1;
  - \`vtkOpenFOAMReader\`;
  - \`vtkCellDataToPointData\`;
  - \`vtkStreamTracer\`;
  - Runge-Kutta 2;
  - the same fixed integration step and directional propagation budget used by FoamLens.
- The workflow installs VTK independently and produces a retained \`FoamLens-VTK-streamline-validation\` artifact.

#### FoamLens sampling refinement
- Field View now exposes mesh-aware vector interpolation for streamline integration:
  - cell→point vector reconstruction;
  - tetrahedral local interpolation;
  - explicit containing-cell lookup;
  - reusable mesh vector sampler.
- Streamline integration keeps the existing RK2 trajectory integration but can now consume the mesh-aware sampler instead of the older nearest/IDW-only path.

#### VTK Both-direction topology correction
- Diagnostic runs #614–#623 showed that VTK \`IntegrationDirection=Both\` returns **two output polyline cells per seed** (forward and backward), while FoamLens exposes one combined bidirectional polyline.
- The initial validator was therefore comparing one FoamLens combined path against one VTK directional branch and produced misleading Hausdorff errors despite near-identical path lengths.
- Run #624 corrects the comparison without relaxing thresholds:
  - raw VTK output: 16 lines for 8 seeds;
  - VTK forward/backward branches are paired by seed and combined into 8 bidirectional paths;
  - VTK maximum propagation uses the same effective per-direction fixed-step budget as FoamLens;
  - FoamLens path i is compared directly against the reconstructed VTK path for the same seed.

#### B13 validation result
- Case: real B13-derived OpenFOAM fixture.
- Region: \`metal\`.
- Field: \`U\`.
- Physical time: \`9.8 s\`.
- Compared deterministic seed paths: **8**.
- Effective propagation per direction: \`0.022748468080290594 m\`.
- VTK raw lines: **16**.
- Reconstructed VTK bidirectional lines: **8**.
- Metrics normalized by domain diagonal:
  - mean RMS distance: \`0.001079412105434675\`;
  - worst RMS distance: \`0.005370900274556226\`;
  - worst Hausdorff distance: \`0.012707557766339842\`;
  - mean relative path-length difference: \`1.4196553839305338e-08\`.
- Validation thresholds remained:
  - mean RMS / diagonal ≤ \`0.06\`;
  - worst RMS / diagonal ≤ \`0.10\`;
  - worst Hausdorff / diagonal ≤ \`0.16\`;
  - mean relative length difference ≤ \`0.35\`.
- Result: **PASS**.
- This closes the previous “not independently VTK-validated” boundary for the representative B13 validation configuration. It should still not be generalized to every possible ParaView integration/interpolation setting without matching those settings explicitly.

### 2. True high-resolution 3D multipanel rendering

- Primary Field View renderer now accepts an explicit render size.
- View 2, Difference, and extra comparison views also accept explicit render sizes.
- Public runtime APIs:
  - \`FoamLensFieldView.renderAtSize(width,height)\`;
  - \`FoamLensFieldCompare.renderAtSize(key,width,height)\`.
- \`v16-multipanel-export.js\` now rerenders WebGL 3D sources at the target panel pixel dimensions before composition instead of scaling the existing low-resolution viewport raster.
- After each export render, the original viewport pixel dimensions are restored in a \`finally\` path.

#### Runtime evidence
- Portable packaged smoke requested a primary 3D rerender at **1800×1200**.
- Installed-app smoke repeated the same operation.
- Both reported:
  - \`hiRes3DWidth = 1800\`;
  - \`hiRes3DHeight = 1200\`;
  - \`highResRerendered = true\`;
  - \`primaryRestored = true\`.
- The resulting two-panel scientific composition remained **2400×1600 = 3,840,000 pixels**.
- Existing case/field labels, legend, Probe and independent-view behavior continued to pass after the high-resolution render/restore cycle.

### 3. Controlled performance A/B benchmark

#### Benchmark method
- Added explicit runtime modes:
  - \`baseline\`;
  - \`optimized\`.
- Baseline disables the optimizations being measured:
  - progressive browser-paint yield;
  - adaptive field prefetch;
  - viewport-aware deferred comparison-view loading.
- Optimized mode enables those behaviors.
- Each pass:
  - uses the same stored field-frame sequence;
  - clears FoamLens field cache / inflight state;
  - resets pass telemetry.
- Two rounds alternate execution order:
  - round 1: baseline → optimized;
  - round 2: optimized → baseline.
- Packaged smoke uses 3 frames × 2 rounds = **6 baseline samples + 6 optimized samples**.
- Report schema: \`foamlens-performance-ab-v1\`.
- The smoke requires finite metrics but does **not** require a positive speedup; measured results are reported as observed.

#### Portable Windows smoke result
- Baseline mean: \`725.5666666667288 ms\`.
- Optimized mean: \`671.3166666666511 ms\`.
- Baseline median: \`673.5000000001164 ms\`.
- Optimized median: \`652.1999999999534 ms\`.
- Baseline p95: \`911.5 ms\`.
- Optimized p95: \`744.6999999999534 ms\`.
- Speedup factor: \`1.0808113408973592×\`.
- Mean-time reduction: **7.476914595498646%**.

#### Installed-app smoke result
- Baseline mean: \`740.4166666666279 ms\`.
- Optimized mean: \`677.75 ms\`.
- Baseline median: \`725.75 ms\`.
- Optimized median: \`671.8999999999069 ms\`.
- Baseline p95: \`1005 ms\`.
- Optimized p95: \`776.3000000000466 ms\`.
- Speedup factor: \`1.0924628058526415×\`.
- Mean-time reduction: **8.46370287000083%**.

#### Interpretation boundary
- The benchmark demonstrates a repeatable improvement under the B13 smoke workload on GitHub-hosted Windows runners.
- These percentages are **not** claimed as universal application speedups; different hardware, cases, fields, viewport layouts and cache states may produce different results.

### Automated / runtime validation
- GitHub Actions run **#624** (\`37296824298\`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline comparison: **SUCCESS**.
- Full 60-test scientific/UI regression suite: **SUCCESS**.
- Multi-panel / progressive-performance regression: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable smoke including benchmark and high-resolution WebGL rerender: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installed-application smoke including benchmark and high-resolution WebGL rerender: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Validation artifacts
- \`FoamLens-VTK-streamline-validation\`
  - artifact id: \`11340285640\`;
  - size: \`30,899 bytes\`;
  - digest: \`sha256:4701a1c0944fa53b63cbdaadb5a53ae2d447ab54f2acd745dd949fc10d334342\`.
- \`QuickCup-MultiCase-Windows-runtime\`
  - artifact id: \`11340725615\`;
  - size: \`326,074,466 bytes\`;
  - digest: \`sha256:cebe5547d1b2bf4664505180915c7b67fe496d21a726a4accf5107fe3a19cc2e\`.
- \`FoamLens-Windows-v1.4.9\`
  - artifact id: \`11340051662\`;
  - size: \`135,280,604 bytes\`;
  - digest: \`sha256:739c8fcfef7dfe3efd349fb24c827a21c73ddb73f3c91bc5244661e8187364a0\`.

### State
- The three previously explicit boundaries are now closed on this development branch:
  - representative B13 streamline geometry independently validated against VTK;
  - 3D WebGL export rerendered at requested high-resolution pixel dimensions;
  - controlled before/after performance benchmark executed and measured.
- No merge to \`main\`.
- No new public release.
- Public FoamLens release remains **v1.4.9**.

## 2026-10-05 — persistent workspace UX validated

- Development branch: `development/v1.5.0-validation-export-benchmark`.
- Validated product head: `a97d26f33c01c34eafba2d4ab3c6f931798452df`.
- Public release remains **FoamLens Desktop v1.4.9**. No merge to `main` and no public release were performed.

### Persistent Field Workspace
- Added `v17-workspace-ux.js`.
- FoamLens now stores/restores locally:
  - Split / 3D focus / Plot focus layout;
  - companion plot selection;
  - physical-time follow toggle;
  - comparison enabled state and visible comparison-view count;
  - Difference enabled state and time-sync mode;
  - linked/independent camera state;
  - linked/independent visual-settings state;
  - per-view display names A–D;
  - draggable panel sizes.
- Added Reset layout, which restores the predictable Split + Spatial Profile + linked-camera/visual defaults without modifying OpenFOAM data.

### Per-view names / provenance preservation
- Views A–D may be renamed for presentation use.
- Presentation labels are prepended to, rather than substituted for, the scientific case / field / time labels.
- The implementation keeps the original scientific label in dedicated dataset attributes before applying an alias, preventing repeated refreshes from progressively stripping provenance.

### Comparison status strip
- Added an always-visible comparison summary while Compare 3D is active.
- It reports:
  - A and B case/time context;
  - Exact / Nearest / Interpolated time state and Δt where relevant;
  - same/different physical quantity compatibility;
  - linked/independent cameras;
  - linked/independent visual settings;
  - Difference mode;
  - selected synchronization mode.

### Contextual help / discoverability
- Added `v18-context-help-resize.js`.
- Added Ribbon **View → Help** plus the `?` keyboard shortcut.
- Contextual help covers:
  - Field Workspace;
  - 3D Compare;
  - Scientific Export;
  - View & Layout.
- Escape closes the overlay.
- Help explicitly documents Exact / Nearest / Interpolated sync, comparison status, high-resolution 3D export, view-name semantics and splitter behavior.

### Resizable workspace panels
- Added two draggable vertical splitters:
  - 3D ↔ companion plot;
  - companion plot ↔ controls.
- Minimum widths protect scientific readability:
  - 3D: 280 px;
  - companion plot: 280 px;
  - controls: 260 px.
- Splitter sizes persist in the same Field Workspace state.
- At responsive widths ≤1100 px, splitters are disabled and the workspace stacks vertically instead of forcing desktop dimensions.

### Ribbon integration
- View tab now exposes:
  - View names;
  - Reset layout;
  - Help.
- Existing Performance / Fit / Sidebar / appearance controls remain intact.

### Automated/runtime validation
- Added `desktop/tests/workspace-ux.test.cjs`.
- Added `desktop/tests/context-help-resize.test.cjs`.
- CI suite increased from 60 to **62** tests and the manifest verifies each test runs exactly once.
- Packaged WebView2 runtime smoke now requires:
  - `uxViewNamesPanel`;
  - `uxComparisonStatus`;
  - `uxSplitterA`;
  - `uxSplitterB`;
  - `hrHelpOverlay`;
  - live `FoamLensWorkspaceUx`, `FoamLensWorkspaceResize` and `FoamLensContextHelp` APIs;
  - exactly two workspace splitters.
- GitHub Actions run **#651** (`37303650253`): **SUCCESS**.
- Real QuickCup/B13 regression: **SUCCESS**.
- Independent VTK streamline validation: **SUCCESS**.
- Full 62-test scientific/UI suite: **SUCCESS**.
- Portable build and packaged WebView2 smoke: **SUCCESS**.
- Installer build and installed-app smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Validation artifacts
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11343186219`;
  - size: `30,899 bytes`;
  - digest: `sha256:725152631b566d559106d48e687148fb8603f1b0287b64d208db06da510bc8f8`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11342128295`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:9a0dfe979e3c9d615b09868762c28e037b80157f715bc9819ed20f7f5ca414af`.
- `FoamLens-Windows-v1.4.9`
  - artifact id: `11342907254`;
  - size: `135,286,428 bytes`;
  - digest: `sha256:42e8184b4e26cc7ddff820415d104c24cb5bf46c6524158d49921f3d50e1ef0c`.

### State
- The P2 Workspace / usability items recorded in the original post-v1.4.5 roadmap are now materially closed:
  - persistent layout;
  - per-view naming;
  - compact comparison status;
  - interaction/help discoverability;
  - resizable Field Workspace panels.
- The next incomplete P0 block is vector-glyph analysis: normalized/proportional length, ROI sampling and quantitative sampling validation.

## 2026-10-05 — Infrastructure / cloud audit

Added `docs/INFRASTRUCTURE_AUDIT.md`.

FoamLens remains intentionally local-first for scientific case data. No Google/Supabase backend is required for core analysis. Current infrastructure priorities are automatic updates, version/license reconciliation, shared About migration and preservation of current-HEAD CI validation. Any future cloud feature must be opt-in and must not silently upload OpenFOAM case data.

## 2026-10-05 — Michel's Lab parent/child governance contract

Added the repository-level Michel's Lab governance declaration:

- `.michelslab/project.yml` identifies `realmichelduarte/Michel-Software-Standards` as the shared standards authority.
- `MICHELS_LAB_PROJECT.md` documents the human-readable reporting contract.
- App-specific implementation evidence remains in this repository.
- Reusable/cross-app decisions are promoted to the master standards repository.
- The master repository polls child status centrally; this repository receives no credential that can write to the master.
- Secret values remain prohibited from both repositories.

## 2026-10-05 — v1.5.0 vector analysis + scientific provenance development

- Development branch: `development/v1.5.0-vector-provenance`.
- Base: current public `main` after FoamLens Desktop v1.4.9 publication.
- This block addresses remaining roadmap items under **Vector glyph analysis controls** and **Scientific provenance in the viewport**.

### Implemented
- Added isolated frontend module: `desktop/src/FoamLensDesktop/frontend/v17-vector-analysis.js`.
- Added vector arrow-length semantics:
  - `Magnitude-proportional`;
  - `Normalized / equal length`.
- Added normalized ROI-box sampling controls for X/Y/Z.
- ROI sampling filters candidate cell centers before glyph selection; cells outside the ROI are not eligible.
- Vector metadata now reports:
  - actual glyph count;
  - requested glyph count;
  - eligible ROI-cell count;
  - length mode;
  - ROI bounds;
  - sampled mean magnitude / ROI-field mean magnitude;
  - sampled magnitude-range coverage.
- Added scientific provenance overlay to the primary 3D viewport.
- Added provenance overlays to synchronized View 2 / View 3 / View 4.
- Provenance exposes case, region, field, association, unit when available, physical time, dimensions, synchronization context for comparison views, parser/reconstruction context and source identity.
- Existing v1.4.9 Field View engine remains intact; v17 extends the already-validated module rather than rewriting v14.

### Regression coverage
- Added `desktop/tests/vector-analysis.test.cjs`.
- Workflow now executes the vector-analysis regression exactly once.
- The existing CI manifest will require the new test to remain wired because it checks every `.test.cjs` file against the workflow.

### Direct validation on repository content
- v17 JavaScript syntax validation: **PASS**.
- ROI test with normalized X bounds `0.5–1.0`: selected only cells inside the requested ROI.
- Normalized-length test: two different vector magnitudes produced equal glyph shaft lengths.
- Magnitude-proportional test: the larger vector produced a longer glyph shaft.
- Comparison provenance tokens for A/B/C/D are present.
- Workflow reference count for `vector-analysis.test.cjs`: exactly **1**.

### Validation status
- Latest full CI head: `b6bc2a5e0b10c0df057b0b6a23e4462e8b67e4ae`.
- GitHub Actions run **#664** (`37371845965`) was queued at the time of this log entry.
- This block is **implemented but not yet marked fully validated** until the complete QuickCup + Windows packaging workflow passes.
- No merge to `main`.
- No release created.

## 2026-10-05 — v1.5.0 unified integration candidate

- Integration branch: `integration/v1.5.0-unified`.
- Base block: validated VTK streamline / high-resolution export / controlled performance benchmark / workspace UX branch.
- Integrated block: vector glyph ROI + normalized/proportional length semantics + quantitative sampling metrics + scientific provenance overlays + Michel's Lab governance/infrastructure declarations.
- CI workflow now retains independent VTK validation and also runs `vector-analysis.test.cjs` exactly once.
- No merge to `main` and no public release at this stage; full unified CI validation is required first.

## 2026-10-05 — v1.5.0 CI version-transition incident

The Michel's Lab master governance audit surfaced FoamLens CI as red during the Desktop v1.5.0 release transition.

Evidence:
- failed Windows build runs stopped at `desktop/tests/version-consistency.test.cjs`;
- the failing assertion still expected Desktop `1.4.9` while release work had already advanced the project to `1.5.0`;
- the current default-branch version-consistency test now expects Desktop `1.5.0` and the README identifies Desktop v1.5.0 / frontend v51;
- a newer v1.5.0 workflow run completed successfully;
- the final main-branch publication workflow was still running at the time of this audit note.

Impact:
- the earlier red runs represent an intermediate release-transition mismatch, not evidence that the scientific regression suite itself failed;
- no additional conflicting code patch was applied while the v1.5.0 publication pipeline was active.

Status: **fix present / final main publication validation pending**.



## 2026-10-05 — FoamLens Desktop v1.5.0 public release closed

- Public tag: `v1.5.0`.
- Release name: **FoamLens v1.5.0**.
- GitHub release id: `404110768`.
- Published at: `2026-10-05T21:39:43Z`.
- Main release commit: `d0dcee996b7d0b9068a0475824a243256b103f8d`.
- Promotion PR: **#10**, merged successfully.
- Final publication workflow: GitHub Actions run **#674** (`37376581634`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Full scientific/UI regression suite including vector ROI/provenance, Field Workspace, Probe, synchronized multi-view, strict 3D differences, export and bilingual UI: **SUCCESS**.
- Portable Windows build and packaged smoke test: **SUCCESS**.
- Installer build and installed-application smoke test: **SUCCESS**.
- GitHub Release publication: **SUCCESS**.

### Public release assets
- `FoamLens-Portable-v1.5.0.exe`
  - asset id: `613670549`;
  - size: `73,129,095 bytes`;
  - digest: `sha256:206b583411204a51aa06d291a1ab4583d6846d01966c29c05dc9d8f7d33bd844`.
- `FoamLens-Portable-v1.5.0.exe.sha256`
  - asset id: `613670551`;
  - size: `96 bytes`;
  - digest: `sha256:f0992a3e0b6a90afe7edb2e3dd66b3ade072195d8258aea8f9886344e6686731`.
- `FoamLens-Setup-v1.5.0.exe`
  - asset id: `613670548`;
  - size: `67,953,164 bytes`;
  - digest: `sha256:8d201b50859533e851c78c14df2c29616c194dbf09a1989c0a4d385af0525ca7`.

### Final Actions evidence
- Windows artifact: `FoamLens-Windows-v1.5.0`.
  - artifact id: `11371754114`;
  - size: `135,303,440 bytes`;
  - digest: `sha256:4feb96d752e6464c1385900218ad979dcf04cf84357592958453daa7c79ad076`.
- VTK evidence artifact id: `11371333301`.
- Multi-case runtime fixture artifact id: `11371283366`.

### State
- **FoamLens Desktop v1.5.0 is the current public release.**
- The earlier release-transition note that said final publication validation was pending is superseded by run #674.
- There are no open GitHub issues at release closure.


## 2026-10-05 — v1.5.1 verified automatic updater candidate

- Development branch: `development/v1.5.1-auto-update`.
- Public release at candidate creation: **FoamLens Desktop v1.5.0**.
- Candidate Desktop version: **v1.5.1**.
- Purpose: close the infrastructure audit item for an in-app update path without introducing a cloud backend for scientific case data.

### Implemented
- Normal Desktop startup performs a non-blocking query to the official `realmichelduarte/FoamLens` latest GitHub Release endpoint.
- Semantic version comparison suppresses prompts unless the public release is newer than the installed Desktop build.
- Added a manual **Updates / Actualizaciones** Ribbon action.
- The native updater requires both:
  - `FoamLens-Setup-vX.Y.Z.exe`;
  - `FoamLens-Setup-vX.Y.Z.exe.sha256`.
- The installer is downloaded to the user-local FoamLens update cache and verified with SHA-256 before launch.
- A checksum mismatch fails closed; the installer is not launched.
- After a verified installer is started, FoamLens closes so the installer can replace the application cleanly.
- Automatic network checking is disabled during packaged smoke tests.
- Update traffic is limited to public GitHub Release metadata/assets; no OpenFOAM project or simulation data are uploaded.

### Release-pipeline hardening
- CI now creates a SHA-256 file for the installer **after optional Authenticode signing**, so the checksum represents the final distributed binary.
- The installer checksum is included in both the Windows Actions artifact and GitHub Release assets.
- Added `desktop/tests/auto-update.test.cjs` and wired it exactly once into the CI suite manifest.
- Packaged WebView2 smoke now requires the updater Ribbon action and `FoamLensAutoUpdate` frontend API to be mounted.

### Validation state
- Final versioned candidate workflow: GitHub Actions run **#684** (`37378777465`) was running at the time of this entry.
- No merge to `main` and no v1.5.1 public release should occur until the full QuickCup + VTK + Windows portable/installer pipeline is green.


## 2026-10-05 — v1.5.1 automatic updater candidate validated

- Functional candidate head: `ad68941e28cc4a41776cb8058185ab4a675decee`.
- GitHub Actions run **#686** (`37379049218`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Version consistency for Desktop v1.5.1: **SUCCESS**.
- Native automatic-update regression: **SUCCESS**.
- CI suite manifest: **SUCCESS**.
- Portable Windows executable build: **SUCCESS**.
- Packaged portable WebView2 smoke, including updater Ribbon action/API: **SUCCESS**.
- Portable SHA-256 generation: **SUCCESS**.
- Installer build: **SUCCESS**.
- Installer SHA-256 generation: **SUCCESS**.
- Installed-application smoke: **SUCCESS**.
- Windows artifact upload: **SUCCESS**.
- GitHub Release publication: **SKIPPED**, expected for a development branch.

### Candidate validation artifacts
- `FoamLens-Windows-v1.5.1`
  - artifact id: `11373651153`;
  - size: `135,316,277 bytes`;
  - digest: `sha256:c18632ca9353a3c5c27cae66624dca33272aeb2ca969ec3df7913b43b120a4ec`.
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11373117042`;
  - size: `30,899 bytes`;
  - digest: `sha256:b34b120e9964bee2300ce0f2d18bd0952fdf0e7d4fddf485bf6b6260f93fbc57`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11372449964`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:67cf819af33e4a9dcd3bef9b363579e4d4f6f6d2c1198595166c6f504854c20b`.

### Integration correction evidence
- Run #675 was an intermediate integration run: the native smoke test correctly rejected the build because the updater Ribbon module had not yet been added (`flRaCheckUpdates` / `FoamLensAutoUpdate` missing).
- The missing frontend updater module was added immediately afterward; subsequent packaged smoke validation passed.
- Runs during the 1.5.0 → 1.5.1 version-file transition that failed version-consistency checks are superseded by final run #686.

### Promotion state
- PR #11 is the promotion path to `main`.
- The functional candidate is validated and ready for promotion.
- Public v1.5.1 release remains pending the final main-branch publication workflow.


## 2026-10-05 — FoamLens Desktop v1.5.1 public release published

- Release tag: `v1.5.1`.
- Release name: **FoamLens v1.5.1**.
- GitHub release id: `404130001`.
- Published at: `2026-10-05T22:10:41Z`.
- Main release commit: `e2cb2708b5978f58d61450b7772b3dbd970aee8c`.
- Promotion PR: **#11**, merged successfully.
- Final main-branch publication workflow: GitHub Actions run **#687** (`37379871647`): **SUCCESS**.
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Version consistency for Desktop v1.5.1: **SUCCESS**.
- Verified automatic-update regression: **SUCCESS**.
- Portable Windows executable build and packaged runtime smoke: **SUCCESS**.
- Portable SHA-256 generation: **SUCCESS**.
- Installer build and installed-application smoke: **SUCCESS**.
- Installer SHA-256 generation: **SUCCESS**.
- GitHub Release publication: **SUCCESS**.

### Public release assets
- `FoamLens-Portable-v1.5.1.exe`
  - asset id: `613733137`;
  - size: `73,143,943 bytes`;
  - digest: `sha256:75ff7d62fa55f8255692f8aba19e795d8ba048f7a820062f9ad204f1e35d96e5`.
- `FoamLens-Portable-v1.5.1.exe.sha256`
  - asset id: `613733135`;
  - size: `96 bytes`;
  - digest: `sha256:72d1f82dd47e0b13473001a19183a05897550d4ef05e5dc0f039188c38bf8c46`.
- `FoamLens-Setup-v1.5.1.exe`
  - asset id: `613733134`;
  - size: `67,956,240 bytes`;
  - digest: `sha256:5a27c76fa37b01e8289fc297c17f8bf27bf26ff8f70ab0fc2767f4c1bf12b2ff`.
- `FoamLens-Setup-v1.5.1.exe.sha256`
  - asset id: `613733136`;
  - size: `93 bytes`;
  - digest: `sha256:cedac8ef1d96a663c75ed1f092da21d7034d2e2600fb1f4c44fc093fef64da94`.

### Final Actions evidence
- `FoamLens-Windows-v1.5.1`
  - artifact id: `11373184296`;
  - size: `135,315,333 bytes`;
  - digest: `sha256:d139eba3a5a50a8ca8f2dfcc9523ab45952bbfedb005e149d4f0c0c66e6e125b`.
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11374025292`;
  - size: `30,899 bytes`;
  - digest: `sha256:7280635824f444e1de085a2d1c9ea34ba25273a941fa6a7aebcb9fed840b82f1`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11373865984`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:cb088362634d6cad9abb472366d566c998efaf20f0d96c6a06b975a96080ea2f`.

### Automatic-update state
- **FoamLens Desktop v1.5.1 is now the current public release.**
- v1.5.1 checks the official FoamLens GitHub Releases endpoint in the background and also exposes a manual **Updates / Actualizaciones** action.
- Newer installers are offered only after semantic-version comparison and explicit user approval.
- The updater downloads the matching installer checksum and verifies SHA-256 before launching the installer; checksum mismatch fails closed.
- Update checks do not upload OpenFOAM project or simulation data.
- v1.5.0 predates the updater, so moving from v1.5.0 to v1.5.1 is the one-time manual bridge; future releases can be discovered from inside FoamLens.


## 2026-10-05 — UX / information-architecture coherence audit

- Audit branch: `audit/ux-coherence-2026-10-05`.
- Audited baseline: FoamLens Desktop **v1.5.1**, main commit `275427b61ad848c98e351dfb4c6df5a310f5a964`.
- Full report: `docs/UX_COHERENCE_AUDIT_2026-10-05.md`.

### Runtime issues reported and included
- overlapping progress/activity cards during folder/background operations;
- persistent PROJECT / CASE / REGION strip appears ineffective in Field Workspace and wastes vertical space;
- 3D Focus does not reclaim the full content area;
- separate 3D and Spatial Profile playback controls conflict with the desired single global physical-time controller;
- Field Workspace defaults to simultaneous 3D + companion panels instead of one central tabbed view with explicit Split;
- 3D comparison configuration appears in Data even though it belongs to Field/Compare.

### Source-level root causes confirmed
- Field View still contains its legacy identity as a Data dataset tab.
- Field Workspace reparents legacy Data DOM nodes with `fwMove` / `fwRestore` rather than owning independent section UI.
- 3D Compare is injected into generic `fieldViewControls`.
- 3D Focus CSS deliberately keeps a ~340 px controls column.
- Profile and 3D use independent playback engines/timers, with an additional Field synchronization layer.
- Data and Plots Ribbon actions route to the same underlying legacy dataset tabs.
- Compare Ribbon routes through Field rather than owning a separate surface.
- the original monolithic sidebar contains controls for many unrelated modes.
- Data and Analysis share the same core `#workspace`.
- several analysis modules can fall back to generic `.analysisTools` or `document.body` mount points.
- multi-region context is directly coupled to the persistent global Case/Region DOM controls.

### Regression conflicts found
- `ribbon-ui.test.cjs` requires the rejected `globalContextBar`.
- `workspace-ux.test.cjs` requires Reset Layout to restore `split + profile`.
- `context-help-resize.test.cjs` requires the permanent 3D / plot / controls splitter model.
- packaged runtime smoke in `Program.cs` requires 3D + Spatial Profile to remain mounted together.

### Audit conclusion
- **Status: NEEDS STRUCTURAL UX REFACTOR.**
- A CSS-only patch is explicitly rejected as insufficient because tests and ownership rules encode the old architecture.
- Scientific parsing, VTK validation, field reconstruction and numerical-analysis logic were not identified as the cause of these UX issues.
- Recommended development target: **v1.6.0** because the correction changes the information architecture and interaction model.
- No functional code was changed as part of this audit.


## 2026-10-05 — Whole-app cross-scope UX audit extension

- Branch: `development/v1.6.0-ux-coherence`.
- The audit was expanded from the reported Field/Data defects to the complete Desktop frontend module set and the primary UX regression tests.
- Important correction: Project / Case / Region is **not obsolete**. It is useful for Profiles/Data/Logs and analysis context, but its persistent presentation in pure 3D / Field and unrelated modes is incorrect.

### Additional cross-scope findings
- Data Catalog still shares sidebar cards intended for plot editing (Figure, Selected curve, Phase-change, Reference lines).
- Reference Lines combines controls whose applicability depends on the active data view.
- Analysis and Data share the same core workspace/sidebar, so Analysis inherits unrelated Data/plot presentation controls.
- Several analysis modules create derived results by silently switching the hidden underlying Data view to Time Series or Profile.
- Profile playback, legacy `playbackGlobal` and 3D playback are separate presentation engines for the same physical-time concept.
- Field extensions such as Compare, Animation/Video and performance tooling are valid, but are structurally children of legacy Data-owned `fieldViewControls`, allowing leakage if reparent/hide state becomes inconsistent.
- Ribbon Plots is currently a second doorway into Data rather than a distinct workspace.
- Ribbon Compare is currently a second doorway into Field rather than a distinct workspace.
- Legacy Data/Field navigation shims remain active under the newer Ribbon/Field Workspace model.
- Several analysis modules can fall back to generic `.analysisTools` or `document.body` if the intended host is unavailable.

### Updated refactor rule
- Do not remove useful controls merely because they are irrelevant in one tab.
- Preserve shared scientific/application state.
- Scope the presentation to the views that actually consume that state.
- Remove only genuinely duplicate/legacy navigation after equivalent owned surfaces are validated.

### Documentation
- Extended `docs/UX_COHERENCE_AUDIT_2026-10-05.md` with findings UX-18 through UX-29 and the updated scope rule.


## 2026-10-05 — v1.6.0 UX coherence implementation

- Branch: `development/v1.6.0-ux-coherence`.
- Baseline: public FoamLens Desktop v1.5.1.
- Scope: resolve the UX ownership defects documented in `docs/UX_COHERENCE_AUDIT_2026-10-05.md` without changing OpenFOAM parsing or scientific kernels.

### Implemented so far
- Field Workspace default changed from permanent 3D + companion Split to a single **3D** central view.
- Added internal Field tabs: **3D / Spatial Profile / Time Series / Solver Logs / Split**.
- Split is now explicit and owns only one 3D/plot divider.
- 3D Focus no longer reserves a permanent controls column.
- Detailed Field controls moved to a floating Inspector drawer.
- Inspector content is scoped: pure 3D shows 3D controls, plot/log views show companion controls, Split can show both.
- Added one visible physical-time transport in Field; legacy 3D/Profile/Log engines remain internal.
- The global Field transport now selects the physical-time source from the active view (3D, Spatial Profile or Solver Logs).
- PROJECT / CASE / REGION state is preserved, but its Ribbon presentation is contextual:
  - visible for Data and Analysis;
  - visible for Field Profile / Time Series / Solver Logs / Split;
  - hidden for pure 3D and unrelated surfaces.
- Removed top-level Ribbon alias tabs **Plots** and **Compare**.
- Compare tools remain available contextually inside Field.
- Preserved **Copy A→B** after CI identified it as a valid comparison action.
- Data now opens the Data Catalog instead of silently reusing a legacy plot view.
- Legacy dataset tabs are hidden under the v1.6 Ribbon so they no longer compete with Field's internal view tabs.
- Sidebar sections are scoped to their actual workflow:
  - Catalog does not show Figure / Selected Curve / Phase-change / Reference Lines;
  - Analysis does not inherit legacy Data/plot cards;
  - Phase-change / Reference Lines appear only in compatible Time Series / Profile contexts.
- Flow, Numerical Performance, Physical Analysis, Solidification, Spatial Difference, Temporal Alignment, Thermal Analysis and Vector Derived Fields no longer fall back to `document.body`; they mount only in their owned analysis hosts.
- Added a unified activity presentation policy: compact activity toast is suppressed while a detailed modal/scan overlay owns progress.
- Field Ribbon 3D-only actions (Probe, Slice, Vectors, Streamlines, 3D Compare, Camera tools) are hidden while Profile / Time Series / Solver Logs is the active internal view and return in 3D / Split.

- Findings review now supports a portable evidence handoff:
  - **Assistant bundle (.md)** with review instructions, findings table and per-case configuration/run evidence.
  - **Raw evidence (.json)** with structured findings, measured/reference values, targets, case metadata, output completeness, dataset provenance and related evidence.
  - **Copy for ChatGPT** copies the assistant-ready review prompt/bundle and opens ChatGPT in the default browser.
  - **Create GitHub issue** opens a prefilled FoamLens issue containing workspace health counts and highest-priority findings.
- The Windows host now exposes a minimal `openExternal` bridge restricted to `http/https`; FoamLens stores no ChatGPT or GitHub credentials for these handoffs.

### Regression contract changes
- Packaged smoke no longer requires permanent 3D + Spatial Profile mounting.
- Packaged smoke now requires:
  - six real top-level Ribbon tabs;
  - internal Field view tabs;
  - single-view 3D default;
  - hidden companion in 3D focus;
  - hidden Inspector in default 3D focus;
  - PROJECT / CASE / REGION hidden in 3D and visible in Profile.
- Workspace, Ribbon, Field View, playback, resize/help and sidebar regression tests were updated to enforce the v1.6 interaction model.

### Validation state
- Intermediate CI caught and corrected:
  - removal of valid Copy A→B comparison workflow;
  - asynchronous context refresh causing Profile context to appear one tick late;
  - stale packaged-smoke expectations for the removed second workspace splitter.
- Final functional candidate commit: `2bbfdcd200bcb44c411b530e403bb5e241434b41`.
- GitHub Actions run **#743** (`37392625734`) completed **SUCCESS**.
- Real OpenFOAM QuickCup regression: PASS.
- Independent VTK B13 streamline validation: PASS.
- Full regression suite, including Review/Findings export, Analysis UI organization, Ribbon/workspace scope, scientific field handling and bilingual/overflow checks: PASS.
- Portable Windows executable smoke: PASS.
- Installer build + install smoke: PASS.
- Windows artifact: `FoamLens-Windows-v1.5.1`, artifact id `11381219665`, digest `sha256:ed8b3f4ea23b60ac6955b0a1815ff006e5ff7efde6afb11e7a0aa438267b1542`.
- VTK evidence artifact: id `11381947195`, digest `sha256:8f52adc944a6e676852f19bb7dfa5d4472d7767ee61113364d0dfa1a0b2e4d55`.
- QuickCup runtime artifact: id `11381712511`, digest `sha256:dfa2bd9ddf021d4244bbcca9ceada76c40824c60be396d41d0c8d38b9b676aca`.
- GitHub Release publication was correctly skipped because this is a development branch.
- **No merge to main and no v1.6.0 public release yet.**

## 2026-10-05 — v1.6.0 permanent Field ownership phase validated

- Branch: `development/v1.6.0-ux-coherence`.
- Validated product head: `84fb85ca3f28591ec4ad59e786997131bcb4eb65`.
- GitHub Actions run **#747** (`37396621308`): **SUCCESS**.
- Structural correction: the core 3D Field View panel and its controls are now adopted by the Field Workspace once and remain Field-owned across top-level section changes.
- `fwLeave()` no longer restores `fieldViewPanel` or `fieldViewControls` into the legacy Data tree.
- Added `fwAdoptFieldNode()` plus regression coverage that forbids restoring the 3D panel/control tree back into Data.
- Historical Field View regressions were updated from the obsolete `fwMove(...)` contract to the new permanent-ownership contract.
- Scope deliberately kept surgical: the shared 2D chart plus Profile / Time Series / Solver Log control trees still use compatibility reparenting because Analysis and legacy plot rendering currently share that chart path. Their separation is the next structural block and was not mixed into this change.

### Validation evidence
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- 3D OpenFOAM Field View regression: **SUCCESS**.
- Persistent Field Workspace UX regression: **SUCCESS**.
- Contextual help / Split resizing regression: **SUCCESS**.
- Ribbon/context/activity scope regression: **SUCCESS**.
- Analysis UI organization regression: **SUCCESS**.
- Bilingual / overflow hardening: **SUCCESS**.
- Portable Windows executable build + packaged runtime smoke: **SUCCESS**.
- Installer build + installed-application smoke: **SUCCESS**.
- Windows artifact: `FoamLens-Windows-v1.5.1`, id `11384410036`, digest `sha256:2d0e506546b5fd161b4fc2f3638df3d34f0651d08deb92e1cc573e0d76d05f6d`.
- VTK validation artifact: id `11382939909`, digest `sha256:7aae37d5bf0c2b80a79ff33973ad7216b01848ba7b5d284bf362b6c836d11f00`.
- QuickCup Windows runtime fixture: id `11383540206`, digest `sha256:551759b034181b5fc58781afd50276887b3388d27eefd70546e8d4eb43dbeb58`.
- No merge to `main` and no v1.6.0 release were performed.



## 2026-10-05 — v1.6.0 Field ownership / navigation coherence phase validated

- Development branch: `development/v1.6.0-ux-coherence`.
- Validated product head: `2b0e54c31e3dc0a6fa48b2b33a5c90fa1ee9bca2`.
- GitHub Actions run **#782** (`37409195436`): **SUCCESS**.
- No merge to `main` and no v1.6.0 public release were performed.

### Structural ownership closed
- Core 3D UI is now permanently Field-owned:
  - `fieldViewPanel` stays under `fw3DHost`;
  - `fieldViewControls` stays under `fw3DControlsHost`;
  - leaving Field no longer restores either tree into Data.
- Profile / Time Series / Solver Log control trees are also permanently Field-owned.
- The only remaining compatibility reparenting is the singleton 2D `.chartwrap`, because Data/Analysis/Field still share the legacy interactive 2D renderer.
- A cross-section ownership regression now fails if 3D/Compare/control trees leak back into Data, if Analysis modules fall back to `document.body`, or if fake top-level Plots/Compare tabs return.

### Legacy Field navigation retired
- Field View no longer creates a legacy Data `fieldViewTab`.
- The hidden legacy `modeField` button is removed after Ribbon installation.
- Ribbon Field no longer falls back to clicking `modeField`.
- The old `setDataView('field3d')` path and its Data-view wrappers were removed.
- Official Field entry points are now:
  - the `3D / Field` Ribbon tab;
  - the Overview `Open 3D Field View` action.
- Packaged smoke explicitly requires the Ribbon/Field surface and requires legacy Field button/dataset-tab navigation to be absent.

### Context and Analysis ownership
- Added `window.FoamLensContextStore` so Case/Region state is independent of `globalCaseSelect/globalRegionSelect`.
- Shared context selectors are now a presentation of the store; series filtering reads the context state rather than selector DOM.
- Analysis-derived curve creation is navigation-neutral: analysis modules no longer call `setDataView('timeseries')` or `setDataView('profile')`.
- Analysis Ribbon now exposes explicit **Open Time Series** and **Open Spatial Profile** result handoffs.
- Difference wording is explicit:
  - **2D Curve Δ** / **2D Curve Difference** for curve analysis;
  - **Strict 3D Δ** for field comparison.

### Validation evidence
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Full 57-test manifest: **SUCCESS**, each test executed exactly once.
- Field View / permanent ownership / Ribbon navigation regressions: **SUCCESS**.
- Section ownership / anti-leak regression: **SUCCESS**.
- Multi-region context-store regression: **SUCCESS**.
- Analysis UI organization + navigation-neutral result regression: **SUCCESS**.
- Bilingual / overflow regressions: **SUCCESS**.
- Portable Windows executable build + packaged runtime smoke: **SUCCESS**.
- Installer build + installed-application smoke: **SUCCESS**.

### Run #782 artifacts
- `FoamLens-Windows-v1.5.1`
  - artifact id: `11388442160`;
  - size: `135,262,559 bytes`;
  - digest: `sha256:6de06d22abb3c7df180c3c5e23935fc763b818734197691d343b19a9d92a9f69`.
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11388911110`;
  - size: `30,899 bytes`;
  - digest: `sha256:d7e3fab2b3f5931f91df4c291bb3d1db173088fa6317c59bc46ca445e648fb86`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11387858833`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:c86f68a410f791890a0c2f842258fa08414d281f91449631f2b126ccce374831`.

### Remaining structural boundary
- The singleton interactive 2D chart remains shared by Data / Analysis / Field. Separating it requires preserving the existing hover, pins, legend drag/resize, export and plot interaction semantics; this is intentionally left as the next isolated architecture block rather than replacing safe ownership work with a fragile overlay.


## 2026-10-06 — v1.6.0 stable 2D Plot Surface architecture validated

- Development branch: `development/v1.6.0-ux-coherence`.
- Validated product head: `48599763a1c8bdbe9b6445f5ee361c88f9c91e7b`.
- GitHub Actions run **#792** (`37424239577`): **SUCCESS**.
- No merge to `main` and no v1.6.0 public release were performed.

### Final shared-renderer bridge removed
- Added `v14-zy-plot-surfaces.js` with a single `FoamLensPlotSurfaces` controller.
- Data, Analysis and Field now own three persistent `.chartwrap` surfaces:
  - Data → `#chartViewport`;
  - Analysis → `#chartViewport`;
  - Field → `#fw2DHost`.
- Surface changes no longer move a chart node between workspaces.
- The existing scientific renderer remains single-source: `draw()`, `renderExportComposition()`, plot-state calculations and export code are reused rather than copied.
- Legacy compatibility is maintained by switching the canonical internal IDs (`canvas`, `tooltip`, `canvasSelection`, `previewBadge`, etc.) to the active stable surface. Inactive surfaces keep scoped IDs.
- `bindPlotCanvasInteractions(canvas)` now binds the same hover, pins, figure selection, legend drag/resize and pointer behavior to every stable surface.
- Data / Analysis / Field preserve per-surface 2D view state, pinned points and active-series identity when switching workspaces.
- The controller intentionally does **not** use fixed/absolute overlay portals.

### Field cleanup
- Removed the final 2D `appendChild(chart)` path.
- Removed `fwRestoreCompanionNodes()`.
- Removed dead `fwRemember()`, `fwRestore()` and `fwMove()` origin/reparenting helpers.
- `fw2DHost` now receives a Field-owned plot surface once and keeps it permanently.

### Runtime proof
The packaged smoke now performs an actual workspace cycle:
1. starts in Field and verifies the canonical canvas belongs to Field;
2. enters Data and selects Data Catalog;
3. enters Analysis and verifies the canonical canvas belongs to Analysis;
4. returns to Data and verifies Data Catalog state is restored;
5. returns to Field and verifies the canonical canvas belongs to Field again;
6. verifies Data / Analysis / Field parent elements are unchanged throughout.

### Regression prevention
- Added `desktop/tests/plot-surfaces.test.cjs`.
- CI now fails if:
  - the Field workspace reintroduces chart reparenting/restoration;
  - stable Data / Analysis / Field surfaces disappear;
  - canvas interactions stop being reusable;
  - the controller introduces an overlay portal;
  - surface state preservation is removed;
  - packaged runtime surface cycling is no longer asserted.
- CI manifest now contains **58** test files, each executed exactly once.

### Validation evidence
- Real OpenFOAM QuickCup regression: **SUCCESS**.
- Independent B13 VTK streamline validation: **SUCCESS**.
- Stable 2D Plot Surface regression: **SUCCESS**.
- Section ownership / anti-leak regression: **SUCCESS**.
- Persistent Field Workspace UX regression: **SUCCESS**.
- Analysis UI organization regression: **SUCCESS**.
- Full 58-test manifest: **SUCCESS**.
- Portable Windows executable + Data/Analysis/Field surface-cycle smoke: **SUCCESS**.
- Installer build + installed-application surface-cycle smoke: **SUCCESS**.

### Run #792 artifacts
- `FoamLens-Windows-v1.5.1`
  - artifact id: `11395065711`;
  - size: `135,266,803 bytes`;
  - digest: `sha256:cdc7dcee35bda84db3e615272ac9e97e33be232e8959a2db3b64c05567ef4051`.
- `FoamLens-VTK-streamline-validation`
  - artifact id: `11393949416`;
  - size: `30,899 bytes`;
  - digest: `sha256:5dfe071908498cca06a83b9400e8da1f31b323966e607039726c3471dbccf9f1`.
- `QuickCup-MultiCase-Windows-runtime`
  - artifact id: `11394231176`;
  - size: `326,074,466 bytes`;
  - digest: `sha256:9b075833ad5c1e00b5396fc6d544881d6f362b819cb1c906415d380535f2cb0d`.

### Architecture status
- The previous UX-07 / UX-12 singleton-chart compatibility boundary is **closed**.
- There is no remaining intentional chart reparenting bridge between Data, Analysis and Field.

## 2026-10-06 — GitHub Copilot agent delegation

Added repository-level Copilot instructions and custom App Maintainer, QA Regression and Release Manager agents. The contracts make scientific provenance, workspace ownership, 3D/Profile/Time-Series/Solver-Log separation, current-commit regression evidence, Windows build/smoke validation and updater integrity mandatory agent constraints.

Purpose: move bounded implementation, regression inspection and release preparation to repository agents while keeping cross-project ChatGPT focused on architecture and coordination.

No FoamLens scientific behavior, UI behavior, version or release artifact changed in this infrastructure-only update.

## 2026-10-06 — ChatGPT-ready task intake

Added `.github/ISSUE_TEMPLATE/chatgpt-task.yml` so new implementation/audit tasks can capture the desired outcome, evidence, scope, acceptance criteria, required validation and release permission up front.

Purpose: reduce repeated context reconstruction in future ChatGPT sessions and make repository work resumable from a bounded GitHub Issue without changing product behavior.
\n

## 2026-10-06 — Deterministic real-case packaged smoke selection

**Finding:** Windows build run `37434467481` passed the scientific/unit suite and packaged executable launch, but the real OpenFOAM packaged smoke failed after switching to `B13_prghPressure_airGapOF14`: the requested `metal / T / t=9.8` selection ended on `CoCell`.

**Evidence:** the QuickCup/VTK regression in the same workflow confirmed `T` exists in the `metal` region. The smoke helper used `dispatchEvent('change')` for an async case-change handler and only polled for the case ID/name; that condition could become true before `fvHandleCaseChange()` finished its awaited frame load. The still-running case load could then overwrite the smoke's requested field.

**Action:** the smoke-only helper now invokes and awaits `fvHandleCaseChange()` directly before applying region/field/time selection. Requested regions/fields now also fail immediately with an explicit list of available choices instead of silently retaining a default field.

**Scope:** smoke-test synchronization only; normal FoamLens user interaction and scientific field-selection behavior are unchanged.

**Validation status:** replacement `fix/deterministic-real-case-smoke` Windows CI is required before closing the finding.

### Follow-up validation correction

Replacement run `37437700568` reached the regression suite but stopped at `native-performance.test.cjs` because that source-level guard still required the obsolete polling implementation token `while(performance.now()-started<30000)`. This was test drift caused by the synchronization fix, not a product failure.

The guard now requires the new deterministic contract (`await fvHandleCaseChange()`) plus explicit unavailable-region/field diagnostics. A fresh Windows CI run is required.

### Validation complete

Replacement Windows CI run `37438147013` completed **SUCCESS** on commit `ed113c9637af9e0d98514eec77b775cd290f18e4`.

Validated in the successful run:
- real QuickCup/OpenFOAM regression;
- full frontend/scientific regression suite;
- native-performance guard updated for the awaited case-switch contract;
- portable Windows publish;
- packaged executable real-case smoke, including requested `metal / T / t=9.8`;
- installer build;
- installed-application smoke test.

Conclusion: the prior `CoCell` result was a smoke synchronization race, not missing `T` data. The deterministic smoke fix is validated and ready to merge. Merging is intentionally kept separate because a `main` desktop change invokes the repository's current main-branch release workflow.

### Release publication guard

During P0 reconciliation, the FoamLens workflow was found to publish a GitHub Release automatically for every qualifying `main` desktop push. That conflicts with the repository agent/release contract requiring explicit publication authorization and makes safe maintenance merges capable of producing unintended releases.

The workflow now keeps full CI/build/portable/installer validation on `main`, but `Publish GitHub Release` runs only for:
- an explicit `v*` tag; or
- manual `workflow_dispatch` with `publish=true`.

`auto-update.test.cjs` now guards this separation so future CI changes cannot silently restore implicit main-branch publication.

### Final branch validation after release-policy guard

Windows CI run `37439205812` completed **SUCCESS** on functional/workflow commit `47c9d75eb6e9866cff0dd14abef51092c17a072b`.

The successful run validates the combined change set:
- deterministic awaited real-case smoke switching;
- updated source-level smoke regression guard;
- full QuickCup/OpenFOAM and scientific/UI regression suite;
- portable packaged real-case smoke;
- installer build and installed-app smoke;
- explicit release-publication policy regression, with ordinary `main` pushes no longer sufficient to publish a GitHub Release.

The only later branch changes are documentation entries recording this evidence.

## 2026-10-06 — Official FoamLens identity adopted across active product surfaces

**Source of truth:** `realmichelduarte/Michel-Software-Standards/shared-assets/product-logos/foamlens` (approved concept: 3D field/focus surface).

**Migration:**
- vendored the canonical `official-app-icon.svg`, `official-mark.svg` and `official-lockup.svg` under `desktop/src/FoamLensDesktop/frontend/assets/branding`;
- replaced the legacy inline launch/sidebar/About marks and data-URI favicon with the canonical assets;
- replaced `Assets/FoamLens.ico` with a seven-size (16/24/32/48/64/128/256) Windows derivative of the approved app icon, preserving the existing EXE/taskbar/shortcut/installer wiring;
- embedded the canonical SVGs in the .NET assembly and materialized them into the local WebView app directory so packaged FoamLens remains self-contained;
- updated the bundle workflow to vendor the assets and added `official-branding.test.cjs` plus stronger ICO-size validation;
- extended the packaged smoke to require successful rendering of launch, sidebar and About official assets and to reject the former competing inline mark.

**Scope:** product identity only. Scientific analysis, OpenFOAM parsing, workspace behavior and release version are unchanged.

**Validation required:** Windows CI must pass the complete regression/build/portable/installer smoke path before Issue #14 is closed.

### Branding branch validation complete

Windows CI run `37442846439` completed **SUCCESS** on functional head `fbf5e38c1ffe1dcee8ed42b38c46682778a0cec6`.

Validated in the successful run:
- real QuickCup/OpenFOAM regression;
- complete scientific/UI regression suite;
- canonical FoamLens SVG blob identity;
- official Windows multi-resolution ICO packaging;
- portable EXE build and packaged smoke with launch/sidebar/About brand rendering;
- installer build and installed-application smoke;
- GitHub Release publication correctly skipped on the branding branch.

The branch is ready to merge without a version bump or release publication.

### Main-branch branding validation complete

Merged PR #18 as `1b8213af89a2539e7da77cd532e389f001831c89`.

Main-branch Windows CI run `37443720415` completed **SUCCESS** and independently revalidated:
- canonical FoamLens SVG identity and local packaging;
- official multi-resolution Windows icon;
- complete scientific/UI regression suite;
- portable executable smoke;
- installer build and installed-app smoke.

`Publish GitHub Release` was **skipped**, confirming that the branding migration did not publish a new FoamLens version.

**Status:** official FoamLens logo adoption is complete across the active Windows/startup/About/in-app surfaces covered by Issue #14.
## 2026-10-06 — Chat-driven release publication enabled

- Release workflow policy changed so a push to `main` whose head commit message starts with `release:` publishes the validated GitHub Release automatically after all CI gates pass.
- Ordinary `main` pushes remain validation-only and do not publish releases.
- Manual `workflow_dispatch publish=true` and tag-triggered publication remain supported as fallback paths, but are no longer required for releases initiated from ChatGPT/GitHub tooling.
- Updated release-policy regressions in `version-consistency.test.cjs` and `auto-update.test.cjs` to enforce the new explicit `release:` intent gate.
- Validation: workflow run #853 passed QuickCup/OpenFOAM + VTK, full desktop regression suite, portable Windows smoke, installed-app smoke, checksums, artifact upload, and `Publish GitHub Release`.
- Published public release: `FoamLens v1.6.0` with portable EXE, installer EXE, and both SHA-256 checksum assets.
- State: COMPLETE. Future FoamLens releases can be initiated directly from chat by committing an explicit `release:` change to `main`; no manual tag creation or Actions UI step is required.



## 2026-10-06 — v1.6.1 Field command-surface continuation

**Branch:** `development/v1.6.1-field-command-surface`.

### Findings
- Field's contextual controls already had correct permanent ownership, but were rendered as a fixed floating Inspector instead of using the application's sidebar.
- The canonical frame-cache selector (`256 MB / 512 MB / 1 GB / 2 GB`) remained buried inside 3D controls while the canonical physical-time transport had already moved to the Ribbon.
- The Field Ribbon still allowed horizontal overflow despite the command surface containing enough groups to require wrapping.
- Field view/layout transitions could request both the 3D renderer and 2D plot renderer even when only one surface was visible.

### Actions
- Reused the existing canonical Field control trees and moved `fwControlsDrawer` into the real application sidebar; no mirror selectors were introduced.
- The sidebar remains contextual: 3D/Split shows 3D controls, while Spatial Profile / Time Series / Solver Logs show their existing owned 2D controls.
- Kept `fvCase / fvRegion / fvField / fvComponent` as the authoritative selectors inside the Field sidebar.
- Moved the existing `fvCacheLimit` and `fvCacheReadout` beside the existing `fwTimeTransport` in the Field Ribbon.
- Moved the existing Split companion chooser into the Ribbon and hid the now-redundant internal Field workspace bar while the Ribbon is active.
- Field Ribbon groups now wrap instead of requiring horizontal scrolling.
- Added requestAnimationFrame render coalescing so hidden 2D/3D surfaces are not redrawn simply because the layout changed.
- Removed a second multi-view render cascade: `fcUpdateLayout()` previously called the primary `fvRender()` and then rendered View B / difference / Views C-D again even though the patched primary renderer already cascades to those views.
- Verified Views C and D retain independent `Case / Region / Field / Component` selectors and added an explicit regression contract for them.

### Regression contract
Updated Field workspace, Ribbon, Field View and final UX audit tests to require the contextual sidebar, canonical cache placement, wrapped Ribbon command surface and render coalescing.

### Validation status
Branch CI is required on the final head before promotion to `main`. No release publication is authorized by this entry.

### 2026-10-06 Windows packaged-smoke follow-up
- Branch workflow run `37529035320` passed the scientific/UI regression suite and portable publish step, then failed specifically in `Smoke-test packaged FoamLens executable`.
- The packaged runtime evidence showed the app, Ribbon, 3D runtime and WebView2 video smoke all started successfully. The failing assertion was `highResRerendered=false` during the 1800×1200 primary 3D export smoke.
- Root cause: `fcUpdateLayout()` could leave a coalesced `requestAnimationFrame` pending. If high-resolution export started before that frame executed, the deferred normal-layout render could resize the primary canvas back to viewport dimensions before the export capture verified the requested pixel size.
- Fix: multi-view layout rendering now preserves the unpatched primary renderer as `fvRender.__fcBase`, renders the primary and comparison views exactly once per coalesced layout pass, and exposes `fcFlushLayoutRender()` to cancel/flush a pending layout render. Multi-panel export flushes that work before explicit high-resolution rendering.
- Regression coverage now requires the flush/cancel path and the high-resolution export integration. The intentionally independent visual-settings smoke state (`fcSyncVisuals=false`) was confirmed not to be a failure criterion.
- Replacement Windows CI on the final branch head remains required before merge/release promotion.


### 2026-10-06 — v1.6.1 About / identity reconciliation
- Replaced the legacy embedded About portrait with the canonical 2026-10-06 Michel Duarte portrait from `Michel-Software-Standards` (blob `be4d18572bec28d53783cd4db05cb6cd289a7916`) and vendored it locally so packaged FoamLens remains self-contained.
- Added the official Michel's Lab parent-brand lockup from the canonical master asset (blob `7819ef5c7d1a5c338c67c9bbd517e5448724a5cf`) inside the author/studio block, preserving the required Product → Author → Michel's Lab → Social hierarchy.
- Kept the existing social controls but reconciled their targets to the canonical URLs in `brand/developer-profile.json`.
- Removed stale About literals `FoamLens · v39` and `Desktop v1.3.2`; About now exposes frontend v51 plus the shared Desktop-version label.
- Removed the packaged-host dependency on the historical `1.4.9 → 1.6.0` HTML replacement. The Windows host now injects its assembly version as isolated `data-foamlens-desktop-version` state on the root element, while visible version labels keep using `data-desktop-version`; the standalone frontend uses the current public Desktop version as fallback.
- Field View's version dialog now reads the shared `flDesktopVersion()` helper instead of hard-coding `Desktop v1.6.0`.
- Extended branding/version regressions and packaged smoke to require the canonical portrait and Michel's Lab lockup to render successfully.
- Added `desktop/tests/findings-export.test.cjs` and wired it exactly once into Windows CI. The regression parses v22 and protects provenance fields, heavy-array exclusion, evidence-vs-inference guidance, Markdown/JSON exports, Copy for ChatGPT, GitHub issue handoff, and both Workspace/Review attachment points.
- Current-head Windows CI is required before this block is considered validated. No version bump or release publication is authorized by this entry.

## 2026-10-06 — Intelligent Michel's Lab brand-adoption guidance

Repository instructions now explicitly route logo, launcher, splash/startup and About work through the Michel-Software-Standards Product Identity Standard and Brand Adoption Playbook.

The required interpretation is structural integration rather than sticker placement: replace active legacy identity, adapt canonical geometry to the existing product design language, preserve unrelated behavior, validate the build, and keep release publication separate unless explicitly authorized.


### 2026-10-06 — Packaged launch-readiness smoke hardening
- Windows runs `37537064322` (#870) and `37537319500` (#872) both reached successful navigation and `document.readyState=complete`, then failed the immediate `document.body.innerText.includes('FoamLens')` assertion before any scientific/runtime smoke work.
- Source and bundle inspection confirmed that the launch surface, `#launchTitle`, app shell, closing body and inline JavaScript remained present and that the workflow rebuilt `AppBundle.zip` from the current frontend before publishing.
- **Superseded diagnosis:** the initial hypothesis blamed faster navigation after removing the embedded portrait. Later DOM evidence disproved that: the smoke was correctly observing a document whose root content had been replaced.
- The packaged smoke now waits up to 10 seconds for the actual `#launchTitle` to contain `FoamLens`, be displayed/visible, and have non-zero rendered dimensions. Failure retains diagnostic evidence for title text/display/visibility/size, body display/visibility/classes/text length, ready state and URL.
- This is a stronger visual-readiness gate than the former one-shot body-text assertion; it does not accept a hidden or zero-size launch surface.
- `desktop/tests/official-branding.test.cjs` protects both the bounded wait and its blank-screen diagnostics. Replacement current-head Windows CI remains required.


### 2026-10-06 — Root cause of packaged blank document
- Runs #870–#891 progressively proved the bundle, materialized `index.html`, requested navigation and HTTP response were all present. Run #891 finally captured `document.documentElement.outerHTML` as `<html lang="en" data-desktop-version="1.6.0">Desktop v1.6.0</html>`.
- Root cause: the v1.6.1 version cleanup stored assembly version on the root `<html>` element using the same `data-desktop-version` attribute used by visible labels. `flSyncVersionLabels()` intentionally updates every `[data-desktop-version]` element via `textContent`; because the root element matched, it erased the complete `<head>` and `<body>`.
- Fix: runtime version state now uses the isolated `data-foamlens-desktop-version` key and `flDesktopVersion()` reads `document.documentElement.dataset.foamLensDesktopVersion`. Visible launch/sidebar/footer/About labels retain `data-desktop-version`.
- Removed the temporary `WebResourceRequested` local-origin serving experiments and restored the previously validated `SetVirtualHostNameToFolderMapping` architecture. The stronger smoke diagnostics, NavigationId binding, materialized-frontend validation and AppBundle integrity gate remain.
- Added regression assertions that forbid `data-desktop-version` on the root `<html>` element and require the isolated runtime-version key. Current-head Windows CI is required before promotion.


### 2026-10-06 — Packaged branding readiness follow-up
- Windows run #896 confirmed the blank-document root cause was fixed: `#launchTitle` rendered visibly, the full DOM remained present, and the document title reported `FoamLens v51 · Desktop v1.6.0 — by Michel Duarte`.
- The next smoke failure moved forward to the official-branding gate. The previous gate checked five images immediately after launch and could fail before hidden About assets completed image decode.
- The host now validates that the materialized official FoamLens lockup/mark plus canonical Michel Duarte portrait and Michel's Lab lockup exist and are non-empty before WebView initialization.
- Packaged branding smoke now waits up to 10 seconds for each required image to exist, be an `HTMLImageElement`, complete decoding, and report non-zero natural dimensions; failures preserve per-image `src`, `complete`, `naturalWidth`, and `naturalHeight`.
- Current-head Windows CI remains required before merge/release promotion.


### 2026-10-07 — immutable portrait and restored parent-brand authority
- Master authority changed after the earlier v1.6.1 About work. The exact user-provided canonical Michel Duarte portrait is now `shared-assets/michel_duarte_avatar.jpg`, Git blob `18fe1a68722850c3d8f918dc0799f46ffeb6dbaf`, 1440×1920, and is immutable. Interim portrait blobs `be4d1857…` and `9454e22e…` are rejected.
- Michel's Lab restored the physical production lockup source. FoamLens now vendors `shared-assets/michels-lab/official-lockup.png` byte-for-byte as `assets/branding/michels-lab/official-lockup.png`, Git blob `7fd48093968b31ddacd3098f5b15d962de580652`, 2172×724.
- Removed the temporary/local repaired lockup derivative and all runtime data-URI/base64 rewriting of About raster assets. Presentation sizing/cropping remains render-time only.
- Removed the Windows CI raster re-export/recompression diagnostic because it violated the immutable portrait contract.
- Synced the managed Michel's Lab child-agent contract to `2026-10-06.3`.
- About retains Product → Author → Michel's Lab → Social ordering and now exposes the QA-recognized parent-brand path.
- Current-head Windows CI remains required before this work can be marked verified. No release publication is authorized by this entry.
### 2026-10-07 — v1.6.1 current-head branding gate and Windows validation
- Windows run #909 (commit `340341a9b791158a10be8800163e49aa5d568b30`) passed the real OpenFOAM / VTK job and reached the Desktop regression suite, then failed only at `desktop/tests/official-branding.test.cjs` with `Materialized frontend validation does not require michels-lab/official-lockup.png`.
- The product host was already correct: `Program.cs` requires the canonical parent-brand asset through `Path.Combine("assets", "branding", "michels-lab", "official-lockup.png")`. The regression test incorrectly required the slash-separated path to appear as one literal source string, producing a false negative.
- Commit `51f5517a9852327164929cc209cb580211c31791` changes only the branding regression contract so it accepts either a literal asset path or the equivalent C# `Path.Combine` expression. About layout, canonical portrait bytes, Michel's Lab lockup bytes and runtime asset handling were not changed.
- Windows run #910 on `51f5517a9852327164929cc209cb580211c31791` completed successfully. Evidence includes real QuickCup integration, independent VTK streamline validation, Windows-safe multi-case 3D fixture generation, embedded bundle integrity, official branding, Field View / strict 3D difference coverage, Findings handoff, multi-panel performance/export, persistent Field Workspace and cross-session state, Ribbon/anti-leak/final UX gates, portable executable smoke, SHA-256 generation, installer build, installer SHA-256 generation, and actual install + installed-app smoke.
- Optional Authenticode steps were skipped because no signing certificate is configured. GitHub Release publication was also skipped, as intended for an unpromoted development branch.
- The older `development/v1.6.1-ui-polish` branch was reviewed before promotion. Its two unique commits only move the canonical frame-cache selector beside playback and guard that placement; the active v1.6.1 branch already contains a stronger implementation that moves the real cache selector plus cache readout beside the shared playback transport, wraps the Field Ribbon and prevents horizontal Ribbon scrolling. No redundant cherry-pick is required.
- No version bump, merge, tag or release publication is authorized by this entry.
### 2026-10-06 — FoamLens Desktop v1.6.1 stable release
- User explicitly authorized the stable v1.6.1 promotion.
- Release-preparation commit `f41fc44c76ffdfd2bc03e33754070cfdc85adf0c` bumped Desktop, assembly/file, frontend fallback, installer fallback, README and release-contract expectations to v1.6.1 and dated the v1.6.1 changelog.
- Candidate Windows CI run #911 (`37558931918`) completed successfully at the exact v1.6.1 candidate head, including QuickCup/VTK, the complete scientific/UI regression suite, portable smoke, installer build, checksums, actual installation and installed-app smoke.
- PR #19 merged to `main` as release commit `45d18c43b845fafb45c9497aaa011d92c64d5b8c`.
- Main release run #912 (`37559553035`) completed successfully and passed the `Publish GitHub Release` gate after re-running the full validation suite on the merged tree.
- GitHub Release `v1.6.1` is stable (`draft=false`, `prerelease=false`) and is the repository's latest release.
- Published assets: `FoamLens-Portable-v1.6.1.exe`, `FoamLens-Portable-v1.6.1.exe.sha256`, `FoamLens-Setup-v1.6.1.exe`, and `FoamLens-Setup-v1.6.1.exe.sha256`.
- Optional Authenticode signing remains unavailable because no Windows publisher certificate is configured; this does not affect the completed checksum, packaging, install or runtime smoke gates.

### 2026-10-06 — Microsoft Store MSIX channel started from live Partner Center identity
- The user created/reserved the live FoamLens Microsoft Store product and supplied the actual Product Identity values from Partner Center.
- Canonical Store identity is `MichelDuarte.FoamLens` / `CN=D2024BFC-8238-4063-A8DD-A91208327224` / publisher display name `Michel Duarte`, Store ID `9P0PTHSQ89LL`.
- Added a separate `distribution/microsoft-store-msix` implementation path modeled on the proven Michel's Life Store packaging pattern without changing the public FoamLens v1.6.1 direct-release channel.
- The Store build uses a compile-time `FOAMLENS_STORE` channel: automatic GitHub release checks are skipped, the GitHub update Ribbon action is not mounted, and a manual bridge call is guarded with a Microsoft Store update message.
- Added a Partner Center identity source, MSIX manifest template, Store assets generator, manifest renderer, Store source smoke checks, a dedicated Store MSIX workflow, and the Store contract regression in the normal Desktop suite.
- The dedicated Store workflow builds the same self-contained FoamLens Desktop code, smoke-tests the Store executable before packaging, creates/unpacks/verifies the x64 MSIX, validates the live Partner Center identity, creates SHA-256 evidence, and uploads the unsigned MSIX only as a CI artifact.
- Store signing/certification/publication are intentionally not claimed here; Microsoft Store provider evidence remains pending until Partner Center accepts the package.
- Windows CI #913 reached the new Store contract after all preceding version/updater/scientific checks passed, then exposed a portability defect in the new test: it matched one exact LF + indentation sequence. The implementation itself was correct and the dedicated Store workflow had already compiled/smoke-tested/packed it successfully. The contract was hardened to a whitespace/CRLF-tolerant regex; no Store runtime behavior changed.
- CI #914 exposed that the CRLF-tolerant test fix itself contained a literal `\\n` token outside a JavaScript string, causing a syntax error before the assertion could run. The test source was corrected to contain a real newline and both Store validation paths now run `node --check desktop/tests/store-msix.test.cjs` before executing the contract. No product/runtime/MSIX behavior changed.
- Full Windows CI #915 passed the Store contract, all scientific/UI regressions and portable smoke, then exposed a real direct-installer packaging regression: the second MSBuild PropertyGroup made the PowerShell XML version read produce a trailing-space value. Inno Setup created `FoamLens-Setup-v1.6.1.exe`, while Copy-Item searched for `FoamLens-Setup-v1.6.1 .exe`. The Store constant is now conditional inside the existing primary PropertyGroup and both direct/Store version resolvers trim the XML value. Product version remains 1.6.1.

### 2026-10-07 — Post-v1.6.1 hardening from master multi-channel audit
- Removed the stale DesktopVersion fallback `1.6.0`; missing assembly version metadata now fails explicitly instead of silently impersonating an older release.
- Replaced two v1.6.0 runtime-smoke diagnostic labels with `DesktopVersionText` and removed the stale versioned Field View source header.
- Extended `version-consistency.test.cjs` to reject any real semantic-version literal used as a null-coalescing runtime fallback.
- Microsoft Store MSIX workflow now validates pushes to `main` as well as `distribution/**`, preventing future shared-source changes from bypassing the Store channel.
- No release/tag/publication action is part of this hardening change.
- CI #918 exposed one remaining test-only version pin: `native-performance.test.cjs` still required the historical literal `FoamLens v1.6.0 3D runtime UI smoke passed`. The product implementation had correctly moved to `DesktopVersionText`; the regression assertion was updated to protect the version-derived behavior rather than a historical release string.


## 2026-10-07 — Repository transferred to Michel's Lab organization

**Change:** GitHub ownership moved from `realmichelduarte/FoamLens` to `michels-lab/FoamLens`.

**Active references updated:**
- `.michelslab/project.yml` now identifies `michels-lab/FoamLens` and `michels-lab/Michel-Software-Standards` as the current project and shared authority.
- `MICHELS_LAB_PROJECT.md`, `AGENTS.md`, and `.github/copilot-instructions.md` now point to the organization-owned standards repository.
- Desktop updater release discovery and fallback release URLs now target `michels-lab/FoamLens` directly instead of relying on GitHub's old-owner redirect.
- Updater contract test updated to the canonical organization endpoint.

**Preserved intentionally:** personal developer/social links remain under `realmichelduarte`; the QuickCup research fixture remains `realmichelduarte/QuickCup-Solidification`.

**Validation state:** repository transfer and admin/push access verified. Branch CI/build validation is required before merge; historical log references are preserved as historical evidence.

### 2026-10-07 — Field Mapping physical-dimension guard (pending CI)
- Audit found that `fmSuggestMappingsWithMetadata` could select a name-matched field despite conflicting explicit SI dimensions, incorrectly attributing physical meaning to the data.
- Known-dimension roles (temperature, velocity, density, vorticity, thermal/density gradients) now reject contradictory metadata before scoring candidates. If metadata is absent, name-based suggestions remain available.
- Added regressions for swapped names, rejected incompatible mapping, and missing-dimension fallback.
- Scientific comparison and UI ownership are intentionally unchanged. Validation: PR CI pending; no release or `main` promotion authorized.

### 2026-10-08 — Candidate closure v1.6.2 (release validation required)
- Combined post-v1.6.1 Field Mapping dimension safety with corrected About iconography and canonical Michel's Lab slogan, keeping immutable identity assets unchanged.
- Synchronized C# Desktop, installer, frontend fallback, README and version-contract test to candidate 1.6.2.
- Windows CI #923–#926 passed for intermediate source commits. The new candidate commit, final merge, direct install and Store MSIX remain unverified until current-SHA CI completes.
- No claim of Store certification, signing or release publication before actual evidence.

### 2026-10-08 — Temporal comparison dimensional guard (pending final candidate CI)
- Audited dimensional comparison paths: strict 3D delta already refuses differing field/component/association/dimensions; temporal 2D quantitative comparison did not.
- Candidate now refuses A−B, RMSE, percent, export and derived-curve generation when source SI dimensions or explicit units contradict. Native alignment remains allowed for independent-series visualization.
- Added regression coverage for incompatible temperature/pressure dimensions, same-dimension differently scaled/displayed units, absent metadata, and gate wiring.
- Missing metadata remains explicitly not proof of compatibility; do not manufacture dimensions. Final Windows and Store validation still required before release.

### 2026-10-08 — FoamLens launch visual-regression incident and cross-app prevention
- User screenshot of stable v1.6.2 revealed visually incorrect startup identity despite green packaged CI. Root causes: competing `.launchMark` rules including an older `248px!important` forced a tiny lockup, canonical lockup SVG contains dark wordmark text on a dark surface, and a second oversized `FoamLens` h1 duplicated the product name.
- Candidate branch `fix/launch-brand-visual-gate` replaces startup lockup with canonical mark + one readable semantic h1 and themed, contour-derived hero layout; does not modify canonical SVG/portrait/logo bytes or analysis logic.
- Added actual WebView2 rendered dark/light contrast, mark size and hierarchy checks; portable and installed launcher screenshots are now mandatory CI artifacts for **human review**, not automatically treated as visually approved.
- Main `michels-lab/Michel-Software-Standards` has versioned cross-app rendered-brand acceptance rules and QA/Agent/Release Governor gates; child agent contract is synchronized on the FoamLens fix branch.
- Current stable v1.6.2 is unchanged; no new release is authorized. Validation/evidence of candidate screenshot review remains pending until CI completes and output is inspected.

### 2026-10-08 — Brand/visual release gate hardening after v1.6.2
- Found a live localized About regression: `syncLanguage()` overwrote the canonical `TOOLS WITH IDENTITY.` with the obsolete studio slogan in EN and ES. Fixed both dictionaries and replaced the dark-text product lockup on About with the untouched canonical mark, visibly preserved in compact layouts.
- Added actual packaged WebView2 Home/About screenshot and measured identity checks at wide + compact viewport emulations, including canonical portrait/studio, readable social network names/icons, scrolling and Close.
- Vendored the master's fail-closed UI evidence validator and added immutable screenshot manifests bound to the exact source SHA and installer/MSIX artifact SHA-256. The Store visual capture is from the running unpacked Store executable and does **not** establish installed/signed Store-package verification.
- Removed direct GitHub Release publication from Windows `build` and moved it behind a separate `publish` job using `visual-release-approval`; this job refuses to publish without an independent real GitHub environment approval record and same-SHA/installer screenshot evidence. Configuring at least one human required reviewer for that GitHub Environment is an external prerequisite. Until configured, automatic publication is intentionally blocked.
- No new release was authorized; latest stable stays v1.6.2. Preserve the canonical product mark and Michel's Lab asset bytes.

### 2026-10-08 — Unified FoamLens UX redesign (candidate, visual QA pending)
- Root issue: accepted brand SVG files were placed into unrelated, oversized launch/About/sidebar cards while Data/3D/Analysis owned inconsistent toolbar, state and panel semantics. User requested a single product-native UI based on FoamLens's layered field geometry and retained usability under panel collapse.
- Consolidated compact About product→author+studio→contacts composition, with five social icons/names above fold at normal desktop sizes and real WebView2 bounds gate, preserving official portraits/logos byte-for-byte.
- Added fixed application identity/name and permanent About/Updates global actions; legacy collapsible sidebar branding is hidden when Ribbon shell is active; Store-channel Updates explains Microsoft Store ownership.
- Field ribbon now uses compact primary command row and one-at-a-time Inspect/Compare/Camera subbars, with optional cache controls; all 3D navigation buttons moved to a docked toolbar outside scientific viewport; camera directions collapsed.
- Data hides 3D case comparison sidebar settings; default startup uses single Field 3D view, explicit imported Workspace compare remains opt-in; Compare 3D reveals view-B inspector controls.
- Native OpenFOAM large-field progress now owns a push/pop lifecycle, displays non-fabricated stalled/waiting feedback and clears its timer and toast in finally.
- Added static regression guards, but runtime screenshots of actual Windows Data/Field/Analysis/regular About still require inspection and acceptance. This is not a new release and does not change canonical assets.

## 2026-10-08 — PR #32 integration on current main (candidate, not a release)

- Rebased the cohesive Field/Data design changes from `design/foamlens-cohesive-ui-20261008` onto main `ef400dcee2c221a807f889b32b17dcf1da5c9524` by constructing a two-parent reconciliation commit.
- Retained the newer About changes from PR #34 (paired product/studio design, five named socials visible in the initial viewport) instead of restoring superseded About CSS/markup.
- Moved About/Updates to persistent chrome, added a one-at-a-time 3D contextual ribbon, default single 3D viewport, Data sidebar scoping, OpenFOAM load feedback and global design tokens.
- Corrected the packaged Windows runtime smoke to expect persistent `flGlobalUpdates` instead of deleted `flRaCheckUpdates`. Earlier failed Windows #37749410491 due solely to `missingActions:["flRaCheckUpdates"]` in its runtime Ribbon assertion; the real OpenFOAM fixture passed.
- Preserved PR #33 policy: automated visual evidence and artifact integrity remain mandatory; owner visual review occurs after publication, not as a manual pre-release blocking gate.
- Same-SHA Windows and Store CI are **pending** for the resulting integration commit. Do not declare a new release from this log entry.

## 2026-10-08 — Authorized FoamLens Desktop v1.7.0 release

- User explicitly requested `dale release` after FoamLens PR #32 was merged into `main` at `b7def31cffbe3044e6663ae5964c11bd9661d343`.
- Exact-HEAD Windows CI #37757447075 and Microsoft Store MSIX CI #37757447024 were both SUCCESS before the release version bump.
- Prepared Desktop, installer, frontend fallback, README and version-contract tests for v1.7.0; v51 remains the embedded frontend version.
- Reconciled a stale GitHub release `publish` job that still required a pre-release human approval although the owner explicitly chooses to inspect rendered visuals after release. Kept automated runtime screenshot, checksum, provenance and exact-artifact release gates mandatory.
- Release authorization triggers a `release:` commit on main and full same-SHA Windows / QuickCup / Store workflows. **At commit time, publication is pending current release SHA checks, not yet verified.**
- No assertion of signed binaries, Microsoft Store certification or Partner Center publication.

### 2026-10-08 — v1.7.0 publication verified (post-release audit)

- Authorized release commit: `2f8ec4af09e679af889f6b5d8ca4936a9ae519bc` (`release: FoamLens Desktop v1.7.0`).
- Exact release-SHA Windows Actions run `37807950228` completed **SUCCESS**: real QuickCup regression, frontend/scientific tests, portable execution, installer installation/launch, and exact-artifact Home/About screenshot integrity validation. Separate `publish` job completed **SUCCESS**.
- Exact release-SHA Microsoft Store MSIX Actions run `37807949937` completed **SUCCESS**; artifact `FoamLens-Store-v1.7.0` produced. Store acceptance/Partner Center publication remains **not verified**; package is unsigned for Store submission and is not a direct-download installer.
- GitHub stable release `v1.7.0` published at `2026-10-08T16:27:17Z`: https://github.com/michels-lab/FoamLens/releases/tag/v1.7.0 . Assets: `FoamLens-Portable-v1.7.0.exe` + `.sha256` and `FoamLens-Setup-v1.7.0.exe` + `.sha256`.
- Owner's visual review is post-release; CI screenshot-based gating remained mandatory. No Authenticode signature or Microsoft Store certification is implied.

## 2026-10-08 — Next-version FoamLens visual regression candidate (not released)

- User screenshots from v1.7.0 show a small launch logo, unapproved circular arcs/ticks in the purported canonical mark, uncentered launch composition, stacked/crowded Field Ribbon, hidden camera direction presets, two 3D viewports perceived as default, and inaccessible per-view case selectors in the sidebar.
- Master Michel's Lab draft PR #28 removes rejected arcs/ticks from three FoamLens SVGs; the wave/field concept remains. **Not approved or merged to master.** The Windows ICO derivative still needs regeneration and visual validation before any next release.
- FoamLens branch `design/foamlens-next-centered-launch-20261008` contains a candidate: large centered launch mark, centered content, arc-free brand source SVGs, compact single-row Field Ribbon, exclusive Inspect/Compare/Camera subbars, visible Front/Back/Left/Right/Top/Bottom/Isometric commands, and reparented orbit/pan/zoom tools so the canvas is not covered by a second toolbar.
- Field inspector exposes Case/Region choices for View A and optionally View B at the top; B remains hidden until explicit Compare. 3D comparison must not open on first Field entry due to implicit saved flags; scientific comparison and user's deliberate multi-view control remain available.
- Static visual checks and native geometry checks strengthened. **Candidate validation pending exact-head Windows / Store CI, owner review and Windows icon update.** Keep v1.7.0 unchanged; no new public release authorized.

### 2026-10-08 — Next UI candidate: exact-code CI verification

- Source candidate commit `c6489d741987d457b38d47b6bca4ce6397f1d63f` in draft FoamLens PR #35 passed the Windows CI run [#37813484567](https://github.com/michels-lab/FoamLens/actions/runs/37813484567): real QuickCup/VTK, scientific and JavaScript regression tests, packaged portable runtime smoke, actual Windows installation/runtime smoke, native Home/About screenshot evidence and artifact validation. The publication job correctly skipped because this is a design branch, not an authorized release.
- Same source candidate commit passed unsigned Microsoft Store MSIX build/smoke/evidence in CI [#37813484605](https://github.com/michels-lab/FoamLens/actions/runs/37813484605). Neither Microsoft Store publication nor signing is implied.
- Runtime visual checks measured a single-line Field Ribbon at 50px high with no primary-row overflow, mutually exclusive Inspect/Compare/Camera subbars, visible front/isometric camera presets, independent sidebar case/region selectors per view, a single 3D view by default, and the secondary canvas/selector hidden when comparison is off. Centered splash/launch dimensions and dark/light text contrast were validated with native WebView2.
- Earlier candidate CI failures were investigated and fixed: a missing generated CSS-array comma prevented Ribbon mounting; native smoke initially accessed an unexposed lexical variable instead of the official comparison API; and one existing Field View regression asserted a fragile adjacent source string rather than render order.
- **Next-release blockers:** Windows ICO is a stale raster derivative still potentially showing the owner-rejected arcs and must be regenerated from the corrected design, and Michel's Lab canonical branding PR #28 remains draft pending owner visual feedback. PR #35 remains draft; do not merge or release without resolving these items and explicit release authorization.

### 2026-10-08 — Regenerate rejected Windows/Store icon from the canonical source

- Resolved the remaining derivative drift: `tools/generate_windows_icon.py` now rasterizes the arc-free `official-app-icon.svg` using pinned `resvg_py==0.5.0` into seven lossless PNG-encoded Windows ICO sizes (16,24,32,48,64,128,256). Generated icon has neither circular-orbit brackets nor cardinal tick marks.
- Windows and Store packaging CI regenerate the ICO **before** compiling and run `--check` to ensure exact source parity. `windows-icon.test.cjs` validates all seven embedded PNG frames, dimensions, offsets and installer/desktop icon wiring; obsolete opaque `>100 KB` size assumption removed.
- Added candidate-only `sync-foamlens-icon.yml` to commit the generated ICO binary back into the FoamLens branch, then dispatch exact-current-head Windows and MSIX validation after the binary commit; a release never triggers from this design branch.
- Master Michel's Lab branding PR #28 is still under integration at the time of writing. Actual icon-sync workflow results and fresh CI remain **pending** until GitHub completes them; do not claim signed executables, Store approval or a new release.

### 2026-10-08 — ICO sync orchestration correction

- Initial stand-alone `sync-foamlens-icon.yml` run #37815926542 ended in a no-job workflow failure, so it is not a proven synchronization path and is removed to prevent false-green branding claims.
- The existing, already functional Store MSIX workflow now regenerates and validates the arc-free Windows ICO with the packaged executable, then (on `design/**` only) commits that exact generated binary to its source branch and dispatches Windows/Store checks against the resulting commit.
- Both Windows/Store build workflows generate/verify the source-bound icon before their actual .NET packaging. This prevents both stale binaries and false claims of a corrected icon when the Git tree still includes the old one.
- The generated binary commit, successful subsequent CI and canonical master PR merger remain **to be verified**; do not publish a new release from the design branch.

## 2026-10-08 — Owner indefinitely pauses Microsoft Store builds

- **Owner instruction:** stop generating FoamLens Microsoft Store versions and spending GitHub Actions resources on MSIX packages for **all future FoamLens releases** until the owner explicitly authorizes a restart. This pause includes auto-CI, manual jobs, uploads, submission and certification. Direct Windows releases continue normally.
- Disabled `.github/workflows/build-store-msix.yml` on `main` in commit `d91b3a2df06b4d8f517c94e016727db91ffc2623`: removed push triggers, left `workflow_dispatch` for archival visibility and added an unconditionally false owner-resumption job guard, so no Store runner is allocated even if a person manually clicks Run Workflow.
- Disabled the same Store workflow on development PR #35 (`design/foamlens-next-centered-launch-20261008`) at commit `92d59464c621f4c4f18df8dbb581bf1026410af1`. Windows CI now owns on-demand icon synchronization and only dispatches the Windows workflow, never Store.
- Microsoft Store workflows that started **before** this explicit pause completed already; no active Store runs needed cancellation at the time of inspection. The last Store run for the arc-free ICO candidate was `37816516921`, successful on commit `8ff70d1`. This does not indicate Store submission or publication.
- Added a durable owner-specific pause exception to master Michel's Lab policies `standards/PRIVACY_AND_STORE_STANDARD.md` and `standards/CI_CD_STANDARD.md` in `Michel-Software-Standards` commits `bf6d826`/`22473ea`. No resumption date was requested; only a **new explicit user instruction** reactivates MSIX builds.

## 2026-10-08 — PR #35 branch/main integration

- Reconciled the GitHub main Store pause and project audit with design branch changes without replacing the newer Windows UX fixes or canonical arc-free app icon. MSIX workflow on merged branch is the paused main version, with no `push` trigger and an unconditionally false job gate. Owner explicitly authorized integrating changes and releasing Windows, **not** Microsoft Store.
- Windows icon source/master and on-disk ICO are synchronized; PR #35 latest pre-integration Windows CI #37816512451 and MSIX CI #37816516921 succeeded on icon-sync SHA `8ff70d1`. The next release requires *fresh* current-head Windows validation; no new Store CI is requested.

## 2026-10-08 — Authorized FoamLens Desktop v1.8.0 Windows release

- User explicitly authorized merging all PR #35 changes and publishing the next FoamLens release. PR #35 successfully merged into `main` in commit `dbd3a23b8071d248f2168a2b8ed8a10c5eba0cb8`.
- Bumped assembly, installer, README, fallback version and version-consistency contract to **1.8.0**, retaining frontend v51. Wrote user-visible release notes for the corrected brand, centered Home launch, compact Field Ribbon, camera presets and case-per-view selectors.
- Release is dispatched by a `release: FoamLens Desktop v1.8.0` commit on `main`; actual binary publication is **pending exact-release-SHA QuickCup, packaged portable/installed Windows and screenshot-to-artifact integrity gates at commit time**. Do not claim the public release exists until GitHub release API confirms tag/assets.
- Microsoft Store MSIX auto-build, manual job, upload, signing and submission remain indefinitely **PAUSED** by explicit owner instruction. No MSIX run is required or authorized as part of v1.8.0.

### 2026-10-08 — Corrected inactive Microsoft Store gate before v1.8.0 publication

- Release candidate commit `d3a94b3d6d51feb727a784885ff658c9990c733b` triggered exact-SHA Windows run [#37819274733](https://github.com/michels-lab/FoamLens/actions/runs/37819274733). Real QuickCup regression **SUCCESS** and Windows icon generation/compilation succeeded, but the build **FAILED** in `desktop/tests/windows-icon.test.cjs` because an old cross-channel assertion demanded an active icon parity step inside the now-paused Microsoft Store workflow; the publish job correctly skipped. No public v1.8.0 existed after this failure.
- Updated the test to require exact-source icon parity in active Windows CI and only require parity inside MSIX CI when that channel is active. Paused Store status is checked via absence of `push` and the explicit false owner-resumption job guard, avoiding any Store build or weakening native icon validation.
- A fresh `release:` commit retriggers v1.8.0 Windows tests and publication; **new exact-head release status pending** until GitHub release API proves tag/assets. Microsoft Store still paused.

## 2026-10-08 — FoamLens Desktop v1.8.0 published and verified

- Release commit and exact Git tag: `235e230405b489b39bace7172a4082bb594557bb` (`v1.8.0`). GitHub release API confirms **published**, non-draft, non-prerelease at 2026-10-08T17:59:14Z: https://github.com/michels-lab/FoamLens/releases/tag/v1.8.0.
- Exact release-SHA GitHub Actions [Windows run #37819926553](https://github.com/michels-lab/FoamLens/actions/runs/37819926553) completed **SUCCESS** in all three jobs: real OpenFOAM QuickCup regression; Windows build with native source-derived arc-free icon, frontend scientific and visual regression suite, packaged portable and installed executable smoke; and automated verified-artifact release publication.
- Published asset inventory verified via GitHub release API: `FoamLens-Portable-v1.8.0.exe` (73,656,455 bytes), `FoamLens-Portable-v1.8.0.exe.sha256`, `FoamLens-Setup-v1.8.0.exe` (68,447,199 bytes), `FoamLens-Setup-v1.8.0.exe.sha256`.
- Tag ref `refs/tags/v1.8.0` points to the **same exact** commit as CI head and verified `main` at publication. Public binaries contain the previously merged PR #35 centered/arc-free launch, compact Field Ribbon, camera presets and per-view case selectors.
- **Microsoft Store remains paused indefinitely**: no MSIX build was triggered by the v1.8.0 release commit, and no Partner Center upload/submission/certification is claimed. Windows signing credentials were unavailable/unused; release does not imply Authenticode signature.
- Owner visually reviews the downloaded v1.8.0 after publication; CI cannot guarantee subjective design acceptance beyond runtime screenshots and geometry checks. Any follow-up refinements belong to a later version, not a silent overwrite of v1.8.0 artifacts.

## 2026-10-08 — Root-cause fix: Data 2D vs Field 3D ownership (next version, unreleased)

- User screenshot of desktop v1.8.0 exposed `Synchronized 3D case comparison` inside `Data → Load Data` below catalog filters, burying the legitimate Data plot choices. Owner explicitly requires architecture correction, not CSS masking.
- Root cause: `fvInstallUi()` created `fieldViewControls` *after* Data `catalogControls` inside Load Data and appended `fieldViewPanel` directly into the Data chart viewport, hoping a later first Field visit would reparent them. The 3D compare extension then mounted under those misplaced controls.
- Replaced the cross-module ownership with a dedicated hidden `flFieldBootstrapHost` under `document.body` marked `foamlensOwner=field`; all Field 3D controls/canvas and extensions originate there, then move only to the Field workspace's `fw3DControlsHost` and `fw3DHost`. They never originate or return to Data.
- Established explicit Data-owned `flDataComparisonCard` / `flDataComparisonHost` for 2D curve differences; advanced Analysis retains its independent scientific modules. Moved `differenceTools` out of the Analysis owner instead of duplicating its controls, preserving source/event bindings.
- Restored primary Data Ribbon choices **Time series, Spatial profiles, Solver logs, Catalog** plus **Compare 2D**. Profile horizontal/vertical line, time selection, multiple-height comparison and log solver controls are preserved. Analysis 2D Δ entry points now navigate to the same Data-owned comparison card.
- Added regression tests for DOM origin/ownership, sidebar state and Data Ribbon navigation; native WebView2 smoke checks the entire Data → Field → Data lifecycle, including that no Field controls/canvas ever become descendants of Data's Load Data/chart containers.
- **Pending:** exact-head Windows scientific/portable/installed CI and real UI review. No new public release authorized. Microsoft Store remains indefinitely paused.

## 2026-10-08 — v1.8.0 field comparison metadata and full-width desktop shell regression

- Owner's v1.8.0 screenshot still shows the second 3D viewport's verbose case/field/path text **drawn over the WebGL canvas**, clashing with the in-canvas legend; two statistical readout cards force values and units into 4 miniature columns, truncating scientific values.
- Root cause: `v14-z-field-compare.js` appended `.fcViewLabel` directly to each `.fvViewport` and gave it `position:absolute` / `bottom:12px`; the shared seven-value `.fcStatsCells` grid used four fixed columns with `overflow:hidden;text-overflow:ellipsis`.
- Structural fix: `fcComposeViewport` consistently separates a stable `.fcViewportScene` (WebGL canvas, time badge, legend, probe) from a flow-layout `.fcViewportCaption` (case/field/path, diagnostics) for primary, second, difference and extra 3D views; scientific stats now use responsive two-column values that wrap and retain units; legend ticks use bounded 3-column layout.
- New complaint: opening/resizing the settings sidebar shrinks/reflows the Field ribbon and changes font sizes; isometric and directional presets are not discoverable. Root cause: top header and Ribbon belong to the `.main` sidebar-dependent track, all tabs/actions use assorted `7/8/9/10px` typography and preset commands are buried in the Camera subbar.
- Reorganized shared `v15-ribbon-ui.js`: full-viewport fixed header and Ribbon measured via `ResizeObserver`, sidebar and workspace both start below this immutable global chrome; compact single-row action surface with consistent 10px labels, always-visible Isometric/Front/Top/Right shortcuts and remaining camera directions in Camera context, without reducing label sizes when the sidebar opens.
- Also repaired the initial ownership regression that exposed 3D comparison and animation blocks in Data before opening Field: `fwInstall` now mounts both Field controls and its viewport into the Field-owned DOM immediately. Data gained actual Catalog/Profiles/Time Series/Solver Logs/Compare Ribbon actions, restoring access to existing data views.
- Added source and native WebView2 geometry checks for long labels, no overlay, 2-column statistics, global chrome width before/after toggling settings, sidebar starting under Ribbon, uniform action typography, and live camera shortcuts.
- **Release status:** these are next-version **candidates**, not silent changes to published v1.8.0. Follow exact-head Windows CI; keep Microsoft Store indefinitely paused per owner instruction. Data-scientific enhancements and multi-region simultaneous geometry still require independent validation.


### Integration reconciliation — 2026-10-08
- Combined PR #37 Data-owned 2D / Field-owned 3D root-cause fix with PR #38 full-width Ribbon and non-overlapping 3D comparison captions in `integration/foamlens-data-field-viewport-20261008`. Ribbon retains #38 compact camera actions, #37 comparison panel ownership and routes both 2D Compare entrypoints to that Data-owned card.
- Windows/WebView2 and private QuickCup scientific validations for this integration HEAD remain **pending** until CI confirms. Actual desktop screenshots and installed UX must not be presumed successful. Microsoft Store stays paused; no release triggered.

- FoamLens `AGENTS.md` and Copilot instructions no longer demand a protected pre-release human screenshot approval. Automated rendered UI checks stay mandatory; owner review remains **post-release**, per the current master `RENDERED_UI_RELEASE_GATE.md`.
- Connector-side syntax parsing of 10 affected JS/test modules and 9 focused integration invariants passed on the integration branch. These are structural checks only, **not** a substitute for actual Windows/QuickCup/native screenshots or installed-app functionality.


## 2026-10-08 — 1024px Field Ribbon clipping & failed-build visual evidence
- Packaged Windows smoke passed real Data↔Field ownership and Ribbon navigation, then caught Field toolbar overflow at 1024px: scrollWidth=1352 against clientWidth=1024. UI fault, not a testing false positive.
- Field main Ribbon uses accessible, bounded icon-only actions under 1460px; labels remain in DOM and on hover/accessibility metadata. At <=760px redundant quick-camera icons yield to the Camera subbar. Full controls remain reachable; scientific scene is not resized or obscured by a second toolbar row.
- CI now uploads visual screenshots and native smoke logs even on failure, without uploading duplicate binaries. Await real Windows 1024px geometry validation; do not merge/release until exact-head full checks succeed.

## 2026-10-08 — Multi-region FieldScene prototype (issue #40, development only)

- **Architecture:** added actual physical-region scene layers to the existing Field WebGL canvas. Every discovered complete physical mesh region is listed and enabled by default, with per-region visibility, field selectors, opacity, Show all / Only primary buttons; primary region retains existing probe/vector/slice controls. Regions are **not** conflated with OpenFOAM processor partitions.
- **Data integrity:** each secondary region loads its own mesh and field through the existing OpenFOAM association/time parser. Only explicitly matching physical frame times are colored; an unavailable secondary field renders a visibly labeled neutral geometry-only shell if a single reconstructed mesh exists. Unreconstructed processor-only fallback does not fabricate a surface and reports the gap. Surface-face data deliberately use neutral shells pending separate boundary-aware material support rather than falsely coloring by cells.
- **Rendering:** each region allocates independent position/color/edge WebGL buffers in the SAME canvas and depth buffer; GPU buffers are released on scene changes. Camera fit computes the union of visible physical meshes. Transparency currently follows the existing WebGL alpha/depth behavior and is **not** order-independent transparency; true translucent interface compositing remains a separate validation item.
- **Unit/integration scope:** checked JS syntax, six pure-model invariants for deduplicated physical regions, exact physical times, missing time, camera union and invalid bounds. Added three Node regression tests exercising scene identity, exact time and union fit. These are **not** native Windows screenshots, scientific OpenFOAM case validation or proof of installed-app usability.
- **Integration:** this development branch is stacked on PR #39. Do not merge it directly into main until #39 is incorporated and native CI checks this exact multi-region HEAD. No Store build or release requested.
- **Remaining:** build/launch/functional and actual multiregion OpenFOAM fixture tests; robust internal face coloring for surface associations; occlusion/transparency and probe selection across all regions; export/video exact-frame and per-region controls; large case memory/performance and cancellation. No assertion that all issue #40 acceptance criteria are satisfied.

- **Subsequent hardening:** limit asynchronous region parsers to two at a time, publish independent region layers progressively, and cancel stale uploads by case/frame generation checks. GPU allocation now fails explicitly; user-visible per-region readouts survive UI/language refresh.
- **Within-region processor fallback:** a missing field at a physical frame may show neutral geometry composed from processor partitions belonging to **that same physical region only**; duplicate reconstructed meshes, absent partition snapshots and invalid topology are reported rather than guessed.
- **Additional executed checks:** mock WebGL rendered two separate region layers in one GL context (four draw calls) and released all eight GPU buffers; a partition-only geometry mock reconstructed exactly the two `solid` processors without including a `fluid` processor. Source syntax rechecked after each change. These are model/mock checks, not native/physical-fixture acceptance.
- The stacked PR remains draft until exact-head Windows install/launch/Field smoke and realistic multi-region OpenFOAM tests pass. No release triggered.

- **Animation integrity hardening:** video exporter now waits for all physical-region layers of each frame; an unavailable visible region aborts export instead of silently delivering an incomplete image. Frame preload scans and fixes **independent per-region, per-field, per-component and per-dimension** color ranges across time, restoring interactive per-frame ranges afterward; failure cleanup resets scan state.
- **Verification:** six new, isolated multiregion regression tests were actually executed through a JS source/test harness and passed; frontend, animation module and test syntax compiled successfully. Additional mock WebGL and processor-region isolation checks passed. Full Node suite, real OpenFOAM data, packaged WebView2 visual pixel checks, installed Windows smoke, memory/occlusion and real video playback remain unverified; do not promote this PR from draft or claim the feature finished from these tests alone.


## 2026-10-08 — Owner's full unresolved UI/UX bug batch reopened and audited

- **Tracking:** issue #30 now lists ten acceptance conditions D01/D02/F01/F02/F03/R01/S01/A01/U01/Q01 for Data 2D/time profiles/probes/logs, physical 3D regions, second comparison view, toolbar/chrome, logo, About, social links and visual consistency.
- **Owner's screenshots override stale closure notes:** implementation or isolated JS tests do not prove a visible regression is fixed. PR #39 is unmerged; PR #41 is a draft stacked on #39.
- **Actual CI root causes:** the integration Windows job failed ribbon-ui.test.cjs due to outdated legacy Data click expectations; the Field branch failed isosurface.test.cjs due to a stale condition that ignored region visibility; section-ownership.test.cjs subsequently failed by matching whitespace/formatting instead of the real Data difference navigation behavior.
- **Corrections:** both PR branches now use the canonical Data action ID flRaDataTimeSeries in native ownership smoke and robust section ownership assertions; Ribbon checks the new canonical Data view navigation; the iso suite honors primary region visibility. All three complete regression suites were executed against fetched GitHub source with JS module mocks and passed (Ribbon, six iso checks, eight ownership checks).
- **Native acceptance expanded:** WebView2 smoke now checks persistent FoamLens product mark/name, About and Updates inside the full-width global header even after sidebar collapse; Probe/Clear must be docked in tools outside scientific viewport. Canonical branding unchanged.
- **Limits:** exact-head Windows Actions are still processing; no packaged native screenshot/real scientific fixture/large dataset usability may be claimed on the basis of JS checks. Microsoft Store remains paused; no release; Michel's human review is post-release, not a manual pre-release gate.


## 2026-10-08 — Multiregion visibility and frame resource ownership

- Corrected visible-only camera fit (hidden primary no longer expands bounds); targeted regression passed.
- All visible-region controls now go through one owned visibility manager. Hiding a physical region frees its own GPU buffers and invalidates pending loads. Showing it again requests its actual missing frame. Hidden secondary regions are not parsed or allocated at each timestep.
- Starting a new physical frame releases old secondary layers before the new primary field arrives, preventing silent cross-time composites during asynchronous updates.
- Added regression with mock GL allocations/deletions, checked union bounds of visible meshes only. Real packaged WebView2/QuickCup acceptance remains pending; no release.


## 2026-10-08 — Secondary physical-region face field mapping
- Region compositor now triangulates actual OpenFOAM internal faces when association=surface and exact face counts match. Colors use the actual indexed `internalField` face values and region-specific video range; never color unknown boundary patches as if they were measured.
- Neutral shell rendered translucently around colored internal faces; GPU face buffers freed on region hide, case change, timestep change or error. Invalid counts fall back to explicit neutral geometry, not synthetic data.
- Added dynamic V8 regression for 2-face fixture, real face index mapping, draw opacity, 6 GPU buffer allocations/releases. Runtime packaged Windows and a physical multiRegion fixture still required before release.

## 2026-10-08 — Sync to validated main and unified scientific opacity
- PR #39 merged into main after exact-head QuickCup and packaged/installed Windows CI passed. PR #41 preserved independent physical-region WebGL scene, exact-time/association field mapping, independent native smoke checks and all additional scientific regressions.
- Opaque surfaces still write depth; translucent outer shells and fields with interior/face rendering no longer block depth for other regions in the same scene. This is standard alpha blending, NOT order-independent transparency; a future rendered multiregion fixture must still validate occlusion and exact frame consistency.
- The integration commit has both branch head and main as parents; no release or Store publication.


## 2026-10-09 — Real packaged scientific multiregion acceptance
- Verified the private B13 QuickCup OpenFOAM fixture has BOTH `constant/metal/polyMesh` and `constant/mold/polyMesh` with complete points/faces/owner/neighbour, plus genuine `9.8/mold/T`; not synthetic meshes, not duplicated case identities.
- Windows portable and installed smoke now require `metal;mold` physical regions in the SAME case and single WebGL context. The smoke-only helper awaits all secondary real fields at the primary physical time, checks the T field, exact time, finite range, mesh ownership, positive cell/triangle counts, distinct meshes and shared GL context, failing closed if an imported region is missing or drawn as geometry-only. Actual composited pixels are saved as `visual/{portable,installed}/field-real-multiregion.png` for visual review.
- Added permanent regression to ensure this runtime fixture requirement cannot silently be removed. Full exact-head Windows CI pending; PR #41 remains draft; no release.


## 2026-10-09 — Unsplitted parent mesh is not an extra physical region
- Verified the real private B13 QuickCup case contains `constant/polyMesh` of its unsplit source and `constant/metal/polyMesh`, `constant/mold/polyMesh`. Only metal/mold have `0/` and `9.8/` physical fields; the unsplit parent is NOT a third simultaneous physical region.
- Region inventory now omits that root mesh only if named real regions exist AND root has no independent field-bearing time-series. It preserves genuinely field-bearing default regions. Added dynamic discovery test for both scenarios.
- Native installed-runtime multiregion acceptance checks both WebGL2 and WebGL context types, rather than rejecting an otherwise valid WebGL2 renderer. Re-run exact-head Windows fixture smoke; no release.


## 2026-10-09 — Visible outer mold and native test contract
- Fixed a stale regression assertion: Windows unit test expected a different native multiregion success-log string from the actual C# emission. The smoke itself had NOT run at that failed revision; no false scientific PASS claimed.
- Physical secondary layers now start visible but translucent (opacity 0.48) so a surrounding mold does not by default occlude the selected primary metal region. Primary opacity remains 1 and every user-edited region opacity remains independent. A dynamic V8 regression verifies both initially visible and correct alpha selection.
- Re-run installed portable + installer smoke requiring real B13 metal/mold fields, shared GL and captured composition. CI pending, PR #41 draft and unreleased.

## 2026-10-09 — Explicit Windows CI coverage for multiregion contract
- Added the new `desktop/tests/multiregion-release-contract.test.cjs` as an explicit `build` job step in `.github/workflows/build-foamlens-desktop.yml` (commit `2b00756`). Previously the test was committed but not executed by the workflow.
- Static readback confirmed the step exists immediately before the existing 3D Field View suite. Actual exact-head Windows run has **not** been observed or validated in this session.
- Connector `fetch_commit_workflow_runs` reports only pull-request-triggered runs; this workflow uses push and manual dispatch. An empty connector result must **not** be treated as proof that no push CI ran. Check Actions UI/API with unrestricted workflow run listing before claiming a CI block or PASS.
- `main` received separate shared-agent policy PR #42 after this branch's base; reconcile before merge. No merge or release performed.

## 2026-10-10 — Data Time Series Ribbon regression guard
- Issue #30 review found `desktop/tests/ribbon-ui.test.cjs` asserted retired identifier `flRaDataTime` using `source.includes`. That assertion passed accidentally because the real `flRaDataTimeSeries` contains the old string as a prefix.
- Updated the test to check the canonical `flRaDataTimeSeries` command, its actual Data Ribbon HTML creation and the `flRibbonOpenDataView('timeseries')` navigation binding. Also explicitly reject rebinding the retired command.
- Scope is regression-test hardening only; no UI or science implementation has changed. Exact-head Windows/QuickCup CI and native interactions remain pending. No release.

## 2026-10-10 — Data/Field plot-view restoration root fix (issue #30)
- Found a lifecycle ordering bug: `fwLeave()` overwrote `currentDataView` with `dataViewBeforeField` before `FoamLensPlotSurfaces.activate()` captured the outgoing Field surface. This could persist the Data tab as the Field plot view, losing Field's own profile/time-series/log selection when navigating back.
- Keep the Field view intact for the independent surface manager's capture, and retain the previous Data view fallback only when no Field plot surface is active. Do not move controls or change the approved UI.
- A focused executed JavaScript mock verified the old function incorrectly changed Field's `profile` to Data's `timeseries`; the corrected function preserves `profile` for active Field surfaces and restores `timeseries` in legacy fallback. The permanent Node `section-ownership.test.cjs` suite now includes this regression.
- Pending: exact-head Windows Actions + real Data → Field (profile/time series/log) → Data → Field native interaction, packaging and screenshots. No version bump or release.

## 2026-10-10 — Native Compare A/B swap failure traced to Field selector remount (issue #30)
- CI Windows installed-app smoke failed twice on original PR #44 HEAD, despite a passing portable smoke. Both executions reported `swapApplied=false` and `swapRestored=false` while real multi-region QuickCup passed.
- A third diagnostic run preserved exact UI selector evidence: before swap `fvCase=1`, `fcCase=2`; `swapPrimaryCompare()` returned true twice, but after both swaps the UI selectors were `fvCase=1`, `fcCase=1`. This is a genuine case-selection regression, not a failing synthetic assertion.
- Root cause candidate identified in `fvInstallIntegration`: recurring metadata and `refreshDatasetControls` callbacks invoked `mount()`, which unconditionally called `fvRefreshSelectors(false)` and reset the primary selected case to context/default. Redundant follow-up refreshes amplified the race.
- Fix: initialization now performs non-preserving selection only if the primary case selector is empty; later metadata/dataset refreshes preserve the current valid selection and do not repeat the refresh. Added executable Node regression checking both selector states, plus existing native true A/B swap contract remains a mandatory release gate.
- Pending a new exact-head Windows run (QuickCup, portable and installed runtime) to confirm both the Data/Field state fix and A/B swap. No merge or release until validated.

## 2026-10-10 — Data: scientific 2D case/probe comparison correctness (issue #30)
- Root cause: Difference Plot listed probe indices from any loaded time-series case, rather than those present in **both** selected cases with the chosen canonical variable. This exposed non-comparable selections and produced the misleading "missing pair" error. A blank `differenceProbe` was also converted with `Number('')===0`, silently selecting physical probe 0.
- Changed the canonical Data code to derive the sorted **intersection** of source-case probe IDs, offer only variables sharing a real probe, preserve an existing valid probe across refresh, and disable delta creation if no compatible A/B probe pair exists. A missing selector now fails closed and cannot silently create a probe-0 difference.
- Added a dynamic regression in `desktop/tests/section-ownership.test.cjs` that exercises actual Data functions and simulated case/probe selectors: common probe 5, disjoint probe 0/9, blank probe 0 coercion, compatibility changes A/B and preserved selection. Existing underlying OpenFOAM time-array interpolation remains unchanged; no values are fabricated.
- Pending exact-head Windows QuickCup, packed portable and installed WebView2 regression and real Data/Probe screenshot acceptance. No release authorized in this patch.

## 2026-10-10 — Time Series Variable 2 restored in Data (issue #30)
- Confirmed a missing rendered control: Field-generated independent time-series histories attempted to select `timeSeriesVariable2`, but no such DOM element existed in the Data UI. The primary-only `timeSeriesMatchesSelection` filter consequently hid the second scientific variable.
- Added an optional Data Time Series **Variable 2** selector alongside Cases. It supports one additional independently measured OpenFOAM variable, keeps the primary variable selected, excludes duplicates, retains compatible choices during refresh, respects explicitly chosen case/probe filters, and includes both source curves in the actual plot set. 'All variables' remains a separate mode.
- Field's two-history builder now leaves the shared probe filter on 'All probes' when its two curves may originate from different physical probes or viewports; it no longer automatically hides one after generation.
- Added dynamic JS behavioral regression for T + alpha1 simultaneous display, hidden U, manual probe matching, clear second variable and 'All variables' fallback. Native packaged WebView2 Data ownership checks require the additional selector. All measured values remain original imported data.
- Pending exact-head QuickCup, Windows portable and installed UI smoke, narrow layout screenshots and owner post-release acceptance. No release in this change.

## 2026-10-10 — Data: Solver Logs, profile history and real probe-sample guards (issue #30)
- **Solver Logs playback root cause:** `startLogPlayback` enabled evolution mode before validating that at least two distinct physical times/subiterations exist. An insufficient dataset left `logEvolutionActive=true` and filtered away the original loaded solver residual curves. Now validates first and restores the raw log view with actionable insufficient-samples feedback; valid time/member playback remains available.
- **Physical attribution:** `logAvailableMembers` no longer turns null/empty subiteration metadata into fabricated subiteration 0 via `Number(null)` / `Number('')`.
- **Spatial-profile histories:** empty coordinates no longer become real 0-unit positions; legitimate numeric zero remains supported. Profiles with absent/blank/nonfinite physical time are omitted rather than interpreted as t=0. The history builder explicitly flags invalid coordinates instead of silently producing an empty graph and refuses nonfinite time-axis samples.
- **Regression:** three executed-function JavaScript tests cover rejected/valid Solver Logs animation, absent solver subiterations, valid/blank probe-profile coordinates, missing physical time, and finite cell/point temperature-at-probe samples with out-of-bounds rejection on a representative two-cell geometry.
- **Limitations:** these are dynamic deterministic fixture checks and source fixes; not independent proof of every user-supplied OpenFOAM log/profile format or a full installed-app plot screenshot. Exact-head Windows QuickCup, portable, installer and UI smoke must pass before merge. No release.

## 2026-10-10 — Field multiregion: strict physical-time metadata provenance (issue #40)
- Reviewed `fvRegionExactTime`: raw `(times||[]).map(Number)` could turn null, empty strings and booleans into a fabricated numeric `t=0`. In scientific FieldScene this could mislabel a region field as physically available even when OpenFOAM discovery had no valid timestamp.
- Introduced `fvRegionPhysicalTime` to accept only actual finite numbers or nonempty numeric strings, rejecting null/undefined/empty/boolean/nonfinite values. Both physical target time and per-region available times now use the same strict check before displaying a colored field.
- `fvRegionNames` applies the same metadata validation to whether an unsplit root mesh contains independently timed physical fields. It no longer treats a placeholder `[null]` or `['']` as a real third region, but preserves a genuinely field-bearing default region at numeric t=0.
- Added and executed the real scene-function regression in `desktop/tests/field-view.test.cjs`: missing vs genuine t=0, actual 9.8 s, invalid target time and phantom root-region rejection. Rendering, WebGL GPU ownership, optical transparency and raw OpenFOAM values unchanged.
- Required before merge: exact-head Windows QuickCup fixture plus packaged/installed OpenFOAM WebView2 smoke. This does NOT yet validate cross-region probing, order-independent translucent surfaces, all asynchronous-time export cases or performance on huge meshes. No release.

## 2026-10-10 — Consolidated FoamLENS acceptance batch: real multiregion probes and rendered workspace evidence (#29, #30, #40)
- **Physical science/probe root cause:** the original primary probe looked only at `fvState.mesh`/`fvState.fieldValues`, even when metal+mold rendered in the same WebGL viewport. It could not inspect secondary physical regions and had no independent source case/region/unit attribution.
- **Implementation:** `v14-field-view.js` now preserves a reference to each rendered region layer's own real CPU field array (no duplicate value copy), and its transparent secondary layers are sorted back-to-front with a non-destructive GL depth policy. The actual pinned probe marker renders after the region layers so translucent material never obscures its selection.
- **Independent region probe:** `v14-probe-picking.js` now provides Auto / explicit region choice, raycasts each visible layer's *actual triangles*, maps cell-associated T using surface-owner IDs, point fields by barycentric triangle interpolation and internal-face fields by original face IDs. Geometry-only layers return an explicit missing value; hidden regions are not pickable. Readout displays the selected physical region, real field, storage association, unit and physical time, not implicit primary values.
- **Physical time histories:** pinned probes carry their measured case/region provenance into Field Workspace. `fwBuildProbeFieldHistory` forbids sampling an XYZ probe in an unrelated OpenFOAM case/region even if physical coordinates overlap. The user must select the matching case and region.
- **Tests:** executed actual region raycast source against synthetic front translucent mold/inner metal, point-vs-cell-vs-internal-face associations, explicit Auto/region selection, hidden shell, geometry-only missing values; checked case/region ownership of time histories. Exact candidate Windows smoke now measures secondary-region QuickCup values against source mesh cell/face values and requires a visible region selector.
- **P0 evidence:** the real packaged native Windows runtime now captures **Data and Field wide/compact screenshots** in addition to Home and About; asserts the Field toolbar does not geometrically overlap the canvas and that Data retains 2D controls without a 3D panel. `make_visual_evidence.py` binds all four workspaces to exact source SHA plus both Setup/Portable SHA-256 values; `visual_release_gate.py` requires wide and compact coverage for every mandatory surface; publisher verifies both binary digests before shipping.
- **Validation boundaries:** tests against actual installed QuickCup, screenshot hashes and app geometry will be decisive; targeted source/fixture tests alone are not proof of complex translucency at all angles, real user approval or performance at arbitrarily large meshes. Do not close #30/#40 or ship unless current-head Windows jobs pass; owner reviews screenshots **after** the release, not before.
- **Status:** branch implementation prepared; full exact-head Windows CI and packaged screenshot evidence pending. No version bump or release yet.

- **Immutable release safety:** closing issue #29 also uncovered a publisher branch that used `gh release upload --clobber` / `gh release edit` for an already-published version. The release job now fails closed if the tag already has a GitHub Release and requires a new versioned candidate. This preserves prior installer SHA-256, screenshots and owner post-release feedback without silent overwrites.

### CI troubleshooting — real QuickCup secondary-region Probe
- Windows Actions #1112 passed full QuickCup and scientific JS/C# build, but its first portable WebView2 smoke returned null in the newly introduced secondary-region probe script. Actions #1113 added fail-closed JavaScript diagnostics; the actual error was `ReferenceError: fvBuildSurfaceBuffers is not defined` from native ExecuteScriptAsync (the bundler deliberately scopes that helper privately), **not** bad metal/mold field data.
- Root correction: `fvRegionBuildLayer` now keeps a reference to the exact `shape.surfacePositions` already triangulated and sent to WebGL as `probePositions`. CPU raycasting and native probe smoke consume those same real triangles directly, eliminating an out-of-scope private-function reference and avoiding duplicate large-mesh triangulation. The dynamic regression now fails if the picker tries to regenerate geometry.
- Both failed native runs are preserved, not treated as validation. New exact-HEAD Windows QuickCup / portable / installed gate is required before merge.

- CI #1118 confirmed another private-bundler boundary: `fvTimeEqual` was not accessible from WebView2's external script context. The native smoke now uses explicit finite numeric time comparison on the already-validated physical layer, rather than calling private internals. For the same reason, Data/Field screenshot checks now read the **public** `window.FoamLensFieldView.getVideoDescriptor()` instead of private `fvState`. The real scientific raster and data APIs remain unchanged. Exact-head CI must confirm both interfaces before any merge.

## 2026-10-11 UTC — PR #49 native Windows probe-region selector regression

- **Evidence:** Exact-head Windows Action #1121 (run 38113972062, SHA `4c70764827729ca7fa92c3e44c28938aec9c93da`) compiled and passed real QuickCup and all 76 preceding build checks; composite metal/mold WebGL scene and real mold cell temperature at physical t=9.8 s passed. Packaged smoke failed when `selectorPresent=false` for the measured `mold` region, despite correct 303.063 K source/picked values. Installer and rendered-evidence steps were skipped; no release.
- **Root cause:** `fvRegionRefreshList` called nonexistent optional `window.FoamLensFieldProbe.refreshRegions`, while the actual probe module exports `fpRefreshRegions`. Optional chaining silently skipped option reconstruction after OpenFOAM case discovery.
- **Action:** Connect to the real exported refresh API, preserve valid selected probe regions and remove stale choices when changing cases; add executed-function regression for metal+mold discovery, selection persistence and stale-region removal.
- **Validation:** Local JS function-execution check passed against the corrected code and mock DOM (3 refresh cycles); full exact-head Windows QuickCup, packaged Probe, installer and rendered workspace evidence still **pending** at commit time. No PR merge, version bump, release or Store work authorized by this fix.

## 2026-10-11 UTC — PR #49 Windows screenshot gate follows real Camera shelf

- **Evidence:** exact-head Windows Action #1122 (run `38116249131`, SHA `16b676cf764556874f84590b572e3eed8fe89e0a`) passed QuickCup, JS suites, executable scientific metal/mold same-WebGL scene and real mold Probe value 303.063 K. It failed later during the new `CaptureScientificWorkspaceEvidenceAsync` wide screenshot check: `toolbarCanvasOverlap:null`, because missing toolbar bounds were represented as Infinity and JSON serialized Infinity to null.
- **Root cause:** screenshot gate queried `#fieldViewPanel .fvViewTools`, a stale pre-Ribbon parent. The actual `flRibbonFieldSubbars` reparents `.fvViewTools` into `#flFieldContextShelf` and intentionally hides it until Camera is selected. This was a **false visual test location**, not evidence the toolbar covered geometry.
- **Correction:** native evidence opens the actual Camera subbar, reads the Ribbon-owned toolbar, asserts it contains the Probe region selector and is visible/on-screen, and calculates non-overlap from actual canvas/tool bounds at both wide and compact window widths; keep original scientific checks strict. Guard this workflow ownership contract in the Ribbon regression suite.
- **Validation at commit time:** source contract and JS test syntax checked; packaged Windows real screenshot at the new exact commit is **pending**. No build green, merge, release, Store packaging or owner visual acceptance claimed prematurely.

## 2026-10-11 UTC — PR #49 compact Ribbon Camera accessibility

- **Evidence:** Run #1123 (SHA `bbf14c5ac75d462c5332767a25410a08b5878397`) passed true QuickCup metal/mold multiregion Field Probe and wide 1140px native Data/Field screenshot geometry; at 640px, Camera remained correctly Ribbon-docked (`cameraDocked:true`) with `toolbarCanvasOverlap:0` and working 3D physical field but failed visible toolbar geometry. The expanded Camera controls are appended after Ribbon context groups in a horizontally scrollable shelf.
- **Action:** Address the actual compact interaction: opening the Camera subbar scrolls its own Ribbon shelf to reveal the docked controls, without moving controls over scientific geometry. Preserve accessible horizontal scrolling and all camera/probe actions. Add executed source-function regression for compact, wide and missing-control scenarios.
- **Diagnostics:** Native screenshot gate now captures Camera toolbar left/right/width plus shelf scroll position/extent when a viewport still fails. It **retains** required on-screen bounds and overlap assertions, including 640px.
- **Validation at commit time:** JavaScript syntax and executed helper regression prepared; exact-head packaged Windows QuickCup, wide+compact screenshots and installed-app evidence are pending. No human pre-release approval, no merge, no release.

## 2026-10-11 UTC — responsive Camera remains reachable across live resize

- **Finding:** opening Camera scrolls to the horizontal toolbar on a compact WebView2, but an already-open Camera tab can remain active while Windows switches widths; in that case a click-only scroll handler does not run.
- **Correction:** refine Ribbon scroll to leave fully visible wide controls alone, left-align controls that run off either side of the shelf and register a viewport resize handler for the already-open Camera tab. Keep existing horizontal scroll and no-canvas-overlap structure.
- **Validation:** real helper-source execution checked offscreen right, offscreen left, and already-visible cases. The exact-head packaged Windows evidence must still verify Camera bounds at both widths, QuickCup science, portable and installed behaviors. No release.

## 2026-10-11 UTC — Physical-region video provenance and asynchronous scientific frame auditing

- **Problem:** real Field video could render both metal and mold but did not export a per-frame record distinguishing exact measured secondary-region fields from neutral geometry-only fallback at mismatched times. That makes an otherwise accurate visualization difficult to audit.
- **Root-level candidate:** each WebGL secondary layer records actual OpenFOAM `sourceTime` only if an exact field was read, null for geometry. The video encoder validates primary physical time and every visible layer, rejects missing/stale/mismatched frames, and retains per-frame states `field`, `geometry-only`, or `hidden`, region identity, exact source time, scalar dimensions, and opacity. Geometry-only has **no fabricated field/temperature/time**.
- **Export:** after successful recording, a separately clickable **Download frame provenance JSON** button produces a sidecar identified by the video filename and physical frame indices. This explicit user interaction avoids browsers silently blocking two automatic downloads.
- **Regressions:** actual exported function tested with measured metal+mold at 9.8 s, field missing at that time, hidden mold, absent visible layer, stale mold time, stale primary time, missing requested time. Existing native QuickCup and packaged Windows smoke still required.
- **Status:** exact SHA Windows CI and final installed/executable tests pending; no release or Store submission. #29/#30/#40 remain open for broader acceptance.

## 2026-10-11 UTC — Primary/video physical timestamp normalization

- **Root scientific finding:** some primary 3D Field and video timeline paths still used `map(Number)`, which turns `null`, empty strings, or booleans into a false physical `t=0`. Secondary-region exact-time lookup already rejected those values.
- **Correction:** Field mesh+field readiness and frame navigation now use `fvRegionPhysicalTime` and reject a field with no valid times. Expose this physical-time resolver to the animation UI, which also validates safely if the region API is absent. Preserve valid strings `"0"` and `"9.8"` exactly, without nearest-time scientific fabrication.
- **Automated regression candidate:** executed-function video timestamp test distinguishes null, empty, boolean, NaN and invalid text from 0 and 9.8 seconds, including missing runtime API. Full PR exact-head Windows CI **pending**.
- **Scope:** PR #50, separate from the earlier certified PR #49/main. No release publication, Store work, or human pre-release wait condition.

## 2026-10-11 UTC — QuickCup isolated parser scope regression fixed (PR #50)

- **Failed exact-HEAD evidence:** PR #50 workflow 38118456443 aborted at Linux QuickCup `Test real OpenFOAM fixture integration` with `ReferenceError: fvRegionPhysicalTime is not defined` inside the `FOAMLENS_FIELD_VIEW_CORE_START/END` test-extracted subset. The new ready-region guard referenced a helper declared outside that intentionally isolated core segment. Build, installer and native UI tests did not run on this SHA.
- **Root fix:** the readiness predicate performs the same strict numeric/string, nonempty, finite OpenFOAM physical time validation directly inside the isolated core, without reaching into the non-core renderer API. Video and primary-frame paths still use the shared exported field-time resolver where the full Field runtime is present. Regression assertions now protect this extraction boundary.
- **Status:** after fix, new exact-head QuickCup plus packaged Windows acceptance must rerun; no merge, release or manual approval before actual results.

## 2026-10-11 UTC — Single-region video provenance compatibility

- **Edge case caught before merge:** the new video evidence iterator initially required a populated multi-region choice map. For a legitimate single-physical-region case, that map can be empty because the multiregion chooser is intentionally hidden. The video must still record the primary measured field.
- **Correction:** provenance builds the set union of the current primary region and explicitly known physical region choices, without inventing extra regions or fields. The primary is directly sourced from its actual video descriptor. Two-region behavior and missing-layer rejection remain unchanged.
- **Regression:** execute the real frame evidence function with empty region-choice/layer maps and a single primary field, plus the existing measured metal/mold, missing-time, hidden, stale and absent-region cases. Current-head CI pending.

## 2026-10-11 UTC — PR #50 exact-head Windows regression diagnostic case

- **Evidence:** Windows Action 38118648201 passed real QuickCup, Linux VTK and 44 preceding Windows checks, but the new Field View frame-provenance test failed. Runtime correctly threw `Visible OpenFOAM region missing from scientific video frame: mold` for a visible region with no loaded physical mesh. The assertion used a lowercase `/visible OpenFOAM region missing/` expression and thus rejected its own expected fail-closed result.
- **Correction:** preserve the actual strict missing-region exception, adjust assertion to exact capitalized error text; no scientific check relaxed, no production logic changed. Re-run exact-head CI, portable, installed and visual gates before merge.

## 2026-10-11 UTC — Deterministic WebView2 recording lifecycle on failed OpenFOAM frames

- **Context:** PR #50 merged exact per-region video provenance on main as `eba925283dd4e0233b810c893cf7ac7ea8bea8ae`; exact-head packaged Windows/QuickCup CI was green. No new release was published.
- **Defect:** if `vaFrameEvidence`, a real Field frame load, canvas composition or `MediaRecorder` itself throws after capture starts, `vaExport` catches the exception but the media recorder and canvas capture stream never stop; they were previously released only on the successful path. This can leave WebView2 video capture and CPU/GPU resources alive after scientific export failure.
- **Root fix:** own stream/recorder across the entire export attempt, including constructor/initialization failure. Release an active recorder and every live media track in `finally`, before restoring color ranges/old physical frame; tolerate an individual failed cleanup without leaking the remaining tracks. Releasing an already inactive session is idempotent. Attach a stop-promise rejection handler so an asynchronous recorder failure cannot become unhandled when a separate scientific rejection aborts the loop.
- **Automated verification candidate:** execute the real `vaReleaseRecordingSession` function with a recording+two-track session, repeat cleanup, null session, and separately throwing recorder/track shutdown paths; assert the actual export owns and releases the live stream. JS syntax and extracted helper execution passed at authoring; native Windows QuickCup, packed portable, installed WebView2 and visual gate pending exact-head CI. No release, no Store work, no owner approval gate.

## 2026-10-11 UTC — Independent physical-region colormaps and provenance-backed 3D legends (#40 / #30)

- **Actual deficiency:** multi-region OpenFOAM field layers were rendered together and independently visible/selected, but secondary metal/mold regions inherited the primary Field View palette and lacked their own measurable colorbar in the inspector. This made two physically distinct fields hard to interpret and could conflate incomparable value ranges or dimensions visually.
- **Root-level change:** keep a whitelisted per-region `palette` choice in the existing scientific FieldScene. Secondary volume, point and face-associated field layers color their *actual parsed* field arrays with that choice (no processor-region flattening). Region colormap changes rewrite just that region's GPU color buffers using its retained field values, correct cell/point/face association, existing exact-time range, and shared WebGL context; **do not reimport all OpenFOAM data or mutate the primary colormap**. Each region has a compact docked inspector gradient with its real min/max, field name, association, exact physical timestamp and units from parsed dimensions. It is not an overlay on the 3D canvas.
- **Safety:** geometry-only/hidden/invalid-range/unmeasured cases have no numeric legend; no guessed temperature, time mapping or fabricated color. Old legend is cleared during async frame loading and on failed reads. Palette choices persist across real frame and global primary palette changes, within the same imported case.
- **Validation:** real-source executed GPU recolor/legend logic exercised for volume and gray geometry-only at authoring; full node suite now covers per-region volume, point and face GPU buffer updates, independent gradients, missing/hidden/not-finite ranges and malformed palette. Native packaged Windows scientific screenshot validator opens real Field inspector at wide/compact viewports and physically changes a secondary region palette on imported QuickCup, verifies its measured scale and stable primary color map, then restores original palette; installer and screenshot capture remain required.
- **Remaining:** depth-correct adjacent/encasing material interfaces, actual multi-time missing-field fixture with visible screenshots, mass/VRAM stress, Data 2D probe/time-profile/log evidence, owner post-release visual review and Store submission remain OPEN. PR HEAD QuickCup, portable+installed Windows gate pending. No release or owner pre-release approval requirement.

## 2026-10-11 UTC — PR #52 isolated Probe selector harness dependency

- **Failed CI evidence:** PR #52 Windows run 38120318858 passed all 12 QuickCup physics/VTK/fixture checks and over 50 compiled Windows regression steps. The `Test Field View 3D probe picking` job failed at `ReferenceError: fvRegionPalette is not defined` in the test's intentionally extracted `fvRegionRefreshList()` function. This was a missing symbol in the isolated test fixture (which extracted the selector without surrounding helpers), not evidence of a broken OpenFOAM field or GUI at runtime. Portable/installer gates were not reached.
- **Root correction:** execute the actual adjacent FieldScene color/legend helper declarations alongside the actual Field selector refresh in the existing Probe test harness. The regression continues to assert metal/mold options, preservation of a selected region and stale-region removal when changing cases, and now verifies each region row has its real palette selector. Do not stub away the scientific selector call or relax the check.
- **Validation at commit:** source syntax passed, exact-head Windows QuickCup/portable/installed screenshots still pending. No merge, release or Store publishing.

## 2026-10-11 UTC — Data/Field physical-time integrity for Probe and profile curves (#30 D02/Q01)

- **Finding:** even after primary Field/video time metadata was normalized, the real 2D **3D Probe history**, **global 3D field statistics history**, and **spatial-profile fixed-coordinate history** paths in `v14-zz-field-workspace.js` used `map(Number)` or `Number(profileTime)`. Native JavaScript maps null, empty text and false to a numerical zero. Those are **not** an OpenFOAM sample at t=0, and could add misleading x-axis points or a fake profile endpoint.
- **Root correction:** one strict `fwPhysicalTime` parser consumes the public `FoamLensRegionScene.physicalTime` API when initialized and has a complete primitive/finite fallback before the Field scene is ready. `fwPhysicalTimes` filters and deduplicates real numeric times for 3D probe and field history generators. Fixed-coordinate profile histories exclude rows lacking genuine metadata and sort by real time. A field with no valid time produces an explicit actionable error. Explicit numeric 0 and numeric-string "0" remain valid. This does not fabricate field values or force interpolation across misaligned time grids.
- **Regression:** executed-source tests cover invalid null/empty/boolean/NaN/text; genuine t=0 and t=9.8 s, duplicate timestamps and alternate runtime resolver, and assert all three 2D history producer paths use strict physical metadata. Existing probe location/cell sampling tests remain intact.
- **Status at commit:** JS syntax and standalone executed validator passed; full real QuickCup scientific import and Windows portable/installed Data/Field screenshot/installer CI pending on exact PR SHA. No new release, Store change or manual pre-release visual approval gate. D02 remains open for fuller actual plot interaction at different window widths.

## 2026-10-11 UTC — Atomic real OpenFOAM 2D Probe/history chart commit (D02, #30)

- **Confirmed root issue:** `fwBuildFieldTimeSeries` hid every previously valid derived 2D history before opening or reading new OpenFOAM field frames. Each of its Probe, global-field-statistics and spatial-profile producers immediately pushed or mutated series as it completed. If the second region/frame failed, the request was superseded, or one history was unavailable, Data could display an empty or half-updated plot despite valid previous measurements. The result contradicted the requirement that Time Series/Probe/profile data remain visible.
- **Implementation:** all three async producers now return **read-only drafts** with actual sampled times/values and physical metadata; neither pushes into `series`, changes `nextId` nor invalidates existing curves. `fwBuildFieldTimeSeries` collects both drafts, verifies current request sequence, and only then commits them in one synchronous `fwCommitFieldHistoryDrafts` operation. Existing curve identity, custom label and color are preserved; unrelated imported curves are never touched, and duplicate source keys yield one persisted curve. New curve identifiers/colors are staged before changing plot visibility. Empty, failed or superseded builds leave the last valid plot untouched.
- **Regressions:** executable test extracts the actual commit function and async history orchestration and runs in a child Node process. Simulates a failed mold field in second history, a cancelled/superseded request, a successful two-curve update, and a single valid source. Asserts previous data/visibility/IDs unchanged on failure, no newly allocated IDs on cancellation, retained colors and unrelated datasets after success, no extra duplicate streams, and no early mutations inside any of the three physical history producers.
- **Acceptance status:** frontend and regression source syntax checked; exact PR HEAD QuickCup OpenFOAM and Windows portable/installed WebView2/rendered Data gate still pending. No published release or Store change. #30 D02 broader user-facing interactions and owner post-release visual acceptance remain open.

## 2026-10-11 UTC — Physical-clock integrity in Data/Field navigation and 3D A→B profiles (#30 D02)

- **Defect:** the Field companion plot's displayed physical-time badge still used `Number(profileTime...)` and `Number(logCurrentTime)`. The Field→Data synchronization used `Number(time)`, and 3D A→B line profiles recorded `Number(fvState.time)`. In JavaScript, null/blank/false are coerced to zero even when no OpenFOAM physical frame or solver-log timestamp was selected, resulting in a misleading `t = 0 s` indicator, spurious synchronized seek or false physical timestamp for a sampled profile.
- **Root correction:** consume the canonical `fwPhysicalTime`/strict `fwPhysicalTimes` resolver for the profile/log time badge, cross-workspace physical-time navigation and solver-log nearest-time choices. Blank profile-time text falls back to a **real** selected profile time; both blank inputs display an em dash rather than fake zero. Legitimate `0`, `"0"` and `9.8` remain accepted. The real 3D A→B builder refuses to add a derived scientific profile without a valid physical OpenFOAM timestamp, reporting the reason in the existing status UI and preserving series and curve-ID state.
- **Validation plan:** executed-source tests isolate the true badge/synchronization methods and 3D line-profile function; assert invalid null/empty/boolean/NaN and valid zero/nonuniform time, legitimate profile-time fallback, no fake log nearest-time selection, no 3D profile or ID consumed without real time. Run full current-head QuickCup OpenFOAM + Windows native JS suites, packaged portable and installed WebView2 screenshot manifest. No source-unsupported physical measurements are synthesized.
- **Status:** fixes and regression tests authored; exact-head CI pending. Issues #30/#40 stay open for full functional Data 2D real-series and 3D adjacent region testing. No release or Microsoft Store action.

## 2026-10-11 — Windows portable versus installed rendered-evidence provenance

- **Baseline (verified):** exact main HEAD `1851927ef09b6166e6d412fcab5730a6943bf8c6`, Windows run [38123645990](https://github.com/michels-lab/FoamLens/actions/runs/38123645990) passed real QuickCup OpenFOAM/VTK, Windows portable and installed WebView2 runtime, all compiled regression checks, and the release screenshot integrity gate. The prior manifest recorded 8 installed captures only despite portable smoke screenshots being present.
- **Finding:** an installed-app screenshot record carried the Setup digest while portable screenshot data lacked independent manifest coverage. Portable and installer hashes were checked, but the gate did not verify that both runtime variants supplied their own Home/About/Data/Field wide+compact screenshots. This is a release-evidence completeness gap, not evidence that either executable rendered incorrectly.
- **Fix on branch `fix/portable-installed-visual-evidence-20261011`:** `tools/make_visual_evidence.py` now records separate installed and portable screenshot provenance and maps each image to its own executable SHA-256. The existing master schema is retained with the additional per-image `runtime_variant` field. `tools/visual_release_gate.py --require-portable` fails closed when either variant lacks a surface/viewport or carries stale/invalid runtime or digest provenance; old nonportable consumers preserve default behavior. Candidate and publisher jobs both require the stronger check.
- **Regression added:** `tools/test_visual_evidence.py` executes the real manifest producer and validator against synthetic TEST-ONLY fixtures, including missing portable captures, bad binary digest, missing portable binary hash, invalid runtime label, reused screenshot paths and post-capture tampering. Synthetic PNGs are never represented as packaged-app evidence.
- **Current status:** implementation committed on feature branch; exact-HEAD Windows PR run, native screenshot inspection and merge validation pending. No version bump, GitHub Release, or Microsoft Store submission authorized. Michel's human visual review remains post-release and distinct from automated validation. Issue #29 may be reevaluated only after successful candidate+publisher-path evidence checks; issues #30/#40 remain open for Data and multi-region science acceptance.

## 2026-10-11 — Scientific Field 3D shared-depth masking for translucent regions (#40)

- **Baseline:** main `362afd4f1738242ddc1203bd8566a9dc227cde86` successfully passed exact-merge Windows CI [38126189533](https://github.com/michels-lab/FoamLens/actions/runs/38126189533): actual QuickCup OpenFOAM/VTK, portable and installed WebView2, and distinct 16-shot visual release evidence. No new public release.
- **Scientific finding:** `fvRegionRenderLayers` kept the shared WebGL depth mask enabled for both translucent measured internal-face triangles and mesh-edge annotations after drawing a transparent region shell. Thus non-opaque faces and even wireframe lines could populate the depth buffer, incorrectly concealing another OpenFOAM region. In `fvRender`, translucent primary slices and isosurfaces as well as decorative lines similarly retained depth-write permission.
- **Source correction:** keep near/far `LEQUAL` depth testing but write depth for scientifically opaque surfaces only. Secondary face-associated measured geometry writes depth only when opaque; neutral boundaries never claim unmeasured face values; all wireframe edges remain non-occluding. Primary 3D slice/iso depth writes follow effective alpha; vectors, streamlines and edges cannot create occluding depths. Restore the GL mask after each pass and preserve the fully opaque primary geometry/depth behavior.
- **Executed-source regression added:** two tests in `desktop/tests/field-view.test.cjs` run the production region-render function with a recording GL facade for transparent and opaque measured internal faces and region edges, plus the real primary `fvRender` function for translucent slices, isosurfaces, vectors, streamlines and probe. Assertions check mask state **at each actual draw call**, not just static source substrings.
- **Validation at time of note:** Windows exact-head feature CI pending; screenshot/mesh interface acceptance and device owner post-release review remain pending. This addresses a specific scientifically false-occlusion path, **not complete order-independent transparency or triangle-level depth sorting**; adjacent-interface z-fighting and large-scene/performance remain open in issue #40. No version bump, release or Microsoft Store submission.

## 2026-10-11 — Strict physical timestamp at FieldScene load/visibility entry (#40)

- **Base evidence:** FoamLens main `84c5cd522e9bc56b46110f569cf4c1390f0703f0`, after merged PR #57. Latest stable GitHub release remains `v1.8.0`; no release authorization in this task.
- **Root cause:** although `fvRegionExactTime` already used strict OpenFOAM time validation, `fvRegionLoadFrame` and `fvRegionApplyVisibility` used `Number.isFinite(Number(time))`. JavaScript's `Number(null)`, `Number('')`, and `Number(false)` are zero: a missing or boolean time could pass the region reload gate as if it were a physical time-zero frame. The loader then invalidated the current valid GPU region layers before performing any field reads, potentially replacing a measured scene with misleading gray fallback geometry.
- **Correction:** require `fvRegionPhysicalTime` at both public region-frame loading and visibility-induced reload entry points. Normalize the valid timestamp once and reject an invalid request **before** changing region sequence, case, WebGL buffers, legend or status. Preserve legitimate numeric and numeric-string zero.
- **Executed-production regression:** `desktop/tests/field-view.test.cjs` invokes the actual async region loader and strict parser from the application module using a recording GPU/scene facade. Invalid null/undefined/blank/boolean/NaN/infinite/nonnumeric values may not release a valid prior layer, modify its sequence or initiate draw; valid 0/'0'/9.8/'9.8' frames still replace the prior GPU layer. Visibility reload's strict parser wiring is explicitly asserted.
- **Acceptance status:** source change and regression committed to branch `fix/field-region-invalid-time-20261011`; exact-HEAD real QuickCup+VTK, Windows portable+installed WebView2 and both-runtime rendered gate still required before merge. This fixes false time-zero reloads only; full region-interface transparency, missing-field UI acceptance and VRAM stress remain open in #40. No release or Store submission.

## 2026-10-11 — Block 1 Field 3D: physical opaque-first metal/mold composite (issue #40)

- **Baseline:** `main` `a3540feeb42cfb98e9cab93bf0383ea103e5c634` successfully passed exact SHA Windows CI [38128287335](https://github.com/michels-lab/FoamLens/actions/runs/38128287335) (real QuickCup/VTK, Windows portable+installed and required visual evidence). Stable release still v1.8.0.
- **Scientific/visual defect:** prior renderer always drew the selected *primary* region (opaque or translucent) before any secondary. Secondary shells were individually sorted by mesh-center distance, but **not** with the primary. An opaque mold could be rendered after already-blended translucent metal, violating front/back alpha composition; for two transparent physical regions, screen appearance depended on which region the user selected as primary instead of camera ordering.
- **Source correction:** `fvRender` establishes real fully opaque physical surfaces and measured face fields in the shared WebGL depth buffer first; `fvRegionRenderLayers` draws secondary opaque geometry, then composites **both primary and secondary translucent physical regions** in camera back-to-front order using **projected view-axis depth**, never Euclidean distance from the viewer (incorrect for lateral geometry). Depth writes remain disabled for translucent scientific surfaces, mesh wires, vectors and streamlines; probe marker remains last. Transparent shells around internal-face-associated fields remain neutral, with exact field and boundary values retaining their own buffers and provenance.
- **Regression:** the test suite executes actual `fvRender` + `fvRegionRenderLayers` with a GL draw trace, verifying opaque mold before translucent metal, primary/secondary transparent reversal when camera-relative depth flips, opaque metal before transparent mold, hidden-region exclusion and per-draw depth-mask state. Existing source-executed regressions were adapted to explicit opaque/transparency phases.
- **Actual-geometry missing-field negative:** the packaged WebView2 multi-region smoke reuses the actual imported QuickCup geometry, temporarily excludes the currently selected timestamp from one region's existing discovered `T` times (no fabricated value/time), then re-renders. It must show real geometry without a measured numeric legend, with explicit "Geometry only" status; after restoring the original discovered metadata and frame it must recover the measured field in the same GL renderer. This is a *native real-geometry plus controlled metadata-unavailability scenario*, not a separately supplied on-disk asynchronous case.
- **Preflight regression found and corrected:** the old `multiregion-release-contract.test.cjs` and one Field source assertion still required the obsolete zero-argument rendering signature. Updated them to validate dual opaque/translucent passes, while retaining actual GL state/order tests.
- **Scope boundary:** this makes alpha compositing physically better under object-center sorting, **not true order-independent per-triangle transparency** for meshes with interpenetrating depth ranges. Real interface pixels, coplanar z-fighting, asynchronous missing field UI and large-case VRAM limits require additional evidence to close B1.2–B1.5. The four-block acceptance plan lives at `docs/REMAINING_WORK_BLOCKS_2026-10-11.md`.
- **State when authored:** branch feature work committed; exact PR-head CI, native screenshots, Windows portable/install and merge verification pending. No release or Store publication.

## 2026-10-11 — Block 1 B1.5: secondary WebGL upload failure resource safety and measurable payload scope

- **Verified baseline:** PR #59's exact merge SHA `9e1961d5215cb392214c28da81e432391fcd4c03` passed [main Windows run 38130300691](https://github.com/michels-lab/FoamLens/actions/runs/38130300691). The preceding PR and main tests validated QuickCup/VTK, Windows portable/installed WebView2, multiregion metal/mold and rendered Home/About/Data/Field evidence. Latest public release remains v1.8.0.
- **Root defect:** `fvRegionMakeBuffer` allocated a WebGL buffer, then uploaded typed-array data *before* assigning its handle into the owning `layer`. If `bindBuffer` or `bufferData` threw, the outer `fvRegionBuildLayer` catch could delete earlier assigned buffers but could not see the newly allocated failing handle: orphan GPU allocation. Repeated failures under memory pressure could accumulate leaked WebGL buffer objects.
- **Correction:** `fvRegionMakeBuffer` now explicitly deletes its unassigned handle if binding/upload throws, rethrowing the original error. Normal layer release nulls each handle and zeroes its accounted bytes to be idempotent. Exact successful typed-array `byteLength` is tracked per *secondary* physical-region layer; `FoamLensRegionScene.gpuPayloadStats()` exposes live buffer upload payload bytes and region count. The API **must not** be described as actual VRAM, driver allocations, primary-scene memory or total app RAM.
- **Source-executed regressions:** stress 40 measured allocations with 90k-component geometry vectors (four real layer buffers each), ensuring bounded live upload bytes, no double deletion, and 100% buffer creation/deletion balance; inject a failure on the 4th WebGL buffer upload and assert that *both* the unassigned buffer and all assigned buffers are released exactly once. The real Windows OpenFOAM metal/mold smoke now reports secondary uploaded payload bytes, validates one physical secondary region and nonzero data, and requires identical payload after a measured→missing-field→measured frame cycle on the exact imported mesh.
- **Limitations and acceptance:** JS instrumented WebGL tests validate upload/accounting and injected exceptions; Windows QuickCup tests validate packaged WebView2 live objects. They do not measure physical GPU memory consumption, its texture/depth-buffer overhead, browser process RAM, or stress a multi-million-cell case on the owner's GPU. No arbitrary numerical VRAM thresholds or real-case measurements were invented. Exact-HEAD PR run pending; no release, tag, Store or change to visual identity.


## 2026-10-11 — Block 1 B1.5: exact physical-frame visibility preserves valid GPU region layers

- **Verified base:** main `c89e7042109bfa4e65ff243686ddee67d4cfaee9` from PR #60; [exact merge CI 38133803740](https://github.com/michels-lab/FoamLens/actions/runs/38133803740) **SUCCESS** (QuickCup/VTK, scientific tests, Windows portable+installed, screenshot evidence).
- **Root cause:** `fvRegionApplyVisibility` called the full `fvRegionLoadFrame` whenever a previously hidden secondary region was shown. The full path deleted ALL still-visible correctly loaded GPU buffers and reread ALL secondary OpenFOAM fields, regardless of whether their own region/physical frame had changed. Repeated show/hide of one mold or fluid region caused unnecessary file parsing, allocations and view flicker, and could increase memory pressure with large cases.
- **Correction:** `fvRegionLoadFrame(c,time,{preserveLoaded:true})` is requested only from visibility changes. The scene reuses all currently visible secondary layers if and only if every retained layer belongs to the active WebGL context, is marked visible and has the **exact selected OpenFOAM physical time**. Only missing regions are loaded, and the camera fits the union after activation. Ordinary case/field/time changes keep the default full reload. Incompatible/stale layers prevent preservation altogether.
- **Executed-code regression:** runs the actual asynchronous physical-region loader in an isolated Node process: showing fluid retains the same measured mold GPU object, parses only fluid, releases zero mold buffers and fits the union; a no-op second reload does no parsing or GPU disposal; default playback reloads both; a stale mold time forces explicit full replacement instead of fabricating alignment.
- **Scope/limits:** the existing time-grid exact-lookup and missing-field geometry-only rules are unchanged. This optimizes region visibility, **not** a large-dataset VRAM benchmark, GPU performance claim or on-disk different-time-grid fixture. PR-head QuickCup/VTK, Windows native install and rendered-gate evidence remain required before merge. No version bump, release or Store submission.


## 2026-10-11 — Block 1 B1.3: real on-disk OpenFOAM asymmetric metal/mold physical-time fixture

- **Motivation:** previous PR #59/#60 native smoke tested missing measured field by temporarily filtering `discoveryModel.fields[].times` after import; correct parser behavior was exercised, but it did **not** demonstrate that case discovery/import and the installed native renderer handle truly different region time grids sourced from files on disk.
- **Source evidence:** private B13 QuickCup fixture branch `foamlens-real-fixture-b13` genuinely contains `0/mold/T`, `9.8/mold/T` and `9.8/metal/T`. These directory/file names were confirmed before authoring the fixture. No research file is modified upstream.
- **Windows fixture creation:** copy the original real B13 case into the existing independent smoke-case set and a new `SmokeCase_Asymmetric` isolated copy. Remove **only** `9.8/mold/T` from the new copied case after confirming other real values exist. Keep `0/mold/T`, `9.8/metal/T`, mesh, all other fields and all source-file bytes untouched. Reject missing source inputs instead of faking data.
- **Native packaged acceptance:** WebView2 imports the actual on-disk changed case; check that real discovered metal T includes t=9.8, mold T has at least one earlier measured time but **not** 9.8; select metal T at 9.8; assert mold region is real geometry-only layer without source time or numerical scale and with explicit Geometry-only text, sharing the real GL canvas; then restore the full original B13 case and its exact selected frame for downstream probes and evidence.
- **Scope:** no interpolation or assignment of mold's t=0 measurement to t=9.8; this scenario verifies field availability and safe rendering, not generalized physically asynchronous transient interpolation. CI / packaged screenshots / exact-head test remain pending; no version bump, release or Store change.


## 2026-10-11 — Block 1 B1.2: reproducible opaque metal–mold coplanar depth tie mitigation

- **Baseline:** exact current main `7c7d77b5065814f3cc088066166fcc891fdf007c`, CI [38136514225](https://github.com/michels-lab/FoamLens/actions/runs/38136514225) **SUCCESS** (QuickCup, VTK, scientific test suite, Windows portable + installed, visual gates). No release has been authorized; public v1.8.0 unchanged.
- **Root finding:** one shared WebGL scene renders opaque *primary* first and opaque *secondary* regions next, both with `depthFunc(LEQUAL)`. When actual OpenFOAM adjacent metal/mold interface triangles share raster depth (equal depth is permitted by LEQUAL), a later opaque secondary triangle can overwrite the selected primary's measured color. Equal-depth overwrite can depend on triangle geometry, field selection or import order. This is independent from the already fixed object-center translucent layer ordering.
- **Scoped code correction:** apply `POLYGON_OFFSET_FILL` only while drawing opaque secondary *triangle* surfaces and internal measured face triangles; a minimal positive slope/depth-units offset pushes coincident secondary fragments away from the selected primary, preserving the user's primary-field color at exact ties. Stable sorted physical region names choose deterministic small priority units. Restore `polygonOffset(0,0)` and disable the offset in `finally` after each draw. Transparent surfaces, wireframes and probe markers never receive this depth bias; unsupported GL contexts draw without it.
- **Direct source-executed tests:** render two distinct opaque regions inserted in reversed lexical order and assert deterministic tie bias; switch one to alpha .48 and confirm no bias; unsupported WebGL fallback renders without failure; injected draw failure restores previous frame's offset state. Additional packaged Windows WebView2 native smoke toggles real loaded B13 metal and mold to fully opaque, calls actual `fvRender`, asserts no `POLYGON_OFFSET_FILL` enabled at frame end, zero restored offset factor/units, no WebGL error and restores actual opacities for downstream screenshot/probe QA.
- **Limitation:** this is **an opaque exact-depth tie mitigation**, not order-independent transparency, per-triangle sorting for overlapping translucent geometry, automatic proof of true depth/pixel ordering under all cameras, or an owner-device GPU screenshot acceptance. No quantitative VRAM/RAM measurements are added. Issue #40 remains OPEN until those distinct B1.2/B1.5 gates have evidence. PR-head Windows CI still required before merge; no version bump/release/Store.

## 2026-10-11 — Block 1 B1.2/B1.5: bounded per-triangle alpha sorting and measured RAM scope

- **Baseline:** PR #63 main 36030ae, exact main Windows CI 38138027905 SUCCESS. No release authorized.
- **Root visual defect:** transparencies of separate metal/mold physical regions were globally ordered by region-center depth, not the depths of their own constituent polygons, leading to incorrect blending when their triangles interleave.
- **New bounded implementation:** sorts individual measured transparent triangles from primary and secondary regions by camera-axis centroid, including exact colors and alpha, using one GPU draw with three reused WebGL scratch buffers. Caches CPU arrays only for <=65536 triangles; larger/incomplete/capability-limited scenes use previously validated region-center fallback. Measured GPU buffer payload byte counts explicitly exclude physical graphics-driver VRAM.
- **Correctness guard:** primary GPU buffer is not destroyed and its corresponding CPU measurement buffer is not replaced until the new upload succeeds. Shader/attribute/depth state are restored even after draw errors; failure disables the new path for the renderer.
- **Source tests:** near/far cross-region triangles and camera reversal, deterministic coplanar ties, numeric typed-array alpha, one GPU draw and three bounded buffers, fallback on 1 million synthetic triangles; reports actual resident Node RSS before/after allocating 72,000,000 bytes of *synthetic geometry*, not OpenFOAM measurements.
- **Windows native evidence:** real QuickCup metal/mold scene and installed/portable smoke plus an offscreen WebGL 32x32 GPU overlap pixel test. The known far-blue/near-red alpha .5 scene must return red ~128 and blue ~64 in gl.readPixels. True Windows FoamLENS host-process WorkingSet, PeakWorkingSet and private bytes before/after real QuickCup import are logged.
- **Limits:** triangle-centroid order is not mathematically exact order-independent transparency for crossing/coplanar triangles; hardware-owner visual acceptance still pending. Windows host-only working set excludes WebView2 subprocesses and graphics driver, and GPU upload bytes are NOT total video RAM. A measured huge real OpenFOAM device RAM/VRAM benchmark remains required. Do not close issue #40 or claim full block completion. Exact PR head CI required; no release/version bump.

## 2026-10-11 — Block 1 B1.5: include actual WebView2 renderer processes in real QuickCup RAM baseline

- **Baseline:** PR #64 was merged into main at `cb78a2eb79c015ad684ae2aed447d22ae6bc3a9b` after exact-head [CI 38175353943](https://github.com/michels-lab/FoamLens/actions/runs/38175353943) SUCCESS: real QuickCup+VTK, numeric scientific regressions, real WebView2 RGB overlap pixel checks, Windows portable/installed and screenshot evidence. Its one-million-triangle synthetic RSS test is not a real large OpenFOAM case memory claim.
- **Gap:** prior native performance log sampled only `Process.GetCurrentProcess().WorkingSet64`, which excludes the actual `msedgewebview2` renderer processes carrying the 3D WebGL buffers and CPU parser. It therefore understated the desktop app's resident process-memory scope.
- **Scoped instrumentation:** from the actual FoamLENS `CoreWebView2.Environment.GetProcessInfos()` API, deduplicate process IDs associated with that WebView2 user-data folder, open live Windows processes and sum their measured WorkingSet64 and PrivateMemorySize64. Take before/after snapshots around the existing real imported B13 metal/mold smoke; add host working set/private bytes; log per-scope totals, deltas, WebView2 process counts and unreadable PIDs as explicit JSON. Fail the native smoke if no WebView2 process is measurable. The official SDK API returns environment-wide processes excluding Crashpad; exited/inaccessible processes can be omitted and their count disclosed.
- **Boundaries:** aggregate host + environment WebView2 process working sets count resident process memory, not unique physical page ownership, graphics-card VRAM, OS GPU residency, full application process-tree coverage, peak over the load, or a production multi-million-cell OpenFOAM workload. Do not claim these values or invent capacity thresholds. Exact-head Windows CI and real logs are mandatory evidence before merge. No release/version bump/Store work.

## 2026-10-11 — Block 2 B2.1: reject false physical zero in Data temporal alignment and 3D Compare

- **Reproduced scientific defect on source functions before patch:** JavaScript `Number(null)`, `Number('')` and `Number(false)` converted missing physical samples and timestamps to `0`. Example: `taFinitePairs({t:[0,null,2,'',4,false],y:[10,20,30,40,null,6]})` produced invalid rows, overwrote real t=0 after deduplication and admitted a missing measurement as measured zero. `taDifferenceValues([null,10],[5,3])` returned `[-5,7]`; `fcResolveTime([0,9.8],false,'exact')` could treat false as actual t=0.
- **Fix:** strict numeric or decimal/scientific-notation text conversion in source-executed temporal alignment and 3D compare; preserve genuine zero and numeric OpenFOAM timestamps, reject blank/boolean/missing values, guard spatial comparison and interpolation; Pearson is evaluated only on the exact valid physical-time pairs used by metrics. No invented or interpolated missing field data.
- **Tests:** add production-core regression cases to `desktop/tests/temporal-alignment.test.cjs` and `desktop/tests/field-compare.test.cjs`. Local V8 production-function spot checks passed for 13 targeted cases; full current-commit Node suite, real OpenFOAM Windows QuickCup and installed/portable UI evidence **not yet run at time of this entry**. Require exact PR-head green CI before merge. B2 remains **IN PROGRESS**.
- **Release:** not authorized; do not publish or change version. Scope issue #30; #40 stays open for hardware/transparent-interface acceptance.

## 2026-10-11 — Windows installer acceptance and shortcut choices (shared Michel's Lab owner request)
- Native Inno Setup candidate gains explicit Welcome and full existing `desktop/LICENSE.txt` acceptance page; never shorten/replace existing FoamLens proprietary rights.
- Existing unchecked desktop shortcut remains optional. Adds unchecked post-install Notepad helper with bilingual taskbar pinning steps; not a silent pin or claim of completed OS action (Microsoft requires app/user interaction).
- Adds actual installer-source regression test to `desktop/tests/windows-icon.test.cjs`. Source/CI candidate pending exact-head Windows compile + real interactive wizard visual proof. No version bump or release.

## 2026-10-11 — Block 2 B2.2/B2.3: missing physical timestamps and cross-view probe values
- Following PR #66, further source audit found `fwTimeTimes`/`fwTimeCurrent` converting blank/false OpenFOAM physical times to 0 and Field point/cell/face samples treating missing values as 0. An isolated patch plus source-executed regression was submitted as FoamLens PR #68; **Windows exact-head CI still pending**, so no claim of validated merge.
- Also reproduced 3D Compare `fcProbeDescriptors` converting null/false probe measurements or missing coordinates to measured zero across View A, View B and extra views, which can contaminate derived Time Series. New source fix rejects unmeasured or geometry-only probe descriptors, preserving valid numeric zero and numeric-string '0'; source-executed V8 spot cases passed. `field-compare.test.cjs` now exercises the exact production source under real mock descriptor variations.
- Both changes are independent of Windows installer PR #67 (validated and merged); native OpenFOAM integration and current Windows UI smoke must pass before closure. Issue #30 remains open, no release authorized.

## 2026-10-11 — B2.4: stale synchronized 3D data and false primary physical t=0
- Found after green B2.2/B2.3 PRs #68/#69 merged: 3D View B and View 3/4 still called `Number(fvState.time)`; null/blank/false could silently select t=0. Compare A/B swap also used that unsafe timestamp and `map(Number)` on frame-time metadata.
- Scoped fix: strict `fcPrimaryPhysicalTime` source, no swap on unmeasured primary time, no fabricated t=0 in swap lists. Additional viewport invalidation clears stale CPU field, mesh, probe and renderer draw counts and advances sequence token on absent/incompatible time/field or caught error, preventing old data appearing in 3D video export.
- Added direct production-function regression to `desktop/tests/field-compare.test.cjs` preserving authentic t=0. Exact-head Windows/QuickCup and installed UI CI is pending. Issue #30 remains open; no release authorized.

## 2026-10-12 — Physical mesh bounds correctness in single-scene multiregion camera fit
- Found false-zero risk in `fvRegionUnionBounds`: incomplete mesh bounding boxes and null/blank/boolean XYZ values were coerced to physical zero by JavaScript. This could contaminate the framing union of genuine metal/mold geometry.
- Corrected validation to accept only finite number/numeric-string XYZ triples with nonreversed min/max. Bad mesh bounds are skipped without inventing coordinates, preserving union bounds for remaining valid OpenFOAM regions.
- Added actual production-kernel regressions in `desktop/tests/field-view.test.cjs`; manual direct V8 check and exact-head Windows QuickCup CI required before merging. No release and no GPU-memory-performance claims from these tests.

## 2026-10-12 — Exact binary provenance for automated Windows UI evidence
- Release evidence audit found that the source/manifest/image hashes are checked, while validation of the actual candidate binary SHA-256 was delegated to a separate publication snippet. Added direct optional real-file digest verification to the visual gate itself, made candidate Setup+Portable paths mandatory when `--require-portable` is enabled, and required this at both Windows build/QA and release verification.
- Added executed negative fixture scenarios: mutate Setup or portable after screenshot capture and require the validator to reject otherwise-correct image evidence. No user pre-release visual blocker, Store change or release authorized. Exact-head CI still required.

## 2026-10-12 — Scientific Block 3: missing measurements in phase and energy post-processing
- Source-executed audit reproduced `Number(null/false/'') -> 0` in `saPairs`, `saContiguousIntervals`, `eaFinitePairs`, `eaClosureMetrics` and `eaQuantile`. This risked fabricated solidification/remelting events, energy integrations and closure metrics from samples OpenFOAM did not measure.
- Both scientific modules now use local strict physical-number parsing for numeric/string measurements while retaining genuine `0` and scientific notation; UI formatters also avoid presenting an absent value as zero. Production-source V8 cases pass, with regression tests expanded for phase progression and energy audit.
- This is a source correctness fix only. Exact-head Windows + real OpenFOAM CI pending; phase thermophysical inference and case-specific conservation/sign conventions remain intentionally out of scope.

## 2026-10-12 — Thermal Analysis: missing physical samples and false temperature zero
- Confirmed `thPairs`, `thIntervals` and thermal display formatting used `Number(null/false/'')`, treating missing OpenFOAM measurements/time as zero. This risks fake cooling/heating rates and thermal statistics.
- Added strict numeric/string physical sample parsing, kept genuine zero and numeric time, and expanded executed core regressions to exercise missing timestamps, temperatures, integrals and intervals. UI representation now uses an em dash for missing thermal readings rather than zero.
- This is a validated source smoke candidate only; exact-head Windows/real OpenFOAM CI pending. Temperature rates still derive from measured endpoints; no recalescence/latent-heat inference or release claimed.

## 2026-10-12 — Energy closure integration must preserve the original physical-time grid
- Reproduced with the actual `eaAnalyzeFluxGroup` production function: aligned times `[0,1,4]` and a missing t=1 reading yielded two compact residuals `[1,5]`, then `eaTrapezoid` mistakenly combined them against the first two timestamps to report an apparently valid 3 J integral.
- Fail-closed correction: if not every aligned physical timestamp has a finite advective, diffusive and total power triple, mark the group's integrated closure unavailable, without generating a fictitious energy value. Preserve full exact-grid integration and existing closure metrics for genuinely complete datasets.
- Added executed direct production-function negative and positive regressions; combined PR #76 requires a new exact-head QuickCup/Windows validation after this scientifically material correction. No new version or release.

## 2026-10-12 — Shared agent contract synchronization

Synchronized only the managed blocks in AGENTS.md and .github/copilot-instructions.md to Michel-Software-Standards child-agent-core 2026-10-12.1. Local product instructions remain byte-for-byte unchanged outside those blocks. Carries current installer EULA/shortcut, standalone HTML (where applicable), and independent work during CI policies; does not modify app code, workflows, versions or releases. Validation: one managed block per target, exact canonical body and preserved local prefix/suffix. Product/runtime acceptance is not inferred from this documentation change.

## 2026-10-12 — Capture real physical multiregion WebView2 evidence in exact-artifact manifest
- Discovered that both packaged native runs already capture `field-real-multiregion.png` after actual QuickCup metal+mold load, but `make_visual_evidence.py` included only generic Home/About/Data/Field screenshots. The physical two-region evidence was outside the integrity manifest and optional for publication.
- New strict opt-in `--require-multiregion` captures separate installed and portable real-field screenshots as `field-multiregion` bound to exact Setup/Portable SHA-256, validates viewport/content/checksum/variant, fails if missing or tampered; fixture-backed Windows CI enables the flag and publishing now requires it. Does not mislabel synthetic offscreen alpha graphics as OpenFOAM field evidence.
- Added explicit synthetic *test-only* screenshot fixtures to negative regression: missing portable real-case image, bad digest. This extends issue #29/#40 automated evidence, but is **not** proof of correct intersecting translucent surfaces or full owner-hardware VRAM measurements; both remain open. Exact-head Windows/QuickCup CI pending; no release authorized.

## 2026-10-12 — Physical multiregion color and export ranges cannot invent measured zero
- Code audit found `fvRegionObserveRange` accepted `range.valid === true` with `Number(null/false/'') === 0`, while `fvRegionBuildLayer` painted region volume/point/internal-face data without independently verifying its range minima and maxima. A bad frame or fixed-video range could color metal/mold against a fictitious thermal scale.
- Added strict `fvRegionMeasuredRange` for real physical minimum/maximum, non-reversed ranges and explicit `valid:true`. Region video scans omit invalid frames, while the layer GPU coloring now requires *both* the measured source frame and the fixed video scale to be valid; otherwise the geometry remains neutral. Real 0 and numeric-string/scientific bounds remain supported.
- Extended actual production-region regression in `desktop/tests/field-view.test.cjs`, with direct source-slice checks guarding all three field associations. Real-case Windows CI pending; no inference of real GPU VRAM and no release.

## 2026-10-12 — Field 3D alpha sorter rejects fabricated camera coordinates and invalid buffers (candidate)

- **Diagnosis:** the small-scene global alpha triangle sort used `Number(camera.target[i])`, yaw/pitch/distance conversion and color buffer uploads without rejecting `null`, `false`, blank strings or finite-but-overflowed view-axis depth. JavaScript silently interprets several missing values as measured camera zero; plain array buffers throw on `subarray`, and invalid measured color values can propagate to WebGL.
- **Correction:** fail closed to the existing bounded physical-region fallback when camera target/distance/yaw/pitch are not explicit finite numeric metadata, when distance is zero, when position/color buffers lack `subarray`, when vertices/colors are nonfinite or when projected depth is nonfinite. Actual numeric or numeric-string zero remains valid.
- **Evidence:** direct V8 execution of the production `fvTransparentTriangleSort` candidate passed 60 focused input checks across real two-region sorting, numeric-string physical zero, null/boolean/blank/nonfinite camera components, nonfinite GPU colors, unsupported position arrays and an intentionally overflowing finite camera projection. Source-level `desktop/tests/field-view.test.cjs` regression added. This is JavaScript validation, **not** yet packaged Windows/WebView2 or physical GPU acceptance.
- **State:** candidate pending exact-head GitHub Actions Windows build, installer, native UI and QuickCup tests. No release; issue #40's arbitrary intersecting transparency and real VRAM evidence remain open.

## 2026-10-12 — Field multi-region fit refuses nonfinite camera distance (candidate)

- **Reproduced:** executing the actual `main` `fvRegionFitCamera` with legitimate individually finite, opposite-sign bounds `[-1e308, 1e308]` produced `diagonal=Infinity`, returned `true` and overwrote a previously valid camera `distance=5` with `Infinity`. Such a camera cannot render the physical scene. A still-finite union diagonal of `1.4e308` also overflows after the standard `×1.65` camera margin.
- **Bounded correction:** reject the fit before changing view state unless the union center and final fitted distance are finite and distance is positive. Preserve the previous view, do not call the renderer for an invalid fit. Do not synthesize or clamp an enormous scientific coordinate.
- **Local proof:** the same production-harness inputs on the candidate reject the invalid fit (`false`, preserved target `[2,3,4]`, preserved distance `5`, no render) and still accept normal `[0,0,0] … [2,2,2]` bounds with the original distance and exactly one render. Source-executed regression added to `desktop/tests/field-view.test.cjs`.
- **State:** current candidate must pass exact-head native Windows, installer, QuickCup and UI evidence CI. No release. Real high-dynamic-range physical meshes and large GPU VRAM remain outside demonstrated acceptance.

## 2026-10-12 — Single-region camera fallback obeys finite physical bounds

- **Reproduction:** after guarded multi-region fit rejects a measured mesh with finite endpoints but unrepresentable extent, `fvCameraFitCurrent()` could still overwrite a good single-region camera with `Infinity` via its independent `(min+max)/2` and `diag*1.65` code path.
- **Fix:** reuse the audited `fvRegionUnionBounds([mesh])` finite measured-geometry contract; validate the final distance and center before mutating the camera and before rendering. Preserve the previously valid view when physical bounds are unrepresentable; never fabricate a clipped scientific extent.
- **Source-executed evidence:** mixed-sign `[-1e308,1e308]` and fit-margin overflow `[0,1.4e308]` retain the previous `[4,5,6]` target and distance 8. Ordinary `[0,2]^3` still fits to target `[1,1,1]`, distance `sqrt(12)*1.65`, exactly one renderer draw.
- **Status:** targeted production source execution PASS, Node/Windows QuickCup and installed-package CI pending exact PR SHA. No release and no claim of real GPU VRAM measurements.

## 2026-10-12 — Field transparency/static-frame optimization and GPU evidence infrastructure

- **Merged #96** (`f1043cbd007e95bec45e9b0778dad404c7d45148`): when scientific positions/colors, opacity and camera are unchanged, reuse the existing three WebGL transparent attribute buffers without re-sorting or re-uploading. 23,112-triangle *generated* regression measures three initial uploads totaling 1,941,408 bytes and zero additional uploads over four unmodified draws. Source-executed timing is diagnostic only, not FPS or driver VRAM. PR exact-head Windows, QuickCup, installer, and UI smoke PASS; main push CI `#38284882537` PASS.
- **Merged #97** (`f823d3405de13cf25b129bb499b6b45926e85707`): Windows `tools/measure_gpu_process_memory.ps1` samples valid GPU Process Memory dedicated/shared counters only for verified WebView2 descendants of a real FoamLens.exe PID. Synthetic attribution/no-extraneous-process and unavailable/invalid-counter tests PASS; PR Windows/QuickCup smoke and main push CI `#38286766333` PASS. **Counter values are not automatically exact total graphics-driver VRAM**; known Windows KB4490156 counter inaccuracy noted.
- **Merged #99** (`94a36ce877d76e27d969ca5c978b80e1a16f92f5`): bounded UTC timestamped GPU counter series to capture real loaded/scrubbed/unloaded large OpenFOAM case observations. A missing/invalid reading invalidates reported delta rather than inventing 0 MB. Synthetic series regressions, source QuickCup, Windows packaged installer/portable and real UI checks PASS in PR run `#38287110785`. Real owner hardware captures and WPR/WPA corroboration are **not** yet collected.
- **Pending #98**: capability-gated, approximate per-fragment weighted-blended WebGL2 transparency for all-translucent intersecting physical regions, limited to devices with float buffer/blend support. Windows CI is ongoing. This is **not** exact OIT; do not mark as merged or hardware accepted before CI. The existing sorted/fallback path is retained.
- **Remaining issue #40**: real physical-GPU crossed-triangle evidence, documented adapter/driver/OS and actual OpenFOAM large-case VRAM/counter cross-check; verify process memory and responsiveness over load/playback/unload. No automatic release, tag, or updater publication.


## 2026-10-12 — Weighted WebGL2 OIT activated with real OpenFOAM; crossed-polygon pixel check pending

- **Merged #98** (source commit `6905b0668d247cf8d913a1a3fdd8a0286f673fbc`): bounded, capability-gated WebGL2 weighted blended **approximate per-fragment** transparency. Exact-head PR CI `#38287191059` passed Windows/QuickCup, real native OpenFOAM metal+mold single-canvas loading, Setup/EULA, shortcuts and two-viewport render validation. The actual native smoke logged `weightedOit.active=true`, both `EXT_color_buffer_float` and `EXT_float_blend` support, estimated 1,723,599 scratch bytes and no OIT activation errors. No claim of physical exact OIT or driver VRAM.
- **New targeted native check:** controlled synthetic triangles with *opposite physical Z gradient across the same projected XY*, rendered in forward and reversed source order through the **real production WebGL2 OIT function** on an offscreen canvas. Compare two nonblank RGBA pixel locations, bounded color differences and GL errors; restore actual imported OpenFOAM camera/field/layers in `finally`.
- **Status:** new crossed-triangle check requires its own exact-head Windows/QuickCup and native smoke CI. Until that result, classify this validation as implemented but **unverified**. Hardware adapter-level VRAM/WPR evidence for large cases still outstanding under issue #40. No release or update feed changed.

## 2026-10-12 — GPU memory provenance, process topology and verified native crossing transparency

- **Merged #101** (`14e0fcabad4dc5faf1f5bb148fec51bda8a190b0`): after exact-head Windows CI `#38289073171` passed real OpenFOAM QuickCup, packaged Portable/Setup, EULA and real two-viewport screenshots, the native WebGL2 pixel proof checks two synthetic polygons whose relative depth reverses across the image. The test runs the actual weighted transparency code, compares forward/reversed source order and checks GL errors; the renderer is a **weighted approximation**, not mathematically exact order-independent transparency. Real OpenFOAM metal/mold context restoration is tested.
- **Merged #103** (`655d38b37182cea8184e66df011d5698adc1fec6`): exact-head Windows CI `#38290101820` PASS, including GPU snapshot provenance regression, QuickCup, Portable and installed smoke tests, EULA, shortcuts, and native Home/About/Data/Field captures. The protected build now uploads `foam-gpu-portable.json` and `foam-gpu-installed.json` from **actual just-launched executables**, recording source checkout SHA, PID, UTC timestamp, runtime variant, counter values or explicit `unavailable` and null. Initial launch readings are **not** a large case's loaded-frame VRAM peak.
- **Merged #102** (`97eacc651c420d4bab3abc3f84c79ab1bda18537`): exact-head Windows CI `#38290222740` PASS after correcting the synthetic capture fixture to match the actual sampler's `processes` field. GPU counter time-series deltas are no longer reported if the WebView2 PID set changes or descendant counter coverage is incomplete, preventing false leak/growth claims. Measured snapshots/peaks remain separate from defensible start/end delta.
- **Pending #104**: add Windows OS-build + detected graphics-adapter/driver inventory with no invented selected-device identification or driver-memory estimate. Exact-head CI must complete before merge; no assertion of success from pending status.
- **Remaining issue #40, NOT closed**: physical large-scale OpenFOAM throughput/VRAM measurements under a known GPU and driver, corroboration with WPR/WPA or suitable vendor telemetry where Windows GPU counters are inaccurate, and cross-device visual evaluation of approximate OIT on intersecting real geometries. No new installer release, tag or updater feed published.


## 2026-10-12 — grouped Field OIT, loaded GPU telemetry and Setup task follow-through

- **Superseded branches:** closed temporary draft PRs [#106](https://github.com/michels-lab/FoamLens/pull/106) and [#107](https://github.com/michels-lab/FoamLens/pull/107) after verifying the original WebGL2 OIT, crossed-surface regression and GPU inventory work was already integrated into main through earlier reviewed PRs. Avoided replacing newer main implementations with stale branch heads.
- **Field OIT lifecycle — merged:** [#109](https://github.com/michels-lab/FoamLens/pull/109) completed exact PR-head Windows workflow [#38296894314](https://github.com/michels-lab/FoamLens/actions/runs/38296894314) **SUCCESS** including real QuickCup/VTK, Node regressions, Portable smoke, installed Windows Setup, licensing/shortcuts and visual evidence. Squash merge `c8ca96ab4efc81bc1b0d0470e043aeede3c05d0f`. The patch releases temporary RGBA16F/R8 textures on inactive/opaque scenes and failed draws, clears enabled vertex attributes on GPU exceptions, prevents stale simultaneous OIT/sorted-path evidence and enforces the real packaged Field diagnostic invariant. Production weighted shader regressions also executed directly in V8 on the PR source and passed.
- **Loaded-case GPU process counters — candidate:** [#110](https://github.com/michels-lab/FoamLens/pull/110) adds a bounded atomic readiness/acknowledgment handshake between the *real rendered OpenFOAM* native Windows application and a three-sample GPU process counter collector, separately for Portable and Setup. Exact PID, checkout SHA, physical-case provenance and no-fabricated-VRAM semantics are checked. The first CI build [#38297713268](https://github.com/michels-lab/FoamLens/actions/runs/38297713268) exposed a concrete pre-existing bug: `capture_gpu_memory_series.ps1` dot-sourced a module with its own default `RootProcessId=0`, overwriting the real PID. PR candidate now passes the actual PID into the nested dot-source and tests preservation; **new exact-head CI remains necessary**. Hosted Windows QuickCup cannot establish an owner's multi-million-cell hardware VRAM peak.
- **Installer user choice — candidate:** [#111](https://github.com/michels-lab/FoamLens/pull/111) adds distinct unchecked desktop-shortcut and taskbar-guidance options on the installer Tasks page, with truthful user-owned Windows pin instructions rather than an unsupported forced taskbar pin. Real install/uninstall opt-in and opt-out checks were expanded. First CI [#38298021838](https://github.com/michels-lab/FoamLens/actions/runs/38298021838) identified a stale `windows-icon.test.cjs` assertion still expecting the old post-install unchecked checkbox; candidate updates the test for new explicit `Tasks: taskbarhelp` behavior. **New exact-head CI remains necessary.**
- **Boundaries:** no Microsoft Store work, no tag/release publication, no owner hardware certification, and no claim that post-release human visual acceptance has occurred. Issues #29, #30 and #40 retain their evidence-based completion requirements.

### 2026-10-12 — independently verified loaded-case GPU evidence merged

- [PR #110](https://github.com/michels-lab/FoamLens/pull/110) integrated to `main` at squash commit `52c91e4b8f2095b2a42238a5e16e191c1f727061`, after full exact-head [Windows run #38299366963](https://github.com/michels-lab/FoamLens/actions/runs/38299366963) **SUCCESS** (real QuickCup/VTK, portable+installed actual scientific UI, installer EULA/shortcuts, screenshots and SHA-256). Measured portable loaded-case process GPU counters were explicitly seen as `counter-sampled` on a prior CI attempt; subsequent complete CI verifies the corrected runtime handshake, sampler, installed/portable evidence and release contract. The initial source-PID regression and minimized WebView2 false five-timer-tick threshold were fixed and backed by executable regression checks. Do not claim adapter-total VRAM or owner device performance; maintain #40 pending real large-case owner hardware and post-release visual acceptance. No public release/tag was published.

### 2026-10-12 — grouped Windows installer choice accepted and merged

- [PR #111](https://github.com/michels-lab/FoamLens/pull/111), exact PR-head `9976cfc4f805870e08f9517bf854a0fed9aaafc7`, [Actions run #38299736136](https://github.com/michels-lab/FoamLens/actions/runs/38299736136) **SUCCESS** for real QuickCup/VTK, Windows source regressions, portable execution, installed Inno Setup smoke, actual desktop shortcut opt-in/opt-out and uninstallation, interactive Welcome/EULA, and rendered Home/About/Data/Field evidence. Squash merged to main at `c3db2c0c33fbdde08c1e8f3312eb89dd372605c8`.
- Interactive Setup exposes separate unchecked desktop-shortcut and taskbar-*instructions* options. Windows pinning remains user-controlled; no unsupported automatic taskbar modification is claimed.
- During CI, repaired a source-test expectation that still asserted the old Finish-page help checkbox, then rebuilt the PowerShell installer-choice test from a pristine source after a malformed duplicate-block edit. A clean exact-head CI pass is required and was obtained.
- All three focused independent blocks #109 (OIT GPU lifecycle), #110 (real-loaded OpenFOAM GPU-counter evidence) and #111 (Setup user choices) are now merged to main. Their individual exact-head Windows CI runs passed; a new aggregate same-`main` validation/build has **not** yet been demonstrated in this note. No new version, release or updater feed publication was performed. Real owner hardware VRAM/performance certification and post-release owner visual review remain separate.

### 2026-10-12 — FoamLens Desktop v1.8.1 candidate prepared (publication conditional)

- Owner authorized execution of the combined validation, new Windows Setup/Portable version and GitHub release, **only after exact candidate-scoped automated gates pass**. Source branch `release/desktop-v1.8.1-20261012` is based on `main` with the fully merged #109/#110/#111 changes.
- Coordinated `desktop/src/FoamLensDesktop/FoamLensDesktop.csproj` `Version`, `AssemblyVersion`, `FileVersion`, Inno Setup version fallback, and embedded frontend default `Desktop v1.8.1`. `CHANGELOG.md` describes physically scoped GPU memory instrumentation, OIT cleanup, and optional shortcut/taskbar help. A Windows regression checks all four version sources and changelog equality.
- Candidate PR Windows CI must validate private real QuickCup and VTK, .NET 8 WinForms and WebView2 portable/installed native smoke, real two-region Field and Data layouts at two sizes, EULA screenshot, actual Inno tasks opt-in/opt-out/uninstall, updater security contract and exact artifact screenshots/checksums.
- Do not publish or report a valid release until a **new merged main HEAD** passes the same CI and the built-in `release:` workflow actually uploads `FoamLens-Setup-v1.8.1.exe`, `FoamLens-Portable-v1.8.1.exe` and corresponding SHA-256 files. Do not bypass the workflow with raw assets. No Microsoft Store packaging is authorized. Owner's post-release visual review and owner GPU large-scene/VRAM validation are not claimed complete.

### 2026-10-12 — Desktop v1.8.1 public release and downloadable Windows binary verification

- **PUBLICATION COMPLETE:** [FoamLens Desktop v1.8.1](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.1), published `2026-10-12T23:49:58Z` through the protected `release:` main workflow after source QuickCup/VTK, portable + installed real OpenFOAM smoke, installer/EULA/shortcuts and exact binary-bound rendered UI gates.
- **POST-PUBLICATION VERIFICATION:** [PR #113](https://github.com/michels-lab/FoamLens/pull/113), independently verified by [GitHub Actions run #38324972466](https://github.com/michels-lab/FoamLens/actions/runs/38324972466) (**SUCCESS**). Downloaded the *actual GitHub Release* binaries and checksum files, not the PR artifacts. Checked stable published metadata, matching source tag + project version, real Windows PE headers, GitHub asset-size metadata and cryptographic SHA-256 against downloaded `.sha256`.
- Public **Setup** `FoamLens-Setup-v1.8.1.exe`: `68,493,039` bytes; SHA-256 `508d10e32a693ff59543bed7af458ffb42472d6ef23172959d66409c900a4a1e`.
- Public **Portable** `FoamLens-Portable-v1.8.1.exe`: `73,794,183` bytes; SHA-256 `c11e9aa0202439c46d97a9f8c322d9ecf40b748db40d47ff4a1204b82cedc017`.
- A permanent, separately gated audit workflow and negative regressions were added to detect missing, renamed, corrupted, truncated, draft or wrong-version releases. The post-release audit report is preserved as a separate workflow artifact. The release artifacts themselves are **immutable**; this work does not edit or silently replace the existing v1.8.1 public binaries.
- Microsoft Store packaging remains paused; no Authenticode certificate/signature or personal GPU device/peak-VRAM certification is implied. User's visual review occurs **after** release; it is not falsely recorded as complete.

### 2026-10-12 — 2D OpenFOAM large-case response + v1.8.2 distribution candidate

- Owner evidence: v1.8.1 imported **3,008 / 3,008** files, then reported **95%**, **184.8 s elapsed**, and `Updating analyses` on a 2D case. Earlier steps incorrectly said `Waiting`. This is an owner-observed product latency and evidence of a slow full-case workflow, not a measured parsing time or proof of any one algorithmic bottleneck.
- **Performance fix already merged to `main`** in `299fa8f2d6142252c4df255581f600bf407dc1ea` following source-executed 3,008-series tests [#38333782098](https://github.com/michels-lab/FoamLens/actions/runs/38333782098) and full Windows/QuickCup suite [#38333782068](https://github.com/michels-lab/FoamLens/actions/runs/38333782068), both SUCCESS. See `docs/SCIENTIFIC_2D_FAST_IMPORT_AUDIT_2026-10-12.md`. Large imports open usable views first, defer solver coupling/phase-front/findings to the explicit full audit/appropriate workspace; never report not-yet-evaluated data as Healthy. Probe comparisons now index by case+field+physical probe in linear passes and file panels render 80 rows initially.
- **v1.8.2 release candidate:** `release/desktop-v1.8.2-2d-import-20261012` matches .NET AssemblyVersion/FileVersion, Inno Setup, frontend About fallback, both README and changelog. This candidate is **not** the public release until exact-head Windows portable and installed binaries pass real QuickCup/VTK, screenshots, EULA and signed-asset-integrity (SHA-256) gates and the subsequent `release:` main workflow creates the actual tag and assets. Existing v1.8.1 binaries remain immutable.
- **Distribution audit change:** release-integrity regression always runs for new source candidates but downloading from a release requires an actual published tag. Upon publishing from the protected main workflow, separately re-download the GitHub public Setup, Portable and their checksum files and verify physical PE signatures, asset lengths and SHA-256. This ensures future releases are not blocked by a tag that by design cannot exist prior to publication.
- Scientific caveats: the user has not benchmarked v1.8.2 on their real 3,008-file 2D case; synthetic JS finalization times are **not** cold-load speed results. Native persistent disk cache, end-to-end profiler of file types/bytes, worker parallelism and a large-case benchmark remain open. Owner allows a large installer to deliver robust scientific dependencies. No Microsoft Store, unverified personal GPU or Authenticode claim.

### 2026-10-14 — Native OpenFOAM cache merged; v1.8.3 candidate rebased safely

- [PR #123](https://github.com/michels-lab/FoamLens/pull/123) integrated to `main` as `7eb46dfc65f9d8c4d1077ae2319bb946dc05fd7e` after exact PR-head [Windows CI #38496527074](https://github.com/michels-lab/FoamLens/actions/runs/38496527074) **SUCCESS** (private QuickCup OpenFOAM integration and VTK reference success, actual .NET8 cache self-test, portable + installed Windows UI, Inno EULA/shortcut checks) and [native cache integrity #38496527112](https://github.com/michels-lab/FoamLens/actions/runs/38496527112) **SUCCESS**. Native temporal/probe and supported complete ASCII field caches are source-content SHA-256 checked, payload integrity checked, fail-safe and non-decimating.
- Reconciled existing [release candidate PR #124](https://github.com/michels-lab/FoamLens/pull/124) with the merged latest scientific `main` tree while preserving only v1.8.3 version/changelog/doc deltas from the earlier candidate, to avoid silently losing the last scientific cache correction. New candidate-head Windows + native cache + QuickCup/VTK validation MUST pass before any `release:` merge/publishing.
- **Unverified outside CI:** owner's real 3,008-file 2D model cold/warm import, first interactive time, memory peak and comparison to v1.8.1's 184.8 s screenshot. Do not invent a speedup or close [issue #117](https://github.com/michels-lab/FoamLens/issues/117). Public v1.8.2 remains available until an independently validated new release and SHA-256 public-asset audit.

### 2026-10-14 — Optional second field for Spatial Profiles (candidate)

- User requirement: compare two real OpenFOAM Spatial Profile variables at once, e.g. T and liquid fraction alpha1 / available phase-change field, using the **same original case/region, postProcessing profile set, line and physical-time selection** as one variable. Never invent the missing field or its samples.
- Implemented an always-discoverable optional second variable, compatible with all available fields in the selected profile set. Underlying plot and case-visibility predicates select the two exact variables; the profile playback engine builds distinct provenance-preserving field/case groups, and a single case with unequal field snapshots uses the shared measured physical-time range or reports absence when no overlap exists.
- Automatic axis mapping places unlike scientific dimensions/units on independent left and right Y scales, while like units may share an axis. Locked animation ranges are computed independently for both Y axes. Preserve the original one-field workflow with secondary set to None and never fabricate percentage/phase metadata.
- Candidate validation: dual-profile runtime/contract regression test registered in Windows workflow, old profile playback and Windows native OpenFOAM smoke pending. **No release or version bump authorized**.

- Two-field figure titles and the per-case/per-variable native/interpolated playback statuses now name each real field distinctly. Same-case dual-variable playback displays its common physical-time range instead of misleading native-only text.

### 2026-10-14 — Public v1.8.3 documentation CI reconciliation

- Public v1.8.3 publication and exact downloaded Setup/Portable checksum evidence recorded independently. Repaired README's exact-version native regression contract by retaining standalone bold Desktop v1.8.3 / frontend v51 release identity while placing real GitHub release download links separately. No false v1.8.3 release candidate language.
- Corrected user-facing outdated claim that embedded Spatial Profile/Time Series/Solver Logs controls must remain simultaneously visible inside Field: Data already owns these datasets; a separate, still-validated Field UX PR retires their legacy companion tabs. Updated docs do not assert unpublished UI changes are shipped. No release or updater change.

### 2026-10-14 — Native temporal parsing off the UI dispatcher (PR #126 reconciliation)

- Reused the previously Windows/QuickCup-validated source delta of PR #126: native temporal file checksum, persistent cache and streaming parser execute through cancellable Task.Run outside WinForms/WebView2's UI synchronization context. Source hash/cache payload integrity, exact scientific data and UI-thread marshaling remain unchanged.
- Reconciled onto current v1.8.3 public documentation / dual-variable profile main without restoring an old full tree or published version. Fresh exact-head Windows, real QuickCup/VTK and installed/portable tests required. Responsiveness improvement has no claimed measured owner's real large-case speedup; issue #117 stays open.

### 2026-10-14 — Privacy-safe import diagnostics carried through native temporal-worker integration

- After #126 was independently validated on Windows and merged into main, #125 is reconciled without reverting that real off-dispatcher parser. Retains the feature's exact input-report source and regression canaries, dual-variable profiles and publicly verified v1.8.3 README. Full current-head 3,008-series and installed/portable Windows/OpenFOAM tests required before integration. Owner cold/warm and memory benchmark remain open; no release authorized.

Field UI PR #128 CI regression triage and main reconciliation

- Previous Windows failure came from scientific section-ownership test fixture lacking activeAppMode/currentDataView. Updated Data + Time Series fixture and tested Field-mode no-side-effects, preserving staged atomic scientific history behavior.
- A 3,008-curve fast import runner exceeded its existing 2,000 ms wall-clock threshold; the fast-import source was not modified by this UI branch. Retain benchmark bound and retest on exact reconciled head.
- Reconciled approved Field UI fix onto main including integrated dual-variable Spatial Profiles #129 and its Windows tests. Exact installed/portable Windows OpenFOAM and screenshot validation required before merge. No release or version bump.

### 2026-10-14 — Field packaged smoke failure: preserve render-level evidence, fail closed

- PR #128 exact-head Windows run #38655966974 passed real QuickCup and source scientific suites but installed/portable smoke ended before GPU-loaded readiness marker. Initial evidence ZIP contained real Home/About launch pixels but omitted the native failure log, so failure origin could not be diagnosed reliably. Another exact-head run exceeded an existing CPU-congested synthetic import wall clock, which is independently tracked.
- Added a real WebView2 Field screenshot on failed measured 3D/toolbar contract before throwing, and made the GPU readiness helper print a short redacted set of relevant native smoke exception lines when the host dies early. This is diagnostic only: all scientific/physical render failure gates still fail closed. New exact-head CI is required; do not report Field fixed or merged from this step.

### 2026-10-14 — Fixed packaged native Ribbon expectation uncovered by GPU diagnostic

- Exact PR #128 Windows run #38656872770 exposed the actual regression previously masked by an early GPU readiness failure: native smoke expected four legacy Field actions (Profile, Time Series, Logs, Split) and insisted that the old Profile subbar become visible. The production UI correctly removed those 2D-only actions and retained only the 3D tab; native smoke failed on obsolete assertions before any OpenFOAM GPU marker could be written.
- Updated the *real packaged WebView2* validation to require Data-specific plot actions plus all seven 3D camera shortcuts, to reject a legacy Field-profile view request, to keep Data context hidden in Field, and to assert exactly one 3D internal tab. Rendering/scientific provenance gates remain enforced; both portable and installed candidate tests need fresh full CI. No public release authorized.

### 2026-10-14 — Seven-camera Ribbon: bounded laptop width and named-camera fallbacks

- Found an additional compact-screen risk during native-contract review: a CSS !important override kept all seven quick-camera *text labels* expanded despite the existing 1460px button-width cap; this could violate the nonclipping one-row Ribbon contract. Corrected breakpoints to retain full text labels at wide widths, use seven direction-specific 29px accessible/tooltip-labeled quick icons between 760px and 1460px, and defer to the fully named Camera shelf under 760px. Other Field actions use icons below 1800px to avoid hiding the physical-time playback control.
- Actual native render contract checks physical width and accessible name at laptop sizes and visible names at wide size; it must still fail if essential toolbar or canvas geometry is clipped. No new scientific interpolations, camera geometry or field reading logic.

### 2026-10-14 — 3,008-series CI timing regression gate repair

- Identical synthetic fast-import elapsed wall-time > 2 s failures occurred on unmodified main and the 3D UX branch despite real QuickCup passing. Since this test simulates filesystem/UI I/O with immediate mock promises, Windows runner descheduling is not scientific CPU work. The test now measures real CPU consumption via process.cpuUsage() against the original 2,000 ms budget, logs wall time separately, and retains every no-eager-audit, truthful pending state, small-case correctness and visible-plot assertion. This does not establish a cold/warm benchmark on the owner's real 3,008-file case.
- Candidate also reconciles actual Field UI source with the latest main native Task.Run temporal parsing and dual-variable Spatial Profiles. Windows QuickCup, installed/portable, visual geometry and exact-head CI still required before integration; no new release.

### 2026-10-14 — Exact main/PR native temporal worker regression fixed

- Current-commit Windows native-performance tests failed on both verified QuickCup candidates: the PR #128 `Program.cs` assembly had preserved an old direct `await NativeTemporalCache.GetOrParseAsync(...)` inside `HandleTemporalFileAsync`, despite the newer `main` using cancellable `await Task.Run(() => NativeTemporalCache.GetOrParseAsync(...), operation.Token)`. This is an actual UI-thread responsiveness regression caused by manual tree reconciliation, not a stale assertion. Restored the exact current-main handler into the UI candidate, preserving scientific source hashes, cache, reply marshaling and cancellation. Updated exact-head .NET 8 installed/portable CI + OpenFOAM required; no release authorization.

### 2026-10-14 — Real Field sidebar overlap: synchronize Ribbon chrome geometry

- Native packaged Windows smoke showed header 58 px, Ribbon 83 px, and sidebar beginning at 131 px (10 px overlap). The CSS already positions the sidebar using measured header + Ribbon variables; however, measurement ran before synchronous tab/mode height changes, leaving stale values until ResizeObserver executes. Expose the existing measure callback and synchronously recompute on Ribbon panel activation and mode changes, retaining observer updates for subsequent layout/resize. No arbitrary padding or fake visual acceptance. Re-run real Windows portable+installed smoke before merging.

### 2026-10-15 — Verified compact Ribbon physics-clock clipping and fixed row collision

- Two independent real Windows portable smoke runs (#38663779506, #38663774566) passed camera labels, all seven unique icons, cache popover, active physics field, region legends/palette and Play button. Compact clock reported exactly 9.8 s in both the rendered readout and actual loaded frame but failed its combined verification. The inherited `@media(max-width:900px)` workspace CSS forced `#fwTimeReadout` and `#fwTimeSpeed` onto CSS grid row 2 even though the Ribbon uses a six-column, one-row time transport whose first three columns are only 28 px. Restored these two controls to normal grid auto-placement within the Ribbon with an explicit max-content minimum so the measured physical-time text cannot silently clip. No time values, solver data, interpolation, provenance or tolerance changed.
- Native rendered validator continues requiring actual frame time equality, displayed time, correct slider aria-valuetext and physical clock bounds; now logs each subcondition and measured clock geometry separately on failure. Added source regression to the exact-head Windows candidate. Rebuild/retest current PR before merge. No version bump or public release.

### 2026-10-15 — Real installed Windows session Data-view corruption (PR #128)

- Exact-head Windows candidate #38768331755 passed QuickCup/VTK and packed Portable 3D/compact camera/cache clock validation, but installed smoke exposed a separate real cross-session ownership bug: saved Data surface `catalog` came back as `profile` after restoring a Field session. Region, case, time, physical scene, and Field state were all valid; no reason to weaken the session invariant.
- Root cause was `fwSetCompanion` invoking `fwPrevSetDataView('profile')` unconditionally during Field 3D workspace state restoration, leaking a hidden legacy companion selection into the shared Data state. Guarded legacy companion plot activation behind an actually active non-3D view; removed auto-triggered native OpenFOAM field-history parsing from invisible companion changes. Data Time Series retains its existing explicit Build action.
- Added an executed production-function test that calls companion selection while the Field view is 3D and verifies no Data plot hijack, history parse, 3D control reparent or plot-surface activation. Re-run exact-head real Windows Portable/Setup session round-trip and source CI before merge. No release.

### 2026-10-15 — Native case structural checkpoint (issue #117; PR candidate)

- Native folder walker on a cancellable background worker records relative file paths, lengths, modification ticks, structural categories and directory timestamps. On a *complete* walk it atomically stores a per-user, root-hash-keyed inventory with SHA-256 verified JSON payload; incomplete/unreadable scans cannot replace a complete checkpoint. Bad/oversized/unwritable caches fail safely and cannot block OpenFOAM imports.
- Fresh directory/file listing is still REQUIRED before treating metadata as identical. The inventory never substitutes for physical source parsing or SHA-256 field/temporal caches, and does not yet cache field header dimensions or claim speedup. No private source path/filename is added to the external import diagnostic payload.
- Production .NET native-cache smoke and standalone test harness exercise cold/warm, corruption, source size change, incomplete scan, cancellation and synthetic 10,000-entry catalog. Full Windows real-case CI and actual owner cold/warm dataset measurement still required.


### 2026-10-15 — Keep scientific folder import responsive while caching metadata (issue #117)

- Corrected an import handoff bottleneck: the real Windows native folder scanner now emits the final file chunk and `folderComplete` **before** running the optional SHA-256-verified native structural catalog write. Desktop JS can start loading/plotting physical data as soon as enumeration finishes rather than awaiting catalog serialization and disk I/O.
- Collected file size and timestamp once from each file snapshot, tracked saturation-safe known source bytes and actual enumeration milliseconds, and retained partial/cancelled scan safety. The eventual checkpoint still runs with the existing cancellation token; cancellation after delivered completion cannot falsely invalidate the already-enumerated files. Catalog status reports `deferred`, not a fabricated completed cache result.
- Added a source-order CI contract to the native scientific cache job, and it continues running the production .NET numerical/cache integrity regressions. Follow up with real QuickCup/VTK and exact packed Portable/Setup tests.
- This is a *latency dependency improvement*, not a verified speedup. Owner's 3,008-file cold/warm import, CPU/RAM measurements and time to first interactive plot are still required. No release or version bump solely on source checks.

### 2026-10-15 — Indexed spatial-profile physical-time labels (3k+ source datasets)

- The existing `refreshProfileTimes` resolved a sample for every time value by scanning every selected profile with `profiles.find(profileTimeEqual)`, causing O(profiles × times) comparisons when 2D experiments contain thousands of physical-time folders.
- Added a sorted numerical time index plus bounded neighborhood scan using the exact existing `profileTimeEqual` scientific tolerance. Ties preserve **the earliest source profile**, so subtle near-equal timestamps retain the same display labels as before; negative and nonfinite time inputs are handled explicitly.
- Bypass sample lookup altogether for a common multi-case/two-variable physical-time clock because those labels are generated from the authoritative common clock. No physical times, interpolation, scientific values or comparison axes are modified.
- Integrated a production-source Node regression comparing the new index against the original scan for 3,008 unique times, near-equal and high-magnitude times, missing/nonfinite values, and shared-clock mode into the Windows build gate.
- Requires packed Windows validation and owner case measurement. This removes one identified quadratic UI path; no whole-import benchmark speedup is claimed yet.

### 2026-10-15 — Comparable privacy-safe owner import timing evidence

- Added a local Node.js report comparison utility and executable regression tests for two FoamLens Ready-screen `foamlens-scientific-import-performance-v1` exports. Rejects version/mode/file/series/case/source-volume and file-kind mismatches, preserves missing audit timings as null and never fabricates speedups from absent or zero elapsed times.
- Output contains only bounded scientific import stage timing statistics and explicitly warns that privacy-safe reports cannot verify exact input identity or physical values. No private names, paths, mesh values or field arrays are exported.
- Added `docs/OWNER_IMPORT_TIMINGS.md` with correct same-dataset first/repeated methodology. This comparison is a reproducibility aid, **not** a measured improvement of the owner's original 184.8 s / 3,008-file case. Full cold/warm owner benchmark, peak memory and exact Windows binary validation remain #117/#131 gates.


### 2026-10-15 — Desktop v1.8.4 release candidate and scientific acceptance gate

- Grouped merged changes #132, #133, #134 and #135 with Field workspace UX fixes, two-variable synchronized profiles, native structural inventory and profile time-index performance. Candidate aligns C# AssemblyVersion/FileVersion, Inno installer, frontend version, root and Desktop README and Changelog at 1.8.4 without altering Web frontend v51.
- Publication must be triggered only by exact `release:` commit on `main` following candidate QuickCup/VTK, native cache, profile-time, real installed/portable and rendered UI checks. The same main commit must pass publication integrity and SHA-256 redownload checks. Do not claim v1.8.4 is publicly downloadable until GitHub Release verification.
- Owner real 3,008-file cold/warm timing remains an explicit open performance requirement; no invented speedup or fabricated physical values.


### 2026-10-15 — Physical 3D Field scale, dimensions, camera fit, measurement and region legends (candidate)

- Replaced the diagonal-only 3D fit heuristic with a dimensionally faithful eight-corner mesh-bounds fit accounting for the current camera right/up directions, viewport aspect and 14% view margin. No mesh vertices, OpenFOAM internal fields or phase-change values are numerically modified; invalid/infinite source bounds reject fit without corrupting a working camera.
- Added a true-aspect **orthographic** dimensional-inspection mode as Field default; perspective remains explicitly selectable. Both views use uniform X/Y/Z world units; no implicit Z/thickness exaggeration or silent axis rescaling. Fit Model respects all visible physical regions and source bounds, with existing seven directional presets preserved.
- Overlay now renders physical mesh bounding-box edges, X/Y/Z graduated axes and actual minimum/maximum/extent with units selected from SI meters (m/mm/µm). It is optional via Dimensions and recalculates with camera/navigation/frame changes; values originate from source `polyMesh` bounds and are not arbitrary pixels or modeled dataset estimates.
- Added on-demand **Measure** interaction: select two actual OpenFOAM exterior mesh vertices by screen proximity; display Euclidean source-mesh distance, never an invented continuous point. Measurements remain in physical mesh coordinates across camera rotations; Clear measurement releases selected points.
- Multi-region render now shows a separate Field viewport legend for every visible loaded region, with its own field name, time, color scale and SI unit. Flat fields show **Uniform field: value**, not a visually fabricated color gradient; geometry-only/missing data never become fake measured values. The pre-existing full per-region sidebar legends remain.
- Added a production-functions regression for aspect changes, exact source mesh point XYZ, metric vertex selection, distance and uniform secondary scale. Windows full workflow will compile and execute these together with QuickCup/VTK, user interface, installer and scientific gates before integration. Owner physical bounds and ruler visuals still require actual packed WebView2 smoke review; no claimed owner-case benchmark speedup.


### 2026-10-15 — Desktop v1.8.5 physical-scale release candidate

- Align .NET assembly, Inno Setup, frontend version, root/Desktop README and changelog to the grouped new Field features on PR #138. No changes to Web v51 or scientific input values.
- Exact-head real QuickCup/VTK, numeric dimension, packaged Setup/Portable camera/view UI and source/asset integrity must pass before explicit `release:` promotion on main. The publish workflow must verify the actual re-downloaded public binaries; owner's real-case 2D cold/warm speedup remains unmeasured.


### 2026-10-15 — Data Profiles: reuse imported cases and compare real profiles without reimporting (candidate)

- User screenshot shows Data → Profiles still foregrounding `Add files`/`Add folder` after importing an OpenFOAM project with 20 time datasets, 81 solver-log files and **0 parsed spatial profile outputs**. A single global `Case` chooser (B15) was excluding all other cases before profile graphing, and the legacy case comparison manager was offscreen. Do not mistake time directories/solver logs for real spatial profile curves.
- Data Profiles/Time series now foreground a scrollable, **previously imported** multi-case checklist. Every imported case lists its exact parsed profile-curve count, indexed/pending profile-file count, time-series count and log count. Importing additional data remains possible through a collapsed `Import additional data` section and retains the original native import hooks; no duplication or forced rescanning.
- `Compare profiles` and `Compare time series` require two selected cases with actual compatible data types. Selections override the single-case global filter only inside those Data chart views, preserve independent source-case names/styles and restore the previous global Case/Region choice on `Single case`. The Data Ribbon `Compare curves` action opens this in-context case chooser. Case visibility manually selected for comparison does not spill into Field/Log.
- Profile comparison can include all selected real profile sets and lines by default without carrying over a source-case-specific output-folder filter. Existing dual-variable axes, source coordinates, physical-time alignment and no-fabricated-measurement behavior stay in force. Previously indexed profiles can be materialized only on demand for selected cases.
- Profiles remains navigable with zero actual profile outputs and explicitly explains the difference between imported cases, time series, logs and spatial profiles rather than silently switching views; a usable time-series comparison remains available when those curves exist.
- New `desktop/tests/data-loaded-case-comparison.test.cjs` executes production selection/filter functions with real-vs-indexed vs time-only/log-only cases, verifies case restoration and prevents duplicate import controls, and is included in Windows release gates and lightweight Data CI.
- Status: candidate changes and tests committed on feature branch, integration/public release **not yet claimed**. Unresolved owner real-case profile provenance requires actual OpenFOAM postProcessing/spatial sampling output if count remains 0.

### 2026-10-15 — Desktop v1.8.6 Field transport looping and named camera controls

- Screenshot-driven UI defect: Field Ribbon visible playback used `fwTimePlay` rather than the independent `fvSchedulePlayback` 3D engine. `fwTimePlay` stopped at the last physical snapshot despite the 3D engine's existing wraparound. Repaired the Field-owned timer to loop on actual selected available timestamps, serially awaiting each verified frame and respecting pause/async cancellation and speed; changes to the Field time state never invent missing data.
- The Ribbon compact CSS compressed the entire Play label into a 28px grid column and hid seven direction names at laptop widths. Increased the one-row transport width and tested actual label visibility. Camera buttons now show semantic names and source-axis directions with selection feedback; context Camera menu exposes all seven on smaller viewports.
- Added `desktop/tests/field-loop-playback.test.cjs`, updated existing Ribbon/camera acceptance assertions and native Windows smoke; new lightweight CI runs tests on source changes, Windows release job gates the same playback regression. Candidate Desktop v1.8.6 aligns native/installer/frontend versions, root and Desktop README and changelog. Must pass real QuickCup, scientific cache and packed Portable/Setup before release. Historical 3,008-file cold/warm import performance remains unmeasured; no fabricated numerical claims.


### 2026-10-15 — Exact installed-UI narrow Ribbon release blocker and repair (v1.8.6)

- Actual Windows Portable smoke on 1024px (run #38813160913) blocked publication, reporting `noClippedPrimaryRow=false` and Ribbon scroll width 1350px for a 1024px viewport. This proved that making seven quick cameras permanently labeled in the primary row was insufficient despite passing the new Node unit suite and QuickCup scientific tests.
- Corrected the responsive ownership of seven full view controls: keep **fully readable** named direct shortcuts at larger laptop widths, but at <=1200px remove only their redundant main Ribbon quick group. The visible **Camera** contextual shelf retains a named seven-direction menu (from +X/−X/+Y/−Y/+Z/−Z and Isometric); full Play/Pause keeps its own 106px grid track without overflow. Do not fake UI success by relaxing the `noClippedPrimaryRow` assertion.
- Strengthened the exact packaged WebView2 smoke to open the real Camera list and assert all seven physically labeled direction buttons are visible, and strengthened the Ribbon regression to require this 1024px fallback. Re-run full Windows installed/portable and on-screen checks before public version promotion.


### 2026-10-15 — Long-label native smoke checks compact Camera fallback

- Exact Windows Setup/Portable run #38814314089 advanced past the original compact Ribbon `noClippedPrimaryRow` check but failed a *different* geometry assertion requiring the four direct camera shortcuts to be visible even at narrow widths (`directCameraViews=false`). This contradicted the new responsive ownership design, not any OpenFOAM data/camera calculation.
- Replaced that assertion with a physically useful two-mode acceptance: for wide views, require readable direct camera labels; for screens <=1200px, open the **actual Camera shelf** and require all seven labeled physical-axis direction buttons to be visible and accessible at usable widths, then restore the shelf's original state. Keep the no-overflow/uncut Play acceptance intact and repeat the full installed/Portable verification; no skipped tests or fabricated success.

### 2026-10-15 — Unified Data and Field v1.8.6 candidate

- Reconciled the already merged loaded-case Profiles/Time series comparison with looping Field playback and camera controls. Preserve the per-view Data case selector, Data Ribbon routing and both separate Windows regression gates on the exact source candidate. Original case filtering, real profile provenance and source data are unchanged.


### 2026-10-15 — FoamLENS Desktop v1.8.6 public release verified

- Merged integrated Data loaded-case comparison and Field continuous-loop playback / readable seven-view camera controls as `f2077e115dca1a41f494d664083838059fba3bbc` (PR #139), retaining the exact previous release v1.8.5 data and its scientific source values.
- Exact main publication workflow run #38824955976 completed successfully: real QuickCup/VTK, full Windows Setup/Portable build, installed visual smoke, loop/camera and loaded-case regressions. Publish job #116733259130 confirmed both public Setup and Portable assets and verified actual newly published file SHA-256 checksums.
- Release: https://github.com/michels-lab/FoamLens/releases/tag/v1.8.6 with `FoamLens-Setup-v1.8.6.exe` and `FoamLens-Portable-v1.8.6.exe`. Released case comparison lists all imported cases, hides redundant import until asked, and enables spatial-profile or time-series comparison **only** when two real suitable cases are available; imported 3D fields or solver logs alone do not imply existing spatial probe profiles.
- Owner's exact 3,008-file cold/warm import benchmark remains unresolved; screenshot showing `0 profiles` cannot be reinterpreted as measured profile data. No scientifically fabricated profiles, fields or speedups are advertised.


### 2026-10-17 — Live Data comparison selection after v1.8.6 shipped

- Verified public v1.8.6 Setup/Portable includes direct selection of **previously imported OpenFOAM cases** and moves redundant "Add files / Add folder" under the collapsed import action. Correctly distinguishes actual imported spatial-profile outputs from 3D fields, time series and 81+ solver logs; `0 profiles` in owner screenshot cannot be magically treated as actual profile measurement data.
- Additional observed UX defect: while a loaded-case multi-case comparison was already active, changing, selecting all or clearing case checkboxes refreshed the list only; plotted curves did not update until the user pressed Compare again.
- Fixed the actual Data checkbox/list handlers to update plotted Profiles/Time series, playback cache and selection-aware selectors immediately. Existing case data are reused, not reimported; indexed spatial-profile files are hydrated only when really needed. An epoch guard discards late redraws from previous checkboxes/comparison modes.
- New native-source JavaScript regression covers live chart updates, no data reload in time-series mode, lazy indexed-profile loading, out-of-order asynchronous completion, and live select-all/clear wiring. Fast and full Windows CI gates run this without removing earlier scientific checks. Public v1.8.6 unchanged until a separately verified new release.


### 2026-10-17 — Desktop v1.8.7 live loaded-case comparison release candidate

- Version aligned across .NET assembly, Inno Setup, native frontend fallback, root/desktop README and changelog with production Data case-selection fix and its green fast-source scientific regression. Preserve public v1.8.6 as last verified distribution until exact-head v1.8.7 Windows Setup/Portable, real QuickCup/VTK, native screenshots, and public SHA-256 checks all pass.
- Follow-up CI exposed a missing asynchronous case-selection race: selecting another case while a shared indexed-profile hydration was still underway could skip repainting the newest selection. Fixed by attaching the latest render epoch to in-flight hydration; the revised test mimics the actual shared pending promise and passes. No previously loaded scientific values are fabricated or changed.


### 2026-10-17 — FoamLENS Desktop v1.8.7 public release verified

- Merged the live comparison selection update to main as `07c81833ea8be9f8e62d59b1a7d9d293dc44e7aa`. The previously verified v1.8.6 contained imported-case checkboxes and collapsed redundant import actions; v1.8.7 additionally refreshes real Data/Profiles and Time series curves immediately when users check/uncheck, select all or clear cases in an active comparison.
- Exact main Windows release workflow [#39086770150](https://github.com/michels-lab/FoamLens/actions/runs/39086770150) succeeded: QuickCup/VTK, 3,008-series scientific regression, actual Windows Setup/Portable packages, installed UI and camera/loop controls. Publication step [#117556388296](https://github.com/michels-lab/FoamLens/actions/runs/39086770150) passed both `Publish verified GitHub Release` and `Verify actual newly published Windows Setup and Portable checksums`.
- Public v1.8.7: https://github.com/michels-lab/FoamLens/releases/tag/v1.8.7. Exact published assets: `FoamLens-Setup-v1.8.7.exe`, `FoamLens-Portable-v1.8.7.exe`, and their respective SHA-256 checksums. Not a draft or prerelease.
- Scientific boundary: the owner's screenshot showing 20 source time values but **0 spatial profiles** does not prove `postProcessing` spatial profile files exist. Multi-case Profiles activates only with at least two cases containing genuine sampled profiles; Time series comparison similarly requires real curves. No profiles or speedups are fabricated. Owner's 3,008-file cold/warm 2D benchmark (#117) remains open.


### 2026-10-18 — Retryable per-file OpenFOAM profiles in loaded-case comparisons

- Audit found that `hydrateLazyProfilesForContext` unconditionally removed an entire case's indexed spatial-profile bucket after batch parsing, even if `loadFiles` had rejected files or returned no valid measured profiles. This could make an already loaded case show missing curves, with no indexed file reference left to retry; an aggregate `failed` counter alone could not distinguish the surviving sources.
- Added opt-in `onFileResult(file,valid)` provenance in the existing loader: success requires at least one parsed source series, not merely absence of an exception. A lightweight finalizer removes only exact original successfully processed file objects; failures, empty outputs and newly reindexed replacements remain available for retries. Per-case `lazyProfileFileCount` reflects remaining work instead of fabricated completion.
- Partial status explicitly reports retriable pending files; scientific measured curves remain authoritative, no pseudo-curves or guessed input fields are introduced. Existing multi-case selection and physical-time alignment are retained.
- Added a production-helper regression for success/failure, empty files, stale in-flight file replacement, cross-case isolation, and second-attempt completion. Both the loaded-case fast CI and complete Windows release CI gate the test. No public version bump or release until packed Windows passes.

- Exposed **Retry pending profiles** in the active Profiles multi-case comparison. Enabled only when selected cases still have real indexed, unparsed files; waits for any in-flight load, retries the remaining source references, updates loaded plots, and never reimports successfully hydrated profiles. A source that still fails remains pending for another manual attempt.


### 2026-10-18 — Windows Desktop v1.8.8 candidate

- Prepared native .NET, Inno Setup, frontend Desktop fallback, root/Desktop READMEs and changelog with one consistent 1.8.8 identity; Web frontend remains v51. Candidate groups PR #142's retryable real OpenFOAM per-file import and direct selected-case retry UX.
- Full Windows QuickCup/VTK + Setup/Portable and asset integrity on exact PR head remain release gates. Publish only via the guarded `release:` merge commit to main after candidate approval; verify actual public assets by independent re-download and SHA-256. Never imply measured owner's machine import speedup from synthetic 3,008-series regression.
