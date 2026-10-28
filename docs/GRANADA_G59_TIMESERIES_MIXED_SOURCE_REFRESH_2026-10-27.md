# FoamLens — Granada G59: actualización de fuentes 3D con curvas preexistentes
**2026-10-27 · issue #146 / G58 #176 · rama correctiva, sin release**

## Síntoma y origen en el código original
El módulo `v14-dual-timeseries.js` calculaba el catálogo de campos OpenFOAM 3D al actualizar la vista Time Series, pero solo llamaba `fwRefreshFieldTsControls()` cuando `datasets.length===0`. Cuando un caso ya contenía una curva postProcessing/probe importada, la fuente de historia 3D podía seguir mostrando opciones obsoletas, aunque el catálogo textual reconociera `T` en metal/molde. Un caso con series existentes no implica que no deba poder generar una nueva historia.

## Corrección limitada
- La fuente canónica mantiene catálogo de curvas y campos separados. Refresca selectores 3D **cuando hay fuentes reales y la vista de historial está abierta o montada**, incluso cuando también hay curvas existentes. Con cero curvas conserva el comportamiento anterior de descubrimiento.
- No abre forzosamente el generador legado colapsado cuando hay curvas y no hay G3/T2 montado. No cambia parser OpenFOAM, geometría, unidades físicas, ejes, valores, tiempos, algoritmos, reproducción, estado atómico ni firma.
- `desktop/tests/dual-timeseries.test.cjs`: nuevo fixture ejecuta **la función real de producción**, combina curvas medidas + campos OpenFOAM 3D; rechaza la condición histórica, además de probar catálogo vacío, modo viejo colapsado y caso sin curvas.
- Reutiliza workflows originales `timeseries-source-fast.yml`, `granada-176-timeseries-t2.yml` y Windows Desktop en PR. No nuevos jobs, agentes, paquetes ni costo de hosting.

## Estado de prueba y límites
- **Fallo observado, aún sin atribución causal completa:** [G37 nativo G58 #40618010458](https://github.com/michels-lab/FoamLens/actions/runs/40618010458) compiló .NET/Inno y aceptó Field/caso real B13 y segunda vista; Portable 1/3 salió no cero **después** de la comprobación física y **antes** de completar humo. El informe público solo dice `stage=webview2-or-host`; no revela qué aserción de Time Series disparó el fallo. Esta corrección responde a un error lógico verificado en fuente, pero **no está probado que sea la única causa del fallo nativo**.
- Aceptación: fixture negativo original falla con código previo y pasa con parche; **CI exact-head Windows/Ubuntu y G37 nativo** deben reportarse una vez concluidos. No llamar éxito una ejecución pendiente.
- Pendiente: si G37 continúa fallando, clasificar mediante telemetría nativa **solo de booleanos de estado visible**; no publicar datos QuickCup/frames/paths. Mantener fail-closed, 36 capturas del dueño, DPI físico, firma Authenticode, updater y #238 abiertos.

**Stable público:** v1.8.10 intacto. Sin release candidate, beta, release ni binario provisional.

## G59b — Causa nativa demostrada en WinForms/WebView2

[Windows completo compilado del SHA 8588ddeb](https://github.com/michels-lab/FoamLens/actions/runs/40619306827), job 122589995924, **FAILED** en Portable original Time Series a ancho CSS 1140px, después de importar QuickCup B13 y comprobar Field + segunda vista. El diagnóstico original de booleanos (ningún valor ni ruta privados) fue:

- `timeSeriesDataView=true`, `properSurfaces=true`, `sourcePanels=2`, `realOriginalField=true`, `originalCatalog=true`, `chartVisible=true`, `noHorizontalOverflow=true`.
- **`visibleSources=false`, `buildVisible=false`, `cancelVisible=false`**, simultáneamente.
- La fuente original `v14-zz-field-workspace.js` contiene `fwLeave()`, que añadía **incondicionalmente** `hidden` al mismo DOM `#fwFieldTsControls` ya adoptado por G3/T2 dentro de `#gr176HistoryCard`. `.fwFieldTsControls.hidden{display:none!important}` de la fuente original ocultaba TODO el generador tras abandonar Field. Es el mecanismo preciso que explica la terna de falsos; el test antiguo de DOM aislado no ejecutaba la secuencia nativa Field → Data, por eso no lo detectó.

**Reparación en el propietario de la causa:** al salir de Field, el DOM original `fwFieldTsControls` se conserva visible si su dueño actual es `#gr176HistoryCard` (Data). En cualquier otro dueño legado, se oculta como antes. Se conserva la invalidación científica de la época, parada de playback, inspector, y retorno de controles. No nueva UI, duplicación del generador, CSS `!important`, migración de datos ni omisión de criterios de aceptación.

**Nueva regresión negativa:** test original T2 ejecuta ahora la **función `fwLeave()` de producción**, con fuente adoptada por Data y fuente legado, y rechaza el `hidden` previo; comprueba también que los contadores y la cancelación de fuente no se alteran. El generador solo refresca selectores sobre campos originales, independiente de la existencia de curvas importadas (cambio G59a).

Estado **CANDIDATO**, no declarado corregido hasta que los tests Windows/Ubuntu y Windows empaquetado original QuickCup/Setup+Portable terminen PASS en este nuevo SHA. Mantener #146, #176, #238 y la versión pública v1.8.10 sin cierre ni release.
