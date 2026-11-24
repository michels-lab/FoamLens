# FoamLens — Plan maestro de implementación 2.0
2026-11-24 | Prioridad del propietario: CAD/malla y capacidades científicas de ParaView por encima de Data/Analysis genérico y optimización de rendimiento.
Estado: hoja de ruta de trabajo, no entrega funcional. Sustituye el orden de ejecución anterior, no borra sus requisitos, issues ni evidencias.

## Baseline y control de alcance
- Latest release comprobado: v1.8.23, https://github.com/michels-lab/FoamLens/releases/tag/v1.8.23 ; main inicial afab8fe1dfa15ea73bc9118313ac37672a898c6b.
- Hitos del plan anterior: 8/15=53% verificados (fuente/CI/release según cada hito), no aceptación científica/visual final. Conservar .michelslab/project-progress.json y sus evidencias; no trasladar el porcentaje al alcance ampliado.
- 13 PR abiertos al inicio; #381 CAD actual con diseñador cartesiano parcial; #380 Analysis aplazado; #373 postrun CSV, #372 Time Series y #371 integración Field conservados. No abrir otro PR funcional mientras el freeze de >12 lo impida; continuar dueño existente, reconciliar duplicados por diff sin perder código. No reabrir trabajo terminado por mera existencia de este documento.
- Se definen 10 macro-bloques y 36 entregables trazables. Estado inicial de cada paquete es una clasificación conservadora de trabajo, no un nuevo porcentaje certificado. Las capacidades existentes/parciales se amplían, no se reescriben. Para el porcentaje V2, inventariar evidencia por paquete y contar exclusivamente los aceptados bajo el criterio propio; hasta esa auditoría, publicar N/D V2 junto a 8/15 histórico.
- Fuente funcional previa: docs/DEVELOPMENT_PLAN_FIELD_REGIONS_AND_CAD_2026-10-19.md; bloque 3 detallado: https://github.com/michels-lab/FoamLens/blob/fbece59671f08602edafb81e4bc102b3e968f5e7/docs/CAD_MESH_PRIORITY_2026-11-24.md ; MasterProject POSTPROCESSING_FIELD_GUIDE_ES.md, NEXT_RESEARCH_ROADMAP_ES.md, casos C3D-04/05 (solo lectura). Referencia de filtros: https://docs.paraview.org/en/latest/UsersGuide/filteringData.html

## Matriz de ejecución
Estados: M = mantenimiento/base disponible, P = parcial/candidato o función existente con brecha, N = nueva capacidad o alcance por demostrar, D = diferido. No significan aceptado. P0 prioridad inmediata, P1 siguiente, P2 posterior.

