# FoamLens — GRANADA G8 / Time Series compact canvas-first (2026-10-21)

## Actual original visual evidence (not aesthetic approval)

Downloaded original immutable GitHub Actions artifact `Granada-field-cad-observable-native-evidence` (artifact 12371970820), produced by [real Windows B13 G7 workflow 39653782246](https://github.com/michels-lab/FoamLens/actions/runs/39653782246) on PR #207 source SHA `ddbd8405c9d4d1c7efc7f0e065a82fce16208c4f`. Actual **640×900** installed and portable Time Series images show the original case/import sidebar taking more than half the screen width, leaving only a narrow right-hand chart. This is evidence of a persistent usable-plot-area problem despite passing strict 36-slot screenshot integrity; successful capture **is not UX acceptance**.

**Manual reviewed image:** `granada-installed-portable/evidence/visual/installed/time-series-compact.png` within the above artifact. No artificial or simulated screenshots are used for the defect observation; physical OS DPI 125–200% was not tested by this review. Field/Analysis G7 already have separate source-owned fixes in #205; do not overwrite them.

## G8 implemented in independent source branch

- `desktop/src/FoamLensDesktop/frontend/v28-granada-compact-timeseries.js` activates ONLY in **Data → Time Series at CSS width ≤1024px**. It temporarily relocates the **original `#timeSeriesControls` node** to the **original `#workspace>.plotcard`** above its scientific chart. It never clones source selectors, rewires variable/probe/case callbacks, changes physics, loads data, deletes cases, manufactures a time series or alters persistence.
- A compact, accessible **Cases & import** action in the existing fixed top utilities opens the **original `.sidebar`** as an explicit dialog for imports, cases and advanced settings; same data, handlers and permissions. Escape/focus restoration/Tab trap/backdrop, ARIA labels, EN/ES and reduced motion included.
- **Build field history** is a visible contextual action beside the original Time Series controls: it opens and scrolls to the original `#fwDataFieldHistories` generator when present; it **does not pretend to execute or complete generation**. It is disabled when the original builder is unavailable.
- The narrow chart and original series list use a full-width, vertically stacked layout. Wide or other tab/mode selection restores the same scientific controls to their exact original sidebar position; no saved UI preference is mutated. G7 Field/Analysis remains independent and unaffected.
- Read-only `window.FoamLensGranadaG8.audit()` distinguishes runtime presence/compact state/original-node identity/errors and explicitly records `humanVisualApproved:false`.

## Checks / integration truth

- `tools/granada_g8_compact_timeseries.test.cjs` tests DOM identity, original source path, wide→compact→wide restoration, changing Data tabs/modes, live accessibility, keyboard and history-builder delegation, bilingual labels and no physics APIs.
- `.github/workflows/granada-g8-compact-timeseries.yml` is dedicated Ubuntu/Windows source regression, including existing original Time Series source-catalog regression.
- **Before exact CI result:** candidate only; no claim of real installed G8 screenshots or user aesthetic approval. A G7 screenshot with a narrow graph is *before* evidence, not G8 success.
- Must integrate into the G7 12-owner composite **ephemerally and source-pin exact immutable owner SHAs**, then rerun real B13 installed+portable screenshot/physical control checks for G8. Inspect the actual new chart, legends, units and cases rather than trusting Node DOM tests. Review at 640/1140 CSS px and Windows OS 125/150/175/200% DPI before releasing.
- G8 branch is not to be merged into #181 Time Series or #205 G7 without owner coordination. No RC/beta/preview; final stable release only after full release protocol.

## Owner review checklist

- [ ] Original plotted curves, Y axes, legends/units and cursor interactions remain correct; original selector choices unchanged.
- [ ] Chart at 640 CSS px is measurably wider than the old 640 image; no horizontal clipped overlay, no false numerical output.
- [ ] Case comparison/import and actual field-history builder reachable, not silent placeholders.
- [ ] Time Series controls visibly present without opening drawer; other Data modes unchanged.
- [ ] Real Windows installed+portable G8 36-capture repeat with image integrity, human visual sign-off and physical DPI matrix.
