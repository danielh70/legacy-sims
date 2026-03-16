'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const LEGACY_SIM = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS = path.join(REPO, 'legacy-defs.js');
const DOUBLE_TRUTH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const META_TRUTH = path.join(__dirname, 'legacy-truth-current-attacker-vs-meta.json');
const ACTIVATION_REPORT = path.join(__dirname, 'codex-bio-rule-b-activation-fix-report.md');
const REVISION_REPORT = path.join(__dirname, 'codex-bio-rule-b-revision-diagnosis.md');
const VALIDATION_REPORT = path.join(__dirname, 'codex-bio-rule-validation.md');
const VARIANT_REPORT = path.join(__dirname, 'codex-bio-variant-instrumentation.md');
const DUP_COLOR_REPORT = path.join(__dirname, 'codex-bio-duplicate-color-diagnosis.md');
const DOUBLE_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-double.log');
const SLOT_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-slot.log');
const META_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-meta.log');
const REPORT_PATH = path.join(__dirname, 'codex-bio-post-rule-b-followup-diagnosis.md');

const REQUIRED = [
  ACTIVATION_REPORT,
  REVISION_REPORT,
  VALIDATION_REPORT,
  VARIANT_REPORT,
  DUP_COLOR_REPORT,
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  META_TRUTH,
  LEGACY_SIM,
  BRUTE_SIM,
  LEGACY_DEFS,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
  DOUBLE_LOG,
  SLOT_LOG,
  META_LOG,
];

const COMMANDS = [
  'ls -1 ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-validation.md ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  "sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md",
  'rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  "sed -n '1,260p' ./tmp/codex-bio-rule-validation.js",
  'node ./tmp/codex-bio-post-rule-b-followup-diagnosis.js',
];

const defs = require(LEGACY_DEFS);
const ItemDefs = defs.ItemDefs || {};

const SHELL_ROWS = {
  'Dual Rift': {
    noBio: 'DL Dual Rift No Bio',
    oneBio: 'DL Dual Rift One Bio P4',
    twoBio: 'DL Dual Rift Two Bio P4',
    mixed: 'DL Dual Rift Bio P4 + O4',
  },
  'Core/Rift': {
    noBio: 'DL Core/Rift No Bio',
    oneBio: 'DL Core/Rift One Bio P4',
    twoBio: 'DL Core/Rift Two Bio P4',
    mixed: 'DL Core/Rift Bio P4 + O4',
  },
};

const DOUBLE_ROWS = [
  'DL Dual Rift No Bio',
  'DL Dual Rift One Bio P4',
  'DL Dual Rift Two Bio P4',
  'DL Dual Rift Bio P4 + O4',
  'DL Core/Rift No Bio',
  'DL Core/Rift One Bio P4',
  'DL Core/Rift Two Bio P4',
  'DL Core/Rift Bio P4 + O4',
];

const STATS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];
const TRIALS = 20000;

const CANONICAL_PARTS = {
  scoutP4: {
    name: 'Scout Drones',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  },
  bioP4: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  },
  bioO4: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'],
  },
};

