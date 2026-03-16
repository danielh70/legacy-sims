# codex-full-rollback-vs-k-report

Cleanup note:
- temporary probe configs, logs, and replay outputs referenced below were historical investigation artifacts and may have been removed during final repo cleanup

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.lane-probe.js` | instrumentation-only | added temp-only rollback switches for Bio gate OFF and item-override OFF testing |
| `tmp/codex-full-rollback-vs-k-config.js` | instrumentation-only | 7-model broad rollback matrix config |
| `tmp/codex-full-rollback-vs-k-confirm-config.js` | instrumentation-only | A-vs-C 20k confirmation config |
| `codex-full-rollback-vs-k-report.md` | report-only | model-selection summary |

No live combat file was edited in this pass.
No behavior-changing patch was landed.
`brute-sim-v1.4.6.js` was not edited.

## Source-of-truth note

Requested file:

- `Mixed-slot representation pass.txt`

was not present in the workspace under that exact name. I searched for it and found no local match. To preserve the user’s stated assumption that the represented-build fix stays ON and is outside this rollback, I used the nearest local mixed-slot artifact:

- `tmp/codex-mixed-slot-live-build-report.md`

That report is consistent with the current accepted state: represented-build support stays ON and is not part of this rollback matrix.

## Exact commands run

```bash
sed -n '1,240p' AGENTS.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
find . -name 'Mixed-slot representation pass.txt' -o -name '*Mixed*slot*representation*pass*' -o -name '*mixed*slot*representation*pass*'
sed -n '180,240p' ./tmp/codex-mixed-slot-live-build-report.md
sed -n '1,260p' codex-global-armor-k-sanity-report.md
sed -n '1,260p' codex-final-post-parking-go-no-go-report.md
sed -n '1,260p' codex-hf-truth-pack-stop-go-report.md
sed -n '1,260p' codex-dl-riftcore-bio-diagnosis-report.md

rg -n "Hellforged Armor|Void Sword|armorK|defenderIsBioLane|__runtimeSig|armorFactorForArmorValue\\(|itemName === 'Void Sword'|name === 'Void Sword'" ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js ./data/legacy-defs.js
sed -n '1560,1775p' ./legacy-sim-v1.0.4-clean.js
sed -n '2718,2765p' ./legacy-sim-v1.0.4-clean.js
sed -n '4238,4265p' ./legacy-sim-v1.0.4-clean.js
sed -n '1,260p' ./tmp/codex-global-armor-k-sanity-config.js
sed -n '1,260p' ./tools/codex-lane-probe-harness.js

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const counts={bioGate:0,hfArmor:0,voidSword:0};
for(const [,d] of Object.entries(live)){
  if(d&&d.armor&&d.armor.name==='Hellforged Armor') counts.hfArmor++;
  if(d&&((d.weapon1&&d.weapon1.name==='Void Sword')||(d.weapon2&&d.weapon2.name==='Void Sword'))) counts.voidSword++;
  const isBioGate=d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.misc1&&d.misc2&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2.name==='Bio Spinal Enhancer'&&d.weapon1&&d.weapon2&&((d.weapon1.name==='Rift Gun'&&d.weapon2.name==='Rift Gun')||(d.weapon1.name==='Core Staff'&&d.weapon2.name==='Rift Gun')||(d.weapon1.name==='Rift Gun'&&d.weapon2.name==='Core Staff'));
  if(isBioGate) counts.bioGate++;
}
console.log(JSON.stringify(counts,null,2));
NODE

