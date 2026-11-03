# FoamLens Granada #150 — capturar checkMesh original sin alterar el caso

Estado: **herramienta local de adquisición; sin certificación científica, sin release**. No convierte un log artificial o las estadísticas de `blockMesh` en evidencia de `checkMesh`.

El caso real B13 de la familia QuickCup contiene `constant/metal/polyMesh` y `constant/mold/polyMesh`, pero **no se identificaron reportes originales** `checkMesh -region metal/mold` entre los registros revisados. La app ya reconoce en los logs tanto encabezados `Region:` como los marcadores emparejados `Exec : checkMesh -region...` y `Create polyMesh ... for time = ...` (incluida la forma `Create mesh`). La coincidencia es evidencia declarada de texto, no vinculación criptográfica con la malla.

## Uso, en una terminal con OpenFOAM activado

```bash
python3 tools/granada150_capture_checkmesh.py \
  --case /ruta/a/tu/caso/OpenFOAM \
  --output /ruta/externa/nueva/foamlens-checkmesh
```

Se detectan **todas** las regiones por `constant/<region>/polyMesh`; no presupone metal/mold. Para seleccionar regiones explícitas:

```bash
python3 tools/granada150_capture_checkmesh.py \
  --case /ruta/a/tu/caso/OpenFOAM \
  --output /ruta/externa/nueva/foamlens-checkmesh \
  --region metal --region mold
```

El script exige cinco ficheros físicos `points/faces/owner/neighbour/boundary` por región. Ejecuta **`checkMesh -case ... -region ... -allTopology -allGeometry`**, sin ejecutar solver, sin `-writeSets` y sin escribir datos desde el script en el caso original. Rechaza directorios de salida dentro del caso, regiones inexistentes/duplicadas, sobrescritura y ausencia de OpenFOAM. Conserva stdout de cada ejecución en su archivo local exacto, stderr separado y un manifiesto de SHA-256 (stdout + cinco ficheros originales por región antes/después). Comprueba exit code, `Mesh OK.`, ambas señales de identidad y ausencia de cambios en esas cinco fuentes. Si falla un caso, continúa con las demás regiones e indica el bloqueo en el manifiesto. Un conjunto incompleto **no equivale a PASS**.

En FoamLens, abrir **Analysis → Multi-region checkMesh Evidence Matrix** e importar **solo** `checkMesh_<region>.log` de esta carpeta. El manifiesto sirve para auditoría manual y **no acredita una asociación criptográfica verificada dentro de la app**.

**Confidencialidad:** los logs originales pueden incluir rutas del ordenador, hostnames y metadatos del caso. Este comando trabaja solo localmente; nunca subir los logs/manifest al GitHub público ni compartirlos sin revisión y consentimiento. El output debe estar fuera de los repositorios.

## Pendientes reales del issue #150

No ejecutado ni certificado en esta operación: checkMesh original sobre la máquina del propietario, interfaz metal/molde y pairing de caras, recomputación geométrica independiente de `polyMesh`, validación de coordenadas reales de defectos, binding criptográfico dentro de FoamLens, revisión física Windows Installed/Portable y DPI 125–200%, criterios de release #238.

**Pruebas automatizadas:** `python tools/test_granada150_capture_checkmesh.py` usa fixtures sintéticos y dobles de proceso, valida errores y no invoca `checkMesh` real. Nada de eso se reporta como validación CFD.
