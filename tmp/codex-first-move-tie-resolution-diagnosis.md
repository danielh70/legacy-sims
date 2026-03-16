# First-Move / Tie-Resolution Diagnosis

Patch type: diagnostic-only, default-preserving.

Parity status:

- Mirrored the new first-actor diagnostic toggle in [legacy-sim-v1.0.4-clean.js:1353](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1353), [legacy-sim-v1.0.4-clean.js:4487](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4487), [brute-sim-v1.4.6.js:1329](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1329), and [brute-sim-v1.4.6.js:1538](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1538).
- Syntax-checked both files with `node --check`.
- I did not run a separate brute replay/optimizer runtime verification. Parity here is mirrored implementation plus code inspection.

## Exact Code Changes Made

Changed files:

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)

Legacy changes:

- Added default env and normalizer for `LEGACY_DIAG_FIRST_ACTOR_OVERRIDE` at [legacy-sim-v1.0.4-clean.js:162](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L162) and [legacy-sim-v1.0.4-clean.js:231](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L231).
- Added `resolveFirstActor()` at [legacy-sim-v1.0.4-clean.js:1353](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1353).
- Routed `fightOnce()` through that helper and threaded `fightIndex` for `alternate` at [legacy-sim-v1.0.4-clean.js:4487](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4487).
- Added legacy-only end-state counters/export at [legacy-sim-v1.0.4-clean.js:4669](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4669) and [legacy-sim-v1.0.4-clean.js:5850](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5850).

Brute changes:

- Added `LEGACY_DIAG_FIRST_ACTOR_OVERRIDE` env read at [brute-sim-v1.4.6.js:1127](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1127).
- Added matching normalizer/helper at [brute-sim-v1.4.6.js:1265](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1265) and [brute-sim-v1.4.6.js:1329](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1329).
- Routed `fightOnceCalibFast()` and `runMatchPacked()` through the same override at [brute-sim-v1.4.6.js:1538](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1538) and [brute-sim-v1.4.6.js:1592](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1592).

I did **not** add `LEGACY_DIAG_DOUBLE_KO_WINNER`.

Reason:

- In baseline round mode, if the first actor kills the second actor, the fight breaks before the second action unless a separate round diagnostic is enabled.
- That makes same-round double-KO inactive in the tested baseline path.
- Equal-HP survivor ties only matter at the `maxTurns` cap, and the tested lanes average about `9-11` turns vs `MAX_TURNS=200`.

## Exact Commands Run

Code inspection:

```bash
sed -n '4465,4615p' ./legacy-sim-v1.0.4-clean.js
sed -n '1517,1578p' ./brute-sim-v1.4.6.js
rg -n "LEGACY_SPEED_TIE_MODE|speedTieMode|p1First|firstMove|doubleKO|equal hp|LEGACY_DETERMINISTIC|seed|resolveFirstActor|compileCombatantFromParts|buildCompiledCombatSnapshot" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

200k replay compare matrix:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-firstmove-caseA-baseline' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-caseA-baseline.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='attacker' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-firstmove-caseB-attacker' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-caseB-attacker.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-firstmove-caseC-defender' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-caseC-defender.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='alternate' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-firstmove-caseD-alternate' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-caseD-alternate.log 2>&1
```

