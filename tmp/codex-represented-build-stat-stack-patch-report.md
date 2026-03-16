# codex-represented-build-stat-stack-patch-report

## 1. Goal of this pass

Implement the smallest safe tracked patch in legacy-sim so the explicit represented-build path can support the proven temp semantics for mixed-slot / per-part slot-count builds, while leaving ordinary tracked global behavior unchanged.

## 2. Exact files changed

| File | Functions changed | Classification |
| --- | --- | --- |
| [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js) | `explicitPartCrystalSlotCount(...)`, `resolvedPartCrystalSlots(...)`, `useRepresentedBuildStatSemantics(...)`, `partCrystalSpecDisplay(...)`, `normalizeResolvedBuildPart(...)`, `normalizeResolvedBuildPartForTruthCollector(...)`, `stabilizeCompareStyleStatRoundInput(...)`, `applyCrystalPctToStat(...)`, `applyMixedCrystalPctToStat(...)`, `computeVariant(...)`, `computeVariantFromCrystalSpec(...)`, local `cfgForRepresentedBuildPart(...)`, local `vKey(...)`, local represented-build `getV(...)` callsites in `main()` | behavior-changing, narrowly gated |
| [codex-represented-build-stat-stack-patch-check.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-check.js) | temp verifier only | instrumentation-only |
| [codex-represented-build-stat-stack-patch-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-report.md) | report only | instrumentation-only |

Untouched in this pass:

- Bio helper logic: unchanged
- combat-resolution logic: unchanged
- brute-sim: unchanged
- weapon display logic: unchanged
- predictedDamage helpers: unchanged

## 3. Exact gating rule used

New semantics are only enabled for parts that explicitly carry per-part slot-count representation via `crystalSlots` or `slotCount`.

For those represented-build parts only, the local compile cfg switches to:

- `crystalSlots = <part-local slot count>`
- `crystalStackStats = 'sum4'`
- `armorStatStack = 'sum4'`
- `stableCompareStatRounding = true`
- `armorStatSlots = <part-local slot count>` for armor parts

If a part does not carry an explicit per-part slot count, the compile path stays on the prior tracked cfg semantics.

Patch scope breadth:

- applies to explicit represented builds / normalized resolved-build parts with per-part slot counts
- does **not** broaden ordinary uniform-slot legacy paths by default

## 4. Exact verification commands run

```sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-represented-build-stat-stack-patch-check.js
node ./tmp/codex-represented-build-stat-stack-patch-check.js
```

## 5. Anchor results table

| Anchor | Field | Expected | Compiled | Exact |
| --- | --- | --- | --- | --- |
| Scout Drones + 4x Amulet | acc | 40 | 40 | yes |
| Scout Drones + 4x Amulet | dodge | 5 | 5 | yes |
| Scout Drones + 4x Amulet | defSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | gunSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | meleeSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | projSkill | 70 | 70 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | acc | 1 | 1 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | dodge | 1 | 1 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | defSkill | 117 | 117 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | gunSkill | 65 | 65 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | meleeSkill | 65 | 65 | yes |
| Bio Spinal Enhancer + 4x Perfect Pink | projSkill | 65 | 65 | yes |

Result:

- both anchored single-card truths stayed exact under the tracked patch

## 6. Live mixed-slot build results table

Represented build used:

- armor: Dark Legion Armor, 4x Abyss, `crystalSlots: 4`
- weapon1: Reaper Axe, 3x Amulet, `crystalSlots: 3`
- weapon2: Crystal Maul, 3x Amulet, `crystalSlots: 3`
- misc1: Bio Spinal Enhancer, 3x Perfect Pink, `crystalSlots: 3`
- misc2: Bio Spinal Enhancer, 3x Perfect Orange, `crystalSlots: 3`
- stats: `hp 650`, all trainable points into dodge represented as `speed 60 / dodge 57 / accuracy 14`

| Field | Live anchor | Compiled value | Delta |
| --- | --- | --- | --- |
| HP | 650 | 650 | 0 |
| Speed | 216 | 216 | 0 |
| Dodge | 164 | 164 | 0 |
| Accuracy | 186 | 186 | 0 |
| Gun Skill | 580 | 580 | 0 |
| Melee Skill | 723 | 723 | 0 |
| Projectile Skill | 580 | 580 | 0 |
| Defensive Skill | 704 | 704 | 0 |
| Armor | 83 | 83 | 0 |

Compiled weapon ranges on the represented build:

- weapon1: `100-128`
- weapon2: `113-124`

## 7. Ordinary uniform-slot regression check result

Representative regression build:

- all parts use ordinary uniform-slot crystal arrays
- no part carries explicit `crystalSlots` or `slotCount`

| Field | Pre-patch backup | Patched tracked | Changed? |
| --- | --- | --- | --- |
| HP | 650 | 650 | no |
| Speed | 222 | 222 | no |
| Dodge | 166 | 166 | no |
| Accuracy | 201 | 201 | no |
| Gun Skill | 580 | 580 | no |
| Melee Skill | 769 | 769 | no |
| Projectile Skill | 580 | 580 | no |
| Defensive Skill | 743 | 743 | no |
| Armor | 86 | 86 | no |
| Weapon1 Range | 105-134 | 105-134 | no |
| Weapon2 Range | 118-131 | 118-131 | no |

Uniform-slot regression verdict:

- exact equality pre-vs-post: yes

## 8. Scope / parity notes

- The tracked patch is in place only in [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js).
- No brute patch was made.
- Brute parity-sensitive code was not changed and was not re-verified in this pass.
- No parity preservation claim is made beyond “brute was untouched”.

## 9. Final answer

Yes. The tracked patch is now in place safely **for the explicit represented-build path only**.

What it achieves:

- keeps ordinary uniform-slot legacy behavior unchanged on the cheap regression check
- preserves the two anchored single-card truths exactly
- makes the mixed-slot represented live build compile to the exact live stat anchor:
  - HP 650
  - Speed 216
  - Dodge 164
  - Accuracy 186
  - Gun Skill 580
  - Melee Skill 723
  - Projectile Skill 580
  - Defensive Skill 704
  - Armor 83

What it does **not** change:

- Bio helper behavior
- combat-resolution behavior
- brute behavior
- weapon display behavior
- predictedDamage behavior
