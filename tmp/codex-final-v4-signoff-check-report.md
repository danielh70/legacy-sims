# codex-final-v4-signoff-check-report

## 1. Scope

Rerun curated-v4 verification on the current verified represented-build patch baseline using:

- `CUSTOM`
- `CUSTOM_CSTAFF_A4`

and decide whether normal full-4-crystal signoff is now sufficient, or whether one more full-4-crystal attacker/truth pack is still justified before cleanup.

This was a verification/signoff pass only.

## 2. Exact files inspected

- [AGENTS.md](/Users/danielhook/Desktop/code_projects/legacy_sims/AGENTS.md)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [codex-post-patch-v4-curated-verification-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-report.md)
- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [tools/legacy-truth-replay-compare.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js)
- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [legacy-truth-meta16-two-attackers.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-meta16-two-attackers.json)
- [legacy-truth-v4-custom-cstaff-gap6.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-cstaff-gap6.json)
- [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)
- [tmp/codex-final-custom-full15.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-custom-full15.log)
- [tmp/codex-final-cstaff-full15.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-cstaff-full15.log)
- [legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-custom-full15--2026-03-15T18-51-40-032Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-final-signoff/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-custom-full15--2026-03-15T18-51-40-032Z.json)
- [legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-final-cstaff-full15--2026-03-15T18-51-40-028Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-final-signoff/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-final-cstaff-full15--2026-03-15T18-51-40-028Z.json)

## 3. Exact commands run

```sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tools/legacy-truth-replay-compare.js
node - <<'NODE'
const fs=require('fs');
const curated=new Set(Object.keys(require('./data/legacy-defenders-meta-v4-curated.js')));
const oldTruth=JSON.parse(fs.readFileSync('legacy-truth-meta16-two-attackers.json','utf8'));
const newTruth=JSON.parse(fs.readFileSync('legacy-truth-v4-custom-cstaff-gap6.json','utf8'));
const replaceDefs=new Set((newTruth.matchups||[]).map(m=>m.defender));
const keepOld=(oldTruth.matchups||[]).filter(m=>m.attacker==='CUSTOM_CSTAFF_A4' && curated.has(m.defender) && !replaceDefs.has(m.defender));
const mergedMatchups=[...keepOld, ...(newTruth.matchups||[])];
mergedMatchups.sort((a,b)=>String(a.defender).localeCompare(String(b.defender)));
const merged={...newTruth, outputFile:'tmp/legacy-truth-v4-custom-cstaff-full15-merged.json', counts:{attackers:1, defenders:mergedMatchups.length, matchups:mergedMatchups.length, repeats:newTruth.repeats, runsPlanned:mergedMatchups.length*(newTruth.repeats||1)}, attackers:[{name:'CUSTOM_CSTAFF_A4', build:newTruth.matchups[0].pageBuilds.attacker}], defenders:mergedMatchups.map(m=>({name:m.defender, build:m.pageBuilds.defender})), matchups:mergedMatchups};
fs.writeFileSync('./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json', JSON.stringify(merged,null,2));
console.log(JSON.stringify({mergedCount:mergedMatchups.length, defenders:mergedMatchups.map(m=>m.defender)}, null, 2));
NODE
mkdir -p ./tmp/replay-v4-final-signoff
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-final-signoff LEGACY_REPLAY_TAG='codex-final-custom-full15' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-custom-full15.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-final-signoff LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_TAG='codex-final-cstaff-full15' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-cstaff-full15.log 2>&1
```

## 4. Truth source files used

### CUSTOM

- primary truth: [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- curated-v4 coverage from that file: `15/15`

### CUSTOM_CSTAFF_A4

- old source of retained rows: [legacy-truth-meta16-two-attackers.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-meta16-two-attackers.json)
- newly collected gap rows: [legacy-truth-v4-custom-cstaff-gap6.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-cstaff-gap6.json)
- temp merged full-v4 truth used for this pass: [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)
- curated-v4 coverage after merge: `15/15`

Curated defender source used:

- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)

## 5. Chosen attackers

| Attacker | Why it matters for signoff |
| --- | --- |
| `CUSTOM` | strongest ordinary uniform-slot regression guard; already full-v4 truth-complete |
| `CUSTOM_CSTAFF_A4` | distinct full-4-crystal attacker family that exercises the shared stat/compile path differently from `CUSTOM` |

## 6. Truth coverage table

| Attacker | Covered rows | Missing truth rows |
| --- | ---: | ---: |
| `CUSTOM` | 15/15 | 0 |
| `CUSTOM_CSTAFF_A4` | 15/15 | 0 |

## 7. CUSTOM full-v4 summary

