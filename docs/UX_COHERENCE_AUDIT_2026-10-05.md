# FoamLens UX / Information-Architecture Coherence Audit

**Date:** 2026-10-05  
**Audited public baseline:** FoamLens Desktop v1.5.1  
**Main baseline commit:** `275427b61ad848c98e351dfb4c6df5a310f5a964`  
**Scope:** Desktop navigation, Field Workspace, Data / Plots / Compare ownership, temporal playback, activity/progress UI, contextual controls, focus/split layout, and regression tests that encode obsolete UX assumptions.

## Executive conclusion

FoamLens v1.5.1 is technically validated, but its UI contains two generations of information architecture at the same time:

1. the original large Data workspace, where Field View was implemented as another data tab and most controls lived in one monolithic sidebar; and
2. the later Ribbon + Field Workspace architecture, which often reuses, moves, hides or proxies the original controls instead of replacing them with section-owned UI.

This compatibility strategy preserved functionality during rapid development, but it is now the main source of the reported UX defects. Several current regression tests explicitly require the old behavior, so the correction must update **architecture and tests together**. CSS-only patches would leave the underlying ownership problems intact.

No scientific parsing, field reconstruction, VTK validation, numerical analysis or OpenFOAM data model problem was identified in this audit. The findings are primarily UI ownership, state ownership and navigation coherence problems.

---

## User-reported runtime findings

### UX-01 — Concurrent progress surfaces overlap

**Severity:** High  
**Status:** Runtime-confirmed from the reported screenshot.

A folder read can show multiple progress/activity surfaces at the same time in the lower-right area. The visible result is two cards partially covering each other.

Relevant current architecture:

- `index.html` owns a fixed `#activityToast` with a shared `appActivityDepth` counter.
- Folder enumeration also opens the detailed scan workflow and calls `pushAppActivity("Reading selected folder", ...)`.
- Native parsing operations independently emit `operationStart`, `operationProgress`, `operationComplete` and `operationCancelled`.
- The footer `#status` is also updated by the same activity flow.

**Root problem:** there is no single authoritative activity presentation policy. Several subsystems can decide independently how ongoing work is surfaced.

**Required correction:** one Activity Manager. A long-running operation must either:
- own the detailed modal/progress surface and suppress the compact toast, or
- own one compact docked activity card.

Multiple simultaneous operations may be represented as a deliberate queue/stack with spacing, never as independent fixed-position overlays.

---

### UX-02 — PROJECT / CASE / REGION is globally displayed outside its useful scope

**Severity:** High  
**Status:** Source-confirmed.

The Ribbon currently preserves and renders the legacy `#globalContextBar` with Project, Case and Region below the Ribbon.

The controls are not technically dead. `applyGlobalContext()` filters the legacy Data/plot context and refreshes dataset controls, profile/log/catalog state, list rendering and review state.

However, Field Workspace has its **own per-view Case / Region / Field selectors**. Consequently, the global context bar can appear to do nothing while the user is in 3D / Field, which is exactly the reported behavior.

Additional duplication:
- Save Workspace / Open Workspace also live in this bar.
- Home Ribbon actions proxy those legacy buttons instead of invoking stable commands directly.

**Regression conflict:** `desktop/tests/ribbon-ui.test.cjs` currently asserts that the Ribbon **must preserve** `globalContextBar`.

**Required correction:**
- remove Project / Case / Region from the **persistent** Ribbon presentation;
- preserve its filtering state and show the selectors contextually where they are actually useful: Data, Spatial Profile, Solver Logs and analysis workflows that consume the shared context;
- hide that context in pure 3D / Field focus, Home, Review and Live, where the visible workspace uses different selectors or does not consume the filter;
- bind Ribbon Save/Open directly to command APIs rather than hidden legacy DOM buttons;
- update the Ribbon regression test accordingly.

---

### UX-03 — 3D Focus is not a true focus mode

**Severity:** High  
**Status:** Source-confirmed.

Current Field Workspace CSS intentionally keeps the controls column when the plot is hidden:

```css
.fwGrid.layout-3d {
  grid-template-columns:minmax(0,1fr) 340px
}
.fwGrid.layout-3d .fwPlotCard { display:none }
```

