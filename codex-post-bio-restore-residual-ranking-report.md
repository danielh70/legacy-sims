# codex-post-bio-restore-residual-ranking-report

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
- `codex-dl-riftcore-bio-diagnosis-report.md`
- `legacy-truth-droid-shell-probe-2x4.json`

Fixed state preserved:
- represented-build baseline stays
- accepted narrow Bio-lane gate stays restored in `legacy-sim-v1.0.4-clean.js`
- droid lane is parked and excluded from next-lane candidacy
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit

This pass used the repaired live file only:
- `./legacy-sim-v1.0.4-clean.js`

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `codex-post-bio-restore-residual-ranking-report.md` | report-only | refreshed residual triage from the repaired live file |

No JS files were edited in this pass.
No behavior-changing patch was made.
No new legacy/brute parity risk was introduced in this pass.

## Exact commands run

### Source-of-truth reads / live-file check

```sh
for f in AGENTS.md legacy-bio-debug-handoff-2026-03-15.md legacy-chat-handoff-2026-03-15-continuation.md tmp/codex-tracked-bio-lane-patch-report.md codex-droid-lane-diagnosis-report.md codex-droid-applied-damage-proof-report.md codex-droid-split-decomposition-report.md codex-droid-shared-hit-family-proof-report.md codex-droid-vs-hf-shell-diff-report.md codex-droid-truth-pack-reconciliation-report.md codex-post-droid-residual-ranking-report.md codex-dl-riftcore-bio-diagnosis-report.md; do printf '===== %s =====\n' "$f"; sed -n '1,120p' "$f"; printf '\n'; done
printf '===== %s =====\n' legacy-truth-droid-shell-probe-2x4.json
sed -n '1,120p' legacy-truth-droid-shell-probe-2x4.json

node --check ./legacy-sim-v1.0.4-clean.js
rg -n "defenderIsBioLane|__runtimeSig" ./legacy-sim-v1.0.4-clean.js
```

### Repaired-live truth compares

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-bio-restore-ranking LEGACY_REPLAY_TAG='codex-post-bio-restore-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-bio-restore-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-bio-restore-ranking LEGACY_REPLAY_TAG='codex-post-bio-restore-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-bio-restore-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-bio-restore-ranking LEGACY_REPLAY_TAG='codex-post-bio-restore-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-bio-restore-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-bio-restore-ranking LEGACY_REPLAY_TAG='codex-post-bio-restore-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-bio-restore-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-bio-restore-ranking LEGACY_REPLAY_TAG='codex-post-bio-restore-droid-probe' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-bio-restore-droid-probe.log 2>&1
```

### Result extraction / stale-vs-repaired comparison / shell grouping / default-path glance

```sh
find ./tmp/replay-post-bio-restore-ranking -maxdepth 1 -type f | sort
for f in ./tmp/codex-post-bio-restore-*.log; do printf '%s\n' "$f"; tail -n 25 "$f"; printf '\n'; done

node - <<'NODE'
const fs=require('fs');
const path=require('path');
const files=[
  './tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-custom--2026-03-16T02-31-08-642Z.json',
  './tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-cstaff--2026-03-16T02-31-08-643Z.json',
  './tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-maul-dl--2026-03-16T02-31-08-675Z.json',
  './tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-maul-sg1--2026-03-16T02-31-08-636Z.json',
  './tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-droid-shell-probe-2x4--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-droid-probe--2026-03-16T02-31-08-645Z.json',
];
const rows=[];
for (const file of files) {
  const j=JSON.parse(fs.readFileSync(file,'utf8'));
  for (const r of j.rows) rows.push({source:path.basename(file), ...r});
}
const dedup=new Map();
for (const r of rows) dedup.set(`${r.attacker}__${r.defender}`, r);
const unique=[...dedup.values()].sort((a,b)=>b.absWinPct-a.absWinPct || b.absAvgTurns-a.absAvgTurns);
console.log('TOTAL_ROWS\t'+rows.length);
console.log('UNIQUE_ROWS\t'+unique.length);
console.log('\nTOP_25_NON_DROID');
for (const r of unique.filter(r=>!r.defender.startsWith('SG1 Double Maul Droid')).slice(0,25)) {
  console.log([r.attacker,r.defender,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),r.absWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4)].join('\t'));
}
NODE

