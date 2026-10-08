# Copilot instructions — FoamLens


## Desktop About placement (mandatory)

Every desktop application must display a clearly labeled, usable **About** action in its **fixed top application header** from initial launch and in every workspace. It must remain visible when the window is compact/high-DPI, the body is scrolled or a sidebar is collapsed; footer-only, Home-only, offscreen or hidden-overflow About is forbidden. Keep the header outside the scroll container and validate its actual rendered visibility and click bounds. Source of truth: `michels-lab/Michel-Software-Standards/standards/BRAND_NATIVE_INTERFACE_STANDARD.md`.

Read `AGENTS.md`, `docs/GIT_AUDIT_LOG.md` and the relevant workflow/tests before modifying FoamLens.

Keep scientific evidence and provenance explicit. Never invent OpenFOAM values, associations, topology compatibility or causal interpretation.

Fix UI ownership problems at the component/workspace level rather than hiding controls with accumulating overrides. Preserve separation among 3D Field View, Spatial Profiles, Time Series and Solver Logs.

Use current-commit regression tests and Windows build/smoke validation where applicable. Update the project audit log for meaningful changes. Do not publish a release unless explicitly assigned.

Official FoamLens branding is geometry-first. Preserve the approved layered-field/topographic geometry, but adapt color/material/motion to the surface. Use the motif in contours, depth, focus states and scientific UI where appropriate. Do not satisfy branding by repeatedly pasting the SVG into screens; the logo is a design language, not a sticker.

Product identity / About are fundamental product contracts. Treat the approved layered-field/topographic geometry as the visual foundation across FoamLens, not as a sticker. About must lead with FoamLens identity/version, then About the author with the canonical Michel Duarte portrait, then the official Michel's Lab parent-brand mark, then social links rendered as **network icon + visible network name** using canonical profile URLs.



For logo/About/branding work, follow the Michel-Software-Standards Product Identity Standard and BRAND_ADOPTION_PLAYBOOK. Replace actual platform identity references, adapt the official geometry to this app's existing visual language, avoid sticker-style logo placement, preserve unrelated behavior, validate the build, and do not release without explicit authorization.

## Structured handoff requirement

For any tracked Michel's Lab task, return enough machine-readable continuation context for the master handoff registry:

- task ID and repository;
- owner/role and branch;
- outcome;
- commits and areas changed;
- validations that **actually ran** and their real result;
- evidence status: `verified`, `inferred`, or `blocked`;
- remaining work;
- blockers/manual evidence still required;
- suggested next owner/role when useful.

Do not list planned tests/builds/device checks as completed validation. If required validation was not performed, the task must be released/handed back with that work pending rather than described as complete.

<!-- MICHELSLAB_SHARED_CONTRACT_BEGIN id=child-agent-core version=2026-10-08.2 -->
# Michel's Lab shared child-agent contract

This managed block is cross-project policy. Repository-specific instructions may add stricter local rules outside this block, but they must not weaken or contradict it.

## Shared authority

- Michel's Lab shared standards, product identity, governance, release and coordination rules are authoritative in `michels-lab/Michel-Software-Standards`.
- Keep product implementation truth and product-specific audit logs in this child repository.
- Do not silently invent a conflicting local Michel's Lab rule.
- Never commit secrets, credentials, signing material, private tokens or passwords.
- Historical green CI is not proof for the current commit.

## Product identity / About

- Preserve the approved product-logo geometry; contextual color, material, lighting and motion may adapt without identity drift.
- Branding is a design language, not sticker placement.
- About hierarchy is **Product identity → paired author/studio composition → social profiles**.
- The paired author/studio composition should show **Michel Duarte** and **Michel's Lab** side by side when width permits: portrait + name + developer role on one side; official Michel's Lab logo/lockup + studio name + canonical slogan **`TOOLS WITH IDENTITY.`** on the other.
- Narrow/mobile layouts may stack responsively, but the author and studio must remain visually grouped as one intentional composition.
- Do not replace the Michel's Lab slogan with a paragraph-length studio review by default.
- Use the current canonical Michel Duarte portrait and the official Michel's Lab parent-brand assets from the master authority when implementing/updating About.
- The canonical portrait file is immutable: child repositories must vendor it byte-for-byte. Never resize, crop, recompress, retouch, regenerate, convert or rewrite the portrait asset itself; use render-time layout/object-fit/masking only.
- Visible social controls use recognizable network icon **and** visible network name with canonical profile URLs.