| ID | Entregable | Estado | Aceptación observable |
|---|---|---|---|
| 1.1 | Field A–D: casos/regiones, variables, cámaras y relojes independientes/vinculados | M | B14/C14 reales, selectors correctos, ausencia de datos explícita, sin glitches ni pérdida de estado. #145 |
| 1.2 | Layout arrastrable, split 3D/perfiles, velocidad visible, leyendas y DPI | M | Mantener orden, canvas y controles reales tras resize, reinicio y cambio de fuente. #149/#177 |
| 1.3 | Recuperación de importación, unidades/tiempos y fuente original | P | Casos completos/parciales, sin ceros inventados ni relabel; #372 y #371 reconciliados sin reintroducir fallos. |
| 2.1 | Data: catálogo, tags y tablas de fuentes | P | Cada fuente mantiene caso/región/asociación/unidad/tiempo y se puede filtrar/exportar. |
| 2.2 | Scientific Case Health, logs, postrun CSV y evidencia | P | #380/#373 reconciliados; reportes independientes por caso, no validación implícita. #155 |
| 2.3 | Review/Live y navegación contextual | P | Alertas y diagnósticos de datos escritos, sin confundir monitor con ejecución/validación; #177. |
| 3.1 | Diseñador blockMesh: bloques, vértices, grading, arcos, patches y zones | P | #381: importar original curvo de C3D-04, editar/preview sin aplanar sintaxis y exportar plan con unidades y limitaciones. |
| 3.2 | CAD STEP/IGES/STL/OBJ/BREP y mediciones | P | Importar, medir y seleccionar superficies/aristas, conservar fuente/unidades/ensamble; kernel native si se valida. #147 |
| 3.3 | Visor polyMesh y selección nativa | N | points/faces/owner/neighbour/boundary; IDs por región, centros, superficies, cortes y conectividad; sin inventar topología. #150 |
| 3.4 | Calidad de malla y localización | P | Métricas/sets originales de checkMesh, histograma y selección vinculada a celda/cara; valores ausentes explícitos. C3D-04 basal/transiciones. #150 |
| 3.5 | Gmsh HEX8, grupos, interfaces y contacto | N | C3D-05: preservar grupos y regiones, pareo geométrico con área/normales, discrepancias y cobertura; no suponer conformalidad. #148 |
| 4.1 | WSL/edición OpenFOAM y staging local | N | Detectar Foundation v14 y otras ediciones por separado; confirmar rutas, preview de comandos, cancelación, logs y aislamiento. |
| 4.2 | blockMesh, checkMesh y surfaceCheck nativos | N | Ejecutar explícitamente en staging; conservar logs/sets y distinguir plan de malla real, no auto-run. #148/#150 |
| 4.3 | Gmsh, snappyHexMesh, splitMeshRegions y export | P | Pipeline versionado, nombres de patches/cellZones/regiones, preservar original, gate por herramienta; no asumir interfaces. |
| 4.4 | Case Builder y ejecución opt-in | N | Inspeccionar diccionarios materiales/BC/time, preparar copia, comando y directorio explícitos, monitor/progreso/cancelación; no alterar física ni iniciar solver por defecto. |
| 5.1 | Slice/Clip/Threshold/Contour/Extract Selection | P | Reusar Field; planos/ROI XYZ, selección enlazada a tabla/gráfica, distinguir recorte/interpolación de datos nativos. |
| 5.2 | Table to Points, XYZ y evidencia de cara/celda | N | CSV genérico, q por cara/área, bandas Y, filtros y origen documentados; no deducir malla de nube. |
| 5.3 | Resample With Dataset / comparación espacial | P | Mallas distintas, cobertura común, tolerancia/unidades/asociación explícitas, sin restar por índice ni extrapolar. #154 |
| 5.4 | Vectores, glyphs, streamlines y particle paths | P | Distinguir líneas instantáneas de trayectorias transitorias; tiempos reales y terminación fuera del dominio. |
| 5.5 | Probe, Plot Over Line y Plot Selection Over Time | P | Múltiples sondas/variables y regiones en coordenadas físicas, vinculación opcional, interpolación explícita. #146 |
| 6.1 | Integrate Variables, Calculator, Gradient y Temporal Statistics | P | Pesos reales por volumen/área, unidades, cobertura, media muestral vs temporal, integrales de tiempos irregulares. |
| 6.2 | Solidificación: fracciones, frente, arrival time | P | alphaL nativo y 1-alphaL, umbrales explícitos, volumen/fase ponderados; no recalescencia inferida. #153 |
| 6.3 | Térmico y energía: sensible/latente, q e interfaces | P | Balance regional condicionado por fuentes, signos/normales, W vs W/m², sin duplicar energyFlux; incertidumbre temporal. #151 |
| 6.4 | Momentum y convección | P | Darcy, flotación, presión, gradientes, magnitudes/correlación; denominadores próximos a cero y fuentes explícitas. #156 |
| 6.5 | Contracción y superficie libre | N | Solo cuando existan campos/mesh motion/VOF/densidad compatibles; evolución volumen/interfaz y cobertura, no confundir alphaL con VOF. |
| 7.1 | Termopares XYZ, experimental y curvas de enfriamiento | P | Coordenadas, unidad, tiempos, sensibilidad; RMSE/MAE/bias sin extrapolación. #152 |
| 7.2 | Comparación física 2D/3D y B/C | P | Observables equivalentes, masks, condiciones, dimensiones y tiempos; no igualar modelos distintos. #154 |
| 7.3 | Materiales y trazabilidad JMatPro / validación científica | N | Importar tablas reales rho/Cp/k/L, composición/CE/S y rangos; documentar interpolación, no inventar propiedades ni certificar modelo automáticamente. |
| 8.1 | Pipeline Browser, presets y sesiones | N | Fuente->filtro->selección->gráfica; guardar/reaplicar por huella de fuente, detectar dependencias y fuentes faltantes. |
| 8.2 | Research export: tablas, figuras, video y formatos | P | Reusar export actual; CSV/JSON y gráficas con unidades, tiempo, fuente y parámetros; VTK/VTU/VTP condicionado al formato. |
| 8.3 | Informe de caso y comparación reproducible | P | Reporte local trazable de malla, campos, métricas, experimental y limitaciones; no confundir reporte con verificación. |
| 9.1 | UX integrada de CAD/Mesh/Field/Analysis y accesibilidad | P | Árbol contextual, visor central, propiedades plegables, sin paneles duplicados, sin scroll horizontal forzado. |
| 9.2 | Aceptación Windows/Developer y casos reales | P | Setup/Portable, DPI, About, actualizaciones, aislamiento Developer y aprobación propietario; regresiones relevantes. #131/#158/#177 |
| 9.3 | Releases estables y cierre de pendientes | M | Exact-main, hashes, publicación oficial y actualización, sin RC; conservar evidencia física pendiente y resolver PR por diff. #238 |
| 10.1 | Index/cache y rendimiento con 3008+ archivos | D | Benchmark real cold/warm, memoria, latencia y exactitud. #117; diferido por decisión del propietario. |
| 10.2 | Escalabilidad masiva y GPU/worker | D | Solo tras funcionalidades prioritarias; benchmarks y preservación numérica; no usar como bloqueo de otros avances. |

