# codex-bio duplicate/color diagnosis

## 1. Goal of this pass

Determine whether the remaining Bio-family mismatch is best explained by duplicate/second-Bio scaling, Pink-vs-Orange Bio color asymmetry, or a broader hidden misc contribution rule, without patching tracked sources.

## 2. Exact commands run

```sh
ls -1 ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json
sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md
sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md
sed -n '1,240p' ./tmp/codex-bio-pink-shell-microcheck.md
sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json
rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
rg -n "function partCrystalSpec|function getEffectiveCrystalPct|function computeVariantFromCrystalSpec|function compileCombatantFromParts|function buildCompiledCombatSnapshot|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|duplicate|dup|Bio Spinal Enhancer" legacy-sim-v1.0.4-clean.js
rg -n "function partCrystalSpec|function rebuildMiscVariantForSlot|function compileDefender|function compileAttacker|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|duplicate|dup|Bio Spinal Enhancer" brute-sim-v1.4.6.js
sed -n '381,470p' legacy-sim-v1.0.4-clean.js
sed -n '1898,1975p' legacy-sim-v1.0.4-clean.js
sed -n '2446,2675p' legacy-sim-v1.0.4-clean.js
sed -n '3877,3945p' legacy-sim-v1.0.4-clean.js
sed -n '720,780p' brute-sim-v1.4.6.js
sed -n '2188,2234p' brute-sim-v1.4.6.js
sed -n '3248,3545p' brute-sim-v1.4.6.js
sed -n '1,240p' legacy-defs.js
node ./tmp/codex-bio-duplicate-color-diagnosis.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-slot-order-analysis.md`
- `./tmp/codex-bio-surface-sweep-report.md`
- `./tmp/codex-bio-pink-shell-microcheck.md`
- `./tmp/codex-bio-pink-shell-verify-results.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
- `./brute-sim-v1.4.6.js`
  - `partCrystalSpec(...)`
  - `rebuildMiscVariantForSlot(...)`
  - `compileDefender(...)`
  - `compileAttacker(...)`
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Abandoned experimental Bio/Pink shell helper active in `legacy-sim`: no
- Abandoned experimental Bio/Pink shell helper active in `brute-sim`: no
- Remnants found by name search in tracked simulators: none

## 5. Truth-side marginal transition tables

Truth values here use the canonical rows from `./tmp/legacy-truth-double-bio-probe.json`. The slot-order pack is used only to bound order noise on the one-Bio and mixed-color states.

### Dual Rift

| Transition | Δwin | ΔavgTurns | Slot-order noise bound from new pack |
| --- | ---: | ---: | --- |
| No Bio -> One Bio[P4] | -15.302 | +0.8054 | one-Bio left/right: +0.160 win, -0.0068 turns |
| One Bio[P4] -> Two Bio[P4] | -17.630 | +0.8478 | much larger than one-Bio order noise |
| One Bio[P4] -> Bio[P4]+Bio[O4] | -0.912 | -0.1798 | mixed-order left/right: -0.004 win, -0.0148 turns |
| Bio[P4]+Bio[O4] -> Two Bio[P4] | -16.718 | +1.0276 | much larger than mixed-order noise |

### Core/Rift

| Transition | Δwin | ΔavgTurns | Slot-order noise bound from new pack |
| --- | ---: | ---: | --- |
| No Bio -> One Bio[P4] | -16.302 | +0.9578 | one-Bio left/right: +0.242 win, -0.0005 turns |
| One Bio[P4] -> Two Bio[P4] | -13.008 | +0.9271 | much larger than one-Bio order noise |
| One Bio[P4] -> Bio[P4]+Bio[O4] | -2.148 | -0.2794 | mixed-order left/right: +0.536 win, -0.0085 turns |
| Bio[P4]+Bio[O4] -> Two Bio[P4] | -10.860 | +1.2065 | much larger than mixed-order noise |

Truth readout:

- The second Pink Bio is the dominant truth-side step in both shells: -17.630 win in Dual Rift and -13.008 win in Core/Rift.
- Pink-vs-Orange also matters, but materially less than the second-Pink step: one-Bio -> mixed is -0.912 / -2.148 win, while mixed -> two-Pink is -16.718 / -10.860 win.
- The new slot-order pack bounds order effects at only 0.536 win max, so order is not the main driver here.

## 6. Compile-side marginal transition tables

Current compile matrix from `legacy-sim-v1.0.4-clean.js`:

### Dual Rift

| State | misc1 | misc2 | hp | speed | acc | dodge | defSk | gun | melee | projectile | misc1 adds | misc2 adds |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| No Bio | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 251 | 285 | 129 | 644 | 740 | 510 | 550 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 |
| One Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 251 | 254 | 125 | 707 | 775 | 545 | 565 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 |
| Two Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 865 | 251 | 223 | 121 | 770 | 810 | 580 | 580 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 |
| Bio[P4]+Bio[O4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 865 | 251 | 223 | 121 | 718 | 810 | 632 | 580 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 1, Dod 1, Def 65, Gun 65, Mel 117, Prj 65 |

### Core/Rift

| State | misc1 | misc2 | hp | speed | acc | dodge | defSk | gun | melee | projectile | misc1 adds | misc2 adds |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| No Bio | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 276 | 253 | 129 | 707 | 748 | 818 | 550 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 |
| One Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 276 | 222 | 125 | 770 | 783 | 853 | 565 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 |
| Two Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 865 | 276 | 191 | 121 | 833 | 818 | 888 | 580 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 |
| Bio[P4]+Bio[O4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 865 | 276 | 191 | 121 | 781 | 818 | 940 | 580 | Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Acc 1, Dod 1, Def 65, Gun 65, Mel 117, Prj 65 |

Marginal compile deltas:

| Shell | Transition | Δhp | Δspeed | Δacc | Δdodge | ΔdefSk | Δgun | Δmelee | Δprojectile |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | +0 | +0 | -31 | -4 | +11 | +35 | +87 | +15 |
| Dual Rift | Bio[P4]+Bio[O4] -> Two Bio[P4] | +0 | +0 | +0 | +0 | +52 | +0 | -52 | +0 |
| Core/Rift | No Bio -> One Bio[P4] | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | +0 | +0 | -31 | -4 | +11 | +35 | +87 | +15 |
| Core/Rift | Bio[P4]+Bio[O4] -> Two Bio[P4] | +0 | +0 | +0 | +0 | +52 | +0 | -52 | +0 |

Direct answers from the current compile:

- **First Bio[P4] vs second Bio[P4]**: current compile is exactly linear. The second Bio[P4] adds the same misc contribution as the first Bio[P4] in both shells: Acc -31, Dod -4, Def +63, Gun +35, Mel +35, Prj +15.
- **Bio[P4] vs Bio[O4]**: current compile treats this as a simple crystal-color swap on the same Bio item. Relative to adding a second Bio[P4], the Bio[O4] version changes only Def and Melee on the second misc contribution: mixed -> two-Pink is Def +52 and Melee -52 with Gun/Prj/Acc/Dod unchanged.
- **Active duplicate scaling / suppression / cap / color branch**: none found in the active legacy compile path. The focused functions only do crystal pct application plus straight summation.
- **Dormant hook that could host such a rule**: `getEffectiveCrystalPct(...)` in legacy and its brute equivalent both have env-driven misc crystal skill multipliers plus a separate slot-2-only branch, but they are inactive by default and do not express duplicate-item logic.

## 7. Legacy vs brute parity notes for the same rows

### Raw truth parsing

| Row | Raw legacy misc1 spec present? | Raw brute misc1 spec present? | Raw legacy misc2 spec present? | Raw brute misc2 spec present? |
| --- | --- | --- | --- | --- |
| DL Dual Rift One Bio P4 | yes | no | yes | no |
| DL Dual Rift Two Bio P4 | yes | no | yes | no |
| DL Dual Rift Bio P4 + O4 | yes | no | yes | no |
| DL Core/Rift One Bio P4 | yes | no | yes | no |
| DL Core/Rift Two Bio P4 | yes | no | yes | no |
| DL Core/Rift Bio P4 + O4 | yes | no | yes | no |

Raw input-handling conclusion:

- Legacy `partCrystalSpec(...)` accepts legacy truth rows where crystals live in `upgrades: [...]`.
- Brute `partCrystalSpec(...)` does **not** fall back to `upgrades: [...]`, so the exact truth JSON shape does not carry misc crystal specs into brute directly.
- This is a real parity difference in payload parsing, but it is separate from the duplicate/color math once the build is normalized.

### Normalized compile parity on the same Bio-bearing defenders

| Row | Final defender stats equal after normalization? | Δacc | Δdodge | ΔdefSk | Δgun | Δmelee | Δprojectile | misc1 delta summary | misc2 delta summary |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| DL Dual Rift One Bio P4 | no | +6 | +2 | +35 | +12 | +0 | +0 | Def +19 | Def +10 |
| DL Dual Rift Two Bio P4 | no | +6 | +2 | +44 | +12 | +0 | +0 | Def +19 | Def +19 |
| DL Dual Rift Bio P4 + O4 | no | +6 | +2 | +25 | +12 | +19 | +0 | Def +19 | Mel +19 |
| DL Core/Rift One Bio P4 | no | +7 | +2 | +39 | +16 | +18 | +0 | Def +19 | Def +10 |
| DL Core/Rift Two Bio P4 | no | +7 | +2 | +48 | +16 | +18 | +0 | Def +19 | Def +19 |
| DL Core/Rift Bio P4 + O4 | no | +7 | +2 | +29 | +16 | +37 | +0 | Def +19 | Mel +19 |

Normalized parity conclusion:

- After normalizing the truth builds into explicit crystal specs, legacy and brute still do **not** compile to the same defender stats.
- The concrete cause is visible in current default config: legacy canonical compile uses `crystalStackStats: 'sum4'`, while brute uses `crystalStackStats: 'iter4'`.
- That makes brute amplify the same Pink/Orange misc crystal effects more aggressively. Example: Bio[P4] Def is `117` in legacy vs `136` in brute; Scout[P4] Def is `54` in legacy vs `64` in brute.
- Brute `compileAttacker(...)` has an extra `rebuildMiscVariantForSlot(m2v, 2)` step that defender compile does not use, but with the current default empty slot-2 multiplier map that path is a no-op.
- This parity drift is real and must be preserved as a risk note for any future patch, but it still does not explain the legacy truth-shape problem by itself: the legacy path already shows the missing second-Bio / Pink-vs-Orange structure before brute enters the picture.

## 8. Best explanation now

**Strongest explanation: duplicate / second-Bio scaling is missing**

Reason:

- Truth shows the second Pink Bio is the largest incremental step in both shells.
- Current compile treats the second Bio[P4] as a perfect linear repeat of the first with no duplicate-item scaling, suppression, cap, or second-copy branch.
- That is the clearest mismatch between truth structure and compiled structure.

**Secondary explanation: Pink-vs-Orange color asymmetry is also missing or incomplete**

Reason:

- Truth clearly distinguishes two-Pink from Pink+Orange, but the gap is smaller than the second-Bio gap.
- Current compile already distinguishes Pink vs Orange, but only by the direct crystal-color stat swap on the Bio item: Pink inflates Def while Orange inflates Melee.
- If the true game logic has a stronger Pink-specific second-copy effect, the current simple color swap is too weak.

**Weaker fallback: broader misc contribution rule**

Reason:

- No active duplicate-item or Bio-specific branch was found in the focused compile functions.
- If duplicate scaling and stronger Pink-specific handling are still not enough, the next broader suspect surface is the misc crystal pct application block itself, not shell logic or slot order.
- Separate parity caution: brute currently layers an `iter4` stat-crystal stack on top of the same items, so any eventual patch must be checked against that existing simulator drift.

## 9. Ranked patch surfaces

1. **Most plausible first surface**: `legacy-sim-v1.0.4-clean.js` `computeVariantFromCrystalSpec(...)` misc flat-stat crystal application for Bio misc items, mirrored in `brute-sim-v1.4.6.js` `computeVariantFromCrystalSpec(...)`.
   This is the smallest shared surface that currently produces the linear repeated Bio[P4] contribution and the simple Pink-vs-Orange swap.
2. **Second surface**: `legacy-sim-v1.0.4-clean.js` `getEffectiveCrystalPct(...)` misc crystal multiplier block, mirrored in the brute misc crystal pct block around `MISC_NO_CRYSTAL_SKILL_TYPE_MULTS` and `MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS`.
   This is a plausible host for item/color-sensitive crystal scaling, but it is broader-risk and currently only supports env-driven generic misc multipliers.
3. **Broader fallback surface**: `legacy-sim-v1.0.4-clean.js` `compileCombatantFromParts(...)` misc aggregation, mirrored in `brute-sim-v1.4.6.js` `compileDefender(...)`.
   This would be the place for a hidden duplicate-item cap or second-copy suppression after variant compilation, but current evidence is weaker because the compile sums are otherwise clean and linear.

## 10. Recommendation

**NEED ONE MICRO-INSTRUMENTATION PASS**

Reason:

- The evidence now isolates the suspect family to shared Bio misc contribution math.
- It does **not** yet isolate whether the missing rule is specifically second-copy scaling, Pink-specific second-copy scaling, or a slightly broader Bio misc crystal rule.
- That is narrow enough for instrumentation, but not yet clean enough for a behavior patch claim.

## 11. If PATCH CANDIDATE READY

Not applicable. This pass does not isolate a decision-ready narrow rule.

## 12. What ChatGPT should do next

Do one temp-only instrumentation pass centered on `computeVariantFromCrystalSpec(...)` in both simulators. Dump the exact Bio[P4], Bio[O4], Scout[P4], and aggregated two-misc totals for the four canonical states, then test a tiny set of offline hypothetical rules that alter only the second Bio and only Pink-vs-Orange weighting. If one rule explains the truth transitions without moving no-Bio rows, then patch that exact shared variant block next.
