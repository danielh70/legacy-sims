# codex-stat-stack-patch-candidate-proof

## 1. Goal of this pass

Decide whether the remaining live-build mismatch is best explained by a shared stat-crystal stack semantics issue rather than a Bio-specific issue, and identify the smallest safe tracked patch candidate surface without touching tracked Bio helper or combat logic.

De-scoped for this pass:

- weapon display ranges beyond noting the user’s permanent +5 min/max ability already explains them
- predictedDamage

## 2. Exact commands run

```sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' ./tmp/codex-mixed-slot-live-build-report.md
sed -n '1,260p' ./tmp/codex-partial-crystal-stack-localization-report.md
rg -n "applyCrystalPctToStat|computeVariant\(|computeVariantFromCrystalSpec|compileCombatantFromParts|armorStatStack|crystalStackStats|mixedWeaponMultsFromWeaponSkill" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-stat-stack-patch-candidate-proof.js
node ./tmp/codex-stat-stack-patch-candidate-proof.js
```

## 3. Exact files inspected/changed

| File | Action | Classification |
| --- | --- | --- |
| [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md) | inspected | source-of-truth handoff |
| [codex-mixed-slot-live-build-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-report.md) | inspected | prior temp-only report |
| [codex-partial-crystal-stack-localization-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-partial-crystal-stack-localization-report.md) | inspected | prior temp-only report |
| [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js) | inspected only | no tracked changes |
| [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) | not changed | no brute patch made |
| [codex-stat-stack-patch-candidate-proof.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-stat-stack-patch-candidate-proof.js) | created | instrumentation-only temp prototype |
| [codex-stat-stack-patch-candidate-proof.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-stat-stack-patch-candidate-proof.md) | created | instrumentation-only report |

Tracked combat/Bio/brute logic changed:

- legacy Bio helper logic: no
- legacy combat-resolution logic: no
- brute logic: no

Parity-sensitive note:

- legacy stat compilation path was inspected
- brute was not changed or re-verified
- no parity preservation claim is made beyond “no tracked parity-sensitive code changed”

## 4. Legacy paths inspected first

- `applyCrystalPctToStat(...)`
- `computeVariant(...)`
- `computeVariantFromCrystalSpec(...)`
- `compileCombatantFromParts(...)`
- `armorStatStack` / `crystalStackStats` config selection
- `mixedWeaponMultsFromWeaponSkill(...)`

## 5. Compact comparison table

| row | hp | speed | dodge | acc | gun | mel | prj | def | armor | meanAbsΔ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline current tracked behavior | 650 | 222 | 166 | 190 | 580 | 735 | 580 | 718 | 86 | 4.56 |
| all-family compare-style sum4 | 650 | 216 | 164 | 186 | 580 | 725 | 580 | 706 | 83 | 0.44 |
| smallest narrower scope: partial-count parts only | 650 | 222 | 166 | 186 | 580 | 725 | 580 | 709 | 86 | 2.00 |
| **temp prototype: all-family sum4 + epsilon-stable compare rounding** | 650 | 216 | 164 | 186 | 580 | 723 | 580 | 704 | 83 | 0.00 |

## 6. Per-field deltas vs live anchor

| row | hp | speed | dodge | accuracy | gunSkill | meleeSkill | projSkill | defSkill | armor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline current tracked behavior | +0 | +6 | +2 | +4 | +0 | +12 | +0 | +14 | +3 |
| all-family compare-style sum4 | +0 | +0 | +0 | +0 | +0 | +2 | +0 | +2 | +0 |
| smallest narrower scope: partial-count parts only | +0 | +6 | +2 | +0 | +0 | +2 | +0 | +5 | +3 |
| **temp prototype: all-family sum4 + epsilon-stable compare rounding** | +0 | +0 | +0 | +0 | +0 | +0 | +0 | +0 | +0 |

## 7. Single-card anchor verification under the temp candidate semantics

Anchors checked under the temp prototype semantics (`all-family sum4 + epsilon-stable compare rounding`):

| anchor | field | expected | prototype | exact |
| --- | --- | --- | --- | --- |
| Scout Drones + 4x Amulet | acc | 40 | 40 | yes |
| Scout Drones + 4x Amulet | dodge | 5 | 5 | yes |
| Scout Drones + 4x Amulet | defSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | gunSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | meleeSkill | 42 | 42 | yes |
| Scout Drones + 4x Amulet | projSkill | 70 | 70 | yes |
| Bio + 4x Perfect Pink | acc | 1 | 1 | yes |
| Bio + 4x Perfect Pink | dodge | 1 | 1 | yes |
| Bio + 4x Perfect Pink | defSkill | 117 | 117 | yes |
| Bio + 4x Perfect Pink | gunSkill | 65 | 65 | yes |
| Bio + 4x Perfect Pink | meleeSkill | 65 | 65 | yes |
| Bio + 4x Perfect Pink | projSkill | 65 | 65 | yes |

Result:

- the temp candidate semantics preserved both anchored single-card truths exactly

## 8. Why armor-family compare-style handling matters even though the armor is 4-slot

The live build armor is full-slot (`4x Abyss`), but it still runs through the same tracked stat-stack mode selection:

