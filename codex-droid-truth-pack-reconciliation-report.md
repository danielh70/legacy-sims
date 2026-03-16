# codex-droid-truth-pack-reconciliation-report

## Scope

Source-of-truth inputs read first:
- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `legacy-chat-handoff-2026-03-15-continuation.md`
- `tmp/codex-tracked-bio-lane-patch-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-applied-damage-proof-report.md`
- `codex-droid-split-decomposition-report.md`
- `codex-droid-shared-hit-family-proof-report.md`
- `codex-droid-vs-hf-shell-diff-report.md`
- `legacy-truth-droid-shell-probe-2x4.json`

Preserved assumptions:
- verified represented-build baseline stays
- tracked narrow Bio-lane mitigation stays in `legacy-sim-v1.0.4-clean.js`
- no brute edits
- no new truth collection
- no cleanup
- no broad Bio revisit
- no slot-order / predictedDamage-display / replay-key / global mitigation revisit

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js` | instrumentation-only | temp proof harness cloned from prior shell-diff harness; added one combined temp predicate |
| `codex-droid-truth-pack-reconciliation-report.md` | report-only | self-contained findings |

Untouched:
- `legacy-sim-v1.0.4-clean.js`
- `brute-sim-v1.4.6.js`

No live behavior-changing patch was landed, so no new legacy/brute parity drift was introduced in this pass.

## Exact commands run

### Harness inspection / setup

```sh
git status --short
rg -n "same_name_refresh_hit|exact_droid_refresh_hit|diagDroidVsHfShellModeForActor|LEGACY_DIAG_DROID_HF_SHELL_MODE" ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
sed -n '220,245p' ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
sed -n '1383,1445p' ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
cp ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
node --check ./legacy-sim-v1.0.4-clean.js
```

### New 2x4 truth-pack compares

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-reconcile LEGACY_REPLAY_TAG='codex-droid-truth-pack-off' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-reconcile LEGACY_REPLAY_TAG='codex-droid-truth-pack-sg1-armor' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-sg1-armor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_droid_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-reconcile LEGACY_REPLAY_TAG='codex-droid-truth-pack-droid-misc' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-droid-misc.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor_droid_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-reconcile LEGACY_REPLAY_TAG='codex-droid-truth-pack-combined' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-combined.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='exact_droid_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-reconcile LEGACY_REPLAY_TAG='codex-droid-truth-pack-exact-shell' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-exact-shell.log 2>&1
```

### Curated scout control

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-scout LEGACY_REPLAY_TAG='codex-droid-scout-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-scout-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-scout LEGACY_REPLAY_TAG='codex-droid-scout-sg1-armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-scout-sg1-armor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_droid_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-scout LEGACY_REPLAY_TAG='codex-droid-scout-droid-misc' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-scout-droid-misc.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor_droid_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-truth-pack-scout LEGACY_REPLAY_TAG='codex-droid-scout-combined' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-scout-combined.log 2>&1
```

### Default-defender sanity slice

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=50000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-droid-truth-pack-default-off.json LEGACY_DEFENDER_FILE=./data/legacy-defenders.js LEGACY_VERIFY_DEFENDERS='DL Gun Build 3,SG1 Split bombs,T2 Scythe Build,HF Core/Void,Core/Void Build 1' node ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-default-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=50000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-droid-truth-pack-default-sg1-armor.json LEGACY_DEFENDER_FILE=./data/legacy-defenders.js LEGACY_VERIFY_DEFENDERS='DL Gun Build 3,SG1 Split bombs,T2 Scythe Build,HF Core/Void,Core/Void Build 1' node ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-default-sg1-armor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor_droid_misc' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=50000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-droid-truth-pack-default-combined.json LEGACY_DEFENDER_FILE=./data/legacy-defenders.js LEGACY_VERIFY_DEFENDERS='DL Gun Build 3,SG1 Split bombs,T2 Scythe Build,HF Core/Void,Core/Void Build 1' node ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js > ./tmp/codex-droid-truth-pack-default-combined.log 2>&1
```

### Result extraction / sanity helpers

```sh
find ./tmp/replay-droid-truth-pack-reconcile -maxdepth 2 -type f | sort
for f in ./tmp/codex-droid-truth-pack-*.log; do printf '%s\n' "$f"; tail -n 40 "$f"; printf '\n'; done
for f in ./tmp/codex-droid-scout-*.log; do printf '%s\n' "$f"; tail -n 30 "$f"; printf '\n'; done
for f in ./tmp/codex-droid-truth-pack-default-*.log; do printf '%s\n' "$f"; tail -n 40 "$f"; printf '\n'; done
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js
node --check ./legacy-sim-v1.0.4-clean.js
```

## Predicate map used in this pass

All temp predicates stayed on the prior surviving lead only:
- defender-side `w2` `shared-hit` refresh in the `armorApply === 'per_weapon'` path

Candidate predicates:

| Temp mode | Predicate |
| --- | --- |
| `off` | no refresh |
| `same_name_refresh_hit_sg1_armor` | same-name dual melee + `armorItem === 'SG1 Armor'` |
| `same_name_refresh_hit_droid_misc` | same-name dual melee + `m2Item === 'Droid Drone'` |
| `same_name_refresh_hit_sg1_armor_droid_misc` | same-name dual melee + `armorItem === 'SG1 Armor'` + `m2Item === 'Droid Drone'` |
| `exact_droid_refresh_hit` | exact full shell analysis bound: `SG1 Armor` + dual `Crystal Maul` + `Scout Drones` + `Droid Drone` |