## Brand-native design and workspace architecture (mandatory)

- Product logo geometry is the source of the app's **entire UI design language**; do not paste a canonical SVG in an unrelated sticker card and call branding complete. Use shared typography, spacing, geometry, control and motion tokens from that identity.
- Keep official mark + readable product name and global About/Updates persistently visible independent of collapsible sidebar and selected workspace. No duplicate massive lockup/heading.
- Data shows only data ingestion/catalog/filter controls, Field only 3D tools, Analysis only scientific analysis. Prefer a single 3D view by default and explicit coherent comparison state.
- Compact/one-at-a-time contextual subbars should preserve actual scientific canvas. No persistent overlays hiding a simulation or axis gizmo.
- At normal desktop widths/heights, the initial About viewport must show portrait, product, studio slogan and all five recognizable social icons **with visible names without scrolling**; test viewport intersections, not just existence or scroll reachability. Review actual screenshot.
- On large imports, progress feedback has clear preparing/loading/stalled/completed/failed states and cannot hang forever at zero progress.
- Apply `standards/BRAND_NATIVE_INTERFACE_STANDARD.md`; never claim a cohesive redesign without actual installed-surface screenshots, scientific functional checks; the owner reviews the release afterward.

## Rendered visual brand release gate — mandatory for every app

- For launch, splash, About, launcher or product-identity changes, follow `standards/BRAND_VISUAL_VALIDATION_STANDARD.md`. Checking that an official asset exists/decodes or that a build passes is **not** visual acceptance.
- Inspect computed final UI geometry, theme/text contrast, clipping/overlap and duplicate lockup/heading. CI must fail for known visual violations; require automated screenshots from the exact candidate; the owner performs visual review after release.
- Validate relevant viewport sizes/themes in the actual browser/native/mobile runtime, including the packaged app where possible. If evidence is missing, explicitly report `pending visual review`; never say branding is complete from static tests alone.

## Canonical identity asset precedence

- Product-logo authority is `shared-assets/product-logos/manifest.json` in the master standards repository.
- Michel's Lab parent-brand authority is `shared-assets/michels-lab/manifest.json`.
- Assets explicitly marked legacy/rejected must never supersede the current canonical geometry.
- When `.michelslab/identity-sync.json` marks an identity section `enforced`, child canonical copies must match the master source exactly; hash drift is a governance defect.
- When identity state is `migration_pending`, do not auto-replace local assets. Stop, reconcile the active surfaces explicitly and preserve the approved master geometry.
- A local filename such as `official-*.svg` is not proof of authority by itself; authority comes from the current master manifest and identity-sync policy.

## Cross-chat coordination

- Tracked work follows the master claim lifecycle: `unclaimed → claim → heartbeat → complete/release → structured handoff`.
- If a different owner holds an active non-stale claim, stop instead of duplicating edits.
- A stale claim requires a freshness check before resuming/reclaiming work.
- A claim is coordination state only; it is never validation or release permission.
- Return branch/commit/evidence information so the master claim can be heartbeated, completed or released correctly.

## Structured handoff

For tracked work, return:
- task ID and repository;
- owner/role and branch;
- outcome;
- commits and areas changed;
- validations that **actually ran** and their real result;
- evidence status: `verified`, `inferred`, or `blocked`;
- remaining work;
- blockers/manual evidence still required;
- suggested next owner/role when useful.

Never list a planned build/test/device/store check as completed validation. If required validation was not performed, hand the task back with that work pending instead of claiming completion.

## State truth before status/release claims

Before answering or handing off any question about what is current, released, published, ready, or pending, resolve four independent dimensions from current evidence:

1. **Working HEAD** — current branch/default-branch SHA and relevant PR/branch state.
2. **Latest stable release** — actual published tag/version, publication timestamp, release commit/artifacts.
3. **Same-SHA CI** — validation for the exact commit and affected distribution channel.
4. **External provider state** — Store/Play/cloud/device/provider evidence such as uploaded, certified, published or delivered.

Never collapse these into one status. A newer `main` does not make the latest release newer. A built MSIX/APK/installer is not a Store/Play publication. A GitHub release is not provider publication. If `main` is ahead of the stable release, say so explicitly.

After a merge, release, tag or provider mutation, re-read authoritative state before the final status answer or handoff. If a generated queue/gate conflicts with newer evidence, route reconciliation instead of repeating completed product work.

## Multi-channel distribution and contract-test robustness