node - <<'NODE'
const fs=require('fs');
function loadRows(file){const j=JSON.parse(fs.readFileSync(file,'utf8')); const m=new Map(); for(const r of j.rows)m.set(`${r.attacker}__${r.defender}`,r); return m;}
const beforeFiles={
  CUSTOM:'./tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-post-droid-custom--2026-03-16T01-58-02-446Z.json',
  CUSTOM_CSTAFF_A4:'./tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-post-droid-cstaff--2026-03-16T01-58-02-442Z.json',
  CUSTOM_MAUL_A4_DL_ABYSS:'./tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-dl--2026-03-16T01-58-02-498Z.json',
  CUSTOM_MAUL_A4_SG1_PINK:'./tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-sg1--2026-03-16T01-58-02-499Z.json',
};
const afterFiles={
  CUSTOM:'./tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-custom--2026-03-16T02-31-08-642Z.json',
  CUSTOM_CSTAFF_A4:'./tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-cstaff--2026-03-16T02-31-08-643Z.json',
  CUSTOM_MAUL_A4_DL_ABYSS:'./tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-maul-dl--2026-03-16T02-31-08-675Z.json',
  CUSTOM_MAUL_A4_SG1_PINK:'./tmp/replay-post-bio-restore-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-post-bio-restore-maul-sg1--2026-03-16T02-31-08-636Z.json',
};
const before=new Map(), after=new Map();
for(const f of Object.values(beforeFiles)) for(const [k,r] of loadRows(f)) before.set(k,r);
for(const f of Object.values(afterFiles)) for(const [k,r] of loadRows(f)) after.set(k,r);
const rows=[];
for(const [key,a] of after){
  if (a.defender.startsWith('SG1 Double Maul Droid')) continue;
  const b=before.get(key);
  if (!b) continue;
  rows.push({attacker:a.attacker, defender:a.defender, before:b.absWinPct, after:a.absWinPct, gain:b.absWinPct-a.absWinPct});
}
rows.sort((x,y)=>y.gain-x.gain || y.before-x.before);
for(const r of rows.slice(0,15)) console.log([r.attacker,r.defender,r.before.toFixed(2),r.after.toFixed(2),r.gain.toFixed(2)].join('\t'));
NODE

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
for (const name of ['Ashley Build','DL Reaper/Maul Orphic Bio','SG1 Split Bombs T2','SG1 Rift/Bombs Bio','DL Dual Rift Bio','DL Core/Rift Bio','HF Scythe Pair','DL Core/Rift Dodge','DL Rift/Bombs Scout']) {
  const d=curated[name];
  const stats=d.stats||{};
  console.log([name,d.armor&&d.armor.name,d.weapon1&&d.weapon1.name,d.weapon2&&d.weapon2.name,d.misc1&&d.misc1.name,d.misc2&&d.misc2.name,stats.hp,stats.speed,stats.dodge,stats.accuracy].join('\t'));
}
NODE

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const defs=Object.entries(live);
const checks={
  dl_reaper_any:(d)=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&((d.weapon1&&d.weapon1.name==='Reaper Axe')||(d.weapon2&&d.weapon2.name==='Reaper Axe')),
  dl_reaper_melee_mix:(d)=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&((d.weapon1.name==='Reaper Axe'&&['Core Staff','Crystal Maul'].includes(d.weapon2.name))||(d.weapon2.name==='Reaper Axe'&&['Core Staff','Crystal Maul'].includes(d.weapon1.name))),
  sg1_bombs_any:(d)=>d&&d.armor&&d.armor.name==='SG1 Armor'&&((d.weapon1&&d.weapon1.name==='Split Crystal Bombs T2')||(d.weapon2&&d.weapon2.name==='Split Crystal Bombs T2')),
  dl_riftcore_bio_exact:(d)=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&['Rift Gun','Core Staff'].includes(d.weapon1.name)&&['Rift Gun','Core Staff'].includes(d.weapon2.name)&&d.misc1&&d.misc2&&d.misc1.name==='Bio Spinal Enhancer'&&d.misc2.name==='Bio Spinal Enhancer',
};
for(const [label,fn] of Object.entries(checks)){
  const names=defs.filter(([,d])=>fn(d)).map(([n])=>n).sort();
  console.log(label+'\t'+names.length);
  for(const n of names) console.log(n);
}
NODE
```

## Droid status

- `SG1 Double Maul Droid`
- `SG1 Double Maul Droid | misc2 Bio Spinal Enhancer`
- `SG1 Double Maul Droid | armor Hellforged Armor`

These rows were rerun only for completeness.
They remain parked and were excluded from next-lane candidacy.

## Ranking table: repaired live file

Top remaining non-droid truth-covered residual rows by absolute win delta:

| Rank | Attacker | Defender | Win Δ | AvgTurns Δ |
| --- | --- | --- | ---: | ---: |
| 1 | `CUSTOM_CSTAFF_A4` | `Ashley Build` | `+4.60` | `-0.0079` |
| 2 | `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `-3.64` | `-0.0849` |
| 3 | `CUSTOM_MAUL_A4_DL_ABYSS` | `HF Scythe Pair` | `-3.50` | `-0.0665` |
| 4 | `CUSTOM_CSTAFF_A4` | `DL Reaper/Maul Orphic Bio` | `+3.45` | `-0.0533` |
| 5 | `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.44` | `-0.2239` |
| 6 | `CUSTOM_MAUL_A4_SG1_PINK` | `DL Dual Rift Bio` | `-3.27` | `+0.2046` |
| 7 | `CUSTOM` | `DL Reaper/Maul Orphic Bio` | `+3.15` | `+0.0441` |
| 8 | `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-3.11` | `-0.1024` |
| 9 | `CUSTOM_CSTAFF_A4` | `DL Dual Rift Bio` | `-3.08` | `+0.0077` |
| 10 | `CUSTOM_CSTAFF_A4` | `DL Core/Rift Bio` | `-3.02` | `-0.0096` |
| 11 | `CUSTOM` | `SG1 Split Bombs T2` | `+2.90` | `-0.2192` |
| 12 | `CUSTOM_CSTAFF_A4` | `DL Gun Blade Recon` | `+2.88` | `-0.0661` |
| 13 | `CUSTOM` | `Ashley Build` | `+2.71` | `+0.0688` |
| 14 | `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Dual Rift Bio` | `-2.68` | `+0.1341` |
| 15 | `CUSTOM_MAUL_A4_DL_ABYSS` | `Ashley Build` | `+2.65` | `+0.0109` |
| 16 | `CUSTOM_MAUL_A4_SG1_PINK` | `Ashley Build` | `+2.64` | `+0.0685` |

