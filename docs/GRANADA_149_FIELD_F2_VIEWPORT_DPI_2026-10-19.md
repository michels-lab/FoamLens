# Operación Granada #149 — Field F2 viewport sizing and observed DPI/layout evidence

**Date:** 2026-10-19. **State:** isolated candidate, not merged/released. Owner's public v1.8.10 layout stays unchanged until approved. Issue [#149](https://github.com/michels-lab/FoamLens/issues/149) remains open.

## Existing functionality audited; not duplicated

- Existing `v14-z-field-compare.js` already mounts four real editable Field viewports A–D with separate source selectors (Case/Field/Region/Component), independent or linked camera zoom, drag reorder and WebGL renderers; their original DOM/canvas IDs and camera/source state are preserved.
- Existing `v18-context-help-resize.js` already resizes the **Field/plot Split divider** with mouse drag and persists `foamlens.fieldWorkspace.ux.v2`. It must remain independent of per-viewport sizing.
- Existing original `fvRender`, `fcScheduleLayoutRender` and per-view ResizeObservers resize GPU framebuffers based on actual CSS bounds and `min(devicePixelRatio,2)`. New code calls only the established layout redraw.
- Existing Field uses a `fcViewportScene` for 3D canvas, overlays, legend and dimensions and a separate `fcViewportCaption` for source labels. This candidate does not undo the separation by moving labels back over data.

## New functionality in independent versioned extension

`desktop/src/FoamLensDesktop/frontend/v24-field-f2-viewport-layout.js` mounts in the existing native WebView2 bundle automatically.

1. **Each actual visible Field viewport A, B, C, D** (also the separate Δ difference view) gets its own small controls: **− Height**, **+ Height**, **Maximize/restore**, **Reset**. A horizontal drag grip supports pointer resizing and keyboard ArrowUp/ArrowDown/PageUp/PageDown/Home; these controls do not replace the existing camera controls, source selectors or drag-reorder handles.
2. Per-view CSS height is clamped between **340 px** and `min(1050px, 82% of current CSS window height)` when the viewport permits it. Heights are stored under a **new isolated localStorage key**, independent of the old Field Split/camera/source state. A new/switching panel uses its own remembered height. An active maximization is **transient** to avoid persisting a focus state that can hide panels when a comparison is disabled.
3. Maximize temporarily shows only the chosen originally eligible Field viewport in the existing grid, spanning the whole grid width, without changing selected source, camera, physical time, mesh, legend content, playback or OpenFOAM case. Switching compare/difference restores ordinary visibility, and per-view view selection is still owned by Field.
4. Additional scoped overlay safe-zone CSS moves physical XYZ dimension labels below the time badge and constrains legend/scales and measurement widths so they have their own regions at compact CSS widths. It does not alter the Ribbon, public themes, original Field physics or source assets.
5. An optional **Viewport size / DPI audit** in the Field card measures only the **CURRENT ACTUAL DOM geometry**: CSS window dimensions, `devicePixelRatio`, optional visual viewport scale, real `canvas` CSS bounds, current WebGL backing-buffer size, overlays and scroll extents. It reports observed overlapping overlays, overlays extending outside their scene, clipped labels and temporary backing-buffer mismatch separately. Results can be explicitly exported as **local anonymous JSON** with view IDs and geometric measurements, no actual OpenFOAM values, case paths, source names, screenshots or network upload.

## Evidence boundaries

- A unit test of synthetic DOM rectangles at 1024, 1280 and 1920 **physical pixel scenarios** and simulated DPR 1.0–2.0 is *arithmetic testing*, NOT true Windows native visual acceptance at 125–200% scaling.
- Measured live DOM rectangles give concrete evidence **only for the actual displayed scale and browser CSS width** at capture time. A clean 1280px screenshot/measurement is not proof a 1024px high-DPI monitor is clean.
- The collision detector is a source-neutral geometry diagnostic, not a computer-vision judgment, and it never establishes scientific accuracy of XYZ units, OpenFOAM values or physical scales.
- Overlay isolation is a partial design guard; it is possible that additional toasts, Ribbon, transformed graphics or device-specific fonts require a separate native review.
- The new module does not implement different physical X/Y/Z camera measurement choices or overlay source controls in incomplete Field #162; it only guards their panel geometry. CAD native STEP/IGES branch #164 also remains independent.

## Dedicated candidate testing

- `desktop/tests/field-f2-viewport-layout.spec.cjs`: viewport identity and height bounds, rectangle intersection/containment, source overlay collision/clip recognition, pixel backing buffers under synthetic DPR and screen sizes, native module contract, and no mutation of Field cameras or OpenFOAM cases.
- **Unchanged existing regression suites**: `field-multiview-ux.test.cjs` (independent A–D zoom, dragging), `context-help-resize.test.cjs` (Split layout and help), `physical-3d-scale.test.cjs` (Field dimensions/scale), `test-suite-manifest.test.cjs`.
- Dedicated `.github/workflows/granada-field-f2-dpi.yml` runs tests on Ubuntu and Windows; standard PR Windows build additionally checks existing native regression, Setup/Portable and OpenFOAM fixture when available. CI **must be checked at the exact candidate SHA** before declaring green.

## Still outstanding under #149

Real owner-installed Windows **Setup and Portable** viewport captures/measured UI at 1024/1280/1920 physical windows at 125%, 150%, 175% and 200% OS scaling; verify all A–D with two material regions, labels/legend/axis marks, actual drag/keyboard and maximization, camera orbit/zoom/reorder, probe markers and playback under high DPI. Repair any actual defects found and record case-safe location-specific audit evidence. UI design approval and final release/version bump are not authorized by CI.

**Parallel work skipped:** #162 Field F1, #164 CAD, #165 2D/3D, #166 Energy, #167 Thermocouple, #168 Case Health, #169 Phase/Momentum, two competing #153 front PRs #170/#171, #172 performance, #173 Developer and #174 scientific Mesh Auditor; no edits to any of those branches or shared monolithic native files.
