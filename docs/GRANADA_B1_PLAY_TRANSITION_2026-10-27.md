# FoamLens — Granada Block 1 / P0: eliminate the Play width transition race
**2026-10-27.** Original Play issue [#230](https://github.com/michels-lab/FoamLens/issues/230); P0 owner. This is a narrow candidate requiring native WebView2 original scientific-case acceptance **before** merge; **not a release**.

## Direct field evidence
The original installed [full Windows OpenFOAM QuickCup #40560131653](https://github.com/michels-lab/FoamLens/actions/runs/40560131653) failed with:
- Native **1140px** Field, original `#fwTimePlay` `playWidth=70.390625px`, `playClientWidth=68`, `playHeight=30`, and `playNotCollapsed=false` (the fail-closed original requirement is **at least 100px wide × 28px high**).
- Correct original metal/mold case, physical time 9.8s, camera and physical geometry assertions; Play original loop aria and label were present. G7/G12/G16 stylesheet nodes present, `gfwCompact=false`. Review/Live candidate #180 had no original Field/Play changes.
- Original source `frontend/index.html` rule `.btn{...;transition:.14s;...}` implies `transition-property:all`. At 640px compact the G7 Play width can be 68px; at 1140px wide, original G12/G16 force 112px with `!important`. **CSS transitions are allowed to override `!important` during active transitions**, so a failing native width close to 68px is consistent with a transition snapshot rather than a missing stylesheet. This is a strongly supported causal mechanism, not proof that no other WebView2 defect exists.

## Independent real-browser reproduction (not a substitute for installed Windows)
An isolated headless Chromium 640→1140 CSS-viewport reproduction, retaining a real button with `transition:.14s`, a compact 68px `!important` min-width and wide 112px `!important` min-width, measured the initial wide-frame min-width at **68px**, then intermediate **73.57px / 95.19px / 111.95px**, finally 112px. In the same browser, setting the original button's transition property to only `background-color, border-color, color` yielded **112px immediately** on the same transition. This demonstrates the specific CSS transition race in Chromium, not yet native installed evidence or a final owner-reviewed release.

## Narrow change and guard
- Extend only the **existing original** versioned `v33-granada-wide-play-cascade-guard.js` stylesheet: `#fwTimePlay{transition-property:background-color,border-color,color!important}` outside its 1025–1250px media block. The Play's width, min-width, padding and grid geometry now change synchronously at **both** compact and wide widths, while original hover/focus color changes remain animated. No new DOM control, setInterval/resize mutation, new event listener or changed scientific state.
- Preserve the original G12/G16 minimum 112px wide rule at 1025–1250px and original G7 physically compact-only rule at <=1024px; no change to the native `playNotCollapsed` 100×28px threshold or original source physics.
- Reuse the two **existing** Play tests, adding adversarial assertions that reject removal or weakening of the new CSS transition-property rule and verify it is **outside the media scope**. CI on Windows and Ubuntu still runs source/ownership/Play playback/loop.
- Dedicated Play issue #230 remains OPEN unless **repeated real installed AND portable native QuickCup B13** (at least 3+3 starts), all 7 camera presets and Play during 640→1140 resizing are verified, plus physical monitor DPI 125–200% and owner visuals. Any failing original physical Play gate is a real red, not a test infrastructure issue.

## Granadas / release linkage
- Parent owner priority: [master execution plan](GRANADA_MASTER_PRIORITY_EXECUTION_2026-10-27.md), **block 1** stability. Next within block 1: exact bundled JS safety #252; WebView2 user-data retention #244/#245. Block 2 existing Review/Live #180 recheck only after P0 Play proof.
- Public v1.8.10 unchanged. No tag, installer/update distribution, release-candidate, beta or prerelease. Signing/36 owner screenshots/physical OS DPI remain independently blocked under [#238](https://github.com/michels-lab/FoamLens/issues/238).
