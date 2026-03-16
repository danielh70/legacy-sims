# CUSTOM vs DL Dual Rift Bio replay calibration

Tracked source edits in this pass: none.

Replay JSON outputs were saved under `./results/replay/` with `codex-dual-rift-*` tags.

Truth row for `CUSTOM` vs `DL Dual Rift Bio`: `winPct=49.60`, `avgTurns=11.3621`.

## Exact commands run

1. Baseline focused replay

```bash
env LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-dual-rift-baseline' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

2. Shared-skill sweep: `LEGACY_SHARED_SKILL=none`

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 \
LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 \
LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-shared-none' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

3. Shared-skill sweep: `LEGACY_SHARED_SKILL=same_type`

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_REPLAY_TRIALS=200000 \
LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 \
LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-shared-same-type' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

4. Shared-skill sweep: `LEGACY_SHARED_SKILL=gun_same_type`

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='gun_same_type' LEGACY_REPLAY_TRIALS=200000 \
LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 \
LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-shared-gun-same-type' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

5. Stop-on-kill sweep on best shared-skill candidate: `LEGACY_ACTION_STOP_ON_KILL=0`

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=0 \
LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-shared-same-type-stop-0' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

6. Stop-on-kill sweep on best shared-skill candidate: `LEGACY_ACTION_STOP_ON_KILL=1`

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-shared-same-type-stop-1' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

7. Control matchup with best candidate settings

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Gun Sniper Mix' \
LEGACY_REPLAY_TAG='codex-dual-rift-control-gun-sniper-mix-best' \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js
```

8. Debug replay, best candidate (`200` trials, trace and roll dump logged to `./tmp`)

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='same_type' LEGACY_ACTION_STOP_ON_KILL=1 \
LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single \
LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' \
LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' LEGACY_REPLAY_TAG='codex-dual-rift-debug-best' \
LEGACY_REPLAY_DEBUG_IDENTITY=1 LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' \
LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=5 LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 \
LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dual-rift-debug-best.log 2>&1
```

9. Debug replay, worst candidate (`200` trials, trace and roll dump logged to `./tmp`)

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='gun_same_type' LEGACY_REPLAY_TRIALS=200 \
LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 \
LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' \
LEGACY_REPLAY_TAG='codex-dual-rift-debug-worst' LEGACY_REPLAY_DEBUG_IDENTITY=1 \
LEGACY_REPLAY_DEBUG_MATCHUPS='CUSTOM|DL Dual Rift Bio' LEGACY_REPLAY_DEBUG_TRACE_FIGHTS=5 \
LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS=2 LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS=12 \
LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES=1200 \
node ./tools/legacy-truth-replay-compare.js \
./tmp/legacy-truth-current-attacker-vs-meta.json \
./legacy-sim-v1.0.4-clean.js > ./tmp/codex-dual-rift-debug-worst.log 2>&1
```

## DL Dual Rift Bio sweep table

| Case | Settings | Sim win% | win% delta | Sim avgTurns | avgTurns delta |
| --- | --- | ---: | ---: | ---: | ---: |
| Baseline | default env | 56.4265 | +6.83 | 11.4938 | +0.1317 |
| Shared none | `SHARED_HIT=1`, `SHARED_SKILL=none` | 55.9805 | +6.38 | 11.4219 | +0.0598 |
| Shared same_type | `SHARED_HIT=1`, `SHARED_SKILL=same_type` | 52.5860 | +2.99 | 11.5163 | +0.1542 |
| Shared gun_same_type | `SHARED_HIT=1`, `SHARED_SKILL=gun_same_type` | 57.2315 | +7.63 | 11.3031 | -0.0590 |
| same_type + stop=0 | `SHARED_HIT=1`, `SHARED_SKILL=same_type`, `STOP=0` | 52.5860 | +2.99 | 11.5163 | +0.1542 |
| same_type + stop=1 | `SHARED_HIT=1`, `SHARED_SKILL=same_type`, `STOP=1` | 52.3095 | +2.71 | 11.5203 | +0.1582 |

