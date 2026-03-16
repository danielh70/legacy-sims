# codex-bio revert to live Rule B report

## 1. Goal of this pass

Revert the failed final Bio helper extension back to the last known-good live Rule B activation-only state, then verify that replay behavior returns to the earlier activation-fix profile.

## 2. Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-final-patch-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '1,220p' ./tmp/codex-bio-orange-duplicate-analysis.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-rebalance-microcheck.md
sed -n '2578,2638p' ./legacy-sim-v1.0.4-clean.js
sed -n '2740,2800p' ./brute-sim-v1.4.6.js
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-revert-orange-anchor' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-revert-orange-anchor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-revert-double-probe' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-revert-double-probe.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-revert-slot-order' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-revert-slot-order.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-revert-meta' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-revert-meta.log 2>&1
git diff -U8 -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js | rg -n -C 20 "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|getValidatedBioCrystalColor|scaleVariantCrystalDelta" > ./tmp/codex-bio-revert-to-live-rule-b.diff
```

Tracked edits were applied manually with `apply_patch` only to the existing local Bio helper blocks in the two simulator files.

## 3. Exact files/functions changed

- `./legacy-sim-v1.0.4-clean.js`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - removed failed-final-patch-only `getValidatedBioCrystalColor(...)`
- `./brute-sim-v1.4.6.js`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
  - removed failed-final-patch-only `getValidatedBioCrystalColor(...)`

Behavior classification: behavior-changing revert.

## 4. Compact description of what was reverted and what was intentionally kept

Reverted:

- the later first-copy both-colors `1.20x` scaling extension
- the later duplicate-Pink rebalance-to-`1.20x`
- the extra color helper added for that failed extension

Intentionally kept:

- the local duplicate-Pink helper path
- the activation fix that matches exact uniform `crystalName === "Perfect Pink Crystal"`
- duplicate Pink second-copy scaling at the earlier live Rule B activation-only state: `1.5x`

No shell predicates, slot-order rules, or lower-level crystal math changes were added.

## 5. Compact diff section

Reverted helper shape in both simulators:

```js
function isValidatedDuplicateBioPinkVariant(v) {
  if (!v || v.itemName !== 'Bio Spinal Enhancer') return false;
  if (v.crystalName === 'Perfect Pink Crystal') return true;
  const mix = v.crystalMix || null;
  if (!mix || typeof mix !== 'object') return false;
  const names = Object.keys(mix);
  return names.length === 1 && names[0] === 'Perfect Pink Crystal' && Number(mix[names[0]]) === 4;
}

