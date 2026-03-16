# Bio+Pink Scope Localization

Tracked source edits in this pass: none.

Helper created:

- `./tmp/bio-pink-scope-localization-helper.py`
- output: `./tmp/bio-pink-scope-localization-helper.json`

## Exact Files / Functions / Artifacts Inspected

- `./tmp/codex-bio-pink-patch-report.md`
- `./tmp/codex-bio-incremental-patch-candidate.md`
- `./tmp/codex-double-bio-microcheck.md`
- `./results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--2026-03-15T02-21-42-069Z.json`
- `./results/replay/legacy-replay--legacy-truth-targeted-compile-suspects-truth--legacy-sim-v1.0.4-clean--none--2026-03-15T01-44-03-773Z.json`
- `./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--2026-03-14T22-29-28-524Z.json`
- `./results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-bio-pink-meta-patch--2026-03-15T02-31-37-217Z.json`
- `./results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--codex-bio-pink-probe-patch--2026-03-15T02-31-37-211Z.json`
- `./legacy-defs.js`
  - `CrystalDefs['Perfect Pink Crystal']`
  - `CrystalDefs['Perfect Orange Crystal']`
  - `ItemDefs['Bio Spinal Enhancer']`
  - `ItemDefs['Dark Legion Armor']`
  - `ItemDefs['Rift Gun']`
  - `ItemDefs['Core Staff']`
- `./legacy-sim-v1.0.4-clean.js`
  - `getEffectiveCrystalPct()`
  - `compileCombatantFromParts()`
  - defender compile call site near `main()`
- `./brute-sim-v1.4.6.js`
  - `getEffectiveCrystalPct()`
  - `compileDefender()`
  - `compileAttacker()`

## Exact Commands Run

```bash
sed -n '1,240p' ./tmp/codex-bio-pink-patch-report.md
sed -n '1,240p' ./tmp/codex-bio-incremental-patch-candidate.md
sed -n '1,240p' ./tmp/codex-double-bio-microcheck.md
rg -n "Bio Spinal Enhancer|Perfect Pink Crystal|Perfect Orange Crystal|Rift Gun|Core Staff|Dark Legion Armor|Hellforged Armor|SG1 Armor|getEffectiveCrystalPct|compileCombatantFromParts|buildCompiledCombatSnapshot" ./legacy-defs.js ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
python3 ./tmp/bio-pink-scope-localization-helper.py > ./tmp/bio-pink-scope-localization-helper.json
sed -n '1504,1645p' ./legacy-sim-v1.0.4-clean.js
sed -n '1898,1938p' ./legacy-sim-v1.0.4-clean.js
sed -n '2187,2228p' ./brute-sim-v1.4.6.js
sed -n '2586,2695p' ./legacy-sim-v1.0.4-clean.js
sed -n '3336,3448p' ./brute-sim-v1.4.6.js
python3 - <<'PY' ... PY
```

The `python3 - <<'PY' ... PY` checks extracted:

- patched-vs-baseline row deltas
- resolved defender build payloads
- predicate booleans like `doubleBio`, `exactDoubleBioP4`, `exactRiftCoreFamily`, and base shell stats

## Rows Most Improved By The Reverted Patch

These are the materially helped rows that matter for localization, not every numeric improvement.

| Defender | Source | dWin% before -> after | absWin improvement | Key loadout |
| --- | --- | ---: | ---: | --- |
| DL Dual Rift Bio | meta | `+6.38 -> +0.80` | `5.58` | `Dark Legion`, `Rift + Rift`, `Bio[P4] + Bio[P4]` |
| DL Dual Rift Two Bio P4 | probe | `+6.37 -> +1.01` | `5.36` | `Dark Legion`, `Rift + Rift`, `Bio[P4] + Bio[P4]` |
| DL Core/Rift Bio | meta | `+3.78 -> -1.60` | `2.18` | `Dark Legion`, `Core + Rift`, `Bio[P4] + Bio[P4]` |
| DL Core/Rift Two Bio P4 | probe | `+3.53 -> -1.91` | `1.62` | `Dark Legion`, `Core + Rift`, `Bio[P4] + Bio[P4]` |

Important near-misses inside the same shells:

- `DL Dual Rift One Bio P4`: `+3.38 -> +3.49`, not helped
- `DL Core/Rift One Bio P4`: `+2.07 -> +1.64`, only mildly helped
- `DL Dual Rift Bio P4 + O4`: `+4.53 -> +4.20`, only mildly helped
- `DL Core/Rift Bio P4 + O4`: `+2.36 -> +1.61`, only mildly helped

That is the key split: the strong help is concentrated in the exact `Bio[P4] + Bio[P4]` variants, not the broader `any Bio+Pink` family.

## Rows Most Regressed By The Reverted Patch

| Defender | dWin% before -> after | absWin regression | Key loadout |
| --- | ---: | ---: | --- |
| DL Rift/Bombs Scout | `+0.46 -> +5.53` | `5.07` | `Dark Legion`, `Rift + Bombs`, no Bio |
| SG1 Rift/Bombs Bio | `+2.54 -> +7.36` | `4.82` | `SG1`, `Rift + Bombs`, `Bio[Y4] + Scout[A4]` |
| SG1 Split Bombs T2 | `+2.95 -> +7.65` | `4.70` | `SG1`, `Bombs + Bombs`, no Bio |
| DL Gun Blade Bio | `+0.29 -> +4.51` | `4.22` | `Dark Legion`, `Rift + Gun Blade`, `Bio[G4] + Scout[A+G3]` |
| Ashley Build | `+2.89 -> +7.06` | `4.17` | `Dark Legion`, `Reaper + Core`, no Bio |
| DL Gun Sniper Mix | `+0.17 -> +3.58` | `3.41` | `Dark Legion`, `Rift + Sniper`, `Scout[A3+P] + Bio[P2+G2]` |
| HF Scythe Pair | `-0.78 -> +3.24` | `2.46` | `Hellforged`, `Scythe + Scythe`, `Scout[O4] + Bio[O4]` |

