# Targeted Compile-Suspects Truth Runbook

## 1) Generate the narrow export config

Terminal command used:

```bash
env LEGACY_DEFENDER_FILE=./data/legacy-defenders-meta-v4-curated.js LEGACY_VERIFY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair,DL Core/Rift Bio' node ./tools/export-legacy-truth-config.js > ./tmp/legacy-truth-targeted-compile-suspects.json
```

This export contains only:

- `DL Dual Rift Bio`
- `DL Gun Sniper Mix`
- `HF Scythe Pair`
- `DL Core/Rift Bio`

## 2) Run the browser collector

First, copy the full contents of [legacy-truth-targeted-compile-suspects.json](/Users/danielhook/Desktop/code_projects/legacy_sims/tmp/legacy-truth-targeted-compile-suspects.json) to your clipboard.

Then, on the simulator tab browser console, run:

```js
await LegacyTruthCollector.runLegacyExport(
  JSON.parse(await navigator.clipboard.readText()),
  {
    repeats: 5,
    trialsText: '10,000 times',
    outputFile: 'legacy-truth-targeted-compile-suspects.json',
  }
);
```

Recommended collector settings:

- `repeats: 5`
- `trialsText: '10,000 times'`
- `outputFile: 'legacy-truth-targeted-compile-suspects.json'`

Reminder:

- stay on the simulator tab
- let the collector finish all runs before switching tabs or interacting with the page

## 3) Save the downloaded truth JSON in the repo

To avoid overwriting the export config file, move the downloaded collector result to:

```bash
./tmp/legacy-truth-targeted-compile-suspects-truth.json
```

## 4) Compare afterward against the current sim

Run:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='DL Dual Rift Bio,DL Gun Sniper Mix,HF Scythe Pair,DL Core/Rift Bio' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-targeted-compile-suspects-truth.json ./legacy-sim-v1.0.4-clean.js
```
