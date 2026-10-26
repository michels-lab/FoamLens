# FoamLens — GRANADA G39 · Findings scientific evidence and safe public handoffs

**Date:** 2026-10-26. **Target:** original `michels-lab/FoamLens` source at main `d651c43e0507c5316070fbd4859c9fb3196850a2`. **Official stable release:** Desktop v1.8.10; G39 code is **not merged or published**.

## Separate ownership
G38 scientific series export (PR #258) has its own `v13-reproducible-export.js`, tests, and Windows native CI, initially **not terminal**; preserve its SHA and tests independently. G35/G36/G37 CAD, WebView2 trusted JavaScript, G22 Play and QuickCup physical tests are stacked, unmerged and must remain unmodified. Open review/export owner #184 changes different original modules and tests; no alteration to that PR. G39 specifically owns **original `v22-findings-export.js`** and **existing `findings-export.test.cjs`**. The project's central log is shared and may require a normal merge reconciliation, not a force overwrite.

## Original root causes / reproductions

1. **Misleading physical time and measured/reference evidence:** original `fxeFinite` called `Number(null)`, `Number('')`, `Number(false)` and therefore returned false **0** in exported findings. Original `fxeTimeRange` likewise counted missing `t` samples as real t=0. Correct strict finite dot-decimal conversion preserves actual numeric zero and exponent notation.
2. **Large time-series stack overflow:** `Math.min(...ts)` and `Math.max(...ts)` pass every time point as a function argument. Large but legitimate cases can exceed JavaScript's argument limit. New constant-stack streaming min/max/count preserves actual original samples, disregards missing times, and supports a 350,000-slot adversarial regression.
3. **Wrong source attribution:** `Number(null)===0` made findings and datasets with missing case IDs match real case ID 0, thus falsely assigning another case's name, physical source and related evidence. Require explicit finite safe integer IDs; do not associate unknown IDs with any source case.
4. **Public issue metadata leakage:** original `fxeGithubBody` and issue title placed case/workspace names, field labels, measurements and arbitrary user findings into a **public GitHub URL query string**, potentially leaking private scientific source information even before the issue was submitted. New GitHub handoff sends only aggregate severity counts and a clear source-redaction notice, while the full local JSON/Markdown evidence remains available for explicit owner review/redaction. Canonical issue target is now `michels-lab/FoamLens`, not historical `realmichelduarte/FoamLens`.
5. **Shared references mislabeled:** original `fxeClone` stored every visited sibling object in `seen`, incorrectly calling repeated but noncyclic metadata `[circular]`. Unwind the recursion-path WeakSet after each array/object visit, retaining real cycle protection and the original depth/size bounds.

## Source and regression surface

- `desktop/src/FoamLensDesktop/frontend/v22-findings-export.js` — original product implementation.
- `desktop/tests/findings-export.test.cjs` — executes extracted **real production functions** in addition to prior structural assertions. Covers null/blank/false vs true zeros; valid exponent and locale/hex rejection; 350k input without spread; absent finding physical values; missing vs real case zero; repeated metadata versus actual cycles; malicious case/path/field/findings never appearing in the public GitHub handoff; actual current canonical repository.
- `.github/workflows/granada-g39-findings-integrity.yml` — dedicated read-only nonpublishing Windows and Ubuntu source/negative-fixture tests. Normal product Windows CI triggered by PR separately.

**Preservation:** no research data or binary uploaded, no external issue created, no solver/data mutation, no new plugins, no backend/service, no release. Local JSON/Markdown export intentionally retains source metadata for owner review and is never transmitted automatically. Changing the public GitHub handoff to counts-only is deliberate; the owner may selectively share locally exported evidence after redaction.

## Acceptance and handoff

To integrate G39, verify dual-OS G39 workflow and full native Windows build/scientific QA on the **last exact head SHA**, source ownership collision review, and ordinary PR merges. Physical QuickCup/source calibration, native rendering/high DPI, code signing/updater and release gate [#238](https://github.com/michels-lab/FoamLens/issues/238) are separate and remain open. No RC, beta, preview, tag or stable release from this branch. Current desktop stable remains v1.8.10.

**Reentry:** check exact current G39 PR head and terminal CI; if the Windows suite fails, diagnose the specific failing job without weakening scientific/provenance assertions. Recheck outstanding G38 #258 independently before merge. A source fix is not an installed-user update.
