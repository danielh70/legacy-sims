# codex replay runtime structural gate report

## 1. Goal of this pass

Identify which defender-identifying fields actually survive into `attemptWeapon(...)` during real `legacy-truth-replay-compare.js` runs, explain why the prior exact-label Bio gate failed, and determine the narrowest replay-time gate worth one more temp proof.

## 2. Exact files inspected

- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-applied-damage-trace-proof-report.md`
- `tmp/codex-per-weapon-armorfactor-toggle-proof-report.md`
- `tmp/codex-bio-lane-armorfactor-gate-proof-report.md`
- `tmp/codex-ordinary-full4-mismatch-diagnosis-report.md`
- `tmp/codex-ordinary-full4-mismatch-diagnosis.js`
- `tmp/codex-ordinary-full4-mismatch-diagnosis.json`
- `legacy-sim-v1.0.4-clean.js`
  - `compileCombatantFromParts(...)`
  - `attemptWeapon(...)`
  - `doAction(...)`
- `tools/legacy-truth-replay-compare.js`
  - `pageBuildToLegacyBuild(...)`
  - `pageBuildToLegacyDefenderPayload(...)`
  - `getCustomBuildFromPageBuild(...)`
  - `createJobRunner(...)`
- truth files used:
  - `./tmp/legacy-truth-current-attacker-vs-meta.json`
  - `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
  - `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
  - `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## 3. Exact temp files created

- `./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js`
- `./tmp/codex-runtime-gate-inspect.jsonl`
- `./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-struct-bio.js`
- `./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js`
- replay logs:
  - `./tmp/codex-runtime-gate-cstaff-bio.log`
  - `./tmp/codex-runtime-gate-maul-dl-corebio.log`
  - `./tmp/codex-runtime-gate-maul-sg1-scout.log`
  - `./tmp/codex-runtime-gate-custom-bio.log`
  - `./tmp/codex-replaykey-bio-cstaff.log`
  - `./tmp/codex-replaykey-bio-maul-dl.log`
  - `./tmp/codex-replaykey-bio-maul-sg1.log`
  - `./tmp/codex-replaykey-bio-custom.log`

## 4. Exact commands run

```sh
rg -n "attemptWeapon|function doAction|function fightOnce|name:|__meta|diagArmor|buildCompiledCombatSnapshot|compileCombatantFromParts" legacy-sim-v1.0.4-clean.js
rg -n "getCustomBuildFromPageBuild|pageBuildToLegacyDefenderPayload|LEGACY_REPLAY_ATTACKERS|LEGACY_REPLAY_DEFENDERS" tools/legacy-truth-replay-compare.js
sed -n '2671,2795p' legacy-sim-v1.0.4-clean.js
sed -n '4116,4475p' legacy-sim-v1.0.4-clean.js
sed -n '5512,5795p' legacy-sim-v1.0.4-clean.js
sed -n '1120,1315p' tools/legacy-truth-replay-compare.js
sed -n '2400,2575p' tools/legacy-truth-replay-compare.js

cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js
node --check ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js
python3 - <<'PY'
from pathlib import Path
Path('/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-runtime-gate-inspect.jsonl').write_text('')
PY

env LEGACY_RUNTIME_GATE_LOG=/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-runtime-gate-inspect.jsonl LEGACY_DIAG_ARMOR=1 LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js > ./tmp/codex-runtime-gate-cstaff-bio.log 2>&1
env LEGACY_RUNTIME_GATE_LOG=/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-runtime-gate-inspect.jsonl LEGACY_DIAG_ARMOR=1 LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Core/Rift Bio' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js > ./tmp/codex-runtime-gate-maul-dl-corebio.log 2>&1
env LEGACY_RUNTIME_GATE_LOG=/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-runtime-gate-inspect.jsonl LEGACY_DIAG_ARMOR=1 LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js > ./tmp/codex-runtime-gate-maul-sg1-scout.log 2>&1
env LEGACY_RUNTIME_GATE_LOG=/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/codex-runtime-gate-inspect.jsonl LEGACY_DIAG_ARMOR=1 LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.runtime-gate-inspect.js > ./tmp/codex-runtime-gate-custom-bio.log 2>&1

cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-struct-bio.js
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js
node --check ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-struct-bio.js
node --check ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js > ./tmp/codex-replaykey-bio-cstaff.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='DL Core/Rift Bio,SG1 Double Maul Droid' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js > ./tmp/codex-replaykey-bio-maul-dl.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='DL Core/Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js > ./tmp/codex-replaykey-bio-maul-sg1.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Rift/Bombs Scout' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.per-weapon-armorfactor-replaykey-bio.js > ./tmp/codex-replaykey-bio-custom.log 2>&1
```

