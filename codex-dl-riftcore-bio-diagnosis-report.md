# codex-dl-riftcore-bio-diagnosis-report

## Scope

Source-of-truth inputs read first:
- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `legacy-chat-handoff-2026-03-15-continuation.md`
- `tmp/codex-tracked-bio-lane-patch-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-applied-damage-proof-report.md`
- `codex-droid-split-decomposition-report.md`
- `codex-droid-shared-hit-family-proof-report.md`
- `codex-droid-vs-hf-shell-diff-report.md`
- `codex-droid-truth-pack-reconciliation-report.md`
- `codex-post-droid-residual-ranking-report.md`
- `legacy-truth-droid-shell-probe-2x4.json`

Fixed assumptions preserved:
- represented-build baseline stays
- tracked narrow Bio-lane mitigation patch is accepted source of truth
- droid lane stays parked
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `legacy-sim-v1.0.4-clean.js` | behavior-changing | restored the already-accepted tracked Bio-lane gate that was missing from the workspace copy |
| `tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js` | instrumentation-only | temp proof harness used to verify the missing-gate hypothesis before touching live |
| `codex-dl-riftcore-bio-diagnosis-report.md` | report-only | self-contained findings |

Parity-sensitive area touched:
- `compileCombatantFromParts(...)`
- `attemptWeapon(...)`

Brute parity status after this pass:
- inspected only
- `brute-sim-v1.4.6.js` still uses the old per-weapon mitigation path
- parity is **not preserved** in this lane after restoring the accepted legacy-only patch
- brute was intentionally untouched per request

## Exact commands run

### Context / source-of-truth reads

```sh
for f in AGENTS.md legacy-bio-debug-handoff-2026-03-15.md legacy-chat-handoff-2026-03-15-continuation.md codex-droid-lane-diagnosis-report.md codex-droid-applied-damage-proof-report.md codex-droid-split-decomposition-report.md codex-droid-shared-hit-family-proof-report.md codex-droid-vs-hf-shell-diff-report.md codex-droid-truth-pack-reconciliation-report.md codex-post-droid-residual-ranking-report.md legacy-truth-droid-shell-probe-2x4.json; do printf '===== %s =====\n' "$f"; sed -n '1,220p' "$f"; printf '\n'; done
if [ -f codex-tracked-bio-lane-patch-report.md ]; then printf '===== %s =====\n' codex-tracked-bio-lane-patch-report.md; sed -n '1,220p' codex-tracked-bio-lane-patch-report.md; elif [ -f tmp/codex-tracked-bio-lane-patch-report.md ]; then printf '===== %s =====\n' tmp/codex-tracked-bio-lane-patch-report.md; sed -n '1,220p' tmp/codex-tracked-bio-lane-patch-report.md; else echo '__MISSING__ codex-tracked-bio-lane-patch-report.md'; fi
```

### Live-file verification / shell inspection

```sh
rg -n "defenderIsBioLane|__runtimeSig|def\\.armorFactor|armorFactorForArmorValue\\(BASE\\.level, def\\.armor, cfg\\.armorK\\)" ./legacy-sim-v1.0.4-clean.js
sed -n '4205,4250p' ./legacy-sim-v1.0.4-clean.js
sed -n '2698,2770p' ./legacy-sim-v1.0.4-clean.js
git diff -- ./legacy-sim-v1.0.4-clean.js | sed -n '1,260p'

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
for (const name of ['DL Dual Rift Bio','DL Core/Rift Bio','DL Rift/Bombs Scout','Ashley Build','SG1 Rift/Bombs Bio']) {
  const d=curated[name];
  console.log('NAME\t'+name);
  for (const k of ['armor','weapon1','weapon2','misc1','misc2']) console.log(k+'\t'+JSON.stringify(d&&d[k]||null));
  console.log('stats\t'+JSON.stringify(d&&d.stats||null));
}
NODE
```

### Temp proof harness / checks

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js
node --check ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js
node --check ./legacy-sim-v1.0.4-clean.js
```

### Temp proof compares

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-diag LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-custom-temp' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js > ./tmp/codex-dl-riftcore-bio-custom-temp.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-diag LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-cstaff-temp' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js > ./tmp/codex-dl-riftcore-bio-cstaff-temp.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-diag LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-maul-dl-temp' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js > ./tmp/codex-dl-riftcore-bio-maul-dl-temp.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-diag LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-maul-sg1-temp' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.dl-riftcore-bio-diag.js > ./tmp/codex-dl-riftcore-bio-maul-sg1-temp.log 2>&1
```

