# Operación Granada — Fix funcional de colisiones checkMesh + Multi-panel

**Fecha:** 2026-10-20 · **Propietario de la función original:** PR [#174](https://github.com/michels-lab/FoamLens/pull/174) · **Estado:** parche correcto de arquitectura en **rama derivada independiente**; aún no integrado en PR #174 ni en `main`.

## Diagnóstico probado contra integración nativa Granada #186

El módulo del PR #174 `v24-checkmesh-region-evidence.js` define en el mismo scope original de FoamLens funciones llamadas `meInstall`, `meExport`, `meRefresh`, `meStatus` y sus selectores DOM `id="meExport"`, `id="meRefresh"`, `id="meStatus"`. El exportador científico multipanel original `v16-multipanel-export.js` usa esas **mismas identidades**, incluida `meInstall`, `meExport` y el botón `meExport`. La combinación dentro de la IIFE de `index.html` puede sobrescribir los manejadores, instalar un panel equivocado y causar que el smoke nativo falle aunque ambos módulos pasen tests individuales.

La integración de #186 encontró el síntoma verificable **«Mesh report inspector is not mounted»** al incluir #174. Para recuperar CI, #186 excluyó deliberadamente #174 y dejó este P0 vivo en la bitácora. No es fallo de los resultados OpenFOAM ni permite afirmar que `checkMesh` ya funciona en el candidato público.

## Paquete A: espacio de nombres privado completo

En la nueva rama `fix/granada-150-checkmesh-namespace-20261020`, nacida del commit exacto `cf2f0f65cb8099fdbb94ea52b62df45b6c0c565c` de #174:

- Todos los símbolos propios de checkMesh `me*` se renombran al prefijo exclusivo **`cmr*`**.
- También se renombran los **identificadores DOM** originales de los controles checkMesh (panel, selección de caso, archivos de reporte, estado, informe, exportación), sin duplicar ni alterar los identificadores del multipanel original.
- El código checkMesh se aísla dentro de una **IIFE estricta y privada**; solo expone su API pública ya existente `window.FoamLensMultiRegionMeshEvidence` con métodos `analyze` y `parseLocators`.
- Se conservan por completo la fórmula/evaluación de reportes, estados de cobertura metal/molde, indicios geométricos, máximo de archivos, control de privacidad y evidencia sin certificación física.
- No se cambia ningún motor científico de OpenFOAM, selector del Field, importación de casos, módulo multipanel ni archivo nativo `Program.cs`.

La corrección es explícita, íntegra y permanente en el **módulo propietario**; no es una modificación silenciosa de bytes durante staging, ni un monkey-patch runtime.

## Paquete B: regresiones originales + colisión real de dos módulos

- `desktop/tests/checkmesh-region-evidence.spec.cjs` conserva las comprobaciones físicas/privacidad originales, actualizando el nombre privado de su función de auditoría.
- `desktop/tests/checkmesh-multipanel-collision.spec.cjs` une **ambos archivos originales** en una sola compilación JS y ejecuta la instalación real contra un DOM sintético identificado como prueba.
- Valida que existen de forma independiente los paneles `meDialog` y `cmrPanel`, ambos botones de exportación, listeners distintos, acción de reporte inicialmente deshabilitada, API científicas no sustituidas, ausencia de duplicados y aislamiento al reinstalar.
- Prueba conservada para `maPureCheckMesh` de base; ningún resultado artificial se presenta como evidencia experimental real.
- `.github/workflows/granada-150-checkmesh-namespace.yml`: CI Ubuntu/Windows de ciencia y colisiones; job **Windows nativo WebView2** compila `AppBundle.zip` con ambos módulos y ejecuta `FoamLens.exe --smoke-test`, sin descargar ni publicar ejecutables.

## Control de integración y pendientes

1. Corroborar CI sobre el **SHA exacto** de esta rama y corregir fallos si aparecen.
2. Revisar y aceptar el fix en el PR propietario #174; **no se modifica su branch de origen ni `main`** en esta operación.
3. Solo después, actualizar el manifiesto del integrador #186 con el SHA de #174 reparado, volver a pasar todas las suites de 16 PR / 15 módulos y smoke de Windows sin excluir otros propietarios.
4. Probar reportes de `checkMesh -region metal` y `checkMesh -region mold` provenientes de un **caso OpenFOAM real**, sin confundir la correlación de texto con geometría validada; probar exportación multipanel real en paralelo.
5. Revisar Windows Setup y Portable, las pestañas Analysis/Field/Export, DPI 125–200%, auditoría G5 y aprobación visual del propietario.

**Estado explícito:** corrección funcional preparada; integración formal, casos científicos reales, QA instalado, release y aceptación estética pendientes. Ningún cambio público de versión.