The later resizable-workspace module reinforces the same model by reserving approximately 260–340 px for controls in `layout-3d`.

This is why 3D Focus does not reclaim all available workspace width.

**Required correction:** Focus must mean one content viewport owns the full central workspace. Detailed settings should become:
- a contextual Ribbon group,
- a collapsible inspector drawer,
- or an overlay/popover that does not permanently reserve width.

---

### UX-04 — Field Workspace defaults to simultaneous 3D + companion plot instead of one central tabbed viewport

**Severity:** Critical information-architecture issue  
**Status:** Source-confirmed and regression-locked.

`v14-zz-field-workspace.js` was explicitly built as:

> “top-level Field workspace with simultaneous 3D + 2D companion views.”

Its default state is:

```js
{ companion:'profile', layout:'split', syncTime:true }
```

The UI always creates:
- a 3D card;
- a companion plot card;
- a separate controls card.

The reported desired model is different:
- one large central content window;
- internal tabs such as **3D | Spatial Profile | Time Series | Solver Logs**;
- explicit Split only when the user asks to see two views simultaneously.

**Regression conflicts:**
- `workspace-ux.test.cjs` requires Reset Layout to restore `split + profile`.
- `Program.cs` packaged runtime smoke throws unless it finds **3D + Spatial Profile mounted together**.
- `context-help-resize.test.cjs` requires draggable splitters specifically for 3D + plot + controls.

**Required correction:** replace the default “always companion” model with a tabbed viewport model and rewrite those regressions around the new contract.

---

### UX-05 — Playback is fragmented across independent controllers

**Severity:** Critical state-ownership issue  
**Status:** Source-confirmed.

There are currently several temporal-control systems:

**Spatial Profile**
- `profilePrev`
- `profileTimeSlider`
- `profileNext`
- `profilePlay`
- `profilePause`
- `profileTimeInput`
- alignment and animation-frame controls

**3D Field**
- `fvTimeSlider`
- `fvPrev`
- `fvPlay`
- `fvNext`
- `fvSpeed`
- its own timer and playback state

**Field Workspace**
- `fwSyncTime` (“Follow 3D physical time”)
- synchronization logic that pushes 3D time into Profile / Logs

**3D Compare**
- an additional physical-time synchronization mode: nearest / exact / interpolated.

This means the application has multiple owners for what should conceptually be one physical-time cursor.

**Required correction:** introduce a single Physical Time Controller / store:
- one Play/Pause;
- one current physical-time value;
- one scrubber;
- previous/next frame;
- playback speed;
- synchronization policy/status where applicable.

Compatible views subscribe to that shared time. They do not own separate Play buttons.

The global time controls should be persistently available in the upper Field/Compare Ribbon area, near the current camera synchronization controls, as requested.

---

## Additional audit findings

### UX-06 — 3D is still architecturally a legacy Data view

**Severity:** Critical  
**Status:** Source-confirmed.

`v14-field-view.js` still contains the original implementation that:
- creates `fieldViewTab` inside `.datasetTabs`;
- mounts Field View controls after Data Catalog controls;
- mounts the 3D panel into the Data chart viewport;
- sets `currentDataView='field3d'`;
- originally routed “Open 3D Field View” through `setAppMode('data')`.

A later Field Workspace compatibility layer hides/intercepts that old tab and reroutes it into the new top-level Field mode.

This leaves two competing concepts of where 3D belongs.

**Required correction:** retire the legacy Data-owned `field3d` path. 3D must be owned by Field Workspace only.

---

### UX-07 — Field Workspace reparents legacy DOM nodes between sections

**Severity:** Critical maintainability issue  
**Status:** Source-confirmed.

`v14-zz-field-workspace.js` uses `fwRemember`, `fwMove` and `fwRestore` to physically move existing nodes between their legacy Data locations and Field Workspace.

Examples:
- `fieldViewPanel` is moved into `fw3DHost`;
- `fieldViewControls` is moved into `fw3DControlsHost`;
- Profile / Time Series / Log controls and the main chart are moved into the companion panel;
- leaving Field moves them back.

This is a direct cause of cross-section leakage and state that feels “revuelto”.

