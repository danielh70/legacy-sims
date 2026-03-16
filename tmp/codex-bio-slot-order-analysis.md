# codex-bio slot-order analysis

## 1. Goal of this pass

Use the new slot-order truth pack to decide whether the remaining Bio-family mismatch is better explained by slot order, duplicate-Bio scaling, Pink-vs-Orange asymmetry, or a broader shell-only rule, without patching tracked sources.

## 2. Exact commands run

```sh
ls -1 ./tmp/legacy-truth-bio-slot-order-probe.json
sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md
sed -n '1,240p' ./tmp/codex-bio-pink-shell-microcheck.md
sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md
sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json
rg -n 'slotTag|rebuildMiscVariantForSlot|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|MISC_NO_CRYSTAL_SKILL|compileCombatantFromParts|compileDefender|compileAttacker|partCrystalSpec|computeVariantFromCrystalSpec' legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
rg --files | rg 'legacy-debug-handoff-2026-03-15\.md$'
node - <<'NODE' ... // extract unique defender names from ./tmp/legacy-truth-bio-slot-order-probe.json
sed -n '1888,1948p' legacy-sim-v1.0.4-clean.js
sed -n '2520,2665p' legacy-sim-v1.0.4-clean.js
sed -n '2700,2795p' legacy-sim-v1.0.4-clean.js
sed -n '3238,3338p' brute-sim-v1.4.6.js
rg -n "pageBuilds|requestedPageBuilds|verifiedPageBuilds" tools/legacy-truth-replay-compare.js
node ./tmp/codex-bio-slot-order-analysis.js
```

## 3. Exact files/functions inspected

- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./tmp/codex-bio-surface-sweep-report.md`
- `./tmp/codex-bio-pink-shell-microcheck.md`
- `./tmp/codex-bio-pink-shell-verify-results.md`
- `./legacy-debug-handoff-2026-03-15.md` was requested but is missing from this repo root.
- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct(...)`
  - `partCrystalSpec(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
- `./brute-sim-v1.4.6.js`
  - `rebuildMiscVariantForSlot(...)`
  - `compileDefender(...)`
  - `compileAttacker(...)`
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`
  - page-build replay path around `pageBuilds` / `verifiedPageBuilds`

## 4. The 12-row truth summary

### Dual Rift

