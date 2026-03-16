# codex-sg1-bombs-remaining-regression-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/codex-sg1-bombs-remaining-regression-config.js` | instrumentation-only | tiny harness config for this bounded follow-up screen |
| `codex-sg1-bombs-remaining-regression-report.md` | report-only | self-contained pass summary |

Reused unchanged:

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js`
- `tools/codex-lane-probe-harness.js`

No live combat patch was landed. `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not edited.

## Exact commands run

```bash
node --check ./tmp/codex-sg1-bombs-remaining-regression-config.js
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./legacy-sim-v1.0.4-clean.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-base LEGACY_REPLAY_TAG='sg1-bombs-rem-base-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-base-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-base LEGACY_REPLAY_TAG='sg1-bombs-rem-base-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-base-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-base LEGACY_REPLAY_TAG='sg1-bombs-rem-base-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-base-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-base LEGACY_REPLAY_TAG='sg1-bombs-rem-base-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-base-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-toggle LEGACY_REPLAY_TAG='sg1-bombs-rem-toggle-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-toggle-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-toggle LEGACY_REPLAY_TAG='sg1-bombs-rem-toggle-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-toggle-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-toggle LEGACY_REPLAY_TAG='sg1-bombs-rem-toggle-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-toggle-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-remaining-toggle LEGACY_REPLAY_TAG='sg1-bombs-rem-toggle-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-toggle-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-debug-base LEGACY_REPLAY_TAG='sg1-bombs-debug-base-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_DL_ABYSS|SG1 Split Bombs T2,CUSTOM_MAUL_A4_DL_ABYSS|SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=260 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-debug-base-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-debug-toggle LEGACY_REPLAY_TAG='sg1-bombs-debug-toggle-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_DL_ABYSS|SG1 Split Bombs T2,CUSTOM_MAUL_A4_DL_ABYSS|SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=260 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-debug-toggle-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-debug-base LEGACY_REPLAY_TAG='sg1-bombs-debug-base-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Split Bombs T2,CUSTOM_MAUL_A4_SG1_PINK|SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=260 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-debug-base-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-debug-toggle LEGACY_REPLAY_TAG='sg1-bombs-debug-toggle-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Split Bombs T2,CUSTOM_MAUL_A4_SG1_PINK|SG1 Rift/Bombs Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=260 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-debug-toggle-maul-sg1.log 2>&1

node ./tools/codex-lane-probe-harness.js ./tmp/codex-sg1-bombs-remaining-regression-config.js > ./tmp/codex-sg1-bombs-remaining-regression-harness.log 2>&1

mkdir -p ./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854/refresh-hit-rift-bombs-bio
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=100000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854/refresh-hit-rift-bombs-bio LEGACY_REPLAY_TAG='sg1-bombs-remaining-regression-refresh-hit-rift-bombs-bio-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_rift_bombs_bio node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-riftbio-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=100000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854/refresh-hit-rift-bombs-bio LEGACY_REPLAY_TAG='sg1-bombs-remaining-regression-refresh-hit-rift-bombs-bio-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_rift_bombs_bio node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-riftbio-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=100000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854/refresh-hit-rift-bombs-bio LEGACY_REPLAY_TAG='sg1-bombs-remaining-regression-refresh-hit-rift-bombs-bio-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_rift_bombs_bio node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-riftbio-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=100000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854/refresh-hit-rift-bombs-bio LEGACY_REPLAY_TAG='sg1-bombs-remaining-regression-refresh-hit-rift-bombs-bio-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Split Bombs T2,SG1 Rift/Bombs Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,Ashley Build,HF Scythe Pair' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_rift_bombs_bio node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-sg1-bombs-rem-riftbio-maul-sg1.log 2>&1
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/replay-sg1-bombs-remaining-base`
- `./tmp/replay-sg1-bombs-remaining-toggle`
- `./tmp/replay-sg1-bombs-debug-base`
- `./tmp/replay-sg1-bombs-debug-toggle`
- `./tmp/lane-probe-harness/sg1-bombs-remaining-regression-1773635709854`

## 8-row before/after table for the current winning branch

Current winning branch:

- `LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit`
- `LEGACY_LANE_PROBE_W2_PREDICATE=defender_sg1_bombs_w2`

200k targeted rerun:

