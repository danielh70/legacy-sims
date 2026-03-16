# codex-post-patch-v4-curated-verification-report

## 1. Goal of this pass

Run a targeted post-patch verification sweep against the curated v4 defender set using 2-3 high-value attackers, compare against existing in-game truth where available, identify exactly what truth is still missing, and produce a later cleanup inventory without deleting anything.

No new behavior patch was made in this pass.

## 2. Exact files inspected

- [AGENTS.md](/Users/danielhook/Desktop/code_projects/legacy_sims/AGENTS.md)
- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [codex-represented-build-stat-stack-patch-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-report.md)
- [codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [codex-mixed-slot-live-build-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-report.md)
- [codex-partial-crystal-stack-localization-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-partial-crystal-stack-localization-report.md)
- [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js)
- [tools/legacy-truth-replay-compare.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-replay-compare.js)
- [tools/legacy-truth-collector-v0.1.1.user.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tools/legacy-truth-collector-v0.1.1.user.js)
- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [legacy-truth-meta16-two-attackers.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-meta16-two-attackers.json)
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json)
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json)

## 3. Exact commands run

```sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tools/legacy-truth-replay-compare.js
mkdir -p ./tmp/replay-v4-post-patch
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-post-patch LEGACY_REPLAY_TAG='codex-v4-custom-full15' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-v4-custom-full15.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-post-patch LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Core/Rift Dodge,DL Dual Rift Bio,DL Gun Blade Bio,DL Gun Blade Recon,DL Gun Sniper Mix,DL Maul/Core Orphic,HF Scythe Pair,SG1 Double Maul Droid,SG1 Rift/Bombs Bio,SG1 Split Bombs T2,SG1 Void/Reaper" LEGACY_REPLAY_TAG='codex-v4-cstaff-overlap12' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-meta16-two-attackers.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-v4-cstaff-overlap12.log 2>&1
```

## 4. Chosen attacker builds and why

| Attacker | Why chosen |
| --- | --- |
| REPRESENTED_LIVE_MIXED_SLOT | direct represented-build path that motivated the patch; currently no in-game truth rows in repo |
| CUSTOM | uniform-slot regression guard with full v4 truth already present in tmp current-meta truth |
| CUSTOM_CSTAFF_A4 | distinct second weapon skill family that stresses shared stat-stack behavior differently |

Notes:

- REPRESENTED_LIVE_MIXED_SLOT is the exact represented-build path that motivated the patch.
- CUSTOM is the best ordinary uniform-slot regression guard because repo truth already covers all 15 v4 defenders for it.
- CUSTOM_CSTAFF_A4 is distinct enough to stress the stat stack path through a different second weapon family.

## 5. Exact curated defender source used

- [data/legacy-defenders-meta-v4-curated.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defenders-meta-v4-curated.js)
- curated v4 defender count: **15**

Curated defenders:

- DL Rift/Bombs Scout
- SG1 Rift/Bombs Bio
- DL Maul/Core Orphic
- DL Reaper/Maul Orphic Bio
- Ashley Build
- HF Scythe Pair
- DL Core/Rift Bio
- DL Gun Blade Recon
- DL Gun Blade Bio
- SG1 Split Bombs T2
- SG1 Void/Reaper
- SG1 Double Maul Droid
- DL Core/Rift Dodge
- DL Gun Sniper Mix
- DL Dual Rift Bio

## 6. Truth coverage table by attacker

| Attacker | Why chosen | Covered truth rows | Missing truth rows | Notes |
| --- | --- | --- | --- | --- |
| REPRESENTED_LIVE_MIXED_SLOT | represented mixed-slot live-style path | 0/15 | 15 | browser truth collector currently blocked by 4-crystal slot schema |
| CUSTOM | uniform-slot regression guard | 15/15 | 0 | truth-complete on v4 |
| CUSTOM_CSTAFF_A4 | distinct Core Staff variant | 12/15 | 3 | DL Rift/Bombs Scout, DL Reaper/Maul Orphic Bio, DL Core/Rift Bio |

## 7. Accuracy summary table by attacker for covered rows

