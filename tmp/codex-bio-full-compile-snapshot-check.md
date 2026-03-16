# codex-bio full compile snapshot check

## 1. Goal of this pass

Use the exact truth-pack builds under the current reverted live Rule B activation-only state to determine whether the remaining Bio-family mismatch is already visible in full compiled attacker/defender snapshots before combat starts, or whether the next concrete suspect layer is combat-resolution behavior.

## 2. Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,260p' ./tmp/codex-bio-pair-context-aggregation-check.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '3615,4015p' legacy-sim-v1.0.4-clean.js
sed -n '381,540p' legacy-sim-v1.0.4-clean.js
sed -n '5350,5675p' legacy-sim-v1.0.4-clean.js
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
node ./tmp/codex-bio-full-compile-snapshot-check.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-card-anchor-instrumentation.md`
- `./tmp/codex-bio-pair-context-aggregation-check.md`
- `./tmp/codex-bio-revert-to-live-rule-b-report.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `normalizeResolvedBuildWeaponUpgrades(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
  - `captureCombatantEffectiveStats(...)`
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Full compiled snapshot path in legacy-sim:
  - exact truth build payload -> `partCrystalSpec(...)`
  - per-part variant build -> `computeVariantFromCrystalSpec(...)`
  - full combatant compile -> `compileCombatantFromParts(...)`
  - pre-combat snapshot export -> `buildCompiledCombatSnapshot(...)`
- No tracked edits were made in this pass.

## 5. Full compiled attacker snapshot summary

Attacker snapshot is constant across these 8 defender rows: yes.

| hp | speed | accuracy | dodge | armor | armorFactor | defSkill | gunSkill | meleeSkill | projSkill | weapon1 | weapon2 | actionRange | attackStyle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 650 | 190 | 189 | 134 | 75 | 0.810127 | 808 | 580 | 744 | 580 | meleeSkill 105-134 (86-110) | meleeSkill 122-135 (100-110) | 84-215 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |

## 6. Full compiled defender snapshot table for the 8 rows

| row | hp | speed | accuracy | dodge | armor | armorFactor | defSkill | gunSkill | meleeSkill | projSkill | weapon1 | weapon2 | actionRange | attackStyle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DL Dual Rift No Bio | 865 | 251 | 285 | 129 | 83 | 0.814318 | 644 | 740 | 510 | 550 | gunSkill 77-84 | gunSkill 75-81 | 63-138 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Dual Rift One Bio P4 | 865 | 251 | 254 | 125 | 83 | 0.814318 | 707 | 775 | 545 | 565 | gunSkill 77-84 | gunSkill 75-81 | 63-138 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Dual Rift Two Bio P4 | 865 | 251 | 223 | 121 | 83 | 0.814318 | 796 | 810 | 580 | 580 | gunSkill 77-84 | gunSkill 75-81 | 63-138 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Dual Rift Bio P4 + O4 | 865 | 251 | 223 | 121 | 83 | 0.814318 | 718 | 810 | 632 | 580 | gunSkill 77-84 | gunSkill 75-81 | 63-138 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Core/Rift No Bio | 865 | 276 | 253 | 129 | 83 | 0.814318 | 707 | 748 | 818 | 550 | meleeSkill 62-75 | gunSkill 75-81 | 52-131 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Core/Rift One Bio P4 | 865 | 276 | 222 | 125 | 83 | 0.814318 | 770 | 783 | 853 | 565 | meleeSkill 62-75 | gunSkill 75-81 | 52-131 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Core/Rift Two Bio P4 | 865 | 276 | 191 | 121 | 83 | 0.814318 | 859 | 818 | 888 | 580 | meleeSkill 62-75 | gunSkill 75-81 | 52-131 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |
| DL Core/Rift Bio P4 + O4 | 865 | 276 | 191 | 121 | 83 | 0.814318 | 781 | 818 | 940 | 580 | meleeSkill 62-75 | gunSkill 75-81 | 52-131 | {"attackType":"normal","roundMode":"floor","accuracyMultiplier":1,"dodgeMultiplier":1,"speedMultiplier":1} |

## 7. Defender transition tables

| Transition | Compiled field deltas |
| --- | --- |
| Dual Rift No Bio -> One Bio P4 | accuracy -31, dodge -4, defSkill +63, gunSkill +35, meleeSkill +35, projSkill +15 |
| Dual Rift One Bio P4 -> Two Bio P4 | accuracy -31, dodge -4, defSkill +89, gunSkill +35, meleeSkill +35, projSkill +15 |
| Dual Rift One Bio P4 -> Bio P4 + O4 | accuracy -31, dodge -4, defSkill +11, gunSkill +35, meleeSkill +87, projSkill +15 |
| Core/Rift No Bio -> One Bio P4 | accuracy -31, dodge -4, defSkill +63, gunSkill +35, meleeSkill +35, projSkill +15 |
| Core/Rift One Bio P4 -> Two Bio P4 | accuracy -31, dodge -4, defSkill +89, gunSkill +35, meleeSkill +35, projSkill +15 |
| Core/Rift One Bio P4 -> Bio P4 + O4 | accuracy -31, dodge -4, defSkill +11, gunSkill +35, meleeSkill +87, projSkill +15 |

## 8. Best explanation now

**COMPILED SNAPSHOT LOOKS CLEAN; SUSPECT COMBAT RESOLUTION**

- The 8 compiled defender snapshots are clearly distinguishable from one another, but only through the same expected misc-driven stat structure already established earlier.
- Non-duplicate transitions are clean at full compile level:
  - `No Bio -> One Bio P4` shifts only the expected defender-side misc-sensitive fields
  - `One Bio P4 -> Bio P4 + O4` swaps defender `defSkill` for `meleeSkill` exactly as the card math predicts
- Duplicate-Pink transition is also clean at compile level:
  - `One Bio P4 -> Two Bio P4` is the same as adding another Bio[P4] card, plus the live Rule B helper’s extra `defSkill`
- The attacker compiled snapshot remains constant across all 8 rows, as expected.
- No extra non-misc compiled field is changing with the Bio swaps beyond the expected defender stats, armor factor staying fixed, and the resulting defender-side compiled action ranges.
- That means the remaining one-Bio and mixed-row truth misses are not being introduced by a hidden full-compile branch visible in these snapshots.
- Smallest plausible next suspect layer:
  - deterministic combat-resolution behavior after compile, especially hit/skill/damage interaction under the already-compiled stat differences

## 9. Recommendation

**NEED DETERMINISTIC ROLL-DUMP PASS**

## 10. What ChatGPT should do next

Use this report as the handoff. The next pass should stay on the current live Rule B activation-only code and run one deterministic roll-dump comparison on one Dual Rift row and one Core/Rift row, because the first unresolved divergence now appears to be above full compiled snapshots and inside combat-resolution behavior.
