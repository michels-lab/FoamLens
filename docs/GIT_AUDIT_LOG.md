# FoamLens Git Audit Log

> Living engineering log for the FoamLens repository.  
> Repository: `realmichelduarte/FoamLens`  
> Primary development branch: `development/v1.3.0-general-discovery`  
> Generated from GitHub history on 2026-09-28. Times below are UTC unless noted otherwise.

## Maintenance rule

This file is the durable project bitácora. After any meaningful Git operation—commit, branch change, pull request action, release/prerelease, CI failure or recovery, packaging change, or important prerelease finding—append/update the relevant section here. Do not rely only on chat history.

## Current repository state

| Item | State |
|---|---|
| Active release branch | `release/v1.3.2` — merged into `main` |
| Release branch head | `f5e6ab835da5f2767df657b40d1f85a816b8e27b` — Record v1.3.2 release validation |
| `main` HEAD | `368655e5b4f9aaddb4f528d530318612f7cb6b19` — Merge FoamLens Desktop v1.3.2 |
| Pull requests | #1 merged for v1.3.1; #2 merged for v1.3.2 |
| Latest release | `v1.3.2` — FoamLens v1.3.2 |
| Latest prerelease | `v1.3.0-rc.1` — legacy prerelease retained for history |
| Commits represented below | 205 in the baseline table + subsequent changes section |
| GitHub Actions runs represented below | 189 in the baseline table + runs #190–#194 below |

## Important project milestones

- **2026-09-24** — repository history begins with `Initial release: OpenFOAM PostPlotter v20`.
- **2026-09-27** — Windows packaging/release line progressed through v1.0.0, v1.0.1, v1.0.2, v1.1.0, v1.2.0, and a published v1.3.0 release on `main`.
- **2026-09-28** — development continued on `development/v1.3.0-general-discovery` for the broader general OpenFOAM v1.3.0 work, with PR #1 opened as a draft against `main`.
- **2026-09-28** — master-spec audit/regression hardening added physical-time playback cache/prefetch, solver corrector + termination parsing, and stronger Windows visual smoke tests.
- **2026-09-28** — `v1.3.0-rc.1` prerelease was published from the development branch with portable EXE, SHA-256, and installer assets.
- **2026-09-28** — prerelease testing exposed UI defects: hidden sidebar lacked an obvious restore affordance and the Cases popover could be covered by navigation. Commit `3ddc9b6` fixed both; Actions run #189 passed.
- **2026-09-28** — prerelease testing exposed a background-execution defect: scanner yields depended on `requestAnimationFrame`, so scientific work could stall when the WebView stopped producing render frames. The pipeline was changed to a render-independent task scheduler and guarded by regression tests; Windows minimized-window smoke validation passed in run #191.
- **2026-09-28** — prerelease review found Watch Run technically functional but too browser-oriented and too sparse for the desktop product. It was upgraded to a read-only live OpenFOAM run monitor with explicit RUNNING/COMPLETED/FAILED state, physical-time progress, deltaT, Courant, latest residual, coupling/corrector state, execution/clock time, five-second refresh, manual refresh/stop, and a Numerical Performance handoff. Actions run #192 passed.
- **2026-09-28** — Review/Case Auditor identity was hardened after prerelease screenshots showed mixed case selector/health/root state. Commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **2026-09-28** — native Windows branding was added to the EXE, form/taskbar, installer and shortcuts. Commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed.

## Releases

| Published | Tag | Name | Type | Target | Assets |
|---|---|---|---|---|---|
| 2026-09-27 02:44:44 UTC | `v1.0.0` | FoamLens v1.0.0 | Release | `main` | `FoamLens-Portable-v1.0.0.exe`, `FoamLens-Portable-v1.0.0.exe.sha256`, `FoamLens-Setup-v1.0.0.exe` |
| 2026-09-27 03:01:21 UTC | `v1.0.1` | FoamLens v1.0.1 | Release | `main` | `FoamLens-Portable-v1.0.1.exe`, `FoamLens-Portable-v1.0.1.exe.sha256`, `FoamLens-Setup-v1.0.1.exe` |
| 2026-09-27 03:22:51 UTC | `v1.0.2` | FoamLens v1.0.2 | Release | `main` | `FoamLens-Portable-v1.0.2.exe`, `FoamLens-Portable-v1.0.2.exe.sha256`, `FoamLens-Setup-v1.0.2.exe` |
| 2026-09-27 04:04:32 UTC | `v1.1.0` | FoamLens v1.1.0 | Release | `main` | `FoamLens-Portable-v1.1.0.exe`, `FoamLens-Portable-v1.1.0.exe.sha256`, `FoamLens-Setup-v1.1.0.exe` |
| 2026-09-27 22:37:10 UTC | `v1.2.0` | FoamLens v1.2.0 | Release | `main` | `FoamLens-Portable-v1.2.0.exe`, `FoamLens-Portable-v1.2.0.exe.sha256`, `FoamLens-Setup-v1.2.0.exe` |
| 2026-09-27 23:25:42 UTC | `v1.3.0` | FoamLens v1.3.0 | Release | `main` | `FoamLens-Portable-v1.3.0.exe`, `FoamLens-Portable-v1.3.0.exe.sha256`, `FoamLens-Setup-v1.3.0.exe` |
| 2026-09-28 18:18:03 UTC | `v1.3.0-rc.1` | FoamLens Desktop v1.3.0-rc.1 | Pre-release | `development/v1.3.0-general-discovery` | `FoamLens-Portable-v1.3.0-rc.1.exe`, `FoamLens-Portable-v1.3.0-rc.1.exe.sha256`, `FoamLens-Setup-v1.3.0-rc.1.exe` |
| 2026-09-28 20:04:27 UTC | `v1.3.1` | FoamLens v1.3.1 | Release | `main` | `FoamLens-Portable-v1.3.1.exe`, `FoamLens-Portable-v1.3.1.exe.sha256`, `FoamLens-Setup-v1.3.1.exe` |
| 2026-09-29 17:28:32 UTC | `v1.3.2` | FoamLens v1.3.2 | Release | `main` | `FoamLens-Portable-v1.3.2.exe`, `FoamLens-Portable-v1.3.2.exe.sha256`, `FoamLens-Setup-v1.3.2.exe` |

## Pull requests

| # | Created | State | Draft | Head → Base | Current head SHA | Title |
|---:|---|---|---|---|---|---|
| 1 | 2026-09-28 09:16:04 UTC | merged | no | `development/v1.3.0-general-discovery` → `main` | `d5a94b527ae6` | Release FoamLens Desktop v1.3.1 |
| 2 | 2026-09-29 17:25:23 UTC | merged | no | `release/v1.3.2` → `main` | `f5e6ab835da5` | Release FoamLens Desktop v1.3.2 |

## Complete commit history visible from the development branch

This table records every commit currently reachable from `development/v1.3.0-general-discovery`, oldest first.

