# codex-bio final follow-up microcheck

## 1. Goal of this pass

Do one final temp-only microcheck on top of the live Rule B baseline to determine whether a combined follow-up rule is truly patch-ready while explicitly protecting duplicate-row behavior.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-validation.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1,220p' ./tmp/codex-bio-post-rule-b-followup-diagnosis.md
node ./tmp/codex-bio-final-followup-microcheck.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./tmp/codex-bio-rule-b-revision-diagnosis.md`
- `./tmp/codex-bio-rule-validation.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
- `./brute-sim-v1.4.6.js`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Tracked source still has live Rule B with activation fix: yes
- Current Rule B helper block remains local to `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)` in legacy and the mirrored block in brute.
- No tracked-source edits were made in this pass.

## 5. Candidate families tested

| Candidate | Family | Definition |
| --- | --- | --- |
| Baseline live Rule B | Baseline | Current tracked live Rule B only. |
| F1 first Pink 1.15 | F1 | Scale first Bio[P4] crystal delta by 1.15 only. |
| F1 first Pink 1.20 | F1 | Scale first Bio[P4] crystal delta by 1.20 only. |
| F1 first Pink 1.25 | F1 | Scale first Bio[P4] crystal delta by 1.25 only. |
| F2 second Orange 1.15 | F2 | Scale second Orange crystal delta by 1.15 only on mixed rows. |
| F2 second Orange 1.20 | F2 | Scale second Orange crystal delta by 1.20 only on mixed rows. |
| F2 second Orange 1.25 | F2 | Scale second Orange crystal delta by 1.25 only on mixed rows. |
| F3 combo 1.15/1.15 | F3 | Scale first Bio[P4] by 1.15 and second Orange by 1.15. |
| F3 combo 1.15/1.20 | F3 | Scale first Bio[P4] by 1.15 and second Orange by 1.20. |
| F3 combo 1.15/1.25 | F3 | Scale first Bio[P4] by 1.15 and second Orange by 1.25. |
| F3 combo 1.20/1.15 | F3 | Scale first Bio[P4] by 1.20 and second Orange by 1.15. |
| F3 combo 1.20/1.20 | F3 | Scale first Bio[P4] by 1.20 and second Orange by 1.20. |
| F3 combo 1.20/1.25 | F3 | Scale first Bio[P4] by 1.20 and second Orange by 1.25. |
| F3 combo 1.25/1.15 | F3 | Scale first Bio[P4] by 1.25 and second Orange by 1.15. |
| F3 combo 1.25/1.20 | F3 | Scale first Bio[P4] by 1.25 and second Orange by 1.20. |
| F3 combo 1.25/1.25 | F3 | Scale first Bio[P4] by 1.25 and second Orange by 1.25. |

## 6. Scoring method

A) Follow-up fit:
- `No Bio -> One Bio[P4]` marginal error for Dual Rift and Core/Rift
- `One Bio[P4] -> Bio[P4]+Bio[O4]` marginal error for Dual Rift and Core/Rift
- reported as `meanAbsΔwin` and `meanAbsΔavgT`

B) Duplicate containment:
- `One Bio[P4] -> Two Bio[P4]` marginal error for Dual Rift and Core/Rift
- absolute row error on `Two Bio[P4]` for Dual Rift and Core/Rift
- reported separately from follow-up fit

No-Bio containment:
- absolute row error on `No Bio` for Dual Rift and Core/Rift
- held off the unchanged live Rule B baseline

## 7. Follow-up fit tables

### Baseline live Rule B

| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | -15.302 / +0.8054 | -12.290 / +0.8039 | 3.012 | 0.0015 |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | +0.240 / -0.1975 | 1.152 | 0.0177 |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | -17.630 / +0.8478 | -21.590 / +1.2734 | 3.960 | 0.4256 |
| Core/Rift | No Bio -> One Bio[P4] | -16.302 / +0.9578 | -13.910 / +0.8933 | 2.392 | 0.0645 |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -1.860 / -0.2540 | 0.288 | 0.0254 |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | -13.008 / +0.9271 | -18.540 / +1.2903 | 5.532 | 0.3632 |

