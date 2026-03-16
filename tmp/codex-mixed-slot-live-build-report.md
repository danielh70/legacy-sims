# codex-mixed-slot-live-build-report

## 1. Goal of this pass

Use a temp-only mixed-slot / partial-crystal representation harness on top of the current tracked live Rule B activation-only baseline so legacy-sim can represent the user’s real live build shape and compare compiled totals against the displayed live totals, without changing tracked combat logic.

## 2. Exact files changed

| File | Change type | Notes |
| --- | --- | --- |
| [codex-mixed-slot-live-build-check.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-check.js) | schema/normalization-only | Temp-only harness adds explicit per-part slot counts while reusing tracked legacy compile logic unchanged. |
| [codex-mixed-slot-live-build-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-report.md) | instrumentation-only | Self-contained report output only. |

No tracked files were changed.

## 3. Exact verification commands run

```sh
sed -n '1,260p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
rg -n "resolvedBuildCrystalSlots|partCrystalSpec|normalizeCrystalCounts|uniformCrystalNameFromCounts|crystalSpecKey|crystalSpecShort|crystalSpecDisplay|normalizeResolvedBuildPart|normalizeResolvedBuild|normalizeResolvedBuildPartForTruthCollector|normalizeResolvedBuildForTruthCollector|computeVariant\(|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledCombatSnapshot|crystalSlots" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-mixed-slot-live-build-check.js
node ./tmp/codex-mixed-slot-live-build-check.js
```

## 4. Exact files/functions inspected

- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
  - `resolvedBuildCrystalSlots(...)`
  - `partCrystalSpec(...)`
  - `normalizeCrystalCounts(...)`
  - `uniformCrystalNameFromCounts(...)`
  - `crystalSpecKey(...)`
  - `crystalSpecShort(...)`
  - `crystalSpecDisplay(...)`
  - `normalizeResolvedBuildPart(...)`
  - `normalizeResolvedBuild(...)`
  - `normalizeResolvedBuildPartForTruthCollector(...)`
  - `normalizeResolvedBuildForTruthCollector(...)`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
- [legacy-defs.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-defs.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) was not changed and was not used for this compile check.

## 5. Source hygiene result

- Tracked source is still on the reverted live Rule B activation-only baseline: yes.
- Duplicate-Pink helper path remains untouched in tracked source.
- No Bio helper logic was patched.
- No combat-resolution logic was patched.
- Brute parity-sensitive areas were not changed. Brute was only left untouched; parity was not re-verified because no brute patch was made in this pass.

## 6. Constructed build definition used for the check

The temp harness represented the live build with explicit per-part slot counts and exact crystal arrays:

```js
{
  label: 'LIVE_BUILD_ANCHOR_MIXED_SLOT',
  attackType: 'normal',
  stats: { level: 80, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
  armor:   { name: 'Dark Legion Armor', crystals: ['Abyss Crystal','Abyss Crystal','Abyss Crystal','Abyss Crystal'], crystalSlots: 4 },
  weapon1: { name: 'Reaper Axe', crystals: ['Amulet Crystal','Amulet Crystal','Amulet Crystal'], crystalSlots: 3 },
  weapon2: { name: 'Crystal Maul', crystals: ['Amulet Crystal','Amulet Crystal','Amulet Crystal'], crystalSlots: 3 },
  misc1:   { name: 'Bio Spinal Enhancer', crystals: ['Perfect Pink Crystal','Perfect Pink Crystal','Perfect Pink Crystal'], crystalSlots: 3 },
  misc2:   { name: 'Bio Spinal Enhancer', crystals: ['Perfect Orange Crystal','Perfect Orange Crystal','Perfect Orange Crystal'], crystalSlots: 3 }
}
```

Interpretation of the user’s trainable allocation inside legacy-sim:

- `hp 650` maps directly to `stats.hp = 650`
- “all free trainable points into dodge” maps to the simulator’s absolute pre-gear stat input `stats = { speed: 60, accuracy: 14, dodge: 57 }`
- This follows the current tracked legacy stat model and does not invent any new training system behavior

## 7. Resolved per-part slot counts

| Part | Item | Resolved slot count | Resolved crystal entries | Resolved crystal counts |
| --- | --- | ---: | --- | --- |
| armor | Dark Legion Armor | 4 | Abyss Crystal, Abyss Crystal, Abyss Crystal, Abyss Crystal | Abyss Crystal: 4 |
| weapon1 | Reaper Axe | 3 | Amulet Crystal, Amulet Crystal, Amulet Crystal | Amulet Crystal: 3 |
| weapon2 | Crystal Maul | 3 | Amulet Crystal, Amulet Crystal, Amulet Crystal | Amulet Crystal: 3 |
| misc1 | Bio Spinal Enhancer | 3 | Perfect Pink Crystal, Perfect Pink Crystal, Perfect Pink Crystal | Perfect Pink Crystal: 3 |
| misc2 | Bio Spinal Enhancer | 3 | Perfect Orange Crystal, Perfect Orange Crystal, Perfect Orange Crystal | Perfect Orange Crystal: 3 |

## 8. Simulated compiled totals

