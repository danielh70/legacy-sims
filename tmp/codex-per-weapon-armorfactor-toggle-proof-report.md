# codex per-weapon armorfactor toggle proof report

## 1. Goal of this pass

Run the smallest temp-only behavior proof for the current best suspect:

- in `attemptWeapon(...)`
- only in the `cfg.armorApply === 'per_weapon'` branch
- replace runtime mitigation source
  - from `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`
  - to `def.armorFactor`

This pass is proof only. No tracked behavior patch was applied.

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-final-v4-maul-signoff-report.md`
- `tmp/codex-ordinary-full4-mismatch-diagnosis-report.md`
- `tmp/codex-applied-damage-trace-proof-report.md`
- `legacy-sim-v1.0.4-clean.js`
  - `attemptWeapon(...)`
  - `doAction(...)`
  - `applyArmorAndRound(...)`
  - `armorFactorForArmorValue(...)`
- exact truth files used:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 3. Exact temp files created

- `./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js`
- `./tmp/codex-applied-damage-trace-proof.js`
  - temp-only update: accepts sim path arg
- `./tmp/codex-applied-damage-trace-proof.baseline.json`
- `./tmp/codex-applied-damage-trace-proof.toggle.json`

## 4. Exact commands run

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js
node --check ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js
node --check ./tmp/codex-applied-damage-trace-proof.js
node ./tmp/codex-applied-damage-trace-proof.js ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-applied-damage-trace-proof.baseline.json
node ./tmp/codex-applied-damage-trace-proof.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-applied-damage-trace-proof.toggle.json

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-base-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-armorfactor-proof-base-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-base-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-armorfactor-proof-base-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-base-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-armorfactor-proof-base-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-base-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-armorfactor-proof-base-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-toggle-custom' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-armorfactor-proof-toggle-custom.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-toggle-cstaff' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-armorfactor-proof-toggle-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-toggle-maul-dl' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-armorfactor-proof-toggle-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-toggle-maul-sg1' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Core/Rift Bio,SG1 Double Maul Droid,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-armorfactor-proof-toggle-maul-sg1.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-armorfactor-proof-toggle-cstaff-full15' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js > ./tmp/codex-armorfactor-proof-toggle-cstaff-full15.log 2>&1
```

## 5. Exact single-line temp change applied

Temp file:

- `./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-toggle.js`

One-line behavior toggle:

```js
-          armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK),
+          def.armorFactor,
```

Everything else stayed untouched in the temp sim copy.

## 6. Before/after targeted trace confirmation

The trace proof matched exactly what the previous report predicted.

