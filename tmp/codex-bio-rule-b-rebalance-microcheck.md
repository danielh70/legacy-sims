# codex-bio Rule B rebalance microcheck

## 1. Goal of this pass

Do one last temp-only helper-level microcheck centered on the live Rule B block to determine the best duplicate-Pink rebalance and whether any remaining first-copy follow-up should be Pink-only or both Pink and Orange.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-orange-duplicate-analysis.md ./tmp/codex-bio-final-followup-microcheck.md ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1,220p' ./tmp/codex-bio-orange-duplicate-analysis.md
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-rebalance-orange-live' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-rebalance-orange-live.log 2>&1
node ./tmp/codex-bio-rule-b-rebalance-microcheck.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-orange-duplicate-analysis.md`
- `./tmp/codex-bio-final-followup-microcheck.md`
- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./tmp/legacy-truth-bio-orange-duplicate-probe.json`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
- `./brute-sim-v1.4.6.js`
  - mirrored Rule B helper block and shared variant functions
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Tracked source still has live Rule B with the activation fix: yes
- Duplicate-Pink scaling currently lives in the local helper block around `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)` in legacy and the mirrored helper block in brute.
- No tracked-source edits were made in this pass.

## 5. Live Rule B baseline marginal table

| Shell | No Bio -> One Bio P4 | No Bio -> One Bio O4 | One Bio P4 -> Two Bio P4 | One Bio O4 -> Two Bio O4 | One Bio P4 -> Bio P4 + O4 | One Bio O4 -> Bio P4 + O4 |
| --- | --- | --- | --- | --- | --- | --- |
| Dual Rift | `-12.290 / +0.8039` | `-1.360 / -0.1995` | `-21.590 / +1.2734` | `-0.010 / -0.1670` | `+0.240 / -0.1975` | `-10.690 / +0.8059` |
| Core/Rift | `-13.910 / +0.8933` | `-4.780 / -0.3187` | `-18.540 / +1.2903` | `-0.040 / -0.1858` | `-1.860 / -0.2540` | `-10.990 / +0.9580` |

## 6. Duplicate-Pink rebalance candidates tested

| Scale | Duplicate-focused meanAbsΔwin | Duplicate-focused meanAbsΔavgT | One Bio P4 -> Two Bio P4 meanAbsΔwin | Two Bio P4 row meanAbsΔwin | Orange containment meanAbsΔwin | Dual/Core improve together? |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1.20 | 1.259 | 0.2268 | 1.242 | 1.277 | 1.087 | yes |
| 1.30 | 1.364 | 0.2946 | 2.404 | 0.325 | 1.087 | yes |
| 1.25 | 1.532 | 0.2677 | 2.134 | 0.930 | 1.087 | yes |
| 1.35 | 2.109 | 0.3275 | 3.269 | 0.950 | 1.087 | yes |
| 1.40 | 2.422 | 0.3205 | 3.622 | 1.222 | 1.087 | yes |
| 1.50 | 3.430 | 0.3912 | 4.689 | 2.170 | 1.087 | no |

## 7. Candidate ranking for duplicate rebalance

Best duplicate-Pink rebalance candidate: **1.20x**.

- Dual Rift: `One Bio P4 -> Two Bio P4` truth -17.212 / +0.8336, sim -18.420 / +1.0963.
- Core/Rift: `One Bio P4 -> Two Bio P4` truth -13.540 / +0.9402, sim -14.815 / +1.1384.

## 8. First-copy follow-up candidates tested on top of the best rebalance

Best rebalance baseline held fixed at duplicate-Pink scale **1.20x**.

| Candidate | Family | first-copy-focused meanAbsΔwin | first-copy-focused meanAbsΔavgT | duplicate-focused meanAbsΔwin | Orange containment meanAbsΔwin | Dual/Core improve together? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Pink+Orange 1.20 | both-colors | 0.668 | 0.0466 | 0.737 | 0.515 | no |
| Pink-only 1.15 | pink-only | 0.903 | 0.0436 | 0.667 | 0.489 | yes |
| Pink+Orange 1.15 | both-colors | 0.943 | 0.0279 | 0.978 | 0.992 | yes |
| Pink-only 1.20 | pink-only | 0.993 | 0.0624 | 0.725 | 0.195 | yes |
| Pink-only 1.10 | pink-only | 1.159 | 0.0190 | 1.190 | 0.627 | yes |
| Pink+Orange 1.10 | both-colors | 1.197 | 0.0231 | 0.708 | 0.780 | no |
| none | none | 1.877 | 0.0369 | 1.259 | 1.046 | yes |

