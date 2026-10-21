# OPERACIÓN GRANADA — G5: 36 capturas reales de Setup + Portable en FoamLens

**Fecha:** 21 de octubre de 2026  
**Base de código:** PR #191 @ `59df1fdea1f9f7310d0c71e973b3e86cab90552e`  
**Rama de trabajo:** `feat/granada-177-g5-all-native-workspaces-20261021`  
**Estado:** auditoría INTERNA de la interfaz Windows. Sin merge, sin RC/pre-release y sin publicación.

## Avance anterior verificado sin extrapolación

El [CI #39537728010](https://github.com/michels-lab/FoamLens/actions/runs/39537728010) del PR #191 **terminó exitosamente 4/4**. En Windows se ejecutó la aplicación REAL con el QuickCup B13 importado; Portable y Setup Inno instalado pasaron por separado Field F1 con regiones metal/molde a tiempo 9.8, View B y ejes físicos XYZ. El instalador, los ejecutables, las capturas, los SHA, EULA, accesos directos y la desinstalación fueron probados con los archivos reales del runner, sin publicar ejecutables. Evidencia: [artefacto #12318598250](https://github.com/michels-lab/FoamLens/actions/runs/39537728010/artifacts/12318598250).

El G5 original documentaba **16/36 capturas presentes**, insuficiente para juzgar cinco áreas relevantes. No se consideran aprobadas otras pestañas por el mero hecho de haber compilado la app.

## Paquete A — captura real de las cinco áreas que faltaban

`tools/granada_g5_native_capture_host.cjs` integra SOLO en el **host de Windows compuesto temporal de CI** un método original C# `CaptureGranadaExtraNativeTabsAsync()`. Su inserción es aditiva y protegida por invariantes que conservan el auditor Mesh y Field F1. No altera los PR científicos ni `main`:

- **Time Series:** abre el botón de navegación Data y el tab original Time series, comprueba cambio real de modo y tab activo.
- **Field Compare / 3D:** activa Field, llama al controlador legítimo `FoamLensFieldWorkspace.setLayout('split')`, exige split activo y un canvas físico visible. No inventa curvas.
- **Analysis, Review y Live:** abre los controles originales de la app y comprueba el modo, encabezado y viewport real.
- Corre dentro de la **misma app B13 ya importada**, después de las evidencias científicas de metal/molde y antes de terminar el smoke.
- Dos viewports reales WebView2 (1140×820 y 640×900), en **Portable y en Instalado**. Resultado esperado: 5 áreas × 2 tamaños × 2 distribuciones = **20 PNG adicionales**.
- Cada error de navegación o estado bloquea el job; no se sustituyen fallos por screenshots estáticos ni se crean datos de campo sintéticos.

Esta medición de UI no certifica que existan datos de probes, series temporales, audit log o curvas de recalescencia: una pestaña puede mostrar correctamente su estado sin datos. Se requiere auditoría humana posterior.

## Paquete B — manifiesto SHA de 36/36 imágenes sin inventar slots

`tools/granada_g5_append_native_captures.py` conserva el manifiesto original y sus 16 imágenes principales; exige los 20 nuevos PNG en disco, dimensiones válidas, tamaño no trivial, contenido PNG verificable y ausencia de imágenes binarias idénticas entre pestañas del mismo viewport. Los vincula al SHA256 de **Setup real**, **Portable real** y del commit; no reemplaza una captura con la de otra app ni permite capturas ausentes. Deja explícitamente `human_visual_approved=false`, `release_authorized=false` y `release_candidate_created=false`.

El `granada_packaged_parity_gate.py` sigue verificando que **ambos ejecutables** corrieron el mismo QuickCup B13 original metal/molde y que el EXE instalado coincide con Portable. El auditor original [G5 de PR #182](https://github.com/michels-lab/FoamLens/pull/182) recibe el manifiesto completo y en modo estricto debe reportar exactamente **36/36 CAPTURED · REVIEW REQUIRED**, estado `REQUIRES_HUMAN_REVIEW`, jamás aprobación automática.

Se añadieron `tools/test_granada_g5_native_capture_host.cjs` (6 pruebas) y `tools/test_granada_g5_append_native_captures.py` (8 pruebas) que deben pasar en CI: identidad de controles, propiedad del host, bytes PNG originales, SHA, duplicados, fuente errónea, captura faltante y prohibición de afirmaciones de release.

## Gate pendiente y siguiente etapa

- [CI G5 36/36](https://github.com/michels-lab/FoamLens/actions/runs/39595655524): consultar resultado sobre el HEAD exacto; si un modo original no activa su UI o la captura falla, **resolver la causa real y revalidar**. No declarar las 36 pruebas completadas antes de CI verde.
- Capturar 36 PNG **no equivale a aprobación estética de Michel**; revisar jerarquía, tamaño/posición de botones, solapes, navegación, mensajes de error, 3D y lectura de datos reales.
- Los viewports CDP **no equivalen a DPI físico de Windows**. 125 %, 150 %, 175 % y 200 % deben medirse en runner/instalación de forma separada; no falsificar esa cobertura ajustando `deviceScaleFactor`.
- Exactitud física de OpenFOAM frente a experimentos metalúrgicos (incluida recalescencia), compatibilidad STEP/IGES, reconciliación final del updater y autorización de merge/release siguen pendientes.

**Regla global del propietario:** no hay Release Candidates, RC ni pre-releases de ninguna clase. Las compilaciones internas de este workflow existen solo para auditoría; el siguiente release de FoamLens será directamente definitivo cuando Michel autorice y todos los gates estén cerrados.
