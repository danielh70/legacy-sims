# codex applied damage trace proof report

## 1. Goal of this pass

Run the smallest temp-only deterministic trace to localize the first concrete divergence point for the remaining ordinary full-4 non-`CUSTOM` mismatch:

1. before armor
2. at armor/mitigation
3. or after final applied-damage / sequencing

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-final-v4-maul-signoff-report.md`
- `tmp/codex-ordinary-full4-mismatch-diagnosis-report.md`
- `legacy-sim-v1.0.4-clean.js`
  - `attemptWeapon(...)`
  - `doAction(...)`
  - `fightOnce(...)`
  - `applyArmorAndRound(...)`
  - `armorFactorForArmorValue(...)`
- `tmp/codex-ordinary-full4-mismatch-diagnosis.js`
- `tmp/codex-ordinary-full4-mismatch-diagnosis.json`
- truth files already used by the diagnosis pass:
  - `tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 3. Exact temp files created

- `tmp/codex-applied-damage-trace-proof.js`
- `tmp/codex-applied-damage-trace-proof.json`

## 4. Exact commands run

```sh
rg -n "function attemptWeapon|function doAction|function fightOnce|armorApply|actionStopOnKill|sharedHit|sharedSkillMode|raw damage|apply.*armor|final damage|retaliat|counter" legacy-sim-v1.0.4-clean.js
sed -n '700,980p' legacy-sim-v1.0.4-clean.js
sed -n '980,1280p' legacy-sim-v1.0.4-clean.js
sed -n '4110,4515p' legacy-sim-v1.0.4-clean.js
sed -n '4515,4615p' legacy-sim-v1.0.4-clean.js
rg -n "RNG_MODE|seedA|seedB|seedC|seedD|makeRng\\(|LEGACY_RNG" legacy-sim-v1.0.4-clean.js
sed -n '5245,5285p' legacy-sim-v1.0.4-clean.js
rg -n "function runMatch\\(" legacy-sim-v1.0.4-clean.js
sed -n '4750,4825p' legacy-sim-v1.0.4-clean.js
rg -n "function armorFactorForArmorValue|const BASE =|BASE\\.level" legacy-sim-v1.0.4-clean.js
sed -n '1360,1410p' legacy-sim-v1.0.4-clean.js
sed -n '1,120p' legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-applied-damage-trace-proof.js
node ./tmp/codex-applied-damage-trace-proof.js > ./tmp/codex-applied-damage-trace-proof.json
python3 - <<'PY'
import json
from pathlib import Path
p = Path('./tmp/codex-applied-damage-trace-proof.json')
data = json.loads(p.read_text())
for r in data['results']:
    print(r['attacker'], r['defender'], r['successfulEvents'][:6])
PY
python3 - <<'PY'
import json, math
from pathlib import Path
p = Path('./tmp/codex-applied-damage-trace-proof.json')
data = json.loads(p.read_text())
BASE_LEVEL = 80
K = 8
for r in data['results']:
    for e in r['successfulEvents'][:4]:
        runtime_factor = (BASE_LEVEL*K/2)/((BASE_LEVEL*K/2)+e['targetArmor'])
        runtime_expected = math.ceil(e['rawDamage'] * runtime_factor)
        compiled_expected = math.ceil(e['rawDamage'] * e['targetArmorFactor'])
        print(r['attacker'], r['defender'], e['turn'], e['actorSide'], e['weaponSlot'], runtime_expected, compiled_expected)
PY
```

## 5. Exact matchups traced

Bad-lane probes:

1. `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio`
2. `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio`
3. `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid`

Control:

4. `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout`

Each matchup used a fixed fast-RNG seed and dumped one fight with the first 10 successful weapon-hit events.

## 6. Compact per-matchup trace excerpts

### A. `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio`

Compiled attacker:

- speed `297`, accuracy `151`, dodge `166`, melee `932`, armor `83`
- w1 `Reaper Axe` compiled range `86-110`
- w2 `Core Staff` compiled range `51-62`

Compiled defender:

- speed `257`, dodge `123`, def `849`, armor `83`, compiled `armorFactor=0.814318`

First successful events:

