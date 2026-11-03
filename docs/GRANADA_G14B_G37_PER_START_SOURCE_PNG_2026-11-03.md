# GRANADA G14b → G37 — seis arranques reales con evidencia original (3 Portable + 3 Installed)

## Por qué se reconcilió la PR #232

El antiguo arnés G14/G14b (PR #231/#232) dependía de `granada_installed_portable_b13.ps1`, `granada_real_case_native_gate.py` y un workflow G5 que ya **no existen** en el código `main` de FoamLens. Fusionarlos literalmente habría reintroducido un conjunto incompatible de herramientas y posiblemente partes antiguas del host.

La implementación actual de G37, `tools/granada_g37_real_b13_play_stress.ps1`, ya ejecuta **tres arranques Portable y tres Installed** del mismo binario Windows, sobre el fixture original privado QuickCup B13, con ambas regiones, 1140/640 CSS px y comprobaciones del botón Play y Time Series. Esta integración reutiliza **G37** en lugar de fabricar otra plataforma de QA. La PR #232 conserva su historial, pero solo aporta a `main` los archivos nuevos / cambios especificados en la comparación actual.

## Nueva puerta independiente, por cada arranque

- Justo antes de iniciar **cada** proceso WebView2, el script lee SHA-256 de `B13_prghPressure_airGapOF14/9.8/metal/T` y de `.../mold/T`, archivos auténticos del fixture original, ya verificado por la puerta G62 (artifact y procedencia desde el builder de GitHub).
- Después del exit code 0, valida que esos dos archivos conservan exactamente sus bytes frente al valor previo; una alteración solo en el segundo, cuarto o sexto arranque debe fallar.
- Requiere log de ese proceso con una única marca original de `FoamLens real OpenFOAM packaged runtime smoke passed:`, la marca independiente de segunda vista, y la terminación `FoamLens Windows smoke test passed.`. Rechaza `playNotCollapsed:false` y errores de geometría originales.
- Comprueba las capturas **originales**, recién producidas en el directorio exclusivo del intento: `field-wide.png` y `field-compact.png`. El validador `tools/granada_g37_per_restart_source_gate.cjs` verifica firma PNG, tamaños de chunk, CRC por chunk, cabecera IHDR, dimensiones positivas, IDAT inflable y longitud/filtros de scanlines RGBA/RGB de 8 bits. No acepta PNG truncado o corrupto.
- El reporte del intento, privado y efímero, contiene exclusivamente booleanos; el reporte final `g37-sanitized/report.json` obliga a **seis** verificaciones completas y conserva `releaseReady=false`, aceptación visual humana `false` y sólo información no científica. Los datos reales de fuente, las capturas, los logs originales y hashes **nunca** se cargan como artifacts y se limpian en `finally`.
- Prueba independiente cross-OS `tools/granada_g37_per_restart_source_gate.test.cjs` cubre el caso positivo y negativos por alteración de metal/molde, falsificación de marca, fallo de Play, CRC PNG, ausencia de imagen o SHA, más la comprobación de que el wrapper G37 no omite ningún arranque.

**Límites:** un hash leído antes y después del mismo arranque demuestra inmutabilidad en esa ventana, no validez metalúrgica ni igualdad con una curva experimental. Un PNG válido demuestra que el archivo capturado está íntegro, no que un experto haya aceptado visualmente la figura. La procedencia privada del B13 proviene de una puerta anterior y separada. Sin ejecución local independiente de `checkMesh` ni validación de transferencia térmica o recalescencia, el estado científico sigue siendo **no certificado**.

El workflow de la PR ejecuta pruebas en Ubuntu y Windows. La ejecución original de seis procesos Windows sobre fixture privado conserva una puerta de rama explícita y una lista cerrada de archivos permitidos; no admite cambios al código de producto de una QA branch ni excepciones que omitan pasos. **No se ejecutan RC ni releases**; #238/#252 permanecen abiertos hasta firma y aceptación del artefacto exacto.
