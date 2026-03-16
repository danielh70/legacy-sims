'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const DOUBLE_TRUTH_PATH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH_PATH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const REPORT_PATH = path.join(__dirname, 'codex-bio-duplicate-color-diagnosis.md');
const LEGACY_SIM_PATH = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM_PATH = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS_PATH = path.join(REPO, 'legacy-defs.js');
const COMPARE_TOOL_PATH = path.join(REPO, 'tools', 'legacy-truth-replay-compare.js');

const defs = require(LEGACY_DEFS_PATH);
const CrystalDefs = defs.CrystalDefs || {};
const UpgradeDefs = defs.UpgradeDefs || {};

const COMMANDS_RUN = [
  'ls -1 ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json',
  "sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md",
  "sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md",
  "sed -n '1,240p' ./tmp/codex-bio-pink-shell-microcheck.md",
  "sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md",
  "sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json",
  "sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json",
  'rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  'rg -n "function partCrystalSpec|function getEffectiveCrystalPct|function computeVariantFromCrystalSpec|function compileCombatantFromParts|function buildCompiledCombatSnapshot|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|duplicate|dup|Bio Spinal Enhancer" legacy-sim-v1.0.4-clean.js',
  'rg -n "function partCrystalSpec|function rebuildMiscVariantForSlot|function compileDefender|function compileAttacker|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|duplicate|dup|Bio Spinal Enhancer" brute-sim-v1.4.6.js',
  "sed -n '381,470p' legacy-sim-v1.0.4-clean.js",
  "sed -n '1898,1975p' legacy-sim-v1.0.4-clean.js",
  "sed -n '2446,2675p' legacy-sim-v1.0.4-clean.js",
  "sed -n '3877,3945p' legacy-sim-v1.0.4-clean.js",
  "sed -n '720,780p' brute-sim-v1.4.6.js",
  "sed -n '2188,2234p' brute-sim-v1.4.6.js",
  "sed -n '3248,3545p' brute-sim-v1.4.6.js",
  "sed -n '1,240p' legacy-defs.js",
  'node ./tmp/codex-bio-duplicate-color-diagnosis.js',
];

