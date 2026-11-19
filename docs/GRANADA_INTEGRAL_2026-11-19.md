# FoamLens — Operación Granada integral (2026-11-19)

## Owner direction
Do not cut another release containing only repairs for the previous visible regression. Execute and verify a comprehensive functional, scientific, UX and distribution sweep. Performance benchmarking/optimization is explicitly deprioritized. Never publish an RC or beta.

## Source changes implemented on this branch (NOT YET released)
- Reject unsupported Field A-D synchronization modes instead of silently treating them as nearest.
- Reject unequal cell-array lengths in original 3D interpolation, rather than silently truncating samples.
- Exclude physically inverted min/max ranges from the shared original 3D scalar legend.
- Strict decimal/scientific physical timestamp parser for Field fallback clocks and field-history sample metrics, preserving real zero and the authoritative native region parser.
- Source-bound regressions in desktop/tests/field-compare.test.cjs and desktop/tests/workspace-ux.test.cjs.

## Integral acceptance checklist — still open
- Import real owner B14/C14 and show real OpenFOAM frames for A/B/C/D, independently selectable case, region, field, component and measured time.
- Verify 1–4 view layouts: equal rows, readable native controls, no internal/horizontal scrollbars, no clipped labels.
- Verify atomic metal/mold time playback, no GPU flicker, correct linked/unlinked camera, time and visual styling.
- Verify 3D + spatial profiles, multi-case A–D curves, CSV, Time Series, two-variable and data-tab state restoration.
- Verify Camera presets, Fit/zoom, maximizing/restoring, keyboard and physical XYZ/dimensions.
- Verify Analysis, Review and Live original workspaces and their actual controls, not only whether tabs open.
- Verify CAD imports and exports by region and Foundation/OpenFOAM.com path rules, with real FreeCAD/OpenCascade where available.
- Verify scientific provenance and source value integrity: times, mesh, region, units, probe and interpolation.
- Full native Windows WinForms/WebView2 Setup and Portable original QuickCup suite, real screenshot evidence, human DPI approval, public SHA-256 and updater integrity.

## Deprioritized
- Issue #117 original 3,008-file owner performance benchmark and deeper indexing optimizations (not removed, simply no longer P0/P1 for this run).

## Verification boundary
Code + tests on this branch are NOT proof that full product, owner cases or Windows packaging passed. Run exact-head CI, preserve all errors, resolve before merge. No tag, no release and no false completion claim.

## Existing history
See docs/GIT_AUDIT_LOG.md and issues #145, #149, #177, #146, #176, #238. Treat historical candidate entries as superseded only where later verification explicitly exists.

## Segunda pasada de código — 2026-11-19

Cambios adicionales ya escritos en la rama, con comprobaciones directas de funciones originales:

- El controlador Field ya no desactiva automáticamente una comparación A/B solicitada por el usuario cuando sale de Field y hay un único caso OpenFOAM; el modo predeterminado A-only sigue controlado por el acto explícito de activar/desactivar.
- La equivalencia de mallas de interpolación no acepta dos inventarios de topología ausentes como prueba de identidad; sí admite listas vacías declaradas cuando corresponden (por ejemplo caras internas cero).
- Time Series espacial no convierte el selector de posición vacío o en formato hexadecimal a 0 medido; elige únicamente números decimales/científicos finitos y evita reutilizar el cero implícito de un selector vacío durante el refresco.
- CAD STL/OBJ rechaza valores de coordenada nulos, booleanos, vacíos y números hex/binarios/octales coercionados por JavaScript, sin cambiar posiciones científicas decimales ni inventar unidades.
- Tests extendidos en los suites originales Field, Workspace y CAD. Las comprobaciones directas de sintaxis, CAD numérico, malla incompleta, modos de sincronización y coordenadas pasaron. El resultado final de CI Windows corresponde exclusivamente al SHA exacto de la rama y **no está implícitamente aprobado** por estas pruebas.

Continúan sin certificar en esta pasada: vista real B14/C14 instalada en el equipo del propietario, revisión estética del conjunto y DPI físico, tolerancias CAD con FreeCAD/OpenCascade real, calidad CFD/termo física y release exact-main pública. No borrar ni cerrar esos pendientes.

## Tercera pasada — estabilidad de Time Series y asociación Field B/C/D (2026-11-19)

- El selector espacial de Time Series ahora obtiene los extremos del conjunto original de coordenadas sin expandir arrays gigantes como argumentos a Math.min/Math.max. Se verificaron 300,001 muestras originales sin desbordamiento. Filas con coordenadas ausentes, `null`, no finitas o un string donde debe existir una lista de coordenadas no crean dominios falsos.
- En Field B/C/D, las opciones de campo muestran y **preservan la asociación OpenFOAM original (volume/surface/point)**. Dos campos con el mismo nombre no se confunden al resolver el grupo real ni el reloj independiente. El helper de carga rechaza de forma explícita la ambigüedad no resuelta, sin escoger arbitrariamente la primera coincidencia.
- Se extendieron los tests originales de Field y Workspace; las llamadas aisladas de test retienen los helpers o usan una ruta conservadora que nunca adivina una asociación ambigua. No se reemplazaron los controladores originales por falsas implementaciones.
- **Evidencia Windows:** una ejecución anterior del PR superó QuickCup y la mayoría de suites pero falló el paso de `dotnet restore/publish` con el código del proceso Windows `0xC0000142` (STATUS_DLL_INIT_FAILED), sin errores de compilación .NET demostrados. El job se solicitó nuevamente, pero una actualización de la rama puede cancelarlo; no afirmar causa ni éxito nativo hasta una corrida completa del último SHA.
- Pendientes estrictos: OpenFOAM B14/C14 real en la máquina del usuario, controles y estética A-D a DPI físicos, CAD OCCT real con unidades confirmadas, ejecutables Setup/Portable verificados byte a byte, release `main` estable sin RC. El perfil científico de 3,008 archivos sigue explícitamente pospuesto por decisión del propietario.