| Attacker | Truth file | Compared rows | Missing-truth rows | meanAbsΔwin | meanAbsΔavgT | worstAbsΔwin | Worst offender(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REPRESENTED_LIVE_MIXED_SLOT | none | 0 | 15 | n/a | n/a | n/a | no in-game truth in repo |
| CUSTOM | tmp/legacy-truth-current-attacker-vs-meta.json | 15 | 0 | 1.60 | 0.1014 | 3.23 | SG1 Double Maul Droid |
| CUSTOM_CSTAFF_A4 | legacy-truth-meta16-two-attackers.json | 9 usable / 12 truth-present | 3 | 3.05 | 0.1514 | 5.93 | DL Dual Rift Bio |

## 8. Any regression rows worth attention

| Attacker | Check type | Status | Summary |
| --- | --- | --- | --- |
| CUSTOM | uniform-slot full-v4 truth check | no represented-build gating should apply | meanAbsΔwin=1.60, worst=3.23 (SG1 Double Maul Droid) |
| CUSTOM_CSTAFF_A4 | uniform-slot partial-v4 truth check | 3 truth rows stale/unusable due exact replay identity mismatch | meanAbsΔwin=3.05 on 9 usable rows |

Most notable current covered-row offenders:

- CUSTOM: SG1 Double Maul Droid at 3.23 absΔwin
- CUSTOM_CSTAFF_A4: DL Dual Rift Bio at 5.93 absΔwin

Important interpretation:

- The represented-build patch is narrowly gated to explicit per-part slot-count builds.
- CUSTOM and CUSTOM_CSTAFF_A4 are ordinary uniform-slot truth paths.
- CUSTOM still reproduces the pre-existing post-Rule-B current-meta accuracy scale (meanAbsΔwin=1.60), which is consistent with “no broad regression introduced.”

## 9. Exact missing-truth rows

### A. Represented mixed-slot live-style attacker

Existing in-game truth rows in repo:

- none

Missing truth rows:

- REPRESENTED_LIVE_MIXED_SLOT vs DL Rift/Bombs Scout
- REPRESENTED_LIVE_MIXED_SLOT vs SG1 Rift/Bombs Bio
- REPRESENTED_LIVE_MIXED_SLOT vs DL Maul/Core Orphic
- REPRESENTED_LIVE_MIXED_SLOT vs DL Reaper/Maul Orphic Bio
- REPRESENTED_LIVE_MIXED_SLOT vs Ashley Build
- REPRESENTED_LIVE_MIXED_SLOT vs HF Scythe Pair
- REPRESENTED_LIVE_MIXED_SLOT vs DL Core/Rift Bio
- REPRESENTED_LIVE_MIXED_SLOT vs DL Gun Blade Recon
- REPRESENTED_LIVE_MIXED_SLOT vs DL Gun Blade Bio
- REPRESENTED_LIVE_MIXED_SLOT vs SG1 Split Bombs T2
- REPRESENTED_LIVE_MIXED_SLOT vs SG1 Void/Reaper
- REPRESENTED_LIVE_MIXED_SLOT vs SG1 Double Maul Droid
- REPRESENTED_LIVE_MIXED_SLOT vs DL Core/Rift Dodge
- REPRESENTED_LIVE_MIXED_SLOT vs DL Gun Sniper Mix
- REPRESENTED_LIVE_MIXED_SLOT vs DL Dual Rift Bio

Current blocker:

- legacy-truth-collector-v0.1.1.user.js still requires exactly 4 crystal entries per slot in normalizeLegacyExportSlot(...)
- that means it cannot currently import/export the represented live attacker with 3x weapon/misc crystals
- so **truth collection for the represented mixed-slot attacker is currently blocked by collector schema**, not by the simulator

### B. CUSTOM

Missing truth rows:

- none on curated v4

### C. CUSTOM_CSTAFF_A4

Missing truth rows (never covered in current repo truth):

- CUSTOM_CSTAFF_A4 vs DL Rift/Bombs Scout
- CUSTOM_CSTAFF_A4 vs DL Reaper/Maul Orphic Bio
- CUSTOM_CSTAFF_A4 vs DL Core/Rift Bio

Truth rows present but currently unusable due exact replay identity mismatch:

- CUSTOM_CSTAFF_A4 vs DL Gun Blade Bio
- CUSTOM_CSTAFF_A4 vs DL Gun Sniper Mix
- CUSTOM_CSTAFF_A4 vs SG1 Double Maul Droid

Net additional truth still needed for full curated-v4 signoff on this attacker:

- 6 rows total

## 10. Exact truth-collector commands the user should run next, if needed

### A. Practical next truth collection that is already unblocked

Use this browser-console command to recollect the 6 missing/stale CUSTOM_CSTAFF_A4 rows:

```js
await LegacyTruthCollector.runLegacyExport({
  "meta": {
    "sourceSimFile": "legacy-sim-v1.0.4-clean.js",
    "attackerSource": "manual-export",
    "attackerLabel": "CUSTOM_CSTAFF_A4",
    "attackerAttackType": "normal",
    "crystalSlots": 4
  },
  "attackers": [
    {
      "name": "CUSTOM_CSTAFF_A4",
      "build": {
        "stats": {
          "level": 80,
          "hp": 650,
          "speed": 60,
          "dodge": 57,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystals": [
            "Abyss Crystal",
            "Abyss Crystal",
            "Abyss Crystal",
            "Abyss Crystal"
          ],
          "upgrades": []
        },
        "weapon1": {
          "name": "Reaper Axe",
          "crystals": [
            "Amulet Crystal",
            "Amulet Crystal",
            "Amulet Crystal",
            "Amulet Crystal"
          ],
          "upgrades": []
        },
        "weapon2": {
          "name": "Core Staff",
          "crystals": [
            "Amulet Crystal",
            "Amulet Crystal",
            "Amulet Crystal",
            "Amulet Crystal"
          ],
          "upgrades": []
        },
        "misc1": {
          "name": "Bio Spinal Enhancer",
          "crystals": [
            "Perfect Pink Crystal",
            "Perfect Pink Crystal",
            "Perfect Pink Crystal",
            "Perfect Pink Crystal"
          ],
          "upgrades": []
        },
        "misc2": {
          "name": "Bio Spinal Enhancer",
          "crystals": [
            "Perfect Orange Crystal",
            "Perfect Orange Crystal",
            "Perfect Orange Crystal",
            "Perfect Orange Crystal"
          ],
          "upgrades": []
        },
        "attackType": "normal"
      }
    }
  ],
  "defenders": [
    {
      "name": "DL Core/Rift Bio",
      "build": {
        "stats": {
          "level": 91,
          "hp": 865,
          "speed": 60,
          "dodge": 14,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystal": "Abyss Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Core Staff",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "weapon2": {
          "name": "Rift Gun",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "misc1": {
          "name": "Bio Spinal Enhancer",
          "crystal": "Perfect Pink Crystal",
          "upgrades": []
        },
        "misc2": {
          "name": "Bio Spinal Enhancer",
          "crystal": "Perfect Pink Crystal",
          "upgrades": []
        },
        "attackType": "normal"
      }
    },
    {
      "name": "DL Gun Blade Bio",
      "build": {
        "stats": {
          "level": 92,
          "hp": 650,
          "speed": 60,
          "dodge": 57,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystal": "Abyss Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Rift Gun",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "weapon2": {
          "name": "Gun Blade Mk4",
          "crystal": "Amulet Crystal",
          "upgrades": [
            "Sharpened Blade 1",
            "Faster Ammo 1"
          ]
        },
        "misc1": {
          "name": "Bio Spinal Enhancer",
          "crystal": "Perfect Green Crystal",
          "upgrades": []
        },
        "misc2": {
          "name": "Scout Drones",
          "crystal": "Perfect Green Crystal",
          "crystalCounts": {
            "Perfect Green Crystal": 3,
            "Amulet Crystal": 1
          },
          "upgrades": []
        },
        "attackType": "normal"
      }
    },
    {
      "name": "DL Gun Sniper Mix",
      "build": {
        "stats": {
          "level": 98,
          "hp": 865,
          "speed": 60,
          "dodge": 14,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystal": "Abyss Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Rift Gun",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "weapon2": {
          "name": "Double Barrel Sniper Rifle",
          "crystal": "Perfect Fire Crystal",
          "upgrades": []
        },
        "misc1": {
          "name": "Scout Drones",
          "crystal": "Amulet Crystal",
          "crystalCounts": {
            "Perfect Pink Crystal": 1,
            "Amulet Crystal": 3
          },
          "upgrades": []
        },
        "misc2": {
          "name": "Bio Spinal Enhancer",
          "crystal": "Perfect Green Crystal",
          "crystalCounts": {
            "Perfect Pink Crystal": 2,
            "Perfect Green Crystal": 2
          },
          "upgrades": []
        },
        "attackType": "normal"
      }
    },
    {
      "name": "DL Reaper/Maul Orphic Bio",
      "build": {
        "stats": {
          "level": 101,
          "hp": 650,
          "speed": 60,
          "dodge": 57,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystal": "Abyss Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Reaper Axe",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "weapon2": {
          "name": "Crystal Maul",
          "crystal": "Perfect Fire Crystal",
          "upgrades": []
        },
        "misc1": {
          "name": "Orphic Amulet",
          "crystal": "Perfect Orange Crystal",
          "upgrades": []
        },
        "misc2": {
          "name": "Bio Spinal Enhancer",
          "crystal": "Perfect Pink Crystal",
          "upgrades": []
        },
        "attackType": "normal"
      }
    },
    {
      "name": "DL Rift/Bombs Scout",
      "build": {
        "stats": {
          "level": 108,
          "hp": 865,
          "speed": 60,
          "dodge": 14,
          "accuracy": 14
        },
        "armor": {
          "name": "Dark Legion Armor",
          "crystal": "Abyss Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Rift Gun",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "weapon2": {
          "name": "Split Crystal Bombs T2",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "misc1": {
          "name": "Scout Drones",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "misc2": {
          "name": "Scout Drones",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "attackType": "normal"
      }
    },
    {
      "name": "SG1 Double Maul Droid",
      "build": {
        "stats": {
          "level": 94,
          "hp": 650,
          "speed": 60,
          "dodge": 57,
          "accuracy": 14
        },
        "armor": {
          "name": "SG1 Armor",
          "crystal": "Perfect Pink Crystal",
          "upgrades": []
        },
        "weapon1": {
          "name": "Crystal Maul",
          "crystal": "Amulet Crystal",
          "crystalCounts": {
            "Perfect Fire Crystal": 2,
            "Amulet Crystal": 2
          },
          "upgrades": []
        },
        "weapon2": {
          "name": "Crystal Maul",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "misc1": {
          "name": "Scout Drones",
          "crystal": "Amulet Crystal",
          "upgrades": []
        },
        "misc2": {
          "name": "Droid Drone",
          "crystal": "Perfect Orange Crystal",
          "upgrades": []
        },
        "attackType": "normal"
      }
    }
  ]
}, {
  repeats: 3,
  trialsText: '10,000 times',
  outputFile: 'legacy-truth-v4-custom-cstaff-gap6.json',
});
```

This covers exactly:

- DL Core/Rift Bio
- DL Gun Blade Bio
- DL Gun Sniper Mix
- DL Reaper/Maul Orphic Bio
- DL Rift/Bombs Scout
- SG1 Double Maul Droid

### B. Represented mixed-slot live-style attacker

No exact browser truth-collector command is available yet with the current collector version.

Reason:

- LegacyTruthCollector.runLegacyExport(...) currently normalizes each slot to **exactly 4 crystal entries**
- the represented live attacker needs mixed slot counts (4-slot armor, 3-slot weapons, 3-slot miscs)
- so this attacker remains a **truth-collection blocker** until the collector/export schema supports per-part slot counts or non-4 crystal entry lengths

## 11. Cleanup inventory only

No files were deleted in this pass.

### Safe later delete

- [tmp/codex-v4-custom-full15.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-v4-custom-full15.log)
- [tmp/codex-v4-cstaff-overlap12.log](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-v4-cstaff-overlap12.log)
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json)
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json)
- [tmp/codex-post-patch-v4-curated-verification-check.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-check.js)

