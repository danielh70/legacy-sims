# codex-lane-probe-harness-reaper-report

## Scope

Built a reusable lane-probe harness, then applied it to the active `DL reaper-first mixed-melee` lane:

- `Ashley Build`
- `DL Reaper/Maul Orphic Bio`

Controls / contrasts:

- `DL Rift/Bombs Scout`
- `DL Dual Rift Bio`
- `SG1 Split Bombs T2`

No live combat patch was landed.

## Files touched

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js` — instrumentation-only
  - Temp probe copy of `legacy-sim-v1.0.4-clean.js`
  - Added opt-in env-driven `w2` pre-refresh / predicate hooks around the `attemptWeapon(...) -> doAction(...)` defender-side path
  - Parity-sensitive surface touched only in this temp copy; live `legacy-sim-v1.0.4-clean.js` and `brute-sim-v1.4.6.js` were not changed
- `tools/codex-lane-probe-harness.js` — instrumentation-only
  - Reusable harness that runs a toggle matrix across target/control/contrast truth rows, ranks tradeoffs, and writes a compact `summary.json`
- `tmp/codex-reaper-first-lane-probe-config.js` — instrumentation-only
  - Lane-specific config for the reaper-first mixed-melee cluster
- `codex-lane-probe-harness-reaper-report.md` — report-only

## Exact commands run

```bash
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js

node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./tmp/codex-reaper-first-lane-probe-config.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-reaper-first-lane-probe-config.js > ./tmp/codex-reaper-first-lane-probe-harness.log 2>&1
node ./tools/codex-lane-probe-harness.js ./tmp/codex-reaper-first-lane-probe-config.js > ./tmp/codex-reaper-first-lane-probe-harness-fast.log 2>&1

LEGACY_SHARED_HIT=1 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-confirm LEGACY_REPLAY_TAG=codex-reaper-first-confirm-custom LEGACY_REPLAY_ATTACKERS=CUSTOM LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2" node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-confirm-custom.log 2>&1

LEGACY_SHARED_HIT=1 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-confirm LEGACY_REPLAY_TAG=codex-reaper-first-confirm-cstaff LEGACY_REPLAY_ATTACKERS=CUSTOM_CSTAFF_A4 LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2" node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-confirm-cstaff.log 2>&1

LEGACY_SHARED_HIT=1 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-confirm LEGACY_REPLAY_TAG=codex-reaper-first-confirm-maul-dl LEGACY_REPLAY_ATTACKERS=CUSTOM_MAUL_A4_DL_ABYSS LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2" node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-confirm-maul-dl.log 2>&1

LEGACY_SHARED_HIT=1 LEGACY_LANE_PROBE_W2_PRE_REFRESH=hit LEGACY_LANE_PROBE_W2_PREDICATE=defender_reaper_first_dual_melee LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-reaper-first-confirm LEGACY_REPLAY_TAG=codex-reaper-first-confirm-maul-sg1 LEGACY_REPLAY_ATTACKERS=CUSTOM_MAUL_A4_SG1_PINK LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Reaper/Maul Orphic Bio,DL Rift/Bombs Scout,DL Dual Rift Bio,SG1 Split Bombs T2" node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js > ./tmp/codex-reaper-first-confirm-maul-sg1.log 2>&1

