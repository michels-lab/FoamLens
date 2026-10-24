# GRANADA G33 — native reproduction of extra unbundled frontend execution (2026-10-24)

**Repository**: `michels-lab/FoamLens`. **Unchanged product source:** original `main` SHA `d651c43e0507c5316070fbd4859c9fb3196850a2`, version 1.8.10. **QA branch:** `test/granada-g33-actual-stale-extension-native-reproduction-20261024`.

## Root cause and customer impact

The original C# startup host executes these steps in order:

1. `MaterializeBundle()`: `ZipFile.ExtractToDirectory(stream, AppRoot, overwriteFiles: true)`; extraction overwrites ZIP members but **does not delete local files whose names are absent from the embedded package**.
2. `ApplyFrontendExtensions()`: `Directory.GetFiles(AppRoot,"v*-*.js")`, reads **all** matching on-disk JS files and inserts their bytes into the real main frontend IIFE via `html.Insert(insertionPoint,...)`.
3. `ValidateMaterializedFrontend()` checks basic required frontend identity and assets, but **does not verify the approved bundled extension inventory or each local JS content hash**.

An obsolete or independently written matching `v*-*.js` can therefore be executed during app startup even though it is **not** in the trusted official source or embedded `AppBundle.zip`. The folder is writable under the Windows user profile. This creates a real local file provenance risk, **not** proof of any network-delivered exploit, data exfiltration, user compromise or executable-code modification of the original product. The root cause is independent of official installer/executable SHA-256 parity and of the G31 ZIP source-to-package inventory — the file enters via local after-extraction residues.

## Native exact-code reproduction: VERIFIED

[GitHub Actions #40117260152](https://github.com/michels-lab/FoamLens/actions/runs/40117260152): **SUCCESS**, QA source SHA `4a623c71bd301627d4124ab5ba5ac4e918c9ea2a`, original 1.8.10 code SHA `d651c43e0507c5316070fbd4859c9fb3196850a2`. All **3 jobs** passed: Ubuntu and Windows source/adversarial regressions, plus original built Windows self-contained executable and genuine Inno Setup native installed/portable scenarios. 0 compile errors; .NET WebView2 WinForms witness had only unrelated `WindowsBase` assembly binding warnings.

| Real Windows step | Observed |
| --- | --- |
| Run genuine original Portable `--smoke-test` before any added module | Original smoke PASS; original-origin Chromium marker **ABSENT** (17:44:03 UTC) |
| Put only benign `v99-g33-benign-residue.js` into disposable original per-version AppRoot; verify it was **not** shipped in original ZIP | Source ZIP absence verified, one randomized localStorage nonce, no network or research-data access |
| Restart original Portable with extra on-disk module | Original smoke PASS; independent genuine Chromium on `foamlens.local` with same original WebView2 profile sees expected marker **PRESENT** (17:44:12 UTC) |
| Install original Inno Setup (same SHA-256 original Portable executable); change benign nonce on same local module | Original Installed smoke PASS; same-origin Chromium reads new expected marker **PRESENT** (17:44:24 UTC) |
| Delete the **single temporary JS test file**, clear only its synthetic storage key, restart original Portable | Original smoke PASS; actual Chromium sees marker **ABSENT** (17:44:36 UTC) |
| Run actual Inno uninstaller; verify original product source SHA and output schema | PASS; native final report generated, test artifacts cleaned |

Only 491 bytes of sanitized pass/fail metadata uploaded as workflow artifact **#12570156625**; no actual binaries, account state, personal WebView2 profiles or private OpenFOAM cases were uploaded.

The cross-OS regression test suite binds its acceptance to original `Program.cs` extraction and wildcard injection expressions, verifies native witness comparison uses real `CoreWebView2Environment`, rejects workflow versions which skip Installed/Portable, omit the ZIP absence condition or falsely announce source repaired/released. This suite **does not** independently prove the bug without the original Windows run above.

## Source repair: STILL OPEN / BLOCKED ON CODE OWNERSHIP

**Issue [G32 #252](https://github.com/michels-lab/FoamLens/issues/252) remains open** as a **confirmed real defect**. Corrective implementation should derive the precise authorized module set and source content hash **from the embedded trusted `AppBundle.zip`**. Only inject modules whose inventory and SHA-256 matches the embedded bytes (or inject directly from the embedded archive). Do not enumerate unknown `v*-*.js` from the writable local folder; reject extras without deleting them or overwriting persistent user profiles. After the fix, invert the same real original Windows native regression: start with benign stray file, require actual browser marker **ABSENT**, approved modules still run, and preserve profile state across restart, installer and Portable.

**File owner collision:** [existing CAD PR #164](https://github.com/michels-lab/FoamLens/pull/164) changes `desktop/src/FoamLensDesktop/Program.cs`. Granada must NOT edit that shared source in another competing branch until code integration/ownership is coordinated. G33 is deliberately test-only and has not fixed this behavior. Original standalone production cannot be declared free of local source contamination until a product-code change and opposite-sign native QA are both proven.

**Release boundary:** signed publisher and real updater distribution, real scientific cases/accuracy, physical Windows DPI 125–200%, 36 owner's screenshots, owner visual signoff, source integration remain in [release gate #238](https://github.com/michels-lab/FoamLens/issues/238). Public latest stable remains `v1.8.10`, and no tag/RC/beta/new stable is created.
