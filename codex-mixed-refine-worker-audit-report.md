# Mixed Refine Worker Audit Report

## Conclusion

- Current mixed-refine worker patch was already present in `brute-sim-v1.4.7.js`.
- No code changes were needed in `brute-sim-v1.4.7.js`.
- `LEGACY_FINAL_WORKERS=1` and `LEGACY_FINAL_WORKERS=4` matched on the requested mixed-refine outcome surfaces.
- Recommendation: keep the current file as-is.

## Exact functions and paths inspected

- `parseFinalWorkers(...)` at `brute-sim-v1.4.7.js:4051`
- `mixedRefineWorkerMain()` at `brute-sim-v1.4.7.js:4069`
- `workerMain()` mode switch for `"mixed_refine"` at `brute-sim-v1.4.7.js:4121`
- `buildMixedRefineJobs(...)` at `brute-sim-v1.4.7.js:5554`
- `runMixedRefineWorkers(...)` at `brute-sim-v1.4.7.js:5580`
- Finalization/cache consumption path:
- `mixedRefineEvalCache` / `mixedRefineResultCache` setup at `brute-sim-v1.4.7.js:5801`
- `getMixedRefinedEntry(...)` at `brute-sim-v1.4.7.js:5828`
- Worker-result cache population at `brute-sim-v1.4.7.js:5973`
- Final export population for `mixedCatalogTop`, `mixedCatalogByType`, `bestOverall`, `bestByHp`, and `refineSummary` at `brute-sim-v1.4.7.js:6030`, `brute-sim-v1.4.7.js:6036`, `brute-sim-v1.4.7.js:6104`, `brute-sim-v1.4.7.js:6105`, `brute-sim-v1.4.7.js:6120`

## What was verified

- The mixed-refine worker entrypoint already exists and is selected through `workerMain()` when `workerData.mode === 'mixed_refine'`.
- `buildMixedRefineJobs(...)` dedupes by `specKey(...)` before dispatch.
- `runMixedRefineWorkers(...)` preserves final result order with `orderedResults[msg.originalIndex]`.
- Main-thread finalization populates `mixedRefineResultCache` from worker hits before `getMixedRefinedEntry(...)` consumes the cache.
- Requested deterministic comparison was run on the same file with only `LEGACY_FINAL_WORKERS` changed.

## Exact verification commands run

### 1. Syntax check

```powershell
node --check brute-sim-v1.4.7.js
```

### 2. Deterministic run with `LEGACY_FINAL_WORKERS=1`

```powershell
$env:LEGACY_DETERMINISTIC='1'
$env:LEGACY_SEED='123456789'
$env:LEGACY_RNG='fast'
$env:LEGACY_REPORT='quiet'
$env:LEGACY_PROGRESS='off'
$env:LEGACY_TRIALS='300'
$env:LEGACY_TRIALS_SCREEN='120'
$env:LEGACY_TRIALS_GATE='40'
$env:LEGACY_CATALOG_CONFIRM_TRIALS='300'
$env:LEGACY_MIXED_CRYSTAL_SEARCH_TRIALS='120'
$env:LEGACY_CATALOG_TOP_N='5'
$env:LEGACY_SHOW_TOP='5'
$env:LEGACY_SHOW_REFINE_TOP='6'
$env:LEGACY_ARMORS='SG1 Armor'
$env:LEGACY_WEAPONS='Crystal Maul,Rift Gun,Reaper Axe'
$env:LEGACY_MISCS='Scout Drones,Orphic Amulet'
$env:LEGACY_EXPORT_JSON='codex-mixed-refine-final-workers-1.json'
$env:LEGACY_FINAL_WORKERS='1'
node .\brute-sim-v1.4.7.js --single
```

### 3. Deterministic run with `LEGACY_FINAL_WORKERS=4`

