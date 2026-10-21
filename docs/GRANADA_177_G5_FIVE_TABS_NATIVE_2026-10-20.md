# GRANADA G5 — capturas nativas de las cinco pestañas faltantes en Installed + Portable

**Fecha:** 2026-10-20. **Rama:** `feat/granada-177-g5-five-workspaces-native-20261020` (stacked sobre [PR #191](https://github.com/michels-lab/FoamLens/pull/191), que ya probó auténticos Setup/Portable con QuickCup B13). **Sin merge, sin Release Candidates, sin release público.**

## Antecedente verificado

El [CI #39537728010](https://github.com/michels-lab/FoamLens/actions/runs/39537728010), SHA exacto `59df1fdea1f9f7310d0c71e973b3e86cab90552e`, **COMPLETED SUCCESS, 4/4 jobs**. Su host .NET 8 Windows/WebView2 auténtico, el Portable self-contained y el Setup Inno instalado corrieron el B13 privado **metal/mold** a tiempo 9.8 y verificaron View B físico y ejes XYZ. Se validó SHA instalado = Portable, EULA, atajos y desinstalación; ningún .exe se publica. G5 mostró honradamente **16/36** capturas principales (Home, About, Data, Field por dos tamaños y dos tipos), con **20 faltantes** (Time Series, Field Compare, Analysis, Review, Live).

## Paquete A — comprobación y captura de interfaz real (no PNG sintético)

`tools/granada_g5_capture_native.cjs` agrega **solamente en el checkout efímero de Windows** una función de auditoría a `Program.cs`, **después** de `CaptureScientificWorkspaceEvidenceAsync()` (que exige el QuickCup real). Verifica que los métodos, regiones y auditor científico originales del host sigan presentes y que el hook de inserción sea único. Nunca hace commit ni toca la rama de propietario Field F1/CAD.

La función nativa ejecuta acciones UI reales y valida su resultado visible antes de capturar el viewport WebView2 CDP:

1. **Time Series:** botón Data, pestaña real `timeSeriesTab` y área original `chartViewport` visible. Si B13 únicamente contiene campos físicos sin curvas de series temporales, registra `realTimeSeriesHasCurves=false` y `timeSeriesControlsVisible=false`; es captura del **estado vacío real**, NO aprobación de la funcionalidad de series.
2. **Field Compare 3D/2D:** Ribbon de Field, API original `FoamLensFieldWorkspace.add3DView()` si la vista B aún no está habilitada; requiere canvas de vista A y `fcViewport` de vista B físicamente visibles, **no** activar un compañero 2D que pertenece a Data.
3. **Analysis:** botón original `modeAnalysis` y `analysisSubNav` visible.
4. **Review:** botón original `modeReview`, panel real `reviewSurface` visible.
5. **Live:** botón original `modeLive`, panel `liveSurface` visible; se registra explícitamente si no hay una ejecución de solver activa (la mera pantalla no equivale a monitoreo CFD en vivo).

Para cada pantalla se verifica un caso real cargado, modo verdadero, pestaña seleccionada, tamaño y panel visible; se generan **PNG nativos y JSON del estado del DOM** separados. Son dos tamaños (1140×820, 640×900) × cinco superficies = diez capturas adicionales *por binario*, veinte entre Installed y Portable. **Un error de navegación o UI oculta detiene el smoke; nunca se usa la captura de otra pestaña como evidencia.**

## Paquete B — procedencia 36/36 y controles contra falsos aprobados

`tools/granada_extend_g5_visual_manifest.py` incorpora las veinte imágenes extras **solo si realmente existen**, cada una con su JSON nativo correcto, conteo de casos, PNG decodificable, dimensiones mínimas, SHA256 y hash original del Setup/Portable. No duplica slots ni inventa datos para Review/Live. Mantiene el manifiesto canónico original con las 16 capturas verificadas.

El auditor G5 original de [#182](https://github.com/michels-lab/FoamLens/pull/182) ejecuta después su matriz **36/36 obligatoria** contra el nuevo manifiesto con `--strict`, generando una galería HTML y un reporte JSON para revisión humana. `REQUIRES_HUMAN_REVIEW` representa capturas completas pendientes de tu opinión, **no aprobación estética automática**.

Las herramientas nuevas traen **7 grupos Node** de integridad de inyección C#/DOM y **8 pruebas Python** de manifiesto, incluyendo falta de PNG, navegación al panel equivocado, fuente no cargada, formato falso, binario distinto, screenshot duplicado y no atribución de DPI ni release.

## Paquete C — integración con el pipeline auténtico

La variante Windows del workflow `.github/workflows/granada-177-real-openfoam-field-f1.yml` del PR #191 ensambla primero los mismos 16 PR fuente y los scripts nativos Field F1/CAD/2D3D; solo después inserta el capturador G5 en el **host de prueba**. El mismo job recompone el bundle, compila host, verifica con B13 real, **publica e instala temporalmente Setup + Portable**, y ejecuta los mismos pasos científicos, imágenes, auditoría de licencia/atajos y desinstalación.

El job sube **solo evidencias**, nunca instaladores, binarios, tokens, archivos QuickCup originales ni Release Candidates. El pipeline de distribución oficial no cambia. Debe quedar abierto cualquier fallo real que aparezca en las cinco pantallas: no se marcarán como aprobadas sin pruebas CI del SHA exacto.

## Fronteras científicas y de entrega

- Capturar un panel de Time Series o Live **no certifica** que existan curvas experimentales o que un solver esté activo. Los JSON registran fuente importada y modo; la validación científica de curvas queda aparte.
- Las dimensiones de viewport CDP **no equivalen** a escalado DPI físico de Windows. El QA real 125–200% sigue sin acreditar.
- La galería y sus checks prueban integridad/alcance de captura, no buena estética; **aprobación del propietario pendiente**.
- Recalescencia, validación de predicción térmica, importación CAD STEP/IGES/BREP, reconciliación de workflow principal y release/updater definitivo siguen abiertos.
- **El único release posible será final**, sin RC ni variantes públicas intermedias, y necesita autorización expresa.

## Estado de CI

[Workflow Granada G5 #39538695307](https://github.com/michels-lab/FoamLens/actions/runs/39538695307) lanzado desde la rama nueva. **No atribuirle PASS hasta comprobar todos sus jobs Windows/Ubuntu y los dos ejecutables instalados.** Punto de reentrada: revisar logs del primer fallo de visibilidad o carga, corregir la sección concreta y repetir el conjunto. No alterar las ramas anteriores.

## Primer resultado nativo y corrección de causa (registrado después de primera ejecución)

Las ejecuciones [#39539199501](https://github.com/michels-lab/FoamLens/actions/runs/39539199501) y [#39539425817](https://github.com/michels-lab/FoamLens/actions/runs/39539425817) pasaron suites Windows/Ubuntu y compilaron el host; **fallaron correctamente** en `time-series/wide`, porque B13 no cargaba curvas Time Series (panel de controles oculto) aunque la pestaña Data y el gráfico base fueran visibles. La ejecución nativa también confirmó que `FoamLensRegionScene.state().layers` solo contabiliza **regiones secundarias**: el metal primario vive fuera del Map; el criterio científico correcto es `primaria válida + región molde secundaria coloreada/medida`.

La captura G5 ahora permite documentar el **estado vacío real** de Time Series si su `chartViewport` está visible, pero registra `realTimeSeriesHasCurves=false`. Field Compare se cambió para exigir una vista original dual **3D A/B** OpenFOAM, no una vista 2D en Field que contradice la separación arquitectónica Data/Field. Estos cambios deben pasar el siguiente CI con capturas reales; ningún fallo se considera resuelto solo por editar scripts. La validación de series científicas con datos de termopares sigue PENDIENTE.
