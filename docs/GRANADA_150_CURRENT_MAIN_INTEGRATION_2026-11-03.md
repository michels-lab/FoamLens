# Granada #150 — current-main merge reconstruction (2026-11-03)

**Purpose:** preserve today's real `main` as the product baseline and transplant only verified existing source-owner `checkMesh` files into PR #174. This is a candidate for review, not a release or finished scientific validation.

- Current `main` baseline at reconstruction: `390c5b6d78498c8591396ac5a562642e961e737d` (tree `289df68f365e3a6f6977f160bda968b83c39ee1f`).
- Source-owner previous branch: `790595eb541f0a32a4ab153b74694b9ee57d2540`; negative regression and namespacing original repair was merged via PR #187.
- The resulting branch merge commit has **two parents** (original #174 HEAD + actual main). The entire base tree is the exact current-main tree, with only seven original #174-only source/test/workflow/docs blobs added, plus this note. All existing main files (Program.cs, index.html, source workflows, fields, release files, case data, UI, other modules) are preserved unchanged. This is NOT force-pushing another developer's branch.
- Source modules: v24 checkMesh, two focused tests, two existing checkMesh workflows, two existing documents. Workflows and test prerequisites must be rerun on the **new merge HEAD**; previous correction-branch CI is not evidence of this new candidate.
- Negative failure previously observed: `meInstall`, `meExport`, and DOM ID collisions with `v16-multipanel-export.js` in the same IIFE. Existing `checkmesh-multipanel-collision.spec.cjs` must reject this failure.
- **Next exact gates:** observe new PR CI on the merge SHA; verify no workflow/runtime regression, real multi-region `checkMesh -region metal/mold` reports against source-bound meshes, genuine Setup/Portable, physical Windows DPI and aesthetic signoff; only then consider merging #174 into `main`. Release gate #238 still open; no RC/beta/stable release from this operation.
