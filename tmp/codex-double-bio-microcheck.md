# Double Bio Micro-Check

Tracked source edits in this pass: none.

## Exact Files / Functions Inspected

- `./data/legacy-defs.js`
  - `ItemDefs['Bio Spinal Enhancer']`
  - `CrystalDefs['Perfect Pink Crystal']`
  - `CrystalDefs['Perfect Orange Crystal']`
- `./legacy-sim-v1.0.4-clean.js`
  - `normalizeResolvedBuildPart()`
  - `normalizeResolvedBuild()`
  - `getEffectiveCrystalPct()`
  - `computeVariant()`
  - `computeVariantFromCrystalSpec()`
  - `compileCombatantFromParts()`
  - `buildCombatantDebugInfo()` slot contribution export
- `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct()`
  - `buildMiscPairsOrderlessAllDup()`
  - spec key handling for duplicate misc items
  - `defenderVariantKeyFromCrystalSpec()`
  - `rebuildMiscVariantForSlot()`
  - `compileDefender()`
  - `compileAttacker()`

## Exact Commands Run

```bash
sed -n '1,260p' ./tmp/codex-rift-family-rules-audit.md
rg -n "compileCombatantFromParts|getEffectiveCrystalPct|misc|slotTag|rebuildMiscVariantForSlot|partCrystalSpec|partName|normalizeResolvedBuild|Bio Spinal Enhancer|Perfect Pink Crystal|Perfect Orange Crystal|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
sed -n '1888,1965p' ./legacy-sim-v1.0.4-clean.js
sed -n '2187,2238p' ./brute-sim-v1.4.6.js
sed -n '3240,3270p' ./brute-sim-v1.4.6.js
sed -n '525,610p' ./legacy-sim-v1.0.4-clean.js
sed -n '2850,2875p' ./brute-sim-v1.4.6.js
sed -n '804,812p' ./brute-sim-v1.4.6.js
sed -n '3708,3730p' ./legacy-sim-v1.0.4-clean.js
sed -n '3310,3340p' ./brute-sim-v1.4.6.js
node - <<'NODE' ... NODE
```

Current truth-pack scan for Bio counts:

```bash
node - <<'NODE' ... NODE
```

Helper created and run:

```bash
node ./tmp/double-bio-sensitivity.js > ./tmp/double-bio-sensitivity.json
sed -n '1,260p' ./tmp/double-bio-sensitivity.json
```

## Relevant Comparison Opportunities In Current Repo Data

Useful existing rows in `./tmp/legacy-truth-current-attacker-vs-meta.json`:

- double Bio:
  - `DL Dual Rift Bio`
  - `DL Core/Rift Bio`
- single Bio nearby controls / relatives:
  - `DL Gun Sniper Mix`
  - `DL Gun Blade Bio`
  - `DL Maul/Core Orphic`
  - `DL Reaper/Maul Orphic Bio`
  - `SG1 Rift/Bombs Bio`
  - `HF Scythe Pair`

What is **missing**:

- no exact same-shell truth pair that differs only by `one Bio` vs `two Bio`
- no direct truth row for `DL Dual Rift` or `DL Core/Rift` with one Bio removed or recolored

So current repo data gives strong locality but not a clean A/B causal truth pair.

## Is Duplicate Bio Currently Plain Full Stacking?

Yes.

Current behavior from code inspection:

- `normalizeResolvedBuild()` keeps `misc1` and `misc2` as separate parts with no dedupe or suppression.
- legacy compiles `m1V` with `slotTag=1` and `m2V` with `slotTag=2`, then `compileCombatantFromParts()` adds both misc variants directly into the final totals.
- brute compiles defender misc variants with slot-specific cache keys and also adds them directly.
- brute optimizer explicitly allows duplicate misc pairs with `buildMiscPairsOrderlessAllDup()`.
- orderless sorting for same misc item is only for spec identity / cache key stability, not for stack suppression.

Net effect today:

- `Bio` in `misc1` gives full flat misc stats plus full crystal-modified misc stats.
- `Bio` in `misc2` also gives full flat misc stats plus full crystal-modified misc stats.
- `Bio + Bio` is just the arithmetic sum of both compiled misc variants.

## Dormant Hooks / Slot-Specific Behavior

Found in both sims:

- `LEGACY_MISC_NO_CRYSTAL_SKILL`
- `LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES`
- `LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES`
- `LEGACY_MISC_NO_CRYSTAL_SKILL_ZERO_DEF`

What they do:

- only affect misc crystal **skill** percentages
- can target all listed misc items, and separately target slot 2
- do **not** affect flat misc stats
- do **not** affect misc accuracy/dodge base adds
- do **not** implement duplicate-item detection by themselves

Important interpretation:

- these hooks are real infrastructure for suppressing misc crystal skill, especially on slot 2
- they are fully inactive by default here
- they line up mechanically with the suspect family
- but their obvious direction is to make double-Bio builds weaker, not stronger

