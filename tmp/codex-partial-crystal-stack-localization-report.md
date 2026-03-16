# codex-partial-crystal-stack-localization-report

## 1. Goal of this pass

Separate two remaining live-build anchor issues on top of the current reverted live Rule B activation-only baseline:

- A) partial-crystal stat stacking behavior
- B) weapon damage/range display behavior

This was a temp-only localization pass. No tracked legacy, Bio helper, combat, or brute logic was changed.

## 2. Exact commands run

```sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' ./tmp/codex-mixed-slot-live-build-report.md
rg -n "applyCrystalPctToStat|applyCrystalPctToWeaponDmg|roundWeaponDmg|computeVariant\(|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledWeaponSnapshot|buildCompiledCombatSnapshot|predictPosActionRangeFromWeaponMinMax|tacticsMode|applyMinMax" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-partial-crystal-stack-localization-check.js
node ./tmp/codex-partial-crystal-stack-localization-check.js
```

## 3. Exact files inspected/changed

| File | Action | Classification |
| --- | --- | --- |
| [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md) | inspected | source-of-truth handoff |
| [codex-mixed-slot-live-build-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-report.md) | inspected | prior temp-only report |
| [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js) | inspected only | no tracked changes |
| [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) | not changed | no brute patch made |
| [codex-partial-crystal-stack-localization-check.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-partial-crystal-stack-localization-check.js) | created | instrumentation-only temp harness |
| [codex-partial-crystal-stack-localization-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-partial-crystal-stack-localization-report.md) | created | instrumentation-only report |

Parity-sensitive note:

- legacy stat compilation path was inspected
- brute was not changed
- no parity claim is made beyond “no tracked parity-sensitive code was changed”

## 4. Source hygiene result

- Tracked source is still on the reverted live Rule B activation-only baseline: yes.
- No tracked Bio helper logic changed: yes.
- No tracked combat-resolution logic changed: yes.
- No tracked brute logic changed: yes.

## 5. Legacy paths inspected

- single/part-local stat application:
  - `applyCrystalPctToStat(...)`
  - `applyCrystalPctToWeaponDmg(...)`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
- full compile:
  - `compileCombatantFromParts(...)`
  - local weapon min/max handling via `applyMinMax(...)`
- display/snapshot helpers:
  - `buildCompiledWeaponSnapshot(...)`
  - `buildCompiledCombatSnapshot(...)`
  - `predictPosActionRangeFromWeaponMinMax(...)`

## 6. Matrix summary

Live anchor:

- HP 650
- Speed 216
- Dodge 164
- Accuracy 186
- Gun 580
- Melee 723
- Projectile 580
- Def 704
- Armor 83
- Weapon 1 105-133
- Weapon 2 118-129
- Predicted Damage 78-92

| row | speed | dodge | acc | gun | mel | prj | def | armor | w1 | w2 | predictedDamage | stats meanAbsΔ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. baseline current live behavior | 222 | 166 | 190 | 580 | 735 | 580 | 718 | 86 | 100-128 | 113-124 | unavailable | 4.56 |
| 2. misc-only compare-style stat stacking | 222 | 166 | 190 | 580 | 727 | 580 | 710 | 86 | 100-128 | 113-124 | unavailable | 2.78 |
| 3. weapon-only compare-style stat stacking | 222 | 166 | 186 | 580 | 733 | 580 | 717 | 86 | 100-128 | 113-124 | unavailable | 3.78 |
| 4. armor-only compare-style stat stacking | 216 | 164 | 190 | 580 | 735 | 580 | 715 | 83 | 100-128 | 113-124 | unavailable | 3.00 |
| **5. all family compare-style stat stacking** | 216 | 164 | 186 | 580 | 725 | 580 | 706 | 83 | 100-128 | 113-124 | unavailable | 0.44 |
| 6. display-only weapon-range probe | 216 | 164 | 186 | 580 | 725 | 580 | 706 | 83 | 105-133 | 118-129 | unavailable | 0.44 |

Best-fit stat row: **5. all family compare-style stat stacking**

## 7. Per-field deltas vs live anchor

