# Round Sequencing Diagnosis

Tracked source edits in this pass: none.

## Exact commands run

Code inspection:

```bash
sed -n '4439,4572p' ./legacy-sim-v1.0.4-clean.js
sed -n '1500,1568p' ./brute-sim-v1.4.6.js
rg -n "fightOnce\\(|fightOnceCalibFast\\(|firstMove|p1First|roundResolveMode|simultaneous_round|speedTieMode" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
```

Baseline compare:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-round-seq-baseline-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-round-seq-baseline-3def.log 2>&1
```

Existing legacy-only round diagnostic:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ROUND_RESOLVE_MODE='simultaneous_round' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-round-seq-simul-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-round-seq-simul-3def.log 2>&1
```

Focused trace checks:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-round-seq-debug-baseline-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-round-seq-debug-baseline-dual-rift.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ROUND_RESOLVE_MODE='simultaneous_round' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-round-seq-debug-simul-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-round-seq-debug-simul-dual-rift.log 2>&1
```

Result extraction:

```bash
python3 - <<'PY'
import json
from pathlib import Path
for p in [
  'results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-round-seq-baseline-3def--2026-03-15T00-08-56-529Z.json',
  'results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-round-seq-simul-3def--2026-03-15T00-08-56-528Z.json',
]:
    data = json.loads(Path(p).read_text())
    print(Path(p).name)
    for row in data['rows']:
        print(row['defender'], row['truth']['winPct'], row['dWinPct'], row['dAvgTurns'])
PY
```

## Exact functions/blocks inspected

- `legacy-sim-v1.0.4-clean.js`
  - `fightOnce()` at `4439-4567`
  - `runMatch()` first-move accounting around `4594-4648`
  - `normalizeRoundResolveMode()` and round mode wiring around `4667-4673`, `4836-4922`, `5236-5237`
  - `doAction()` as the called per-action unit around `4139-4387`
- `brute-sim-v1.4.6.js`
  - `fightOnceCalibFast()` at `1500-1538`
  - `doActionFast()` as the called per-action unit around `1362-1494`

## Current round/action sequencing

Legacy baseline path:

1. Decide `p1First` from speed.
2. On speed tie, use `cfg.speedTieMode === 'random' ? RNG() < 0.5 : true`.
3. Bind `first` and `second` for the entire fight.
4. Each loop iteration increments `turns`.
5. Resolve `first` actor action against the target's current HP.
6. Apply that action's full returned damage immediately.
7. If either side is now dead, break the loop before `second` acts.
8. Otherwise resolve `second` actor action against the updated current HP.
9. Apply the second action immediately.
10. Repeat until death or `maxTurns`.

Winner resolution in legacy:

- living side wins if only one side is alive
- if both alive at `maxTurns`, higher HP wins
- if both alive with equal HP at `maxTurns`, first actor wins
- if both dead, first actor wins

Legacy also contains a non-default alternate branch:

- `cfg.roundResolveMode === 'simultaneous_round'`
- both sides act every turn off the start-of-turn HP snapshots
- both action results are then applied after both actions resolve
- trace labels change from `(ret)` to `(simul)`

Brute fast path:

- current default fast path matches the legacy baseline order:
  - choose first actor once
  - first action applies immediately
  - death check occurs before second action
  - second action only happens if both sides survived the first action
  - same winner/tie policy
- brute does **not** currently implement the legacy-only `simultaneous_round` alternate branch

## Parity judgment

For the default, active round loop, legacy-sim and brute-sim appear parity-aligned by inspection.

Important caveat:

- legacy has an existing optional `simultaneous_round` branch
- brute fast path does not mirror it
- so parity is good for the default baseline path, not for that legacy-only alternate mode

## Replay evidence

Baseline replay, 3 defenders:

| Defender | Truth win% | Baseline dWin% | Baseline dAvgTurns |
| --- | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.25 | +0.0619 |
| DL Gun Sniper Mix | 65.85 | +0.14 | +0.0613 |
| HF Scythe Pair | 66.42 | -0.78 | +0.0201 |

Existing broad round diagnostic, `LEGACY_ROUND_RESOLVE_MODE=simultaneous_round`:

| Defender | dWin% | dAvgTurns | vs baseline |
| --- | ---: | ---: | --- |
| DL Dual Rift Bio | +6.43 | +0.0618 | slightly worse |
| DL Gun Sniper Mix | +0.23 | +0.0606 | slightly worse |
| HF Scythe Pair | -0.83 | +0.0211 | slightly worse |

This matters:

- the broad "both sides always get an action in the round" model already exists in legacy
- and it does **not** improve the target
- so the remaining sequencing suspect is narrower than full simultaneous rounds

Trace confirmation on Dual Rift:

- baseline trace uses:
  - `T1 D->A | ...`
  - `T1 A->D(ret) | ...`
- simultaneous trace uses:
  - `T1 D->A | ...`
  - `T1 A->D(simul) | ...`

That directly matches the code-level distinction above.

## Top remaining hypotheses

1. Narrow retaliation-window / queued-second-action timing is wrong.
   - Not "full simultaneous round".
   - More likely: the second actor may still deserve a queued action in a narrower subset of cases, such as when killed by the first actor within the same round, or only for one side/family context.
   - This stays plausible because the target lane is too attacker-favored, while the broad simultaneous model was too indiscriminate and slightly worsened everything.

2. First-actor bias / tie resolution is wrong.
   - Equal-speed fights bind a first actor once per fight, and first actor also wins HP ties and double-KOs.
   - That creates a durable first-move advantage surface distinct from per-weapon handling.
   - This is weaker than hypothesis 1, but stronger than returning to more `doAction()` gating theories.

Alternative considered and ranked lower:

- Global "both sides always act each round" sequencing.
  - Existing `simultaneous_round` evidence is already negative.

## Smallest next diagnostic to test first

Recommended next diagnostic patch:

- add a round-loop-only toggle in `fightOnce()` and `fightOnceCalibFast()`
- scope: baseline round mode only
- idea: if the first actor kills the second actor, optionally still allow the second actor's already-queued round action to resolve from the start-of-turn HP snapshot
- side control: `attacker | defender | both`

Why this is the smallest useful next test:

- it stays entirely in the round loop, not `doAction()`
- it directly targets the remaining suspect: death-check timing relative to the opponent's next action
- it is narrower than `simultaneous_round`, which already proved too broad
- it can be mirrored cleanly in brute parity blocks

In other words, the next diagnostic should test:

- "does the killed side still get this round's queued action?"

not:

- "do both sides always act every round no matter what?"

## More truth data?

Recommendation: gather more truth data later, not now.

Reason:

- the current 3-defender set already separates the target from two useful controls
- the existing broad round diagnostic produced a clear negative result
- the next uncertainty is about a narrower sequencing rule, not lack of calibration coverage

If the next narrow round diagnostic shows mixed or ambiguous signal, then targeted extra truth around equal-speed and near-simultaneous-lethal lanes would become useful.

## Recommendation

Recommendation: `NEXT: round-sequencing diagnostic patch`

Not:

- `NEXT: gather targeted extra truth`
- `NEXT: change suspect subsystem again`

Why:

- round sequencing is now the best remaining suspect bucket
- the broad existing round variant is already available and already looks too broad
- the clean next move is a much smaller, side-scoped queued-second-action diagnostic in `fightOnce()` and `fightOnceCalibFast()`
