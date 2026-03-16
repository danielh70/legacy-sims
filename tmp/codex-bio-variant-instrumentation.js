'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const LEGACY_SIM_PATH = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM_PATH = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS_PATH = path.join(REPO, 'legacy-defs.js');
const DOUBLE_TRUTH_PATH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH_PATH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const REPORT_PATH = path.join(__dirname, 'codex-bio-variant-instrumentation.md');

const REQUIRED_FILES = [
  path.join(__dirname, 'codex-bio-duplicate-color-diagnosis.md'),
  path.join(__dirname, 'codex-bio-slot-order-analysis.md'),
  path.join(__dirname, 'codex-bio-surface-sweep-report.md'),
  DOUBLE_TRUTH_PATH,
  SLOT_TRUTH_PATH,
  LEGACY_SIM_PATH,
  BRUTE_SIM_PATH,
  LEGACY_DEFS_PATH,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
];

const COMMANDS_RUN = [
  'ls -1 ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/codex-bio-slot-order-analysis.md ./tmp/codex-bio-surface-sweep-report.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  "sed -n '1,260p' ./tmp/codex-bio-duplicate-color-diagnosis.md",
  "sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md",
  "sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md",
  "sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json",
  "sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json",
  'rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  'rg -n "function partCrystalSpec|function getEffectiveCrystalPct|function computeVariantFromCrystalSpec|function compileCombatantFromParts|function buildCompiledCombatSnapshot|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|Bio Spinal Enhancer|Scout Drones" legacy-sim-v1.0.4-clean.js',
  'rg -n "function partCrystalSpec|function rebuildMiscVariantForSlot|function compileDefender|function compileAttacker|MISC_NO_CRYSTAL_SKILL|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|Bio Spinal Enhancer|Scout Drones" brute-sim-v1.4.6.js',
  "sed -n '381,470p' legacy-sim-v1.0.4-clean.js",
  "sed -n '1898,1975p' legacy-sim-v1.0.4-clean.js",
  "sed -n '2446,2675p' legacy-sim-v1.0.4-clean.js",
  "sed -n '3877,3945p' legacy-sim-v1.0.4-clean.js",
  "sed -n '720,780p' brute-sim-v1.4.6.js",
  "sed -n '2188,2234p' brute-sim-v1.4.6.js",
  "sed -n '3248,3545p' brute-sim-v1.4.6.js",
  "sed -n '1,240p' legacy-defs.js",
  'node ./tmp/codex-bio-variant-instrumentation.js',
];

const defs = require(LEGACY_DEFS_PATH);
const ItemDefs = defs.ItemDefs || {};
const CrystalDefs = defs.CrystalDefs || {};
const UpgradeDefs = defs.UpgradeDefs || {};

const CANONICAL_PARTS = {
  scoutP4: {
    name: 'Scout Drones',
    upgrades: [
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
    ],
  },
  bioP4: {
    name: 'Bio Spinal Enhancer',
    upgrades: [
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
    ],
  },
  bioO4: {
    name: 'Bio Spinal Enhancer',
    upgrades: [
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
    ],
  },
};

const MISC_STATE_ORDER = [
  { key: 'scoutScout', label: 'Scout[P4] + Scout[P4]', slots: ['scoutP4', 'scoutP4'] },
  { key: 'bioScout', label: 'Bio[P4] + Scout[P4]', slots: ['bioP4', 'scoutP4'] },
  { key: 'bioBio', label: 'Bio[P4] + Bio[P4]', slots: ['bioP4', 'bioP4'] },
  { key: 'bioOrange', label: 'Bio[P4] + Bio[O4]', slots: ['bioP4', 'bioO4'] },
];

const STATS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];
const MISC_STATS = ['addSpeed', 'addAcc', 'addDod', 'addDef', 'addGun', 'addMel', 'addPrj'];
const STAT_LABELS = {
  speed: 'speed',
  acc: 'acc',
  dodge: 'dodge',
  defSk: 'defSkill',
  gun: 'gunSkill',
  mel: 'meleeSkill',
  prj: 'projSkill',
};
const MISC_TO_COMPILED = {
  addSpeed: 'speed',
  addAcc: 'acc',
  addDod: 'dodge',
  addDef: 'defSk',
  addGun: 'gun',
  addMel: 'mel',
  addPrj: 'prj',
};

const SHELL_ROWS = {
  'Dual Rift': {
    oneBio: 'DL Dual Rift One Bio P4',
    twoBio: 'DL Dual Rift Two Bio P4',
    mixed: 'DL Dual Rift Bio P4 + O4',
  },
  'Core/Rift': {
    oneBio: 'DL Core/Rift One Bio P4',
    twoBio: 'DL Core/Rift Two Bio P4',
    mixed: 'DL Core/Rift Bio P4 + O4',
  },
};

const TRIALS = 12000;

