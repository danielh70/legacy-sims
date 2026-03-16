# Applied-W1 gate diagnostic

Patch type: diagnostic-only, default-preserving. When `LEGACY_DIAG_W2_AFTER_APPLIED_W1` is unset, `auto`, or `off`, behavior is unchanged.

## Exact code changes made

Changed files:

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)

Legacy changes:

- Added env default and parser for `LEGACY_DIAG_W2_AFTER_APPLIED_W1` at [legacy-sim-v1.0.4-clean.js:159](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L159), [legacy-sim-v1.0.4-clean.js:204](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L204), and [legacy-sim-v1.0.4-clean.js:1711](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1711).
- Added side-selector helper at [legacy-sim-v1.0.4-clean.js:1298](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1298).
- Added debug counters `w2StopOnKillCount` and `w2AfterAppliedW1GateCount` at [legacy-sim-v1.0.4-clean.js:3380](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3380) and [legacy-sim-v1.0.4-clean.js:3412](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3412).
- Added the new side-specific applied-`w1` gating branch in the per-weapon / no-tactics path at [legacy-sim-v1.0.4-clean.js:4222](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4222) through [legacy-sim-v1.0.4-clean.js:4244](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4244).
- Threaded the active setting into config/debug metadata at [legacy-sim-v1.0.4-clean.js:5212](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5212), [legacy-sim-v1.0.4-clean.js:5345](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5345), and [legacy-sim-v1.0.4-clean.js:6395](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L6395).

Brute parity changes:

- Added env parse for `LEGACY_DIAG_W2_AFTER_APPLIED_W1` at [brute-sim-v1.4.6.js:1118](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1118).
- Added normalization/helper logic at [brute-sim-v1.4.6.js:1241](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1241) and [brute-sim-v1.4.6.js:1274](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1274).
- Added the mirrored applied-`w1` gate in the fast path at [brute-sim-v1.4.6.js:1406](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1406) through [brute-sim-v1.4.6.js:1422](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1422).

Parity status:

- The new toggle was added in both parity-sensitive action-resolution blocks.
- I mirrored the same side-selection and same lethal-`w1` gate condition in both simulators.
- I syntax-checked both files with `node --check`.
- I did not run a separate brute runtime verification, so parity was checked by mirrored implementation plus code inspection, not by brute replay output.

## Exact commands run

Syntax checks:

```bash
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

Replay matrix:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='auto' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-applied-w1-caseA-auto' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='attacker' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-applied-w1-caseB-attacker' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-applied-w1-caseC-defender' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-caseC-defender.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='both' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-applied-w1-caseD-both' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-caseD-both.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1='attacker' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-applied-w1-caseE-attacker-stop1' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-caseE-attacker-stop1.log 2>&1
```

