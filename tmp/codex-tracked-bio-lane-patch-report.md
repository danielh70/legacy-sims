# codex tracked bio-lane patch report

## 1. Goal of this pass

Implement the narrowly scoped tracked Bio-lane mitigation patch proven by the temp structural-gate pass, then rerun compact targeted verification and compact full curated-v4 checks to measure what improved and what still remains.

## 2. Exact files changed

- `legacy-sim-v1.0.4-clean.js`

No other tracked file was changed.

## 3. Exact functions changed

### `compileCombatantFromParts(...)`

Change type: behavior-changing

- added a minimal always-on compiled runtime signature on the combatant:
  - `armorItem`
  - `w1Item`
  - `w2Item`
  - `m1Item`
  - `m2Item`
  - `m1Crystal`
  - `m2Crystal`

### `attemptWeapon(...)`

Change type: behavior-changing

- added the narrow structural Bio predicate
- in the `cfg.armorApply === 'per_weapon'` branch, attacker-side hits into that structural Bio lane now use `def.armorFactor`
- all other paths still use `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`

## 4. Exact structural gate implemented

Tracked gate:

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

Mitigation source swap:

```js
att && att.name === 'Attacker' && defenderIsBioLane
  ? def.armorFactor
  : armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)
```

Scope:

- attacker-side only
- `armorApply === 'per_weapon'` only
- Bio-defender structural lane only
- no `SG1 Double Maul Droid` handling bundled

## 5. Compact diff section

Added in `compileCombatantFromParts(...)`:

```js
  // Narrow Bio-lane mitigation patch: carry a minimal always-on compiled defender signature.
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

Added in `attemptWeapon(...)`:

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

Changed mitigation source:

```js
          att && att.name === 'Attacker' && defenderIsBioLane
            ? def.armorFactor
            : armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK),
```

## 6. Exact verification commands run

```sh
node --check ./legacy-sim-v1.0.4-clean.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-tracked-bio-lane-target-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-target-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-tracked-bio-lane-target-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-target-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-tracked-bio-lane-target-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-target-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-tracked-bio-lane-target-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,DL Rift/Bombs Scout,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-target-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-tracked-bio-lane-full LEGACY_REPLAY_TAG='codex-tracked-bio-lane-full-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-full-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-tracked-bio-lane-full LEGACY_REPLAY_TAG='codex-tracked-bio-lane-full-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-full-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-tracked-bio-lane-full LEGACY_REPLAY_TAG='codex-tracked-bio-lane-full-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-full-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-tracked-bio-lane-full LEGACY_REPLAY_TAG='codex-tracked-bio-lane-full-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-tracked-bio-lane-full-maul-sg1.log 2>&1
```

## 7. Targeted before/after table

Before values are the established baseline from the pre-patch proof/signoff reports. After values are the tracked patched results above.

| Attacker | Defender | Before win Δ | After win Δ | Improvement |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | -0.04 | +0.88 |
| `CUSTOM` | DL Core/Rift Bio | -2.99 | -2.22 | +0.77 |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +0.51 | +0.00 |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | -3.08 | +2.85 |
| `CUSTOM_CSTAFF_A4` | DL Core/Rift Bio | -5.79 | -3.02 | +2.77 |
| `CUSTOM_CSTAFF_A4` | DL Rift/Bombs Scout | +0.20 | +0.20 | +0.00 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Dual Rift Bio | -4.80 | -2.68 | +2.12 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | -1.61 | +2.24 |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | -4.58 | +0.00 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Dual Rift Bio | -5.74 | -3.27 | +2.47 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | -0.82 | +2.20 |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | -0.02 | +0.00 |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Double Maul Droid | -4.57 | -4.57 | +0.00 |

## 8. Compact full-v4 per-attacker summary after patch

| Attacker | Baseline meanAbsΔwin | After meanAbsΔwin | Baseline worstAbsΔwin | After worstAbsΔwin | After worst offender |
| --- | ---: | ---: | ---: | ---: | --- |
| `CUSTOM` | 1.60 | 1.49 | 3.23 | 3.23 | `SG1 Double Maul Droid` |
| `CUSTOM_CSTAFF_A4` | 3.16 | 2.79 | 6.71 | 6.71 | `SG1 Double Maul Droid` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | 2.06 | 1.77 | 4.80 | 4.58 | `SG1 Double Maul Droid` |
| `CUSTOM_MAUL_A4_SG1_PINK` | 2.04 | 1.73 | 5.74 | 4.57 | `SG1 Double Maul Droid` |

## 9. Whether scout controls stayed flat

Yes.

Targeted scout controls were unchanged:

- `CUSTOM` vs `DL Rift/Bombs Scout`: `+0.51 -> +0.51`
- `CUSTOM_CSTAFF_A4` vs `DL Rift/Bombs Scout`: `+0.20 -> +0.20`
- `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout`: `-0.02 -> -0.02`

## 10. Whether CUSTOM stayed near baseline

Yes.

`CUSTOM` stayed roughly stable overall:

- targeted Bio rows improved modestly
- scout control stayed flat
- full-v4 meanAbsΔwin improved slightly `1.60 -> 1.49`
- worst row remained `SG1 Double Maul Droid` at `3.23`

## 11. Whether Double Maul Droid remains the only separate blocker

No.

`SG1 Double Maul Droid` is now the clearest remaining separate lane, but it is **not** the only blocker left.

What remains after the Bio-lane patch:

- `SG1 Double Maul Droid` stays worst for three attackers
- but additional non-Bio rows remain materially off, for example:
  - `Ashley Build` on `CUSTOM_CSTAFF_A4` and both maul attackers
  - `HF Scythe Pair` on `CUSTOM_CSTAFF_A4` and `CUSTOM_MAUL_A4_DL_ABYSS`
  - `SG1 Split Bombs T2` on `CUSTOM` and `CUSTOM_MAUL_A4_SG1_PINK`
  - `DL Reaper/Maul Orphic Bio` on `CUSTOM`, `CUSTOM_CSTAFF_A4`, and `CUSTOM_MAUL_A4_SG1_PINK`

So the patch cleanly removes most of the targeted Bio-lane miss, but it does not collapse the entire remaining non-`CUSTOM` full-4 mismatch to just the droid row.

## 12. Parity note

I inspected the corresponding brute mitigation lane:

- `brute-sim-v1.4.6.js`
  - `armorFactorForArmorValue(...)`
  - per-weapon mitigation use site around line `1425`
  - `compileDefender(...)`
  - `compileAttacker(...)`

Brute was intentionally not patched in this pass per request.

Parity status:

- parity is **not preserved** for this mitigation lane after this legacy-only patch
- brute remains on the old per-weapon mitigation source
- no brute verification claim is made beyond that inspection

## 13. Explicit untouched logic statement

In this pass:

- represented-build logic was not changed
- brute was not changed
- truth collector was not changed
- cleanup was not performed
- no Bio helper logic was changed

## 14. Final verdict

**tracked Bio-lane patch in place; additional blocker remains**