| # | Date | SHA | Commit |
|---:|---|---|---|
| 1 | 2026-09-24 21:39:42 UTC | `1c12b7a480b6` | Initial release: OpenFOAM PostPlotter v20 |
| 2 | 2026-09-24 23:20:03 UTC | `849bc8f78d08` | Release OpenFOAM PostPlotter v22 |
| 3 | 2026-09-24 23:20:06 UTC | `a7ddd943ee76` | Document v22 smart case import and case visibility |
| 4 | 2026-09-24 23:20:08 UTC | `372a424803da` | Update changelog for v22 |
| 5 | 2026-09-25 20:50:19 UTC | `d8551a3d0c77` | Release OpenFOAM PostPlotter v29 |
| 6 | 2026-09-25 20:50:23 UTC | `4baca068e69e` | Update README for v29 |
| 7 | 2026-09-25 20:50:26 UTC | `eb1b20d00d27` | Document v23-v29 changes |
| 8 | 2026-09-27 02:08:34 UTC | `d38d69e4bff3` | Add FoamLens Desktop v1 Windows build |
| 9 | 2026-09-27 02:10:14 UTC | `b11ffdfd62af` | Fix Windows path separator in FoamLens Desktop host |
| 10 | 2026-09-27 02:12:58 UTC | `9af4e44fc0db` | Include FoamLens installer in Windows artifact |
| 11 | 2026-09-27 02:34:28 UTC | `87d37175dd3d` | Build and publish FoamLens Windows installer |
| 12 | 2026-09-27 02:35:23 UTC | `f46f58ad363d` | Rename project branding to FoamLens |
| 13 | 2026-09-27 02:35:25 UTC | `ebc960dd49eb` | Document FoamLens Windows installer workflow |
| 14 | 2026-09-27 02:35:52 UTC | `4010114eaadc` | Fix FoamLens Windows build expression escaping |
| 15 | 2026-09-27 02:42:37 UTC | `16bac95fd403` | Publish FoamLens installer to GitHub Releases |
| 16 | 2026-09-27 02:48:09 UTC | `d75261a6fb05` | Rename FoamLens portable Windows build |
| 17 | 2026-09-27 02:48:17 UTC | `8afe751612f2` | Document FoamLens portable build naming |
| 18 | 2026-09-27 02:48:19 UTC | `a39886c220ea` | Document FoamLens portable build naming |
| 19 | 2026-09-27 02:58:00 UTC | `b6e2b348ca4c` | Fix FoamLens Desktop controls and native bridge |
| 20 | 2026-09-27 02:59:39 UTC | `951b86a891cb` | Release FoamLens Desktop v1.0.1 control fix |
| 21 | 2026-09-27 03:21:18 UTC | `0a25bf5daa0b` | Detect raw OpenFOAM solver logs in FoamLens v1.0.2 |
| 22 | 2026-09-27 04:02:55 UTC | `84d8c6debd82` | Synchronize Spatial Profiles by physical time in v1.1.0 |
| 23 | 2026-09-27 22:29:01 UTC | `c84ba3c4cbbd` | Add capability-driven Phase Change and Momentum analysis in v1.2.0 |
| 24 | 2026-09-27 22:30:43 UTC | `cfa8878ae761` | Fix Phase Change Momentum regression test syntax |
| 25 | 2026-09-27 22:32:34 UTC | `d4c485d66af9` | Harden Phase Change Momentum test harness |
| 26 | 2026-09-27 22:35:21 UTC | `bd16cf052713` | Use real multiline OpenFOAM metadata fixture |
| 27 | 2026-09-27 23:24:02 UTC | `3519bab807f6` | Build general OpenFOAM discovery model in v1.3.0 |
| 28 | 2026-09-27 23:32:58 UTC | `07a3de7c0ab3` | Start v1.3.0 general discovery from v1.2.0 baseline |
| 29 | 2026-09-27 23:39:11 UTC | `08fa233d55f8` | Add general temporal alignment and difference core |
| 30 | 2026-09-27 23:39:43 UTC | `42bf382967ae` | Add temporal alignment regression suite |
| 31 | 2026-09-27 23:39:59 UTC | `b5996406231a` | Inject v1.3 temporal analysis into Desktop frontend |
| 32 | 2026-09-27 23:40:08 UTC | `f960cabf2850` | Run v1.3 temporal alignment checks in CI |
| 33 | 2026-09-27 23:42:00 UTC | `9b3fdb0bc950` | Add general numerical performance and run-log analysis |
| 34 | 2026-09-27 23:42:23 UTC | `064ad9b4bdc0` | Add numerical performance regression suite |
| 35 | 2026-09-27 23:42:35 UTC | `94531fba57bd` | Load modular v1.3 Desktop analysis extensions |
| 36 | 2026-09-27 23:42:43 UTC | `643fa3a053c5` | Bundle and test modular v1.3 numerical analysis |
| 37 | 2026-09-27 23:43:33 UTC | `8a197ba8f25f` | Add reproducible temporal comparison exports |
| 38 | 2026-09-27 23:43:40 UTC | `3a4e4a6d745b` | Test reproducible comparison export metadata |
| 39 | 2026-09-27 23:44:08 UTC | `a624b46315be` | Fix adaptive deltaT association with next physical time |
| 40 | 2026-09-27 23:44:30 UTC | `479a4df14b06` | Clarify published v1.2.0 versus v1.3 development |
| 41 | 2026-09-27 23:44:39 UTC | `c69a074c93ba` | Mark Desktop v1.3.0 as development |
| 42 | 2026-09-27 23:46:26 UTC | `03beaaea3999` | Add general derived physical analysis |
| 43 | 2026-09-27 23:46:41 UTC | `f82a33b6b2f3` | Add general physical analysis regression suite |
| 44 | 2026-09-27 23:46:49 UTC | `5c573eb739af` | Run general physical analysis regressions in CI |
| 45 | 2026-09-27 23:48:00 UTC | `fd8ce3d98f93` | Expand general Field Mapping roles |
| 46 | 2026-09-27 23:48:16 UTC | `9126ba838f8b` | Add expanded Field Mapping regression suite |
| 47 | 2026-09-27 23:48:23 UTC | `8d33b2d63ce0` | Run expanded Field Mapping regressions in CI |
| 48 | 2026-09-27 23:49:28 UTC | `cd219a3db2ab` | Add generic vector magnitude derivation |
| 49 | 2026-09-27 23:49:43 UTC | `5a4a542fbc6a` | Add generic vector-field regression suite |
| 50 | 2026-09-27 23:49:49 UTC | `6fcd001e5c3a` | Run generic vector-field regressions in CI |
| 51 | 2026-09-27 23:50:36 UTC | `43388856e809` | Add native progress and cancellation controls |
| 52 | 2026-09-27 23:52:31 UTC | `1a44a89aabb9` | Add cancellable native folder and foamLog operations |
| 53 | 2026-09-27 23:52:44 UTC | `c512d00d72aa` | Add native cancellation and background regressions |
| 54 | 2026-09-27 23:52:54 UTC | `3faf291880cb` | Run native cancellation regressions in CI |
| 55 | 2026-09-27 23:53:34 UTC | `db078a414e19` | Test malformed and missing OpenFOAM data handling |
| 56 | 2026-09-27 23:54:41 UTC | `66bb588ddb0a` | Extend raw solver logs with deltaT and outer-iteration series |
| 57 | 2026-09-27 23:54:49 UTC | `bee07c4556ec` | Test deltaT and coupling extensions to legacy solver logs |
| 58 | 2026-09-27 23:55:19 UTC | `61a3a41eb715` | Hide temporal comparison controls without compatible data |
| 59 | 2026-09-27 23:55:22 UTC | `f2fd803d13ed` | Hide numerical controls without solver-log data |
| 60 | 2026-09-27 23:55:23 UTC | `810c0b3d68f9` | Hide physical analysis controls without temporal data |
| 61 | 2026-09-27 23:55:26 UTC | `f622409e0b05` | Hide vector controls without compatible XYZ fields |
| 62 | 2026-09-27 23:55:34 UTC | `21a06257aabb` | Add capability-driven UI regression |
| 63 | 2026-09-27 23:55:42 UTC | `c939ec90c312` | Run capability-driven UI regression in CI |
| 64 | 2026-09-27 23:56:00 UTC | `9b0b0b437142` | Decouple vector tools from physical-analysis visibility |
| 65 | 2026-09-27 23:56:08 UTC | `e70e888b223f` | Guard independent capability panel visibility |
| 66 | 2026-09-27 23:56:30 UTC | `0cdbe9acbd29` | Fix outer-iteration regression assertion |
| 67 | 2026-09-27 23:56:51 UTC | `41ee1a87ceb2` | Make Native temporal alignment the default view |
| 68 | 2026-09-27 23:56:57 UTC | `8f6c0b6d2016` | Test Native as default temporal alignment |
| 69 | 2026-09-27 23:57:32 UTC | `75570492d5b7` | Validate complete v1.3 extension syntax in CI |
| 70 | 2026-09-28 00:00:36 UTC | `dc682987a12f` | Add quantitative spatial profile comparison |
| 71 | 2026-09-28 00:00:55 UTC | `4ed1fcf6a206` | Add spatial quantitative comparison regressions |
| 72 | 2026-09-28 00:01:04 UTC | `89ab8109d1ba` | Run spatial quantitative regressions in CI |
| 73 | 2026-09-28 00:01:52 UTC | `9a7ce114a9c7` | Propagate physical units and dimensions through derived analysis |
| 74 | 2026-09-28 00:02:06 UTC | `4a4ce76444e4` | Test derived units and dimension safety |
| 75 | 2026-09-28 00:02:19 UTC | `60ce3e36826f` | Correct units for temporal difference curves |
| 76 | 2026-09-28 00:02:27 UTC | `38c6fa35bcea` | Test temporal difference curve units |
| 77 | 2026-09-28 00:04:07 UTC | `f57642c8ef61` | Add physical-time versus timestep-index numerical plots |
| 78 | 2026-09-28 00:04:18 UTC | `c98c81fa09f1` | Test physical-time and timestep-index solver plots |
| 79 | 2026-09-28 00:16:45 UTC | `8a3b75fb0492` | Respect active case and region in temporal analysis |
| 80 | 2026-09-28 00:16:48 UTC | `2146041449a2` | Respect active case and region in physical analysis |
| 81 | 2026-09-28 00:16:50 UTC | `fdcd3092f630` | Respect active case and region in numerical analysis |
| 82 | 2026-09-28 00:16:52 UTC | `7b5979e30acc` | Respect active case and region in vector analysis |
| 83 | 2026-09-28 00:17:30 UTC | `de523fa823fc` | Strengthen multi-region analysis context |
| 84 | 2026-09-28 00:17:47 UTC | `af96715ac35a` | Add multi-region analysis regression suite |
| 85 | 2026-09-28 00:18:00 UTC | `b7d53466dc52` | Run multi-region analysis regressions in CI |
| 86 | 2026-09-28 00:20:03 UTC | `27d18eb0db84` | Scope Field Mapping by case and region |
| 87 | 2026-09-28 00:20:30 UTC | `9efb0d0d2836` | Separate mapping-edit region from analysis region |
| 88 | 2026-09-28 00:20:43 UTC | `274f867c1425` | Test region-scoped Field Mapping |
| 89 | 2026-09-28 00:21:15 UTC | `bcc995f9a328` | Update Field Mapping regression for regional signature |
| 90 | 2026-09-28 00:21:53 UTC | `14bfb1bb6f9e` | Make Field Mapping capabilities region-aware |
| 91 | 2026-09-28 00:22:05 UTC | `1a90e75a6a3d` | Test regional capability and workspace persistence |
| 92 | 2026-09-28 00:27:24 UTC | `3359e7699c39` | Remove case-name family and variant inference |
| 93 | 2026-09-28 00:27:42 UTC | `df03a6487e60` | Add no-case-name-inference regression suite |
| 94 | 2026-09-28 00:29:23 UTC | `37d6534e09ee` | Remove inferred case families and variants from product logic |
| 95 | 2026-09-28 00:29:36 UTC | `395d729e061e` | Remove redundant case-identity override module |
| 96 | 2026-09-28 00:30:38 UTC | `abf1d967e66d` | Test base product against case-name inference |
| 97 | 2026-09-28 00:31:18 UTC | `9e4c33561b21` | Run case-name neutrality regression in CI |
| 98 | 2026-09-28 00:31:52 UTC | `5c311c63e4e9` | Expand real fixed and adaptive OpenFOAM integration coverage |
| 99 | 2026-09-28 00:32:50 UTC | `d9b4d139edcc` | Fix case-name neutrality test syntax |
| 100 | 2026-09-28 00:33:24 UTC | `3c232da2336d` | Guard product code from fixture-specific names |
| 101 | 2026-09-28 00:33:50 UTC | `754e85d3bd86` | Mark v51 workspace and About as development |
| 102 | 2026-09-28 00:34:36 UTC | `91bb2c27be6c` | Add development version consistency regression |
| 103 | 2026-09-28 00:34:49 UTC | `a795ad20ebc6` | Run development version consistency regression |
| 104 | 2026-09-28 00:36:21 UTC | `a85504e4c919` | Expand OpenFOAM dimension and SI unit interpretation |
| 105 | 2026-09-28 00:37:57 UTC | `42678b82be1a` | Translate Data Catalog SI-unit header |
| 106 | 2026-09-28 00:38:15 UTC | `fe13347f91b8` | Add OpenFOAM dimensions and SI-unit regressions |
| 107 | 2026-09-28 00:38:33 UTC | `e0a8d206b813` | Run dimensions and SI-unit regressions in CI |
| 108 | 2026-09-28 00:39:52 UTC | `b83a0f15ef5b` | Catalog FoamLens derived data with provenance |
| 109 | 2026-09-28 00:40:20 UTC | `6abe57e7cbcb` | Add derived Data Catalog provenance regressions |
| 110 | 2026-09-28 00:40:39 UTC | `69b3f44821b6` | Run derived Data Catalog provenance regressions |
| 111 | 2026-09-28 00:41:23 UTC | `71197abc139f` | Fix isolated dimensions test harness |
| 112 | 2026-09-28 00:42:28 UTC | `495c73a66749` | Align UI copy with neutral case identity and derived catalog |
| 113 | 2026-09-28 00:43:37 UTC | `3e3ba84068a3` | Add reproducible selected-series exports |
| 114 | 2026-09-28 00:43:59 UTC | `1f7fd50357fe` | Add reproducible series export regressions |
| 115 | 2026-09-28 00:44:15 UTC | `b607013ce14c` | Run reproducible export regressions in CI |
| 116 | 2026-09-28 00:45:03 UTC | `fe953b7d5aa2` | Update dimensions regression for explicit derived units |
| 117 | 2026-09-28 00:46:25 UTC | `0ce8ff883134` | Add explicit descriptive case tags |
| 118 | 2026-09-28 00:46:46 UTC | `0d6d01f31e05` | Include descriptive case tags in reproducible exports |
| 119 | 2026-09-28 00:47:07 UTC | `b94535415daf` | Add descriptive case-tag regression suite |
| 120 | 2026-09-28 00:47:33 UTC | `0a61dad28e98` | Make case-tag neutrality regression behavior-based |
| 121 | 2026-09-28 00:48:13 UTC | `3ed1a10fef68` | Run descriptive case-tag regressions in CI |
| 122 | 2026-09-28 00:48:20 UTC | `e6ee52662e3b` | Test case tags in reproducible exports |
| 123 | 2026-09-28 00:50:10 UTC | `9a8522274c3d` | Add physical-coordinate spatial gradient analysis |
| 124 | 2026-09-28 00:50:49 UTC | `007ac1cfa3f2` | Test nonuniform physical-coordinate gradients |
| 125 | 2026-09-28 00:51:06 UTC | `e7255c623da3` | Allow Physical Analysis from spatial-profile capability |
| 126 | 2026-09-28 00:52:43 UTC | `f478bb171755` | Add general flow-signal analysis |
| 127 | 2026-09-28 00:53:14 UTC | `10c203cbbd03` | Add provenance to flow analysis summaries |
| 128 | 2026-09-28 05:27:57 UTC | `fd6f4b7e5849` | Add general flow-analysis regression suite |
| 129 | 2026-09-28 05:28:14 UTC | `29cb19e94c28` | Run general Flow Analysis regressions in CI |
| 130 | 2026-09-28 05:29:47 UTC | `1a7387c1a170` | Add explicit solidification and remelting analysis |
| 131 | 2026-09-28 05:30:13 UTC | `cdbab12e175f` | Add solidification/remelting regression suite |
| 132 | 2026-09-28 05:30:31 UTC | `d9e141405f21` | Run solidification/remelting regressions in CI |
| 133 | 2026-09-28 05:31:53 UTC | `529194d91e71` | Add explicit general Thermal Analysis |
| 134 | 2026-09-28 05:32:18 UTC | `365ea581ad73` | Add general Thermal Analysis regressions |
| 135 | 2026-09-28 05:32:51 UTC | `2bada2b2b6d0` | Gate new physical modules by available data |
| 136 | 2026-09-28 05:33:06 UTC | `315918698867` | Run Thermal Analysis regressions in CI |
| 137 | 2026-09-28 05:35:02 UTC | `d0720b9a2787` | Separate General Analysis from Difference UI |
| 138 | 2026-09-28 05:36:07 UTC | `c7fbed778aa2` | Place v13-temporal-alignment in General Analysis |
| 139 | 2026-09-28 05:36:21 UTC | `5e6e4398b2fb` | Place v13-numerical-performance in General Analysis |
| 140 | 2026-09-28 05:36:34 UTC | `14e9c74e8911` | Place v13-physical-analysis in General Analysis |
| 141 | 2026-09-28 05:36:43 UTC | `2a2e3befb6dc` | Place v13-vector-fields in General Analysis |
| 142 | 2026-09-28 05:36:56 UTC | `2d3684638614` | Place v13-flow-analysis in General Analysis |
| 143 | 2026-09-28 05:37:09 UTC | `b0bd873b2d4c` | Place v13-solidification-analysis in General Analysis |
| 144 | 2026-09-28 05:37:18 UTC | `469f69f2fbd3` | Place v13-thermal-analysis in General Analysis |
| 145 | 2026-09-28 05:37:50 UTC | `52364cab270d` | Add General Analysis UI organization regression |
| 146 | 2026-09-28 05:38:11 UTC | `badef2e31ba4` | Run Analysis UI organization regression in CI |
| 147 | 2026-09-28 05:38:51 UTC | `2181b60d4691` | Use unequivocal heating interval in Thermal regression |
| 148 | 2026-09-28 05:40:21 UTC | `42857ae1346d` | Preserve postProcessing provenance on temporal series |
| 149 | 2026-09-28 05:40:54 UTC | `e10f3385862d` | Preserve volume and surface provenance in Energy Balance |
| 150 | 2026-09-28 05:41:31 UTC | `767a44e1539c` | Export postProcessing provenance with selected series |
| 151 | 2026-09-28 05:41:49 UTC | `743ea3e1f244` | Show Energy Balance source types in Data Catalog provenance |
| 152 | 2026-09-28 05:43:31 UTC | `ecb1f9a2dcc4` | Test volume and surface Energy Balance provenance |
| 153 | 2026-09-28 05:43:41 UTC | `7f858c785698` | Test postProcessing provenance in reproducible exports |
| 154 | 2026-09-28 05:43:54 UTC | `747bf1169b6b` | Test Energy Balance source types in Data Catalog |
| 155 | 2026-09-28 05:47:26 UTC | `5e87f6f71e8d` | Complete general Flow Analysis regressions |
| 156 | 2026-09-28 05:47:44 UTC | `7749a69b2f0e` | Run general Flow Analysis regressions in CI |
| 157 | 2026-09-28 05:47:53 UTC | `ff594d2f32d9` | Parse large Desktop temporal files incrementally |
| 158 | 2026-09-28 05:48:32 UTC | `25c1721c362f` | Add incremental temporal parser regressions |
| 159 | 2026-09-28 05:49:19 UTC | `e8ddf7f9fc63` | Run incremental temporal parser regressions in CI |
| 160 | 2026-09-28 05:51:36 UTC | `946d0292b0db` | Add cancellable native temporal-file parser |
| 161 | 2026-09-28 05:51:41 UTC | `beae43e5b5c0` | Parse large Desktop OpenFOAM fields incrementally |
| 162 | 2026-09-28 05:52:18 UTC | `fcdbefb1643c` | Add incremental OpenFOAM field parser regressions |
| 163 | 2026-09-28 05:52:26 UTC | `008f4da8569a` | Use cancellable native streaming for large temporal files |
| 164 | 2026-09-28 05:52:41 UTC | `ee28a78e9189` | Run incremental field parser regressions in CI |
| 165 | 2026-09-28 05:53:07 UTC | `8e90d29e49df` | Keep concurrent temporal operations isolated |
| 166 | 2026-09-28 05:53:31 UTC | `dff78dbef8eb` | Test native temporal streaming progress and cancellation |
| 167 | 2026-09-28 05:54:13 UTC | `2e8e77d8fc51` | Test native streaming temporal parser |
| 168 | 2026-09-28 05:55:34 UTC | `697ec0d10b1f` | Add cancellable native OpenFOAM field streaming parser |
| 169 | 2026-09-28 05:56:17 UTC | `79f4fe5e92b8` | Expand neutral general case comparison table |
| 170 | 2026-09-28 05:56:42 UTC | `9f44cb5308d5` | Add neutral general case-comparison regressions |
| 171 | 2026-09-28 05:57:06 UTC | `df49a99bc0a4` | Run neutral general case-comparison regressions in CI |
| 172 | 2026-09-28 05:57:14 UTC | `af327050d3c1` | Use cancellable native streaming for large OpenFOAM fields |
| 173 | 2026-09-28 05:57:46 UTC | `335b9e656427` | Add native OpenFOAM field streaming regressions |
| 174 | 2026-09-28 05:58:12 UTC | `a5804a833716` | Run native field streaming regressions in CI |
| 175 | 2026-09-28 05:58:28 UTC | `52e5dca514cd` | Fix native temporal metadata regression assertion |
| 176 | 2026-09-28 05:59:57 UTC | `a97b15bf144d` | Update Phase Momentum regression for streaming field parser |
| 177 | 2026-09-28 06:02:09 UTC | `04c6274b92d3` | Update temporal cancellation regression for unified data reads |
| 178 | 2026-09-28 06:04:36 UTC | `3c6dcc86f794` | Fix OpenFOAM field parser factory naming collision |
| 179 | 2026-09-28 06:05:02 UTC | `6cf21a77fc5d` | Update native field streaming factory regressions |
| 180 | 2026-09-28 06:26:55 UTC | `4669d0cb2dc7` | Support ASCII tensor field payloads |
| 181 | 2026-09-28 06:28:28 UTC | `1538beafa6fb` | Keep field parser core self-contained |
| 182 | 2026-09-28 06:30:35 UTC | `de560a8747ea` | Cover tensor fields in incremental parser |
| 183 | 2026-09-28 06:34:56 UTC | `0aac3e63e835` | Stress-test large incremental datasets |
| 184 | 2026-09-28 08:01:01 UTC | `26a2f0fc2be6` | Harden bilingual UI and Review presentation |
| 185 | 2026-09-28 08:08:19 UTC | `3cca331710f8` | Update regressions for bilingual UI markup |
| 186 | 2026-09-28 08:12:59 UTC | `a500ba7ab5ef` | Update case-tag regression for corrected Spanish copy |
| 187 | 2026-09-28 08:36:03 UTC | `31220b7e2be2` | Run QuickCup regression on Linux |
| 188 | 2026-09-28 08:59:28 UTC | `11501db3225a` | Complete bilingual UI audit and overflow hardening |
| 189 | 2026-09-28 09:10:39 UTC | `78501c8b4838` | Add Windows executable startup smoke test |
| 190 | 2026-09-28 09:10:58 UTC | `18e447632526` | Run packaged EXE smoke test in Windows CI |
| 191 | 2026-09-28 09:13:47 UTC | `bea07b55cf02` | Smoke-test installed Windows build |
| 192 | 2026-09-28 09:17:08 UTC | `80af3128c2c3` | Reconcile main history into v1.3.0 development |
| 193 | 2026-09-28 09:46:38 UTC | `94a59ed87a04` | Expand real OpenFOAM master-spec regression coverage |
| 194 | 2026-09-28 09:47:00 UTC | `851332602ce3` | Cover playback performance and write-interval regressions |
| 195 | 2026-09-28 09:48:04 UTC | `fada2ce22ca1` | Add runtime visual smoke validation |
| 196 | 2026-09-28 09:48:19 UTC | `562336e18ba3` | Capture runtime visual smoke artifacts |
| 197 | 2026-09-28 09:50:31 UTC | `fe2c93af63d3` | Cover complete temporal difference metrics |
| 198 | 2026-09-28 09:54:23 UTC | `ab75602eaaaf` | Document v1.3.0 master-spec regression audit |
| 199 | 2026-09-28 18:03:16 UTC | `892875618214` | Cache and prefetch Spatial Profile playback frames |
| 200 | 2026-09-28 18:04:31 UTC | `88e788746490` | Track solver correctors and run termination |
| 201 | 2026-09-28 18:05:28 UTC | `eeb2d744b346` | Test solver correctors and termination status |
| 202 | 2026-09-28 18:06:02 UTC | `900035267071` | Harden runtime visual smoke checks |
| 203 | 2026-09-28 18:08:16 UTC | `94e5629b642b` | Refine visual smoke clipping check |
| 204 | 2026-09-28 18:10:27 UTC | `f053e2727c36` | Update v1.3.0 audit after final regression hardening |
| 205 | 2026-09-28 18:40:01 UTC | `3ddc9b6795b7` | Fix sidebar restore handle and Cases panel stacking |

