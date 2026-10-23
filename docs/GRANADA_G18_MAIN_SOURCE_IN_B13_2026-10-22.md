# GRANADA G18 — Current-main G15+G16 source in the authentic multi-owner B13 Windows host

**Fecha de registro:** 22 de octubre de 2026 (hora de México). **Naturaleza:** prueba nativa de integración de código desde `main`, en rama **test-only** aislada, sin publicar ejecutable ni fusionar las herramientas de pruebas.

## Para qué sirve

G15 y G16 están fusionados en `main` y G17 conserva sus invariantes en Linux y Windows, pero las validaciones B13 de 36 pantallas y arranque repetido más completas se realizaron contra una rama de integración científica de múltiples propietarios. Un test de fuente por sí solo no verifica **en un mismo ejecutable nativo** que el host actual G15 del actualizador, el original Field/Play G16, las cámaras G13 y la fuente OpenFOAM científica convivan sin regresiones.

Esta prueba aprovecha la infraestructura científica B13 anterior, pero **sustituye el host C# por bytes originales del `main` actual y fija los hashes del código** antes de aplicar injertos temporales G5/G13/G14/G16 específicos del diagnóstico. Por transparencia, dicho ejecutable también contiene módulos adicionales de propietarios originales todavía no fusionados; **no es la compilación exacta distribuible de `main`**, no sirve para acreditar que la distribución final está lista.

## Contrato técnico

- SHA de inicio de `main` verificado `01e032279ce165e5d62c1d1e93371fcf52f620c6`; `Program.cs` blob original `185a71faeb70bd49c11ac06350c81833bc9343c7`. Se exige que esos blobs sigan idénticos a los del `main` vivo; si cambian, CI **falla y solicita volver a verificar**, sin sustituir código silenciosamente. Se importa igualmente el auténtico `UpdateAssetIntegrity.cs`, pruebas y arnés del actualizador G15, CSS G16 y G17.
- Se ejecuta realmente el programa .NET8 C# de pruebas adversarias del actualizador G15 y la prueba de consentimiento original **antes** de los injertos nativos de los otros propietarios. Tras ensamblarlos se corre G17 para verificar las invariantes conjuntas.
- Se mantiene el contrato anterior B13: cinco casos reales QuickCup a tiempo 9.8 s y dos regiones `metal/mold`, hashes de archivos originales, CAD/2D/3D, el Field original, siete cámaras, `playNotCollapsed` sin relajar, comprobación G16, CSS compacta G7 forzada a 1140px de forma temporal, 36 capturas y dos arranques adicionales por variante. Cada arranque valida por separado procedencia científica y PNG físico. El binario exacto de Installed/Portable debe tener el mismo hash.
- La rama **no** inserta el simulador OpenFOAM en otras apps, no copia los datos privados de QuickCup a `main`, no publica archivos de fuente física, no altera el código de producto y no hace una release.
- Una ejecución nativa verde prueba **compatibilidad del host actual G15/G16 dentro de ese entorno compuesto**, pero no certifica el binario exclusivo de `main`, el actualizador con descarga de red real, Authenticode/SmartScreen, escalado físico 125/150/175/200%, la aprobación estética de las 36 capturas o exactitud numérica experimental. Esos pasos permanecen abiertos.

## Evidencia anterior no sustituible

La reproducción original de G16 con CSS compacto forzado ya pasó realmente en [#39893531580](https://github.com/michels-lab/FoamLens/actions/runs/39893531580), 4/4 trabajos, cuatro reinicios adicionales auténticos y 36 imágenes. La seguridad G15 tiene [CI C# #39890025152](https://github.com/michels-lab/FoamLens/actions/runs/39890025152) y build Windows [#39890025095](https://github.com/michels-lab/FoamLens/actions/runs/39890025095). G17 dual OS [#39895691342](https://github.com/michels-lab/FoamLens/actions/runs/39895691342) es verde. **Ninguno reemplaza el resultado de G18**.

## Estado y política de integración

Esta rama es una prueba; nunca fusionarla a `main`. El estado de su propia ejecución de GitHub y los registros por binario/viewport deben consultarse antes de declarar ningún PASS. Queda pendiente la verificación directa del instalador exclusivo del `main` exacto y el resto del checklist de release estable. Nunca beta, RC o tag sin cumplir estos requisitos.
