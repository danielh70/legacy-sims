# Shared-skill diagnosis: CUSTOM vs Dual Rift Bio vs Gun Sniper Mix

Tracked source edits in this pass: none.

## What the current shared-skill logic does

In [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4097), `doAction()` enables a per-action shared skill cache when:

- the acting side has both `w1` and `w2`
- `att.w1.skill === att.w2.skill`
- `sharedSkillMode === same_type`, or `sharedSkillMode === gun_same_type && skillCode === 0`

The cached roll is then consumed in [`attemptWeapon()`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3997) for any weapon whose `weapon.skill` matches that cached `sharedSkillSkillCode`.

Important details:

- The key is numeric skill code only, not exact weapon identity.
- Skill code mapping is broad class only: `gunSkill -> 0`, `meleeSkill -> 1`, `projSkill -> 2` in [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2230).
- Because `doAction()` is called for both sides each turn in [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4375), shared-skill is currently global/symmetric by side.
- `actionStopOnKill` is a separate gate after weapon 1 resolves in [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4160). It does not control shared-skill eligibility.

The fast path in [`brute-sim-v1.4.6.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1333) is materially the same by inspection:

- same eligibility gate in `doActionFast()`
- same cached reuse in `attemptWeaponFast()`
- same stop-on-kill guard
- same symmetric application because `doActionFast()` is called for both sides in [`brute-sim-v1.4.6.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1415)

I did not find a substantive parity difference in the inspected shared-skill blocks.

## Why one matchup improved and the control broke

The attacker is identical in both matchups:

- attacker: `Reaper Axe + Crystal Maul` = melee/melee

The defender changes:

- `DL Dual Rift Bio`: `Rift Gun + Rift Gun` = gun/gun, exact same weapon
- `DL Gun Sniper Mix`: `Rift Gun + Double Barrel Sniper Rifle` = gun/gun, mixed exact weapons

Current logic treats both defender pairs as eligible for the same shared gun skill roll because both weapons map to skill code `0`. It also treats the attacker as eligible because both melee weapons map to skill code `1`.

That gives two separable effects:

| Matchup | `SHARED_HIT=1, SHARED_SKILL=none, STOP=1` | `gun_same_type` | `same_type` | defender-only shift (`none -> gun_same_type`) | attacker-added shift (`gun_same_type -> same_type`) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM vs DL Dual Rift Bio` | `+6.38` | `+7.63` | `+2.99` | `+1.25` | `-4.64` |
| `CUSTOM vs DL Gun Sniper Mix` | `+0.12` | `-5.29` | `-9.23` | `-5.41` | `-3.94` |

Values above are win% deltas vs truth.

Interpretation:

- On `DL Gun Sniper Mix`, the control is already nearly correct with no shared skill: `+0.12`.
- Enabling `gun_same_type` alone breaks the control to `-5.29`.
- Therefore defender gun/gun shared-skill is already strongly harmful in that control, before attacker melee sharing is added.
- Enabling `same_type` adds attacker melee sharing and pushes the control further to `-9.23`.

For `DL Dual Rift Bio`:

- defender gun/gun shared-skill alone is mildly harmful (`+6.38 -> +7.63`)
- attacker melee shared-skill more than offsets that harm (`+7.63 -> +2.99`)

So `same_type` helped the target because it bundled:

1. one harmful effect: defender gun/gun sharing
2. one helpful effect: attacker melee/melee sharing

The same bundle broke the control because both effects moved the control the wrong way there, especially the defender gun/gun piece.

## Minimal proof commands run in this pass

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' \
LEGACY_REPLAY_TAG='codex-control-gun-sniper-shared-none-stop-1' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='gun_same_type' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' \
LEGACY_REPLAY_TAG='codex-control-gun-sniper-shared-gun-same-type-stop-1' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' \
LEGACY_REPLAY_TAG='codex-control-gun-sniper-debug-same-type' \
LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' \
LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=5 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 \
LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js > ./tmp/codex-control-gun-sniper-debug-same-type.log 2>&1
```

