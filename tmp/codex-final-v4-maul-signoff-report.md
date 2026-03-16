# codex-final-v4-maul-signoff-report

## 1. Scope

Run the final curated-v4 signoff check for normal full-4-crystal attackers using the exact fresh truth files named in the request, plus the already-established `CUSTOM` and `CUSTOM_CSTAFF_A4` truth sources.

This was a verification/signoff pass only.

## 2. Exact files inspected

- [AGENTS.md](/Users/danielhook/Desktop/code_projects/legacy_sims/AGENTS.md)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [codex-post-patch-v4-curated-verification-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-report.md)
- [codex-final-v4-signoff-check-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-v4-signoff-check-report.md)
- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [tools/legacy-truth-replay-compare.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js)
- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)
- [legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json)
- [legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)
- [codex-final-maul-signoff-custom.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-custom.log)
- [codex-final-maul-signoff-cstaff.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-cstaff.log)
- [codex-final-maul-signoff-dl-abyss.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-dl-abyss.log)
- [codex-final-maul-signoff-sg1-pink.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-sg1-pink.log)
- replay JSONs under [tmp/replay-v4-maul-signoff](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-maul-signoff)

## 3. Exact truth files used

1. [legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json)
2. [legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json)
3. [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
4. [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)

Curated defender source:

- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)

## 4. Exact internal attacker labels found

| Truth file | Internal attacker label(s) | Curated-v4 rows present | Full 15/15? |
| --- | --- | ---: | --- |
| [legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json) | `CUSTOM_MAUL_A4_DL_ABYSS` | 15 | yes |
| [legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json) | `CUSTOM_MAUL_A4_SG1_PINK` | 15 | yes |
| [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json) | `CUSTOM` | 15 | yes |
| [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json) | `CUSTOM_CSTAFF_A4` | 15 | yes |

Important note:

- the two new maul truth files do **not** use the older generic `CUSTOM_MAUL_A4` label internally
- the actual internal labels are:
  - `CUSTOM_MAUL_A4_DL_ABYSS`
  - `CUSTOM_MAUL_A4_SG1_PINK`

Those exact labels were used in replay verification.

## 5. Exact commands run

```sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tools/legacy-truth-replay-compare.js
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-maul-signoff LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_TAG='codex-final-maul-signoff-custom' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-maul-signoff-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-maul-signoff LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_TAG='codex-final-maul-signoff-cstaff' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-maul-signoff-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-maul-signoff LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_TAG='codex-final-maul-signoff-dl-abyss' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-maul-signoff-dl-abyss.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-maul-signoff LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_TAG='codex-final-maul-signoff-sg1-pink' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-final-maul-signoff-sg1-pink.log 2>&1
```

## 6. Truth coverage table

| Attacker | Truth source | Covered rows | Missing rows |
| --- | --- | ---: | ---: |
| `CUSTOM` | [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json) | 15 | 0 |
| `CUSTOM_CSTAFF_A4` | [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json) | 15 | 0 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | [legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json) | 15 | 0 |
| `CUSTOM_MAUL_A4_SG1_PINK` | [legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json) | 15 | 0 |

## 7. Compact accuracy summary table

| Attacker | Compared rows | meanAbsΔwin | meanAbsΔavgT | worstAbsΔwin | Worst offender |
| --- | ---: | ---: | ---: | ---: | --- |
| `CUSTOM` | 15 | 1.60 | 0.1014 | 3.23 | `SG1 Double Maul Droid` |
| `CUSTOM_CSTAFF_A4` | 15 | 3.16 | 0.1360 | 6.71 | `SG1 Double Maul Droid` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | 15 | 2.06 | 0.0974 | 4.80 | `DL Dual Rift Bio` |
| `CUSTOM_MAUL_A4_SG1_PINK` | 15 | 2.04 | 0.1011 | 5.74 | `DL Dual Rift Bio` |

## 8. Top 5 worst covered rows by attacker

### CUSTOM

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `SG1 Double Maul Droid` | 3.23 | sim low |
| `DL Reaper/Maul Orphic Bio` | 3.15 | sim high |
| `DL Core/Rift Bio` | 2.99 | sim low |
| `SG1 Split Bombs T2` | 2.90 | sim high |
| `Ashley Build` | 2.71 | sim high |

### CUSTOM_CSTAFF_A4

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `SG1 Double Maul Droid` | 6.71 | sim low |
| `DL Dual Rift Bio` | 5.93 | sim low |
| `DL Core/Rift Bio` | 5.79 | sim low |
| `Ashley Build` | 4.60 | sim high |
| `HF Scythe Pair` | 3.64 | sim low |

### CUSTOM_MAUL_A4_DL_ABYSS

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `DL Dual Rift Bio` | 4.80 | sim low |
| `SG1 Double Maul Droid` | 4.58 | sim low |
| `DL Core/Rift Bio` | 3.85 | sim low |
| `HF Scythe Pair` | 3.50 | sim low |
| `Ashley Build` | 2.65 | sim high |

