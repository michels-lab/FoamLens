# Operación Granada — Reconciliación de host Windows Field F1, CAD y observables 2D/3D

**Fecha:** 20 de octubre de 2026  
**Base aislada:** [integración científica de 16 propietarios #188](https://github.com/michels-lab/FoamLens/pull/188) @ `3f8b1546c0d111f1b366dc0d599c6c3befc8674e`  
**Rama candidata:** `feat/granada-177-native-host-field-cad-observables-20261020`  
**Main origen:** `529d7055a6d97d06d2ee4158e858de94037228d7`  
**Contrato:** NO merge, NO release, NO cambio de versión pública, NO sustitución arbitraria de fuente científica.

## Diagnóstico: dos integraciones aditivas y una regresión destructiva

Los tres PR científicos modifican el host Windows original `Program.cs`, y sus workflows principales. Los bloques originales son:

- [#162 Field F1](https://github.com/michels-lab/FoamLens/pull/162) @ `f3a74ae88200a98df846fd6d113324f67dc8ea89`: agrega una prueba **condicionada a importar un caso real con varias regiones físicas**, que verifica View B, las capas metal/molde, límites xyz métricos y líneas de ejes. También altera los dos archivos frontend originales `v14-field-view.js` y `v14-z-field-compare.js` y añade el test de regiones nativas.
- [#164 CAD](https://github.com/michels-lab/FoamLens/pull/164) @ `68f56e176e6f0ce9ac95833acb196451f9dcb35a`: agrega la prueba original WebView2 del inspector de superficies STL/OBJ, incluyendo topología abierta, unidades sin confirmar, acciones de interfaz y exportación.
- [#165 2D/3D](https://github.com/michels-lab/FoamLens/pull/165) @ `af64ef2ffd8d2f12024654986120653583f2ffcb`: agrega la comprobación original de comparabilidad dimensional, sesgo térmico con datos **sintéticos identificados explícitamente como prueba**, rechazo de incompatibilidad de unidades y ausencia de resta campo-a-campo.
- **Peligro descubierto:** la versión #162 de `Program.cs` **elimina** el bloque histórico que valida el auditor científico `FoamLensMeshAuditor` y sus controles `maPanel`, `maAnalyze`, `maExport`. No se integra esa eliminación. La regresión anterior de #174/checkMesh ya había mostrado por qué es esencial comprobar los controles reales.

## Paquete A: composición no destructiva de host con procedencia exacta

`tools/granada_native_host_composite.cjs` recupera en CI los tres HEAD vivos de GitHub y aborta ante discrepancia de SHA. Rechaza el `Program.cs` del checkout si no coincide byte a byte con el `main` fijado. Extrae **solo** los bloques nativos originales identificados por anclas únicas:

1. Verificación CAD STL/OBJ en la pantalla de lanzamiento original.
2. Verificación de equivalencia de observables 2D/3D junto a CAD, antes de la comprobación del puente WebView2.
3. Verificación Field F1 dentro del bloque de **caso físico multirregión real**, sin reclamar que una prueba sintética de lanzamiento cubra View B.

Se conserva el bloque histórico de Mesh Auditor y todos sus controles. El procedimiento genera hashes SHA256 del bloque original y los tres fragmentos fuente; deja como evidencia qué fragmentos se reutilizaron y no crea commits ni publica binarios.

Por separado, obtiene de **#162 exacto** los `v14-field-view.js`, `v14-z-field-compare.js` y `field-multiregion-views.test.cjs`. Los dos frontend originales solo se sustituyen temporalmente en el runner cuando coincide su versión de base; la prueba adicional solo se crea si no existía. No altera esos archivos en `main`, la rama Field #162 o el PR científico #188.

## Paquete B: regresiones y auditoría del Merge

- `tools/test_granada_native_host_composite.cjs`: ocho grupos negativos con fuentes marcadas como **fixtures de test**, que validan anclas originales, integridad del auditor, procedencia de los tres bloques, coincidencia de hash, prueba física condicionada, rechazo de bloques duplicados y fallo ante código fuente desactualizado.
- Workflow `.github/workflows/granada-177-native-host-integration.yml` en Ubuntu y Windows, con pruebas de #188, CAD, equivalentes, checkMesh/multipanel, fase, energía, Field F1 y actual Data/Export. La ejecución original de `test-suite-manifest` ocurre **antes** de crear el test propio de Field F1, porque `build-foamlens-desktop.yml` continúa deliberadamente en manos de sus propietarios.
- Segundo job Windows reconstruye el `AppBundle.zip` real con los 15 módulos científicos + F1 nativo, compila Forms/WebView2 .NET 8, y realiza `FoamLens.exe --smoke-test`. Conserva evidencia e inventario SHA, **no distribuye** ejecutables ni instaladores.

## Qué debe permanecer marcado como PENDIENTE

Un `--smoke-test` sin un caso OpenFOAM multirregión real comprueba el arranque, los controles empaquetados, CAD y comparaciones sintéticas de seguridad, pero **no demuestra** que View B cargue metal/molde o mida físicamente X/Y/Z. La comprobación Field F1 está ubicada en el flujo correcto y debe ejecutarse sobre su fixture real con regiones físicas.

Además siguen pendientes: conciliación formal y no conflictiva del workflow `build-foamlens-desktop.yml`; instalación Windows Setup/Portable y comprobación DPI 125–200%; importaciones reales STL/OBJ de CAD, STEP/IGES/BREP todavía no implementados; curvas experimentales metal/molde y recalescencia de austenita hipoeutéctica; validación científica exhaustiva; revisión estética de Michel y autorización de integración/release.

## Estado

En este PR se valida una **composición nativa temporal verificable**, no una fusión lista para lanzamiento. Si la CI queda verde, la conclusión permitida es: *los tres bloques originales pueden coexistir con la verificación previa de Mesh Auditor en el host Windows*. No proclamar resultados experimentales ni integración formal de `main`.
