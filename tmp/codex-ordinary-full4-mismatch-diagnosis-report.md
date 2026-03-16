# codex ordinary full4 mismatch diagnosis report

## 1. Goal of this pass

Diagnose the remaining ordinary full-4-crystal attacker-family mismatch on the verified represented-build patch baseline, without changing behavior, collecting new truth, or reopening ruled-out Bio/combat/display theories.

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-represented-build-patch-verify-report.md`
- `tmp/codex-final-v4-signoff-check-report.md`
- `tmp/codex-final-v4-maul-signoff-report.md`
- `legacy-sim-v1.0.4-clean.js`
  - `compileCombatantFromParts(...)`
  - `buildCompiledCombatSnapshot(...)`
  - `exactDispChances(...)`
  - `attemptWeapon(...)`
  - `doAction(...)`
  - `fightOnce(...)`
  - `runMatch(...)`
  - `mixedWeaponMultsFromWeaponSkill(...)`
  - represented-build local cfg gate around `cfgForRepresentedBuildPart(...)`
- `tmp/legacy-truth-current-attacker-vs-meta.json`
- `tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
- `legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
- `legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`
- `data/legacy-defenders-meta-v4-curated.js`
- replay outputs already used by the signoff pass:
  - `tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-custom--2026-03-15T19-17-04-496Z.json`
  - `tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-cstaff--2026-03-15T19-17-04-505Z.json`
  - `tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-dl-abyss--2026-03-15T19-17-04-517Z.json`
  - `tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-sg1-pink--2026-03-15T19-17-04-524Z.json`
- temp harness created/used in this pass:
  - `tmp/codex-ordinary-full4-mismatch-diagnosis.js`
  - `tmp/codex-ordinary-full4-mismatch-diagnosis.json`

## 3. Exact commands run

```sh
node --check ./tmp/codex-ordinary-full4-mismatch-diagnosis.js
node ./tmp/codex-ordinary-full4-mismatch-diagnosis.js > ./tmp/codex-ordinary-full4-mismatch-diagnosis.json
python3 - <<'PY'
import json
from pathlib import Path
p = Path('./tmp/codex-ordinary-full4-mismatch-diagnosis.json')
data = json.loads(p.read_text())
print(type(data).__name__, data.keys())
PY
python3 - <<'PY'
import json
from pathlib import Path
p = Path('./tmp/codex-ordinary-full4-mismatch-diagnosis.json')
data = json.loads(p.read_text())
print(data['attackerSummary'][:2])
print(data['focused'][:1])
PY
python3 - <<'PY'
import json
from pathlib import Path
p = Path('./tmp/codex-ordinary-full4-mismatch-diagnosis.json')
rows = json.loads(p.read_text())['focused']
focus = ['DL Dual Rift Bio','SG1 Double Maul Droid','DL Core/Rift Bio','DL Rift/Bombs Scout']
attackers = ['CUSTOM','CUSTOM_CSTAFF_A4','CUSTOM_MAUL_A4_DL_ABYSS','CUSTOM_MAUL_A4_SG1_PINK']
for atk in attackers:
    for r in rows:
        if r['attacker'] == atk and r['defender'] in focus:
            print(atk, r['defender'], r['delta'])
            print(r['compiled']['attacker'])
            print(r['compiled']['defender'])
PY
```

## 4. Exact truth files used

- `./tmp/legacy-truth-current-attacker-vs-meta.json`
- `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
- `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
- `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 5. Compact attacker comparison table

| Attacker | Armor | Weapon 1 | Weapon 2 | Shared traits | Distinctive traits |
| --- | --- | --- | --- | --- | --- |
| `CUSTOM` | SG1 Armor P4 | Reaper Axe A4 | Crystal Maul A3+Fire1 | hp 650 / same stat allocation / same Bio[P4]+Bio[O4] | only attacker with Fire-crystal maul |
| `CUSTOM_CSTAFF_A4` | DL Armor Abyss4 | Reaper Axe A4 | Core Staff A4 | same stats / same Bio pair | only attacker with Core Staff; much higher compiled speed/dodge from DL armor |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Armor Abyss4 | Crystal Maul A4 | Reaper Axe A4 | same stats / same Bio pair | all-Amulet maul, DL armor |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Armor P4 | Crystal Maul A4 | Reaper Axe A4 | same stats / same Bio pair | all-Amulet maul, SG1 armor |

