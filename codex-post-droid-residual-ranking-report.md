# codex-post-droid-residual-ranking-report

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
- `legacy-truth-droid-shell-probe-2x4.json`

Fixed state preserved:
- represented-build fix stays
- tracked narrow Bio-lane mitigation patch stays in `legacy-sim-v1.0.4-clean.js`
- droid lane is parked and excluded from next-lane candidacy

This pass used the current accepted live file only:
- `./legacy-sim-v1.0.4-clean.js`

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `codex-post-droid-residual-ranking-report.md` | report-only | self-contained ranking / triage report |

No JS files were edited.
No behavior-changing patch was made.
No legacy/brute parity risk was introduced in this pass.

## Exact commands run

### Source-of-truth reads

```sh
for f in AGENTS.md legacy-bio-debug-handoff-2026-03-15.md legacy-chat-handoff-2026-03-15-continuation.md codex-droid-lane-diagnosis-report.md codex-droid-applied-damage-proof-report.md codex-droid-split-decomposition-report.md codex-droid-shared-hit-family-proof-report.md codex-droid-vs-hf-shell-diff-report.md codex-droid-truth-pack-reconciliation-report.md legacy-truth-droid-shell-probe-2x4.json; do printf '===== %s =====\n' "$f"; sed -n '1,220p' "$f"; printf '\n'; done
if [ -f codex-tracked-bio-lane-patch-report.md ]; then printf '===== %s =====\n' codex-tracked-bio-lane-patch-report.md; sed -n '1,220p' codex-tracked-bio-lane-patch-report.md; elif [ -f tmp/codex-tracked-bio-lane-patch-report.md ]; then printf '===== %s =====\n' tmp/codex-tracked-bio-lane-patch-report.md; sed -n '1,220p' tmp/codex-tracked-bio-lane-patch-report.md; else echo '__MISSING__ codex-tracked-bio-lane-patch-report.md'; fi
```

### Live-file truth compares

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-droid-ranking LEGACY_REPLAY_TAG='codex-post-droid-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-droid-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-droid-ranking LEGACY_REPLAY_TAG='codex-post-droid-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-droid-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-droid-ranking LEGACY_REPLAY_TAG='codex-post-droid-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-droid-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-droid-ranking LEGACY_REPLAY_TAG='codex-post-droid-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-droid-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-post-droid-ranking LEGACY_REPLAY_TAG='codex-post-droid-droid-probe' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,SG1 Double Maul Droid | misc2 Bio Spinal Enhancer,SG1 Double Maul Droid | armor Hellforged Armor,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-droid-shell-probe-2x4.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-post-droid-droid-probe.log 2>&1
```

### Result extraction / grouping / default-path glance

```sh
find ./tmp/replay-post-droid-ranking -maxdepth 1 -type f | sort
for f in ./tmp/codex-post-droid-*.log; do printf '%s\n' "$f"; tail -n 35 "$f"; printf '\n'; done

