# codex-port-rollback-winner-c-to-brute-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `brute-sim-v1.4.6.js` | behavior-changing | removed the live Hellforged Armor base override branch so brute matches the applied rollback-winner `C` direction |
| `codex-port-rollback-winner-c-to-brute-report.md` | report-only | parity-port summary |

`legacy-sim-v1.0.4-clean.js` was not changed in this pass.

## Exact commands run

```bash
sed -n '1,260p' ./AGENTS.md
sed -n '1,260p' ./legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' ./codex-full-rollback-vs-k-report.md
sed -n '1,260p' ./codex-apply-rollback-winner-c-report.md

rg -n "HF_ARMOR_BASE_OVERRIDE|VOID_SWORD_BASE_MIN_OVERRIDE|VOID_SWORD_BASE_MAX_OVERRIDE|Hellforged Armor|Void Sword" ./brute-sim-v1.4.6.js
sed -n '140,175p' ./brute-sim-v1.4.6.js
sed -n '2005,2075p' ./brute-sim-v1.4.6.js
rg -n "hfArmorBaseOverride|voidSwordBaseMaxOverride|cfgSig|doctor|CONFIG" ./brute-sim-v1.4.6.js

node --check ./brute-sim-v1.4.6.js
rg -n "HF_ARMOR_BASE_OVERRIDE|hfRaw|Hellforged Armor.+flatStats\\.armor|default calibration overrides" ./brute-sim-v1.4.6.js
rg -n "VOID_SWORD_BASE_MIN_OVERRIDE|VOID_SWORD_BASE_MAX_OVERRIDE|Void Sword" ./brute-sim-v1.4.6.js ./data/legacy-defs.js
git diff -- ./brute-sim-v1.4.6.js

rg -n "default calibration overrides|VOID_SWORD_BASE_MIN_OVERRIDE|VOID_SWORD_BASE_MAX_OVERRIDE|Hellforged Armor.+flatStats\\.armor|HF_ARMOR_BASE_OVERRIDE" ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js
sed -n '1743,1762p' ./legacy-sim-v1.0.4-clean.js
sed -n '2027,2049p' ./brute-sim-v1.4.6.js
```

## Exact brute change made

Applied the same practical rollback-winner `C` change to [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js):

- removed the `LEGACY_HF_ARMOR_BASE_OVERRIDE` branch from `applyCalibOverrides()`
- removed the active default behavior that raised `ItemDefs['Hellforged Armor'].flatStats.armor` to `125`
- updated the nearby comments so that override notes now only mention the remaining Void Sword path

No other brute combat logic was changed.

Parity-sensitive surface checked:

- legacy location: [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js) around the shared-def override block
- brute location: [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) `applyCalibOverrides()`

Result:

- parity is now restored on this item-override surface between legacy and brute

## Compact sanity / consistency check

`node --check ./brute-sim-v1.4.6.js` passed.

Hellforged override surface audit after patch:

- `rg "HF_ARMOR_BASE_OVERRIDE|hfRaw|Hellforged Armor.+flatStats\\.armor" ./brute-sim-v1.4.6.js`
- result: no remaining live Hellforged override code paths

Side-by-side surface check:

- legacy still has only Void Sword override plumbing in its shared-def override block
- brute now matches that same shape in `applyCalibOverrides()`

## Void Sword note

Void Sword override plumbing remains in brute:

- `LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE`
- `LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE`

I left it in place because this pass was scoped only to the Hellforged rollback port. It appears inert for current shared defs on the max side, because [data/legacy-defs.js](/Users/danielhook/Desktop/code_projects/legacy_sims/data/legacy-defs.js) already carries `Void Sword` base max `120`.

## Explicit untouched statement

[legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js) was not changed in this pass.

rollback winner C ported to brute