| Row | misc1 | misc2 | truth win% | truth avgTurns |
| --- | --- | --- | ---: | ---: |
| No Bio | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 81.890 | 9.6861 |
| One Bio Left P4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 66.826 | 10.5156 |
| One Bio Right P4 | Scout Drones[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 66.986 | 10.5088 |
| Two Bio P4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 50.038 | 11.3286 |
| Bio P4 + O4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 66.942 | 10.3178 |
| Bio O4 + P4 | Bio Spinal Enhancer[Perfect Orange Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 66.938 | 10.3030 |

### Core/Rift

| Row | misc1 | misc2 | truth win% | truth avgTurns |
| --- | --- | --- | ---: | ---: |
| No Bio | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 73.426 | 10.7919 |
| One Bio Left P4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 56.608 | 11.7406 |
| One Bio Right P4 | Scout Drones[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 56.850 | 11.7401 |
| Two Bio P4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 44.240 | 12.6808 |
| Bio P4 + O4 | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 54.618 | 11.4698 |
| Bio O4 + P4 | Bio Spinal Enhancer[Perfect Orange Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 55.154 | 11.4613 |

## 5. Pairwise order-sensitive comparisons

| Shell | Pair | left row | right row | Δwin (right-left) | ΔavgTurns (right-left) | Truth order signal |
| --- | --- | --- | --- | ---: | ---: | --- |
| Dual Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | One Bio Left P4 | One Bio Right P4 | +0.160 | -0.0068 | no |
| Dual Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | Bio P4 + O4 | Bio O4 + P4 | -0.004 | -0.0148 | weak yes |
| Core/Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | One Bio Left P4 | One Bio Right P4 | +0.242 | -0.0005 | no |
| Core/Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | Bio P4 + O4 | Bio O4 + P4 | +0.536 | -0.0085 | weak yes |

Interpretation:

- One-Bio left/right order changes are small in both shells: Dual Rift +0.160 win and -0.0068 turns; Core/Rift +0.242 win and -0.0005 turns.
- Mixed Pink/Orange order is also small in Dual Rift (-0.004 win, -0.0148 turns) and only modest in Core/Rift (+0.536 win, -0.0085 turns).
- The largest slot-order signal in this pack is Core/Rift mixed order at 0.536 win. That is real enough to note, but still far smaller than the large one-Bio vs two-Bio and two-Pink vs Pink+Orange gaps already seen in the earlier truth packs.
- For scale, composition deltas are much larger: Dual Rift one-Bio to two-Bio is -16.948 win, Core/Rift one-Bio to two-Bio is -12.610 win, Dual Rift mixed-to-two-Pink is +16.904 win, and Core/Rift mixed-to-two-Pink is +10.378 win.

## 6. Compile-state comparison for the same swapped pairs

| Shell | Pair | Left misc1 contrib | Left misc2 contrib | Right misc1 contrib | Right misc2 contrib | Final compiled state identical? | Compile interpretation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dual Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Scout Drones[Perfect Pink Crystal] Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Scout Drones[Perfect Pink Crystal] Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | yes | slot labels swap, totals stay identical |
| Dual Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Bio Spinal Enhancer[Perfect Orange Crystal] Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 | Bio Spinal Enhancer[Perfect Orange Crystal] Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | yes | slot labels swap, totals stay identical |
| Core/Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Scout Drones[Perfect Pink Crystal] Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Scout Drones[Perfect Pink Crystal] Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | yes | slot labels swap, totals stay identical |
| Core/Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Bio Spinal Enhancer[Perfect Orange Crystal] Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 | Bio Spinal Enhancer[Perfect Orange Crystal] Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 | Bio Spinal Enhancer[Perfect Pink Crystal] Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | yes | slot labels swap, totals stay identical |

Final compiled defender signatures for the swapped pairs:

| Shell | Pair | Compiled hp | speed | acc | dodge | defSk | gun | melee | projectile | w1 dmg | w2 dmg |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Dual Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | 865 | 251 | 254 | 125 | 707 | 775 | 545 | 565 | 77-84 | 75-81 |
| Dual Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | 865 | 251 | 223 | 121 | 718 | 810 | 632 | 580 | 77-84 | 75-81 |
| Core/Rift | Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4] | 865 | 276 | 222 | 125 | 770 | 783 | 853 | 565 | 62-75 | 75-81 |
| Core/Rift | Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4] | 865 | 276 | 191 | 121 | 781 | 818 | 940 | 580 | 62-75 | 75-81 |

Current legacy compile conclusion:

- Final compiled state is order-insensitive for all four swapped pairs in the current default legacy path.
- The misc-slot contribution objects simply trade places when the build swaps misc1 and misc2.
- The dormant slot-2 hook is real: `getEffectiveCrystalPct(..., slotTag)` has a separate `MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS` branch, and brute has the same family through `rebuildMiscVariantForSlot(...)`.
- In this pass, that slot-2 branch is not active by default, so current compile behavior is effectively order-insensitive.

## 7. Whether slot order matters in truth

Yes, but only weakly.

- Truth is not perfectly symmetric under misc-slot swaps.
- The observed order effects are small: max |Δwin| 0.536, max |ΔavgTurns| 0.0148.
- That is not large enough to explain the main Bio-family mismatch by itself.

## 8. Whether slot order matters in current compile

No, not in the current default legacy compile path.

- All four swapped pairs compile to identical final defender states.
- The codebase does contain dormant slot-2-only misc logic, so slot order remains a credible source of small residual asymmetry if some hidden runtime configuration or missing rule should activate it.
- Based on this truth pack alone, slot-indexed suppression is not a serious explanation for the full Bio-family gap.

## 9. Ranked hypotheses now

1. **second-Bio / duplicate-Bio scaling**: Truth still shows the large step when moving from one Bio[P4] to two Bio[P4], far larger than any left/right order delta. This remains the strongest driver of the family mismatch.
2. **Pink-vs-Orange color asymmetry**: The mixed Bio[P4]+Bio[O4] rows sit far from the two-Pink rows in both shells, and the new slot-order pack keeps that color split visible while order effects stay small.
3. **slot-order rule**: Truth shows only weak order sensitivity: max |Δwin| 0.536 and max |ΔavgTurns| 0.0148 across the tested swapped pairs. That can explain at most a small residual, not the main Bio-family gap.
4. **broader shell-only rule**: Both shells show the same directional Bio count and Bio color pattern, so the evidence is weaker for a shell-exclusive rule than for a shared Bio-scaling rule with shell-dependent magnitude.

## 10. Note on the parked 400-vs-450 base-skill hypothesis

**Not informed by this pass**

Reason:

- The new truth pack is about misc-slot ordering and Bio color duplication patterns.
- A global base-skill offset would not naturally predict that left/right order effects stay tiny while duplicate-Bio and color composition remain the dominant pattern.
- This pack neither strengthens nor weakens the 400-vs-450 idea in a meaningful way; it mainly separates slot-order behavior from Bio-composition behavior.

## 11. Recommendation

**SWITCH SUSPECT FAMILY**

Reason:

- The new truth pack weakens slot-order asymmetry as the primary explanation.
- The strongest remaining suspects are a shared duplicate-Bio / second-Bio rule and a Pink-vs-Orange Bio rule, with shell only modulating magnitude.

## 12. If PATCH CANDIDATE READY

Not applicable. This pass does not isolate a decision-ready patch rule.

## 13. What ChatGPT should do next

Start from the current reverted code and investigate the Bio-bearing misc contribution family, not slot order. The next narrow diagnosis step should compare how the first Bio[P4], second Bio[P4], and Bio[O4] contributions are compiled in both simulators, with explicit attention to any duplicate-item scaling or color-specific rules that would apply regardless of whether the Bio lands in misc1 or misc2.