**Required correction:** section-owned render surfaces. Shared state/data may be common, but DOM ownership must be stable.

---

### UX-08 — 3D Compare is not owned by Compare

**Severity:** High  
**Status:** Source-confirmed.

`v14-z-field-compare.js` dynamically creates `#fcPanel` inside `#fieldViewControls`.

That panel contains:
- Compare side by side;
- Show 3D difference;
- View 2 case / region / field / component;
- physical-time synchronization;
- Difference mode and related controls.

Field Workspace then forces this panel open when mounting 3D.

The top-level Compare Ribbon therefore does not own a genuine Compare surface; it toggles controls that are children of generic Field View controls.

**Required correction:** Compare must own its own contextual configuration surface, or be an explicit Field submode. It must never appear in Data.

---

### UX-09 — Data and Plots tabs duplicate navigation to the same underlying views

**Severity:** Medium–High  
**Status:** Source-confirmed.

Ribbon Data:
- Time series → `timeSeriesTab`
- Profiles → `profileTab`
- Solver logs → `logTab`

Ribbon Plots:
- Time series → the same `timeSeriesTab`
- Spatial profile → the same `profileTab`
- Solver logs → the same `logTab`

`flRibbonData(..., 'plots')` still executes `setAppMode('data')`; only the Ribbon tab styling says “Plots”.

So Plots is visually a top-level section but technically a second doorway into Data.

**Required correction:** clarify ownership:
- **Data** = import, detected sources, catalog, visibility/data selection.
- **Plots** = visualization/plot composition and active plot configuration.

If both remain top-level tabs, they must open genuinely different surfaces.

---

### UX-10 — Compare Ribbon is also a visual tab over Field mode, not a real section

**Severity:** Medium–High  
**Status:** Source-confirmed.

The Compare action uses `flRibbonField(..., 'compare')`, which enters Field mode and toggles comparison controls. Again, Ribbon identity and underlying app mode diverge.

**Required correction:** either:
1. make Compare a real app surface, or
2. present Compare as a contextual Field tab/submode rather than pretending it is an independent workspace.

---

### UX-11 — One monolithic legacy sidebar contains controls for many unrelated modes

**Severity:** High  
**Status:** Source-confirmed.

The legacy `<aside class="sidebar">` in `index.html` contains hundreds of IDs and controls spanning:
- loading;
- Data views;
- Time Series;
- Spatial Profiles;
- Solver Logs;
- Difference;
- Coupling;
- General Analysis;
- Field Mapping;
- Phase Change / Momentum;
- figure/export controls;
- reference lines;
- and more.

Newer modules inject still more controls into the same control tree or move those controls into another workspace.

This makes “hide irrelevant controls” the dominant UI strategy rather than “render only the current section”.

**Required correction:** split into contextual inspectors owned by each major workspace.

---

### UX-12 — Data and Analysis share the same core workspace DOM

**Severity:** Medium–High  
**Status:** Source-confirmed.

Legacy CSS explicitly shows the same `#workspace` for both:

```css
body.appMode-data #workspace,
body.appMode-analysis #workspace { display:grid }
```

The modes change which controls/data are active rather than changing to separate owned surfaces.

**Required correction:** distinct surfaces backed by the same data model:
- DataSurface
- PlotsSurface
- FieldSurface
- AnalysisSurface
- CompareSurface (if retained as top-level)

---

### UX-13 — Action duplication between Ribbon and viewport controls

**Severity:** Medium  
**Status:** Source-confirmed.

Examples include:
- Probe in Ribbon and viewport;
- Fit / Reset in Ribbon and viewport;
- camera synchronization controls plus local camera tools;
- vector/streamline toggles plus detailed controls.

Not all duplication is bad. A healthy pattern is:
- Ribbon = fast command/toggle;
- inspector = detailed parameters.

The problem is when two equally prominent controls perform the same primary action without a clear hierarchy.

**Required correction:** audit every duplicated action and assign one of:
- primary Ribbon command;
- contextual viewport shortcut;
- detailed inspector setting.

Avoid three equivalent primary buttons.

---

### UX-14 — “Difference” semantics are ambiguous across Analysis and Compare

**Severity:** Medium  
**Status:** Source-confirmed by Ribbon information architecture.

