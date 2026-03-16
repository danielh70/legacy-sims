# codex-droid-split-decomposition-report

## Scope

Source-of-truth docs read first:
- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `codex-tracked-bio-lane-patch-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-applied-damage-proof-report.md`

I did not find `legacy-chat-handoff-2026-03-15-continuation.md` in the workspace, so this pass proceeded from the available source-of-truth reports plus the accepted live file state.

Baseline assumptions preserved:
- represented-build fix stays
- tracked narrow Bio-lane mitigation in `legacy-sim-v1.0.4-clean.js` stays
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit
- no slot-order / predictedDamage-display / replay-key / global mitigation branch revisit

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js` | instrumentation-only | Temporary decomposition harness cloned from live sim; no live behavior change landed |
| `codex-droid-split-decomposition-report.md` | report-only | Self-contained findings for this pass |

Untouched:
- `legacy-sim-v1.0.4-clean.js` behavior unchanged
- `brute-sim-v1.4.6.js` untouched

## What the old broad split branch actually changes

Relevant live surface:
- `doAction(...)` in `legacy-sim-v1.0.4-clean.js`
- defender-side `attemptWeapon(...) -> doAction(...)` handoff through `pre = makePreActionState()`

The accepted broad proof branch `LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender'` decomposes into only three atomic effects inside this surface:

1. `gate_after_applied_w1`
   - After defender `w1`, compute `postW1Hp = targetHp0 - min(r1.dmg, targetHp0)`.
   - If `postW1Hp <= 0`, skip defender `w2`.

2. `refresh_shared_hit_before_w2`
   - Rebuild `pre.forceHit` for defender `w2` via a fresh `makePreActionState()`.
   - This is the shared-hit cache refresh.

3. `refresh_shared_skill_before_w2`
   - Rebuild `pre.sharedSkillFn` / `pre.sharedSkillSkillCode` for defender `w2`.
   - On this lane, this is effectively inert because the active config is `sharedSkillMode=none`.

Important negative result:
- The broad split branch does **not** introduce a fresh target snapshot, fresh retaliation state, or a new action boundary beyond the applied-kill gate and the `pre` refresh above.
- Inside `makePreActionState()`, the carried-over cross-weapon state is only `forceHit`, `sharedSkillFn`, and `sharedSkillSkillCode`.

## Temporary decomposition toggles

Added only in the temp harness:

| Toggle | Meaning |
| --- | --- |
| `off` | live baseline behavior |
| `gate_only` | applied-kill gate only; `w2` keeps original `pre` |
| `refresh_hit_only` | fresh `forceHit` only before defender `w2` |
| `refresh_skill_only` | fresh shared-skill context only before defender `w2` |
| `refresh_pre_only` | full fresh `pre` before defender `w2` without applied-kill gate |
| `gate_refresh_hit` | applied-kill gate + fresh `forceHit` before defender `w2` |
| `full_split` | temp reproduction of broad split branch |

## Commands run

### Setup / inspection

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
sed -n '4390,4495p' ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
sed -n '199,235p' ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
sed -n '1778,1825p' ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
sed -n '4418,4465p' ./legacy-sim-v1.0.4-clean.js
rg -n "splitMultiweaponActionEnabled|diagSplitMultiweaponAction" ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
diff -u <(sed -n '4418,4465p' ./legacy-sim-v1.0.4-clean.js) <(sed -n '4450,4505p' ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js)
```

### Pink attacker decomposition compare set

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-gate' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-gate.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_hit_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_skill_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-skill' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-skill.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_pre_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-pre' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-pre.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='full_split' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp LEGACY_REPLAY_TAG='codex-droid-split-decomp-full' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-decomp-full.log 2>&1
```

### Four-attacker droid verification

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-custom-off' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-custom-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_hit_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-custom-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-custom-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-custom-gate' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-custom-gate.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-custom-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-custom-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='full_split' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-custom-full' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-custom-full.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-cstaff-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-cstaff-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_hit_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-cstaff-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-cstaff-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-cstaff-gate' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-cstaff-gate.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-cstaff-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-cstaff-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='full_split' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-cstaff-full' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-cstaff-full.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-dl-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-dl-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_hit_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-dl-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-dl-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-dl-gate' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-dl-gate.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-dl-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-dl-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='full_split' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-dl-full' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-dl-full.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-sg1-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-sg1-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='refresh_hit_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-sg1-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-sg1-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_only' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-sg1-gate' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-sg1-gate.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='gate_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-sg1-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-sg1-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SPLIT_DECOMP='full_split' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-split-decomp-4atk LEGACY_REPLAY_TAG='codex-droid-split-4atk-sg1-full' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js > ./tmp/codex-droid-split-4atk-sg1-full.log 2>&1
```

### Live broad-split sanity check

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-live-broad LEGACY_REPLAY_TAG='codex-droid-live-broad-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-live-broad-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-live-broad LEGACY_REPLAY_TAG='codex-droid-live-broad-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-live-broad-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-live-broad LEGACY_REPLAY_TAG='codex-droid-live-broad-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-live-broad-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION='defender' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-live-broad LEGACY_REPLAY_TAG='codex-droid-live-broad-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-droid-live-broad-sg1.log 2>&1
```

### Syntax checks

```sh
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js
node --check ./legacy-sim-v1.0.4-clean.js
```

## Compact per-toggle movement table

Reference attacker for decomposition table:
- `CUSTOM_MAUL_A4_SG1_PINK`
- control: `DL Rift/Bombs Scout`
- contrast: `HF Scythe Pair`