- Follow-up fit meanAbsΔwin: 1.711
- Follow-up fit meanAbsΔavgT: 0.0273
- Duplicate containment meanAbsΔwin: marginal 4.746, row 2.020
- Duplicate containment meanAbsΔavgT: marginal 0.3944, row 0.3811
- No-Bio containment meanAbsΔwin: 0.345, meanAbsΔavgT: 0.0560

### F3 combo 1.25/1.25

| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | -15.302 / +0.8054 | -15.320 / +0.9710 | 0.018 | 0.1656 |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -0.135 / -0.1972 | 0.777 | 0.0174 |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | -17.630 / +0.8478 | -21.125 / +1.2399 | 3.495 | 0.3921 |
| Core/Rift | No Bio -> One Bio[P4] | -16.302 / +0.9578 | -16.925 / +1.0747 | 0.623 | 0.1170 |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -1.845 / -0.3299 | 0.303 | 0.0505 |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | -13.008 / +0.9271 | -18.140 / +1.2588 | 5.132 | 0.3316 |

- Follow-up fit meanAbsΔwin: 0.430
- Follow-up fit meanAbsΔavgT: 0.0876
- Duplicate containment meanAbsΔwin: marginal 4.314, row 4.610
- Duplicate containment meanAbsΔavgT: marginal 0.3619, row 0.5228
- No-Bio containment meanAbsΔwin: 0.345, meanAbsΔavgT: 0.0560

### F3 combo 1.25/1.15

| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | -15.302 / +0.8054 | -15.320 / +0.9710 | 0.018 | 0.1656 |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -0.135 / -0.1972 | 0.777 | 0.0174 |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | -17.630 / +0.8478 | -21.125 / +1.2399 | 3.495 | 0.3921 |
| Core/Rift | No Bio -> One Bio[P4] | -16.302 / +0.9578 | -16.925 / +1.0747 | 0.623 | 0.1170 |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -1.665 / -0.3135 | 0.483 | 0.0342 |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | -13.008 / +0.9271 | -18.140 / +1.2588 | 5.132 | 0.3316 |

- Follow-up fit meanAbsΔwin: 0.475
- Follow-up fit meanAbsΔavgT: 0.0835
- Duplicate containment meanAbsΔwin: marginal 4.314, row 4.610
- Duplicate containment meanAbsΔavgT: marginal 0.3619, row 0.5228
- No-Bio containment meanAbsΔwin: 0.345, meanAbsΔavgT: 0.0560

### F3 combo 1.20/1.25

| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | -15.302 / +0.8054 | -14.530 / +0.9314 | 0.772 | 0.1260 |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -0.912 / -0.1798 | -0.180 / -0.1947 | 0.732 | 0.0149 |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | -17.630 / +0.8478 | -21.380 / +1.2533 | 3.750 | 0.4055 |
| Core/Rift | No Bio -> One Bio[P4] | -16.302 / +0.9578 | -16.375 / +1.0429 | 0.073 | 0.0851 |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | -2.148 / -0.2794 | -1.760 / -0.3400 | 0.388 | 0.0606 |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | -13.008 / +0.9271 | -18.170 / +1.2545 | 5.162 | 0.3274 |

- Follow-up fit meanAbsΔwin: 0.491
- Follow-up fit meanAbsΔavgT: 0.0716
- Duplicate containment meanAbsΔwin: marginal 4.456, row 4.083
- Duplicate containment meanAbsΔavgT: marginal 0.3664, row 0.4917
- No-Bio containment meanAbsΔwin: 0.345, meanAbsΔavgT: 0.0560

## 8. Duplicate containment tables

| Candidate | Dup marginal meanAbsΔwin | Dup marginal meanAbsΔavgT | Two Bio row meanAbsΔwin | Two Bio row meanAbsΔavgT |
| --- | ---: | ---: | ---: | ---: |
| Baseline live Rule B | 4.746 | 0.3944 | 2.020 | 0.3811 |
| F3 combo 1.25/1.25 | 4.314 | 0.3619 | 4.610 | 0.5228 |
| F3 combo 1.25/1.15 | 4.314 | 0.3619 | 4.610 | 0.5228 |
| F3 combo 1.20/1.25 | 4.456 | 0.3664 | 4.083 | 0.4917 |

