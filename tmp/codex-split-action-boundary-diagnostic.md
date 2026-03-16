# Split Action Boundary Diagnostic

Patch type: diagnostic-only, default-preserving. Unset, `auto`, or `off` leaves current behavior unchanged.

Parity status:

- Mirrored the new toggle in [legacy-sim-v1.0.4-clean.js:4179](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4179) and [brute-sim-v1.4.6.js:1416](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1416).
- Syntax-checked both files with `node --check`.
- I did not run separate brute replay verification, so parity is by mirrored implementation plus code inspection, not runtime output.

## Exact code changes made

Changed files:

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)

Legacy changes:

- Added env default/parser/helper for `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION` at [legacy-sim-v1.0.4-clean.js:160](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L160), [legacy-sim-v1.0.4-clean.js:213](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L213), [legacy-sim-v1.0.4-clean.js:1315](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1315), and [legacy-sim-v1.0.4-clean.js:1731](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1731).
- Added split-action counters in [legacy-sim-v1.0.4-clean.js:3402](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3402) and [legacy-sim-v1.0.4-clean.js:3436](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3436).
- Added the split-action diagnostic branch, with fresh per-sub-action pre-state for `w2`, in [legacy-sim-v1.0.4-clean.js:4179](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4179) through [legacy-sim-v1.0.4-clean.js:4279](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4279).
- Threaded the active setting into config/debug metadata at [legacy-sim-v1.0.4-clean.js:4253](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4253), [legacy-sim-v1.0.4-clean.js:5276](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5276), [legacy-sim-v1.0.4-clean.js:5410](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5410), and [legacy-sim-v1.0.4-clean.js:6461](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L6461).

Brute parity changes:

- Added env parse/normalization/helper at [brute-sim-v1.4.6.js:1121](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1121), [brute-sim-v1.4.6.js:1249](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1249), and [brute-sim-v1.4.6.js:1291](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1291).
- Added the mirrored split-action pre-state branch in [brute-sim-v1.4.6.js:1399](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1399) through [brute-sim-v1.4.6.js:1436](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1436).

Behavior of the diagnostic branch:

- Only active in the per-weapon, no-tactics, two-weapon path.
- `w1` resolves first.
- Actual applied `w1` damage is committed to a local remainder.
- If the target dies, `w2` is skipped.
- If the target survives, `w2` reruns the usual per-action pre-state setup before resolving, so `sharedHit` and other pre-action caches are no longer forced to span both weapons in the split branch.

## Exact commands run

Syntax checks:

```bash
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

Replay matrix:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='auto' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-split-caseA-auto' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='attacker' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-split-caseB-attacker' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-split-caseC-defender' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-caseC-defender.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='both' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-split-caseD-both' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-caseD-both.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='attacker' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-split-caseE-attacker-stop1' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-caseE-attacker-stop1.log 2>&1
```