Real commonality across the 3 worse attackers:

- all three replace `CUSTOM`'s Fire-crystal maul lane with a fully Amulet weapon lane
- all three keep the same hp/stat allocation and the same attacker-side Bio pair
- armor family varies across the worse attackers, so the miss does not look like a simple SG1-vs-DL armor split

## 6. Focused-defender comparison table

Primary bad defenders:

- `DL Dual Rift Bio`
- `DL Core/Rift Bio`
- `SG1 Double Maul Droid`

Control:

- `DL Rift/Bombs Scout`

| Attacker | Defender | win Δ | A_hit Δ | A_dmg1 Δ | A_dmg2 Δ | D_hit Δ | D_dmg1 Δ | D_dmg2 Δ | Readout |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | +0.55 | -3.67 | -3.75 | +0.80 | -0.14 | -0.12 | relatively small miss; attacker damage per landed hit low |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | +0.56 | -3.57 | -3.52 | +0.30 | +0.50 | +0.45 | same attacker under-damage lane, much larger win miss |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Dual Rift Bio | -4.80 | +0.86 | -3.84 | -3.86 | +1.04 | +0.14 | +0.05 | same under-damage lane |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Dual Rift Bio | -5.74 | +0.88 | -3.87 | -3.89 | +0.15 | -0.02 | -0.08 | same under-damage lane |
| `CUSTOM` | DL Core/Rift Bio | -2.99 | +0.56 | -2.11 | -2.12 | +1.27 | +0.73 | -0.12 | same pattern, smaller magnitude |
| `CUSTOM_CSTAFF_A4` | DL Core/Rift Bio | -5.79 | +0.54 | -2.53 | -2.49 | +0.54 | +0.11 | +0.66 | same attacker under-damage lane |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | +0.93 | -2.13 | -2.10 | +0.59 | -0.15 | +0.14 | same attacker under-damage lane |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | +0.86 | -2.15 | -2.16 | +1.29 | +0.63 | -0.04 | same attacker under-damage lane |
| `CUSTOM` | SG1 Double Maul Droid | -3.23 | +1.49 | +0.15 | +0.11 | +0.29 | +0.99 | +0.95 | attacker damage mostly fine; defender retaliation lane high |
| `CUSTOM_CSTAFF_A4` | SG1 Double Maul Droid | -6.71 | +0.36 | -0.36 | -0.36 | +1.10 | +0.56 | +0.56 | still mostly defender-side lane |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | +0.30 | +0.19 | +0.14 | +1.02 | +0.85 | +0.71 | attacker damage not the main problem |
| `CUSTOM_MAUL_A4_SG1_PINK` | SG1 Double Maul Droid | -4.57 | +0.28 | +0.20 | +0.21 | +0.55 | +0.99 | +0.91 | attacker damage not the main problem |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +0.47 | +0.80 | +0.71 | +0.90 | +0.28 | -0.32 | control row is much healthier |
| `CUSTOM_CSTAFF_A4` | DL Rift/Bombs Scout | +0.20 | +1.21 | -0.41 | -0.41 | +0.06 | -0.15 | +0.38 | still materially better than the bad lanes |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Rift/Bombs Scout | +1.31 | +0.97 | +0.78 | +0.78 | +0.03 | +0.50 | -0.50 | healthy control |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | +0.91 | +0.76 | +0.78 | +0.89 | +0.36 | -0.32 | healthy control |

## 7. Strongest shared-pattern findings

