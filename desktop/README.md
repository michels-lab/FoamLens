# FoamLens Desktop v1.2.0

Native Windows host embedding the **FoamLens v50 frontend**.

## Architecture

- **UI:** existing FoamLens HTML/CSS/JavaScript rendered in Microsoft WebView2.
- **Native host:** C# / .NET 8 / Windows Forms.
- **Folder discovery:** native Windows directory enumeration on a background Task.
- **File I/O:** native on-demand reads through a tokenized JS↔C# bridge.
- **foamLog parsing:** native C# batch parser, parallelized across CPU cores.
- **Background behavior:** WebView2 launches with Chromium background/occlusion throttling disabled so long FoamLens analyses are not paused merely because the app is minimized or another application has focus.
- **Spatial Profiles playback:** multiple visible cases use one common physical-time clock; Nearest and safe temporal Interpolate alignment are independent of each case's write times.
- **Field-analysis index:** time-directory volume fields and physical/configuration dictionaries are indexed without automatically plotting every field.
- **Phase Change / Momentum:** analysis is enabled from detected capabilities and explicit field mapping, with cell-wise statistics, phase subsets, mechanism ratios, correlations, temporal evolution, derived-rate calculations and formula verification.
- **Read-only safety:** analyses read files on demand and persist only FoamLens mappings/settings; OpenFOAM case files are never modified.

The frontend retains its normal web folder flow when opened as HTML. The native bridge is detected automatically only inside FoamLens Desktop.

## GitHub Windows build

The **Build FoamLens Desktop for Windows** workflow reconstructs the v50 frontend and produces:

- `FoamLens-Portable-vX.Y.Z.exe` — portable self-contained Windows executable.
- `FoamLens-Setup-vX.Y.Z.exe` — installer generated with Inno Setup.
- `FoamLens-Portable-vX.Y.Z.exe.sha256` — SHA-256 checksum.

The version is read from `FoamLensDesktop.csproj`. Tagged or explicitly published builds can be attached directly to a GitHub Release. Optional Authenticode signing is supported when Windows signing secrets are configured.

## Native operations in Desktop v1

- choosing the OpenFOAM project folder;
- recursive folder walking;
- file metadata discovery;
- file reads / header slices;
- foamLog two-column numeric parsing.

Other FoamLens scientific logic remains in the frontend for compatibility with the web edition.

FoamLens is proprietary software by **Michel Armando Duarte Flores / Michel's Lab**. See LICENSE.txt.
