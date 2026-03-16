# codex-bio card-anchor instrumentation

## 1. Goal of this pass

Use the current reverted live Rule B activation-only code as the baseline and test the user's plain-English model directly at the single-misc card layer: compute the misc item stats with crystals first, then ask whether those card totals already match known in-game anchors before any character-level aggregation happens.

## 2. Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|computeVariant\(|rebuildMiscVariantForSlot|getEffectiveCrystalPct|partCrystalSpec" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1888,1978p' legacy-sim-v1.0.4-clean.js
sed -n '2288,2498p' legacy-sim-v1.0.4-clean.js
sed -n '2067,2105p' brute-sim-v1.4.6.js
sed -n '2184,2668p' brute-sim-v1.4.6.js
sed -n '1,40p' data/legacy-defs.js
sed -n '190,225p' data/legacy-defs.js
sed -n '3270,3305p' brute-sim-v1.4.6.js
node ./tmp/codex-bio-card-anchor-instrumentation.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-revert-to-live-rule-b-report.md`
- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct(...)`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
  - local duplicate helper block above `compileCombatantFromParts(...)`
- `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct(...)`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `rebuildMiscVariantForSlot(...)`
  - local duplicate helper block above defender/attacker compile
- `./data/legacy-defs.js`
  - `CrystalDefs`
  - `ItemDefs['Scout Drones']`
  - `ItemDefs['Bio Spinal Enhancer']`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- The single-misc computation path is unchanged by the duplicate helper on these anchors.
- First concrete single-misc path:
  - legacy: `computeVariant(...)` / `computeVariantFromCrystalSpec(...)` with compare-style config
  - brute: `computeVariant(...)` / `computeVariantFromCrystalSpec(...)` under `VARIANT_CFG`
- Duplicate helper position remains higher:
  - it acts only after two misc variants exist, inside `applyValidatedDuplicateBioPinkScaling(...)`

## 5. Legacy single-misc outputs

Legacy config used for these single-card checks:

- `statRound=ceil`
- `weaponDmgRound=ceil`
- `crystalStackStats=sum4`
- `crystalStackDmg=sum4`
- `armorStatStack=sum4`
- `armorStatRound=ceil`
- `crystalSlots=4`

| Variant | acc | dodge | defSkill | gunSkill | meleeSkill | projSkill | speed | armor | crystal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scout Drones + 4x Amulet Crystal | 40 | 5 | 42 | 42 | 42 | 70 | 0 | 0 | Amulet Crystal |
| Bio Spinal Enhancer + 4x Perfect Pink Crystal | 1 | 1 | 117 | 65 | 65 | 65 | 0 | 0 | Perfect Pink Crystal |
| Bio Spinal Enhancer + 4x Perfect Orange Crystal | 1 | 1 | 65 | 65 | 117 | 65 | 0 | 0 | Perfect Orange Crystal |

## 6. Brute single-misc outputs

Brute default variant config used:

- `statRound=ceil`
- `weaponDmgRound=ceil`
- `crystalStackStats=iter4`
- `crystalStackDmg=sum4`
- `armorStatStack=sum4`
- `armorStatRound=ceil`
- `crystalSlots=4`

| Variant | acc | dodge | defSkill | gunSkill | meleeSkill | projSkill | speed | armor | crystal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scout Drones + 4x Amulet Crystal | 43 | 5 | 46 | 46 | 46 | 75 | 0 | 0 | Amulet Crystal |
| Bio Spinal Enhancer + 4x Perfect Pink Crystal | 1 | 1 | 136 | 65 | 65 | 65 | 0 | 0 | Perfect Pink Crystal |
| Bio Spinal Enhancer + 4x Perfect Orange Crystal | 1 | 1 | 65 | 65 | 136 | 65 | 0 | 0 | Perfect Orange Crystal |

## 7. Card-anchor comparison table

