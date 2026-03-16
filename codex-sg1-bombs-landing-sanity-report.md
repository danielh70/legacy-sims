# codex-sg1-bombs-landing-sanity-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/codex-sg1-bombs-landing-sanity-config.js` | instrumentation-only | tiny two-variant broad harness config for the landing decision |
| `legacy-sim-v1.0.4-clean.js` | behavior-changing, then reverted | temporary live proof patch of the SG1 bombs parent branch for verification only; reverted after the landing decision |
| `codex-sg1-bombs-landing-sanity-report.md` | report-only | self-contained summary |

Reused unchanged:

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js`
- `tools/codex-lane-probe-harness.js`

Parity note:

- temporary live patch surface was in `doAction(...)`, which is parity-sensitive shared-hit behavior
- I inspected the corresponding brute pre-action/shared-skill cache surface in `brute-sim-v1.4.6.js`
- brute was intentionally untouched per request
- parity would **not** have been preserved if this branch were landed

## Exact commands run

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' tmp/codex-tracked-bio-lane-patch-report.md
sed -n '1,260p' codex-sg1-bombs-cluster-harness-report.md
sed -n '1,260p' codex-sg1-bombs-remaining-regression-report.md
sed -n '1,260p' codex-sg1-bombs-downstream-refinement-report.md
sed -n '1,260p' codex-global-armor-k-sanity-report.md
sed -n '1,260p' codex-dl-riftcore-bio-harness-report.md

sed -n '1,240p' ./tmp/codex-global-armor-k-sanity-config.js
sed -n '1,240p' ./tmp/codex-sg1-bombs-downstream-refinement-config.js
rg -n "defender_sg1_bombs_w2|LEGACY_LANE_PROBE_W2_PRE_REFRESH|LEGACY_LANE_PROBE_W2_PREDICATE|defaultReachCount" ./tools/codex-lane-probe-harness.js ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js

rg -n "function doAction\\(|function attemptWeapon\\(|makePreActionState|sharedHit|sharedSkillFn|actionStopOnKill" ./legacy-sim-v1.0.4-clean.js
sed -n '4300,4525p' ./legacy-sim-v1.0.4-clean.js
sed -n '4525,4685p' ./legacy-sim-v1.0.4-clean.js

node --check ./tmp/codex-sg1-bombs-landing-sanity-config.js
node ./tools/codex-lane-probe-harness.js ./tmp/codex-sg1-bombs-landing-sanity-config.js > ./tmp/codex-sg1-bombs-landing-sanity-harness.log 2>&1

rg -n "sharedHit|sharedSkill|actionStopOnKill|function doAction\\(|function attemptWeapon\\(" ./brute-sim-v1.4.6.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-live-proof LEGACY_REPLAY_TAG='sg1-bombs-live-proof-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-sg1-bombs-live-proof-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-live-proof LEGACY_REPLAY_TAG='sg1-bombs-live-proof-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-sg1-bombs-live-proof-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-live-proof LEGACY_REPLAY_TAG='sg1-bombs-live-proof-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-sg1-bombs-live-proof-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-live-proof LEGACY_REPLAY_TAG='sg1-bombs-live-proof-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-sg1-bombs-live-proof-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-sg1-bombs-live-proof LEGACY_REPLAY_TAG='sg1-bombs-live-proof-droid-probe' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-sg1-bombs-live-proof-droid-probe.log 2>&1

node --check ./legacy-sim-v1.0.4-clean.js
git diff -- ./legacy-sim-v1.0.4-clean.js

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const names=Object.entries(live).filter(([,d])=>d&&d.armor&&d.armor.name==='SG1 Armor'&&d.weapon2&&d.weapon2.name==='Split Crystal Bombs T2').map(([n])=>n).sort();
console.log('sg1_bombs_parent_default_reach\t'+names.length);
for (const n of names) console.log(n);
NODE
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/lane-probe-harness/sg1-bombs-landing-sanity-1773640183490`
- `./tmp/replay-sg1-bombs-live-proof`

## Broad baseline vs parent-branch score table

Current live-equivalent baseline vs temp SG1 bombs parent branch on the full 64-row truth-covered set:

| variant | broad mean abs win Δ | broad worst abs win Δ | broad mean abs avgTurns Δ | healthy-row mean move | scout mean move | SG1 bombs lane mean abs win Δ | SG1 bombs lane mean abs avgTurns Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `baseline` | `1.963` | `6.53` | `0.0964` | `0.000` | `0.000` | `2.484` | `0.2072` |
| `temp parent branch` | `1.928` | `6.53` | `0.0845` | `0.000` | `0.000` | `2.208` | `0.1117` |

Broad read:

- overall mean abs win delta improves by only `0.035`
- worst abs win delta does **not** improve at all
- healthy/control rows stay perfectly flat
- the SG1 bombs lane itself improves materially

That is broad net positive, but only narrowly.

## Per-attacker summary table