rg -n "Reaper Axe|Crystal Maul|Core Staff|Dark Legion Armor|Orphic|Ashley Build" data/legacy-defenders.js data/legacy-defs.js
sed -n '118,150p' ./data/legacy-defenders.js
git status --short
```

## Reusable harness

`tools/codex-lane-probe-harness.js` takes a small config module and does one bounded scoring pass:

- input: truth files, attackers, target defenders, control defenders, contrast defenders, toggle matrix
- execution: runs every toggle across the supplied truth rows and saves per-toggle replay JSON under `tmp/lane-probe-harness/...`
- scoring:
  - `targetGain = mean(abs(base dWin) - abs(toggle dWin))`
  - `controlMove = mean(abs(toggle dWin - base dWin))`
  - `contrastMove = mean(abs(toggle dWin - base dWin))`
  - `defaultReachCount` from `data/legacy-defenders.js`
  - `tradeoffScore = targetGain - controlMove - contrastMove - defaultReachPenalty`
- output:
  - ranked console table
  - `summary.json` with per-row movement details

How to reuse later:

1. Copy `tmp/codex-reaper-first-lane-probe-config.js` to a new lane config.
2. Edit `truthCases`, `targetDefenders`, `controlDefenders`, `contrastDefenders`, and `toggles`.
3. Run `node ./tools/codex-lane-probe-harness.js ./tmp/<your-config>.js`.

The temp sim also supports `defender_exact_signature` plus `analysisBound: true` for exact-shell analysis bounds, but no exact-shell live patching was used here.

## Toggle matrix tested

- `off`
- `w2gate_defender_global`
- `split_defender_global`
- `refresh_hit_dual_melee`
- `refresh_skill_dual_melee`
- `split_defender_dual_melee`
- `refresh_hit_reaper_first`
- `refresh_skill_reaper_first`
- `refresh_full_reaper_first`
- `refresh_hit_reaper_first_w2gate`
- `refresh_full_reaper_first_w2gate`
- `split_reaper_first_w2gate`

## Ranked score table

50k screening pass from `tmp/lane-probe-harness/reaper-first-mixed-melee-1773630299800/summary.json`:

| toggle | target gain | control move | contrast move | default reach | score | read |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `refresh_hit_reaper_first` | 0.26 | 0.00 | 0.00 | 0 | 0.26 | best tradeoff |
| `refresh_full_reaper_first` | 0.26 | 0.00 | 0.00 | 0 | 0.26 | identical to hit-only |
| `off` | 0.00 | 0.00 | 0.00 | 0 | 0.00 | baseline |
| `refresh_skill_reaper_first` | 0.00 | 0.00 | 0.00 | 0 | 0.00 | inert |
| `split_reaper_first_w2gate` | 0.40 | 0.27 | 0.29 | 0 | -0.15 | target help, too much spill |
| `refresh_hit_dual_melee` | 0.26 | 0.00 | 0.00 | 4 | -0.15 | same signal, broader reach |
| `refresh_hit_reaper_first_w2gate` | 0.31 | 0.26 | 0.23 | 0 | -0.18 | extra gate hurts tradeoff |
| `refresh_full_reaper_first_w2gate` | 0.31 | 0.26 | 0.23 | 0 | -0.18 | same as hit+gate |
| `refresh_skill_dual_melee` | 0.00 | 0.00 | 0.00 | 4 | -0.40 | inert, broader reach |
| `split_defender_dual_melee` | 0.44 | 0.21 | 0.30 | 4 | -0.46 | strongest raw mover, too broad |
| `split_defender_global` | 0.44 | 0.15 | 0.37 | 15 | -1.57 | global collateral |
| `w2gate_defender_global` | 0.00 | 0.24 | 0.24 | 15 | -1.99 | rejected |

## Best-tradeoff toggle

Best tradeoff: `refresh_hit_reaper_first`

Why it won:

- same target gain as the broader `refresh_hit_dual_melee`
- zero measured control movement
- zero measured contrast movement
- zero live default-defender reach
- `refresh_full_reaper_first` matched it exactly, which means the moving state is `shared-hit` refresh, not shared-skill refresh

## 200k confirmation of the best toggle

Confirmed branch:

- defender-side `w2` shared-hit refresh before weapon 2
- predicate-scoped to `defender_reaper_first_dual_melee`

200k base vs confirmed toggle, win-delta only:

| attacker | defender | base dWin | toggle dWin | improvement |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | `Ashley Build` | 2.71 | 2.88 | -0.17 |
| `CUSTOM_CSTAFF_A4` | `Ashley Build` | 4.60 | 3.77 | 0.83 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `Ashley Build` | 2.65 | 2.49 | 0.16 |
| `CUSTOM_MAUL_A4_SG1_PINK` | `Ashley Build` | 2.64 | 2.43 | 0.21 |
| `CUSTOM` | `DL Reaper/Maul Orphic Bio` | 3.15 | 3.36 | -0.21 |
| `CUSTOM_CSTAFF_A4` | `DL Reaper/Maul Orphic Bio` | 3.45 | 2.40 | 1.05 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `DL Reaper/Maul Orphic Bio` | 0.63 | 0.57 | 0.06 |
| `CUSTOM_MAUL_A4_SG1_PINK` | `DL Reaper/Maul Orphic Bio` | 2.61 | 2.50 | 0.11 |

Confirmation read:

- 6 of 8 target rows improved
- 2 of 8 target rows regressed
- both regressions were the `CUSTOM` attacker
- the strongest gains remained `CUSTOM_CSTAFF_A4`

This confirms the branch is real, but still attacker-build-sensitive inside the lane.

## Control / contrast summary

For the confirmed best toggle, these rows stayed flat at both the 50k harness screen and the 200k confirmation:

- `DL Rift/Bombs Scout`
- `DL Dual Rift Bio`
- `SG1 Split Bombs T2`

That is materially cleaner than the split-action proofs, which moved both scout and bombs contrasts.

## Broader sanity note

`data/legacy-defenders.js` has no live `Reaper Axe`-first dual-melee defender rows. The only direct analogs are commented-out examples:

- `Reaper Axe Build 1`
- `Reaper Axe Build 2`

So the best toggle has `defaultReachCount = 0`, which is good for collateral safety, but it also means there is no live default-defender reach to validate against before truth expansion.

## Patch readiness

No toggle is patch-ready.

Why not:

- the winning branch still regressed `CUSTOM | Ashley Build` and `CUSTOM | DL Reaper/Maul Orphic Bio`
- the lane has zero live default-defender reach
- the cleaner proof is still a policy predicate over a parked curated shell family, not a root-cause fix in shared combat logic

## Single best next narrow branch to test

Best next branch:

- `defender_reaper_first_dual_melee` `w2` shared-hit refresh
- specifically, explain why the `CUSTOM` attacker regresses while the other three attackers improve under the same defender-side refresh

That is the cleanest remaining narrow branch because:

- it isolates the only live-moving state to `shared-hit`
- it beats every broader split/gate alternative on target-gain vs collateral
- it does not rely on exact labels or exact-shell live patching

## Notes

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- `legacy-sim-v1.0.4-clean.js` was untouched.

reusable lane-probe harness built; best next branch is defender_reaper_first_dual_melee w2 shared-hit refresh
