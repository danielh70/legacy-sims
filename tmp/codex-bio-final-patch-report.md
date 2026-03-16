# codex-bio final patch report

## 1. Goal of this pass

Implement the current best helper-level Bio patch candidate, verify it against the orange-anchor, double-bio, slot-order, and meta truth packs, and decide whether to keep, revise, or revert it.

## 2. Exact commands run

```sh
sed -n '1,240p' ./tmp/codex-bio-rule-b-rebalance-microcheck.md
sed -n '2580,2645p' ./legacy-sim-v1.0.4-clean.js
sed -n '2742,2808p' ./brute-sim-v1.4.6.js
git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-final-patch.diff
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-final-orange-anchor' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-final-orange-anchor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-final-double-probe' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-final-double-probe.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-final-slot-order' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-final-slot-order.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-final-meta' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-final-meta.log 2>&1
```

## 3. Exact files/functions changed

- `./legacy-sim-v1.0.4-clean.js`
  - `getValidatedBioCrystalColor(...)`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
- `./brute-sim-v1.4.6.js`
  - `getValidatedBioCrystalColor(...)`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`

Behavior classification: behavior-changing.

## 4. Compact description of the implemented rule

- kept the patch local to the existing Bio helper block
- changed duplicate Pink scale from `1.50x` to `1.20x`
- added first-copy Bio crystal-delta scaling at `1.20x` for both exact `Bio[P4]` and exact `Bio[O4]`
- left second Orange otherwise linear
- did not add shell predicates or lower-level crystal math changes

## 5. Compact diff section

Relevant Bio helper hunks only:

```js
function getValidatedBioCrystalColor(v) { ... }  // exact Bio[P4] / Bio[O4] detection

function applyValidatedDuplicateBioPinkScaling(m1V, m2V) {
  let m1Eff = m1V;
  let m2Eff = m2V;
  let pinkScaled = false;
  let orangeScaled = false;
  const c1 = getValidatedBioCrystalColor(m1V);
  const c2 = getValidatedBioCrystalColor(m2V);

  // first exact Bio crystal copy per color scales to 1.20x
  ...

  // duplicate exact Bio[P4] second copy scales to 1.20x
  if (c1 === 'pink' && c2 === 'pink') {
    m2Eff = scaleVariantCrystalDelta(m2V, 1.2);
  }
  return [m1Eff, m2Eff];
}
```

Compact diff artifact saved to:

- `./tmp/codex-bio-final-patch.diff`

## 6. Syntax-check results

- `node --check ./legacy-sim-v1.0.4-clean.js`: passed
- `node --check ./brute-sim-v1.4.6.js`: passed

## 7. Orange-anchor probe summary

Summary:

- meanAbsΔwin: `4.87`
- meanAbsΔavgT: `0.1235`
- worstAbsΔwin: `6.28` at `CUSTOM vs DL Dual Rift Two Bio P4`

Rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| DL Dual Rift No Bio | `82.23 / 9.7066` | `86.10 / 9.6470` | `+3.87 / -0.0596` |
| DL Dual Rift One Bio P4 | `67.16 / 10.4925` | `73.06 / 10.6423` | `+5.90 / +0.1498` |
| DL Dual Rift One Bio O4 | `79.88 / 9.4831` | `84.74 / 9.4478` | `+4.86 / -0.0353` |
| DL Dual Rift Two Bio P4 | `49.95 / 11.3261` | `56.23 / 11.7196` | `+6.28 / +0.3935` |
| DL Dual Rift Bio P4 + O4 | `66.99 / 10.3227` | `73.22 / 10.4500` | `+6.23 / +0.1273` |
| DL Dual Rift Two Bio O4 | `79.90 / 9.3206` | `84.75 / 9.2818` | `+4.85 / -0.0388` |
| DL Core/Rift No Bio | `73.59 / 10.7660` | `77.76 / 10.6007` | `+4.17 / -0.1653` |
| DL Core/Rift One Bio P4 | `57.28 / 11.7409` | `61.90 / 11.7437` | `+4.62 / +0.0028` |
| DL Core/Rift One Bio O4 | `67.46 / 10.4234` | `72.17 / 10.2795` | `+4.71 / -0.1439` |
| DL Core/Rift Two Bio P4 | `43.74 / 12.6811` | `47.83 / 12.8290` | `+4.09 / +0.1479` |
| DL Core/Rift Bio P4 + O4 | `54.55 / 11.4592` | `58.94 / 11.4295` | `+4.39 / -0.0297` |
| DL Core/Rift Two Bio O4 | `67.39 / 10.2805` | `71.85 / 10.0927` | `+4.46 / -0.1878` |

Readout:

- the patched helper regressed all 12 orange-anchor rows upward in win rate
- no-Bio containment failed materially: `DL Dual Rift No Bio +3.87`, `DL Core/Rift No Bio +4.17`
- one-copy Pink, one-copy Orange, mixed, duplicate Pink, and duplicate Orange all moved in the wrong direction

## 8. Double-bio probe summary

Summary:

- meanAbsΔwin: `5.13`
- meanAbsΔavgT: `0.1323`
- worstAbsΔwin: `7.01` at `CUSTOM vs DL Dual Rift Bio P4 + O4`

Rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| DL Dual Rift No Bio | `82.42 / 9.7002` | `86.10 / 9.6470` | `+3.68 / -0.0532` |
| DL Dual Rift One Bio P4 | `67.12 / 10.5056` | `73.06 / 10.6423` | `+5.94 / +0.1367` |
| DL Dual Rift Two Bio P4 | `49.49 / 11.3534` | `56.23 / 11.7196` | `+6.74 / +0.3662` |
| DL Dual Rift Bio P4 + O4 | `66.21 / 10.3258` | `73.22 / 10.4500` | `+7.01 / +0.1242` |
| DL Core/Rift No Bio | `73.21 / 10.7818` | `77.76 / 10.6007` | `+4.55 / -0.1811` |
| DL Core/Rift One Bio P4 | `56.91 / 11.7396` | `61.90 / 11.7437` | `+4.99 / +0.0041` |
| DL Core/Rift Two Bio P4 | `43.90 / 12.6667` | `47.83 / 12.8290` | `+3.93 / +0.1623` |
| DL Core/Rift Bio P4 + O4 | `54.76 / 11.4602` | `58.94 / 11.4295` | `+4.18 / -0.0307` |

Readout:

- the patch materially worsened the original 8-row target set
- every row moved high in win rate, including no-Bio and both exact targets

## 9. Slot-order probe summary

Summary:

- meanAbsΔwin: `5.09`
- meanAbsΔavgT: `0.1155`
- worstAbsΔwin: `6.28` at `CUSTOM vs DL Dual Rift Bio P4 + O4`

Swapped-pair comparisons:

| Shell | Pair | Truth right-left Δwin / ΔavgT | Sim right-left Δwin / ΔavgT |
| --- | --- | --- | --- |
| Dual Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.16 / -0.0068` | `+0.01 / +0.0083` |
| Dual Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `-0.00 / -0.0148` | `-0.25 / +0.0054` |
| Core/Rift | `Bio[P4]+Scout[P4]` vs `Scout[P4]+Bio[P4]` | `+0.24 / -0.0005` | `+0.47 / -0.0053` |
| Core/Rift | `Bio[P4]+Bio[O4]` vs `Bio[O4]+Bio[P4]` | `+0.53 / -0.0085` | `+0.21 / +0.0079` |

