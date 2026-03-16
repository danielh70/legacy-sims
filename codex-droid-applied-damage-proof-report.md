# codex droid applied damage proof report

## 1. Scope and source-of-truth inputs

- Read and followed:
  - `AGENTS.md`
  - `legacy-bio-debug-handoff-2026-03-15.md`
  - `tmp/codex-tracked-bio-lane-patch-report.md`
  - `codex-droid-lane-diagnosis-report.md`
- `legacy-chat-handoff-2026-03-15-continuation.md` was not present in repo root or `tmp/` when searched.
- Truth files used in this pass:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 2. Exact files touched

| File | Touch type | Classification |
| --- | --- | --- |
| `tmp/codex-droid-applied-damage-proof.js` | new temp helper | instrumentation-only |
| `codex-droid-applied-damage-proof-report.md` | new report | documentation-only |

No simulator logic file was edited in this pass.

## 3. Exact commands run

```sh
node --check ./tmp/codex-droid-applied-damage-proof.js
node ./tmp/codex-droid-applied-damage-proof.js > ./tmp/codex-droid-applied-damage-proof.json

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-w2gate-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-w2gate-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-custom.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-cstaff.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-maul-dl.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-maul-sg1-all4.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-applied-proof LEGACY_REPLAY_TAG='codex-droid-proof-split-debug-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Double Maul Droid,CUSTOM_MAUL_A4_SG1_PINK|DL Rift/Bombs Scout,CUSTOM_MAUL_A4_SG1_PINK|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=10 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=400 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-proof-split-debug-maul-sg1.log 2>&1

node --check ./legacy-sim-v1.0.4-clean.js
```

Read-only local `python3` one-liners were then used to print deltas and counters from the saved JSON reports.

## 4. Instrumentation-only accounting proof

Deterministic trace helper:

- matchup: `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid`
- control: `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout`
- variants:
  - baseline
  - `LEGACY_DIAG_W2_AFTER_APPLIED_W1='defender'`
  - `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender'`

First successful defender-side events for the droid lane were identical across all 3 variants:

| Turn | Weapon | raw | postArmor | applied | targetHpBefore | targetHpAfter |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | w1 | 124 | 101 | 101 | 650 | 549 |
| 3 | w1 | 131 | 107 | 107 | 549 | 442 |
| 6 | w1 | 128 | 104 | 104 | 442 | 338 |
| 8 | w2 | 122 | 99 | 99 | 338 | 239 |

What this proves:

- raw damage generation did not change
- armor application did not change
- simple `applied = min(postArmor, targetHpBefore)` did not change
- no early defender `w1` lethals were present in the traced droid/control fights

So the first live suspect is **not** a basic raw-damage bug, armor bug, or a simple wrong HP-cap formula on individual successful hits.

## 5. Initial proof branch results on one droid/control/contrast set

Representative probe:

- attacker: `CUSTOM_MAUL_A4_SG1_PINK`
- defenders: `SG1 Double Maul Droid`, `DL Rift/Bombs Scout`, `HF Scythe Pair`

| Variant | Droid win Δ | Move vs baseline | Scout win Δ | Move vs baseline | HF win Δ | Move vs baseline |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | -4.57 | - | -0.02 | - | -0.11 | - |
| `w2_after_applied_defender` | -4.62 | -0.05 | +0.01 | +0.02 | +0.17 | +0.28 |
| `split_multiweapon_defender` | -4.27 | +0.30 | +0.20 | +0.22 | +0.64 | +0.75 |

Readout:

- the defender-side applied-`w1` HP-cap gate moved the droid row the wrong way
- the defender-side split-multiweapon branch moved the droid row the right way, but it also moved both the healthy control and the non-droid contrast

## 6. Compact before/after targeted table for SG1 Double Maul Droid on all 4 attackers

Expanded only for the strongest proof branch:

- variant: `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender'`
- note: this was a temp proof toggle only, not a live patch

