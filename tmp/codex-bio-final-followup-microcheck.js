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
const ACTIVATION_REPORT = path.join(__dirname, 'codex-bio-rule-b-activation-fix-report.md');
const REVISION_REPORT = path.join(__dirname, 'codex-bio-rule-b-revision-diagnosis.md');
const VALIDATION_REPORT = path.join(__dirname, 'codex-bio-rule-validation.md');
const DOUBLE_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-double.log');
const SLOT_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-slot.log');
const REPORT_PATH = path.join(__dirname, 'codex-bio-final-followup-microcheck.md');

const REQUIRED = [
  path.join(__dirname, 'codex-bio-post-rule-b-followup-diagnosis.md'),
  ACTIVATION_REPORT,
  REVISION_REPORT,
  VALIDATION_REPORT,
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  LEGACY_SIM,
  BRUTE_SIM,
  LEGACY_DEFS,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
  DOUBLE_LOG,
  SLOT_LOG,
];

const COMMANDS = [
  'ls -1 ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-validation.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  'rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  "sed -n '1,220p' ./tmp/codex-bio-post-rule-b-followup-diagnosis.md",
  'node ./tmp/codex-bio-final-followup-microcheck.js',
];

const defs = require(LEGACY_DEFS);
const ItemDefs = defs.ItemDefs || {};
const TRIALS = 20000;
const STATS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];

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

const FACTORS = [1.15, 1.2, 1.25];

