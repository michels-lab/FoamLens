# Windows WebView2 GPU process-memory evidence — 2026-10-12

## Why this exists

Field 3D issue #40 needs hardware memory evidence for real OpenFOAM multiregion scenes. Bytes uploaded through WebGL (`fvRegionGpuPayloadStats`) and Node/.NET private/RSS usage are **not** the same thing as Windows GPU process memory or graphics-driver VRAM. WebView2 runs separate browser, rendering and GPU processes, and other applications' GPU usage must not be attributed to FoamLENS.

## Collect a real, clearly scoped observation

With an actual FoamLens.exe launched on **Windows** and a physical GPU/driver that exposes GPU Process Memory counters:

```powershell
pwsh -File tools/measure_gpu_process_memory.ps1 -RootProcessId <ACTUAL_FOAMLENS_EXE_PID>
```

The script verifies the requested PID belongs to `FoamLens.exe`, enumerates only its process descendants, and uses Windows `GPU Process Memory(*)\Dedicated Usage` and `Shared Usage` counters only for verified descendant `msedgewebview2.exe` PIDs. The JSON labels these as **per-process OS counter samples**. It reports an explicit `unavailable` and **null** bytes (not fabricated zero) when the PID/counters cannot be verified. Aggregate totals are not the graphics adapter's total VRAM, may omit driver/global allocations or shared WebView2 processes, and do not independently prove GPU rendering or correct transparency. The process tree is collected at sample time only; a changing browser process group can affect attribution.

## Known Windows counter limitations

Microsoft documents a Windows 10 GPU Process Memory counter defect in which a process's reported dedicated usage may climb when resources are flushed/re-created, even without equivalent actual adapter allocation (Microsoft KB 4490156: https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/gpu-process-memory-counters-report-wrong-value). On affected devices, confirm memory with Windows Performance Recorder / Windows Performance Analyzer (WPR/WPA) or appropriate adapter tools, and disclose the operating-system build, device and driver. Even a successful sample from this script is diagnostic, **not** an independently verified total graphics-driver VRAM value.

## Tests and evidence limitations

`tools/test_gpu_process_memory.ps1` uses fixed synthetic process trees and counter rows to verify valid child attribution, foreign-process isolation, duplicate path suppression, invalid/missing counter fail-closed behavior and honest unavailable state. Windows GitHub Actions runs this test for the **exact candidate commit**. A passing synthetic fixture is **not actual GPU driver memory evidence**.

Before closing issue #40, run a real metal/mold OpenFOAM workload on identified hardware (adapter/driver/version) and capture baseline/loaded/repeated-frame/case-exit dedicated/shared GPU process counter samples alongside actual WebView2 render evidence, FPS/responsiveness and a native screenshot. Record counter availability, timing, raw JSON and hardware provenance. Also resolve intersecting per-fragment transparency separately: centroid sorting and static-frame caching alone cannot do that.

No release or numerical driver-VRAM claim is authorized by this document.

## Timestamped repeated-sample capture

For an actual imported multi-region OpenFOAM case on identified Windows GPU hardware, keep the FoamLens.exe PID alive with the target case displayed and run:

```powershell
pwsh -File tools/capture_gpu_memory_series.ps1 -RootProcessId <ACTUAL_FOAMLENS_EXE_PID> -Samples 10 -IntervalSeconds 2 -OutputPath evidence/gpu-loaded.json
```

Capture **a separate baseline** before loading the large case, a loaded steady frame, a camera-rotation/scrubbing window and after unloading, each with clear case size/physical region names and adapter/driver provenance. Each JSON retains UTC timestamps, verified WebView2 child process counts, individual dedicated/shared usage counter values and an explicit `incomplete` status if even one point could not be measured. Delta and peak are reported only from observed valid counter snapshots; a missing point must not become 0 MB or a fake growth trend.

This is a Windows **per-process counter series**, NOT adapter-total VRAM, application-exclusive driver allocation or definitive leak proof. Microsoft KB 4490156 warns that some Windows GPU Process Memory counters can be wrong; corroborate suspicious trends using WPR/WPA on affected hardware. The regression tests in GitHub Actions use **synthetic inputs only** and must not be presented as actual GPU hardware measurements.

## Guard against WebView2 subprocess restarts (2026-10-12)

Windows GPU Process Memory counters are attributed to individual `msedgewebview2.exe` processes, not to a permanent unique FoamLENS allocation. If WebView2 restarts a renderer/GPU process while a large OpenFOAM case is loaded, comparing the first sample with the last can create **false evidence of a memory leak or a memory reduction**, even when both numbers were valid OS counter readings.

`Get-FoamGpuSeriesSummary` therefore preserves independently observed per-process snapshot totals and peaks, but calculates `deltaDedicatedBytes` **only if all samples are valid, every WebView2 descendant has a dedicated counter reading, and the observed WebView2 PID set is identical throughout the capture**. A restart, partial coverage, missing PID metadata or an unavailable counter produces `deltaDedicatedBytes: null`, with explicit `topologyStable`, `coverageComplete` and `deltaEligibility` fields. For such cases, perform a fresh capture after process stabilization. Process ID reuse and shared WebView2 infrastructure remain measurement limitations; for definitive memory evidence corroborate with Windows Performance Recorder/Analyzer and adapter/driver diagnostics.
