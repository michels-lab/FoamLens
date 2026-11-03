# Granada G81 — original current-main Field F1 B13 physical Windows acceptance gate

3 November 2026. QA-only, no release and no change to the original solver or experimental files.

FoamLens Field F1 (#162) and per-panel layout F2 (#175) have both landed in main. Previous B13 main-only QA checked merely that a packaged WebView2 executable launched with original case data; it did not demand **View B metal+mold+metric XYZ** pass or that a real source-backed Field screenshot exist on **each** separate native startup. This change fixes that false-positive gap.

Existing G20 private-source fetch remains a **bare Git checkout of original QuickCup Git objects on the disposable Windows runner**. Private OpenFOAM files never enter an Actions artifact. Original file content SHA-256 is verified, one original physical simulation is cloned into five distinctly labeled test identities, with the asymmetric clone only omitting mold T at 9.8. No invented temperatures or new numerical simulation.

For each of two Portable and two Installed launches, independently:
- set unique `FOAMLENS_BRAND_EVIDENCE_DIR` before launching the actual executable;
- demand original native WebView2 logs reporting physical multiregion WebGL and **View B independent metal/mold + metric XYZ** as well as both original successful smoke markers;
- demand **fresh** `field-real-multiregion.png` in that launch's unique directory, verify all PNG chunk CRCs and geometry, retain **only** image SHA-256/width/height/size plus signed-binary status in sanitized evidence;
- fail immediately if any of the four original launches lacks scientific source evidence, log marker or actual PNG.

This remains a technical display/screenshot gate: **not visual owner signoff, physical Windows 125–200% DPI, independent scientific accuracy, a signed/updatable release or validation against experimental curves**. Test negative cases specifically fail when screenshot absent, corrupt or truncated and when evidence markers are missing. The source repo's existing main-only G20 workflow is reused; no new parallel app/product build or beta/RC.
