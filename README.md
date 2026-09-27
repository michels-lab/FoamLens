# FoamLens

Scientific analysis and post-processing workspace for OpenFOAM simulation data, created by **Michel Armando Duarte Flores**.

FoamLens is designed for thesis and research workflows where simulation data need to be discovered, compared, inspected, styled, animated, and exported without building a separate plotting script for every case.

## Current versions

- **FoamLens Web v48**
- **FoamLens Desktop v1.0.2** for Windows

## Features

- Load OpenFOAM probe files, spatial-profile `.xy` files, processed `foamLog` outputs, raw `log.<solver>` run logs, and `postProcessing` folders.
- Smart recursive folder import with automatic OpenFOAM case detection.
- Separate data views for **Time series**, **Spatial profiles**, and **Solver logs** so incompatible datasets are not mixed.
- Detect horizontal/vertical spatial profiles from file structure and contents.
- Friendly OpenFOAM variable labels while retaining original field names in metadata/tooltips.
- Automatic derived velocity fields such as `Velocity magnitude |U|` and `Velocity XY`.
- Difference plots between compatible cases with maximum absolute difference and its X position.
- Compare multiple profile heights at the same variable and time.
- Time slider, previous/next controls, Play/Pause animation, and optional locked axes for profile evolution.
- Automatic scientific axis precision.
- Curve metrics including min/max, X locations, average, velocity RMS, Uy zero crossings, and difference metrics where applicable.
- Configurable physical reference lines.
- Resizable/collapsible settings panel, independently scrollable plot area, chart zoom and Fit controls.
- Thesis Figure mode with high-resolution PNG and SVG export.
- PNG, SVG, and CSV export.
- English and Spanish interface.
- Light and dark appearance.
- Local persistence of visual defaults.
- Built-in About / Developer section.

## FoamLens Desktop

The Windows edition preserves the FoamLens interface while moving project-folder discovery and file access into a native **C# / .NET 8 / WinForms / WebView2** host.

This avoids depending on a browser tab for long analyses and provides native Windows folder access and background processing.

GitHub Actions builds:

- `FoamLens-Portable-vX.Y.Z.exe` — portable self-contained Windows executable.
- `FoamLens-Setup-vX.Y.Z.exe` — Windows installer generated with Inno Setup.
- `FoamLens-Portable-vX.Y.Z.exe.sha256` — SHA-256 checksum.

Tagged or explicitly published builds can also be attached directly to a GitHub Release.

## Web edition

No installation or build process is required.

1. Download or clone the repository.
2. Open `index.html` in a modern desktop browser.
3. Load individual OpenFOAM files or select a project/post-processing folder.

Simulation data are processed locally.

> **Note:** FoamLens is an independent third-party tool and is not affiliated with or endorsed by the OpenFOAM project or its distributors.

## Author

**Michel Armando Duarte Flores**  
Materials Engineer · Metallurgical Engineering Research  
GitHub: [@realmichelduarte](https://github.com/realmichelduarte)  
LinkedIn: [Michel A. Duarte Flores](https://www.linkedin.com/in/realmichelduart/)  
Instagram: [@realmichelduarte](https://instagram.com/realmichelduarte)

## License

**Proprietary — All Rights Reserved.**

This repository is public for viewing, demonstration, portfolio, and source-review purposes only. Public availability does **not** grant permission to copy, modify, redistribute, rebrand, sell, reuse, or incorporate this software into other projects.

See [`LICENSE`](LICENSE) for the complete terms.

© 2026 Michel Armando Duarte Flores. All Rights Reserved.
