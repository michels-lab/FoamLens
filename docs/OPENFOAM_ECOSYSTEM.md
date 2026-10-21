# FoamLens y proyectos OpenFOAM — interoperabilidad sin acoplamiento

FoamLens es un programa **generalista** para datos OpenFOAM. No depende de [QuickCup Solidification](https://github.com/michels-lab/QuickCup-Solidification), de su estructura de carpetas ni de un hub de coordinación para instalarse, iniciar, descubrir campos, visualizar o generar reportes.

QuickCup es solo una **fuente opcional de casos reales**. Quien lo use controla localmente cuáles archivos importar. FoamLens no ejecuta OpenFOAM y no altera datos científicos en otro repositorio.

## Reglas técnicas
- Detectar dinámicamente campos y regiones desde la fuente; no codificar nombres como `metal` o `mold` como únicos valores posibles.
- Preservar identidad del caso, tiempo físico, tipo/association, dimensiones y unidades; la falta de información se muestra como `unknown`, no se rellena.
- El análisis multicaso requiere comparabilidad geométrica, temporal y termodinámica comprobable.
- Conservar las diferencias entre auditoría de integridad de archivo, pruebas de software, conservación física y validación experimental.
- Adaptadores o manifest JSON futuros son **opcionales y versionados**, probados con datos sintéticos; no asumir que existen hasta tener PR integrado y aceptación.
- La privacidad es local-first. Sin subir muestras reales, CAD o datos inéditos automáticamente.

## Autoridad de documentación
FoamLens: [índice](DOCUMENTATION_INDEX.md), [plan de producto](DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md), [bitácora](GIT_AUDIT_LOG.md). QuickCup: su propio [protocolo maestro](https://github.com/michels-lab/QuickCup-Solidification/blob/main/RUN_MASTER_PROTOCOL.md). Un hub privado externo, si se usa, coordina sin sustituir ninguna fuente de verdad.
