# Legacy Sims

Reverse-engineered Legacy combat simulators.

## Repo Layout

- `simulator/`: canonical Node entrypoints for the current simulator workflows.
- `data/`: shared non-app assets, including `legacy-defs.js`, `legacy-defenders.js`, and truth fixtures.
- `tools/`: helper scripts such as truth collection and replay comparison.
- `archive/`: historical versioned simulator files kept for reference.

## Primary Commands

Run the latest Node simulators:

```bash
npm run legacy
npm run brute
```

Run replay-based regression comparison against the shared truth fixture:

```bash
npm run compare
```

`npm run verify` currently aliases the same replay-compare flow so there is one obvious regression-check command path.

## Shared Data

Shared item, crystal, and upgrade definitions live in `data/legacy-defs.js`.

Shared defender payloads live in `data/legacy-defenders.js`.

The current truth replay fixture lives in `data/truth/legacy-truth-stratified-v1.json`.

Thin root wrappers for `legacy-defs.js` and `legacy-defenders.js` remain in place for compatibility with older scripts.

## Regression Checking

Replay-based regression tooling lives in `tools/legacy-truth-replay-compare.js`.

The default root scripts target:

- truth fixture: `data/truth/legacy-truth-stratified-v1.json`
- simulator: `simulator/legacy-sim-latest.js`

Archived versioned simulator files remain under `archive/` for manual comparison or historical reference.
