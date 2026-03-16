# Compiled Stats Diagnosis

Tracked source edits in this pass: none.

I did **not** add `LEGACY_DIAG_COMPILE_BREAKDOWN=1`.

Reason:

- The existing replay-debug path already exports the needed compile breakdown through `debugAudit.compiledCombatSnapshot` and `debugStatBreakdown` when `LEGACY_REPLAY_DEBUG_IDENTITY=1` is enabled.
- That path preserves the exact replay defender payload by writing a temp defender file and running the canonical sim against it.

## Exact Commands Run

Code inspection:

```bash
sed -n '2586,3898p' ./legacy-sim-v1.0.4-clean.js
sed -n '2446,2585p' ./legacy-sim-v1.0.4-clean.js
sed -n '1840,1888p' ./legacy-sim-v1.0.4-clean.js
sed -n '3326,3385p' ./legacy-sim-v1.0.4-clean.js
sed -n '3336,3525p' ./brute-sim-v1.4.6.js
sed -n '1810,2705p' ./brute-sim-v1.4.6.js
sed -n '3207,3238p' ./brute-sim-v1.4.6.js
rg -n "compileCombatantFromParts|buildCompiledCombatSnapshot|applyAttackStyle|attackStyleSummary|hiddenPreset|computeVariantFromCrystalSpec|normalizeResolvedBuildWeaponUpgrades|resolveDefenderAttackType|compileDefender|compileAttacker|LEGACY_DEFENDER_ATTACK_TYPE" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
rg -n "'Rift Gun'|'Dark Legion Armor'|'Bio Spinal Enhancer'|'Scout Drones'|'Scythe T2'|'Double Barrel Sniper Rifle'|'Reaper Axe'" ./legacy-sim-v1.0.4-clean.js
```

Required 200k baseline compare:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair' LEGACY_REPLAY_TAG='codex-compiled-baseline-3def' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-compiled-baseline-3def.log 2>&1
```

Focused replay-debug runs for compile/state inspection:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=100 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-compiled-debug-dual-rift' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-compiled-debug-dual-rift.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=100 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' LEGACY_REPLAY_TAG='codex-compiled-debug-gun-sniper' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Gun Sniper Mix' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-compiled-debug-gun-sniper.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=100 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair' LEGACY_REPLAY_TAG='codex-compiled-debug-hf-scythe' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|HF Scythe Pair' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-compiled-debug-hf-scythe.log 2>&1
```

One-off extraction checks against the saved replay JSON:

- Used `node - <<'NODE' ... NODE` to read `requestedPageBuilds`, `verifiedPageBuilds`, `resolvedBuilds`, `debugAudit.compiledCombatSnapshot`, and `debugStatBreakdown.slotContributions`.
- Used a short `node - <<'NODE' ... NODE` arithmetic check to confirm that `LEGACY_STAT_ROUND=ceil` makes `Dark Legion Armor + Abyss x4` produce `+97` speed, not `+96`.

## Functions / Blocks Inspected