- If an app ships through more than one channel (for example direct GitHub Setup/Portable plus Microsoft Store MSIX, or direct APK plus Google Play), treat each channel as a separate validation surface over the shared source.
- A change to shared runtime, version, packaging, updater or identity code must run the affected channel validations on the **current commit**. A Store/Play workflow that only runs on a special distribution branch is insufficient once its shared implementation lives on the default branch.
- Store-managed builds must not also self-update from the direct-download feed unless the product explicitly documents and validates that dual-update design.
- Package creation is not provider publication. Keep evidence states separate: package built/validated → uploaded → certified/approved → published → delivered/installed.
- One authoritative product version must drive all channels. Never use a previous real release number as a runtime/version fallback because it can silently report stale identity; derive from authoritative metadata, fail clearly, or use a neutral non-release sentinel.
- Contract/regression tests must be portable across CI platforms. Normalize or tolerate CRLF/LF and path-separator differences and prefer structural/semantic assertions over exact whitespace or source-format matches.
- Syntax-check executable test/validation scripts before relying on them as semantic gates (for example `node --check` or `python -m py_compile` where applicable).
- When a channel is added or materially changed, update the app audit log and the master store/release gate. Do not describe the channel as published until provider evidence exists.

## Release and evidence boundary

- Do not publish/release unless explicitly authorized.
- Manual/device/store/provider validation remains pending until actually performed.
- Do not fabricate screenshots, device behavior, store status, cloud/provider state or test results.
- Preserve unrelated known-good behavior and keep changes bounded to the assigned task.
- For installable Windows apps, the canonical direct release is built by GitHub Actions from the authorized commit/tag and delivers a real Setup installer as the normal-user artifact.
- Use `<Product>-Setup-vX.Y.Z.exe` for the recommended installer. If a portable build is also shipped, name it explicitly `<Product>-Portable-vX.Y.Z.exe`; never leave the portable filename ambiguous when both exist.
- For installable Windows apps, separate evidence into **BUILD PASS → INSTALL PASS → LAUNCH PASS → FUNCTIONAL PASS**. A green installer/build job is not proof that the installed application starts.
- Smoke-test the generated Windows installer by actually installing it and then **launching the executable from the installed location** before uninstalling. Merely verifying that the EXE exists is insufficient.
- Installed-app LAUNCH PASS requires either a normal GUI process that remains alive long enough to expose a real top-level window, or an app-owned deterministic smoke mode that boots the real installed UI/runtime path and emits explicit success evidence.
- If installed startup fails, preserve process exit/lifetime plus available app logs and Windows Application/.NET crash evidence before failing CI.
- A portable launch PASS and an installed-app LAUNCH PASS are separate claims when both artifacts are shipped.
- Publish SHA-256 for direct Windows binaries. Authenticode/code signing, when available, must happen before final checksum publication. Without a publisher certificate, do not hide or misrepresent Windows Unknown publisher/SmartScreen behavior.
- FoamLens and Michel's Life are the current Windows release references; Michel's Life also demonstrates optional Authenticode and a separate Microsoft Store MSIX path.

## P0 rendered-UI validation — automated before release, owner review after release

- Source scans, build success, hashes and static assertions are not sufficient evidence of a visible working UI. Each release must automatically launch the real built/installed candidate and capture Home, About and every changed UI surface in at least two appropriate viewports, verifying meaningful nonblank pixels, element bounds, unobstructed controls and reachable Close/Back and scrolling.
- Associate the screenshot manifest with the exact source SHA and packaged artifact SHA-256. Missing, corrupt, stale or visibly invalid automated evidence is a **CI failure** and blocks release; capture and functional checks remain mandatory. Never fabricate images or treat static checks as rendered validation.
- **Human screenshot approval is NOT a pre-release gate.** Michel visually reviews the captured screenshots and installed UI **after** the automated release. Never create or require a protected `visual-release-approval` Environment, reviewer approval, or a manual waiting step for publication. When his post-release review exposes a regression, log P0 and correct it in a new validated release.
- Source of truth: `michels-lab/Michel-Software-Standards/standards/RENDERED_UI_RELEASE_GATE.md`. Record **SOURCE, BUILD, LAUNCH, RENDER, POST-RELEASE VISUAL REVIEW and DEVICE** independently. Do not claim device tests or review occurred until there is actual evidence.
- Release remains subject to **explicit user authorization** and passing automated CI; absence of human pre-publication review alone is never a blocker.
<!-- MICHELSLAB_SHARED_CONTRACT_END id=child-agent-core -->
