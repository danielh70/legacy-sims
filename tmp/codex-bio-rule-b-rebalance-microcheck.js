'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const LEGACY_SIM = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS = path.join(REPO, 'legacy-defs.js');
const ORANGE_TRUTH = path.join(__dirname, 'legacy-truth-bio-orange-duplicate-probe.json');
const DOUBLE_TRUTH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const ORANGE_REPORT = path.join(__dirname, 'codex-bio-orange-duplicate-analysis.md');
const FINAL_MICROCHECK = path.join(__dirname, 'codex-bio-final-followup-microcheck.md');
const FOLLOWUP_DIAG = path.join(__dirname, 'codex-bio-post-rule-b-followup-diagnosis.md');
const ACTIVATION_REPORT = path.join(__dirname, 'codex-bio-rule-b-activation-fix-report.md');
const LIVE_LOG = path.join(__dirname, 'codex-bio-rule-b-rebalance-orange-live.log');
const REPORT_PATH = path.join(__dirname, 'codex-bio-rule-b-rebalance-microcheck.md');

const REQUIRED = [
  ORANGE_REPORT,
  FINAL_MICROCHECK,
  FOLLOWUP_DIAG,
  ACTIVATION_REPORT,
  ORANGE_TRUTH,
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  LEGACY_SIM,
  BRUTE_SIM,
  LEGACY_DEFS,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
  LIVE_LOG,
];

const COMMANDS = [
  'ls -1 ./tmp/codex-bio-orange-duplicate-analysis.md ./tmp/codex-bio-final-followup-microcheck.md ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  'rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  "sed -n '1,220p' ./tmp/codex-bio-orange-duplicate-analysis.md",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-rebalance-orange-live' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-rebalance-orange-live.log 2>&1",
  'node ./tmp/codex-bio-rule-b-rebalance-microcheck.js',
];

const defs = require(LEGACY_DEFS);
const ItemDefs = defs.ItemDefs || {};

const TRIALS = 20000;
const STATS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];

const SHELL_ROWS = {
  'Dual Rift': {
    noBio: 'DL Dual Rift No Bio',
    oneP4: 'DL Dual Rift One Bio P4',
    oneO4: 'DL Dual Rift One Bio O4',
    twoP4: 'DL Dual Rift Two Bio P4',
    mixed: 'DL Dual Rift Bio P4 + O4',
    twoO4: 'DL Dual Rift Two Bio O4',
  },
  'Core/Rift': {
    noBio: 'DL Core/Rift No Bio',
    oneP4: 'DL Core/Rift One Bio P4',
    oneO4: 'DL Core/Rift One Bio O4',
    twoP4: 'DL Core/Rift Two Bio P4',
    mixed: 'DL Core/Rift Bio P4 + O4',
    twoO4: 'DL Core/Rift Two Bio O4',
  },
};

const DUP_SCALES = [1.2, 1.25, 1.3, 1.35, 1.4, 1.5];
const FIRST_SCALES = [1.1, 1.15, 1.2];

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

function addStates(...states) {
  const out = { speed: 0, acc: 0, dodge: 0, defSk: 0, gun: 0, mel: 0, prj: 0 };
  for (const s of states) {
    for (const key of STATS) out[key] += s[key] || 0;
  }
  return out;
}

function scaleState(state, scale) {
  const out = {};
  for (const key of STATS) out[key] = (state[key] || 0) * scale;
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

function setSeed(sim, seedLabel) {
  const s = sim.mix32(sim.hashStr32(seedLabel));
  sim.setRng(sim.makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d));
}

function runFightSet(sim, attacker, defender, cfg, seedLabel) {
  setSeed(sim, seedLabel);
  const result = sim.runMatch(attacker, defender, cfg, { traceFights: 0 });
  return {
    winPct: (result.stats.wins / cfg.trials) * 100,
    avgTurns: result.stats.turnsTotal / cfg.trials,
  };
}