| attacker | baseline mean abs win Δ | parent mean abs win Δ | live proof patch mean abs win Δ | baseline worst abs win Δ | parent worst abs win Δ | live proof patch worst abs win Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM` | `1.667` | `1.602` | `1.602` | `3.12` | `3.12` | `3.12` |
| `CUSTOM_CSTAFF_A4` | `2.757` | `2.724` | `2.724` | `6.53` | `6.53` | `6.53` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `1.638` | `1.591` | `1.591` | `4.59` | `4.59` | `4.59` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `1.845` | `1.850` | `1.850` | `4.31` | `4.31` | `4.31` |

Read:

- `CUSTOM`, `CUSTOM_CSTAFF_A4`, and `CUSTOM_MAUL_A4_DL_ABYSS` all improve slightly
- `CUSTOM_MAUL_A4_SG1_PINK` gets slightly worse overall
- no attacker’s worst row improves

## SG1 bombs lane summary

The active lane itself improves clearly:

| metric | baseline | parent / live proof |
| --- | ---: | ---: |
| mean abs win Δ across `SG1 Split Bombs T2` + `SG1 Rift/Bombs Bio` | `2.484` | `2.208` |
| mean abs avgTurns Δ across that lane | `0.2072` | `0.1117` |

Material lane improvements:

- `CUSTOM | SG1 Rift/Bombs Bio`: `+0.71`
- `CUSTOM_CSTAFF_A4 | SG1 Split Bombs T2`: `+0.43`
- `CUSTOM | SG1 Split Bombs T2`: `+0.39`
- `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Split Bombs T2`: `+0.36`
- `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Rift/Bombs Bio`: `+0.35`

Persistent material lane regression:

- `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`: `-0.32`

So the branch really is helping the lane overall, but it is not uniformly helping it.

## Control / healthy-row summary

Healthy bucket:

- all baseline rows with `abs(win Δ) <= 1.0`

Results:

- healthy-row mean movement: `0.000`
- `DL Rift/Bombs Scout` mean movement: `0.000`
- no non-SG1-bombs row crossed the material movement threshold

That part is the strongest argument in favor of the branch:

- the branch is narrow
- it does not create ugly new regressions outside its own lane

## Rows materially improved and materially worsened

Material threshold used here:

- `|Δ abs win| >= 0.25`

Materially improved rows:

| attacker | defender | abs-win improvement | avgTurns before | avgTurns after |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | `SG1 Rift/Bombs Bio` | `+0.71` | `-0.1170` | `-0.0484` |
| `CUSTOM_CSTAFF_A4` | `SG1 Split Bombs T2` | `+0.43` | `-0.2986` | `-0.1636` |
| `CUSTOM` | `SG1 Split Bombs T2` | `+0.39` | `-0.2676` | `-0.1397` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Split Bombs T2` | `+0.36` | `-0.3490` | `-0.2185` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Rift/Bombs Bio` | `+0.35` | `-0.1579` | `-0.0825` |

Materially worsened rows:

| attacker | defender | abs-win improvement | avgTurns before | avgTurns after |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Rift/Bombs Bio` | `-0.32` | `-0.1268` | `-0.0879` |

This is the core landing blocker:

- one of the 8 target rows still regresses materially
- the broad overall gain is only `0.035`

## Compact default/live reach note

Default live reach for the exact parent branch predicate:

- `1` direct row in `data/legacy-defenders.js`
- row name: `SG1 Split Bombs T2`

That limited reach cuts collateral risk, but it also limits the upside of landing a behavior change whose broad gain is already small.

## Temporary live proof patch

I applied the smallest live proof patch that was exactly equivalent to the parent branch, verified it, then reverted it.

Temporary change in `doAction(...)`:

- before defender `w2`, refresh `pre.forceHit`
- only when:
  - `cfg.armorApply === 'per_weapon'`
  - `baseVal === 0`
  - actor is defender-side
  - defender runtime signature has:
    - `armorItem === 'SG1 Armor'`
    - `w2Item === 'Split Crystal Bombs T2'`

That proof patch reproduced the temp branch exactly on the broad compare:

| variant | broad mean abs win Δ | broad worst abs win Δ | broad mean abs avgTurns Δ | SG1 bombs lane mean abs win Δ |
| --- | ---: | ---: | ---: | ---: |
| `temp parent branch` | `1.928` | `6.53` | `0.0845` | `2.208` |
| `live proof patch` | `1.928` | `6.53` | `0.0845` | `2.208` |

Mean absolute per-row win difference between temp parent and live proof patch:

- `0.000`

So the live proof patch itself is not the uncertainty. The uncertainty is the branch quality.

## Landing recommendation

Recommendation:

- **park SG1 bombs branch**

Why:

1. the branch is real and narrow, but the broad gain is tiny
2. the broad worst row does not improve at all
3. one target row still regresses materially:
   - `CUSTOM_MAUL_A4_SG1_PINK | SG1 Rift/Bombs Bio`
4. one whole attacker (`CUSTOM_MAUL_A4_SG1_PINK`) gets slightly worse overall
5. the branch would introduce a legacy-only shared-hit parity drift against brute

So this is better than the parked droid/reaper-first branches in cleanliness, but still not strong enough to justify landing a live behavior change.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- The temporary live proof patch in `legacy-sim-v1.0.4-clean.js` was reverted after verification.

SG1 bombs landing sanity is mixed; strongest blocker is persistent CUSTOM_MAUL_A4_SG1_PINK vs SG1 Rift/Bombs Bio regression against only a tiny broad gain
