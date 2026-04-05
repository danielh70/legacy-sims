# `LEGACY_FORCE_WEAPON_INCLUDE` fix report

## What changed

- Added a real `LEGACY_FORCE_WEAPON_INCLUDE` env var to `brute-sim-v1.4.7.js`.
- Documented the new env var in the header comment near the existing debug env vars.
- Added parsing/validation that mirrors `LEGACY_FORCE_MISC_INCLUDE` behavior:
  - accepts a single weapon item name or CSV list
  - rejects empty CSV entries
  - rejects unknown item names
  - rejects non-`Weapon` items
- Applied the include filter at final weapon-pair generation so at least one final weapon item must match the include set.
- Kept crystal variants and upgrade variants flowing through normally because the filter matches on final pair `itemName` only.

## Exact functions / areas edited

- Header env-var docs near the top of `brute-sim-v1.4.7.js`
- `parseForcedWeaponIncludeFromEnv()`
- `const FORCED_WEAPON_INCLUDE = parseForcedWeaponIncludeFromEnv();`
- `buildWeaponPairs(weaponVariants)`

## Behavior classification

- Patch type: behavior-changing
- Scope: optimizer search-space filtering only
- Combat parity note: no combat/stat/hit/skill/damage/armor/shared-hit/shared-skill/stop-on-kill logic was changed.
- Corresponding `legacy-sim-v1.0.4-clean.js` check: searched for comparable weapon-pair/env-filter hooks and found no matching optimizer-style pair generation path there, so there was no direct parity hook to update in the canonical simulator.
- Parity claim: I did not claim simulator combat parity was re-verified, because the change is limited to brute-force candidate selection rather than shared combat resolution.

## Syntax check result

Command:

```powershell
node --check .\brute-sim-v1.4.7.js
```

Result:

- Passed with exit code `0`

## Verification commands run

### 1. Baseline reduced-space run without weapon include

```powershell
$env:LEGACY_DEFENDERS_FILE='.\data\legacy-defenders-meta-v4-curated.js'; $env:LEGACY_DEFENDERS='DL Rift/Bombs Scout'; $env:LEGACY_ARMORS='Dark Legion Armor'; $env:LEGACY_WEAPONS='Reaper Axe,Crystal Maul,Core Staff'; $env:LEGACY_MISCS='Scout Drones'; $env:LEGACY_SANITY='always'; $env:LEGACY_PROGRESS='off'; $env:LEGACY_REPORT='quiet'; Remove-Item Env:LEGACY_FORCE_WEAPON_INCLUDE -ErrorAction SilentlyContinue; node .\brute-sim-v1.4.7.js
```

Observed:

- `weaponVariants=7`
- `weaponPairs=28`
- `effective gear=168`

### 2. Reduced-space run with `LEGACY_FORCE_WEAPON_INCLUDE="Reaper Axe"`

```powershell
$env:LEGACY_DEFENDERS_FILE='.\data\legacy-defenders-meta-v4-curated.js'; $env:LEGACY_DEFENDERS='DL Rift/Bombs Scout'; $env:LEGACY_ARMORS='Dark Legion Armor'; $env:LEGACY_WEAPONS='Reaper Axe,Crystal Maul,Core Staff'; $env:LEGACY_MISCS='Scout Drones'; $env:LEGACY_SANITY='always'; $env:LEGACY_PROGRESS='off'; $env:LEGACY_REPORT='quiet'; $env:LEGACY_FORCE_WEAPON_INCLUDE='Reaper Axe'; node .\brute-sim-v1.4.7.js
```

Observed:

- `weaponVariants=7`
- `weaponPairs=18`
- `effective gear=108`
- Run completed successfully

Interpretation:

- Weapon variants stayed unchanged, which shows `LEGACY_WEAPONS`, crystal variants, and upgrade variants were not pruned early.
- Final weapon pairs dropped from `28` to `18`, which shows the new env var is being applied at the final pair stage as intended.

### 3. Validator check for non-weapon item rejection

```powershell
$env:LEGACY_FORCE_WEAPON_INCLUDE='Dark Legion Armor'; node .\brute-sim-v1.4.7.js
```

Observed:

- Threw: `LEGACY_FORCE_WEAPON_INCLUDE item "Dark Legion Armor" is not a Weapon item`

## Does behavior now match the intended misc-include-style weapon filter?

Yes, within the requested scope.

Matched behaviors:

- CSV parsing supports one or many names
- empty CSV entries are rejected
- unknown names are rejected
- non-weapon names are rejected
- filtering is done at final pair generation
- at least one of the two final weapons must match
- `LEGACY_FORCE_WEAPON_PAIR` and `LEGACY_FORCE_WEAPON_INCLUDE` now compose because both checks run inside `buildWeaponPairs()`
- crystal and upgrade variants still flow through because matching is on base weapon item name only

## Caveats

- I did not run a separate live command with both `LEGACY_FORCE_WEAPON_PAIR` and `LEGACY_FORCE_WEAPON_INCLUDE` set together, but the final implementation applies both constraints in the same pair-generation loop.
- I did not run explicit live checks for the empty-entry or unknown-item error cases, though both are implemented directly in the new parser and mirror the misc-include structure.
- No changes were made to `legacy-sim-v1.0.4-clean.js` because this request was limited to brute optimizer search-space filtering.
