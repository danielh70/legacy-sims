# Double Bio Probe Runbook

## Generate The Config

Exact terminal command used:

```bash
node ./tmp/generate-double-bio-probe-config.js > ./tmp/legacy-truth-double-bio-probe-config.json
```

Optional clipboard helper before switching to the browser:

```bash
pbcopy < ./tmp/legacy-truth-double-bio-probe-config.json
```

## Run The Collector

Recommended settings:

- `repeats: 5`
- `trialsText: '10,000 times'`
- `outputFile: 'legacy-truth-double-bio-probe.json'`

Browser-console command:

```js
await LegacyTruthCollector.runLegacyExport(JSON.parse(await navigator.clipboard.readText()), {
  repeats: 5,
  trialsText: '10,000 times',
  outputFile: 'legacy-truth-double-bio-probe.json',
});
```

Keep the simulator tab focused and let the collector finish without interacting with the page.

## Save The Downloaded Result

Move or rename the downloaded JSON to:

```bash
./tmp/legacy-truth-double-bio-probe-truth.json
```

## Compare Against The Current Sim

Exact compare command:

```bash
env LEGACY_SHARED_HIT=1 LEGACY_SHARED_SKILL='none' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_ATTACKERS='CUSTOM' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe-truth.json ./legacy-sim-v1.0.4-clean.js
```