All-defender aggregate view across the four main attackers:

| Defender | Rows | Avg abs win Δ | Worst win Δ | Avg abs avgTurns Δ | Sign pattern |
| --- | ---: | ---: | ---: | ---: | --- |
| `Ashley Build` | 4 | `3.15` | `4.60` | `0.0390` | `4 pos / 0 neg` |
| `SG1 Split Bombs T2` | 4 | `2.57` | `3.44` | `0.2776` | `3 pos / 1 neg` |
| `DL Reaper/Maul Orphic Bio` | 4 | `2.46` | `3.45` | `0.0484` | `4 pos / 0 neg` |
| `SG1 Rift/Bombs Bio` | 4 | `2.31` | `3.11` | `0.1216` | `3 pos / 1 neg` |
| `DL Dual Rift Bio` | 4 | `2.27` | `3.27` | `0.1975` | `0 pos / 4 neg` |
| `HF Scythe Pair` | 4 | `2.06` | `3.64` | `0.0450` | `0 pos / 4 neg` |
| `DL Core/Rift Bio` | 4 | `1.92` | `3.02` | `0.1271` | `0 pos / 4 neg` |
| `DL Core/Rift Dodge` | 4 | `1.66` | `2.46` | `0.0712` | `1 pos / 3 neg` |
| `DL Gun Blade Recon` | 4 | `1.57` | `2.88` | `0.0305` | `1 pos / 3 neg` |
| `SG1 Void/Reaper` | 4 | `1.20` | `2.47` | `0.1325` | `0 pos / 4 neg` |
| `DL Gun Blade Bio` | 4 | `1.09` | `2.33` | `0.0348` | `2 pos / 2 neg` |
| `DL Maul/Core Orphic` | 4 | `0.94` | `2.08` | `0.0788` | `3 pos / 1 neg` |
| `DL Gun Sniper Mix` | 4 | `0.66` | `1.50` | `0.0622` | `4 pos / 0 neg` |
| `DL Rift/Bombs Scout` | 4 | `0.51` | `1.31` | `0.0768` | `3 pos / 1 neg` |

## What the restored Bio gate changed

Earlier residual rankings from the drifted workspace state are stale.
The restored accepted Bio gate materially reduced the old `DL double-Bio Rift/Core` lane:

| Defender | Pre-restore avg abs win Δ | Repaired avg abs win Δ | Net drop |
| --- | ---: | ---: | ---: |
| `DL Dual Rift Bio` | `4.35` | `2.27` | `-2.08` |
| `DL Core/Rift Bio` | `3.91` | `1.92` | `-2.00` |