```powershell
$env:LEGACY_DETERMINISTIC='1'
$env:LEGACY_SEED='123456789'
$env:LEGACY_RNG='fast'
$env:LEGACY_REPORT='quiet'
$env:LEGACY_PROGRESS='off'
$env:LEGACY_TRIALS='300'
$env:LEGACY_TRIALS_SCREEN='120'
$env:LEGACY_TRIALS_GATE='40'
$env:LEGACY_CATALOG_CONFIRM_TRIALS='300'
$env:LEGACY_MIXED_CRYSTAL_SEARCH_TRIALS='120'
$env:LEGACY_CATALOG_TOP_N='5'
$env:LEGACY_SHOW_TOP='5'
$env:LEGACY_SHOW_REFINE_TOP='6'
$env:LEGACY_ARMORS='SG1 Armor'
$env:LEGACY_WEAPONS='Crystal Maul,Rift Gun,Reaper Axe'
$env:LEGACY_MISCS='Scout Drones,Orphic Amulet'
$env:LEGACY_EXPORT_JSON='codex-mixed-refine-final-workers-4.json'
$env:LEGACY_FINAL_WORKERS='4'
node .\brute-sim-v1.4.7.js --single
```

### 4. Structured comparison used after both runs

```powershell
Get-FileHash codex-mixed-refine-final-workers-1.json
Get-FileHash codex-mixed-refine-final-workers-4.json
```

```powershell
@'
const fs = require('fs');
function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
const a = load('codex-mixed-refine-final-workers-1.json');
const b = load('codex-mixed-refine-final-workers-4.json');
const checks = {
  bestOverall: JSON.stringify(a.summary?.bestOverall) === JSON.stringify(b.summary?.bestOverall),
  bestByHp: JSON.stringify(a.summary?.bestByHp) === JSON.stringify(b.summary?.bestByHp),
  refineSummary: JSON.stringify(a.summary?.refineSummary) === JSON.stringify(b.summary?.refineSummary),
  mixedCatalogTop: JSON.stringify((a.hp || []).map(x => ({ hp: x.hp, mixedCatalogTop: x.mixedCatalogTop }))) === JSON.stringify((b.hp || []).map(x => ({ hp: x.hp, mixedCatalogTop: x.mixedCatalogTop }))),
  mixedCatalogByType: JSON.stringify((a.hp || []).map(x => ({ hp: x.hp, mixedCatalogByType: x.mixedCatalogByType }))) === JSON.stringify((b.hp || []).map(x => ({ hp: x.hp, mixedCatalogByType: x.mixedCatalogByType }))),
  fullJson: JSON.stringify(a) === JSON.stringify(b),
};
console.log(JSON.stringify(checks, null, 2));
'@ | node
```

Compared fields:

- `summary.bestOverall`
- `summary.bestByHp`
- `summary.refineSummary`
- `hp[*].mixedCatalogTop`
- `hp[*].mixedCatalogByType`
- full JSON payload for drift detection

## Comparison result

- `bestOverall`: matched
- `bestByHp`: matched
- `refineSummary`: matched
- `mixedCatalogTop`: matched
- `mixedCatalogByType`: matched
- Full JSON payload: not byte-identical

Only observed full-payload difference:

- `meta.elapsedSec` differed (`3.179` vs `3.157`)

This is a timing/metadata difference, not a mixed-refine result difference.

## Bugs found

- No behavior bug was found in the requested mixed-refine worker path.
- No combat-logic, scoring/ranking, search-space, or mixed-refine outcome drift was observed in this verification.

## Smallest fix made

- None.

## Behavioral assessment

- This audit did not modify combat logic.
- This audit did not modify scoring/ranking logic.
- This audit did not modify search-space generation.
- This audit did not modify RNG semantics.
- Based on the deterministic 1-worker vs 4-worker verification above, the current mixed-refine worker patch behaves as performance-only for the checked scenario.

## Final recommendation

- Keep `brute-sim-v1.4.7.js` as-is.
- No revert is indicated from this audit.
- No further fix is required unless a broader regression case reproduces a mismatch outside this checked deterministic scenario.
