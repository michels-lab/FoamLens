# GRANADA G17 — regressions conjuntas del actualizador y Play desde `main`

**Fecha:** 22 de octubre de 2026. Se crea desde la rama principal **después** de fusionar [G15 #233](https://github.com/michels-lab/FoamLens/pull/233) y [G16 #234](https://github.com/michels-lab/FoamLens/pull/234). **No incluye software adicional, CFD, cambios de UI ni instaladores.**

## Problema de integración que previene

G15 refuerza que los archivos de actualización correspondan a `github.com/michels-lab/FoamLens/releases/download/{tag}/{asset}` y que el SHA-256 se asocie al instalador esperado; G16 impide que las reglas compactas G7 reduzcan Play de los 112px requeridos a 70.390625px a 1140 CSS px. Ambos tienen pruebas individuales aprobadas. La integración **permanente** debe volver a ejecutar ambos conjuntos sobre el código vigente `main` después de futuros cambios, para evitar aprobar un módulo aisladamente cuando otro alteró los mismos archivos del host.

## Entregables

1. `.github/workflows/granada-g17-integrated-guards.yml` ejecuta en **Windows y Linux**, en PRs o pushes a main que modifiquen fuentes relevantes y de forma manual: el arnés **C# auténtico de producción** G15 con casos adversarios SHA/URL; pruebas del host G15 con consentimiento; regresiones G16 contra G7/G12 usando el ancho observado **70.390625px**; la nueva prueba conjunta `tools/granada_g17_integrated_guards.test.cjs`; y la separación de fuentes de FoamLens frente a otras apps.
2. La nueva prueba conjunta asegura que `Program.cs` conecta **ambas** verificaciones del actualizador antes de descargar, calcula el SHA del binario descargado y mantiene la inyección de módulos originales `v*-*.js`; el nuevo v33 tiene mayor especificidad que v27 G7, aplica solo a 1025–1250 px y no modifica almacenamiento, handlers ni estado científico; los controles originales de cámara G13 conservan sus siete identificadores.
3. Esta PR modifica **solo** una prueba, un workflow y este documento. No se toca `Program.cs`, el renderizador, datos OpenFOAM, el actualizador en producción ni el sistema de instalación.
4. Las comprobaciones unitarias de G17 son **pruebas de fuente e invariantes**, NO certificación nativa de Setup/Portable, aprobación estética, rendimiento físico DPI, soluciones CFD, firma digital ni control de actualizaciones extremo a extremo. La ejecución científica del producto original y el conjunto nativo anterior se mantienen como evidencias independientes.

## Evidencia de aceptación existente

- G15: [#39890025152](https://github.com/michels-lab/FoamLens/actions/runs/39890025152) y [#39890025095](https://github.com/michels-lab/FoamLens/actions/runs/39890025095), C# real Ubuntu/Windows y build original Windows PASS.
- G16 exact original source: [#39892003035](https://github.com/michels-lab/FoamLens/actions/runs/39892003035), [#39892003044](https://github.com/michels-lab/FoamLens/actions/runs/39892003044) PASS.
- B13 nativo real y **reproducción forzada** de `#appShell.gfwCompact` a 1140px: [#39893531580](https://github.com/michels-lab/FoamLens/actions/runs/39893531580) **4/4 PASS**, con [evidencia auténtica #12476695920](https://github.com/michels-lab/FoamLens/actions/runs/39893531580/artifacts/12476695920). Cada uno de los cuatro reinicios adicionales de Setup/Portable conserva Play 112×32px y se restaura el estado original de `gfwCompact`. Pruebas CFD B13 originales conservadas.
- **El resultado de la nueva PR G17 debe comprobarse por su propio SHA y por ambos sistemas antes de fusionar**. No se publica nuevo release, RC, beta ni binario.

## Pendientes independientes

- Issue histórico de Play [#230](https://github.com/michels-lab/FoamLens/issues/230): implementación correctiva ya fusionada; todavía requiere validación exacta del paquete `main` combinado y monitor físico/idiomas específicos antes del cierre total.
- Revisión humana de 36 capturas (`human_approved:false`), monitores Windows a escalas físicas 125/150/175/200%, exactitud numérica, firmas del editor, SmartScreen y canal final de distribución/actualización.
