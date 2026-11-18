# FoamLens — Operación Granada completa (17 noviembre 2026, México)

Este registro distingue **código integrado**, **pruebas directas**, **CI nativo**, **release publicado** y **aceptación humana**. Una fase no certifica automáticamente la siguiente.

## Entrega oficial y versión

- Release público estable: [Desktop v1.8.15](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.15), fuente exacta `0c51d58c1405e619a534d999fa2a63edf10d755c`, Setup + Portable y dos SHA-256 sidecars. El [Windows build de publicación](https://github.com/michels-lab/FoamLens/actions/runs/44211218863) concluyó `success`, incluida la comprobación de los binarios públicos descargados.
- [**FoamLens Desktop v1.8.16 — release público estable**](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.16), publicado el 18 noviembre 2026 UTC (17 noviembre en México), creado desde el SHA exacto `2b993913ffd036de6b5176ebd2bdafa86daefa8d` de la [PR #358](https://github.com/michels-lab/FoamLens/pull/358). Contiene `FoamLens-Setup-v1.8.16.exe` (68,808,060 bytes), `FoamLens-Portable-v1.8.16.exe` (74,258,107 bytes) y ambos `.sha256` de sus archivos respectivos. El [release workflow #44228227055](https://github.com/michels-lab/FoamLens/actions/runs/44228227055) terminó **success** incluyendo el paso de descarga y verificación de ambos activos públicos. [Auditoría independiente #44230314224](https://github.com/michels-lab/FoamLens/actions/runs/44230314224) **success**. La candidata previa [#44226790529](https://github.com/michels-lab/FoamLens/actions/runs/44226790529) también aprobó las comprobaciones científicas y binarias nativas.
- Sin certificado Authenticode inventado, sin compra requerida para los binarios directos en GitHub, con aviso Windows SmartScreen. Microsoft Store es un canal distinto.

## Bloques de código integrados a `main`

1. [PR #355](https://github.com/michels-lab/FoamLens/pull/355), `257fb1e430f5277fe8c5835dd6041aff71ab3f7b`: auditoría independiente del release **después** del Windows build; compara el SHA del tag con el commit que construyó los binarios. Prueba de lógica de checksum aprobada; la auditoría post-publicación se validará en la siguiente publicación por este flujo.
2. [PR #356](https://github.com/michels-lab/FoamLens/pull/356), `14a29935b05efaee62d1ce5ecce88f42b5d32e48`: la vista B reutiliza los selectores originales de caso, región, campo y componente, evitando reescribir el DOM a cada fotograma. Prueba de función original: **256 refrescos** sin reconstrucción cuando el catálogo no cambia; casos, vectores y nuevas variables siguen actualizándose.
3. [PR #357](https://github.com/michels-lab/FoamLens/pull/357), `7a6513850a6bb2ba493a0e9e8c28df99ef7ab2df`: Field B/C/D limpia mesh, valores, time, delta, rango, sync y probes viejos al fallar la lectura de un tiempo OpenFOAM; una respuesta vieja no puede borrar un fotograma nuevo. C/D cargan sus fuentes independientes **en paralelo** (máximo dos). Pruebas directas de funciones originales: C sin datos se invalida y D válido a t=9.8s permanece.
4. [PR #359](https://github.com/michels-lab/FoamLens/pull/359), `31c1bbb2fc3488e8a2809b34fb37eeaaa3c7460e`: corrige exclusivamente las pruebas heredadas que fallaron en CI tras las mejoras científicas. La prueba Field A-only inyecta el nuevo actualizador de etiquetas y verifica la secuencia de limpieza; las pruebas de inventario backlog ya no comparten simultáneamente un `global.fetch` simulado. **No se deshabilitaron tests ni reglas de seguridad.**

## Evidencia y límites actuales

- Primer CI real posterior a #357: [Field playback run 44226114651](https://github.com/michels-lab/FoamLens/actions/runs/44226114651), `failure` en dos aserciones heredadas; [backlog run 44226114564](https://github.com/michels-lab/FoamLens/actions/runs/44226114564), `failure` por interferencia de mocks. Los fallos se atribuyeron a sus causas reales, sin atribuirlos a errores del solver.
- Tras [PR #359](https://github.com/michels-lab/FoamLens/pull/359), el Field playback/Camera suite y el backlog convergence read-only **pasaron** en `main` commit `31c1bbb2fc3488e8a2809b34fb37eeaaa3c7460e`; el build de publicación se ejecuta con nuevo commit exacto.
- En la misma ejecución del Field suite, `field-multiview-ux.test.cjs` y `field-compare.test.cjs` completaron con éxito. Sus comprobaciones incluyen tiempos físicos independientes, protección de peticiones asíncronas y geometría.
- Las pruebas directas ejecutadas en el controlador original B/C/D y el verificador PR fueron correctas; **no equivalen a un smoke instalado de WinForms/WebView2 ni una validación CFD física**.
- El commit final de pruebas de #359 y el HEAD de preparación v1.8.16 exigen nuevos checks nativos. **No declarar passed una ejecución queued, in_progress, cancelled o skipped.** La publicación v1.8.16 seguirá bloqueada hasta su evidencia exacta.

## Pendientes reales no cerrados

- [#117](https://github.com/michels-lab/FoamLens/issues/117) — benchmark 2D OpenFOAM de 3,008 archivos, tiempos cold/warm sobre hardware real y cache persistente: el ahorro del DOM no prueba FPS ni tiempo de importación.
- [#149](https://github.com/michels-lab/FoamLens/issues/149) y [#177](https://github.com/michels-lab/FoamLens/issues/177) — pruebas físicas Windows DPI 125/150/175/200%, visibilidad y usabilidad de controles A–D y otras pestañas; las 36 capturas CSS no certifican DPI físico.
- [#147](https://github.com/michels-lab/FoamLens/issues/147) / [#148](https://github.com/michels-lab/FoamLens/issues/148) — conversión CAD STEP/IGES/BREP completa, topología y validación geométrica para OpenFOAM. El flujo de preparación de STL no crea una malla volumétrica.
- [#238](https://github.com/michels-lab/FoamLens/issues/238) — controles de publicación exact-source, hashes públicos, actualizador, owner review y canal Store.
- [#252](https://github.com/michels-lab/FoamLens/issues/252) — validación de actualización de instalaciones antiguas con residuos AppRoot; la release actual incorpora el cargador confiable, no repara retroactivamente binarios viejos.
- [#146](https://github.com/michels-lab/FoamLens/issues/146) / [#176](https://github.com/michels-lab/FoamLens/issues/176) — evidencia real de Time Series y aceptación de diseño en todas las resoluciones.

## Regla de salida

Versiones oficiales únicamente estables, nunca RC/beta. La preparación de metadatos no publica ni activa el actualizador. Solo anunciar entrega tras comprobar GitHub Release público, Setup y Portable reales, ambos sidecars SHA-256, build exact-source aprobado y advertencias de las limitaciones que permanezcan. Los resultados físicos de la tesis no se fabrican ni alteran dentro de FoamLens.