| Metric | Value |
| --- | ---: |
| Compared rows | 15 |
| meanAbsΔwin | 1.60 |
| meanAbsΔavgT | 0.1014 |
| worstAbsΔwin | 3.23 |
| Worst offender | `SG1 Double Maul Droid` |

Worst covered rows:

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `SG1 Double Maul Droid` | 3.23 | sim low |
| `DL Reaper/Maul Orphic Bio` | 3.15 | sim high |
| `DL Core/Rift Bio` | 2.99 | sim low |
| `SG1 Split Bombs T2` | 2.90 | sim high |
| `Ashley Build` | 2.71 | sim high |

Readout:

- This matches the previously reported post-patch `CUSTOM` scale.
- No new ordinary uniform-slot regression signal appeared here.

## 8. CUSTOM_CSTAFF_A4 full-v4 summary

| Metric | Value |
| --- | ---: |
| Compared rows | 15 |
| meanAbsΔwin | 3.16 |
| meanAbsΔavgT | 0.1360 |
| worstAbsΔwin | 6.71 |
| Worst offender | `SG1 Double Maul Droid` |

Worst covered rows:

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `SG1 Double Maul Droid` | 6.71 | sim low |
| `DL Dual Rift Bio` | 5.93 | sim low |
| `DL Core/Rift Bio` | 5.79 | sim low |
| `Ashley Build` | 4.60 | sim high |
| `HF Scythe Pair` | 3.64 | sim low |

Readout:

- This attacker is now fully truth-covered on curated v4.
- Accuracy is materially worse than `CUSTOM`, not just noisier.
- The added 6-row pack did not reveal a coverage problem; it revealed a real accuracy problem on this attacker family.

## 9. Practical signoff assessment

### Are these two attackers enough for ordinary full-4-crystal signoff?

No.

Reason:

- `CUSTOM` is strong enough to say the represented-build patch did not broadly regress ordinary uniform-slot behavior.
- `CUSTOM_CSTAFF_A4` is now fully covered and still sits at `meanAbsΔwin 3.16` with a `6.71` worst row.
- Because `CUSTOM_CSTAFF_A4` is fully truth-covered, the remaining uncertainty is not “missing truth for this attacker.” It is whether this is an isolated attacker-family miss or a broader full-4-crystal issue.

### Is one more attacker still justified?

Yes.

Recommended exact one more attacker / truth pack:

- `CUSTOM_MAUL_A4` against all 15 curated v4 defenders

Why this one:

- it already exists as an established project attacker label in repo truth
- it is a normal full-4-crystal build
- it stresses a different second-weapon family than `CUSTOM_CSTAFF_A4`
- it is the cleanest way to answer whether the current problem is specific to the Core Staff attacker family or broader across non-`CUSTOM` full-4-crystal attackers

## 10. Are there meaningful regressions introduced by the represented-build patch?

No evidence from this pass.

Why that conclusion is justified:

- the represented-build patch is already verified as narrowly gated to explicit per-part `crystalSlots` / `slotCount`
- both attackers in this pass are ordinary uniform-slot truth paths
- `CUSTOM` remains at the same previously reported post-patch scale (`meanAbsΔwin 1.60`, `worstAbsΔwin 3.23`)

This pass does **not** prove broader parity beyond those covered rows. It only says there is no new signoff blocker attributable to the represented-build patch itself on ordinary full-4-crystal paths.

## 11. Cleanup inventory

No files were deleted in this pass.

### Safe to delete after final signoff

- [codex-final-custom-full15.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-custom-full15.log)
- [codex-final-cstaff-full15.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-cstaff-full15.log)
- [legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)
- replay JSONs under [replay-v4-final-signoff](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-final-signoff)

### Keep

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)
- [tools/legacy-truth-replay-compare.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [codex-post-patch-v4-curated-verification-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-report.md)
- [codex-final-v4-signoff-check-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-v4-signoff-check-report.md)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [legacy-truth-meta16-two-attackers.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-meta16-two-attackers.json)
- [legacy-truth-v4-custom-cstaff-gap6.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-cstaff-gap6.json)

### Review before delete

- older temp Bio-diagnosis reports and one-off harnesses under [tmp](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp)
- [legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js)
- any untracked or unrelated worktree state not directly part of represented-build verification

## 12. Untouched logic statement

In this pass:

- no behavior patch was made
- no Bio helper logic was changed
- no combat logic was changed
- no brute logic was changed
- no file deletion was performed

## 13. Final verdict

**one more verification step still required**

Current best next step for normal full-4-crystal signoff:

- collect or assemble a curated-v4 full-15 truth pack for `CUSTOM_MAUL_A4`
- rerun the same compact full-v4 compare
- then decide cleanup based on whether `CUSTOM_CSTAFF_A4` is an isolated attacker-family miss or a broader non-`CUSTOM` issue
