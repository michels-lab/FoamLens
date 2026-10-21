# Operación Granada — auditoría de aplicación e integraciones ChatGPT

**Corte de evidencia:** 2026-10-21 UTC. **Tipo:** auditoría documental de árbol/README y últimos GitHub Actions consultados, NO prueba funcional en hardware, cuenta de cliente, ni validación completa del ejecutable. 

**Regla de costo:** usar primero las herramientas ya instaladas en ChatGPT Plus y los servicios existentes; **no contratar suscripciones extra**, activar facturación, subir de plan, comprar dominio ni desplegar sin autorización. Un plugin de ChatGPT no se incorpora automáticamente al código de la aplicación. “Instalado en ChatGPT” no prueba sesión activa, permisos o servicio operativo. [Bitácora central de ocho conectores instalados](https://github.com/michels-lab/Michel-Software-Standards/blob/main/docs/CHATGPT_PLUGIN_LEDGER.md). No guardar tokens ni datos de usuarios en documentación pública.

## Alcance y frontera
**FoamLens** es la aplicación de postprocesamiento/visualización científica. Puede importar resultados de OpenFOAM, pero no es el repositorio de simulaciones `MasterProject` ni el hub privado `OpenFOAM---PROJECTS`. No copiar aquí decisiones personales ni funciones de InstaCleaner/LouderMe.

## Conectores y servicios: decisiones por proyecto
| Herramienta | Condición comprobada | Aplicación real / cautela | Decisión |
| --- | --- | --- | --- |
| **GitHub (ChatGPT)** | Instalado/habilitado y usado | CI Windows, informes, issues, PR y release gate | USAR; no dependencia de runtime |
| **Google Drive** | Instalado/habilitado | Organizar matrices de experimentos e informes fuera de la app, con permiso; no añadir importación automática no especificada | OPCIONAL |
| **Spreadsheets** | Instalado/habilitado | Analizar tablas exportadas/comparación simulación-experimento fuera de FoamLens; preservar procedencia, unidades y series | OPCIONAL |
| **Documents** | Instalado/habilitado | Redactar validaciones y reportes científicos desde evidencia comprobada | OPCIONAL |
| **Supabase** | Instalado en ChatGPT, sin backend requerido verificado en este repo | No asumir necesidad de cuentas, base de datos o servidor para visualizar campos locales | NO AGREGAR por defecto |
| **Gmail / Calendar / Contacts** | Instalados en ChatGPT | Gestión externa de investigación, no función propia del visualizador | NO AGREGAR al producto |
| **Vercel / hosts pagos** | Sin despliegue/conexión verificados | No reemplazar Windows Desktop/archivos OpenFOAM con hosting nuevo | NO CONTRATAR |

**OpenFOAM es un entorno CFD, NO un plugin de ChatGPT.** La importación de datos no demuestra que un campo físico, variable, malla o condición exista; jamás fabricar variables para una gráfica.

## Últimas comprobaciones consultadas
- [File Steward #39669374663](https://github.com/michels-lab/FoamLens/actions/runs/39669374663): SUCCESS, head `2237b525`.
- [G5 Setup/Portable 36 workspaces #39666219171](https://github.com/michels-lab/FoamLens/actions/runs/39666219171) y [#39666208518](https://github.com/michels-lab/FoamLens/actions/runs/39666208518): SUCCESS sobre el head de integración `8538c95d`. La ejecución [#39666162518](https://github.com/michels-lab/FoamLens/actions/runs/39666162518) anterior fue FAILURE en otro head.
- GitHub [releases/latest](https://github.com/michels-lab/FoamLens/releases/tag/v1.8.10) confirmó **Desktop v1.8.10 publicado como release estable el 2026-10-19**, cuatro activos (Setup, Portable, sus SHA-256), `draft=false` y `prerelease=false`; el README menciona Web v51. **Esto NO prueba que los cambios posteriores de G5/integración estén incluidos o listos para nueva publicación.** [Evaluación de release](GRANADA_RELEASE_READINESS_2026-10-21.md) deja bloqueados los criterios de aceptación para la siguiente release.

## Pendientes concretos
1. Resolver coherentemente integraciones pendientes de Field/UX, comparación multirregión A–D, campos/tiempos y trazabilidad de evidencia real.
2. Validar instaladores reales, escalas 1024/1280/1920, DPI alto, navegación y exportación sin ocultar controles.
3. Completar Time Series, Field Workspace, carga CAD/STL cuando corresponda, Developer Edition y reporte de auditoría por sección según bitácoras existentes.
4. Comprobar desempeño de importación con medición del caso real; no presentar CI sintético como prueba del lote real de miles de archivos.
5. Release **FINAL solamente** cuando pruebas y artefactos del mismo SHA estén completos; no RC, sin contratar hosting.

**Estado:** AUDITADO DOCUMENTALMENTE / v1.8.10 PUBLICADA SEGÚN GITHUB / SIGUIENTE RELEASE NO APROBADA POR ESTA AUDITORÍA. Ver [documentación de release](GRANADA_RELEASE_READINESS_2026-10-21.md) y [auditoría central](https://github.com/michels-lab/Michel-Software-Standards/blob/main/reports/2026-10-21_GRANADA_13_REPOS_PLUGIN_AUDIT.md).