| Field | Compiled value |
| --- | --- |
| HP | 650 |
| Speed | 222 |
| Dodge | 166 |
| Accuracy | 190 |
| Gun Skill | 580 |
| Melee Skill | 735 |
| Projectile Skill | 580 |
| Defensive Skill | 718 |
| Armor | 86 |
| Weapon 1 Damage | 100-128 |
| Weapon 2 Damage | 113-124 |
| Predicted Damage | unavailable |

## 9. In-game vs compiled comparison table

| Field | Live anchor | Compiled value | Delta |
| --- | ---: | ---: | ---: |
| hp | 650 | 650 | 0 |
| speed | 216 | 222 | 6 |
| dodge | 164 | 166 | 2 |
| accuracy | 186 | 190 | 4 |
| gunSkill | 580 | 580 | 0 |
| meleeSkill | 723 | 735 | 12 |
| projSkill | 580 | 580 | 0 |
| defSkill | 704 | 718 | 14 |
| armor | 83 | 86 | 3 |
| predictedDamage | 78-92 | unavailable | n/a |
| weapon1Damage | 105-133 | 100-128 | n/a |
| weapon2Damage | 118-129 | 113-124 | n/a |

## 10. Temp-only localization check

The same mixed-slot build was also compiled once under compare-style stat stacking (`crystalStackStats=sum4`, `armorStatStack=sum4`) to identify the first remaining mismatch category after representation was fixed.

| Field | Current live legacy config | Temp compare-style check |
| --- | ---: | ---: |
| Speed | 222 | 216 |
| Dodge | 166 | 164 |
| Accuracy | 190 | 186 |
| Melee Skill | 735 | 725 |
| Defensive Skill | 718 | 706 |
| Armor | 86 | 83 |
| Weapon 1 Damage | 100-128 | 100-128 |
| Weapon 2 Damage | 113-124 | 113-124 |

This localization step was temp-only. No tracked config or combat behavior changed.

## 11. Compiled weapon ranges

- Weapon 1 (`Reaper Axe`, 3x Amulet): 100-128
- Weapon 2 (`Crystal Maul`, 3x Amulet): 113-124
- Predicted overall damage range: unavailable from this build-only compile path without adding a target context; not guessed

## 12. Best explanation now

### 1. Can we support mixed slot counts per part in a temp-only harness without changing combat logic?

Yes.

The temp harness supports explicit per-part slot counts by:

- extracting the part’s crystal spec with tracked `partCrystalSpec(...)`
- normalizing that spec with the part’s own `crystalSlots`
- building each part variant with tracked `computeVariantFromCrystalSpec(...)` using that part-local slot count
- compiling the final combatant with tracked `compileCombatantFromParts(...)`

This changes representation/normalization only in temp code. It does not alter tracked combat formulas or tracked Bio helper behavior.

### 2. Once that is enabled, how close does the compiled build get to the live displayed totals?

Under the current live tracked legacy config, mixed-slot support makes the build compile successfully, but the compiled totals still miss the displayed live totals in several crystal-responsive fields:

- Speed: live 216 vs compiled 222
- Dodge: live 164 vs compiled 166
- Accuracy: live 186 vs compiled 190
- Melee Skill: live 723 vs compiled 735
- Defensive Skill: live 704 vs compiled 718
- Armor: live 83 vs compiled 86

Fields that already match exactly under the current live config:

- HP: 650
- Gun Skill: 580
- Projectile Skill: 580

### 3. If it still misses, what is the first exact field category that remains mismatched after mixed-slot support is allowed?

First remaining mismatch category: **stat-crystal stack mode on partial-crystal parts**

Why this is the first concrete mismatch category:

- mixed-slot representation was the blocker that previously prevented any exact compile at all
- once that blocker is removed, the first live-config miss shows up in crystal-responsive stat fields
- the temp-only compare-style check collapses those stat misses sharply:
  - Speed 222 -> 216
  - Dodge 166 -> 164
  - Accuracy 190 -> 186
  - Armor 86 -> 83
- weapon ranges remain lower even in the compare-style check, so weapon-range display is a separate residual issue

## 13. Final conclusion

Mixed-slot representation alone explains the earlier inability to use this live build at all.

After allowing exact per-part slot counts in a temp-only harness:

- the live build becomes representable without touching tracked combat logic
- the current live legacy config still does not match the displayed live totals
- the first residual mismatch appears in stat-crystal stack mode on partial-crystal parts
- the temp-only localization check shows that mismatch is higher than mixed-slot normalization itself

So the answer to the core question is:

- **Yes**, we can support mixed slot counts per part in a temp-only harness without changing combat logic.
- **Yes**, once enabled, the build becomes representable and comparable.
- **No**, mixed-slot representation alone does not make the current live legacy compile match; the first remaining difference is stat-crystal stack mode on partial-crystal parts.

## 14. Open questions

Only if the user wants to push this live anchor further:

- whether the live displayed stat totals are closer to compare-style `sum4` stacking for partial-crystal parts than to the current live legacy default `iter4` stat stacking
- whether the in-game displayed weapon ranges use a different displayed-range convention than the tracked legacy weapon compile

No new Bio helper or combat patch is proposed from this pass.
