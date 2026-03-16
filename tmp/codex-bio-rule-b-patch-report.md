# codex-bio Rule B patch report

## 1. Goal of this pass

Implement the validated Rule B Bio duplicate/color patch candidate at the shared Bio misc variant surface, then verify it against the double-Bio probe, slot-order probe, and current-meta replay set.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-rule-validation.md ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/codex-bio-slot-order-analysis.md ./tmp/codex-bio-surface-sweep-report.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
rg -n "computeVariantFromCrystalSpec|Bio Spinal Enhancer|partCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js legacy-defs.js
sed -n '1,220p' ./tmp/codex-bio-rule-validation.md
sed -n '2446,2538p' legacy-sim-v1.0.4-clean.js
sed -n '2616,2708p' brute-sim-v1.4.6.js
sed -n '5370,5415p' legacy-sim-v1.0.4-clean.js
sed -n '3318,3360p' brute-sim-v1.4.6.js
sed -n '2538,2608p' legacy-sim-v1.0.4-clean.js
sed -n '2708,2768p' brute-sim-v1.4.6.js
sed -n '1848,1918p' brute-sim-v1.4.6.js
sed -n '1898,1958p' legacy-sim-v1.0.4-clean.js
sed -n '4588,4668p' brute-sim-v1.4.6.js
sed -n '3360,3448p' brute-sim-v1.4.6.js
sed -n '5600,5642p' legacy-sim-v1.0.4-clean.js
sed -n '2580,2665p' legacy-sim-v1.0.4-clean.js
sed -n '2665,2765p' legacy-sim-v1.0.4-clean.js
sed -n '3448,3535p' brute-sim-v1.4.6.js
git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-rule-b.patch.diff
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-double-probe' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-double-probe.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-slot-order' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-slot-order.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-meta' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-meta.log 2>&1
sed -n '1,240p' ./tmp/codex-bio-rule-b-double-probe.log
sed -n '1,260p' ./tmp/codex-bio-rule-b-slot-order.log
sed -n '1,260p' ./tmp/codex-bio-rule-b-meta.log
sed -n '1,220p' ./tmp/codex-bio-rule-b.patch.diff
rg -n "isValidatedDuplicateBioPinkVariant|scaleVariantCrystalDelta|applyValidatedDuplicateBioPinkScaling|const \\[m1Eff, m2Eff\\]" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '2600,2698p' legacy-sim-v1.0.4-clean.js
sed -n '2718,2772p' brute-sim-v1.4.6.js
sed -n '3360,3455p' brute-sim-v1.4.6.js
sed -n '3452,3476p' brute-sim-v1.4.6.js
```

## 3. Exact files/functions changed

- `legacy-sim-v1.0.4-clean.js`
  - added `isValidatedDuplicateBioPinkVariant(...)`
  - added `scaleVariantCrystalDelta(...)`
  - added `applyValidatedDuplicateBioPinkScaling(...)`
  - updated `compileCombatantFromParts(...)` to use adjusted `m1Eff/m2Eff`
- `brute-sim-v1.4.6.js`
  - added `isValidatedDuplicateBioPinkVariant(...)`
  - added `scaleVariantCrystalDelta(...)`
  - added `applyValidatedDuplicateBioPinkScaling(...)`
  - updated `compileDefender(...)`
  - updated `compileAttacker(...)`

## 4. Compact description of the implemented rule

- first-copy Bio behavior unchanged
- only when both misc variants are exact `Bio Spinal Enhancer[Perfect Pink Crystal x4]`
- scale only the second misc variant's crystal-derived delta by `1.5`
- flat item stats remain unchanged
- mixed `Bio[P4]+Bio[O4]`, one-Bio rows, and no-Bio rows are not matched
- no shell-specific helper or slot-order rule was reintroduced

## 5. Compact diff section

Rule-local helper added in both simulators:

```js
function applyValidatedDuplicateBioPinkScaling(m1V, m2V) {
  if (!isValidatedDuplicateBioPinkVariant(m1V) || !isValidatedDuplicateBioPinkVariant(m2V))
    return [m1V, m2V];
  // Validated duplicate-Bio patch: boost only the second exact Bio[P4] crystal delta.
  return [m1V, scaleVariantCrystalDelta(m2V, 1.5)];
}
```

Legacy compile hook:

```js
const [m1Eff, m2Eff] = applyValidatedDuplicateBioPinkScaling(m1V, m2V);
```

Brute compile hooks:

```js
const [m1Eff, m2Eff] = applyValidatedDuplicateBioPinkScaling(m1V, m2V);
const [m1Eff, m2Eff] = applyValidatedDuplicateBioPinkScaling(
  m1v,
  rebuildMiscVariantForSlot(m2v, 2),
);
```

Diff artifact saved to:

- `./tmp/codex-bio-rule-b.patch.diff`

## 6. Syntax-check results

- `node --check ./legacy-sim-v1.0.4-clean.js`: passed
- `node --check ./brute-sim-v1.4.6.js`: passed

## 7. Double-bio probe summary

Replay summary:

- meanAbsΔwin: `2.87`
- meanAbsΔavgT: `0.0790`
- worstAbsΔwin: `6.37` at `CUSTOM vs DL Dual Rift Two Bio P4`

Target rows:

| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |
| --- | --- | ---: | --- | ---: |
| DL Dual Rift No Bio | `82.42 -> 82.79` | `+0.37` | `9.7002 -> 9.7759` | `+0.0756` |
| DL Dual Rift One Bio P4 | `67.12 -> 70.50` | `+3.38` | `10.5056 -> 10.5798` | `+0.0742` |
| DL Dual Rift Two Bio P4 | `49.49 -> 55.86` | `+6.37` | `11.3534 -> 11.4248` | `+0.0714` |
| DL Dual Rift Bio P4 + O4 | `66.21 -> 70.74` | `+4.53` | `10.3258 -> 10.3823` | `+0.0565` |
| DL Core/Rift No Bio | `73.21 -> 72.89` | `-0.32` | `10.7818 -> 10.7455` | `-0.0363` |
| DL Core/Rift One Bio P4 | `56.91 -> 58.98` | `+2.07` | `11.7396 -> 11.6388` | `-0.1008` |
| DL Core/Rift Two Bio P4 | `43.90 -> 47.43` | `+3.53` | `12.6667 -> 12.5251` | `-0.1416` |
| DL Core/Rift Bio P4 + O4 | `54.76 -> 57.12` | `+2.36` | `11.4602 -> 11.3848` | `-0.0754` |

Readout:

- no-Bio containment stayed tight: `+0.37`, `-0.32`
- one-Bio rows were untouched by the rule and stayed materially high: `+3.38`, `+2.07`
- mixed `P4+O4` rows also stayed high: `+4.53`, `+2.36`
- the exact two-Bio target rows overshot upward instead of converging: `+6.37`, `+3.53`

## 8. Slot-order probe summary

Replay summary:

- meanAbsΔwin: `2.80`
- meanAbsΔavgT: `0.0838`
- worstAbsΔwin: `5.82` at `CUSTOM vs DL Dual Rift Two Bio P4`

Swapped-pair comparisons:

| Shell | Pair | Truth right-left Δwin / ΔavgT | Sim right-left Δwin / ΔavgT | Containment |
| --- | --- | --- | --- | --- |
| Dual Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.160 / -0.0068` | `-0.09 / +0.0059` | acceptable |
| Dual Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `-0.004 / -0.0148` | `-0.11 / -0.0011` | acceptable |
| Core/Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.242 / -0.0005` | `+0.20 / -0.0027` | acceptable |
| Core/Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `+0.536 / -0.0085` | `+0.07 / +0.0061` | acceptable |

Additional row summary:

- `DL Dual Rift Two Bio P4`: `50.04 -> 55.86` (`+5.82`)
- `DL Core/Rift Two Bio P4`: `44.24 -> 47.43` (`+3.19`)
- no-Bio rows stayed small: `+0.90`, `-0.55`

Conclusion:

- slot-order containment stayed acceptable
- the mirrored patch did not create a new slot-order asymmetry problem
- the remaining problem is still absolute Bio-family calibration, not swapped-pair leakage

## 9. Meta summary

Replay summary:

- meanAbsΔwin: `2.02`
- meanAbsΔavgT: `0.0633`
- worstAbsΔwin: `6.33`

Worst offending rows:

| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |
| --- | --- | ---: | --- | ---: |
| DL Dual Rift Bio | `49.60 -> 55.93` | `+6.33` | `11.3621 -> 11.4124` | `+0.0503` |
| DL Core/Rift Bio | `43.72 -> 47.66` | `+3.94` | `12.6735 -> 12.5364` | `-0.1371` |
| SG1 Double Maul Droid | `88.05 -> 84.82` | `-3.23` | `8.5253 -> 8.5383` | `+0.0130` |
| DL Reaper/Maul Orphic Bio | `52.49 -> 55.64` | `+3.15` | `8.2921 -> 8.3362` | `+0.0441` |
| SG1 Split Bombs T2 | `47.31 -> 50.21` | `+2.90` | `12.6991 -> 12.4799` | `-0.2192` |

Readout:

- overall meta mean stayed around the earlier level, not a decisive improvement
- the worst row is still the Dual Rift Bio family
- the patch did not cause broad collapse, but it did not solve the targeted family in absolute replay terms

## 10. Legacy vs brute parity notes

- The mirrored patch is structurally aligned:
  - same helper names
  - same exact-match predicate
  - same `1.5x` scale
  - same “second effective misc only” application
- The legacy path was fully replay-verified in this pass.
- The brute path was syntax-checked only in this pass; parity was preserved structurally, not runtime-verified.
- Remaining known parity risks are unchanged from prior diagnosis:
  - brute still differs on raw legacy truth crystal parsing shape
  - brute still uses different stat-crystal stacking defaults (`iter4` vs legacy compare `sum4`)
  - brute still has slot-2 rebuild plumbing for attacker misc variants

## 11. Final verdict

**REVISE PATCH**

Why:

- the implementation stayed narrow and did not reintroduce shell predicates
- slot-order containment remained acceptable
- no-Bio rows stayed near-noise
- but the exact two-Bio target rows still miss badly in the full replay, and now miss high
- one-Bio and mixed rows remain materially high because the patch does not address the underlying baseline offset

## 12. What ChatGPT should do next

Keep this patch as a scoped experiment, but do not call it final. The next step should be a short diagnosis pass that compares unpatched vs Rule B replay JSON side by side on the Bio-family rows and isolates the remaining absolute offset that affects one-Bio and mixed Bio states; only after that should a revision be proposed, and it should preserve the current slot-order containment.
