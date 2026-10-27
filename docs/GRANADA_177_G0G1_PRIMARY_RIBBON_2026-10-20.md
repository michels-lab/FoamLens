# Operación Granada #177 — G0/G1 original Ribbon ownership and accessible primary controls

**Candidate date:** 2026-10-20. **Branch:** `feat/granada-177-primary-ribbon-ux-20261020`. Not in main, not a release and not yet visually accepted. Global issue [#177](https://github.com/michels-lab/FoamLens/issues/177).

## Baseline and what was already implemented

- The real app already has the six-tab native Ribbon (Home, Data, 3D / Field, Analysis, Export and View) and *app modes* Review/Live reached from Home. The original `v15-ribbon-ui.js` binds all Ribbon command buttons to existing actions.
- The Field tab already owns its contextual camera/Inspect/Compare subbars, frame-time transport, GPU canvas and original A–D source/camera tools. Field F1 #162 and high-DPI F2 #175 remain in independent open PRs. This block **does not change their underlying implementation**, CSS, cameras, model controls, toolbars or navigation.
- Existing `docs/UX_COHERENCE_AUDIT_2026-10-05.md` identified fragmented information architecture and duplicate/hidden controls as a major source of user-visible problems. The user's new screenshot critique explicitly extends **to all tabs** and requires a coherent and visibly useful workflow, not another decoration.

## G1: Actual user-visible improvement for 5 Ribbon tabs

The independent versioned extension `v24-granada-global-ux.js` is loaded after `v15-ribbon-ui.js` by the normal Windows bundle. The work happens on the **original bound buttons**:

| Ribbon tab | Remains visible on the main action row | Secondary original commands moved to More tools |
|---|---|---|
| Home | Open files, Open folder, Save, Cases, Review, Live | Open Workspace, Overview |
| Data | Catalog, Profiles, Time series, Solver logs, Compare curves | Select all, Show series, Clear |
| Analysis | General, Coupling, Front tracking, 2D Curve Difference, Mapping, Phase / Momentum | Open Time Series result, Open Spatial Profile result |
| Export | PNG, SVG, CSV, Video | Thesis figure, Multi-panel |
| View | Sidebar, Fit, Reset layout, Theme, Language, Help | Performance, View names, explicit G0 layout audit |
| 3D / Field | **UNCHANGED** canonical toolbar, physical time controller and A–D Field controls | Not modified; F1/F2 owners remain in their PRs |
| Review / Live | Original source controls and modes, entered through visible Home actions | Neither app-mode source nor functionality modified |

The More menu is not an additional command implementation. It **moves** the exact original button elements (same IDs, click listeners, enabled/disabled states, tooltips and native bridge behavior), never clones or proxies them. Essential commands remain in the main tab even at narrower widths, where they may wrap into multiple rows rather than disappear into a horizontal ribbon scroller. The menu has bilingual labels, keyboard-usable original buttons, Escape and outside-click dismissal, aria-expanded state, explicit focus styling and a bounded popover anchored to the current control.

This block does **not** claim every deeply nested Analysis, Review, Live or Field control has already been made permanently visible. The top Ribbon is a first bounded implementation, not the complete multi-screen redesign.

## G0: Measured inventory and honest export

The View → More tools → **Audit all tab layouts** action exports the source-referenced read-only file `FoamLens_Granada_G0_UI.json`. It captures at the time of explicit invocation:

- Eight actual navigation contexts: Home, Data, 3D/Field, Analysis, Export, View, Review, Live.
- A curated set of original, existing control IDs with a **priority classification** (primary, contextual, more). No fake or research-derived names.
- Per-control states: visible, disabled, hidden, clipped, conditionally hidden, in More, not mounted, inactive/not visually tested.
- **Current active screen only**: real DOM visibility / CSS ancestor clipping / viewport bounds, current CSS window dimensions and `devicePixelRatio`. Inactive screens are listed as *not visually tested* rather than green.
- Findings for the currently active screen's critical primary controls missing, hidden or horizontally clipped. A report that found no issues **does not** certify layout aesthetic or functionality.
- No OpenFOAM values, case names, user comments, file paths, screenshots, credentials or dataset content. Output remains local on user request only; no network upload.

This is a **G0 instrument**, not automatic visual approval. To evaluate each tab's real visibility, navigate to that tab and run the audit again. It cannot inspect an inactive Review/Live mode's pixel layout without opening that mode.

## Tests

- `desktop/tests/granada-177-global-ux.spec.cjs`: eight source control inventories, primary versus secondary priority, original IDs, source ribbon/action existence, containment/clip maths, source isolation.
- `desktop/tests/granada-177-ux-runtime.spec.cjs`: VM DOM integration actually moves original buttons between owners while preserving the same objects and click handlers, verifies five tabs, localized secondary actions, menu keyboard/click lifecycle, data-screen active audit and Field scope untouched.
- Dedicated Linux+Windows `.github/workflows/granada-177-global-ux.yml` reruns original `ribbon-ui.test.cjs`, `workspace-ux.test.cjs`, `analysis-ui-organization.test.cjs` and `test-suite-manifest.test.cjs` alongside the new tests.
- Standard Windows build workflow is expected on PR; its CI does **not** establish the quality of the installed visual appearance until owner visual acceptance.

## Still open in #177

**G0:** full screen-by-screen DOM control census and activity/layout screenshots with two real OpenFOAM cases and status transitions (including blank, loading, error, normal, compare) at all relevant widths/DPI; only a curated source-verified set is instrumented here.

**G1:** a genuinely cohesive shared UI component/layout system across entire app, not only main Ribbon actions; design system and real visual signoff not yet established.

**G2:** Field/3D scene permanent source/region/variable/component controls and legend/cota placement in a conflict-free integration after #162 and #175.

**G3:** real Data Time Series T2 redesign #176 paired with T1 source history #146, including two visible independent curves and generate/cancel/progress.

**G4:** in-depth Analysis, Review, Live screens, their internal controls, inspector/advanced destinations, status feedback and consistency with Developer twin.

**G5:** actual installed Windows Setup and Portable screenshots, UI automation and keyboard tests at 1024/1280/1920 CSS widths and 125/150/175/200% OS DPI scaling, user visual review, scientific/nonlinear regression and explicit final release authorization.

**Granada constraint:** all unfinished scientific and UI PRs #162, #164–#175, and docs-only #178, remain open and untouched. No merge, version bump or published installer.

## 2026-10-27 — GRANADA G44 current-main reconciliation of existing #179
- The old candidate used a removed, unsafe assertion that expected the native host to enumerate `v*-*.js` from mutable user-profile AppRoot. The current product (G35) **only** reads original versioned scripts from the running assembly's `TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()` and protected `AppBundle.zip`. G44 upgrades its source regression to require this present-day loader; never revert the original security fix or accept historical logic.
- The existing UX module and its two original functional tests plus a dedicated dual-OS CI are retained from #179; no old global CHANGELOG, roadmap, or huge audit-log patches were copied. Source/UI changes are confined to the original five modes Home, Data, Analysis, Export and View; move the exact original action DOM nodes, not cloned event handlers. Field/3D (including Play), Review, Live, OpenFOAM, existing exports and updater are unchanged.
- Exact current main parent `a395d429c6fd07cf7eee04f6865bb577b9e3da90` replaces the 2026-10-20 PR history using expected-head branch lease. Any acceptance requires the newly triggered Windows+Ubuntu original-Ribbon/Field/Analysis regressions and native Windows Setup/Portable+QuickCup CI, plus owner-boundary checks. A green unit test is not physical DPI 125–200% inspection or the 36-screen human visual review.
- No change to stable v1.8.10 public binaries, tags, installer/updater signatures, or scientific physics; #177 and global release gate #238 remain separately open for the unfulfilled owner visual/security criteria.

## 2026-10-27 — G44 exact-head merge acceptance
- [PR #179](https://github.com/michels-lab/FoamLens/pull/179) was **MERGED** to current original product `main` in squash commit `199207f8e265124cab1559b21a7be6eced34d0c3`. Only five UX-owned module/test/workflow/audit files, no science or native host changes.
- Exact-head `08c716bbc9b8aad7aa509242cd9d70d26e1950a7` has **three terminal successful validations**: [dual OS original Ribbon/DOM and keyboard tests #40519620949](https://github.com/michels-lab/FoamLens/actions/runs/40519620949), [Windows+Ubuntu code ownership #40519620945](https://github.com/michels-lab/FoamLens/actions/runs/40519620945) and [real Windows QuickCup OpenFOAM, package/Portable/Setup/uninstall, two-viewport smoke #40519620952](https://github.com/michels-lab/FoamLens/actions/runs/40519620952). Package candidate publish step was **skipped**.
- Runtime keeps original five Ribbon tab command identities/listeners and user-driven bilingual More menus, with Field 3D/Play, Review and Live left untouched; current trusted embedded JS loader contract is required by tests, unlike superseded mutable AppRoot loader.
- **Unfulfilled and distinct:** manual installed visual approval of all 36 original screenshots, physical Windows monitor scaling 125–200%, accessible flyout review by owner, Field Play intermittent P0 #230, independently signed updater/installer gate #238. G0 inventories eight tabs but measures only the actual active tab. #177 stays open; public stable v1.8.10 unchanged, no RC/beta/test release.
