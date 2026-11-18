# FoamLens Desktop v1.8.17

Native Windows host embedding the **FoamLens v51 frontend**.

**FoamLens Desktop v1.8.17 with frontend v51** is the next stable Windows source candidate; it is **not a published binary** until the exact release build succeeds. It includes source-owned original 3D Field Difference guards: unequal/partial OpenFOAM cell arrays cannot be visualized as valid A−B, nonfinite comparisons invalidate old GPU field/range state, and 300,000+ cell min/max/mean statistics run in one streaming pass without a JS argument-stack overflow or duplicated full-field arrays ([PR #361](https://github.com/michels-lab/FoamLens/pull/361)). Original benchmarks for 2D OpenFOAM now fingerprint the complete tree, including empty physical-time directories ([PR #362](https://github.com/michels-lab/FoamLens/pull/362)); this is a provenance fix, **not an owner-measured performance improvement**. The public latest release is still resolved from [GitHub Releases/latest](https://github.com/michels-lab/FoamLens/releases/latest). Native QuickCup B13, Setup/Portable runtime and 36 original Windows workspace captures must pass on the **exact final source SHA**, along with both published SHA-256 sidecars. Direct GitHub executables may be unsigned; SmartScreen warning and physical DPI limitations still apply.

## Previous verified release: v1.8.16

**FoamLens Desktop v1.8.16 with frontend v51** is merged stable release source at commit [`2b993913`](https://github.com/michels-lab/FoamLens/commit/2b993913ffd036de6b5176ebd2bdafa86daefa8d). It preserves original OpenFOAM time/field provenance, fixes source-backed failed-frame invalidation for Field B/C/D, and lets independent C/D 3D reads start concurrently without inventing OpenFOAM data or forcing synchronized clocks. The [stable v1.8.16 Windows release](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.16) is **publicly published** with original Setup, Portable and both SHA-256 sidecars after the [exact-source Windows release workflow](https://github.com/michels-lab/FoamLens/actions/runs/44228227055) passed native QuickCup B13, installed/portable and 36-workspace checks. The separate [published-release audit](https://github.com/michels-lab/FoamLens/actions/runs/44230314224) also passed. Code integration alone would not have counted as publication. The nine original app workspaces (Home, About, Data, Field, Time Series, Field compare, Analysis, Review and Live) are captured on two native viewport widths for each of the independent installed and portable executable processes, creating **36 binary-bound UI slots**. Native CDP screenshots carry per-process SHA-256 receipts, without fabricating scientific data or graphics. G5's complete matrix is **technical evidence**, not a declaration of physical OS DPI 125–200% or owner aesthetic approval.

The preceding [published stable v1.8.15](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.15) retains source-owned Time Series T1 dimensional/units guards, independent Field physical times and native visual provenance; those scientific protections remain in v1.8.16. A source version, candidate build or CI artifact is **not** a published public release: a new tag is created only by the protected main-branch `release:` workflow after source-exact native QuickCup, Setup/Portable runtime checks, 36-slot visual evidence, checksum sidecars and strict publishing gate pass. Direct GitHub executables may remain **unsigned**, and Windows SmartScreen can warn before first launch.

## Windows GitHub release process

The original `Build FoamLens Desktop for Windows` workflow validates actual physical source data and the installed native package. A `release:` main commit requests a stable version; only successful genuine Windows validation may publish it. No RC or paid certificate is required for direct GitHub distribution.

## Architecture

- **UI:** existing FoamLens HTML/CSS/JavaScript rendered in Microsoft WebView2.
- **Native host:** C# / .NET 8 / Windows Forms.
- **Folder discovery:** native Windows directory enumeration on a background Task.
- **File I/O:** native on-demand reads through a tokenized JS↔C# bridge; CPU-heavy OpenFOAM field parsing is dispatched off the WinForms UI thread so 3D visual controls stay responsive while frames load.
- **foamLog parsing:** native C# batch parser, parallelized across CPU cores.
- **Background behavior:** WebView2 launches with Chromium background/occlusion throttling disabled so long FoamLens analyses are not paused merely because the app is minimized or another application has focus.
- **Spatial Profiles playback:** multiple visible cases use one common physical-time clock; Nearest and safe temporal Interpolate alignment are independent of each case's write times.
- **Field-analysis index:** time-directory volume fields and physical/configuration dictionaries are indexed without automatically plotting every field.
- **General discovery model:** indexes scalar/vector/tensor field classes, dimensions, representative boundary patches, physical time directories, region evidence, logs, dictionaries, probes, sampled sets, volume/surface reductions, and arbitrary tabular `postProcessing` outputs by structure/content rather than project names.
- **Data Catalog:** exposes discovered provenance and metadata without adding all detected fields to the active plot.
- **Phase Change / Momentum:** analysis is enabled from detected capabilities and explicit field mapping, with cell-wise statistics, phase subsets, mechanism ratios, correlations, temporal evolution, derived-rate calculations and formula verification.
- **Field Workspace:** Field View is a first-class top-level 3D mode. Spatial Profile, Time Series and Solver Log plotting is accessed from the Data workspace; in-Field companion Data plots are isolated so hidden selections cannot corrupt the active Data view. Multi-view controls expose up to four synchronized 3D viewports with independent case/region/field/component selections, and all visible views remain eligible for one video export.
- **3D Field View:** transient OpenFOAM volume scalar/vector fields can be rendered on ASCII or native Desktop binary `polyMesh`, including time-varying/dynamic mesh snapshots. Field View supports physical-time playback, slices, iso-surfaces, 3D picking, vectors and streamlines; explicit orbit/pan/zoom controls, standard camera views and an interactive XYZ orientation gizmo; intelligent current/global/manual color ranges; cached/prefetched temporal fields; synchronized multi-view analysis with independent case/region/field/component selections; strict signed difference fields for geometrically/topologically equivalent meshes; and synchronized multi-view animation/video export. The entry remains discoverable when required data are missing and reports what is unavailable.
- **Read-only safety:** analyses read files on demand and persist only FoamLens mappings/settings; OpenFOAM case files are never modified.

The frontend retains its normal web folder flow when opened as HTML. The native bridge is detected automatically only inside FoamLens Desktop.

## Automatic updates

FoamLens Desktop checks the official GitHub Releases endpoint in the background on normal startup. When a newer semantic version is available, the user can choose whether to update; nothing is installed without that choice.

The native updater downloads the release installer and its matching `.sha256` file, verifies the installer with SHA-256, and only then launches the installer. A manual **Updates / Actualizaciones** action is also exposed in the Ribbon. Update checks transmit only the normal HTTPS request needed to query/download the public release; OpenFOAM project or simulation data are never uploaded.

The updater is disabled during packaged smoke tests so CI does not depend on live release-network behavior.

## GitHub Windows build

The **Build FoamLens Desktop for Windows** workflow reconstructs the v51 frontend and produces:

- `FoamLens-Portable-vX.Y.Z.exe` — portable self-contained Windows executable.
- `FoamLens-Setup-vX.Y.Z.exe` — installer generated with Inno Setup.
- `FoamLens-Portable-vX.Y.Z.exe.sha256` — SHA-256 checksum.

The version is read from `FoamLensDesktop.csproj`. Tagged or explicitly published builds can be attached directly to a GitHub Release. Optional Authenticode signing is supported when Windows signing secrets are configured.

CI always runs general synthetic discovery regressions. When `QUICKCUP_FIXTURE_TOKEN` is configured, it also checks out the private real OpenFOAM fixture repository into the runner and executes integration tests against its current files; private fixture data are never vendored into FoamLens.

## Native operations in Desktop v1

- choosing the OpenFOAM project folder;
- recursive folder walking;
- file metadata discovery;
- file reads / header slices;
- foamLog two-column numeric parsing.

Other FoamLens scientific logic remains in the frontend for compatibility with the web edition.

FoamLens is proprietary software by **Michel Armando Duarte Flores / Michel's Lab**. See LICENSE.txt.