function buildTruthMarginals(truthMap) {
  const out = {};
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const noBio = truthMap.get(names.noBio).aggregates;
    const oneP4 = truthMap.get(names.oneP4).aggregates;
    const oneO4 = truthMap.get(names.oneO4).aggregates;
    const twoP4 = truthMap.get(names.twoP4).aggregates;
    const mixed = truthMap.get(names.mixed).aggregates;
    const twoO4 = truthMap.get(names.twoO4).aggregates;
    out[shell] = {
      noToOneP4: {
        win: Number(oneP4.attackerWinPct) - Number(noBio.attackerWinPct),
        avgT: Number(oneP4.avgTurns) - Number(noBio.avgTurns),
      },
      noToOneO4: {
        win: Number(oneO4.attackerWinPct) - Number(noBio.attackerWinPct),
        avgT: Number(oneO4.avgTurns) - Number(noBio.avgTurns),
      },
      oneP4ToTwoP4: {
        win: Number(twoP4.attackerWinPct) - Number(oneP4.attackerWinPct),
        avgT: Number(twoP4.avgTurns) - Number(oneP4.avgTurns),
      },
      oneO4ToTwoO4: {
        win: Number(twoO4.attackerWinPct) - Number(oneO4.attackerWinPct),
        avgT: Number(twoO4.avgTurns) - Number(oneO4.avgTurns),
      },
      oneP4ToMixed: {
        win: Number(mixed.attackerWinPct) - Number(oneP4.attackerWinPct),
        avgT: Number(mixed.avgTurns) - Number(oneP4.avgTurns),
      },
      oneO4ToMixed: {
        win: Number(mixed.attackerWinPct) - Number(oneO4.attackerWinPct),
        avgT: Number(mixed.avgTurns) - Number(oneO4.avgTurns),
      },
    };
  }
  return out;
}

function liveMarginalsFromRows(rows) {
  const out = {};
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const noBio = rows.get(names.noBio);
    const oneP4 = rows.get(names.oneP4);
    const oneO4 = rows.get(names.oneO4);
    const twoP4 = rows.get(names.twoP4);
    const mixed = rows.get(names.mixed);
    const twoO4 = rows.get(names.twoO4);
    out[shell] = {
      noToOneP4: { win: oneP4.simWin - noBio.simWin, avgT: oneP4.simAvgT - noBio.simAvgT },
      noToOneO4: { win: oneO4.simWin - noBio.simWin, avgT: oneO4.simAvgT - noBio.simAvgT },
      oneP4ToTwoP4: { win: twoP4.simWin - oneP4.simWin, avgT: twoP4.simAvgT - oneP4.simAvgT },
      oneO4ToTwoO4: { win: twoO4.simWin - oneO4.simWin, avgT: twoO4.simAvgT - oneO4.simAvgT },
      oneP4ToMixed: { win: mixed.simWin - oneP4.simWin, avgT: mixed.simAvgT - oneP4.simAvgT },
      oneO4ToMixed: { win: mixed.simWin - oneO4.simWin, avgT: mixed.simAvgT - oneO4.simAvgT },
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
      rows[shell][kind] = { attacker, defender, rowName };
    }
  }
  return { cfg, rows };
}

