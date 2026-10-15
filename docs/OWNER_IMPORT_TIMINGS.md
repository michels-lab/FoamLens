# Reproducible FoamLens import comparison

FoamLens Desktop can export a privacy-safe `FoamLens_import_performance.json` report from the Ready screen after each scientific import. These reports contain timing stages, coarse counts and file-kind metadata, **not** the user's raw simulation values, private paths or filenames.

## Procedure

1. Use the **same unchanged OpenFOAM dataset**, FoamLens version, machine, power mode and settings on each run. Record whether the first run was genuinely cold (no persistent caches), or simply the first run of the session. Do not call a run cold when caches were already populated.
2. Import it and export the performance report. Rename the JSON to `first-run.json`. Reopen the same dataset without modifying input data and export a second report as `repeated-run.json`.
3. From the repository folder, run `node tools/compare-import-performance.cjs first-run.json repeated-run.json` with Node.js 22 (or a compatible modern Node.js version). Optionally redirect stdout to a local JSON file.
4. Review the reported stage deltas and `speedupX`, paying attention to null stages. A stage that was not run is **unknown**, never zero. Negative deltas mean the repeated run took longer.

The comparison **rejects** different application versions, import modes, file/series/case counts, known total source bytes or known file-kind counts. It intentionally cannot verify exact dataset identity because the exported report excludes source paths and contents. A matching report is not proof that all physical values are identical. All computed metrics should be identified as UI timing checkpoints, not separately measured Windows startup, peak memory or responsiveness.

For issue #117, the original owner-device screenshot showed 3,008 files and 184.8 seconds in an earlier release. That number is a historical reference, **not** a measured benchmark for current code. A real report from the owner's unchanged dataset, with actual cold and warm runs and CPU/RAM readings, is still required to establish speedup.

## Security and interpretation

The comparison operates entirely on local JSON files and does not upload them. Its output contains selected counts, stage durations and a warning about unverifiable dataset identity; it does not echo arbitrary report fields. No fabricated physical times, missing solver audits or synthetic performance claims may be inserted into the result.