| Attacker | Baseline win Δ | Split-defender win Δ | Improvement |
| --- | ---: | ---: | ---: |
| `CUSTOM` | -3.23 | -2.84 | +0.39 |
| `CUSTOM_CSTAFF_A4` | -6.71 | -6.38 | +0.32 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | -4.58 | -4.20 | +0.38 |
| `CUSTOM_MAUL_A4_SG1_PINK` | -4.57 | -4.27 | +0.30 |

Materiality read:

- yes, the droid row moved in the same direction on all 4 attackers
- no, the magnitude was small: roughly `+0.30` to `+0.39` win points only
- that is not enough by itself to justify a behavior patch

## 7. Compact control / contrast section

Contrast chosen: `HF Scythe Pair`

| Attacker | Defender | Baseline win Δ | Split-defender win Δ | Move |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | `DL Rift/Bombs Scout` | +0.51 | +0.62 | +0.11 |
| `CUSTOM` | `HF Scythe Pair` | -0.96 | +0.19 | +1.15 |
| `CUSTOM_CSTAFF_A4` | `DL Rift/Bombs Scout` | +0.20 | -0.01 | -0.21 |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | -3.64 | -1.24 | +2.40 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Rift/Bombs Scout` | +1.31 | +0.89 | -0.41 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `HF Scythe Pair` | -3.50 | -0.76 | +2.73 |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Rift/Bombs Scout` | -0.02 | +0.20 | +0.22 |
| `CUSTOM_MAUL_A4_SG1_PINK` | `HF Scythe Pair` | -0.11 | +0.64 | +0.75 |

Control/contrast conclusion:

- control rows did **not** stay flat
- the contrast row moved much more than the droid row
- therefore the split-defender behavior is not droid-lane-only and is not safe to land as a narrow proof patch

## 8. First concrete divergence found in the defender-side post-success damage path

Rejected:

- raw damage generation
- armor application
- basic HP-cap / applied-damage conversion
- simple “second weapon still executes after lethal first weapon” as the main droid cause

Why rejected:

- deterministic defender event accounting stayed identical across baseline and both proof variants until no lethal `w1` cases were present
- `LEGACY_DIAG_W2_AFTER_APPLIED_W1='defender'` made the droid row slightly worse, not better

Partially confirmed:

- **second-weapon sequencing inside `doAction(...)`**
- more specifically: the defender-side reuse of one atomic multiweapon action boundary and shared pre-state across `w1` and `w2`

Why only partially confirmed:

- the only proof branch that helped the droid row was `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender'`
- that branch changes exactly one downstream step:
  - `w1` resolves first
  - applied `w1` damage is committed to a local remainder
  - `w2` resolves only if the target survives
  - `w2` gets a fresh pre-action state instead of inheriting the same atomic shared-hit context
- debug counters on the split branch showed it firing broadly on defender actions, not just droid:
  - droid defender `splitActionCount=3794`
  - HF defender `splitActionCount=4786`
  - scout defender `splitActionCount=5164`

So the surviving downstream lead is:

- **second-weapon sequencing / shared pre-state carryover in `doAction(...)`**

not:

- raw damage
- armor
- simple hp cap
- retaliation queue gating

## 9. Patch decision

No patch was applied to `legacy-sim-v1.0.4-clean.js`.

Why no patch:

- the HP-cap gate lead was rejected
- the split-action lead is real but too broad
- the strongest moving branch improved `HF Scythe Pair` much more than `SG1 Double Maul Droid`
- scout control rows also moved

That makes the branch:

- not droid-local enough
- not safe enough for a surgical live patch
- not ready to claim as the concrete fix

## 10. Whether SG1 Double Maul Droid improved materially

- under the strongest proof branch, only modestly
- improvement range: `+0.30` to `+0.39` win points across the 4 droid attackers
- not material enough to justify landing the change

## 11. Whether any other residual row moved in the same direction

Yes.

`HF Scythe Pair` moved much more strongly than the droid row:

- `+1.15`
- `+2.40`
- `+2.73`
- `+0.75`

That is the clearest reason the split-action proof is not patch-ready.

## 12. Explicit untouched-state statement

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No broad Bio logic was revisited.
- No slot-order, predictedDamage/display, replay-key gating, or global `def.armorFactor` swap branch was reopened.

## 13. Final verdict

**droid lane partially confirmed but not patch-ready**
