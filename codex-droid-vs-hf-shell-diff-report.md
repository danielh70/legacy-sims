# codex-droid-vs-hf-shell-diff-report

## Scope

Source-of-truth docs read first:
- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-tracked-bio-lane-patch-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-applied-damage-proof-report.md`
- `codex-droid-split-decomposition-report.md`
- `codex-droid-shared-hit-family-proof-report.md`

`legacy-chat-handoff-2026-03-15-continuation.md` was not present in the workspace when searched.

Assumptions preserved:
- verified represented-build baseline stays
- tracked narrow Bio-lane mitigation stays in `legacy-sim-v1.0.4-clean.js`
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit
- no slot-order / predictedDamage-display / replay-key / global mitigation revisit

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js` | instrumentation-only | temp shell-difference proof harness cloned from live sim |
| `codex-droid-vs-hf-shell-diff-report.md` | report-only | self-contained findings |

Untouched:
- `legacy-sim-v1.0.4-clean.js`
- `brute-sim-v1.4.6.js`

No live behavior-changing patch was landed, so no new legacy/brute parity drift was introduced in this pass.

## Exact commands run

### Context / code inspection

```sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
if [ -f legacy-chat-handoff-2026-03-15-continuation.md ]; then sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md; elif [ -f tmp/legacy-chat-handoff-2026-03-15-continuation.md ]; then sed -n '1,260p' tmp/legacy-chat-handoff-2026-03-15-continuation.md; else echo '__MISSING__ legacy-chat-handoff-2026-03-15-continuation.md'; fi
if [ -f codex-tracked-bio-lane-patch-report.md ]; then sed -n '1,240p' codex-tracked-bio-lane-patch-report.md; elif [ -f tmp/codex-tracked-bio-lane-patch-report.md ]; then sed -n '1,240p' tmp/codex-tracked-bio-lane-patch-report.md; else echo '__MISSING__ codex-tracked-bio-lane-patch-report.md'; fi
sed -n '1,260p' codex-droid-lane-diagnosis-report.md
sed -n '1,260p' codex-droid-applied-damage-proof-report.md
sed -n '1,260p' codex-droid-split-decomposition-report.md
sed -n '1,260p' codex-droid-shared-hit-family-proof-report.md

rg -n "function makePreActionState|function attemptWeapon|function doAction|pre\\.forceHit|LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION|shared-hit|sharedSkill" legacy-sim-v1.0.4-clean.js
sed -n '4088,4545p' legacy-sim-v1.0.4-clean.js

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
const live=require('./data/legacy-defenders.js');
for (const srcName of ['curated','live']) {
  const defs=srcName==='curated'?curated:live;
  console.log('SOURCE',srcName);
  for (const name of ['SG1 Double Maul Droid','HF Scythe Pair','DL Rift/Bombs Scout']) {
    const d=defs[name];
    console.log('NAME',name);
    if (!d) { console.log('MISSING'); continue; }
    for (const k of ['armor','weapon1','weapon2','misc1','misc2']) console.log(k, JSON.stringify(d[k]||null));
    console.log('---');
  }
}
NODE
```

### Temp harness setup / checks

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js
```

### Compact shell-mode compare set on the reference maul attacker

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-samename' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-samename.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_w1_mixed' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-w1mixed' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-w1mixed.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_w2_mixed' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-w2mixed' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-w2mixed.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_hf_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-hfmisc' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-hfmisc.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_droid_misc' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-droidmisc' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-droidmisc.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_hf_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-hfarmor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-hfarmor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-sg1armor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='exact_droid_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-exactdroid' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-exactdroid.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='exact_hf_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-diff LEGACY_REPLAY_TAG='codex-droid-hf-shell-exacthf' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-shell-exacthf.log 2>&1
```

