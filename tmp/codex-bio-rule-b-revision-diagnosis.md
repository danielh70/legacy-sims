# codex-bio Rule B revision diagnosis

## 1. Goal of this pass

Diagnose why the tracked Rule B patch still leaves full-replay Bio-family rows materially high by comparing the current tracked patched source against temp-only unpatched source copies with only the Rule B hunks removed.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-rule-b-patch-report.md ./tmp/codex-bio-rule-validation.md ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./tools/legacy-truth-replay-compare.js
rg -n "isValidatedDuplicateBioPinkVariant|scaleVariantCrystalDelta|applyValidatedDuplicateBioPinkScaling|const \\[m1Eff, m2Eff\\]" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js
cp ./brute-sim-v1.4.6.js ./tmp/brute-sim-v1.4.6.unpatched-bio.js
apply_patch ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js (remove only Rule B helper block and call site)
apply_patch ./tmp/brute-sim-v1.4.6.unpatched-bio.js (remove only Rule B helper block and call sites)
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
node --check ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js
node --check ./tmp/brute-sim-v1.4.6.unpatched-bio.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-double-patched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-revision-double-patched.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-double-unpatched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js > ./tmp/codex-bio-rule-b-revision-double-unpatched.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-slot-patched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-revision-slot-patched.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-slot-unpatched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js > ./tmp/codex-bio-rule-b-revision-slot-unpatched.log 2>&1
node ./tmp/codex-bio-rule-b-revision-diagnosis.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-rule-b-patch-report.md`
- `./tmp/codex-bio-rule-validation.md`
- `./tmp/codex-bio-variant-instrumentation.md`
- `./tmp/codex-bio-duplicate-color-diagnosis.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
- `./brute-sim-v1.4.6.js`
  - `computeVariant(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileDefender(...)`
  - `compileAttacker(...)`
  - `isValidatedDuplicateBioPinkVariant(...)`
  - `scaleVariantCrystalDelta(...)`
  - `applyValidatedDuplicateBioPinkScaling(...)`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Rule B helpers/call sites currently exist in tracked source: yes
- Tracked legacy hunks: helper block at `legacy-sim-v1.0.4-clean.js:2586-2614`, compile call at `legacy-sim-v1.0.4-clean.js:2632`
- Tracked brute hunks: helper block at `brute-sim-v1.4.6.js:2748-2776`, compile calls at `brute-sim-v1.4.6.js:3393` and `brute-sim-v1.4.6.js:3456`
- Exact Rule B hunk content: predicate helper, crystal-delta scaler, duplicate-Bio wrapper, and compile-time `m1Eff/m2Eff` call sites only

## 5. How temp unpatched copies were created

- Copied tracked sources to:
  - `./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js`
  - `./tmp/brute-sim-v1.4.6.unpatched-bio.js`
- Removed only the Rule B helper block and Rule B call sites from those temp copies.
- No tracked source files were reverted or otherwise changed during this diagnosis pass.

## 6. Syntax-check results

- tracked legacy sim: passed
- tracked brute sim: passed
- temp unpatched legacy sim: passed
- temp unpatched brute sim: passed

## 7. Double-bio probe: unpatched vs Rule B side-by-side

Replay summary comparison: unpatched meanAbsΔwin=2.87, patched meanAbsΔwin=2.87; unpatched meanAbsΔavgT=0.0790, patched meanAbsΔavgT=0.0790.

Patched vs unpatched row outputs identical on this probe: yes.

