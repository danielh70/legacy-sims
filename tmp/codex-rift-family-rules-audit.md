# Rift/Core/Bio Rules Audit

Tracked source edits in this pass: none.

## Exact Files / Functions Inspected

- `./data/legacy-defs.js`
  - `CrystalDefs`: `Abyss Crystal`, `Perfect Pink Crystal`, `Perfect Orange Crystal`, `Amulet Crystal`, `Perfect Fire Crystal`
  - `ItemDefs`: `SG1 Armor`, `Dark Legion Armor`, `Hellforged Armor`, `Crystal Maul`, `Core Staff`, `Scythe T2`, `Reaper Axe`, `Rift Gun`, `Double Barrel Sniper Rifle`, `Bio Spinal Enhancer`, `Scout Drones`
- `./legacy-defs.js`
  - wrapper export to `./data/legacy-defs.js`
- `./legacy-sim-v1.0.4-clean.js`
  - `mixedWeaponMultsFromWeaponSkill()`
  - `getEffectiveCrystalPct()`
  - `computeVariantFromCrystalSpec()`
  - `compileCombatantFromParts()`
  - `buildCompiledCombatSnapshot()`
- `./brute-sim-v1.4.6.js`
  - `mixedWeaponMultsFromWeaponSkill()`
  - `getEffectiveCrystalPct()`
  - `computeVariantFromCrystalSpec()`
  - `compileDefender()`
  - `compileAttacker()`

## Exact Commands Run

```bash
sed -n '1,220p' ./tmp/codex-compiled-stats-diagnosis.md
sed -n '1,140p' ./legacy-defs.js
sed -n '1,240p' ./data/legacy-defs.js
sed -n '2446,2705p' ./legacy-sim-v1.0.4-clean.js
sed -n '1898,1975p' ./legacy-sim-v1.0.4-clean.js
sed -n '1498,1538p' ./legacy-sim-v1.0.4-clean.js
sed -n '3336,3498p' ./brute-sim-v1.4.6.js
sed -n '2187,2255p' ./brute-sim-v1.4.6.js
sed -n '1608,1648p' ./brute-sim-v1.4.6.js
rg -n "Rift Gun|Core Staff|Bio Spinal Enhancer|Reaper Axe|Crystal Maul|SG1 Armor|Dark Legion Armor|Hellforged Armor|Amulet Crystal|Perfect Fire Crystal|Perfect Pink Crystal|Perfect Orange Crystal|Abyss Crystal|Scout Drones|Double Barrel Sniper Rifle|Scythe T2" ./legacy-defs.js ./data/legacy-defs.js
rg -n "compileCombatantFromParts|buildCompiledCombatSnapshot|getEffectiveCrystalPct|computeVariantFromCrystalSpec|applyAttackStyle|resolveDefenderAttackType|compileDefender|compileAttacker|applyHiddenRoleBonuses|mixedWeaponMultsFromWeaponSkill" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
node - <<'NODE' ... NODE
```