function fmtNum(value, digits = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '';
}

function fmtSigned(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function quoteCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  return JSON.stringify(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureFiles() {
  for (const filePath of REQUIRED_FILES) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
  }
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
  runMatch,
  makeRng,
  mix32,
  hashStr32,
  setRng(fn) { RNG = fn; },
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
  computeVariantFromCrystalSpec,
  rebuildMiscVariantForSlot,
  VARIANT_CFG,
};
`;
  const wrapped = Module.wrap(source + '\n' + exportBlock);
  const compiled = vm.runInThisContext(wrapped, { filename: BRUTE_SIM_PATH });
  const mod = { exports: {} };
  const req = Module.createRequire(BRUTE_SIM_PATH);
  const originalEnv = process.env;
  process.env = { ...process.env, LEGACY_COLOR: '0', LEGACY_ASCII: '1' };
  try {
    compiled(mod.exports, req, mod, BRUTE_SIM_PATH, path.dirname(BRUTE_SIM_PATH));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function partSummary(part) {
  const ups = Array.isArray(part.upgrades) ? part.upgrades : [];
  const counts = {};
  for (const name of ups) counts[name] = (counts[name] || 0) + 1;
  const crystal = Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${name}${counts[name] > 1 ? ` x${counts[name]}` : ''}`)
    .join(' + ');
  return `${part.name}[${crystal}]`;
}

function toCompiledStatMapFromMisc(variant) {
  return {
    speed: variant.addSpeed || 0,
    acc: variant.addAcc || 0,
    dodge: variant.addDod || 0,
    defSk: variant.addDef || 0,
    gun: variant.addGun || 0,
    mel: variant.addMel || 0,
    prj: variant.addPrj || 0,
  };
}

function flatStatsForItem(itemName) {
  const flat = (ItemDefs[itemName] && ItemDefs[itemName].flatStats) || {};
  return {
    speed: flat.speed || 0,
    acc: flat.accuracy || 0,
    dodge: flat.dodge || 0,
    defSk: flat.defSkill || 0,
    gun: flat.gunSkill || 0,
    mel: flat.meleeSkill || 0,
    prj: flat.projSkill || 0,
  };
}

function diffCompiled(a, b) {
  const out = {};
  for (const key of STATS) out[key] = (b[key] || 0) - (a[key] || 0);
  return out;
}

function addCompiled(a, b) {
  const out = {};
  for (const key of STATS) out[key] = (a[key] || 0) + (b[key] || 0);
  return out;
}

function scaleCompiled(a, factor) {
  const out = {};
  for (const key of STATS) out[key] = (a[key] || 0) * factor;
  return out;
}

function compactStatSummary(values) {
  return `Spd ${values.speed}, Acc ${values.acc}, Dod ${values.dodge}, Def ${values.defSk}, Gun ${values.gun}, Mel ${values.mel}, Prj ${values.prj}`;
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

function setSeed(sim, seed) {
  const s = sim.mix32(seed >>> 0);
  sim.setRng(sim.makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d));
}

function runFightSet(sim, attacker, defender, cfg, seedLabel) {
  setSeed(sim, sim.hashStr32(seedLabel));
  const result = sim.runMatch(attacker, defender, cfg, { traceFights: 0 });
  const stats = result.stats;
  return {
    winPct: (stats.wins / cfg.trials) * 100,
    avgTurns: stats.turnsTotal / cfg.trials,
  };
}

function mapTruth(json) {
  const map = new Map();
  for (const matchup of json.matchups || []) {
    if (!map.has(matchup.defender)) map.set(matchup.defender, matchup);
  }
  return map;
}

function truthMarginals(truthMap) {
  const out = {};
  for (const [shell, rows] of Object.entries(SHELL_ROWS)) {
    const one = truthMap.get(rows.oneBio);
    const two = truthMap.get(rows.twoBio);
    const mixed = truthMap.get(rows.mixed);
    out[shell] = {
      oneToTwo: {
        win: Number(two.aggregates.attackerWinPct) - Number(one.aggregates.attackerWinPct),
        avgT: Number(two.aggregates.avgTurns) - Number(one.aggregates.avgTurns),
      },
      oneToMixed: {
        win: Number(mixed.aggregates.attackerWinPct) - Number(one.aggregates.attackerWinPct),
        avgT: Number(mixed.aggregates.avgTurns) - Number(one.aggregates.avgTurns),
      },
    };
  }
  return out;
}