node - <<'NODE'
const fs=require('fs');
const path=require('path');
const files=[
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-post-droid-custom--2026-03-16T01-58-02-446Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-post-droid-cstaff--2026-03-16T01-58-02-442Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-dl--2026-03-16T01-58-02-498Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-sg1--2026-03-16T01-58-02-499Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-droid-shell-probe-2x4--legacy-sim-v1.0.4-clean--none--codex-post-droid-droid-probe--2026-03-16T01-58-02-443Z.json',
];
const rows=[];
for (const file of files) {
  const j=JSON.parse(fs.readFileSync(file,'utf8'));
  for (const r of j.rows) rows.push({source:path.basename(file), ...r});
}
const dedup=new Map();
for (const r of rows) {
  const key=`${r.attacker}__${r.defender}`;
  if (!dedup.has(key)) dedup.set(key,r);
}
const unique=[...dedup.values()].sort((a,b)=>b.absWinPct-a.absWinPct || b.absAvgTurns-a.absAvgTurns);
console.log('total_rows', rows.length, 'unique_rows', unique.length);
console.log('\nTOP 25 UNIQUE');
for (const r of unique.slice(0,25)) {
  console.log([r.attacker,r.defender,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),r.absWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4),r.source].join('\t'));
}
const parked=(r)=>r.defender.startsWith('SG1 Double Maul Droid');
const non=unique.filter(r=>!parked(r));
console.log('\nTOP 20 NON-DROID');
for (const r of non.slice(0,20)) {
  console.log([r.attacker,r.defender,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),r.absWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4)].join('\t'));
}
const byDef=new Map();
for (const r of non) {
  const cur=byDef.get(r.defender)||{n:0,sum:0,max:0,rows:[]};
  cur.n++; cur.sum+=r.absWinPct; cur.max=Math.max(cur.max,r.absWinPct); cur.rows.push(r);
  byDef.set(r.defender,cur);
}
const defs=[...byDef.entries()].map(([def,v])=>({def,n:v.n,avg:v.sum/v.n,max:v.max,signs:v.rows.map(r=>`${r.attacker}:${r.dWinPct>=0?'+':''}${r.dWinPct.toFixed(2)}`).join(' | ')})).sort((a,b)=>b.avg-a.avg || b.max-a.max);
console.log('\nBY DEFENDER NON-DROID');
for (const d of defs.slice(0,15)) console.log([d.def,d.n,d.avg.toFixed(2),d.max.toFixed(2),d.signs].join('\t'));
NODE

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
const names=['Ashley Build','HF Scythe Pair','SG1 Split Bombs T2','DL Reaper/Maul Orphic Bio','DL Dual Rift Bio','DL Core/Rift Bio','SG1 Rift/Bombs Bio','DL Core/Rift Dodge','DL Gun Blade Recon','DL Gun Blade Bio'];
for (const name of names) {
  const d=curated[name];
  if (!d) { console.log('MISSING\t'+name); continue; }
  const stats=d.stats||{};
  console.log([name,d.armor&&d.armor.name,d.weapon1&&d.weapon1.name,d.weapon2&&d.weapon2.name,d.misc1&&d.misc1.name,d.misc2&&d.misc2.name,stats.hp,stats.level,stats.speed,stats.dodge,stats.accuracy].join('\t'));
}
NODE

node - <<'NODE'
const fs=require('fs');
const files=[
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-post-droid-custom--2026-03-16T01-58-02-446Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-post-droid-cstaff--2026-03-16T01-58-02-442Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-dl--2026-03-16T01-58-02-498Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-post-droid-maul-sg1--2026-03-16T01-58-02-499Z.json',
  './tmp/replay-post-droid-ranking/legacy-replay--legacy-truth-droid-shell-probe-2x4--legacy-sim-v1.0.4-clean--none--codex-post-droid-droid-probe--2026-03-16T01-58-02-443Z.json',
];
const rows=[];
for (const f of files) rows.push(...JSON.parse(fs.readFileSync(f,'utf8')).rows);
const seen=new Set();
const unique=[];
for (const r of rows) { const k=r.attacker+'__'+r.defender; if (seen.has(k)) continue; seen.add(k); unique.push(r); }
const targets=['DL Dual Rift Bio','DL Core/Rift Bio','Ashley Build','HF Scythe Pair','SG1 Split Bombs T2','DL Reaper/Maul Orphic Bio','SG1 Rift/Bombs Bio'];
for (const def of targets) {
  console.log('\n'+def);
  for (const r of unique.filter(r=>r.defender===def).sort((a,b)=>a.attacker.localeCompare(b.attacker))) {
    console.log([r.attacker,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4),r.truth.winPct.toFixed(2)+'->'+r.sim.winPct.toFixed(2),r.truth.avgTurns.toFixed(4)+'->'+r.sim.avgTurns.toFixed(4)].join('\t'));
  }
}
NODE

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
const broad=Object.entries(live).filter(([,d])=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&isRiftCoreWeapon(d.weapon1.name)&&isRiftCoreWeapon(d.weapon2.name)&&d.misc1&&d.misc2&&((d.misc1.name==='Bio Spinal Enhancer')||(d.misc2.name==='Bio Spinal Enhancer'))).map(([n,d])=>({name:n,w1:d.weapon1.name,w2:d.weapon2.name,m1:d.misc1.name,m2:d.misc2.name,hp:d.stats&&d.stats.hp,dodge:d.stats&&d.stats.dodge})).sort((a,b)=>a.name.localeCompare(b.name));
console.log('broad_bio_riftcore_count\t'+broad.length);
for (const r of broad) console.log([r.name,r.w1,r.w2,r.m1,r.m2,r.hp,r.dodge].join('\t'));
NODE

