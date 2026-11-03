# FoamLens — Operación Granada · búsqueda de comandos originales (2026-10-21)

## Alcance y no interferencia

Objetivo del propietario: que las herramientas esenciales sean **fáciles de encontrar y utilizar** en todas las pestañas, y que la nueva etapa de FoamLens tenga un diseño coherente, especialmente Field/3D y las demás tabs. Las mejoras directas de disposición de Ribbon, Field F1/F2, Time Series, Data/Analysis, Review/Live, Export y G5 ya están en **PR activos**; no se tocan ni se rediseñan aquí.

Esta rama implementa un **sistema complementario real de navegación**, no otro menú de herramientas avanzado que duplique botones. Añade solo `v26-granada-command-search.js`, tests sintéticos de DOM en `tools/`, CI independiente y esta bitácora; mantiene los botones originales, control de simulación y scientific parsers intactos. No interactúa con GitHub, red, Supabase, casos privados ni escritorio fuera de WebView2.

## Entregables funcionales

1. **Acceso permanente + Ctrl+K**: botón Buscar/Find etiquetado en la barra Ribbon, diálogo modal `role=dialog/aria-modal`, buscador con listbox semántico, resaltado de coincidencias y atajos Ctrl+K / Cmd+K; la barra original y About siguen siendo los dueños del resto del encabezado.
2. **Ocho destinos reales**: Home, Data, 3D/Field, Analysis, Export y View ejecutan exactamente el `.click()` de su botón Ribbon. Review/Live son **submodos** del Home original en `flRaReview`/`flRaLive`, no tabs inventadas. Herramientas seguras con rutas ya existentes: perfiles, series temporales, logs, comparar curvas, lista de casos, ayuda. Buscar usa nombres EN/ES, acentos y IDs originales, no valores privados.
3. **Interacción segura / teclado**: flechas para resultados, Enter en comando, Esc para cerrar/restaurar foco, Tab/Shift+Tab atrapados en diálogo, botón cerrar, clic en backdrop, resultados vacíos accesibles y acciones deshabilitadas excluidas. No permite invocar acciones que pueden destruir, modificar, borrar o exportar datos: `flRaClear`, `Reset`, import/export y acciones arbitrarias **no son indexadas**. No clona handlers, no simula cambios de modo y no toma el control de los robots del usuario.
4. **Diseño acotado**: usa las variables visuales actuales `--panel`, `--panel2`, `--line`, `--accent`, `--text`, `--muted`, con adaptación a ventanas compactas y preferencia de movimiento reducido. El disparador debe seguir visible en el Ribbon mientras los tabs originales conservan su desplazamiento horizontal.
5. **Prueba de ejecución**: regresiones en Node con modelo DOM de controles originales y paridad con `v15-ribbon-ui.js`, más CI Ubuntu y Windows, y build nativo WinForms/.NET 8/WebView2 con archivo `v26` real en `AppBundle.zip` y prueba `--smoke-test`. No añade `.test.cjs` a `desktop/tests` (lo cual exige editar manifiesto Windows propiedad de otras PR activas); usa `tools/granada_command_search.test.cjs`.

## Límites y aceptación

- Los comandos presentados reflejan que el botón existe y está habilitado; **no** garantizan un resultado científico, una simulación terminada o una gráfica exportada.
- Un `--smoke-test` Windows no equivale a usuario pulsando Ctrl+K en el Setup instalado. Tras combinar con las PR #179/#180/#181/#183/#184/#195 se requieren capturas reales a 1024/1280/1920, DPI 125–200%, pruebas con lector de pantalla si aplica y revisión de organización de controles.
- Los productos FoamLens Developer y los cambios científicos/CAD siguen sus ramas, sin modificaciones ni merges forzados aquí.
- El permiso Granada permite release definitivo estable **solamente si todas las puertas de producto pasan**. No RC/beta. Este cambio aislado no alcanza dicha condición ni autoriza publicar inmediatamente.

## QA / punto de reentrada

- Estado al crear: nuevo módulo + pruebas + CI; validación exacta de GitHub Actions **pendiente**, no declarar verde antes de leer jobs.
- Verificar el montaje real junto con G0–G6, confirmar que las acciones permitidas conservan sus handlers, y que la búsqueda EN/ES se actualiza tras cambiar idioma. Si una PR modifica identificadores originales, actualizar la lista segura contra fuente, nunca fabricar rutas.
- Al completar CI: registrar SHA exacto, suites realmente aprobadas/fallidas, compilación Windows real, y mantener por separado instalación, UX física, QA científico, integración, release y aceptación del propietario.

**Estado:** implementado en PR independiente, sin merge/tag/release.
