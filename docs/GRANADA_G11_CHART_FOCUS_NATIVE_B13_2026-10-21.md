# FoamLens Granada G11 — real original QuickCup B13 chart focus native evidence
Date: 2026-10-21

G11 is **source-integrated in main** (source [PR #221](https://github.com/michels-lab/FoamLens/pull/221), merge `1cd0bc1a7d14e16e85acf4ec5cf1e24e344790ea`) but the dependent original G8 compact layout and G7 scientific composite are not yet publicly merged. Therefore real B13 testing happens ONLY in this stacked test branch based on original G10 real Setup/Portable G8/G9 composite `03e60614323dc52ded29e070d6982ea5f85b1d5a`, with **no release or RC**.

## Original user experience

- Under compact Data → Time Series and at <=720px width, <=920px height, enable the source-backed `Chart Focus` layout *without changing raw data, scientific zoom or the saved `seriesPanelHidden` preference*.
- Draw the original `#workspace>.plotcard` at maximum available height; keep `#timeSeriesControls` accessible as a short scrollable selector section, with the original `#seriesPanel` available on demand via an accessible **Show series** button. This is temporary responsive display; no data is deleted. The original Fit button remains visible and only changes zoom when the human explicitly clicks it.
- All other modes, wide layouts, and G8-absent main remain unaffected. If original list was already intentionally saved hidden, do not force it open or overwrite its preference.

## Native evidence criteria

The original workflow preserves exact G7/G8/T1/G10 source pins, 16 scientific owner/CAD regressions, physical QuickCup B13 metal+mold original SHA checks, native WinForms/WebView2 and Setup+Portable 36 screenshot slots. G11 exact merged file `desktop/src/FoamLensDesktop/frontend/v30-granada-chart-focus.js` has Git blob `882bc133738040e4cc8012c57706501a45828c1d`. Stage this source into the **ephemeral Windows test checkout only**, assert module presence inside compiled `AppBundle.zip`, run all 11 source-level responsive tests and capture the source-backed UI after original case loading.

Compare original Windows installed/portable 640×900 Time Series screenshot against [G10 baseline 39679474490](https://github.com/michels-lab/FoamLens/actions/runs/39679474490): visible viewport height, whether the X axis remains cut/needs scroll, whether Show series is reachable, whether the original Fit and Export Preview actions and numeric raw field label remain present. Report genuine visual defects instead of inferring acceptance from CI. DPI physical 125–200% and actual user aesthetic approval remain outside this automated suite.

**Status at authoring:** test-only source staged; Windows workflow result not yet asserted. No public release, unsigned installer distribution, tag, RC, or private OpenFOAM data upload.
