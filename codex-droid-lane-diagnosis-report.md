# codex droid lane diagnosis report

## 1. Scope and source-of-truth inputs

- Read and followed:
  - `AGENTS.md`
  - `legacy-bio-debug-handoff-2026-03-15.md`
  - `tmp/codex-tracked-bio-lane-patch-report.md`
  - `tmp/codex-ordinary-full4-mismatch-diagnosis-report.md`
  - `tmp/codex-applied-damage-trace-proof-report.md`
  - `tmp/codex-per-weapon-armorfactor-toggle-proof-report.md`
  - `tmp/codex-bio-lane-armorfactor-gate-proof-report.md`
  - `tmp/codex-replay-runtime-structural-gate-report.md`
  - `tmp/codex-structural-bio-gate-temp-proof-report.md`
- `legacy-chat-handoff-2026-03-15-continuation.md` was not present in the repo root or `tmp/` when searched, so no content from that path was available to inspect.
- Truth files used in this pass:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 2. Exact files touched

- `codex-droid-lane-diagnosis-report.md`
  - documentation-only

No simulator JS, tool JS, brute files, truth files, or cleanup targets were edited in this pass.

Touch classification summary:

- instrumentation-only code touches: none
- refactor-only code touches: none
- behavior-changing code touches: none

## 3. Exact commands run

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-diagnosis LEGACY_REPLAY_TAG='codex-droid-diagnosis-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,Ashley Build,HF Scythe Pair,SG1 Split Bombs T2,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-diagnosis-custom.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-diagnosis LEGACY_REPLAY_TAG='codex-droid-diagnosis-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,Ashley Build,HF Scythe Pair,SG1 Split Bombs T2,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-diagnosis-cstaff.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-diagnosis LEGACY_REPLAY_TAG='codex-droid-diagnosis-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,Ashley Build,HF Scythe Pair,SG1 Split Bombs T2,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-diagnosis-maul-dl.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-diagnosis LEGACY_REPLAY_TAG='codex-droid-diagnosis-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,Ashley Build,HF Scythe Pair,SG1 Split Bombs T2,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-diagnosis-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-debug LEGACY_REPLAY_TAG='codex-droid-debug-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|SG1 Double Maul Droid,CUSTOM|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-debug-custom.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-debug LEGACY_REPLAY_TAG='codex-droid-debug-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_CSTAFF_A4|SG1 Double Maul Droid,CUSTOM_CSTAFF_A4|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-debug-cstaff.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-debug LEGACY_REPLAY_TAG='codex-droid-debug-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_DL_ABYSS|SG1 Double Maul Droid,CUSTOM_MAUL_A4_DL_ABYSS|HF Scythe Pair,CUSTOM_MAUL_A4_DL_ABYSS|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=200 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-debug-maul-dl.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-lane-debug LEGACY_REPLAY_TAG='codex-droid-debug-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Double Maul Droid,CUSTOM_MAUL_A4_SG1_PINK|DL Reaper/Maul Orphic Bio,CUSTOM_MAUL_A4_SG1_PINK|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=200 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-debug-maul-sg1.log 2>&1

node --check ./legacy-sim-v1.0.4-clean.js
```

Read-only local `python3` one-liners were then used to print deltas and derived rates from the saved JSON reports in `tmp/replay-droid-lane-diagnosis/` and `tmp/replay-droid-lane-debug/`.

## 4. Compact targeted results for SG1 Double Maul Droid

| Attacker | win Δ | first move | A_hit Δ | A_dmg1 Δ | A_dmg2 Δ | D_hit Δ | D_dmg1 Δ | D_dmg2 Δ | A dmg/f Δ | D dmg/f Δ |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM` | -3.23 | attacker 100% | +1.49 | +0.15 | +0.11 | +0.29 | +0.99 | +0.95 | -84.2 | +4.2 |
| `CUSTOM_CSTAFF_A4` | -6.71 | attacker 100% | +0.36 | -0.36 | -0.36 | +1.10 | +0.56 | +0.56 | -58.4 | -6.8 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | -4.58 | attacker 100% | +0.30 | +0.19 | +0.14 | +1.02 | +0.85 | +0.71 | -71.8 | +0.8 |
| `CUSTOM_MAUL_A4_SG1_PINK` | -4.57 | attacker 100% | +0.28 | +0.20 | +0.21 | +0.55 | +0.99 | +0.91 | -77.0 | +10.9 |

Readout:

- Droid remains worst on all four covered attackers.
- The row is not losing because the defender moves first. It is attacker-first 100% in every checked droid matchup.
- The row is not leading with a compile/runtime stat-source mismatch. `debugAudit.runtimeVsCompiledComparison.equal` was `true` in all four checked droid matchups.
- The distinctive droid fingerprint is defender-side throughput staying at or above truth:
  - `D_dmg1/D_dmg2` are positive on all four attackers.
  - `D dmg/f` is flat-to-high on droid (`+4.2`, `-6.8`, `+0.8`, `+10.9`), unlike the comparison rows below.

