# codex-sg1-bombs-cluster-harness-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.lane-probe.js` | instrumentation-only | added reusable projectile-family `LEGACY_LANE_PROBE_W2_PREDICATE` matches for this pass; live sim untouched |
| `tools/codex-lane-probe-harness.js` | instrumentation-only | extended default-defender reach estimator for the new projectile-family predicates |
| `tmp/codex-sg1-bombs-cluster-config.js` | instrumentation-only | small reusable harness config for the SG1 bombs cluster |
| `codex-sg1-bombs-cluster-harness-report.md` | report-only | self-contained pass summary |

No live combat patch was landed. `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not edited.

## Exact commands run

```bash
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./tmp/codex-sg1-bombs-cluster-config.js
node --check ./legacy-sim-v1.0.4-clean.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-sg1-bombs-cluster-config.js > ./tmp/codex-sg1-bombs-cluster-harness.log 2>&1
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/lane-probe-harness/sg1-bombs-cluster-1773634139837`
- `./tmp/lane-probe-harness/sg1-bombs-cluster-1773634139837/summary.json`

## Compact shell-signature table

| defender | armor | w1 | w2 | misc pair | shared family read |
| --- | --- | --- | --- | --- | --- |
| `SG1 Split Bombs T2` | `SG1 Armor` | `Split Crystal Bombs T2` | `Split Crystal Bombs T2` | `Scout Drones + Scout Drones` | SG1 projectile shell, bombs in `w2`, dual-projectile |
| `SG1 Rift/Bombs Bio` | `SG1 Armor` | `Rift Gun` | `Split Crystal Bombs T2` | `Bio Spinal Enhancer + Scout Drones` | SG1 projectile shell, bombs in `w2`, mixed projectile |

Shared structural overlap:

- both use `SG1 Armor`
- both are defender-side projectile shells
- both carry `Split Crystal Bombs T2` in `w2`
- both sit on the `w2` shared-roll / sequencing surface

Natural split axes:

- `dual bombs` only: `SG1 Split Bombs T2`
- `rift+bombs+bio` only: `SG1 Rift/Bombs Bio`

## 8-row baseline target table

Current accepted live baseline, measured through the temp probe copy with all probe toggles off:

| attacker | defender | win Δ | avgTurns Δ |
| --- | --- | ---: | ---: |
| `CUSTOM` | `SG1 Split Bombs T2` | `+2.76` | `-0.2230` |
| `CUSTOM` | `SG1 Rift/Bombs Bio` | `+2.44` | `-0.1165` |
| `CUSTOM_CSTAFF_A4` | `SG1 Split Bombs T2` | `-1.69` | `-0.2832` |
| `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-3.02` | `-0.1107` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Split Bombs T2` | `+2.28` | `-0.3561` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Rift/Bombs Bio` | `+1.73` | `-0.1710` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.71` | `-0.2291` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Rift/Bombs Bio` | `+2.26` | `-0.1244` |

Baseline read:

- average absolute win delta across the 8 rows is `2.49`
- sign is mixed only because `CUSTOM_CSTAFF_A4` is negative on both rows
- avgTurns drift is consistently negative on all 8 rows

## Toggle matrix tested

The harness tested these temporary toggles:

- `off`
- `w2 gate defender global`
- `split defender global`
- `refresh hit dual projectile`
- `refresh skill dual projectile`
- `refresh full dual projectile`
- `refresh hit bombs w2`
- `refresh skill bombs w2`
- `refresh full bombs w2`
- `refresh hit sg1 bombs w2`
- `refresh skill sg1 bombs w2`
- `refresh full sg1 bombs w2`
- `w2 gate sg1 bombs w2`
- `split defender sg1 bombs w2`
- `refresh hit dual bombs` (analysis bound)
- `refresh hit rift+bombs+bio` (analysis bound)

Interpretation of the families:

- `dual projectile` = any defender with projectile `w1` and projectile `w2`
- `bombs w2` = any defender with `Split Crystal Bombs T2` in `w2`
- `sg1 bombs w2` = `SG1 Armor` plus `Split Crystal Bombs T2` in `w2`
- analysis bounds split the cluster into `dual bombs` and `rift+bombs+bio`

## Compact ranked score table

Scoring used:

- `targetGain` = mean reduction in absolute win delta across the 8 target rows
- `splitGain` / `riftGain` = per-defender mean reduction in absolute win delta
- `controlMove` = mean absolute win movement on `DL Rift/Bombs Scout`
- `contrastMove` = mean absolute win movement on `DL Dual Rift Bio`, `Ashley Build`, `HF Scythe Pair`
- `defaultReach` = matching rows in `data/legacy-defenders.js`
- `score` = `targetGain - controlMove - contrastMove - 0.1*defaultReach`

| rank | toggle | splitGain | riftGain | targetGain | improved / worsened target rows | controlMove | contrastMove | defaultReach | score |
| ---: | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `refresh_hit_sg1_bombs_w2` | `0.48` | `0.32` | `0.40` | `7 / 1` | `0.00` | `0.00` | `1` | `0.30` |
| 2 | `refresh_full_sg1_bombs_w2` | `0.48` | `0.32` | `0.40` | `7 / 1` | `0.00` | `0.00` | `1` | `0.30` |
| 3 | `refresh_hit_bombs_w2` | `0.48` | `0.32` | `0.40` | `7 / 1` | `0.14` | `0.00` | `1` | `0.16` |
| 4 | `refresh_full_bombs_w2` | `0.48` | `0.32` | `0.40` | `7 / 1` | `0.14` | `0.00` | `1` | `0.16` |
| 5 | `refresh_hit_rift_bombs_bio` | `0.00` | `0.32` | `0.16` | `3 / 1` | `0.00` | `0.00` | `0` | `0.16` |
| 6 | `refresh_hit_dual_projectile` | `0.48` | `0.00` | `0.24` | `4 / 0` | `0.00` | `0.00` | `1` | `0.14` |
| 7 | `refresh_full_dual_projectile` | `0.48` | `0.00` | `0.24` | `4 / 0` | `0.00` | `0.00` | `1` | `0.14` |
| 8 | `refresh_hit_dual_bombs` | `0.48` | `0.00` | `0.24` | `4 / 0` | `0.00` | `0.00` | `1` | `0.14` |
| 9 | `off` | `0.00` | `0.00` | `0.00` | `0 / 0` | `0.00` | `0.00` | `0` | `0.00` |
| 10 | `refresh_skill_dual_projectile` | `0.00` | `0.00` | `0.00` | `0 / 0` | `0.00` | `0.00` | `1` | `-0.10` |
| 11 | `refresh_skill_bombs_w2` | `0.00` | `0.00` | `0.00` | `0 / 0` | `0.00` | `0.00` | `1` | `-0.10` |
| 12 | `refresh_skill_sg1_bombs_w2` | `0.00` | `0.00` | `0.00` | `0 / 0` | `0.00` | `0.00` | `1` | `-0.10` |
| 13 | `split_defender_sg1_bombs_w2` | `0.33` | `0.35` | `0.34` | `7 / 1` | `0.21` | `0.26` | `1` | `-0.23` |
| 14 | `w2gate_sg1_bombs_w2` | `0.10` | `-0.02` | `0.04` | `6 / 2` | `0.26` | `0.20` | `1` | `-0.51` |
| 15 | `w2gate_defender_global` | `0.10` | `-0.02` | `0.04` | `6 / 2` | `0.24` | `0.25` | `15` | `-1.95` |
| 16 | `split_defender_global` | `0.33` | `0.35` | `0.34` | `7 / 1` | `0.15` | `0.79` | `15` | `-2.09` |

## Grouped vs split decision

The two defenders stay grouped.

Why:

- the best grouped predicate is natural and compact: `SG1 Armor + bombs in w2`
- `refresh_hit_sg1_bombs_w2` improves both defenders:
  - `SG1 Split Bombs T2`: mean gain `0.48`
  - `SG1 Rift/Bombs Bio`: mean gain `0.32`
- the same grouped predicate stays flat on the healthy control and all listed contrasts
- the analysis bounds decompose the grouped result cleanly:
  - `dual_projectile` / `dual_bombs` explains the `Split Bombs T2` half
  - `rift_bombs_bio` explains the `Rift/Bombs Bio` half
  - the grouped `sg1_bombs_w2` predicate captures both halves with the same `shared-hit` surface and without the control movement seen on broader `bombs_w2`

This does not look like two immediate unrelated lanes. It looks like one SG1 `bombs in w2` cluster with two structural sub-families under it.

## Strongest shared signal

Strongest shared signal:

- defender-side `w2` shared-hit refresh on `SG1 Armor + bombs in w2`

Why this is the strongest shared signal:

- `refresh_hit_sg1_bombs_w2` and `refresh_full_sg1_bombs_w2` tie exactly
- every `skill`-only refresh toggle is completely inert
- `w2` gate toggles are weak and partly wrong-signed on `SG1 Rift/Bombs Bio`
- split-action toggles move the target cluster, but they also move the control and unrelated contrasts

That localizes the live signal to `shared-hit` carryover / reuse before defender `w2`, not shared-skill and not simple post-`w1` applied-damage gating.

## Best next narrow branch

Best next narrow branch:

- `defender_sg1_bombs_w2` `w2` shared-hit refresh

Why it beats the alternatives:

- same target gain as the broader `bombs_w2` family
- zero measured movement on `DL Rift/Bombs Scout`
- zero measured movement on `DL Dual Rift Bio`, `Ashley Build`, and `HF Scythe Pair`
- broader split-action and gate branches are clearly noisier
- the natural SG1 armor restriction is what removes the scout collateral

Current limitation:

- this is still not patch-ready from this pass
- one target row regressed at 50k:
  - `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`: `+2.26 -> +2.49`

So the right next step is a narrow follow-up diagnosis inside this grouped branch, not a live patch.

## One compact control/contrast summary

Under `refresh_hit_sg1_bombs_w2`:

- `DL Rift/Bombs Scout`: mean movement `0.00`
- `DL Dual Rift Bio`: mean movement `0.00`
- `Ashley Build`: mean movement `0.00`
- `HF Scythe Pair`: mean movement `0.00`

The same is not true for the broader alternatives:

- `refresh_hit_bombs_w2` moves the scout control by `0.14`
- `split_defender_sg1_bombs_w2` moves scout `0.21`, `DL Dual Rift Bio` `0.36`, `Ashley Build` `0.18`, `HF Scythe Pair` `0.24`

## One compact broader sanity note

`data/legacy-defenders.js` has exactly one live row in the winning grouped predicate:

- `SG1 Split Bombs T2`

No default-file `SG1 Rift/Bombs Bio` analog exists there. So this cluster has non-zero live reach, but it is still narrow and should be sanity-checked again before any landing patch.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No live exact-label or exact-shell patch was landed.

SG1 bombs cluster stays grouped; best next branch is defender_sg1_bombs_w2 w2 shared-hit refresh