## Narrowest Distinguishing Predicates

### What is too broad and therefore rejected

- `Bio Spinal Enhancer + Perfect Pink Crystal`
  - rejected by the previous patch itself
  - harmed `DL Gun Sniper Mix` through mixed Pink-on-Bio and even rows with no Bio at all still regressed indirectly
- `Dark Legion Armor`
  - too broad
  - present in both targets and many regressions
- `has Rift Gun`
  - too broad
  - present in both targets and many regressions
- `Dark Legion + has Rift Gun`
  - still too broad
  - matches `DL Gun Sniper Mix`, `DL Rift/Bombs Scout`, `DL Gun Blade Bio`
- `Dark Legion + exact Rift/Core family`
  - still too broad
  - probe no-Bio and one-Bio shell variants show it is not enough
- `any Bio[P4]`
  - too broad
  - one-Bio rows were not reliably helped

### Smallest predicate that cleanly isolates the helped target rows

In the current 15-defender meta, the only defenders matching all of these are the two target rows:

1. defender uses `Dark Legion Armor`
2. weapon set is exactly:
   - `Rift Gun + Rift Gun`, or
   - `Core Staff + Rift Gun`
3. `misc1` and `misc2` are both `Bio Spinal Enhancer`
4. both misc crystal specs are exactly `Perfect Pink Crystal x4`

Equivalent compact predicate:

`Dark Legion + exact Rift/Core shell + exact double Bio[P4]`

Support:

- matches `DL Dual Rift Bio`
- matches `DL Core/Rift Bio`
- absent from all major regression rows
- explains why the exact two-Bio probe variants improved most, while one-Bio and `P4+O4` variants improved only weakly

### Compiled-stat signature clue

From the earlier double-Bio sensitivity audit, these exact target-family shells compile to unusually high defender stat signatures under current rules:

- Dual Rift Two Bio P4:
  - `257 speed / 229 acc / 123 dodge / 822 gun / 580 melee / 814 def`
- Core/Rift Two Bio P4:
  - `282 speed / 198 acc / 123 dodge / 834 gun / 906 melee / 881 def`

Regression rows do not share that exact signature. Some share the same `865 / 60 / 14 / 14` base shell, or `Dark Legion`, or `Rift Gun`, but they lack the exact `double Bio[P4]` overlay.

## Why The Previous Patch Leaked

`getEffectiveCrystalPct()` only sees:

- `itemName`
- `crystalName`
- `slotTag`

in both sims.

It cannot see:

- both misc slots together
- armor family
- weapon pair composition
- whether the build is the exact `Rift/Core + double Bio[P4]` shell

So an item+crystal-only patch at `getEffectiveCrystalPct()` necessarily leaked into broader families.

That is the core localization result.

## Ranked Patch-Scope Candidates

1. Exact defender shell predicate
   - `Dark Legion`
   - exact weapon set `Rift+Rift` or `Core+Rift`
   - exact `Bio[P4] + Bio[P4]`
   - best-supported and absent from regressions

2. `Dark Legion + has Rift Gun + exact Bio[P4] + Bio[P4]`
   - slightly broader
   - still plausible
   - less clean because it would include other unseen shells if they appear later

3. Any exact `Bio[P4] + Bio[P4]`
   - broader again
   - current meta has only the target rows, but that is still weaker evidence than the exact shell predicate

4. Any `Bio+Pink`
   - rejected

## Is There Enough Evidence For A New Narrower Patch?

Yes, for a **new narrow experimental patch**.

Not enough for:

- another `getEffectiveCrystalPct()` item+crystal-only rule
- any generalized `Bio+Pink` rule

Enough for:

- an exact-shell predicate that only hits the two current target rows and the matching two-Bio probe variants

## Recommendation

Recommendation: `PATCH NOW`

But patch the compile stage, not `getEffectiveCrystalPct()`.

Smallest likely patch target:

- `./legacy-sim-v1.0.4-clean.js`
  - `compileCombatantFromParts()`
- parity mirror:
  - `./brute-sim-v1.4.6.js`
  - `compileDefender()`
  - and likely `compileAttacker()` too if you want the exact same shell predicate available symmetrically in brute compile paths

Exact extra conditions to add:

- armor name is `Dark Legion Armor`
- weapon set is exactly `Rift Gun + Rift Gun` or `Core Staff + Rift Gun`
- `misc1.name === 'Bio Spinal Enhancer'`
- `misc2.name === 'Bio Spinal Enhancer'`
- `misc1.crystalSpec` is exactly `{ 'Perfect Pink Crystal': 4 }`
- `misc2.crystalSpec` is exactly `{ 'Perfect Pink Crystal': 4 }`

Why this is now the best next step:

- it matches every strongly helped target row
- it excludes every strongly regressed control/meta row inspected
- it is the narrowest predicate the data currently supports
- it avoids repeating the proven-too-broad `itemName + crystalName` scope