## What the control debug log proves

[`tmp/codex-control-gun-sniper-debug-same-type.log`](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-control-gun-sniper-debug-same-type.log) shows:

- defender shared gun skill on a mixed exact pair:
  - `RD SKILL_SHARED ... D->A`
  - `RD HIT_USED_SHARED ... w1(Rift Gun)`
  - `RD HIT_USED_SHARED ... w2(Double Barrel Sniper Rifle)`
- attacker shared melee skill on `Reaper Axe + Crystal Maul` in the same fight:
  - `RD SKILL_SHARED ... A->D(ret)`
  - `RD HIT_USED_SHARED ... w1(Reaper Axe)`
  - `RD HIT_USED_SHARED ... w2(Crystal Maul)`

That is direct evidence that current `same_type` behavior is:

- global by side
- keyed by broad skill class
- not keyed by exact weapon identity

## Ranked root-cause hypotheses

### 1. Most likely: shared-skill eligibility is too coarse

Current eligibility is only `w1.skill === w2.skill`, which collapses very different pairs into one rule:

- identical gun pair: `Rift Gun + Rift Gun`
- mixed gun pair: `Rift Gun + Double Barrel Sniper Rifle`
- mixed melee pair: `Reaper Axe + Crystal Maul`

The replay evidence says those pair types do not behave like one interchangeable category against truth. This is the strongest hypothesis.

### 2. Less likely: the real fix is purely side-specific

Pure side asymmetry does not explain the evidence cleanly.

- defender-only `gun_same_type` already causes a large control regression
- attacker-added `same_type` then moves the control even further
- both sides matter, not just one side

A side-specific rule might still be part of the end state, but it is not the cleanest first explanation.

### 3. Weak: stop-on-kill or replay identity is the main cause

This is not supported.

- prior pass showed `stop_on_kill` only moved the target slightly
- identity matched in all inspected debug runs
- the new control split is explained without invoking either of those

## Best future patch target

If a patch becomes justified later, inspect these exact blocks first:

- legacy shared-skill eligibility/cache setup:
  - [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4097)
- legacy shared-skill consumption:
  - [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3997)
- legacy stop-on-kill gate, only as a secondary check:
  - [`legacy-sim-v1.0.4-clean.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L4160)
- brute parity mirror:
  - [`brute-sim-v1.4.6.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1275)
  - [`brute-sim-v1.4.6.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1333)
  - [`brute-sim-v1.4.6.js`](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L1351)

If I were narrowing to one first patch block, it would be the eligibility block in `legacy-sim doAction()` and the parity mirror in `brute-sim doActionFast()`, because that is where the current broad `same skill code` rule is decided.

## What kind of future fix is most likely

Most likely end-state category: `C) a weapon-family/pair-specific rule`.

Reason:

- `A) global rule change` is contradicted by the control: global `same_type` is clearly too broad.
- `B) side-specific rule` is not enough by itself; both attacker and defender contributions are visible in the replay split.
- `C)` best matches the code and evidence: the current key is too broad, and the bad control case is specifically a mixed exact gun pair that gets treated the same as all other gun/gun pairs.

Operational recommendation for the next pass: treat it like `D) more instrumentation needed` before changing behavior, because the data is strong enough to reject the current global gate but not yet strong enough to prove the exact replacement gate.

## Patch recommendation

I do not recommend a behavior patch in the next pass yet.

Why not:

- the evidence is strong that the current shared-skill gate is too broad
- the evidence is not yet strong enough to choose the replacement rule safely
- likely candidates still differ materially:
  - exclude mixed gun pairs only
  - exclude all defender gun/gun sharing
  - restrict by exact weapon identity
  - restrict by a narrower allowlist of pair compositions

The smallest safe next step is instrumentation or env-test support that can isolate:

- attacker-only shared skill
- defender-only shared skill
- exact-weapon vs broad-skill eligibility

without changing the combat formulas yet.