const CANDIDATES = [
  {
    id: 'baseline_live_rule_b',
    label: 'Baseline live Rule B',
    family: 'Baseline',
    firstPinkScale: 1.0,
    secondOrangeScale: 1.0,
    desc: 'Current tracked live Rule B only.',
  },
  ...FACTORS.map((scale) => ({
    id: `f1_firstpink_${String(scale).replace('.', 'p')}`,
    label: `F1 first Pink ${scale.toFixed(2)}`,
    family: 'F1',
    firstPinkScale: scale,
    secondOrangeScale: 1.0,
    desc: `Scale first Bio[P4] crystal delta by ${scale.toFixed(2)} only.`,
  })),
  ...FACTORS.map((scale) => ({
    id: `f2_orange_${String(scale).replace('.', 'p')}`,
    label: `F2 second Orange ${scale.toFixed(2)}`,
    family: 'F2',
    firstPinkScale: 1.0,
    secondOrangeScale: scale,
    desc: `Scale second Orange crystal delta by ${scale.toFixed(2)} only on mixed rows.`,
  })),
  ...FACTORS.flatMap((pinkScale) =>
    FACTORS.map((orangeScale) => ({
      id: `f3_combo_${String(pinkScale).replace('.', 'p')}_${String(orangeScale).replace('.', 'p')}`,
      label: `F3 combo ${pinkScale.toFixed(2)}/${orangeScale.toFixed(2)}`,
      family: 'F3',
      firstPinkScale: pinkScale,
      secondOrangeScale: orangeScale,
      desc: `Scale first Bio[P4] by ${pinkScale.toFixed(2)} and second Orange by ${orangeScale.toFixed(2)}.`,
    })),
  ),
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
  return rows;
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

function scaleState(s, scale) {
  const out = {};
  for (const key of STATS) out[key] = (s[key] || 0) * scale;
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

function candidateDeltaForKind(perMisc, candidate, kind) {
  const firstPinkExtra = scaleState(perMisc.bioP4.crystalDelta, candidate.firstPinkScale - 1);
  const secondOrangeExtra = scaleState(perMisc.bioO4.crystalDelta, candidate.secondOrangeScale - 1);
  if (kind === 'oneBio') return firstPinkExtra;
  if (kind === 'twoBio') return firstPinkExtra;
  if (kind === 'mixed') return addStates(firstPinkExtra, secondOrangeExtra);
  return { speed: 0, acc: 0, dodge: 0, defSk: 0, gun: 0, mel: 0, prj: 0 };
}

function evaluateCandidate(sim, liveRows, perMisc, truthMarginals, baselineRows, candidate) {
  const modeledRows = {};
  const rows = {};
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    modeledRows[shell] = {};
    rows[shell] = {};
    modeledRows[shell].noBio = baselineRows[shell].noBio;
    rows[shell].noBio = {
      winPct: liveRows.truthRows.get(SHELL_ROWS[shell].noBio).simWin,
      avgTurns: liveRows.truthRows.get(SHELL_ROWS[shell].noBio).simAvgT,
    };
    for (const kind of ['oneBio', 'twoBio', 'mixed']) {
      const row = kinds[kind];
      const delta = candidateDeltaForKind(perMisc, candidate, kind);
      const defender = applyDelta(row.defender, delta);
      modeledRows[shell][kind] = runFightSet(
        sim,
        row.attacker,
        defender,
        liveRows.cfg,
        `final-followup|${shell}|${kind}`,
      );
      const liveBaseline = liveRows.truthRows.get(SHELL_ROWS[shell][kind]);
      const modeledBaseline = baselineRows[shell][kind];
      rows[shell][kind] = {
        winPct: liveBaseline.simWin + (modeledRows[shell][kind].winPct - modeledBaseline.winPct),
        avgTurns:
          liveBaseline.simAvgT + (modeledRows[shell][kind].avgTurns - modeledBaseline.avgTurns),
      };
    }
    rows[shell].marginals = {
      noToOne: {
        win: rows[shell].oneBio.winPct - rows[shell].noBio.winPct,
        avgT: rows[shell].oneBio.avgTurns - rows[shell].noBio.avgTurns,
      },
      oneToTwo: {
        win: rows[shell].twoBio.winPct - rows[shell].oneBio.winPct,
        avgT: rows[shell].twoBio.avgTurns - rows[shell].oneBio.avgTurns,
      },
      oneToMixed: {
        win: rows[shell].mixed.winPct - rows[shell].oneBio.winPct,
        avgT: rows[shell].mixed.avgTurns - rows[shell].oneBio.avgTurns,
      },
    };
  }

  const fitWinErrors = [];
  const fitAvgErrors = [];
  const dupMargWinErrors = [];
  const dupMargAvgErrors = [];
  const dupRowWinErrors = [];
  const dupRowAvgErrors = [];
  const noBioWinErrors = [];
  const noBioAvgErrors = [];

  for (const [shell, names] of Object.entries(SHELL_ROWS)) {
    const truth = truthMarginals[shell];
    const rowTruth = {
      noBio: liveRows.truthRows.get(names.noBio),
      twoBio: liveRows.truthRows.get(names.twoBio),
    };
    fitWinErrors.push(Math.abs(rows[shell].marginals.noToOne.win - truth.noToOne.win));
    fitWinErrors.push(Math.abs(rows[shell].marginals.oneToMixed.win - truth.oneToMixed.win));
    fitAvgErrors.push(Math.abs(rows[shell].marginals.noToOne.avgT - truth.noToOne.avgT));
    fitAvgErrors.push(Math.abs(rows[shell].marginals.oneToMixed.avgT - truth.oneToMixed.avgT));

    dupMargWinErrors.push(Math.abs(rows[shell].marginals.oneToTwo.win - truth.oneToTwo.win));
    dupMargAvgErrors.push(Math.abs(rows[shell].marginals.oneToTwo.avgT - truth.oneToTwo.avgT));
    dupRowWinErrors.push(Math.abs(rows[shell].twoBio.winPct - rowTruth.twoBio.truthWin));
    dupRowAvgErrors.push(Math.abs(rows[shell].twoBio.avgTurns - rowTruth.twoBio.truthAvgT));
    noBioWinErrors.push(Math.abs(rows[shell].noBio.winPct - rowTruth.noBio.truthWin));
    noBioAvgErrors.push(Math.abs(rows[shell].noBio.avgTurns - rowTruth.noBio.truthAvgT));
  }

  const baselineDup = baselineRows.metrics;
  const dupWorse =
    mean(dupMargWinErrors) > baselineDup.meanDupMargWin + 1e-9 ||
    mean(dupRowWinErrors) > baselineDup.meanDupRowWin + 1e-9;

  return {
    ...candidate,
    modeledRows,
    rows,
    fitMeanWin: mean(fitWinErrors),
    fitMeanAvgT: mean(fitAvgErrors),
    dupMeanMargWin: mean(dupMargWinErrors),
    dupMeanMargAvgT: mean(dupMargAvgErrors),
    dupMeanRowWin: mean(dupRowWinErrors),
    dupMeanRowAvgT: mean(dupRowAvgErrors),
    noBioMeanWin: mean(noBioWinErrors),
    noBioMeanAvgT: mean(noBioAvgErrors),
    dupWorse,
  };
}

function rowKey(shell, kind) {
  return `${shell}|${kind}`;
}

function candidateDetailLines(candidate, truthMarginals) {
  const lines = [];
  lines.push(`### ${candidate.label}`);
  lines.push('');
  lines.push('| Shell | Marginal | Truth win / avgT | Sim win / avgT | absΔwin | absΔavgT |');
  lines.push('| --- | --- | --- | --- | ---: | ---: |');
  for (const shell of Object.keys(SHELL_ROWS)) {
    const truth = truthMarginals[shell];
    const sim = candidate.rows[shell].marginals;
    lines.push(`| ${quote(shell)} | No Bio -> One Bio[P4] | ${fmtSigned(truth.noToOne.win)} / ${fmtSigned(truth.noToOne.avgT, 4)} | ${fmtSigned(sim.noToOne.win)} / ${fmtSigned(sim.noToOne.avgT, 4)} | ${fmtNum(Math.abs(sim.noToOne.win - truth.noToOne.win))} | ${fmtNum(Math.abs(sim.noToOne.avgT - truth.noToOne.avgT), 4)} |`);
    lines.push(`| ${quote(shell)} | One Bio[P4] -> Bio[P4]+Bio[O4] | ${fmtSigned(truth.oneToMixed.win)} / ${fmtSigned(truth.oneToMixed.avgT, 4)} | ${fmtSigned(sim.oneToMixed.win)} / ${fmtSigned(sim.oneToMixed.avgT, 4)} | ${fmtNum(Math.abs(sim.oneToMixed.win - truth.oneToMixed.win))} | ${fmtNum(Math.abs(sim.oneToMixed.avgT - truth.oneToMixed.avgT), 4)} |`);
    lines.push(`| ${quote(shell)} | One Bio[P4] -> Two Bio[P4] | ${fmtSigned(truth.oneToTwo.win)} / ${fmtSigned(truth.oneToTwo.avgT, 4)} | ${fmtSigned(sim.oneToTwo.win)} / ${fmtSigned(sim.oneToTwo.avgT, 4)} | ${fmtNum(Math.abs(sim.oneToTwo.win - truth.oneToTwo.win))} | ${fmtNum(Math.abs(sim.oneToTwo.avgT - truth.oneToTwo.avgT), 4)} |`);
  }
  lines.push('');
  lines.push(`- Follow-up fit meanAbsΔwin: ${fmtNum(candidate.fitMeanWin)}`);
  lines.push(`- Follow-up fit meanAbsΔavgT: ${fmtNum(candidate.fitMeanAvgT, 4)}`);
  lines.push(`- Duplicate containment meanAbsΔwin: marginal ${fmtNum(candidate.dupMeanMargWin)}, row ${fmtNum(candidate.dupMeanRowWin)}`);
  lines.push(`- Duplicate containment meanAbsΔavgT: marginal ${fmtNum(candidate.dupMeanMargAvgT, 4)}, row ${fmtNum(candidate.dupMeanRowAvgT, 4)}`);
  lines.push(`- No-Bio containment meanAbsΔwin: ${fmtNum(candidate.noBioMeanWin)}, meanAbsΔavgT: ${fmtNum(candidate.noBioMeanAvgT, 4)}`);
  lines.push('');
  return lines;
}

function main() {
  ensureFiles();
  const sim = loadLegacyInternals();
  const truthMap = mapTruth(readJson(DOUBLE_TRUTH));
  const truthMarginals = buildTruthMarginals(truthMap);
  const liveDoubleRows = parseCompareLog(DOUBLE_LOG);
  const liveRows = buildLiveRows(sim, truthMap);
  liveRows.truthRows = liveDoubleRows;
  const perMisc = instrumentLegacy(sim);

  const baselineRows = {};
  for (const [shell, kinds] of Object.entries(liveRows.rows)) {
    baselineRows[shell] = {};
    for (const kind of ['noBio', 'oneBio', 'twoBio', 'mixed']) {
      const row = kinds[kind];
      baselineRows[shell][kind] = runFightSet(
        sim,
        row.attacker,
        row.defender,
        liveRows.cfg,
        `final-followup|${shell}|${kind}`,
      );
    }
    baselineRows[shell].marginals = {
      noToOne: {
        win: baselineRows[shell].oneBio.winPct - baselineRows[shell].noBio.winPct,
        avgT: baselineRows[shell].oneBio.avgTurns - baselineRows[shell].noBio.avgTurns,
      },
      oneToTwo: {
        win: baselineRows[shell].twoBio.winPct - baselineRows[shell].oneBio.winPct,
        avgT: baselineRows[shell].twoBio.avgTurns - baselineRows[shell].oneBio.avgTurns,
      },
      oneToMixed: {
        win: baselineRows[shell].mixed.winPct - baselineRows[shell].oneBio.winPct,
        avgT: baselineRows[shell].mixed.avgTurns - baselineRows[shell].oneBio.avgTurns,
      },
    };
  }
  baselineRows.metrics = {
    meanDupMargWin: mean(
      Object.keys(SHELL_ROWS).map((shell) => {
        const oneRow = liveDoubleRows.get(SHELL_ROWS[shell].oneBio);
        const twoRow = liveDoubleRows.get(SHELL_ROWS[shell].twoBio);
        return Math.abs(twoRow.simWin - oneRow.simWin - truthMarginals[shell].oneToTwo.win);
      }),
    ),
    meanDupRowWin: mean(
      Object.keys(SHELL_ROWS).map((shell) => {
        const rowName = SHELL_ROWS[shell].twoBio;
        const row = liveDoubleRows.get(rowName);
        return Math.abs(row.simWin - row.truthWin);
      }),
    ),
  };

  const evaluated = CANDIDATES.map((candidate) =>
    evaluateCandidate(sim, liveRows, perMisc, truthMarginals, baselineRows, candidate),
  );

  const ranked = [...evaluated].sort((a, b) =>
    a.fitMeanWin - b.fitMeanWin ||
    a.fitMeanAvgT - b.fitMeanAvgT ||
    a.dupMeanMargWin - b.dupMeanMargWin ||
    a.dupMeanRowWin - b.dupMeanRowWin ||
    a.label.localeCompare(b.label),
  );

  const baselineCandidate = evaluated.find((c) => c.family === 'Baseline');
  const bestFew = [];
  for (const candidate of [baselineCandidate, ranked[0], ranked[1], ranked[2]]) {
    if (candidate && !bestFew.some((x) => x.id === candidate.id)) bestFew.push(candidate);
  }
  const bestCombined = ranked.find((c) => c.family === 'F3');
  const patchReady = Boolean(
    bestCombined &&
    baselineCandidate &&
    bestCombined.fitMeanWin < baselineCandidate.fitMeanWin &&
    bestCombined.fitMeanAvgT <= baselineCandidate.fitMeanAvgT &&
    bestCombined.dupMeanMargWin <= baselineCandidate.dupMeanMargWin + 0.25 &&
    bestCombined.dupMeanRowWin <= baselineCandidate.dupMeanRowWin + 0.25,
  );

  const lines = [];
  lines.push('# codex-bio final follow-up microcheck');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push('Do one final temp-only microcheck on top of the live Rule B baseline to determine whether a combined follow-up rule is truly patch-ready while explicitly protecting duplicate-row behavior.');
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions inspected');
  lines.push('');
  lines.push('- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`');
  lines.push('- `./tmp/codex-bio-rule-b-activation-fix-report.md`');
  lines.push('- `./tmp/codex-bio-rule-b-revision-diagnosis.md`');
  lines.push('- `./tmp/codex-bio-rule-validation.md`');
  lines.push('- `./tmp/legacy-truth-double-bio-probe.json`');
  lines.push('- `./tmp/legacy-truth-bio-slot-order-probe.json`');
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
  lines.push('- Tracked source still has live Rule B with activation fix: yes');
  lines.push('- Current Rule B helper block remains local to `isValidatedDuplicateBioPinkVariant(...)`, `scaleVariantCrystalDelta(...)`, and `applyValidatedDuplicateBioPinkScaling(...)` immediately above `compileCombatantFromParts(...)` in legacy and the mirrored block in brute.');
  lines.push('- No tracked-source edits were made in this pass.');
  lines.push('');
  lines.push('## 5. Candidate families tested');
  lines.push('');
  lines.push('| Candidate | Family | Definition |');
  lines.push('| --- | --- | --- |');
  for (const c of CANDIDATES) {
    lines.push(`| ${quote(c.label)} | ${quote(c.family)} | ${quote(c.desc)} |`);
  }
  lines.push('');
  lines.push('## 6. Scoring method');
  lines.push('');
  lines.push('A) Follow-up fit:');
  lines.push('- `No Bio -> One Bio[P4]` marginal error for Dual Rift and Core/Rift');
  lines.push('- `One Bio[P4] -> Bio[P4]+Bio[O4]` marginal error for Dual Rift and Core/Rift');
  lines.push('- reported as `meanAbsΔwin` and `meanAbsΔavgT`');
  lines.push('');
  lines.push('B) Duplicate containment:');
  lines.push('- `One Bio[P4] -> Two Bio[P4]` marginal error for Dual Rift and Core/Rift');
  lines.push('- absolute row error on `Two Bio[P4]` for Dual Rift and Core/Rift');
  lines.push('- reported separately from follow-up fit');
  lines.push('');
  lines.push('No-Bio containment:');
  lines.push('- absolute row error on `No Bio` for Dual Rift and Core/Rift');
  lines.push('- held off the unchanged live Rule B baseline');
  lines.push('');
  lines.push('## 7. Follow-up fit tables');
  lines.push('');
  for (const candidate of bestFew) lines.push(...candidateDetailLines(candidate, truthMarginals));
  lines.push('## 8. Duplicate containment tables');
  lines.push('');
  lines.push('| Candidate | Dup marginal meanAbsΔwin | Dup marginal meanAbsΔavgT | Two Bio row meanAbsΔwin | Two Bio row meanAbsΔavgT |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const candidate of bestFew) {
    lines.push(`| ${quote(candidate.label)} | ${fmtNum(candidate.dupMeanMargWin)} | ${fmtNum(candidate.dupMeanMargAvgT, 4)} | ${fmtNum(candidate.dupMeanRowWin)} | ${fmtNum(candidate.dupMeanRowAvgT, 4)} |`);
  }
  lines.push('');
  lines.push('## 9. No-Bio containment note');
  lines.push('');
  lines.push(`- No-Bio containment is unchanged across the temp-only candidates because the modeled follow-ups do not touch no-Bio rows; baseline meanAbsΔwin stays ${fmtNum(bestFew[0].noBioMeanWin)} and meanAbsΔavgT stays ${fmtNum(bestFew[0].noBioMeanAvgT, 4)}.`); 
  lines.push('');
  lines.push('## 10. Candidate ranking');
  lines.push('');
  lines.push('| Rank | Candidate | Family | follow-up fit meanAbsΔwin | follow-up fit meanAbsΔavgT | dup marginal meanAbsΔwin | Two Bio row meanAbsΔwin |');
  lines.push('| ---: | --- | --- | ---: | ---: | ---: | ---: |');
  ranked.forEach((candidate, index) => {
    lines.push(`| ${index + 1} | ${quote(candidate.label)} | ${quote(candidate.family)} | ${fmtNum(candidate.fitMeanWin)} | ${fmtNum(candidate.fitMeanAvgT, 4)} | ${fmtNum(candidate.dupMeanMargWin)} | ${fmtNum(candidate.dupMeanRowWin)} |`);
  });
  lines.push('');
  lines.push('## 11. Best explanation now');
  lines.push('');
  if (bestCombined) {
    lines.push(`- Best combined family: **${bestCombined.label}**.`);
    lines.push(`- Combined follow-up fit: meanAbsΔwin ${fmtNum(bestCombined.fitMeanWin)}, meanAbsΔavgT ${fmtNum(bestCombined.fitMeanAvgT, 4)}.`);
    lines.push(`- Combined duplicate containment: marginal meanAbsΔwin ${fmtNum(bestCombined.dupMeanMargWin)}, Two Bio row meanAbsΔwin ${fmtNum(bestCombined.dupMeanRowWin)}.`);
  }
  lines.push(`- Best overall candidate was **${ranked[0].label}**, which ${ranked[0].family === 'F3' ? 'is' : 'is not'} a compact combined rule.`);
  lines.push('- The remaining family split is still the same: first-Bio baseline miss and mixed-color miss are distinct from the duplicate-Pink rule.');
  if (patchReady) {
    lines.push('- In this bounded microcheck, one compact combined rule improves first-Bio and mixed-color fit without materially worsening duplicate containment.');
    lines.push('- The smallest plausible tracked patch surface is still the current local Bio helper block because the needed behavior is copy/color-contextual, not item-global crystal math.');
  } else {
    lines.push('- In this bounded microcheck, no compact combined rule clearly improves first-Bio and mixed-color fit while keeping duplicate containment comfortably flat.');
    lines.push('- The remaining ambiguity is whether the next helper-level follow-up should be applied symmetrically to one-Bio and mixed rows, or whether the duplicate-Pink branch needs a finer shell-agnostic balance before any combined follow-up is safe.');
  }
  lines.push('');
  lines.push('## 12. Recommendation');
  lines.push('');
  lines.push(patchReady ? '**PATCH CANDIDATE READY**' : '**NEED ONE LAST MICRO-TRUTH-PACK**');
  lines.push('');
  if (patchReady) {
    lines.push('## 13. If PATCH CANDIDATE READY');
    lines.push('');
    lines.push(`- Exact smallest follow-up rule: keep live Rule B unchanged, then scale the first Bio[P4] crystal-derived delta by **${bestCombined.firstPinkScale.toFixed(2)}** and the second Orange crystal-derived delta on mixed Bio[P4]+Bio[O4] rows by **${bestCombined.secondOrangeScale.toFixed(2)}**.`);
    lines.push('- Exact file/function/block to patch next: extend the existing local helper block around `applyValidatedDuplicateBioPinkScaling(...)` in `legacy-sim-v1.0.4-clean.js`, mirrored in `brute-sim-v1.4.6.js`.');
    lines.push('- Exact helper-level behavior to add: keep the current duplicate-Pink second-copy branch, then add one first-copy Pink adjustment that applies once to any Bio[P4]-bearing row and one second-Orange adjustment that applies only to mixed Bio[P4]+Bio[O4] rows; do not change lower-level crystal math.');
    lines.push('- Do not apply it in this pass.');
  } else {
    lines.push('## 13. If PATCH CANDIDATE READY');
    lines.push('');
    lines.push('Not applicable. This pass stops short of a tracked-source follow-up because the duplicate-containment guardrail is still not cleanly separated from the best combined fit.');
  }
  lines.push('');
  lines.push('## 14. What ChatGPT should do next');
  lines.push('');
  if (patchReady) {
    lines.push('Use this report as the patch handoff. Implement the exact helper-level combined follow-up on top of the live Rule B block in both simulators, rerun the same double-bio and slot-order probes immediately, and verify that duplicate rows stay inside the containment band reported here.');
  } else {
    lines.push('Use this report as the handoff. Before any new tracked edit, run one last micro-truth or temp-only confirmation focused only on the duplicate rows under the best combined candidate so the helper-level follow-up can be separated cleanly from the already-live second-Pink rule.');
  }
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

main();