1. The non-`CUSTOM` problem is not explained by a shared attacker stat block alone.
   - All four attackers share the same hp/stat allocation and the same Bio misc pair.
   - The worse three attackers split across SG1 and DL armor, so this is not a clean armor-family split.

2. On the two Bio defenders, the strongest recurring signal is attacker-side applied-damage loss, not hit-rate loss.
   - `A_hit` drift stays small, roughly `+0.5` to `+0.9`.
   - `A_dmg1` and `A_dmg2` drift are consistently negative, roughly `-2` to `-4`.
   - `A_rng` drift is near zero, so the mismatch is not mainly compiled min/max range.

3. `SG1 Double Maul Droid` is a different lane from the Bio defenders.
   - For both maul attackers, attacker-side `A_dmg1/A_dmg2` are near zero or positive.
   - The win miss tracks higher defender-side `D_hit` and `D_dmg1/D_dmg2`, not the same attacker under-damage pattern.
   - This suggests the overlapping defender list is not one single formula issue; `Double Maul Droid` likely stresses retaliation / sequencing / defender offense more than Bio-defender armor interaction.

4. The control defender keeps the distinction meaningful.
   - `DL Rift/Bombs Scout` stays near zero or positive on win delta for all four attackers.
   - That argues against a broad ordinary full-4 compile regression.

5. Compiled attacker snapshots do not support a pure compile/build diagnosis.
   - The worse attackers have plausible compiled totals and expected weapon ranges for their builds.
   - The harmful pattern on Bio defenders appears after those compiled totals are consumed.

## 8. Compile/build vs combat-resolution read

Current evidence points more toward **combat-resolution / applied-damage lane** than pure compile/build.

Why:

- compiled offensive ranges are already close to truth on the bad Bio rows
- attacker hit chance is close too
- the recurring miss shows up mainly as lower attacker damage per successful hit or per resolved action against Bio defenders
- the same attackers look much healthier on the control defender, so the problem is conditional on defender archetype rather than obviously baked into attacker compilation alone

Most likely shared mismatch surface right now:

- attacker successful-hit damage being converted into applied damage in the ordinary full-4 path, especially through `attemptWeapon(...)` and the action sequencing in `doAction(...)`
- defender armor/mitigation interaction appears more likely than raw compiled attacker stats

## 9. Single best next patch surface

Best next patch surface to test, if the next temp proof experiment confirms it:

- `legacy-sim-v1.0.4-clean.js`
  - `attemptWeapon(...)`
  - `doAction(...)`

More specific target:

- the lane from successful hit / skill resolution into post-armor applied damage for melee-heavy ordinary full-4 attackers against Bio defenders
- secondarily, the same instrumentation should cover retaliation sequencing on `SG1 Double Maul Droid`

## 10. Smallest temp-only proof experiment to run next

Run one deterministic successful-hit damage trace, not a broad sweep.

Suggested temp-only experiment:

1. Fix RNG stream and dump only the first few successful-hit events for:
   - `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio`
   - `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio`
   - `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid`
   - `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout` as control
2. For each successful weapon action, log:
   - acting side
   - weapon chosen
   - compiled range used
   - rolled raw damage
   - armor factor / mitigation inputs
   - final applied damage
   - HP after application
3. Compare whether the bad Bio rows diverge:
   - before armor
   - at armor reduction
   - or after final applied-damage / stop-on-kill sequencing

That is the smallest next proof because it can distinguish:

- wrong compiled attack power
- wrong armor application / rounding
- wrong sequencing / retaliation effects

without proposing another theory patch yet.

## 11. Explicit no-change statement

- No behavior patch was made in this pass.
- No tracked files were deleted in this pass.
- `brute-sim-v1.4.6.js` was not changed.
- Bio helper logic, represented-build logic, combat logic, weapon display logic, and predictedDamage logic were not changed in this pass.

## 12. Final verdict

**ready for temp proof experiment on `attemptWeapon(...)` / `doAction(...)` applied-damage lane**