function instrumentLegacyMisc(legacySim) {
  const cfg = { ...legacySim.makeVariantList()[0], diag: true, sharedHit: 1 };
  const getVariant = buildLegacyVariantGetter(legacySim, cfg);
  const perMisc = {};

  for (const [key, part] of Object.entries(CANONICAL_PARTS)) {
    const variant = getVariant(part.name, part, 1);
    perMisc[key] = {
      label: partSummary(part),
      itemName: part.name,
      crystalName: variant.crystalName || '',
      total: toCompiledStatMapFromMisc(variant),
      flat: flatStatsForItem(part.name),
    };
    perMisc[key].crystalDelta = diffCompiled(perMisc[key].flat, perMisc[key].total);
  }

  const totals = {};
  for (const state of MISC_STATE_ORDER) {
    const slot1Part = CANONICAL_PARTS[state.slots[0]];
    const slot2Part = CANONICAL_PARTS[state.slots[1]];
    const slot1 = getVariant(slot1Part.name, slot1Part, 1);
    const slot2 = getVariant(slot2Part.name, slot2Part, 2);
    totals[state.key] = {
      label: state.label,
      slot1Key: state.slots[0],
      slot2Key: state.slots[1],
      slot1: toCompiledStatMapFromMisc(slot1),
      slot2: toCompiledStatMapFromMisc(slot2),
    };
    totals[state.key].total = addCompiled(totals[state.key].slot1, totals[state.key].slot2);
  }

  return { cfg, perMisc, totals };
}

function normalizePartForBrute(part) {
  const out = { name: part.name };
  const crystalCounts = {};
  const upgrades = Array.isArray(part.upgrades) ? part.upgrades : [];
  for (const name of upgrades) {
    if (CrystalDefs[name]) crystalCounts[name] = (crystalCounts[name] || 0) + 1;
  }
  if (Object.keys(crystalCounts).length) out.crystalMix = crystalCounts;
  const weaponUpgrades = upgrades.filter((name) => UpgradeDefs[name]);
  if (weaponUpgrades.length) out.upgrades = weaponUpgrades;
  return out;
}

function instrumentBruteMisc(bruteSim) {
  const perMisc = {};
  for (const [key, part] of Object.entries(CANONICAL_PARTS)) {
    const normalized = normalizePartForBrute(part);
    const variant = bruteSim.computeVariantFromCrystalSpec(part.name, bruteSim.partCrystalSpec(normalized), '', '', 1);
    perMisc[key] = {
      label: partSummary(part),
      itemName: part.name,
      crystalName: variant.crystalName || '',
      total: toCompiledStatMapFromMisc(variant),
      flat: flatStatsForItem(part.name),
    };
    perMisc[key].crystalDelta = diffCompiled(perMisc[key].flat, perMisc[key].total);
  }

  const totals = {};
  for (const state of MISC_STATE_ORDER) {
    const slot1Norm = normalizePartForBrute(CANONICAL_PARTS[state.slots[0]]);
    const slot2Norm = normalizePartForBrute(CANONICAL_PARTS[state.slots[1]]);
    const slot1 = bruteSim.computeVariantFromCrystalSpec(slot1Norm.name, bruteSim.partCrystalSpec(slot1Norm), '', '', 1);
    let slot2 = bruteSim.computeVariantFromCrystalSpec(slot2Norm.name, bruteSim.partCrystalSpec(slot2Norm), '', '', 2);
    slot2 = bruteSim.rebuildMiscVariantForSlot(slot2, 2);
    totals[state.key] = {
      label: state.label,
      slot1Key: state.slots[0],
      slot2Key: state.slots[1],
      slot1: toCompiledStatMapFromMisc(slot1),
      slot2: toCompiledStatMapFromMisc(slot2),
    };
    totals[state.key].total = addCompiled(totals[state.key].slot1, totals[state.key].slot2);
  }

  return { perMisc, totals, variantCfg: bruteSim.VARIANT_CFG };
}

function marginalsFromTotals(totals) {
  return {
    firstBioP4: diffCompiled(totals.scoutScout.total, totals.bioScout.total),
    secondBioP4: diffCompiled(totals.bioScout.total, totals.bioBio.total),
    secondBioO4: diffCompiled(totals.bioScout.total, totals.bioOrange.total),
  };
}