Containment note:

- the patch did not create a catastrophic new slot-order asymmetry
- but absolute containment is poor because nearly every slot-order row overshoots by `~4-6.3` win

## 10. Meta summary

- meanAbsΔwin: `4.71`
- meanAbsΔavgT: `0.1291`
- worstAbsΔwin: `8.50`

Worst offending rows:

| Row | Truth win / avgT | Sim win / avgT | Error |
| --- | --- | --- | --- |
| SG1 Split Bombs T2 | `47.31 / 12.6991` | `55.81 / 12.3987` | `+8.50 / -0.3004` |
| SG1 Rift/Bombs Bio | `46.61 / 11.2057` | `55.11 / 11.0168` | `+8.50 / -0.1889` |
| Ashley Build | `48.80 / 9.1666` | `55.76 / 9.2229` | `+6.96 / +0.0563` |
| DL Dual Rift Bio | `49.60 / 11.3621` | `56.32 / 11.7164` | `+6.72 / +0.3543` |
| DL Rift/Bombs Scout | `56.69 / 10.4073` | `62.51 / 10.2737` | `+5.82 / -0.1336` |

Readout:

- meta regressed badly, not narrowly
- the helper patch increased attacker win rates across much of the checked set

## 11. Legacy vs brute parity notes

- parity-sensitive location touched: local Bio helper path only
- mirrored patch structure was preserved in both simulators:
  - same exact color-detection helper
  - same `1.20x` first-copy scaling for exact Bio Pink and Orange
  - same `1.20x` duplicate-Pink second-copy scaling
- legacy replay path was fully verified in this pass
- brute parity was preserved structurally and syntax-checked, but brute replay verification was not run
- known parity risks outside this helper remain unchanged: raw truth crystal parsing shape, stat-crystal stacking defaults, and slot-2 rebuild plumbing

## 12. Final verdict

**REVERT PATCH**

Why:

- the patch was local and parity-mirrored, but the calibrated rule is wrong
- no-Bio containment failed
- all Bio family rows moved high, including one-copy Orange and duplicate Orange anchors that should not have shifted this far
- the original target rows also regressed
- meta degraded materially

## 13. What ChatGPT should do next

Use this report as the handoff. Revert this helper extension back to the last live Rule B activation-only state, then return to temp-only instrumentation before trying another follow-up; the orange-anchor pack now strongly suggests the previous “first-copy both colors at 1.20x” theory was a false positive from the offline model.
