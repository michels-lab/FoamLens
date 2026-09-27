# FoamLens Desktop v1.0.0

Native Windows host for **FoamLens Web v48**.

## Architecture

- **UI:** existing FoamLens HTML/CSS/JavaScript rendered in Microsoft WebView2.
- **Native host:** C# / .NET 8 / Windows Forms.
- **Folder discovery:** native Windows directory enumeration on a background Task.
- **File I/O:** native on-demand reads through a tokenized JS↔C# bridge.
- **foamLog parsing:** native C# batch parser, parallelized across CPU cores.
- **Background behavior:** WebView2 launches with Chromium background/occlusion throttling disabled so long FoamLens analyses are not paused merely because the app is minimized or another application has focus.

The frontend retains its normal web folder flow when opened as HTML. The native bridge is detected automatically only inside FoamLens Desktop.

## GitHub build

The repository workflow **Build FoamLens Desktop for Windows** reconstructs the v48 frontend, builds a self-contained win-x64 EXE, creates an installer with Inno Setup, and uploads all outputs as a GitHub Actions artifact.

## Native operations in Desktop v1

- choosing the OpenFOAM project folder;
- recursive folder walking;
- file metadata discovery;
- file reads / header slices;
- foamLog two-column numeric parsing.

Other FoamLens scientific logic remains in the frontend for compatibility with the web edition.

FoamLens is proprietary software by **Michel Armando Duarte Flores / Michel's Lab**. See LICENSE.txt.
