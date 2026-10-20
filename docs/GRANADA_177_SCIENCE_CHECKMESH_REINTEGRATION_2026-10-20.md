# GRANADA GRANDE — Recuperación checkMesh en integración Ciencia + CAD de 16 propietarios

**Fecha:** 2026-10-20. **Rama:** `feat/granada-177-science-cad-checkmesh-reintegration-20261020`, **base:** fase Ciencia + CAD #186. **Estado:** candidato independiente de integración, NO merge, NO release, versión pública intacta.

## Problema real y procedencia

El PR #174 añade correlación de reportes reales `checkMesh` en metal/molde, pero su primera versión definió globalmente `meInstall`/`meExport` y controles `meExport`/`meRefresh`, colisionando con el exportador multipanel original. Aunque sus cálculos e informe de cobertura superaron pruebas individuales, el Windows WebView2 del candidato #186 falló con «Mesh report inspector is not mounted».

La fase #186 aisló reversiblemente #174 para conseguir una integración de **15 PR y 14 módulos científicos/UX que pasa CI y smoke**. No eliminó el pendiente ni confundió un diagnóstico de estado con datos físicos.

## Paquete 1 — Reintegración sin tocar rama propietaria ni parchar bytes

El [PR #187](https://github.com/michels-lab/FoamLens/pull/187), **rama derivada de #174**, corrige exhaustivamente el espacio `me*` de checkMesh a `cmr*`, incluidos los IDs HTML, y ejecuta el código en una IIFE privada. Mantiene íntegro el contrato público `FoamLensMultiRegionMeshEvidence`, el auditor numérico, etiquetas de región, conflictos de reportes y la protección de datos. Su workflow de Ubuntu/Windows y native WebView2 real pasó por separado en el HEAD exacto `f7fd6a1cf31278ef83395f96a9689fb68c16b263`.

En este candidato **NO se copia ni transforma** el código original de #174. El manifiesto `tools/granada_composite_manifest.json` fija las 15 PR originales sin colisiones de #186 y añade exclusivamente el HEAD de #187 como decimosexto propietario, documentando su origen #174. `tools/granada_composite_candidate.cjs` **rechaza explícitamente** que alguien lo sustituya por #174 o lo cambie sin actualizar conjuntamente SHA, linaje y tests.

## Paquete 2 — QA científica y seguridad de interfaz cruzadas

- La matriz aumenta a **16 propietarios, 15 módulos frontend y 40 archivos fuente y pruebas originales**.
- `tools/test_granada_composite_candidate.cjs` incorpora una regresión negativa específica para linaje, falta de tests, manifiesto manipulado o permiso de merge falso.
- A los tests de 15 PR se agregan la suite física/privacidad original `checkmesh-region-evidence.spec.cjs` y la suite de dos módulos reales `checkmesh-multipanel-collision.spec.cjs`, que verifica APIs independientes, paneles, botones y manejadores.
- El CI ejecuta las suites cruzadas en Ubuntu y Windows, conserva SHA256 y orden de montaje e incorpora los originales de `main`; **no reescribe** `build-foamlens-desktop.yml` ni la bitácora de las otras ramas.

## Paquete 3 — Host Windows candidato, sin aceptación falsa

El job Windows genera el **AppBundle original** con los 15 módulos extra, compila `.NET 8 Windows Forms/WebView2` y ejecuta `FoamLens.exe --smoke-test`. Guarda exclusivamente capturas y reportes de procedencia; nunca instaladores ni binarios distribuidos. En este candidato, los módulos de **Field F1 #162**, y los puentes específicos de `Program.cs` de **CAD #164 y 2D/3D #165** todavía no se han fusionado: su auditoría nativa continúa **BLOCKED_REQUIRES_CONFLICT_RESOLUTION_AND_WINDOWS_QA**.

### Límites científicos y de entrega

Una simulación sintética de DOM, un smoke del host y un análisis numérico del reporte `checkMesh` **no certifican** la geometría/interfaz de metal/molde ni el valor científico de temperatura, recalescencia o frente. Siguen pendientes un caso OpenFOAM multirregión real, pruebas de carga/respuesta con datos térmicos originales, pruebas de importación STL/OBJ, el puente CAD completo, Setup/Portable, pantallas en 1024/1280/1920, DPI 125–200% y aprobación estética del propietario.

**Gates separados:** CI combinado por SHA → smoke Windows del compuesto → reconciliar `Program.cs` con dueños #162/#164/#165 → pruebas reales OpenFOAM y GUI instalada → revisión de Michel → autorización explícita de merge y release.

**No se han fusionado** PR #174, #186 ni #187; el registro de estos tres artefactos, sus propietarios y pruebas permanece disponible en GitHub.