### Four-attacker verification for the cleanest droid-side shell rule

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-custom-off' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-custom-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-custom-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-custom-sg1armor.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-cstaff-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-cstaff-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-cstaff-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-cstaff-sg1armor.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-dl-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-dl-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-dl-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-dl-sg1armor.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-sg1-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-sg1-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-4atk LEGACY_REPLAY_TAG='codex-droid-hf-4atk-sg1-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-4atk-sg1-sg1armor.log 2>&1
```

### Fixed-seed debug traces

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-debug LEGACY_REPLAY_TAG='codex-droid-hf-debug-custom-off' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|SG1 Double Maul Droid,CUSTOM|HF Scythe Pair,CUSTOM|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=180 node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-debug-custom-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-debug LEGACY_REPLAY_TAG='codex-droid-hf-debug-sg1-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Double Maul Droid,CUSTOM_MAUL_A4_SG1_PINK|HF Scythe Pair,CUSTOM_MAUL_A4_SG1_PINK|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=180 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-debug-sg1-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-debug LEGACY_REPLAY_TAG='codex-droid-hf-debug-sg1-sg1armor' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Double Maul Droid,CUSTOM_MAUL_A4_SG1_PINK|HF Scythe Pair,CUSTOM_MAUL_A4_SG1_PINK|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=180 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-debug-sg1-sg1armor.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_hf_misc' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_REPLAY_TRIALS=5000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-vs-hf-shell-debug LEGACY_REPLAY_TAG='codex-droid-hf-debug-sg1-hfmisc' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,HF Scythe Pair,DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM_MAUL_A4_SG1_PINK|SG1 Double Maul Droid,CUSTOM_MAUL_A4_SG1_PINK|HF Scythe Pair,CUSTOM_MAUL_A4_SG1_PINK|DL Rift/Bombs Scout' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=1 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=6 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=180 node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-debug-sg1-hfmisc.log 2>&1
```

### Default-defender-path sanity check

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='off' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=50000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-droid-hf-default-off.json LEGACY_DEFENDER_FILE=./data/legacy-defenders.js LEGACY_VERIFY_DEFENDERS='DL Gun Build 3,SG1 Split bombs,T2 Scythe Build,HF Core/Void,Core/Void Build 1' node ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-default-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_HF_SHELL_MODE='same_name_refresh_hit_sg1_armor' LEGACY_DETERMINISTIC=1 LEGACY_SEED=1337 LEGACY_TRIALS=50000 LEGACY_COLOR=0 LEGACY_ASCII=1 LEGACY_HEADER=min LEGACY_OUTPUT=compact LEGACY_PRINT_GAME=0 LEGACY_COMPARE=0 LEGACY_EXPORT_JSON=1 LEGACY_EXPORT_JSON_FILE=./tmp/codex-droid-hf-default-sg1armor.json LEGACY_DEFENDER_FILE=./data/legacy-defenders.js LEGACY_VERIFY_DEFENDERS='DL Gun Build 3,SG1 Split bombs,T2 Scythe Build,HF Core/Void,Core/Void Build 1' node ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js > ./tmp/codex-droid-hf-default-sg1armor.log 2>&1
```

### Final checks

```sh
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-vs-hf-shell-diff.js
node --check ./legacy-sim-v1.0.4-clean.js

node - <<'NODE'
const curated=require('./data/legacy-defenders-meta-v4-curated.js');
const live=require('./data/legacy-defenders.js');
const defs=require('./data/legacy-defs.js').itemDefs;
function skill(name){const t=(defs[name]||{}).skillType; return t==='meleeSkill'?1:t==='gunSkill'?0:t==='projSkill'?2:null;}
function matches(d){if(!d||!d.armor||!d.weapon1||!d.weapon2)return false; return d.armor.name==='SG1 Armor' && d.weapon1.name===d.weapon2.name && skill(d.weapon1.name)===1 && skill(d.weapon2.name)===1;}
for (const [label,src] of [['curated',curated],['live',live]]) {
  const names=Object.entries(src).filter(([,d])=>matches(d)).map(([n])=>n).sort();
  console.log(label, names.length, names.join(' | '));
}
NODE