## Best, worst, and control

- Closest setting for `DL Dual Rift Bio`: `LEGACY_SHARED_HIT=1`, `LEGACY_SHARED_SKILL=same_type`, `LEGACY_ACTION_STOP_ON_KILL=1`.
- Why: it reduced win% delta from baseline `+6.83` to `+2.71`. `avgTurns` stayed slightly high at `+0.1582`.
- Worst setting for `DL Dual Rift Bio`: `LEGACY_SHARED_HIT=1`, `LEGACY_SHARED_SKILL=gun_same_type` with `+7.63` win% delta.
- `stop_on_kill` was secondary: moving from `same_type + stop=0` to `same_type + stop=1` changed win% delta by only `-0.28`, while `avgTurns` delta moved slightly away from truth (`+0.1542` to `+0.1582`).
- Control matchup under the best target setting: `CUSTOM` vs `DL Gun Sniper Mix` landed at `sim win%=56.6240`, `sim avgTurns=9.1619` against truth `65.85`, `9.1649`, for deltas `-9.23` win% and `-0.0030` avgTurns.

## Debug replay evidence

- `./tmp/codex-dual-rift-debug-best.log` and `./tmp/codex-dual-rift-debug-worst.log` both report `identityMatch: true`. This does not look like a payload identity mismatch.
- Best debug active flags: `sharedHit=true`, `sharedSkillMode=same_type`, `actionStopOnKill=true`.
- Worst debug active flags: `sharedHit=true`, `sharedSkillMode=gun_same_type`, `actionStopOnKill=false`.
- Best debug roll dump shows the attacker using one shared melee skill roll across both weapons:
  - `RD SKILL_SHARED ... A->D(ret) ... note=sharedSkill`
  - followed by forced shared usage on `w1(Reaper Axe)` and `w2(Crystal Maul)`.
- Worst debug roll dump shows the attacker using separate skill rolls per weapon in the same action:
  - `RD SKILL ... A->D(ret) w1(Reaper Axe)`
  - `RD SKILL ... A->D(ret) w2(Crystal Maul)`
- This is the clearest observed behavioral difference between the better and worse settings.

## Assessment

- Evidence points more toward shared-skill behavior than stop-on-kill behavior.
- A code patch is not recommended yet.
- Reason: `sharedSkillMode` materially changes the target mismatch, but the best target setting still leaves a large control mismatch on `DL Gun Sniper Mix`. That supports more inspection/instrumentation before any logic change.
- If a patch becomes justified later, inspect `doAction()` / `attemptWeapon()` shared-skill setup and consumption in `./legacy-sim-v1.0.4-clean.js` around lines `3998-4134` first.
- Parity-sensitive mirror to inspect alongside it: `doActionFast()` / `attemptWeaponFast()` shared-skill cache logic in `./brute-sim-v1.4.6.js` around lines `1245-1351`.

## Summary

- No tracked source files were edited.
- Baseline `DL Dual Rift Bio` mismatch was `+6.83` win% and `+0.1317` avgTurns.
- `LEGACY_SHARED_HIT=1` with `LEGACY_SHARED_SKILL=same_type` was the only strong improvement, reducing win% delta to `+2.99`.
- `LEGACY_ACTION_STOP_ON_KILL=1` improved the target only slightly further, from `+2.99` to `+2.71` win% delta.
- `LEGACY_SHARED_SKILL=gun_same_type` was the worst tested setting at `+7.63` win% delta.
- The control matchup under the best target setting still missed badly on win%: `-9.23` vs `DL Gun Sniper Mix`.
- Debug logs show identity parity with truth and strongly suggest the main pivot is shared-skill caching across the attacker's mixed melee pair, not stop-on-kill.
- Recommendation: do not patch yet; inspect shared-skill handling first if a later patch becomes justified.
