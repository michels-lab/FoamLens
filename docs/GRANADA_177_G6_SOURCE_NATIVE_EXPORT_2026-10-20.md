# Operación Granada Grande — G6 Export con preflight de fuentes nativas

**Fecha:** 2026-10-20. **Estado:** PR aislado (candidato), NO integrado, NO publicado, sin aceptación humana.

## Colisión evitada

En FoamLens hay PRs activos para Ribbon #179, Field #162/#175, 3D/CAD #164, Time Series #181, Review/Live #180, Data/Analysis #183 y evidencia G5 #182. El bloque G6 **no modifica ninguno de esos archivos**, ni `Program.cs`, ni los exportadores originales. Solamente añade un módulo versionado inyectable en la IIFE de FoamLens, pruebas y CI.

## Hallazgo

El Ribbon ya presenta seis comandos (`flRaExportPng/Svg/Csv/Thesis/Multi/Video`). Sus `flRibbonBind` invocan exportadores reales, pero el tab se puede abrir sin saber si existen curvas, qué fuentes de volumen 3D están medidas ni si hay codificador de video. La barra de herramientas original oculta en modo Ribbon tampoco sirve como pista fiable. Se necesita un contexto de publicación que **NO cree resultados inexistentes ni exporte con solo hacer clic en el tab**.

## Tres entregables sustanciales

### A. Preflight 2D y trazabilidad
`v24-granada-g6-export-preflight.js` consulta `visibleCurrentSeries()` solamente en **Data/Analysis** y solamente en Time Series/Profile/Log. Exige por lo menos **un par original de coordenada/valor numérico finito**; las cadenas vacías, null, NaN e Infinity no cuentan. No lee marcos OpenFOAM adicionales, no deriva T/U/alpha ni fabrica puntos. Muestra cantidad de series, casos y dimensiones originales existentes. Los botones nativos PNG/SVG/CSV/Thesis quedan inhabilitados sin gráfica fuente; cambian dinámicamente y no se reconstruyen sus handlers.

### B. Preflight 3D multipanel/video sin falsos positivos
En **Field** se examinan descriptores originales de `FoamLensMultiPanelExport.getSources()`, se exige canvas existente, caso y campo con nombre de origen, tiempo físico finito y **rango numérico válido** (`range.valid`, min/max). Se excluyen fuentes de plot sin datos reales y canvas ocultos. El multipanel se habilita solo si existen fuentes originales 2D o 3D admitidas.

Video exige además al menos un tiempo físico de `fvCurrentFieldGroup().times`, codificador/Canvas `MediaRecorder/captureStream` disponible y ausencia de grabación activa. No procesa marcos, no dispara la grabación en segundo plano y no crea permisos ni descargas.

### C. UI de exportación persistente, reversible y auditable
Un único dock responsivo debajo de **Export** en el Ribbon deja siempre visibles estado y motivos por cada acción (seis). Bilingüe EN/ES, tokens visuales existentes, foco accesible, `aria-describedby`, tamaño legible. Los botones del Ribbon son **los mismos elementos originales** y los exportadores siguen siendo los originales. Los controles bloqueados por G6 se reactivan si vuelven los datos o al salir de Export; **no se reactivan botones que ya estaban deshabilitados por otro módulo**.

`window.FoamLensGranadaExport.inspect()` aporta snapshot de fuentes; `.audit()` muestra los seis botones originales, readiness, bloqueo atribuido a este módulo y solicitud última. **Solicitud NO equivale a descarga completada**. No guarda paths o resultados científicos en almacenamiento o servidor.

## QA y evidencia que NO se debe confundir

- `desktop/tests/granada-177-g6-export-preflight.spec.cjs` ejecuta grupos VM de referencias originales, datos realmente finitos, descartes de placeholders, Field con rangos inválidos, codecs, busy, guardas reversibles, habilitación ajena, idioma y trazabilidad sin confirmaciones falsas.
- `.github/workflows/granada-177-g6-export-preflight.yml` ejecuta tests en Windows/Ubuntu e incluye Ribbon original, Export reproducible, Findings Export, ownership, superficie de plots y registro de suites.
- Compilación sintáctica del módulo verificada al crearse; pruebas CI del SHA exacto se comprobarán en el PR. **No se ha probado la aplicación nativa instalada en este turno, ni una captura real ni los codificadores específicos de Windows.**
- El preflight es de **presencia de evidencia de origen**, no certificación del análisis CFD, selección de unidades compatibles, completitud de escenas 3D, autoría ni validez de exportaciones.
- No hay merger, release, cambio de versión ni autorización implícita.

## Reentrada y aceptación física

1. Confirmar resultado CI Windows+Ubuntu; corregir fallos sin perder las ramas activas.
2. Probar instalada/portátil con un caso 2D real y un caso 3D OpenFOAM multirregión; comparar habilitación PNG/SVG/CSV/Thesis/Multi/Video en Data, Analysis y Field sin mezcla de datos.
3. Forzar estados: sin caso, sin gráfica, valores inválidos, campo 3D sin frames, video ocupado, navegador sin codec, cambio de idioma, tabs rápidas.
4. Integrar Ribbon #179, Data/Analysis #183, Time Series #181, Field #162/#175 y G5 #182 con **regresión cruzada y visual 1024/1280/1920 + Windows 125–200% DPI**.
5. Aceptación estética y publicación únicamente tras instrucción específica de Michel. Mantener #177 y #131 ABIERTOS.

**Fuente técnica:** `desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js`, `v16-multipanel-export.js`, `v14-animation-export.js`, `v14-field-view.js`, `v14-z-field-compare.js`.