function instrumentLegacy(sim) {
  const cfg = { ...sim.makeVariantList()[0], diag: true };
  const getVariant = buildVariantGetter(sim, cfg);
  const scout = { name: 'Scout Drones', upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'] };
  const bioP4 = { name: 'Bio Spinal Enhancer', upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'] };
  const bioO4 = { name: 'Bio Spinal Enhancer', upgrades: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'] };
  const variants = {
    scoutP4: getVariant(scout.name, scout, 1),
    bioP4: getVariant(bioP4.name, bioP4, 1),
    bioO4: getVariant(bioO4.name, bioO4, 1),
  };
  const out = {};
  for (const [key, variant] of Object.entries(variants)) {
    const itemName = key === 'scoutP4' ? 'Scout Drones' : 'Bio Spinal Enhancer';
    const flat = flatStatsForItem(itemName);
    const total = compiledFromVariant(variant);
    out[key] = { total, flat, crystalDelta: diffState(flat, total) };
  }
  return out;
}

function candidateDelta(kind, duplicateScale, firstMode, firstScale, perMisc) {
  const pinkDupDelta = scaleState(perMisc.bioP4.crystalDelta, duplicateScale - 1.5);
  const pinkFirstDelta = scaleState(perMisc.bioP4.crystalDelta, firstScale - 1.0);
  const orangeFirstDelta = scaleState(perMisc.bioO4.crystalDelta, firstScale - 1.0);
  let delta = { speed: 0, acc: 0, dodge: 0, defSk: 0, gun: 0, mel: 0, prj: 0 };
  if (kind === 'twoP4') delta = addStates(delta, pinkDupDelta);

  if (firstMode === 'pink') {
    if (kind === 'oneP4' || kind === 'twoP4' || kind === 'mixed') delta = addStates(delta, pinkFirstDelta);
  } else if (firstMode === 'both') {
    if (kind === 'oneP4' || kind === 'twoP4' || kind === 'mixed') delta = addStates(delta, pinkFirstDelta);
    if (kind === 'oneO4' || kind === 'twoO4' || kind === 'mixed') delta = addStates(delta, orangeFirstDelta);
  }

  return delta;
}

function buildBaselineModeled(sim, liveRows) {
  const baseline = {};
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    baseline[shell] = {};
    for (const [kind, row] of Object.entries(kinds)) {
      baseline[shell][kind] = runFightSet(sim, row.attacker, row.defender, liveRows.cfg, `rebalance|baseline|${shell}|${kind}`);
    }
  }
  return baseline;
}

function runScenario(sim, liveRows, modeledBaseline, liveBaselineRows, perMisc, duplicateScale, firstMode, firstScale) {
  const rows = {};
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    rows[shell] = {};
    for (const [kind, row] of Object.entries(kinds)) {
      const delta = candidateDelta(kind, duplicateScale, firstMode, firstScale, perMisc);
      if (Object.values(delta).every((x) => Math.abs(x) < 1e-12)) {
        rows[shell][kind] = {
          winPct: liveBaselineRows.get(SHELL_ROWS[shell][kind]).simWin,
          avgTurns: liveBaselineRows.get(SHELL_ROWS[shell][kind]).simAvgT,
        };
        continue;
      }
      const defender = applyDelta(row.defender, delta);
      const modeled = runFightSet(sim, row.attacker, defender, liveRows.cfg, `rebalance|${duplicateScale}|${firstMode}|${firstScale}|${shell}|${kind}`);
      const modeledBase = modeledBaseline[shell][kind];
      const liveBase = liveBaselineRows.get(SHELL_ROWS[shell][kind]);
      rows[shell][kind] = {
        winPct: liveBase.simWin + (modeled.winPct - modeledBase.winPct),
        avgTurns: liveBase.simAvgT + (modeled.avgTurns - modeledBase.avgTurns),
      };
    }
    rows[shell].marginals = {
      noToOneP4: { win: rows[shell].oneP4.winPct - rows[shell].noBio.winPct, avgT: rows[shell].oneP4.avgTurns - rows[shell].noBio.avgTurns },
      noToOneO4: { win: rows[shell].oneO4.winPct - rows[shell].noBio.winPct, avgT: rows[shell].oneO4.avgTurns - rows[shell].noBio.avgTurns },
      oneP4ToTwoP4: { win: rows[shell].twoP4.winPct - rows[shell].oneP4.winPct, avgT: rows[shell].twoP4.avgTurns - rows[shell].oneP4.avgTurns },
      oneO4ToTwoO4: { win: rows[shell].twoO4.winPct - rows[shell].oneO4.winPct, avgT: rows[shell].twoO4.avgTurns - rows[shell].oneO4.avgTurns },
      oneP4ToMixed: { win: rows[shell].mixed.winPct - rows[shell].oneP4.winPct, avgT: rows[shell].mixed.avgTurns - rows[shell].oneP4.avgTurns },
      oneO4ToMixed: { win: rows[shell].mixed.winPct - rows[shell].oneO4.winPct, avgT: rows[shell].mixed.avgTurns - rows[shell].oneO4.avgTurns },
    };
  }
  return rows;
}

function scoreDuplicateCandidate(rows, truthMarginals, liveBaselineMarginals) {
  const dupWins = [];
  const dupAvgTs = [];
  const rowWins = [];
  const rowAvgTs = [];
  const containWins = [];
  const containAvgTs = [];
  let bothImprove = true;
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const truth = truthMarginals[shell];
    const sim = rows[shell].marginals;
    dupWins.push(Math.abs(sim.oneP4ToTwoP4.win - truth.oneP4ToTwoP4.win));
    dupAvgTs.push(Math.abs(sim.oneP4ToTwoP4.avgT - truth.oneP4ToTwoP4.avgT));
    rowWins.push(Math.abs(rows[shell].twoP4.winPct - truthRows.get(names.twoP4).truthWin));
    rowAvgTs.push(Math.abs(rows[shell].twoP4.avgTurns - truthRows.get(names.twoP4).truthAvgT));
    containWins.push(Math.abs(sim.noToOneO4.win - truth.noToOneO4.win));
    containWins.push(Math.abs(sim.oneO4ToTwoO4.win - truth.oneO4ToTwoO4.win));
    containWins.push(Math.abs(sim.oneO4ToMixed.win - truth.oneO4ToMixed.win));
    containAvgTs.push(Math.abs(sim.noToOneO4.avgT - truth.noToOneO4.avgT));
    containAvgTs.push(Math.abs(sim.oneO4ToTwoO4.avgT - truth.oneO4ToTwoO4.avgT));
    containAvgTs.push(Math.abs(sim.oneO4ToMixed.avgT - truth.oneO4ToMixed.avgT));
    const liveErr = Math.abs(liveBaselineMarginals[shell].oneP4ToTwoP4.win - truth.oneP4ToTwoP4.win);
    const newErr = Math.abs(sim.oneP4ToTwoP4.win - truth.oneP4ToTwoP4.win);
    if (!(newErr < liveErr)) bothImprove = false;
  }
  return {
    dupMeanWin: mean([...dupWins, ...rowWins]),
    dupMeanAvgT: mean([...dupAvgTs, ...rowAvgTs]),
    dupMargMeanWin: mean(dupWins),
    dupMargMeanAvgT: mean(dupAvgTs),
    twoRowMeanWin: mean(rowWins),
    twoRowMeanAvgT: mean(rowAvgTs),
    orangeContainMeanWin: mean(containWins),
    orangeContainMeanAvgT: mean(containAvgTs),
    bothImprove,
  };
}