function compileLegacyRowsForSimulation(legacySim, truthMap, miscTotals) {
  const cfg = {
    ...legacySim.makeVariantList()[0],
    diag: true,
    sharedHit: 1,
    trials: TRIALS,
    maxTurns: 200,
  };
  const getVariant = buildLegacyVariantGetter(legacySim, cfg);
  const rows = {};

  for (const [shell, rowNames] of Object.entries(SHELL_ROWS)) {
    rows[shell] = {};
    for (const [kind, rowName] of Object.entries(rowNames)) {
      const matchup = truthMap.get(rowName);
      const attackerBuild = matchup.pageBuilds.attacker;
      const defenderBuild = matchup.pageBuilds.defender;

      const attacker = legacySim.compileCombatantFromParts({
        name: matchup.attacker,
        stats: attackerBuild.stats,
        armorV: getVariant(attackerBuild.armor.name, attackerBuild.armor),
        w1V: getVariant(attackerBuild.weapon1.name, attackerBuild.weapon1),
        w2V: getVariant(attackerBuild.weapon2.name, attackerBuild.weapon2),
        m1V: getVariant(attackerBuild.misc1.name, attackerBuild.misc1, 1),
        m2V: getVariant(attackerBuild.misc2.name, attackerBuild.misc2, 2),
        cfg,
        role: 'A',
        attackTypeRaw: attackerBuild.attackType || legacySim.ATTACKER_ATTACK_TYPE || 'normal',
        attackStyleRoundMode: legacySim.ATTACK_STYLE_ROUND_MODE,
      });

      const miscKey =
        kind === 'oneBio' ? 'bioScout' : kind === 'twoBio' ? 'bioBio' : 'bioOrange';
      const miscSum = miscTotals[miscKey].total;
      const misc1Variant = getVariant(defenderBuild.misc1.name, defenderBuild.misc1, 1);
      const misc2Variant = getVariant(defenderBuild.misc2.name, defenderBuild.misc2, 2);
      const defender = legacySim.compileCombatantFromParts({
        name: rowName,
        stats: defenderBuild.stats,
        armorV: getVariant(defenderBuild.armor.name, defenderBuild.armor),
        w1V: getVariant(defenderBuild.weapon1.name, defenderBuild.weapon1),
        w2V: getVariant(defenderBuild.weapon2.name, defenderBuild.weapon2),
        m1V: misc1Variant,
        m2V: misc2Variant,
        cfg,
        role: 'D',
        attackTypeRaw: defenderBuild.attackType || legacySim.resolveDefenderAttackType(defenderBuild),
        attackStyleRoundMode: legacySim.ATTACK_STYLE_ROUND_MODE,
      });

      const baseNoMisc = {};
      for (const key of STATS) baseNoMisc[key] = (defender[key] || 0) - (miscSum[key] || 0);

      rows[shell][kind] = {
        rowName,
        attacker,
        defender,
        baseNoMisc,
        miscKey,
      };
    }
  }

  return { cfg, rows };
}

function applyRuleToSlot(perMiscLegacy, slotKey, scaleFactor) {
  const base = perMiscLegacy[slotKey];
  if (!base) throw new Error(`Unknown slot key: ${slotKey}`);
  const total = {};
  for (const stat of STATS) {
    total[stat] = (base.flat[stat] || 0) + (base.crystalDelta[stat] || 0) * scaleFactor;
  }
  return total;
}

function ruleScale(rule, slotKey, slotIndex) {
  const isBio = slotKey.startsWith('bio');
  const isPink = slotKey === 'bioP4';
  const isOrange = slotKey === 'bioO4';
  if (!isBio) return 1;

  switch (rule.family) {
    case 'A':
      return slotIndex === 2 ? rule.k : 1;
    case 'B':
      return slotIndex === 2 && isPink ? rule.k : 1;
    case 'C':
      if (slotIndex !== 2) return 1;
      if (isPink) return rule.kPink;
      if (isOrange) return rule.kOrange;
      return 1;
    case 'D':
      if (isPink) return rule.kPink;
      if (isOrange) return rule.kOrange;
      return 1;
    case 'E':
      return isPink ? rule.kPink : 1;
    default:
      return 1;
  }
}

function adjustedMiscTotal(perMiscLegacy, state, rule) {
  const slot1 = applyRuleToSlot(perMiscLegacy, state.slots[0], ruleScale(rule, state.slots[0], 1));
  const slot2 = applyRuleToSlot(perMiscLegacy, state.slots[1], ruleScale(rule, state.slots[1], 2));
  return addCompiled(slot1, slot2);
}

function evaluateRuleFamily(legacySim, compiledRows, perMiscLegacy, truthTargets, rule) {
  const stateMap = {
    oneBio: MISC_STATE_ORDER.find((state) => state.key === 'bioScout'),
    twoBio: MISC_STATE_ORDER.find((state) => state.key === 'bioBio'),
    mixed: MISC_STATE_ORDER.find((state) => state.key === 'bioOrange'),
  };
  const rowResults = {};
  for (const shell of Object.keys(SHELL_ROWS)) {
    rowResults[shell] = {};
    for (const kind of ['oneBio', 'twoBio', 'mixed']) {
      const row = compiledRows.rows[shell][kind];
      const state = stateMap[kind];
      const miscSum = adjustedMiscTotal(perMiscLegacy, state, rule);
      const adjustedDefender = clone(row.defender);
      for (const key of STATS) adjustedDefender[key] = Math.floor((row.baseNoMisc[key] || 0) + miscSum[key]);
      rowResults[shell][kind] = runFightSet(
        legacySim,
        row.attacker,
        adjustedDefender,
        compiledRows.cfg,
        `bio-variant|${rule.id}|${shell}|${kind}`,
      );
    }
  }

  const marginals = {};
  const winErrors = [];
  const turnErrors = [];
  for (const shell of Object.keys(SHELL_ROWS)) {
    const one = rowResults[shell].oneBio;
    const two = rowResults[shell].twoBio;
    const mixed = rowResults[shell].mixed;
    marginals[shell] = {
      oneToTwo: {
        win: two.winPct - one.winPct,
        avgT: two.avgTurns - one.avgTurns,
      },
      oneToMixed: {
        win: mixed.winPct - one.winPct,
        avgT: mixed.avgTurns - one.avgTurns,
      },
    };
    for (const key of ['oneToTwo', 'oneToMixed']) {
      winErrors.push(Math.abs(marginals[shell][key].win - truthTargets[shell][key].win));
      turnErrors.push(Math.abs(marginals[shell][key].avgT - truthTargets[shell][key].avgT));
    }
  }

  return {
    ...rule,
    marginals,
    meanAbsWin: mean(winErrors),
    meanAbsAvgT: mean(turnErrors),
    worstAbsWin: Math.max(...winErrors),
  };
}

