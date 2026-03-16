# codex-bio Rule B activation fix report

## 1. Goal of this pass

Make the smallest possible tracked-source fix so the existing Rule B duplicate-Pink Bio patch actually activates on the real replay path, then verify whether that materially changes the Bio probes.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-b-patch-report.md ./tmp/codex-bio-rule-validation.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./tools/legacy-truth-replay-compare.js
sed -n '1,220p' ./tmp/codex-bio-rule-b-revision-diagnosis.md
sed -n '2586,2618p' ./legacy-sim-v1.0.4-clean.js
sed -n '2748,2780p' ./brute-sim-v1.4.6.js
git diff -U4 -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js | rg -n -C 20 "isValidatedDuplicateBioPinkVariant|crystalName === 'Perfect Pink Crystal'" > ./tmp/codex-bio-rule-b-activation-fix.diff
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-double' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-double.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-slot' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-slot.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-meta' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-meta.log 2>&1
node ./tmp/codex-bio-rule-b-activation-fix-report.js
```

## 3. Exact files/functions changed

- `legacy-sim-v1.0.4-clean.js`
  - updated `isValidatedDuplicateBioPinkVariant(...)`
- `brute-sim-v1.4.6.js`
  - updated `isValidatedDuplicateBioPinkVariant(...)`

## 4. Compact description of the activation fix

- kept Rule B magnitude at `1.5x`
- kept the patch local to the existing duplicate-Pink predicate
- broadened exact `Bio[P4]` recognition only enough to accept either:
  - `crystalMix === { Perfect Pink Crystal: 4 }`
  - or uniform replay-path `crystalName === "Perfect Pink Crystal"`
- no first-copy rule added
- no mixed-color rule added
- no shell-specific or slot-order logic added

## 5. Compact diff section

Patched predicate in both simulators:

```js
function isValidatedDuplicateBioPinkVariant(v) {
  if (!v || v.itemName !== 'Bio Spinal Enhancer') return false;
  if (v.crystalName === 'Perfect Pink Crystal') return true;
  const mix = v.crystalMix || null;
  if (!mix || typeof mix !== 'object') return false;
  const names = Object.keys(mix);
  return names.length === 1 && names[0] === 'Perfect Pink Crystal' && Number(mix[names[0]]) === 4;
}
```

Diff artifact saved to `./tmp/codex-bio-rule-b-activation-fix.diff`.

## 6. Syntax-check results

- `node --check ./legacy-sim-v1.0.4-clean.js`: passed
- `node --check ./brute-sim-v1.4.6.js`: passed

## 7. Explicit activation diagnostic

| Canonical state | Match? | Left variant | Right variant |
| --- | --- | --- | --- |
| Bio[P4] + Bio[P4] | yes | Perfect Pink Crystal | Perfect Pink Crystal |
| Bio[P4] + Bio[O4] | no | Perfect Pink Crystal | Perfect Orange Crystal |
| Bio[P4] + Scout[P4] | no | Perfect Pink Crystal | Perfect Pink Crystal |

Readout:

- canonical `Bio[P4]+Bio[P4]` match: yes
- canonical `Bio[P4]+Bio[O4]` match: no
- canonical `Bio[P4]+Scout[P4]` match: no

## 8. Double-bio probe summary

Replay summary: meanAbsΔwin=2.13, meanAbsΔavgT=0.1476, worstAbsΔwin=4.53 (CUSTOM vs DL Dual Rift Bio P4 + O4).

| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |
| --- | --- | ---: | --- | ---: |
| DL Dual Rift No Bio | `82.420 -> 82.790` | `+0.370` | `9.7002 -> 9.7759` | `+0.0756` |
| DL Dual Rift One Bio P4 | `67.120 -> 70.500` | `+3.380` | `10.5056 -> 10.5798` | `+0.0742` |
| DL Dual Rift Two Bio P4 | `49.490 -> 48.910` | `-0.580` | `11.3534 -> 11.8532` | `+0.4998` |
| DL Dual Rift Bio P4 + O4 | `66.210 -> 70.740` | `+4.530` | `10.3258 -> 10.3823` | `+0.0565` |
| DL Core/Rift No Bio | `73.210 -> 72.890` | `-0.320` | `10.7818 -> 10.7455` | `-0.0363` |
| DL Core/Rift One Bio P4 | `56.910 -> 58.980` | `+2.070` | `11.7396 -> 11.6388` | `-0.1008` |
| DL Core/Rift Two Bio P4 | `43.900 -> 40.440` | `-3.460` | `12.6667 -> 12.9291` | `+0.2624` |
| DL Core/Rift Bio P4 + O4 | `54.760 -> 57.120` | `+2.360` | `11.4602 -> 11.3848` | `-0.0754` |

Readout:

- `DL Dual Rift Two Bio P4` moved from earlier dead-code `+6.37` to `-0.58`, a strong improvement.
- `DL Core/Rift Two Bio P4` moved from earlier dead-code `+3.53` to `-3.46`, a strong worsening in the opposite direction.
- one-Bio rows stayed unchanged and high: `DL Dual Rift One Bio P4 +3.38`, `DL Core/Rift One Bio P4 +2.07`.
- mixed `P4+O4` rows stayed unchanged and high: `DL Dual Rift Bio P4 + O4 +4.53`, `DL Core/Rift Bio P4 + O4 +2.36`.
- no-Bio containment stayed tight: `+0.37`, `-0.32`.

## 9. Slot-order probe summary

Replay summary: meanAbsΔwin=2.46, meanAbsΔavgT=0.1272, worstAbsΔwin=3.80 (CUSTOM vs DL Core/Rift Two Bio P4).

| Shell | Pair | Truth right-left Δwin / ΔavgT | Sim right-left Δwin / ΔavgT |
| --- | --- | --- | --- |
| Dual Rift | Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4] | `+0.160 / -0.0068` | `-0.090 / +0.0059` |
| Dual Rift | Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4] | `-0.004 / -0.0148` | `-0.110 / -0.0011` |
| Core/Rift | Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4] | `+0.242 / -0.0005` | `+0.200 / -0.0027` |
| Core/Rift | Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4] | `+0.536 / -0.0085` | `+0.070 / +0.0061` |

Containment note:

- swapped-pair outputs stayed effectively unchanged because the activation fix only affects exact duplicate `Bio[P4]+Bio[P4]` cases
- no-Bio rows stayed small: `DL Dual Rift No Bio +0.90`, `DL Core/Rift No Bio -0.55`
- the exact duplicate rows now move materially: `DL Dual Rift Two Bio P4 -1.13`, `DL Core/Rift Two Bio P4 -3.80`

## 10. Meta summary

Replay summary: meanAbsΔwin=1.60, meanAbsΔavgT=0.1014, worstAbsΔwin=3.23.

Worst offending rows:

| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |
| --- | --- | ---: | --- | ---: |
| SG1 Double Maul Droid | `88.050 -> 84.820` | `-3.230` | `8.5253 -> 8.5383` | `+0.0130` |
| DL Reaper/Maul Orphic Bio | `52.490 -> 55.640` | `+3.150` | `8.2921 -> 8.3362` | `+0.0441` |
| DL Core/Rift Bio | `43.720 -> 40.730` | `-2.990` | `12.6735 -> 12.9423` | `+0.2688` |
| SG1 Split Bombs T2 | `47.310 -> 50.210` | `+2.900` | `12.6991 -> 12.4799` | `-0.2192` |
| Ashley Build | `48.800 -> 51.510` | `+2.710` | `9.1666 -> 9.2354` | `+0.0688` |

Readout:

- overall meta mean improved from the previous dead-code Rule B report: `meanAbsΔwin 2.02 -> 1.60`
- worst meta row is no longer a Dual Rift/Core-Rift Bio overshoot; it is `SG1 Double Maul Droid -3.23`
- target family moved in the intended direction overall: `DL Dual Rift Bio -0.92`, `DL Core/Rift Bio -2.99`

## 11. Legacy vs brute parity notes

- The activation fix is structurally mirrored in both simulators: same predicate line, same scope, same unchanged `1.5x` scale.
- Legacy replay path was fully verified in this pass.
- Brute was syntax-checked only in this pass; runtime parity was preserved structurally, not replay-verified.
- Remaining known parity risks are unchanged: brute payload crystal parsing shape, stat-crystal stacking defaults, and slot-2 rebuild plumbing.

## 12. Final verdict

**REVISE PATCH**

Why:

- the activation fix works and now materially changes exact duplicate `Bio[P4]` rows
- it improves overall meta mean and fixes the prior dead-code problem
- but results are mixed: `DL Dual Rift Two Bio P4` improves strongly while `DL Core/Rift Two Bio P4` overshoots in the opposite direction
- one-Bio and mixed-color rows remain untouched and materially high, which confirms duplicate-only Rule B is not sufficient as a final calibration

## 13. What ChatGPT should do next

Use this report as the handoff. Keep the activation fix, then do the next smallest diagnosis-guided revision pass on top of the now-live Rule B patch: compare the remaining one-Bio and mixed-color baseline offsets against the improved duplicate-Pink rows, and decide whether the next narrow follow-up should target first-copy Bio, mixed `P4+O4`, or both.
