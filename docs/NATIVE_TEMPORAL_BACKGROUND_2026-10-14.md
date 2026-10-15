# Native temporal parser: off-dispatcher execution (2026-10-14)

## Performance and responsiveness defect

FoamLens already used a worker for heavy ASCII volume field decoding, but the native `parseTemporalFile` request directly awaited the asynchronous cache+streaming parser inside the WinForms WebView2 message event. `ReadLineAsync` resumes on the calling synchronization context, so per-line tokenization and vector magnitude math can congest the UI dispatcher on large time-series files. It is **not** guaranteed that async I/O means CPU parsing runs off the UI thread.

## Correction

Execute `NativeTemporalCache.GetOrParseAsync` and its real `ParseTemporalFileAsync` callback within `Task.Run(..., operation.Token)` for the temporal request. All SHA-256 checks, parser output precision, probe metadata, on-disk cache validation, streaming progress and cancellation retain the existing implementation and file token boundary. Existing `Post` marshals replies to the UI with `InvokeRequired/BeginInvoke`. Upstream `loadFiles` already limits concurrent parse requests.

The regression inspects the **actual production temporal handler**, ensuring it uses the background task and still keeps cancellation/cache integration. Release gates require the .NET 8 Windows build and real installed/portable/QuickCup smoke. This change aims to maintain interactivity; **it does not claim a measured reduction in the owner's 184.8-second total import**. Owner cold/warm real-case timings remain open in issue #117.