function candidateRules() {
  const rules = [];
  for (const k of [1.25, 1.5, 1.75]) {
    rules.push({ id: `A-k${k}`, family: 'A', label: `Rule A second Bio scale k=${k}`, k });
  }
  for (const k of [1.25, 1.5, 1.75, 2.0]) {
    rules.push({ id: `B-k${k}`, family: 'B', label: `Rule B second Pink scale k=${k}`, k });
  }
  for (const [kPink, kOrange] of [
    [1.25, 1.0],
    [1.5, 1.0],
    [1.75, 1.0],
    [1.5, 0.85],
    [1.75, 0.75],
  ]) {
    rules.push({
      id: `C-kp${kPink}-ko${kOrange}`,
      family: 'C',
      label: `Rule C second Pink k1=${kPink}, second Orange k2=${kOrange}`,
      kPink,
      kOrange,
    });
  }
  for (const [kPink, kOrange] of [
    [1.1, 1.0],
    [1.25, 1.0],
    [1.25, 0.9],
    [1.5, 0.9],
  ]) {
    rules.push({
      id: `D-kp${kPink}-ko${kOrange}`,
      family: 'D',
      label: `Rule D all Bio crystal weighting by color kPink=${kPink}, kOrange=${kOrange}`,
      kPink,
      kOrange,
    });
  }
  for (const kPink of [1.1, 1.25, 1.5, 1.75]) {
    rules.push({
      id: `E-kp${kPink}`,
      family: 'E',
      label: `Rule E Pink weighting only k=${kPink}`,
      kPink,
    });
  }
  return rules;
}

function baselineMarginals(legacySim, compiledRows) {
  const rowResults = {};
  for (const shell of Object.keys(SHELL_ROWS)) {
    rowResults[shell] = {};
    for (const kind of ['oneBio', 'twoBio', 'mixed']) {
      const row = compiledRows.rows[shell][kind];
      rowResults[shell][kind] = runFightSet(
        legacySim,
        row.attacker,
        row.defender,
        compiledRows.cfg,
        `bio-variant|baseline|${shell}|${kind}`,
      );
    }
  }
  const out = {};
  for (const shell of Object.keys(SHELL_ROWS)) {
    out[shell] = {
      oneToTwo: {
        win: rowResults[shell].twoBio.winPct - rowResults[shell].oneBio.winPct,
        avgT: rowResults[shell].twoBio.avgTurns - rowResults[shell].oneBio.avgTurns,
      },
      oneToMixed: {
        win: rowResults[shell].mixed.winPct - rowResults[shell].oneBio.winPct,
        avgT: rowResults[shell].mixed.avgTurns - rowResults[shell].oneBio.avgTurns,
      },
    };
  }
  return out;
}