| Row | Truth win / avgT | Unpatched win / avgT | Rule B win / avgT | Unpatched err | Rule B err | Rule B delta alone |
| --- | --- | --- | --- | --- | --- | --- |
| DL Dual Rift No Bio | 82.424 / 9.7002 | 82.790 / 9.7759 | 82.790 / 9.7759 | +0.370 / +0.0756 | +0.370 / +0.0756 | +0.000 / +0.0000 |
| DL Dual Rift One Bio P4 | 67.122 / 10.5056 | 70.500 / 10.5798 | 70.500 / 10.5798 | +3.380 / +0.0742 | +3.380 / +0.0742 | +0.000 / +0.0000 |
| DL Dual Rift Two Bio P4 | 49.492 / 11.3534 | 55.860 / 11.4248 | 55.860 / 11.4248 | +6.370 / +0.0714 | +6.370 / +0.0714 | +0.000 / +0.0000 |
| DL Dual Rift Bio P4 + O4 | 66.210 / 10.3258 | 70.740 / 10.3823 | 70.740 / 10.3823 | +4.530 / +0.0565 | +4.530 / +0.0565 | +0.000 / +0.0000 |
| DL Core/Rift No Bio | 73.214 / 10.7818 | 72.890 / 10.7455 | 72.890 / 10.7455 | -0.320 / -0.0363 | -0.320 / -0.0363 | +0.000 / +0.0000 |
| DL Core/Rift One Bio P4 | 56.912 / 11.7396 | 58.980 / 11.6388 | 58.980 / 11.6388 | +2.070 / -0.1008 | +2.070 / -0.1008 | +0.000 / +0.0000 |
| DL Core/Rift Two Bio P4 | 43.904 / 12.6667 | 47.430 / 12.5251 | 47.430 / 12.5251 | +3.530 / -0.1416 | +3.530 / -0.1416 | +0.000 / +0.0000 |
| DL Core/Rift Bio P4 + O4 | 54.764 / 11.4602 | 57.120 / 11.3848 | 57.120 / 11.3848 | +2.360 / -0.0754 | +2.360 / -0.0754 | +0.000 / +0.0000 |

Readout:

- Which rows materially improved under Rule B? none.
- Which rows materially worsened under Rule B? none.
- Remaining error on one-Bio and mixed rows is already fully present in the unpatched baseline on this probe.
- On this replay path, Rule B did not add any duplicate correction at all.

## 8. Slot-order probe: unpatched vs Rule B side-by-side

Replay summary comparison: unpatched meanAbsΔwin=2.80, patched meanAbsΔwin=2.80; unpatched meanAbsΔavgT=0.0838, patched meanAbsΔavgT=0.0838.

Patched vs unpatched swapped-pair outputs identical on this probe: yes.

| Shell | Pair | Truth right-left Δwin / ΔavgT | Unpatched Δwin / ΔavgT | Rule B Δwin / ΔavgT | Rule B delta alone |
| --- | --- | --- | --- | --- | --- |
| Dual Rift | Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4] | +0.160 / -0.0068 | -0.090 / +0.0059 | -0.090 / +0.0059 | +0.000 / +0.0000 |
| Dual Rift | Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4] | -0.004 / -0.0148 | -0.110 / -0.0011 | -0.110 / -0.0011 | +0.000 / +0.0000 |
| Core/Rift | Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4] | +0.242 / -0.0005 | +0.200 / -0.0027 | +0.200 / -0.0027 | +0.000 / +0.0000 |
| Core/Rift | Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4] | +0.536 / -0.0085 | +0.070 / +0.0061 | +0.070 / +0.0061 | +0.000 / +0.0000 |

Readout:

- Slot-order containment stayed unchanged because the patched and unpatched replay outputs are identical.
- This confirms the current tracked Rule B patch did not activate on the slot-order pack either.

## 9. Compile-state delta table: unpatched vs Rule B

Variant-level activation diagnostic on the tracked legacy path:

| Variant | partCrystalSpec(...) result | variant.crystalName | variant.crystalMix | current Rule B predicate match? |
| --- | --- | --- | --- | --- |
| Bio[P4] variant | 0:Perfect Pink Crystal+1:Perfect Pink Crystal+2:Perfect Pink Crystal+3:Perfect Pink Crystal | Perfect Pink Crystal | null | no |
| Bio[O4] variant | 0:Perfect Orange Crystal+1:Perfect Orange Crystal+2:Perfect Orange Crystal+3:Perfect Orange Crystal | Perfect Orange Crystal | null | no |
| Scout[P4] variant | 0:Perfect Pink Crystal+1:Perfect Pink Crystal+2:Perfect Pink Crystal+3:Perfect Pink Crystal | Perfect Pink Crystal | null | no |

Canonical aggregated misc totals on legacy compile path:

| State | Unpatched misc total | Rule B misc total | Rule B minus unpatched |
| --- | --- | --- | --- |
| Scout[P4] + Scout[P4] | Spd 0.0, Acc 64.0, Dod 10.0, Def 108.0, Gun 60.0, Mel 60.0, Prj 100.0 | Spd 0.0, Acc 64.0, Dod 10.0, Def 108.0, Gun 60.0, Mel 60.0, Prj 100.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 0.0, Prj 0.0 |
| Bio[P4] + Scout[P4] | Spd 0.0, Acc 33.0, Dod 6.0, Def 171.0, Gun 95.0, Mel 95.0, Prj 115.0 | Spd 0.0, Acc 33.0, Dod 6.0, Def 171.0, Gun 95.0, Mel 95.0, Prj 115.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 0.0, Prj 0.0 |
| Bio[P4] + Bio[P4] | Spd 0.0, Acc 2.0, Dod 2.0, Def 234.0, Gun 130.0, Mel 130.0, Prj 130.0 | Spd 0.0, Acc 2.0, Dod 2.0, Def 234.0, Gun 130.0, Mel 130.0, Prj 130.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 0.0, Prj 0.0 |
| Bio[P4] + Bio[O4] | Spd 0.0, Acc 2.0, Dod 2.0, Def 182.0, Gun 130.0, Mel 182.0, Prj 130.0 | Spd 0.0, Acc 2.0, Dod 2.0, Def 182.0, Gun 130.0, Mel 182.0, Prj 130.0 | Spd 0.0, Acc 0.0, Dod 0.0, Def 0.0, Gun 0.0, Mel 0.0, Prj 0.0 |

All canonical compile-state deltas are zero: yes.

Why this happened:

- `partCrystalSpec(...)` resolves uniform four-Pink Bio slots to the string `Perfect Pink Crystal`, not to a mixed-count object.
- `computeVariantFromCrystalSpec(...)` short-circuits that uniform string into `computeVariant(...)` in both simulators.
- `computeVariant(...)` returns `crystalName` but not `crystalMix` in both simulators.
- The tracked Rule B predicate only checks `variant.crystalMix` for `{ "Perfect Pink Crystal": 4 }`, so it is false for the actual replay variants.
- Result: the helper/call sites exist, but the current Rule B patch is dead code on the active replay path.

## 10. Best explanation now

Rule B looked good offline because the helper-only validation operated directly on extracted legacy misc totals. The tracked implementation, however, keyed its exact-Pink duplicate detection off `variant.crystalMix`, while the real replay path compiles uniform four-slot misc crystals through the uniform-string `computeVariant(...)` path that does not retain `crystalMix`.

That means the full-replay Bio-family rows stayed materially high for a simple reason: the tracked Rule B patch never actually fired.

What this isolates cleanly:

- The remaining one-Bio and mixed-color error is not a new regression from Rule B.
- That error is a pre-existing baseline miss already visible in the unpatched rows.
- Rule B currently does not add the intended duplicate correction on top of that miss, because its match plumbing is too narrow.
- After Rule B activation is fixed, the existing unpatched row pattern still points to follow-up work on both first-copy Bio[P4] and mixed `P4+O4`, not on one alone.

Exact answers:

- Which rows materially improved under Rule B? none.
- Which rows materially worsened under Rule B? none.
- Is the remaining error mostly already present in unpatched one-Bio and mixed rows? yes, entirely on the compared probes.
- Does Rule B mainly add the duplicate correction on top of a pre-existing first-Bio baseline miss? not in the tracked implementation; it currently adds no replay correction at all.
- Is the next revision more likely to require a) first-copy Bio[P4] adjustment b) mixed P4+O4 adjustment c) both d) abandon Rule B entirely? `c) both`, but only after fixing Rule B activation plumbing.

## 11. Recommendation

**REVISE RULE B WITH BOTH**

Reason:

- do not abandon the duplicate-Bio theory yet, because the tracked patch was not actually exercised
- first fix the exact-Pink duplicate activation so Rule B can run on uniform variants
- after that, the pre-existing unpatched miss pattern indicates follow-up work is likely needed for both first-copy Bio[P4] and mixed `P4+O4`

## 12. If a revision is recommended

- Exact next smallest rule to test: keep Rule B magnitude unchanged, but change the exact-Pink duplicate detection so it matches both mixed-count and uniform-string Bio[P4] variants. Concretely: treat `Bio Spinal Enhancer` with either `crystalMix = { Perfect Pink Crystal: 4 }` or `crystalName === "Perfect Pink Crystal"` as exact Bio[P4] for the local duplicate helper.
- Exact file/function/block to patch next:
  - `legacy-sim-v1.0.4-clean.js` local Rule B helper block immediately above `compileCombatantFromParts(...)`
  - mirrored in `brute-sim-v1.4.6.js` local Rule B helper block immediately above `buildVariantsForArmors(...)` / before compile-time call sites
- Do not apply it in this pass.

## 13. What ChatGPT should do next

Use this report as the only handoff. The next pass should make one minimal tracked edit: fix Rule B activation so exact uniform `Bio[P4]` variants match the local duplicate helper in both simulators, rerun the same patched-vs-unpatched double-bio and slot-order probes immediately, and only then decide the magnitude of any first-copy or mixed-color follow-up.
