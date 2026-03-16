# codex structural bio gate temp proof report

## 1. Goal of this pass

Add the smallest temp-only always-on defender signature needed so `attemptWeapon(...)` can see a real structural Bio-lane predicate during `legacy-truth-replay-compare.js` runs, then rerun the narrow attacker-side `def.armorFactor` mitigation proof on that structural gate.

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-applied-damage-trace-proof-report.md`
- `tmp/codex-per-weapon-armorfactor-toggle-proof-report.md`
- `tmp/codex-bio-lane-armorfactor-gate-proof-report.md`
- `tmp/codex-replay-runtime-structural-gate-report.md`
- `legacy-sim-v1.0.4-clean.js`
  - `compileCombatantFromParts(...)`
  - `attemptWeapon(...)`
  - `doAction(...)`
- `tools/legacy-truth-replay-compare.js`
  - `pageBuildToLegacyDefenderPayload(...)`
  - `createJobRunner(...)`
- truth files used:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 3. Exact temp files created

- `./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js`
- compare logs:
  - `./tmp/codex-struct-gate-base-custom.log`
  - `./tmp/codex-struct-gate-base-cstaff.log`
  - `./tmp/codex-struct-gate-base-maul-dl.log`
  - `./tmp/codex-struct-gate-base-maul-sg1.log`
  - `./tmp/codex-struct-gate-proof-custom.log`
  - `./tmp/codex-struct-gate-proof-cstaff.log`
  - `./tmp/codex-struct-gate-proof-maul-dl.log`
  - `./tmp/codex-struct-gate-proof-maul-sg1.log`

No tool file was modified in this pass.

## 4. Exact temp plumbing added

Temp-only always-on runtime signature added in `compileCombatantFromParts(...)`:

```js
c.__runtimeSig = {
  armorItem: armorV.itemName || '',
  w1Item: w1V.itemName || '',
  w2Item: w2V.itemName || '',
  m1Item: m1Eff.itemName || '',
  m2Item: m2Eff.itemName || '',
  m1Crystal: m1Eff.crystalName || '',
  m2Crystal: m2Eff.crystalName || '',
};
```

This was the only new plumbing. It is:

- temp-only
- always-on in the temp sim copy
- gameplay-structural, not replay-key based
- not dependent on `LEGACY_DIAG_ARMOR`

## 5. Exact structural gate used

Temp-only structural Bio gate inside `attemptWeapon(...)`:

```js
const sig = def && def.__runtimeSig ? def.__runtimeSig : null;
const defenderIsBioLane =
  !!sig &&
  sig.armorItem === 'Dark Legion Armor' &&
  sig.m1Item === 'Bio Spinal Enhancer' &&
  sig.m2Item === 'Bio Spinal Enhancer' &&
  sig.m1Crystal === 'Perfect Pink Crystal' &&
  sig.m2Crystal === 'Perfect Pink Crystal' &&
  ((sig.w1Item === 'Rift Gun' && sig.w2Item === 'Rift Gun') ||
    (sig.w1Item === 'Core Staff' && sig.w2Item === 'Rift Gun') ||
    (sig.w1Item === 'Rift Gun' && sig.w2Item === 'Core Staff'));
```

Mitigation swap applied only when:

- `cfg.armorApply === 'per_weapon'`
- `att.name === 'Attacker'`
- `defenderIsBioLane === true`

Then:

```js
att && att.name === 'Attacker' && defenderIsBioLane
  ? def.armorFactor
  : armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)
```

This is structural, not exact-label based.

## 6. Exact commands run

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js
node --check ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-base-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-struct-gate-base-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-base-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-struct-gate-base-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-base-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-struct-gate-base-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-base-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-struct-gate-base-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-proof-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js > ./tmp/codex-struct-gate-proof-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-proof-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js > ./tmp/codex-struct-gate-proof-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-proof-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js > ./tmp/codex-struct-gate-proof-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-struct-gate-proof-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.structural-bio-gate-proof.js > ./tmp/codex-struct-gate-proof-maul-sg1.log 2>&1
```

## 7. Compact before/after tables for the targeted rows

### Bio rows