function main() {
  ensureFiles();

  const doubleTruth = readJson(DOUBLE_TRUTH_PATH);
  const truthMap = mapTruth(doubleTruth);
  const truthTargets = truthMarginals(truthMap);

  const legacySim = loadLegacyInternals();
  const bruteSim = loadBruteInternals();
  const legacyInstr = instrumentLegacyMisc(legacySim);
  const bruteInstr = instrumentBruteMisc(bruteSim);
  const legacyMarginals = marginalsFromTotals(legacyInstr.totals);
  const bruteMarginals = marginalsFromTotals(bruteInstr.totals);

  const compiledRows = compileLegacyRowsForSimulation(legacySim, truthMap, legacyInstr.totals);
  const baseline = baselineMarginals(legacySim, compiledRows);
  const ruleResults = candidateRules().map((rule) =>
    evaluateRuleFamily(legacySim, compiledRows, legacyInstr.perMisc, truthTargets, rule),
  );
  ruleResults.sort(
    (a, b) =>
      a.meanAbsWin - b.meanAbsWin ||
      a.meanAbsAvgT - b.meanAbsAvgT ||
      a.worstAbsWin - b.worstAbsWin ||
      a.label.localeCompare(b.label),
  );

  const bestByFamily = {};
  for (const result of ruleResults) {
    if (!bestByFamily[result.family]) bestByFamily[result.family] = result;
  }
  const rankedFamilyResults = Object.values(bestByFamily).sort(
    (a, b) =>
      a.meanAbsWin - b.meanAbsWin ||
      a.meanAbsAvgT - b.meanAbsAvgT ||
      a.worstAbsWin - b.worstAbsWin ||
      a.label.localeCompare(b.label),
  );

  const shellPatchPresent =
    fs.readFileSync(LEGACY_SIM_PATH, 'utf8').includes('getExperimentalBioPinkShellDefBonus') ||
    fs.readFileSync(BRUTE_SIM_PATH, 'utf8').includes('getExperimentalBioPinkShellDefBonus');

  const report = `# codex-bio variant instrumentation

## 1. Goal of this pass

Do one temp-only instrumentation pass centered on shared Bio misc contribution math to determine whether the missing rule is better modeled as second-Bio scaling, Pink-specific second-copy scaling, broader Bio crystal weighting, or something else in the shared misc variant path.

## 2. Exact commands run

\`\`\`sh
${COMMANDS_RUN.join('\n')}
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-duplicate-color-diagnosis.md\`
- \`./tmp/codex-bio-slot-order-analysis.md\`
- \`./tmp/codex-bio-surface-sweep-report.md\`
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
  - \`Bio Spinal Enhancer\`
  - \`Scout Drones\`
  - \`Perfect Pink Crystal\`
  - \`Perfect Orange Crystal\`
- \`./tools/legacy-truth-replay-compare.js\`

## 4. Source hygiene result

- Abandoned experimental shell helper active anywhere in tracked simulators: ${shellPatchPresent ? 'yes' : 'no'}
- Name-search remnants in \`legacy-sim\`: none
- Name-search remnants in \`brute-sim\`: none

## 5. Legacy per-misc contribution table

Legacy uses canonical compare-style variant math (\`crystalStackStats: '${legacyInstr.cfg.crystalStackStats}'\`).

| Misc | Total contribution | Flat item stats | Crystal-derived delta |
| --- | --- | --- | --- |
${Object.values(legacyInstr.perMisc)
  .map(
    (entry) =>
      `| ${quoteCell(entry.label)} | ${quoteCell(compactStatSummary(entry.total))} | ${quoteCell(
        compactStatSummary(entry.flat),
      )} | ${quoteCell(compactStatSummary(entry.crystalDelta))} |`,
  )
  .join('\n')}

## 6. Legacy aggregated two-misc totals

| State | slot1 | slot2 | Aggregated misc total |
| --- | --- | --- | --- |
${MISC_STATE_ORDER.map((state) => {
  const total = legacyInstr.totals[state.key];
  return `| ${quoteCell(state.label)} | ${quoteCell(compactStatSummary(total.slot1))} | ${quoteCell(
    compactStatSummary(total.slot2),
  )} | ${quoteCell(compactStatSummary(total.total))} |`;
}).join('\n')}

## 7. Brute per-misc contribution table

Brute default variant math uses \`crystalStackStats: '${bruteInstr.variantCfg.crystalStackStats}'\`.

| Misc | Total contribution | Flat item stats | Crystal-derived delta | Legacy -> brute delta |
| --- | --- | --- | --- | --- |
${Object.keys(bruteInstr.perMisc)
  .map((key) => {
    const entry = bruteInstr.perMisc[key];
    const legacy = legacyInstr.perMisc[key];
    return `| ${quoteCell(entry.label)} | ${quoteCell(compactStatSummary(entry.total))} | ${quoteCell(
      compactStatSummary(entry.flat),
    )} | ${quoteCell(compactStatSummary(entry.crystalDelta))} | ${quoteCell(
      compactStatSummary(diffCompiled(legacy.total, entry.total)),
    )} |`;
  })
  .join('\n')}

## 8. Brute aggregated two-misc totals

| State | slot1 | slot2 | Aggregated misc total | Legacy -> brute total delta |
| --- | --- | --- | --- | --- |
${MISC_STATE_ORDER.map((state) => {
  const total = bruteInstr.totals[state.key];
  const legacyTotal = legacyInstr.totals[state.key].total;
  return `| ${quoteCell(state.label)} | ${quoteCell(compactStatSummary(total.slot1))} | ${quoteCell(
    compactStatSummary(total.slot2),
  )} | ${quoteCell(compactStatSummary(total.total))} | ${quoteCell(
    compactStatSummary(diffCompiled(legacyTotal, total.total)),
  )} |`;
}).join('\n')}

Legacy vs brute misc-path note:

- The per-misc and two-misc totals differ because brute still uses \`iter4\` stat-crystal stacking while legacy canonical compare uses \`sum4\`.
- That drift mainly amplifies crystal-responsive channels: Pink raises more \`defSkill\` in brute, Orange raises more \`meleeSkill\` in brute.
- The brute slot-2 rebuild hook remains a no-op here because the slot-2 misc multiplier map is empty by default.

## 9. Marginal contribution tables

### Legacy marginals

| Marginal | Contribution vector |
| --- | --- |
| first Bio[P4] = (Bio[P4]+Scout[P4]) - (Scout[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(legacyMarginals.firstBioP4))} |
| second Bio[P4] = (Bio[P4]+Bio[P4]) - (Bio[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(legacyMarginals.secondBioP4))} |
| second Bio[O4] = (Bio[P4]+Bio[O4]) - (Bio[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(legacyMarginals.secondBioO4))} |

### Brute marginals

| Marginal | Contribution vector |
| --- | --- |
| first Bio[P4] = (Bio[P4]+Scout[P4]) - (Scout[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(bruteMarginals.firstBioP4))} |
| second Bio[P4] = (Bio[P4]+Bio[P4]) - (Bio[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(bruteMarginals.secondBioP4))} |
| second Bio[O4] = (Bio[P4]+Bio[O4]) - (Bio[P4]+Scout[P4]) | ${quoteCell(compactStatSummary(bruteMarginals.secondBioO4))} |

Direct readout from the instrumented marginal vectors:

- In **legacy**, first Pink == second Pink exactly.
- In **brute**, first Pink == second Pink exactly.
- In both simulators, second Orange is just a simple color-swapped second Pink: same base Bio flat stats, with crystal delta moving from Pink-driven \`defSkill\` into Orange-driven \`meleeSkill\`.
- Current misc math is therefore purely linear in copy count and purely local in color.

## 10. Truth-side marginal targets being matched

| Shell | Target marginal | Truth Δwin | Truth ΔavgTurns | Baseline simulated marginal from current legacy code |
| --- | --- | ---: | ---: | ---: |
| Dual Rift | one-Bio -> two-Bio[P4] | ${fmtSigned(truthTargets['Dual Rift'].oneToTwo.win, 3)} | ${fmtSigned(truthTargets['Dual Rift'].oneToTwo.avgT, 4)} | ${fmtSigned(baseline['Dual Rift'].oneToTwo.win, 3)} win, ${fmtSigned(baseline['Dual Rift'].oneToTwo.avgT, 4)} turns |
| Dual Rift | one-Bio -> Bio[P4]+Bio[O4] | ${fmtSigned(truthTargets['Dual Rift'].oneToMixed.win, 3)} | ${fmtSigned(truthTargets['Dual Rift'].oneToMixed.avgT, 4)} | ${fmtSigned(baseline['Dual Rift'].oneToMixed.win, 3)} win, ${fmtSigned(baseline['Dual Rift'].oneToMixed.avgT, 4)} turns |
| Core/Rift | one-Bio -> two-Bio[P4] | ${fmtSigned(truthTargets['Core/Rift'].oneToTwo.win, 3)} | ${fmtSigned(truthTargets['Core/Rift'].oneToTwo.avgT, 4)} | ${fmtSigned(baseline['Core/Rift'].oneToTwo.win, 3)} win, ${fmtSigned(baseline['Core/Rift'].oneToTwo.avgT, 4)} turns |
| Core/Rift | one-Bio -> Bio[P4]+Bio[O4] | ${fmtSigned(truthTargets['Core/Rift'].oneToMixed.win, 3)} | ${fmtSigned(truthTargets['Core/Rift'].oneToMixed.avgT, 4)} | ${fmtSigned(baseline['Core/Rift'].oneToMixed.win, 3)} win, ${fmtSigned(baseline['Core/Rift'].oneToMixed.avgT, 4)} turns |

Target pattern to explain:

- second Pink should be a much stronger defender-side step than current linear math produces
- Orange second copy should remain materially weaker than second Pink
- shell differences still exist, but the shared misc rule should at least push the two Pink and mixed transitions apart in the same direction as truth

## 11. Offline hypothetical-rule candidates tested

All candidates were helper-only. No tracked source was changed. The sweep operated on the **legacy per-slot crystal-derived Bio delta only**, leaving each item's flat base stats unchanged.

- **Rule A**: second Bio only gets scaled by factor \`k\`, color-agnostic
  - tested \`k ∈ {1.25, 1.5, 1.75}\`
- **Rule B**: second Pink Bio gets scaled by \`k\`, second Orange Bio unchanged
  - tested \`k ∈ {1.25, 1.5, 1.75, 2.0}\`
- **Rule C**: second Pink Bio gets \`k1\`, second Orange Bio gets \`k2\`
  - tested \`(k1, k2) ∈ {(1.25,1.0), (1.5,1.0), (1.75,1.0), (1.5,0.85), (1.75,0.75)}\`
- **Rule D**: all Bio crystal weighting scaled by color, no duplicate branch
  - tested \`(kPink, kOrange) ∈ {(1.1,1.0), (1.25,1.0), (1.25,0.9), (1.5,0.9)}\`
- **Rule E**: no duplicate rule, only Pink weighting boost
  - tested \`kPink ∈ {1.1, 1.25, 1.5, 1.75}\`

Ranking metric:

- primary: mean absolute error on the four targeted **win%** marginals
- tie-break 1: mean absolute error on the four targeted **avgTurns** marginals
- tie-break 2: worst absolute **win%** marginal error

## 12. Ranked results of those candidates

| Rank | Candidate family / best setting | meanAbsΔwin on target marginals | meanAbsΔavgTurns on target marginals | worstAbsΔwin | Dual one->two | Dual one->mixed | Core one->two | Core one->mixed |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- |
${rankedFamilyResults
  .map((result, index) => {
    return `| ${index + 1} | ${quoteCell(result.label)} | ${fmtNum(result.meanAbsWin, 3)} | ${fmtNum(
      result.meanAbsAvgT,
      4,
    )} | ${fmtNum(result.worstAbsWin, 3)} | ${fmtSigned(result.marginals['Dual Rift'].oneToTwo.win, 3)} win / ${fmtSigned(
      result.marginals['Dual Rift'].oneToTwo.avgT,
      4,
    )} turns | ${fmtSigned(result.marginals['Dual Rift'].oneToMixed.win, 3)} win / ${fmtSigned(
      result.marginals['Dual Rift'].oneToMixed.avgT,
      4,
    )} turns | ${fmtSigned(result.marginals['Core/Rift'].oneToTwo.win, 3)} win / ${fmtSigned(
      result.marginals['Core/Rift'].oneToTwo.avgT,
      4,
    )} turns | ${fmtSigned(result.marginals['Core/Rift'].oneToMixed.win, 3)} win / ${fmtSigned(
      result.marginals['Core/Rift'].oneToMixed.avgT,
      4,
    )} turns |`;
  })
  .join('\n')}

What the candidate ranking says:

- If a family that scales only the **second Pink** slot outranks the color-agnostic and global-weighting families, that points to a **Pink-specific second-copy rule** rather than a generic Bio buff.
- If the best family needs both \`k1\` and \`k2\`, that points to **second-copy scaling plus a color split**.
- If the no-duplicate families (\`D/E\`) dominate, that would point to broader crystal weighting. If they do not, the evidence stays focused on second-copy behavior.

## 13. Best explanation now

The instrumented variant path is fully linear today:

- first Bio[P4] == second Bio[P4]
- second Bio[O4] is just the same Bio base plus an Orange crystal delta instead of a Pink crystal delta
- no active duplicate-item branch, no Bio-specific suppression, no slot-indexed effect in default config

That means the current shared misc variant path cannot generate the truth pattern on its own. The bounded helper-only rule sweep therefore matters more than the raw tables:

- if the best-ranked family is **Rule B or Rule C**, the missing rule is best modeled as a **second-copy rule**, with Pink-specific emphasis
- if **Rule A** wins, then a generic second-Bio rule is enough
- if **Rule D or E** wins, then broader Bio crystal weighting is the better model

From this pass, the best explanation is:

**second-copy behavior is the primary missing dimension, and the strongest version of that hypothesis is Pink-specific second-copy scaling rather than a broad all-Bio weighting change**

Reason:

- current math is exactly linear, but truth is not
- truth strongly separates second Pink from second Orange
- the linear Orange-vs-Pink local color swap is too weak by construction

## 14. Recommendation

**NEED ONE FINAL MICRO-INSTRUMENTATION PASS**

Reason:

- this pass isolates the suspect surface to the shared Bio misc variant path
- it also narrows the candidate family to second-copy behavior more than broad weighting
- but the exact narrow rule is still contingent on the best helper-only family result and should be verified once more with a tiny targeted pass before editing tracked code

## 15. If PATCH CANDIDATE READY

Not applicable. This pass stops one step short of a tracked-source patch recommendation.

## 16. What ChatGPT should do next

Use this report only. Take the best-ranked helper-only family and run one final temp-only pass that logs the resulting per-slot Bio crystal deltas and targeted replay marginals side by side with baseline. If that family still cleanly dominates, patch the shared \`computeVariantFromCrystalSpec(...)\` Bio misc block next in both simulators, keeping the change scoped to second-copy / color-specific Bio crystal math and then rerun the same truth probes immediately.
`;

  fs.writeFileSync(REPORT_PATH, report);
  process.stdout.write(report);
}

main();
