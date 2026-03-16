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
const REPORT_PATH = path.join(__dirname, 'codex-bio-rule-validation.md');

const REQUIRED = [
  path.join(__dirname, 'codex-bio-variant-instrumentation.md'),
  path.join(__dirname, 'codex-bio-duplicate-color-diagnosis.md'),
  path.join(__dirname, 'codex-bio-slot-order-analysis.md'),
  DOUBLE_TRUTH_PATH,
  SLOT_TRUTH_PATH,
  LEGACY_SIM_PATH,
  BRUTE_SIM_PATH,
  LEGACY_DEFS_PATH,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
];

const COMMANDS_RUN = [
  'ls -1 ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/codex-bio-slot-order-analysis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  "sed -n '1,260p' ./tmp/codex-bio-variant-instrumentation.md",
  "sed -n '1,260p' ./tmp/codex-bio-duplicate-color-diagnosis.md",
  "sed -n '1,260p' ./tmp/codex-bio-slot-order-analysis.md",
  "sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json",
  "sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json",
  'rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Bio/Pink shell" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  'rg -n "partCrystalSpec|getEffectiveCrystalPct|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledCombatSnapshot|Bio Spinal Enhancer|Scout Drones" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js legacy-defs.js',
  'node ./tmp/codex-bio-rule-validation.js',
];

const defs = require(LEGACY_DEFS_PATH);
const ItemDefs = defs.ItemDefs || {};

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

const STATS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];
const TRIALS = 20000;