- [legacy-sim-v1.0.4-clean.js:1840](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L1840) `applyAttackStyle()`
- [legacy-sim-v1.0.4-clean.js:2446](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2446) `computeVariantFromCrystalSpec()`
- [legacy-sim-v1.0.4-clean.js:2586](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2586) `compileCombatantFromParts()`
- [legacy-sim-v1.0.4-clean.js:2712](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2712) `applyHiddenRoleBonuses()`
- [legacy-sim-v1.0.4-clean.js:3335](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3335) `resolveDefenderAttackType()`
- [legacy-sim-v1.0.4-clean.js:3877](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L3877) `buildCompiledCombatSnapshot()`
- [tools/legacy-truth-replay-compare.js:2460](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js#L2460) replay temp defender file + canonical sim spawn
- [brute-sim-v1.4.6.js:2317](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L2317) `applyAttackStyle()`
- [brute-sim-v1.4.6.js:2620](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L2620) `computeVariantFromCrystalSpec()`
- [brute-sim-v1.4.6.js:3211](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L3211) `applyHiddenRoleBonuses()`
- [brute-sim-v1.4.6.js:3336](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L3336) `compileDefender()`
- [brute-sim-v1.4.6.js:3424](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L3424) `compileAttacker()`
- [brute-sim-v1.4.6.js:2128](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L2128) brute caveat: defender attack type env is intentionally ignored

## Baseline 200k Result

| Defender | Truth win% | Sim win% | dWin% | dAvgTurns |
| --- | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 49.60 | 55.93 | +6.33 | +0.0503 |
| DL Gun Sniper Mix | 65.85 | 65.86 | +0.01 | +0.0559 |
| HF Scythe Pair | 66.42 | 65.46 | -0.96 | +0.0110 |

## Replay Input vs Resolved Build Drift

Observed on all 3 debug rows:

- `buildVerified=true`
- `identityMatch=true`
- requested page build names match verified page build names
- verified page build names match resolved internal build names
- requested/verified/resolved attack types all stay `normal`

What changes between page build and resolved internal build:

- only crystal representation gets canonicalized into `crystalSpec` / `crystalSpecShort`
- weapon/misc `upgrades[]` in the page JSON are being used as crystal-slot lists for replay normalization, then converted into canonical crystal specs like `A3+F`, `P2+G2`, `B4`

I did not find a defender-item or attack-type drift in the replay bridge for these 3 matchups.

## Per-Matchup Compile Comparison

Attacker is the same requested/resolved build in all 3 matchups:

- page build: `SG1 Armor`, `Reaper Axe`, `Crystal Maul`, `Bio Spinal Enhancer`, `Bio Spinal Enhancer`, attackType `normal`
- compiled base/effective under current rules:
  - speed `190`
  - accuracy `194`
  - dodge `134`
  - melee skill `769`
  - defSkill `856`
  - armor `75`
- no hidden bonus delta
- no attack-style delta

The attacker’s post-compile weapon ranges vary by matchup because `buildCompiledCombatSnapshot()` reports target-relative post-armor ranges.

| Matchup | Side | Key page facts | Key compiled facts |
| --- | --- | --- | --- |
| DL Dual Rift Bio | Attacker | Base stats `60 spd / 14 acc / 57 dodge`; `Reaper Axe + Crystal Maul`; `Bio P4 + Bio O4`; `normal` | `190 spd / 194 acc / 134 dodge / 769 mel / 856 def / 75 armor`; ranges vs target `86-110` and `100-110` |
| DL Dual Rift Bio | Defender | Base stats `60 spd / 14 acc / 14 dodge`; `Dark Legion Armor B4`; `Rift Gun A3+F`; `Rift Gun A4`; `Bio P4 + Bio P4`; `normal` | `257 spd / 229 acc / 123 dodge / 822 gun / 814 def / 83 armor`; ranges `63-69` and `61-66` |
| DL Gun Sniper Mix | Attacker | Same requested/resolved build as above | Same compiled core stats; ranges vs target `87-111` and `101-112` |
| DL Gun Sniper Mix | Defender | Base stats `60 spd / 14 acc / 14 dodge`; `Dark Legion Armor B4`; `Rift Gun A4`; `Double Barrel Sniper Rifle F4`; `Scout Drones A3+P`; `Bio P2+G2`; `normal` | `207 spd / 260 acc / 127 dodge / 712 gun / 678 def / 83 armor`; ranges `61-66` and `108-120` |
| HF Scythe Pair | Attacker | Same requested/resolved build as above | Same compiled core stats; ranges vs target `75-95` and `87-96` |
| HF Scythe Pair | Defender | Base stats `60 spd / 14 acc / 14 dodge`; `Hellforged Armor B4`; `Scythe T2 A4`; `Scythe T2 A3+F`; `Scout Drones O4`; `Bio O4`; `normal` | `293 spd / 153 acc / 97 dodge / 835 mel / 667 def / 155 armor`; ranges `82-103` and `84-106` |

## DL Dual Rift Bio: Where `257` Speed Comes From

Under the current compile rules, the defender speed is:

- base speed: `60`
- `Dark Legion Armor[B4]`: `+97`
- `Rift Gun[A3+F]`: `+50`
- `Rift Gun[A4]`: `+50`
- `Bio P4`: `+0`
- `Bio P4`: `+0`
- hidden delta: `+0`
- style delta: `+0`

Total: `60 + 97 + 50 + 50 = 257`

Why the armor contributes `+97`:

- `Dark Legion Armor` base speed is `65`
- `Abyss Crystal` grants `+10% speed`
- current stat rules are `LEGACY_CRYSTAL_STACK_STATS=iter4` and `LEGACY_STAT_ROUND=ceil`
- with iterative `ceil` rounding: `65 -> 72 -> 80 -> 88 -> 97`

So the `257` is numerically correct under the current rules. I do **not** see a hidden bonus or replay-normalization bug producing it.

## Does Dual Rift’s Compiled Speed Look Correct Under Current Rules?

Yes, internally.

I do not see a bad sum or an unexplained source inside the sim:

- the requested page build matches the resolved replay build
- the resolved replay build matches the compiled slot inputs
- the compiled slot contributions add up cleanly
- hidden/state/style deltas are all zero here

What remains uncertain is external correctness:

- whether the game really uses the same crystal stat stacking mode
- whether `ceil` is the correct stat-rounding rule for this replay source
- whether the item definitions themselves are perfectly matched to the game

That is now the higher-value uncertainty, not an internal arithmetic inconsistency.

## Do the Controls Look Sane by Comparison?

Yes.

`DL Gun Sniper Mix`:

- defender speed `207` is exactly the expected shape for `60 + 97 armor + 50 Rift Gun`
- the sniper rifle contributes no speed, which cleanly explains why this lane is much slower than Dual Rift
- other compiled values also reconcile numerically with the slot breakdown

`HF Scythe Pair`:

- defender speed `293` is also internally clean: `60 + 83 Hellforged + 75 + 75`
- the extreme speed comes from two fast melee weapons plus fast armor, not from a normalization anomaly
- armor `155` and melee `835` also look consistent with the requested build and current item/crystal rules

So the controls do **not** show a special compile-path anomaly that makes Dual Rift stand out as malformed. Dual Rift mainly stands out because its compiled stat profile is very different from its page-base `60 speed` surface impression.

## Legacy / Brute Parity on Compile Path

Core compile math appears aligned:

- same sum-of-parts formulas for speed / acc / dodge / skills / armor
- same mixed-weapon rule: only each weapon’s own offensive skill contribution gets doubled
- same hidden-bonus ordering: after raw stat sum, before attack style
- same attack-style ordering: after hidden bonuses
- same variant/crystal/upgrades pipeline shape in `computeVariantFromCrystalSpec()`

Important caveat:

- brute intentionally ignores `LEGACY_DEFENDER_ATTACK_TYPE`
- legacy uses defender payload attack type unless overridden
- for this 3-defender set, that caveat is inactive because all 3 defenders are `normal`

So for this specific diagnosis, compile/state parity looks good enough.

## Hypothesis Ranking

1. `H1: compiled stat formation / normalization is the main mismatch`

- Strongest remaining suspect.
- Not because I found a bad sum inside the sim.
- Because the mismatch signal now points upstream: the compiled state materially shapes initiative and combat surfaces, and many downstream combat-sequencing hypotheses have already come back negative.
- The likely risk is in compile rules vs external truth, not in internal addition order.

2. `H2: compiled stats are fine; mismatch is still downstream combat logic`

- Still possible, but weaker now.
- The compile outputs are doing a lot of work here, especially on speed and defender stat surfaces.
- Multiple downstream micro-diagnostics have already failed to move the target materially.

3. `H3: replay payload normalization for defender builds is drifting`

- Weakest for this 3-defender set.
- Requested, verified, and resolved builds line up cleanly.
- Identity also matched in all 3 replay-debug rows.

## Recommendation

Recommendation: `GATHER TARGETED EXTRA TRUTH`

Not:

- `PATCH NOW`
- `ONE LAST MICRO-DIAGNOSTIC`
- `CHANGE SUSPECT SUBSYSTEM`

Why:

- I did not find an internal compile arithmetic bug to patch.
- The compile pipeline is internally consistent and parity-aligned enough for this subset.
- The unresolved question is external correctness of the compile rules themselves.

Most useful next truth to gather:

- one in-game resolved-stat snapshot for `CUSTOM vs DL Dual Rift Bio` showing effective speed / accuracy / dodge / skill / armor if the UI exposes it
- or, if resolved stats are not visible, a narrower in-game truth probe around initiative / displayed combat stats for the same 3 defenders
- specifically enough to validate:
  - crystal stat stacking mode
  - stat rounding mode
  - defender item/stat definitions for `Dark Legion Armor`, `Rift Gun`, `Hellforged Armor`, `Scythe T2`, `Scout Drones`, and `Bio Spinal Enhancer`

If later evidence proves the external compile rules differ, the smallest likely patch target would be in:

- [legacy-sim-v1.0.4-clean.js:2446](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2446) `computeVariantFromCrystalSpec()`
- [legacy-sim-v1.0.4-clean.js:2586](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js#L2586) `compileCombatantFromParts()`
- with matching parity review in [brute-sim-v1.4.6.js:2620](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L2620), [brute-sim-v1.4.6.js:3336](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L3336), and [brute-sim-v1.4.6.js:3424](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js#L3424)

But I do **not** recommend patching yet.
