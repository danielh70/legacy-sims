# codex-bio-pink-shell micro-check

## Commands run

```sh
sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md
sed -n '1,220p' ./tmp/codex-bio-pink-shell-patch.diff
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
rg -n "getExperimentalBioPinkShellDefBonus|isExactBioPink4|crystalMix|crystalName|crystalSpecKey|compileCombatantFromParts|compileDefender|compileAttacker" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js legacy-defs.js
sed -n '330,520p' legacy-sim-v1.0.4-clean.js
sed -n '2560,2695p' legacy-sim-v1.0.4-clean.js
sed -n '700,820p' brute-sim-v1.4.6.js
sed -n '3240,3575p' brute-sim-v1.4.6.js
sed -n '1,220p' tools/legacy-truth-replay-compare.js
rg -n "requestedPageBuilds|verifiedPageBuilds|pageBuilds" tools/legacy-truth-replay-compare.js
node ./tmp/codex-bio-pink-shell-microcheck.js
```

## Files / functions inspected

- `./tmp/codex-bio-pink-shell-verify-results.md`
- `./tmp/codex-bio-pink-shell-patch.diff`
- `./tmp/legacy-truth-double-bio-probe.json`
- `tools/legacy-truth-replay-compare.js`
  - confirmed replay uses `pageBuilds` exact rows and the supplied sim path (`process.argv[3]`)
- `legacy-sim-v1.0.4-clean.js`
  - `partCrystalSpec(...)`
  - `normalizeCrystalCounts(...)`
  - `crystalSpecKey(...)`
  - `getExperimentalBioPinkShellDefBonus(...)`
  - `compileCombatantFromParts(...)`
- `brute-sim-v1.4.6.js`
  - `partCrystalSpec(...)`
  - `normalizeCrystalCounts(...)`
  - `crystalSpecKey(...)`
  - `getExperimentalBioPinkShellDefBonus(...)`
  - `compileDefender(...)`
  - `compileAttacker(...)`
- `legacy-defs.js`
  - `ItemDefs['Bio Spinal Enhancer'].flatStats.defSkill`

## Probe rows

Legacy replay path normalization that actually reaches the helper in these compare runs:

| Probe row | misc1 crystal normalization | misc2 crystal normalization | shell predicate matched? | experimental bonus |
| --- | --- | --- | --- | --- |
| DL Dual Rift No Bio | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | no | `0` |
| DL Dual Rift One Bio P4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | no | `0` |
| DL Dual Rift Two Bio P4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | yes | `26` |
| DL Dual Rift Bio P4 + O4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Bio Spinal Enhancer / Perfect Orange Crystal / Perfect Orange Crystal:4 / exact=no` | no | `0` |
| DL Core/Rift No Bio | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | no | `0` |
| DL Core/Rift One Bio P4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Scout Drones / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=no` | no | `0` |
| DL Core/Rift Two Bio P4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | yes | `26` |
| DL Core/Rift Bio P4 + O4 | `Bio Spinal Enhancer / Perfect Pink Crystal / Perfect Pink Crystal:4 / exact=yes` | `Bio Spinal Enhancer / Perfect Orange Crystal / Perfect Orange Crystal:4 / exact=no` | no | `0` |

## Findings

- Unexpected one-Bio matches: none.
- Unexpected mixed `P4+O4` matches: none.
- Exact-target matches only: yes. In the legacy replay path, only the two exact double-Bio `P4/P4` rows satisfy the full predicate and receive the bonus.
- Attacker-side compile path in the current compare runs:
  - `tools/legacy-truth-replay-compare.js` ran `./legacy-sim-v1.0.4-clean.js`, not `brute-sim-v1.4.6.js`.
  - `legacy-sim` does compile the attacker through the same helper-capable path, but the attacker is `CUSTOM = SG1 Armor + Reaper Axe + Crystal Maul + Bio[P4] + Bio[O4]`.
  - That attacker cannot match: armor is not `Dark Legion Armor`, weapons are not `Dual Rift` or `Core/Rift`, and `misc2` is `Perfect Orange Crystal:4`.
  - Attacker-side helper is a no-op here: match `false`, bonus `0`.
- Brute raw-payload shape note:
  - `brute-sim-v1.4.6.js` `partCrystalSpec(...)` does not fall back to legacy `upgrades: [...]` crystal arrays.
  - On this exact truth JSON shape, brute raw misc slots would present no crystal spec at all (`rawSpecPresent=false` for all 8 probe rows in the helper script).
  - That is a separate brute payload-parsing / parity risk, but it is not the cause of the current replay compare behavior because the compare commands only executed `legacy-sim`.

## Best explanation

The predicate is clean in the active legacy replay path. There is no evidence of leakage through `crystalName`, `crystalMix`, `crystalSpecKey(...)`, misc compile shape, or attacker-side symmetry for these probe rows.

The one-Bio and mixed-Bio rows being materially off is therefore not explained by accidental matching. The stronger explanation is that the patch surface is wrong:

- it only adds a flat defender `defSk` bonus on exact double-Bio `P4/P4` shells,
- it leaves one-Bio and `P4+O4` Bio-bearing rows untouched,
- yet those rows still show meaningful Bio-related truth deltas while no-Bio rows stay near-noise,
- and the exact two-Bio targets remain badly off even after the bonus.

That pattern points to a broader Bio-shell mismatch, not a predicate leak. A flat exact-match `defSk` bump is too narrow and likely the wrong surface.

There is also a parity risk baked into the same helper:

- in `legacy-sim`, the current default math yields `baseDef=117`, `boostedDef=130`, bonus `+26`,
- in `brute-sim`, the current default crystal stat stack mode yields `baseDef=136`, `boostedDef=162`, bonus `+52`.

So even if the predicate were kept, the patch is not magnitude-stable across the two simulators.

## Recommendation

**ABANDON THIS PATCH SURFACE**

Reason: the helper is not leaking, but the exact-match flat `defSk` adjustment is too narrow to explain the observed Bio-related mismatch pattern, and it is not parity-stable across `legacy-sim` and `brute-sim`.