- `computeVariant(...)` / `computeVariantFromCrystalSpec(...)`
- `applyStat(...)`
- `applyCrystalPctToStat(...)`
- armor-specific fields use `armorStatStack`, which inherits from the active live stat stack mode unless overridden

In the current live tracked config that means armor crystal stats are still using `iter4`, not compare-style `sum4`.

That matters because this armor contributes directly to:

- speed
- dodge
- defSkill
- armor

Concrete effect from the matrix:

- baseline armor-family contribution keeps the live build at `speed +6`, `dodge +2`, `armor +3`
- switching the armor family to compare-style collapses those fields to the live anchor

So armor-family handling matters here because it shares the same stat-crystal stack semantics issue, even though the armor itself is not partial-count.

## 9. Can the remaining melee +2 / def +2 residual be localized more narrowly?

Yes.

After all-family compare-style stat stacking, the remaining `melee +2 / def +2` residual localizes to floating-point ceil behavior in the compare-style stat branch itself, not to Bio helper logic.

Concrete source:

- Reaper Axe 3x Amulet under raw compare-style sum4 yields:
  - `meleeSkill 105` instead of the intended `104`
  - `defSkill 14` instead of the intended `13`
- Bio 3x Perfect Pink yields:
  - `defSkill 105` instead of intended `104`
- Bio 3x Perfect Orange yields:
  - `meleeSkill 105` instead of intended `104`

This comes from expressions like:

- `80 * (0.1 * 3)` -> `24.000000000000004`
- `65 * (0.2 * 3)` -> `39.00000000000001`

which then hit `Math.ceil(...)` inside compare-style stat rounding and round up by 1.

The temp prototype row removes exactly that residual and lands on:

- HP 650
- Speed 216
- Dodge 164
- Accuracy 186
- Gun 580
- Melee 723
- Projectile 580
- Def 704
- Armor 83

## 10. Optional cheap non-duplicate sanity note

No pair-context or Bio helper work was added to the temp prototype. It only changed shared stat-crystal application semantics in temp code.

Representative non-duplicate compiled stat profile under shared compare-style semantics remains a normal compile-time stat result:

```json
{
  "speed": 216,
  "dodge": 164,
  "accuracy": 186,
  "gunSkill": 580,
  "meleeSkill": 725,
  "projSkill": 580,
  "defSkill": 706,
  "armor": 83
}
```

That remains consistent with the handoff’s earlier conclusion that the first mismatch is not in pair-context aggregation.

## 11. Best explanation now

### 1. Is the best explanation now a shared stat-crystal stack semantics issue rather than a Bio-specific issue?

Yes.

This pass points away from Bio-specific logic and toward a shared stat-layer issue:

- best-fit row requires compare-style handling across armor + weapons + miscs
- anchored single-card truths remain exact under the temp prototype
- no Bio helper or combat-resolution change was needed to hit the live stat anchor

### 2. What is the smallest candidate tracked patch scope that would reproduce the live stat anchor most closely?

Smallest plausible candidate scope:

- **only builds/parts using the explicit represented-build path with per-part crystal arrays / per-part slot counts**
- within that represented path, use **shared compare-style stat stacking for all stat-crystal-bearing families**
- and stabilize compare-style rounding in the shared stat path to avoid floating-point `ceil` overshoot

This is narrower than a global legacy behavior change.

### 3. Why does armor-family compare-style handling matter here even though the armor itself is 4-slot, not partial-count?

Because the live tracked config currently applies the same inherited stat-stack semantics to armor-family stat crystals, and this armor contributes to speed/dodge/def/armor directly.

### 4. Can the remaining melee +2 / def +2 residual be localized to one narrower source after all-family compare-style stat stacking?

Yes.

It localizes to **shared compare-style stat rounding precision**, not to Bio helper logic and not to combat-resolution logic.

### 5. Is there a safe temp-only prototype of the smallest candidate patch that preserves existing anchored single-card truths?

Yes.

This pass used one:

- shared all-family compare-style stat stacking
- epsilon-stabilized compare-style rounding before `ceil` / `floor`

It matched the live stat anchor exactly and preserved both anchored single-card truths exactly.

## 12. Best current patch-surface recommendation

If a tracked patch is attempted later, the best current patch surface is:

- shared stat-crystal application path in [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
  - `applyCrystalPctToStat(...)`
  - and the config/caller selection in `computeVariant(...)` / `computeVariantFromCrystalSpec(...)`

Not recommended as patch surfaces:

- Bio helper block
- combat-resolution functions
- brute in this pass

## 13. Is a tracked patch justified yet?

Not as a global legacy behavior change.

What **is** justified now:

- the next tracked patch, if pursued, should be scoped as a **representation/stat-stack semantics patch** for the explicit per-part mixed-slot representation path
- not as a Bio-specific fix
- not as a combat fix

Single remaining narrow blocker before a tracked implementation:

- deciding whether the compare-style stat-stack semantics should apply only to explicit per-part represented builds, or more broadly to any explicit crystal-array path in legacy

## 14. What ChatGPT should do next

Use this report as the handoff. If you want to patch next, keep the change out of Bio helper and combat logic: make the smallest representation-scoped patch in the shared stat-crystal application path, gate it to the explicit per-part represented build path, and leave weapon display and predictedDamage out of scope.
