# GRANADA GRANDE — Ciencia + CAD, integración fuente de 15 PR (fase B)

**Fecha:** 2026-10-20. **Estado:** segunda candidata *apilada sobre* la fase A [#185](https://github.com/michels-lab/FoamLens/pull/185); NO mergeada, NO publicada. No sustituye el workstream Field F1 #162 ni CAD #164.

## Por qué hace falta

El primer candidato G0–G6 consiguió ejecución **WebView2 nativa** tras combinar las piezas de interfaz de siete PR. Sin embargo, la ciencia no se limita a las barras de controles: hay nueve PR científicos/CAD cuya lógica ha superado tests individuales, pero puede fallar si todos cargan en la misma IIFE de FoamLens. Además, Field F1, CAD y comparación 2D/3D tienen cambios propios en `Program.cs` que no pueden sustituirse unos por otros.

## 1. Ensamblaje real, no parches simultáneos del host

`tools/granada_composite_manifest.json` ahora fija **15 PR** y sus HEAD exactos. Se conservan siete del UX #175/#179/#180/#181/#182/#183/#184 y se consideran nueve PR, pero **#174 queda en cuarentena por colisión real** y solo se montan ocho módulos científicos/CAD:

| PR | Capacidad original | Frontera de confianza |
|---|---|---|
| [#164](https://github.com/michels-lab/FoamLens/pull/164) | Inspector de superficie STL/OBJ, topología y exportación STL | Su `Program.cs` original NO se incorpora. STEP/IGES/BREP y mallado volumétrico NO están implementados por este módulo |
| [#165](https://github.com/michels-lab/FoamLens/pull/165) | Comparación de observables físicos 2D/3D equivalentes | Host nativo adicional NO integrado |
| [#166](https://github.com/michels-lab/FoamLens/pull/166) | Balance energético multirregión condicionado por datos | No certifica conservación por presencia de un archivo |
| [#167](https://github.com/michels-lab/FoamLens/pull/167) | Mapeo de termopares en XYZ y señal original | No extrapola temperaturas inexistentes ni prueba recalescencia por sí solo |
| [#168](https://github.com/michels-lab/FoamLens/pull/168) | Salud científica de casos | Evidencia diagnóstica no equivale a CFD válido |
| [#169](https://github.com/michels-lab/FoamLens/pull/169) | Evidence Explorer fase/momento | No transforma campos ausentes en mediciones |
| [#170](https://github.com/michels-lab/FoamLens/pull/170) | Proxy científico del frente de solidificación | Solo se publican límites explícitos del proxy |
| [#171](https://github.com/michels-lab/FoamLens/pull/171) | Seguimiento de volumen/frente 3D | Sigue necesitando caso 3D real y validación térmica |
| [#174](https://github.com/michels-lab/FoamLens/pull/174) | Evidencia del reporte original `checkMesh` | **BLOQUEADO fuera de esta composición**: `meInstall` y `meExport` colisionan con el exportador original `v16-multipanel-export.js`; conservar PR fuente sin alterarlo |

Son **14 módulos frontend originales** cargados en un único scope (6 UX + 9 científicos). Sus **37 archivos originales** de JS y pruebas se obtienen de HEAD fijados mediante `git fetch` en el runner aislado; el ensamblador rechaza cambios remotos de SHA, rutas no permitidas, colisiones entre módulos, sobrescrituras de archivos, SHA alterado y sintaxis dañada.

El módulo de #174 no está montado en el candidato hasta renombrar funciones en su PR propietario y superar nuevo smoke. Los originales de `Program.cs`, `index.html`, build workflow, Field, Compare, Ribbon, Analysis, Video y fuentes de Time Series se validan **inmutables SHA256**. Este PR no hace merge en `main`, ni fuerza conflictos en documentos maestros.

## 2. Program.cs: auditoría nativa de tres propietarios

`tools/granada_science_native_host_gate.cjs` fija el HEAD de [#162](https://github.com/michels-lab/FoamLens/pull/162), #164 y #165 y compara por `git diff --unified=0` el `Program.cs` y `build-foamlens-desktop.yml` originales de cada PR respecto al mismo `main`. Genera un **JSON offline con los SHA256, rangos editados y conflictos de las líneas base**, sin mezclar ningún archivo.

El estado del report **SIEMPRE** queda `BLOCKED_REQUIRES_CONFLICT_RESOLUTION_AND_WINDOWS_QA`, incluso si algunos hunks no colisionan. Eso impide afirmar que ya existe un único host Field F1 + CAD + 2D/3D hasta resolver explícitamente los tres dueños. No se entrega ni instala binario con parches conflictivos y no se fabrican metadatos de resultados.

## 3. CI cruzada, build nativo y evidencia de cierre

`.github/workflows/granada-177-science-cad-integration.yml` corre en Windows y Ubuntu y:

1. Ejecuta diez pruebas del ensamblador + siete pruebas negativas del informe nativo;
2. Obtiene y compila juntos 14 módulos originales de 15 PR y ejecuta **22 suites fuente de los PR** (incluyendo CAD STL/OBJ, observables 2D/3D, balance energético, termopares, salud, momentum, los dos frentes y checkMesh);
3. Ejecuta **12 suites originales de main** (perfiles, plots, Ribbon, campos, Review, exportación, manifests, etc.);
4. Emite la matriz de conflictos en `Program.cs` y build CI, sin ocultar trabajo pendiente;
5. En el job Windows empaqueta `AppBundle.zip` con scripts originales, compila el host .NET original y ejecuta `FoamLens.exe --smoke-test`. Los artefactos contienen **captura/reporte de procedencia**, nunca ejecutable o release.

### Gates todavía abiertos

- Probar la importación de un caso OpenFOAM real multi-región metal/molde, unidades, tiempo físico, comparaciones A–D, frentes y curvas medidas.
- Resolver cuidadosamente las modificaciones de `Program.cs` y el workflow original de Field F1/CAD/2D3D, con tests del host integrado. El preflight **no habilita STEP/IGES/BREP**, no valida CAD volumétrico.
- Comparar con curvas térmicas de experimentos, incluida recalescencia cuando exista una señal medida y modelo apropiado. No inventar validación científica.
- Revisar installed/portable Windows, escalas 125–200% DPI, 3D y todas las pestañas, con evidencia visual y aprobación de Michel.
- Solo entonces autorizar merge final y release de manera explícita.

**Estado del bloque:** código candidato, test suite y workflow implementados; CI, ejecución nativa, validez experimental y autorización son fases separadas. `main` y la versión pública no se modifican.

## Diagnóstico confirmado en CI: #174 no es combinable todavía

En el primer ensamblaje de 16 propietarios, las pruebas de Node pasaron y el ejecutable Windows compiló, pero el `--smoke-test` falló en la comprobación nativa inicial del inspector original `FoamLensMeshAuditor`: `Mesh report inspector is not mounted`. La auditoría de símbolos revela dos funciones globales `meInstall` y `meExport` del nuevo #174 con nombres idénticos a `v16-multipanel-export.js`. Por seguridad se excluyó #174 sin reescribir sus fuentes y se repite la prueba de 15 PR/14 módulos. No declarar el fallo totalmente resuelto hasta que Windows complete el smoke y se revise evidencia. El registro del CI histórico quedó intacto; tres suites nuevas `.test.cjs` solo están registradas provisionalmente en el CI de integración y requieren modificación controlada del workflow principal al momento de merge.


## Resultado confirmado de la fase B compatible — ejecución #39404433624

**Fecha:** 2026-10-20. **Rama:** `feat/granada-177-science-cad-composite-20261020` (apilada sobre #185). Los **15 PR incluidos** y **14 módulos frontend** se verificaron por origen (37 archivos originales de producción y pruebas). [GitHub Actions #39404433624](https://github.com/michels-lab/FoamLens/actions/runs/39404433624) concluyó **SUCCESS en 3 jobs**: pruebas originales y ciencia en Ubuntu, equivalentes en Windows, compilación real .NET WebView2 y `FoamLens.exe --smoke-test` código 0.

Se generó [evidencia real de ejecución Windows](https://github.com/michels-lab/FoamLens/actions/runs/39404433624/artifacts/12255218970): arranque, capturas Home/About ancho y compacto y registro del ejecutable. El log del host confirma inspector original `checkMesh`, navegación Ribbon/Data/Field, 3D A–D, exportación multipanel/video y salida normal. Capturas Home/About **no equivalen a validación visual de todas las tabs**.

**Hallazgos registrados y no resueltos:**
- #174 **excluido** del candidato por redefinir funciones globales `meInstall` y `meExport` del exportador multipanel existente. El primer candidato con 16 propietarios compiló y superó Node pero falló WebView2 (`Mesh report inspector is not mounted`); el nuevo candidato de 15 pasó. Su PR sigue abierto, sin cambios, con comentario de diagnóstico.
- La auditoría del host identifica **cuatro pares de cambios solapados**: `Program.cs` entre #164/#165 cerca de la línea base 749; y el workflow Windows entre #162/#164, #162/#165 y #164/#165 alrededor de las líneas 605–608. No se han fusionado esos `Program.cs`.
- **Tres nuevos tests** `cad-surface-inspector.test.cjs`, `equivalent-observables.test.cjs` y `solidification-front-tracker.test.cjs` corren en CI del candidato pero todavía no están registrados en el workflow de distribución de `main`; se conserva el test del manifiesto original de `main`.
- Sin caso OpenFOAM multirregión metal/molde real certificado, sin validación experimental/recalascencia, sin STEP/IGES/BREP/mallado volumétrico, sin QA Setup/Portable DPI 125–200%, sin aceptación estética, merge, release ni actualización pública.

**Estado disciplinado:** frontend integrado en candidato y comprobado con smoke nativo; native host F1/CAD/2D3D y #174 BLOQUEADOS; release NO AUTORIZADO.