## GitHub Actions history

Every workflow run currently returned by the repository Actions history, oldest first.

| Run | Date | Event | Ref | SHA | Result |
|---:|---|---|---|---|---|
| #1 | 2026-09-27 02:08:48 UTC | push | `main` | `d38d69e4bff3` | failure |
| #2 | 2026-09-27 02:10:16 UTC | push | `main` | `b11ffdfd62af` | success |
| #3 | 2026-09-27 02:13:00 UTC | push | `main` | `9af4e44fc0db` | success |
| #4 | 2026-09-27 02:34:30 UTC | push | `main` | `87d37175dd3d` | failure |
| #5 | 2026-09-27 02:35:27 UTC | push | `main` | `ebc960dd49eb` | failure |
| #6 | 2026-09-27 02:35:54 UTC | push | `main` | `4010114eaadc` | success |
| #7 | 2026-09-27 02:42:39 UTC | push | `main` | `16bac95fd403` | success |
| #8 | 2026-09-27 02:48:11 UTC | push | `main` | `d75261a6fb05` | success |
| #9 | 2026-09-27 02:48:21 UTC | push | `main` | `a39886c220ea` | success |
| #10 | 2026-09-27 02:58:02 UTC | push | `main` | `b6e2b348ca4c` | success |
| #11 | 2026-09-27 02:59:43 UTC | push | `main` | `951b86a891cb` | success |
| #12 | 2026-09-27 03:21:23 UTC | push | `main` | `0a25bf5daa0b` | success |
| #13 | 2026-09-27 04:03:01 UTC | push | `main` | `84d8c6debd82` | success |
| #14 | 2026-09-27 22:29:08 UTC | push | `main` | `c84ba3c4cbbd` | failure |
| #15 | 2026-09-27 22:30:50 UTC | push | `main` | `cfa8878ae761` | failure |
| #16 | 2026-09-27 22:32:42 UTC | push | `main` | `d4c485d66af9` | failure |
| #17 | 2026-09-27 22:35:30 UTC | push | `main` | `bd16cf052713` | success |
| #18 | 2026-09-27 23:24:09 UTC | push | `main` | `3519bab807f6` | success |
| #19 | 2026-09-27 23:40:10 UTC | push | `development/v1.3.0-general-discovery` | `f960cabf2850` | success |
| #20 | 2026-09-27 23:42:02 UTC | push | `development/v1.3.0-general-discovery` | `9b3fdb0bc950` | success |
| #21 | 2026-09-27 23:42:25 UTC | push | `development/v1.3.0-general-discovery` | `064ad9b4bdc0` | success |
| #22 | 2026-09-27 23:42:37 UTC | push | `development/v1.3.0-general-discovery` | `94531fba57bd` | success |
| #23 | 2026-09-27 23:42:45 UTC | push | `development/v1.3.0-general-discovery` | `643fa3a053c5` | failure |
| #24 | 2026-09-27 23:43:35 UTC | push | `development/v1.3.0-general-discovery` | `8a197ba8f25f` | failure |
| #25 | 2026-09-27 23:43:42 UTC | push | `development/v1.3.0-general-discovery` | `3a4e4a6d745b` | failure |
| #26 | 2026-09-27 23:44:11 UTC | push | `development/v1.3.0-general-discovery` | `a624b46315be` | success |
| #27 | 2026-09-27 23:44:45 UTC | push | `development/v1.3.0-general-discovery` | `c69a074c93ba` | success |
| #28 | 2026-09-27 23:46:28 UTC | push | `development/v1.3.0-general-discovery` | `03beaaea3999` | success |
| #29 | 2026-09-27 23:46:43 UTC | push | `development/v1.3.0-general-discovery` | `f82a33b6b2f3` | success |
| #30 | 2026-09-27 23:46:51 UTC | push | `development/v1.3.0-general-discovery` | `5c573eb739af` | success |
| #31 | 2026-09-27 23:48:02 UTC | push | `development/v1.3.0-general-discovery` | `fd8ce3d98f93` | success |
| #32 | 2026-09-27 23:48:18 UTC | push | `development/v1.3.0-general-discovery` | `9126ba838f8b` | success |
| #33 | 2026-09-27 23:48:24 UTC | push | `development/v1.3.0-general-discovery` | `8d33b2d63ce0` | success |
| #34 | 2026-09-27 23:49:31 UTC | push | `development/v1.3.0-general-discovery` | `cd219a3db2ab` | success |
| #35 | 2026-09-27 23:49:45 UTC | push | `development/v1.3.0-general-discovery` | `5a4a542fbc6a` | success |
| #36 | 2026-09-27 23:49:51 UTC | push | `development/v1.3.0-general-discovery` | `6fcd001e5c3a` | success |
| #37 | 2026-09-27 23:50:39 UTC | push | `development/v1.3.0-general-discovery` | `43388856e809` | success |
| #38 | 2026-09-27 23:52:33 UTC | push | `development/v1.3.0-general-discovery` | `1a44a89aabb9` | success |
| #39 | 2026-09-27 23:52:46 UTC | push | `development/v1.3.0-general-discovery` | `c512d00d72aa` | success |
| #40 | 2026-09-27 23:52:56 UTC | push | `development/v1.3.0-general-discovery` | `3faf291880cb` | success |
| #41 | 2026-09-27 23:53:36 UTC | push | `development/v1.3.0-general-discovery` | `db078a414e19` | success |
| #42 | 2026-09-27 23:54:43 UTC | push | `development/v1.3.0-general-discovery` | `66bb588ddb0a` | success |
| #43 | 2026-09-27 23:54:51 UTC | push | `development/v1.3.0-general-discovery` | `bee07c4556ec` | failure |
| #44 | 2026-09-27 23:55:21 UTC | push | `development/v1.3.0-general-discovery` | `61a3a41eb715` | failure |
| #45 | 2026-09-27 23:55:23 UTC | push | `development/v1.3.0-general-discovery` | `f2fd803d13ed` | failure |
| #46 | 2026-09-27 23:55:26 UTC | push | `development/v1.3.0-general-discovery` | `810c0b3d68f9` | failure |
| #47 | 2026-09-27 23:55:28 UTC | push | `development/v1.3.0-general-discovery` | `f622409e0b05` | failure |
| #48 | 2026-09-27 23:55:37 UTC | push | `development/v1.3.0-general-discovery` | `21a06257aabb` | failure |
| #49 | 2026-09-27 23:55:44 UTC | push | `development/v1.3.0-general-discovery` | `c939ec90c312` | failure |
| #50 | 2026-09-27 23:56:02 UTC | push | `development/v1.3.0-general-discovery` | `9b0b0b437142` | failure |
| #51 | 2026-09-27 23:56:10 UTC | push | `development/v1.3.0-general-discovery` | `e70e888b223f` | failure |
| #52 | 2026-09-27 23:56:32 UTC | push | `development/v1.3.0-general-discovery` | `0cdbe9acbd29` | success |
| #53 | 2026-09-27 23:56:53 UTC | push | `development/v1.3.0-general-discovery` | `41ee1a87ceb2` | success |
| #54 | 2026-09-27 23:56:59 UTC | push | `development/v1.3.0-general-discovery` | `8f6c0b6d2016` | success |
| #55 | 2026-09-27 23:57:34 UTC | push | `development/v1.3.0-general-discovery` | `75570492d5b7` | success |
| #56 | 2026-09-28 00:00:38 UTC | push | `development/v1.3.0-general-discovery` | `dc682987a12f` | success |
| #57 | 2026-09-28 00:00:57 UTC | push | `development/v1.3.0-general-discovery` | `4ed1fcf6a206` | success |
| #58 | 2026-09-28 00:01:06 UTC | push | `development/v1.3.0-general-discovery` | `89ab8109d1ba` | success |
| #59 | 2026-09-28 00:01:55 UTC | push | `development/v1.3.0-general-discovery` | `9a7ce114a9c7` | success |
| #60 | 2026-09-28 00:02:08 UTC | push | `development/v1.3.0-general-discovery` | `4a4ce76444e4` | success |
| #61 | 2026-09-28 00:02:21 UTC | push | `development/v1.3.0-general-discovery` | `60ce3e36826f` | success |
| #62 | 2026-09-28 00:02:29 UTC | push | `development/v1.3.0-general-discovery` | `38c6fa35bcea` | success |
| #63 | 2026-09-28 00:04:09 UTC | push | `development/v1.3.0-general-discovery` | `f57642c8ef61` | success |
| #64 | 2026-09-28 00:04:20 UTC | push | `development/v1.3.0-general-discovery` | `c98c81fa09f1` | success |
| #65 | 2026-09-28 00:16:47 UTC | push | `development/v1.3.0-general-discovery` | `8a3b75fb0492` | success |
| #66 | 2026-09-28 00:16:50 UTC | push | `development/v1.3.0-general-discovery` | `2146041449a2` | success |
| #67 | 2026-09-28 00:16:52 UTC | push | `development/v1.3.0-general-discovery` | `fdcd3092f630` | success |
| #68 | 2026-09-28 00:16:54 UTC | push | `development/v1.3.0-general-discovery` | `7b5979e30acc` | success |
| #69 | 2026-09-28 00:17:32 UTC | push | `development/v1.3.0-general-discovery` | `de523fa823fc` | success |
| #70 | 2026-09-28 00:17:49 UTC | push | `development/v1.3.0-general-discovery` | `af96715ac35a` | success |
| #71 | 2026-09-28 00:18:01 UTC | push | `development/v1.3.0-general-discovery` | `b7d53466dc52` | success |
| #72 | 2026-09-28 00:20:05 UTC | push | `development/v1.3.0-general-discovery` | `27d18eb0db84` | failure |
| #73 | 2026-09-28 00:20:33 UTC | push | `development/v1.3.0-general-discovery` | `9efb0d0d2836` | failure |
| #74 | 2026-09-28 00:20:45 UTC | push | `development/v1.3.0-general-discovery` | `274f867c1425` | failure |
| #75 | 2026-09-28 00:21:17 UTC | push | `development/v1.3.0-general-discovery` | `bcc995f9a328` | success |
| #76 | 2026-09-28 00:21:55 UTC | push | `development/v1.3.0-general-discovery` | `14bfb1bb6f9e` | success |
| #77 | 2026-09-28 00:22:07 UTC | push | `development/v1.3.0-general-discovery` | `1a90e75a6a3d` | success |
| #78 | 2026-09-28 00:27:26 UTC | push | `development/v1.3.0-general-discovery` | `3359e7699c39` | success |
| #79 | 2026-09-28 00:27:45 UTC | push | `development/v1.3.0-general-discovery` | `df03a6487e60` | success |
| #80 | 2026-09-28 00:29:26 UTC | push | `development/v1.3.0-general-discovery` | `37d6534e09ee` | success |
| #81 | 2026-09-28 00:29:38 UTC | push | `development/v1.3.0-general-discovery` | `395d729e061e` | success |
| #82 | 2026-09-28 00:30:40 UTC | push | `development/v1.3.0-general-discovery` | `abf1d967e66d` | success |
| #83 | 2026-09-28 00:31:21 UTC | push | `development/v1.3.0-general-discovery` | `9e4c33561b21` | failure |
| #84 | 2026-09-28 00:31:54 UTC | push | `development/v1.3.0-general-discovery` | `5c311c63e4e9` | failure |
| #85 | 2026-09-28 00:32:52 UTC | push | `development/v1.3.0-general-discovery` | `d9b4d139edcc` | success |
| #86 | 2026-09-28 00:33:25 UTC | push | `development/v1.3.0-general-discovery` | `3c232da2336d` | success |
| #87 | 2026-09-28 00:33:53 UTC | push | `development/v1.3.0-general-discovery` | `754e85d3bd86` | success |
| #88 | 2026-09-28 00:34:38 UTC | push | `development/v1.3.0-general-discovery` | `91bb2c27be6c` | success |
| #89 | 2026-09-28 00:34:51 UTC | push | `development/v1.3.0-general-discovery` | `a795ad20ebc6` | success |
| #90 | 2026-09-28 00:36:24 UTC | push | `development/v1.3.0-general-discovery` | `a85504e4c919` | success |
| #91 | 2026-09-28 00:37:59 UTC | push | `development/v1.3.0-general-discovery` | `42678b82be1a` | success |
| #92 | 2026-09-28 00:38:17 UTC | push | `development/v1.3.0-general-discovery` | `fe13347f91b8` | success |
| #93 | 2026-09-28 00:38:35 UTC | push | `development/v1.3.0-general-discovery` | `e0a8d206b813` | failure |
| #94 | 2026-09-28 00:39:54 UTC | push | `development/v1.3.0-general-discovery` | `b83a0f15ef5b` | failure |
| #95 | 2026-09-28 00:40:23 UTC | push | `development/v1.3.0-general-discovery` | `6abe57e7cbcb` | failure |
| #96 | 2026-09-28 00:40:42 UTC | push | `development/v1.3.0-general-discovery` | `69b3f44821b6` | failure |
| #97 | 2026-09-28 00:41:25 UTC | push | `development/v1.3.0-general-discovery` | `71197abc139f` | failure |
| #98 | 2026-09-28 00:42:31 UTC | push | `development/v1.3.0-general-discovery` | `495c73a66749` | failure |
| #99 | 2026-09-28 00:43:40 UTC | push | `development/v1.3.0-general-discovery` | `3e3ba84068a3` | failure |
| #100 | 2026-09-28 00:44:01 UTC | push | `development/v1.3.0-general-discovery` | `1f7fd50357fe` | failure |
| #101 | 2026-09-28 00:44:17 UTC | push | `development/v1.3.0-general-discovery` | `b607013ce14c` | failure |
| #102 | 2026-09-28 00:45:05 UTC | push | `development/v1.3.0-general-discovery` | `fe953b7d5aa2` | success |
| #103 | 2026-09-28 00:46:27 UTC | push | `development/v1.3.0-general-discovery` | `0ce8ff883134` | success |
| #104 | 2026-09-28 00:46:47 UTC | push | `development/v1.3.0-general-discovery` | `0d6d01f31e05` | success |
| #105 | 2026-09-28 00:47:09 UTC | push | `development/v1.3.0-general-discovery` | `b94535415daf` | success |
| #106 | 2026-09-28 00:47:35 UTC | push | `development/v1.3.0-general-discovery` | `0a61dad28e98` | success |
| #107 | 2026-09-28 00:48:15 UTC | push | `development/v1.3.0-general-discovery` | `3ed1a10fef68` | success |
| #108 | 2026-09-28 00:48:22 UTC | push | `development/v1.3.0-general-discovery` | `e6ee52662e3b` | success |
| #109 | 2026-09-28 00:50:13 UTC | push | `development/v1.3.0-general-discovery` | `9a8522274c3d` | failure |
| #110 | 2026-09-28 00:50:51 UTC | push | `development/v1.3.0-general-discovery` | `007ac1cfa3f2` | failure |
| #111 | 2026-09-28 00:51:08 UTC | push | `development/v1.3.0-general-discovery` | `e7255c623da3` | success |
| #112 | 2026-09-28 00:52:45 UTC | push | `development/v1.3.0-general-discovery` | `f478bb171755` | success |
| #113 | 2026-09-28 00:53:16 UTC | push | `development/v1.3.0-general-discovery` | `10c203cbbd03` | success |
| #114 | 2026-09-28 05:27:59 UTC | push | `development/v1.3.0-general-discovery` | `fd6f4b7e5849` | success |
| #115 | 2026-09-28 05:28:16 UTC | push | `development/v1.3.0-general-discovery` | `29cb19e94c28` | success |
| #116 | 2026-09-28 05:29:49 UTC | push | `development/v1.3.0-general-discovery` | `1a7387c1a170` | success |
| #117 | 2026-09-28 05:30:15 UTC | push | `development/v1.3.0-general-discovery` | `cdbab12e175f` | success |
| #118 | 2026-09-28 05:30:33 UTC | push | `development/v1.3.0-general-discovery` | `d9e141405f21` | success |
| #119 | 2026-09-28 05:31:55 UTC | push | `development/v1.3.0-general-discovery` | `529194d91e71` | success |
| #120 | 2026-09-28 05:32:20 UTC | push | `development/v1.3.0-general-discovery` | `365ea581ad73` | success |
| #121 | 2026-09-28 05:32:53 UTC | push | `development/v1.3.0-general-discovery` | `2bada2b2b6d0` | success |
| #122 | 2026-09-28 05:33:07 UTC | push | `development/v1.3.0-general-discovery` | `315918698867` | failure |
| #123 | 2026-09-28 05:35:04 UTC | push | `development/v1.3.0-general-discovery` | `d0720b9a2787` | failure |
| #124 | 2026-09-28 05:36:09 UTC | push | `development/v1.3.0-general-discovery` | `c7fbed778aa2` | failure |
| #125 | 2026-09-28 05:36:23 UTC | push | `development/v1.3.0-general-discovery` | `5e6e4398b2fb` | failure |
| #126 | 2026-09-28 05:36:36 UTC | push | `development/v1.3.0-general-discovery` | `14e9c74e8911` | failure |
| #127 | 2026-09-28 05:36:45 UTC | push | `development/v1.3.0-general-discovery` | `2a2e3befb6dc` | failure |
| #128 | 2026-09-28 05:36:57 UTC | push | `development/v1.3.0-general-discovery` | `2d3684638614` | failure |
| #129 | 2026-09-28 05:37:12 UTC | push | `development/v1.3.0-general-discovery` | `b0bd873b2d4c` | failure |
| #130 | 2026-09-28 05:37:21 UTC | push | `development/v1.3.0-general-discovery` | `469f69f2fbd3` | failure |
| #131 | 2026-09-28 05:37:52 UTC | push | `development/v1.3.0-general-discovery` | `52364cab270d` | failure |
| #132 | 2026-09-28 05:38:13 UTC | push | `development/v1.3.0-general-discovery` | `badef2e31ba4` | failure |
| #133 | 2026-09-28 05:38:54 UTC | push | `development/v1.3.0-general-discovery` | `2181b60d4691` | success |
| #134 | 2026-09-28 05:40:23 UTC | push | `development/v1.3.0-general-discovery` | `42857ae1346d` | success |
| #135 | 2026-09-28 05:40:56 UTC | push | `development/v1.3.0-general-discovery` | `e10f3385862d` | success |
| #136 | 2026-09-28 05:41:35 UTC | push | `development/v1.3.0-general-discovery` | `767a44e1539c` | success |
| #137 | 2026-09-28 05:41:51 UTC | push | `development/v1.3.0-general-discovery` | `743ea3e1f244` | success |
| #138 | 2026-09-28 05:43:33 UTC | push | `development/v1.3.0-general-discovery` | `ecb1f9a2dcc4` | success |
| #139 | 2026-09-28 05:43:43 UTC | push | `development/v1.3.0-general-discovery` | `7f858c785698` | success |
| #140 | 2026-09-28 05:43:56 UTC | push | `development/v1.3.0-general-discovery` | `747bf1169b6b` | success |
| #141 | 2026-09-28 05:47:28 UTC | push | `development/v1.3.0-general-discovery` | `5e87f6f71e8d` | success |
| #142 | 2026-09-28 05:47:47 UTC | push | `development/v1.3.0-general-discovery` | `7749a69b2f0e` | success |
| #143 | 2026-09-28 05:47:56 UTC | push | `development/v1.3.0-general-discovery` | `ff594d2f32d9` | success |
| #144 | 2026-09-28 05:48:34 UTC | push | `development/v1.3.0-general-discovery` | `25c1721c362f` | success |
| #145 | 2026-09-28 05:49:21 UTC | push | `development/v1.3.0-general-discovery` | `e8ddf7f9fc63` | success |
| #146 | 2026-09-28 05:51:38 UTC | push | `development/v1.3.0-general-discovery` | `946d0292b0db` | success |
| #147 | 2026-09-28 05:51:43 UTC | push | `development/v1.3.0-general-discovery` | `beae43e5b5c0` | success |
| #148 | 2026-09-28 05:52:20 UTC | push | `development/v1.3.0-general-discovery` | `fcdbefb1643c` | success |
| #149 | 2026-09-28 05:52:29 UTC | push | `development/v1.3.0-general-discovery` | `008f4da8569a` | success |
| #150 | 2026-09-28 05:52:43 UTC | push | `development/v1.3.0-general-discovery` | `ee28a78e9189` | success |
| #151 | 2026-09-28 05:53:09 UTC | push | `development/v1.3.0-general-discovery` | `8e90d29e49df` | success |
| #152 | 2026-09-28 05:53:33 UTC | push | `development/v1.3.0-general-discovery` | `dff78dbef8eb` | success |
| #153 | 2026-09-28 05:54:15 UTC | push | `development/v1.3.0-general-discovery` | `2e8e77d8fc51` | failure |
| #154 | 2026-09-28 05:55:36 UTC | push | `development/v1.3.0-general-discovery` | `697ec0d10b1f` | failure |
| #155 | 2026-09-28 05:56:19 UTC | push | `development/v1.3.0-general-discovery` | `79f4fe5e92b8` | failure |
| #156 | 2026-09-28 05:56:44 UTC | push | `development/v1.3.0-general-discovery` | `9f44cb5308d5` | failure |
| #157 | 2026-09-28 05:57:08 UTC | push | `development/v1.3.0-general-discovery` | `df49a99bc0a4` | failure |
| #158 | 2026-09-28 05:57:16 UTC | push | `development/v1.3.0-general-discovery` | `af327050d3c1` | failure |
| #159 | 2026-09-28 05:57:48 UTC | push | `development/v1.3.0-general-discovery` | `335b9e656427` | failure |
| #160 | 2026-09-28 05:58:14 UTC | push | `development/v1.3.0-general-discovery` | `a5804a833716` | failure |
| #161 | 2026-09-28 05:58:30 UTC | push | `development/v1.3.0-general-discovery` | `52e5dca514cd` | failure |
| #162 | 2026-09-28 05:59:59 UTC | push | `development/v1.3.0-general-discovery` | `a97b15bf144d` | failure |
| #163 | 2026-09-28 06:02:12 UTC | push | `development/v1.3.0-general-discovery` | `04c6274b92d3` | failure |
| #164 | 2026-09-28 06:04:38 UTC | push | `development/v1.3.0-general-discovery` | `3c6dcc86f794` | failure |
| #165 | 2026-09-28 06:05:04 UTC | push | `development/v1.3.0-general-discovery` | `6cf21a77fc5d` | success |
| #166 | 2026-09-28 06:26:58 UTC | push | `development/v1.3.0-general-discovery` | `4669d0cb2dc7` | failure |
| #167 | 2026-09-28 06:28:32 UTC | push | `development/v1.3.0-general-discovery` | `1538beafa6fb` | failure |
| #168 | 2026-09-28 06:30:39 UTC | push | `development/v1.3.0-general-discovery` | `de560a8747ea` | success |
| #169 | 2026-09-28 06:35:00 UTC | push | `development/v1.3.0-general-discovery` | `0aac3e63e835` | success |
| #170 | 2026-09-28 08:01:17 UTC | push | `development/v1.3.0-general-discovery` | `26a2f0fc2be6` | failure |
| #171 | 2026-09-28 08:08:31 UTC | push | `development/v1.3.0-general-discovery` | `3cca331710f8` | failure |
| #172 | 2026-09-28 08:13:02 UTC | push | `development/v1.3.0-general-discovery` | `a500ba7ab5ef` | failure |
| #173 | 2026-09-28 08:36:12 UTC | push | `development/v1.3.0-general-discovery` | `31220b7e2be2` | success |
| #174 | 2026-09-28 08:59:44 UTC | push | `development/v1.3.0-general-discovery` | `11501db3225a` | success |
| #175 | 2026-09-28 09:10:42 UTC | push | `development/v1.3.0-general-discovery` | `78501c8b4838` | success |
| #176 | 2026-09-28 09:11:00 UTC | push | `development/v1.3.0-general-discovery` | `18e447632526` | success |
| #177 | 2026-09-28 09:13:50 UTC | push | `development/v1.3.0-general-discovery` | `bea07b55cf02` | success |
| #178 | 2026-09-28 09:46:40 UTC | push | `development/v1.3.0-general-discovery` | `94a59ed87a04` | success |
| #179 | 2026-09-28 09:47:02 UTC | push | `development/v1.3.0-general-discovery` | `851332602ce3` | success |
| #180 | 2026-09-28 09:48:06 UTC | push | `development/v1.3.0-general-discovery` | `fada2ce22ca1` | success |
| #181 | 2026-09-28 09:48:21 UTC | push | `development/v1.3.0-general-discovery` | `562336e18ba3` | success |
| #182 | 2026-09-28 09:50:34 UTC | push | `development/v1.3.0-general-discovery` | `fe2c93af63d3` | success |
| #183 | 2026-09-28 18:03:22 UTC | push | `development/v1.3.0-general-discovery` | `892875618214` | success |
| #184 | 2026-09-28 18:04:35 UTC | push | `development/v1.3.0-general-discovery` | `88e788746490` | success |
| #185 | 2026-09-28 18:05:32 UTC | push | `development/v1.3.0-general-discovery` | `eeb2d744b346` | success |
| #186 | 2026-09-28 18:06:06 UTC | push | `development/v1.3.0-general-discovery` | `900035267071` | failure |
| #187 | 2026-09-28 18:08:20 UTC | push | `development/v1.3.0-general-discovery` | `94e5629b642b` | success |
| #188 | 2026-09-28 18:18:05 UTC | push | `v1.3.0-rc.1` | `f053e2727c36` | success |
| #189 | 2026-09-28 18:40:05 UTC | push | `development/v1.3.0-general-discovery` | `3ddc9b6795b7` | success |