| Turn | Side | Weapon | Raw | Post-armor `d` | Applied | Target HP before->after | Runtime expected | Compiled-factor expected |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 1 | A | Reaper Axe | 131 | 105 | 105 | 865 -> 760 | 105 | 107 |
| 1 | D(ret) | Rift Gun | 80 | 64 | 64 | 650 -> 586 | 64 | 64 |
| 2 | A | Reaper Axe | 121 | 97 | 97 | 760 -> 663 | 97 | 99 |
| 2 | A | Core Staff | 72 | 58 | 58 | 663 -> 605 | 58 | 59 |

Trace excerpt:

```text
T1 A->D | w1(h=true,s=true,raw=131,d=105,app=105) w2(h=true,s=false,raw=0,d=0,app=0) => raw=105 app=105 targetHP=865
T1 D->A(ret) | w1(h=true,s=true,raw=80,d=64,app=64) w2(h=true,s=false,raw=0,d=0,app=0) => raw=64 app=64 targetHP=650
T2 A->D | w1(h=true,s=true,raw=121,d=97,app=97) w2(h=true,s=true,raw=72,d=58,app=58) => raw=155 app=155 targetHP=760
```

### B. `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio`

Compiled attacker:

- speed `222`, accuracy `201`, dodge `166`, melee `769`, armor `83`
- w1 `Crystal Maul` compiled range `97-107`
- w2 `Reaper Axe` compiled range `86-110`

Compiled defender:

- speed `282`, dodge `123`, def `916`, armor `83`, compiled `armorFactor=0.814318`

First successful events:

| Turn | Side | Weapon | Raw | Post-armor `d` | Applied | Target HP before->after | Runtime expected | Compiled-factor expected |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 1 | D | Core Staff | 70 | 56 | 56 | 650 -> 594 | 56 | 56 |
| 1 | D | Rift Gun | 78 | 62 | 62 | 594 -> 532 | 62 | 62 |
| 2 | D | Core Staff | 63 | 51 | 51 | 532 -> 481 | 51 | 51 |
| 2 | A(ret) | Crystal Maul | 131 | 105 | 105 | 865 -> 760 | 105 | 107 |
| 2 | A(ret) | Reaper Axe | 126 | 101 | 101 | 760 -> 659 | 101 | 103 |

Trace excerpt:

```text
T1 D->A | w1(h=true,s=true,raw=70,d=56,app=56) w2(h=true,s=true,raw=78,d=62,app=62) => raw=118 app=118 targetHP=650
T1 A->D(ret) | w1(h=true,s=false,raw=0,d=0,app=0) w2(h=true,s=false,raw=0,d=0,app=0) => raw=0 app=0 targetHP=865
T2 D->A | w1(h=true,s=true,raw=63,d=51,app=51) w2(h=false,s=false,raw=0,d=0,app=0) => raw=51 app=51 targetHP=532
T2 A->D(ret) | w1(h=true,s=true,raw=131,d=105,app=105) w2(h=true,s=true,raw=126,d=101,app=101) => raw=206 app=206 targetHP=865
```

### C. `CUSTOM_MAUL_A4_SG1_PINK` vs `SG1 Double Maul Droid`

Compiled attacker:

- speed `190`, accuracy `201`, dodge `134`, melee `769`, armor `75`
- w1 `Crystal Maul` compiled range `99-110`
- w2 `Reaper Axe` compiled range `88-112`

Compiled defender:

- speed `125`, dodge `151`, def `684`, armor `75`, compiled `armorFactor=0.833703`

First successful events:

| Turn | Side | Weapon | Raw | Post-armor `d` | Applied | Target HP before->after | Runtime expected | Compiled-factor expected |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 1 | A | Crystal Maul | 127 | 103 | 103 | 650 -> 547 | 103 | 106 |
| 1 | D(ret) | Crystal Maul | 124 | 101 | 101 | 650 -> 549 | 101 | 101 |
| 2 | A | Reaper Axe | 134 | 109 | 109 | 547 -> 438 | 109 | 112 |
| 3 | D(ret) | Crystal Maul | 131 | 107 | 107 | 549 -> 442 | 107 | 107 |

Trace excerpt:

```text
T1 A->D | w1(h=true,s=true,raw=127,d=103,app=103) w2(h=true,s=false,raw=0,d=0,app=0) => raw=103 app=103 targetHP=650
T1 D->A(ret) | w1(h=true,s=true,raw=124,d=101,app=101) w2(h=true,s=false,raw=0,d=0,app=0) => raw=101 app=101 targetHP=650
T2 A->D | w1(h=true,s=false,raw=0,d=0,app=0) w2(h=true,s=true,raw=134,d=109,app=109) => raw=109 app=109 targetHP=547
```

### D. Control: `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout`

Compiled defender:

- speed `286`, dodge `131`, def `744`, armor `83`, compiled `armorFactor=0.838835`

First successful events:

| Turn | Side | Weapon | Raw | Post-armor `d` | Applied | Target HP before->after | Runtime expected | Compiled-factor expected |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| 1 | D | Rift Gun | 79 | 64 | 64 | 650 -> 586 | 64 | 65 |
| 1 | A(ret) | Reaper Axe | 132 | 105 | 105 | 865 -> 760 | 105 | 111 |
| 2 | D | Rift Gun | 79 | 64 | 64 | 586 -> 522 | 64 | 65 |
| 2 | A(ret) | Crystal Maul | 126 | 101 | 101 | 760 -> 659 | 101 | 106 |
| 2 | A(ret) | Reaper Axe | 133 | 106 | 106 | 659 -> 553 | 106 | 112 |

This control shows the same runtime-vs-compiled armor-factor mismatch, even though the overall row was comparatively healthy.

## 7. First concrete divergence point by matchup

### Bio bad rows

For both:

- `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio`
- `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio`

the first concrete divergence is **at mitigation/armor math inside `attemptWeapon(...)`**, not before armor and not after application.

Observed behavior:

- raw rolls are within compiled pre-armor weapon ranges
- hit/skill outcomes are already resolved normally
- `postArmorDamage` matches `ceil(raw * armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK))`
- `postArmorDamage` does **not** match the compiled snapshot’s target `armorFactor`
- `appliedDamage` then equals `postArmorDamage` unless there is kill clipping

Concrete source:

```js
const postArmorPerWeapon =
  cfg.armorApply === 'per_weapon'
    ? applyArmorAndRound(
        raw,
        armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK),
        cfg.armorRound,
      )
    : applyArmorAndRound(raw, def.armorFactor, cfg.armorRound);
```

That means the per-weapon path is using `BASE.level` instead of the target’s compiled armor factor.

### `SG1 Double Maul Droid`

The first concrete divergence is **the same mitigation lane**, not a new stop-on-kill/queued-action branch.

What is different about this row:

- the same runtime-vs-compiled armor-factor mismatch appears on attacker hits into the droid
- the early trace shows no queued second action and no stop-on-kill branch
- the defender’s retaliation is structurally normal in the traced window, but the row is still especially punishing because the droid returns high-damage melee actions under ordinary retaliation sequencing

So:

- same first divergence surface: per-weapon mitigation using `BASE.level`
- different matchup expression: the droid row is amplified by defender retaliation damage, not by a distinct hidden sequencing branch

## 8. Do Bio rows and Double Maul Droid share the same root lane?

Yes, with one qualifier.

Shared root lane:

- per-weapon mitigation in `attemptWeapon(...)` is using the wrong armor-factor source relative to the compiled snapshot

Qualifier:

- on the two Bio defenders, that shows up mainly as attacker under-damage against high-level armored defenders
- on `SG1 Double Maul Droid`, the same lane exists, but the outcome miss is amplified by the defender’s retaliation profile rather than by a separate queued/stop-on-kill anomaly

## 9. Smallest next temp-only toggle to test

Single smallest proof toggle:

- temp-only change the `cfg.armorApply === 'per_weapon'` branch inside `attemptWeapon(...)` to use `def.armorFactor` instead of `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`, while leaving everything else untouched

That would directly prove or falsify:

- whether the remaining ordinary full-4 non-`CUSTOM` mismatch is primarily this per-weapon mitigation source mismatch
- without touching Bio helper logic, represented-build logic, brute, display, or broader combat sequencing

## 10. Explicit no-change statement

- No tracked behavior patch was made in this pass.
- No file deletion happened in this pass.
- `brute-sim-v1.4.6.js` was not changed.