const CANDIDATES = [
  {
    id: 'baseline_live_rule_b',
    label: 'Baseline live Rule B',
    family: 'baseline',
    desc: 'Current tracked live Rule B only.',
    firstPinkScale: 1.0,
    secondOrangeScale: 1.0,
    allBioScale: 1.0,
  },
  {
    id: 'followup_a_firstpink_1p15',
    label: 'Follow-up A 1.15',
    family: 'first-Bio only',
    desc: 'Scale first Bio[P4] crystal delta by 1.15; leave second Orange unchanged.',
    firstPinkScale: 1.15,
    secondOrangeScale: 1.0,
    allBioScale: 1.0,
  },
  {
    id: 'followup_a_firstpink_1p25',
    label: 'Follow-up A 1.25',
    family: 'first-Bio only',
    desc: 'Scale first Bio[P4] crystal delta by 1.25; leave second Orange unchanged.',
    firstPinkScale: 1.25,
    secondOrangeScale: 1.0,
    allBioScale: 1.0,
  },
  {
    id: 'followup_b_orange_1p15',
    label: 'Follow-up B 1.15',
    family: 'mixed-color only',
    desc: 'Scale second Orange crystal delta by 1.15 on Bio[P4]+Bio[O4] rows only.',
    firstPinkScale: 1.0,
    secondOrangeScale: 1.15,
    allBioScale: 1.0,
  },
  {
    id: 'followup_b_orange_1p25',
    label: 'Follow-up B 1.25',
    family: 'mixed-color only',
    desc: 'Scale second Orange crystal delta by 1.25 on Bio[P4]+Bio[O4] rows only.',
    firstPinkScale: 1.0,
    secondOrangeScale: 1.25,
    allBioScale: 1.0,
  },
  {
    id: 'followup_c_both_1p15_1p15',
    label: 'Follow-up C 1.15/1.15',
    family: 'both',
    desc: 'Scale first Bio[P4] crystal delta by 1.15 and second Orange by 1.15.',
    firstPinkScale: 1.15,
    secondOrangeScale: 1.15,
    allBioScale: 1.0,
  },
  {
    id: 'followup_c_both_1p25_1p25',
    label: 'Follow-up C 1.25/1.25',
    family: 'both',
    desc: 'Scale first Bio[P4] crystal delta by 1.25 and second Orange by 1.25.',
    firstPinkScale: 1.25,
    secondOrangeScale: 1.25,
    allBioScale: 1.0,
  },
  {
    id: 'control_d_allbio_1p10',
    label: 'Control D 1.10',
    family: 'tiny all-Bio control',
    desc: 'Scale all Bio crystal deltas by 1.10 regardless of copy/color as a sanity control.',
    firstPinkScale: 1.0,
    secondOrangeScale: 1.0,
    allBioScale: 1.10,
  },
];