## New 2x4 truth-pack results

Values are `win delta vs truth` as `CUSTOM / CUSTOM_MAUL_A4_SG1_PINK`.

| Defender row | `off` | `SG1 armor only` | `droid misc only` | `SG1 armor + droid misc` | `exact-shell` bound |
| --- | --- | --- | --- | --- | --- |
| `SG1 Double Maul Droid` | `-2.92 / -2.88` | `-2.61 / -2.64` | `-2.53 / -2.78` | `-2.67 / -2.68` | `-2.73 / -2.67` |
| `SG1 Double Maul Droid | misc2 Bio Spinal Enhancer` | `-2.17 / -2.21` | `-1.89 / -2.15` | `-2.26 / -2.23` | `-2.11 / -2.51` | `-2.07 / -2.19` |
| `SG1 Double Maul Droid | armor Hellforged Armor` | `-2.99 / -2.53` | `-2.84 / -2.62` | `-2.76 / -2.30` | `-2.92 / -2.56` | `-3.01 / -2.50` |
| `HF Scythe Pair` | `-0.39 / -0.51` | `-0.42 / -0.48` | `-0.46 / -0.51` | `-0.39 / -0.71` | `-0.50 / -0.73` |

Average absolute win delta over the three droid-family rows:

| Mode | Avg abs win delta |
| --- | ---: |
| `off` | `2.62` |
| `SG1 armor only` | `2.46` |
| `droid misc only` | `2.48` |
| `SG1 armor + droid misc` | `2.57` |
| `exact-shell` bound | `2.53` |

Key reads:
- `SG1 armor only` is **not sufficient**.
  - It helps exact droid somewhat, but the new truth pack shows the real row is also sensitive to the misc2 swap, and the sim still stays far off even on the exact shell.
  - Exact droid remains `-2.61 / -2.64`, so the rule does not close the lane.
- `droid misc only` is not a better explanation.
  - It helps one exact-droid attacker more than `SG1 armor only`, but it degrades the misc2-Bio variant and does not outperform armor-only across the pack.
- `SG1 armor + droid misc` is **worse than either component alone**.
  - It regresses the misc2-Bio row materially and does not beat either component on average.
- The exact full-shell analysis bound is also weak.
  - If a near-exact structural shell rule were truly the missing cause, this bound should have been clearly best.
  - It is not; it is worse than `SG1 armor only` on the exact droid row and only marginally different from `off` in the pack aggregate.

## Clear answer on SG1-armor-only

`SG1 armor only` is now rejected as a reusable explanation.

Why:
- the new truth pack proves armor swap alone does not preserve the real droid behavior
- the sim-side `SG1 armor only` predicate remains only a partial nudge, not a match
- the exact-shell bound does not materially outperform it, so there is no evidence that “add misc shell on top” yields a clean reusable rule

## Curated/control sanity

`DL Rift/Bombs Scout` control on `CUSTOM_MAUL_A4_SG1_PINK`:

| Mode | Win delta vs truth |
| --- | ---: |
| `off` | `+0.02` |
| `SG1 armor only` | `-0.02` |
| `droid misc only` | `-0.12` |
| `SG1 armor + droid misc` | `+0.21` |

Read:
- `SG1 armor only` stays flat on scout.
- `droid misc only` and especially the combined rule create more collateral movement than the already-rejected armor-only rule.
- HF is already in the 2x4 truth pack; there the combined rule is also clearly worse than `off` and worse than `SG1 armor only`.

## Default-defender sanity

Rule reach on the normal defender file path:
- `same_name_refresh_hit_sg1_armor`: `0` matching rows in `data/legacy-defenders.js`
- `same_name_refresh_hit_sg1_armor_droid_misc`: `0` matching rows in `data/legacy-defenders.js`

Deterministic 5-row slice (`CUSTOM` vs `DL Gun Build 3, SG1 Split bombs, T2 Scythe Build, HF Core/Void, Core/Void Build 1`):

| Defender | `off` | `SG1 armor` | `combined` |
| --- | ---: | ---: | ---: |
| `DL Gun Build 3` | `48.27` | `48.22` | `47.94` |
| `SG1 Split bombs` | `50.05` | `50.48` | `50.20` |
| `T2 Scythe Build` | `62.26` | `62.31` | `62.59` |
| `HF Core/Void` | `63.67` | `64.06` | `64.00` |
| `Core/Void Build 1` | `64.93` | `64.79` | `64.81` |

Read:
- because both temp predicates match zero live default defenders, these shifts are coarse deterministic-seed drift from different logic keys, not evidence of safe live reach
- this sanity check therefore does **not** rescue the combined rule

## Final call

No combined shell rule is patch-safe from this pack.

Most important reason:
- the new truth pack collapses the prior “maybe SG1 armor + droid shell” hope
- the combined rule is not cleaner than the component rules
- the exact-shell analysis bound is still not materially good
- so the remaining effect is either:
  - exact-shell or near-exact-shell only, which is not a landing target
  - or the surviving repo-side lead is still missing a deeper factor that this bounded pass did not prove

Explicit outcome:
- `droid lane not patch-safe; exact-shell or near-exact-shell behavior only`
- recommendation: park the droid lane for now

## Verification / safety notes

- `node --check ./tmp/legacy-sim-v1.0.4-clean.droid-truth-pack-reconcile.js` passed
- `node --check ./legacy-sim-v1.0.4-clean.js` passed
- no new truth was collected in this pass
- `brute-sim-v1.4.6.js` was untouched
- cleanup was untouched

droid truth pack rejects reusable shell rule; park droid lane
