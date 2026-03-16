# Mixed-melee action diagnosis

Tracked source edits in this pass: none.

Temporary helper created: [tmp/parse_mixed_melee_stop_diag.py](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/parse_mixed_melee_stop_diag.py)

## Exact commands run

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-mixed-melee-caseA-baseline-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-caseA-baseline-3def.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-mixed-melee-caseB-stop1-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-caseB-stop1-3def.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseA-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseA-dual-rift.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseA-gun-sniper' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseA-gun-sniper.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseA-hf-scythe' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseA-hf-scythe.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseB-dual-rift-stop1' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseB-dual-rift-stop1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseB-gun-sniper-stop1' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseB-gun-sniper-stop1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 LEGACY_REPLAY_TRIALS=400 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair' LEGACY_REPLAY_TAG='codex-mixed-melee-debug-caseB-hf-scythe-stop1' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-mixed-melee-debug-caseB-hf-scythe-stop1.log 2>&1
python3 ./tmp/parse_mixed_melee_stop_diag.py ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-mixed-melee-caseA-baseline-3def--2026-03-14T23-36-00-484Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-mixed-melee-caseB-stop1-3def--2026-03-14T23-36-00-485Z.json ./tmp/codex-mixed-melee-debug-caseA-dual-rift.log ./tmp/codex-mixed-melee-debug-caseA-gun-sniper.log ./tmp/codex-mixed-melee-debug-caseA-hf-scythe.log ./tmp/codex-mixed-melee-debug-caseB-dual-rift-stop1.log ./tmp/codex-mixed-melee-debug-caseB-gun-sniper-stop1.log ./tmp/codex-mixed-melee-debug-caseB-hf-scythe-stop1.log > ./tmp/codex-mixed-melee-diagnostic-data.json
```

## Replay summary

| Defender | Truth win% | Baseline dWin% | stop_on_kill=1 dWin% | Change in dWin% | Baseline dAvgTurns | stop_on_kill=1 dAvgTurns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.41 | +6.23 | -0.18 | +0.0554 | +0.0543 |
| DL Gun Sniper Mix | 65.85 | -0.08 | +0.15 | +0.23 | +0.0582 | +0.0618 |
| HF Scythe Pair | 66.42 | -1.04 | -0.84 | +0.20 | +0.0092 | +0.0133 |

## Stop-on-kill verdict

`LEGACY_ACTION_STOP_ON_KILL=1` is active and measurable, but it does **not** meaningfully solve the target.

- It improves `DL Dual Rift Bio` by only `0.18` win%.
- It nudges the controls by similarly tiny amounts:
  - `DL Gun Sniper Mix`: `-0.08 -> +0.15`
  - `HF Scythe Pair`: `-1.04 -> -0.84`
- Debug counters confirm the branch is real:
  - attacker `weapon2Attempts` dropped by `89` / `130` / `112` across the three matchups
  - attacker `w2OnDeadCount` fell from `51/67/71` to `0`
  - defender `w2OnDeadCount` also fell to `0`
- But even after removing all observed dead-target `w2` events, the target is still badly off at `+6.23`.

Conclusion: stop-on-kill alone is too small to be the main fix.

## Current action-resolution order

Legacy path:

- [legacy-sim-v1.0.4-clean.js:3931](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3931) `attemptWeapon()` does hit -> skill -> damage roll -> per-weapon armor application, then returns `{ raw, dmg, hit, skill }`.
- [legacy-sim-v1.0.4-clean.js:4106](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4106) `doAction()`:
  - rolls/sets any shared-hit or shared-skill pre-action state
  - resolves `w1` first
  - only skips `w2` if the exact stop gate fires at [legacy-sim-v1.0.4-clean.js:4198](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4198):
    `actionStopOnKill && targetHp0 > 0 && armorApply === per_weapon && baseVal === 0 && r1.dmg >= targetHp0`
  - otherwise still resolves `w2` against the original live target
  - then applies damage sequentially to `targetHp0` in the per-weapon branch at [legacy-sim-v1.0.4-clean.js:4248](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4248)
  - then records overkill / on-dead / kill attribution at [legacy-sim-v1.0.4-clean.js:4273](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4273)

Important implication:

- The sim does **not** combine applied damage too eagerly in the per-weapon/no-tactics branch. It applies `w1` then `w2` against a running remainder.
- But the sim **does** resolve the whole action before retaliation. In [legacy-sim-v1.0.4-clean.js:4339](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4339), `fightOnce()` subtracts the whole returned action result, then only checks whether the other side still gets to act. There is no mid-action retaliation boundary after lethal `w1`.

Brute fast path:

- [brute-sim-v1.4.6.js:1298](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1298) `attemptWeaponFast()` mirrors hit -> skill -> damage -> per-weapon armor and writes a per-weapon damage scalar.
- [brute-sim-v1.4.6.js:1362](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1362) `doActionFast()` mirrors the same order:
  - `w1`
  - same stop gate at [brute-sim-v1.4.6.js:1389](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1389)
  - optional `w2`
  - sum/cap damage at [brute-sim-v1.4.6.js:1405](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1405)
- It omits legacy’s diagnostic counters, but the combat-order parity for this path appears preserved by inspection.

## What the debug evidence says

Baseline with `SHARED_SKILL=none` already shows dead-target `w2` behavior on all three matchups, but the target lane is not uniquely extreme:

- attacker `w2OnDead / totalKills`
  - Dual Rift: `51 / 233 = 0.219`
  - Gun Sniper: `67 / 251 = 0.267`
  - HF Scythe: `71 / 263 = 0.270`
- attacker `killsByW1 / killsByW2`
  - Dual Rift: `106 / 127`
  - Gun Sniper: `117 / 134`
  - HF Scythe: `125 / 138`

That argues against “baseline mixed-melee is uniquely broken only in the target lane.”

With `stop_on_kill=1`:

- `w2OnDeadCount` drops to `0` for both sides in all three matchups
- attacker `w2SkipRate` is only:
  - Dual Rift: `89 / 4405 = 2.0%`
  - Gun Sniper: `130 / 3547 = 3.7%`
  - HF Scythe: `112 / 3672 = 3.1%`
- so the branch is real, but it touches only a small minority of actions

This matches the tiny replay effect sizes.

## Hypothesis judgment

`H1: missing stop-on-kill / dead-target skip is the main issue`

- Rejected as the main issue.
- Evidence: enabling it removes dead-target `w2` waste completely, yet only moves the target by `0.18` win%.

`H2: per-weapon kill attribution / retaliation timing is wrong in a subtler way`

- Most likely.
- Evidence: the simulator’s granularity is still “whole action then retaliation,” not “check life/retaliation after each weapon.”
- The stop gate only handles the narrow case `r1.dmg >= targetHp0`. Any subtler difference in when `w2` should exist, how lethal `w1` affects retaliation windows, or whether mixed-melee actions should consume RNG / apply damage differently would live in this block.

`H3: neither; the main issue is elsewhere`

- Less likely than `H2`, but still possible.
- Reason: the target mismatch remains large even after the obvious dead-target skip is fixed, so this subsystem is implicated but not yet isolated to one exact rule.

## Ranked hypotheses

1. `H2` per-weapon kill attribution / retaliation timing is wrong in a subtler way.
2. `H3` neither; the main issue is elsewhere.
3. `H1` missing stop-on-kill / dead-target skip is the main issue.

Why:

- `H1` is weakened directly by the replay result.
- `H2` fits both the code and the residual gap: the current model is action-granular, and the remaining suspect is the boundary between resolving `w1`, deciding whether `w2` exists, and allowing the opponent’s next action.
- `H3` stays in play because the target residual is still large, but the best remaining suspicious block is still this action-resolution boundary.

## Best next patch target

Not ready to patch yet, but the smallest credible next target is:

- the per-weapon/no-tactics branch in [legacy-sim-v1.0.4-clean.js:4195](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4195) through [legacy-sim-v1.0.4-clean.js:4315](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4315)
- parity mirror in [brute-sim-v1.4.6.js:1382](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1382) through [brute-sim-v1.4.6.js:1415](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1415)

Most likely sub-block:

- the decision boundary between rolling `w2` and later applying `w1Applied/w2Applied`, not the narrow `ACTION_STOP_ON_KILL` gate itself

## Recommendation

Next pass: `ONE LAST MICRO-DIAGNOSTIC`

Why:

- Evidence is strong enough to drop stop-on-kill as the primary fix.
- Evidence is not yet strong enough to patch the deeper action-resolution rule safely.
- The next diagnostic should isolate whether the real divergence is:
  - “no `w2` roll after lethal `w1`”
  - or “no defender next action after lethal `w1` even if `w2` still exists inside the same attacker action”

