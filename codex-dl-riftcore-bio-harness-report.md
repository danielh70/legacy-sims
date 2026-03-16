# codex-dl-riftcore-bio-harness-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.lane-probe.js` | instrumentation-only | added one new structural probe predicate for the exact residual DL double-Bio Rift/Core family |
| `tools/codex-lane-probe-harness.js` | instrumentation-only | added default-defender reach support for that new structural predicate |
| `tmp/codex-dl-riftcore-bio-config.js` | instrumentation-only | small harness config for this lane |
| `codex-dl-riftcore-bio-harness-report.md` | report-only | self-contained pass summary |

No live combat patch was landed. `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not edited.

Parity note:

- parity-sensitive probe surface changed only in the temp sim copy:
  - `laneProbeW2PredicateMatch(...)`
- corresponding brute locations were not changed because no live behavior patch was attempted
- parity is unchanged in the live simulators because this pass was instrumentation-only

## Exact commands run

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' tmp/codex-tracked-bio-lane-patch-report.md
sed -n '1,260p' codex-post-bio-restore-residual-ranking-report.md
sed -n '1,260p' codex-dl-riftcore-bio-diagnosis-report.md
sed -n '1,260p' codex-sg1-bombs-downstream-refinement-report.md
sed -n '1,260p' codex-global-armor-k-sanity-report.md

node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./tmp/codex-dl-riftcore-bio-config.js
node --check ./legacy-sim-v1.0.4-clean.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-dl-riftcore-bio-config.js > ./tmp/codex-dl-riftcore-bio-harness.log 2>&1

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
for (const name of ['DL Dual Rift Bio','DL Core/Rift Bio']) {
  const d=curated[name];
  const s=d.stats||{};
  console.log([name,d.armor&&d.armor.name,d.weapon1&&d.weapon1.name,d.weapon2&&d.weapon2.name,d.misc1&&d.misc1.name,d.misc2&&d.misc2.name,s.hp,s.speed,s.dodge,s.accuracy,s.gunSkill,s.meleeSkill,s.defenseSkill,s.armor].join('\t'));
}
NODE

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const exact=Object.entries(live).filter(([,d])=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&['Rift Gun','Core Staff'].includes(d.weapon1.name)&&['Rift Gun','Core Staff'].includes(d.weapon2.name)&&d.misc1&&d.misc2&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2.name==='Bio Spinal Enhancer').map(([n])=>n).sort();
console.log('default_exact_count\t'+exact.length);
for (const n of exact) console.log(n);
NODE

node - <<'NODE'
const fs=require('fs');
const summary=JSON.parse(fs.readFileSync('./tmp/lane-probe-harness/dl-riftcore-bio-1773639579244/summary.json','utf8'));
function byId(id){return summary.toggles.find(t=>t.id===id);}
const off=byId('off');
for(const r of off.rowSummaries.filter(r=>r.group==='target')){
  console.log([r.attacker,r.defender,r.baseWinDelta,r.baseTurnsDelta].join('\t'));
}
NODE
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/lane-probe-harness/dl-riftcore-bio-1773639579244/summary.json`

## Compact shell-signature table for `DL Dual Rift Bio` vs `DL Core/Rift Bio`

| defender | armor | w1 | w2 | misc pair | structural read |
| --- | --- | --- | --- | --- | --- |
| `DL Dual Rift Bio` | `Dark Legion Armor` | `Rift Gun` | `Rift Gun` | `Bio Spinal Enhancer + Bio Spinal Enhancer` | pure dual-rift projectile shell inside the accepted Bio gate |
| `DL Core/Rift Bio` | `Dark Legion Armor` | `Core Staff` | `Rift Gun` | `Bio Spinal Enhancer + Bio Spinal Enhancer` | mixed melee/projectile shell inside the accepted Bio gate |

Shared read:

- same armor
- same double-Bio misc shell
- same accepted tracked Bio-gate family
- same residual sign pattern after the restore: attacker win too low, fights too long

Difference:

- `DL Dual Rift Bio` is dual projectile
- `DL Core/Rift Bio` is mixed melee/projectile

That weapon-family difference ended up mattering immediately in the probe results.

## 8-row baseline target table

20k harness baseline on the current accepted live file:

| attacker | defender | win Δ | avgTurns Δ |
| --- | --- | ---: | ---: |
| `CUSTOM` | `DL Dual Rift Bio` | `-0.51` | `+0.4512` |
| `CUSTOM_CSTAFF_A4` | `DL Dual Rift Bio` | `-3.61` | `-0.0226` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Dual Rift Bio` | `-2.35` | `+0.0987` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Dual Rift Bio` | `-3.34` | `+0.2097` |
| `CUSTOM` | `DL Core/Rift Bio` | `-2.75` | `+0.2187` |
| `CUSTOM_CSTAFF_A4` | `DL Core/Rift Bio` | `-3.00` | `-0.0402` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Core/Rift Bio` | `-1.27` | `+0.0753` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Core/Rift Bio` | `-1.55` | `+0.1620` |

Read:

- all `8/8` rows still have negative win delta
- `6/8` still have positive avgTurns drift
- the long-fight read still holds overall, but the CSTAFF rows are much less turn-drifted than the others

## Toggle matrix tested

- `off`
- `refresh_hit_dl_riftcore_double_bio`
- `refresh_skill_dl_riftcore_double_bio`
- `refresh_full_dl_riftcore_double_bio`
- `w2gate_defender_dl_riftcore_double_bio`
- `split_defender_dl_riftcore_double_bio`
- `refresh_hit_plus_w2gate_dl_riftcore_double_bio`
- `refresh_hit_plus_split_dl_riftcore_double_bio`
- `refresh_hit_dual_projectile`
- `split_defender_dual_projectile`
- `refresh_hit_exact_dual_rift_bound` — analysis bound only
- `refresh_hit_exact_core_rift_bound` — analysis bound only

