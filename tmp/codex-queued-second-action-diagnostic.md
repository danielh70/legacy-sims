# Queued Second Action Diagnostic

Patch type: diagnostic-only, default-preserving. Unset, `auto`, or `off` leaves current behavior unchanged.

Parity status:

- Mirrored the new toggle in the active baseline round loops of [legacy-sim-v1.0.4-clean.js:4465](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4465) and [brute-sim-v1.4.6.js:1517](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1517).
- Syntax-checked both files with `node --check`.
- I did not run separate brute runtime verification, so parity is by mirrored implementation plus code inspection, not optimizer replay output.

## Exact code changes made

Changed files:

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)

Legacy changes:

- Added env default/parser/helper for `LEGACY_DIAG_QUEUED_SECOND_ACTION` at [legacy-sim-v1.0.4-clean.js:161](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L161), [legacy-sim-v1.0.4-clean.js:222](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L222), [legacy-sim-v1.0.4-clean.js:1332](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1332), and [legacy-sim-v1.0.4-clean.js:1751](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1751).
- Added queued-action counters in [legacy-sim-v1.0.4-clean.js:3424](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3424) and [legacy-sim-v1.0.4-clean.js:3461](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3461).
- Added the narrow queued-second-action branch in the baseline round loop at [legacy-sim-v1.0.4-clean.js:4566](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4566) through [legacy-sim-v1.0.4-clean.js:4594](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4594).
- Threaded the active setting into config/debug metadata at [legacy-sim-v1.0.4-clean.js:5319](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5319), [legacy-sim-v1.0.4-clean.js:5454](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5454), and [legacy-sim-v1.0.4-clean.js:6506](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L6506).

Brute parity changes:

- Added env parse/normalization/helper at [brute-sim-v1.4.6.js:1124](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1124), [brute-sim-v1.4.6.js:1257](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1257), and [brute-sim-v1.4.6.js:1308](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1308).
- Added the mirrored queued-second-action branch in [brute-sim-v1.4.6.js:1530](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1530) through [brute-sim-v1.4.6.js:1549](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1549).

Behavior of the diagnostic branch:

- It only affects the baseline round loop, not `simultaneous_round`.
- If the first actor kills the second actor, the second actor may still resolve its queued action depending on side setting.
- That queued action targets the first actor using the start-of-turn HP snapshot, not the post-hit updated HP.
- `doAction()` / `doActionFast()` were not otherwise changed.

## Exact commands run

Syntax checks:

```bash
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

Smoke check:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='both' LEGACY_REPLAY_TRIALS=50 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-queued-second-smoke' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
```

Replay matrix:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='auto' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-queued-second-caseA-auto' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='attacker' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-queued-second-caseB-attacker' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-queued-second-caseC-defender' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-caseC-defender.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='both' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-queued-second-caseD-both' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-caseD-both.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ROUND_RESOLVE_MODE='simultaneous_round' LEGACY_DIAG_QUEUED_SECOND_ACTION='auto' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-queued-second-caseE-simul' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-caseE-simul.log 2>&1
```

Dual Rift debug:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='auto' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-queued-second-debug-caseA-auto' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-debug-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='attacker' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-queued-second-debug-caseB-attacker' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-debug-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='defender' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-queued-second-debug-caseC-defender' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-debug-caseC-defender.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_QUEUED_SECOND_ACTION='both' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-queued-second-debug-caseD-both' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-queued-second-debug-caseD-both.log 2>&1
python3 ./tmp/parse_queued_second_diag.py ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-queued-second-caseA-auto--2026-03-15T00-16-02-301Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-queued-second-caseB-attacker--2026-03-15T00-16-19-093Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-queued-second-caseC-defender--2026-03-15T00-16-39-263Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-queued-second-caseD-both--2026-03-15T00-16-55-558Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-queued-second-caseE-simul--2026-03-15T00-17-11-919Z.json ./tmp/codex-queued-second-debug-caseA-auto.log ./tmp/codex-queued-second-debug-caseB-attacker.log ./tmp/codex-queued-second-debug-caseC-defender.log ./tmp/codex-queued-second-debug-caseD-both.log > ./tmp/codex-queued-second-diagnostic-data.json
```

## Results

Case key:

- `A` baseline `auto`
- `B` attacker-only queued second action
- `C` defender-only queued second action
- `D` both sides queued second action
- `E` existing broad `simultaneous_round`

