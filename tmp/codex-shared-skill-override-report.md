# Shared-skill override diagnostic report

Patch type: diagnostic-only, behavior-gated by new env vars. Default behavior is unchanged when both overrides stay `auto`.

## Code changes made

Changed files:

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)

Exact changes:

- Added new env vars with default `auto` in [legacy-sim-v1.0.4-clean.js:157](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L157) and parsed matching env vars in [brute-sim-v1.4.6.js:1124](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1124).
- Added a small shared-skill eligibility helper in [legacy-sim-v1.0.4-clean.js:1258](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1258) and the parity mirror in [brute-sim-v1.4.6.js:1232](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1232).
- Swapped the old inline eligibility gate for that helper in [legacy-sim-v1.0.4-clean.js:4139](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4139) and [brute-sim-v1.4.6.js:1370](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1370).
- Threaded the active override values into legacy config/debug metadata in [legacy-sim-v1.0.4-clean.js:5171](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5171) and [legacy-sim-v1.0.4-clean.js:5303](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L5303).

New env vars:

- `LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE`
- `LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE`

Allowed values:

- `auto`: preserve existing `LEGACY_SHARED_SKILL` behavior
- `off`: never shared-skill on that side
- `broad`: use the current broad skill-code rule on that side
- `exact`: require the current broad rule and exact compiled weapon name match on that side

Parity status:

- Touched parity-sensitive shared-skill eligibility blocks in both simulators.
- I mirrored the logic in the legacy and brute shared-skill eligibility/setup blocks.
- I syntax-checked both files with `node --check`.
- I did not run a separate brute optimizer replay verification, so parity was checked by code inspection plus mirrored implementation, not by runtime comparison.

## Commands run

Syntax checks:

```bash
node --check legacy-sim-v1.0.4-clean.js
node --check brute-sim-v1.4.6.js
```

Matrix commands:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TAG='codex-ssk-override-case1-baseline-none' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_REPLAY_TAG='codex-ssk-override-case2-same-type' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TAG='codex-ssk-override-case3-att-broad-def-off' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='off' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='broad' LEGACY_REPLAY_TAG='codex-ssk-override-case4-att-off-def-broad' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='exact' LEGACY_REPLAY_TAG='codex-ssk-override-case5-att-broad-def-exact' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='exact' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='exact' LEGACY_REPLAY_TAG='codex-ssk-override-case6-att-exact-def-exact' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix' LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=0 LEGACY_REPLAY_TAG='codex-ssk-override-case7-same-type-stop-0' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
```

Debug replays:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TAG='codex-ssk-override-debug-case1-baseline-none' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=5 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-ssk-override-debug-case1-baseline-none.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TAG='codex-ssk-override-debug-case3-att-broad-def-off' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=5 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-ssk-override-debug-case3-att-broad-def-off.log 2>&1
```

## Results

Truth reference:

- `CUSTOM vs DL Dual Rift Bio`: `winPct=49.60`, `avgTurns=11.3621`
- `CUSTOM vs DL Gun Sniper Mix`: `winPct=65.85`, `avgTurns=9.1649`

| Case | Settings | Dual Rift dWin% | Dual Rift dAvgT | Gun Sniper dWin% | Gun Sniper dAvgT |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | baseline `SHARED_SKILL=none` | +6.41 | +0.0554 | -0.08 | +0.0582 |
| 2 | current broad `same_type` | +2.83 | +0.1499 | -9.58 | -0.0068 |
| 3 | attacker `broad`, defender `off` | +1.03 | +0.2214 | -5.21 | +0.3119 |
| 4 | attacker `off`, defender `broad` | +7.47 | -0.0593 | -5.45 | -0.2587 |
| 5 | attacker `broad`, defender `exact` | +2.88 | +0.1520 | -5.31 | +0.3239 |
| 6 | attacker `exact`, defender `exact` | +7.32 | -0.0568 | +0.07 | +0.0591 |
| 7 | case 2 plus `STOP=0` | +2.83 | +0.1499 | -9.58 | -0.0068 |

Observations:

- Case 3 is the best improvement for `DL Dual Rift Bio`.
- Case 3 also has the best aggregate win% error across the two tested defenders (`meanAbsΔwin ≈ 3.12`), narrowly better than case 1 baseline (`≈ 3.25`).
- Case 7 exactly matched case 2, which confirms `LEGACY_ACTION_STOP_ON_KILL=0` was already the effective state there.
- Case 6 proves the new `exact` gate works: it keeps `DL Gun Sniper Mix` near baseline because `Rift Gun + Double Barrel Sniper Rifle` is not an exact match, but it also removes the helpful attacker-side mixed-melee sharing and loses the `DL Dual Rift Bio` improvement.

## Debug evidence

Baseline debug:

- [`tmp/codex-ssk-override-debug-case1-baseline-none.log`](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-ssk-override-debug-case1-baseline-none.log) contains no `RD SKILL_SHARED` lines.

Best candidate debug, case 3:

- [`tmp/codex-ssk-override-debug-case3-att-broad-def-off.log`](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-ssk-override-debug-case3-att-broad-def-off.log) contains `RD SKILL_SHARED ... A->D(ret)` lines for the attacker melee pair.
- The same log contains no `RD SKILL_SHARED ... D->A` lines for the defender.

That confirms the diagnostic patch is doing the intended side split:

- baseline = no shared skill
- case 3 = attacker-only broad shared skill

## Assessment

Which case best improves `DL Dual Rift Bio`:

- Case 3: `LEGACY_SHARED_SKILL=same_type`, `LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE=broad`, `LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE=off`
- Result: `dWin% +1.03`, improved from baseline `+6.41`

Does that same case keep `DL Gun Sniper Mix` acceptably close:

- No.
- Control moved from baseline `-0.08` to `-5.21` win% and `+0.3119` avgTurns.
- That is materially worse than the baseline control and not acceptable as a final rule from only these two defenders.

Does the evidence now support a real behavior patch:

- Not yet.
- The patch matrix now strongly supports attacker-only broad sharing as the main reason `DL Dual Rift Bio` improved.
- But none of the tested rules both fixes `DL Dual Rift Bio` and keeps `DL Gun Sniper Mix` close to truth.

If forced to choose the smallest tested final rule anyway:

- Case 3 is the smallest tested rule with the best target improvement.
- I do not recommend applying it yet.

Likely final-rule location:

- Yes. The likely future behavior change belongs only in the shared-skill eligibility/setup blocks touched here:
  - legacy `resolveSharedSkillEligibility()` / `doAction()`
  - brute `resolveSharedSkillEligibility()` / `doActionFast()`
- Current evidence does not point to hit-roll, damage-roll, armor, or stop-on-kill blocks.

Most likely end-state shape:

- Side-specific first, then possibly pair-specific on top.
- The current matrix says attacker broad sharing helps the target, defender broad sharing hurts both tested defenders, and exact matching alone is too restrictive for the attacker mixed-melee pair.

## Recommendation

Recommended next step: `B) do one more tiny diagnostic step`

Why:

- The new diagnostic patch isolated the main effect cleanly.
- The remaining uncertainty is not whether shared-skill matters; it does.
- The remaining uncertainty is whether attacker-only broad sharing generalizes beyond this one attacker / two-defender slice.

Smallest next diagnostic I would run:

- Reuse the new overrides without further code edits.
- Compare case 1 baseline vs case 3 attacker-broad/defender-off on a slightly wider curated defender mini-set.
- If that broader spot-check holds, then a real behavior patch becomes justified.