node --check ./legacy-sim-v1.0.4-clean.js
```

## Ranking basis

- deduped by unique matchup key: `attacker + defender`
- total truth-covered unique matchups: `64`
- parked droid-related unique matchups: `8`
- ranked non-droid matchups considered for next-lane triage: `56`

Clear note:
- `SG1 Double Maul Droid` exact row and the two shell-probe variants remain visible in raw data
- they are **parked** and **excluded from next-lane candidacy**

Parked droid completeness snapshot:
- `CUSTOM_CSTAFF_A4 | SG1 Double Maul Droid`: `-6.71`
- `CUSTOM_MAUL_A4_DL_ABYSS | SG1 Double Maul Droid`: `-4.58`
- `CUSTOM_MAUL_A4_SG1_PINK | SG1 Double Maul Droid`: `-4.57`
- `CUSTOM | SG1 Double Maul Droid`: `-3.23`
- shell-probe variant rows: `-2.03` to `-2.95`

## Compact ranking table: remaining non-droid residual rows

Top non-droid unique rows by absolute win delta:

| Rank | Attacker | Defender | Win Δ | Abs win Δ | AvgTurns Δ |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | `CUSTOM_CSTAFF_A4` | `DL Dual Rift Bio` | `-5.93` | `5.93` | `+0.1822` |
| 2 | `CUSTOM_CSTAFF_A4` | `DL Core/Rift Bio` | `-5.79` | `5.79` | `+0.1819` |
| 3 | `CUSTOM_MAUL_A4_SG1_PINK` | `DL Dual Rift Bio` | `-5.74` | `5.74` | `+0.3424` |
| 4 | `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Dual Rift Bio` | `-4.80` | `4.80` | `+0.2458` |
| 5 | `CUSTOM_CSTAFF_A4` | `Ashley Build` | `+4.60` | `4.60` | `-0.0079` |
| 6 | `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Core/Rift Bio` | `-3.85` | `3.85` | `+0.2325` |
| 7 | `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `-3.64` | `3.64` | `-0.0849` |
| 8 | `CUSTOM_MAUL_A4_DL_ABYSS` | `HF Scythe Pair` | `-3.50` | `3.50` | `-0.0665` |
| 9 | `CUSTOM_CSTAFF_A4` | `DL Reaper/Maul Orphic Bio` | `+3.45` | `3.45` | `-0.0533` |
| 10 | `CUSTOM_MAUL_A4_SG1_PINK` | `SG1 Split Bombs T2` | `+3.44` | `3.44` | `-0.2239` |
| 11 | `CUSTOM` | `DL Reaper/Maul Orphic Bio` | `+3.15` | `3.15` | `+0.0441` |
| 12 | `CUSTOM_CSTAFF_A4` | `SG1 Rift/Bombs Bio` | `-3.11` | `3.11` | `-0.1024` |
| 13 | `CUSTOM_MAUL_A4_SG1_PINK` | `DL Core/Rift Bio` | `-3.02` | `3.02` | `+0.2995` |
| 14 | `CUSTOM` | `DL Core/Rift Bio` | `-2.99` | `2.99` | `+0.2688` |
| 15 | `CUSTOM` | `SG1 Split Bombs T2` | `+2.90` | `2.90` | `-0.2192` |

Most important read:
- once droid is removed, the biggest remaining rows are still the two `Dark Legion Armor + double Bio + Rift/Core` defenders
- nothing else matches that combination of magnitude, repeat count, and error consistency

## Non-droid buckets

