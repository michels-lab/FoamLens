# FoamLens — Agent Contract

FoamLens is a scientific OpenFOAM analysis product with a Web frontend and a Windows C#/.NET 8/WinForms/WebView2 desktop host. Before editing, read `.michelslab/project.yml`, `MICHELS_LAB_PROJECT.md`, `docs/GIT_AUDIT_LOG.md`, `docs/INFRASTRUCTURE_AUDIT.md`, and the tests/workflows that own the affected behavior.

Shared Michel's Lab rules live in `realmichelduarte/Michel-Software-Standards`.

## Product constraints

- Scientific correctness outranks cosmetic convenience.
- Do not fabricate OpenFOAM fields, boundary values, topology compatibility, physical interpretation or validation results.
- Preserve the current tab/workspace separation: controls must appear only where they are relevant.
- 3D, Profiles, Time Series and Solver Logs may share infrastructure but must not leak irrelevant UI into one another.
- Keep playback/navigation controls reachable in the workspace modes that require them.
- Do not perform unrelated visual redesign while fixing scientific or layout behavior.
- Findings/export/integration features must preserve enough provenance for a later expert or assistant to audit them.
- The current updater/release integrity path must retain explicit approval and SHA-256 verification.
- Never commit private fixture credentials or research data that belong outside this repository.


## Fundamental visual identity and About — mandatory

This is a **core FoamLens product contract**, not optional branding polish.

### Product-wide visual system

The approved layered-field/topographic logo geometry is the foundation of the app's visual system. Preserve the defining silhouette, proportions and spatial relationships. Color, monochrome/inverted treatment, glow, glass, outline, translucency, material and motion may adapt to theme/context.

Do not satisfy branding by pasting the source SVG into unrelated screens. Translate the mark's visual DNA into contours, depth, focus states, scientific overlays, panel layering, navigation emphasis, status states, separators, highlights and motion where appropriate, while scientific correctness, readability and workspace ownership remain higher-priority constraints.

### About hierarchy

About MUST be intentionally designed in this order:

1. **Product identity first** — approved FoamLens mark/lockup, product name, real current version and product-facing composition derived from the app identity.
2. **About the author** — current canonical Michel Duarte portrait, **Michel Duarte**, and appropriate developer copy.
3. **Michel's Lab parent brand** — official Michel's Lab mark/lockup shown as the studio/ecosystem identity without overpowering FoamLens.
4. **Social profiles** — each visible network link shows the recognizable network icon **and** the visible network name together, using canonical URLs from the master `brand/developer-profile.json`.

Do not finish About with text-only social links or icon-only social buttons. Accessibility labels/tooltips supplement the visible network name; they do not replace it.

Treat this hierarchy and the product-wide logo-derived design language as part of product completeness. Visual work must not regress it.

Follow `standards/PRODUCT_IDENTITY_STANDARD.md` and `standards/ABOUT_STANDARD.md` in `realmichelduarte/Michel-Software-Standards`.

## Validation

Inspect the current workflows and use the strongest relevant current-commit regression suite for the changed surface. Desktop changes must use the repository's Windows build/smoke path when applicable. Scientific changes require tests that exercise the actual affected parser, field association, geometry, metric or analysis behavior.

A green historical release is not evidence for current HEAD.

## Completion

Record meaningful findings, fixes, failed approaches, tests and release evidence in `docs/GIT_AUDIT_LOG.md`. Infrastructure changes also update `docs/INFRASTRUCTURE_AUDIT.md` when relevant.

Do not bump a version or publish a release unless explicitly assigned.


## Intelligent brand adoption

When the user asks to update/adopt the app logo, icon, splash, startup or About:

- use the canonical product assets from `realmichelduarte/Michel-Software-Standards/shared-assets/product-logos/`;
- follow `standards/PRODUCT_IDENTITY_STANDARD.md` and `standards/BRAND_ADOPTION_PLAYBOOK.md` from the Michel-Software-Standards repository;
- inspect this app's current design system before placing assets;
- replace the real active platform identity references instead of layering the new logo over legacy/generic branding;
- use the app icon for launcher/executable/favicon derivatives, the mark for compact identity, and the lockup for larger splash/About surfaces when appropriate;
- treat the logo geometry as design language where useful, but do not repeat the literal logo across screens;
- build About in the hierarchy Product → Author → Michel's Lab → Social;
- use the canonical Michel Duarte portrait and Michel's Lab mark in About;
- preserve unrelated product behavior;
- update this repository's project/audit log and validate current build/CI;
- do not publish a release unless the user explicitly authorizes it.

A change that merely pastes the SVG/PNG into an arbitrary card or header is not a completed branding migration.
