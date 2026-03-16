# codex-bio orange-duplicate analysis

## 1. Goal of this pass

Use the orange-anchor truth pack to decide whether the remaining follow-up on top of live Rule B should target first-copy Pink only, first-copy Orange too, second-Orange only, a combined first-copy plus second-Orange rule, or a rebalance of the current duplicate-Pink branch.

## 2. Exact commands run

```sh
ls -1 ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./tmp/codex-bio-final-followup-microcheck.md ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1,220p' ./tmp/codex-bio-post-rule-b-followup-diagnosis.md
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-orange-duplicate-live' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-orange-duplicate-live.log 2>&1
node ./tmp/codex-bio-orange-duplicate-analysis.js
```

## 3. Exact files/functions inspected

- `./tmp/legacy-truth-bio-orange-duplicate-probe.json`
- `./tmp/codex-bio-final-followup-microcheck.md`
- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
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

## 4. Truth tables

### Dual Rift

| Row | Truth win | Truth avgT |
| --- | ---: | ---: |
| DL Dual Rift No Bio | 82.228 | 9.7066 |
| DL Dual Rift One Bio P4 | 67.164 | 10.4925 |
| DL Dual Rift One Bio O4 | 79.882 | 9.4831 |
| DL Dual Rift Two Bio P4 | 49.952 | 11.3261 |
| DL Dual Rift Bio P4 + O4 | 66.986 | 10.3227 |
| DL Dual Rift Two Bio O4 | 79.900 | 9.3206 |

### Core/Rift

| Row | Truth win | Truth avgT |
| --- | ---: | ---: |
| DL Core/Rift No Bio | 73.588 | 10.7660 |
| DL Core/Rift One Bio P4 | 57.280 | 11.7409 |
| DL Core/Rift One Bio O4 | 67.458 | 10.4234 |
| DL Core/Rift Two Bio P4 | 43.740 | 12.6811 |
| DL Core/Rift Bio P4 + O4 | 54.546 | 11.4592 |
| DL Core/Rift Two Bio O4 | 67.388 | 10.2805 |

## 5. Marginal tables

| Shell | No Bio -> One Bio P4 | No Bio -> One Bio O4 | One Bio P4 -> Two Bio P4 | One Bio O4 -> Two Bio O4 | One Bio P4 -> Bio P4 + O4 | One Bio O4 -> Bio P4 + O4 |
| --- | --- | --- | --- | --- | --- | --- |
| Dual Rift | `-15.064 / +0.7859` | `-2.346 / -0.2235` | `-17.212 / +0.8336` | `+0.018 / -0.1625` | `-0.178 / -0.1698` | `-12.896 / +0.8396` |
| Core/Rift | `-16.308 / +0.9749` | `-6.130 / -0.3426` | `-13.540 / +0.9402` | `-0.070 / -0.1429` | `-2.734 / -0.2817` | `-12.912 / +1.0358` |

## 6. Live Rule B comparison

Live replay summary on the orange-anchor pack: meanAbsΔwin 1.780, meanAbsΔavgT 0.1178, worstAbsΔwin 3.750 (CUSTOM vs DL Dual Rift Bio P4 + O4).

| Shell | Marginal | Truth win / avgT | Live Rule B win / avgT | Live - Truth |
| --- | --- | --- | --- | --- |
| Dual Rift | No Bio -> One Bio P4 | -15.064 / +0.7859 | -12.290 / +0.8039 | +2.774 / +0.0180 |
| Dual Rift | No Bio -> One Bio O4 | -2.346 / -0.2235 | -1.360 / -0.1995 | +0.986 / +0.0240 |
| Dual Rift | One Bio P4 -> Two Bio P4 | -17.212 / +0.8336 | -21.590 / +1.2734 | -4.378 / +0.4398 |
| Dual Rift | One Bio O4 -> Two Bio O4 | +0.018 / -0.1625 | -0.010 / -0.1670 | -0.028 / -0.0045 |
| Dual Rift | One Bio P4 -> Bio P4 + O4 | -0.178 / -0.1698 | +0.240 / -0.1975 | +0.418 / -0.0277 |
| Dual Rift | One Bio O4 -> Bio P4 + O4 | -12.896 / +0.8396 | -10.690 / +0.8059 | +2.206 / -0.0337 |
| Core/Rift | No Bio -> One Bio P4 | -16.308 / +0.9749 | -13.910 / +0.8933 | +2.398 / -0.0816 |
| Core/Rift | No Bio -> One Bio O4 | -6.130 / -0.3426 | -4.780 / -0.3187 | +1.350 / +0.0239 |
| Core/Rift | One Bio P4 -> Two Bio P4 | -13.540 / +0.9402 | -18.540 / +1.2903 | -5.000 / +0.3501 |
| Core/Rift | One Bio O4 -> Two Bio O4 | -0.070 / -0.1429 | -0.040 / -0.1858 | +0.030 / -0.0429 |
| Core/Rift | One Bio P4 -> Bio P4 + O4 | -2.734 / -0.2817 | -1.860 / -0.2540 | +0.874 / +0.0277 |
| Core/Rift | One Bio O4 -> Bio P4 + O4 | -12.912 / +1.0358 | -10.990 / +0.9580 | +1.922 / -0.0778 |

## 7. Temp-only candidate check, if used

Not used. The new truth pack is already decisive on the key follow-up questions because it directly anchors one-copy Orange and duplicate Orange behavior under the live Rule B baseline.

## 8. Best explanation now

- First-copy baseline miss is **both Pink and Orange**, not just Pink. The live miss on `No Bio -> One Bio O4` is still shallow in both shells (Dual Rift +0.986, Core/Rift +1.350), although smaller than the Pink miss.
- Second-Orange behavior looks **linear** relative to truth. `One Bio O4 -> Two Bio O4` is almost exact in both shells (Dual Rift -0.028, Core/Rift +0.030).
- The current duplicate-Pink Rule B branch now looks **over-strong**. `One Bio P4 -> Two Bio P4` is too negative by -4.378 in Dual Rift and -5.000 in Core/Rift.
- Mixed-color error is present, but the orange-anchor rows show it is not primarily a second-Orange duplicate problem. `One Bio O4 -> Bio P4 + O4` is shallow by +2.206 in Dual Rift and +1.922 in Core/Rift, which points more to the missing first-copy Pink surface than to Orange duplicate scaling.
- The smallest remaining helper-level follow-up is therefore **not patch-ready yet**. The orange pack shifts the priority order: rebalance the live duplicate-Pink branch first, then revisit whether a first-copy follow-up should apply to Pink only or to both colors.

## 9. Recommendation

**NEED ONE LAST MICRO-INSTRUMENTATION PASS**

## 10. If PATCH CANDIDATE READY

Not applicable. The orange-anchor truth pack indicates the live duplicate-Pink Rule B branch likely needs rebalance before any new first-copy or mixed-color follow-up can be called patch-ready.

## 11. What ChatGPT should do next

Use this report as the handoff. Do one last temp-only helper-level pass centered on the existing Rule B block, first reducing the duplicate-Pink branch magnitude from the live `1.5x` setting and checking the orange-anchor duplicate rows, then re-test whether any first-copy follow-up is still needed and whether it should apply to Pink only or to both Pink and Orange.