## 5. Compact runtime field dumps for the target rows

Real replay-time `attemptWeapon(...)` snapshots with `LEGACY_DIAG_ARMOR=1`:

| Matchup | Attacker-side `att.name` | Attacker-side `def.name` | `LEGACY_VERIFY_DEFENDERS` | Defender `__meta` available? | Key runtime detail |
| --- | --- | --- | --- | --- | --- |
| `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio` | `Attacker` | `__REPLAY_DEFENDER__CUSTOM_CSTAFF_A4__DL-Dual-Rift-Bio` | same synthetic key | yes | `m1/m2 = Bio Pink + Bio Pink`, `w1/w2 = Rift Gun + Rift Gun` |
| `CUSTOM` vs `DL Dual Rift Bio` | `Attacker` | `__REPLAY_DEFENDER__CUSTOM__DL-Dual-Rift-Bio` | same synthetic key | yes | same Bio defender signature; attacker label differs in key prefix |
| `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio` | `Attacker` | `__REPLAY_DEFENDER__CUSTOM_MAUL_A4_DL_ABYSS__DL-Core-Rift-Bio` | same synthetic key | yes | `m1/m2 = Bio Pink + Bio Pink`, `w1/w2 = Core Staff + Rift Gun` |
| `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Rift/Bombs Scout` | `Attacker` | `__REPLAY_DEFENDER__CUSTOM_MAUL_A4_SG1_PINK__DL-Rift-Bombs-Scout` | same synthetic key | yes | `m1/m2 = Scout Drones + Scout Drones`, not Bio |

Always-on fields that survive into `attemptWeapon(...)` during real replay runs:

- `att.name`
- `def.name`
- compiled `att.w1` / `att.w2` names and ranges
- compiled `def.w1` / `def.w2` names and ranges
- compiled stats (`armor`, `armorFactor`, `speed`, `acc`, `dodge`, `gun`, `mel`, `prj`, `defSk`)

Fields available only when `LEGACY_DIAG_ARMOR=1`:

- `att.__meta`
- `def.__meta`
  - armor item/crystal
  - weapon item/crystal
  - misc item/crystal

## 6. Why the exact-label gate failed in replay-compare

The prior gate checked:

```js
def.name === 'DL Dual Rift Bio' || def.name === 'DL Core/Rift Bio'
```

That never matches the real replay-time defender object.

In actual `legacy-truth-replay-compare.js` runs:

- `createJobRunner(...)` writes a temp defender payload file with a synthetic defender key
- `legacy-sim-v1.0.4-clean.js` compiles the defender using that synthetic key as `name`
- by the time `attemptWeapon(...)` runs, the attacker-side target is named like:
  - `__REPLAY_DEFENDER__CUSTOM_CSTAFF_A4__DL-Dual-Rift-Bio`
  - not `DL Dual Rift Bio`

So the prior exact-label gate failed because it used the wrong runtime identifier, not because the mitigation idea itself was absent.

## 7. Best candidate structural gate for Bio rows

Two candidate gate classes emerged:

### A. Practical replay-time gate that actually survives today

Exact replay-key suffix gate on `def.name`:

```js
att.name === 'Attacker' &&
typeof def.name === 'string' &&
(def.name.endsWith('__DL-Dual-Rift-Bio') || def.name.endsWith('__DL-Core-Rift-Bio'))
```

Status:

- exact-label based, not structural
- but always-on in the real replay-compare path
- cheapest reliable gate available today