Analysis exposes a generic “Difference”; Compare exposes “Difference” / “Create Δ”; 3D Compare exposes strict 3D difference modes.

These are scientifically different operations, but their labels do not explain the distinction.

**Required correction:** explicit names, for example:
- Time-series Difference;
- Spatial Profile Difference;
- Strict 3D Field Difference.

The UI should expose compatibility requirements where the operation is invoked.

---

### UX-15 — Activity/status information is spread across too many channels

**Severity:** Medium  
**Status:** Source-confirmed plus runtime evidence.

The application may communicate work through:
- `activityToast`;
- scan overlay;
- footer `status`;
- native operation progress;
- component-local status labels.

The overlap screenshot is the most visible symptom, but even without overlap the same operation can be narrated in several places.

**Required correction:** central activity state with one primary presentation and optional detailed drill-down.

---

## Controls that appear “dead” vs controls that are merely in the wrong scope

No audited control was proven to be completely dead solely from static source inspection.

The most important example is Project / Case / Region: it **does perform filtering**, but only in the legacy Data/analysis context. In Field Workspace the visible 3D view has independent selectors, so the global controls produce little or no visible effect there. This is a scope/ownership bug, not necessarily a missing event listener.

Future implementation validation must distinguish:
- command does not fire;
- command fires but updates hidden state;
- command updates a different workspace than the one visible;
- command is a duplicate alias of another control.

---

## Regression tests that must change with the UX refactor

The following current tests encode behavior that conflicts with the desired architecture:

| Test / runtime gate | Obsolete requirement |
| --- | --- |
| `ribbon-ui.test.cjs` | Ribbon must preserve `globalContextBar` |
| `workspace-ux.test.cjs` | Reset must return to `split + profile` |
| `context-help-resize.test.cjs` | Workspace must contain permanent 3D / plot / controls splitters |
| `Program.cs` packaged smoke | 3D + Spatial Profile must be mounted simultaneously |
| legacy Field View tests | Field View may still be treated as a Data dataset tab |

Replacement regressions should prove the new intended behavior instead:
- no persistent global context strip;
- one center workspace with internal view tabs;
- 3D Focus uses the full available content width;
- explicit Split creates two deliberate panes;
- one global playback controller drives compatible 3D/profile/log views;
- Data contains no 3D comparison controls;
- Compare controls cannot leak into Data;
- switching internal tabs preserves scientific state and provenance;
- activity surfaces never geometrically overlap.

---

## Recommended target information architecture

### Persistent top-level Ribbon

- **Home** — open/save workspace, project overview, about/update.
- **Data** — load/import, detected files, catalog, dataset visibility and data-scoped filters.
- **3D / Field** — field viewport, slices, probes, vectors, streamlines, camera, shared physical-time controls.
- **Plots** — Time Series / Spatial Profile / Solver Log plot workspace and plot presentation.
- **Analysis** — physical/numerical analyses.
- **Compare** — only if it becomes a true owned workspace; otherwise make it contextual inside Field/Plots.
- **Export**
- **View**

### Field content model

Default center area:
- internal tabs: **3D | Spatial Profile | Time Series | Solver Logs**.

Optional explicit Split:
- Pane A selector + Pane B selector;
- each pane can host one compatible view;
- no automatic “companion” panel unless requested.

### Controls

- global physical-time player in the upper Field/Compare Ribbon;
- contextual right-side inspector only when useful;
- Focus removes/hides the persistent inspector to maximize content area;
- advanced controls remain accessible via Configure/Inspector.

---

## Implementation order

### P0 — architecture blockers

1. Create central workspace-view state and global physical-time state.
2. Stop moving legacy DOM nodes between Data and Field.
3. Replace default simultaneous companion layout with internal tabs + explicit Split.
4. Remove comparison UI from Data ownership.
5. Replace fragmented profile/3D playback with one global controller.

### P1 — coherence and space

6. Remove persistent PROJECT / CASE / REGION strip and relocate useful context locally.
7. Make 3D Focus consume full content area.
8. Consolidate activity/progress surfaces.
9. Separate Data vs Plots responsibilities.
10. Decide whether Compare is a true workspace or a contextual Field/Plots mode.