| Matchup | Event | Baseline post/app | Toggle post/app | Compiled-factor expected | Result |
| --- | --- | --- | --- | --- | --- |
| `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio` | A turn1 w1 | `105/105` | `107/107` | `107` | now matches compiled factor |
| `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio` | A turn2 w1 | `97/97` | `99/99` | `99` | now matches compiled factor |
| `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio` | A turn2 w1 | `105/105` | `107/107` | `107` | now matches compiled factor |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid` | A turn1 w1 | `103/103` | `106/106` | `106` | now matches compiled factor |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid` | A turn2 w2 | `109/109` | `112/112` | `112` | now matches compiled factor |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout` | A turn1 ret w2 | `105/105` | `111/111` | `111` | now matches compiled factor |

Conclusion from the trace:

- the single toggle fixes the previously localized event-level divergence exactly
- the changed per-weapon lane now agrees with the compiled snapshot’s armor factor on attacker-side hits

## 7. Compact before/after compare table for the bad defenders

### Targeted bad defenders

| Attacker | Defender | Baseline win Δ | Toggle win Δ | Improvement | Readout |
| --- | --- | ---: | ---: | ---: | --- |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | -3.08 | +2.85 | strong help |
| `CUSTOM_CSTAFF_A4` | DL Core/Rift Bio | -5.79 | -3.02 | +2.77 | strong help |
| `CUSTOM_CSTAFF_A4` | SG1 Double Maul Droid | -6.71 | -4.67 | +2.04 | some help, still bad |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Dual Rift Bio | -4.80 | -2.68 | +2.12 | strong help |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | -1.61 | +2.24 | strong help |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | -4.56 | +0.02 | effectively no help |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Dual Rift Bio | -5.74 | -3.27 | +2.47 | strong help |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | -0.82 | +2.20 | strong help |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Double Maul Droid | -4.57 | -4.56 | +0.01 | effectively no help |

### CUSTOM on the same bad defenders

| Attacker | Defender | Baseline win Δ | Toggle win Δ | Improvement |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | -0.04 | +0.88 |
| `CUSTOM` | DL Core/Rift Bio | -2.99 | -2.22 | +0.77 |
| `CUSTOM` | SG1 Double Maul Droid | -3.23 | -3.00 | +0.23 |

Readout:

- the toggle materially helps the two Bio rows across all attackers
- it barely changes `SG1 Double Maul Droid` for the maul attackers
- it does not isolate the droid lane

## 8. Control-row comparison

Requested healthy control:

| Attacker | Defender | Baseline win Δ | Toggle win Δ | Result |
| --- | --- | ---: | ---: | --- |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | +2.57 | worsened high |

Additional context:

| Attacker | Defender | Baseline win Δ | Toggle win Δ | Result |
| --- | --- | ---: | ---: | --- |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +1.84 | also drifts high |

So the healthy control does **not** stay clean under this toggle.

## 9. Whether CUSTOM stayed roughly stable

On the targeted 4-row control set:

- `CUSTOM` filtered summary moved only slightly overall:
  - baseline `meanAbsΔwin 1.91`
  - toggle `meanAbsΔwin 1.78`
- but that hides an important tradeoff:
  - Bio rows improved
  - the already-healthy scout row overshot upward

So:

- `CUSTOM` stayed roughly stable in aggregate
- but not cleanly stable row-by-row

## 10. Optional full-v4 estimate for the most affected attacker

Optional full-v4 temp compare was run for `CUSTOM_CSTAFF_A4`.

Result:

- established baseline from signoff report: `meanAbsΔwin 3.16`
- temp toggle full15: `meanAbsΔwin 4.28`
- worst row became `DL Gun Blade Recon +8.67`

That means the one-line toggle is **not** globally safe even though it clearly helps the targeted Bio rows.

## 11. What the proof says

### 1. Does the single temp toggle materially reduce the non-CUSTOM mismatch on the overlapping bad defenders?

Yes, but selectively.

- It materially reduces both Bio-defender bad rows for all three non-`CUSTOM` attackers.
- It does not materially fix `SG1 Double Maul Droid` for the maul attackers.

### 2. Does it help both Bio rows and `SG1 Double Maul Droid`, or only the Bio rows?

- Primarily the Bio rows.
- `CUSTOM_CSTAFF_A4` gets some droid improvement.
- the two maul attackers get essentially none on the droid row.

### 3. Does it leave `CUSTOM` roughly stable?

- roughly stable in filtered aggregate
- not cleanly stable on the healthy control row

### 4. Does the healthy control row stay healthy?

No.

- `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout` worsens from `-0.02` to `+2.57`

### 5. Is this strong enough evidence to justify a narrowly scoped tracked patch?

Not yet.

The proof is strong enough to say:

- the current per-weapon mitigation source is a real contributor to the Bio-lane mismatch

But it is **not** strong enough for a tracked patch because:

- the same toggle over-improves healthy control rows
- the optional full-v4 `CUSTOM_CSTAFF_A4` check gets worse overall
- `SG1 Double Maul Droid` is not solved by the same toggle

## 12. Single next split needed

Smallest next temp split to test:

- keep the same `def.armorFactor` swap
- but apply it only for **attacker-side actions into the Bio-defender lane**
- do **not** change defender retaliation or non-Bio control rows yet

Why this is the smallest next split:

- the current proof shows the generic per-weapon source swap is too broad
- the benefit concentrates on the Bio defenders
- the droid row appears at least partly separate

## 13. Explicit no-change statement

- No tracked behavior patch was made in this pass.
- No file deletion happened in this pass.
- `brute-sim-v1.4.6.js` was not changed.

## 14. Final verdict

**not yet proven; next split needed**
