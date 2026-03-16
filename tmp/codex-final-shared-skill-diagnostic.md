# Final shared-skill diagnosis

Tracked source edits in this pass: none.

Temporary helper created: [tmp/parse_final_shared_skill_diag.py](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/parse_final_shared_skill_diag.py)

## Exact commands run

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-final-diag-caseA-baseline-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-caseA-baseline-3def.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TRIALS=50000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-final-diag-caseB-att-broad-def-off-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-caseB-att-broad-def-off-3def.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseA-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseA-dual-rift.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseA-gun-sniper' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseA-gun-sniper.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseA-hf-scythe' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseA-hf-scythe.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseB-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseB-dual-rift.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseB-gun-sniper' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseB-gun-sniper.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TRIALS=300 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair' LEGACY_REPLAY_TAG='codex-final-diag-debug-caseB-hf-scythe' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=3 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=14 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1800 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-diag-debug-caseB-hf-scythe.log 2>&1
python3 ./tmp/parse_final_shared_skill_diag.py ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-diag-caseA-baseline-3def--2026-03-14T23-26-51-829Z.json ./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-diag-caseB-att-broad-def-off-3def--2026-03-14T23-26-51-831Z.json ./tmp/codex-final-diag-debug-caseA-dual-rift.log ./tmp/codex-final-diag-debug-caseA-gun-sniper.log ./tmp/codex-final-diag-debug-caseA-hf-scythe.log ./tmp/codex-final-diag-debug-caseB-dual-rift.log ./tmp/codex-final-diag-debug-caseB-gun-sniper.log ./tmp/codex-final-diag-debug-caseB-hf-scythe.log > ./tmp/codex-final-shared-skill-diagnostic-data.json
```

## Summary numbers

| Defender | Truth win% | Baseline dWin% | Attacker-broad dWin% | Change in dWin% |
| --- | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | +6.45 | +0.98 | -5.47 |
| DL Gun Sniper Mix | 65.85 | +0.12 | -5.44 | -5.56 |
| HF Scythe Pair | 66.42 | -0.87 | -5.26 | -4.39 |

## What attacker-only broad actually changed

Common across all three defenders:

- Attacker-side shared skill was genuinely active only in case B: baseline had `0` attacker `RD SKILL_SHARED` lines in dumped fights; case B had `25` for Dual Rift, `22` for Gun Sniper, `21` for HF Scythe. Defender-side shared skill stayed `0`.
- This did **not** materially change attacker hit correlation. `LEGACY_SHARED_HIT=1` already locked same-turn hit linkage in both cases. Attacker both-hit turn rate only moved:
  - Dual Rift `0.807 -> 0.805`
  - Gun Sniper `0.775 -> 0.788`
  - HF Scythe `0.892 -> 0.893`
- The big mechanical shift was skill correlation plus kill allocation:
  - attacker skill-success gap collapsed to `0` in case B for all three
  - attacker `w2OnDead / attackerKill` jumped from `0.24-0.28` to `0.91-0.96`
  - attacker kills shifted from roughly split `w1/w2` to overwhelmingly `w1`-driven
- Attacker throughput fell, not rose. Attacker applied damage per turn dropped in all three debug runs:
  - Dual Rift `70.13 -> 65.20`
  - Gun Sniper `86.03 -> 85.01`
  - HF Scythe `85.99 -> 82.91`
- Normal 50k replays also got longer in all three matchups:
  - Dual Rift `dAvgTurns +0.0559 -> +0.2343`
  - Gun Sniper `+0.0582 -> +0.3147`
  - HF Scythe `+0.0121 -> +0.2542`

Per matchup:

- `DL Dual Rift Bio`: case B helps because baseline is too attacker-favored. The shared-skill rule is acting like an attacker nerf here: more front-loaded `w1` lethals, much more dead-target `w2`, lower attacker damage/turn, longer fights. That happens to move this lane toward truth.
- `DL Gun Sniper Mix`: the same attacker nerf pushes an already-near-correct baseline badly below truth. Mechanically it is the same pattern as Dual Rift, not a different one.
- `HF Scythe Pair`: same story as Gun Sniper. Case B again increases wasted second-weapon behavior and fight length, and the result moves further away from truth.

## Direct answer

Attacker-side broad shared-skill does **not** look like the true missing mechanic.

It looks much more like a compensating proxy for another combat-resolution issue in the Dual Rift lane, because:

- the same mechanical change appears across all three defenders
- that change mostly weakens attacker output rather than adding a missing attacker advantage
- it only improves the one matchup where baseline is already too attacker-favored
- it harms the two controls where baseline is already near truth

The strongest evidence is that case B mainly changes **skill correlation / kill sequencing / wasted second-weapon behavior**, not hit correlation.

## Hypothesis ranking

1. `B)` shared-skill is compensating for some other turn-resolution / correlation issue.
2. `A)` a real attacker-side mixed-melee shared-skill rule is missing.
3. `C)` neither; the main bug is elsewhere.

Why `B` ranks first:

- case B behaves like a broad attacker dampener across all three defenders
- the dampener is only useful where the sim currently overstates attacker wins
- that is the signature of compensation, not a broadly correct missing rule

## Recommendation

Recommendation: `ABANDON SHARED-SKILL AS PRIMARY FIX`

I do not recommend a real shared-skill behavior patch from this evidence.

If work continues, the next place to inspect is not shared-skill eligibility first. It is the mixed-melee action-resolution path that case B is crudely proxying:

- per-weapon skill outcome correlation vs independent resolution
- per-weapon applied-damage sequencing in `doAction()`
- kill attribution / `w2OnDead` behavior and resulting retaliation windows

