**Convergence update 2026-10-27:** Original G29 QA is reconciled onto current merged main `b329e7e1e1b04588f6e695fb15864446f638f005`. The old exact-head PASS is historical; current main with CAD, G35 trusted-JS and G37 intermittent Play testing requires fresh Windows v1.8.9 to v1.8.10 actual native upgrade verification. No product source changes, no release.

# FoamLens Granada G29 — real old-to-new Windows WebView2 profile upgrade

**Date:** 2026-10-23. **QA-only independent branch:** `test/granada-g29-real-189-to-1810-storage-migration-20261023`. **Official public baseline:** `v1.8.10`; no new release.

## Why another test?

[G24 #245](https://github.com/michels-lab/FoamLens/pull/245) already produced a genuine [successful original Windows WebView2 test](https://github.com/michels-lab/FoamLens/actions/runs/40006244265) on its immutable QA head `c0f3932a5221e5e4243942a2ecfb7023ba2ea9cf`. That verifies same-version reboot/reinstall/uninstall, actual `localStorage` and IndexedDB, origin/profile isolation and cleanup. **It does not prove an actual upgrade from one different officially released app version to another.**

G29 is an independent native QA experiment and does not modify G24's branch, the science/CAD/Field owner PRs, updater/security G21, or any actual product code.

## Exact end-to-end acceptance

1. Checkout official **v1.8.9** as an immutable tagged source and checkout the **current live main**, whose genuine source project version must be **1.8.10**. Refuse moving main, same-version comparison or mismatched original Inno `AppId`.
2. Build each original WinForms/.NET8/WebView2 bundled frontend into its own actual **Setup + Portable** executable, using its own icon and installer sources. No binary overlays, release artifacts or synthetic product code grafts.
3. Install real v1.8.9, execute its actual native `--smoke-test` against real `https://foamlens.local` WebView2, and use the previously successful **read-only reused G24 QA probe at its exact reviewed commit** to commit an isolated random synthetic value into *both* real Chromium `localStorage` and a real completed IndexedDB transaction.
4. Start a new v1.8.9 process, require exact readback, and prove a deliberately wrong value is **rejected**, not misreported as a pass.
5. Install the actual original v1.8.10 **over the real v1.8.9 installation directory** using matching Inno identity, check installed EXE SHA-256 parity with its own new Portable, start the new installed native app, and require both browser APIs to return the original synthetic values with the *new* physical version-specific frontend.
6. Start original new Portable, verify again, and prove unrelated alternate-origin and Developer browser profiles cannot read those values. Uninstall with the actual official Inno uninstaller and verify new Portable still reads both values; remove **only the disposable test keys/database through Chromium APIs**; prove absence and preserve an unrelated sentinel file checksum.
7. Independently fail closed on the final current official `main` SHA; publish **metadata-only** evidence (`true/false` flags and public source hashes), never the browser profile, tokens, user's settings, proprietary OpenFOAM data or binaries. CI only runs on disposable GitHub-hosted Windows.

## First native result and root-cause correction

- [Initial exact-head native Windows #40015015451](https://github.com/michels-lab/FoamLens/actions/runs/40015015451): the two real original versioned product executables and both Inno installers **compiled successfully**. Actual original installed v1.8.9 application **started successfully**, but the QA-only probe wrapper then failed before writing browser storage: **`Cannot overwrite variable host because it is read-only or constant`**. The PowerShell helper used `[string]$host`, colliding case-insensitively with the read-only automatic `$Host` variable. This was a **test harness defect, not evidence of user-data loss**. No cross-version storage result was produced in that run.
- Correction only in G29 independent QA script: rename `$host` to `$originHost`, and rename potentially ambiguous `$profile` helper to `$browserProfile`. A direct regression now injects the original `$Host` collision and requires rejection. Re-run exact-head dual-OS source and genuine Windows native installer tests. **Do not mark runtime PASS until the new run finishes green.**

## Proof boundaries (must not be conflated)

| What this tests | What it does not certify |
| --- | --- |
| Genuine original old/new installed applications on Windows | No real person's workstation tested |
| Chromium localStorage and IndexedDB synthetic-value durability across **different versions** | No semantic migration of all real FoamLens settings or future schema compatibility |
| Original secure virtual host and independent Developer browser profile | No independent CFD numerical correctness or recalescence interpretation |
| Genuine Setup and Portable packaging with executable hash parity | No real publisher Authenticode signature and official signed update distribution |
| Repeated original native application starts and real in-place installer upgrade | No owner physical DPI 125–200%, 36 screenshot acceptance or final release gate |

**Status:** candidate implementation; independent Windows job needs terminal exact-head pass before this can be marked verified. If the native test fails, keep the gate **BLOCKED**; do not relax the proof or publish a release. Release blocker [#238](https://github.com/michels-lab/FoamLens/issues/238) stays open. CI link: [G29 workflow](https://github.com/michels-lab/FoamLens/actions/workflows/granada-g29-real-version-storage-migration.yml).
