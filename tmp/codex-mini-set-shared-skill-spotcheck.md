# Mini-set shared-skill spot-check

Tracked source edits in this pass: none.

Note: `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` still contain the previously added diagnostic override patch from the prior pass. I did not modify tracked source again here.

## Exact commands run

```bash
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Reaper/Maul Orphic Bio,DL Gun Sniper Mix,DL Gun Blade Recon,DL Gun Blade Bio,DL Rift/Bombs Scout,SG1 Rift/Bombs Bio,SG1 Double Maul Droid,HF Scythe Pair' LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TAG='codex-mini-set-caseA-baseline-none' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
```

```bash
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Reaper/Maul Orphic Bio,DL Gun Sniper Mix,DL Gun Blade Recon,DL Gun Blade Bio,DL Rift/Bombs Scout,SG1 Rift/Bombs Bio,SG1 Double Maul Droid,HF Scythe Pair' LEGACY_SHARED_SKILL='same_type' LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE='broad' LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE='off' LEGACY_REPLAY_TAG='codex-mini-set-caseB-attacker-broad-def-off' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js
```

## Per-defender results

| Defender | Truth win% | Baseline dWin% | Case B dWin% | Case B vs baseline |
| --- | ---: | ---: | ---: | --- |
| DL Dual Rift Bio | 49.60 | +6.41 | +1.03 | improved |
| DL Core/Rift Bio | 43.72 | +3.82 | -0.36 | improved |
| DL Reaper/Maul Orphic Bio | 52.49 | +3.15 | -2.92 | improved |
| DL Gun Sniper Mix | 65.85 | -0.08 | -5.21 | worsened |
| DL Gun Blade Recon | 54.80 | -0.76 | -6.80 | worsened |
| DL Gun Blade Bio | 54.73 | +0.34 | -5.70 | worsened |
| DL Rift/Bombs Scout | 56.69 | +0.43 | -4.90 | worsened |
| SG1 Rift/Bombs Bio | 46.61 | +2.44 | -2.33 | improved |
| SG1 Double Maul Droid | 88.05 | -3.14 | -9.36 | worsened |
| HF Scythe Pair | 66.42 | -1.04 | -5.53 | worsened |

## Mini-set summary

| Case | meanAbsΔwin | worstAbsΔwin | worst defender | count improved | count worsened |
| --- | ---: | ---: | --- | ---: | ---: |
| A baseline | 2.16 | 6.41 | DL Dual Rift Bio | 6 | 4 |
| B attacker-only broad | 4.41 | 9.36 | SG1 Double Maul Droid | 4 | 6 |

Count interpretation:

- `count improved` / `count worsened` are relative to the other case on absolute win% delta.
- Baseline beat case B on 6 of 10 defenders.
- Case B beat baseline on 4 of 10 defenders.

## Family notes

Bio/rift family defenders:

- Clear gains on the core target lane:
  - `DL Dual Rift Bio`: `+6.41 -> +1.03`
  - `DL Core/Rift Bio`: `+3.82 -> -0.36`
  - `DL Reaper/Maul Orphic Bio`: `+3.15 -> -2.92`
  - `SG1 Rift/Bombs Bio`: `+2.44 -> -2.33`
- But the pattern is not uniformly “rift/bio good”:
  - `DL Rift/Bombs Scout` worsened sharply: `+0.43 -> -4.90`

Gun/ranged defenders:

- All clearly worsened under case B:
  - `DL Gun Sniper Mix`: `-0.08 -> -5.21`
  - `DL Gun Blade Recon`: `-0.76 -> -6.80`
  - `DL Gun Blade Bio`: `+0.34 -> -5.70`
- The regression is not confined to gun-tagged defenders:
  - `HF Scythe Pair` worsened from `-1.04` to `-5.53`
  - `SG1 Double Maul Droid` worsened from `-3.14` to `-9.36`

## Conclusion

Attacker-only broad shared-skill is not broadly promising enough to justify a real patch now.

Why:

- It improves the original target lane and a few related bio/rift matchups.
- But across this wider 10-defender curated mini-set it is directionally worse overall:
  - `meanAbsΔwin` degrades from `2.16` to `4.41`
  - `worstAbsΔwin` degrades from `6.41` to `9.36`
  - only `4/10` defenders improve
  - `6/10` defenders worsen

This now looks more like a narrower pair/family-specific rule than a broadly correct attacker-only shared-skill rule.

## Recommendation

Recommendation: `B) do one last tiny diagnostic`

Reason:

- The evidence is too negative for `A) apply a real behavior patch now`.
- It is also too strong to say `C) shared-skill is not the main fix` in the original dual-rift lane, because it clearly matters there.
- The most targeted next step would be a final diagnostic that narrows the effect from “attacker broad melee sharing” to a more specific attacker pair/family rule, instead of patching all attacker broad sharing.
