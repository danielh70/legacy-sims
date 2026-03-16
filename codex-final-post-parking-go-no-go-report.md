# codex-final-post-parking-go-no-go-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `codex-final-post-parking-go-no-go-report.md` | report-only | final post-parking residual triage on the accepted live file |

No JS files were edited in this pass.
No behavior-changing patch was made.
No new legacy/brute parity risk was introduced in this pass.

## Exact commands run

```bash
sed -n '1,240p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' ./tmp/codex-tracked-bio-lane-patch-report.md
sed -n '1,260p' codex-post-bio-restore-residual-ranking-report.md
sed -n '1,260p' codex-reaper-first-attacker-sensitivity-report.md
sed -n '1,260p' codex-sg1-bombs-landing-sanity-report.md
sed -n '1,260p' codex-global-armor-k-sanity-report.md
sed -n '1,260p' codex-dl-riftcore-bio-harness-report.md

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-final-post-parking LEGACY_REPLAY_TAG='final-post-parking-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-post-parking-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-final-post-parking LEGACY_REPLAY_TAG='final-post-parking-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-post-parking-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-final-post-parking LEGACY_REPLAY_TAG='final-post-parking-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-post-parking-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-final-post-parking LEGACY_REPLAY_TAG='final-post-parking-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-post-parking-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-final-post-parking LEGACY_REPLAY_TAG='final-post-parking-droid-probe' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-post-parking-droid-probe.log 2>&1

find ./tmp/replay-final-post-parking -maxdepth 1 -type f | sort

node - <<'NODE'
const fs=require('fs');
const path=require('path');
const dir='./tmp/replay-final-post-parking';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f)).sort();
const rows=[];
for(const file of files){const j=JSON.parse(fs.readFileSync(file,'utf8')); for(const r of j.rows) rows.push({...r, source:path.basename(file)});}
const dedup=new Map();
for(const r of rows) dedup.set(`${r.attacker}__${r.defender}`, r);
const unique=[...dedup.values()].sort((a,b)=>b.absWinPct-a.absWinPct || b.absAvgTurns-a.absAvgTurns);
console.log('TOTAL_ROWS\t'+rows.length);
console.log('UNIQUE_ROWS\t'+unique.length);
console.log('TOP_30');
for(const r of unique.slice(0,30)) console.log([r.attacker,r.defender,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),r.absWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4)].join('\t'));
console.log('\nBY_DEFENDER');
const byDef={};
for(const r of unique){(byDef[r.defender]??=[]).push(r);}
const defs=Object.entries(byDef).map(([def,arr])=>({def,rows:arr.length,avgAbsWin:arr.reduce((s,r)=>s+r.absWinPct,0)/arr.length,worst:Math.max(...arr.map(r=>r.absWinPct)),avgAbsTurns:arr.reduce((s,r)=>s+Math.abs(r.dAvgTurns),0)/arr.length,pos:arr.filter(r=>r.dWinPct>0).length,neg:arr.filter(r=>r.dWinPct<0).length})).sort((a,b)=>b.avgAbsWin-a.avgAbsWin||b.worst-a.worst);
for(const d of defs) console.log([d.def,d.rows,d.avgAbsWin.toFixed(2),d.worst.toFixed(2),d.avgAbsTurns.toFixed(4),`${d.pos}p/${d.neg}n`].join('\t'));
NODE

node - <<'NODE'
const fs=require('fs');
const path=require('path');
const dir='./tmp/replay-final-post-parking';
const parked=new Set([
  'SG1 Double Maul Droid',
  'SG1 Double Maul Droid | misc2 Bio Spinal Enhancer',
  'SG1 Double Maul Droid | armor Hellforged Armor',
  'Ashley Build',
  'DL Reaper/Maul Orphic Bio',
  'SG1 Split Bombs T2',
  'SG1 Rift/Bombs Bio',
  'DL Dual Rift Bio',
  'DL Core/Rift Bio',
]);
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f));
const rows=[];
for(const file of files){const j=JSON.parse(fs.readFileSync(file,'utf8')); for(const r of j.rows) rows.push(r);}
const dedup=new Map();
for(const r of rows) dedup.set(`${r.attacker}__${r.defender}`, r);
const active=[...dedup.values()].filter(r=>!parked.has(r.defender)).sort((a,b)=>b.absWinPct-a.absWinPct || Math.abs(b.dAvgTurns)-Math.abs(a.dAvgTurns));
console.log('ACTIVE_ROWS\t'+active.length);
console.log('TOP_24_ACTIVE');
for(const r of active.slice(0,24)) console.log([r.attacker,r.defender,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),r.absWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4)].join('\t'));
console.log('\nACTIVE_BY_DEFENDER');
const byDef={};
for(const r of active){(byDef[r.defender]??=[]).push(r);}
const defs=Object.entries(byDef).map(([def,arr])=>({def,avgAbsWin:arr.reduce((s,r)=>s+r.absWinPct,0)/arr.length,worst:Math.max(...arr.map(r=>r.absWinPct)),avgAbsTurns:arr.reduce((s,r)=>s+Math.abs(r.dAvgTurns),0)/arr.length,pos:arr.filter(r=>r.dWinPct>0).length,neg:arr.filter(r=>r.dWinPct<0).length})).sort((a,b)=>b.avgAbsWin-a.avgAbsWin || b.worst-a.worst);
for(const d of defs) console.log([d.def,d.avgAbsWin.toFixed(2),d.worst.toFixed(2),d.avgAbsTurns.toFixed(4),`${d.pos}p/${d.neg}n`].join('\t'));
NODE

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
for (const name of ['HF Scythe Pair','DL Gun Blade Recon','DL Gun Blade Bio','DL Core/Rift Dodge','SG1 Void/Reaper','DL Maul/Core Orphic','DL Gun Sniper Mix','DL Rift/Bombs Scout']) {
  const d=curated[name];
  const s=d.stats||{};
  console.log([name,d.armor&&d.armor.name,d.weapon1&&d.weapon1.name,d.weapon2&&d.weapon2.name,d.misc1&&d.misc1.name,d.misc2&&d.misc2.name,s.hp,s.speed,s.dodge,s.accuracy,s.defenseSkill,s.armor].join('\t'));
}
NODE

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const checks={
  hf_scythe_pair:d=>d&&d.armor&&d.armor.name==='Hellforged Armor'&&d.weapon1&&d.weapon1.name==='Scythe T2'&&d.weapon2&&d.weapon2.name==='Scythe T2',
  dl_core_rift_dodge:d=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon1.name==='Rift Gun'&&d.weapon2&&d.weapon2.name==='Core Staff'&&d.misc1&&d.misc1.name==='Scout Drones'&&d.misc2&&d.misc2.name==='Scout Drones',
  dl_gun_blade_recon:d=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon1.name==='Rift Gun'&&d.weapon2&&d.weapon2.name==='Gun Blade Mk4'&&d.misc1&&d.misc1.name==='Recon Drones'&&d.misc2&&d.misc2.name==='Scout Drones',
  dl_gun_blade_bio:d=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon1.name==='Rift Gun'&&d.weapon2&&d.weapon2.name==='Gun Blade Mk4'&&d.misc1&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2&&d.misc2.name==='Scout Drones',
  sg1_void_reaper:d=>d&&d.armor&&d.armor.name==='SG1 Armor'&&d.weapon1&&d.weapon1.name==='Void Bow'&&d.weapon2&&d.weapon2.name==='Reaper Axe',
  dl_maul_core_orphic:d=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon1.name==='Crystal Maul'&&d.weapon2&&d.weapon2.name==='Core Staff'&&d.misc1&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2&&d.misc2.name==='Orphic Amulet',
  dl_gun_sniper_mix:d=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon1.name==='Rift Gun'&&d.weapon2&&d.weapon2.name==='Double Barrel Sniper Rifle',
};
for(const [label,fn] of Object.entries(checks)){
  const names=Object.entries(live).filter(([,d])=>fn(d)).map(([n])=>n).sort();
  console.log(label+'\t'+names.length);
  for(const n of names) console.log(n);
}
NODE
```

