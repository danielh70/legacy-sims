# codex-bio post-Rule-B follow-up diagnosis

## 1. Goal of this pass

Determine the smallest remaining follow-up needed on top of the now-live Rule B duplicate-Pink patch using a bounded temp-only sweep, without editing tracked source files.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-validation.md ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1,260p' ./tmp/codex-bio-rule-validation.js
node ./tmp/codex-bio-post-rule-b-followup-diagnosis.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./tmp/codex-bio-rule-b-revision-diagnosis.md`
- `./tmp/codex-bio-rule-validation.md`
- `./tmp/codex-bio-variant-instrumentation.md`
- `./tmp/codex-bio-duplicate-color-diagnosis.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./tmp/legacy-truth-current-attacker-vs-meta.json`
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

- Tracked source still has Rule B duplicate-Pink `1.5x` scaling: yes
- Tracked source still has the activation fix for uniform `crystalName === "Perfect Pink Crystal"`: yes
- Current Rule B helper lives in:
  - `legacy-sim-v1.0.4-clean.js` local helper block around `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)`
  - `brute-sim-v1.4.6.js` mirrored helper block immediately above `buildVariantsForArmors(...)`, used by `compileDefender(...)` and `compileAttacker(...)`

## 5. Remaining error table after live Rule B

| Row | Truth win / avgT | Live Rule B sim win / avgT | Current error |
| --- | --- | --- | --- |
| DL Dual Rift No Bio | 82.420 / 9.7002 | 82.790 / 9.7759 | +0.370 / +0.0756 |
| DL Dual Rift One Bio P4 | 67.120 / 10.5056 | 70.500 / 10.5798 | +3.380 / +0.0742 |
| DL Dual Rift Two Bio P4 | 49.490 / 11.3534 | 48.910 / 11.8532 | -0.580 / +0.4998 |
| DL Dual Rift Bio P4 + O4 | 66.210 / 10.3258 | 70.740 / 10.3823 | +4.530 / +0.0565 |
| DL Core/Rift No Bio | 73.210 / 10.7818 | 72.890 / 10.7455 | -0.320 / -0.0363 |
| DL Core/Rift One Bio P4 | 56.910 / 11.7396 | 58.980 / 11.6388 | +2.070 / -0.1008 |
| DL Core/Rift Two Bio P4 | 43.900 / 12.6667 | 40.440 / 12.9291 | -3.460 / +0.2624 |
| DL Core/Rift Bio P4 + O4 | 54.760 / 11.4602 | 57.120 / 11.3848 | +2.360 / -0.0754 |

## 6. Truth-side marginal tables

| Shell | No Bio -> One Bio[P4] | One Bio[P4] -> Two Bio[P4] | One Bio[P4] -> Bio[P4]+Bio[O4] | Bio[P4]+Bio[O4] -> Two Bio[P4] |
| --- | --- | --- | --- | --- |
| Dual Rift | `-15.302 / +0.8054` | `-17.630 / +0.8478` | `-0.912 / -0.1798` | `-16.718 / +1.0276` |
| Core/Rift | `-16.302 / +0.9578` | `-13.008 / +0.9271` | `-2.148 / -0.2794` | `-10.860 / +1.2065` |

## 7. Live Rule B marginal tables

| Shell | No Bio -> One Bio[P4] | One Bio[P4] -> Two Bio[P4] | One Bio[P4] -> Bio[P4]+Bio[O4] | Bio[P4]+Bio[O4] -> Two Bio[P4] |
| --- | --- | --- | --- | --- |
| Dual Rift | `-12.290 / +0.8039` | `-21.590 / +1.2734` | `+0.240 / -0.1975` | `-21.830 / +1.4709` |
| Core/Rift | `-13.910 / +0.8933` | `-18.540 / +1.2903` | `-1.860 / -0.2540` | `-16.680 / +1.5443` |

Readout:

- remaining `no-Bio -> one-Bio[P4]` miss is still large in both shells: Dual Rift `+3.01` win shallow, Core/Rift `+2.39` win shallow
- remaining `one-Bio -> Bio[P4]+Bio[O4]` miss is still positive in both shells, strongest in Dual Rift
- `one-Bio -> two-Bio[P4]` under live Rule B is now too negative in both shells, especially Core/Rift
- this means duplicate-only Rule B solved activation but did not isolate the full remaining family

## 8. Temp-only follow-up candidate families tested

Temp-only sweep mode: deterministic legacy-sim helper model, 20,000 fights per row, additive adjustments on top of the live Rule B baseline only.

| Candidate | Family | Definition |
| --- | --- | --- |
| Baseline live Rule B | baseline | Current tracked live Rule B only. |
| Follow-up A 1.15 | first-Bio only | Scale first Bio[P4] crystal delta by 1.15; leave second Orange unchanged. |
| Follow-up A 1.25 | first-Bio only | Scale first Bio[P4] crystal delta by 1.25; leave second Orange unchanged. |
| Follow-up B 1.15 | mixed-color only | Scale second Orange crystal delta by 1.15 on Bio[P4]+Bio[O4] rows only. |
| Follow-up B 1.25 | mixed-color only | Scale second Orange crystal delta by 1.25 on Bio[P4]+Bio[O4] rows only. |
| Follow-up C 1.15/1.15 | both | Scale first Bio[P4] crystal delta by 1.15 and second Orange by 1.15. |
| Follow-up C 1.25/1.25 | both | Scale first Bio[P4] crystal delta by 1.25 and second Orange by 1.25. |
| Control D 1.10 | tiny all-Bio control | Scale all Bio crystal deltas by 1.10 regardless of copy/color as a sanity control. |

## 9. Candidate ranking

| Rank | Candidate | Family | meanAbsΔwin targeted | meanAbsΔavgT targeted | no-Bio worsens? | Dual/Core move same direction? |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | Follow-up C 1.25/1.25 | both | 0.642 | 0.1338 | yes | same |
| 2 | Follow-up A 1.15 | first-Bio only | 0.753 | 0.1517 | yes | same |
| 3 | Follow-up A 1.25 | first-Bio only | 0.754 | 0.1110 | yes | same |
| 4 | Follow-up C 1.15/1.15 | both | 0.917 | 0.1665 | yes | same |
| 5 | Follow-up B 1.15 | mixed-color only | 1.401 | 0.1720 | yes | same |
| 6 | Baseline live Rule B | baseline | 1.502 | 0.1980 | yes | mixed |
| 7 | Control D 1.10 | tiny all-Bio control | 1.565 | 0.1872 | yes | same |
| 8 | Follow-up B 1.25 | mixed-color only | 1.921 | 0.1933 | yes | mixed |

Targeted marginals scored for ranking:

- `No Bio -> One Bio[P4]`
- `One Bio[P4] -> Bio[P4]+Bio[O4]`
- `One Bio[P4] -> Two Bio[P4]`
- both Dual Rift and Core/Rift

## 10. Best explanation now

Best-ranked temp-only family was **both** via **Follow-up C 1.25/1.25**.

What the sweep shows:

- first-Bio-only follow-up improves the large `no-Bio -> one-Bio[P4]` miss in both shells, but by construction it does not fix the still-too-negative duplicate marginal under live Rule B
- mixed-color-only follow-up improves the `one-Bio -> Bio[P4]+Bio[O4]` miss, but leaves first-Bio and duplicate issues untouched
- the combined family ranks best because the remaining absolute errors are split across two untouched surfaces: first-copy Pink baseline and mixed-color/second Orange baseline
- however, even the combined family cannot repair the live Rule B `one-Bio -> two-Bio[P4]` overshoot, because that duplicate marginal is already governed by the active second-Pink rule
- the smallest plausible remaining follow-up therefore looks like **both first-Bio and mixed-color**, but the duplicate marginal still needs one final narrow check before a new tracked patch is justified

Compile-surface localization for the best family:

- smallest plausible shared patch surface remains the current local Bio helper path, not `computeVariantFromCrystalSpec(...)` or `getEffectiveCrystalPct(...)`
- reason: the best family is defined by copy/color context across `m1V` and `m2V`, and the existing `applyValidatedDuplicateBioPinkScaling(...)` block already has that pair context with minimal blast radius
- lowest-risk next patch area: extend the current local helper block in both simulators rather than broadening lower-level crystal math

## 11. Recommendation

**NEED ONE FINAL MICRO-INSTRUMENTATION PASS**

Reason:

- the ranking makes the next family obvious: combined first-Bio plus mixed-color follow-up
- but the still-too-negative live Rule B duplicate marginal means a new tracked follow-up patch is not fully isolated yet
- one final temp-only pass should confirm that any first-Bio/mixed-color follow-up leaves the now-live duplicate rows acceptable before editing tracked code again

## 12. If PATCH CANDIDATE READY

Not applicable. The best family is identifiable, but this pass stops short of a tracked-source patch recommendation because duplicate-row behavior under live Rule B still needs one final narrow check.

## 13. What ChatGPT should do next

Use this report as the handoff. Do one last temp-only instrumentation pass in the existing local Bio helper block to model a combined first-Bio and mixed-color follow-up while holding the live duplicate-Pink rule fixed, and explicitly verify that the Dual Rift and Core/Rift duplicate rows stay within an acceptable band before making any new tracked edit.