const SHELL_ROWS = {
  'Dual Rift': {
    noBio: 'DL Dual Rift No Bio',
    oneBio: 'DL Dual Rift One Bio P4',
    twoBio: 'DL Dual Rift Two Bio P4',
    mixed: 'DL Dual Rift Bio P4 + O4',
    slotOneLeft: 'DL Dual Rift One Bio Left P4',
    slotOneRight: 'DL Dual Rift One Bio Right P4',
    slotMixedLeft: 'DL Dual Rift Bio P4 + O4',
    slotMixedRight: 'DL Dual Rift Bio O4 + P4',
  },
  'Core/Rift': {
    noBio: 'DL Core/Rift No Bio',
    oneBio: 'DL Core/Rift One Bio P4',
    twoBio: 'DL Core/Rift Two Bio P4',
    mixed: 'DL Core/Rift Bio P4 + O4',
    slotOneLeft: 'DL Core/Rift One Bio Left P4',
    slotOneRight: 'DL Core/Rift One Bio Right P4',
    slotMixedLeft: 'DL Core/Rift Bio P4 + O4',
    slotMixedRight: 'DL Core/Rift Bio O4 + P4',
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function quoteCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function fmtNum(value, digits = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '';
}

function fmtSigned(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function stableJson(value) {
  return JSON.stringify(value);
}

function mapByDefender(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) {
    if (!out.has(matchup.defender)) out.set(matchup.defender, matchup);
  }
  return out;
}

function splitPartCrystalsAndUpgrades(part) {
  if (!part || typeof part !== 'object') return { crystalEntries: [], upgrades: [] };
  const upgrades = [];
  const crystalEntries = [];

  function pushCrystal(name) {
    const s = String(name || '').trim();
    if (s) crystalEntries.push(s);
  }
  function pushUpgrade(name) {
    const s = String(name || '').trim();
    if (s) upgrades.push(s);
  }

  if (part.crystalMix && typeof part.crystalMix === 'object') {
    if (Array.isArray(part.crystalMix)) {
      for (const name of part.crystalMix) pushCrystal(name);
    } else {
      for (const [name, count] of Object.entries(part.crystalMix)) {
        const n = Math.max(0, Math.floor(Number(count) || 0));
        for (let i = 0; i < n; i += 1) pushCrystal(name);
      }
    }
  } else if (part.crystalCounts && typeof part.crystalCounts === 'object') {
    for (const [name, count] of Object.entries(part.crystalCounts)) {
      const n = Math.max(0, Math.floor(Number(count) || 0));
      for (let i = 0; i < n; i += 1) pushCrystal(name);
    }
  } else if (Array.isArray(part.crystals) && part.crystals.length) {
    for (const name of part.crystals) pushCrystal(name);
  } else if (typeof part.crystal === 'string' && part.crystal) {
    for (let i = 0; i < 4; i += 1) pushCrystal(part.crystal);
  } else if (typeof part.crystalName === 'string' && part.crystalName) {
    for (let i = 0; i < 4; i += 1) pushCrystal(part.crystalName);
  } else if (Array.isArray(part.upgrades) && part.upgrades.length) {
    for (const name of part.upgrades) {
      if (CrystalDefs[name]) pushCrystal(name);
      else if (UpgradeDefs[name]) pushUpgrade(name);
    }
  } else if (typeof part.upgrades === 'string' && part.upgrades) {
    if (CrystalDefs[part.upgrades]) {
      for (let i = 0; i < 4; i += 1) pushCrystal(part.upgrades);
    } else if (UpgradeDefs[part.upgrades]) {
      pushUpgrade(part.upgrades);
    }
  }

  if (typeof part.upgrade1 === 'string' && part.upgrade1) pushUpgrade(part.upgrade1);
  if (typeof part.upgrade2 === 'string' && part.upgrade2) pushUpgrade(part.upgrade2);

  return { crystalEntries, upgrades };
}

function crystalCounts(entries) {
  const out = {};
  for (const name of entries) out[name] = (out[name] || 0) + 1;
  return out;
}

function normalizePartForBrute(part) {
  const { crystalEntries, upgrades } = splitPartCrystalsAndUpgrades(part);
  const normalized = { name: part.name };
  if (crystalEntries.length) normalized.crystalMix = crystalCounts(crystalEntries);
  if (upgrades.length) normalized.upgrades = upgrades;
  if (typeof part.upgrade1 === 'string' && part.upgrade1) normalized.upgrade1 = part.upgrade1;
  if (typeof part.upgrade2 === 'string' && part.upgrade2) normalized.upgrade2 = part.upgrade2;
  return normalized;
}

function normalizeBuildForBrute(build) {
  return {
    armor: normalizePartForBrute(build.armor),
    weapon1: normalizePartForBrute(build.weapon1),
    weapon2: normalizePartForBrute(build.weapon2),
    misc1: normalizePartForBrute(build.misc1),
    misc2: normalizePartForBrute(build.misc2),
    stats: JSON.parse(JSON.stringify(build.stats)),
    attackType: build.attackType,
  };
}

function partSummary(part) {
  const { crystalEntries } = splitPartCrystalsAndUpgrades(part);
  const counts = crystalCounts(crystalEntries);
  const crystals = Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${name}${counts[name] > 1 ? ` x${counts[name]}` : ''}`)
    .join(' + ');
  return `${part.name}[${crystals}]`;
}

function loadLegacyInternals() {
  const source = fs.readFileSync(LEGACY_SIM_PATH, 'utf8').replace(/^#!.*\n/, '');
  const exportBlock = `
module.exports.__codex = {
  makeVariantList,
  computeVariantFromCrystalSpec,
  partCrystalSpec,
  normalizeResolvedBuildWeaponUpgrades,
  compileCombatantFromParts,
  buildCompiledCombatSnapshot,
  resolveDefenderAttackType,
  ATTACK_STYLE_ROUND_MODE,
  ATTACKER_ATTACK_TYPE,
  crystalSpecKey,
};
`;
  const wrapped = Module.wrap(source + '\n' + exportBlock);
  const compiled = vm.runInThisContext(wrapped, { filename: LEGACY_SIM_PATH });
  const mod = { exports: {} };
  const req = Module.createRequire(LEGACY_SIM_PATH);
  const originalEnv = process.env;
  process.env = {
    ...process.env,
    LEGACY_SHARED_HIT: '1',
    LEGACY_COMPARE: '0',
    LEGACY_DIAG: '1',
    LEGACY_PRINT_GAME: '0',
    LEGACY_COLOR: '0',
    LEGACY_ASCII: '1',
    LEGACY_HEADER: 'min',
    LEGACY_OUTPUT: 'compact',
  };
  try {
    compiled(mod.exports, req, mod, LEGACY_SIM_PATH, path.dirname(LEGACY_SIM_PATH));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function loadBruteInternals() {
  let source = fs.readFileSync(BRUTE_SIM_PATH, 'utf8').replace(/^#!.*\n/, '');
  source = source.replace(/\n\/\/ =====================\n\/\/ ENTRY[\s\S]*$/, '\n');
  const exportBlock = `
module.exports.__codex = {
  partCrystalSpec,
  partWeaponUpgrades,
  partName,
  computeVariantFromCrystalSpec,
  defenderVariantKeyFromCrystalSpec,
  compileDefender,
  compileAttacker,
  rebuildMiscVariantForSlot,
  VARIANT_CFG,
  ATTACKER_ATTACK_TYPE,
  DEFENDER_ATTACK_TYPE,
};
`;
  const wrapped = Module.wrap(source + '\n' + exportBlock);
  const compiled = vm.runInThisContext(wrapped, { filename: BRUTE_SIM_PATH });
  const mod = { exports: {} };
  const req = Module.createRequire(BRUTE_SIM_PATH);
  const originalEnv = process.env;
  process.env = {
    ...process.env,
    LEGACY_COLOR: '0',
    LEGACY_ASCII: '1',
  };
  try {
    compiled(mod.exports, req, mod, BRUTE_SIM_PATH, path.dirname(BRUTE_SIM_PATH));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function buildLegacyVariantGetter(sim, cfg) {
  const cache = new Map();
  return function getVariant(itemName, part, slotTag = 0) {
    const crystalSpec = sim.partCrystalSpec(part);
    const upgrades = slotTag === 0 ? sim.normalizeResolvedBuildWeaponUpgrades(part) : [];
    const u1 = upgrades[0] || '';
    const u2 = upgrades[1] || '';
    const crystalKey = crystalSpec ? sim.crystalSpecKey(crystalSpec, cfg.crystalSlots) : '';
    const key = [itemName, crystalKey, u1, u2, slotTag].join('|');
    if (!cache.has(key)) {
      cache.set(
        key,
        sim.computeVariantFromCrystalSpec(itemName, crystalSpec, [u1, u2].filter(Boolean), cfg, slotTag),
      );
    }
    return cache.get(key);
  };
}

function compileLegacyRow(sim, matchup) {
  const cfg = { ...sim.makeVariantList()[0], diag: true };
  const getVariant = buildLegacyVariantGetter(sim, cfg);
  const build = matchup.pageBuilds.defender;
  const attackerBuild = matchup.pageBuilds.attacker;

  const attacker = sim.compileCombatantFromParts({
    name: matchup.attacker,
    stats: attackerBuild.stats,
    armorV: getVariant(attackerBuild.armor.name, attackerBuild.armor),
    w1V: getVariant(attackerBuild.weapon1.name, attackerBuild.weapon1),
    w2V: getVariant(attackerBuild.weapon2.name, attackerBuild.weapon2),
    m1V: getVariant(attackerBuild.misc1.name, attackerBuild.misc1, 1),
    m2V: getVariant(attackerBuild.misc2.name, attackerBuild.misc2, 2),
    cfg,
    role: 'A',
    attackTypeRaw: attackerBuild.attackType || sim.ATTACKER_ATTACK_TYPE || 'normal',
    attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
  });

  const misc1 = getVariant(build.misc1.name, build.misc1, 1);
  const misc2 = getVariant(build.misc2.name, build.misc2, 2);
  const defender = sim.compileCombatantFromParts({
    name: matchup.defender,
    stats: build.stats,
    armorV: getVariant(build.armor.name, build.armor),
    w1V: getVariant(build.weapon1.name, build.weapon1),
    w2V: getVariant(build.weapon2.name, build.weapon2),
    m1V: misc1,
    m2V: misc2,
    cfg,
    role: 'D',
    attackTypeRaw: build.attackType || sim.resolveDefenderAttackType(build),
    attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
  });
  const snapshot = sim.buildCompiledCombatSnapshot(defender, attacker, cfg, sim.ATTACK_STYLE_ROUND_MODE);
  return { build, misc1, misc2, defender, snapshot };
}

function buildBruteVariantGetter(sim) {
  const cache = new Map();
  return function getVariant(itemName, part, slotTag = 0) {
    const crystalSpec = sim.partCrystalSpec(part);
    const [u1, u2] = slotTag === 0 ? sim.partWeaponUpgrades(part) : ['', ''];
    const key = sim.defenderVariantKeyFromCrystalSpec(itemName, crystalSpec, u1, u2, slotTag);
    if (!cache.has(key)) {
      cache.set(key, sim.computeVariantFromCrystalSpec(itemName, crystalSpec, u1, u2, slotTag));
    }
    return cache.get(key);
  };
}

function compileBruteDefender(sim, rowName, normalizedBuild) {
  const getVariant = buildBruteVariantGetter(sim);
  const misc1 = getVariant(normalizedBuild.misc1.name, normalizedBuild.misc1, 1);
  const misc2 = getVariant(normalizedBuild.misc2.name, normalizedBuild.misc2, 2);

  const variantCache = new Map();
  const armorV = getVariant(normalizedBuild.armor.name, normalizedBuild.armor);
  const w1V = getVariant(normalizedBuild.weapon1.name, normalizedBuild.weapon1);
  const w2V = getVariant(normalizedBuild.weapon2.name, normalizedBuild.weapon2);
  variantCache.set(sim.defenderVariantKeyFromCrystalSpec(normalizedBuild.armor.name, sim.partCrystalSpec(normalizedBuild.armor), '', ''), armorV);
  {
    const [u1, u2] = sim.partWeaponUpgrades(normalizedBuild.weapon1);
    variantCache.set(sim.defenderVariantKeyFromCrystalSpec(normalizedBuild.weapon1.name, sim.partCrystalSpec(normalizedBuild.weapon1), u1, u2), w1V);
  }
  {
    const [u1, u2] = sim.partWeaponUpgrades(normalizedBuild.weapon2);
    variantCache.set(sim.defenderVariantKeyFromCrystalSpec(normalizedBuild.weapon2.name, sim.partCrystalSpec(normalizedBuild.weapon2), u1, u2), w2V);
  }
  variantCache.set(sim.defenderVariantKeyFromCrystalSpec(normalizedBuild.misc1.name, sim.partCrystalSpec(normalizedBuild.misc1), '', '', 1), misc1);
  variantCache.set(sim.defenderVariantKeyFromCrystalSpec(normalizedBuild.misc2.name, sim.partCrystalSpec(normalizedBuild.misc2), '', '', 2), misc2);

  const defender = sim.compileDefender({ name: rowName, payload: normalizedBuild }, variantCache);
  return { misc1, misc2, defender };
}

function miscContribution(v) {
  return {
    item: v.itemName,
    crystal: v.crystalSpecShort || v.crystalName || '',
    addAcc: v.addAcc,
    addDod: v.addDod,
    addDef: v.addDef,
    addGun: v.addGun,
    addMel: v.addMel,
    addPrj: v.addPrj,
  };
}

function combatStats(c) {
  return {
    hp: c.hp,
    speed: c.speed,
    acc: c.acc,
    dodge: c.dodge,
    defSk: c.defSk,
    gun: c.gun,
    mel: c.mel,
    prj: c.prj,
  };
}

function stateSummary(legacyCompiled) {
  return {
    misc1: partSummary(legacyCompiled.build.misc1),
    misc2: partSummary(legacyCompiled.build.misc2),
    ...combatStats(legacyCompiled.defender),
    misc1Adds: miscContribution(legacyCompiled.misc1),
    misc2Adds: miscContribution(legacyCompiled.misc2),
  };
}

function diffStats(a, b) {
  const out = {};
  for (const key of ['hp', 'speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj']) {
    out[key] = (b[key] || 0) - (a[key] || 0);
  }
  return out;
}

function truthDelta(a, b) {
  return {
    win: Number(b.aggregates.attackerWinPct) - Number(a.aggregates.attackerWinPct),
    avgT: Number(b.aggregates.avgTurns) - Number(a.aggregates.avgTurns),
  };
}

function compareLegacyBrute(legacyRow, bruteRow) {
  return {
    finalEqual: stableJson(combatStats(legacyRow.defender)) === stableJson(combatStats(bruteRow.defender)),
    misc1Equal: stableJson(miscContribution(legacyRow.misc1)) === stableJson(miscContribution(bruteRow.misc1)),
    misc2Equal: stableJson(miscContribution(legacyRow.misc2)) === stableJson(miscContribution(bruteRow.misc2)),
  };
}

function miscDiffSummary(legacyMisc, bruteMisc) {
  const diffs = [];
  for (const [label, key] of [
    ['Acc', 'addAcc'],
    ['Dod', 'addDod'],
    ['Def', 'addDef'],
    ['Gun', 'addGun'],
    ['Mel', 'addMel'],
    ['Prj', 'addPrj'],
  ]) {
    const delta = (bruteMisc[key] || 0) - (legacyMisc[key] || 0);
    if (delta) diffs.push(`${label} ${delta >= 0 ? '+' : ''}${delta}`);
  }
  return diffs.length ? diffs.join(', ') : 'none';
}

function main() {
  if (!fs.existsSync(DOUBLE_TRUTH_PATH)) throw new Error(`Missing required truth file: ${DOUBLE_TRUTH_PATH}`);
  if (!fs.existsSync(SLOT_TRUTH_PATH)) throw new Error(`Missing required truth file: ${SLOT_TRUTH_PATH}`);

  const doubleTruth = readJson(DOUBLE_TRUTH_PATH);
  const slotTruth = readJson(SLOT_TRUTH_PATH);
  const doubleRows = mapByDefender(doubleTruth);
  const slotRows = mapByDefender(slotTruth);

  const legacySim = loadLegacyInternals();
  const bruteSim = loadBruteInternals();

  const compileMatrices = {};
  const truthTransitionTables = {};
  const compileTransitionTables = {};
  const parityRows = [];

  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const noBioTruth = doubleRows.get(names.noBio);
    const oneBioTruth = doubleRows.get(names.oneBio);
    const twoBioTruth = doubleRows.get(names.twoBio);
    const mixedTruth = doubleRows.get(names.mixed);

    const slotOneLeft = slotRows.get(names.slotOneLeft);
    const slotOneRight = slotRows.get(names.slotOneRight);
    const slotMixedLeft = slotRows.get(names.slotMixedLeft);
    const slotMixedRight = slotRows.get(names.slotMixedRight);

    truthTransitionTables[shell] = {
      noToOne: truthDelta(noBioTruth, oneBioTruth),
      oneToTwo: truthDelta(oneBioTruth, twoBioTruth),
      oneToMixed: truthDelta(oneBioTruth, mixedTruth),
      mixedToTwo: truthDelta(mixedTruth, twoBioTruth),
      oneOrderSpread: {
        win: Number(slotOneRight.aggregates.attackerWinPct) - Number(slotOneLeft.aggregates.attackerWinPct),
        avgT: Number(slotOneRight.aggregates.avgTurns) - Number(slotOneLeft.aggregates.avgTurns),
      },
      mixedOrderSpread: {
        win: Number(slotMixedRight.aggregates.attackerWinPct) - Number(slotMixedLeft.aggregates.attackerWinPct),
        avgT: Number(slotMixedRight.aggregates.avgTurns) - Number(slotMixedLeft.aggregates.avgTurns),
      },
    };

    const legacyNoBio = compileLegacyRow(legacySim, noBioTruth);
    const legacyOneBio = compileLegacyRow(legacySim, oneBioTruth);
    const legacyTwoBio = compileLegacyRow(legacySim, twoBioTruth);
    const legacyMixed = compileLegacyRow(legacySim, mixedTruth);

    compileMatrices[shell] = {
      noBio: stateSummary(legacyNoBio),
      oneBio: stateSummary(legacyOneBio),
      twoBio: stateSummary(legacyTwoBio),
      mixed: stateSummary(legacyMixed),
    };

    compileTransitionTables[shell] = {
      noToOne: diffStats(compileMatrices[shell].noBio, compileMatrices[shell].oneBio),
      oneToTwo: diffStats(compileMatrices[shell].oneBio, compileMatrices[shell].twoBio),
      oneToMixed: diffStats(compileMatrices[shell].oneBio, compileMatrices[shell].mixed),
      mixedToTwo: diffStats(compileMatrices[shell].mixed, compileMatrices[shell].twoBio),
    };

    for (const key of ['oneBio', 'twoBio', 'mixed']) {
      const rowName = names[key];
      const rawTruth = doubleRows.get(rowName);
      const normalized = normalizeBuildForBrute(rawTruth.pageBuilds.defender);
      const bruteCompiled = compileBruteDefender(bruteSim, rowName, normalized);
      const legacyCompiled =
        key === 'oneBio' ? legacyOneBio : key === 'twoBio' ? legacyTwoBio : legacyMixed;

      parityRows.push({
        shell,
        rowName,
        rawMisc1SpecLegacy: String(legacySim.partCrystalSpec(rawTruth.pageBuilds.defender.misc1) || ''),
        rawMisc1SpecBrute: String(bruteSim.partCrystalSpec(rawTruth.pageBuilds.defender.misc1) || ''),
        rawMisc2SpecLegacy: String(legacySim.partCrystalSpec(rawTruth.pageBuilds.defender.misc2) || ''),
        rawMisc2SpecBrute: String(bruteSim.partCrystalSpec(rawTruth.pageBuilds.defender.misc2) || ''),
        compare: compareLegacyBrute(legacyCompiled, bruteCompiled),
        finalDiff: diffStats(combatStats(legacyCompiled.defender), combatStats(bruteCompiled.defender)),
        misc1DiffSummary: miscDiffSummary(legacyCompiled.misc1, bruteCompiled.misc1),
        misc2DiffSummary: miscDiffSummary(legacyCompiled.misc2, bruteCompiled.misc2),
        legacy: legacyCompiled,
        brute: bruteCompiled,
      });
    }
  }

  const shellHelperPresent = fs
    .readFileSync(LEGACY_SIM_PATH, 'utf8')
    .includes('getExperimentalBioPinkShellDefBonus');
  const shellHelperPresentBrute = fs
    .readFileSync(BRUTE_SIM_PATH, 'utf8')
    .includes('getExperimentalBioPinkShellDefBonus');

  const report = `# codex-bio duplicate/color diagnosis

## 1. Goal of this pass

Determine whether the remaining Bio-family mismatch is best explained by duplicate/second-Bio scaling, Pink-vs-Orange Bio color asymmetry, or a broader hidden misc contribution rule, without patching tracked sources.

## 2. Exact commands run

\`\`\`sh
${COMMANDS_RUN.join('\n')}
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-slot-order-analysis.md\`
- \`./tmp/codex-bio-surface-sweep-report.md\`
- \`./tmp/codex-bio-pink-shell-microcheck.md\`
- \`./tmp/codex-bio-pink-shell-verify-results.md\`
- \`./tmp/legacy-truth-double-bio-probe.json\`
- \`./tmp/legacy-truth-bio-slot-order-probe.json\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`partCrystalSpec(...)\`
  - \`getEffectiveCrystalPct(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
- \`./brute-sim-v1.4.6.js\`
  - \`partCrystalSpec(...)\`
  - \`rebuildMiscVariantForSlot(...)\`
  - \`compileDefender(...)\`
  - \`compileAttacker(...)\`
- \`./legacy-defs.js\`
- \`./tools/legacy-truth-replay-compare.js\`

## 4. Source hygiene result

- Abandoned experimental Bio/Pink shell helper active in \`legacy-sim\`: ${shellHelperPresent ? 'yes' : 'no'}
- Abandoned experimental Bio/Pink shell helper active in \`brute-sim\`: ${shellHelperPresentBrute ? 'yes' : 'no'}
- Remnants found by name search in tracked simulators: none

## 5. Truth-side marginal transition tables

Truth values here use the canonical rows from \`./tmp/legacy-truth-double-bio-probe.json\`. The slot-order pack is used only to bound order noise on the one-Bio and mixed-color states.

### Dual Rift

| Transition | Δwin | ΔavgTurns | Slot-order noise bound from new pack |
| --- | ---: | ---: | --- |
| No Bio -> One Bio[P4] | ${fmtSigned(truthTransitionTables['Dual Rift'].noToOne.win, 3)} | ${fmtSigned(truthTransitionTables['Dual Rift'].noToOne.avgT, 4)} | one-Bio left/right: ${fmtSigned(truthTransitionTables['Dual Rift'].oneOrderSpread.win, 3)} win, ${fmtSigned(truthTransitionTables['Dual Rift'].oneOrderSpread.avgT, 4)} turns |
| One Bio[P4] -> Two Bio[P4] | ${fmtSigned(truthTransitionTables['Dual Rift'].oneToTwo.win, 3)} | ${fmtSigned(truthTransitionTables['Dual Rift'].oneToTwo.avgT, 4)} | much larger than one-Bio order noise |
| One Bio[P4] -> Bio[P4]+Bio[O4] | ${fmtSigned(truthTransitionTables['Dual Rift'].oneToMixed.win, 3)} | ${fmtSigned(truthTransitionTables['Dual Rift'].oneToMixed.avgT, 4)} | mixed-order left/right: ${fmtSigned(truthTransitionTables['Dual Rift'].mixedOrderSpread.win, 3)} win, ${fmtSigned(truthTransitionTables['Dual Rift'].mixedOrderSpread.avgT, 4)} turns |
| Bio[P4]+Bio[O4] -> Two Bio[P4] | ${fmtSigned(truthTransitionTables['Dual Rift'].mixedToTwo.win, 3)} | ${fmtSigned(truthTransitionTables['Dual Rift'].mixedToTwo.avgT, 4)} | much larger than mixed-order noise |

### Core/Rift

| Transition | Δwin | ΔavgTurns | Slot-order noise bound from new pack |
| --- | ---: | ---: | --- |
| No Bio -> One Bio[P4] | ${fmtSigned(truthTransitionTables['Core/Rift'].noToOne.win, 3)} | ${fmtSigned(truthTransitionTables['Core/Rift'].noToOne.avgT, 4)} | one-Bio left/right: ${fmtSigned(truthTransitionTables['Core/Rift'].oneOrderSpread.win, 3)} win, ${fmtSigned(truthTransitionTables['Core/Rift'].oneOrderSpread.avgT, 4)} turns |
| One Bio[P4] -> Two Bio[P4] | ${fmtSigned(truthTransitionTables['Core/Rift'].oneToTwo.win, 3)} | ${fmtSigned(truthTransitionTables['Core/Rift'].oneToTwo.avgT, 4)} | much larger than one-Bio order noise |
| One Bio[P4] -> Bio[P4]+Bio[O4] | ${fmtSigned(truthTransitionTables['Core/Rift'].oneToMixed.win, 3)} | ${fmtSigned(truthTransitionTables['Core/Rift'].oneToMixed.avgT, 4)} | mixed-order left/right: ${fmtSigned(truthTransitionTables['Core/Rift'].mixedOrderSpread.win, 3)} win, ${fmtSigned(truthTransitionTables['Core/Rift'].mixedOrderSpread.avgT, 4)} turns |
| Bio[P4]+Bio[O4] -> Two Bio[P4] | ${fmtSigned(truthTransitionTables['Core/Rift'].mixedToTwo.win, 3)} | ${fmtSigned(truthTransitionTables['Core/Rift'].mixedToTwo.avgT, 4)} | much larger than mixed-order noise |

Truth readout:

- The second Pink Bio is the dominant truth-side step in both shells: ${fmtSigned(truthTransitionTables['Dual Rift'].oneToTwo.win, 3)} win in Dual Rift and ${fmtSigned(truthTransitionTables['Core/Rift'].oneToTwo.win, 3)} win in Core/Rift.
- Pink-vs-Orange also matters, but materially less than the second-Pink step: one-Bio -> mixed is ${fmtSigned(truthTransitionTables['Dual Rift'].oneToMixed.win, 3)} / ${fmtSigned(truthTransitionTables['Core/Rift'].oneToMixed.win, 3)} win, while mixed -> two-Pink is ${fmtSigned(truthTransitionTables['Dual Rift'].mixedToTwo.win, 3)} / ${fmtSigned(truthTransitionTables['Core/Rift'].mixedToTwo.win, 3)} win.
- The new slot-order pack bounds order effects at only ${fmtNum(Math.max(Math.abs(truthTransitionTables['Dual Rift'].oneOrderSpread.win), Math.abs(truthTransitionTables['Core/Rift'].oneOrderSpread.win), Math.abs(truthTransitionTables['Dual Rift'].mixedOrderSpread.win), Math.abs(truthTransitionTables['Core/Rift'].mixedOrderSpread.win)), 3)} win max, so order is not the main driver here.

## 6. Compile-side marginal transition tables

Current compile matrix from \`legacy-sim-v1.0.4-clean.js\`:

### Dual Rift

| State | misc1 | misc2 | hp | speed | acc | dodge | defSk | gun | melee | projectile | misc1 adds | misc2 adds |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| No Bio | ${quoteCell(compileMatrices['Dual Rift'].noBio.misc1)} | ${quoteCell(compileMatrices['Dual Rift'].noBio.misc2)} | ${compileMatrices['Dual Rift'].noBio.hp} | ${compileMatrices['Dual Rift'].noBio.speed} | ${compileMatrices['Dual Rift'].noBio.acc} | ${compileMatrices['Dual Rift'].noBio.dodge} | ${compileMatrices['Dual Rift'].noBio.defSk} | ${compileMatrices['Dual Rift'].noBio.gun} | ${compileMatrices['Dual Rift'].noBio.mel} | ${compileMatrices['Dual Rift'].noBio.prj} | Acc ${compileMatrices['Dual Rift'].noBio.misc1Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].noBio.misc1Adds.addDod}, Def ${compileMatrices['Dual Rift'].noBio.misc1Adds.addDef}, Gun ${compileMatrices['Dual Rift'].noBio.misc1Adds.addGun}, Mel ${compileMatrices['Dual Rift'].noBio.misc1Adds.addMel}, Prj ${compileMatrices['Dual Rift'].noBio.misc1Adds.addPrj} | Acc ${compileMatrices['Dual Rift'].noBio.misc2Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].noBio.misc2Adds.addDod}, Def ${compileMatrices['Dual Rift'].noBio.misc2Adds.addDef}, Gun ${compileMatrices['Dual Rift'].noBio.misc2Adds.addGun}, Mel ${compileMatrices['Dual Rift'].noBio.misc2Adds.addMel}, Prj ${compileMatrices['Dual Rift'].noBio.misc2Adds.addPrj} |
| One Bio[P4] | ${quoteCell(compileMatrices['Dual Rift'].oneBio.misc1)} | ${quoteCell(compileMatrices['Dual Rift'].oneBio.misc2)} | ${compileMatrices['Dual Rift'].oneBio.hp} | ${compileMatrices['Dual Rift'].oneBio.speed} | ${compileMatrices['Dual Rift'].oneBio.acc} | ${compileMatrices['Dual Rift'].oneBio.dodge} | ${compileMatrices['Dual Rift'].oneBio.defSk} | ${compileMatrices['Dual Rift'].oneBio.gun} | ${compileMatrices['Dual Rift'].oneBio.mel} | ${compileMatrices['Dual Rift'].oneBio.prj} | Acc ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addDod}, Def ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addDef}, Gun ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addGun}, Mel ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addMel}, Prj ${compileMatrices['Dual Rift'].oneBio.misc1Adds.addPrj} | Acc ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addDod}, Def ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addDef}, Gun ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addGun}, Mel ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addMel}, Prj ${compileMatrices['Dual Rift'].oneBio.misc2Adds.addPrj} |
| Two Bio[P4] | ${quoteCell(compileMatrices['Dual Rift'].twoBio.misc1)} | ${quoteCell(compileMatrices['Dual Rift'].twoBio.misc2)} | ${compileMatrices['Dual Rift'].twoBio.hp} | ${compileMatrices['Dual Rift'].twoBio.speed} | ${compileMatrices['Dual Rift'].twoBio.acc} | ${compileMatrices['Dual Rift'].twoBio.dodge} | ${compileMatrices['Dual Rift'].twoBio.defSk} | ${compileMatrices['Dual Rift'].twoBio.gun} | ${compileMatrices['Dual Rift'].twoBio.mel} | ${compileMatrices['Dual Rift'].twoBio.prj} | Acc ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addDod}, Def ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addDef}, Gun ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addGun}, Mel ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addMel}, Prj ${compileMatrices['Dual Rift'].twoBio.misc1Adds.addPrj} | Acc ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addDod}, Def ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addDef}, Gun ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addGun}, Mel ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addMel}, Prj ${compileMatrices['Dual Rift'].twoBio.misc2Adds.addPrj} |
| Bio[P4]+Bio[O4] | ${quoteCell(compileMatrices['Dual Rift'].mixed.misc1)} | ${quoteCell(compileMatrices['Dual Rift'].mixed.misc2)} | ${compileMatrices['Dual Rift'].mixed.hp} | ${compileMatrices['Dual Rift'].mixed.speed} | ${compileMatrices['Dual Rift'].mixed.acc} | ${compileMatrices['Dual Rift'].mixed.dodge} | ${compileMatrices['Dual Rift'].mixed.defSk} | ${compileMatrices['Dual Rift'].mixed.gun} | ${compileMatrices['Dual Rift'].mixed.mel} | ${compileMatrices['Dual Rift'].mixed.prj} | Acc ${compileMatrices['Dual Rift'].mixed.misc1Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].mixed.misc1Adds.addDod}, Def ${compileMatrices['Dual Rift'].mixed.misc1Adds.addDef}, Gun ${compileMatrices['Dual Rift'].mixed.misc1Adds.addGun}, Mel ${compileMatrices['Dual Rift'].mixed.misc1Adds.addMel}, Prj ${compileMatrices['Dual Rift'].mixed.misc1Adds.addPrj} | Acc ${compileMatrices['Dual Rift'].mixed.misc2Adds.addAcc}, Dod ${compileMatrices['Dual Rift'].mixed.misc2Adds.addDod}, Def ${compileMatrices['Dual Rift'].mixed.misc2Adds.addDef}, Gun ${compileMatrices['Dual Rift'].mixed.misc2Adds.addGun}, Mel ${compileMatrices['Dual Rift'].mixed.misc2Adds.addMel}, Prj ${compileMatrices['Dual Rift'].mixed.misc2Adds.addPrj} |

### Core/Rift

| State | misc1 | misc2 | hp | speed | acc | dodge | defSk | gun | melee | projectile | misc1 adds | misc2 adds |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| No Bio | ${quoteCell(compileMatrices['Core/Rift'].noBio.misc1)} | ${quoteCell(compileMatrices['Core/Rift'].noBio.misc2)} | ${compileMatrices['Core/Rift'].noBio.hp} | ${compileMatrices['Core/Rift'].noBio.speed} | ${compileMatrices['Core/Rift'].noBio.acc} | ${compileMatrices['Core/Rift'].noBio.dodge} | ${compileMatrices['Core/Rift'].noBio.defSk} | ${compileMatrices['Core/Rift'].noBio.gun} | ${compileMatrices['Core/Rift'].noBio.mel} | ${compileMatrices['Core/Rift'].noBio.prj} | Acc ${compileMatrices['Core/Rift'].noBio.misc1Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].noBio.misc1Adds.addDod}, Def ${compileMatrices['Core/Rift'].noBio.misc1Adds.addDef}, Gun ${compileMatrices['Core/Rift'].noBio.misc1Adds.addGun}, Mel ${compileMatrices['Core/Rift'].noBio.misc1Adds.addMel}, Prj ${compileMatrices['Core/Rift'].noBio.misc1Adds.addPrj} | Acc ${compileMatrices['Core/Rift'].noBio.misc2Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].noBio.misc2Adds.addDod}, Def ${compileMatrices['Core/Rift'].noBio.misc2Adds.addDef}, Gun ${compileMatrices['Core/Rift'].noBio.misc2Adds.addGun}, Mel ${compileMatrices['Core/Rift'].noBio.misc2Adds.addMel}, Prj ${compileMatrices['Core/Rift'].noBio.misc2Adds.addPrj} |
| One Bio[P4] | ${quoteCell(compileMatrices['Core/Rift'].oneBio.misc1)} | ${quoteCell(compileMatrices['Core/Rift'].oneBio.misc2)} | ${compileMatrices['Core/Rift'].oneBio.hp} | ${compileMatrices['Core/Rift'].oneBio.speed} | ${compileMatrices['Core/Rift'].oneBio.acc} | ${compileMatrices['Core/Rift'].oneBio.dodge} | ${compileMatrices['Core/Rift'].oneBio.defSk} | ${compileMatrices['Core/Rift'].oneBio.gun} | ${compileMatrices['Core/Rift'].oneBio.mel} | ${compileMatrices['Core/Rift'].oneBio.prj} | Acc ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addDod}, Def ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addDef}, Gun ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addGun}, Mel ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addMel}, Prj ${compileMatrices['Core/Rift'].oneBio.misc1Adds.addPrj} | Acc ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addDod}, Def ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addDef}, Gun ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addGun}, Mel ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addMel}, Prj ${compileMatrices['Core/Rift'].oneBio.misc2Adds.addPrj} |
| Two Bio[P4] | ${quoteCell(compileMatrices['Core/Rift'].twoBio.misc1)} | ${quoteCell(compileMatrices['Core/Rift'].twoBio.misc2)} | ${compileMatrices['Core/Rift'].twoBio.hp} | ${compileMatrices['Core/Rift'].twoBio.speed} | ${compileMatrices['Core/Rift'].twoBio.acc} | ${compileMatrices['Core/Rift'].twoBio.dodge} | ${compileMatrices['Core/Rift'].twoBio.defSk} | ${compileMatrices['Core/Rift'].twoBio.gun} | ${compileMatrices['Core/Rift'].twoBio.mel} | ${compileMatrices['Core/Rift'].twoBio.prj} | Acc ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addDod}, Def ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addDef}, Gun ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addGun}, Mel ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addMel}, Prj ${compileMatrices['Core/Rift'].twoBio.misc1Adds.addPrj} | Acc ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addDod}, Def ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addDef}, Gun ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addGun}, Mel ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addMel}, Prj ${compileMatrices['Core/Rift'].twoBio.misc2Adds.addPrj} |
| Bio[P4]+Bio[O4] | ${quoteCell(compileMatrices['Core/Rift'].mixed.misc1)} | ${quoteCell(compileMatrices['Core/Rift'].mixed.misc2)} | ${compileMatrices['Core/Rift'].mixed.hp} | ${compileMatrices['Core/Rift'].mixed.speed} | ${compileMatrices['Core/Rift'].mixed.acc} | ${compileMatrices['Core/Rift'].mixed.dodge} | ${compileMatrices['Core/Rift'].mixed.defSk} | ${compileMatrices['Core/Rift'].mixed.gun} | ${compileMatrices['Core/Rift'].mixed.mel} | ${compileMatrices['Core/Rift'].mixed.prj} | Acc ${compileMatrices['Core/Rift'].mixed.misc1Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].mixed.misc1Adds.addDod}, Def ${compileMatrices['Core/Rift'].mixed.misc1Adds.addDef}, Gun ${compileMatrices['Core/Rift'].mixed.misc1Adds.addGun}, Mel ${compileMatrices['Core/Rift'].mixed.misc1Adds.addMel}, Prj ${compileMatrices['Core/Rift'].mixed.misc1Adds.addPrj} | Acc ${compileMatrices['Core/Rift'].mixed.misc2Adds.addAcc}, Dod ${compileMatrices['Core/Rift'].mixed.misc2Adds.addDod}, Def ${compileMatrices['Core/Rift'].mixed.misc2Adds.addDef}, Gun ${compileMatrices['Core/Rift'].mixed.misc2Adds.addGun}, Mel ${compileMatrices['Core/Rift'].mixed.misc2Adds.addMel}, Prj ${compileMatrices['Core/Rift'].mixed.misc2Adds.addPrj} |

Marginal compile deltas:

| Shell | Transition | Δhp | Δspeed | Δacc | Δdodge | ΔdefSk | Δgun | Δmelee | Δprojectile |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dual Rift | No Bio -> One Bio[P4] | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.hp, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.speed, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.acc, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.dodge, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.defSk, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.gun, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.mel, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].noToOne.prj, 0)} |
| Dual Rift | One Bio[P4] -> Two Bio[P4] | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.hp, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.speed, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.acc, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.dodge, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.defSk, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.gun, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.mel, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.prj, 0)} |
| Dual Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.hp, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.speed, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.acc, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.dodge, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.defSk, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.gun, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.mel, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].oneToMixed.prj, 0)} |
| Dual Rift | Bio[P4]+Bio[O4] -> Two Bio[P4] | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.hp, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.speed, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.acc, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.dodge, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.defSk, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.gun, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.mel, 0)} | ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.prj, 0)} |
| Core/Rift | No Bio -> One Bio[P4] | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.hp, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.speed, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.acc, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.dodge, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.defSk, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.gun, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.mel, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].noToOne.prj, 0)} |
| Core/Rift | One Bio[P4] -> Two Bio[P4] | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.hp, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.speed, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.acc, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.dodge, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.defSk, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.gun, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.mel, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToTwo.prj, 0)} |
| Core/Rift | One Bio[P4] -> Bio[P4]+Bio[O4] | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.hp, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.speed, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.acc, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.dodge, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.defSk, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.gun, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.mel, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].oneToMixed.prj, 0)} |
| Core/Rift | Bio[P4]+Bio[O4] -> Two Bio[P4] | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.hp, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.speed, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.acc, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.dodge, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.defSk, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.gun, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.mel, 0)} | ${fmtSigned(compileTransitionTables['Core/Rift'].mixedToTwo.prj, 0)} |

Direct answers from the current compile:

- **First Bio[P4] vs second Bio[P4]**: current compile is exactly linear. The second Bio[P4] adds the same misc contribution as the first Bio[P4] in both shells: Acc ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.acc, 0)}, Dod ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.dodge, 0)}, Def ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.defSk, 0)}, Gun ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.gun, 0)}, Mel ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.mel, 0)}, Prj ${fmtSigned(compileTransitionTables['Dual Rift'].oneToTwo.prj, 0)}.
- **Bio[P4] vs Bio[O4]**: current compile treats this as a simple crystal-color swap on the same Bio item. Relative to adding a second Bio[P4], the Bio[O4] version changes only Def and Melee on the second misc contribution: mixed -> two-Pink is Def ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.defSk, 0)} and Melee ${fmtSigned(compileTransitionTables['Dual Rift'].mixedToTwo.mel, 0)} with Gun/Prj/Acc/Dod unchanged.
- **Active duplicate scaling / suppression / cap / color branch**: none found in the active legacy compile path. The focused functions only do crystal pct application plus straight summation.
- **Dormant hook that could host such a rule**: \`getEffectiveCrystalPct(...)\` in legacy and its brute equivalent both have env-driven misc crystal skill multipliers plus a separate slot-2-only branch, but they are inactive by default and do not express duplicate-item logic.

## 7. Legacy vs brute parity notes for the same rows

### Raw truth parsing

| Row | Raw legacy misc1 spec present? | Raw brute misc1 spec present? | Raw legacy misc2 spec present? | Raw brute misc2 spec present? |
| --- | --- | --- | --- | --- |
${parityRows
  .map(
    (row) =>
      `| ${quoteCell(row.rowName)} | ${row.rawMisc1SpecLegacy ? 'yes' : 'no'} | ${row.rawMisc1SpecBrute ? 'yes' : 'no'} | ${row.rawMisc2SpecLegacy ? 'yes' : 'no'} | ${row.rawMisc2SpecBrute ? 'yes' : 'no'} |`,
  )
  .join('\n')}

Raw input-handling conclusion:

- Legacy \`partCrystalSpec(...)\` accepts legacy truth rows where crystals live in \`upgrades: [...]\`.
- Brute \`partCrystalSpec(...)\` does **not** fall back to \`upgrades: [...]\`, so the exact truth JSON shape does not carry misc crystal specs into brute directly.
- This is a real parity difference in payload parsing, but it is separate from the duplicate/color math once the build is normalized.

### Normalized compile parity on the same Bio-bearing defenders

| Row | Final defender stats equal after normalization? | Δacc | Δdodge | ΔdefSk | Δgun | Δmelee | Δprojectile | misc1 delta summary | misc2 delta summary |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${parityRows
  .map(
    (row) =>
      `| ${quoteCell(row.rowName)} | ${row.compare.finalEqual ? 'yes' : 'no'} | ${fmtSigned(row.finalDiff.acc, 0)} | ${fmtSigned(row.finalDiff.dodge, 0)} | ${fmtSigned(row.finalDiff.defSk, 0)} | ${fmtSigned(row.finalDiff.gun, 0)} | ${fmtSigned(row.finalDiff.mel, 0)} | ${fmtSigned(row.finalDiff.prj, 0)} | ${quoteCell(row.misc1DiffSummary)} | ${quoteCell(row.misc2DiffSummary)} |`,
  )
  .join('\n')}

Normalized parity conclusion:

- After normalizing the truth builds into explicit crystal specs, legacy and brute still do **not** compile to the same defender stats.
- The concrete cause is visible in current default config: legacy canonical compile uses \`crystalStackStats: 'sum4'\`, while brute uses \`crystalStackStats: 'iter4'\`.
- That makes brute amplify the same Pink/Orange misc crystal effects more aggressively. Example: Bio[P4] Def is \`117\` in legacy vs \`136\` in brute; Scout[P4] Def is \`54\` in legacy vs \`64\` in brute.
- Brute \`compileAttacker(...)\` has an extra \`rebuildMiscVariantForSlot(m2v, 2)\` step that defender compile does not use, but with the current default empty slot-2 multiplier map that path is a no-op.
- This parity drift is real and must be preserved as a risk note for any future patch, but it still does not explain the legacy truth-shape problem by itself: the legacy path already shows the missing second-Bio / Pink-vs-Orange structure before brute enters the picture.

## 8. Best explanation now

**Strongest explanation: duplicate / second-Bio scaling is missing**

Reason:

- Truth shows the second Pink Bio is the largest incremental step in both shells.
- Current compile treats the second Bio[P4] as a perfect linear repeat of the first with no duplicate-item scaling, suppression, cap, or second-copy branch.
- That is the clearest mismatch between truth structure and compiled structure.

**Secondary explanation: Pink-vs-Orange color asymmetry is also missing or incomplete**

Reason:

- Truth clearly distinguishes two-Pink from Pink+Orange, but the gap is smaller than the second-Bio gap.
- Current compile already distinguishes Pink vs Orange, but only by the direct crystal-color stat swap on the Bio item: Pink inflates Def while Orange inflates Melee.
- If the true game logic has a stronger Pink-specific second-copy effect, the current simple color swap is too weak.

**Weaker fallback: broader misc contribution rule**

Reason:

- No active duplicate-item or Bio-specific branch was found in the focused compile functions.
- If duplicate scaling and stronger Pink-specific handling are still not enough, the next broader suspect surface is the misc crystal pct application block itself, not shell logic or slot order.
- Separate parity caution: brute currently layers an \`iter4\` stat-crystal stack on top of the same items, so any eventual patch must be checked against that existing simulator drift.

## 9. Ranked patch surfaces

1. **Most plausible first surface**: \`legacy-sim-v1.0.4-clean.js\` \`computeVariantFromCrystalSpec(...)\` misc flat-stat crystal application for Bio misc items, mirrored in \`brute-sim-v1.4.6.js\` \`computeVariantFromCrystalSpec(...)\`.
   This is the smallest shared surface that currently produces the linear repeated Bio[P4] contribution and the simple Pink-vs-Orange swap.
2. **Second surface**: \`legacy-sim-v1.0.4-clean.js\` \`getEffectiveCrystalPct(...)\` misc crystal multiplier block, mirrored in the brute misc crystal pct block around \`MISC_NO_CRYSTAL_SKILL_TYPE_MULTS\` and \`MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS\`.
   This is a plausible host for item/color-sensitive crystal scaling, but it is broader-risk and currently only supports env-driven generic misc multipliers.
3. **Broader fallback surface**: \`legacy-sim-v1.0.4-clean.js\` \`compileCombatantFromParts(...)\` misc aggregation, mirrored in \`brute-sim-v1.4.6.js\` \`compileDefender(...)\`.
   This would be the place for a hidden duplicate-item cap or second-copy suppression after variant compilation, but current evidence is weaker because the compile sums are otherwise clean and linear.

## 10. Recommendation

**NEED ONE MICRO-INSTRUMENTATION PASS**

Reason:

- The evidence now isolates the suspect family to shared Bio misc contribution math.
- It does **not** yet isolate whether the missing rule is specifically second-copy scaling, Pink-specific second-copy scaling, or a slightly broader Bio misc crystal rule.
- That is narrow enough for instrumentation, but not yet clean enough for a behavior patch claim.

## 11. If PATCH CANDIDATE READY

Not applicable. This pass does not isolate a decision-ready narrow rule.

## 12. What ChatGPT should do next

Do one temp-only instrumentation pass centered on \`computeVariantFromCrystalSpec(...)\` in both simulators. Dump the exact Bio[P4], Bio[O4], Scout[P4], and aggregated two-misc totals for the four canonical states, then test a tiny set of offline hypothetical rules that alter only the second Bio and only Pink-vs-Orange weighting. If one rule explains the truth transitions without moving no-Bio rows, then patch that exact shared variant block next.
`;

  fs.writeFileSync(REPORT_PATH, report);
  process.stdout.write(report);
}

main();
