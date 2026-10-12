# Packaged Windows GPU counter observations — 2026-10-12

FoamLENS' protected Windows GitHub Actions smoke workflow launches both the actual **portable executable** and the **installed Setup executable** with the real OpenFOAM QuickCup test case. For each new process, `tools/capture_packaged_gpu_smoke.ps1` records a clearly labeled **initial-launch** Windows `GPU Process Memory` counter diagnostic and uploads it alongside the candidate's native screenshots, Setup/Portable SHA-256 binaries and EULA/installation evidence.

The two JSON files are `artifacts/foam-gpu-portable.json` and `artifacts/foam-gpu-installed.json`. Every capture identifies its exact workflow checkout SHA, Portable/Installed variant, actual host PID, UTC time and measured dedicated/shared OS process counters. Missing/unsupported GPU hardware, absent WebView2 processes, or a process that exited early yield `status: unavailable` and **null** amounts, never fabricated 0 MB.

**Important scope limitation:** This snapshot is taken just after launching the executable. The QuickCup smoke may still be loading or rendering. Therefore it is **not** a validated *loaded large-case VRAM peak* or a final hardware acceptance; repeated loaded/playback/unloaded readings require the separate `tools/capture_gpu_memory_series.ps1` script on an identified physical GPU, alongside WPR/WPA where appropriate.

`tools/test_packaged_gpu_smoke.ps1` checks source/runtime/stage provenance and the null-on-unavailable rule during CI. Actual Windows smoke still must succeed independently even when GPU counters are unavailable. The new diagnostic does not modify UI, OpenFOAM data, release tags, updater feeds or installed binaries.
