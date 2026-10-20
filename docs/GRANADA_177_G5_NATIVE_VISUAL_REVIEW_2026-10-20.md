# Operación Granada Grande — G5 / evidencia visual nativa (2026-10-20)

**Estado:** candidato independiente, NO integrado ni publicado. Relacionado con issue [#177](https://github.com/michels-lab/FoamLens/issues/177), aprobación transversal de Home, Data, Analysis, Review, Live, Field/3D y Time Series, y [#131](https://github.com/michels-lab/FoamLens/issues/131). Rama `feat/granada-177-g5-native-visual-review-pack-20261020`.

## Por qué este bloque

Los screenshots actuales del flujo Windows no cubren todas las pestañas. El workflow de distribución ejecuta el WebView2 instalado y portátil y almacena capturas de **Home, About, Data y Field** en ancho/compacto (y una captura adicional metal/molde cuando existe fixture). Actualmente eso **no demuestra** que Time Series, A–D, Analysis, Review y Live se vean bien, que los controles sean visibles a 125–200% de escala del sistema, ni que el usuario apruebe el diseño.

Los PR en curso [#179](https://github.com/michels-lab/FoamLens/pull/179) (Ribbon), [#180](https://github.com/michels-lab/FoamLens/pull/180) (Review/Live), [#181](https://github.com/michels-lab/FoamLens/pull/181) (Time Series), [#162](https://github.com/michels-lab/FoamLens/pull/162) y [#175](https://github.com/michels-lab/FoamLens/pull/175) (Field), y [#164](https://github.com/michels-lab/FoamLens/pull/164) (CAD) permanecen intactos. **No editar Program.cs ni el workflow de empaquetado** mientras esos módulos están ocupados.

## Entregables de este macro-bloque

### A. Validación fuerte de procedencia
`tools/granada_visual_review.cjs` analiza la evidencia **nativa realmente capturada** por el paquete Windows, no un diseño simulado. Exige el esquema `michelslab-rendered-ui-v1`, SHA del commit, hashes del instalador/portátil, identidad por screenshot, PNG IHDR y dimensiones, bloquea rutas relativas inseguras / symlinks fuera de la carpeta del manifiesto, errores de contenido hash, duplicación entre pantallas y confusión de captura instalada/portátil. En su ejecución sobre artefactos reales se deben pasar `--setup`, `--portable` y `--sha` para verificar los bytes reales. No descarga ni transmite archivos por su cuenta.

### B. Matriz G5 completa y documento para revisar visualmente
Matriz obligatoria de **9 contextos** × **2 variantes** (Windows instalado/portátil) × **2 viewports** (wide/compact) = **36 espacios de captura**. Cada captura aparece como `captured-not-reviewed` y cada ausencia como `missing`. Resultados: `INVALID`, `INCOMPLETE` o `REQUIRES_HUMAN_REVIEW`. Jamás `approved` automático.

Produce HTML **autocontenido, sin peticiones de red**, con imágenes verificadas incrustadas, contexto original, matriz y motivos de fallo; también JSON sin bytes de imagen. La generación crea un artefacto de revisión **local**; jamás guarda capturas privadas en Git. No evalúa la belleza mediante algoritmos ni certifica clicks/solvers por píxeles.

### C. CI negativa y proceso de verificación desde un build Windows real
`tools/test_granada_visual_review.cjs` contiene regresiones con PNG sintéticos marcados para **tests únicamente**: cobertura completa/incompleta, omisiones de Analysis/Review/Live/Time Series, SHA del HEAD, binarios incompatibles, hash/dimensiones, traversal, duplicación entre tabs y CLI estricta/no estricta. `.github/workflows/granada-177-g5-native-visual-review.yml` ejecuta test en Windows y Ubuntu, y tiene un `workflow_dispatch` **opt-in** que descarga el artefacto Setup+Portable+screenshots ya existente de un workflow Windows, verifica SHA del commit **de ese run**, genera HTML/JSON y conserva el reporte aunque la cobertura sea incompleta. Sin version bump, merge o release.

## Evidencia y limitaciones honestas

- Script nuevo compilado sintácticamente antes de commit. Los tests completos de Node y del workflow deben confirmarse mediante CI de este mismo HEAD; **no declararlos verdes solo por estar escritos**.
- El tool usa imágenes generadas de prueba únicamente para ejercitar ataques/regresiones; **no son screenshots reales de FoamLens**. Un paquete Windows previo no proporciona todavía las cinco pantallas adicionales.
- Sin cambios a Frontend, motor científico, usuario, cuenta, formatos CAD, datos OpenFOAM o ejecución de CFD.
- No se puede certificar 125/150/175/200% **DPI nativo** con dos viewports CSS. Hace falta el release candidato instalado en máquina Windows con capturas y DOM reales.
- Aceptación estética/manual requiere revisión de Michel. Tampoco se autoriza publicar.

## Punto de reentrada

1. Confirmar CI en HEAD exacto y arreglar rojo.
2. Ejecutar opt-in workflow con ID del run Windows finalizado, inspeccionar reporte de cobertura y hashes.
3. Los responsables de Ribbon/Field/Time Series/Review/Live deben ampliar la captura nativa **sin pisarse**, hasta aportar las 36 capturas y pruebas en 125–200% DPI; no falsear con copias de una pestaña.
4. Comparar screenshots, métricas DOM y usabilidad del usuario; formalizar aprobaciones individualmente y preservar evidencia source-bound. Mantener #177 y #131 ABIERTOS.