Focused 500-trial replay-debug runs for `CUSTOM | DL Dual Rift Bio`:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-firstmove-debug-caseA-baseline-500' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-debug-caseA-baseline-500.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='attacker' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-firstmove-debug-caseB-attacker-500' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-debug-caseB-attacker-500.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='defender' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-firstmove-debug-caseC-defender-500' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-debug-caseC-defender-500.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_DIAG_FIRST_ACTOR_OVERRIDE='alternate' LEGACY_REPLAY_TRIALS=500 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-firstmove-debug-caseD-alternate-500' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-firstmove-debug-caseD-alternate-500.log 2>&1
```

Direct sim-export attempt:

- I briefly tried `LEGACY_EXPORT_JSON=1` directly against `LEGACY_VERIFY_DEFENDERS='DL Dual Rift Bio'`, but the standalone sim’s default defender file does not contain the replay-only defender names. I did not use that failed path for evidence.

## Functions / Blocks Inspected

- [legacy-sim-v1.0.4-clean.js:1353](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1353) `resolveFirstActor()`
- [legacy-sim-v1.0.4-clean.js:4487](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4487) `fightOnce()`
- [legacy-sim-v1.0.4-clean.js:4619](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4619) winner assignment / both-dead / equal-HP resolution
- [legacy-sim-v1.0.4-clean.js:4663](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4663) `runMatch()` first-move and end-state accounting
- [legacy-sim-v1.0.4-clean.js:5600](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5600) deterministic per-defender RNG seeding
- [legacy-sim-v1.0.4-clean.js:2586](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2586) `compileCombatantFromParts()`
- [legacy-sim-v1.0.4-clean.js:3877](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3877) `buildCompiledCombatSnapshot()`
- [brute-sim-v1.4.6.js:1329](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1329) `resolveFirstActor()`
- [brute-sim-v1.4.6.js:1538](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1538) `fightOnceCalibFast()`
- [brute-sim-v1.4.6.js:1592](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1592) `runMatchPacked()`

## Current Policy

First-move policy:

- First actor is chosen **once per fight**, not per round.
- The chooser uses compiled effective speed, not the page-build base speed.
- If `p1.speed > p2.speed`, attacker goes first.
- If `p1.speed < p2.speed`, defender goes first.
- If speeds tie, `LEGACY_SPEED_TIE_MODE=random` uses `RNG() < 0.5`; otherwise attacker wins the tie.

Speed-tie handling:

- The default code path already has a real knob: `LEGACY_SPEED_TIE_MODE=random|attacker`.
- In the tested target lane, that tie-break path is **inactive** because the compiled snapshot shows `CUSTOM speed=190` and `DL Dual Rift Bio speed=257`.

Double-KO / tie resolution:

- In both sims, if both sides are dead at fight end, winner is `p1First`.
- If both sides are alive at fight end and HP is equal, winner is also `p1First`.
- In the tested baseline loop, same-round double-KO is effectively suppressed because the fight breaks immediately when the first action kills the second actor.

Win accounting:

- Legacy counts only `wins`; there is no persistent exported tie bucket in the tested baseline path.
- Legacy also exports `firstMove.attackerRate`, `firstMove.defenderRate`, and conditional win rates when replay debug is enabled.

## Legacy / Brute Parity

These areas appear parity-aligned:

- first-actor selection logic
- speed-tie rule
- fixed initiative for the whole fight
- both-dead winner assignment
- equal-HP survivor winner assignment

The new diagnostic override was mirrored cleanly in both files. I only validated legacy at runtime through replay compare; brute parity is by code inspection plus mirrored implementation.

## Results

Meaningful cases run:

- `A` baseline
- `B` forced attacker first
- `C` forced defender first
- `D` alternating first actor

Skipped as not meaningful:

- `E/F/G` double-KO winner overrides

Reason:

- the tested baseline round loop normally cannot produce same-round mutual death
- the tested fights are nowhere near the `maxTurns` cap where equal-HP survivor ties would matter

| Case | Defender | Truth win% | dWin% | dAvgTurns |
| --- | --- | ---: | ---: | ---: |
| A baseline | DL Dual Rift Bio | 49.60 | +6.33 | +0.0503 |
| A baseline | DL Gun Sniper Mix | 65.85 | +0.01 | +0.0559 |
| A baseline | HF Scythe Pair | 66.42 | -0.96 | +0.0110 |
| B attacker first | DL Dual Rift Bio | 49.60 | +14.49 | +0.0531 |
| B attacker first | DL Gun Sniper Mix | 65.85 | +7.90 | +0.0631 |
| B attacker first | HF Scythe Pair | 66.42 | +6.95 | +0.0065 |
| C defender first | DL Dual Rift Bio | 49.60 | +6.36 | +0.0502 |
| C defender first | DL Gun Sniper Mix | 65.85 | +0.20 | +0.0621 |
| C defender first | HF Scythe Pair | 66.42 | -1.00 | +0.0124 |
| D alternate | DL Dual Rift Bio | 49.60 | +10.38 | +0.0626 |
| D alternate | DL Gun Sniper Mix | 65.85 | +3.81 | +0.0580 |
| D alternate | HF Scythe Pair | 66.42 | +3.03 | +0.0109 |

## Target Debug Facts

From the 500-trial replay-debug runs for `CUSTOM | DL Dual Rift Bio`:

- Baseline compiled snapshot: attacker speed `190`, defender speed `257`
- Baseline exported first-move summary: attacker `0%`, defender `100%`
- Forced attacker override: attacker `100%`, defender `0%`
- Forced defender override: attacker `0%`, defender `100%`
- Alternate override: attacker `50%`, defender `50%`

Interpretation:

- The diagnostic is definitely active.
- The target lane is not an effective speed tie in the sim.
- The baseline behavior is already equivalent to defender-first for this matchup, so first-move forcing is not revealing a hidden tie-break bug here.

## Does Any First-Move / Double-KO Diagnostic Help?

No.

For `DL Dual Rift Bio`:

- forced attacker first makes the target much worse: `+6.33 -> +14.49`
- alternate first actor also makes it worse: `+6.33 -> +10.38`
- forced defender first is basically baseline: `+6.33 -> +6.36`

For the controls:

- forced attacker first badly damages both controls
- alternate first actor also damages both controls
- forced defender first is nearly identical to baseline

So first-move policy is clearly powerful, but not in the direction needed for the target. It behaves like a broad global lever, not the missing target-specific rule.

## Hypothesis Ranking

1. `H3: neither; change suspect subsystem`

- Strongest.
- The target lane is not a compiled speed tie in the sim.
- The baseline result already matches defender-first behavior.
- Overwriting first actor does not improve the target and badly hurts controls.

2. `H1: first-move / speed-tie policy is the main mismatch`

- Weak.
- This subsystem can swing win% a lot while barely moving avgTurns, so it is a plausible high-leverage bucket in general.
- But the measured direction is wrong here: attacker-first makes every checked matchup more attacker-favored.
- The target mismatch is already attacker-favored, so this does not fit.

3. `H2: double-KO / end-of-fight winner assignment is the main mismatch`

- Weakest.
- That branch is effectively cold in the tested baseline path.
- No meaningful diagnostic run remained after code inspection, because same-round double-KO is suppressed before winner assignment is reached.

## Conclusion

This pass rejects first-move / speed-tie policy and double-KO winner assignment as the primary explanation for `CUSTOM vs DL Dual Rift Bio`.

The strongest concrete new fact is not “tie policy is wrong.” It is:

- the target lane compiles to a real defender speed advantage (`257 > 190`)
- the baseline replay is already effectively defender-first

That points away from round-end winner policy and toward an upstream compilation / combat-state source difference instead.

## Recommendation

Recommendation: `CHANGE SUSPECT SUBSYSTEM`

Not:

- `PATCH NOW`
- `ONE LAST MICRO-DIAGNOSTIC`
- `GATHER TARGETED EXTRA TRUTH`

Next subsystem to investigate:

- compiled stat pipeline for effective speed and related pre-fight state
- especially [legacy-sim-v1.0.4-clean.js:2586](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2586) `compileCombatantFromParts()`
- and [legacy-sim-v1.0.4-clean.js:3877](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3877) `buildCompiledCombatSnapshot()`

Most likely next questions:

- Is speed contribution from gear / crystals / upgrades / style being compiled correctly for replay defenders?
- Is defender payload normalization or attack-style application drifting from the external truth?
- Is the target lane’s attacker-favored error coming from compiled stats rather than round resolution?
