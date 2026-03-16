# codex-reaper-first-attacker-sensitivity-report

## Scope

Used the existing reusable lane-probe harness plus the existing temp probe sim to explain why the current winning toggle

- `LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit`
- `LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee`

helps most of the `DL reaper-first mixed-melee` lane but is not patch-ready because the `CUSTOM` attacker regresses on both target defenders.

Target lane:

- `Ashley Build`
- `DL Reaper/Maul Orphic Bio`

Controls / contrasts:

- `DL Rift/Bombs Scout`
- `DL Dual Rift Bio`
- `SG1 Split Bombs T2`

## Files touched

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js` — instrumentation-only
  - added defender action-pattern counters around `doAction(...)`
  - added optional target-shell predicate hooks for the existing `w2` lane-probe path
  - parity-sensitive combat surface changed only in this temp proof copy; live `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not changed
- `tmp/codex-reaper-first-attacker-sensitivity-config.js` — instrumentation-only
  - tiny harness config for attacker-structure refinement screening
- `codex-reaper-first-attacker-sensitivity-report.md` — report-only

No live combat patch was landed.

## Exact commands run

```bash
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tmp/codex-reaper-first-attacker-sensitivity-config.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./legacy-sim-v1.0.4-clean.js

env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-base LEGACY_REPLAY_TAG='reaper-sense2-base-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|Ashley Build,CUSTOM|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-base-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-toggle LEGACY_REPLAY_TAG='reaper-sense2-toggle-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|Ashley Build,CUSTOM|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-toggle-custom.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-base LEGACY_REPLAY_TAG='reaper-sense2-base-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_CSTAFF_A4|Ashley Build,CUSTOM_CSTAFF_A4|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-base-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-toggle LEGACY_REPLAY_TAG='reaper-sense2-toggle-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_CSTAFF_A4|Ashley Build,CUSTOM_CSTAFF_A4|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-toggle-cstaff.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-base LEGACY_REPLAY_TAG='reaper-sense2-base-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_DL_ABYSS|Ashley Build,CUSTOM_MAUL_A4_DL_ABYSS|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-base-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-toggle LEGACY_REPLAY_TAG='reaper-sense2-toggle-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_DL_ABYSS|Ashley Build,CUSTOM_MAUL_A4_DL_ABYSS|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-toggle-maul-dl.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-base LEGACY_REPLAY_TAG='reaper-sense2-base-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|Ashley Build,CUSTOM_MAUL_A4_SG1_PINK|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-base-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-sensitivity2-toggle LEGACY_REPLAY_TAG='reaper-sense2-toggle-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|Ashley Build,CUSTOM_MAUL_A4_SG1_PINK|DL Reaper/Maul Orphic Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=360 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-sense2-toggle-maul-sg1.log 2>&1

node ./tools/codex-lane-probe-harness.js ./tmp/codex-reaper-first-attacker-sensitivity-config.js > ./tmp/codex-reaper-first-attacker-sensitivity-harness.log 2>&1

mkdir -p ./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409/refresh-hit-reaper-first-target-reaper-first-maul-second
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409/refresh-hit-reaper-first-target-reaper-first-maul-second LEGACY_REPLAY_TAG='reaper-first-attacker-sensitivity-refresh-hit-reaper-first-target-reaper-first-maul-second-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_LANE_PROBE_W2_TARGET_PREDICATE=target_reaper_first_maul_second node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-target-reaper-maul-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409/refresh-hit-reaper-first-target-reaper-first-maul-second LEGACY_REPLAY_TAG='reaper-first-attacker-sensitivity-refresh-hit-reaper-first-target-reaper-first-maul-second-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_LANE_PROBE_W2_TARGET_PREDICATE=target_reaper_first_maul_second node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-target-reaper-maul-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409/refresh-hit-reaper-first-target-reaper-first-maul-second LEGACY_REPLAY_TAG='reaper-first-attacker-sensitivity-refresh-hit-reaper-first-target-reaper-first-maul-second-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_LANE_PROBE_W2_TARGET_PREDICATE=target_reaper_first_maul_second node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-target-reaper-maul-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409/refresh-hit-reaper-first-target-reaper-first-maul-second LEGACY_REPLAY_TAG='reaper-first-attacker-sensitivity-refresh-hit-reaper-first-target-reaper-first-maul-second-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_LANE_PROBE_W2_TARGET_PREDICATE=target_reaper_first_maul_second node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-target-reaper-maul-maul-sg1.log 2>&1
```

