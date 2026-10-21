# FoamLens — Operación Granada: 11 propietarios, integración real de todas las pestañas
**Fecha:** 2026-10-21 · **Alcance:** Field/3D, Time Series, Data/Analysis, Review/Live, Export, herramientas G5 y búsqueda Ctrl+K en el MISMO proceso WinForms/WebView2.

## Por qué es un bloque nuevo y ambicioso

Las versiones separadas de las herramientas ya tenían pruebas independientes. FoamLens, sin embargo, empaqueta todos los archivos `v*-*.js` en una **misma IIFE en orden determinista** y conserva un único documento DOM y un solo estado de la interfaz. Que 11 ramas funcionen individualmente no certifica que sobrevivan juntas. Además, ninguna integración anterior unía simultáneamente G4, T2, Data/Analysis, Export, Field F1/F2, los controles de cámara y la nueva búsqueda de comandos.

No invadir trabajo activo: **ninguna PR fuente se modifica**, ni se edita directamente `Program.cs`, `index.html`, `CHANGELOG.md`, la bitácora global o la versión; no se hace merge ni release. El trabajo tiene sus propios archivos `tools/granada_all_tabs_11_owner.*`, workflow y este documento.

## Entregable A: ensayo de composición funcional (no una simple lista de PR)

El ensamblador `tools/granada_all_tabs_11_owner.cjs` verifica 11 HEADs **exactos de GitHub** antes de tocar el checkout, descarga únicamente 26 rutas de código original permitidas y reproduce el montaje real:

| PR | Módulo del producto o validación |
|---|---|
| #162 | F1: Field físico multirregión, metal/molde A–D, escalas XYZ |
| #175 | F2: tamaño de paneles A–D, geometría y DPI |
| #179 | G0/G1: Ribbon y auditoría de comandos originales |
| #180 | G4: Review y Live visibles |
| #181 | T2: interfaz de Time Series |
| #182 | G5: inspección de evidencia visual |
| #183 | G2/G3: Data y Analysis |
| #184 | G6: controles originales de exportación |
| #194 | G5: comparador de auditorías de visibilidad |
| #195 | G2: barra de 3D con navegación, escalas y siete cámaras originales |
| #201 | Búsqueda Ctrl+K, ocho destinos y herramientas seguras |

**Integridad:** comprueba pertenencia exacta de cada archivo, nombres únicos y SHA de fuente, rechaza PR modificadas, archivos nuevos ocupados por otro agente, symlinks y desvíos de rutas, comprueba byte a byte o equivalencia SOLO LF/CRLF los originales v14 Field/compare/test, y verifica que `build-foamlens-desktop.yml` no cambió desde la base estable. Escribe el overlay de ciencia únicamente en un checkout CI efímero después de comprobar TODAS las fuentes; el manifiesto de test Windows se modifica únicamente en esa copia para ejecutar las pruebas nuevas F1/G2 exactamente una vez.

El ensamblador compila en una misma función JS los **ocho nuevos módulos originales v24/v25/v26** en el orden de carga nativo, detectando redefiniciones de `const/let` y errores de sintaxis que un test aislado no encuentra. La herramienta G5 y el comparador de auditoría se ejecutan juntos pero no se inyectan como módulos visuales.

## Entregable B: QA exhaustiva, sin simular OpenFOAM

- Regresiones de 18 suites originales, de los 11 propietarios y del `main` base, en Ubuntu y Windows: F1 multirregión, Field compare, F2 layout/runtime, Ribbon original, G0/G1, Review/Live, T2, Data/Analysis, G6 Export, cámara G2, auditoría G5, comparador de export, Ctrl+K, Ribbon y organización de espacios.
- 13 grupos negativos del compositor: PIN/HEAD cambiados, solapamientos, fuentes científicas alteradas, CRLF en Windows, archivos faltantes, colisión léxica, ruta ajena, mal registro de tests, etc. Son tests unitarios con módulos claramente **simulados**. 
- El resultado no incluye valores inventados de temperatura, energía, región o solver, ni rutas privadas o resultados experimentales.

## Entregable C: un ejecutable Windows con todos los cambios coexistiendo

En un runner Windows fresco, repite la comprobación de los once HEAD, monta los 8 `v24-v26` junto con los originales F1 de `v14`, empaqueta `AppBundle.zip`, recompila el `FoamLensDesktop.csproj` original .NET 8/WinForms/WebView2 y lanza **el EXE nativo real** mediante `--smoke-test`.

Solo guarda prueba técnica/screenshot y un registro JSON de nombres relativos de archivos y SHA-256; **no publica** el EXE como programa para instalar, no expone datos CFD, no crea tags ni assets de distribución.

## Gates de salida: qué sí / qué no

La **integración exacta de origen + suite de regressiones + humo nativo** demuestra compatibilidad mecánica de estas ramas para evaluar formalmente el producto como un conjunto. NO demuestra por sí sola:
- Que cada control sea legible en todas las resoluciones, o que la pantalla de Windows instalada al DPI real sea visualmente agradable;
- Que metal/molde y coordenadas XYZ sean científicamente correctas en A–D para el caso **real** del propietario;
- Que comparaciones Time Series con campos faltantes, exportaciones, actualizador, firma digital y Developer Twin final estén todos validados en la misma versión estable;
- Que los once PR estén fusionados. Este ensayo se mantiene en draft, separado de `main` y de canales de distribución.

**Release:** Operación Granada **sí** puede emitir un release definitivo estable cuando todas las condiciones científicas, QA de instalación, firmas/assets y distribución estén listas. Si no, debe continuar otro bloque y guardar el obstáculo; nunca publicar RC/beta.

## Bitácora y reentrada

- 2026-10-21: elaborado ensamblador pinneado de 11 propietarios, pruebas negativas de fuente, registro en CI Windows+Ubuntu y pipeline nativo, todo en nueva rama independiente.
- Pruebas y commit de HEAD exacto: **a verificar tras ejecutar GitHub Actions**; no fingir aprobación por existir el workflow.
- Pendiente de unión: la PR #196 de cinco propietarios es un diagnóstico histórico válido, pero **no se fuerza su merge** ni se depende de él; este ensamblador reconcilia los once directamente.
- Cuando algún HEAD cambie, falla cerrado y demanda revisión/actualización consciente de las fuentes; nunca reemplazar automáticamente módulos.
