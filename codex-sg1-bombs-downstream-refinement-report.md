# codex-sg1-bombs-downstream-refinement-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/codex-sg1-bombs-downstream-refinement-config.js` | instrumentation-only | tiny harness config for the downstream-only screen |
| `codex-sg1-bombs-downstream-refinement-report.md` | report-only | self-contained pass summary |

Reused unchanged:

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js`
- `tools/codex-lane-probe-harness.js`

No live combat patch was landed. `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not edited.

## Exact commands run

```bash
node --check ./tmp/codex-sg1-bombs-downstream-refinement-config.js
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./legacy-sim-v1.0.4-clean.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-sg1-bombs-downstream-refinement-config.js > ./tmp/codex-sg1-bombs-downstream-refinement-harness.log 2>&1
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/lane-probe-harness/sg1-bombs-downstream-refinement-1773636822155/summary.json`
- `./tmp/replay-sg1-bombs-debug-base`
- `./tmp/replay-sg1-bombs-debug-toggle`

## Compact summary of the parent winning branch

Parent branch preserved in this pass:

- `LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit`
- `LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2`

Current 100k harness read for the parent branch:

| attacker | defender | base win Δ | parent win Δ | improvement |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | `SG1 Split Bombs T2` | `+2.65` | `+2.51` | `+0.14` |
| `CUSTOM` | `SG1 Rift/Bombs Bio` | `+2.30` | `+2.17` | `+0.13` |
| `CUSTOM_CSTAFF_A4` | `SG1 Split Bombs T2` | `-1.87` | `-1.15` | `+0.72` |
| `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-3.07` | `-2.33` | `+0.74` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Split Bombs T2` | `+2.16` | `+2.11` | `+0.05` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Rift/Bombs Bio` | `+1.64` | `+1.08` | `+0.56` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.36` | `+3.16` | `+0.20` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Rift/Bombs Bio` | `+2.37` | `+2.36` | `+0.01` |

Parent-branch summary:

- mean target gain `0.32`
- all 8 target rows still move in the right direction at this scale
- controls and contrasts stay flat

## First downstream divergence found after the `w2` shared-hit refresh

The first divergence is still the inserted defender `w2` hit refresh itself, but the first **downstream** point that explains the remaining wobble is later than post-success commit:

- not raw/apply conversion on the refreshed `w2`
- not hp-cap / applied-vs-raw conversion
- not dead-state or stop-on-kill timing on the refreshed `w2`
- not retaliation boundary as the primary miss

Best concrete downstream read:

- **later RNG phase-shift / kill-race sensitivity after the same defender `w2` refresh**

Why:

For the two maul attackers on `SG1 Rift/Bombs Bio`, the refreshed `w2` produces different downstream effects even though the same branch is used:

- `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Rift/Bombs Bio`
  - deterministic fight 1: baseline defender `w2` reuses a miss; parent refresh turns that `w2` into a hit
  - defender avg applied damage / turn: `+0.3609`
  - attacker avg applied damage / turn: `-0.3698`
  - net result: row improves strongly
- `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`
  - deterministic fight 1: baseline defender `w2` already hits; parent refresh still hits
  - defender avg applied damage / turn: `+0.2359`
  - attacker avg applied damage / turn: `+0.6287`
  - net result: the branch mainly phase-shifts later RNG and attacker kill-race, not the immediate refreshed `w2`

That is the key downstream split:

- when the inserted `w2` refresh rescues a reused miss, the branch helps
- when the refreshed `w2` would already have hit, the remaining effect is mostly later RNG-phase / kill-race drift

This is why the obvious post-success boundary fixes do not help.

## Tiny downstream refinement matrix tested

All toggles below inherit the parent winner:

- `parent_refresh_hit_sg1_bombs_w2`
- `parent_plus_w2gate`
  - adds `LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender`
- `parent_plus_split`
  - adds `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender`
- `parent_plus_w2gate_split`
  - combines both
- `parent_plus_stop_on_kill`
  - adds `LEGACY_ACTION_STOP_ON_KILL=1`
- `parent_plus_queued_second_defender`
  - adds `LEGACY_DIAG_QUEUED_SECOND_ACTION=defender`

Scoring:

- `targetGain` = mean reduction in absolute win delta across the 8 target rows
- `controlMove` = mean absolute movement on `DL Rift/Bombs Scout`
- `contrastMove` = mean absolute movement on `DL Dual Rift Bio`, `Ashley Build`, `HF Scythe Pair`
- `score = targetGain - controlMove - contrastMove - 0.1*defaultReach`

## Compact ranked score table

| rank | toggle | targetGain | controlMove | contrastMove | score | read |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `parent_refresh_hit_sg1_bombs_w2` | `0.32` | `0.00` | `0.00` | `0.22` | current winner stays best |
| 2 | `off` | `0.00` | `0.00` | `0.00` | `0.00` | baseline |
| 3 | `parent_plus_w2gate_split` | `0.32` | `0.23` | `0.18` | `-0.19` | same target gain, much worse collateral |
| 4 | `parent_plus_split` | `0.21` | `0.12` | `0.19` | `-0.20` | weaker target gain, collateral added |
| 5 | `parent_plus_stop_on_kill` | `0.21` | `0.18` | `0.16` | `-0.23` | broad kill-boundary side effects |
| 6 | `parent_plus_queued_second_defender` | `0.19` | `0.14` | `0.20` | `-0.25` | retaliation/turn-continuation is noisy |
| 7 | `parent_plus_w2gate` | `0.09` | `0.16` | `0.11` | `-0.28` | weakest useful target gain |

Row-level read on the strongest downstream candidates:

- `parent_plus_w2gate`
  - helps `CUSTOM_CSTAFF_A4`
  - regresses both `CUSTOM` target rows and `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Split Bombs T2`
- `parent_plus_split`
  - helps `CUSTOM_CSTAFF_A4`
  - regresses `CUSTOM` target rows, `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Split Bombs T2`, and `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`
- `parent_plus_stop_on_kill`
  - biggest single new target regression: `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Split Bombs T2` (`+2.16 -> +2.85`, `-0.69`)
- `parent_plus_queued_second_defender`
  - clearly broad/noisy; regresses both `CUSTOM` target rows and `CUSTOM_MAUL_A4_SG1_PINK | SG1 Split Bombs T2`

## Whether any refinement is patch-ready

No.

Why not:

- every downstream refinement is worse than the plain parent winner
- the best same-gain downstream combination, `parent_plus_w2gate_split`, adds clear control and contrast movement
- the kill-boundary candidates (`stop_on_kill`, queued second action) behave like broad global perturbations, not a clean local fix
- the remaining wobble is still best explained as later RNG-phase / kill-race drift after the same parent refresh, not as a missed post-success commit rule

## Engineering decision

The SG1 bombs branch should remain diagnosis-only / not be landed.

Why:

- the parent branch is still the best local proof
- no downstream refinement makes it cleaner or safer
- the remaining instability is small, attacker-sensitive, and downstream of the branch rather than a new narrow patchable boundary bug

## Compact control / contrast summary

Parent branch:

- `DL Rift/Bombs Scout`: flat
- `DL Dual Rift Bio`: flat
- `Ashley Build`: flat
- `HF Scythe Pair`: flat

Downstream refinements:

- `parent_plus_w2gate`
  - moves `DL Rift/Bombs Scout` by up to `0.24`
  - moves `DL Dual Rift Bio` by up to `0.27`
  - flips `CUSTOM_MAUL_A4_SG1_PINK | HF Scythe Pair` across zero
- `parent_plus_split`
  - moves `Ashley Build` by up to `0.56`
  - moves `DL Dual Rift Bio` by up to `0.30`
- `parent_plus_stop_on_kill`
  - moves `DL Rift/Bombs Scout` by up to `0.32`
  - moves `HF Scythe Pair` by up to `0.32`
- `parent_plus_queued_second_defender`
  - moves `DL Rift/Bombs Scout` by up to `0.41`
  - moves `DL Dual Rift Bio` by up to `0.40`

## Compact broader sanity note

`data/legacy-defenders.js` still has only one direct live row in this family:

- `SG1 Split Bombs T2`

So even the current best branch still lacks enough broad live reach to justify landing when the remaining instability is downstream and no refinement improves safety.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No exact-label or exact-shell live patch was landed.

SG1 bombs downstream refinement tested; branch remains diagnosis-only