## 9. No-Bio containment note

- No-Bio containment is unchanged across the temp-only candidates because the modeled follow-ups do not touch no-Bio rows; baseline meanAbsΔwin stays 0.345 and meanAbsΔavgT stays 0.0560.

## 10. Candidate ranking

| Rank | Candidate | Family | follow-up fit meanAbsΔwin | follow-up fit meanAbsΔavgT | dup marginal meanAbsΔwin | Two Bio row meanAbsΔwin |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | F3 combo 1.25/1.25 | F3 | 0.430 | 0.0876 | 4.314 | 4.610 |
| 2 | F3 combo 1.25/1.15 | F3 | 0.475 | 0.0835 | 4.314 | 4.610 |
| 3 | F3 combo 1.20/1.25 | F3 | 0.491 | 0.0716 | 4.456 | 4.083 |
| 4 | F3 combo 1.25/1.20 | F3 | 0.492 | 0.0845 | 4.314 | 4.610 |
| 5 | F3 combo 1.20/1.20 | F3 | 0.535 | 0.0695 | 4.456 | 4.083 |
| 6 | F3 combo 1.20/1.15 | F3 | 0.574 | 0.0683 | 4.456 | 4.083 |
| 7 | F1 first Pink 1.25 | F1 | 0.613 | 0.0772 | 4.314 | 4.610 |
| 8 | F1 first Pink 1.20 | F1 | 0.638 | 0.0604 | 4.456 | 4.083 |
| 9 | F3 combo 1.15/1.25 | F3 | 0.691 | 0.0569 | 4.689 | 3.605 |
| 10 | F3 combo 1.15/1.20 | F3 | 0.735 | 0.0564 | 4.689 | 3.605 |
| 11 | F3 combo 1.15/1.15 | F3 | 0.757 | 0.0556 | 4.689 | 3.605 |
| 12 | F1 first Pink 1.15 | F1 | 0.812 | 0.0493 | 4.689 | 3.605 |
| 13 | F2 second Orange 1.20 | F2 | 1.643 | 0.0217 | 4.746 | 2.020 |
| 14 | F2 second Orange 1.25 | F2 | 1.673 | 0.0224 | 4.746 | 2.020 |
| 15 | F2 second Orange 1.15 | F2 | 1.687 | 0.0223 | 4.746 | 2.020 |
| 16 | Baseline live Rule B | Baseline | 1.711 | 0.0273 | 4.746 | 2.020 |

## 11. Best explanation now

- Best combined family: **F3 combo 1.25/1.25**.
- Combined follow-up fit: meanAbsΔwin 0.430, meanAbsΔavgT 0.0876.
- Combined duplicate containment: marginal meanAbsΔwin 4.314, Two Bio row meanAbsΔwin 4.610.
- Best overall candidate was **F3 combo 1.25/1.25**, which is a compact combined rule.
- The remaining family split is still the same: first-Bio baseline miss and mixed-color miss are distinct from the duplicate-Pink rule.
- In this bounded microcheck, no compact combined rule clearly improves first-Bio and mixed-color fit while keeping duplicate containment comfortably flat.
- The remaining ambiguity is whether the next helper-level follow-up should be applied symmetrically to one-Bio and mixed rows, or whether the duplicate-Pink branch needs a finer shell-agnostic balance before any combined follow-up is safe.

## 12. Recommendation

**NEED ONE LAST MICRO-TRUTH-PACK**

## 13. If PATCH CANDIDATE READY

Not applicable. This pass stops short of a tracked-source follow-up because the duplicate-containment guardrail is still not cleanly separated from the best combined fit.

## 14. What ChatGPT should do next

Use this report as the handoff. Before any new tracked edit, run one last micro-truth or temp-only confirmation focused only on the duplicate rows under the best combined candidate so the helper-level follow-up can be separated cleanly from the already-live second-Pink rule.