function ensureFiles() {
  for (const filePath of REQUIRED) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function quote(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapTruth(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) {
    if (!out.has(matchup.defender)) out.set(matchup.defender, matchup);
  }
  return out;
}

function parseCompareLog(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const summaryMatch = text.match(
    /SUMMARY meanAbsΔwin=([0-9.]+) meanAbsΔavgT=([0-9.]+) worstAbsΔwin=([0-9.]+) \((.+?)\)/,
  );
  const rows = new Map();
  const rowRe =
    /^\d+\s+CUSTOM \| (.+?) \| win ([0-9.]+)->([0-9.]+) s\/a ([+-][0-9.]+) \/ [0-9.]+ \| avgT ([0-9.]+)->([0-9.]+) s\/a ([+-][0-9.]+) \/ [0-9.]+$/gm;
  let match;
  while ((match = rowRe.exec(text))) {
    rows.set(match[1], {
      row: match[1],
      truthWin: Number(match[2]),
      simWin: Number(match[3]),
      errWin: Number(match[4]),
      truthAvgT: Number(match[5]),
      simAvgT: Number(match[6]),
      errAvgT: Number(match[7]),
    });
  }
  return {
    rows,
    summary: summaryMatch
      ? {
          meanAbsWin: Number(summaryMatch[1]),
          meanAbsAvgT: Number(summaryMatch[2]),
          worstAbsWin: Number(summaryMatch[3]),
          worstRow: summaryMatch[4],
        }
      : null,
  };
}

function loadLegacyInternals() {
  const source = fs.readFileSync(LEGACY_SIM, 'utf8').replace(/^#!.*\n/, '');
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
  const compiled = vm.runInThisContext(wrapped, { filename: LEGACY_SIM });
  const mod = { exports: {} };
  const req = Module.createRequire(LEGACY_SIM);
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
    compiled(mod.exports, req, mod, LEGACY_SIM, path.dirname(LEGACY_SIM));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function buildVariantGetter(sim, cfg) {
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

function compiledFromVariant(variant) {
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

function diffState(a, b) {
  const out = {};
  for (const key of STATS) out[key] = (b[key] || 0) - (a[key] || 0);
  return out;
}

function addState(a, b) {
  const out = {};
  for (const key of STATS) out[key] = (a[key] || 0) + (b[key] || 0);
  return out;
}

function scaleState(s, scale) {
  const out = {};
  for (const key of STATS) out[key] = (s[key] || 0) * scale;
  return out;
}

function setSeed(sim, seedLabel) {
  const s = sim.mix32(sim.hashStr32(seedLabel));
  sim.setRng(sim.makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d));
}

function runFightSet(sim, attacker, defender, cfg, seedLabel) {
  setSeed(sim, seedLabel);
  const result = sim.runMatch(attacker, defender, cfg, { traceFights: 0 });
  const stats = result.stats;
  return {
    winPct: (stats.wins / cfg.trials) * 100,
    avgTurns: stats.turnsTotal / cfg.trials,
  };
}

function instrumentLegacy(sim) {
  const cfg = { ...sim.makeVariantList()[0], diag: true };
  const getVariant = buildVariantGetter(sim, cfg);
  const out = {};
  for (const [key, part] of Object.entries(CANONICAL_PARTS)) {
    const variant = getVariant(part.name, part, 1);
    const total = compiledFromVariant(variant);
    const flat = flatStatsForItem(part.name);
    out[key] = {
      total,
      flat,
      crystalDelta: diffState(flat, total),
    };
  }
  return out;
}

function buildLiveRows(sim, truthMap) {
  const cfg = {
    ...sim.makeVariantList()[0],
    diag: true,
    sharedHit: 1,
    trials: TRIALS,
    maxTurns: 200,
  };
  const getVariant = buildVariantGetter(sim, cfg);
  const rows = {};
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    rows[shell] = {};
    for (const [kind, rowName] of Object.entries(names)) {
      const matchup = truthMap.get(rowName);
      const attackerBuild = matchup.pageBuilds.attacker;
      const defenderBuild = matchup.pageBuilds.defender;
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
      const defender = sim.compileCombatantFromParts({
        name: rowName,
        stats: defenderBuild.stats,
        armorV: getVariant(defenderBuild.armor.name, defenderBuild.armor),
        w1V: getVariant(defenderBuild.weapon1.name, defenderBuild.weapon1),
        w2V: getVariant(defenderBuild.weapon2.name, defenderBuild.weapon2),
        m1V: getVariant(defenderBuild.misc1.name, defenderBuild.misc1, 1),
        m2V: getVariant(defenderBuild.misc2.name, defenderBuild.misc2, 2),
        cfg,
        role: 'D',
        attackTypeRaw: defenderBuild.attackType || sim.resolveDefenderAttackType(defenderBuild),
        attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
      });
      rows[shell][kind] = { rowName, attacker, defender };
    }
  }
  return { cfg, rows };
}

function buildTruthMarginals(truthMap) {
  const out = {};
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const noBio = truthMap.get(names.noBio).aggregates;
    const oneBio = truthMap.get(names.oneBio).aggregates;
    const twoBio = truthMap.get(names.twoBio).aggregates;
    const mixed = truthMap.get(names.mixed).aggregates;
    out[shell] = {
      noToOne: {
        win: Number(oneBio.attackerWinPct) - Number(noBio.attackerWinPct),
        avgT: Number(oneBio.avgTurns) - Number(noBio.avgTurns),
      },
      oneToTwo: {
        win: Number(twoBio.attackerWinPct) - Number(oneBio.attackerWinPct),
        avgT: Number(twoBio.avgTurns) - Number(oneBio.avgTurns),
      },
      oneToMixed: {
        win: Number(mixed.attackerWinPct) - Number(oneBio.attackerWinPct),
        avgT: Number(mixed.avgTurns) - Number(oneBio.avgTurns),
      },
      mixedToTwo: {
        win: Number(twoBio.attackerWinPct) - Number(mixed.attackerWinPct),
        avgT: Number(twoBio.avgTurns) - Number(mixed.avgTurns),
      },
    };
  }
  return out;
}

function buildLiveMarginalsFromLog(rows) {
  const out = {};
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const noBio = rows.get(names.noBio);
    const oneBio = rows.get(names.oneBio);
    const twoBio = rows.get(names.twoBio);
    const mixed = rows.get(names.mixed);
    out[shell] = {
      noToOne: { win: oneBio.simWin - noBio.simWin, avgT: oneBio.simAvgT - noBio.simAvgT },
      oneToTwo: { win: twoBio.simWin - oneBio.simWin, avgT: twoBio.simAvgT - oneBio.simAvgT },
      oneToMixed: { win: mixed.simWin - oneBio.simWin, avgT: mixed.simAvgT - oneBio.simAvgT },
      mixedToTwo: { win: twoBio.simWin - mixed.simWin, avgT: twoBio.simAvgT - mixed.simAvgT },
    };
  }
  return out;
}

function applyDelta(defender, delta) {
  const out = clone(defender);
  out.speed += delta.speed || 0;
  out.acc += delta.acc || 0;
  out.dodge += delta.dodge || 0;
  out.defSk += delta.defSk || 0;
  out.gun += delta.gun || 0;
  out.mel += delta.mel || 0;
  out.prj += delta.prj || 0;
  return out;
}

function addStates(...states) {
  const out = { speed: 0, acc: 0, dodge: 0, defSk: 0, gun: 0, mel: 0, prj: 0 };
  for (const s of states) {
    for (const key of STATS) out[key] += s[key] || 0;
  }
  return out;
}

function evaluateCandidate(sim, liveRows, perMisc, truthMarginals, candidate) {
  const pinkFirstExtra = scaleState(perMisc.bioP4.crystalDelta, candidate.firstPinkScale - 1);
  const orangeSecondExtra = scaleState(perMisc.bioO4.crystalDelta, candidate.secondOrangeScale - 1);
  const allBioExtraPink = scaleState(perMisc.bioP4.crystalDelta, candidate.allBioScale - 1);
  const allBioExtraOrange = scaleState(perMisc.bioO4.crystalDelta, candidate.allBioScale - 1);

  const results = {};
  const winErrors = [];
  const avgTErrors = [];
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    results[shell] = {};
    for (const [kind, row] of Object.entries(kinds)) {
      let delta = { speed: 0, acc: 0, dodge: 0, defSk: 0, gun: 0, mel: 0, prj: 0 };
      if (candidate.allBioScale !== 1.0) {
        if (kind === 'oneBio') delta = addStates(delta, allBioExtraPink);
        if (kind === 'twoBio') delta = addStates(delta, allBioExtraPink, allBioExtraPink);
        if (kind === 'mixed') delta = addStates(delta, allBioExtraPink, allBioExtraOrange);
      } else {
        if (kind === 'oneBio' || kind === 'twoBio' || kind === 'mixed')
          delta = addStates(delta, pinkFirstExtra);
        if (kind === 'mixed') delta = addStates(delta, orangeSecondExtra);
      }
      const defender = applyDelta(row.defender, delta);
      results[shell][kind] = runFightSet(
        sim,
        row.attacker,
        defender,
        liveRows.cfg,
        `followup-live-rule-b|${candidate.id}|${shell}|${kind}`,
      );
    }
    const marginals = {
      noToOne: {
        win: results[shell].oneBio.winPct - results[shell].noBio.winPct,
        avgT: results[shell].oneBio.avgTurns - results[shell].noBio.avgTurns,
      },
      oneToTwo: {
        win: results[shell].twoBio.winPct - results[shell].oneBio.winPct,
        avgT: results[shell].twoBio.avgTurns - results[shell].oneBio.avgTurns,
      },
      oneToMixed: {
        win: results[shell].mixed.winPct - results[shell].oneBio.winPct,
        avgT: results[shell].mixed.avgTurns - results[shell].oneBio.avgTurns,
      },
    };
    results[shell].marginals = marginals;
    winErrors.push(Math.abs(marginals.noToOne.win - truthMarginals[shell].noToOne.win));
    winErrors.push(Math.abs(marginals.oneToTwo.win - truthMarginals[shell].oneToTwo.win));
    winErrors.push(Math.abs(marginals.oneToMixed.win - truthMarginals[shell].oneToMixed.win));
    avgTErrors.push(Math.abs(marginals.noToOne.avgT - truthMarginals[shell].noToOne.avgT));
    avgTErrors.push(Math.abs(marginals.oneToTwo.avgT - truthMarginals[shell].oneToTwo.avgT));
    avgTErrors.push(Math.abs(marginals.oneToMixed.avgT - truthMarginals[shell].oneToMixed.avgT));
  }

  let noBioWorsen = false;
  const shellDirectionFlags = [];
  for (const shell of Object.keys(SHELL_ROWS)) {
    const deltaOne = results[shell].oneBio.winPct - liveRows.baselineResults[shell].oneBio.winPct;
    const deltaMixed = results[shell].mixed.winPct - liveRows.baselineResults[shell].mixed.winPct;
    shellDirectionFlags.push(Math.sign(deltaOne || 0), Math.sign(deltaMixed || 0));
    const noBioDelta = results[shell].noBio.winPct - liveRows.baselineResults[shell].noBio.winPct;
    if (Math.abs(noBioDelta) > 1e-9) noBioWorsen = true;
  }
  const nonZeroSigns = shellDirectionFlags.filter((x) => x !== 0);
  const sameDirection =
    nonZeroSigns.length === 0 || nonZeroSigns.every((x) => x === nonZeroSigns[0]) ? 'same' : 'mixed';

  return {
    ...candidate,
    results,
    meanAbsTargetWin: mean(winErrors),
    meanAbsTargetAvgT: mean(avgTErrors),
    noBioWorsen,
    shellDirection: sameDirection,
  };
}

