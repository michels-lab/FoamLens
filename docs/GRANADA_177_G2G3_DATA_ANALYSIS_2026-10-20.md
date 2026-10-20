# Operación Granada Grande — G2/G3 Data + Analysis native UX (20 octubre 2026)

**Estado:** candidato implementado en rama independiente. **Sin merge, versión nueva, release ni aceptación instalada.**

- Rama: `feat/granada-177-g2g3-data-analysis-native-docks-20261020`
- Issue padre: [#177](https://github.com/michels-lab/FoamLens/issues/177)
- Propietario de interfaz: Data y Analysis en `desktop/src/FoamLensDesktop/frontend/v24-granada-g23-data-analysis.js`
- QA automatizada: `desktop/tests/granada-177-g23-data-analysis.spec.cjs` y `.github/workflows/granada-177-g23-data-analysis.yml`
- Relaciones: Ribbon [#179](https://github.com/michels-lab/FoamLens/pull/179), Time Series [#181](https://github.com/michels-lab/FoamLens/pull/181), Review/Live [#180](https://github.com/michels-lab/FoamLens/pull/180), visual G5 [#182](https://github.com/michels-lab/FoamLens/pull/182), Field [#162](https://github.com/michels-lab/FoamLens/pull/162) y [#175](https://github.com/michels-lab/FoamLens/pull/175), CAD [#164](https://github.com/michels-lab/FoamLens/pull/164). **Sus archivos originales no se modifican.**

## Hallazgos confirmados en base main

1. `v15-ribbon-ui.js` aplica `body.flRibbonReady.appMode-data .datasetTabs{display:none!important}`; aunque la navegación de `#datasetModeBlock` tiene los cuatro botones originales Time Series, Profiles, Solver logs, Catalog. La interfaz depende del Ribbon para descubrirlos.
2. `v21-analysis-scope.js` mueve las cinco secciones científicas originales a `#flAnalysisOwnedHost`. No hay una vista de acceso organizada ni estados claros de disponibilidad. El panel puede aparecer contraído por `v14-sidebar-sections.js`.
3. El estado real de casos, campos, curvas, series y gráficas pertenece a los modelos originales (incluido `v14-zy-plot-surfaces.js`); crear selects alternativos o duplicar botones científicos rompe su propiedad e historial.

## A — Data nativo siempre alcanzable

- Se recuperan los **mismos cuatro botones originales** con sus identificadores, listeners, conteos y estados disabled, sin re-crearlos: Time Series / Spatial profiles / Solver logs / Catalog.
- La navegación original se mantiene visible con jerarquía y tamaños de interacción legibles cuando la ventana está en Data, aunque una preferencia previa tenga contraída la tarjeta `load-data`.
- `dataImportMore` se abre en Data para facilitar el flujo carga→catálogo→curva, sin cambiar el dato importado ni activar importaciones.
- Estado textual leído de los controles originales: vista actual y cuántas están habilitadas. **No se inventan variables ni resultados**.
- Teclas Arrow, Home y End mueven el foco entre botones disponibles, saltándose `disabled`; no disparan `click`, `setDataView` ni cambian las curvas al navegar.

## B — Analysis nativo y honesto

- Acceso organizado a los **cinco módulos originales** General, Coupling, Front Tracking, Field Mapping y Phase/Momentum, bajo su único propietario `#flAnalysisOwnedHost`.
- Los botones nuevos son navegación al módulo real (no operaciones duplicadas) y quedan deshabilitados cuando el módulo original no está disponible (`pmHidden`, `hidden`, `display:none`).
- El foco y desplazamiento llegan al control científico original, abriendo el `details` que corresponda; nunca ejecuta análisis automáticamente.
- Se conserva la elección de destino del menú entre aperturas por una clave específica; si ya no hay datos compatibles, la navegación sigue inhabilitada aunque hubiera una elección anterior.
- Se evita un ciclo infinito del MutationObserver excluyendo los cambios del propio menú en `#flG23AnalysisGuide`.

## C — Estilo consistente, control y pruebas

- UI basada en `--panel`, `--panel2`, `--accent` y `--line`, sin remodelar el canvas, Scene A–D ni el Ribbon y sin mostrar controles `hidden` por error.
- Bilingüe EN/ES, teclado, `aria-disabled`, `aria-pressed`, estados vacíos y tamaños responsive.
- `window.FoamLensGranadaG23.audit()` ofrece un diagnóstico **solo lectura** de identidad de controles originales, dueño real, módulos disponibles, duplicados ID y clipping básico, dejando `scientificVerification` e `installedVisualApproval` en `NOT PERFORMED`.
- La suite incluye siete grupos de pruebas con nodos reales simulados en VM para propiedad, teclas, navegación, deshabilitados, cambios de idioma, persistencia, auditoría y ausencia de mutaciones científicas. CI Windows/Ubuntu incorpora las suites originales de Ribbon, Analysis, Data compare, plot surfaces, sidebar, ownership y manifest.
- **Hasta CI completada, declarar únicamente commit/código generado y compilación sintáctica**, no resultados runtime o visuales falsamente comprobados.

## Bloqueos/validación de salida

1. Revisar CI de esta rama exacta, corregir regresiones si falla.
2. Integrar cambios de G2/G3 en orden con el Ribbon #179 y el generador Time Series #181, sin rebasar ni fusionar a ciegas. No ocultar las acciones nativas de Data mientras se resuelve esta integración.
3. Validar Windows portable/instalado con OpenFOAM real: importar caso multirregión, cambiar 4 vistas, comparar dos variables y comprobar que Data / Analysis no comparten estado indebidamente.
4. Capturar evidencia visual con el reporte G5 de anchos 1024/1280/1920 y escalado de sistema 125–200%. La suite VM no equivale a revisión instalada.
5. Aprobación visual de Michel y autorización separada para release. Mantener el issue #177 abierto.

**Estados:** A implementado como candidato, B implementado como candidato, C test codificado; validación de CI y Windows pendiente hasta resultados verificados. Sin merge/release.