All values below are `win delta vs truth`, with parenthetical movement relative to `off`.

| Toggle | SG1 Double Maul Droid | DL Rift/Bombs Scout | HF Scythe Pair |
| --- | --- | --- | --- |
| `off` | `-4.70` | `+0.00` | `-0.09` |
| `gate_only` | `-4.49` `(+0.21)` | `+0.08` `(+0.08)` | `-0.05` `(+0.04)` |
| `refresh_skill_only` | `-4.59` `(+0.11)` | `-0.11` `(-0.11)` | `-0.06` `(+0.03)` |
| `refresh_hit_only` | `-4.40` `(+0.30)` | `+0.24` `(+0.24)` | `+0.90` `(+0.99)` |
| `refresh_pre_only` | `-4.37` `(+0.33)` | `+0.09` `(+0.09)` | `+0.89` `(+0.98)` |
| `gate_refresh_hit` | `-4.32` `(+0.38)` | `+0.35` `(+0.35)` | `+0.98` `(+1.07)` |
| `full_split` temp | `-4.41` `(+0.29)` | `+0.04` `(+0.04)` | `+0.71` `(+0.80)` |

Readout:
- `refresh_skill_only` is basically inert here.
- `gate_only` is narrow and fairly flat on scout/HF, but only explains a minority of droid movement.
- `refresh_hit_only` explains most of the droid movement on this attacker, but it also moves HF hard and scout materially.
- `refresh_pre_only` ~= `refresh_hit_only`, which is consistent with `sharedSkillMode=none`.

## SG1 Double Maul Droid on all 4 attackers

These rows use the compact four-attacker droid-only reruns. Values are `win delta vs truth`; movement is relative to `off`.

| Attacker | `off` | `gate_only` | `refresh_hit_only` | `gate_refresh_hit` | live broad split |
| --- | --- | --- | --- | --- | --- |
| `CUSTOM` | `-3.05` | `-3.12` `(-0.07)` | `-3.05` `(+0.00)` | `-2.91` `(+0.14)` | `-2.84` `(+0.21)` |
| `CUSTOM_CSTAFF_A4` | `-6.31` | `-6.55` `(-0.24)` | `-6.35` `(-0.04)` | `-6.44` `(-0.13)` | `-6.38` `(-0.07)` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `-4.65` | `-4.51` `(+0.14)` | `-4.36` `(+0.29)` | `-4.41` `(+0.24)` | `-4.20` `(+0.45)` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `-4.70` | `-4.49` `(+0.21)` | `-4.40` `(+0.30)` | `-4.32` `(+0.38)` | `-4.27` `(+0.43)` |

Interpretation:
- The maul attackers are the ones where `refresh_hit_only` clearly matters.
- `CUSTOM` does not move from `refresh_hit_only`; its droid movement only appears when the applied-kill gate is also present.
- `CUSTOM_CSTAFF_A4` does not benefit from any isolated sub-toggle in this pass.
- No single sub-toggle explains the broad split movement across all 4 droid attackers.

## Control / contrast check

Chosen control/contrast set:
- control: `DL Rift/Bombs Scout`
- contrast: `HF Scythe Pair`
- reference attacker for decomposition: `CUSTOM_MAUL_A4_SG1_PINK`

Result:
- the only droid-helpful isolated toggle with strong signal is `refresh_hit_only`
- that same toggle also moved scout by `+0.24`
- and moved HF by `+0.99`

So the narrowest helpful sub-cause is **not** materially flat outside the droid lane.

## First concrete divergence found

First concrete post-success divergence isolated in this pass:
- defender-side `doAction(...)`
- between defender `w1` and defender `w2`
- in the carried-over `pre.forceHit` shared-hit context used by `attemptWeapon(...)`

More specifically:
- when defender `w2` reuses the original `pre` object, it also reuses the original shared-hit result
- refreshing only `pre.forceHit` before defender `w2` is the smallest sub-toggle that produces most of the droid movement on the maul attackers
- refreshing shared-skill context alone does not materially move the row

Classification by bucket:
- strongest concrete sub-cause found: `shared-hit context reuse`
- secondary smaller factor: `hp cap / applied damage conversion` only insofar as it drives the `gate_after_applied_w1` skip
- not supported as primary cause at this surface: target snapshot reuse, retaliation-state reuse, action-boundary reuse, or shared-skill reuse

## Narrow-fix decision

No patch was landed.

Why no patch:
- `refresh_hit_only` is the most informative narrow toggle, but it is not isolated to the droid lane
- it materially moves `HF Scythe Pair`
- it also moves scout control rows
- it does not explain all four droid attackers by itself
- `gate_only` is flatter elsewhere, but too weak and inconsistent to justify a live behavioral patch

## Strongest remaining specific lead

The strongest remaining specific lead is:

`defender w2 shared-hit cache reuse in per-weapon multiweapon melee actions, interacting with the applied-kill gate rather than standing alone as a patch-safe cause`

That is narrower than “general doAction sequencing,” but still not clean enough to land because:
- it is partly attacker-build-sensitive
- it is partly shared with HF/scout movement
- and the accepted broad split effect still decomposes into at least two interacting pieces (`gate_after_applied_w1` + shared-hit refresh)

## Verification notes

- `node --check ./tmp/legacy-sim-v1.0.4-clean.droid-split-decomp.js` passed
- `node --check ./legacy-sim-v1.0.4-clean.js` passed
- no new truth was collected
- brute was untouched
- cleanup was untouched
- no behavior-changing patch was left behind

## Verdict

droid split branch decomposed; no patch-ready sub-cause yet
