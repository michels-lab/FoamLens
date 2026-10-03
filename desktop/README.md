# FoamLens Desktop v1.4.9

Native Windows host embedding the **FoamLens v51 frontend**.

The current public release is **FoamLens Desktop v1.4.9 with frontend v51**.

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
- **Field Workspace:** Field View is a first-class top-level mode. It can keep 3D rendering visible beside a Spatial Profile, Time Series or Solver Log companion panel, with synchronized physical time where applicable. Multi-view controls expose up to four synchronized 3D viewports with independent case/region/field/component selections, and all visible views remain eligible for one video export.
- **3D Field View:** transient OpenFOAM volume scalar/vector fields can be rendered on ASCII or native Desktop binary `polyMesh`, including time-varying/dynamic mesh snapshots. Field View supports physical-time playback, slices, iso-surfaces, 3D picking, vectors and streamlines; explicit orbit/pan/zoom controls, standard camera views and an interactive XYZ orientation gizmo; intelligent current/global/manual color ranges; cached/prefetched temporal fields; synchronized multi-view analysis with independent case/region/field/component selections; strict signed difference fields for geometrically/topologically equivalent meshes; and synchronized multi-view animation/video export. The entry remains discoverable when required data are missing and reports what is unavailable.
- **Read-only safety:** analyses read files on demand and persist only FoamLens mappings/settings; OpenFOAM case files are never modified.

The frontend retains its normal web folder flow when opened as HTML. The native bridge is detected automatically only inside FoamLens Desktop.

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
