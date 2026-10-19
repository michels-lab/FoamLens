# FoamLENS — Scientific 3D independence and CAD & Geometry roadmap
Status: ACTIVE backlog tracking (not completion) · started 2026-10-19 · public baseline: Desktop v1.8.10
Owner evidence: Windows screenshot 2026-10-19 showing A with metal + mold, B with metal alone, and dimensions/axis lines only on A.
Governance: `AGENTS.md`, `.michelslab/project.yml`, `docs/GIT_AUDIT_LOG.md`; local-first, scientific data provenance required. Work and validation on development branch; **no release authorized by this roadmap alone**.

## Backlog maestro consolidado (19 de octubre de 2026)

**Referencia pública verificada:** FoamLENS Desktop v1.8.10. **Este registro NO implica que las funciones estén programadas, probadas o publicadas.** La rama de experimentación `feat/field-per-view-regions-dimensions-20261019` contiene código F1 todavía **sin verificar y no fusionado**. Este documento es una incorporación **solo de documentación a `main`**.

### Separate developer-only diagnostic twin — #158 (implementation candidate; NOT shipped)

- **FoamLens Developer** is a separate compiled Windows executable (`FoamLensDeveloper.exe`), with own installer AppId, install path and isolated `%LOCALAPPDATA%\FoamLensDeveloper` profile; not a secret checkbox in the public app.
- Per-section developer comments: **Point to section** catches the next click, records an exact DOM selector, page, section, physical viewport bounds and timestamps, then saves/edit/locates/deletes a developer-entered note. Store it in isolated Developer WebView2 localStorage across sessions. Include comments and locations in sanitized AI prompt and JSON; source file mappings remain hypotheses unless verified.
- Developer-only compiled, embedded WebView2 audit resource: observed JS errors/promise rejections, local resource failures, WebView2 process failure, bounded interactive UI layout checks, reproducible action-target history, timestamp/version/DPI and explicitly uninspected scope.
- On-demand local **AI debugging prompt** text, copy and JSON exports, sanitized/redacted paths/tokens and no automatic network sharing. Exports may still contain sensitive exception messages; developer reviews before transmitting to any third party.
- CI compiles both editions and proves Developer on actual WebView2, without uploading Developer to public releases; private owner distribution only. Public v1.8.10 unchanged until separately authorized release.
- Scope tracked [#158](https://github.com/michels-lab/FoamLens/issues/158) and [Developer Edition design and build](FOAMLENS_DEVELOPER_EDITION_2026-10-19.md). **Software auditor (#158) is distinct from scientific Mesh Auditor (#150)**.

### P0 — Funcionamiento 3D, series temporales y validez física

| ID | Tema | Estado de cierre (evidencia requerida) |
| --- | --- | --- |
| [#145](https://github.com/michels-lab/FoamLens/issues/145) | A–D: regiones independientes metal/molde y cotas métricas XYZ | Demostrar dos regiones reales visibles en B–D y cotas correctas con Windows instalado y portátil |
| [#146](https://github.com/michels-lab/FoamLens/issues/146) | Time Series: selector `Variable 0` y catálogo de campos | Distinguir series ya existentes de todos los campos 3D elegibles; generar historia real, con unidades y procedencia |
| [#150](https://github.com/michels-lab/FoamLens/issues/150) | Mesh & Geometry Auditor | Importar `checkMesh`, comprobar celdas, caras, volumen, non-orthogonality, skewness, aspect ratio e interfaces, sin afirmar que visualizar implica malla válida |
| [#151](https://github.com/michels-lab/FoamLens/issues/151) | Balance energético multirregión | Auditar módulo existente; energía sensible/latente, flujos/interfaces y residuos con signos, unidades y geometría compatibles |
| [#152](https://github.com/michels-lab/FoamLens/issues/152) | Thermocouple Mapping y validación experimental | Sondas XYZ asociadas a celdas reales; importación CSV/TXT; RMSE, MAE, bias; tiempos alineados y exportación científica |

### P1 — Investigación y extensión científica

| ID | Tema | Estado de cierre (evidencia requerida) |
| --- | --- | --- |
| [#149](https://github.com/michels-lab/FoamLens/issues/149) | Tamaño/movimiento de ventanas, leyendas y alta DPI | Resize/maximize/reordenado sin solapamientos de paneles, cotas, botones y leyendas en Windows |
| [#147](https://github.com/michels-lab/FoamLens/issues/147) | CAD & Geometry: STEP/STP, IGES/IGS, BREP, STL, OBJ | Inspeccionar sólidos y ensambles; triangulación CAD→STL/OBJ con tolerancias, unidades comprobadas y auditoría de topología |
| [#153](https://github.com/michels-lab/FoamLens/issues/153) | 3D Solidification Front Tracker | Volumen por fase, frentes/isosuperficies, posición/velocidad del frente y series reales sin inferencias metalúrgicas no respaldadas |
| [#154](https://github.com/michels-lab/FoamLens/issues/154) | Comparación científica 2D versus 3D | Comparar magnitudes/observables físicamente homólogos sin restar celdas de mallas diferentes |
| [#155](https://github.com/michels-lab/FoamLens/issues/155) | Scientific Case Health | Reportes con estado, Courant/deltaT/PIMPLE/residuos/BC, calidad, integridad, datos faltantes y calificación basada en evidencia |
| [#156](https://github.com/michels-lab/FoamLens/issues/156) | Phase Change / Momentum | Field Mapping de roles configurable, thresholds, estadísticos por fase, ratio local, scatter/correlación, fórmula verificada y Physics Summary cauteloso |

### P2/P3 — Interoperabilidad geométrica con OpenFOAM

| ID | Tema | Estado de cierre |
| --- | --- | --- |
| [#148](https://github.com/michels-lab/FoamLens/issues/148) | Exportación STL/OBJ de CAD y preparación de mallado OpenFOAM | Múltiples superficies físicas identificadas, escalas explícitas, `surfaceCheck` y perfiles distintos por distribución/version; posterior asistente `blockMesh`/`snappyHexMesh`, DXF/2D, Gmsh, WSL opcional |

### Validaciones transversales abiertas

- [#117](https://github.com/michels-lab/FoamLens/issues/117): benchmark original de 3,008 archivos (anteriormente 184.8 s), carga fría/caliente, progreso/cancelación, memoria y GPU; resultados sintéticos **no sustituyen** esas medidas.
- [#131](https://github.com/michels-lab/FoamLens/issues/131): comparación de aceptación científica y visual en Setup y Portable y revisión de interfaz real.

### Política científica y de desarrollo (aplicable a todos los bloques)

1. **Genericidad OpenFOAM:** QuickCup Foundation v14 y sus casos C14/B14/B15/B16/C15/C16 pueden ser *fixtures*, nunca etiquetas, algoritmos o categorías hardcodeadas de producto. Leer campos/regiones/diccionarios de cualquier proyecto compatible; nunca asumir que existen `metal`, `mold`, `T`, `U` o `alphaL`.
2. **Solo lectura de datos originales:** preservar los casos, mallas y resultados del usuario; datos derivados y Field Mapping se guardan en el proyecto FoamLENS. No ejecutar simulaciones CFD en GitHub Actions, ni convertir FoamLENS en un solver.
3. **Diferenciar evidencia:** observado, verificado, calculado, inferido, no disponible, no analizado y no aplicable. No inventar datos experimentales, volumen, geometría, tiempo, unidades ni física faltante. No llamar recalescencia metalúrgica a cualquier aumento de temperatura.
4. **Flujo explícito:** Cases → Analysis Type → Variable → Component → Region/Subset → Statistic → Plot. Nunca graficar todas las variables de todos los casos automáticamente al seleccionarlos.
5. **Física avanzada genérica:** Field Mapping configurable de campo→rol; fases liquid/mushy/solid con thresholds editables (ejemplo 0.05/0.95, no constantes obligatorias); cuantiles, Pearson/Spearman si hay evidencia, razones `|A|/|B|` con epsilon/nulos, metadatos de `fvModels`/`fvOptions`/propiedades y ecuaciones de derived fields con sus unidades/tolerancias. Una correlación o residual pequeño **no prueba causalidad ni validez física**.
6. **CAD/STL:** motor candidato OCCT bajo revisión de licencia; STL describe superficie triangulada sin unidad física estandarizada, no la malla volumétrica `polyMesh`. Validar área/volumen de sólidos, normales, caras degeneradas, estanqueidad, escalado y procedencia. Exportar por piezas/regiones sin unificar metal y molde por accidente.
7. **Validación de aceptación:** pruebas OpenFOAM 2D/3D, regiones distintas, campos incompletos, tiempos adaptativos, denominadores cercanos a cero, datasets grandes, compatibilidad y gráficos persistentes. Windows instalado + portátil, capturas reales, SHA-256 antes de *cada release* y bitácora con pendientes y pruebas. No declarar cerrado si sólo existe un patch o una prueba estática.
8. **No hay autorización de release por esta hoja de ruta.** La implementación avanza en ramas/PR independientes, y cada trabajo debe dejar registrado su estado; continuar con el siguiente bloque elegible sin exigir permiso repetidamente, respetando la coordinación de tareas vigente.

## Product goals and constraints
- Any of four Field viewports A–D may load the SAME case or DIFFERENT already-imported OpenFOAM cases.
- Each viewport owns its own **selected physical regions**, primary field, per-region physical field/component, colormap, opacity, camera, dimension display and probe/measurement state. Changing B never implicitly alters A or C.
- `Region` in the old A/B/C/D selector means **primary/active region**, not a limit of one drawable region. Add explicit **Physical regions** for each view (metal + mold together, additional regions as discovered).
- Read real `meshInventory`, `discoveryModel.fields`, `polyMesh` and actual physical timestamps. No imaginary field values, no mixing cases' meshes, no 0 for missing time, no implicit unit conversion.
- A/B/C/D display their *own real dimension bounds*, X/Y/Z metric line overlays, units and camera projection, even when cases/regions differ. Dimensions and axes toggled per view. Preserve real aspect ratio, orthographic/perspective choice and labels at Windows 125–200% scaling.
- Keep overlays within the canvas, never collide with legend, probe or control bars; rotate/zoom/pan/playback must update the correct view. Difference Δ is an analytical derived panel, **not** a physical region stack; enforce strict matching quantities/topology.
- Avoid loading invisible regions. Abort stale frame tasks and dispose GPU buffers on visibility/case/time/removal transitions. Cache source mesh and field objects where possible; track CPU/GPU payload without pretending to know driver VRAM.
- Keep WebView2 and native Windows support; preserve 3D playback loop and synchronized physical-time rules; fall back to geometry-only with an explicit label when a selected region lacks an actual field at t.

## Blocks, acceptance gates and evidence

### F1 — View-local regions, selected field and overlays (P0, STARTED)
1. Identify source ownership bug: `fvRegionScene` and `fvPhysicalOverlayRender` are primary-only. B/C/D currently render only one mesh/field.
2. Store region choices *by viewport and case identity*, with real mesh names, per-region fields/components, visibility, opacity, palette, and source physical-time metadata; no implicit global A state sharing.
3. Render all selected physical region meshes in each viewport's actual WebGL context (including metal + mold in B/C/D), keeping each source association and its own legend. Treat transparent boundaries with a deliberate depth policy and tests.
4. Display per-viewport Dimensions checkbox, X/Y/Z numeric source bounds and projected metric axes on each scene. Show physically correct union bounds of **visible loaded** regions only.
5. Add a clearly visible per-viewport Physical regions expander (not a buried A-only sidebar). Case change recomputes region inventory, preserves legitimate choices for the same case and discards stale GPU layers.
6. Implement targeted JS regression of two distinct viewports with same case but different region visibility/fields; real Windows installed and Portable multi-region case screenshots for compact/wide/high DPI. **No success claim without real rendered B with mold+metal and B metric axes.**
7. Exit: A=metal+mold, B=metal+mold or only metal, C=another case, each independent; dimensions update after pan/orbit/zoom/time and do not refer to A; missing field means explicit geometry-only, not colored fake data.

### T1 — Time Series: all real OpenFOAM fields and honest variable catalog (P0, TRACKED #146)
- User screenshot: Data → Time Series variable selector presents only **Variable 0** even though the imported OpenFOAM case exposes additional 3D fields. A single already-built curve is not equivalent to the full field inventory.
- Root finding: the active `v14-dual-timeseries.js` selector reads `timeSeriesOptionsBase()` (already imported/generated *series only*), while actual 3D fields are discovered separately via `fvReadyRegions`/`fvFieldGroups` and the `Create time series from 3D OpenFOAM fields` generator is collapsed. Do not assume every real field already has a time-series curve.
- Show **two distinct catalogs**: (1) existing time-series datasets/curves, and (2) available OpenFOAM case → region → scalar/vector field → component (including X/Y/Z/magnitude where valid) that the user can generate on demand.
- Promote `Generate field history` as an immediately visible action from Time Series. Reuse the existing field-history engine (source-backed physical times, exact mesh/field association, mean/min/max or measured 3D probe/profile) with cancel/progress and clear source/units metadata. Accept one or two selections, with independent Y axes when dimensions differ.
- When an imported numeric postProcessing file has multiple *genuine* named columns, keep each source's header and unit/probe provenance; never invent `T`, `U` etc. A probes file containing only one physical field may correctly present one existing variable, but explain the other fields are available for generation.
- Never populate a chart with synthetic curves merely because a 3D field is in inventory. Do not implicitly read thousands of frames on dropdown open, and prevent expensive re-computation without user approval.
- Exit tests: load multi-field OpenFOAM case with real `T`, `U`, `alpha` (where present) and no precomputed probe series; Time Series must show all available fields in the generation picker with field types/components, an explicit not-yet-generated badge, and after Build display the correct scientifically measured time histories and units. If only one series exists, the existing-series selector must report 1 and offer the generation path; no deceptive `Variable 0` as the sole capability.

### F2 — Viewport layout and full controls (P1)
- Per-view layout sizing, maximize/restore, physical scale fit, drag/rearrange and optional synchronized camera/time. Fix 3D headers and legend occlusion (screenshot shows top controls scrolled under ribbon, secondary legend overlapping loading indicator).
- Tooltips/shortcut accessibility; region visibility and dimensions controls available without scrolling through view A. Re-test DPI and Windows 1024/1280/1920 window widths.

### F3 — CAD & Geometry Viewer / Converter (P1, AFTER F1)
- Separate `CAD & Geometry` workspace; local import and 3D viewer for STEP/STP, IGES/IGS, STL, OBJ and BREP. Native CAD kernel via packaged audited OCCT integration (design/licensing review before implementation).
- Tree of solids/shells/surfaces, layer visibility, orbit/pan/zoom, orthographic views, physical units, bounding box, surface and volume (only closed valid solids), defect inspection, tolerance and triangle/normal diagnostics.
- STEP/IGES → ASCII/binary STL, OBJ; preserve original file; explicitly map CAD length units to OpenFOAM meters and check expected bounds. Reject invalid/ambiguous conversions or show guarded warnings.
- Validate watertightness, nonmanifold edges, disconnected components, inverted normals, degenerates. A "converted" STL is a **surface**, NOT an OpenFOAM volume mesh.
- Native .NET/WebView2 interface invokes a separate sandboxed/process-isolated local CAD worker with progress, cancel, resource limits and reproducible manifest/provenance. Do not change main field parser to implement CAD.

### F4 — OpenFOAM surface and multi-region preparation (P2)
- Export selected components as separate named triSurface STL with patch/part manifest; never mix metal and mold into one unnamed shell.
- Version-aware installation profiles: OpenFOAM Foundation 13 (`constant/geometry`, `triSurface`) vs OpenFOAM.com distribution (`constant/triSurface`, `triSurfaceMesh`), verify exact installed edition and version.
- Diagnostic/preview for `surfaceCheck`, geometry scale, normals and overlap; assist `blockMesh` and `snappyHexMesh` dictionary creation but do not equate output STL with an executable simulation.
- True multi-region meshing/interfaces/boundary conditions planned as a separate validated workflow, not generated by guesswork.

### F5 — Advanced CAD/meshing (P3)
- DXF/2D import and extrusion; Gmsh/gmshToFoam optional integration after distribution/license review; optional explicit WSL OpenFOAM tooling. No mandatory separate CAD editor or forced cloud storage.
- Measured stress/performance tests, large assemblies, batch conversion, result linking (CAD part ↔ OpenFOAM mesh region) and reproducible export reports.

## Release policy
- Work in reviewable PRs with source, tests and dated audit entries. A green syntax test is insufficient; installed Windows and real multi-region fixture proof needed.
- Only bump version and publish a release on **separate explicit user authorization**; confirm actual GitHub Setup/Portable assets and SHA-256.
- Separate owner benchmark #117 (3,008-file cold/warm original 2D case) and screenshot acceptance #131 remain open until measured/confirmed, not closed by generic fixture CI.

## Execution tracker
| Block | Status | Evidence |
| --- | --- | --- |
| Source architecture review and reproducible roadmap | RECORDED | This file; #145–#156, #117, #131 |
| Scientific extensions S1–S7 | AUDIT/IMPLEMENT TODO | #150–#156, evidence-based closure |
| F1 per-view native scene geometry / metric axes | STARTED | Development branch `feat/field-per-view-regions-dimensions-20261019` |
| F1 independent region controls / field + GPU layers | TODO | B mold+metal acceptance required |
| F1 exact Windows/WebView2 2+ region visual CI | TODO | New hard gate required |
| T1 Time Series full field catalog + generate real histories | TODO — #146 | imported vs generated separation + multi-field fixture required |
| F2 layout / DPI | TODO | 1024/1280/1920 & scales |
| F3 CAD Viewer/Converter | PLANNED | Kernel/licensing/RFC |
| F4 OpenFOAM export | PLANNED | edition-aware mesh prep |
| F5 meshing | PLANNED | separate solver/toolchain gates |
