# FoamLens

## Operación Granada — auditoría de aplicación y plugins (2026-10-21)

[Ver auditoría y bitácora propias de este producto](docs/GRANADA_APP_PLUGIN_AUDIT_2026-10-21.md): evidencia de GitHub Actions, conectores ChatGPT aplicables, servicios existentes, costo cero adicional por defecto, pendientes reales y separación estricta de los demás productos. La documentación no prueba QA físico ni publica una versión.

Scientific analysis and post-processing workspace for OpenFOAM simulation data, created by **Michel Armando Duarte Flores**.

FoamLens is designed for thesis and research workflows where simulation data need to be discovered, compared, inspected, styled, animated, and exported without building a separate plotting script for every case.

The [product development audit](docs/GIT_AUDIT_LOG.md) separates current source fixes, CI, published binaries and owner acceptance. A merged change is not proof that a previously published installer contains it.

## Release information

- **FoamLens Web v51**.
- **Latest published stable for Windows:** [GitHub Releases/latest](https://github.com/michels-lab/FoamLens/releases/latest). The release page, not the source branch or a PR artifact, determines which Setup and Portable binaries are publicly available.
- **FoamLens Desktop v1.8.21** for Windows — [**latest published stable Windows Setup + Portable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.21) (2026-11-19 UTC). Exact original release source [`98f5a958`](https://github.com/michels-lab/FoamLens/commit/98f5a95895a402b9f52783c555b5dbbeebea3268), [protected QuickCup and 64-bit Windows Setup/Portable visual/runtime release run](https://github.com/michels-lab/FoamLens/actions/runs/44594122858) **SUCCESS**, and [independent downloaded public PE executable + SHA-256 integrity audit](https://github.com/michels-lab/FoamLens/actions/runs/44595471470) **SUCCESS**. B/C/D now show ALL imported original case choices, clearly label missing 3D readiness, and recover initial A from an actually renderable case when prior context is unready. Original numerical CFD data and source clocks are unchanged (PR #370). Physical owner screenshot approval, B14 import completeness and Windows DPI are separate from CI; unsigned GitHub binaries may show SmartScreen.
- **FoamLens Desktop v1.8.20** for Windows — [**latest published stable Windows Setup + Portable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.20) (2026-11-18 UTC). Exact published commit [`d1d1d9bd`](https://github.com/michels-lab/FoamLens/commit/d1d1d9bd65a8d5cba3963ca155e6961dfdeb0d22); [original QuickCup, native installed/Portable, multi-DPI visual evidence and protected public binary release](https://github.com/michels-lab/FoamLens/actions/runs/44405665755) **SUCCESS**, then [independent actual Setup/Portable SHA-256 and public download audit](https://github.com/michels-lab/FoamLens/actions/runs/44407597973) **SUCCESS**. Corrects clipped source dropdowns and B case/dimensions overlap caused by the F2 Size grip plus invalid three-row subgrid, keeps A/B and C/D aligned without horizontal/toolbars scrollbars (PR #369). Physical owner display/DPI acceptance and CFD accuracy are separate from CI.
- **FoamLens Desktop v1.8.19** for Windows — [**latest published stable Setup + Portable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.19) (November 18, 2026 UTC). Exact original release source [`16d3d323`](https://github.com/michels-lab/FoamLens/commit/16d3d3239b9b1baf1876eb493ffdf9025a38083d), [protected Windows QuickCup + installed/Portable + native screenshot and publication workflow SUCCESS](https://github.com/michels-lab/FoamLens/actions/runs/44393085250), [independent actual public executable + SHA-256 integrity audit SUCCESS](https://github.com/michels-lab/FoamLens/actions/runs/44395146854). Removes the unwanted horizontal and per-view toolbar scrolling of v1.8.18: matched two-column A/B/C/D canvases, directly editable per-view case pickers and compact optional metal/mold/source menus (PR #367). Automated evidence does not certify physical monitor DPI or owner's final aesthetic approval; GitHub Windows binaries are unsigned and may trigger SmartScreen.
- **FoamLens Desktop v1.8.18** for Windows — [**latest published stable Setup + Portable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.18) (November 18, 2026 UTC). Exact released source commit [`e5b502e`](https://github.com/michels-lab/FoamLens/commit/e5b502e8356f964f117820e16a5cb5cda300083b); [native QuickCup, installed/Portable, 36-slot UI and public SHA-256 release gates](https://github.com/michels-lab/FoamLens/actions/runs/44381050449) **SUCCESS**, followed by [independent public executable/checksum audit](https://github.com/michels-lab/FoamLens/actions/runs/44382486071) **SUCCESS**. Addresses A/B/C/D viewport misalignment and forced single-column stacking, improves readability of original per-view controls, and includes atomic no-blank measured-time metal/mold frame updates ([PR #366](https://github.com/michels-lab/FoamLens/pull/366)). Both real Windows executables and SHA-256 sidecars are publicly available; direct GitHub executables are unsigned (SmartScreen may warn). Automated tests do not certify physical Windows monitor DPI or the owner's final aesthetic/scientific acceptance.
- **FoamLens Desktop v1.8.17** for Windows — [**latest published stable Setup + Portable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.17) (November 18, 2026 UTC / November 17 in Mexico). Exact release source commit [`c4be18e`](https://github.com/michels-lab/FoamLens/commit/c4be18ecca5e2fc0df454508b2bd6b88f5b27aa5); native Windows [release workflow](https://github.com/michels-lab/FoamLens/actions/runs/44234222264) **success** including public Setup/Portable download validation and both SHA-256 sidecars. Corrects the original 3D Difference failure on 300,000 cell values, disallows falsely truncated/invalid OpenFOAM A−B and streams O(N) comparison range calculations ([PR #361](https://github.com/michels-lab/FoamLens/pull/361)). The developer benchmark CLI additionally fingerprints empty physical-time directories and rejects false first/repeat dataset identities ([PR #362](https://github.com/michels-lab/FoamLens/pull/362)); this is **not a claim of a measured owner-case speedup**. Direct GitHub executables are unsigned; Windows SmartScreen may warn. Actual owner visual acceptance, physical 125–200% Windows DPI testing and independent CFD validation are not certified by native CI.
- **FoamLens Desktop v1.8.16** for Windows — [release source merged to `main`](https://github.com/michels-lab/FoamLens/commit/2b993913ffd036de6b5176ebd2bdafa86daefa8d) after Windows candidate tests succeeded. Field B original selectors no longer rebuild on every physical-time frame (#356); B/C/D invalidate stale source-backed physics and independent C/D frame reads run concurrently (#357). The protected [native Windows publication run](https://github.com/michels-lab/FoamLens/actions/runs/44228227055) **passed**, publishing the [stable v1.8.16 Setup + Portable](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.16) with both verified SHA-256 sidecars on November 18, 2026 UTC (November 17 in Mexico) from exact source commit `2b993913ffd036de6b5176ebd2bdafa86daefa8d`. The [independent release audit](https://github.com/michels-lab/FoamLens/actions/runs/44230314224) passed. Executables are unsigned and Windows SmartScreen may warn; native viewport screenshots are not physical DPI or scientific-accuracy certification.
- **FoamLens Desktop v1.8.15** for Windows — [stable Setup + Portable / rollback](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.15), published November 18, 2026 (UTC; November 17 in Mexico), from exact source commit `0c51d58`. The original native Windows release build completed successfully and verified the *downloaded* public Setup and Portable PE files, sizes and SHA-256 sidecars. Independent OpenFOAM physical times are supported in 3D views; original 36-workspace native screenshot provenance is checked. **Direct GitHub executables are unsigned** and may prompt Windows SmartScreen. Automated CSS-viewport captures do not certify physical Windows DPI at 125–200%, final owner aesthetic approval, or independent simulation accuracy.
- **FoamLens Desktop v1.8.14** for Windows — [previous stable Setup + Portable](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.14), published November 13, 2026 (UTC), retained for rollback with its SHA-256 sidecars.
- **FoamLens Desktop v1.8.13** for Windows — [previous stable Setup + Portable](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.13), November 12, 2026. Includes Field F2 responsive region controls and the T1 resilient real multi-case source-field catalog.
- The [v1.8.12 release](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.12) remains available for rollback.

## Features

- Load OpenFOAM probe files, spatial-profile `.xy` files, processed `foamLog` outputs, raw `log.<solver>` run logs, and `postProcessing` folders.
- Smart recursive folder import with automatic OpenFOAM case detection.
- Capability-driven **OpenFOAM discovery model** that inventories regions, physical-time directories, native fields, field classes, dimensions, boundary patches, dictionaries, logs, and recursively discovered `postProcessing` outputs without a project-specific field allowlist.
- **Data Catalog** view for explicit inspection of what FoamLens detected: case, region, data kind, scalar/vector/tensor class, dimensions, physical-time range, sample count, provenance, and source path. Catalog discovery never auto-plots every variable.
- Separate data views for **Time series**, **Spatial profiles**, and **Solver logs** so incompatible datasets are not mixed.
- **3D Field View** for OpenFOAM cell-, internal-face-, and point-associated scalar/vector fields with ASCII/native-binary `polyMesh`, physical-time playback, moving/dynamic meshes, cell- and point-field slices/iso-surfaces, association-aware 3D probes, vector glyphs and streamlines. `surface*Field` explicit numeric patch values are mapped to their exact boundary faces; patches without explicit numeric values remain neutral and are never fabricated.
- **Field Workspace** promotes 3D analysis to a top-level mode with visible multi-case controls. Spatial Profiles, Time Series and Solver Logs remain available in the Data workspace; internal companion tabs are being retired in a separately tested UI update.
- **Linked or independent multi-view 3D analysis** for up to four viewports. Each can select its own case, region, field, component and physical OpenFOAM time; camera, appearance and physical-time linking can be switched on or off. Independent B/C/D views have source-backed time selection and per-view playback. Compatible quantities can use shared color ranges and strict signed difference fields for topologically/geometrically equivalent meshes.
- **3D animation/video export** composites the visible synchronized views into one video after preloading frames and fixing an independent global color range for each viewport.
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
- Native GitHub Release update checks with user-controlled installation and SHA-256 installer verification.

## FoamLens Desktop

The Windows edition preserves the FoamLens interface while moving project-folder discovery and file access into a native **C# / .NET 8 / WinForms / WebView2** host.

This avoids depending on a browser tab for long analyses and provides native Windows folder access and background processing.

GitHub Actions builds:

- `FoamLens-Portable-vX.Y.Z.exe` — portable self-contained Windows executable.
- `FoamLens-Setup-vX.Y.Z.exe` — Windows installer generated with Inno Setup.
- `FoamLens-Portable-vX.Y.Z.exe.sha256` — portable SHA-256 checksum.
- `FoamLens-Setup-vX.Y.Z.exe.sha256` — installer SHA-256 checksum.

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

## Documentation map and independent OpenFOAM ecosystem

- [Product documentation, engineering logs and audit index](docs/DOCUMENTATION_INDEX.md).
- [Generic OpenFOAM interoperability and independence from MasterProject](docs/OPENFOAM_ECOSYSTEM.md).

FoamLens does not require MasterProject or any coordination hub to function; scientific source data and physical validation remain with their producers.