Dual Rift debug runs:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='auto' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-applied-w1-debug-caseA-auto' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-debug-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_W2_AFTER_APPLIED_W1='attacker' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-applied-w1-debug-caseB-attacker' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-debug-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1='attacker' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-applied-w1-debug-caseC-attacker-stop1' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-w1-debug-caseC-attacker-stop1.log 2>&1
python3 ./tmp/parse_applied_w1_diag.py ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-applied-w1-caseA-auto--2026-03-14T23-47-25-409Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-applied-w1-caseB-attacker--2026-03-14T23-47-25-415Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-applied-w1-caseC-defender--2026-03-14T23-47-25-410Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-applied-w1-caseD-both--2026-03-14T23-47-25-408Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-applied-w1-caseE-attacker-stop1--2026-03-14T23-47-25-413Z.json ./tmp/codex-applied-w1-debug-caseA-auto.log ./tmp/codex-applied-w1-debug-caseB-attacker.log ./tmp/codex-applied-w1-debug-caseC-attacker-stop1.log > ./tmp/codex-applied-w1-diagnostic-data.json
```

## Results table

Case key:

- `A` = `auto`
- `B` = attacker-only applied-`w1` gate
- `C` = defender-only applied-`w1` gate
- `D` = both sides applied-`w1` gate
- `E` = attacker-only applied-`w1` gate + `ACTION_STOP_ON_KILL=1`

| Defender | Truth win% | A dWin / dAvgT | B dWin / dAvgT | C dWin / dAvgT | D dWin / dAvgT | E dWin / dAvgT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.39 / +0.0551 | +6.34 / +0.0549 | +6.31 / +0.0614 | +6.26 / +0.0489 | +6.25 / +0.0614 |
| DL Gun Sniper Mix | 65.85 | +0.11 / +0.0605 | +0.09 / +0.0681 | +0.00 / +0.0629 | +0.01 / +0.0658 | -0.13 / +0.0711 |
| HF Scythe Pair | 66.42 | -0.92 / +0.0041 | -1.03 / +0.0123 | -1.14 / +0.0147 | -0.88 / +0.0142 | -1.04 / +0.0116 |

## What the new diagnostic proved

Attacker-only applied-`w1` gating does **not** help the target meaningfully.

- `DL Dual Rift Bio` moves only `+6.39 -> +6.34` with attacker-only gating.
- That is much smaller than even the old coarse `stop_on_kill=1` test (`+6.41 -> +6.23` in the prior pass).
- Controls stay close, but that is mainly because the effect is tiny:
  - `DL Gun Sniper Mix`: `+0.11 -> +0.09`
  - `HF Scythe Pair`: `-0.92 -> -1.03`

Defender-only and both-sides gating are also small:

- `DL Dual Rift Bio`:
  - defender-only `+6.31`
  - both `+6.26`
- Neither is close to a real fix.

## Dual Rift debug readout

Baseline (`A`):

- attacker `w2OnDeadCount = 57`
- attacker `w2AfterAppliedW1GateCount = 0`
- attacker `weapon2Attempts = 5436`

Attacker-only applied-`w1` gate (`B`):

- attacker `w2OnDeadCount = 0`
- attacker `w2AfterAppliedW1GateCount = 122`
- attacker `weapon2Attempts = 5360`
- attacker average applied damage/turn only moves `69.6462 -> 69.2694`

Attacker-only gate + `stop_on_kill=1` (`E`):

- attacker `w2StopOnKillCount = 151`
- attacker `w2AfterAppliedW1GateCount = 0`
- attacker `weapon2Attempts = 5424`

Interpretation:

- The new gate clearly fires and suppresses dead-target attacker `w2` events.
- But the replay effect is still very small.
- Stacking with `ACTION_STOP_ON_KILL=1` adds nothing material beyond the old stop behavior. Case `E` is only `0.09` win% better than case `B` on the target and slightly worse on both controls.
- In practice the new gate and the old stop gate mostly overlap as “skip `w2` after lethal `w1`” mechanisms, just with different scope control.

## Hypothesis conclusion

`H1: w2 is being decided too early before actual applied lethal w1 is known`

- Rejected as the main issue.
- The diagnostic directly targeted that decision boundary and barely moved the target.

`H2: deeper per-action retaliation / action-boundary timing is still the main problem`

- Most likely.
- The residual gap stayed large after the new gate:
  - target still at `+6.34` attacker-only, `+6.26` both-sides
- That leaves the broader action boundary as the stronger suspect:
  - whole action resolves before retaliation
  - no mid-action boundary after lethal `w1`
  - `w2` existence is only one narrow slice of that

`H3: neither; change suspect subsystem`

- Less likely than `H2`, but now more plausible than `H1`.
- Reason: two consecutive diagnostics around lethal-`w1` `w2` suppression produced only tiny deltas.

## Recommendation

Recommendation: `ONE LAST MICRO-DIAGNOSTIC`

Not `PATCH NOW`.

Why:

- The new diagnostic was strong enough to reject `H1` as the primary fix.
- It was not strong enough to force a subsystem change, because `H2` still fits the remaining evidence best.
- The next diagnostic should target the broader action boundary directly, not another lethal-`w1` `w2` skip variant.

If that next micro-diagnostic also yields only tiny movement, then the recommendation should change to `CHANGE SUSPECT SUBSYSTEM`.