| Attacker | Defender | Baseline win Δ | Structural gate win Δ | Improvement |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | -0.04 | +0.88 |
| `CUSTOM` | DL Core/Rift Bio | -2.99 | -2.22 | +0.77 |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | -3.08 | +2.85 |
| `CUSTOM_CSTAFF_A4` | DL Core/Rift Bio | -5.79 | -3.02 | +2.77 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Dual Rift Bio | -4.80 | -2.68 | +2.12 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | -1.61 | +2.24 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Dual Rift Bio | -5.74 | -3.27 | +2.47 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | -0.82 | +2.20 |

### Non-Bio row kept on old path

| Attacker | Defender | Baseline win Δ | Structural gate win Δ | Result |
| --- | --- | ---: | ---: | --- |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | -4.58 | unchanged |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Double Maul Droid | -4.57 | -4.57 | unchanged |

## 8. One control-row comparison

Primary scout control:

| Attacker | Defender | Baseline win Δ | Structural gate win Δ | Result |
| --- | --- | ---: | ---: | --- |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | -0.02 | flat |

Additional controls stayed flat too:

| Attacker | Defender | Baseline win Δ | Structural gate win Δ |
| --- | --- | ---: | ---: |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +0.51 |
| `CUSTOM_CSTAFF_A4` | DL Rift/Bombs Scout | +0.20 | +0.20 |

## 9. Whether the structural gate reproduces the replay-key-gate improvement

Yes.

On the rows checked here, the structural gate reproduces the same Bio-row improvements as the prior replay-key gate:

- `CUSTOM_CSTAFF_A4`: `DL Dual Rift Bio -3.08`, `DL Core/Rift Bio -3.02`
- `CUSTOM_MAUL_A4_DL_ABYSS`: `DL Dual Rift Bio -2.68`, `DL Core/Rift Bio -1.61`
- `CUSTOM_MAUL_A4_SG1_PINK`: `DL Dual Rift Bio -3.27`, `DL Core/Rift Bio -0.82`
- `CUSTOM`: `DL Dual Rift Bio -0.04`, `DL Core/Rift Bio -2.22`

That is the same targeted behavior the replay-key proof showed, but now on a gameplay-structural runtime signature instead of a synthetic replay key.

## 10. Whether CUSTOM stayed near baseline

Yes.

`CUSTOM` stayed near baseline row-by-row:

- `DL Dual Rift Bio`: improved modestly `-0.92 -> -0.04`
- `DL Core/Rift Bio`: improved `-2.99 -> -2.22`
- `DL Rift/Bombs Scout`: unchanged `+0.51 -> +0.51`

So the structural gate does not introduce the broad scout-row overshoot that the ungated toggle caused.

## 11. Whether the structural gate is materially better than replay-key gating as a patch surface

Yes.

Why:

- it does not depend on synthetic replay-key naming
- it is composed from actual compiled defender build structure
- it survives ordinary replay-compare runtime without `LEGACY_DIAG_ARMOR`
- it preserves the same targeted Bio-row help while keeping the scout controls flat

That makes it materially better than replay-key suffix matching as a candidate tracked patch surface.

## 12. Whether the evidence now supports a tracked patch

Yes, for a **narrowly scoped candidate**.

The evidence is now strong enough to justify a tracked patch candidate at this exact surface:

- `legacy-sim-v1.0.4-clean.js`
  - tiny always-on compiled defender signature in `compileCombatantFromParts(...)`
  - narrow attacker-side structural Bio gate in `attemptWeapon(...)`
  - per-weapon mitigation source swap to `def.armorFactor` only inside that gate

This does **not** justify any broader mitigation change, and it does **not** justify bundling in the `SG1 Double Maul Droid` lane.

## 13. Whether Double Maul Droid remains a separate lane

Yes.

It should remain fully split off for a later second pass:

- the structural Bio gate leaves it unchanged
- that matches the earlier diagnosis that `SG1 Double Maul Droid` is not the same lane as the Bio defenders

## 14. Best explanation now

The remaining narrow Bio-lane mitigation idea is now proven on a real gameplay-structural runtime predicate:

- broad `def.armorFactor` per-weapon mitigation was too broad
- replay-key suffixes proved the lane but were not acceptable patch surface
- tiny always-on structural signature plumbing solved the runtime-shape problem cleanly
- the structural gate preserves Bio-row improvement and keeps healthy scout rows flat

So the next tracked step, if taken, should be this narrow structural gate and nothing broader.

## 15. Explicit no-change statement

- No tracked behavior patch was made in this pass.
- No file deletion happened in this pass.
- `brute-sim-v1.4.6.js` was not changed.
