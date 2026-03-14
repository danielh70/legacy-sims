#!/usr/bin/env node
'use strict';

// Usage:
//   mkdir -p ./tmp && \
//   LEGACY_DEFENDER_FILE=./data/legacy-defenders-meta-v2-curated.js \
//   LEGACY_VERIFY_DEFENDERS=all \
//   node ./tools/export-legacy-truth-config.js > ./tmp/legacy-truth-config.json
//
// Notes:
// - Exports exactly one attacker: the currently resolved attacker from legacy-sim-v1.0.4-clean.js.
// - Respects LEGACY_DEFENDER_FILE and LEGACY_VERIFY_DEFENDERS exactly as the simulator resolves them.
// - Fails loudly on malformed config or unresolved defender names.

const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const simBridge = require(path.join(repoRoot, 'legacy-sim-v1.0.4-clean.js'));

function main() {
  if (!simBridge || typeof simBridge.resolveLegacyTruthBridgeConfig !== 'function') {
    throw new Error('legacy-sim bridge export is unavailable: resolveLegacyTruthBridgeConfig()');
  }

  const payload = simBridge.resolveLegacyTruthBridgeConfig();
  process.stdout.write(JSON.stringify(payload, null, 2));
  process.stdout.write('\n');
}

try {
  main();
} catch (err) {
  const message = err && err.stack ? err.stack : String(err);
  process.stderr.write(`[export-legacy-truth-config] ${message}\n`);
  process.exit(1);
}
