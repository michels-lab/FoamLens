# GRANADA G27 — native OpenFOAM scientific decimals under real Windows cultures

**Date:** 2026-10-23. **Scope:** test-only original `main` FoamLens Windows WinForms/WebView2. **Stable release:** not approved; public v1.8.10 unchanged.

## User problem and non-overlap

OpenFOAM writes dot-decimal scientific values and exponential notation (e.g., `0.001s`, `9.8`, `-1.2345e-6`), regardless of the user's Windows region. Incorrect use of the Windows process `CurrentCulture` can silently reject or mistranslate temperatures, solver times or floating-point values under comma-decimal `fr-FR` and `de-DE`. This risks invalid scientific analysis even when the desktop app opens normally. **The original main C# runtime** has explicit invariant parsing, including native self-tests for `foamLog` `0.001s` and binary OpenFOAM meshes before its WinForms `--smoke-test` can pass. A source-only regression cannot demonstrate that a real Windows user culture actually reached a newly launched executable.

G27 does not edit any product file, numerical result, UI or case in `main`; does not touch active [G24 WebView2 persistence #245](https://github.com/michels-lab/FoamLens/pull/245), [G25 external navigation #246](https://github.com/michels-lab/FoamLens/pull/246), [G26 collision map #247](https://github.com/michels-lab/FoamLens/pull/247), or G21/G22's signing/Play branches. It is independent native scientific robustness QA.

## Implementation

- `tools/granada_g27_culture_probe/Program.cs` compiles as an **actual independent .NET8 executable**. Each startup checks the real new process `CultureInfo.CurrentCulture.Name` against requested `en-US`, `es-MX`, `fr-FR` and `de-DE`, verifies dot/comma localization and parses four scientifically meaningful dot-decimal/exponent tokens with `InvariantCulture`. It **fails** if the OS locale transition did not really take effect; a `Set-Culture` command alone is not accepted as evidence.
- `tools/granada_g27_windows_native_culture_matrix.ps1` **only on a disposable GitHub-hosted Windows runner** sets the user culture, invokes the genuine new-process probe, launches **both** original-main Portable and Installed FoamLens WebView2 under **each** of the four real native Windows process cultures (8 native starts), rejects missing/old success markers, verifies original EXE hash identity and restores the original Windows user culture in a `finally` block.
- **Untouched main product**: workflow checks out original `main` separately from QA branch, checks live SHA before and after, bundles original HTML and complete `v*-*.js` modules, self-contained .NET8 builds actual FoamLens.exe, builds and installs the real original Inno Setup. No original product source, scientific inputs, saved user storage or customer installation modified.
- `.github/workflows/granada-g27-native-culture-matrix.yml` runs source/security regressions on Windows and Ubuntu first, performs real native Windows two-edition culture tests only after source gates pass, then writes **metadata-only** JSON (8 results, original exact source/PE hashes, strict scientific/parser completeness flags). No executable or personal research data is uploaded, no release/tag/version bump.
- `tools/granada_g27_native_culture_matrix.test.cjs` checks that original `RunSmokeTestAsync()` genuinely calls `RunBinaryMeshParserSelfTest()` and `RunFoamLogParserSelfTestAsync()`, forbids mocked culture approvals, gates regional setting changes to a disposable hosted runner, and prevents scientific or distribution overclaims.

## Scientific limitations

An eight-run result (if fully green) demonstrates **genuine native Windows launch + original built-in OpenFOAM parser numerical self-tests** under four OS cultures and unmodified source. It is **not** independent calibration against QuickCup physical temperature measurements, a CFD numerical-accuracy certification, a full 36-slot/physical DPI native screenshot matrix, production update signing or cross-version migration. Those remain in [release blocker #238](https://github.com/michels-lab/FoamLens/issues/238).

## CI & acceptance

[Real Windows G27 workflow](https://github.com/michels-lab/FoamLens/actions/workflows/granada-g27-native-culture-matrix.yml) — inspect **latest exact test-branch HEAD**: two source jobs + one actual Windows matrix job all terminal SUCCESS. **Pending ≠ success**. A locale that fails the new-process witness counts as a real blocked test rather than a claimed numeric pass. Do not promote this branch into main or publish any prerelease/stable version.