Saved-JSON extraction for the tables below was done with local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/replay-reaper-first-sensitivity2-base`
- `./tmp/replay-reaper-first-sensitivity2-toggle`
- `./tmp/lane-probe-harness/reaper-first-attacker-sensitivity-1773632377409`

## Compact attacker-signature comparison

Current winning toggle, confirmed 200k movement from the prior harness report:

| attacker | attacker shell | effective defense | post-compile attacker damage | 200k Ashley move | 200k Orphic move |
| --- | --- | --- | --- | ---: | ---: |
| `CUSTOM` | `SG1 Armor` + `Reaper Axe -> Crystal Maul` + `w2` mixed `A3+F` | `HP 650` `Dod 134` `Def 856` `Arm 75` | `w1 88-112` `w2 102-112` | `-0.17` | `-0.21` |
| `CUSTOM_CSTAFF_A4` | `Dark Legion Armor` + `Reaper Axe -> Core Staff` | `HP 650` `Dod 166` `Def 818` `Arm 83` | `w1 88-112` `w2 52-63` | `+0.83` | `+1.05` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `Dark Legion Armor` + `Crystal Maul -> Reaper Axe` | `HP 650` `Dod 166` `Def 743` `Arm 83` | `w1 98-109` `w2 88-112` | `+0.16` | `+0.06` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Armor` + `Crystal Maul -> Reaper Axe` | `HP 650` `Dod 134` `Def 856` `Arm 75` | `w1 98-109` `w2 88-112` | `+0.21` | `+0.11` |

Most important comparison:

- `CUSTOM` and `CUSTOM_MAUL_A4_SG1_PINK` have the same defensive profile against this lane:
  - `HP 650`
  - `Dod 134`
  - `Def 856`
  - `Arm 75`
- but the 200k winner moves them in opposite directions

That rules out a `CUSTOM`-specific divergence in:

- compiled/runtime attacker defense
- defender hit chance input
- defender skill-defense input
- shared-hit creation itself

The live attacker-sensitive difference is in the attacker offensive shell:

- `CUSTOM` is the only `Reaper Axe -> Crystal Maul` shell, and its `Crystal Maul` is the stronger mixed `A3+F` back-half burst
- `CUSTOM_MAUL_A4_SG1_PINK` has the same defenses but `Crystal Maul -> Reaper Axe`, with no mixed-fire `w2`

## First concrete divergence under the winning toggle

The first code-level divergence is the same for every attacker:

- baseline defender `w2` consumes the existing shared hit:
  - `RD HIT_USED_SHARED ... D->A w2(...)`
- toggle defender `w2` inserts a new hit roll:
  - `RD HIT_SHARED ... D->A w2(...) | note=laneProbeW2Refresh`

Example from `CUSTOM | Ashley Build`:

```text
baseline: RD HIT_USED_SHARED def="__REPLAY_DEFENDER__CUSTOM__Ashley-Build" ... D->A w2(Core Staff) | forced=1
toggle:   RD HIT_SHARED def="__REPLAY_DEFENDER__CUSTOM__Ashley-Build" ... D->A w2(Core Staff) ... note=laneProbeW2Refresh
```

Example from `CUSTOM_MAUL_A4_SG1_PINK | Ashley Build`:

```text
baseline: RD HIT_USED_SHARED def="__REPLAY_DEFENDER__CUSTOM_MAUL_A4_SG1_PINK__Ashley-Build" ... D->A w2(Core Staff) | forced=1
toggle:   RD HIT_SHARED def="__REPLAY_DEFENDER__CUSTOM_MAUL_A4_SG1_PINK__Ashley-Build" ... D->A w2(Core Staff) ... note=laneProbeW2Refresh
```

So `CUSTOM` does **not** diverge at `pre.forceHit` creation or at the `attemptWeapon(...)` handoff itself.

The first concrete point where `CUSTOM` diverges from the others is one layer later:

- the same defender-side correlation change is converted into a different fight outcome by the attacker offensive shell
- this is a kill-race / retaliation sensitivity, not a second distinct hit-lifecycle bug

## Same defender shift, different attacker outcome

5k deterministic debug counters show that `CUSTOM` and `CUSTOM_MAUL_A4_SG1_PINK` get almost the same defender-side action-pattern shift under the toggle:

| pair | dZero | dBothDmg | dW2OnlyDmg | dW2MissAfterW1Hit | defender avgDmg/turn |
| --- | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM` vs `Ashley Build` | `-1338` | `-1144` | `+1238` | `+7061` | `+0.2262` |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `Ashley Build` | `-1551` | `-1209` | `+1523` | `+7066` | `+0.3961` |
| `CUSTOM` vs `DL Reaper/Maul Orphic Bio` | `-1205` | `-1340` | `+1512` | `+7846` | `+0.0070` |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Reaper/Maul Orphic Bio` | `-1725` | `-1174` | `+1550` | `+7710` | `+1.3206` |

Read:

- all four rows show the same structural effect:
  - fewer zero-damage defender turns
  - fewer two-weapon damage turns
  - more `w2-only` rescue turns
  - more `w2 miss after w1 hit`
- that means the winner is changing defender hit correlation in the same way across the lane
- `CUSTOM` is different only in how that same correlation rebalance converts into wins

Conclusion:

- the `CUSTOM` regression is best explained by attacker-shell-sensitive kill-race thresholds
- not by a `CUSTOM`-only compile bug
- not by a different `sharedHit` / `forceHit` lifecycle branch
- not by a different hit-chance threshold bucket alone

## Small attacker-sensitive refinement matrix tested

Used the reusable harness on attacker-structure subsets only:

- `refresh_hit_reaper_first`
- `+ attacker_reaper_first_dual_melee`
- `+ attacker_maul_first_reaper_second`
- `+ attacker_dark_legion_dual_melee`
- `+ attacker_sg1_dual_melee`
- `+ attacker_reaper_first_maul_second` (analysis bound)

Ranked score table:

| toggle | target gain | control move | contrast move | score | read |
| --- | ---: | ---: | ---: | ---: | --- |
| `refresh_hit_reaper_first` | `0.26` | `0.00` | `0.00` | `0.26` | existing best winner |
| `refresh_hit_reaper_first_target_dark_legion_dual_melee` | `0.26` | `0.00` | `0.00` | `0.26` | ties best by dropping both SG1 attackers |
| `refresh_hit_reaper_first_target_reaper_first_dual_melee` | `0.17` | `0.00` | `0.00` | `0.17` | still carries `CUSTOM` regression |
| `refresh_hit_reaper_first_target_maul_first_reaper_second` | `0.09` | `0.00` | `0.00` | `0.09` | too weak |
| `off` | `0.00` | `0.00` | `0.00` | `0.00` | baseline |
| `refresh_hit_reaper_first_target_sg1_dual_melee` | `0.00` | `0.00` | `0.00` | `0.00` | SG1 bucket is not reusable |
| `refresh_hit_reaper_first_target_reaper_first_maul_second` | `-0.06` | `0.00` | `0.00` | `-0.06` | analysis bound isolates the bad bucket |

What this means:

- the only subset that ties the original score is `attacker_dark_legion_dual_melee`
- but that is not a real explanation; it simply removes the entire SG1 half of the lane, including one truth-covered SG1 attacker that was actually improving
- the `attacker_reaper_first_maul_second` analysis bound goes negative, which confirms that the `CUSTOM`-style shell is the regressing bucket under the current toggle

## Is any refinement patch-ready?

No.

Why not:

- the cleanest-looking subset, `attacker_dark_legion_dual_melee`, wins only by throwing away the entire SG1 half of the lane
- that subset is not mechanically justified by the first divergence; the defender-side shift is still the same on the SG1 attackers
- the actual attacker-sensitive split is driven by downstream offensive-shell kill-race interaction, and the only directly isolating bucket is too close to a one-off shell family
- this lane still has zero live default-defender reach

## Control / contrast summary

All tested attacker-sensitive refinements stayed flat on:

- `DL Rift/Bombs Scout`
- `DL Dual Rift Bio`
- `SG1 Split Bombs T2`

So collateral stayed good, but the refinements did not produce a reusable patch surface.

## Broader sanity note

The broader sanity constraint did not improve:

- the defender-side rule still has `0` direct live matches in `data/legacy-defenders.js`
- only commented-out reaper-first examples exist there
- attacker-side subsetting does not change that

## Decision

The attacker sensitivity is now explained well enough:

- the winning toggle changes defender `w2` hit correlation in a consistent way
- `CUSTOM` does not fail at a unique hit-lifecycle point
- the regression comes from downstream attacker offensive-shell sensitivity
- no natural refinement survived without collapsing into a near-one-off subset

So the correct repo-side move is to park the reaper-first lane for now rather than keep carving the toggle into smaller local policy slices.

## Notes

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- `legacy-sim-v1.0.4-clean.js` was untouched.

reaper-first attacker sensitivity explained; lane not patch-safe, park it
