# Operación Granada — comprobación interna de Setup + Portable con QuickCup B13 real

**Fecha:** 2026-10-20. **Repositorio:** michels-lab/FoamLens. **Base:** PR #190 (QuickCup real + 16 PR de interfaz/ciencia + Field F1/CAD). **Rama:** `feat/granada-177-installed-portable-real-b13-qa-20261020`.

## Nueva regla obligatoria de Michel (todos los repositorios)

**No existen Release Candidates ni versiones RC en ningún proyecto.** Solamente compilaciones/artefactos temporales de auditoría que nunca se distribuyen, y después, cuando todos los gates y el usuario lo permitan, **el release definitivo directamente**. La política está vigente en `michels-lab/Michel-Software-Standards/standards/RELEASE_PROTOCOL.md` y `GLOBAL_RULES.md`.

No crear `vX.Y.Z-rcN`, pre-release, canal beta/RC ni publicar un instalador de prueba en Releases. El **Inno Setup interno de este bloque no es una versión publicable**: el runner lo usa y lo destruye al terminar. Se guardan **únicamente evidencias** para evaluación.

## Motivo técnico

El PR #190 ya pasó prueba WebView2 nativa con los datos **reales** `QuickCup B13`, regiones `metal` y `mold`, tiempo 9.8, View B XYZ y captura física PNG. Pero el éxito de `desktop/src/FoamLensDesktop/bin/Release/...` no garantiza que la **compilación auto-contenida de Portable** o el **instalador real Inno Setup** incluyan correctamente los mismos activos y el host reconciliado. El release público exige validar **ambos métodos de distribución**.

## Entregable A — dos binarios reales privados del runner (sin release)

`tools/granada_installed_portable_b13.ps1`:

1. Lee el `granada_b13_manifest.json` privado, exige cinco identidades reales y regiones válidas. No genera ni reemplaza datos físicos.
2. Usa `dotnet publish --self-contained true -p:PublishSingleFile=true`, ejecuta el **FoamLens.exe Portable real** con `FOAMLENS_SMOKE_OPENFOAM_CASE`, campo T a tiempo 9.8, `FOAMLENS_SMOKE_EXPECT_REGIONS=metal;mold`, variante asimétrica y captura de View B.
3. Usa el **Inno Setup .iss original** y la **misma carpeta publish**, instala de verdad en una ruta aislada sin icono de escritorio, exige uninstaller real, comprueba que el EXE instalado tenga SHA256 idéntico al portable y repite la misma prueba OpenFOAM real como ejecutable **instalado**.
4. Ejecuta validación original de wizard/EULA, tareas de accesos directos y limpieza con desinstalación real. Rechaza timeout, logs faltantes y restos del ejecutable tras desinstalar.
5. Mantiene los binarios solo en `artifacts/granada-installed-portable/temporary-build/` dentro del runner efímero. **El workflow NO los sube, etiqueta, publica ni convierte en RC**.

## Entregable B — dos auditorías científicas nativas independientes y paridad SHA

El mismo `granada_real_case_native_gate.py` debe aprobar por separado `installed` y `portable`, cada uno con nueve evidencias exactas del host original, incluida importación física QuickCup metal/molde, View B, ejes XYZ, WebGL, tiempos asimétricos, auditor mesh, CAD, observables equivalentes, un PNG no vacío y su SHA.

`tools/granada_packaged_parity_gate.py` compara después que:

- **ambos** ejecutables hayan pasado físicamente QuickCup B13, y el caso, las regiones, el tiempo y los logs de evidencia sean los mismos;
- EXE instalado y Portable real sean bytes equivalentes por SHA256;
- la captura de cada pantalla corresponda al **binario real** (Setup para instalado, EXE para portable) y al mismo commit de fuente;
- existan las **16 capturas originales** de Home/About/Data/Field, dos tamaños (wide/compact) y dos tipos de distribución;
- no se certifique falsamente exactitud científica, revisión visual humana, escalado físico DPI ni release.

Once pruebas unitarias negativas en `tools/test_granada_packaged_parity_gate.py`: instalación simulada, falta de View B, EXE distinto, artefacto de otro commit, capturas duplicadas/missing, fuente científica distinta, falsa aprobación o publicación. Estas pruebas usan bytes sintéticos **exclusivamente para contrato**, no para validar el producto.

## Entregable C — evidencia G5 que no oculta los faltantes

`make_visual_evidence.py` y `visual_release_gate.py` canónicos crean/validan capturas ejecutadas en **Portable e Instalado**, con OpenFOAM real y PNG multirregión separados, más hashes del binario exacto.

El G5 estricto exige **36 slots**: nueve áreas (**Home, About, Data, Field, Time Series, Field Compare/3D, Analysis, Review, Live**) × wide/compact × Installed/Portable. El host actual captura físicamente 16 slots principales, más `About-bottom` y los PNG de metal/molde. **No se pueden presentar 16/36 como 36/36**. `tools/granada_prepare_g5_review_manifest.py` conserva About-bottom en el manifiesto original, pero omite solamente esos cuatro suplementos del grid principal, sin inventar otros archivos. `tools/granada_visual_review.cjs` (PR #182, fuente original ya presente en el manifiesto de 16 PR) genera un HTML/JSON que debe mostrar honestamente qué workspaces faltan. Se ejecutan seis pruebas negativas adicionales.

**No se ejecuta el release workflow** y no hay un evento que cree tag o Release.

## CI y criterio de aceptación

`.github/workflows/granada-177-real-openfoam-field-f1.yml` en esta rama recibe el caso privado solo por push autenticado, construye el host integrado exacto, corre regresiones Windows/Ubuntu y casos reales, y **después** ejecuta la comprobación física instalada/portable. El artefacto remoto retiene únicamente logs, manifiestos, capturas y auditoría G5; no ejecutables, instaladores ni caso privado como adjunto final.

Hasta verificar el commit exacto, las compuertas se registran como **pendientes**. CI positivo no sustituye:

- 20 slots visuales restantes (Time Series, Field Compare/3D, Analysis, Review, Live);
- escalas DPI reales del sistema operativo Windows **125 %, 150 %, 175 %, 200 %**; cambiar la emulación de viewport no equivale al DPI físico;
- revisión estética del propietario de todas las pestañas, accesibilidad/foco, espacio suficiente para controles;
- validación científica cuantitativa de T y recalescencia frente a curvas de laboratorio;
- confirmación de updater y procedimiento de merge a `main` sin conflictos, autorización final expresa.

**Siguiente bloque grande**: capturar 20 slots adicionales desde la app Windows real y auditar 125–200% DPI; después integrar y lanzar solo release definitivo.
