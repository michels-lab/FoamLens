# Field 3D — capability-gated WebGL2 weighted blended transparency
Date: 2026-10-12

## Scientific / visual motivation

Two physically independent translucent OpenFOAM regions can intersect in image space so that the front-to-back order changes **within** a triangle. A centroid-sort is one order per primitive and cannot handle that. This feature implements a bounded **weighted blended order-independent transparency approximation** (McGuire/Bavoil method family) on devices with WebGL2 and the necessary float render targets. It is explicitly **not exact** per-fragment visibility, depth peeling, nor an assertion that physically correct absorptive transport/refractive effects have been reconstructed.

## Eligibility and protected fallback

- Operates only if the visible scientific surface scene is **fully translucent** and has at least one independently loaded physical secondary region; scenes with any depth-writing opaque surface stay on the existing correct shared-depth path.
- Requires WebGL2, `EXT_color_buffer_float` and `EXT_float_blend`. Unsupported GPU/software contexts use the pre-existing bounded CPU triangle sorter and per-region camera-axis fallback. A failure during weighted drawing restores the primary program, GL depth mask and blending state, clears a partial composite if needed and deactivates the path.
- Uses existing already-uploaded measured OpenFOAM vertex and field-color buffers. No fabrications, mixing values between regions, additional giant CPU sorting or duplicate vertex geometry. Two bounded textures are used: RGBA16F weighted color+alpha and R8 revealage.
- GPU offscreen allocation budget: **9 bytes per pixel** (8+1) plus a tiny quad buffer, subject to a hard **2560×1440** pixel limit. This is a theoretical texture-storage budget, **not measured driver VRAM**.
- The saved alpha/sorting path remains available for opaque scenes, WebGL1/unsupported extensions and allocation failures.

## Validation

The production helper regression exercises a mocked WebGL2 device with two physical translucent sources and verifies accumulation/revealage/blended composite passes, bounded target sizes, fallback for opaque scenes and missing capabilities, GL depth-state restoration and commutativity of the modeled weighted compositing operation. The real Windows packaged smoke now records whether weighted OIT was activated on the imported OpenFOAM metal/mold field, the actual driver extension support, estimated scratch texture budget and disabled reason. It does **not** turn an unsupported CI GPU into an invented OIT PASS.

Exact-head Windows/QuickCup, native screenshot/EULA/installer validation and the packaged real multiregion smoke must pass before merge. Post-release human visual review and additional physical-GPU crossed-polygon screenshots are required before describing this approximation as visually sufficient on a particular GPU. The OpenFOAM large-scene GPU process/adapter evidence remains separately tracked as issue #40.

## Background sources

- Khronos `EXT_float_blend`: https://registry.khronos.org/webgl/extensions/EXT_float_blend/
- McGuire & Bavoil, weighted blended order-independent transparency: https://jcgt.org/published/0002/02/09/paper.pdf

No release/tag is created by this candidate.

## Native crossed-surface pixel regression (new candidate)

To distinguish the already-passed native *two constant-depth* overlap test from a genuinely **intersecting** polygon pair, the packaged Windows smoke now constructs two GPU-only synthetic triangles with identical projected XY and opposite Z gradients: red A has z=[−0.5,+0.5,+0.5], blue B has z=[+0.5,−0.5,−0.5]. They swap which surface is nearer across the projected triangle. This diagnostic does **not** change the imported metal/mold measured arrays or physical time.

On an offscreen 64×64 native WebGL2 context with the float color/blend extensions, it calls **the actual production `fvDrawWeightedOit` function** using a dedicated canvas and known camera. It reads 8-bit RGBA pixels at two covered positions after rendering red-first/blue-second, then reverses the source draw order without changing physical Z or colors. The candidate demands **nonblank, overlapping red/blue colors**, GL error 0, and at most 8 levels/channel absolute change between orders. A supporting Node regression protects this native smoke's actual source wiring and restoration of original OpenFOAM state. The path is optional on unsupported GPU devices; the smoke records unsupported rather than claiming a GPU PASS.

This demonstrates **source-order independence of the approximate weighted blend on two crossing triangles**, if actual native CI reports supported+PASS. It does not demonstrate exact far-to-near alpha colors for each pixel, realistic refraction, driver-total VRAM, or hardware behavior beyond the exercised WebView2 context. Real-large-case GPU memory and manual visual review remain independent tasks of issue #40.

## 2026-10-12 follow-up — GPU lifetime and frame-local diagnostics

The merged weighted-transparent path has two independently testable lifecycle obligations beyond correct crossed-surface colors:

1. **Inactive scene release:** when the physical viewport becomes opaque, hides all eligible transparent surfaces, lacks the required capability or switches to an unsupported size, previously allocated RGBA16F/R8 offscreen scratch targets must be freed. The 9-bytes/pixel estimate measures expected texture storage only; it is not physical VRAM utilization. These textures must not remain resident just because the same renderer stays alive.
2. **Failure cleanup and provenance:** if either accumulation/revealage or composite drawing fails, the production renderer must disable any enabled vertex attributes, release its temporary targets, restore its saved program/depth/blend environment and return to the existing fallback. A successful weighted frame must reset the previous sorted-batch active flag; the real packaged OpenFOAM smoke must reject a scientifically impossible claim that both mutually exclusive paths rendered the same frame.

New source-executed regressions cover a simulated GPU draw exception, allocated texture deletion, restoration after a new valid draw, switching to an opaque field, frame-local telemetry and the native smoke invariant. Exact-head Windows portable + installed WebView2, QuickCup, EULA, shortcuts and screenshot gates are still mandatory before integration. This change does not create measurements on the owner's actual GPU or justify closing issue #40.