One focused replay-debug to surface `DL Core/Rift Bio` compiled breakdown:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=50 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Core/Rift Bio' LEGACY_REPLAY_TAG='codex-rift-family-core-rift-debug' LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Core/Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=0 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=0 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-rift-family-core-rift-debug.log 2>&1
```

## Compact Side-by-Side

| Defender | Truth win% | dWin% | Build family | Key compiled defender facts |
| --- | ---: | ---: | --- | --- |
| DL Dual Rift Bio | 50.12 | +5.81 | `Dark Legion[B4] + Rift[A3+F] + Rift[A4] + Bio[P4] + Bio[P4]` | `257 spd / 229 acc / 123 dodge / 814 def / 822 gun / 83 armor` |
| DL Core/Rift Bio | 43.81 | +3.85 | `Dark Legion[B4] + Core[A4] + Rift[A4] + Bio[P4] + Bio[P4]` | `282 spd / 198 acc / 123 dodge / 881 def / 906 mel / 834 gun / 83 armor` |
| DL Gun Sniper Mix | 65.24 | +0.62 | `Dark Legion[B4] + Rift[A4] + Sniper[F4] + Scout[A3+P] + Bio[P2+G2]` | `207 spd / 260 acc / 127 dodge / 678 def / 712 gun / 83 armor` |
| HF Scythe Pair | 65.97 | -0.51 | `Hellforged[B4] + Scythe[A4] + Scythe[A3+F] + Scout[O4] + Bio[O4]` | `293 spd / 153 acc / 97 dodge / 667 def / 835 mel / 155 armor` |

## Exact Differences That Stand Out

1. The two bad defenders share one exact composition feature that neither control shares:
   - `Dark Legion Armor[B4]`
   - `Bio Spinal Enhancer[P4]`
   - `Bio Spinal Enhancer[P4]`

2. Standalone `Dark Legion Armor[B4]` is not enough to explain the problem.
   - `DL Gun Sniper Mix` also uses `Dark Legion Armor[B4]` and stays close at `+0.62 dWin`.

3. Standalone `Rift Gun` is not enough to explain the problem.
   - `DL Gun Sniper Mix` also uses `Rift Gun[A4]` and stays close.

4. `Core Staff` cannot explain both bad lanes by itself.
   - It appears only in `DL Core/Rift Bio`, not `DL Dual Rift Bio`.

5. The suspect lanes get much larger misc-derived defensive stacking than the controls.
   - `DL Dual Rift Bio`: misc `defSkill +272`, misc `gunSkill +130`, misc `meleeSkill +130`
   - `DL Core/Rift Bio`: same misc totals
   - `DL Gun Sniper Mix`: misc `defSkill +144`
   - `HF Scythe Pair`: misc `defSkill +95`

6. `DL Core/Rift Bio` also triggers the mixed-weapon multiplier.
   - `mixedWeaponMultsFromWeaponSkill()` returns `[2,2]` for melee+gun.
   - That doubles only each weapon's own offensive skill contribution.
   - Resulting defender adds include `Core Staff melee +326` and `Rift Gun gun +254`.
   - This is parity-aligned and only affects the Core/Rift lane, not Dual Rift.

7. The suspect lanes do **not** show a clean single-item damage-definition failure.
   - `DL Dual Rift Bio` truth vs sim per-weapon damage stays close: defender `47/47` truth vs `46.84/46.86` sim.
   - `DL Core/Rift Bio` defender `54/48` truth vs `54.68/47.95` sim.
   - That weakens a simple `Rift Gun` or `Core Staff` base-damage patch theory.

## Current Rule Picture

What the compile/rule layer currently does:

- `Abyss Crystal` applies `% armor`, `% dodge`, `% speed`, `% defSkill`.
- Stat stacking uses iterative 4-slot compounding with `ceil` rounding.
- `Amulet Crystal` applies `% accuracy`, `% damage`, `% offensive skill`, `% defSkill`.
- `Bio Spinal Enhancer` is just a normal misc with flat all-skill + def stats.
- There is no active built-in special rule for:
  - `Rift Gun + Rift Gun`
  - `Core Staff + Rift Gun`
  - duplicate `Bio Spinal Enhancer`
- The only family-sensitive compile rule I found is the universal mixed-weapon multiplier in `mixedWeaponMultsFromWeaponSkill()`.

One notable dormant hook already exists:

- `getEffectiveCrystalPct()` in both sims has opt-in misc crystal skill suppression logic, including a slot-2 path.
- It is fully inactive here because `LEGACY_MISC_NO_CRYSTAL_SKILL*` envs are blank.
- This is infrastructure, not evidence that the correct live rule is “suppress Bio crystal skill”.

## Are Any Definitions Suspicious Side-by-Side?

No single definition looks internally malformed.

What looks suspicious is the composition pattern, not one bad number:

- `DL Dual Rift Bio` and `DL Core/Rift Bio` are the only checked lanes with `double Bio[P4]`.
- `DL Gun Sniper Mix` shows that `Dark Legion[B4] + Rift Gun` can already match truth reasonably well.
- `HF Scythe Pair` shows the compile path also handles a very different high-speed melee family reasonably well.

So the evidence does **not** support a broad patch to:

- `Abyss Crystal`
- `Dark Legion Armor`
- `Rift Gun`
- `Core Staff`

as standalone global defs.

## Legacy / Brute Parity In These Rule Paths

For the inspected compile/rule paths, parity looks aligned enough:

- same `mixedWeaponMultsFromWeaponSkill()` behavior
- same misc crystal gating structure in `getEffectiveCrystalPct()`
- same crystal stacking / rounding shape in `computeVariantFromCrystalSpec()`
- same sum-of-parts compile formulas in `compileCombatantFromParts()` vs `compileDefender()/compileAttacker()`

Known caveat:

- brute still hard-locks defender attack type separately
- inactive here because all four checked defenders are `normal`

## Ranked Patch Candidates

1. Narrow duplicate-`Bio Spinal Enhancer` rule in compile/state formation
   - Best fit to locality.
   - Explains both bad lanes and neither control.
   - Smallest plausible patch target would be a narrow rule in compile-time misc handling, not a global item-def rewrite.
   - Best first inspection points if forced:
     - `./legacy-sim-v1.0.4-clean.js` `compileCombatantFromParts()`
     - `./brute-sim-v1.4.6.js` `compileDefender()` / `compileAttacker()`
   - Current blocker: there is no direct proof yet for what the missing duplicate-Bio rule should be.

2. Narrow `Bio` crystal interaction rule, especially `Bio[P4]` on duplicated misc slots
   - Also fits both bad lanes better than the controls.
   - Existing `getEffectiveCrystalPct()` plumbing makes this the smallest implementation surface if future evidence supports it.
   - But the direction is uncertain: the current mismatch is attacker-favored, so a live patch would need to make these defenders stronger, not weaker.

3. `Core Staff + Rift Gun` pair-specific mixed-family compile rule
   - Plausible only for `DL Core/Rift Bio`.
   - Cannot explain `DL Dual Rift Bio`, so it is weaker than the duplicate-Bio theory.
   - Still worth ranking because `DL Core/Rift Bio` is the only checked mixed-family suspect and its compile path does hit the `[2,2]` multiplier.

4. Global `Dark Legion Armor[B4]` / `Abyss` / `Rift Gun` / `Core Staff` definition changes
   - Weakest fit.
   - Controls share too much of this stack and already sit close.
   - High collateral-risk, low locality.

## Recommendation

Recommendation: `ONE LAST MICRO-CHECK`

Reason:

- I do not have proof for a safe real patch yet.
- The localized evidence points more to a missing composition-specific rule than to a wrong standalone item definition.
- The best remaining next check is a truth-targeted double-Bio family probe, not a broad defs edit.

If forced to name the smallest plausible patch candidate right now, it would be:

- a narrow duplicate-`Bio Spinal Enhancer` compile rule in:
  - `./legacy-sim-v1.0.4-clean.js` `compileCombatantFromParts()`
  - mirrored in `./brute-sim-v1.4.6.js` `compileDefender()` / `compileAttacker()`

But I do **not** recommend patching that yet.
