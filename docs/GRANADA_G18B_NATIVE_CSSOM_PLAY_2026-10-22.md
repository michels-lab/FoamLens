# GRANADA G18b — inspección de CSSOM durante fallo original de Play en Installed

**Fecha:** 22 de octubre de 2026 (México). **Rama:** prueba nativa temporal. No cambia producción ni publica un release.

## Falla confirmada y por qué no basta G16

En el [G18 original B13 instalado #39900324375](https://github.com/michels-lab/FoamLens/actions/runs/39900324375), el ejecutable compuesto con el método de actualización G15 real de `main` compiló y pasó casos OpenFOAM/Field/Camera/Play previos. Sin embargo, al ejecutar la primera validación de Installed a 1140×820 CSS px **falló el Play original**:

- Play real **70.390625×30px**, `computedMinWidth=68px`, `maxWidth=none`, `fontSize=12px`, `clientWidth=scrollWidth=68`.
- `playNativeTelemetry.checks.rectWidthAtLeast100=false` y cinco subcondiciones restantes true. `g16NativePlayAudit.result=FAIL`. `g16ForcedCompactReplay.result=FAIL`, clase compacta inicial y forzada presente, y estado original restaurado correctamente.
- G16 **sí estaba instalado** (`guardStylesheetPresent:true`); G12 y G7 también. Cámaras originales 7/7, tiempo 9.8s, metal/molde, regiones físicas y texto/ARIA intactos.
- Esta evidencia refuta la afirmación de que la corrección G16 publicada sea siempre suficiente. Su éxito anterior en cuatro reinicios, incluso bajo clase compacta temporal, no elimina esta nueva recurrencia. El selector G16 es más específico que el G7 inspeccionado, por lo que **no atribuimos el resultado exclusivamente al orden de las hojas sin medir CSSOM y estilos inline**.

## G18b: medición diferencial, nunca bypass

Se inyecta en el host C# **solo de pruebas** el objeto `g18CssCascadeProbe`, sin cambiar `ok`, `playNotCollapsed`, la regresión forzada, CSS, el DOM, física ni parámetros de OpenFOAM. Captura por cada Field a 1140/640: dimensiones reales y computed Style de Play; prioridad y valor inline de min-width; `innerWidth` versus ancho de media queries/CSSOM, `visualViewport`, documentElement y DPR; presencia de clase `#appShell.gfwCompact`; evaluación de selectores originales; reglas candidatas **G7/G12/G16** (min-width/max-width/!important, selector coincide, media condicional activo). No hay credenciales ni datos sensibles.

Pruebas unitarias positivas/negativas `tools/test_granada_g18b_css_origins.cjs` confirman que una captura de 70.390625px falla, una de 112px no, se distingue CSS media no activo y `min-width:68px !important` inline, sin efectos secundarios. El CI científico conserva **el método G15 verificado bit a bit contra `main`**, el host de fuente científica original, los mismos cinco casos físicos, cámaras, Play y 36 capturas nativas, Setup/Portable más dos arranques adicionales cada uno y gate original Field PNG de proveniencia. El binario es una **composición científica de prueba**, no un release actual de `main`.

## Qué define terminar

Leer logs reales de la siguiente ejecución: identificar si la regla G16 a 1140 tiene `mediaActive=false`, `selectorMatches=false`, si hay un inline `min-width:68px!important`, o si interviene otra regla aún sin identificar. Solo entonces proponer cambio de producto aislado, con pruebas negativas y nuevo B13 Windows instalado+portable. Aun si los ensayos pasan, exact-main-only as-shipped y resto de release siguen pendientes en [G19 #238](https://github.com/michels-lab/FoamLens/issues/238). No RC, beta ni estable antes de pasar esos controles.
