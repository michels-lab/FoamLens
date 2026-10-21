# FoamLens — revisión crítica del producto, ciencia y experiencia de usuario

## Objetivo
Cada cambio importante debe ofrecer perspectivas que puedan contradecir la solución propuesta, **no** limitarse a ejecutar instrucciones. El propósito es detectar problemas que ni el propietario ni el desarrollador hayan considerado. FoamLens es genérico, local-first y completamente independiente de QuickCup o de cualquier repositorio coordinador.

## Cinco perspectivas de revisión

| Perfil | Pregunta incómoda | Prueba decisiva |
| --- | --- | --- |
| Usuario nuevo | ¿Sabría importar un caso arbitrario, elegir región/variable, entender tiempos y reconocer ausencia de datos? | Smoke de navegación con caso OpenFOAM no QuickCup, errores y restauración |
| Científico escéptico | ¿Se inventa una curva, interpolación, asociación de celda/cara o una interpretación física? | Contrato de fuente/campo/unidad/proveniencia y fixture negativo |
| Arquitecto independiente | ¿Un arreglo agrega acoplamiento, duplicaciones o depende de la estructura QuickCup? | Lanzamiento con fixture independiente y prueba de módulos/genéricos |
| QA adversarial | ¿Funciona en Windows Setup y Portable con DPI, teclado, cancelación y sesiones reales, no solo en un test JS? | Smoke instalado + portable en la build candidata y evidencia SHA |
| Privacidad y seguridad | ¿Se exportan rutas privadas, datos inéditos, credenciales o imágenes sin consentimiento? | Pruebas de redacción, rutas locales y opt-in de exportación |

## Cada decisión sustancial incluye
1. Caso de usuario y beneficio esperado.
2. Mejor argumento para el diseño actual.
3. Mejor argumento **en contra**, junto con dos alternativas, una necesariamente más sencilla.
4. Riesgo científico o UX que no cubren las pruebas actuales; no inventar problemas.
5. Experimento mínimo, escenarios negativos y criterio de rechazo.
6. Dependencias reales, posibles colisiones con PRs abiertos, reversibilidad y prueba en Windows/CI.
7. Resultado verificado, lo que **no** se verificó, issue/PR, rama y bitácora local.

## Mecanismo de incorporación

Estos agentes se invocan manualmente en una revisión o cuando el asistente sigue AGENTS.md. No afirmar que un archivo de perfil implica un LLM trabajando en segundo plano. Las alertas automáticas basadas en metadatos, cuando estén disponibles, son señales preliminares, **no** aprobación de un release ni auditoría científica.

La app y su Developer Twin pueden aplicar el mismo checklist a errores y anotaciones, pero esta especificación **no significa que exista ya un botón de 'asesor' o un proceso autónomo dentro del ejecutable**. Para incorporarlo a la UI hacen falta implementación, tests del paquete y aceptación del usuario.

Las decisiones finales y bitácoras siguen en este repositorio (docs/GIT_AUDIT_LOG.md). No mover software ni fuentes científicas al hub.
