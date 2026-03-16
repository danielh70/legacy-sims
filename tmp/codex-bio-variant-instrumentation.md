# codex-bio variant instrumentation

## 1. Goal of this pass

Do one temp-only instrumentation pass centered on shared Bio misc contribution math to determine whether the missing rule is better modeled as second-Bio scaling, Pink-specific second-copy scaling, broader Bio crystal weighting, or something else in the shared misc variant path.

## 2. Exact commands run

```sh
ls -1 ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/codex-bio-slot-order-analysis.md ./tmp/codex-bio-surface-sweep-report.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js
sed -n '1,260p' ./tmp/codex-bio-duplicate-color-diagnosis.md
sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md
sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json
rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
rg -n "function partCrystalSpec|function getEffectiveCrystalPct|function computeVariantFromCrystalSpec|function compileCombatantFromParts|function buildCompiledCombatSnapshot|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|Bio Spinal Enhancer|Scout Drones" legacy-sim-v1.0.4-clean.js
rg -n "function partCrystalSpec|function rebuildMiscVariantForSlot|function compileDefender|function compileAttacker|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|Bio Spinal Enhancer|Scout Drones" brute-sim-v1.4.6.js
sed -n '381,470p' legacy-sim-v1.0.4-clean.js
sed -n '1898,1975p' legacy-sim-v1.0.4-clean.js
sed -n '2446,2675p' legacy-sim-v1.0.4-clean.js
sed -n '3877,3945p' legacy-sim-v1.0.4-clean.js
sed -n '720,780p' brute-sim-v1.4.6.js
sed -n '2188,2234p' brute-sim-v1.4.6.js
sed -n '3248,3545p' brute-sim-v1.4.6.js
sed -n '1,240p' legacy-defs.js
node ./tmp/codex-bio-variant-instrumentation.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-duplicate-color-diagnosis.md`
- `./tmp/codex-bio-slot-order-analysis.md`
- `./tmp/codex-bio-surface-sweep-report.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./tmp/legacy-truth-bio-slot-order-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `getEffectiveCrystalPct(...)`
  - `computeVariantFromCrystalSpec(...)`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
- `./brute-sim-v1.4.6.js`
  - `partCrystalSpec(...)`
  - `rebuildMiscVariantForSlot(...)`
  - `compileDefender(...)`
  - `compileAttacker(...)`
- `./legacy-defs.js`
  - `Bio Spinal Enhancer`
  - `Scout Drones`
  - `Perfect Pink Crystal`
  - `Perfect Orange Crystal`
- `./tools/legacy-truth-replay-compare.js`

## 4. Source hygiene result

- Abandoned experimental shell helper active anywhere in tracked simulators: no
- Name-search remnants in `legacy-sim`: none
- Name-search remnants in `brute-sim`: none

## 5. Legacy per-misc contribution table

Legacy uses canonical compare-style variant math (`crystalStackStats: 'sum4'`).

| Misc | Total contribution | Flat item stats | Crystal-derived delta |
| --- | --- | --- | --- |
| Scout Drones[Perfect Pink Crystal x4] | Spd 0, Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 32, Dod 5, Def 30, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 0, Dod 0, Def 24, Gun 0, Mel 0, Prj 0 |
| Bio Spinal Enhancer[Perfect Pink Crystal x4] | Spd 0, Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 0, Dod 0, Def 52, Gun 0, Mel 0, Prj 0 |
| Bio Spinal Enhancer[Perfect Orange Crystal x4] | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 117, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 0, Dod 0, Def 0, Gun 0, Mel 52, Prj 0 |

## 6. Legacy aggregated two-misc totals

| State | slot1 | slot2 | Aggregated misc total |
| --- | --- | --- | --- |
| Scout[P4] + Scout[P4] | Spd 0, Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 64, Dod 10, Def 108, Gun 60, Mel 60, Prj 100 |
| Bio[P4] + Scout[P4] | Spd 0, Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 32, Dod 5, Def 54, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 33, Dod 6, Def 171, Gun 95, Mel 95, Prj 115 |
| Bio[P4] + Bio[P4] | Spd 0, Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 2, Dod 2, Def 234, Gun 130, Mel 130, Prj 130 |
| Bio[P4] + Bio[O4] | Spd 0, Acc 1, Dod 1, Def 117, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 117, Prj 65 | Spd 0, Acc 2, Dod 2, Def 182, Gun 130, Mel 182, Prj 130 |

## 7. Brute per-misc contribution table

Brute default variant math uses `crystalStackStats: 'iter4'`.

| Misc | Total contribution | Flat item stats | Crystal-derived delta | Legacy -> brute delta |
| --- | --- | --- | --- | --- |
| Scout Drones[Perfect Pink Crystal x4] | Spd 0, Acc 32, Dod 5, Def 64, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 32, Dod 5, Def 30, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 0, Dod 0, Def 34, Gun 0, Mel 0, Prj 0 | Spd 0, Acc 0, Dod 0, Def 10, Gun 0, Mel 0, Prj 0 |
| Bio Spinal Enhancer[Perfect Pink Crystal x4] | Spd 0, Acc 1, Dod 1, Def 136, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 0, Dod 0, Def 71, Gun 0, Mel 0, Prj 0 | Spd 0, Acc 0, Dod 0, Def 19, Gun 0, Mel 0, Prj 0 |
| Bio Spinal Enhancer[Perfect Orange Crystal x4] | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 136, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 0, Dod 0, Def 0, Gun 0, Mel 71, Prj 0 | Spd 0, Acc 0, Dod 0, Def 0, Gun 0, Mel 19, Prj 0 |

## 8. Brute aggregated two-misc totals

| State | slot1 | slot2 | Aggregated misc total | Legacy -> brute total delta |
| --- | --- | --- | --- | --- |
| Scout[P4] + Scout[P4] | Spd 0, Acc 32, Dod 5, Def 64, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 32, Dod 5, Def 64, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 64, Dod 10, Def 128, Gun 60, Mel 60, Prj 100 | Spd 0, Acc 0, Dod 0, Def 20, Gun 0, Mel 0, Prj 0 |
| Bio[P4] + Scout[P4] | Spd 0, Acc 1, Dod 1, Def 136, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 32, Dod 5, Def 64, Gun 30, Mel 30, Prj 50 | Spd 0, Acc 33, Dod 6, Def 200, Gun 95, Mel 95, Prj 115 | Spd 0, Acc 0, Dod 0, Def 29, Gun 0, Mel 0, Prj 0 |
| Bio[P4] + Bio[P4] | Spd 0, Acc 1, Dod 1, Def 136, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 136, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 2, Dod 2, Def 272, Gun 130, Mel 130, Prj 130 | Spd 0, Acc 0, Dod 0, Def 38, Gun 0, Mel 0, Prj 0 |
| Bio[P4] + Bio[O4] | Spd 0, Acc 1, Dod 1, Def 136, Gun 65, Mel 65, Prj 65 | Spd 0, Acc 1, Dod 1, Def 65, Gun 65, Mel 136, Prj 65 | Spd 0, Acc 2, Dod 2, Def 201, Gun 130, Mel 201, Prj 130 | Spd 0, Acc 0, Dod 0, Def 19, Gun 0, Mel 19, Prj 0 |

Legacy vs brute misc-path note:

- The per-misc and two-misc totals differ because brute still uses `iter4` stat-crystal stacking while legacy canonical compare uses `sum4`.
- That drift mainly amplifies crystal-responsive channels: Pink raises more `defSkill` in brute, Orange raises more `meleeSkill` in brute.
- The brute slot-2 rebuild hook remains a no-op here because the slot-2 misc multiplier map is empty by default.

## 9. Marginal contribution tables

### Legacy marginals

| Marginal | Contribution vector |
| --- | --- |
| first Bio[P4] = (Bio[P4]+Scout[P4]) - (Scout[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 63, Gun 35, Mel 35, Prj 15 |
| second Bio[P4] = (Bio[P4]+Bio[P4]) - (Bio[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 63, Gun 35, Mel 35, Prj 15 |
| second Bio[O4] = (Bio[P4]+Bio[O4]) - (Bio[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 11, Gun 35, Mel 87, Prj 15 |

### Brute marginals

| Marginal | Contribution vector |
| --- | --- |
| first Bio[P4] = (Bio[P4]+Scout[P4]) - (Scout[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 72, Gun 35, Mel 35, Prj 15 |
| second Bio[P4] = (Bio[P4]+Bio[P4]) - (Bio[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 72, Gun 35, Mel 35, Prj 15 |
| second Bio[O4] = (Bio[P4]+Bio[O4]) - (Bio[P4]+Scout[P4]) | Spd 0, Acc -31, Dod -4, Def 1, Gun 35, Mel 106, Prj 15 |

Direct readout from the instrumented marginal vectors:

- In **legacy**, first Pink == second Pink exactly.
- In **brute**, first Pink == second Pink exactly.
- In both simulators, second Orange is just a simple color-swapped second Pink: same base Bio flat stats, with crystal delta moving from Pink-driven `defSkill` into Orange-driven `meleeSkill`.
- Current misc math is therefore purely linear in copy count and purely local in color.

## 10. Truth-side marginal targets being matched

| Shell | Target marginal | Truth Δwin | Truth ΔavgTurns | Baseline simulated marginal from current legacy code |
| --- | --- | ---: | ---: | ---: |
| Dual Rift | one-Bio -> two-Bio[P4] | -17.630 | +0.8478 | -12.383 win, +0.5820 turns |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | -0.912 | -0.1798 | -1.092 win, -0.0563 turns |
| Core/Rift | one-Bio -> two-Bio[P4] | -13.008 | +0.9271 | -8.433 win, +0.8419 turns |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | -2.148 | -0.2794 | -0.192 win, +0.0273 turns |

Target pattern to explain:

- second Pink should be a much stronger defender-side step than current linear math produces
- Orange second copy should remain materially weaker than second Pink
- shell differences still exist, but the shared misc rule should at least push the two Pink and mixed transitions apart in the same direction as truth

## 11. Offline hypothetical-rule candidates tested

All candidates were helper-only. No tracked source was changed. The sweep operated on the **legacy per-slot crystal-derived Bio delta only**, leaving each item's flat base stats unchanged.

- **Rule A**: second Bio only gets scaled by factor `k`, color-agnostic
  - tested `k ∈ {1.25, 1.5, 1.75}`
- **Rule B**: second Pink Bio gets scaled by `k`, second Orange Bio unchanged
  - tested `k ∈ {1.25, 1.5, 1.75, 2.0}`
- **Rule C**: second Pink Bio gets `k1`, second Orange Bio gets `k2`
  - tested `(k1, k2) ∈ {(1.25,1.0), (1.5,1.0), (1.75,1.0), (1.5,0.85), (1.75,0.75)}`
- **Rule D**: all Bio crystal weighting scaled by color, no duplicate branch
  - tested `(kPink, kOrange) ∈ {(1.1,1.0), (1.25,1.0), (1.25,0.9), (1.5,0.9)}`
- **Rule E**: no duplicate rule, only Pink weighting boost
  - tested `kPink ∈ {1.1, 1.25, 1.5, 1.75}`

Ranking metric:

- primary: mean absolute error on the four targeted **win%** marginals
- tie-break 1: mean absolute error on the four targeted **avgTurns** marginals
- tie-break 2: worst absolute **win%** marginal error

## 12. Ranked results of those candidates

| Rank | Candidate family / best setting | meanAbsΔwin on target marginals | meanAbsΔavgTurns on target marginals | worstAbsΔwin | Dual one->two | Dual one->mixed | Core one->two | Core one->mixed |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | Rule C second Pink k1=1.5, second Orange k2=0.85 | 0.522 | 0.1174 | 1.506 | -17.500 win / +0.8483 turns | -0.608 win / -0.1021 turns | -12.858 win / +1.0619 turns | -0.642 win / -0.0229 turns |
| 2 | Rule B second Pink scale k=1.5 | 0.758 | 0.1283 | 1.815 | -18.100 win / +0.8515 turns | -1.267 win / -0.0477 turns | -13.400 win / +1.0841 turns | -0.333 win / -0.0588 turns |
| 3 | Rule D all Bio crystal weighting by color kPink=1.5, kOrange=0.9 | 0.991 | 0.1745 | 1.331 | -18.817 win / +0.7577 turns | -2.100 win / -0.0354 turns | -12.750 win / +1.0717 turns | -0.817 win / +0.0397 turns |
| 4 | Rule E Pink weighting only k=1.5 | 1.320 | 0.1412 | 1.830 | -19.408 win / +0.8024 turns | -2.742 win / -0.0637 turns | -12.983 win / +1.0657 turns | -0.500 win / -0.0148 turns |
| 5 | Rule A second Bio scale k=1.5 | 1.338 | 0.1398 | 1.492 | -18.817 win / +0.8252 turns | -2.183 win / -0.0652 turns | -14.500 win / +1.1659 turns | -3.550 win / -0.0961 turns |

What the candidate ranking says:

- If a family that scales only the **second Pink** slot outranks the color-agnostic and global-weighting families, that points to a **Pink-specific second-copy rule** rather than a generic Bio buff.
- If the best family needs both `k1` and `k2`, that points to **second-copy scaling plus a color split**.
- If the no-duplicate families (`D/E`) dominate, that would point to broader crystal weighting. If they do not, the evidence stays focused on second-copy behavior.

## 13. Best explanation now

The instrumented variant path is fully linear today:

- first Bio[P4] == second Bio[P4]
- second Bio[O4] is just the same Bio base plus an Orange crystal delta instead of a Pink crystal delta
- no active duplicate-item branch, no Bio-specific suppression, no slot-indexed effect in default config

That means the current shared misc variant path cannot generate the truth pattern on its own. The bounded helper-only rule sweep therefore matters more than the raw tables:

- if the best-ranked family is **Rule B or Rule C**, the missing rule is best modeled as a **second-copy rule**, with Pink-specific emphasis
- if **Rule A** wins, then a generic second-Bio rule is enough
- if **Rule D or E** wins, then broader Bio crystal weighting is the better model

From this pass, the best explanation is:

**second-copy behavior is the primary missing dimension, and the strongest version of that hypothesis is Pink-specific second-copy scaling rather than a broad all-Bio weighting change**

Reason:

- current math is exactly linear, but truth is not
- truth strongly separates second Pink from second Orange
- the linear Orange-vs-Pink local color swap is too weak by construction

## 14. Recommendation

**NEED ONE FINAL MICRO-INSTRUMENTATION PASS**

Reason:

- this pass isolates the suspect surface to the shared Bio misc variant path
- it also narrows the candidate family to second-copy behavior more than broad weighting
- but the exact narrow rule is still contingent on the best helper-only family result and should be verified once more with a tiny targeted pass before editing tracked code

## 15. If PATCH CANDIDATE READY

Not applicable. This pass stops one step short of a tracked-source patch recommendation.

## 16. What ChatGPT should do next

Use this report only. Take the best-ranked helper-only family and run one final temp-only pass that logs the resulting per-slot Bio crystal deltas and targeted replay marginals side by side with baseline. If that family still cleanly dominates, patch the shared `computeVariantFromCrystalSpec(...)` Bio misc block next in both simulators, keeping the change scoped to second-copy / color-specific Bio crystal math and then rerun the same truth probes immediately.
