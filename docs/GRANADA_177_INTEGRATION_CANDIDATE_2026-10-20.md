# GRANADA GRANDE — integración controlada G0–G6, rama candidata SIN MERGE

**Fecha:** 2026-10-20  
**Branch:** `feat/granada-177-integration-candidate-g0g6-20261020`  
**Issue principal:** [#177](https://github.com/michels-lab/FoamLens/issues/177)  
**Regla:** no se fusiona, no genera release, no cambia la versión 1.8.10, no reescribe ramas fuente, no inventa resultados científicos.

## Problema que resuelve

Los sucesivos PR de Granada pasaron pruebas por separado, pero **no es lo mismo ejecutar los módulos juntos en el mismo proceso**. FoamLens Desktop inserta los archivos `frontend/v*-*.js` ordenados en la **misma IIFE** de `index.html`; una colisión léxica, un selector duplicado, botones movidos simultáneamente o una actualización de rama entre builds puede romper el resultado aunque todos los CI individuales estén verdes. El estándar exige una integración reproducible y capaz de detenerse cuando falta la evidencia.

En vez de forzar un merge de PRs con bitácoras y planes modificados simultáneamente, se crea un **candidato temporal en la máquina CI**.

## A — Ensamblaje funcional reproducible y no destructivo

El manifiesto `tools/granada_composite_manifest.json` declara propietario, SHA completo y **lista blanca exacta de archivos** para siete PR fuente:

| PR | Función | SHA fijado |
|---|---|---|
| #175 | Field F2: alturas y auditoría DPI | `18cc6462f671f3138a9581326ccf6d76a3af528d` |
| #179 | G0/G1: jerarquía Ribbon y controles originales | `9840252445c4a8b5a26a2ab53db6edc38575eded` |
| #180 | G4: navegación real Review/Live | `62c807f37b26b3dad70fc440c60c223455aef89d` |
| #181 | G3: Time Series sin duplicar generadores | `0b46e9049656f9f61c0ce89bd21965ec05447997` |
| #182 | G5: revisión visual de capturas nativas | `a23df3e238056857137b3b0885b8325780aed9de` |
| #183 | G2/G3: Data y Analysis | `1901bf7e58a0be2e066eb5c0b8ea4a7231fab6f1` |
| #184 | G6: validación previa de fuentes de Export | `5ca1a6788bcca9fbd0eeb2afaa6a47ed3e5e5d7d` |

El programa `tools/granada_composite_candidate.cjs` obtiene **el HEAD real de cada PR** desde `refs/pull/N/head`, exige que sea el SHA fijado, hace `git fetch` en refs temporales y lee solo los archivos permitidos con `git show SHA:path`. Nunca hace checkout de esos PRs en el workspace, cherry-pick, push, merge ni invoca acciones de release.

Primero se leen y se validan en memoria TODOS los módulos: rutas permitidas, propietarios únicos, origen, bytes no vacíos, tamaño máximo, compilación individual y **compilación JS combinada en el mismo scope léxico de la IIFE nativa**, respetando el orden alfabético que aplica `Program.cs`. El overlay escribe los archivos únicamente si no existían, con modo exclusivo, y elimina parciales si una escritura falla. Los archivos originales de `index.html`, Ribbon, Analysis, dual Time Series, Field, Compare, multipanel y Video se comparan por SHA256 antes/después.

Si un PR evoluciona, se bloquea el staging hasta actualizar el manifiesto de forma consciente: **no se sustituye silenciosamente por código distinto**.

## B — QA combinada de los 7 propietarios en Ubuntu y Windows

`tools/test_granada_composite_candidate.cjs` cubre **10 grupos de pruebas negativas**, sin network y con fuentes simuladas declaradas explícitamente como pruebas:

- Pertenencia y versión exacta, listados/propietarios y orden;
- Integridad de archivos originales y ausencia de publicación;
- Validación read-only `--verify-only` sin escrituras;
- PR HEAD cambiado;
- Ruta ya ocupada;
- Fuente faltante o sintaxis corrupta;
- Conflicto `const` entre módulos cargados en la misma IIFE;
- Traversal, archivo no permitido y archivo perteneciente a otro agente;
- Manipulación de SHA, duplicados o bandera de release;
- Symlink hacia afuera de la raíz del candidato.

El CI añade **9 suites originales de los siete PR** (Field F2, Ribbon global, Review/Live, Time Series, G5, Data/Analysis y Export) y **12 regresiones del main original** (ownership, Ribbon, sidebar, Analysis, 2 variables temporales, fuentes, plots, Field comparado/multirregión, Review, Export reproducible, manifest de suites). Se ejecutan con los **seis módulos frontend coexistiendo físicamente** y los scripts de G5 copiados sin alterar repositorios ajenos.

Cada runner entrega el reporte JSON con los 7 SHAs exactos, orden real de inyección, SHA256 de cada archivo, integridad de originales y gates pendientes. No contiene datos experimentales ni binarios.

## C — Compilación nativa WebView2 del conjunto

El job `native-host-smoke` vuelve a verificar y ensamblar los siete HEADs en **Windows**; construye `AppBundle.zip` con el `index.html` original, los `v*-*.js` incluyendo los seis nuevos, assets originales y licencia. Compila el .NET Windows Forms/WebView2 original y ejecuta `FoamLens.exe --smoke-test` con timeout. Guarda exclusivamente *evidencia* y matriz de procedencia; **no publica el ejecutable como descarga, no genera Setup/Portable firmado, no crea tag y no dispara el workflow de release**.

Los casos experimentales multi-región de QuickCup asociados a secretos de CI no forman parte del manifiesto. Este humo native **no sustituye** las pruebas científicas con archivos CFD reales, ni test instalado Setup/Portable, ni aprobación estética.

## Gate de salida y orden de integración

1. El CI exacto del PR integrador debe pasar en Ubuntu, Windows y en runtime WebView2. Si falla, el error se registra en este PR y en #177; corregir en rama de integración si afecta al ensamblador, y pedir cambio al PR dueño si el error es de su módulo.
2. Verificar con un caso OpenFOAM real multirregión: metal/molde A–D, escalas y tiempos físicos, dos variables de Time Series, Data vs Analysis, Review/Live y Export 2D/3D sin resultados inventados. El candidato no incluye aún la rama Field F1 #162, ni CAD #164 ni los grandes bloques de ciencia #165–#174.
3. Validar capturas nativas en **1024/1280/1920 px y Windows 125–200% DPI**, controles siempre visibles, sin recortes, usando la matriz G5 de 36 slots para las superficies principales; `captured` no significa `approved`.
4. Preparar una estrategia de cherry-pick/merge controlada y evitar conflictos en `docs/GIT_AUDIT_LOG.md` y el roadmap; mantener ownership original hasta revisión de cada dueño.
5. Solo tras QA, permiso explícito y aprobación del propietario: integración formal y, aparte, release. Mientras tanto `main` permanece intacto y la versión pública sigue 1.8.10.

**Estado inicial de este documento:** infraestructura implementada en una rama aislada. Éxito de CI, build nativo, evidencia científica y aceptación estética son resultados separados que deben citarse **solo después de verificarlos**.
