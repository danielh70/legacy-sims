# codex-represented-build-patch-verify-report

## 1. Scope

Audit the actual repo state on disk against [codex-represented-build-stat-stack-patch-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-report.md), rerun the stated verification commands, and confirm whether the represented-build stat-stack patch exists exactly as reported.

This was a verification-only pass.

## 2. Exact files inspected

- [AGENTS.md](/Users/danielhook/Desktop/code_projects/legacy_sims/AGENTS.md)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-stat-stack-patch-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-report.md)
- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [codex-represented-build-stat-stack-patch-check.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-check.js)
- [legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js)

## 3. Exact files changed

None in this audit pass.

## 4. Did the on-disk tracked file already match the prior report?

Yes.

Before any edits:

- the reported helper functions were present on disk
- the reported local gating rule was present on disk
- the reported compile-time local cfg override path was present on disk
- the rerun verifier still produced the reported anchor/live/regression results

No tracked correction was needed.

## 5. Exact gating rule actually found on disk

The on-disk `legacy-sim-v1.0.4-clean.js` currently gates the represented-build stat semantics through:

- `explicitPartCrystalSlotCount(...)`
- `resolvedPartCrystalSlots(...)`
- `useRepresentedBuildStatSemantics(...)`
- local `cfgForRepresentedBuildPart(...)` inside `main()`

Actual rule on disk:

- if a part has explicit `crystalSlots` or `slotCount`, it is treated as a represented-build part
- only for those parts, the local cfg switches to:
  - part-local `crystalSlots`
  - `crystalStackStats = 'sum4'`
  - `armorStatStack = 'sum4'`
  - `stableCompareStatRounding = true`
  - `armorStatSlots = <part-local slot count>` for armor parts
- if a part does not carry explicit per-part slot count, the code stays on the existing tracked cfg path

This is as narrow as the prior report claimed.

## 6. Exact verification commands run

```sh
rg -n "function explicitPartCrystalSlotCount|function resolvedPartCrystalSlots|function useRepresentedBuildStatSemantics|function partCrystalSpecDisplay|function normalizeResolvedBuildPart\\(|function normalizeResolvedBuildPartForTruthCollector\\(|function stabilizeCompareStyleStatRoundInput|function applyCrystalPctToStat|function applyMixedCrystalPctToStat|function computeVariant\\(|function computeVariantFromCrystalSpec|function cfgForRepresentedBuildPart|stableCompareStatRounding|Represented-build stat patch" legacy-sim-v1.0.4-clean.js
diff -u ./tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js ./legacy-sim-v1.0.4-clean.js
git status --short legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js ./tmp/codex-represented-build-stat-stack-patch-check.js ./tmp/codex-represented-build-stat-stack-patch-report.md ./tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-represented-build-stat-stack-patch-check.js
node ./tmp/codex-represented-build-stat-stack-patch-check.js
```

## 7. Compact diff summary for `legacy-sim-v1.0.4-clean.js`

Diff source used for this audit:

- pre-patch backup: [legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js)
- current tracked file: [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)

Actual changed areas found:

| Function / area | Actual change on disk |
| --- | --- |
| `explicitPartCrystalSlotCount(...)` | added |
| `resolvedPartCrystalSlots(...)` | added |
| `useRepresentedBuildStatSemantics(...)` | added |
| `partCrystalSpecDisplay(...)` | now resolves display slot count per part |
| `normalizeResolvedBuildPart(...)` | now normalizes crystal specs with part-local slot count and preserves explicit `crystalSlots` |
| `normalizeResolvedBuildPartForTruthCollector(...)` | same part-local slot preservation for truth-collector normalization |
| `stabilizeCompareStyleStatRoundInput(...)` | added |
| `applyCrystalPctToStat(...)` | compare-style stat rounding now uses stabilized input when `stableCompareStyle` is enabled |
| `applyMixedCrystalPctToStat(...)` | same stabilization for mixed crystal specs |
| `computeVariant(...)` | threads `stableCompareStatRounding` into shared stat application |
| `computeVariantFromCrystalSpec(...)` | threads `stableCompareStatRounding` into shared mixed-stat application |
| local `cfgForRepresentedBuildPart(...)` in `main()` | added; applies narrow represented-build cfg override |
| local `vKey(...)` / `getV(...)` | cache key now includes local cfg semantics so represented-build variants cache separately |
| attacker/defender `getV(...)` callsites in `main()` | now pass part-local cfgs |

Accidental unrelated edits in `legacy-sim-v1.0.4-clean.js` relative to the pre-patch backup for this patch:

- none found in this audit diff

Worktree note outside the audited patch:

- `git status --short` still shows [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) as modified in the repo, but it was not part of this represented-build patch and was not changed in this audit pass

## 8. Anchor verification table

| Anchor | Field | Expected | Verified | Exact |
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

## 9. Live mixed-slot verification table

Represented build verified:

- armor: Dark Legion Armor, 4x Abyss, `crystalSlots: 4`
- weapon1: Reaper Axe, 3x Amulet, `crystalSlots: 3`
- weapon2: Crystal Maul, 3x Amulet, `crystalSlots: 3`
- misc1: Bio Spinal Enhancer, 3x Perfect Pink, `crystalSlots: 3`
- misc2: Bio Spinal Enhancer, 3x Perfect Orange, `crystalSlots: 3`

| Field | Live anchor | Verified compiled | Delta |
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

## 10. Ordinary uniform-slot regression table

Representative row:

- ordinary uniform-slot build
- no explicit `crystalSlots`
- compared current tracked file against the saved pre-patch backup

| Field | Pre-patch backup | Current tracked | Changed? |
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

Regression verdict:

- exact equality pre-vs-post: yes

## 11. Untouched logic statement

Based on the on-disk diff audited here:

- Bio helper logic: untouched by this represented-build patch
- combat logic: untouched by this represented-build patch
- brute logic: untouched by this represented-build patch and untouched in this audit pass
- weapon display logic: untouched by this represented-build patch
- predictedDamage logic: untouched by this represented-build patch

Parity note:

- no brute patch was made
- brute parity was not re-verified in this audit pass
- no parity preservation claim is made beyond “brute was untouched”

## 12. Final answer

**report matches repo state**

The actual on-disk `legacy-sim-v1.0.4-clean.js` matches the previous represented-build stat-stack patch report, and the rerun verification still confirms:

- the narrow gating rule exists as reported
- the single-card anchors still match exactly
- the live mixed-slot represented build still matches the live stat anchor exactly
- the cheap ordinary uniform-slot regression row remains unchanged

No tracked correction was required in this audit pass.
