# codex-bio deterministic roll dump

## 1. Goal of this pass

Use one deterministic roll-dump pass on top of the current reverted live Rule B activation-only code to determine whether the remaining Bio-family misses first appear inside combat resolution itself, or whether combat resolution still behaves exactly as the compiled stat deltas predict.

## 2. Exact commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-full-compile-snapshot-check.md
sed -n '1,260p' ./tmp/codex-bio-pair-context-aggregation-check.md
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '780,1375p' legacy-sim-v1.0.4-clean.js
sed -n '4040,4585p' legacy-sim-v1.0.4-clean.js
sed -n '4670,4788p' legacy-sim-v1.0.4-clean.js
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
node ./tmp/codex-bio-deterministic-roll-dump.js
```

## 3. Exact files/functions inspected

- `./tmp/codex-bio-full-compile-snapshot-check.md`
- `./tmp/codex-bio-pair-context-aggregation-check.md`
- `./tmp/codex-bio-card-anchor-instrumentation.md`
- `./tmp/codex-bio-revert-to-live-rule-b-report.md`
- `./tmp/codex-bio-rule-b-activation-fix-report.md`
- `./tmp/legacy-truth-double-bio-probe.json`
- `./legacy-sim-v1.0.4-clean.js`
  - action order / initiative: `resolveFirstActor(...)`
  - hit chance / hit roll: `hitProb(...)`, `rollVs(...)`, `rollVsDump(...)`
  - skill chance / skill roll: `skillProb(...)`, `skillValue(...)`, `rollVs(...)`, `rollVsDump(...)`
  - damage roll: `rollDamage(...)`
  - armor reduction / final damage: `applyArmorAndRound(...)`, `attemptWeapon(...)`, `doAction(...)`
  - stop-on-kill / end-of-turn resolution: `doAction(...)`, `fightOnce(...)`, `runMatch(...)`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Deterministic harness used temp-only module loading and reset the simulator RNG to the same fixed seed before each compared fight.
- No tracked edits were made in this pass.

## 5. Compared rows

- Comparison A, first-copy issue:
  - `DL Dual Rift No Bio`
  - `DL Dual Rift One Bio P4`
- Comparison B, mixed-color issue:
  - `DL Core/Rift One Bio P4`
  - `DL Core/Rift Bio P4 + O4`

## 6. Deterministic harness method

- Used the exact truth-pack attacker and defender builds from `./tmp/legacy-truth-double-bio-probe.json`.
- Compiled attacker and defender with the current live Rule B activation-only legacy code.
- Reset simulator RNG to the same `fast` generator seed (`1337`) before each compared fight.
- Ran `runMatch(...)` with:
  - `trials=1`
  - `traceFights=1`
  - built-in roll-dump enabled for `maxTurns=3`
- Compared the two rows in each pair under the same RNG stream until the first differing resolved event.

## 7. Compact resolved trace for Comparison A

Compared rows:

- left: `DL Dual Rift No Bio`
- right: `DL Dual Rift One Bio P4`

Compact resolved trace, left row:

- T1 D->A: hit Acc 285 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 740 vs Def 808 -> 1 raw 84 app 69 | w2 Rift Gun skill Gun 740 vs Def 808 -> 0 raw 0 app 0 | targetHP 650 -> 581
- T2 D->A: hit Acc 285 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 740 vs Def 808 -> 0 raw 0 app 0 | w2 Rift Gun skill Gun 740 vs Def 808 -> 1 raw 78 app 64 | targetHP 581 -> 517
- T3 D->A: hit Acc 285 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 740 vs Def 808 -> 1 raw 82 app 67 | w2 Rift Gun skill Gun 740 vs Def 808 -> 1 raw 75 app 61 | targetHP 517 -> 389

Compact resolved trace, right row:

- T1 D->A: hit Acc 254 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 775 vs Def 808 -> 1 raw 84 app 69 | w2 Rift Gun skill Gun 775 vs Def 808 -> 0 raw 0 app 0 | targetHP 650 -> 581
- T2 D->A: hit Acc 254 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 775 vs Def 808 -> 0 raw 0 app 0 | w2 Rift Gun skill Gun 775 vs Def 808 -> 1 raw 78 app 64 | targetHP 581 -> 517
- T3 D->A: hit Acc 254 vs Dod 134 -> 1 | w1 Rift Gun skill Gun 775 vs Def 808 -> 1 raw 82 app 67 | w2 Rift Gun skill Gun 775 vs Def 808 -> 1 raw 75 app 61 | targetHP 517 -> 389

First-divergence table:

| field | left row | right row |
| --- | --- | --- |
| first differing event | HIT_SHARED T1 D->A  | HIT_SHARED T1 D->A  |
| offense input | Acc 285 | Acc 254 |
| defense input | Dod 134 | Dod 134 |
| RNG rolls | off 138, def 68 | off 124, def 68 |
| resolved result | 1 | 1 |
| compiled fields feeding event | accuracy 285, targetDodge 134 | accuracy 254, targetDodge 134 |



## 8. Compact resolved trace for Comparison B

Compared rows:

- left: `DL Core/Rift One Bio P4`
- right: `DL Core/Rift Bio P4 + O4`

Compact resolved trace, left row:

- T1 D->A: hit Acc 222 vs Dod 134 -> 1 | w1 Core Staff skill Mel 853 vs Def 808 -> 1 raw 74 app 60 | w2 Rift Gun skill Gun 783 vs Def 808 -> 0 raw 0 app 0 | targetHP 650 -> 590
- T2 D->A: hit Acc 222 vs Dod 134 -> 1 | w1 Core Staff skill Mel 853 vs Def 808 -> 0 raw 0 app 0 | w2 Rift Gun skill Gun 783 vs Def 808 -> 1 raw 78 app 64 | targetHP 590 -> 526
- T3 D->A: hit Acc 222 vs Dod 134 -> 1 | w1 Core Staff skill Mel 853 vs Def 808 -> 1 raw 72 app 59 | w2 Rift Gun skill Gun 783 vs Def 808 -> 1 raw 75 app 61 | targetHP 526 -> 406

Compact resolved trace, right row:

- T1 D->A: hit Acc 191 vs Dod 134 -> 1 | w1 Core Staff skill Mel 940 vs Def 808 -> 1 raw 74 app 60 | w2 Rift Gun skill Gun 818 vs Def 808 -> 0 raw 0 app 0 | targetHP 650 -> 590
- T2 D->A: hit Acc 191 vs Dod 134 -> 1 | w1 Core Staff skill Mel 940 vs Def 808 -> 0 raw 0 app 0 | w2 Rift Gun skill Gun 818 vs Def 808 -> 1 raw 78 app 64 | targetHP 590 -> 526
- T3 D->A: hit Acc 191 vs Dod 134 -> 1 | w1 Core Staff skill Mel 940 vs Def 808 -> 1 raw 72 app 59 | w2 Rift Gun skill Gun 818 vs Def 808 -> 1 raw 75 app 61 | targetHP 526 -> 406

First-divergence table:

| field | left row | right row |
| --- | --- | --- |
| first differing event | HIT_SHARED T1 D->A  | HIT_SHARED T1 D->A  |
| offense input | Acc 222 | Acc 191 |
| defense input | Dod 134 | Dod 134 |
| RNG rolls | off 108, def 68 | off 93, def 68 |
| resolved result | 1 | 1 |
| compiled fields feeding event | accuracy 222, targetDodge 134 | accuracy 191, targetDodge 134 |



## 9. First-divergence tables

Comparison A:

- First divergence appears immediately on the defender's first shared hit check.
- Same RNG draws are consumed in both rows; only compiled inputs differ.
- Divergence is expected from compiled snapshot deltas:
  - defender accuracy drops from No Bio to One Bio P4
  - all later resolved differences flow from that changed pre-combat stat state

Comparison B:

- First divergence also appears immediately on the defender's first shared hit check.
- Same RNG draws are consumed in both rows; only compiled inputs differ.
- The mixed `P4 -> O4` swap changes compiled accuracy / dodge / defSkill / meleeSkill exactly as expected, and the first resolved difference follows those inputs without a hidden branch appearing.

## 10. Best explanation now

**COMBAT-RESOLUTION LOOKS CONSISTENT; REEVALUATE SUSPECT FAMILY**

- In Comparison A, the remaining miss is visible as a combat-resolution consequence of the already-compiled stat deltas, not as an unexpected hidden branch inside hit/skill/damage resolution.
- In Comparison B, the `P4 -> O4` swap produces only the expected resolved changes from the compiled snapshot differences; no extra higher-layer threshold or branch appeared in the captured 3-turn deterministic dump.
- Because both comparisons diverge exactly where the compiled snapshot inputs already diverge, this weakens the case for more Bio helper work inside combat resolution itself.
- Smallest plausible suspect layer now:
  - reevaluate the suspect family or external truth interpretation rather than continuing to patch higher-layer combat resolution

## 11. Recommendation

**COMBAT-RESOLUTION LOOKS CONSISTENT; REEVALUATE SUSPECT FAMILY**

## 12. What ChatGPT should do next

Use this report as the handoff. Stop patching combat-resolution logic for now and reevaluate the suspect family from the top using the anchored single-card, pair-aggregation, full-snapshot, and deterministic-resolution results together before making any more Bio helper changes.
