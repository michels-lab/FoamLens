# FoamLens / Operación Granada G7 — Compact Scientific Workbench
2026-10-21 · Rama independiente G7.

## Problema reproducido
El G5 anterior capturó 36/36 pantallas reales de Windows con QuickCup B13 metal/molde, Setup y Portable. [CI 39643663511](https://github.com/michels-lab/FoamLens/actions/runs/39643663511) PASS, pero el informe exigía revisión visual humana. En capturas de 640×900 Field, la barra izquierda ocupó ~375px y el canvas científico tuvo menos de 250px útiles; Analysis dejó la gráfica casi sin espacio. El Ribbon original mostraba controles científicos mediante desplazamiento horizontal.

## G7.1: cambio funcional
- Nueva extensión aislada desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js. No toca ramas F1/F2, G0 Ribbon, Analysis G2/G3, cámara G2, Ctrl+K o los resultados originales de CFD.
- Hasta 1024 píxeles CSS en Field/3D y Analysis, la interfaz prioriza una única columna científica. La barra lateral y su contenido quedan accesibles mediante un panel temporal desde el botón Controls/Controles del encabezado fijo.
- El panel usa el mismo nodo original .sidebar, sin clonar selectores, eventos, datos, medidas, cámara ni herramientas de Analysis; los módulos siguen siendo dueños de sus handlers.
- Analysis conserva la gráfica y su lista original de series, ahora en dos filas de ancho completo; se elimina la anchura mínima artificial de 900px en la vista compacta.
- Field utiliza espacio completo de visor y permite que los grupos científicos del Ribbon, incluido el transporte de tiempo, se reorganicen en varias filas sin ocultar controles.
- Fuera de Field/Analysis y en pantallas mayores de 1024 CSS px, el diseño original se conserva.

## G7.2: seguridad y accesibilidad
- Solamente se agregan clases visuales gfwCompact / gfwOpen al appShell. No se ejecutan cambios de modo, importación de CFD, borrado de datos, exportación, cambios de sesión o localStorage.
- Botón bilingüe visible, Escape, clic en fondo, Tab/Shift+Tab con retención de foco, devolución del foco y restitución exacta de los atributos ARIA originales.
- Al cambiar de pestaña o volver a ancho escritorio, se cierra el panel automáticamente; la preferencia original sidebarCollapsed se conserva.
- En ausencia del shell o encabezado nativo se detiene sin fabricar controles.

## Pruebas y release
- Contratos y tests de DOM: tools/granada_g7_compact_workbench.test.cjs (15 casos).
- Workflow propio: .github/workflows/granada-g7-compact-workbench-native.yml, Ubuntu+Windows y build real .NET 8/WinForms/WebView2 con smoke del módulo G7 integrado.
- Pendiente adicional obligatorio: captura G5 de este NUEVO estado G7 con 36 pantallas reales en Setup/Portable usando QuickCup B13, con DPI físico Windows 125–200% y revisión visual humana. Las capturas anteriores demuestran defectos, no la aceptación de G7.
- Granada tiene permiso de publicar directamente una versión FINAL estable cuando pasen TODOS los gates científicos, QA físico, integración, versión, firma, distribución y updater; nunca RC/beta ni merge sin validación. Esta rama es un bloque de desarrollo, no un release.
