# codex-bio surface sweep report

## 1) Goal of this pass

- surgically remove the abandoned experimental Bio/Pink shell patch if present
- inspect reverted compile-state changes across the 8 probe defenders
- run a compact sensitivity sweep to rank which defender-side stat surface best matches the Bio-bearing Rift/Core truth pattern without applying any new tracked behavior patch

## 2) Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-pink-shell-microcheck.md
sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
sed -n '1,260p' ./tmp/codex-bio-pink-shell-patch.diff
git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-surface-sweep-before-revert.diff
rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Narrow experimental shell-specific calibration patch" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-surface-sweep-after-revert.diff
node ./tmp/codex-bio-surface-sweep.js
```

Note: `./legacy-debug-handoff-2026-03-15.md` was requested but is not present in this repo root.

## 3) Source hygiene / revert result

- Shell patch present before revert: yes
- Shell patch removed from tracked simulators: yes
- Saved pre-revert diff: `./tmp/codex-bio-surface-sweep-before-revert.diff`
- Saved post-revert diff: `./tmp/codex-bio-surface-sweep-after-revert.diff`
- Syntax check result: `legacy-sim-v1.0.4-clean.js` passed, `brute-sim-v1.4.6.js` passed
- Revert succeeded cleanly: yes
- Unrelated local edits preserved: yes

## 4) Exact files/functions inspected

- `./tmp/codex-bio-pink-shell-microcheck.md`
- `./tmp/codex-bio-pink-shell-verify-results.md`
- `./tmp/codex-bio-pink-shell-patch.diff`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./legacy-debug-handoff-2026-03-15.md (missing)`
- `./legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `normalizeResolvedBuildWeaponUpgrades(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
  - `runMatch(...)`
- `./brute-sim-v1.4.6.js`
  - revert-only inspection of removed abandoned helper/call sites
- `./legacy-defs.js`
- `./tools/legacy-truth-replay-compare.js`

## 5) Baseline compile matrix for the 8 probe rows

| Row | Armor | Weapon1 | Weapon2 | Misc1 | Misc2 | HP | Spd | Acc | Dod | Def | Gun | Mel | Prj | W1 rng | W2 rng | Action rng | Misc1 adds | Misc2 adds |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| DL Dual Rift No Bio | Dark Legion Armor[Abyss Crystal x4] | Rift Gun[Amulet Crystal x3 + Perfect Fire Crystal] | Rift Gun[Amulet Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 251 | 285 | 129 | 644 | 740 | 510 | 550 | 77-84 | 75-81 | 62-137 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 |
| DL Dual Rift One Bio P4 | Dark Legion Armor[Abyss Crystal x4] | Rift Gun[Amulet Crystal x3 + Perfect Fire Crystal] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 251 | 254 | 125 | 707 | 775 | 545 | 565 | 77-84 | 75-81 | 62-137 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 |
| DL Dual Rift Two Bio P4 | Dark Legion Armor[Abyss Crystal x4] | Rift Gun[Amulet Crystal x3 + Perfect Fire Crystal] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 865 | 251 | 223 | 121 | 770 | 810 | 580 | 580 | 77-84 | 75-81 | 62-137 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 |
| DL Dual Rift Bio P4 + O4 | Dark Legion Armor[Abyss Crystal x4] | Rift Gun[Amulet Crystal x3 + Perfect Fire Crystal] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 865 | 251 | 223 | 121 | 718 | 810 | 632 | 580 | 77-84 | 75-81 | 62-137 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 |
| DL Core/Rift No Bio | Dark Legion Armor[Abyss Crystal x4] | Core Staff[Amulet Crystal x4] | Rift Gun[Amulet Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 276 | 253 | 129 | 707 | 748 | 818 | 550 | 62-75 | 75-81 | 51-129 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 |
| DL Core/Rift One Bio P4 | Dark Legion Armor[Abyss Crystal x4] | Core Staff[Amulet Crystal x4] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Scout Drones[Perfect Pink Crystal x4] | 865 | 276 | 222 | 125 | 770 | 783 | 853 | 565 | 62-75 | 75-81 | 51-129 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 32, Dod 5, Gun 30, Mel 30, Prj 50, Def 54 |
| DL Core/Rift Two Bio P4 | Dark Legion Armor[Abyss Crystal x4] | Core Staff[Amulet Crystal x4] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | 865 | 276 | 191 | 121 | 833 | 818 | 888 | 580 | 62-75 | 75-81 | 51-129 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 |
| DL Core/Rift Bio P4 + O4 | Dark Legion Armor[Abyss Crystal x4] | Core Staff[Amulet Crystal x4] | Rift Gun[Amulet Crystal x4] | Bio Spinal Enhancer[Perfect Pink Crystal x4] | Bio Spinal Enhancer[Perfect Orange Crystal x4] | 865 | 276 | 191 | 121 | 781 | 818 | 940 | 580 | 62-75 | 75-81 | 51-129 | Acc 1, Dod 1, Gun 65, Mel 65, Prj 65, Def 117 | Acc 1, Dod 1, Gun 65, Mel 117, Prj 65, Def 65 |

Baseline reverted 20k deterministic replay check on the same legacy-sim path:

| Row | truth win | sim win | Δwin | truth avgT | sim avgT | ΔavgT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DL Dual Rift No Bio | 82.42 | 75.08 | -7.34 | 9.7002 | 9.4550 | -0.2452 |
| DL Dual Rift One Bio P4 | 67.12 | 60.28 | -6.84 | 10.5056 | 10.0582 | -0.4474 |
| DL Dual Rift Two Bio P4 | 49.49 | 46.60 | -2.89 | 11.3534 | 10.6325 | -0.7209 |
| DL Dual Rift Bio P4 + O4 | 66.21 | 59.43 | -6.78 | 10.3258 | 10.0006 | -0.3252 |
| DL Core/Rift No Bio | 73.21 | 67.82 | -5.39 | 10.7818 | 10.4701 | -0.3117 |
| DL Core/Rift One Bio P4 | 56.91 | 54.36 | -2.55 | 11.7396 | 11.2027 | -0.5369 |
| DL Core/Rift Two Bio P4 | 43.90 | 45.51 | +1.61 | 12.6667 | 11.9885 | -0.6783 |
| DL Core/Rift Bio P4 + O4 | 54.76 | 53.65 | -1.11 | 11.4602 | 11.1725 | -0.2877 |

Probe baseline summary:

- meanAbsΔwin: 4.31
- meanAbsΔavgT: 0.4442
- worstAbsΔwin: 7.34

## 6) Marginal delta tables

### No Bio -> One Bio P4

| Shell | Transition | ΔHP | ΔSpd | ΔAcc | ΔDod | ΔDef | ΔGun | ΔMel | ΔPrj | W1 rng | W2 rng | Misc1 ΔDef/Gun/Prj | Misc2 ΔDef/Gun/Prj |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Dual Rift | DL Dual Rift No Bio -> DL Dual Rift One Bio P4 | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 | 77-84 -> 77-84 | 75-81 -> 75-81 | +63/+35/+15 | +0/+0/+0 |
| Core/Rift | DL Core/Rift No Bio -> DL Core/Rift One Bio P4 | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 | 62-75 -> 62-75 | 75-81 -> 75-81 | +63/+35/+15 | +0/+0/+0 |

### One Bio P4 -> Two Bio P4

| Shell | Transition | ΔHP | ΔSpd | ΔAcc | ΔDod | ΔDef | ΔGun | ΔMel | ΔPrj | W1 rng | W2 rng | Misc1 ΔDef/Gun/Prj | Misc2 ΔDef/Gun/Prj |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Dual Rift | DL Dual Rift One Bio P4 -> DL Dual Rift Two Bio P4 | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 | 77-84 -> 77-84 | 75-81 -> 75-81 | +0/+0/+0 | +63/+35/+15 |
| Core/Rift | DL Core/Rift One Bio P4 -> DL Core/Rift Two Bio P4 | +0 | +0 | -31 | -4 | +63 | +35 | +35 | +15 | 62-75 -> 62-75 | 75-81 -> 75-81 | +0/+0/+0 | +63/+35/+15 |

### One Bio P4 -> Bio P4 + O4

| Shell | Transition | ΔHP | ΔSpd | ΔAcc | ΔDod | ΔDef | ΔGun | ΔMel | ΔPrj | W1 rng | W2 rng | Misc1 ΔDef/Gun/Prj | Misc2 ΔDef/Gun/Prj |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Dual Rift | DL Dual Rift One Bio P4 -> DL Dual Rift Bio P4 + O4 | +0 | +0 | -31 | -4 | +11 | +35 | +87 | +15 | 77-84 -> 77-84 | 75-81 -> 75-81 | +0/+0/+0 | +11/+35/+15 |
| Core/Rift | DL Core/Rift One Bio P4 -> DL Core/Rift Bio P4 + O4 | +0 | +0 | -31 | -4 | +11 | +35 | +87 | +15 | 62-75 -> 62-75 | 75-81 -> 75-81 | +0/+0/+0 | +11/+35/+15 |

## 7) Sensitivity sweep design

- Sweep path: reverted `legacy-sim-v1.0.4-clean.js` loaded in-memory, no tracked edits after revert.
- Sweep mode: deterministic, 20,000 fights per row, `LEGACY_SHARED_HIT=1`.
- Rows scored: the same 8 probe rows only.
- Truth target: `aggregates.attackerWinPct` and `aggregates.avgTurns` from `./tmp/legacy-truth-double-bio-probe.json`.
- Candidate families:
  - pink-only linear: defender `defSk`, `gunSkill`, `projSkill`, `meleeSkill`, `dodge`, `speed`, `hp`
  - pink-only linear: defender `gun+mel+prj` together
  - second-stage variants only on the top 2 stage-1 surfaces:
    - first-Pink / second-Pink split
    - Pink vs Orange split
    - color-agnostic per-Bio linear
- Scoring:
  - mean absolute win delta across 8 rows
  - mean absolute avgTurns delta across 8 rows
  - worst absolute win delta
  - max absolute win delta on the two no-Bio rows

## 8) Ranked sensitivity results

Top candidates after the compact sweep:

| Rank | Candidate | meanAbsΔwin | meanAbsΔavgT | worstAbsΔwin | no-Bio win drift vs baseline | Notes |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | prj +12 per Bio[P4] | 4.31 | 0.4442 | 7.34 | 0.00 | exact pink-only linear |
| 2 | prj +24 per Bio[P4] | 4.31 | 0.4442 | 7.34 | 0.00 | exact pink-only linear |
| 3 | prj +36 per Bio[P4] | 4.31 | 0.4442 | 7.34 | 0.00 | exact pink-only linear |
| 4 | speed +1 per Bio[P4] | 4.31 | 0.4442 | 7.34 | 0.00 | exact pink-only linear |
| 5 | speed +2 per Bio[P4] | 4.31 | 0.4442 | 7.34 | 0.00 | exact pink-only linear |

Baseline for comparison:

- reverted baseline meanAbsΔwin = 4.31
- reverted baseline meanAbsΔavgT = 0.4442
- No tested candidate materially beat the reverted baseline; the listed order is a tie-order among effectively unchanged results.

## 9) Best explanation now

The reverted compile matrix shows the Bio swap is not isolated to a single channel: replacing Scout Drones[P4] with Bio[P4] materially lowers accuracy and dodge while changing gun/melee/projectile skill and defSkill. The orange second Bio also changes a real compiled surface, so the truth pattern is broader than an exact double-Pink shell bonus. The compact sweep did not produce any candidate that beat the reverted baseline on both error metrics. That means this pass did not isolate a decision-ready missing stat surface. The next useful discriminator is one small truth pack focused on 1-Bio / 2-Bio / P4+O4 marginal transitions before patching.

Current top-ranked sweep candidate: `none materially; several candidates tied baseline, including prj +12 per Bio[P4]`.

Why this is the most plausible current suspect family:

- No-Bio rows stay anchored because the candidate rules key off Bio count.
- The compile deltas show the first Bio swap changes multiple channels at once, but the second Pink and Orange cases differ in exactly the way a per-Bio or color-aware rule would.
- The sweep result rules out the abandoned exact double-Pink shell predicate as a useful surface, but it does not cleanly select a replacement surface.

## 10) Recommendation

**NEED ONE SMALL TRUTH PACK**

## 11) If PATCH CANDIDATE READY

Not applicable. The sweep ranks a suspect surface, but this pass stops short of a decision-ready patch rule.

## 12) What ChatGPT should do next

Use this report as the sole handoff. Start from the reverted codebase. If you agree the top-ranked surface is strong enough, propose one minimal compile-stage patch at the exact block named above, mirror the same rule across legacy/brute parity-sensitive compile paths, and rerun the same 8-row probe immediately. If you do not think the evidence is patch-ready, ask for one tiny truth pack that isolates first-Bio, second-Pink, and Orange-second-Bio transitions on the same DL shells before making any new formula change.
