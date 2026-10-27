## 2026-10-26 — G17 historical test expectation repaired on G35 security owner

- In exact consolidated G35 source `11449c676dd2935bbbb2412c926b8f9530689294`, [G17 source CI 40438487003](https://github.com/michels-lab/FoamLens/actions/runs/40438487003) failed because old test `granada_g16_wide_play_cascade.test.cjs` explicitly expected original writable AppRoot `Directory.GetFiles(...)`. This is the behavior **G35 must remove** for security P0 #252. Source-owned test now rejects that unsafe enumeration and requires actual embedded `AppBundle.zip` loader, while retaining G16's real 1140px Play, 640px CSS, translation, geometry and no-relaxation assertions. No product behavior change or test skipped. Must rerun new exact-head native and G17 QA before merge. Releases #238 remain blocked.

## 2026-10-26 — G35 owner safe integration after CAD update

- Reconciled original G35 source against CAD owner commit `af494c3eab845f3c3d8aa7f5fd1e63d7efa65248`, which itself preserves original up-to-date main native host including G25 ExternalNavigationPolicy, G21 release Authenticode enforcement, G22 compact CSS and G39 scientific Findings. G35 product-code edits remain only the two original JS trust call-sites in Program.cs plus the byte-exact original trusted embedded module; no other OpenFOAM/CAD algorithms changed. Native original Installed+Portable browser nonce inversion and QuickCup verification still REQUIRED on this new exact branch head. #252 and #238 stay OPEN until actual product evidence and release gates. No release.

# GRANADA G35 — source-integrated CAD + trusted JavaScript verified in real Windows

**Recorded:** 2026-10-24. **Product:** FoamLens only (no other Michel's Lab application). **Stacked integration PR:** [#255](https://github.com/michels-lab/FoamLens/pull/255), base branch `feat/cad-stl-obj-inspector-20261019` from [CAD PR #164](https://github.com/michels-lab/FoamLens/pull/164).

## 1. Actual release and ownership boundary

- Original unchanged `main` SHA: `d651c43e0507c5316070fbd4859c9fb3196850a2`, official stable tag **v1.8.10**. It is **not** repaired; original published local-script vulnerability is real if unknown JS files are present in its writable runtime directory.
- Pinned CAD source owner SHA: `68f56e176e6f0ce9ac95833acb196451f9dcb35a`. CAD owner branch remained untouched; G35 is a separate branch with a draft PR **targeting CAD's branch**, not a direct merge into main.
- Source patch from previously validated G34 [PR #254](https://github.com/michels-lab/FoamLens/pull/254): trusted C# component `TrustedEmbeddedFrontendExtensions.cs` is **byte-identical**. Only two original host expressions in CAD `desktop/src/FoamLensDesktop/Program.cs` now read the ordered, validated JS sources from the **embedded executable AppBundle.zip** rather than `Directory.GetFiles(AppRoot,"v*-*.js")` / arbitrary `File.ReadAllText`.
- No alteration of CAD's `v24-cad-surface-inspector.js`, native STL/OBJ parsing, units, topology/export safeguards, geometry source paths, other app code, private CFD cases or other owner worktrees.
- Necessary test correction: `desktop/tests/field-view.test.cjs` previously demanded the **unsafe implementation** (`Directory.GetFiles(AppRoot,"v*-*.js")`) exist. This is a false security regression after a real fix. Replaced that test with an **opposite** strict production assertion that the native host uses `ReadFromRunningAssembly()`, injects only `bundledExtensions`, and has neither arbitrary AppRoot JS enumeration nor local JS disk reads; the trusted C# helper must refer to `GetManifestResourceStream(BundleResource)` and never use `Directory.GetFiles` or `File.ReadAllText`. The science/Field tests remain active.

## 2. Exactly validated source code and genuine original Windows product

[GitHub Actions source-and-native run #40120953200](https://github.com/michels-lab/FoamLens/actions/runs/40120953200) **COMPLETED SUCCESS 3/3 jobs** on G35 implementation QA SHA `6b00d0a406b2bacf92981bf10e129fce36922d21`. All proof jobs terminal SUCCESS:

1. **Ubuntu**: actual original CAD STL/OBJ scientific surface tests, C# trusted-loader negative ZIP tests, source/ownership strict staged diff and updated native Field scientific source regression — PASS.
2. **Windows**: same CAD, C# helper and Field regression plus PowerShell native harness syntax — PASS.
3. **Real Windows Installed + Portable**: native self-contained `FoamLens.exe` compiled with **0 errors** on actual CAD + trusted security source, genuine Inno Setup v1.8.10 built, exact G35 SHA and CAD parent verified, real original Windows `--smoke-test` including CAD inspector and original frontend success, same-profile real Microsoft WebView2 `foamlens.local` independent witness verified unknown local `v99-g35-benign-residue.js` **did not execute**.

    - 18:32:48 UTC: real clean Portable, synthetic marker **ABSENT**.
    - 18:32:56 UTC: Portable restart with nonbundled harmless `v99-` file still in original writable AppRoot, marker **ABSENT**.
    - 18:33:08 UTC: real Inno **Installed** app with different synthetic nonce, leftover extra JS still on disk, marker **ABSENT**.
    - 18:33:18 UTC: benign QA file removed, isolated test key cleared, Portable again, marker **ABSENT**.
    - 18:33:19 UTC: real original Inno uninstall and final exact SHA/report validation — PASS.

Only the **504-byte sanitized synthetic metadata report** artifact **#12570693057** was uploaded. No binary installers, signed output, actual OpenFOAM research data, personal profile data or remote network payload. This is the exact inverse of the **confirmed original code execution** [G33 actual Windows #40117686904](https://github.com/michels-lab/FoamLens/actions/runs/40117686904).

## 3. Outside of this functional proof

- **The real production main / official stable v1.8.10 has NOT been changed**, and this stacked draft PR has NOT been merged into the owner CAD branch or main. [G32 defect issue #252](https://github.com/michels-lab/FoamLens/issues/252) remains OPEN; source-integrated combined **candidate** is verified but end-user distribution is **not** repaired.
- **The general release workflow is NOT all green**: [G34 full Windows build #40119265614](https://github.com/michels-lab/FoamLens/actions/runs/40119265614) failed *native real QuickCup B13 Field Play visibility at 1140px* (known [issue #230](https://github.com/michels-lab/FoamLens/issues/230)); and initial G35 general build #40120315158 was blocked by the now-repaired **obsolete Field JS wildcard assertion** in the inherited test. These are separate from the G35 targeted native CAD+security success and are not waived.
- Private real QuickCup numerical/scientific accuracy, all 36 owner-screen 125/150/175/200% DPI visuals, genuine named Authenticode publisher signer, updater/installer stable release identity, Microsoft Store submission and entire science/UI feature PR composition are not certified here.
- [Overall release gate #238](https://github.com/michels-lab/FoamLens/issues/238) stays **OPEN/BLOCKED**. No RC, beta, stable tag, merged release or public binary is authorized by G35.

## 4. Next source owner decision and proof

1. CAD owner reviews G35 [stacked PR #255](https://github.com/michels-lab/FoamLens/pull/255) including the two host lines, new trusted helper and repaired Field test; integrate/merge in the proper order only after owner approvals, preserving CAD and no unrelated cherry-picks.
2. Then rerun original native Installed+Portable and source-scoped **full scientific and release workflows on the actual final merged SHA**; maintain the G33 negative regression inverted and original CAD WebView2 smoke. No green-on-PR evidence is automatically green-on-release.
3. Repair B13 Field Play collapse #230 independently and verify owner physical DPI/camera 36-screen contract; verify real code signing. Only after all original native/physics/visual/signing gates should #238 and #252 be considered for closure and a release.

**Audit truth:** Source candidate and real native Windows integrated test ✅. Merged source ❌. Published fixed product ❌. Signed/science/visual release ❌. User-scoped evidence never uploaded.
