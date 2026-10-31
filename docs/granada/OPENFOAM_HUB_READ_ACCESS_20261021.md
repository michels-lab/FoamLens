# Granada — registro de coordinación opcional OpenFOAM
Fecha: 2026-10-21 · Alcance: documentación de gobernanza y trazabilidad; **no** release.

## Resultado técnico
Un repositorio privado de coordinación OpenFOAM — PROJECTS puede leer por ruta y commit SHA documentación y **archivos fuente textuales públicos** de FoamLens para obtener evidencia de compatibilidad, cambios y trabajo pendiente. Su auditoría conserva hashes y estados, no el código fuente ni datos de usuario en reportes.

Se verificó lectura de README, AGENTS, gobierno, bitácora de ingeniería, infraestructura, plan CAD/Field, manual Developer Twin y pruebas de desarrollador/auditoría de malla.

## Límites de producto
- FoamLens sigue siendo un visor/editor científico **genérico e independiente**; QuickCup no es requisito para instalar ni ejecutar la app, ni lo es el hub.
- El hub no compila, ejecuta, publica ni actualiza FoamLens y no tiene permiso de escritura sobre este repositorio mediante GitHub Actions.
- Los resultados científicos y su validación residen en el productor del caso; FoamLens no puede declarar una validación física por parsear un archivo.
- Los PRs CAD, UI/Windows y Developer activos quedan intactos y sujetos a su QA, CI, integración y aceptación propias.
- No añadir URL privada del hub ni token a este repositorio público.

## Continuidad
La nueva cola del hub recopila PR/issue abiertos para facilitar coordinación sin asignar prioridades definitivas. Se conservan como fuentes de verdad `docs/GIT_AUDIT_LOG.md`, `docs/INFRASTRUCTURE_AUDIT.md`, `MICHELS_LAB_PROJECT.md` y planes vigentes. Cualquier modificación futura a la app requiere PR propio con pruebas reales.