## 5. Compact comparison set for Ashley / HF / Split / Orphic / Scout control

| Defender | Win-delta shape across the 4 compares | Defender throughput smell | Same as droid? |
| --- | --- | --- | --- |
| `Ashley Build` | positive on all 4 (`+2.64` to `+4.60`) | defender damage/fight well below truth on all 4 | no |
| `HF Scythe Pair` | mixed, negative on 3, near flat on 1 | checked debug row is defender-first, `D_hit` slightly low, `D_dmg1/2` flat-to-low, `D dmg/f -23.6` | no |
| `SG1 Split Bombs T2` | mixed (`-1.90`, `+2.03`, `+2.90`, `+3.44`) | defender damage/fight below truth in all 4 reruns | no |
| `DL Reaper/Maul Orphic Bio` | positive on all 4 (`+0.63` to `+3.45`) | checked debug row is defender-first, `D_dmg1/2` negative, `D dmg/f -38.7` | no |
| `DL Rift/Bombs Scout` | healthy control, near zero (`-0.02` to `+1.31`) | defender damage/fight below truth in every rerun | control |

Most useful contrast rows from debug-enabled runs:

- `CUSTOM_MAUL_A4_DL_ABYSS` vs `HF Scythe Pair`
  - defender-first 100%
  - `D_hit Δ = -0.40`
  - `D_dmg1/2 Δ = -0.10 / -0.05`
  - `D dmg/f Δ = -23.6`
- `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Reaper/Maul Orphic Bio`
  - defender-first 100%
  - `D_hit Δ = +0.64`
  - `D_dmg1/2 Δ = -0.26 / -0.34`
  - `D dmg/f Δ = -38.7`
- `DL Rift/Bombs Scout` control
  - healthy or near-healthy win deltas
  - defender damage/fight below truth in every checked replay

That is the key split: the droid row is the only lane here that is both persistently negative and persistently defender-damage-high.

## 6. First concrete divergence found

First concrete divergence now:

- not turn order / first actor
- not compile-time stat construction
- not runtime stat-source selection
- not raw hit-roll source
- not raw skill-roll source
- not weapon min/max source

Those were all weakened by the debug pass:

- `runtimeVsCompiledComparison.equal = true` on every checked droid row
- droid is attacker-first 100% on every checked attacker
- `A_hit` is at or above truth, not low
- `A_dmg1/A_dmg2` are near truth, often slightly positive

The first concrete divergence that still survives those checks is:

- **defender-side realized damage throughput after successful resolution**
- strongest current bucket: **defender-side per-weapon applied-damage conversion / per-action sequencing**

Why this is the best fit:

- On droid, all four attackers show the same defender-side signal:
  - `D_hit` above truth
  - `D_dmg1` above truth
  - `D_dmg2` above truth
  - `D dmg/f` flat-to-high vs truth
- That exact combination does not hold on Ashley, Split, Orphic, HF, or scout.
- The attacker-side `A dmg/f` deficit is broad and appears even on healthy/control rows, so it does **not** isolate the droid lane by itself.

## 7. Is SG1 Double Maul Droid standalone or shared?

Conclusion:

- **SG1 Double Maul Droid looks standalone.**

Evidence:

- It is the only checked residual that stays negative on all four covered attackers.
- It is the only checked residual with the consistent defender-damage-high fingerprint.
- The closest negative non-droid candidate, `HF Scythe Pair`, does not share the same shape:
  - different first-move profile
  - defender throughput is low, not high
  - defender per-weapon damage deltas are flat-to-negative, not positive
- `Ashley`, `Split`, and `Orphic` trend in the opposite win direction and keep defender damage below truth.

Second-lane read:

- A second shared residual lane is still likely, but it is **not** the droid lane.
- The strongest candidate family is the positive-win / defender-damage-low cluster (`Ashley`, `Orphic`, much of `Split`, plus the control-side smell on scout), which is separate from the droid fingerprint.

## 8. Single best next patch target

Best next patch target, if one is taken next:

- `legacy-sim-v1.0.4-clean.js`
  - `doAction(...)`
  - secondarily the defender-side `attemptWeapon(...)` to `doAction(...)` handoff

Narrow target surface:

- defender-side per-weapon applied-damage conversion and HP-cap / kill-sequencing in the `armorApply === 'per_weapon'` path for the droid-style two-weapon melee lane

Why this is the best next target:

- compile/runtime inputs already match
- hit/skill/range are not the isolating differentiator
- the droid-specific miss is downstream, in realized defender damage throughput

What I would **not** target next:

- `compileCombatantFromParts(...)`
- broad Bio logic
- slot order
- replay-key gating
- brute
- truth collection

## 9. Explicit untouched-state statement

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No behavior patch was left behind.
- No broad Bio logic was added.
- No global mitigation swap was attempted.

## 10. Final verdict

**droid lane isolated; strongest next lead is defender-side per-weapon applied-damage / sequencing in `doAction(...)`; a second shared residual lane is likely elsewhere**