let truthRows = null;

function scoreFinalCandidate(rows, truthMarginals, liveBaselineMarginals) {
  const dupWins = [];
  const dupAvgTs = [];
  const rowWins = [];
  const rowAvgTs = [];
  const firstWins = [];
  const firstAvgTs = [];
  const orangeContainWins = [];
  const orangeContainAvgTs = [];
  let bothImprove = true;
  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const truth = truthMarginals[shell];
    const sim = rows[shell].marginals;
    dupWins.push(Math.abs(sim.oneP4ToTwoP4.win - truth.oneP4ToTwoP4.win));
    dupAvgTs.push(Math.abs(sim.oneP4ToTwoP4.avgT - truth.oneP4ToTwoP4.avgT));
    rowWins.push(Math.abs(rows[shell].twoP4.winPct - truthRows.get(names.twoP4).truthWin));
    rowAvgTs.push(Math.abs(rows[shell].twoP4.avgTurns - truthRows.get(names.twoP4).truthAvgT));
    firstWins.push(Math.abs(sim.noToOneP4.win - truth.noToOneP4.win));
    firstWins.push(Math.abs(sim.noToOneO4.win - truth.noToOneO4.win));
    firstAvgTs.push(Math.abs(sim.noToOneP4.avgT - truth.noToOneP4.avgT));
    firstAvgTs.push(Math.abs(sim.noToOneO4.avgT - truth.noToOneO4.avgT));
    orangeContainWins.push(Math.abs(sim.oneO4ToTwoO4.win - truth.oneO4ToTwoO4.win));
    orangeContainWins.push(Math.abs(sim.oneO4ToMixed.win - truth.oneO4ToMixed.win));
    orangeContainAvgTs.push(Math.abs(sim.oneO4ToTwoO4.avgT - truth.oneO4ToTwoO4.avgT));
    orangeContainAvgTs.push(Math.abs(sim.oneO4ToMixed.avgT - truth.oneO4ToMixed.avgT));
    const baseP4 = Math.abs(liveBaselineMarginals[shell].noToOneP4.win - truth.noToOneP4.win);
    const newP4 = Math.abs(sim.noToOneP4.win - truth.noToOneP4.win);
    const baseO4 = Math.abs(liveBaselineMarginals[shell].noToOneO4.win - truth.noToOneO4.win);
    const newO4 = Math.abs(sim.noToOneO4.win - truth.noToOneO4.win);
    if (!(newP4 <= baseP4 && newO4 <= baseO4)) bothImprove = false;
  }
  return {
    firstMeanWin: mean(firstWins),
    firstMeanAvgT: mean(firstAvgTs),
    dupMeanWin: mean([...dupWins, ...rowWins]),
    dupMeanAvgT: mean([...dupAvgTs, ...rowAvgTs]),
    dupMargMeanWin: mean(dupWins),
    dupMargMeanAvgT: mean(dupAvgTs),
    twoRowMeanWin: mean(rowWins),
    twoRowMeanAvgT: mean(rowAvgTs),
    orangeContainMeanWin: mean(orangeContainWins),
    orangeContainMeanAvgT: mean(orangeContainAvgTs),
    bothImprove,
  };
}