| attacker | defender | before win Δ | after win Δ | improvement | before avgTurns Δ | after avgTurns Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM` | `SG1 Split Bombs T2` | `+2.90` | `+2.60` | `+0.30` | `-0.2192` | `-0.1512` |
| `CUSTOM` | `SG1 Rift/Bombs Bio` | `+2.48` | `+2.34` | `+0.14` | `-0.1120` | `-0.0654` |
| `CUSTOM_CSTAFF_A4` | `SG1 Split Bombs T2` | `-1.90` | `-1.01` | `+0.89` | `-0.2933` | `-0.1556` |
| `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-3.11` | `-2.33` | `+0.78` | `-0.1024` | `-0.0115` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Split Bombs T2` | `+2.03` | `+2.23` | `-0.20` | `-0.3739` | `-0.2280` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Rift/Bombs Bio` | `+1.38` | `+1.17` | `+0.21` | `-0.1487` | `-0.0624` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.44` | `+3.30` | `+0.14` | `-0.2239` | `-0.1503` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Rift/Bombs Bio` | `+2.28` | `+2.18` | `+0.10` | `-0.1234` | `-0.0736` |

Explicit highlight:

- the originally flagged 50k regression, `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`, did **not** persist at 200k; it improved slightly (`+2.28 -> +2.18`)
- the only 200k non-improver was instead `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Split Bombs T2`, and even that miss was small (`+2.03 -> +2.23`, `-0.20`)

Read:

- the “single remaining bad row” is not stable across trial scale
- avgTurns improved on all 8 rows, including the 200k non-improver

## Compact subfamily comparison

Structural split:

- `SG1 Split Bombs T2` = `dual bombs`
- `SG1 Rift/Bombs Bio` = `rift + bombs + bio`

What the winning branch does:

- 200k mean gain on `dual bombs`: `+0.28`
- 200k mean gain on `rift+bombs+bio`: `+0.31`

What the 100k refinement screen showed:

- `refresh_hit_dual_bombs` improves only the `dual bombs` half
- `refresh_hit_rift_bombs_bio` improves only the `rift+bombs+bio` half
- plain `refresh_hit_sg1_bombs_w2` remains better than either half alone because it captures both

So the branch is still grouped. The row-level wobble is not a clean “dual bombs good / rift+bombs bad” split.

## First concrete divergence for the originally regressing row

Originally flagged row:

- `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`

First concrete divergence under deterministic debug is the same as the other 7 rows:

- baseline defender `w2` consumes the shared hit:
  - `RD HIT_USED_SHARED ... D->A w2(Split Crystal Bombs T2)`
- toggle inserts a fresh defender `w2` hit roll:
  - `RD HIT_SHARED ... D->A w2(Split Crystal Bombs T2) ... note=laneProbeW2Refresh`

That means the row does **not** split at:

- compile/runtime construction
- `pre.forceHit` creation
- defender identity gating
- a unique hit-lifecycle branch

Where it actually diverges:

- on the flagged row, the inserted defender `w2` refresh often preserves the same immediate `w2` hit outcome and mainly phase-shifts later RNG
- on improving rows, the same refresh more often rescues a reused miss into a fresh `w2` hit

Concrete deterministic examples from fight 1:

- `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Rift/Bombs Bio`
  - baseline: defender `w2` forced from shared miss (`forced=0`)
  - toggle: defender `w2` refreshed into a hit (`forced=1`)
- `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`
  - baseline: defender `w2` already forced from shared hit (`forced=1`)
  - toggle: defender `w2` refreshed, but still hits (`forced=1`)
  - the main consequence is downstream RNG phase shift, not an immediate `w2` rescue

The action-counter split matches that read.

5k deterministic delta, `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`:

- defender average applied damage / turn: `+0.2359`
- attacker average applied damage / turn: `+0.6287`

5k deterministic delta, `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Rift/Bombs Bio`:

- defender average applied damage / turn: `+0.3609`
- attacker average applied damage / turn: `-0.3698`

So the strongest remaining lead is:

- **downstream RNG-phase / kill-race sensitivity after the same defender `w2` shared-hit refresh**

This is not a second distinct `shared-hit` creation bug.

## Tiny refinement matrix tested

100k refinement screen, all using the same current winning branch as the parent family:

- `refresh_hit_sg1_bombs_w2`
- `refresh_hit_sg1_bombs_w2 + target_dark_legion_dual_melee`
- `refresh_hit_sg1_bombs_w2 + target_sg1_dual_melee`
- `refresh_hit_sg1_bombs_w2 + target_maul_first_dual_melee`
- `refresh_hit_dual_bombs` (analysis bound)
- `refresh_hit_rift_bombs_bio` (analysis bound)

Scoring:

- `targetGain` = mean reduction in absolute win delta across the 8 target rows
- `controlMove` = mean absolute movement on `DL Rift/Bombs Scout`
- `contrastMove` = mean absolute movement on `DL Dual Rift Bio`, `Ashley Build`, `HF Scythe Pair`
- `score = targetGain - controlMove - contrastMove - 0.1*defaultReach`

## Compact ranked score table

| rank | toggle | splitGain | riftGain | targetGain | improved / worsened target rows | worst row after toggle | controlMove | contrastMove | score |
| ---: | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| 1 | `refresh_hit_sg1_bombs_w2` | `0.28` | `0.36` | `0.32` | `8 / 0` | `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio` still improves by `+0.01` at 100k | `0.00` | `0.00` | `0.22` |
| 2 | `refresh_hit_rift_bombs_bio` | `0.00` | `0.36` | `0.18` | `8 / 0` | `CUSTOM | SG1 Split Bombs T2` unchanged | `0.00` | `0.00` | `0.18` |
| 3 | `refresh_hit_sg1_bombs_w2_target_dark_legion_dual_melee` | `0.19` | `0.32` | `0.26` | `4 / 0` | all `SG1` attackers unchanged | `0.00` | `0.00` | `0.16` |
| 4 | `refresh_hit_dual_bombs` | `0.28` | `0.00` | `0.14` | `4 / 0` | all `Rift/Bombs Bio` rows unchanged | `0.00` | `0.00` | `0.04` |
| 5 | `refresh_hit_sg1_bombs_w2_target_maul_first_dual_melee` | `0.06` | `0.14` | `0.10` | `4 / 0` | all non-maul rows unchanged | `0.00` | `0.00` | `0.00` |
| 6 | `off` | `0.00` | `0.00` | `0.00` | `0 / 0` | baseline | `0.00` | `0.00` | `0.00` |
| 7 | `refresh_hit_sg1_bombs_w2_target_sg1_dual_melee` | `0.08` | `0.04` | `0.06` | `4 / 0` | all Dark Legion attackers unchanged | `0.00` | `0.00` | `-0.04` |

What the matrix says:

- no natural refinement beats the plain grouped winner
- every attacker-sensitive subset mostly wins by discarding part of the lane
- the best active toggle is still the original grouped branch

## Is any refinement patch-ready?

No.

Why not:

- the originally flagged bad row does not persist as a stable isolated regression
- the only 200k non-improver is small and changes identity relative to the 50k screen
- every natural refinement is weaker than the existing grouped winner
- the remaining effect is best explained as downstream threshold sensitivity after the same shared-hit refresh, not as a cleaner narrower policy surface

This pass did **not** identify a better toggle than the existing grouped winner.

## Should the SG1 bombs lane be parked?

No, not yet.

Why:

- the grouped branch still materially improves the cluster
- it still stays flat on the listed controls / contrasts
- unlike the parked droid and reaper-first lanes, this lane still has direct live reach via `SG1 Split Bombs T2`

But:

- this pass also did **not** make it landing-safe
- the right state after this pass is still **diagnosis-only**, not a live patch

## Compact control / contrast summary

200k current winner:

- `DL Rift/Bombs Scout`: no measured win movement
- `DL Dual Rift Bio`: no measured win movement
- `Ashley Build`: no measured win movement
- `HF Scythe Pair`: no measured win movement

The refinement matrix stayed flat on those same rows too. No control/contrast toggle beat the plain grouped winner on target gain.

## Compact broader sanity note

`data/legacy-defenders.js` still has exactly one direct live row in this family:

- `SG1 Split Bombs T2`

There is still no default-file `SG1 Rift/Bombs Bio` analog. So any landing decision would still need one more collateral sanity pass even though the lane is not parked.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No exact-label or exact-shell live patch was landed.

SG1 bombs branch regression explained; strongest remaining lead is downstream RNG-phase / kill-race sensitivity after defender_sg1_bombs_w2 shared-hit refresh
