# FoamLens Desktop v1.8.13

Native Windows host embedding the **FoamLens v51 frontend**.

**FoamLens Desktop v1.8.13 with frontend v51** includes the already merged Field F2 per-viewport Physical regions responsive layout (PR #318) and Time Series T1 per-case/per-region source inventory fault isolation (PR #319). Narrow A/B/C/D scenes now arrange actual region property/component/opacity controls according to each individual pane width without altering OpenFOAM data, and a missing region's 3D field metadata no longer hides existing fields from other imported cases.

This source version does not by itself mean Windows binaries are published. The official stable installer is available through [GitHub Releases](https://github.com/michels-lab/FoamLens/releases/latest). Each new release must pass real Windows Setup/Portable installed WebView2 smoke, source-backed QuickCup, SHA-256 sidecars, exact artifact provenance and post-publication verification. Authenticode signing remains optional for direct GitHub distribution, and Windows may warn about unsigned executables. No owner-machine 3,008-file speedup or physical monitor DPI acceptance is claimed.

## Windows GitHub release process

Use the original `Build FoamLens Desktop for Windows` workflow. The `release:` main commit invokes release verification and publication; failures prevent a new public GitHub Release. The complete Windows installer and original scientific source-validation checks remain in place.

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