That direction does **not** fit the current mismatch, where the suspect defenders appear too weak in sim because attacker win% is too high.

## Sensitivity Table

Using the current compiled suspect shells, subtracting current misc contributions, then re-adding Bio variants under the same compile rules:

### DL Dual Rift Bio shell

Fixed no-misc shell:

- `257 spd / 227 acc / 121 dodge / 692 gun / 450 melee / 542 def / 83 armor`

| Scenario | Acc | Dodge | Gun | Melee | Def | Delta vs no Bio |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| no Bio | 227 | 121 | 692 | 450 | 542 | baseline |
| one Bio[P4] | 228 | 122 | 757 | 515 | 678 | `+1 acc +1 dodge +65 gun +65 melee +136 def` |
| two Bio[P4] | 229 | 123 | 822 | 580 | 814 | `+2 acc +2 dodge +130 gun +130 melee +272 def` |
| Bio[P4]+Bio[O4] | 229 | 123 | 822 | 651 | 743 | `+2 acc +2 dodge +130 gun +201 melee +201 def` |
| two Bio[O4] | 229 | 123 | 822 | 722 | 672 | `+2 acc +2 dodge +130 gun +272 melee +130 def` |

### DL Core/Rift Bio shell

Fixed no-misc shell:

- `282 spd / 196 acc / 121 dodge / 704 gun / 776 melee / 609 def / 83 armor`

| Scenario | Acc | Dodge | Gun | Melee | Def | Delta vs no Bio |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| no Bio | 196 | 121 | 704 | 776 | 609 | baseline |
| one Bio[P4] | 197 | 122 | 769 | 841 | 745 | `+1 acc +1 dodge +65 gun +65 melee +136 def` |
| two Bio[P4] | 198 | 123 | 834 | 906 | 881 | `+2 acc +2 dodge +130 gun +130 melee +272 def` |
| Bio[P4]+Bio[O4] | 198 | 123 | 834 | 977 | 810 | `+2 acc +2 dodge +130 gun +201 melee +201 def` |
| two Bio[O4] | 198 | 123 | 834 | 1048 | 739 | `+2 acc +2 dodge +130 gun +272 melee +130 def` |

Additional slot note:

- under current defaults, `one Bio[P4]` in `misc1` and `one Bio[P4]` in `misc2` compile identically
- slot 2 only differs if the dormant `LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES` hook is activated

## What This Means

A) `duplicate Bio` is currently plain full stacking

- Yes, exactly.
- Full flat misc contribution and full crystal-modified skill contribution are counted twice.

B) Existing dormant mechanisms

- Yes.
- There is dormant infrastructure for misc crystal skill suppression, including slot-2-only suppression.
- There is **not** a dormant duplicate-Bio dedupe rule.

C) Leading localized interpretation

- The suspect family is genuinely unusual in compiled stats because `two Bio[P4]` adds a very large extra `+272 defSkill` plus all-skill flat stacking.
- But the code only gives evidence for “current engine fully stacks it”, not for what the correct live behavior should be instead.
- The only existing alternate mechanism in code points toward **reducing** misc crystal skill, which would likely worsen these already attacker-favored suspect lanes.

## Ranked Conclusions

1. `H3: still insufficient evidence; need one more truth probe`
   - Strongest conclusion.
   - The micro-check proves exact current stacking behavior.
   - It does **not** prove the correct replacement rule.
   - Existing dormant suppression hooks point in the wrong direction for the observed mismatch.

2. `H1: duplicate Bio full stacking is the likely localized mismatch`
   - Plausible only at the “composition locality” level.
   - Weak on direction.
   - A naive duplicate-Bio suppression patch would almost certainly make these defenders weaker in sim.

3. `H2: duplicate Bio crystal-skill treatment is the likely localized mismatch`
   - Mechanically plausible because the dormant hooks target exactly this area.
   - But again weak on direction: crystal-skill suppression would reduce defender strength, not increase it.

## Smallest Plausible Next Patch Candidate

If a patch were forced despite the evidence gap, the smallest surface would be:

- `./legacy-sim-v1.0.4-clean.js` `getEffectiveCrystalPct()`
- mirrored in `./brute-sim-v1.4.6.js` `getEffectiveCrystalPct()`

Why that block:

- it is the narrowest place to test slot-2 or duplicate-Bio crystal-skill changes
- parity-sensitive mirror already exists
- no broader combat math would need to move

Why I still do **not** recommend patching it yet:

- the current mismatch direction does not support a suppression-style change
- there is no direct one-Bio vs two-Bio truth pair for the same shell

## Recommendation

Recommendation: `GATHER ONE LAST TARGETED TRUTH PACK`

Best next truth target:

- same `Dark Legion + Rift/Core` shell with controlled misc variations:
  - no Bio
  - one Bio[P4]
  - two Bio[P4]
  - ideally `Bio[P4]+Bio[O4]`

That would answer the only remaining high-value question:

- whether the live game really treats duplicate Bio or Bio crystal colors non-additively

I do **not** recommend `PATCH NOW`.