| Defender | Truth win% | A dWin / dAvgT | B dWin / dAvgT | C dWin / dAvgT | D dWin / dAvgT | E dWin / dAvgT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.32 / +0.0543 | +6.32 / +0.0615 | +6.40 / +0.0492 | +6.43 / +0.0529 | +6.47 / +0.0615 |
| DL Gun Sniper Mix | 65.85 | -0.04 / +0.0593 | +0.07 / +0.0690 | -0.07 / +0.0583 | -0.06 / +0.0645 | -0.14 / +0.0571 |
| HF Scythe Pair | 66.42 | -1.05 / +0.0129 | -0.90 / +0.0129 | -0.84 / +0.0088 | -0.79 / +0.0156 | -0.94 / +0.0065 |

## What the diagnostic proved

No queued-second-action case materially helps `DL Dual Rift Bio`.

- Best target result is still baseline/attacker-only tied on win%: `+6.32`
- `B` changes target `dAvgTurns` slightly in the wrong direction: `+0.0543 -> +0.0615`
- `C`, `D`, and `E` all make target win% slightly worse

So the narrow queued-second-action theory did **not** move the target in a meaningful way.

## Debug evidence

The branch is real and active.

Dual Rift debug:

- Baseline `A`:
  - attacker `queuedSecondActionTriggeredCount = 0`
  - defender `queuedSecondActionTriggeredCount = 0`
- Attacker-only `B`:
  - attacker `queuedSecondActionTriggeredCount = 215`
  - attacker `queuedSecondActionKilledActorStillActedCount = 215`
  - defender counters stay `0`
  - trace contains explicit queued lines such as:
    - `T11 A->D(queued) | ...`
- Defender-only `C`:
  - both sides stayed `0` in the sampled 500-fight Dual Rift debug
- Both sides `D`:
  - attacker `queuedSecondActionTriggeredCount = 203`
  - defender counters still `0` in the sampled debug
  - trace again shows `A->D(queued)` lines

That means:

- the attacker-side queued action case is definitely occurring often enough to matter if this were the right mechanic
- yet the 200k replay deltas barely move
- so this is a clean rejection of the specific hypothesis, not a false negative caused by a dead branch

## Does any case help the target and keep controls close?

No.

Closest thing to "help" is `B`, but it is effectively neutral on the target:

- `DL Dual Rift Bio`: `+6.32 -> +6.32`
- `DL Gun Sniper Mix`: `-0.04 -> +0.07`
- `HF Scythe Pair`: `-1.05 -> -0.90`

That is smaller and cleaner than broad `simultaneous_round`, but still not a real fix.

## Is it narrower/better than `simultaneous_round`?

Yes, it is narrower and less disruptive than `simultaneous_round`.

But it is **not** better in the only sense that matters here: it does not materially improve the target.

Comparison on `DL Dual Rift Bio`:

- `B attacker-only queued`: `+6.32`
- `E simultaneous_round`: `+6.47`

So `B` is less wrong than `E`, but only by `0.15` win%, which is still well inside "not the main fix" territory.

## Hypothesis conclusion

`H1: suppressed queued second action is the main round-timing mismatch`

- Rejected.
- The branch fires hundreds of times in Dual Rift debug and still leaves the target essentially unchanged.

`H2: broader retaliation timing is still wrong in a different way`

- Still possible, but much weaker now.
- Both the broad round model (`simultaneous_round`) and this narrow queued-second-action model came back negative.
- If anything remains in round sequencing, it is likely a smaller first-move / tie-resolution effect, not this retaliation-window rule.

`H3: neither; pivot subsystem`

- Strongest conclusion from this pass.
- We now have two negative round-loop diagnostics in a row:
  - broad `simultaneous_round`
  - narrow queued second action

## Recommendation

Recommendation: `PIVOT SUBSYSTEM`

Not:

- `PATCH NOW`
- `ONE LAST MICRO-DIAGNOSTIC`

Why:

- This diagnostic was active, narrow, and parity-mirrored.
- It still did not help the target materially.
- That is enough evidence to stop patching this specific retaliation-window theory.

If work continues, the next suspect should **not** be more `doAction()` / `w2` gating or queued-second-action timing.

Most plausible next place:

- first-move / speed-tie policy and end-of-fight tie resolution in [legacy-sim-v1.0.4-clean.js:4469](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4469) through [legacy-sim-v1.0.4-clean.js:4609](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4609), with parity mirror in [brute-sim-v1.4.6.js:1521](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1521) through [brute-sim-v1.4.6.js:1565](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1565)

More truth data:

- not needed before that next pivot
- current target plus two controls were enough to reject this hypothesis cleanly