Dual Rift debug:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='auto' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-split-debug-caseA-auto' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-debug-caseA-auto.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='attacker' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-split-debug-caseB-attacker' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-debug-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='attacker' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-split-debug-caseC-attacker-stop1' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-split-debug-caseC-attacker-stop1.log 2>&1
python3 ./tmp/parse_split_action_diag.py ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-split-caseA-auto--2026-03-15T00-00-16-973Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-split-caseB-attacker--2026-03-15T00-00-33-524Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-split-caseC-defender--2026-03-15T00-00-51-923Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-split-caseD-both--2026-03-15T00-01-08-953Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-split-caseE-attacker-stop1--2026-03-15T00-01-27-507Z.json ./tmp/codex-split-debug-caseA-auto.log ./tmp/codex-split-debug-caseB-attacker.log ./tmp/codex-split-debug-caseC-attacker-stop1.log > ./tmp/codex-split-action-diagnostic-data.json
```

## Results

Case key:

- `A` baseline `auto`
- `B` attacker-only split
- `C` defender-only split
- `D` both sides split
- `E` attacker-only split + `ACTION_STOP_ON_KILL=1`

| Defender | Truth win% | A dWin / dAvgT | B dWin / dAvgT | C dWin / dAvgT | D dWin / dAvgT | E dWin / dAvgT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.25 / +0.0619 | +6.34 / +0.0937 | +6.55 / +0.0837 | +6.80 / +0.1212 | +6.62 / +0.0931 |
| DL Gun Sniper Mix | 65.85 | +0.14 / +0.0613 | +0.56 / +0.0769 | +0.13 / +0.0791 | +1.04 / +0.0943 | +0.77 / +0.0791 |
| HF Scythe Pair | 66.42 | -0.78 / +0.0201 | -0.51 / +0.0132 | -0.02 / +0.1009 | +0.39 / +0.1102 | -0.34 / +0.0169 |

## What attacker-only split changed

Attacker-only split does **not** help the target materially. It makes `DL Dual Rift Bio` slightly worse:

- `+6.25 -> +6.34` dWin
- `+0.0619 -> +0.0937` dAvgTurns

It keeps the two controls relatively close, but in the wrong direction for the target:

- `DL Gun Sniper Mix`: `+0.14 -> +0.56`
- `HF Scythe Pair`: `-0.78 -> -0.51`

The debug evidence explains why.

Dual Rift attacker counters:

- Baseline `A`:
  - `turnsTaken=5538`
  - `weapon2Attempts=5538`
  - `w2OnDeadCount=51`
  - `splitActionCount=0`
  - `killsByW1=105`
  - `killsByW2=164`
  - `averageAppliedDamagePerTurn=68.1401`
- Attacker split `B`:
  - `turnsTaken=5460`
  - `weapon2Attempts=5341`
  - `w2OnDeadCount=0`
  - `splitActionCount=5460`
  - `splitActionKilledAfterW1Count=119`
  - `splitActionReachedW2Count=5341`
  - `killsByW1=119`
  - `killsByW2=153`
  - `averageAppliedDamagePerTurn=69.4989`

Interpretation:

- The branch definitely fired on every attacker action in the debug run.
- It removed dead-target `w2` waste.
- But because `w2` gets a fresh pre-action setup in the split branch, it is no longer tied to `w1` by the same atomic shared-hit context.
- Under `LEGACY_SHARED_HIT=1`, that change makes the attacker slightly stronger overall in the target lane, not weaker.
- That is the opposite of what a real fix for `DL Dual Rift Bio` should do.

## Stacking with stop_on_kill

Stacking does not add anything useful.

- `DL Dual Rift Bio`: `B +6.34` vs `E +6.62`
- `DL Gun Sniper Mix`: `B +0.56` vs `E +0.77`
- `HF Scythe Pair`: `B -0.51` vs `E -0.34`

In Dual Rift debug:

- attacker split already removed attacker `w2OnDead` (`51 -> 0`)
- `E` still shows attacker split counters, but `w2StopOnKillCount` stays `0` for attacker because the split branch already subsumes the attacker dead-target skip
- the extra effect mainly comes from defender-side `ACTION_STOP_ON_KILL=1`, which does not move the target the right way

Conclusion: the split diagnostic and old stop gate mostly overlap on the attacker side, and the stack is not a useful path to a fix.

## Hypothesis conclusion

`H1: atomic multiweapon action timing is the real missing behavior`

- Rejected.
- If the game really behaved like this split model, `DL Dual Rift Bio` should have moved toward truth. It moved away.

`H2: deeper retaliation/action-boundary timing is still wrong even after this split test`

- Most plausible remaining explanation.
- This diagnostic only split the internal `w1` / `w2` pre-state and damage boundary. It still did **not** insert a real opponent action boundary between them.
- The residual mismatch now points more toward full turn/round sequencing than toward per-weapon eligibility or dead-target `w2` handling.

`H3: neither; change suspect subsystem`

- Also plausible, and now stronger than before.
- Two consecutive diagnostics inside the same per-weapon/no-tactics bucket failed:
  - applied-`w1` gating
  - split internal action boundary

## Recommendation

Recommendation: `CHANGE SUSPECT SUBSYSTEM`

Not `PATCH NOW`.

Why:

- The broader split-action diagnostic is real and measurable.
- It still does not help the target.
- That makes a behavior patch in the shared per-weapon/no-tactics `w2` gating block too speculative.

Next subsystem to investigate:

- full turn / round sequencing in [legacy-sim-v1.0.4-clean.js:4439](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4439) `fightOnce()`
- parity mirror in [brute-sim-v1.4.6.js:1500](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1500) `fightOnceCalibFast()`
- especially whether the real game’s retaliation window, round boundary, or first/second action ordering diverges from the simulator after a lethal or near-lethal `w1`

Smallest future patch target if that subsystem proves out:

- round-level action sequencing in `fightOnce()` / `fightOnceCalibFast()`, not the `doAction()` / `doActionFast()` weapon gating block touched here