Per-row improvement on the eight repaired `DL Dual Rift Bio / DL Core/Rift Bio` rows:
- win-delta improvement range: `+0.77` to `+2.85`
- the largest repaired rows were:
  - `CUSTOM_CSTAFF_A4 | DL Dual Rift Bio`: `5.93 -> 3.08`
  - `CUSTOM_CSTAFF_A4 | DL Core/Rift Bio`: `5.79 -> 3.02`
  - `CUSTOM_MAUL_A4_SG1_PINK | DL Dual Rift Bio`: `5.74 -> 3.27`

Practical read:
- that lane is still coherent
- but it is no longer the clear first target after the repair

## Remaining non-droid buckets

### 1) `DL Reaper-first mixed-melee` cluster

Rows:
- `Ashley Build`
- `DL Reaper/Maul Orphic Bio`

Shared shell structure:
- `Dark Legion Armor`
- `Reaper Axe` present as lead melee weapon
- second weapon is another melee weapon (`Core Staff` or `Crystal Maul`)
- no ranged `Rift/Core Bio` shell overlap

Residual shape:
- `8/8` rows are positive win delta
- average mismatch is the largest reusable non-droid cluster: `2.80`
- avgTurns drift is small (`0.0437`), so this does **not** look like the repaired long-fight Bio mitigation lane

### 2) `SG1 bombs / bombs+rft` cluster

Rows:
- `SG1 Split Bombs T2`
- `SG1 Rift/Bombs Bio`

Shared shell structure:
- `SG1 Armor`
- `Split Crystal Bombs T2` present
- one row is bombs/bombs, the other is rift/bombs + `Bio`

Residual shape:
- `8` rows total
- average absolute win delta `2.44`
- larger avgTurns signal (`0.1996`)
- sign is mixed (`6 pos / 2 neg`), especially on `CUSTOM_CSTAFF_A4`

### 3) Repaired `DL double-Bio Rift/Core` cluster

Rows:
- `DL Dual Rift Bio`
- `DL Core/Rift Bio`

Shared shell structure:
- `Dark Legion Armor`
- `Rift Gun` / `Core Staff`
- `Bio Spinal Enhancer` + `Bio Spinal Enhancer`

Residual shape after repair:
- `8/8` rows still negative win delta
- fights still tend to run long
- but average absolute win delta is now down to `2.09`
- no longer the clear top target

### 4) Single-row / weaker tails

Rows:
- `HF Scythe Pair` remains large but is only one curated shell
- `DL Core/Rift Dodge` and `DL Gun Blade Recon` remain moderate but weaker than the main clusters

## Rows small enough to ignore for now

Best candidates to de-prioritize unless a later lane naturally absorbs them:
- `DL Rift/Bombs Scout`
- `DL Gun Sniper Mix`
- `DL Maul/Core Orphic`
- `DL Gun Blade Bio`

Why:
- lower average absolute win deltas (`0.51` to `1.09`)
- no clean shared signal stronger than the larger clusters
- not worth a dedicated pass before the bigger reusable buckets

## Single best next diagnosis lane

Best next lane:
- `Ashley Build` + `DL Reaper/Maul Orphic Bio`

Why this lane beats the alternatives:
1. It is the largest remaining reusable non-droid cluster by average mismatch: `2.80` over `8` rows.
2. The sign is perfectly coherent: `8/8` rows are positive win delta, unlike the mixed-sign SG1 bombs family.
3. It is no longer outranked by the repaired `DL double-Bio Rift/Core` lane, which dropped sharply after the Bio-gate restore.
4. It has more reuse potential than `HF Scythe Pair`, which is still large but only a single defender row.
5. Its weak avgTurns drift suggests a different mechanism from the already-repaired long-fight Bio lane, so it is less likely to just reopen old theory.

Best working hypothesis for that lane:
- `Dark Legion Armor` reaper-first mixed-melee defender throughput / resolution
- not the repaired Bio mitigation lane
- not the parked droid lane

## Default-defender sanity note

Compact `data/legacy-defenders.js` reach check:
- exact/broad `DL double-Bio Rift/Core` family: `0`
- exact `Dark Legion Armor + Reaper Axe + (Core Staff or Crystal Maul)` family: `0`
- exact `SG1 bombs` family: `1` (`SG1 Split Bombs T2`)

Read:
- the chosen `Ashley / Orphic` lane has no direct default-file reach either
- that is a risk note, not a blocker
- if a later patch is proposed for that lane, it should still clear a broad collateral sanity pass before landing

## Explicit statements

- no new truth was collected
- `brute-sim-v1.4.6.js` was untouched
- cleanup was untouched
- droid remained parked and excluded from next-lane candidacy

next lane is Ashley Build + DL Reaper/Maul Orphic Bio
