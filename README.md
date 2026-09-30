# FoamLens

Scientific analysis and post-processing workspace for OpenFOAM simulation data, created by **Michel Armando Duarte Flores**.

FoamLens is designed for thesis and research workflows where simulation data need to be discovered, compared, inspected, styled, animated, and exported without building a separate plotting script for every case.

## Published version

- **FoamLens Web v51**
- **FoamLens Desktop v1.4.0** for Windows (current public release)\n- **Desktop v1.4.1 candidate** is under validated hotfix/development before publication

## Features

- Load OpenFOAM probe files, spatial-profile `.xy` files, processed `foamLog` outputs, raw `log.<solver>` run logs, and `postProcessing` folders.
- Smart recursive folder import with automatic OpenFOAM case detection.
- Capability-driven **OpenFOAM discovery model** that inventories regions, physical-time directories, native fields, field classes, dimensions, boundary patches, dictionaries, logs, and recursively discovered `postProcessing` outputs without a project-specific field allowlist.
- **Data Catalog** view for explicit inspection of what FoamLens detected: case, region, data kind, scalar/vector/tensor class, dimensions, physical-time range, sample count, provenance, and source path. Catalog discovery never auto-plots every variable.
- Separate data views for **Time series**, **Spatial profiles**, and **Solver logs** so incompatible datasets are not mixed.
- **3D Field View** for OpenFOAM cell-, internal-face-, and point-associated scalar/vector fields with ASCII/native-binary `polyMesh`, physical-time playback, moving/dynamic meshes, volume-field slices/iso-surfaces, association-aware 3D probes, vector glyphs and streamlines. `surface*Field` explicit numeric patch values are mapped to their exact boundary faces; patches without explicit numeric values remain neutral and are never fabricated.
- **Synchronized 3D case comparison** plus strict signed difference fields for topologically/geometrically equivalent meshes.
- Optional **dual-variable Time-Series Focus** with independent left/right Y axes for combinations such as temperature + liquid fraction.
- Automatic **linear/PIMPLE convergence audit**, **momentum-mechanism audit**, and **OpenFOAM energy audit** with explicit provenance and no hidden causal/sign assumptions.
- **Simulation vs experiment validation** for imported time-temperature tables with RMSE/MAE/bias, phase-event evidence and no temporal extrapolation.
- Detect horizontal/vertical spatial profiles from file structure and contents.
- Friendly OpenFOAM variable labels while retaining original field names in metadata/tooltips.
- Automatic derived velocity fields such as `Velocity magnitude |U|` and `Velocity XY`.
- Difference plots between compatible cases with maximum absolute difference and its X position.
- Compare multiple profile heights at the same variable and time.
- Spatial Profiles playback can synchronize multiple cases on a common physical-time clock with Nearest or temporal Interpolate alignment; single-case playback can still use native stored times.
- Capability-driven **Field Mapping** for stored OpenFOAM volume fields, with editable conceptual roles instead of project-specific field assumptions.
- **Phase Change / Momentum** analysis with configurable liquid/mushy/solid classification, per-cell statistics and percentiles, local mechanism ratios, scatter/correlation analysis, temporal evolution, and multi-case comparison.
- On-demand derived **Cooling Rate = −dT/dt** and **Solidification Rate = −dαL/dt** (or **dαS/dt**) when compatible physical-time fields are available.
- Generic OpenFOAM dictionary metadata inspection from `system/` and `constant/`, including region dictionaries, with source path and dimensions retained.
- **Derived Field Verification** against user-entered formulas with absolute/relative difference metrics and explicit near-zero handling.
- Evidence-only **Physics Summary** that separates observations and derived metrics from interpretation.
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

The Windows build is gated by the full scientific/UI regression suite, including Field View geometry, dynamic mesh playback, phase/momentum analysis, convergence, energy, experimental validation, import, bilingual UI, portable smoke and installed-app smoke. A private real-project integration suite can also run against an external OpenFOAM fixture checkout when its read-only repository token is configured; fixture data are not copied into this public repository.

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