### CUSTOM_MAUL_A4_SG1_PINK

| Defender | absΔwin | Direction |
| --- | ---: | --- |
| `DL Dual Rift Bio` | 5.74 | sim low |
| `SG1 Double Maul Droid` | 4.57 | sim low |
| `SG1 Split Bombs T2` | 3.44 | sim high |
| `DL Core/Rift Bio` | 3.02 | sim low |
| `Ashley Build` | 2.64 | sim high |

## 9. Signoff interpretation

### Does the current sim now look good to go for normal full-4-crystal curated-v4 use?

No.

### Why not?

Because the two new maul truth packs remove the last big uncertainty from the previous signoff pass:

- `CUSTOM_CSTAFF_A4` is not just an isolated Core Staff oddity anymore
- both new maul attackers are fully covered and land materially above `CUSTOM`
- their error scale is better than `CUSTOM_CSTAFF_A4`, but still clearly worse than `CUSTOM`

Observed pattern:

- `CUSTOM`: `meanAbsΔwin 1.60`
- `CUSTOM_MAUL_A4_DL_ABYSS`: `2.06`
- `CUSTOM_MAUL_A4_SG1_PINK`: `2.04`
- `CUSTOM_CSTAFF_A4`: `3.16`

That is enough to say there is a broader non-`CUSTOM` ordinary full-4-crystal mismatch still present.

### Do the two new maul packs show a broader non-CUSTOM issue, an armor-family split, or only a narrower CSTAFF miss?

Best reading: **broader non-`CUSTOM` issue**.

Reason:

- the two new maul attackers are very close to each other despite different truth files / build variants
- there is no meaningful armor-family split signal between:
  - `CUSTOM_MAUL_A4_DL_ABYSS`
  - `CUSTOM_MAUL_A4_SG1_PINK`
- both maul attackers share the same broad bad lanes as `CUSTOM_CSTAFF_A4`, especially:
  - `DL Dual Rift Bio`
  - `SG1 Double Maul Droid`
  - `DL Core/Rift Bio`

So the remaining mismatch is not well-explained as:

- just one Core Staff family issue
- just one armor-family issue

## 10. Represented-build patch relevance

The represented-build patch still appears unrelated to the remaining ordinary full-4-crystal mismatch.

Why that statement is justified:

- the patch is already verified as narrowly gated to explicit per-part `crystalSlots` / `slotCount`
- all four attackers in this pass are ordinary full-4-crystal truth paths
- `CUSTOM` stayed at the same established ordinary-path scale
- the two maul packs introduce no evidence that represented-build gating changed ordinary behavior directly

What this pass does **not** prove:

- it does not prove the represented-build patch is universally harmless beyond the covered truth rows
- it only shows the remaining blocker is not newly explained by that patch

## 11. Cleanup inventory

No files were deleted in this pass.

### Safe to delete after final signoff

- [codex-final-maul-signoff-custom.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-custom.log)
- [codex-final-maul-signoff-cstaff.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-cstaff.log)
- [codex-final-maul-signoff-dl-abyss.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-dl-abyss.log)
- [codex-final-maul-signoff-sg1-pink.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-maul-signoff-sg1-pink.log)
- replay JSONs under [tmp/replay-v4-maul-signoff](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-maul-signoff)

### Keep

- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js)
- [tools/legacy-truth-replay-compare.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [codex-post-patch-v4-curated-verification-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-report.md)
- [codex-final-v4-signoff-check-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-v4-signoff-check-report.md)
- [codex-final-v4-maul-signoff-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-final-v4-maul-signoff-report.md)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [tmp/legacy-truth-v4-custom-cstaff-full15-merged.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-v4-custom-cstaff-full15-merged.json)
- [legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json)
- [legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json)

### Review before delete

- older temp diagnosis reports and one-off harnesses under [tmp](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp)
- [legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js)
- unrelated tracked or untracked worktree state outside this signoff slice

## 12. Explicit untouched-logic statement

In this pass:

- no behavior patch was made
- no Bio helper logic was changed
- no combat logic was changed
- no brute logic was changed
- no file deletion was performed

## 13. Final signoff verdict

**not yet signed off**

Single next blocker:

- a broader ordinary full-4-crystal accuracy issue still exists for non-`CUSTOM` attackers, now confirmed by both fresh maul truth packs

Single next best verification step:

- none beyond truth collection; coverage is already sufficient for signoff judgment
- the next step should be diagnosis of the shared ordinary full-4-crystal attacker-family mismatch, starting from the overlapping bad defenders (`DL Dual Rift Bio`, `SG1 Double Maul Droid`, `DL Core/Rift Bio`) across `CUSTOM_CSTAFF_A4` and both maul attackers