## Orden de Operaciones Granada (no orden numérico)
- G-A (ahora): 3.1 + 3.3 + 3.4: CAD/malla nativa, selección y calidad. Continuar #381 o su sucesor, no cambiar Field salvo bloqueo P0. Resultado usable: abrir dict/malla, inspeccionar y localizar defectos.
- G-B: 3.2 + 3.5 + 5.2: CAD/STEP/Gmsh/CHT y nube XYZ. Resultado: comparar contacto y q espacial de C3D-05 sin reejecutar CFD.
- G-C: 4.1–4.3: WSL y mallado nativo seguro. Resultado: preparar y verificar malla en staging; 4.4 después de esos gates.
- G-D: 5.1 + 5.3–5.5 + 8.1 base: workspace de filtros y selección vinculada, comparación entre mallas, sondas y pipeline reutilizable. 1.1–1.3 son base/mantenimiento, no otro bloque interminable.
- G-E: 6.1–6.4 + 7.1/7.2: ciencia de solidificación y calor, flujo y comparación. Reusar módulos v13/v14/v24 y #151–#156. 6.5 y 7.3 dependen de datos reales.
- G-F: 4.4 + 6.5 + 7.3 + 2.1–2.3: completar preparación/monitor y evidencia, sin asumir aceptación física. #380 aplazado hasta disponibilidad/orden; no abandonar.
- G-G: 8.1–8.3 + 9.1–9.3: análisis reproducible, UX transversal y entrega final. Releases estables pueden salir en hitos funcionales previos con gates del producto; no esperar al final de toda la hoja de ruta.
- G-H: 10.1–10.2 solo cuando propietario reactive rendimiento.

## Casos de aceptación / fronteras
- B14/C14 2D: perfiles y curvas, T/U/p_rgh/alphaL, momentum, energía, diferencias; usar tiempos y fuentes originales.
- C3D-04 A: blockMesh curvo/multibloque, inspección defectos y regiones; separar malla/CFD/validación.
- C3D-05 B: STEP/Gmsh HEX8 y pares de interfaz, q(y,t), transferencia metal/arena; distinguir T0 numérico de física y solidificación verificada.
- Contracción: fuentes reales específicas, no sustituir con alphaL. Experimental: termopares y JMatPro suministrados/validados por investigador.
- Datos locales y proyectos del usuario no se suben a terceros; MasterProject no se edita desde FoamLens sin orden. No nuevas dependencias de pago.

## Seguimiento y definición de terminado
Cada GRANADA cubre 3–6 paquetes relacionados si viable; no dedicar una operación solo a pruebas/documentación cuando haya código disponible. No saltar gates de publicación. Reportar ID, estado pendiente/código/CI/integrado/publicado/aceptado, SHA y siguiente paso. Si un paquete espera CI, datos locales o hardware, aparcarlo con punto de reentrada y seguir independiente. No reabrir antiguos QA-only sin necesidad ni eliminar código único. Mantener .michelslab/project-progress.json para el master: baseline 8/15 y roadmap V2 separado, sin redefinir denominador de manera silenciosa. Validación manual agrupada por flujo funcional. Mantener UI contextual y no romper baseline v1.8.23.
