# Granada 150 — auditoría geométrica original de interfaces OpenFOAM

Además de `checkMesh`, ejecutamos una comprobación independiente y local de las interfaces **con los archivos reales** `constant/<región>/polyMesh/points`, `faces` y `boundary`. El auditor usa nombres de regiones genéricos, no supone metal/molde y nunca lanza el solver ni modifica el caso.

```bash
python3 tools/granada150_interface_geometry.py --case /ruta/a/tu/caso
```

El resultado JSON distingue los emparejamientos geométricos de un fallo de reciprocidad, caras duplicadas o malla no conforme. Verifica pares explícitos `neighbourRegion`/`neighbourPatch`, recuentos, rangos de caras, coordenadas de vértices comparadas con tolerancia configurable, y normales contrarias calculadas por Newell. Tras inspeccionar las regiones compara SHA-256 de todos los archivos fuente observados para detectar modificaciones tardías. Admite únicamente ASCII OpenFOAM y tamaño limitado.

El fixture privado **B13** usa `metal_to_mold` / `mold_to_metal`, con 240 caras declaradas por parche. La comprobación directa original observó **240 coincidencias geométricas y 240 normales contrarias**, sin caras sueltas; la CI obliga a repetir exactamente esos datos usando los archivos fuente de la rama privada, no un ejemplo sintético. Si falta acceso al fixture, CI indica explícitamente **NO VERIFICADO**, y las pruebas sintéticas no se confunden con CFD real.

**Límites:** el algoritmo identifica interfaces conformes; AMI o acoplamientos no conformes pueden ser válidos aunque la comparación exacta falle. La cuantización a tolerancia puede causar falsos negativos cerca de los límites de las celdas de redondeo. Coincidencia geométrica NO certifica volumen/ortogonalidad, calidades `checkMesh`, transferencia térmica, conservación de flujo, BC físicas, reproducibilidad del solver ni recalescencia. `scientificValidity` se mantiene siempre `not-certified`, con `checkMeshExecuted: false`.

Las herramientas de captura original `checkMesh` y el manifiesto SHA-256 de FoamLens siguen siendo procedimientos independientes. La validación física en Windows Installed/Portable y la puerta #238 continúan pendientes.