### Keep until final signoff

- [legacy-bio-debug-handoff-2026-03-15.md](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-bio-debug-handoff-2026-03-15.md)
- [tmp/codex-represented-build-stat-stack-patch-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-stat-stack-patch-report.md)
- [tmp/codex-represented-build-patch-verify-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-represented-build-patch-verify-report.md)
- [tmp/codex-mixed-slot-live-build-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-mixed-slot-live-build-report.md)
- [tmp/codex-partial-crystal-stack-localization-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-partial-crystal-stack-localization-report.md)
- [tmp/legacy-truth-current-attacker-vs-meta.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-current-attacker-vs-meta.json)
- [legacy-truth-meta16-two-attackers.json](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-truth-meta16-two-attackers.json)
- [codex-post-patch-v4-curated-verification-report.md](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-post-patch-v4-curated-verification-report.md)

### Uncertain / review before delete

- older Bio-theory temp reports and one-off probe JSONs in tmp/ tied to the now-closed Bio helper investigation
- [tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js) until final signoff
- unrelated tracked worktree changes in [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) should be reviewed separately, not deleted blindly

## 12. Explicit no-change statement

- no files were deleted in this pass
- no new behavior patch was made in this pass
- Bio helper logic was not changed
- combat logic was not changed
- brute was not changed
- weapon display and predictedDamage work were not reopened

## 13. Final verdict

**more truth is required before final signoff**

Current state:

- one ordinary uniform-slot attacker (CUSTOM) is truth-complete on curated v4 and still sits at the expected post-Rule-B accuracy scale
- one distinct attacker (CUSTOM_CSTAFF_A4) still needs **6** refreshed rows for full curated-v4 signoff
- the represented mixed-slot live-style attacker has **0** in-repo truth rows and is currently blocked by the collector’s fixed 4-crystal-slot schema

So the repo is not yet at “all curated v4 defenders verified against in-game truth for 2-3 attackers.” The next blocker is now clear and narrow:

- collect the 6 CUSTOM_CSTAFF_A4 gap rows
- then decide whether to extend the truth collector/export path to support mixed-slot represented builds before final cleanup