### P2 — polish and prevention

11. Rationalize duplicate Ribbon/viewport commands.
12. Rename ambiguous Difference operations.
13. Add section-leak regression tests.
14. Add runtime geometry tests for Focus width, Split panes and non-overlapping activity cards.
15. Update contextual help to match the new model.

---

## Acceptance criteria for the refactor

The UX refactor is not complete until all of the following are true:

- Opening Data cannot expose any 3D comparison configuration.
- Project / Case / Region is not persistently shown under every Ribbon tab.
- 3D Focus expands to the entire central content area except deliberate transient overlays.
- 3D, Spatial Profile, Time Series and Solver Logs can occupy the same central workspace one at a time through internal tabs.
- Split is opt-in and can show two selected views simultaneously.
- There is exactly one authoritative Play/Pause controller for physical-time playback.
- Changing time through that controller updates all synchronized compatible views.
- No Profile-specific or 3D-specific duplicate primary Play button remains.
- Comparison time alignment is a synchronization policy, not a second playback engine.
- Data and Plots no longer look like two labels for the same underlying screen.
- Progress/activity surfaces never overlap.
- Section switching does not physically reparent core control trees between unrelated workspaces.
- Scientific provenance, field association, units, case, region and physical time remain visible after the UI reorganization.
- Existing QuickCup, VTK, probe, difference, vector, export, portable and installer validations remain green after the UX tests are rewritten.

---

## Audit disposition

**Overall UX coherence status:** NEEDS STRUCTURAL REFACTOR  
**Scientific-validation status:** unaffected by this audit  
**Recommended next development version:** v1.6.0 rather than v1.5.2, because the required work changes the information architecture and interaction model rather than applying a small patch.


---

## Automated cross-module sweep findings

After the manual architecture review, all major versioned frontend modules were sampled for cross-mode navigation, DOM injection, global-context dependencies and legacy tab references.

### UX-16 — Analysis modules can fall back to generic or document-level mount points

**Severity:** Medium architectural risk  
**Status:** Source-confirmed; runtime misplacement not yet reproduced.

Several analysis modules use a pattern similar to:

```js
document.getElementById('generalAnalysisModules')
  || document.querySelector('.analysisTools')
  || document.body
```

Affected examples include Flow Analysis, Numerical Performance, Solidification Analysis and Thermal Analysis. Spatial Differences similarly falls back from `differenceTools` to a generic analysis host.

This makes module placement dependent on mount order. If the intended host is unavailable during initialization, a valid control block may still be created in a generic location rather than failing closed and retrying the correct host.

**Required correction:** section modules must mount only into explicit owned hosts. If the host is not available, defer/retry mounting; do not append analysis UI to `document.body` as a fallback.

### UX-17 — Multi-region context is coupled directly to the global context strip

**Severity:** Medium–High dependency  
**Status:** Source-confirmed.

`v13-multiregion-context.js` overrides `refreshGlobalContext()` and directly reads/writes:
- `globalCaseSelect`;
- `globalRegionSelect`;
- `activeContextCaseId`;
- `activeContextRegion`.

Therefore deleting the rejected global Project / Case / Region strip without replacing its **state API** would regress multi-region filtering even though the visible strip itself is the wrong UX.

**Required correction:** separate context state from context presentation:
- keep an internal Data/Analysis context store;
- let contextual Data/Analysis selectors bind to that store;
- remove the persistent global presentation;
- update multi-region logic to consume the state API instead of concrete global DOM IDs.

### Sweep conclusion

The automated sweep reinforces the central audit conclusion: FoamLens needs **stable section ownership plus shared state APIs**, not additional show/hide/reparent patches. The next refactor must explicitly remove generic mount fallbacks and DOM-ID coupling between sections.


---

## Whole-app cross-scope audit — “useful control, wrong tab / wrong scope”

The full frontend sweep found additional cases matching the same pattern reported for Project / Case / Region: the underlying feature is valid, but its presentation or state ownership is too global.

### UX-18 — Global context is valid for Profiles/Data, but wrong when persistently shown in Field/Home/Review/Live

**Severity:** High  
**Status:** Runtime clarified by user + source-confirmed.