node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tmp/codex-full-rollback-vs-k-config.js
node --check ./tmp/codex-full-rollback-vs-k-confirm-config.js
node --check ./tools/codex-lane-probe-harness.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-full-rollback-vs-k-config.js > ./tmp/codex-full-rollback-vs-k-harness.log 2>&1
node ./tools/codex-lane-probe-harness.js ./tmp/codex-full-rollback-vs-k-confirm-config.js > ./tmp/codex-full-rollback-vs-k-confirm-harness.log 2>&1
```

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against:

- `./tmp/lane-probe-harness/full-rollback-vs-k-1773700233547`
- `./tmp/lane-probe-harness/full-rollback-vs-k-confirm-1773700555659`

## Broad score table

10k full matrix over the deduplicated `70` truth-covered rows from:

- current 4 full truth files
- droid shell probe `2x4`
- HF shell probe `2x4`

| model | broad mean abs win Δ | broad worst abs win Δ | broad mean abs avgTurns Δ | improved / worsened / flat vs A | read |
| --- | ---: | ---: | ---: | --- | --- |
| `A current accepted` | `2.106` | `6.96` | `0.0965` | `0 / 0 / 70` | reference |
| `B no Bio gate` | `2.347` | `6.96` | `0.1090` | `0 / 8 / 62` | clearly worse; only blows up repaired Bio rows |
| `C no item overrides` | `1.854` | `6.37` | `0.1125` | `33 / 19 / 18` | best broad win/error score in matrix |
| `D no Bio gate + no item overrides` | `2.113` | `6.89` | `0.1264` | `31 / 24 / 15` | near A on win, worse on turns and Bio lane |
| `E no Bio gate + no item overrides + K=7` | `2.558` | `12.33` | `0.2674` | `29 / 29 / 12` | catastrophically bad on Bio and controls |
| `F current stack + K=7` | `2.312` | `7.90` | `0.2549` | `22 / 34 / 14` | global-K theory fails again |
| `G no Bio gate + no item overrides + K=7.5` | `2.296` | `9.55` | `0.1398` | `26 / 30 / 14` | less bad than `K=7`, still worse than A/C |

## A-vs-C confirmation

Because `C` was the only broad winner at 10k, I reran just `A` vs `C` at 20k.

| model | mean abs win Δ | worst abs win Δ | mean abs avgTurns Δ |
| --- | ---: | ---: | ---: |
| `A current accepted` | `2.011` | `6.53` | `0.0945` |
| `C no item overrides` | `1.855` | `6.19` | `0.1102` |

`C` still wins on both broad mean abs win delta and worst abs win delta.

## Lane summary table

10k matrix, mean abs win delta by bucket:

| model | repaired Bio lane | HF truth-pack rows | all remaining rows |
| --- | ---: | ---: | ---: |
| `A` | `2.407` | `2.465` | `1.991` |
| `B` | `4.510` | `2.465` | `1.991` |
| `C` | `2.220` | `1.789` | `1.810` |
| `D` | `4.484` | `1.789` | `1.810` |
| `E` | `6.726` | `1.812` | `2.061` |
| `F` | `3.093` | `3.009` | `2.058` |
| `G` | `5.184` | `1.444` | `2.015` |

Read:

- `B` proves the accepted Bio gate is still doing real work.
- `E/F/G` prove the broad `armorK` rollback is not the missing root fix.
- `C` is the only model that improves all three buckets at once.

## Healthy / control summary

10k matrix, movement relative to current accepted model `A`:

| model | healthy-row mean move | scout mean move |
| --- | ---: | ---: |
| `A` | `0.000` | `0.000` |
| `B` | `0.0435` | `0.0000` |
| `C` | `0.7520` | `0.3225` |
| `D` | `0.7740` | `0.3225` |
| `E` | `1.8400` | `1.9625` |
| `F` | `1.7765` | `2.1650` |
| `G` | `0.9665` | `0.9725` |

20k confirmation for `C` vs `A`:

- healthy-row mean move: `0.588`
- scout mean move: `0.490`

So `C` is not “flat”, but it is still far cleaner than any `K` rollback, and its broad error reduction survived confirmation.

## Rows materially improved vs worsened

Material threshold:

- `|Δ abs win| >= 0.25` relative to current accepted model `A`

Counts from the 10k matrix:

| model | materially improved | materially worsened | flat |
| --- | ---: | ---: | ---: |
| `B` | `0` | `8` | `62` |
| `C` | `33` | `19` | `18` |
| `D` | `31` | `24` | `15` |
| `E` | `29` | `29` | `12` |
| `F` | `22` | `34` | `14` |
| `G` | `26` | `30` | `14` |

Most important 20k `C` vs `A` improvements:

| attacker | defender | abs-win improvement |
| --- | --- | ---: |
| `CUSTOM` | `HF Scythe Pair | weapon2 Crystal Maul` | `+3.03` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | misc2 Scout Drones` | `+2.72` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | weapon2 Crystal Maul` | `+1.97` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Core/Rift Bio` | `+1.25` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `+1.06` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Split Bombs T2` | `+0.93` |

Most important 20k `C` vs `A` regressions:

| attacker | defender | abs-win improvement |
| --- | --- | ---: |
| `CUSTOM` | `HF Scythe Pair` | `-2.06` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `HF Scythe Pair` | `-1.12` |
| `CUSTOM` | `SG1 Double Maul Droid | misc2 Bio Spinal Enhancer` | `-1.04` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Maul/Core Orphic` | `-0.96` |
| `CUSTOM` | `DL Maul/Core Orphic` | `-0.95` |
| `CUSTOM_CSTAFF_A4` | `SG1 Void/Reaper` | `-0.91` |

This is the real trade:

- `C` is not universally better
- but it is the only rollback model that wins broadly without reviving the rejected global-`K` failure mode

## Default / live reach note

Affected current correction surfaces in `data/legacy-defenders.js`:

- accepted structural Bio gate exact reach: `0`
- Hellforged armor override reach: `2`
- Void Sword override reach: `2`
- any global `armorK` change reach: `15`

Important nuance:

- the current Void Sword override is effectively inert here, because `data/legacy-defs.js` already has `Void Sword` base max `120`
- so the practical difference between `A` and `C` is almost entirely:
  - keep represented-build fix ON
  - keep Bio gate ON
  - remove the `Hellforged Armor` base override

That is much narrower than any `armorK` rollback.

## Explicit answer: are the current special-case corrections mostly compensating for wrong armor K?

**No.**

Evidence:

1. every `armorK=7` model is materially worse than the current accepted model
2. even `7.5` loses to both `A` and `C`
3. turning the Bio gate OFF alone is clearly worse
4. the only rollback winner is `C`, which keeps:
   - represented-build fix ON
   - accepted Bio gate ON
   - `armorK = 8`

So the accepted narrow Bio gate is **not** mainly covering for wrong global `armorK`.
It remains the least-bad calibrated correction for its proven lane.

## Recommendation

**Replace the current accepted live file with rollback winner `C`** if you want the best broad model from this matrix.

Meaning:

- represented-build fix ON
- accepted narrow Bio gate ON
- HF armor override OFF
- Void Sword override OFF
- `armorK = 8`

Practical note:

- because the shared defs already carry `Void Sword` max `120`, this recommendation is effectively:
  - remove the `Hellforged Armor` base override
  - keep everything else about the current accepted model

This is a model-selection recommendation only.
No live patch was landed in this pass.

## Explicit untouched statements

- No new truth was collected.
- `legacy-sim-v1.0.4-clean.js` was untouched.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.

rollback model wins: C