## Current open prerelease QA items

- **Review / Case Auditor context consistency:** resolved in commit `fafce7e97fa8d561fe6ba73e8e6b9da8aaf8b600`; Actions run #193 passed.
- **Native Windows icon:** resolved in commit `5e1d00de11dce70c34d94959c4bc2c402d058b9b`; Actions run #194 passed packaging, portable smoke, installer build and installed-app smoke.
- **Background execution:** resolved in commit `4a3701bb400a51cb907afbdc6de42de125c6418c`; Actions run #191 passed the real minimized-window runtime smoke.
- **Watch Run desktop UX:** implementation upgraded in commit `128e68e022a4a82fe4f9a2ea7384503fa93a4c04`; Actions run #192 passed.
- **Review / Case Auditor context consistency:** Smart Import now binds detected cases by stable source/root identity and carries the resolved `caseId` through the load pipeline instead of re-looking up mutable display names. Review uses a shared case-context binder and stamps all audit output with that same `caseId`. Run #193 passed.
- **Native Windows branding:** native FoamLens icon is embedded in the EXE, assigned to the window/taskbar and used by installer/shortcuts. Run #194 passed.


## Subsequent changes after the baseline history snapshot

| Date | SHA | Change | Validation |
|---|---|---|---|
| 2026-09-28 | `ac013cc25bea` | Add complete Git development audit log | Documentation baseline |
| 2026-09-28 | `43b62231af6f` | Keep scientific work running outside render frames | Run #190 success |
| 2026-09-28 | `4a3701bb400a` | Smoke-test minimized background execution | Run #191 success |
| 2026-09-28 | `128e68e022a4` | Upgrade Watch Run for desktop monitoring | Run #192 success |
| 2026-09-28 | `fafce7e97fa8` | Keep Review data bound to the selected case | Run #193 success |
| 2026-09-28 | `5e1d00de11dc` | Add native FoamLens Windows icon | Run #194 success |

