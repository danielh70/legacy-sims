# codex-reaper-first-mixed-melee-diagnosis-report

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
- `codex-post-bio-restore-residual-ranking-report.md`

Fixed state preserved:
- represented-build baseline stays
- accepted narrow Bio-lane gate stays restored in `legacy-sim-v1.0.4-clean.js`
- droid lane stays parked
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit

This pass used the current accepted live file only:
- `./legacy-sim-v1.0.4-clean.js`

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `codex-reaper-first-mixed-melee-diagnosis-report.md` | report-only | self-contained diagnosis / proof report |

No simulator JS files were edited.
No instrumentation JS files were created.
No behavior-changing patch was made.

## Exact commands run

### Source-of-truth reads / live-file check

```sh
for f in AGENTS.md legacy-bio-debug-handoff-2026-03-15.md legacy-chat-handoff-2026-03-15-continuation.md tmp/codex-tracked-bio-lane-patch-report.md codex-droid-lane-diagnosis-report.md codex-droid-applied-damage-proof-report.md codex-droid-split-decomposition-report.md codex-droid-shared-hit-family-proof-report.md codex-droid-vs-hf-shell-diff-report.md codex-droid-truth-pack-reconciliation-report.md codex-post-droid-residual-ranking-report.md codex-dl-riftcore-bio-diagnosis-report.md codex-post-bio-restore-residual-ranking-report.md; do printf '===== %s =====\n' "$f"; sed -n '1,140p' "$f"; printf '\n'; done

node --check ./legacy-sim-v1.0.4-clean.js
rg -n "Reaper Axe|reaper|attemptWeapon\\(|doAction\\(|makePreActionState|sharedHit|sharedSkill|stopOnKill|per_weapon|armorApply" ./legacy-sim-v1.0.4-clean.js ./data/legacy-defs.js ./data/legacy-defenders-meta-v4-curated.js
```

### Code-path / shell inspection

```sh
sed -n '90,140p' ./data/legacy-defs.js
sed -n '4098,4465p' ./legacy-sim-v1.0.4-clean.js
sed -n '4465,4565p' ./legacy-sim-v1.0.4-clean.js

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
for (const name of ['Ashley Build','DL Reaper/Maul Orphic Bio','DL Rift/Bombs Scout','DL Dual Rift Bio','SG1 Split Bombs T2']) {
  const d=curated[name];
  console.log('NAME\t'+name);
  for (const k of ['armor','weapon1','weapon2','misc1','misc2']) console.log(k+'\t'+JSON.stringify(d[k]||null));
  console.log('stats\t'+JSON.stringify(d.stats||null));
}
NODE
```

### Targeted compact compares

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-mixed-melee LEGACY_REPLAY_TAG='codex-reaper-first-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-mixed-melee LEGACY_REPLAY_TAG='codex-reaper-first-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-mixed-melee LEGACY_REPLAY_TAG='codex-reaper-first-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-mixed-melee LEGACY_REPLAY_TAG='codex-reaper-first-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-maul-sg1.log 2>&1
```

### Curated deterministic diag snapshot

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG=1 LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=1000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-reaper-first-mixed-melee-curated.json LEGACY_DEFENDER_FILE=./data/legacy-defenders-meta-v4-curated.js LEGACY_VERIFY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-mixed-melee-curated.log 2>&1
```

### Deterministic debug traces

```sh
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-debug LEGACY_REPLAY_TAG='codex-reaper-first-debug-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|Ashley Build,CUSTOM|DL Reaper/Maul Orphic Bio,CUSTOM|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=220 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-debug-custom.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-debug LEGACY_REPLAY_TAG='codex-reaper-first-debug-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_CSTAFF_A4|Ashley Build,CUSTOM_CSTAFF_A4|DL Reaper/Maul Orphic Bio,CUSTOM_CSTAFF_A4|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=8 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=220 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-debug-cstaff.log 2>&1
```

### Narrow built-in proof toggles

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-w2gate-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-w2gate-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-w2gate-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-w2gate-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-w2gate-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-w2gate-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-w2gate-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-w2gate-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-split-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-split-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-split-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-split-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-split-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-split-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-proof LEGACY_REPLAY_TAG='codex-reaper-first-split-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-reaper-first-split-maul-sg1.log 2>&1
```

### Result extraction / default-path reach glance

```sh
find ./tmp/replay-reaper-first-mixed-melee -maxdepth 1 -type f | sort
find ./tmp/replay-reaper-first-proof -maxdepth 1 -type f | sort
for f in ./tmp/codex-reaper-first-*.log; do printf '%s\n' "$f"; tail -n 35 "$f"; printf '\n'; done