The earlier audit correctly identified the persistent Ribbon placement as wrong, but the control itself is **not obsolete**.

`activeContextCaseId` and `activeContextRegion` are consumed by:
- Spatial Profile filtering;
- contextual Solver Log filtering;
- Data Catalog filtering;
- several analysis workflows through the shared series/data model.

The same selectors are misleading in:
- 3D / Field, because each 3D view has its own Case / Region selectors;
- Home / Overview;
- Review;
- Live monitoring.

**Correct target behavior:** keep the shared context state, but make its UI contextual. It should appear in Data/Profile/Log/Analysis workflows that consume it and disappear in pure 3D focus and unrelated top-level surfaces.

### UX-19 — The Data sidebar contains plot-only cards even when the active Data view is Catalog

**Severity:** High  
**Status:** Source-confirmed.

`setDataView()` switches only:
- `timeSeriesControls`;
- `profileControls`;
- `logControls`;
- `catalogControls`;
- `playbackGlobal`;
- chart/catalog visibility.

It does **not** scope the surrounding sidebar cards.

Therefore cards such as:
- Figure;
- Figure element editor;
- Selected curve;
- Phase-change analysis;
- Reference lines

remain part of the sidebar structure even when the user is in Data Catalog, where several of those controls have no meaningful target.

**Required correction:** add view ownership at the card level. Catalog should show catalog/data-source controls, not figure-editing controls.

### UX-20 — Reference Lines mixes controls that belong to different plot types

**Severity:** Medium–High  
**Status:** Source-confirmed.

The single Reference Lines card contains heterogeneous options:
- profile-specific center-X reference;
- time/field-related `U_y = 0` / phase references;
- custom X/Y references.

The code already checks `currentDataView` when drawing some references, proving that the controls are not universally applicable even though they are displayed together.

**Required correction:** show only reference controls compatible with the current plot type, or split them into contextual groups.

### UX-21 — Phase-change controls are globally mounted inside the shared Data/Analysis sidebar

**Severity:** Medium–High  
**Status:** Source-confirmed.

Liquidus/solidus and phase-change configuration are scientifically valid, but the card is always part of the shared sidebar while Data/Analysis is visible. It has no reason to occupy Solver Logs, generic Catalog or unrelated analyses.

**Required correction:** scope phase-change settings to analyses/plots that consume temperature/liquid-fraction semantics.

### UX-22 — Analysis and Data share the same sidebar, so analysis workflows inherit unrelated Data presentation controls

**Severity:** High  
**Status:** Source-confirmed.

Both `body.appMode-data #workspace` and `body.appMode-analysis #workspace` render the same core workspace and sidebar.

Consequences:
- Load Data / Data View controls remain structurally present during Analysis;
- Figure and Selected Curve controls remain present even when an analysis module is the user's task;
- analysis modules are appended into the same legacy control hierarchy.

Some of these controls are useful as source selection, but the current UI does not distinguish “analysis input context” from “plot editing”.

**Required correction:** Analysis should get an analysis-owned inspector while shared source state remains behind an API.

### UX-23 — Several analysis actions silently switch hidden Data views

**Severity:** Medium–High state-ownership issue  
**Status:** Source-confirmed.

Examples:
- Physical Analysis creates derived curves then calls `setDataView('timeseries')` or `setDataView('profile')`;
- Solidification Analysis switches to Time Series;
- Thermal Analysis switches to Time Series;
- Energy Audit switches to Time Series;
- Experimental Validation switches to Time Series;
- Momentum Mechanisms switches to Time Series;
- Temporal Alignment can switch to Time Series.

When these actions are invoked while the app is in Analysis mode, they mutate the underlying Data/plot view state even though that view is not the visible top-level task.

**Required correction:** derived-output creation should not silently repurpose hidden navigation state. Either:
- remain in Analysis and expose an explicit “Open result” action, or
- intentionally navigate to the result and make that transition visible to the user.

### UX-24 — Profile playback, legacy playbackGlobal and 3D playback are three presentation layers over physical time

**Severity:** Critical  
**Status:** Source-confirmed.