### GitHub Actions after the baseline snapshot

| Run | Ref | SHA | Result |
|---:|---|---|---|
| #190 | `development/v1.3.0-general-discovery` | `43b62231af6f` | success |
| #191 | `development/v1.3.0-general-discovery` | `4a3701bb400a` | success |
| #192 | `development/v1.3.0-general-discovery` | `128e68e022a4` | success |
| #193 | `development/v1.3.0-general-discovery` | `fafce7e97fa8` | success |
| #194 | `development/v1.3.0-general-discovery` | `5e1d00de11dc` | success |

## How to update this log

When a new change is made, record the actual commit SHA and CI result after the operation completes. When a prerelease bug is found, add it as an open QA item first; move it into the milestone/commit history only after the fix is committed and validated. Releases should record the exact tag, target and generated binary assets.


## 2026-09-28 — v1.3.1 release preparation

- Desktop semantic version bumped from `1.3.0` to `1.3.1` before merging PR #1.
- Reason: the `main` workflow publishes the GitHub Release from the desktop project version; keeping `1.3.0` would overwrite/reuse the existing `v1.3.0` release instead of creating a new patch release.
- Target release after CI + merge: `v1.3.1`.


## 2026-09-28 — FoamLens Desktop v1.3.1 released

- PR #1 (`Release FoamLens Desktop v1.3.1`) was marked ready and merged into `main`.
- Merge commit: `97060108c7cbed8d06310644195a7c2ee0989562`.
- Development head merged: `d5a94b527ae6eec76a8ce1cef9ca5b61dd0a2d57`.
- Final development validation: GitHub Actions run #195 — success.
- Main/release validation: GitHub Actions run #196 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Tag `v1.3.1` points to the merge commit above.
- Published GitHub Release: `FoamLens v1.3.1`.
- Release assets:
  - `FoamLens-Portable-v1.3.1.exe`
  - `FoamLens-Portable-v1.3.1.exe.sha256`
  - `FoamLens-Setup-v1.3.1.exe`
