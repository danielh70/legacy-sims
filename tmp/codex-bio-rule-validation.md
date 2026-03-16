# codex-bio rule validation

## 1. Goal of this pass

Do one final temp-only validation pass for the best-ranked Bio duplicate/color rule family before any tracked-source patch, using only the explicit finalists: Baseline, Rule B, Rule C, and the requested C-lite sanity control.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/codex-bio-slot-order-analysis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
sed -n '1,260p' ./tmp/codex-bio-variant-instrumentation.md
sed -n '1,260p' ./tmp/codex-bio-duplicate-color-diagnosis.md
sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json
rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
rg -n "partCrystalSpec|getEffectiveCrystalPct|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledCombatSnapshot|Bio Spinal Enhancer|Scout Drones" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js legacy-defs.js
node ./tmp/codex-bio-rule-validation.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-variant-instrumentation.md`
- `./tmp/codex-bio-duplicate-color-diagnosis.md`
- `./tmp/codex-bio-slot-order-analysis.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
- `./brute-sim-v1.4.6.js`
  - inspected for source hygiene only in this pass
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Abandoned Bio/Pink shell helper active anywhere in tracked simulators: no
- Name-search remnants in `legacy-sim`: none
- Name-search remnants in `brute-sim`: none

## 5. Candidate rules tested

| Candidate | Definition |
| --- | --- |
| Baseline | No change. |
| Rule B | Second Pink Bio crystal-derived delta scaled by `1.5`; second Orange unchanged. |
| Rule C | Second Pink Bio crystal-derived delta scaled by `1.5`; second Orange scaled by `0.85`. |
| Rule C-lite | Second Pink `1.5`; second Orange `1.0`. |

Important note:

- In this helper model, **Rule C-lite is mathematically identical to Rule B** because “second Orange unchanged” means scale `1.0`.

## 6. Per-slot temporary misc delta definitions for each candidate

All rules act on the **crystal-derived** delta only. Flat Bio item stats remain unchanged.

Legacy baseline crystal-derived deltas:

- first Bio[P4]: Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0
- second Bio[P4] baseline: Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0
- second Bio[O4] baseline: Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 52.0, Prj 0.0

Candidate-applied second-slot crystal-derived deltas:

| Candidate | first Bio[P4] crystal delta | second Bio[P4] crystal delta | second Bio[O4] crystal delta |
| --- | --- | --- | --- |
| Baseline | Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 52.0, Prj 0.0 |
| Rule B | Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 78.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 52.0, Prj 0.0 |
| Rule C | Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 78.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 44.2, Prj 0.0 |
| Rule C-lite | Spd 0.0, Acc 0.0, Dod 0.0, Def 52.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 78.0, Gun 0.0, Mel 0.0, Prj 0.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 52.0, Prj 0.0 |

## 7. Side-by-side marginal comparison tables vs truth

### Baseline

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | no-Bio -> one-Bio[P4] | -15.302 / +0.8054 | -13.250 / +0.5294 | 2.052 | 0.2760 |
| Dual Rift | one-Bio -> two-Bio[P4] | -17.630 / +0.8478 | -13.635 / +0.5698 | 3.995 | 0.2781 |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -1.615 / -0.0343 | 0.703 | 0.1455 |
| Core/Rift | no-Bio -> one-Bio[P4] | -16.302 / +0.9578 | -12.355 / +0.7133 | 3.947 | 0.2445 |
| Core/Rift | one-Bio -> two-Bio[P4] | -13.008 / +0.9271 | -7.555 / +0.7855 | 5.453 | 0.1416 |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -0.690 / -0.0159 | 1.458 | 0.2635 |

### Rule B

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | no-Bio -> one-Bio[P4] | -15.302 / +0.8054 | -13.250 / +0.5294 | 2.052 | 0.2760 |
| Dual Rift | one-Bio -> two-Bio[P4] | -17.630 / +0.8478 | -18.240 / +0.8362 | 0.610 | 0.0116 |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -1.615 / -0.0343 | 0.703 | 0.1455 |
| Core/Rift | no-Bio -> one-Bio[P4] | -16.302 / +0.9578 | -12.355 / +0.7133 | 3.947 | 0.2445 |
| Core/Rift | one-Bio -> two-Bio[P4] | -13.008 / +0.9271 | -13.135 / +1.0762 | 0.127 | 0.1491 |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -0.690 / -0.0159 | 1.458 | 0.2635 |

