# Operación Granada #153 — un único rastreador con αL/αS y ventanas temporales

La PR #171 se reconcilia con el **rastreador original de la PR #170**. No se introduce un segundo módulo o panel con el mismo nombre. Su implementación anterior `v24-solidification-front-tracker.js` y sus pruebas históricas permanecen disponibles en el historial de Git de la PR #171, pero no se incluyen en el árbol integrado.

## Roles de fracción de fase

El usuario debe seleccionar un campo volumétrico original OpenFOAM con dimensiones `[0 0 0 0 0 0 0]`, declarar el significado físico de ese campo y confirmarlo de manera explícita. El nombre `alpha1` no es evidencia suficiente.

- **Fracción líquida original αL:** el valor original se usa tal cual.
- **Fracción sólida original αS:** solo tras confirmar su significado se normaliza como `αL = 1 − αS`.

Los valores originales se comprueban antes de convertirlos: faltantes, no finitos, menores de cero o mayores de uno se rechazan, no se recortan. Las fases sólido/pastoso/líquido y el centroide del frente usan **la misma αL normalizada**, preservando los volúmenes originales de celdas de tamaños distintos. Los resultados y archivos exportados registran `sourceRole`, `normalization` y confirmación humana, pero no certifican el modelo termofísico.

## Intervalos originales de salida

Se elige índice inicial **incluyente** y final **excluyente** sobre tiempos físicos originales, ordenados y sin duplicados. Un análisis procesa **1–120 tiempos existentes y consecutivos en el inventario**, sin interpolación, muestreo silencioso ni creación de resultados. La interfaz muestra cuántos tiempos hay y cuáles están seleccionados. El resultado exporta el total original, los tiempos seleccionados y cuántos quedaron excluidos por decisión del usuario.

Si el inventario contiene etiquetas de tiempo inválidas, o se pide una ventana fuera de rango, fraccionaria o mayor a 120, el cálculo se rechaza. Cancelar invalida la sesión y mantiene deshabilitadas las exportaciones. Cambiar rol, confirmación, índice, umbral, eje, caso o variable después del cálculo obliga a volver a ejecutarlo.

## Lo que NO comprueba

Una cara interior que cruza el umbral es una **aproximación geométrica**, no una isosuperficie física reconstruida. El desplazamiento de su centroide no equivale a velocidad local de propagación; cualquier cambio de rol entre instantáneas o tiempos faltantes inhibe su comparación. No se deducen nucleación, recalescencia, microestructura ni calidad metalúrgica. Todavía falta validar la semántica de una variable de fracción real en un caso científico apropiado, la conservación térmica y la aceptación física de Windows.

El código utiliza la carga confiable de JavaScript embebido en el ejecutable, no vuelve a habilitar módulos residuales de AppRoot. Se mantienen #153 y #238 abiertos hasta disponer de evidencia y release estable firmada. No publicar RC ni release por esta integración.
