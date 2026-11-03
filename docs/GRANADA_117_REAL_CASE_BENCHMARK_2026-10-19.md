# Operación Granada #117 — reproducible real OpenFOAM case benchmark evidence

**Candidate, not released.** The app's native persistent case inventory (`NativeCaseCatalog.cs`), scientific parsing caches, Import Performance UI export, native performance telemetry and stress regressions already exist on `main`. They are NOT rebuilt by this PR. This independent Granada provides missing reproducible, read-only **real-case input evidence** and a safe first/repeat comparison. It does not change the app's import algorithm, Windows installer or benchmark conclusions.

## Exactly what this measures

`tools/benchmark-real-case.cjs` is a Node.js 22+ CLI with only two commands: `capture` and `compare`.

- Recursively enumerates ALL regular files in the selected OpenFOAM source folder, in deterministic relative-path order. Rejects symlinks, nonregular entries, more than 250,000 files, changed files during a read, failed I/O, empty inputs and incomplete/cancelled runs. No partial successful report is written.
- **Streams and fully SHA-256 reads every file once** (bounded 256 KiB chunks) and computes a single aggregate digest of each source-relative path, original byte length and content hash. No actual source path, per-file filename or data bytes are copied into the JSON. Source kind counts are **path-classified metadata only**, not verified field semantics.
- Reports real file count, directory count, total byte count, file type mix, directory enumeration time, full read/hash time and sampled peak memory for the benchmark **Node process**. Atomic JSON writes go **outside the measured case directory**.
- Optional attachment of `FoamLens_import_performance.json`, exported by the running FoamLens desktop after a genuine case import. This carries **application-specific** first-interactive time and existing parser/UI-stage timings, distinct from source hash/scan time. Existing `tools/compare-import-performance.cjs` checks matching UI version/mode/counts when both passes have UI exports.
- `compare` refuses first/repeat comparisons unless the **full content manifest SHA-256 is identical** (and file counts, total bytes, folder counts and source classifications match). No speedup claim is made for changed input; no guessed metric for an absent UI report.

**Explicit non-claims:** The CLI does not run FoamLens, OpenFOAM, .NET/WebView2, the GPU, or native parser. It does not clear Windows OS filesystem cache or establish truly *cold* I/O. It does not measure CPU time or WebView2/total RAM. Even with both UI exports, they are **user-associated rather than cryptographically bound** to the captured file tree. The long-standing owner screenshot of 3,008 files and 184.8 seconds is historical evidence, not a paired measured improvement.

## Owner-real-case collection procedure (Windows PowerShell)

Install Node.js 22+ and use the **same hardware, same FoamLens release/build, same settings, same 2D case, same import mode**, with no other heavy workload.

1. Open FoamLens, import the owner's actual 2D case, wait for the real **Project ready** checkpoint, then choose **Export import performance (JSON)**. Save it **outside** the case (example: `C:\FoamLensBench\first-ui.json`). Capture original visible loading behavior separately if available.
2. Close/reopen FoamLens in the intended repeated-run condition and import the *same unchanged case* again; export `repeat-ui.json`. Record the app version/build, machine, antivirus, OS cache state, case source completeness and whether the UI truly became responsive. Never describe `first` as verified OS-cold unless the OS cache was externally controlled/verified.
3. **After both app imports**, capture source fingerprints (these are deliberate additional disk reads and may warm the filesystem cache):

```powershell
node tools/benchmark-real-case.cjs capture "D:\PrivateResearch\MyOpenFOAM2D" "C:\FoamLensBench\first-case.json" --label first --ui "C:\FoamLensBench\first-ui.json"
node tools/benchmark-real-case.cjs capture "D:\PrivateResearch\MyOpenFOAM2D" "C:\FoamLensBench\repeat-case.json" --label repeat --ui "C:\FoamLensBench\repeat-ui.json"
node tools/benchmark-real-case.cjs compare "C:\FoamLensBench\first-case.json" "C:\FoamLensBench\repeat-case.json" > "C:\FoamLensBench\comparison.json"
```

4. Review `comparison.json` plus both reports. If a full-content fingerprint differs, stop and re-evaluate the input. If a UI stage was not measured, its value stays `null` rather than being fabricated. Distinguish the OS I/O source scan from actual app parsing, finalization and first usable plots. Correlate the original owner 184.8-second screenshot separately; do not equate it with a fresh independent baseline.
5. **Privacy:** outputs use only count, time, bytes, bounded product labels, aggregate digest and coarse source kind counts. Do not share the actual private 2D case directory or experimental field files. Check report content before sharing; only deliberately supplied UI-exported metrics are accepted.

## Synthetic CI versus real owner measurement

The dedicated workflow `.github/workflows/granada-117-real-case-benchmark.yml` tests on Ubuntu and Windows:

- Creates **synthetic 3,008 regular files** in a temporary private-canary named tree, does two full-content read-and-hash captures, verifies equal SHA-256, counts, stage-null correctness, report privacy, no private filenames/values and correct UI attachment.
- Alters one scientific file with **identical byte length** and proves the second digest changes and comparison fails.
- Verifies failure-safe cancellation, output-inside-case rejection and invalid report labels, plus a **synthetic 10,000-file metadata-only inventory** without passing those timing values off as real case evidence.
- Re-runs previous UI import report comparator and native/frontend large-project stress regressions. **No CI-generated fixture can establish an owner-real 2D-case speedup.**

## Remaining #117 work

- Actually run owner-real 3,008-file first/repeat **FoamLens UI** imports and source capture on their Windows machine and produce dated, comparable reports.
- Verify UI first interactive event with manual interaction, import stages, CPU/whole-machine RAM/IO trace and app process/GPU metrics; OS cold-cache treatment must be external and explicit.
- Convert existing native case catalog from **post-scan saved inventory** into a validated pre-scan reusable incremental index if justified by real profiling, with checksum/path/mtime/size invalidation and complete/repaired/removable source recovery.
- Bounded async parsing with cancellation, scientific cache correctness, 10k actual **time directory** and large 2D mesh tests, plot/list virtualization and installed Windows native/UI acceptance.
- Benchmark new versus prior release on the identical real dataset with exact executable SHA-256, complete CI and user acceptance. Public release not authorized by Granada.

**Scope note:** Existing active Field/CAD/2D–3D/Energy/Thermocouple/Health/Momentum/Front PRs #162, #164–#171 remain isolated; no source app UI or release workflows are edited in this branch.