### B. More structural gate, but not always-on

Defender signature via `def.__meta` + compiled weapon pair:

- `def.__meta.armor.itemName === 'Dark Legion Armor'`
- `def.__meta.m1.itemName === 'Bio Spinal Enhancer'`
- `def.__meta.m2.itemName === 'Bio Spinal Enhancer'`
- both misc crystals pink
- `def.w1.name` / `def.w2.name` in `{Rift Gun, Core Staff}`

Status:

- structurally cleaner
- but only present when `LEGACY_DIAG_ARMOR=1`
- therefore not stable enough for an ordinary tracked patch without extra plumbing

Best current answer:

- the narrowest real gate that survives replay-compare **today** is the synthetic replay-key suffix on `def.name`
- no always-on structural misc-identity field survives into `attemptWeapon(...)` without new plumbing

## 8. Optional follow-up temp proof with the real replay-time gate

A tiny follow-up used the replay-key suffix gate in a temp sim copy.

Gate used:

```js
att.name === 'Attacker' &&
typeof def.name === 'string' &&
(def.name.endsWith('__DL-Dual-Rift-Bio') || def.name.endsWith('__DL-Core-Rift-Bio'))
```

Results:

| Attacker | Defender | Baseline win Δ | Replay-key gate win Δ | Readout |
| --- | --- | ---: | ---: | --- |
| `CUSTOM_CSTAFF_A4` | DL Dual Rift Bio | -5.93 | -3.08 | strong Bio help preserved |
| `CUSTOM_CSTAFF_A4` | DL Rift/Bombs Scout | +0.20 | +0.20 | control stayed flat |
| `CUSTOM_MAUL_A4_DL_ABYSS` | DL Core/Rift Bio | -3.85 | -1.61 | strong Bio help preserved |
| `CUSTOM_MAUL_A4_DL_ABYSS` | SG1 Double Maul Droid | -4.58 | -4.58 | unchanged |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Core/Rift Bio | -3.02 | -0.82 | strong Bio help preserved |
| `CUSTOM_MAUL_A4_SG1_PINK` | DL Rift/Bombs Scout | -0.02 | -0.02 | control stayed flat |
| `CUSTOM` | DL Dual Rift Bio | -0.92 | -0.04 | Bio row improves |
| `CUSTOM` | DL Rift/Bombs Scout | +0.51 | +0.51 | control stayed flat |

Interpretation:

- this proves the mitigation idea can survive the real replay-compare path
- the blocker in the prior pass was the wrong runtime field, not the mitigation lane itself
- but the working gate is still replay-key based, not a general structural gameplay predicate

## 9. Whether a follow-up temp proof with that gate is justified

Yes.

The replay-key gate is stable enough for one more temp proof run because:

- it is present in actual replay-compare runs
- it reproduces most of the targeted Bio-row improvement
- it avoids the scout-control overshoot seen with the broad toggle

But it is **not** strong enough yet for a tracked patch recommendation, because:

- it is tied to exact replay-key naming, not a real gameplay-side structural property
- the more structural `__meta` route is not always-on

## 10. Whether `SG1 Double Maul Droid` remains a separate lane

Yes.

It should stay split off for now:

- the Bio replay-key gate materially moves the Bio rows
- it leaves `SG1 Double Maul Droid` unchanged in the maul lane
- that matches the earlier conclusion that the droid row is a separate second issue

## 11. Best explanation now

The prior exact-label gate failed simply because `def.name` is not the human defender label during replay-compare; it is a synthetic exact-replay key. Real replay-time gating is possible, but the only always-on narrow signal currently available inside `attemptWeapon(...)` is that synthetic key.

So the current state is:

- the mitigation idea is still plausible for the Bio rows
- the failed proof was a runtime-shape mismatch, not a formula mismatch
- the best real replay-time gate available today is replay-key based
- a truly structural gameplay-side gate would require new defender-identity plumbing into runtime objects

## 12. Explicit no-change statement

- No tracked behavior patch was made in this pass.
- No file deletion happened in this pass.
- `brute-sim-v1.4.6.js` was not changed.

