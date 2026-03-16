# codex-bio pair-context aggregation check

## 1. Goal of this pass

Use the current reverted live Rule B activation-only code as the baseline and test the next layer above single-card misc anchors: add misc1 + misc2 card totals, compare that naive sum to the helper-adjusted sum, then compare both to the final compiled defender state to isolate exactly where pair-context or aggregation divergence begins.

## 2. Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '2611,2825p' legacy-sim-v1.0.4-clean.js
sed -n '3370,3425p' legacy-sim-v1.0.4-clean.js
sed -n '3386,3475p' brute-sim-v1.4.6.js
node ./tmp/codex-bio-pair-context-aggregation-check.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-card-anchor-instrumentation.md`
- `./tmp/codex-bio-revert-to-live-rule-b-report.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./legacy-sim-v1.0.4-clean.js`
  - `computeVariant(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - `compileCombatantFromParts(...)`
- `./brute-sim-v1.4.6.js`
  - `computeVariant(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - `compileDefender(...)`
- `./legacy-defs.js`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Legacy compile path layers for misc contribution handling are:
  - single-misc variant build: `computeVariant(...)`
  - two-misc combination before helper: direct additive use of `m1V` + `m2V`
  - Rule B / local Bio helper adjustment: `applyValidatedDuplicateBioPinkScaling(...)`
  - final compiled combatant stats: `compileCombatantFromParts(...)`
- No tracked edits were made in this pass.

## 5. Legacy layered decomposition tables for the canonical states

These final compiled checks used zeroed armor/weapon variants and zero speed/accuracy/dodge base stats so the misc contribution path is isolated. Gun/melee/projectile/defense still carry the simulator's fixed `BASE` offsets in the final compiled layer; that offset is not pair-context logic.

### Scout[P4] + Scout[P4]

- misc1 single-card: acc 32, dodge 5, def 54, gun 30, mel 30, prj 50, spd 0, arm 0
- misc2 single-card: acc 32, dodge 5, def 54, gun 30, mel 30, prj 50, spd 0, arm 0
- naive additive misc total: acc 64, dodge 10, def 108, gun 60, mel 60, prj 100, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 0, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 64, dodge 10, def 108, gun 60, mel 60, prj 100, spd 0, arm 0
- final compiled defender stats: acc 64, dodge 10, def 558, gun 510, mel 510, prj 550, spd 0
- naive -> post-helper changed fields: none
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450

### Bio[P4] + Scout[P4]

- misc1 single-card: acc 1, dodge 1, def 117, gun 65, mel 65, prj 65, spd 0, arm 0
- misc2 single-card: acc 32, dodge 5, def 54, gun 30, mel 30, prj 50, spd 0, arm 0
- naive additive misc total: acc 33, dodge 6, def 171, gun 95, mel 95, prj 115, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 0, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 33, dodge 6, def 171, gun 95, mel 95, prj 115, spd 0, arm 0
- final compiled defender stats: acc 33, dodge 6, def 621, gun 545, mel 545, prj 565, spd 0
- naive -> post-helper changed fields: none
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450

### Bio[P4] + Bio[P4]

- misc1 single-card: acc 1, dodge 1, def 117, gun 65, mel 65, prj 65, spd 0, arm 0
- misc2 single-card: acc 1, dodge 1, def 117, gun 65, mel 65, prj 65, spd 0, arm 0
- naive additive misc total: acc 2, dodge 2, def 234, gun 130, mel 130, prj 130, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 26, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 2, dodge 2, def 260, gun 130, mel 130, prj 130, spd 0, arm 0
- final compiled defender stats: acc 2, dodge 2, def 710, gun 580, mel 580, prj 580, spd 0
- naive -> post-helper changed fields: defSkill +26
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450

### Bio[P4] + Bio[O4]

- misc1 single-card: acc 1, dodge 1, def 117, gun 65, mel 65, prj 65, spd 0, arm 0
- misc2 single-card: acc 1, dodge 1, def 65, gun 65, mel 117, prj 65, spd 0, arm 0
- naive additive misc total: acc 2, dodge 2, def 182, gun 130, mel 182, prj 130, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 0, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 2, dodge 2, def 182, gun 130, mel 182, prj 130, spd 0, arm 0
- final compiled defender stats: acc 2, dodge 2, def 632, gun 580, mel 632, prj 580, spd 0
- naive -> post-helper changed fields: none
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450

### Bio[O4] + Scout[P4]

- misc1 single-card: acc 1, dodge 1, def 65, gun 65, mel 117, prj 65, spd 0, arm 0
- misc2 single-card: acc 32, dodge 5, def 54, gun 30, mel 30, prj 50, spd 0, arm 0
- naive additive misc total: acc 33, dodge 6, def 119, gun 95, mel 147, prj 115, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 0, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 33, dodge 6, def 119, gun 95, mel 147, prj 115, spd 0, arm 0
- final compiled defender stats: acc 33, dodge 6, def 569, gun 545, mel 597, prj 565, spd 0
- naive -> post-helper changed fields: none
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450

### Bio[O4] + Bio[O4]

- misc1 single-card: acc 1, dodge 1, def 65, gun 65, mel 117, prj 65, spd 0, arm 0
- misc2 single-card: acc 1, dodge 1, def 65, gun 65, mel 117, prj 65, spd 0, arm 0
- naive additive misc total: acc 2, dodge 2, def 130, gun 130, mel 234, prj 130, spd 0, arm 0
- helper delta after pair context: acc 0, dodge 0, def 0, gun 0, mel 0, prj 0, spd 0, arm 0
- final misc total after helper: acc 2, dodge 2, def 130, gun 130, mel 234, prj 130, spd 0, arm 0
- final compiled defender stats: acc 2, dodge 2, def 580, gun 580, mel 684, prj 580, spd 0
- naive -> post-helper changed fields: none
- post-helper misc total -> final compiled stat offsets: defSkill +450, gunSkill +450, meleeSkill +450, projSkill +450


## 6. Optional brute parity notes

Brute shows the same pair-context pattern at this layer, but on different single-card totals because its default stat-crystal stacking is still `iter4`.

| State | helper delta | post-helper misc total |
| --- | --- | --- |
| Scout[P4] + Scout[P4] | none | acc 64, dodge 10, def 128, gun 60, mel 60, prj 100, spd 0, arm 0 |
| Bio[P4] + Scout[P4] | none | acc 33, dodge 6, def 200, gun 95, mel 95, prj 115, spd 0, arm 0 |
| Bio[P4] + Bio[P4] | defSkill +35.5 | acc 2, dodge 2, def 307.5, gun 130, mel 130, prj 130, spd 0, arm 0 |
| Bio[P4] + Bio[O4] | none | acc 2, dodge 2, def 201, gun 130, mel 201, prj 130, spd 0, arm 0 |
| Bio[O4] + Scout[P4] | none | acc 33, dodge 6, def 129, gun 95, mel 166, prj 115, spd 0, arm 0 |
| Bio[O4] + Bio[O4] | none | acc 2, dodge 2, def 130, gun 130, mel 272, prj 130, spd 0, arm 0 |

## 7. Best explanation now

- Is legacy behaving as simple item-card addition except where Rule B explicitly intervenes?
  - yes
- State-by-state:
  - `Scout[P4] + Scout[P4]`: simple sum, no helper delta
  - `Bio[P4] + Scout[P4]`: simple sum, no helper delta
  - `Bio[P4] + Bio[P4]`: first state where simple sum stops; helper adds only `defSkill +26`
  - `Bio[P4] + Bio[O4]`: simple sum, no helper delta
  - `Bio[O4] + Scout[P4]`: simple sum, no helper delta
  - `Bio[O4] + Bio[O4]`: simple sum, no helper delta
- Is the divergence entirely explained by the local Rule B helper, or is there another aggregation/context effect above it?
  - at this pair-context aggregation layer, the only divergence from naive item-card addition is the local Rule B helper on exact `Bio[P4] + Bio[P4]`
- For `Bio[P4] + Scout[P4]` and `Bio[P4] + Bio[O4]`, is there any pair-context delta right now?
  - no
- If one-Bio and mixed rows still miss truth while compile remains a simple sum for them, does that push suspicion upward into combat resolution rather than misc aggregation?
  - yes; the smallest plausible suspect now sits above basic misc pair aggregation in legacy, not inside single-card math or non-duplicate misc summation

## 8. Recommendation

**PAIR-CONTEXT/AGGREGATION LOOKS CORRECT; LOOK HIGHER**

## 9. What ChatGPT should do next

Use this report as the handoff. Keep treating legacy misc aggregation as anchored for all non-duplicate Bio pair states, and shift the next diagnosis step above this layer: final compiled combatant context outside misc summation or combat-resolution behavior rather than additional misc-card aggregation rules.
