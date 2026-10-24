# GRANADA G34 — trusted embedded JavaScript (2026-10-24)

**Goal:** correct the confirmed original native Windows FoamLens startup integrity problem where locally leftover but **not-bundled** `v*-*.js` modules run in the real application. Original confirmed reproduction [G32 issue #252](https://github.com/michels-lab/FoamLens/issues/252), [G33 exact-head Windows CI](https://github.com/michels-lab/FoamLens/actions/runs/40117686904). No remote exploit or user compromise was demonstrated.

## Three implemented, independently checkable work packages

### A. Actual product repair *component*, without source-owner collision

New code `desktop/src/FoamLensDesktop/TrustedEmbeddedFrontendExtensions.cs` provides `ReadFromRunningAssembly()`. **Only** reads original versioned modules from `FoamLensDesktop.AppBundle.zip` embedded in the original .NET assembly, **never** from writable versioned `AppRoot`. Preserves original case-insensitive deterministic order and source Unicode. Fail-closed ZIP member checks: invalid/ambiguous names, path escaping, duplicate/case-colliding members, symlinks, missing modules, malformed UTF-8, excessive modules and oversized module source. No user data deletion, WebView2 user profile migration, account, network call, download or OpenFOAM user file access. This standalone helper is **not activated** on the current merged original host until the two host code locations are integrated.

### B. Negative regression and exact source-owner integration control

- `tools/granada_g34_trusted_source_tests/`: actually compiles the C# product implementation and exercises 14 negative/positive cases on Linux and Windows, including rogue local JS and genuine versioned scripts.
- `tools/granada_g34_disposable_source_integration.py` replaces the **two precisely identified** original host call sites *only in a disposable Windows CI checkout of original main*: use `TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()` and join trusted in-assembly source texts, rather than `Directory.GetFiles(AppRoot,"v*-*.js")` plus `File.ReadAllText`.
- `tools/test_granada_g34_integration.py`: seven source/CI fail-closed checks for original host drift, mutable filesystem access, duplicate insertion, absence of original bug repro, artifact handling and preserving code ownership.
- Existing CAD [PR #164](https://github.com/michels-lab/FoamLens/pull/164) **owns `desktop/src/FoamLensDesktop/Program.cs`**; the PR does **not** edit that file or borrow open CAD owner code. This conflicts with a straight immediate production merge: a source-specific, coordinated Program.cs host integration is still mandatory.

### C. Actual original Windows Installed + Portable functional regression

[Exact original Windows CI #40118757284](https://github.com/michels-lab/FoamLens/actions/runs/40118757284) **completed SUCCESS 3/3 jobs** at QA implementation SHA `a4825ea64624de9c080ed27d0aa16b65c0e68332`, *original unmodified main product commit* `d651c43e0507c5316070fbd4859c9fb3196850a2` and original version `1.8.10`. GitHub-hosted Windows runner checked out exact original `main` without foreign science/UX code; applied the bounded helper+two original call-site changes **only to private runner workspace**, compiled actual single-file native original patched `FoamLens.exe` with **0 compile errors** and genuine original Inno Setup v1.8.10. Independently pinned [G33 actual WebView2 nonce witness](https://github.com/michels-lab/FoamLens/pull/253) source, SHA `d3490c7dc3851fe692f6351aedfbe4e63ad42841`, as **QA only**.

Actual Windows stages and browser outcomes:

| True running FoamLens case | Observed |
| --- | --- |
| Original first clean Portable smoke, with embedded approved official `v*-*.js` | Real `--smoke-test` PASS, real original WebView2 marker **ABSENT** (18:04:32 UTC) |
| Leave one benign local `v99-g34-benign-residue.js` which is independently proven absent from official ZIP; restart patched original Portable | Full official smoke PASS, marker **ABSENT** (18:04:40 UTC) *even though the on-disk rogue test file still existed* |
| Install actual Inno Setup, update benign nonce, launch patched original Installed | Real native smoke PASS, marker **ABSENT** (18:04:53 UTC) while stale local JS file still present |
| Remove only benign test file and clear its synthetic key; restart patched original Portable | Real full smoke PASS, native Chromium marker **ABSENT** (18:05:04 UTC), actual original Inno uninstall PASS |
| Final original product SHA readback and synthetic report checks | PASS. Only 498 bytes of sanitized synthetic check results uploaded (artifact `#12570212972`); no binaries/private case/user browser data uploaded |

Unlike the G33 original host which **executed** the same class of unbundled file, temporary G34 Windows candidate **does not execute** it in either installed distribution. Product source/real official modules are still original. The absence was read independently from actual native WebView2 profile at exactly the same `foamlens.local` mapped origin, not inferred from a source regex or synthetic browser.

## Closure is intentionally two-dimensional

- **Candidate repair component and temporary integrated native behavior: VERIFIED.**
- **Production host `Program.cs` integration into merged main: PENDING** due to overlapping active CAD PR #164.
- **New public stable app with this fix: NOT RELEASED.** Current v1.8.10 remains published and therefore is still susceptible when a local unknown `v*-*.js` exists in its writable runtime folder.
- Does not verify real private OpenFOAM 3,008-file case accuracy, Windows DPI 125–200% actual physical monitors, all 36 owner screenshots, Authenticode publisher, updater signing/consent/manifest, SmartScreen or all outstanding sci/CAD/UX owner PR integration.
- Release gate [#238](https://github.com/michels-lab/FoamLens/issues/238) remains **OPEN/BLOCKED**.

## Safe handoff to source owner

After source-owner availability/coordination, make exactly the two proven original host replacements in `ApplyFrontendExtensions()` and include the new trusted reader in the same compiled product. Re-run actual complete G34 Windows Installed + Portable inverse nonce checks and all affected native, scientific and release test matrices at the exact final production HEAD. Preserve the original `ZipFile.ExtractToDirectory` user data and avoid deleting stale personal/browser profiles. DO NOT merge helper-only PR and call it a customer-visible fix.

**Evidence contract:** Only exact tested SHA's Windows CI can certify native behavior. If this document or the product ledger receives follow-up commits, run an exact current candidate SHA CI again or mark those documentation changes separately as not compiled.