### Rule C

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | no-Bio -> one-Bio[P4] | -15.302 / +0.8054 | -13.250 / +0.5294 | 2.052 | 0.2760 |
| Dual Rift | one-Bio -> two-Bio[P4] | -17.630 / +0.8478 | -18.240 / +0.8362 | 0.610 | 0.0116 |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -1.615 / -0.0343 | 0.703 | 0.1455 |
| Core/Rift | no-Bio -> one-Bio[P4] | -16.302 / +0.9578 | -12.355 / +0.7133 | 3.947 | 0.2445 |
| Core/Rift | one-Bio -> two-Bio[P4] | -13.008 / +0.9271 | -13.135 / +1.0762 | 0.127 | 0.1491 |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -0.360 / +0.0057 | 1.788 | 0.2851 |

### Rule C-lite

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | no-Bio -> one-Bio[P4] | -15.302 / +0.8054 | -13.250 / +0.5294 | 2.052 | 0.2760 |
| Dual Rift | one-Bio -> two-Bio[P4] | -17.630 / +0.8478 | -18.240 / +0.8362 | 0.610 | 0.0116 |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -1.615 / -0.0343 | 0.703 | 0.1455 |
| Core/Rift | no-Bio -> one-Bio[P4] | -16.302 / +0.9578 | -12.355 / +0.7133 | 3.947 | 0.2445 |
| Core/Rift | one-Bio -> two-Bio[P4] | -13.008 / +0.9271 | -13.135 / +1.0762 | 0.127 | 0.1491 |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -0.690 / -0.0159 | 1.458 | 0.2635 |

Containment note:

- Because Rules B/C/C-lite only alter the **second** Bio slot, the `no-Bio -> one-Bio[P4]` marginal is unchanged versus baseline for all three non-baseline candidates.

## 8. Candidate ranking

Ranking below uses the four **targeted** marginals only:

- Dual Rift: `one-Bio -> two-Bio[P4]`, `one-Bio -> Bio[P4]+Bio[O4]`
- Core/Rift: `one-Bio -> two-Bio[P4]`, `one-Bio -> Bio[P4]+Bio[O4]`

| Rank | Candidate | meanAbsΔwin targeted | meanAbsΔavgTurns targeted | worstAbsΔwin targeted | meanAbsΔwin containment | meanAbsΔavgTurns containment | no-Bio -> one-Bio vs baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Rule B | 0.724 | 0.1424 | 1.458 | 3.000 | 0.2603 | unchanged |
| 2 | Rule C-lite | 0.724 | 0.1424 | 1.458 | 3.000 | 0.2603 | unchanged |
| 3 | Rule C | 0.807 | 0.1478 | 1.788 | 3.000 | 0.2603 | unchanged |
| 4 | Baseline | 2.902 | 0.2072 | 5.453 | 3.000 | 0.2603 | unchanged |

Validation readout:

- Rule B improves targeted meanAbsΔwin from 2.902 to 0.724.
- Rule C improves targeted meanAbsΔwin from 2.902 to 0.807.
- Rule B beats Rule C by 0.083 meanAbsΔwin and 0.0054 meanAbsΔavgTurns on the targeted set.
- Rule C-lite and Rule B are identical in output in this helper model.

## 9. Best explanation now

The final validation pass still supports the duplicate/color theory, but in a narrower form than “all Bio weighting”:

- Baseline linear math under-shoots the second Pink effect in both shells.
- A generic second-Bio boost (Rule A in the previous pass) is worse than the Pink-specific finalists.
- Rule B already captures most of the gain, which confirms that **second Pink scaling** is the dominant missing ingredient.
- The extra Orange down-scale in Rule C does not survive this final deterministic validation as an improvement over Rule B.

Best explanation now:

**The missing rule is best modeled as Pink-specific second-copy scaling, without needing a separate Orange weakening term in the smallest patch.**

## 10. Recommendation

**PATCH CANDIDATE READY**

## 11. If PATCH CANDIDATE READY

- Preferred rule: **Rule B**
- Why Rule B over Rule C: it is smaller and it wins the final deterministic validation on targeted meanAbsΔwin (0.083) while keeping the no-Bio -> one-Bio containment unchanged.
- Exact smallest rule to patch: in the shared Bio misc variant surface, leave the **first** Bio crystal-derived delta unchanged; scale the **second Pink Bio** crystal-derived delta by `1.5`; leave the **second Orange Bio** unchanged.
- Exact file/function/block to patch next:
  - `legacy-sim-v1.0.4-clean.js` in or immediately around `computeVariantFromCrystalSpec(...)` where misc flat stats and crystal-derived stat deltas are combined for Bio misc items
  - mirrored in `brute-sim-v1.4.6.js` in the corresponding `computeVariantFromCrystalSpec(...)` misc variant logic
- Do not apply it in this pass.

## 12. What ChatGPT should do next

Use this report as the final pre-patch handoff. Implement Rule B at the shared Bio misc variant surface in both simulators, explicitly preserving first-copy Bio behavior and changing only the second Pink Bio crystal-derived delta, then rerun the same truth probes and the slot-order containment check immediately.