- Release published at 2026-09-28 20:04:27 UTC.

## 2026-09-29 — v1.3.2 release correction

- GitHub already published normal release `v1.3.1` from merge commit `97060108c7cbed8d06310644195a7c2ee0989562`; Actions run #196 passed.
- Post-release inspection found that the binary still carried internal `development / release candidate` wording even though the functional prerelease QA fixes were included.
- The existing `v1.3.1` artifacts are intentionally not being silently replaced from a different commit. A clean patch release is being prepared instead.
- Branch `release/v1.3.2` was created directly from `main` commit `3735424af6f6413b72fbfe7e101a97040448fa40`.
- v1.3.2 removes development/RC wording, reports frontend `v51` and Desktop `v1.3.2`, stores new workspace payloads as `productVersion: v51`, and updates README/version regressions accordingly.
- CI on release branches is enabled through the `release/**` workflow branch pattern. Actions run #198 completed successfully: real QuickCup regression, complete scientific/UI suites, portable EXE smoke, native icon checks, minimized background execution, installer build and installed-app smoke all passed.

| #198 | 2026-09-29 | `release/v1.3.2` | `ada3a9168610` | success | v1.3.2 release correction; full Windows + QuickCup validation passed. |


## 2026-09-29 — FoamLens Desktop v1.3.2 released

