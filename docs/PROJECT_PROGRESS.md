# FoamLens — avance global verificable

**Corte:** 2026-11-19. **Ruta integral:** aceptación de Field A–D, Time Series y perfiles, CAD por pieza/multirregión, ciencia térmica, interfaz transversal, Windows y release final. **Rendimiento (#117) pospuesto** por solicitud del propietario, sin marcarlo como resuelto.

## 47% estimado — 7/15 hitos

**Fase:** PR #371 validado con 9/9 suites incluida Windows/QuickCup; falta integración, pruebas reales con dueño y release. La estimación mide hitos con evidencia de tipo declarado; **NO** mide porcentaje de código, no promete que B14/C14 funcionen en el equipo del propietario y no confunde el artefacto privado de CI con una release oficial.

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

## Qué se ha comprobado y qué no

- **CI final del SHA fuente del PR:** [nueve workflows aprobados](https://github.com/michels-lab/FoamLens/pull/371/checks). [Windows + QuickCup](https://github.com/michels-lab/FoamLens/actions/runs/44610913820) generó artefactos internos `FoamLens-Windows-v1.8.21` y `QuickCup-MultiCase-Windows-runtime`. La verificación del PR usa el merge candidate de GitHub, no una nueva release de `main`.
- **Código:** PR #371 sigue borrador, **no fusionado**. Último stable público que se venía verificando: [v1.8.21](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.21). No hay nueva publicación prometida.
- **Aprobación física:** ninguna captura aceptada de B14/C14 en equipo del dueño; no hay aval de estética a 125–200% DPI ni certificación experimental de los módulos faltantes.
- **No inflar %:** hitos de ciencia adicional, mallado real, aplicación instalada, release y aceptación siguen pendientes aunque las suites de fuente pasen.

**Siguiente bloque:** Aceptar B14/C14 y UI física A-D, contrastar módulos científicos pendientes; luego integrar con CI exact-main, verificar Setup+Portable+hash y publicar final estable.

**Canónico:** [registro estructurado](../.michelslab/project-progress.json) · [PR #371](https://github.com/michels-lab/FoamLens/pull/371) · [bitácora](GIT_AUDIT_LOG.md) · [tablero maestro](https://github.com/michels-lab/Michel-Software-Standards/blob/main/reports/PROJECT_PROGRESS.md).
