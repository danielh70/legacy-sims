# Bio+Pink Patch Report

Patch type: behavior-changing experimental patch, mirrored in both sims during verification and then reverted.

Tracked source state now: the experimental patch has already been removed from `./legacy-sim-v1.0.4-clean.js` and `./brute-sim-v1.4.6.js` after verification showed unacceptable regressions.

## Exact Code Changes Made

Temporary patch surface:

- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct()`
- `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct()`

Temporary behavior added in both files:

```js
if (itemName === 'Bio Spinal Enhancer' && crystalName === 'Perfect Pink Crystal') {
  crystalPct.defSkill = (crystalPct.defSkill || 0) * 1.25;
}
```

Intent:

- narrow item+crystal-specific boost
- no global `Perfect Pink Crystal` change
- no `Bio Spinal Enhancer` flat-stat change
- no duplicate-misc logic change
- no combat-loop change

Parity status:

- mirrored in both `legacy-sim` and `brute-sim`
- checked with:

```bash
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

Result:

- patch surface was small and parity-safe
- behavior result was not acceptable
- patch was reverted immediately after verification

## Exact Commands Run

```bash
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-probe-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-probe-patch.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-targeted4-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-targeted-compile-suspects-truth.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-targeted4-patch.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-pink-meta-patch' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-pink-meta-patch.log 2>&1
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
```

Note:

- the requested `./tmp/legacy-truth-double-bio-probe-truth.json` was not present locally
- the existing probe truth file used for verification was `./tmp/legacy-truth-double-bio-probe.json`

## Bio Probe Before / After

Baseline artifact:

- `./results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--2026-03-15T02-21-42-069Z.json`

Patched artifact:

- `./results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--codex-bio-pink-probe-patch--2026-03-15T02-31-37-211Z.json`

| Defender | Truth win% | dWin% before | dWin% after | dAvgTurns before | dAvgTurns after |
| --- | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift No Bio | 82.42 | +0.37 | +3.69 | +0.0756 | +0.1518 |
| DL Dual Rift One Bio P4 | 67.12 | +3.38 | +3.49 | +0.0742 | +0.6153 |
| DL Dual Rift Two Bio P4 | 49.49 | +6.37 | +1.01 | +0.0714 | +0.9953 |
| DL Dual Rift Bio P4 + O4 | 66.21 | +4.53 | +4.20 | +0.0565 | +0.5918 |
| DL Core/Rift No Bio | 73.21 | -0.32 | +4.22 | -0.0363 | +0.0910 |
| DL Core/Rift One Bio P4 | 56.91 | +2.07 | +1.64 | -0.1008 | +0.5020 |
| DL Core/Rift Two Bio P4 | 43.90 | +3.53 | -1.91 | -0.1416 | +0.7927 |
| DL Core/Rift Bio P4 + O4 | 54.76 | +2.36 | +1.61 | -0.0754 | +0.4802 |

Probe summary:

- before: `meanAbsWinPct 2.87`, `meanAbsAvgTurns 0.0790`
- after: `meanAbsWinPct 2.72`, `meanAbsAvgTurns 0.5275`

Read:

- some Pink-Bio rows improved on win%
- no-Bio controls were heavily damaged
- avg-turn drift exploded across the whole probe

## Targeted 4-Defender Before / After

Baseline artifact:

- `./results/replay/legacy-replay--legacy-truth-targeted-compile-suspects-truth--legacy-sim-v1.0.4-clean--none--2026-03-15T01-44-03-773Z.json`

Patched artifact:

- `./results/replay/legacy-replay--legacy-truth-targeted-compile-suspects-truth--legacy-sim-v1.0.4-clean--none--codex-bio-pink-targeted4-patch--2026-03-15T02-31-37-204Z.json`

| Defender | Truth win% | dWin% before | dWin% after | dAvgTurns before | dAvgTurns after |
| --- | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | 50.12 | +5.81 | +0.28 | +0.0835 | +1.0317 |
| DL Core/Rift Bio | 43.81 | +3.85 | -1.69 | -0.1598 | +0.7729 |
| DL Gun Sniper Mix | 65.24 | +0.62 | +4.19 | +0.0445 | +0.2859 |
| HF Scythe Pair | 65.97 | -0.51 | +3.69 | +0.0240 | +0.1456 |

Read:

- the two target lanes improved strongly on win%
- both controls regressed badly
- avg-turn drift became much worse on every row

## Full Meta Before / After Summary

Baseline artifact used for before summary:

- `./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--2026-03-14T22-29-28-524Z.json`

Patched artifact:

- `./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-bio-pink-meta-patch--2026-03-15T02-31-37-217Z.json`

Summary:

| Metric | Before | After |
| --- | ---: | ---: |
| meanAbsWinPct | 2.03 | 3.96 |
| meanAbsAvgTurns | 0.0695 | 0.2703 |
| worstAbsWinPct | 6.38 | 7.65 |
| worst defender | DL Dual Rift Bio | SG1 Split Bombs T2 |

Representative row movement:

| Defender | dWin% before | dWin% after | dAvgTurns before | dAvgTurns after |
| --- | ---: | ---: | ---: | ---: |
| DL Dual Rift Bio | +6.38 | +0.80 | +0.0598 | +0.9985 |
| DL Core/Rift Bio | +3.78 | -1.60 | -0.1457 | +0.7956 |
| DL Gun Sniper Mix | +0.17 | +3.58 | +0.0639 | +0.2973 |
| HF Scythe Pair | -0.78 | +3.24 | +0.0204 | +0.1326 |
| SG1 Split Bombs T2 | +2.95 | +7.65 | -0.2327 | +0.0419 |
| SG1 Rift/Bombs Bio | +2.54 | +7.36 | -0.1071 | +0.1106 |
| Ashley Build | +2.89 | +7.06 | +0.0631 | +0.2730 |
| DL Rift/Bombs Scout | +0.46 | +5.53 | -0.0699 | +0.1208 |
| DL Gun Blade Bio | +0.29 | +4.51 | -0.0150 | +0.1561 |

Read:

- target rows improved
- meta quality collapsed
- regression pattern was broad, not localized

## Requested Outcome Checks

Improved?

- `DL Dual Rift One Bio P4`: no, slightly worse on win% and much worse on turns
- `DL Dual Rift Two Bio P4`: yes on win%, no on turns
- `DL Core/Rift One Bio P4`: yes on win%, no on turns
- `DL Core/Rift Two Bio P4`: yes on absolute win% only, but overshot past truth and badly worsened turns

Did `Bio[O4]` stay reasonable?

- partially on win% only
- not on turns
- `P4+O4` rows still picked up large avg-turn regressions, so this is not a clean localized fix

Did controls / regression rows stay acceptable?

- no
- probe no-Bio controls broke
- targeted controls broke
- broader meta regressed sharply

## Conclusion

The smallest exact patch surface was the right function, but the rule was still too general.

What the attempted patch proved:

- a `Bio Spinal Enhancer` + `Perfect Pink Crystal` adjustment can move the target Rift/Bio lanes
- item+crystal-only scope still leaks into too many non-target rows
- the localized mismatch is narrower than “all Bio+Pink”

Most likely implication:

- if this area is revisited, the final rule probably needs a tighter family or shell condition than `itemName === 'Bio Spinal Enhancer' && crystalName === 'Perfect Pink Crystal'`

## Final Recommendation

Recommendation: `REVERT PATCH`

Status:

- already reverted

Why:

- controls and broader meta do not survive the change
- avg-turn calibration gets substantially worse even where win% improves
- this patch should not be kept in its current item+crystal-only form
