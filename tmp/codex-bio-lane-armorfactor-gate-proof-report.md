# codex bio lane armorfactor gate proof report

## 1. Goal of this pass

Test the smallest next temp-only split after the broad `def.armorFactor` mitigation proof:

- keep the same per-weapon mitigation source swap
- but apply it only for attacker-side actions
- and only in the Bio-defender lane

This is proof only. No tracked behavior patch was made.

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-final-v4-maul-signoff-report.md`
- `tmp/codex-ordinary-full4-mismatch-diagnosis-report.md`
- `tmp/codex-applied-damage-trace-proof-report.md`
- `tmp/codex-per-weapon-armorfactor-toggle-proof-report.md`
- `legacy-sim-v1.0.4-clean.js`
  - `attemptWeapon(...)`
  - `doAction(...)`
- truth files used:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 3. Exact temp files created

- `./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js`
- `./tmp/codex-applied-damage-trace-proof.bio-lane.json`
- replay outputs under `./results/replay/` tagged with `codex-biolane-proof-*`

## 4. Exact gate condition used

Temp-only gate inside `attemptWeapon(...)`:

```js
const useAttackerBioLaneArmorFactor =
  cfg.armorApply === 'per_weapon' &&
  att &&
  att.name === 'Attacker' &&
  def &&
  (def.name === 'DL Dual Rift Bio' || def.name === 'DL Core/Rift Bio');
```

Then:

```js
useAttackerBioLaneArmorFactor
  ? def.armorFactor
  : armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)
```

## 5. Whether the gate was structural or exact-label based

It was **exact-label based**, not structural.

Reason:

- the ordinary runtime objects available in `attemptWeapon(...)` do not expose a clean always-on defender misc-item identity field without adding more temp plumbing
- exact defender labels were the narrowest practical proof gate for this pass

## 6. Exact commands run

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js
node --check ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js
node --check ./tmp/codex-applied-damage-trace-proof.js
node ./tmp/codex-applied-damage-trace-proof.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js > ./tmp/codex-applied-damage-trace-proof.bio-lane.json

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-biolane-proof-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js > ./tmp/codex-biolane-proof-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-biolane-proof-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js > ./tmp/codex-biolane-proof-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-biolane-proof-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js > ./tmp/codex-biolane-proof-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-biolane-proof-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-bio-lane.js > ./tmp/codex-biolane-proof-maul-sg1.log 2>&1
```

## 7. Compact before/after tables for the targeted rows

### Event-level trace check

The temp trace harness confirmed the exact-label gate worked **inside the harness**:

| Matchup | Example attacker event | Baseline post/app | Bio-gate post/app |
| --- | --- | --- | --- |
| `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio` | A turn1 w1 | `105/105` | `107/107` |
| `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio` | A turn2(ret) w1 | `105/105` | `107/107` |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid` | A turn1 w1 | `103/103` | `103/103` |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout` | A turn1(ret) w2 | `105/105` | `105/105` |

So the intended split behavior is correct in the temp trace harness:

- Bio rows moved
- `SG1 Double Maul Droid` stayed unchanged
- `DL Rift/Bombs Scout` stayed unchanged

### Actual replay-compare rows

However, on the actual replay-compare runs used for verification, the Bio-lane gated temp sim produced the **same row results as baseline**.

| Attacker | Defender | Baseline win Δ | Broad toggle win Δ | Bio-gate win Δ |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | -0.04 | -0.92 |
| `CUSTOM` | DL Core/Rift Bio | -2.99 | -2.22 | -2.99 |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +1.84 | +0.51 |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | -3.08 | -5.93 |
| `CUSTOM_CSTAFF_A4` | DL Core/Rift Bio | -5.79 | -3.02 | -5.79 |
| `CUSTOM_CSTAFF_A4` | DL Rift/Bombs Scout | +0.20 | n/a | +0.20 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Dual Rift Bio | -4.80 | -2.68 | -4.80 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | -1.61 | -3.85 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | -4.56 | -4.58 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Dual Rift Bio | -5.74 | -3.27 | -5.74 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | -0.82 | -3.02 |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Double Maul Droid | -4.57 | -4.56 | -4.57 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | +2.57 | -0.02 |

## 8. One control-row comparison

Requested healthy control:

| Attacker | Defender | Baseline win Δ | Broad toggle win Δ | Bio-gate win Δ |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | +2.57 | -0.02 |

This is good in one sense:

- the Bio-only gate avoids the broad-toggle scout overshoot

But it does so because the replay-compare behavior stayed at baseline rather than because it delivered a successful narrow fix.

## 9. Whether the Bio-only gate is materially safer than the broad toggle

On replay outputs: yes, but only trivially.

- It is safer than the broad toggle because it does **not** overshoot the healthy control row.
- But it also does **not** preserve the desired Bio-row improvement in the replay-compare results.

So this is **not** a real validated safer fix yet. It is only a non-activating proof gate in the actual verification flow.

## 10. Whether CUSTOM stayed close to baseline row-by-row

Yes.

For the three requested `CUSTOM` rows, the Bio-only gate stayed identical to baseline:

- `DL Dual Rift Bio`: `-0.92`
- `DL Core/Rift Bio`: `-2.99`
- `DL Rift/Bombs Scout`: `+0.51`

That confirms there was no broad collateral effect, but also no usable improvement.

## 11. Whether the evidence now supports a narrowly scoped tracked patch

No.

Why not:

1. The exact-label gate worked in the local temp trace harness.
2. But the same gate did not carry through to the actual replay-compare verification rows.
3. That means this proof is not strong enough to justify a tracked patch on the current gating signal.

## 12. Whether `SG1 Double Maul Droid` should be split off as a separate lane

Yes.

That was already likely from the prior proof, and this pass does not change it.

- the broad toggle barely helped the droid row for maul attackers
- the Bio-only gate leaves it unchanged
- the droid row still behaves like a separate second issue

## 13. Best explanation now

The broad `def.armorFactor` swap is still real at the event level, but the narrow exact-label Bio gate is not a sufficient patch proof because:

- it is exact-label based, not structural
- and in the actual replay-compare flow it did not produce the intended row changes

That leaves one clear blocker:

- we still need a **reliable runtime structural gate** for the Bio-defender lane in the actual ordinary replay path, or a different narrower split that does not depend on exact defender labels

## 14. Explicit no-change statement

- No tracked behavior patch was made in this pass.
- No file deletion happened in this pass.
- `brute-sim-v1.4.6.js` was not changed.