function applyValidatedDuplicateBioPinkScaling(m1V, m2V) {
  if (!isValidatedDuplicateBioPinkVariant(m1V) || !isValidatedDuplicateBioPinkVariant(m2V))
    return [m1V, m2V];
  // Validated duplicate-Bio patch: boost only the second exact Bio[P4] crystal delta.
  return [m1V, scaleVariantCrystalDelta(m2V, 1.5)];
}
```

Compact diff artifact saved to:

- `./tmp/codex-bio-revert-to-live-rule-b.diff`

## 6. Syntax-check results

- `node --check ./legacy-sim-v1.0.4-clean.js`: passed
- `node --check ./brute-sim-v1.4.6.js`: passed

## 7. Orange-anchor probe summary

Summary:

- meanAbsΔwin: `1.78`
- meanAbsΔavgT: `0.1178`
- worstAbsΔwin: `3.75` at `CUSTOM vs DL Dual Rift Bio P4 + O4`

Key rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| DL Dual Rift No Bio | `82.23 / 9.7066` | `82.79 / 9.7759` | `+0.56 / +0.0693` |
| DL Dual Rift One Bio P4 | `67.16 / 10.4925` | `70.50 / 10.5798` | `+3.34 / +0.0873` |
| DL Dual Rift One Bio O4 | `79.88 / 9.4831` | `81.43 / 9.5764` | `+1.55 / +0.0933` |
| DL Dual Rift Two Bio P4 | `49.95 / 11.3261` | `48.91 / 11.8532` | `-1.04 / +0.5271` |
| DL Dual Rift Bio P4 + O4 | `66.99 / 10.3227` | `70.74 / 10.3823` | `+3.75 / +0.0596` |
| DL Dual Rift Two Bio O4 | `79.90 / 9.3206` | `81.42 / 9.4094` | `+1.52 / +0.0888` |
| DL Core/Rift No Bio | `73.59 / 10.7660` | `72.89 / 10.7455` | `-0.70 / -0.0205` |
| DL Core/Rift One Bio P4 | `57.28 / 11.7409` | `58.98 / 11.6388` | `+1.70 / -0.1021` |
| DL Core/Rift One Bio O4 | `67.46 / 10.4234` | `68.11 / 10.4268` | `+0.65 / +0.0034` |
| DL Core/Rift Two Bio P4 | `43.74 / 12.6811` | `40.44 / 12.9291` | `-3.30 / +0.2480` |
| DL Core/Rift Bio P4 + O4 | `54.55 / 11.4592` | `57.12 / 11.3848` | `+2.57 / -0.0744` |
| DL Core/Rift Two Bio O4 | `67.39 / 10.2805` | `68.07 / 10.2410` | `+0.68 / -0.0395` |

Readout:

- no-Bio containment returned near-noise
- exact duplicate Pink rows returned to the earlier mixed-direction activation-only profile
- failed-final-patch broad overshoot is gone

## 8. Double-bio probe summary

Summary:

- meanAbsΔwin: `2.13`
- meanAbsΔavgT: `0.1476`
- worstAbsΔwin: `4.53` at `CUSTOM vs DL Dual Rift Bio P4 + O4`

Key rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| DL Dual Rift No Bio | `82.42 / 9.7002` | `82.79 / 9.7759` | `+0.37 / +0.0756` |
| DL Dual Rift One Bio P4 | `67.12 / 10.5056` | `70.50 / 10.5798` | `+3.38 / +0.0742` |
| DL Dual Rift Two Bio P4 | `49.49 / 11.3534` | `48.91 / 11.8532` | `-0.58 / +0.4998` |
| DL Dual Rift Bio P4 + O4 | `66.21 / 10.3258` | `70.74 / 10.3823` | `+4.53 / +0.0565` |
| DL Core/Rift No Bio | `73.21 / 10.7818` | `72.89 / 10.7455` | `-0.32 / -0.0363` |
| DL Core/Rift One Bio P4 | `56.91 / 11.7396` | `58.98 / 11.6388` | `+2.07 / -0.1008` |
| DL Core/Rift Two Bio P4 | `43.90 / 12.6667` | `40.44 / 12.9291` | `-3.46 / +0.2624` |
| DL Core/Rift Bio P4 + O4 | `54.76 / 11.4602` | `57.12 / 11.3848` | `+2.36 / -0.0754` |

Readout:

- target-family directional improvement on exact duplicate Pink rows returned relative to the failed final patch
- one-Bio and mixed rows remain the main residual misses, matching the earlier live Rule B activation-only state

## 9. Slot-order probe summary

Summary:

- meanAbsΔwin: `2.46`
- meanAbsΔavgT: `0.1272`
- worstAbsΔwin: `3.80` at `CUSTOM vs DL Core/Rift Two Bio P4`

Swapped-pair comparisons:

| Shell | Pair | Truth right-left Δwin / ΔavgT | Sim right-left Δwin / ΔavgT |
| --- | --- | --- | --- |
| Dual Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.160 / -0.0068` | `-0.090 / +0.0059` |
| Dual Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `-0.004 / -0.0148` | `-0.110 / -0.0011` |
| Core/Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.242 / -0.0005` | `+0.200 / -0.0027` |
| Core/Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `+0.536 / -0.0085` | `+0.070 / +0.0061` |

Containment note:

- slot-order containment returned to the earlier acceptable activation-only profile
- no-Bio rows stayed small: `DL Dual Rift No Bio +0.90`, `DL Core/Rift No Bio -0.55`

## 10. Meta summary

Summary:

- meanAbsΔwin: `1.60`
- meanAbsΔavgT: `0.1014`
- worstAbsΔwin: `3.23`

Worst offending rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| SG1 Double Maul Droid | `88.05 / 8.5253` | `84.82 / 8.5383` | `-3.23 / +0.0130` |
| DL Reaper/Maul Orphic Bio | `52.49 / 8.2921` | `55.64 / 8.3362` | `+3.15 / +0.0441` |
| DL Core/Rift Bio | `43.72 / 12.6735` | `40.73 / 12.9423` | `-2.99 / +0.2688` |
| SG1 Split Bombs T2 | `47.31 / 12.6991` | `50.21 / 12.4799` | `+2.90 / -0.2192` |
| Ashley Build | `48.80 / 9.1666` | `51.51 / 9.2354` | `+2.71 / +0.0688` |

Readout:

- meta returned to the earlier activation-fix scale
- failed-final-patch broad regression is no longer present

## 11. Comparison vs the earlier live Rule B activation-fix report

The revert returned replay behavior to the earlier activation-fix profile closely:

- orange-anchor: reverted `1.78 / 0.1178 / 3.75`, matching the earlier activation-fix-style profile and far from the failed final patch `4.87 / 0.1235 / 6.28`
- double-bio: reverted `2.13 / 0.1476 / 4.53`, matching the earlier activation-fix profile and far from the failed final patch `5.13 / 0.1323 / 7.01`
- slot-order: reverted `2.46 / 0.1272 / 3.80`, matching the earlier activation-fix profile and far from the failed final patch `5.09 / 0.1155 / 6.28`
- meta: reverted `1.60 / 0.1014 / 3.23`, matching the earlier activation-fix profile and far from the failed final patch `4.71 / 0.1291 / 8.50`

Directional checks:

- exact duplicate Pink rows again show the earlier activation-only movement rather than failed-final-patch overshoot
- no-Bio rows are back near noise
- overall meta error is back near the earlier activation-fix scale

## 12. Final verdict

**REVERT SUCCEEDED; READY FOR TEMP-ONLY DIAGNOSIS**

## 13. What ChatGPT should do next

Use this report as the handoff. Keep the code at this reverted live Rule B activation-only state and return to temp-only diagnosis or instrumentation before attempting any new Bio follow-up patch.