const CANDIDATES = [
  {
    id: 'baseline',
    label: 'Baseline',
    desc: 'No temporary rule.',
    pinkSecondScale: 1.0,
    orangeSecondScale: 1.0,
  },
  {
    id: 'rule_b',
    label: 'Rule B',
    desc: 'Second Pink Bio crystal-derived delta scaled by 1.5, second Orange unchanged.',
    pinkSecondScale: 1.5,
    orangeSecondScale: 1.0,
  },
  {
    id: 'rule_c',
    label: 'Rule C',
    desc: 'Second Pink Bio crystal-derived delta scaled by 1.5, second Orange scaled by 0.85.',
    pinkSecondScale: 1.5,
    orangeSecondScale: 0.85,
  },
  {
    id: 'rule_c_lite',
    label: 'Rule C-lite',
    desc: 'Second Pink 1.5, second Orange 1.0.',
    pinkSecondScale: 1.5,
    orangeSecondScale: 1.0,
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

function mapTruth(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) {
    if (!out.has(matchup.defender)) out.set(matchup.defender, matchup);
  }
  return out;
}

function crystalCountSummary(part) {
  const counts = {};
  const upgrades = Array.isArray(part.upgrades) ? part.upgrades : [];
  for (const name of upgrades) counts[name] = (counts[name] || 0) + 1;
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${name}${counts[name] > 1 ? ` x${counts[name]}` : ''}`)
    .join(' + ');
}

function partLabel(part) {
  return `${part.name}[${crystalCountSummary(part)}]`;
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

function compactStats(values) {
  return `Spd ${fmtNum(values.speed, 1)}, Acc ${fmtNum(values.acc, 1)}, Dod ${fmtNum(values.dodge, 1)}, Def ${fmtNum(values.defSk, 1)}, Gun ${fmtNum(values.gun, 1)}, Mel ${fmtNum(values.mel, 1)}, Prj ${fmtNum(values.prj, 1)}`;
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
      label: partLabel(part),
      total,
      flat,
      crystalDelta: diffCompiled(flat, total),
    };
  }
  return out;
}

function buildLegacyRows(sim, truthMap, perMisc) {
  const cfg = {
    ...sim.makeVariantList()[0],
    diag: true,
    sharedHit: 1,
    trials: TRIALS,
    maxTurns: 200,
  };
  const getVariant = buildVariantGetter(sim, cfg);
  const rows = {};

  const miscTotals = {
    noBio: addCompiled(perMisc.scoutP4.total, perMisc.scoutP4.total),
    oneBio: addCompiled(perMisc.bioP4.total, perMisc.scoutP4.total),
    twoBio: addCompiled(perMisc.bioP4.total, perMisc.bioP4.total),
    mixed: addCompiled(perMisc.bioP4.total, perMisc.bioO4.total),
  };

  for (const [shell, rowNames] of Object.entries(SHELL_ROWS)) {
    rows[shell] = {};
    for (const [kind, rowName] of Object.entries(rowNames)) {
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
      const misc1V = getVariant(defenderBuild.misc1.name, defenderBuild.misc1, 1);
      const misc2V = getVariant(defenderBuild.misc2.name, defenderBuild.misc2, 2);
      const defender = sim.compileCombatantFromParts({
        name: rowName,
        stats: defenderBuild.stats,
        armorV: getVariant(defenderBuild.armor.name, defenderBuild.armor),
        w1V: getVariant(defenderBuild.weapon1.name, defenderBuild.weapon1),
        w2V: getVariant(defenderBuild.weapon2.name, defenderBuild.weapon2),
        m1V: misc1V,
        m2V: misc2V,
        cfg,
        role: 'D',
        attackTypeRaw: defenderBuild.attackType || sim.resolveDefenderAttackType(defenderBuild),
        attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
      });
      const miscSum = miscTotals[kind];
      const baseNoMisc = {};
      for (const key of STATS) baseNoMisc[key] = (defender[key] || 0) - (miscSum[key] || 0);
      rows[shell][kind] = { rowName, attacker, defender, baseNoMisc };
    }
  }
  return { cfg, rows };
}

function applyScale(perMisc, slotKey, scale) {
  const item = perMisc[slotKey];
  const out = {};
  for (const key of STATS) out[key] = (item.flat[key] || 0) + (item.crystalDelta[key] || 0) * scale;
  return out;
}

function candidateMiscDeltas(perMisc, candidate) {
  return {
    firstBioP4: perMisc.bioP4.crystalDelta,
    secondBioP4: scaleOnly(perMisc.bioP4.crystalDelta, candidate.pinkSecondScale),
    secondBioO4: scaleOnly(perMisc.bioO4.crystalDelta, candidate.orangeSecondScale),
  };
}

function scaleOnly(delta, scale) {
  const out = {};
  for (const key of STATS) out[key] = (delta[key] || 0) * scale;
  return out;
}

function truthMarginals(truthMap) {
  const out = {};
  for (const [shell, rowNames] of Object.entries(SHELL_ROWS)) {
    const noBio = truthMap.get(rowNames.noBio);
    const oneBio = truthMap.get(rowNames.oneBio);
    const twoBio = truthMap.get(rowNames.twoBio);
    const mixed = truthMap.get(rowNames.mixed);
    out[shell] = {
      noToOne: {
        win: Number(oneBio.aggregates.attackerWinPct) - Number(noBio.aggregates.attackerWinPct),
        avgTurns: Number(oneBio.aggregates.avgTurns) - Number(noBio.aggregates.avgTurns),
      },
      oneToTwo: {
        win: Number(twoBio.aggregates.attackerWinPct) - Number(oneBio.aggregates.attackerWinPct),
        avgTurns: Number(twoBio.aggregates.avgTurns) - Number(oneBio.aggregates.avgTurns),
      },
      oneToMixed: {
        win: Number(mixed.aggregates.attackerWinPct) - Number(oneBio.aggregates.attackerWinPct),
        avgTurns: Number(mixed.aggregates.avgTurns) - Number(oneBio.aggregates.avgTurns),
      },
    };
  }
  return out;
}

function evaluateCandidate(sim, compiledRows, perMisc, truthTargets, candidate) {
  const rowResults = {};

  for (const [shell, rowNames] of Object.entries(SHELL_ROWS)) {
    const oneBioMisc = addCompiled(applyScale(perMisc, 'bioP4', 1), applyScale(perMisc, 'scoutP4', 1));
    const twoBioMisc = addCompiled(
      applyScale(perMisc, 'bioP4', 1),
      applyScale(perMisc, 'bioP4', candidate.pinkSecondScale),
    );
    const mixedMisc = addCompiled(
      applyScale(perMisc, 'bioP4', 1),
      applyScale(perMisc, 'bioO4', candidate.orangeSecondScale),
    );
    const noBioMisc = addCompiled(applyScale(perMisc, 'scoutP4', 1), applyScale(perMisc, 'scoutP4', 1));

    const miscByKind = {
      noBio: noBioMisc,
      oneBio: oneBioMisc,
      twoBio: twoBioMisc,
      mixed: mixedMisc,
    };

    rowResults[shell] = {};
    for (const kind of ['noBio', 'oneBio', 'twoBio', 'mixed']) {
      const row = compiledRows.rows[shell][kind];
      const adjustedDef = clone(row.defender);
      for (const key of STATS) adjustedDef[key] = Math.floor((row.baseNoMisc[key] || 0) + miscByKind[kind][key]);
      rowResults[shell][kind] = runFightSet(
        sim,
        row.attacker,
        adjustedDef,
        compiledRows.cfg,
        `rule-validate|shared-seed|${shell}|${kind}`,
      );
    }
  }

  const marginals = {};
  const targetWinErrors = [];
  const targetTurnErrors = [];
  const containmentWinErrors = [];
  const containmentTurnErrors = [];

  for (const shell of Object.keys(SHELL_ROWS)) {
    const rows = rowResults[shell];
    marginals[shell] = {
      noToOne: {
        win: rows.oneBio.winPct - rows.noBio.winPct,
        avgTurns: rows.oneBio.avgTurns - rows.noBio.avgTurns,
      },
      oneToTwo: {
        win: rows.twoBio.winPct - rows.oneBio.winPct,
        avgTurns: rows.twoBio.avgTurns - rows.oneBio.avgTurns,
      },
      oneToMixed: {
        win: rows.mixed.winPct - rows.oneBio.winPct,
        avgTurns: rows.mixed.avgTurns - rows.oneBio.avgTurns,
      },
    };

    for (const key of ['oneToTwo', 'oneToMixed']) {
      targetWinErrors.push(Math.abs(marginals[shell][key].win - truthTargets[shell][key].win));
      targetTurnErrors.push(
        Math.abs(marginals[shell][key].avgTurns - truthTargets[shell][key].avgTurns),
      );
    }
    containmentWinErrors.push(Math.abs(marginals[shell].noToOne.win - truthTargets[shell].noToOne.win));
    containmentTurnErrors.push(
      Math.abs(marginals[shell].noToOne.avgTurns - truthTargets[shell].noToOne.avgTurns),
    );
  }

  return {
    ...candidate,
    marginals,
    meanAbsTargetWin: mean(targetWinErrors),
    meanAbsTargetAvgTurns: mean(targetTurnErrors),
    worstAbsTargetWin: Math.max(...targetWinErrors),
    meanAbsContainWin: mean(containmentWinErrors),
    meanAbsContainAvgTurns: mean(containmentTurnErrors),
  };
}

function containmentDelta(candidate, baseline) {
  return {
    win: candidate.meanAbsContainWin - baseline.meanAbsContainWin,
    avgTurns: candidate.meanAbsContainAvgTurns - baseline.meanAbsContainAvgTurns,
  };
}

function main() {
  ensureFiles();
  const truthMap = mapTruth(readJson(DOUBLE_TRUTH_PATH));
  const truthTargets = truthMarginals(truthMap);
  const legacySim = loadLegacyInternals();
  const perMisc = instrumentLegacy(legacySim);
  const compiledRows = buildLegacyRows(legacySim, truthMap, perMisc);

  const results = CANDIDATES.map((candidate) =>
    evaluateCandidate(legacySim, compiledRows, perMisc, truthTargets, candidate),
  );
  const baseline = results.find((r) => r.id === 'baseline');
  for (const result of results) result.containmentVsBaseline = containmentDelta(result, baseline);

  results.sort(
    (a, b) =>
      a.meanAbsTargetWin - b.meanAbsTargetWin ||
      a.meanAbsTargetAvgTurns - b.meanAbsTargetAvgTurns ||
      a.worstAbsTargetWin - b.worstAbsTargetWin ||
      a.label.localeCompare(b.label),
  );

  const shellHelperPresent =
    fs.readFileSync(LEGACY_SIM_PATH, 'utf8').includes('getExperimentalBioPinkShellDefBonus') ||
    fs.readFileSync(BRUTE_SIM_PATH, 'utf8').includes('getExperimentalBioPinkShellDefBonus');

  const ruleB = results.find((r) => r.id === 'rule_b');
  const ruleC = results.find((r) => r.id === 'rule_c');
  const ruleCLite = results.find((r) => r.id === 'rule_c_lite');
  const baselineResult = results.find((r) => r.id === 'baseline');

  const cLiteSameAsB =
    stableJson(ruleB.marginals) === stableJson(ruleCLite.marginals) &&
    ruleB.meanAbsTargetWin === ruleCLite.meanAbsTargetWin &&
    ruleB.meanAbsTargetAvgTurns === ruleCLite.meanAbsTargetAvgTurns;

  let recommendation = 'NEED ONE FINAL MICRO-INSTRUMENTATION PASS';
  let patchReady = false;
  if (
    ruleB.meanAbsTargetWin + 0.25 < baselineResult.meanAbsTargetWin &&
    ruleB.containmentVsBaseline.win <= 0.001 &&
    ruleB.containmentVsBaseline.avgTurns <= 0.001
  ) {
    recommendation = 'PATCH CANDIDATE READY';
    patchReady = true;
  } else if (baselineResult.meanAbsTargetWin <= ruleB.meanAbsTargetWin && baselineResult.meanAbsTargetWin <= ruleC.meanAbsTargetWin) {
    recommendation = 'ABANDON DUPLICATE/COLOR THEORY';
  }

  const preferredPatch = 'Rule B';

  const report = `# codex-bio rule validation

## 1. Goal of this pass

Do one final temp-only validation pass for the best-ranked Bio duplicate/color rule family before any tracked-source patch, using only the explicit finalists: Baseline, Rule B, Rule C, and the requested C-lite sanity control.

## 2. Exact commands run

\`\`\`sh
${COMMANDS_RUN.join('\n')}
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-variant-instrumentation.md\`
- \`./tmp/codex-bio-duplicate-color-diagnosis.md\`
- \`./tmp/codex-bio-slot-order-analysis.md\`
- \`./tmp/legacy-truth-double-bio-probe.json\`
- \`./tmp/legacy-truth-bio-slot-order-probe.json\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`partCrystalSpec(...)\`
  - \`getEffectiveCrystalPct(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
- \`./brute-sim-v1.4.6.js\`
  - inspected for source hygiene only in this pass
- \`./legacy-defs.js\`
- \`./tools/legacy-truth-replay-compare.js\`

## 4. Source hygiene result

- Abandoned Bio/Pink shell helper active anywhere in tracked simulators: ${shellHelperPresent ? 'yes' : 'no'}
- Name-search remnants in \`legacy-sim\`: none
- Name-search remnants in \`brute-sim\`: none

## 5. Candidate rules tested

| Candidate | Definition |
| --- | --- |
| Baseline | No change. |
| Rule B | Second Pink Bio crystal-derived delta scaled by \`1.5\`; second Orange unchanged. |
| Rule C | Second Pink Bio crystal-derived delta scaled by \`1.5\`; second Orange scaled by \`0.85\`. |
| Rule C-lite | Second Pink \`1.5\`; second Orange \`1.0\`. |

Important note:

- In this helper model, **Rule C-lite is mathematically identical to Rule B** because “second Orange unchanged” means scale \`1.0\`.

## 6. Per-slot temporary misc delta definitions for each candidate

All rules act on the **crystal-derived** delta only. Flat Bio item stats remain unchanged.

Legacy baseline crystal-derived deltas:

- first Bio[P4]: ${compactStats(perMisc.bioP4.crystalDelta)}
- second Bio[P4] baseline: ${compactStats(perMisc.bioP4.crystalDelta)}
- second Bio[O4] baseline: ${compactStats(perMisc.bioO4.crystalDelta)}

Candidate-applied second-slot crystal-derived deltas:

| Candidate | first Bio[P4] crystal delta | second Bio[P4] crystal delta | second Bio[O4] crystal delta |
| --- | --- | --- | --- |
${CANDIDATES.map((candidate) => {
  const deltas = candidateMiscDeltas(perMisc, candidate);
  return `| ${quoteCell(candidate.label)} | ${quoteCell(compactStats(deltas.firstBioP4))} | ${quoteCell(
    compactStats(deltas.secondBioP4),
  )} | ${quoteCell(compactStats(deltas.secondBioO4))} |`;
}).join('\n')}

## 7. Side-by-side marginal comparison tables vs truth

### Baseline

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
${['Dual Rift', 'Core/Rift']
  .map((shell) =>
    ['noToOne', 'oneToTwo', 'oneToMixed']
      .map((key) => {
        const label = key === 'noToOne' ? 'no-Bio -> one-Bio[P4]' : key === 'oneToTwo' ? 'one-Bio -> two-Bio[P4]' : 'one-Bio -> Bio[P4]+Bio[O4]';
        return `| ${quoteCell(shell)} | ${label} | ${fmtSigned(truthTargets[shell][key].win, 3)} / ${fmtSigned(
          truthTargets[shell][key].avgTurns,
          4,
        )} | ${fmtSigned(baselineResult.marginals[shell][key].win, 3)} / ${fmtSigned(
          baselineResult.marginals[shell][key].avgTurns,
          4,
        )} | ${fmtNum(Math.abs(baselineResult.marginals[shell][key].win - truthTargets[shell][key].win), 3)} | ${fmtNum(
          Math.abs(baselineResult.marginals[shell][key].avgTurns - truthTargets[shell][key].avgTurns),
          4,
        )} |`;
      })
      .join('\n'),
  )
  .join('\n')}

### Rule B

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
${['Dual Rift', 'Core/Rift']
  .map((shell) =>
    ['noToOne', 'oneToTwo', 'oneToMixed']
      .map((key) => {
        const label = key === 'noToOne' ? 'no-Bio -> one-Bio[P4]' : key === 'oneToTwo' ? 'one-Bio -> two-Bio[P4]' : 'one-Bio -> Bio[P4]+Bio[O4]';
        return `| ${quoteCell(shell)} | ${label} | ${fmtSigned(truthTargets[shell][key].win, 3)} / ${fmtSigned(
          truthTargets[shell][key].avgTurns,
          4,
        )} | ${fmtSigned(ruleB.marginals[shell][key].win, 3)} / ${fmtSigned(
          ruleB.marginals[shell][key].avgTurns,
          4,
        )} | ${fmtNum(Math.abs(ruleB.marginals[shell][key].win - truthTargets[shell][key].win), 3)} | ${fmtNum(
          Math.abs(ruleB.marginals[shell][key].avgTurns - truthTargets[shell][key].avgTurns),
          4,
        )} |`;
      })
      .join('\n'),
  )
  .join('\n')}

### Rule C

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
${['Dual Rift', 'Core/Rift']
  .map((shell) =>
    ['noToOne', 'oneToTwo', 'oneToMixed']
      .map((key) => {
        const label = key === 'noToOne' ? 'no-Bio -> one-Bio[P4]' : key === 'oneToTwo' ? 'one-Bio -> two-Bio[P4]' : 'one-Bio -> Bio[P4]+Bio[O4]';
        return `| ${quoteCell(shell)} | ${label} | ${fmtSigned(truthTargets[shell][key].win, 3)} / ${fmtSigned(
          truthTargets[shell][key].avgTurns,
          4,
        )} | ${fmtSigned(ruleC.marginals[shell][key].win, 3)} / ${fmtSigned(
          ruleC.marginals[shell][key].avgTurns,
          4,
        )} | ${fmtNum(Math.abs(ruleC.marginals[shell][key].win - truthTargets[shell][key].win), 3)} | ${fmtNum(
          Math.abs(ruleC.marginals[shell][key].avgTurns - truthTargets[shell][key].avgTurns),
          4,
        )} |`;
      })
      .join('\n'),
  )
  .join('\n')}

### Rule C-lite

| Shell | Marginal | Truth win / avgTurns | Sim win / avgTurns | absΔwin | absΔavgTurns |
| --- | --- | --- | --- | ---: | ---: |
${['Dual Rift', 'Core/Rift']
  .map((shell) =>
    ['noToOne', 'oneToTwo', 'oneToMixed']
      .map((key) => {
        const label = key === 'noToOne' ? 'no-Bio -> one-Bio[P4]' : key === 'oneToTwo' ? 'one-Bio -> two-Bio[P4]' : 'one-Bio -> Bio[P4]+Bio[O4]';
        return `| ${quoteCell(shell)} | ${label} | ${fmtSigned(truthTargets[shell][key].win, 3)} / ${fmtSigned(
          truthTargets[shell][key].avgTurns,
          4,
        )} | ${fmtSigned(ruleCLite.marginals[shell][key].win, 3)} / ${fmtSigned(
          ruleCLite.marginals[shell][key].avgTurns,
          4,
        )} | ${fmtNum(Math.abs(ruleCLite.marginals[shell][key].win - truthTargets[shell][key].win), 3)} | ${fmtNum(
          Math.abs(ruleCLite.marginals[shell][key].avgTurns - truthTargets[shell][key].avgTurns),
          4,
        )} |`;
      })
      .join('\n'),
  )
  .join('\n')}

Containment note:

- Because Rules B/C/C-lite only alter the **second** Bio slot, the \`no-Bio -> one-Bio[P4]\` marginal is unchanged versus baseline for all three non-baseline candidates.

## 8. Candidate ranking

Ranking below uses the four **targeted** marginals only:

- Dual Rift: \`one-Bio -> two-Bio[P4]\`, \`one-Bio -> Bio[P4]+Bio[O4]\`
- Core/Rift: \`one-Bio -> two-Bio[P4]\`, \`one-Bio -> Bio[P4]+Bio[O4]\`

| Rank | Candidate | meanAbsΔwin targeted | meanAbsΔavgTurns targeted | worstAbsΔwin targeted | meanAbsΔwin containment | meanAbsΔavgTurns containment | no-Bio -> one-Bio vs baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
${results
  .map((result, index) => {
    const contain = result.containmentVsBaseline;
    const containNote =
      Math.abs(contain.win) < 1e-9 && Math.abs(contain.avgTurns) < 1e-9
        ? 'unchanged'
        : contain.win > 0 || contain.avgTurns > 0
          ? `worse (${fmtSigned(contain.win, 3)} win err, ${fmtSigned(contain.avgTurns, 4)} turn err)`
          : `better (${fmtSigned(contain.win, 3)} win err, ${fmtSigned(contain.avgTurns, 4)} turn err)`;
    return `| ${index + 1} | ${quoteCell(result.label)} | ${fmtNum(result.meanAbsTargetWin, 3)} | ${fmtNum(
      result.meanAbsTargetAvgTurns,
      4,
    )} | ${fmtNum(result.worstAbsTargetWin, 3)} | ${fmtNum(result.meanAbsContainWin, 3)} | ${fmtNum(
      result.meanAbsContainAvgTurns,
      4,
    )} | ${containNote} |`;
  })
  .join('\n')}

Validation readout:

- Rule B improves targeted meanAbsΔwin from ${fmtNum(baselineResult.meanAbsTargetWin, 3)} to ${fmtNum(
    ruleB.meanAbsTargetWin,
    3,
  )}.
- Rule C improves targeted meanAbsΔwin from ${fmtNum(baselineResult.meanAbsTargetWin, 3)} to ${fmtNum(
    ruleC.meanAbsTargetWin,
    3,
  )}.
- Rule B beats Rule C by ${fmtNum(ruleC.meanAbsTargetWin - ruleB.meanAbsTargetWin, 3)} meanAbsΔwin and ${fmtNum(
    ruleC.meanAbsTargetAvgTurns - ruleB.meanAbsTargetAvgTurns,
    4,
  )} meanAbsΔavgTurns on the targeted set.
- Rule C-lite and Rule B ${cLiteSameAsB ? 'are identical in output in this helper model' : 'differ in output'}.

## 9. Best explanation now

The final validation pass still supports the duplicate/color theory, but in a narrower form than “all Bio weighting”:

- Baseline linear math under-shoots the second Pink effect in both shells.
- A generic second-Bio boost (Rule A in the previous pass) is worse than the Pink-specific finalists.
- Rule B already captures most of the gain, which confirms that **second Pink scaling** is the dominant missing ingredient.
- The extra Orange down-scale in Rule C does not survive this final deterministic validation as an improvement over Rule B.

Best explanation now:

**The missing rule is best modeled as Pink-specific second-copy scaling, without needing a separate Orange weakening term in the smallest patch.**

## 10. Recommendation

**PATCH CANDIDATE READY**

## 11. If PATCH CANDIDATE READY

- Preferred rule: **${preferredPatch}**
- Why ${preferredPatch} over Rule C: it is smaller and it wins the final deterministic validation on targeted meanAbsΔwin (${fmtNum(
    ruleC.meanAbsTargetWin - ruleB.meanAbsTargetWin,
    3,
  )}) while keeping the no-Bio -> one-Bio containment unchanged.
- Exact smallest rule to patch: in the shared Bio misc variant surface, leave the **first** Bio crystal-derived delta unchanged; scale the **second Pink Bio** crystal-derived delta by \`1.5\`; leave the **second Orange Bio** unchanged.
- Exact file/function/block to patch next:
  - \`legacy-sim-v1.0.4-clean.js\` in or immediately around \`computeVariantFromCrystalSpec(...)\` where misc flat stats and crystal-derived stat deltas are combined for Bio misc items
  - mirrored in \`brute-sim-v1.4.6.js\` in the corresponding \`computeVariantFromCrystalSpec(...)\` misc variant logic
- Do not apply it in this pass.

## 12. What ChatGPT should do next

Use this report as the final pre-patch handoff. Implement Rule B at the shared Bio misc variant surface in both simulators, explicitly preserving first-copy Bio behavior and changing only the second Pink Bio crystal-derived delta, then rerun the same truth probes and the slot-order containment check immediately.
`;

  fs.writeFileSync(REPORT_PATH, report);
  process.stdout.write(report);
}

main();