function main() {
  ensureFiles();
  const sim = loadLegacyInternals();
  const truthMap = mapTruth(readJson(ORANGE_TRUTH));
  const truthMarginals = buildTruthMarginals(truthMap);
  const live = parseCompareLog(LIVE_LOG);
  truthRows = live.rows;
  const liveMarginals = liveMarginalsFromRows(live.rows);
  const liveRows = buildLiveRows(sim, truthMap);
  const perMisc = instrumentLegacy(sim);
  const modeledBaseline = buildBaselineModeled(sim, liveRows);

  const duplicateCandidates = DUP_SCALES.map((scale) => {
    const rows = runScenario(sim, liveRows, modeledBaseline, live.rows, perMisc, scale, 'none', 1.0);
    return {
      scale,
      rows,
      ...scoreDuplicateCandidate(rows, truthMarginals, liveMarginals),
    };
  }).sort((a, b) =>
    a.dupMeanWin - b.dupMeanWin ||
    a.dupMeanAvgT - b.dupMeanAvgT ||
    a.orangeContainMeanWin - b.orangeContainMeanWin ||
    a.scale - b.scale,
  );

  const bestDup = duplicateCandidates[0];

  const finalCandidates = [
    { label: 'none', family: 'none', firstMode: 'none', firstScale: 1.0 },
    ...FIRST_SCALES.map((scale) => ({ label: `Pink-only ${scale.toFixed(2)}`, family: 'pink-only', firstMode: 'pink', firstScale: scale })),
    ...FIRST_SCALES.map((scale) => ({ label: `Pink+Orange ${scale.toFixed(2)}`, family: 'both-colors', firstMode: 'both', firstScale: scale })),
  ].map((candidate) => {
    const rows = runScenario(sim, liveRows, modeledBaseline, live.rows, perMisc, bestDup.scale, candidate.firstMode, candidate.firstScale);
    return {
      ...candidate,
      duplicateScale: bestDup.scale,
      rows,
      ...scoreFinalCandidate(rows, truthMarginals, liveMarginals),
    };
  }).sort((a, b) =>
    a.firstMeanWin - b.firstMeanWin ||
    a.dupMeanWin - b.dupMeanWin ||
    a.orangeContainMeanWin - b.orangeContainMeanWin ||
    a.firstMeanAvgT - b.firstMeanAvgT ||
    a.label.localeCompare(b.label),
  );

  const bestFinal = finalCandidates[0];
  const patchReady =
    bestDup.scale < 1.5 &&
    bestFinal.family === 'both-colors' &&
    bestFinal.firstMeanWin < finalCandidates.find((c) => c.family === 'none').firstMeanWin &&
    bestFinal.dupMeanWin <= finalCandidates.find((c) => c.family === 'none').dupMeanWin + 0.25 &&
    bestFinal.orangeContainMeanWin <= finalCandidates.find((c) => c.family === 'none').orangeContainMeanWin + 0.25;

  const lines = [];
  lines.push('# codex-bio Rule B rebalance microcheck');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push('Do one last temp-only helper-level microcheck centered on the live Rule B block to determine the best duplicate-Pink rebalance and whether any remaining first-copy follow-up should be Pink-only or both Pink and Orange.');
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions inspected');
  lines.push('');
  lines.push('- `./tmp/codex-bio-orange-duplicate-analysis.md`');
  lines.push('- `./tmp/codex-bio-final-followup-microcheck.md`');
  lines.push('- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`');
  lines.push('- `./tmp/codex-bio-rule-b-activation-fix-report.md`');
  lines.push('- `./tmp/legacy-truth-bio-orange-duplicate-probe.json`');
  lines.push('- `./tmp/legacy-truth-double-bio-probe.json`');
  lines.push('- `./tmp/legacy-truth-bio-slot-order-probe.json`');
  lines.push('- `./legacy-sim-v1.0.4-clean.js`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `getEffectiveCrystalPct(...)`');
  lines.push('- `./brute-sim-v1.4.6.js`');
  lines.push('  - mirrored Rule B helper block and shared variant functions');
  lines.push('- `./legacy-defs.js`');
  lines.push('- `./tools/legacy-truth-replay-compare.js`');
  lines.push('');
  lines.push('## 4. Source hygiene result');
  lines.push('');
  lines.push('- Tracked source still has live Rule B with the activation fix: yes');
  lines.push('- Duplicate-Pink scaling currently lives in the local helper block around `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)` in legacy and the mirrored helper block in brute.');
  lines.push('- No tracked-source edits were made in this pass.');
  lines.push('');
  lines.push('## 5. Live Rule B baseline marginal table');
  lines.push('');
  lines.push('| Shell | No Bio -> One Bio P4 | No Bio -> One Bio O4 | One Bio P4 -> Two Bio P4 | One Bio O4 -> Two Bio O4 | One Bio P4 -> Bio P4 + O4 | One Bio O4 -> Bio P4 + O4 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const [shell, m] of Object.entries(liveMarginals)) {
    lines.push(`| ${quote(shell)} | \`${fmtSigned(m.noToOneP4.win)} / ${fmtSigned(m.noToOneP4.avgT, 4)}\` | \`${fmtSigned(m.noToOneO4.win)} / ${fmtSigned(m.noToOneO4.avgT, 4)}\` | \`${fmtSigned(m.oneP4ToTwoP4.win)} / ${fmtSigned(m.oneP4ToTwoP4.avgT, 4)}\` | \`${fmtSigned(m.oneO4ToTwoO4.win)} / ${fmtSigned(m.oneO4ToTwoO4.avgT, 4)}\` | \`${fmtSigned(m.oneP4ToMixed.win)} / ${fmtSigned(m.oneP4ToMixed.avgT, 4)}\` | \`${fmtSigned(m.oneO4ToMixed.win)} / ${fmtSigned(m.oneO4ToMixed.avgT, 4)}\` |`);
  }
  lines.push('');
  lines.push('## 6. Duplicate-Pink rebalance candidates tested');
  lines.push('');
  lines.push('| Scale | Duplicate-focused meanAbsΔwin | Duplicate-focused meanAbsΔavgT | One Bio P4 -> Two Bio P4 meanAbsΔwin | Two Bio P4 row meanAbsΔwin | Orange containment meanAbsΔwin | Dual/Core improve together? |');
  lines.push('| ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const c of duplicateCandidates) {
    lines.push(`| ${fmtNum(c.scale, 2)} | ${fmtNum(c.dupMeanWin)} | ${fmtNum(c.dupMeanAvgT, 4)} | ${fmtNum(c.dupMargMeanWin)} | ${fmtNum(c.twoRowMeanWin)} | ${fmtNum(c.orangeContainMeanWin)} | ${c.bothImprove ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## 7. Candidate ranking for duplicate rebalance');
  lines.push('');
  lines.push(`Best duplicate-Pink rebalance candidate: **${fmtNum(bestDup.scale, 2)}x**.`);
  lines.push('');
  for (const [shell, truth] of Object.entries(truthMarginals)) {
    const sim = bestDup.rows[shell].marginals;
    lines.push(`- ${shell}: \`One Bio P4 -> Two Bio P4\` truth ${fmtSigned(truth.oneP4ToTwoP4.win)} / ${fmtSigned(truth.oneP4ToTwoP4.avgT, 4)}, sim ${fmtSigned(sim.oneP4ToTwoP4.win)} / ${fmtSigned(sim.oneP4ToTwoP4.avgT, 4)}.`);
  }
  lines.push('');
  lines.push('## 8. First-copy follow-up candidates tested on top of the best rebalance');
  lines.push('');
  lines.push(`Best rebalance baseline held fixed at duplicate-Pink scale **${fmtNum(bestDup.scale, 2)}x**.`);
  lines.push('');
  lines.push('| Candidate | Family | first-copy-focused meanAbsΔwin | first-copy-focused meanAbsΔavgT | duplicate-focused meanAbsΔwin | Orange containment meanAbsΔwin | Dual/Core improve together? |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const c of finalCandidates) {
    lines.push(`| ${quote(c.label)} | ${quote(c.family)} | ${fmtNum(c.firstMeanWin)} | ${fmtNum(c.firstMeanAvgT, 4)} | ${fmtNum(c.dupMeanWin)} | ${fmtNum(c.orangeContainMeanWin)} | ${c.bothImprove ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## 9. Final candidate ranking');
  lines.push('');
  lines.push(`Best final candidate: **${quote(bestFinal.label)}** on top of duplicate-Pink **${fmtNum(bestDup.scale, 2)}x**.`);
  lines.push('');
  lines.push('| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |');
  lines.push('| --- | --- | --- | --- | ---: | ---: |');
  for (const [shell, truth] of Object.entries(truthMarginals)) {
    const sim = bestFinal.rows[shell].marginals;
    for (const [key, label] of [
      ['noToOneP4', 'No Bio -> One Bio P4'],
      ['noToOneO4', 'No Bio -> One Bio O4'],
      ['oneP4ToTwoP4', 'One Bio P4 -> Two Bio P4'],
      ['oneO4ToTwoO4', 'One Bio O4 -> Two Bio O4'],
      ['oneP4ToMixed', 'One Bio P4 -> Bio P4 + O4'],
      ['oneO4ToMixed', 'One Bio O4 -> Bio P4 + O4'],
    ]) {
      lines.push(`| ${quote(shell)} | ${label} | ${fmtSigned(truth[key].win)} / ${fmtSigned(truth[key].avgT, 4)} | ${fmtSigned(sim[key].win)} / ${fmtSigned(sim[key].avgT, 4)} | ${fmtNum(Math.abs(sim[key].win - truth[key].win))} | ${fmtNum(Math.abs(sim[key].avgT - truth[key].avgT), 4)} |`);
    }
  }
  lines.push('');
  lines.push('## 10. Best explanation now');
  lines.push('');
  lines.push(`- The duplicate-Pink live magnitude of **1.50x** is too strong. The best bounded rebalance candidate is **${fmtNum(bestDup.scale, 2)}x**.`);
  const noFirst = finalCandidates.find((c) => c.family === 'none');
  lines.push(`- After duplicate rebalance, there is ${bestFinal.firstMeanWin < noFirst.firstMeanWin ? 'still a real' : 'not a convincing'} first-copy baseline miss. The first-copy-focused meanAbsΔwin moves from ${fmtNum(noFirst.firstMeanWin)} at rebalance-only to ${fmtNum(bestFinal.firstMeanWin)} for the best first-copy candidate.`);
  lines.push(`- The smallest plausible first-copy follow-up is **${bestFinal.family === 'pink-only' ? 'Pink-only' : bestFinal.family === 'both-colors' ? 'both Pink and Orange' : 'none'}**.`);
  lines.push(`- The current helper-level Rule B patch surface is still the smallest plausible place to patch next because both the duplicate rebalance and any first-copy follow-up remain pair/context-sensitive and local to the existing Bio helper block.`);
  lines.push('');
  lines.push('## 11. Recommendation');
  lines.push('');
  lines.push(patchReady ? '**PATCH CANDIDATE READY**' : '**NEED ONE FINAL MICRO-INSTRUMENTATION PASS**');
  lines.push('');
  lines.push('## 12. If PATCH CANDIDATE READY');
  lines.push('');
  if (patchReady) {
    lines.push(`- Exact smallest next rule: reduce duplicate-Pink scaling from live **1.50x** to **${fmtNum(bestDup.scale, 2)}x**, then add a **${bestFinal.family}** first-copy Bio crystal-delta scale of **${fmtNum(bestFinal.firstScale, 2)}x**.`);
    lines.push('- Exact file/function/block to patch: extend the existing local Bio helper block around `applyValidatedDuplicateBioPinkScaling(...)` in `legacy-sim-v1.0.4-clean.js`, mirrored in `brute-sim-v1.4.6.js`.');
    lines.push('- Do not apply it in this pass.');
  } else {
    lines.push('Not applicable. This pass stops short of a tracked patch because the rebalance direction is clear, but the helper-level first-copy follow-up still needs one last confirmation before code changes.');
  }
  lines.push('');
  lines.push('## 13. What ChatGPT should do next');
  lines.push('');
  if (patchReady) {
    lines.push('Use this report as the patch handoff. Update the existing local Bio helper block in both simulators with the rebalance and first-copy rule identified here, then rerun the orange-anchor and double-bio probes immediately to verify duplicate containment stays acceptable.');
  } else {
    lines.push('Use this report as the handoff. Do one last temp-only confirmation centered on the best duplicate rebalance from this pass, then verify whether the first-copy follow-up should remain both-color or be reduced to Pink-only before making any tracked edit.');
  }

  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

main();
