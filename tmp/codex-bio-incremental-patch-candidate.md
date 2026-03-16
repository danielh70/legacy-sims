# Bio Incremental Patch Candidate

Tracked source edits in this pass: none.

## Exact Files / Functions Inspected

- `./data/legacy-defs.js`
  - `CrystalDefs['Perfect Pink Crystal']`
  - `CrystalDefs['Perfect Orange Crystal']`
  - `ItemDefs['Bio Spinal Enhancer']`
- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct()`
  - `computeVariant()`
  - `computeVariantFromCrystalSpec()`
  - `compileCombatantFromParts()`
- `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct()`
  - `computeVariant()`
  - `computeVariantFromCrystalSpec()`
  - `buildMiscPairsOrderlessAllDup()`
  - `rebuildMiscVariantForSlot()`
  - `compileDefender()`
  - `compileAttacker()`

## Exact Commands Run

```bash
sed -n '1,260p' ./tmp/codex-double-bio-microcheck.md
node - <<'NODE' ... NODE
sed -n '1,240p' ./data/legacy-defs.js
rg -n "Bio Spinal Enhancer|Perfect Pink Crystal|Perfect Orange Crystal|getEffectiveCrystalPct|computeVariantFromCrystalSpec|computeVariant\\(|compileCombatantFromParts|rebuildMiscVariantForSlot|buildMiscPairsOrderlessAllDup|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
node ./tmp/bio-incremental-analysis.js > ./tmp/bio-incremental-analysis.json
sed -n '2290,2495p' ./legacy-sim-v1.0.4-clean.js
sed -n '2586,2688p' ./legacy-sim-v1.0.4-clean.js
sed -n '2391,2665p' ./brute-sim-v1.4.6.js
sed -n '3336,3445p' ./brute-sim-v1.4.6.js
sed -n '1,260p' ./tmp/bio-incremental-analysis.json
```

## What The Probe Most Strongly Implicates

The probe most strongly implicates **`Perfect Pink Crystal` on `Bio Spinal Enhancer`**, not generic duplicate-misc behavior.

Why:

- `No Bio` is nearly calibrated on both shells.
- The **first** `Bio[P4]` already introduces a large miss.
- The **second** `Bio[P4]` adds another miss of similar sign and comparable size.
- Replacing the second Pink Bio with `Bio[O4]` reduces the residual gap substantially.

That pattern says:

- the issue is **not** “double Bio only”
- the issue is **not** broad `Bio` flat stats by themselves
- the best first patch target is the **Bio+Pink interaction**

## Dual Rift Incremental Effects

Positive `A win drop` means the defender got stronger against `CUSTOM`.

| Step | Truth A win drop | Sim A win drop | Gap | Truth dAvgTurns | Sim dAvgTurns | A_hit Δ truth/sim | D_hit Δ truth/sim | A_dmg1 Δ truth/sim | D_dmg1 Δ truth/sim |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| No Bio -> One Bio[P4] | 15.30 | 12.29 | +3.01 | +0.8054 | +0.8039 | `+1 / +1.53` | `-4 / -3.66` | `-8 / -7.81` | `+3 / +3.35` |
| One Bio[P4] -> Two Bio[P4] | 17.63 | 14.64 | +2.99 | +0.8478 | +0.8451 | `+2 / +1.54` | `-5 / -4.96` | `-7 / -7.46` | `+4 / +3.40` |
| One Bio[P4] -> Bio[P4]+Bio[O4] | 0.91 | -0.24 | +1.15 | -0.1798 | -0.1975 | `+2 / +1.62` | `-5 / -4.95` | `0 / -0.01` | `+4 / +3.36` |

Direct row context:

- `DL Dual Rift No Bio`: `+0.37 dWin`
- `DL Dual Rift One Bio P4`: `+3.38 dWin`
- `DL Dual Rift Two Bio P4`: `+6.37 dWin`
- `DL Dual Rift Bio P4 + O4`: `+4.53 dWin`

## Core/Rift Incremental Effects

| Step | Truth A win drop | Sim A win drop | Gap | Truth dAvgTurns | Sim dAvgTurns | A_hit Δ truth/sim | D_hit Δ truth/sim | A_dmg1 Δ truth/sim | D_dmg1 Δ truth/sim |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| No Bio -> One Bio[P4] | 16.30 | 13.91 | +2.39 | +0.9578 | +0.8933 | `+1 / +1.62` | `-5 / -5.04` | `-7 / -7.62` | `+3 / +3.41` |
| One Bio[P4] -> Two Bio[P4] | 13.01 | 11.55 | +1.46 | +0.9271 | +0.8863 | `+2 / +1.49` | `-7 / -6.49` | `-7 / -6.36` | `+3 / +3.19` |
| One Bio[P4] -> Bio[P4]+Bio[O4] | 2.15 | 1.86 | +0.29 | -0.2794 | -0.2540 | `+2 / +1.50` | `-7 / -6.50` | `0 / -0.22` | `+9 / +8.70` |

Direct row context:

- `DL Core/Rift No Bio`: `-0.32 dWin`
- `DL Core/Rift One Bio P4`: `+2.07 dWin`
- `DL Core/Rift Two Bio P4`: `+3.53 dWin`
- `DL Core/Rift Bio P4 + O4`: `+2.36 dWin`

## Interpretation

Strongest read:

- the sim under-credits the **defender-strength increment from each `Bio[P4]`**
- the first `Bio[P4]` is already enough to create real drift
- the second `Bio[P4]` adds more of the same, but does not look like a uniquely special “duplicate-only” cliff
- `Bio[O4]` is much closer, especially on `Core/Rift`

Important nuance:

- the secondary displayed shifts mostly track truth well: hit-rate and displayed damage changes move in the right direction and roughly the right size
- the residual error is mainly in **how much those Pink-Bio steps suppress attacker wins**
- that makes a **small localized compile-rule miss** more plausible than a large broad defs error

## Ranked Patch Candidates

1. `H1: Perfect Pink on Bio should contribute more defender strength than current sim gives`
   - Best supported.
   - Explains why the first `Bio[P4]` already drifts.
   - Explains why `Two Bio[P4]` is worst.
   - Explains why `P4+O4` is less wrong than `P4+P4`.
   - Smallest implementation surface: item-specific crystal handling in `getEffectiveCrystalPct()`.

2. `H2: second Bio crystal/stat contribution should be stronger than plain additive current sim`
   - Possible, but weaker.
   - The second `Bio[P4]` does add more under-credited defender strength.
   - But the first `Bio[P4]` already causes most of the localization signal, so this is not the best first patch.

3. `H3: duplicate Bio has a localized nonlinear or special-case rule not represented`
   - Weaker than `H1`.
   - The data does not show a clean duplicate-only cliff.
   - The miss scales more like “each Pink Bio under-credited” than “only the second Bio is special.”

4. `H4: something else narrower and better-supported`
   - Best alternate narrow read: `Bio[P4]` may affect more than raw misc `defSkill` in the live game.
   - Still points to the same first patch surface: item-specific misc crystal handling, not duplicate-misc compile structure.

## Is The Evidence Strong Enough To Patch?

Yes, for a **narrow experimental patch**.

Not enough for:

- a broad `Perfect Pink Crystal` global defs change
- a broad `Bio Spinal Enhancer` flat-stat change
- a generic duplicate-misc dedupe rule

But enough for:

- a localized `Bio Spinal Enhancer` + `Perfect Pink Crystal` patch candidate
- mirrored in the brute parity path

## Recommendation

Recommendation: `PATCH NOW`

Smallest exact file/function/block to patch first:

- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct()`
- mirrored in:
  - `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct()`

Why this block first:

- it is the narrowest place to encode an item-specific `Bio + Pink` rule
- it already owns misc crystal skill shaping
- it preserves the rest of compile and combat logic
- parity mirror is straightforward

What I would **not** patch first:

- `ItemDefs['Bio Spinal Enhancer']` flat stats
- `CrystalDefs['Perfect Pink Crystal']` globally
- duplicate-misc pair generation
- compile summation in `compileCombatantFromParts()`

Those are all broader and less consistent with the probe.