- Release branch: `release/v1.3.2`.
- Release preparation commit: `ada3a9168610ddec3bf56973e4dc1aef85568db8`.
- Release validation record commit: `f5e6ab835da5f2767df657b40d1f85a816b8e27b`.
- PR #2 (`Release FoamLens Desktop v1.3.2`) merged into `main`.
- Merge commit: `368655e5b4f9aaddb4f528d530318612f7cb6b19`.
- Release-branch validation: GitHub Actions run #198 — success.
- Main/release validation: GitHub Actions run #199 — success.
- Real QuickCup regression: success.
- Portable EXE smoke: success.
- Installed-app smoke: success.
- Native Windows icon packaging: success.
- Minimized/background execution smoke: success.
- Watch Run desktop monitoring test: success.
- Review case identity binding test: success.
- Published GitHub Release: `FoamLens v1.3.2`.
- Release type: normal release, not prerelease.
- Release assets:
  - `FoamLens-Portable-v1.3.2.exe`
  - `FoamLens-Portable-v1.3.2.exe.sha256`
  - `FoamLens-Setup-v1.3.2.exe`
- Release published at 2026-09-29 17:28:32 UTC.
- `v1.3.1` was left intact; its assets were not silently replaced.


## 2026-09-29 — v1.4.0 Field View development started