## Parked lanes excluded from candidacy

These rows were rerun only as part of the full truth-covered set and are excluded from any new local-lane recommendation:

- `SG1 Double Maul Droid`
- `SG1 Double Maul Droid | misc2 Bio Spinal Enhancer`
- `SG1 Double Maul Droid | armor Hellforged Armor`
- `Ashley Build`
- `DL Reaper/Maul Orphic Bio`
- `SG1 Split Bombs T2`
- `SG1 Rift/Bombs Bio`
- `DL Dual Rift Bio`
- `DL Core/Rift Bio`

## Compact final ranking table of truth-covered residual rows

Full 64-row truth-covered set on the current accepted live file, sorted by absolute win delta:

| rank | attacker | defender | win Δ | abs win Δ | avgTurns Δ | parked? |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | `CUSTOM_CSTAFF_A4` | `SG1 Double Maul Droid` | `-6.53` | `6.53` | `-0.2016` | yes |
| 2 | `CUSTOM_CSTAFF_A4` | `Ashley Build` | `+4.95` | `4.95` | `-0.0053` | yes |
| 3 | `CUSTOM_MAUL_A4_DL_ABYSS` | `SG1 Double Maul Droid` | `-4.59` | `4.59` | `-0.0753` | yes |
| 4 | `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Double Maul Droid` | `-4.31` | `4.31` | `+0.0007` | yes |
| 5 | `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.67` | `3.67` | `-0.2407` | yes |
| 6 | `CUSTOM_CSTAFF_A4` | `DL Dual Rift Bio` | `-3.61` | `3.61` | `-0.0226` | yes |
| 7 | `CUSTOM_MAUL_A4_DL_ABYSS` | `HF Scythe Pair` | `-3.42` | `3.42` | `-0.0906` | no |
| 8 | `CUSTOM_MAUL_A4_SG1_PINK` | `DL Dual Rift Bio` | `-3.34` | `3.34` | `+0.2097` | yes |
| 9 | `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `-3.25` | `3.25` | `-0.0862` | no |
| 10 | `CUSTOM_CSTAFF_A4` | `DL Reaper/Maul Orphic Bio` | `+3.20` | `3.20` | `-0.0242` | yes |
| 11 | `CUSTOM` | `SG1 Double Maul Droid | armor Hellforged Armor` | `-3.12` | `3.12` | `+0.1626` | yes |
| 12 | `CUSTOM` | `Ashley Build` | `+3.12` | `3.12` | `+0.1077` | yes |
| 13 | `CUSTOM` | `SG1 Double Maul Droid` | `-3.09` | `3.09` | `+0.0091` | yes |
| 14 | `CUSTOM_CSTAFF_A4` | `DL Core/Rift Bio` | `-3.00` | `3.00` | `-0.0402` | yes |
| 15 | `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-2.89` | `2.89` | `-0.0998` | yes |
| 16 | `CUSTOM_CSTAFF_A4` | `DL Gun Blade Recon` | `+2.88` | `2.88` | `-0.0493` | no |
| 17 | `CUSTOM` | `DL Reaper/Maul Orphic Bio` | `+2.87` | `2.87` | `+0.0794` | yes |
| 18 | `CUSTOM` | `DL Core/Rift Bio` | `-2.75` | `2.75` | `+0.2187` | yes |
| 19 | `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Double Maul Droid | armor Hellforged Armor` | `-2.73` | `2.73` | `+0.0788` | yes |
| 20 | `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Core/Rift Dodge` | `-2.72` | `2.72` | `+0.0067` | no |

## Remaining non-parked buckets

After removing the parked rows above, only `32` truth-covered rows remain. They do not organize into another strong reusable lane.

### 1) `HF Scythe Pair`

| rows | avg abs win Δ | worst | avg abs avgTurns Δ | sign |
| ---: | ---: | ---: | ---: | --- |
| `4` | `1.83` | `3.42` | `0.0466` | `0 pos / 4 neg` |

Read:

- clean same-sign residual
- but only one exact defender shell
- zero direct matches in `data/legacy-defenders.js`
- small turn drift and prior melee-probe sensitivity suggest another shell-local problem, not an obvious reusable family

### 2) `DL Core/Rift Dodge`

| rows | avg abs win Δ | worst | avg abs avgTurns Δ | sign |
| ---: | ---: | ---: | ---: | --- |
| `4` | `1.91` | `2.72` | `0.0764` | `1 pos / 3 neg` |

Read:

- slightly larger average miss than HF
- but mixed sign already
- same `Core/Rift` weapon family as the now-parked `DL double-Bio Rift/Core` lane
- zero direct default/live reach

This is not a clean “next lane”; it already looks like a residual shell cousin of a family we failed to turn into a reusable toggle.

### 3) `DL gun-blade` leftovers

Combined:

- `DL Gun Blade Recon`
- `DL Gun Blade Bio`

| rows | avg abs win Δ | worst | avg abs avgTurns Δ | sign |
| ---: | ---: | ---: | ---: | --- |
| `8` | `1.17` | `2.88` | `0.0351` | `2 pos / 6 neg` |

Read:

- larger row count, but sign is mixed
- shell family is already fractured by misc choice
- zero direct default/live matches for the exact residual rows

### 4) `SG1 Void/Reaper`

| rows | avg abs win Δ | worst | avg abs avgTurns Δ | sign |
| ---: | ---: | ---: | ---: | --- |
| `4` | `1.23` | `2.23` | `0.1295` | `0 pos / 4 neg` |

Read:

- coherent sign
- still only one exact shell
- zero direct default/live matches

## Small enough to ignore for now

These rows still exist, but they are already weak enough that they do not justify another immediate local diagnosis pass:

| defender | rows | avg abs win Δ | default/live reach | read |
| --- | ---: | ---: | ---: | --- |
| `DL Gun Sniper Mix` | `4` | `0.65` | `4` | only remaining non-parked shell with real default reach, but already low magnitude |
| `DL Maul/Core Orphic` | `4` | `0.65` | `0` | too small and mixed to justify a lane |
| `DL Rift/Bombs Scout` | `4` | `0.64` | control | healthy-enough control row, not a target |
| `DL Gun Blade Bio` | `4` | `0.92` | `0` | already folded into the weak mixed gun-blade leftovers |

## Live/default reach note

The decisive reach fact is negative:

- every serious remaining non-parked residual shell has `0` direct matches in `data/legacy-defenders.js`
- the only remaining non-parked shell with meaningful default reach is `DL Gun Sniper Mix` with `4` matches, but its residual size is already small (`avg abs win Δ 0.65`)

So the remaining bigger misses are all curated-only or near-curated-only shells.

## Decisive recommendation

**No remaining local lane is worth immediate diagnosis.**

Why:

1. the remaining larger rows are mostly isolated exact shells, not reusable multi-defender families
2. the few multi-row leftovers that exist are already split by sign or shell structure
3. the serious remaining candidates all have zero direct default/live reach
4. the only unparked shell with live reach (`DL Gun Sniper Mix`) is already small enough to ignore
5. recent repo-side work has already exhausted the reusable local theories on the stronger families:
   - droid parked
   - reaper-first parked
   - SG1 bombs parked
   - DL double-Bio Rift/Core parked

So the accepted live file is effectively the best local repo-side state we can justify right now without new external evidence.

## Smallest next truth pack to collect

Recommended next truth pack:

- attackers:
  - `CUSTOM_CSTAFF_A4`
  - `CUSTOM`
- defenders:
  - `HF Scythe Pair`
  - `HF Scythe Pair | misc2 Scout Drones`
  - `HF Scythe Pair | armor SG1 Armor`
  - `HF Scythe Pair | weapon2 Crystal Maul`

Pack size:

- `2 x 4 = 8` rows

Purpose / exact question:

- determine whether the strongest remaining non-parked exact shell is driven mainly by:
  - the `Hellforged Armor` shell,
  - the dual-`Scythe T2` same-name melee pair,
  - or the mixed `Scout Drones + Bio Spinal Enhancer` misc shell

Why this pack and not another local diagnosis branch:

- `HF Scythe Pair` is the cleanest remaining non-parked same-sign shell
- it has already shown sensitivity as a contrast in the melee shared-hit work
- it still has zero default reach, so the next useful step is to find out whether it is another near-exact-shell problem before spending more repo-side theory time on it
- using `CUSTOM_CSTAFF_A4` and `CUSTOM` keeps the pack small while spanning the current strongest-vs-milder HF rows

If that pack shows no clean structural split, the correct follow-up is to stop local theory work entirely and keep the current live file as the standing best state.

## Explicit untouched statements

- No new truth was collected in this pass.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- `legacy-sim-v1.0.4-clean.js` was untouched.

local diagnosis exhausted; next step is truth pack HF Scythe Pair 2x4 shell probe
