# Windows WebView2 GPU process-memory evidence — 2026-10-12

## Why this exists

Field 3D issue #40 needs hardware memory evidence for real OpenFOAM multiregion scenes. Bytes uploaded through WebGL (`fvRegionGpuPayloadStats`) and Node/.NET private/RSS usage are **not** the same thing as Windows GPU process memory or graphics-driver VRAM. WebView2 runs separate browser, rendering and GPU processes, and other applications' GPU usage must not be attributed to FoamLENS.

## Collect a real, clearly scoped observation

With an actual FoamLens.exe launched on **Windows** and a physical GPU/driver that exposes GPU Process Memory counters:

```powershell
pwsh -File tools/measure_gpu_process_memory.ps1 -RootProcessId <ACTUAL_FOAMLENS_EXE_PID>
```

The script verifies the requested PID belongs to `FoamLens.exe`, enumerates only its process descendants, and uses Windows `GPU Process Memory(*)\Dedicated Usage` and `Shared Usage` counters only for verified descendant `msedgewebview2.exe` PIDs. The JSON labels these as **per-process OS counter samples**. It reports an explicit `unavailable` and **null** bytes (not fabricated zero) when the PID/counters cannot be verified. Aggregate totals are not the graphics adapter's total VRAM, may omit driver/global allocations or shared WebView2 processes, and do not independently prove GPU rendering or correct transparency. The process tree is collected at sample time only; a changing browser process group can affect attribution.

## Tests and evidence limitations

`tools/test_gpu_process_memory.ps1` uses fixed synthetic process trees and counter rows to verify valid child attribution, foreign-process isolation, duplicate path suppression, invalid/missing counter fail-closed behavior and honest unavailable state. Windows GitHub Actions runs this test for the **exact candidate commit**. A passing synthetic fixture is **not actual GPU driver memory evidence**.

Before closing issue #40, run a real metal/mold OpenFOAM workload on identified hardware (adapter/driver/version) and capture baseline/loaded/repeated-frame/case-exit dedicated/shared GPU process counter samples alongside actual WebView2 render evidence, FPS/responsiveness and a native screenshot. Record counter availability, timing, raw JSON and hardware provenance. Also resolve intersecting per-fragment transparency separately: centroid sorting and static-frame caching alone cannot do that.

No release or numerical driver-VRAM claim is authorized by this document.