| Bucket | Rows | Structural read | Pattern |
| --- | --- | --- | --- |
| `Residual DL double-Bio Rift/Core lane` | `DL Dual Rift Bio`, `DL Core/Rift Bio` | `Dark Legion Armor`; `Rift Gun/Rift Gun` or `Core Staff/Rift Gun`; `Bio/Bio` | strongest non-droid cluster; all `8/8` rows negative win Δ; all `8/8` rows positive avgTurns Δ |
| `Low-HP DL hybrid lane` | `Ashley Build`, `DL Reaper/Maul Orphic Bio` | lower-HP `Dark Legion Armor` hybrids; mixed weapon types; non-Bio or mixed misc shells | consistently positive win Δ; weaker structural unity than the Bio Rift/Core lane |
| `SG1 bombs/rift lane` | `SG1 Split Bombs T2`, `SG1 Rift/Bombs Bio` | `SG1 Armor`; bomb/rift projectile shells | useful secondary family, but sign flips on `CUSTOM_CSTAFF_A4` and turn-shape is less uniform |
| `HF dual-scythe lane` | `HF Scythe Pair` | `Hellforged Armor`; dual `Scythe T2`; `Scout/Bio` | only `2` materially large rows; `CUSTOM` and `CUSTOM_MAUL_A4_SG1_PINK` are already small |
| `Low-priority / control-ish` | `DL Rift/Bombs Scout`, `DL Gun Sniper Mix` | scout / gun-control shells | already small enough to ignore for now |

## Which rows are likely small enough to ignore for now

Defender families that are already low priority:

| Defender | Avg abs win Δ | Max abs win Δ | Triage call |
| --- | ---: | ---: | --- |
| `DL Rift/Bombs Scout` | `0.51` | `1.31` | ignore for now |
| `DL Gun Sniper Mix` | `0.66` | `1.50` | ignore for now |

Single rows that are already small enough even inside larger families:
- `CUSTOM_MAUL_A4_SG1_PINK | HF Scythe Pair`: `-0.11`
- `CUSTOM | HF Scythe Pair`: `-0.96`
- `CUSTOM_MAUL_A4_SG1_PINK | DL Rift/Bombs Scout`: `-0.02`
- `CUSTOM_CSTAFF_A4 | DL Rift/Bombs Scout`: `+0.20`

Borderline but not next:
- `DL Maul/Core Orphic` stays mostly small, but `CUSTOM_CSTAFF_A4` still sits at `+2.08`, so it is not a true “ignore everything” row
- `DL Gun Blade Bio`, `DL Gun Blade Recon`, and `SG1 Void/Reaper` have some individual misses, but they are smaller and less coherent than the leading buckets

## Single best next diagnosis lane

Best next lane:
- `Residual Dark Legion double-Bio Rift/Core lane`

Meaning:
- `DL Dual Rift Bio`
- `DL Core/Rift Bio`

Why this lane is better than the alternatives:
- it contains the **largest remaining non-droid residuals**
- it covers **two defenders x four attackers = eight truth-covered rows**
- all eight rows move in the **same direction**: sim win rate too low
- all eight rows share the same **avgTurns direction**: sim fights run too long
- the structural family is tight:
  - `Dark Legion Armor`
  - `Rift/Core` weapon pair
  - `Bio/Bio` misc pair
- alternatives are weaker:
  - `Ashley Build` is only one row family
  - `HF Scythe Pair` has only two materially bad rows
  - `SG1 Split Bombs T2` / `SG1 Rift/Bombs Bio` has sign disagreement on `CUSTOM_CSTAFF_A4`

Most likely implication:
- the next diagnosis should target the **residual post-Bio-patch Rift/Core + Bio/Bio lane**, not broad Bio logic again
- that is a narrower, mechanically cleaner follow-up than chasing Ashley/HF/SG1 separately

## Default-defender sanity note

Compact glance on `data/legacy-defenders.js` for the chosen next lane:

| Predicate on default defender file | Matches |
| --- | ---: |
| exact `Dark Legion Armor + (Rift/Rift or Core/Rift) + Bio/Bio` | `0` |
| broader `Dark Legion Armor + dual Rift/Core weapons + at least one Bio` | `0` |

Read:
- on the current default defender file path, this lane has **no direct live-file reach**
- that is a caution, not a blocker:
  - it still remains the highest-payoff truth-covered diagnosis lane
  - but any eventual fix would need extra care to justify broader reuse

For comparison only:
- `SG1 Split Bombs T2` does have `1` exact default-file row, but its truth pattern is smaller and less coherent than the chosen DL double-Bio Rift/Core lane

## Explicit untouched statements

- no new truth was collected
- `brute-sim-v1.4.6.js` was untouched
- cleanup was untouched
- no parked droid-shell policy idea was reopened
- no behavior patch was tested or landed in this pass

next lane is residual Dark Legion double-Bio Rift/Core lane
