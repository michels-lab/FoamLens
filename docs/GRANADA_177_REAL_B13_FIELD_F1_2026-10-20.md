# Operación Granada Grande — caso real OpenFOAM B13, Field F1 y View B

**Fecha:** 2026-10-20  
**Issue general:** [#177](https://github.com/michels-lab/FoamLens/issues/177)  
**Rama:** `feat/granada-177-real-openfoam-fieldf1-qa-20261020`  
**PR:** [#190](https://github.com/michels-lab/FoamLens/pull/190), derivado del candidato de host científico [#189](https://github.com/michels-lab/FoamLens/pull/189).  
**Estado:** candidato experimental, **sin merge, release, certificación científica ni aprobación estética**.

## Qué problema cerramos

El smoke nativo de #189 compiló bien la suma de Field F1 #162, CAD STL/OBJ #164, observables 2D/3D #165 y los 16 propietarios científicos/UX, pero **no importó un caso OpenFOAM físico real**. Por tanto, el camino que valida Field View B, sus capas metal/molde y los ejes físicos XYZ quedó sin ejecutarse. Las suites DOM y las comparaciones con datos sintéticos no prueban que las dos regiones aparezcan en el mismo WebView2 real.

## Entregable 1 — Preparación de QuickCup B13 medido, sin valores inventados

El workflow `.github/workflows/granada-177-real-openfoam-field-f1.yml` utiliza exclusivamente un **push de rama propietaria** para acceder con el secreto existente a `realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13`, con `sparse-checkout: cases_controlled_buoyancy`.

La herramienta `tools/granada_prepare_real_openfoam_b13.py` exige en el original, al menos, `constant/metal/polyMesh` y temperaturas originales `0/metal/T`, `0/mold/T`, `9.8/metal/T`, `9.8/mold/T`. Copia sin modificar datos a cinco identidades: `SmokeCase_A`, `SmokeCase_B`, `SmokeCase_C`, `SmokeCase_Asymmetric`, `B13_prghPressure_airGapOF14`, con verificación SHA256 de los archivos medidos.

El fixture privado real contiene **enlaces simbólicos**: se resuelven como archivos normales solo si apuntan a datos dentro de la raíz original; enlaces a directorios o fuera de ella quedan excluidos y contabilizados. No se exfiltran rutas externas. El único cambio físico deliberado es **eliminar** `SmokeCase_Asymmetric/9.8/mold/T`; se conservan metal 9.8 y molde 0 para detectar una interpolación o inferencia de tiempo no válida. El manifiesto de procedencia registra los SHA256 originales, las copias y las omisiones, y no declara resultados científicos aprobados.

El job de prueba verifica el caso original con `desktop/tests/openfoam-integration.test.cjs` y transfiere la copia medida a Windows en un artefacto **de un día**. Sin autorización del repositorio privado la CI **falla**; nunca marca el caso como validado por omisión.

## Entregable 2 — Host original Windows, 16 propietarios y Field F1 real

El job Windows recompone exactamente la misma integración de [#189](https://github.com/michels-lab/FoamLens/pull/189): 16 fuentes fijadas por SHA, 15 módulos de interfaz científicos/UX, las implementaciones originales Field F1 y un `Program.cs` reconciliado que conserva `FoamLensMeshAuditor`, y añade pruebas CAD/2D-3D sin eliminar su smoke previo.

El `FoamLens.exe --smoke-test` nativo recibe obligatoriamente:

- `FOAMLENS_SMOKE_OPENFOAM_CASE` apuntando a los **archivos medidos descargados**, sin URL externa durante importación.
- `FOAMLENS_SMOKE_EXPECT_REGIONS=metal;mold`, `FOAMLENS_SMOKE_REGION=metal`, `FOAMLENS_SMOKE_FIELD=T`, `FOAMLENS_SMOKE_TIME=9.8`, `FOAMLENS_SMOKE_MIN_FIELD_SPAN=1`.
- `FOAMLENS_SMOKE_MIN_CASES=4`, cambio de `SmokeCase_A` a `B13_prghPressure_airGapOF14`, y caso `SmokeCase_Asymmetric`.

Así se ejecuta la prueba que #162 añadió **dentro** del flujo de caso real multirregión: capa secundaria/molde cargada en View B, mismo caso que la escena base, coordenadas X/Y/Z y ejes dibujados en el viewport. El resultado y el fallo pertenecen al caso físico; un arranque vacío no satisface este contrato.

## Entregable 3 — Evidencia nativa y compuertas de aceptación

`tools/granada_real_case_native_gate.py` verifica el manifiesto SHA, la ausencia real de temperatura de molde asimétrica, la presencia de nueve mensajes científicos específicos (incluyendo View B XYZ, WebGL metal/molde, Mesh Auditor original, CAD, comparador 2D/3D, tiempos asimétricos y carga OpenFOAM B13) y una captura `field-real-multiregion.png` válida, con dimensiones y hash PNG.

Las pruebas negativas `tools/test_granada_prepare_real_openfoam_b13.py` y `tools/test_granada_real_case_native_gate.py` utilizan **fixtures sintéticos declarados exclusivamente como tests** y rechazan rutas inseguras, fuentes ausentes, descargas sobreescritas, unidades/inferencias no demostradas y logs sin View B real. Los tests que solo comprueban formato son complementarios: **la prueba científicamente pertinente depende del WebView2 real importando datos QuickCup**.

La salida guarda reportes y PNG de la sesión WebView2, no genera instaladores, APK, release, etiquetas Git o actualizaciones automáticas.

## Límites explícitos y pendientes

- Si la CI del caso nativo todavía corre o falla, **no afirmar que View B real pasó**: distinguir preparación de datos, pruebas DOM/código, build y ejecución física.
- Incluso con Field B real verde, no significa validación de magnitudes frente a curvas experimentales, recalescencia o predicción térmica de austenita hipoeutéctica.
- `STEP/IGES/BREP` y generación CAD volumétrica todavía no se implementan por este bloque; CAD STL/OBJ no implica unidades físicas confirmadas.
- Falta instalación **Setup + Portable** verificada con caso real y pantallas completas 1024/1280/1920, escalado Windows 125–200%; revisión visual de Michel.
- Integración formal en `main` y creación de release solamente con autorización explícita. El producto público queda en su versión anterior.

**Bitácora de dependencia:** #189 → #190; priorizar comprobación nativa B13 real, después revisión visual de todos los workspaces y reconciliación final del pipeline de distribución.