| sim | anchor | stat | expected | simulated | delta | exact |
| --- | --- | --- | --- | --- | --- | --- |
| legacy | Scout Drones + 4x Amulet | acc | 40 | 40 | 0 | yes |
| legacy | Scout Drones + 4x Amulet | dodge | 5 | 5 | 0 | yes |
| legacy | Scout Drones + 4x Amulet | defSkill | 42 | 42 | 0 | yes |
| legacy | Scout Drones + 4x Amulet | gunSkill | 42 | 42 | 0 | yes |
| legacy | Scout Drones + 4x Amulet | meleeSkill | 42 | 42 | 0 | yes |
| legacy | Scout Drones + 4x Amulet | projSkill | 70 | 70 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | acc | 1 | 1 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | dodge | 1 | 1 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | defSkill | 117 | 117 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | gunSkill | 65 | 65 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | meleeSkill | 65 | 65 | 0 | yes |
| legacy | Bio Spinal Enhancer + 4x Perfect Pink | projSkill | 65 | 65 | 0 | yes |
| brute | Scout Drones + 4x Amulet | acc | 40 | 43 | 3 | no |
| brute | Scout Drones + 4x Amulet | dodge | 5 | 5 | 0 | yes |
| brute | Scout Drones + 4x Amulet | defSkill | 42 | 46 | 4 | no |
| brute | Scout Drones + 4x Amulet | gunSkill | 42 | 46 | 4 | no |
| brute | Scout Drones + 4x Amulet | meleeSkill | 42 | 46 | 4 | no |
| brute | Scout Drones + 4x Amulet | projSkill | 70 | 75 | 5 | no |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | acc | 1 | 1 | 0 | yes |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | dodge | 1 | 1 | 0 | yes |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | defSkill | 117 | 136 | 19 | no |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | gunSkill | 65 | 65 | 0 | yes |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | meleeSkill | 65 | 65 | 0 | yes |
| brute | Bio Spinal Enhancer + 4x Perfect Pink | projSkill | 65 | 65 | 0 | yes |

## 8. Legacy vs brute parity notes for these exact single-misc cases

- Legacy reproduces both provided in-game card anchors exactly: yes.
- Brute reproduces both provided in-game card anchors exactly: no.
- First concrete parity divergence is already visible at single-misc stat-crystal stacking:
  - legacy uses compare-style `sum4` stat stacking for these checks
  - brute default `VARIANT_CFG` uses `iter4` for stat stacking
- That difference alone explains the brute overshoot on card totals:
  - Scout Drones + Amulet: legacy `40/42/42/42/70` vs brute `43/46/46/46/75` on the anchored skill fields
  - Bio + Perfect Pink: legacy `117 defSkill` vs brute `136 defSkill`
- `rebuildMiscVariantForSlot(...)` is not the first divergence here because these anchors were computed directly from single-misc variants before slot-2 rebuild is needed.

## 9. Best explanation now

- Do current helpers reproduce the in-game misc card stats?
  - legacy: yes, exactly for both supplied anchors
  - brute: no, not under its current default stat-crystal stack mode
- First concrete divergence:
  - not in the defs for these two cards
  - not in field mapping
  - not in duplicate-copy logic
  - it starts at stat-crystal application mode: brute `iter4` vs legacy compare-style `sum4`
- Because legacy matches both anchors exactly, this weakens the idea that the remaining live legacy calibration problem is in basic single-misc item crystal computation.
- Smallest higher layer still plausible in legacy:
  - the local pair-context Bio helper path above final combatant aggregation
  - or another aggregation/context rule that only appears once two misc items are combined with character stats

## 10. Recommendation

**BASIC MISC COMPUTATION LOOKS CORRECT; KEEP LOOKING HIGHER**

## 11. What ChatGPT should do next

Use this report as the handoff. Keep treating legacy single-misc card math as anchored for these two items, and focus the next diagnosis step above the single-card layer: pair-context Bio helper behavior, duplicate/mixed-copy context, or final character aggregation rather than basic misc crystal application.