## 9. Final candidate ranking

Best final candidate: **Pink+Orange 1.20** on top of duplicate-Pink **1.20x**.

| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |
| --- | --- | --- | --- | ---: | ---: |
| Dual Rift | No Bio -> One Bio P4 | -15.064 / +0.7859 | -14.515 / +0.8966 | 0.549 | 0.1107 |
| Dual Rift | No Bio -> One Bio O4 | -2.346 / -0.2235 | -1.295 / -0.2126 | 1.051 | 0.0109 |
| Dual Rift | One Bio P4 -> Two Bio P4 | -17.212 / +0.8336 | -18.560 / +1.1650 | 1.348 | 0.3314 |
| Dual Rift | One Bio O4 -> Two Bio O4 | +0.018 / -0.1625 | -0.275 / -0.1463 | 0.293 | 0.0162 |
| Dual Rift | One Bio P4 -> Bio P4 + O4 | -0.178 / -0.1698 | +0.885 / -0.1939 | 1.063 | 0.0241 |
| Dual Rift | One Bio O4 -> Bio P4 + O4 | -12.896 / +0.8396 | -12.335 / +0.9153 | 0.561 | 0.0757 |
| Core/Rift | No Bio -> One Bio P4 | -16.308 / +0.9749 | -16.945 / +1.0175 | 0.637 | 0.0427 |
| Core/Rift | No Bio -> One Bio O4 | -6.130 / -0.3426 | -5.695 / -0.3204 | 0.435 | 0.0222 |
| Core/Rift | One Bio P4 -> Two Bio P4 | -13.540 / +0.9402 | -13.555 / +1.1390 | 0.015 | 0.1988 |
| Core/Rift | One Bio O4 -> Two Bio O4 | -0.070 / -0.1429 | +0.685 / -0.2081 | 0.755 | 0.0652 |
| Core/Rift | One Bio P4 -> Bio P4 + O4 | -2.734 / -0.2817 | -1.210 / -0.2462 | 1.524 | 0.0356 |
| Core/Rift | One Bio O4 -> Bio P4 + O4 | -12.912 / +1.0358 | -12.460 / +1.0918 | 0.452 | 0.0560 |

## 10. Best explanation now

- The duplicate-Pink live magnitude of **1.50x** is too strong. The best bounded rebalance candidate is **1.20x**.
- After duplicate rebalance, there is still a real first-copy baseline miss. The first-copy-focused meanAbsΔwin moves from 1.877 at rebalance-only to 0.668 for the best first-copy candidate.
- The smallest plausible first-copy follow-up is **both Pink and Orange**.
- The current helper-level Rule B patch surface is still the smallest plausible place to patch next because both the duplicate rebalance and any first-copy follow-up remain pair/context-sensitive and local to the existing Bio helper block.

## 11. Recommendation

**PATCH CANDIDATE READY**

## 12. If PATCH CANDIDATE READY

- Exact smallest next rule: reduce duplicate-Pink scaling from live **1.50x** to **1.20x**, then add a **both-colors** first-copy Bio crystal-delta scale of **1.20x**.
- Exact file/function/block to patch: extend the existing local Bio helper block around `applyValidatedDuplicateBioPinkScaling(...)` in `legacy-sim-v1.0.4-clean.js`, mirrored in `brute-sim-v1.4.6.js`.
- Do not apply it in this pass.

## 13. What ChatGPT should do next

Use this report as the patch handoff. Update the existing local Bio helper block in both simulators with the rebalance and first-copy rule identified here, then rerun the orange-anchor and double-bio probes immediately to verify duplicate containment stays acceptable.