The whole-app sweep confirmed:
- `profilePlay/profilePause/profileTimeSlider` are a full playback engine;
- `playbackGlobal` is separately mounted for Profile/Log contexts;
- `fvPlay/fvTimeSlider/fvSpeed` is another full 3D playback engine;
- Field Workspace reparents `playbackGlobal` into its companion controls.

The controls are individually useful, but presenting them independently creates the exact “one Play for Profiles, another for 3D” problem.

**Required correction:** keep specialized interpolation/alignment algorithms internally, but expose one authoritative physical-time transport UI. Views subscribe to it.

### UX-25 — Field-specific panels are structurally children of legacy Data Field View controls

**Severity:** Critical  
**Status:** Source-confirmed.

The following valid Field features are inserted into `fieldViewControls`:
- 3D Compare;
- Animation / Video;
- progressive-performance telemetry;
- vector-analysis controls;
- isosurface and other Field extensions.

Since legacy Field View itself was created inside Data, any failure in hide/restore/reparent logic can expose valid 3D controls in Data — exactly the reported “Synchronized 3D case comparison” leak.

**Required correction:** these features should remain, but their owned host must be a Field/3D inspector that never belongs to Data.

### UX-26 — Plots is currently a duplicate doorway into Data rather than an independent scope

**Severity:** High  
**Status:** Source-confirmed.

Ribbon actions under Plots route to the same legacy `timeSeriesTab`, `profileTab` and `logTab` while calling `setAppMode('data')`.

So a user can select a top-level “Plots” tab while the underlying top-level app mode remains Data.

**Required correction:** either:
- remove Plots as a fake top-level workspace and expose plot views as internal tabs of a real plot/Field workspace; or
- build a true Plot surface with its own ownership.

### UX-27 — Compare is also a duplicate doorway into Field

**Severity:** High  
**Status:** Source-confirmed.

The Ribbon Compare tab calls `setAppMode('field')` and manipulates Field controls. It is not a separate app surface.

**Required correction:** treat Compare as contextual Field tooling unless/until it becomes a genuinely independent workspace.

### UX-28 — Legacy navigation and new navigation coexist simultaneously

**Severity:** Medium technical-debt / regression risk  
**Status:** Source-confirmed.

Examples:
- legacy `datasetTabs` still include a generated `fieldViewTab`;
- Field Workspace later hides/intercepts that tab;
- legacy `modeField` can still be created even though the Ribbon hides the old mode navigation;
- legacy “Open 3D Field View” first targeted Data and is later patched to Field.

These paths are mostly compatibility scaffolding, but they increase the number of ways a future change can reintroduce controls into the wrong section.

**Required correction:** after the v1.6 surface model is stable, remove obsolete navigation shims instead of keeping permanent interception patches.

### UX-29 — Analysis modules can be valid but mount in the wrong place if initialization order changes

**Severity:** Medium architectural risk  
**Status:** Source-confirmed.

Flow Analysis, Numerical Performance, Physical Analysis, Solidification Analysis, Thermal Analysis and Vector Derived Fields may fall back from their intended analysis host to `.analysisTools` and ultimately `document.body`.

The feature itself is valid. The fallback presentation is not.

**Required correction:** fail/defer mount until the correct owned host exists. Never use `document.body` as a normal analysis-controls fallback.

---

## Updated scope rule

For the v1.6 refactor, the governing rule is now:

> **Do not delete a control merely because it is useless in one tab. First identify the state/function it serves, then show it only in the views that consume that state.**

Examples:
- Project / Case / Region: keep for Profiles/Data/Analysis; hide for pure 3D and unrelated surfaces.
- Phase-change settings: keep for thermal/phase workflows; hide from Catalog/Logs.
- Figure controls: keep for plot views; hide from Catalog and non-plot analysis contexts.
- Compare controls: keep in Field/Compare context; never leak into Data.
- Physical-time playback: keep all required algorithms, but expose one global transport UI instead of multiple competing primary controls.


---

## Implementation disposition — validated through run #782

**Validated product head:** `2b0e54c31e3dc0a6fa48b2b33a5c90fa1ee9bca2`  
**GitHub Actions:** #782 — SUCCESS

The v1.6.0 implementation now materially closes the following audit findings:

- **UX-01 / UX-15:** unified activity presentation prevents compact/detailed progress overlap.
- **UX-02 / UX-17 / UX-18:** Project / Case / Region presentation is contextual and its state now lives behind `FoamLensContextStore`, independent of selector DOM.
- **UX-03:** 3D focus uses the central workspace without a permanent controls column.
- **UX-04:** Field uses internal 3D / Spatial Profile / Time Series / Solver Logs tabs with explicit Split.
- **UX-05 / UX-24:** Field exposes one primary physical-time transport while specialized legacy engines remain internal.
- **UX-06 / UX-28:** 3D is no longer a Data dataset view; `fieldViewTab`, the hidden `modeField` fallback and `setDataView('field3d')` navigation are retired.
- **UX-08 / UX-25:** 3D comparison and Field controls remain permanently Field-owned rather than returning to Data.
- **UX-09 / UX-26:** the fake top-level Plots alias is removed.
- **UX-10 / UX-27:** the fake top-level Compare alias is removed; comparison remains contextual in Field.
- **UX-14:** 2D Curve Difference / Δ and Strict 3D Δ are explicitly distinguished.
- **UX-16 / UX-29:** audited Analysis modules no longer fall back to generic `document.body` hosts.
- **UX-19 / UX-20 / UX-21 / UX-22:** sidebar/control presentation is scoped by active workflow; Analysis owns a stable inspector surface.
- **UX-23:** derived Analysis output creation no longer silently switches hidden Data views; explicit Ribbon handoffs open Time Series or Spatial Profile.

### Still open by design

- **UX-07 / UX-12 (remaining renderer boundary):** the singleton interactive 2D `.chartwrap` is still shared across Data / Analysis / Field and is the final deliberate compatibility bridge.
- It was not replaced with a fixed-position portal because that would introduce clipping/scroll/overlay risks.
- It was not duplicated into a second canvas because the current renderer's hover, pinning, legend drag/resize and interaction handlers are coupled to the singleton canvas.
- The next architecture block should extract a reusable 2D Plot Surface / interaction controller so each workspace can own a stable render surface without duplicating scientific plot logic.

### Prevention

The new `section-ownership.test.cjs` and updated Field/Ribbon/Analysis regressions prevent reintroduction of:
- legacy Field navigation;
- fake top-level aliases;
- 3D/control-tree leakage back into Data;
- Analysis `document.body` fallback;
- hidden Analysis plot navigation;
- ambiguous 2D-vs-3D Difference labels.



---

## Final renderer-boundary disposition — validated through run #792

**Validated product head:** `48599763a1c8bdbe9b6445f5ee361c88f9c91e7b`  
**GitHub Actions:** #792 — SUCCESS

The final open renderer items from the previous disposition are now closed:

- **UX-07 / UX-12 — CLOSED.**
- Data, Analysis and Field each own a stable 2D plot surface.
- Field no longer borrows or restores the Data/Analysis `.chartwrap`.
- The scientific renderer remains shared at the function/model level instead of the DOM-node level.
- Interactive behavior is shared through `bindPlotCanvasInteractions(canvas)`, so hover, point pinning, figure selection, legend drag/resize and direct manipulation remain consistent on every surface.
- The active surface receives the legacy canonical plot IDs so existing renderer/export code remains one implementation, while inactive surfaces keep scoped IDs.
- Surface switching preserves each workspace's plot view, pinned points and active-series identity.
- No fixed-position or absolute overlay portal was introduced.

### Runtime validation
The Windows packaged and installed smokes now explicitly cycle:

`Field → Data (Catalog) → Analysis (Time Series) → Data (Catalog restored) → Field`

and verify:
- exactly three stable surfaces exist;
- Data and Analysis remain parented to `chartViewport`;
- Field remains parented to `fw2DHost`;
- the canonical `#canvas` belongs to the active workspace at every transition;
- parent relationships remain unchanged throughout the cycle.

### Audit status
The previously identified cross-section DOM ownership boundary is now fully resolved. Any future movement of the 2D chart between top-level workspaces is considered a regression and is blocked by `plot-surfaces.test.cjs`, `section-ownership.test.cjs`, Workspace UX tests and the packaged runtime smoke.