node - <<'NODE'
const fs=require('fs');
const files=fs.readdirSync('./tmp/replay-reaper-first-mixed-melee').filter(f=>f.endsWith('.json')).map(f=>'./tmp/replay-reaper-first-mixed-melee/'+f).sort();
const rows=[]; for(const f of files) rows.push(...JSON.parse(fs.readFileSync(f,'utf8')).rows);
rows.sort((a,b)=>a.defender.localeCompare(b.defender)||a.attacker.localeCompare(b.attacker));
for (const r of rows) console.log([r.defender,r.attacker,(r.dWinPct>=0?'+':'')+r.dWinPct.toFixed(2),(r.dAvgTurns>=0?'+':'')+r.dAvgTurns.toFixed(4),`truth=${r.truth.winPct.toFixed(2)}`,`sim=${r.sim.winPct.toFixed(2)}`].join('\t'));
NODE

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const defs=Object.entries(live);
const checks={
  dl_reaper_any:(d)=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&((d.weapon1&&d.weapon1.name==='Reaper Axe')||(d.weapon2&&d.weapon2.name==='Reaper Axe')),
  dl_reaper_melee_mix:(d)=>d&&d.armor&&d.armor.name==='Dark Legion Armor'&&d.weapon1&&d.weapon2&&((d.weapon1.name==='Reaper Axe'&&['Core Staff','Crystal Maul'].includes(d.weapon2.name))||(d.weapon2.name==='Reaper Axe'&&['Core Staff','Crystal Maul'].includes(d.weapon1.name))),
};
for(const [label,fn] of Object.entries(checks)){
  const names=defs.filter(([,d])=>fn(d)).map(([n])=>n).sort();
  console.log(label+'\t'+names.length);
  for(const n of names) console.log(n);
}
NODE
```

## Compact 8-row target table

| Attacker | Defender | Win Δ | AvgTurns Δ |
| --- | --- | ---: | ---: |
| `CUSTOM` | `Ashley Build` | `+2.71` | `+0.0688` |
| `CUSTOM` | `DL Reaper/Maul Orphic Bio` | `+3.15` | `+0.0441` |
| `CUSTOM_CSTAFF_A4` | `Ashley Build` | `+4.60` | `-0.0079` |
| `CUSTOM_CSTAFF_A4` | `DL Reaper/Maul Orphic Bio` | `+3.45` | `-0.0533` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `Ashley Build` | `+2.65` | `+0.0109` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Reaper/Maul Orphic Bio` | `+0.63` | `-0.0127` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `Ashley Build` | `+2.64` | `+0.0685` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Reaper/Maul Orphic Bio` | `+2.61` | `+0.0835` |

Shared read:
- `8/8` rows are positive win delta
- avgTurns drift stays small in both directions
- the biggest row is `CUSTOM_CSTAFF_A4 | Ashley Build`

## Compact shell-signature comparison

Compiled deterministic snapshot from the live file:

| Defender | Effective shell | Weapon 1 | Weapon 2 | Shared structure |
| --- | --- | --- | --- | --- |
| `Ashley Build` | `HP 600` `Spd 329` `Acc 220` `Dod 184` `Def 706` `Mel 793` `Arm 83` | `Reaper Axe` `melee` `125-160 -> 102-130` | `Core Staff` `melee` `62-75 -> 51-61` | `Dark Legion Armor` + reaper-first dual-melee |
| `DL Reaper/Maul Orphic Bio` | `HP 650` `Spd 242` `Acc 193` `Dod 165` `Def 678` `Mel 780` `Arm 83` | `Reaper Axe` `melee` `105-134 -> 86-109` | `Crystal Maul` `melee` `133-147 -> 108-120` | `Dark Legion Armor` + reaper-first dual-melee |

What is shared:
- `Dark Legion Armor`
- `Reaper Axe` in `w1`
- both weapons use `meleeSkill`
- same hit path: `accuracy vs dodge`
- same skill path: `meleeSkill vs defSkill`
- same `per_weapon` armor path

What differs:
- Ashley is much faster and more accurate, with lower HP
- Orphic has more HP and a much heavier `w2`
- misc shell is different (`Scout/Scout` vs `Orphic/Bio`)

## First concrete shared divergence found

The first clean shared divergence is **not**:
- turn order
- action selection
- hit rate
- compile/runtime stat mismatch

Evidence:
- deterministic curated snapshot shows both targets already go first as defenders, matching the lane shape rather than exposing a turn-order flip
- compare rows show defender `D_hit` is flat or slightly **higher** than truth on the big target rows
- no special Reaper-only combat branch exists outside the normal `attemptWeapon(...) -> doAction(...)` path

The first shared divergence that remains visible is:
- **defender-side post-success realized damage throughput**
- specifically in the two-weapon melee action path after hit/skill have already succeeded

Why:
1. On the target rows, attacker win is too high while defender damage-per-fight is consistently low versus truth.
2. The miss is much larger on defender throughput than on hit rates.
3. Example high-signal rows:
   - `CUSTOM_CSTAFF_A4 | Ashley Build`
     - `D_hit 69 -> 70`
     - `D_dmg1 48 -> 47`
     - `D_dmg2 48 -> 47`
     - `D_damagePerFight 670.4 -> 604.9`
   - `CUSTOM | DL Reaper/Maul Orphic Bio`
     - `D_hit 74 -> 75`
     - `D_dmg1 43 -> 43`
     - `D_dmg2 43 -> 43`
     - `D_damagePerFight 567.7 -> 525.2`
4. That pattern means hit is not the isolating failure; the loss shows up after successful defender contact.

So the strongest concrete location is:
- `doAction(...)`
- defender-side two-weapon melee realized-damage sequencing / accounting
- secondarily the `attemptWeapon(...) -> doAction(...)` handoff for defender melee shells

## Deterministic trace read

One compact deterministic trace snippet from `CUSTOM_CSTAFF_A4 | Ashley Build`:

```text
T15 D->A | w1(h=true,s=true,raw=151,d=120,app=38) w2(h=true,s=true,raw=69,d=55,app=0) => raw=175 app=38 targetHP=38
```

What this proves:
- defender `w2` can be fully lost to target-HP cap after a heavy `w1`
- the live code is definitely spending a meaningful amount of damage inside the two-weapon applied-damage stage

What it does **not** prove by itself:
- that this exact `w2-on-dead` event is the whole lane

## Narrow proof results

### `LEGACY_DIAG_W2_AFTER_APPLIED_W1=defender`

Result:
- mostly inert / mixed
- helps some Orphic rows a little
- worsens Ashley rows and some contrasts

Read:
- simple `w2 after lethal w1` gating is **not** the shared cause

### `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION=defender`

Result:
- only meaningful live mover in this pass
- strongest gains were:
  - `CUSTOM_CSTAFF_A4 | Ashley Build`: `+4.60 -> +3.89`
  - `CUSTOM_CSTAFF_A4 | DL Reaper/Maul Orphic Bio`: `+3.45 -> +2.06`
  - `CUSTOM_MAUL_A4_SG1_PINK | DL Reaper/Maul Orphic Bio`: `+2.61 -> +2.23`
- but it also moved contrasts:
  - `CUSTOM_CSTAFF_A4 | SG1 Split Bombs T2`: `-1.90 -> -0.90`
  - `CUSTOM_MAUL_A4_DL_ABYSS | DL Rift/Bombs Scout`: `+1.31 -> +0.89`

Read:
- the shared live lead is real
- but the broad split-action proof is too entangled to land as a patch

## Whether the two defenders clearly share one mechanism

Yes, strongly enough to treat as a single diagnosis lane.

Shared mechanism shape:
- defender-side reaper-first mixed-melee shells
- same `accuracy -> meleeSkill -> per_weapon -> doAction` path
- same outcome shape: attacker win too high without a big avgTurns miss
- same surviving proof surface: defender-side two-weapon realized damage sequencing

What they do **not** share cleanly enough yet:
- a patch-safe narrow predicate inside that sequencing surface

## Control / contrast

### `DL Rift/Bombs Scout` healthy control

Baseline:
- `+0.51`, `+0.20`, `+1.31`, `-0.02`

Read:
- much smaller residual than the target lane
- but the defender split proof still moves it, so the split surface is not cleanly target-only

### `DL Dual Rift Bio` repaired-Bio contrast

Baseline:
- `-0.04`, `-3.08`, `-2.68`, `-3.27`

Read:
- opposite sign family
- split proof is flat-to-worse here
- this does **not** look like the same lane

### `SG1 Split Bombs T2` mixed-sign contrast

Baseline:
- `+2.90`, `-1.90`, `+2.03`, `+3.44`

Read:
- split proof also moves this row materially
- that is the main reason the sequencing proof is still not patch-ready

## Broader sanity section

`data/legacy-defenders.js` reach check:
- exact `Dark Legion Armor + Reaper Axe + (Core Staff or Crystal Maul)`: `0`
- broader `Dark Legion Armor + any Reaper Axe`: `0`

Meaning:
- this lane still has no direct default-defender reach
- any future patch for it would still need a collateral sanity pass before landing

## Single best next patch target, if any

No patch target is ready from this pass.

Best remaining specific lead:
- defender-side two-weapon melee realized-damage sequencing in `doAction(...)`
- especially the reaper-first mixed-melee action path where successful defender contacts are resolving to too little realized throughput

Why not patch now:
- simple `w2 after applied-w1` gating was rejected
- broad defender split-action proof is real but too broad
- the current proof still moves `SG1 Split Bombs T2` and `DL Rift/Bombs Scout`

## Explicit statements

- no new truth was collected
- `brute-sim-v1.4.6.js` was untouched
- cleanup was untouched
- droid was not reopened

DL reaper-first mixed-melee lane partially isolated but not patch-ready
