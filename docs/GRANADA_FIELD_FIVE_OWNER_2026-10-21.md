# FoamLens — GRANADA, cinco propietarios Field/3D y auditoría (21 oct 2026)

## Objetivo

Integrar en una **copia efímera, no en main**, cinco desarrollos actualmente independientes, conservando sus SHA exactos, los controles originales de usuario y la prioridad de los datos científicos. Esta revisión nace de la petición expresa de Michel: arreglar la interfaz de **Field/3D y todas las pestañas**, sin añadir más botones encima del problema ni considerar verde un release que no ha sido instalado.

## A. Bloqueo encontrado y solución separada

La PR [#195](https://github.com/michels-lab/FoamLens/pull/195) obtuvo CI verde en su workflow G2 aislado, pero el workflow **completo** [Windows run 39603768184](https://github.com/michels-lab/FoamLens/actions/runs/39603768184) falló en `test-suite-manifest.test.cjs`. El error real fue:

> `desktop/tests/granada-177-g2-field-source-dock.test.cjs must run exactly once in build-foamlens-desktop.yml; found 0`.

No fue un error demostrado del motor científico ni del renderizado Field, sino un incumplimiento de la política *todas las pruebas .test.cjs aparecen exactamente una vez en la suite obligatoria*. Se corrigió en la **propia rama #195** mediante un único paso del workflow nativo, antes de `Test CI suite manifest`. Commit: `0321ab308cc88271d0bcd912eee5e772082c686b`. No se editó el código científico de otro propietario. **La nueva ejecución nativa es una verificación separada**, no se debe dar por verde si todavía no concluyó.

## B. Nuevo bloque de composición G2/G5 (esta PR)

`tools/granada_field_five_owner_composite.cjs` crea **solamente en el checkout de CI** una composición de cinco PR con SHA de origen fijos:

| PR | Propiedad exclusiva | Código probado |
| --- | --- | --- |
| #162 | F1 regiones metal/molde en A–D y XYZ de origen físico | v14 Field + compare, pruebas de regiones |
| #175 | F2 tamaños de viewports/medidas de rectángulos y DPI | módulo v24 Field F2 y dos pruebas |
| #179 | Ribbon G0/G1 y auditoría de controles | módulo v24 original y dos pruebas |
| #194 | Comparador de evidencias G5 | Node CLI, 16 casos negativos/positivos |
| #195 | Barra de cámaras Field G2 | módulo v25 original, controles conservados y teclado |

El compositor verifica todas las referencias `refs/pull/#/head` contra SHA exactos antes de obtener fuentes; revisa que los archivos esperados sean nuevos o preexistentes; preserva `Program.cs` y `index.html`; impide sobrescribir un archivo creado por otra rama; detecta sintaxis y colisiones léxicas en los módulos `v24/v25`; y emite un registro JSON de hashes y propietario **sin rutas privadas ni muestras OpenFOAM**. No altera los PR fuente, no genera tag ni release.

**Punto especialmente importante:** F1 #162 modifica dos archivos `v14` originales. Su sustitución solo se permite en el checkout efímero cuando los archivos de la base coinciden byte a byte con la referencia base; si main cambia el código científico, se aborta. `Program.cs` conserva la prueba anterior de Mesh Auditor y NO se reemplaza por la versión de ningún PR.

Para evitar el error de manifiesto de #195, el compositor registra en el workflow temporal de Windows ambas nuevas pruebas `.test.cjs` (F1 y G2) exactamente una vez. Esto **no cambia** el workflow original en la PR de composición ni en main.

## C. Pruebas y gates

`tools/granada_field_five_owner_composite.test.cjs`: 12 grupos de pruebas de composición, integridad, fuente pinneada, colisiones, rutas y errores/reintentos. `.github/workflows/granada-field-five-owner-integration.yml` ejecuta:

1. Ubuntu + Windows: manifiesto original intacto, 12 verificaciones negativas del compositor, importación de cinco propietarios, manifiesto temporal completo, tests originales F1/F2/G0/G2/G5, cámaras, multivista y ownership de Field.
2. Windows: empaquetar los módulos originales en `AppBundle.zip` **solo temporal**, compilar el host WinForms/.NET 8/WebView2 existente y ejecutar `FoamLens.exe --smoke-test`.
3. Guardar únicamente informes de fuente/hashes y capturas técnicas, **sin redistribuir ejecutables, instaladores, fixtures privados ni case trees**.

CI deberá confirmar sus resultados por separado. Los tests automatizados **no equivalen** a aceptación estética, ni prueban una escena real B–D con metal/molde/tiempo/cotas correcta.

## D. Pendientes / reentrada

- Resolver los fallos reales que arroje esta composición, nunca falsificar evidencia ni eliminar tests.
- Ejecutar el caso físico real con al menos dos regiones en A–D y verificar fuente/proveniencia, compatibilidad entre campos/regiones, unidades y cotas XYZ.
- Probar **Setup y Portable instalados** a 1024/1280/1920 y Windows DPI 125/150/175/200%, con screenshots comparables antes/después.
- Integrar #181 (Time Series), #183 (Data/Analysis), #180 (Review/Live), #184 (Export) y módulos de CAD solo en una siguiente composición con propietario/orden fuente explícitos. No mezclar sin gates.
- Solicitar revisión visual del propietario antes de aprobar cambios perceptibles. Mantener #177 abierto hasta aceptación completa.
- Estado separado obligatorio: *código en rama* ≠ *tests verdes* ≠ *composición CI* ≠ *PR mergeada* ≠ *release* ≠ *aceptación física*.

**Ninguna orden Granada, por sí sola, autoriza publicar una versión.**