Interpretation:

- the new structural family predicate was:
  - `Dark Legion Armor`
  - both misc slots = `Bio Spinal Enhancer`
  - both weapons in `{Rift Gun, Core Staff}`
- exact-shell bounds were included only to see whether the residual lane split immediately by weapon mix

## Compact ranked score table

Scoring used the existing harness formula:

- `targetGain` = mean reduction in absolute win delta across the 8 target rows
- `controlMove` = mean absolute movement on `DL Rift/Bombs Scout`
- `contrastMove` = mean absolute movement on `SG1 Split Bombs T2`, `Ashley Build`, `HF Scythe Pair`
- `score = targetGain - controlMove - contrastMove - 0.1*defaultReach`

| rank | toggle | targetGain | controlMove | contrastMove | defaultReach | score | read |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `refresh_hit_exact_dual_rift_bound` | `0.01` | `0.00` | `0.00` | `0` | `0.01` | tiny positive analysis bound only |
| 2 | `off` | `0.00` | `0.00` | `0.00` | `0` | `0.00` | baseline |
| 3 | `refresh_skill_dl_riftcore_double_bio` | `0.00` | `0.00` | `0.00` | `0` | `0.00` | completely inert |
| 4 | `refresh_hit_dl_riftcore_double_bio` | `-0.08` | `0.00` | `0.00` | `0` | `-0.08` | family-wide hit refresh hurts overall |
| 5 | `refresh_full_dl_riftcore_double_bio` | `-0.08` | `0.00` | `0.00` | `0` | `-0.08` | same as hit-only; skill still inert |
| 6 | `refresh_hit_exact_core_rift_bound` | `-0.09` | `0.00` | `0.00` | `0` | `-0.09` | mixed Core/Rift shell goes the wrong way |
| 7 | `refresh_hit_dual_projectile` | `0.00` | `0.00` | `0.12` | `1` | `-0.22` | no target gain, broadens into contrasts |
| 8 | `split_defender_dual_projectile` | `0.33` | `0.42` | `0.40` | `1` | `-0.59` | raw movement, far too broad |
| 9 | `w2gate_defender_dl_riftcore_double_bio` | `0.08` | `0.64` | `0.25` | `0` | `-0.80` | slight target help, unacceptable collateral |
| 10 | `refresh_hit_plus_w2gate_dl_riftcore_double_bio` | `-0.07` | `0.64` | `0.25` | `0` | `-0.95` | hit refresh makes gate result worse |
| 11 | `split_defender_dl_riftcore_double_bio` | `-0.26` | `0.42` | `0.29` | `0` | `-0.96` | family-wide split action is actively bad |
| 12 | `refresh_hit_plus_split_dl_riftcore_double_bio` | `-0.26` | `0.42` | `0.29` | `0` | `-0.96` | same bad shape as split alone |

## Whether the two defenders still behave like one lane

Not under the current narrow probe surfaces.

What stayed shared:

- both defenders remain inside the accepted structural Bio gate
- both still show the same broad residual sign: attacker win too low

What split immediately:

- family-wide defender `w2` shared-hit refresh is net negative
- the exact dual-rift bound is slightly positive
- the exact core/rift bound is negative

So the current residual family does **not** behave like one shared patchable post-restore lane. The first split axis is the weapon mix itself:

- `Rift/Rift` has a tiny positive defender `w2` shared-hit signal
- `Core/Rift` does not share it

## Single best next branch or toggle

Best next branch, if this family is revisited at all:

- `dual-rift-only defender w2 shared-hit reuse`

Why:

- `refresh_hit_exact_dual_rift_bound` is the only non-baseline positive mover
- it stays flat on the control and listed contrasts
- it localizes the remaining live signal to the `DL Dual Rift Bio` half, not the full family

Why it is still weak:

- target gain is only `0.01`
- one of the four Dual Rift rows still regresses (`CUSTOM_MAUL_A4_DL_ABYSS: -2.35 -> -2.80`)
- avgTurns also gets worse on the moved rows

That is too small and too mixed to justify a confirmation pass from this screen.

## Whether any toggle is patch-ready

No.

Reasons:

- no family-wide toggle beat baseline cleanly
- the only positive result was an exact-shell analysis bound with a negligible score
- every mechanically broader family toggle was flat, harmful, or too collateral-heavy
- the residual lane no longer looks like one shared reusable mechanism after the accepted Bio gate restore

## Control / contrast summary

Most important control/contrast reads:

- `refresh_skill_dl_riftcore_double_bio`: completely flat everywhere
- `refresh_hit_dl_riftcore_double_bio`: target-only movement, but net harmful
- `w2gate_defender_dl_riftcore_double_bio`: `targetGain 0.08`, but `controlMove 0.64`, `contrastMove 0.25`
- `split_defender_dl_riftcore_double_bio`: `targetGain -0.26`, `controlMove 0.42`, `contrastMove 0.29`
- `refresh_hit_dual_projectile`: no target gain, still moves contrasts

So the strongest surviving read is negative:

- there is no clean reusable defender-side shared-hit/shared-skill/gate/split lead left on the full family

## Broader sanity note

`data/legacy-defenders.js` still has:

- `0` direct matches for the exact structural family
  - `Dark Legion Armor + {Rift/Core,Rift/Core} + Bio/Bio`

That means even a future narrow fix here would still need broader validation before any landing decision.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No exact-label live patch was landed.
- No exact-shell live patch was landed.

DL double-Bio Rift/Core harness found no promising toggle