git status --short
```

## Compact shell-signature table for droid vs HF

Curated shell composition:

| Defender | Armor | W1 / W2 | Same-name melee pair | Asymmetric special slot | Misc shell |
| --- | --- | --- | --- | --- | --- |
| `SG1 Double Maul Droid` | `SG1 Armor` | `Crystal Maul / Crystal Maul` | yes | stronger/non-uniform slot is `w1` | `Scout Drones / Droid Drone` |
| `HF Scythe Pair` | `Hellforged Armor` | `Scythe T2 / Scythe T2` | yes | stronger/non-uniform slot is `w2` | `Scout Drones / Bio Spinal Enhancer` |

Fixed-seed compiled defender snapshots from replay debug:

| Defender | HP | Spd | Acc | Dod | Mel | Def | Armor | ArmorFactor |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `SG1 Double Maul Droid` | 650 | 125 | 315 | 151 | 622 | 684 | 75 | 0.833703 |
| `HF Scythe Pair` | 865 | 293 | 157 | 97 | 844 | 670 | 155 | 0.705882 |

Most important shell read:
- They are only “the same lane” at the weapon-family label level.
- They diverge sharply at the compiled shell level:
  - droid is high-accuracy / low-speed / lower-HP / lower-armor
  - HF is lower-accuracy / much-higher-melee / high-speed / high-HP / high-armor
- So a shared-hit `w2` refresh mutates the same lifecycle step on both shells, but it does **not** land on the same threshold profile.

## Compact explanation of `pre.forceHit` lifecycle

Live baseline path:
1. `doAction(...)` calls `makePreActionState()` once per action.
2. `makePreActionState()` rolls one `sharedHit` and stores it as `pre.forceHit`.
3. `attemptWeapon(..., w1, pre)` consumes `pre.forceHit`.
4. Baseline defender `w2` reuses the same `pre`, so `attemptWeapon(..., w2, pre)` consumes the same `pre.forceHit`.

Refresh-hit temp path:
1. `doAction(...)` still runs the same action shell.
2. Before defender `w2`, the temp mode rebuilds `makePreActionState()`.
3. That inserts a second `HIT_SHARED` roll before `w2`.
4. `attemptWeapon(..., w2, pre2)` then consumes the fresh `pre2.forceHit`.

What the fixed-seed traces prove:
- baseline droid and baseline HF both show the same one-roll reuse pattern:
  - one `RD HIT_SHARED`
  - then `RD HIT_USED_SHARED ... w1`
  - then `RD HIT_USED_SHARED ... w2`
- under shell refresh toggles, both show the same structural mutation:
  - `RD HIT_SHARED`
  - `RD HIT_USED_SHARED ... w1`
  - second `RD HIT_SHARED`
  - `RD HIT_USED_SHARED ... w2`

So the first droid-vs-HF difference is **not** the lifecycle structure itself. The lifecycle change is the same. The difference is the shell-specific response to that extra `w2` hit roll.

## Reference shell-predicate results

Reference attacker:
- `CUSTOM_MAUL_A4_SG1_PINK`

Values are `win delta vs truth`; movement is relative to `off`.

| Temp predicate | Droid | HF | Scout | Read |
| --- | --- | --- | --- | --- |
| `off` | `-4.56` | `+0.08` | `+0.02` | baseline |
| `same_name_refresh_hit` | `-4.44` `(+0.12)` | `+0.97` `(+0.89)` | `-0.03` `(-0.05)` | rejected broad family |
| `same_name_refresh_hit_w1_mixed` | `-4.52` `(+0.04)` | `+0.09` `(+0.01)` | `+0.13` `(+0.11)` | slot-asymmetry weak |
| `same_name_refresh_hit_w2_mixed` | `-4.71` `(-0.15)` | `+0.02` `(-0.06)` | `+0.13` `(+0.11)` | slot-asymmetry wrong direction |
| `same_name_refresh_hit_hf_misc` | `-4.57` `(-0.01)` | `+0.98` `(+0.90)` | `+0.10` `(+0.08)` | nearly all HF movement |
| `same_name_refresh_hit_hf_armor` | `-4.49` `(+0.07)` | `+0.77` `(+0.69)` | `+0.13` `(+0.11)` | partial HF movement |
| `same_name_refresh_hit_droid_misc` | `-4.42` `(+0.14)` | `-0.10` `(-0.18)` | `-0.12` `(-0.14)` | droid move, but collateral shape rougher |
| `same_name_refresh_hit_sg1_armor` | `-4.43` `(+0.13)` | `+0.14` `(+0.06)` | `-0.02` `(-0.04)` | cleanest droid-side natural shell rule |
| `exact_droid_refresh_hit` | `-4.42` `(+0.14)` | `-0.22` `(-0.30)` | `+0.01` `(-0.01)` | analysis bound only |
| `exact_hf_refresh_hit` | `-4.61` `(-0.05)` | `+0.93` `(+0.85)` | `+0.03` `(+0.01)` | analysis bound only |

What this proves:
- the SG1/HF split is **not** mainly `w1`-vs-`w2` slot asymmetry
- the HF movement is explained much better by the HF shell itself, especially the Bio misc shell
- the droid movement is explained much better by the SG1 shell itself, with `same-name dual melee + SG1 armor` being the cleanest natural droid-side proxy

## Targeted results for droid, HF, and scout

Chosen droid-side candidate for expansion:
- `same_name_refresh_hit_sg1_armor`

Four-attacker verification:

| Attacker | Droid `off -> sg1_armor` | Droid move | HF `off -> sg1_armor` | HF move | Scout `off -> sg1_armor` | Scout move |
| --- | --- | ---: | --- | ---: | --- | ---: |
| `CUSTOM` | `-3.26 -> -2.95` | `+0.31` | `-0.90 -> -0.93` | `-0.03` | `+0.46 -> +0.47` | `+0.01` |
| `CUSTOM_CSTAFF_A4` | `-6.66 -> -6.54` | `+0.12` | `-3.58 -> -3.47` | `+0.11` | `+0.31 -> +0.46` | `+0.15` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `-4.60 -> -4.25` | `+0.35` | `-3.56 -> -3.63` | `-0.07` | `+0.87 -> +0.99` | `+0.12` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `-4.56 -> -4.43` | `+0.13` | `+0.08 -> +0.14` | `+0.06` | `+0.02 -> -0.02` | `-0.04` |

Read:
- droid improved on all 4 attackers
- HF stayed materially flatter than under the rejected same-name family rule
- scout stayed much flatter than under the rejected same-name family rule, but not perfectly flat

## Where the shells diverge under `pre.forceHit`

First concrete shell difference found:
- **not** in the `pre.forceHit` lifecycle structure
- **not** in weapon-family sameness
- **not** mainly in `w1`-vs-`w2` compiled slot asymmetry

The first real droid-vs-HF difference is:
- **shell-conditioned response to a fresh defender `w2` hit roll**

Most supported shell features:
- HF side:
  - strongest explainer is `same-name dual melee + Bio misc shell`
  - `same_name_refresh_hit_hf_misc` almost reproduces `exact_hf_refresh_hit`
- droid side:
  - cleanest droid-side natural rule is `same-name dual melee + SG1 armor`
  - `same_name_refresh_hit_sg1_armor` nearly matches the exact-droid bound, with much flatter HF spill

This means the surviving shared-hit lead is real, but it is **shell-conditioned**, not just weapon-family-conditioned.

## One deterministic trace snippet

Reference attacker:
- `CUSTOM_MAUL_A4_SG1_PINK`

HF baseline:

```text
RD HIT_SHARED ... HF-Scythe-Pair ... D->A ... => 1
RD HIT_USED_SHARED ... w1(Scythe T2) | forced=1
RD HIT_USED_SHARED ... w2(Scythe T2) | forced=1
```

HF with `same_name_refresh_hit_hf_misc`:

```text
RD HIT_SHARED ... HF-Scythe-Pair ... D->A ... => 1
RD HIT_USED_SHARED ... w1(Scythe T2) | forced=1
RD HIT_SHARED ... HF-Scythe-Pair ... D->A ... => 0
RD HIT_USED_SHARED ... w2(Scythe T2) | forced=0
```

SG1 baseline:

```text
RD HIT_SHARED ... SG1-Double-Maul-Droid ... D->A(ret) ... => 1
RD HIT_USED_SHARED ... w1(Crystal Maul) | forced=1
RD HIT_USED_SHARED ... w2(Crystal Maul) | forced=1
```

SG1 with `same_name_refresh_hit_sg1_armor`:

```text
RD HIT_SHARED ... SG1-Double-Maul-Droid ... D->A(ret) ... => 1
RD HIT_USED_SHARED ... w1(Crystal Maul) | forced=1
RD HIT_SHARED ... SG1-Double-Maul-Droid ... D->A(ret) ... => 1
RD HIT_USED_SHARED ... w2(Crystal Maul) | forced=1
```

Why this matters:
- the lifecycle mutation is the same
- the shell response is different
- HF gets a large row-level outcome change from the fresh `w2` hit roll
- droid gets a smaller but cleaner shell-local change

## Whether any shell-specific condition is materially cleaner than the rejected family rule

Yes, but only partially.

Best droid-side shell rule found:
- `same-name dual melee + SG1 armor`

Why it beats the rejected family rule:
- same-name family on the pink reference row:
  - droid `+0.12`
  - HF `+0.89`
  - scout `-0.05`
- SG1-armor rule on the same row:
  - droid `+0.13`
  - HF `+0.06`
  - scout `-0.04`

And across the 4-attacker check:
- droid improved on all 4 attackers
- HF stayed near-flat
- scout drift stayed small-to-moderate, not catastrophic

## Broad-collateral sanity check on the default defender file path

Default path used:
- `data/legacy-defenders.js`

Deterministic 5-row sanity slice:

| Defender | `off` win% | `sg1_armor` win% | move |
| --- | ---: | ---: | ---: |
| `DL Gun Build 3` | `48.27` | `48.22` | `-0.05` |
| `SG1 Split bombs` | `50.05` | `50.48` | `+0.43` |
| `T2 Scythe Build` | `62.26` | `62.31` | `+0.05` |
| `HF Core/Void` | `63.67` | `64.06` | `+0.39` |
| `Core/Void Build 1` | `64.93` | `64.79` | `-0.14` |

Important caution:
- the default-defender-path run uses a different config key / logic key, so this is only a coarse spill check
- still, no large stock-row blow-up appeared in this small deterministic slice

Additional scope sanity:
- `same-name dual melee + SG1 armor` matches:
  - curated v4: `1` row (`SG1 Double Maul Droid`)
  - default `data/legacy-defenders.js`: `0` rows

That is the main reason I did **not** call it patch-safe.

## Narrow proof-toggle decision

No live patch was landed.

Most promising temporary proof toggle:
- `same_name_refresh_hit_sg1_armor`

Why it is mechanically justified:
- it keys off real compiled shell structure visible to combat code:
  - same-name dual melee
  - SG1 armor shell
- it explains the droid-side movement much better than the rejected broad family rule
- it stays materially flatter on HF/scout than the rejected same-name family rule

Why it is still not patch-safe:
- in the curated data it collapses to a single defender row
- in the default defender file it matches zero rows
- that makes it effectively a mechanically informed shell proxy, not yet a demonstrated reusable simulator rule

## Repo-side diagnosis exhaustion and next truth pack

Repo-side diagnosis is exhausted **for now**.

Reason:
- the SG1-vs-HF split is now mostly explained
- but the clean droid-side rule collapses to a single curated shell
- another repo-only narrowing pass would mostly be arguing between exact-shell proxies, not proving a general simulator rule

Smallest next truth pack needed:
- attackers:
  - `CUSTOM`
  - `CUSTOM_MAUL_A4_SG1_PINK`
- defenders:
  - exact `SG1 Double Maul Droid`
  - `SG1 Double Maul Droid` shell with `misc2` changed from `Droid Drone` to `Bio Spinal Enhancer`
  - `SG1 Double Maul Droid` shell with armor changed from `SG1 Armor` to `Hellforged Armor`
  - exact `HF Scythe Pair`

Exact question that truth pack would answer:
- does the surviving shared-hit sensitivity in the droid lane follow the SG1 armor shell, the droid-vs-bio misc shell, or only the exact full droid shell?

If that pack shows the SG1-armor swap alone preserves the droid behavior, the current temp lead becomes much safer.
If it does not, the current SG1-armor rule should be treated as an overfit proxy and not landed.

## Explicit untouched-state statement

- No new truth was collected in this pass.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No live behavior-changing patch was left behind.

## Final verdict

droid-vs-HF shell difference not patch-safe; repo-side diagnosis exhausted, targeted truth needed