### Curated shell snapshot export

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=1000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-dl-riftcore-bio-diag-curated.json LEGACY_DEFENDER_FILE=./data/legacy-defenders-meta-v4-curated.js LEGACY_VERIFY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dl-riftcore-bio-diag-curated.log 2>&1
```

### Brute inspection / live-file rerun / default-path sanity

```sh
rg -n "armorFactorForArmorValue|compileDefender|compileAttacker|per_weapon" ./brute-sim-v1.4.6.js | sed -n '1,220p'
node --check ./legacy-sim-v1.0.4-clean.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-live LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-custom-live' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dl-riftcore-bio-custom-live.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-live LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-cstaff-live' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dl-riftcore-bio-cstaff-live.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-live LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-maul-dl-live' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dl-riftcore-bio-maul-dl-live.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-dl-riftcore-bio-live LEGACY_REPLAY_TAG='codex-dl-riftcore-bio-maul-sg1-live' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,Ashley Build,SG1 Rift/Bombs Bio' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dl-riftcore-bio-maul-sg1-live.log 2>&1

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
function isRiftCoreWeapon(n){return n==='Rift Gun' || n==='Core Staff';}
const exact=Object.entries(live).filter(([,d])=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.misc1&&d.misc2&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2.name==='Bio Spinal Enhancer'&&d.weapon1&&d.weapon2&&((d.weapon1.name==='Rift Gun'&&d.weapon2.name==='Rift Gun')||((d.weapon1.name==='Core Staff'&&d.weapon2.name==='Rift Gun')||(d.weapon1.name==='Rift Gun'&&d.weapon2.name==='Core Staff')))).map(([n])=>n).sort();
console.log('next_lane_default_count\t'+exact.length);
for (const n of exact) console.log(n);
NODE

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
function isRiftCoreWeapon(n){return n==='Rift Gun' || n==='Core Staff';}
const broad=Object.entries(live).filter(([,d])=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&isRiftCoreWeapon(d.weapon1.name)&&isRiftCoreWeapon(d.weapon2.name)&&d.misc1&&d.misc2&&((d.misc1.name==='Bio Spinal Enhancer')||(d.misc2.name==='Bio Spinal Enhancer'))).map(([n])=>n).sort();
console.log('broad_bio_riftcore_count\t'+broad.length);
for (const n of broad) console.log(n);
NODE
```

## Compact 8-row target table

Before = workspace live file before restoring the accepted gate.
After = current live file after restoring the accepted gate.

| Attacker | Defender | Before win Δ | After win Δ | Improvement | Before avgT Δ | After avgT Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `CUSTOM` | `DL Dual Rift Bio` | `-0.92` | `-0.04` | `+0.88` | `+0.4896` | `+0.4434` |
| `CUSTOM` | `DL Core/Rift Bio` | `-2.99` | `-2.22` | `+0.77` | `+0.2688` | `+0.2267` |
| `CUSTOM_CSTAFF_A4` | `DL Dual Rift Bio` | `-5.93` | `-3.08` | `+2.85` | `+0.1822` | `+0.0077` |
| `CUSTOM_CSTAFF_A4` | `DL Core/Rift Bio` | `-5.79` | `-3.02` | `+2.77` | `+0.1819` | `-0.0096` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Dual Rift Bio` | `-4.80` | `-2.68` | `+2.12` | `+0.2458` | `+0.1341` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Core/Rift Bio` | `-3.85` | `-1.61` | `+2.24` | `+0.2325` | `+0.1014` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Dual Rift Bio` | `-5.74` | `-3.27` | `+2.47` | `+0.3424` | `+0.2046` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Core/Rift Bio` | `-3.02` | `-0.82` | `+2.20` | `+0.2995` | `+0.1708` |

What moved:
- all `8/8` target rows improved in the same direction
- `DL Dual Rift Bio` moved hardest
- `DL Core/Rift Bio` also moved materially on all four attackers

What that means:
- the first shared divergence was real and common
- these two defenders clearly do share one mechanism strongly enough to treat as one diagnosis lane

## Compact shell-signature comparison

Compiled snapshot read from the curated defender file path:

| Defender | Shared gate structure | Effective shell | Weapon 1 | Weapon 2 | Shared misc shell |
| --- | --- | --- | --- | --- | --- |
| `DL Dual Rift Bio` | `Dark Legion Armor` + `Bio P4 / Bio P4` | `HP 865` `Spd 257` `Acc 229` `Dod 123` `Gun 822` `Def 849` `Arm 83` `armF 0.814318` | `Rift Gun A3+F` `gunSkill` `77-84 -> 63-69` | `Rift Gun A4` `gunSkill` `75-81 -> 61-66` | identical |
| `DL Core/Rift Bio` | `Dark Legion Armor` + `Bio P4 / Bio P4` | `HP 865` `Spd 282` `Acc 198` `Dod 123` `Gun 834` `Mel 906` `Def 916` `Arm 83` `armF 0.814318` | `Core Staff A4` `meleeSkill` `62-75 -> 51-61` | `Rift Gun A4` `gunSkill` `75-81 -> 61-66` | identical |

Shared read:
- same armor
- same HP / dodge / accuracy base shell
- same double-`Bio Spinal Enhancer` with `Perfect Pink Crystal`
- same compiled `armorFactor`
- both are within the exact accepted structural gate

Difference:
- only the weapon mix differs:
  - dual-rift = gun/gun
  - core-rift = melee/gun

That difference changes magnitude, but not the shared gate eligibility.

## First concrete shared divergence found

First concrete shared divergence:
- the current workspace copy of `legacy-sim-v1.0.4-clean.js` was missing the already-accepted tracked Bio-lane gate

Mechanically:
1. `compileCombatantFromParts(...)` no longer carried the accepted minimal `__runtimeSig`.
2. `attemptWeapon(...)` therefore had no way to recognize the `Dark Legion Armor + Bio/Bio + Rift/Core` lane.
3. In the `cfg.armorApply === 'per_weapon'` branch, attacker hits into both defenders were using:
   - `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`
4. The accepted patch state should instead use:
   - `def.armorFactor`
   - but only for attacker-side hits into that exact structural lane

So the first shared divergence is in:
- `mitigation / armor application`
- specifically the attacker-side per-weapon post-hit mitigation source inside `attemptWeapon(...)`

This is earlier and cleaner than:
- turn order
- hit rate
- skill sharing
- multiweapon sequencing
- defender-side realized damage throughput

Evidence from the compare rows:
- controls and contrasts stayed flat
- target rows moved materially
- the biggest per-row movement showed up in attacker applied damage, not in hit/skill rate

## Control / contrast

Rows used:
- `DL Rift/Bombs Scout` healthy control
- `Ashley Build` non-lane contrast
- `SG1 Rift/Bombs Bio` optional contrast

Result:
- `DL Rift/Bombs Scout`: unchanged on all four attackers
- `Ashley Build`: unchanged on all four attackers
- `SG1 Rift/Bombs Bio`: unchanged on all four attackers

Compact read:
- the restored gate is narrow
- it does not broaden into nearby non-lane rows
- it behaves exactly like the accepted tracked report said it should

## Broader sanity

Default defender file path:
- exact `Dark Legion Armor + (Rift/Rift or Core/Rift) + Bio/Bio`: `0` matches in `data/legacy-defenders.js`
- broader `Dark Legion Armor + dual Rift/Core weapons + at least one Bio`: `0` matches in `data/legacy-defenders.js`

Meaning:
- this lane still has no direct default-file reach
- that keeps the collateral risk low, but it also means the current proof is still mainly curated-truth-scoped

## Exact narrow change restored

Live-file restore:

1. `compileCombatantFromParts(...)`
   - restored `c.__runtimeSig` with:
     - `armorItem`
     - `w1Item`
     - `w2Item`
     - `m1Item`
     - `m2Item`
     - `m1Crystal`
     - `m2Crystal`

2. `attemptWeapon(...)`
   - restored the accepted structural gate:
     - `Dark Legion Armor`
     - `Bio Spinal Enhancer` / `Bio Spinal Enhancer`
     - `Perfect Pink Crystal` / `Perfect Pink Crystal`
     - `(Rift Gun,Rift Gun)` or `(Core Staff,Rift Gun)` or `(Rift Gun,Core Staff)`
   - restored the accepted mitigation source swap:
     - attacker-side only
     - `armorApply === 'per_weapon'` only
     - gated lane only
     - `def.armorFactor` instead of `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`

Why this is mechanically justified:
- it is not a new theory patch
- it is the already-accepted tracked Bio-lane mitigation from source-of-truth
- the workspace copy had drifted away from that accepted state
- the proof rerun shows the restored gate moves exactly the intended lane and not the contrasts

## Single best next patch target, if any

Best target found in this pass:
- restore the accepted tracked Bio-lane gate in the live file

Status now:
- restored
- verified on the 8 target rows plus control / contrast rows

After this repair:
- some residual remains on the two defenders, especially on `CUSTOM_CSTAFF_A4` and the two maul attackers
- but the first concrete shared divergence on the workspace copy is now isolated and repaired

If another follow-up pass is opened later, it should start from this repaired state, not the pre-repair workspace drift.

## Explicit statements

- no new truth was collected
- `brute-sim-v1.4.6.js` was untouched
- cleanup was untouched
- droid was not reopened

DL double-Bio Rift/Core lane isolated