| row | hp | speed | dodge | accuracy | gunSkill | meleeSkill | projSkill | defSkill | armor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. baseline current live behavior | +0 | +6 | +2 | +4 | +0 | +12 | +0 | +14 | +3 |
| 2. misc-only compare-style stat stacking | +0 | +6 | +2 | +4 | +0 | +4 | +0 | +6 | +3 |
| 3. weapon-only compare-style stat stacking | +0 | +6 | +2 | +0 | +0 | +10 | +0 | +13 | +3 |
| 4. armor-only compare-style stat stacking | +0 | +0 | +0 | +4 | +0 | +12 | +0 | +11 | +0 |
| **5. all family compare-style stat stacking** | +0 | +0 | +0 | +0 | +0 | +2 | +0 | +2 | +0 |
| 6. display-only weapon-range probe | +0 | +0 | +0 | +0 | +0 | +2 | +0 | +2 | +0 |

## 8. What each row isolates

- `baseline_live`: current tracked legacy behavior
- `misc_partial_sum4`: only Bio misc stat stacking moved to compare-style
- `weapon_partial_sum4`: only weapon stat stacking moved to compare-style; weapon damage stack stays unchanged
- `armor_sum4`: armor-family control; armor is not partial-count, but its iter4/sum4 branch still materially moves the live totals
- `all_family_sum4`: union row across the relevant part families
- `display_probe`: row 5 plus display-only `tacticsMode=minmax` to test whether the live weapon ranges are simply a +5 display transform

## 9. Best explanation now

### 1. Which exact part family or families need compare-style handling to reproduce the live displayed stat totals most closely?

Armor + weapons + miscs together. Armor-only fixes speed/dodge/armor, weapon-only fixes accuracy, and melee/def need both weapon and misc compare-style handling to get close.

Direct row readout:

- armor-only is the row that collapses `speed/dodge/armor`
- weapon-only is the row that collapses `accuracy`
- misc-only and weapon-only both move `melee/def`, but neither is sufficient alone
- the closest stat row is **5. all family compare-style stat stacking**

### 2. Does melee/defSkill drift come from the same stack-mode difference, or from a different item/display layer?

Melee/def drift is not a weapon-range issue. It is mostly the same stat-stack mode difference, split across weapon-family Amulet stats and Bio misc crystal stats, with a smaller armor-family def contribution.

Concrete signal from the matrix:

- baseline `melee/def`: 735/718
- misc-only `melee/def`: 727/710
- weapon-only `melee/def`: 733/717
- armor-only `melee/def`: 735/715
- best row `melee/def`: 725/706

### 3. Are weapon1/weapon2 range mismatches caused by crystal stat stacking, weapon compile math, displayed-range convention, or a separate display-only transformation?

Weapon range mismatches are not caused by stat-crystal stack mode. They are consistent with a separate display-only +5 min/max transform, reproduced temp-only by tacticsMode=minmax.

Evidence:

- baseline weapon ranges: 100-128, 113-124
- all-family compare-style weapon ranges: 100-128, 113-124
- display probe weapon ranges: 105-133, 118-129

### 4. Is predictedDamage 78–92 derivable anywhere from an existing display/helper path without target-context combat simulation?

No build-only helper path surfaced a target-free predictedDamage 78-92 value. Existing predicted/action-range helpers require target armor/context, so predictedDamage remains unavailable without extra interpretation.

Current status by row:

- baseline: unavailable
- misc-only: unavailable
- weapon-only: unavailable
- armor-only: unavailable
- all-family compare-style: unavailable
- display probe: unavailable

## 10. First remaining mismatch category after this pass

First remaining mismatch category:

- for stat totals: **part-family stat-crystal stack mode semantics**
- for weapon ranges: **display-only min/max transformation / displayed-range convention**

The pass did not find evidence that weapon range drift is caused by the same stat-stack difference.

## 11. Final recommendation

Best next tracked patch candidate, if any:

- If a tracked patch is eventually justified, the smallest candidate surface is not Bio helper logic. It would be the shared stat-crystal application path (`applyCrystalPctToStat(...)` / mixed-crystal stat application) with explicit partial-crystal representation semantics, but this pass does not justify implementing it yet.

No implementation is justified from this pass alone.

## 12. What ChatGPT should do next

Use this report as the next handoff. If a tracked patch is considered at all, keep it out of the Bio helper and combat-resolution paths: first decide whether the repo should support compare-style stat stacking specifically for represented partial-crystal builds, and treat weapon range display as a separate display-layer question rather than part of the Bio-family combat mismatch.