- Development branch: `development/v1.4.0-field-view`, created directly from released `main` v1.3.2 commit `2ab17037bcc6922f25ed2f28d9e2a493a33fa327`.
- Native Desktop bridge extended with read-only, cancellable ASCII OpenFOAM `polyMesh` parsing for `points`, `faces`, `owner`, and `neighbour`.
- Frontend extension loading generalized from `v13-*.js` to `v*-*.js`; the new viewer lives in isolated module `v14-field-view.js` rather than modifying the monolithic v51 frontend.
- Added the **Field View** data tab with WebGL mesh rendering, boundary-surface scalar coloring, mesh edges, camera orbit/zoom, color maps, locked color ranges and physical-time playback.
- Added vector-field visualization with magnitude/component selection, velocity glyphs and configurable streamlines derived from the actual instantaneous cell-centred OpenFOAM vector field.
- Streamlines use local inverse-distance vector interpolation with midpoint integration; this is an explicit FoamLens approximation and is not claimed to reproduce ParaView/VTK interpolation bit-for-bit.
- Added default-region and named-region `constant/polyMesh` discovery.
- Fixed multi-region eligibility so cases such as `metal` / `mold` are visualizable when a meshed named region has compatible volume fields.
- Decomposed processor fields are not silently mapped onto a reconstructed mesh; Field View requests reconstruction when topology/count alignment cannot be established.
- Initial fallback QA exposed and fixed an over-escaped ASCII `points` parser regex (`point-count-mismatch` on a valid cube).
- Initial WebGL QA exposed and fixed a renderer-factory naming typo before release.
- Dedicated regression: `desktop/tests/field-view.test.cjs` validates a synthetic OpenFOAM cube, region discovery, multi-region availability, physical-time navigation, colormaps, streamline integration, native bridge wiring, vector/streamline product wiring and generic versioned module loading.
- Real QuickCup regression remains green, but the QuickCup fixture repository does not version `polyMesh`; therefore mesh geometry itself is currently regression-tested with the synthetic OpenFOAM fixture. QuickCup's `controlDict` uses `writeFormat ascii`, matching the supported mesh format.
- Validation progression:
  - Run #200: failed only in the new Field View cube parser.
  - Run #201: failed on the same fallback parser after the separate renderer typo was fixed.
  - Run #202: success after fixing ASCII point parsing.
  - Runs #203 and #204: success with vector glyphs and their regression coverage.
  - Run #206: **success** after the multi-region fix and dedicated multi-region test; real QuickCup regression, all legacy suites, Field View suite, portable EXE smoke, installer build and installed-app smoke all passed.
- Final validated code SHA for run #206: `919131e08b4edaa65e458bcbf955b73f06c62847`.
- Documentation-only scope record added afterward in `docs/v1.4.0-field-view-spec.md`; no release was published and `main` remains v1.3.2.