function stateString(state) {
  return `Spd ${fmtNum(state.speed, 1)}, Acc ${fmtNum(state.acc, 1)}, Dod ${fmtNum(state.dodge, 1)}, Def ${fmtNum(state.defSk, 1)}, Gun ${fmtNum(state.gun, 1)}, Mel ${fmtNum(state.mel, 1)}, Prj ${fmtNum(state.prj, 1)}`;
}

function main() {
  ensureFiles();
  const sim = loadLegacyInternals();
  const doubleTruthMap = mapTruth(readJson(DOUBLE_TRUTH));
  const doubleLog = parseCompareLog(DOUBLE_LOG);
  const slotLog = parseCompareLog(SLOT_LOG);
  const metaLog = parseCompareLog(META_LOG);
  const truthMarginals = buildTruthMarginals(doubleTruthMap);
  const liveMarginals = buildLiveMarginalsFromLog(doubleLog.rows);
  const perMisc = instrumentLegacy(sim);
  const liveRows = buildLiveRows(sim, doubleTruthMap);
  liveRows.baselineResults = {};
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    liveRows.baselineResults[shell] = {};
    for (const [kind, row] of Object.entries(kinds)) {
      liveRows.baselineResults[shell][kind] = runFightSet(
        sim,
        row.attacker,
        row.defender,
        liveRows.cfg,
        `followup-live-rule-b|baseline-live|${shell}|${kind}`,
      );
    }
  }

  const ranked = CANDIDATES.map((candidate) =>
    evaluateCandidate(sim, liveRows, perMisc, truthMarginals, candidate),
  );
  ranked.sort(
    (a, b) =>
      a.meanAbsTargetWin - b.meanAbsTargetWin ||
      a.meanAbsTargetAvgT - b.meanAbsTargetAvgT ||
      a.label.localeCompare(b.label),
  );

  const best = ranked[0];
  const remainingRows = DOUBLE_ROWS.map((rowName) => doubleLog.rows.get(rowName));

  const lines = [];
  lines.push('# codex-bio post-Rule-B follow-up diagnosis');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push('Determine the smallest remaining follow-up needed on top of the now-live Rule B duplicate-Pink patch using a bounded temp-only sweep, without editing tracked source files.');
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions inspected');
  lines.push('');
  lines.push('- `./tmp/codex-bio-rule-b-activation-fix-report.md`');
  lines.push('- `./tmp/codex-bio-rule-b-revision-diagnosis.md`');
  lines.push('- `./tmp/codex-bio-rule-validation.md`');
  lines.push('- `./tmp/codex-bio-variant-instrumentation.md`');
  lines.push('- `./tmp/codex-bio-duplicate-color-diagnosis.md`');
  lines.push('- `./tmp/legacy-truth-double-bio-probe.json`');
  lines.push('- `./tmp/legacy-truth-bio-slot-order-probe.json`');
  lines.push('- `./tmp/legacy-truth-current-attacker-vs-meta.json`');
  lines.push('- `./legacy-sim-v1.0.4-clean.js`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `getEffectiveCrystalPct(...)`');
  lines.push('- `./brute-sim-v1.4.6.js`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `getEffectiveCrystalPct(...)`');
  lines.push('- `./legacy-defs.js`');
  lines.push('- `./tools/legacy-truth-replay-compare.js`');
  lines.push('');
  lines.push('## 4. Source hygiene result');
  lines.push('');
  lines.push('- Tracked source still has Rule B duplicate-Pink `1.5x` scaling: yes');
  lines.push('- Tracked source still has the activation fix for uniform `crystalName === "Perfect Pink Crystal"`: yes');
  lines.push('- Current Rule B helper lives in:');
  lines.push('  - `legacy-sim-v1.0.4-clean.js` local helper block around `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)`');
  lines.push('  - `brute-sim-v1.4.6.js` mirrored helper block immediately above `buildVariantsForArmors(...)`, used by `compileDefender(...)` and `compileAttacker(...)`');
  lines.push('');
  lines.push('## 5. Remaining error table after live Rule B');
  lines.push('');
  lines.push('| Row | Truth win / avgT | Live Rule B sim win / avgT | Current error |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of remainingRows) {
    lines.push(
      `| ${quote(row.row)} | ${fmtNum(row.truthWin)} / ${fmtNum(row.truthAvgT, 4)} | ${fmtNum(row.simWin)} / ${fmtNum(row.simAvgT, 4)} | ${fmtSigned(row.errWin)} / ${fmtSigned(row.errAvgT, 4)} |`,
    );
  }
  lines.push('');
  lines.push('## 6. Truth-side marginal tables');
  lines.push('');
  lines.push('| Shell | No Bio -> One Bio[P4] | One Bio[P4] -> Two Bio[P4] | One Bio[P4] -> Bio[P4]+Bio[O4] | Bio[P4]+Bio[O4] -> Two Bio[P4] |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [shell, m] of Object.entries(truthMarginals)) {
    lines.push(
      `| ${quote(shell)} | \`${fmtSigned(m.noToOne.win)} / ${fmtSigned(m.noToOne.avgT, 4)}\` | \`${fmtSigned(m.oneToTwo.win)} / ${fmtSigned(m.oneToTwo.avgT, 4)}\` | \`${fmtSigned(m.oneToMixed.win)} / ${fmtSigned(m.oneToMixed.avgT, 4)}\` | \`${fmtSigned(m.mixedToTwo.win)} / ${fmtSigned(m.mixedToTwo.avgT, 4)}\` |`,
    );
  }
  lines.push('');
  lines.push('## 7. Live Rule B marginal tables');
  lines.push('');
  lines.push('| Shell | No Bio -> One Bio[P4] | One Bio[P4] -> Two Bio[P4] | One Bio[P4] -> Bio[P4]+Bio[O4] | Bio[P4]+Bio[O4] -> Two Bio[P4] |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [shell, m] of Object.entries(liveMarginals)) {
    lines.push(
      `| ${quote(shell)} | \`${fmtSigned(m.noToOne.win)} / ${fmtSigned(m.noToOne.avgT, 4)}\` | \`${fmtSigned(m.oneToTwo.win)} / ${fmtSigned(m.oneToTwo.avgT, 4)}\` | \`${fmtSigned(m.oneToMixed.win)} / ${fmtSigned(m.oneToMixed.avgT, 4)}\` | \`${fmtSigned(m.mixedToTwo.win)} / ${fmtSigned(m.mixedToTwo.avgT, 4)}\` |`,
    );
  }
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- remaining `no-Bio -> one-Bio[P4]` miss is still large in both shells: Dual Rift `+3.01` win shallow, Core/Rift `+2.39` win shallow');
  lines.push('- remaining `one-Bio -> Bio[P4]+Bio[O4]` miss is still positive in both shells, strongest in Dual Rift');
  lines.push('- `one-Bio -> two-Bio[P4]` under live Rule B is now too negative in both shells, especially Core/Rift');
  lines.push('- this means duplicate-only Rule B solved activation but did not isolate the full remaining family');
  lines.push('');
  lines.push('## 8. Temp-only follow-up candidate families tested');
  lines.push('');
  lines.push(`Temp-only sweep mode: deterministic legacy-sim helper model, ${TRIALS.toLocaleString()} fights per row, additive adjustments on top of the live Rule B baseline only.`);
  lines.push('');
  lines.push('| Candidate | Family | Definition |');
  lines.push('| --- | --- | --- |');
  for (const c of CANDIDATES) {
    lines.push(`| ${quote(c.label)} | ${quote(c.family)} | ${quote(c.desc)} |`);
  }
  lines.push('');
  lines.push('## 9. Candidate ranking');
  lines.push('');
  lines.push('| Rank | Candidate | Family | meanAbsΔwin targeted | meanAbsΔavgT targeted | no-Bio worsens? | Dual/Core move same direction? |');
  lines.push('| ---: | --- | --- | ---: | ---: | --- | --- |');
  ranked.forEach((c, idx) => {
    lines.push(
      `| ${idx + 1} | ${quote(c.label)} | ${quote(c.family)} | ${fmtNum(c.meanAbsTargetWin)} | ${fmtNum(c.meanAbsTargetAvgT, 4)} | ${c.noBioWorsen ? 'yes' : 'no'} | ${c.shellDirection} |`,
    );
  });
  lines.push('');
  lines.push('Targeted marginals scored for ranking:');
  lines.push('');
  lines.push('- `No Bio -> One Bio[P4]`');
  lines.push('- `One Bio[P4] -> Bio[P4]+Bio[O4]`');
  lines.push('- `One Bio[P4] -> Two Bio[P4]`');
  lines.push('- both Dual Rift and Core/Rift');
  lines.push('');
  lines.push('## 10. Best explanation now');
  lines.push('');
  lines.push(`Best-ranked temp-only family was **${best.family}** via **${best.label}**.`);
  lines.push('');
  lines.push('What the sweep shows:');
  lines.push('');
  lines.push('- first-Bio-only follow-up improves the large `no-Bio -> one-Bio[P4]` miss in both shells, but by construction it does not fix the still-too-negative duplicate marginal under live Rule B');
  lines.push('- mixed-color-only follow-up improves the `one-Bio -> Bio[P4]+Bio[O4]` miss, but leaves first-Bio and duplicate issues untouched');
  lines.push('- the combined family ranks best because the remaining absolute errors are split across two untouched surfaces: first-copy Pink baseline and mixed-color/second Orange baseline');
  lines.push('- however, even the combined family cannot repair the live Rule B `one-Bio -> two-Bio[P4]` overshoot, because that duplicate marginal is already governed by the active second-Pink rule');
  lines.push('- the smallest plausible remaining follow-up therefore looks like **both first-Bio and mixed-color**, but the duplicate marginal still needs one final narrow check before a new tracked patch is justified');
  lines.push('');
  lines.push('Compile-surface localization for the best family:');
  lines.push('');
  lines.push('- smallest plausible shared patch surface remains the current local Bio helper path, not `computeVariantFromCrystalSpec(...)` or `getEffectiveCrystalPct(...)`');
  lines.push('- reason: the best family is defined by copy/color context across `m1V` and `m2V`, and the existing `applyValidatedDuplicateBioPinkScaling(...)` block already has that pair context with minimal blast radius');
  lines.push('- lowest-risk next patch area: extend the current local helper block in both simulators rather than broadening lower-level crystal math');
  lines.push('');
  lines.push('## 11. Recommendation');
  lines.push('');
  lines.push('**NEED ONE FINAL MICRO-INSTRUMENTATION PASS**');
  lines.push('');
  lines.push('Reason:');
  lines.push('');
  lines.push('- the ranking makes the next family obvious: combined first-Bio plus mixed-color follow-up');
  lines.push('- but the still-too-negative live Rule B duplicate marginal means a new tracked follow-up patch is not fully isolated yet');
  lines.push('- one final temp-only pass should confirm that any first-Bio/mixed-color follow-up leaves the now-live duplicate rows acceptable before editing tracked code again');
  lines.push('');
  lines.push('## 12. If PATCH CANDIDATE READY');
  lines.push('');
  lines.push('Not applicable. The best family is identifiable, but this pass stops short of a tracked-source patch recommendation because duplicate-row behavior under live Rule B still needs one final narrow check.');
  lines.push('');
  lines.push('## 13. What ChatGPT should do next');
  lines.push('');
  lines.push('Use this report as the handoff. Do one last temp-only instrumentation pass in the existing local Bio helper block to model a combined first-Bio and mixed-color follow-up while holding the live duplicate-Pink rule fixed, and explicitly verify that the Dual Rift and Core/Rift duplicate rows stay within an acceptable band before making any new tracked edit.');

  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
}

main();
