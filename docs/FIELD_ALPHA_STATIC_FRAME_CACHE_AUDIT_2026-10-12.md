# Field 3D — static-frame transparency CPU/GPU upload budget (2026-10-12)

## Reproducible bottleneck
Native WebView2 Field rendering repeatedly calls the bounded per-triangle alpha sorter even if a displayed physical frame, camera coordinates, chosen regions, color arrays and opacities have not changed. Before this candidate, a `fvRender()` call could allocate/sort up to 65,536 triangle objects and reupload all three transparent GPU attribute buffers on every still frame or UI redraw.

## Scoped optimization
`fvDrawGlobalTransparentTriangles` caches a **single identity-and-camera signature** on the current WebGL renderer. It reuses the three existing GPU buffers and issues a fresh draw without re-sorting or re-uploading when the complete source signature is unchanged. It invalidates on physical camera coordinates, distance, yaw/pitch, source regions/order, position/color array identity, declared triangle count and opacity. The cache holds no second full sorted geometry payload; it retains only references to existing measured CPU arrays and scalar metadata. Invalid camera/depth data still fall back, and an actual GL upload exception clears this cache and disables the fast path as before.

## Source-executed evidence
- Production sorter/batch harness: 5 valid renders of the same measured source arrays with camera/opacity/color changes produced **12** total GPU attribute uploads: three on initial render, **zero on the unchanged second render**, and three each on camera rotation, region opacity change and replacement color array.
- QuickCup-scale generated-geometry regression: 23,112 transparent triangles, five draws (one cold and four unchanged warm) should produce only **three** buffer uploads totaling `23112*84=1,941,408` transferred vertex/attribute bytes on initial upload. Actual preliminary V8 execution of the production candidate returned this count; cold 61 ms vs four cached draws 0 ms in the test isolate. Those times are environment-specific diagnostics, **not FPS, real QuickCup loading latency, GPU VRAM or user hardware performance**.
- Existing synthetic million-triangle source test must continue to reject unbounded sorting.

## Validation and limitations
Node regressions, Windows native installer/UI screenshot and QuickCup CI are required on the exact candidate SHA. GPU-driver VRAM and arbitrary intersecting fragments still require actual hardware evidence and a real per-fragment OIT method; **not complete** under issue #40. This performance optimization does not alter the approved UI, OpenFOAM physical metadata, selection semantics, scientific field association or release version.
