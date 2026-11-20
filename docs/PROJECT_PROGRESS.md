# FoamLens — avance global verificable

**Corte:** 2026-11-20. **Ruta integral:** aceptación de Field A–D, Time Series y perfiles, CAD por pieza/multirregión, ciencia térmica, interfaz transversal, Windows y release final. **Rendimiento (#117) pospuesto** por solicitud del propietario, sin marcarlo como resuelto.

## 47% estimado — 7/15 hitos

**Fase:** PR #371 en borrador y sin publicación. La pasada anterior validó Windows/QuickCup con 14/14 workflows. En esta Granada se añadió el rastreador físico 3D de fuentes originales #153, con su propio CI científico en Ubuntu/Windows aprobado; el Windows nativo y Granada general del último SHA siguen siendo gates separados. B14/C14, datos experimentales, interfaz instalada y aceptación propietaria continúan pendientes. La estimación mide hitos con evidencia de tipo declarado; **NO** mide porcentaje de código, no promete que B14/C14 funcionen en el equipo del propietario y no confunde el artefacto privado de CI con una release oficial.

**Antes de esta auditoría:** sin línea base (`null`). **Ahora:** 47% (7/15); es la **primera medición**, no un salto porcentual causado por esta sesión.

| # | Hito medible | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | Catálogo de casos/regiones/campos originales visible y seleccionable en A–D; aceptación de fuente/CI | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610913852) |
| 2 | Tiempos físicos originales por vista, vinculación opcional y preservación de A/B con un mismo caso; aceptación fuente/CI | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610913883) |
| 3 | Capas metal/molde e interfaces geométricas verificadas con QuickCup B13 y pruebas originales; no implica dueño B14/C14 | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610914211) |
| 4 | Perfiles 2D/3D, series con fuente real y coordenadas/tiempos medidos sin ceros inventados; fuente/CI | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610914730) |
| 5 | Diferencias 3D con verificación de fuente, dimensiones, asociación, malla y rangos, más pruebas ejecutables; fuente/CI | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610914186) |
| 6 | CAD STL/OBJ, ensambles/exports de regiones y guardas de coordenadas/unidades; verificación de fuente/CI (no mallado real) | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610913842) |
| 7 | Pruebas integrales y compilación Windows del PR, QuickCup y artefactos CI temporales; NO publicación ni aceptación instalada | ✅ Fuente/CI verificada | [Fuente](https://github.com/michels-lab/FoamLens/actions/runs/44610913820) |
| 8 | Layout A–D con 1–4 vistas, filas de igual alto, sin barras solapadas, leyendas/cotas y DPI físico 125–200% aprobados en Windows | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/149) |
| 9 | Casos originales B14/C14 del propietario cargados físicamente en A/B/C/D con campos, metal+molde, perfiles y tiempos inspeccionados | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/145) |
| 10 | Data/Analysis/Review/Live y 3D+perfiles simultáneos, navegación, exportación y estado íntegros en ejecutable instalado | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/177) |
| 11 | CAD FreeCAD/OCCT real y guía de versiones Foundation/OpenFOAM.com, blockMesh/snappyHexMesh, surfaceCheck y regiones sin inventar volumen | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/148) |
| 12 | Balance energético y termopares con datos originales experimentales y verificación física de resultados | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/151) |
| 13 | Frente de solidificación, asociación cambio de fase/momentum y análisis 2D vs 3D con criterios físicos corroborados | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/153) |
| 14 | Publicación única estable exact-main con Windows Setup+Portable, SHA-256, updater y auditoría real de artefactos; sin RC/Developer | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/238) |
| 15 | Aceptación funcional y estética final del propietario en Windows instalado con casos reales y comprobación de actualización | ⏳ Pendiente de evidencia exigida | [Fuente](https://github.com/michels-lab/FoamLens/issues/131) |

## Granada científica de 2026-11-19 — 47% → 47% (sin inflar hitos)

La revisión actual reparó dos condiciones científicamente peligrosas del módulo **Analysis**, sobre la rama existente del PR #371:

- **Energy Audit multirregión (#151):** `mW` y `MW` (miliwatts/megawatts), así como `mJ` y `MJ` (milijoules/megajoules), son unidades SI diferentes por **1,000,000,000 veces**. La función original `mecUnit` eliminaba las mayúsculas y podía producir balances numéricos engañosos. Ahora exige símbolos canónicos sensibles a mayúsculas, rechaza variantes ambiguas (`mw`, `mj`) y conserva el símbolo usado en la procedencia. El evaluador real reproduce el mismo balance de dos regiones expresado en J/W, mJ/mW y MJ/MW; las pruebas originales se ampliaron para cubrir esos casos. [CI científica #151](https://github.com/michels-lab/FoamLens/actions/runs/44616431868).
- **Thermocouple Mapping (#152):** el cálculo RMSE/MAE/bias antes admitía temperaturas físicas inferiores a **0 K**, incluyendo datos fuera de la ventana de tiempo visible. Ahora se comprueba el conjunto completo de temperaturas originales en sus unidades (K o °C) antes de comparar y, adicionalmente, los valores Kelvin convertidos en cada punto. Las pruebas cubren 0 K válido, valores bajo cero K en ambas fuentes, y registros defectuosos fuera del solapamiento. No se inventaron sensores ni datos simulados. [CI científica #152](https://github.com/michels-lab/FoamLens/actions/runs/44616431528).
- **Evidencia y límite:** los dos suites científicos del commit de código `b0c13d0a` fueron aprobados en GitHub, y la ejecución directa V8 sobre código fuente original pasó. El resto del conjunto debe verificarse en el SHA final del PR; **no declarar completada la validación experimental ni el instalador** por estas correcciones.
- **Porcentaje:** se mantiene **47% (7/15)**. El hito 12 exige datos originales y aprobación física de energía/termopares; no está completado aunque sus módulos sean más fiables.

## Granada 2D ↔ 3D del 19-nov-2026 — 47% → 47% (sin cerrar hito 13)

- **Antes:** el selector de máximo 1500 nudos de tiempo creaba un informe `valid=true` tras *eliminar silenciosamente muestras originales*. Un pico breve podía no entrar en la muestra, sesgando RMSE/MAE y los extremos. **Ahora:** se usa la unión **completa** de todos los tiempos físicos originales, sin extrapolar ni decimar, hasta un máximo explícito editable de 2 a **100 000** (predeterminado 20 000). Si la fuente rebasa el máximo, se bloquean las métricas y se informa del número verdadero de nudos; no se inventa una curva parcial.
- **SI y fuente:** se distinguen `mW`/`MW`, `mJ`/`MJ`, `mPa`/`MPa` (factores de 10⁹); se bloquean prefijos mal escritos. Los IDs de casos `null`, booleanos y hexadecimales no se vuelven un `caseId=0` falso. Temperaturas K imposibles se rechazan aunque aparezcan fuera de la superposición temporal.
- **Evidencia:** suite original `desktop/tests/equivalent-observables.test.cjs` ampliada con **1601 mediciones y un pico original de amplitud 10 000**, errores de SI, casos ausentes y límites explícitos inválidos. Suite completa ejecutada directamente con la fuente nueva en V8: **PASS**. [Pruebas actuales del PR #371](https://github.com/michels-lab/FoamLens/pull/371/checks). **Separación de pruebas:** sólo los workflows terminados en verde en el SHA actual se consideran aprobados; Windows/QuickCup y aceptación del propietario deben verificarse de forma independiente.
- **Hito 13 sigue pendiente:** comparar observables físicamente equivalentes exige corroborar geometría, condiciones y muestreos reales del usuario; una curva con unidades alineadas NO certifica equivalencia 2D/3D. **47% sigue siendo 7/15**, no porcentaje de cambios por esta sesión.

## Granada 20-nov-2026 — Phase/Momentum: fuente original y exportación segura (47% → 47%)

En **Analysis → Phase/Momentum Evidence Explorer (#156)** se corrigieron dos maneras de presentar evidencia de forma engañosa y se mejoró la exportación científica:

- **Tiempo y procedencia:** `null`/tiempo ausente no se interpreta como el tiempo físico 0. Una fila sin `sourcePath` OpenFOAM original no puede recibir el estado de observación respaldada por fuente; se excluye explícitamente y las demás observaciones se clasifican como **evidencia parcial**, no completa.
- **Revalidación antes de exportar:** la acción de exportación vuelve a leer **todos los archivos de campos en los tiempos originales**, recompone las estadísticas mediante el motor Phase/Momentum existente y contrasta tanto el informe como una huella de cambio sobre cada valor numérico y sus rutas/tiempos. Por ejemplo, alterar dos celdas y preservar exactamente la misma media **ya no permite exportar un informe viejo**. Cambios de caso, Field Mapping, seleccionador, datos originales o metadatos interrumpen la operación. La huella **no es una firma criptográfica** ni un certificado del solver.
- **Pruebas reproducibles:** regresión ampliada `desktop/tests/physics-evidence-explorer.spec.cjs` cubre datos sin rutas, tiempo nulo, cambio numérico con media inalterada y cancelación mientras se vuelven a leer archivos. Núcleo científico ejecutado directamente en V8 con resultado PASS; [Granada #156 Phase/Momentum CI](https://github.com/michels-lab/FoamLens/actions/runs/44794770797) **SUCCESS**. El PR incluye la nueva prueba y continúa en borrador.
- **Porcentaje:** **47% (7/15) → 47% (7/15)**. Mejora un módulo del hito compuesto #13, pero no verifica mecanismos Darcy/flotación/cambio de fase con materiales y mallas reales, ni la validez experimental del propietario. Tampoco sustituye aceptación visual de B14/C14, instalador Windows o release.

## Granada 20-nov-2026 — 3D Solidification Front Tracker original (47% → 47%)

Se implementó un **módulo de Analysis** `v24-solidification-front-3d.js` (y suite `desktop/tests/solidification-front-3d.spec.cjs`) que reusa las importaciones originales OpenFOAM, en lugar de inventar un campo de prueba dentro de la aplicación.

- **3D real de fuente:** selección de caso, región material y `volScalarField` adimensional, con recomendación del Field Mapping de fracción líquida. El módulo obtiene cada `polyMesh` correspondiente al tiempo y la región desde el motor Field, tanto reconstruido como por `processor`; verifica coordenadas, `faces`, `owner/neighbour`, índices, orientación, cierre de cada arista de celda y volúmenes firmados positivos. Nunca asume una celda=1 m³; la suma de volúmenes procede de las caras originales y expresa m³ bajo la convención de coordenadas físicas OpenFOAM.
- **Ocupación de fases:** agrupa el volumen de celdas verdaderas como **solid / mushy / liquid** mediante umbrales de fracción líquida explícitos (predeterminados 0.05/0.95). Es **clasificación de celdas completas**, NO volumen fraccional exacto de una interfaz dentro de cada celda.
- **Frente 3D preliminar:** localiza cruces de `alpha` en caras internas originales interpolando **centros vecinos** (cota XYZ y eje X/Y/Z). Los recuentos de caras con cruces y caras ambiguas por meseta se distinguen; sin cruce no se produce posición ficticia. Entre tiempos físicos reales calcula solo el **desplazamiento firmado del centroide proyectado por Δt** como *proxy*, NO velocidad normal local de frente. **No reconstruye aún una isosuperficie tridimensional verdadera ni afirma recalescencia metalúrgica**.
- **Trazabilidad:** tiempos fuente completos (máximo editable de 2–500 cuadros, sin muestreo oculto), prohibidos `null`, duplicados, fracciones fuera de `[0,1]`, falta de malla cerrada u origen de archivos. Exportación JSON sólo tras recargar mallas/valores originales y comparar huellas numéricas por celda; una fuente modificada obliga a repetir el análisis.
- **Pruebas:** **85 comprobaciones directas PASS** con un `polyMesh` de dos celdas cúbicas de 1 m³ con cara interna y fracciones originales de fixture; cierres/orientaciones falsos, tiempos, valores, campos insuficientes y casos incompatibles rechazados. [Granada 153 — CI dual-OS Ubuntu/Windows SUCCESS](https://github.com/michels-lab/FoamLens/actions/runs/44814236958). El caso geométrico de prueba valida código, **NO simula ni sustituye B14/C14**.
- **Límite de hito:** #153 tiene **primera implementación fuente/CI**, pero el **hito 13 combinado** de frente, phase/momentum y comparaciones físicas 2D/3D requiere isosuperficie/velocidades físicas completas y comprobación del usuario; permanece **pendiente**. **47% (7/15) → 47% (7/15)**. Windows nativo del HEAD completo y QA instalado son controles aparte, no un release.

## Qué se ha comprobado y qué no

- **CI final del SHA fuente del PR:** [nueve workflows aprobados](https://github.com/michels-lab/FoamLens/pull/371/checks). [Windows + QuickCup](https://github.com/michels-lab/FoamLens/actions/runs/44610913820) generó artefactos internos `FoamLens-Windows-v1.8.21` y `QuickCup-MultiCase-Windows-runtime`. La verificación del PR usa el merge candidate de GitHub, no una nueva release de `main`.
- **Código:** PR #371 sigue borrador, **no fusionado**. Último stable público que se venía verificando: [v1.8.21](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.21). No hay nueva publicación prometida.
- **Aprobación física:** ninguna captura aceptada de B14/C14 en equipo del dueño; no hay aval de estética a 125–200% DPI ni certificación experimental de los módulos faltantes.
- **No inflar %:** hitos de ciencia adicional, mallado real, aplicación instalada, release y aceptación siguen pendientes aunque las suites de fuente pasen.

**Siguiente bloque:** Aceptar B14/C14 y UI física A-D, contrastar módulos científicos pendientes; luego integrar con CI exact-main, verificar Setup+Portable+hash y publicar final estable.

**Canónico:** [registro estructurado](../.michelslab/project-progress.json) · [PR #371](https://github.com/michels-lab/FoamLens/pull/371) · [bitácora](GIT_AUDIT_LOG.md) · [tablero maestro](https://github.com/michels-lab/Michel-Software-Standards/blob/main/reports/PROJECT_PROGRESS.md).
