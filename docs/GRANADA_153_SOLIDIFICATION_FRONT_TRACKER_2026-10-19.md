# Operación Granada #153 — Solidification Front Tracker (candidato)

Fecha: 2026-10-19. Rama independiente: feat/granada-153-solidification-front-evidence-20261019. Baseline público: Desktop v1.8.10; sin release.

## Desarrollo implementado

- Módulo versionado v24-solidification-front-tracker.js, cargado por el inyector de extensiones Windows. Aparece en Analysis sin editar Program.cs ni los PR científicos activos.
- Selección explícita: caso → región física → campo escalar original volumétrico → rol liquidFraction o solidFraction → umbrales → valor iso → intervalo de índices de tiempos físicos existentes. No se adivina que T, U ni cualquier nombre arbitrario sea fracción de fase.
- Carga reutilizando fvLoadFrameData para coincidencia segura campo/malla/partición. Rechaza dimensión distinta de [0 0 0 0 0 0 0], tamaños inconsistentes, valores faltantes/no finitos, fracciones fuera de [0,1] o falta de datos para un cuadro.
- Geometría por fuente polyMesh: volumen por celda con integración de caras poligonales trianguladas y orientación owner/neighbour, centros geométricos, índices correctos, cierre vectorial de caras, caras no degeneradas y volumen positivo. No usa bounding boxes ni presupone volúmenes por celda constantes.
- Reporta volumen de sólido/pastoso/líquido, porcentaje volumétrico y conteo de celdas en tiempos originales. Mide cruce del iso en caras internas entre dos celdas vecinas; suma área de esas caras y calcula su centroide ponderado. Calcula desplazamiento de dicho centroide entre dos tiempos válidos / delta-t real. **No equivale a reconstrucción exacta de la isosuperficie ni velocidad normal local del frente.**
- Tiempos del resultado: solo archivos reales del campo OpenFOAM. Exportación JSON manual, local, con caso, región, campo, rol, umbrales, origen si está disponible y razones de exclusión. La gráfica muestra solo marcadores de datos originales. Límite por solicitud de 120 cuadros sin reducción oculta.
- Read-only: no modifica resultados, malla, controlDict ni ejecuta CFD.

## Evidencias y pruebas

El núcleo puro fue ejecutado con ocho verificaciones en V8: cubo de 1 m³, dos cubos adyacentes de 1 m³ cada uno con cara interna de 1 m², clasificación por fase, conversión explícita αS a αL, fracciones no válidas, malla abierta o mal orientada, tiempos físicos y contrato de fuente. Se agregó desktop/tests/solidification-front-tracker.test.cjs y workflow independiente ubuntu/windows solidification-front-fast.yml, además de regresiones previas de solidificación/iso-superficie/Phase-Momentum.

El resultado local 8/8 no representa un pase de GitHub Actions ni una prueba nativa instalada.

## Pendientes de cierre

1. Reconstrucción 3D real de la isosuperficie en regiones y tiempos seleccionados; el código actual solo identifica caras vecinas que cruzan iso (proxy).
2. Velocidad normal local del frente, no derivable de centroide global. No deducir recalescencia, nucleación, microestructura, austenita ni relaciones causales sin modelo y datos.
3. checkMesh sobre la malla fuente y pruebas con celdas no convexas, malla móvil, topología degenerada, regiones múltiples y particiones con archivos reales del propietario.
4. Pruebas del paquete WebView2 real Setup/Portable Windows, aceptación visual/científica del caso original, benchmark #117 y revisión #131.
5. Revisar UX/bilingüismo, desempeño en millones de celdas y sesiones largas antes de release.

## Regla de coordinación

Se desarrolló sobre rama independiente desde main, sin modificar ni fusionar los PRs activos #162, #164, #165, #166, #167, #168 ni #169. Issue #153 abierto. Sin cambio de versión ni publicación hasta validación real y autorización explícita.
