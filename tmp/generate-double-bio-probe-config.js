#!/usr/bin/env node
'use strict';

process.env.LEGACY_DEFENDER_FILE = './data/legacy-defenders-meta-v4-curated.js';

const sim = require('../legacy-sim-v1.0.4-clean.js');

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function slot(name, crystal) {
  return {
    name,
    crystal,
    upgrades: [],
    crystals: [crystal, crystal, crystal, crystal],
  };
}

function baseExport() {
  return sim.resolveLegacyTruthBridgeConfig('DL Dual Rift Bio,DL Core/Rift Bio');
}

function findDefender(exportCfg, name) {
  const found = exportCfg.defenders.find((d) => d.name === name);
  if (!found) throw new Error(`Missing base defender shell: ${name}`);
  return found;
}

function makeDefender(name, baseBuild, misc1, misc2) {
  const build = clone(baseBuild);
  build.misc1 = slot(misc1.name, misc1.crystal);
  build.misc2 = slot(misc2.name, misc2.crystal);
  return { name, build };
}

function main() {
  const base = baseExport();
  const dual = findDefender(base, 'DL Dual Rift Bio').build;
  const core = findDefender(base, 'DL Core/Rift Bio').build;

  const defenders = [
    makeDefender(
      'DL Dual Rift No Bio',
      dual,
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Dual Rift One Bio P4',
      dual,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Dual Rift Two Bio P4',
      dual,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Dual Rift Bio P4 + O4',
      dual,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Orange Crystal' },
    ),
    makeDefender(
      'DL Core/Rift No Bio',
      core,
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Core/Rift One Bio P4',
      core,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Scout Drones', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Core/Rift Two Bio P4',
      core,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
    ),
    makeDefender(
      'DL Core/Rift Bio P4 + O4',
      core,
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
      { name: 'Bio Spinal Enhancer', crystal: 'Perfect Orange Crystal' },
    ),
  ];

  const out = {
    meta: {
      ...clone(base.meta),
      sourceDefenderFile: './tmp/legacy-truth-double-bio-probe-config.json',
      sourceDefenderPath: './tmp/legacy-truth-double-bio-probe-config.json',
      defenderTriedFiles: [
        './data/legacy-defenders-meta-v4-curated.js',
        './tmp/legacy-truth-double-bio-probe-config.json',
      ],
      defenderCount: defenders.length,
      verifyDefendersRaw: defenders.map((d) => d.name).join(','),
      verifyDefendersMode: 'custom-double-bio-probe',
    },
    attackers: clone(base.attackers),
    defenders,
  };

  process.stdout.write(JSON.stringify(out, null, 2));
  process.stdout.write('\n');
}

main();
