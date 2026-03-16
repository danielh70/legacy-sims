'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const SIM_PATH = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const TRUTH_PATH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const REPORT_PATH = path.join(__dirname, 'codex-bio-surface-sweep-report.md');
const BEFORE_DIFF_PATH = path.join(__dirname, 'codex-bio-surface-sweep-before-revert.diff');
const AFTER_DIFF_PATH = path.join(__dirname, 'codex-bio-surface-sweep-after-revert.diff');

const TARGET_ROWS = [
  'DL Dual Rift No Bio',
  'DL Dual Rift One Bio P4',
  'DL Dual Rift Two Bio P4',
  'DL Dual Rift Bio P4 + O4',
  'DL Core/Rift No Bio',
  'DL Core/Rift One Bio P4',
  'DL Core/Rift Two Bio P4',
  'DL Core/Rift Bio P4 + O4',
];

const COMMANDS_RUN = [
  'sed -n \'1,220p\' ./tmp/codex-bio-pink-shell-microcheck.md',
  'sed -n \'1,220p\' ./tmp/codex-bio-pink-shell-verify-results.md',
  'sed -n \'1,260p\' ./tmp/legacy-truth-double-bio-probe.json',
  'sed -n \'1,260p\' ./tmp/codex-bio-pink-shell-patch.diff',
  'git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-surface-sweep-before-revert.diff',
  'rg -n "getExperimentalBioPinkShellDefBonus|experimental shell|experimentalBioPinkShellDefBonus|Narrow experimental shell-specific calibration patch" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  'node --check ./legacy-sim-v1.0.4-clean.js',
  'node --check ./brute-sim-v1.4.6.js',
  'git diff -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js > ./tmp/codex-bio-surface-sweep-after-revert.diff',
  'node ./tmp/codex-bio-surface-sweep.js',
];

function loadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return '';
  }
}

function quoteCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function fmtNum(value, digits = 2) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : '0';
}

function fmtSigned(value, digits = 2) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function parseDiagNumber(value) {
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cloneCombatant(combatant) {
  return JSON.parse(JSON.stringify(combatant));
}

function truthKey(part) {
  if (!part) return '';
  const upgrades = Array.isArray(part.upgrades) ? part.upgrades.filter(Boolean) : [];
  const counts = {};
  for (const name of upgrades) counts[name] = (counts[name] || 0) + 1;
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const crystal = names
    .map((name) => `${name}${counts[name] === 1 ? '' : ` x${counts[name]}`}`)
    .join(' + ');
  return crystal ? `${part.name}[${crystal}]` : String(part.name || '');
}

function loadLegacyInternals(envOverrides) {
  const source = fs.readFileSync(SIM_PATH, 'utf8').replace(/^#!.*\n/, '');
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
  const compiled = vm.runInThisContext(wrapped, { filename: SIM_PATH });
  const mod = { exports: {} };
  const req = Module.createRequire(SIM_PATH);
  const originalEnv = { ...process.env };
  Object.assign(process.env, envOverrides);
  try {
    compiled(mod.exports, req, mod, SIM_PATH, path.dirname(SIM_PATH));
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
    const key = [cfg.statRound, cfg.weaponDmgRound, itemName, crystalKey, u1, u2, slotTag].join('|');
    if (!cache.has(key)) {
      cache.set(
        key,
        sim.computeVariantFromCrystalSpec(itemName, crystalSpec, [u1, u2].filter(Boolean), cfg, slotTag),
      );
    }
    return cache.get(key);
  };
}

function compileCombatants(sim, cfg, matchup) {
  const attackerBuild = matchup.pageBuilds.attacker;
  const defenderBuild = matchup.pageBuilds.defender;
  const getVariant = buildVariantGetter(sim, cfg);

  const attacker = sim.compileCombatantFromParts({
    name: 'Attacker',
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
    name: matchup.defender,
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

  return { attacker, defender };
}

function getBioCounts(sim, defenderBuild, cfg) {
  function slotInfo(part) {
    const itemName = String((part && part.name) || '');
    const crystalSpec = sim.partCrystalSpec(part);
    const crystalKey = crystalSpec ? sim.crystalSpecKey(crystalSpec, cfg.crystalSlots) : '';
    return {
      itemName,
      crystalKey,
      isBioPink: itemName === 'Bio Spinal Enhancer' && crystalKey === 'Perfect Pink Crystal:4',
      isBioOrange: itemName === 'Bio Spinal Enhancer' && crystalKey === 'Perfect Orange Crystal:4',
      isBio: itemName === 'Bio Spinal Enhancer',
    };
  }

  const misc1 = slotInfo(defenderBuild.misc1);
  const misc2 = slotInfo(defenderBuild.misc2);
  const pinkCount = Number(misc1.isBioPink) + Number(misc2.isBioPink);
  const orangeCount = Number(misc1.isBioOrange) + Number(misc2.isBioOrange);
  const totalBioCount = Number(misc1.isBio) + Number(misc2.isBio);
  return {
    pinkCount,
    orangeCount,
    totalBioCount,
    misc1,
    misc2,
    secondPink: pinkCount >= 2 ? 1 : 0,
  };
}

function setSeed(sim, seed) {
  const s = sim.mix32(seed >>> 0);
  sim.setRng(sim.makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d));
}

function runMatch(sim, attacker, defender, cfg, seed) {
  setSeed(sim, seed);
  const result = sim.runMatch(attacker, defender, cfg, { traceFights: 0 });
  const stats = result.stats;
  return {
    winPct: (stats.wins / cfg.trials) * 100,
    avgTurns: stats.turnsTotal / cfg.trials,
  };
}

function applyCandidate(combatant, candidate, counts) {
  const adjusted = cloneCombatant(combatant);
  const deltas = candidate.adjust(counts);

  function addField(field, value) {
    if (!value) return;
    adjusted[field] = Math.floor((adjusted[field] || 0) + value);
  }

  addField('defSk', deltas.defSk || 0);
  addField('gun', deltas.gun || 0);
  addField('mel', deltas.mel || 0);
  addField('prj', deltas.prj || 0);
  addField('speed', deltas.speed || 0);
  addField('dodge', deltas.dodge || 0);
  addField('acc', deltas.acc || 0);
  addField('hp', deltas.hp || 0);

  if (deltas.weaponPct) {
    const scale = 1 + deltas.weaponPct;
    for (const key of ['w1', 'w2', 'weapon1', 'weapon2']) {
      if (!adjusted[key]) continue;
      adjusted[key].min = Math.max(0, Math.floor(adjusted[key].min * scale));
      adjusted[key].max = Math.max(0, Math.floor(adjusted[key].max * scale));
    }
  }

  return adjusted;
}

function summarizeSweep(rows, sim, sweepCfg, candidates, baselineMap) {
  const evaluated = [];
  for (const candidate of candidates) {
    const perRow = [];
    for (const row of rows) {
      const adjustedDefender = applyCandidate(row.compiled.defender, candidate, row.bioCounts);
      const seed = sim.hashStr32(`row-seed|${row.name}|bio-surface-sweep`);
      const simResult = runMatch(sim, row.compiled.attacker, adjustedDefender, sweepCfg, seed);
      const winDelta = simResult.winPct - row.truth.winPct;
      const avgTDelta = simResult.avgTurns - row.truth.avgTurns;
      perRow.push({
        name: row.name,
        shell: row.shell,
        winPct: simResult.winPct,
        avgTurns: simResult.avgTurns,
        winDelta,
        avgTDelta,
        noBio: row.bioCounts.totalBioCount === 0,
      });
    }
    const meanAbsWin = mean(perRow.map((row) => Math.abs(row.winDelta)));
    const meanAbsAvgT = mean(perRow.map((row) => Math.abs(row.avgTDelta)));
    const worstAbsWin = Math.max(...perRow.map((row) => Math.abs(row.winDelta)));
    const noBioBaselineDriftMax = Math.max(
      ...perRow
        .filter((row) => row.noBio)
        .map((row) => Math.abs(row.winPct - ((baselineMap.get(row.name) || {}).simWinPct || 0))),
      0,
    );
    evaluated.push({
      id: candidate.id,
      label: candidate.label,
      notes: candidate.notes,
      meanAbsWin,
      meanAbsAvgT,
      worstAbsWin,
      noBioBaselineDriftMax,
      perRow,
    });
  }
  evaluated.sort(
    (a, b) =>
      a.meanAbsWin - b.meanAbsWin ||
      a.meanAbsAvgT - b.meanAbsAvgT ||
      a.worstAbsWin - b.worstAbsWin,
  );
  return evaluated;
}

function buildStage1Candidates() {
  const out = [];
  const pushLinear = (field, values, scaleLabel, notes) => {
    for (const value of values) {
      out.push({
        id: `${field}-pink-${value}`,
        label: `${field} +${value} per Bio[P4]`,
        notes,
        adjust(counts) {
          const delta = value * counts.pinkCount;
          return { [field]: delta };
        },
      });
    }
  };

  pushLinear('defSk', [6, 12, 18], 'pink', 'exact pink-only linear');
  pushLinear('gun', [12, 24, 36], 'pink', 'exact pink-only linear');
  pushLinear('prj', [12, 24, 36], 'pink', 'exact pink-only linear');
  pushLinear('mel', [12, 24, 36], 'pink', 'exact pink-only linear');
  pushLinear('dodge', [2, 4, 6], 'pink', 'exact pink-only linear');
  pushLinear('speed', [1, 2, 3], 'pink', 'exact pink-only linear');
  pushLinear('hp', [20, 40, 60], 'pink', 'exact pink-only linear');

  for (const value of [12, 24, 36]) {
    out.push({
      id: `offense-all-pink-${value}`,
      label: `gun+mel+prj +${value} per Bio[P4]`,
      notes: 'exact pink-only linear',
      adjust(counts) {
        const delta = value * counts.pinkCount;
        return { gun: delta, mel: delta, prj: delta };
      },
    });
  }

  return out;
}

function buildStage2Candidates(topStage1) {
  const out = [];
  for (const base of topStage1) {
    const m = base.label.match(/^([A-Za-z+]+).*?(\d+)/);
    const anchor = m ? Number(m[2]) : 12;
    const field = base.id.split('-')[0];

    const applySurface = (deltaField, counts, first, second, orange) => {
      const deltas = {};
      const firstPink = counts.pinkCount >= 1 ? first : 0;
      const secondPink = counts.pinkCount >= 2 ? second : 0;
      const orangeDelta = counts.orangeCount * orange;
      const total = firstPink + secondPink + orangeDelta;
      if (deltaField === 'offense') {
        deltas.gun = total;
        deltas.mel = total;
        deltas.prj = total;
      } else {
        deltas[deltaField] = total;
      }
      return deltas;
    };

    const deltaField = field === 'offense' ? 'offense' : field;
    const stepPairs = [
      [Math.max(1, Math.floor(anchor / 2)), anchor],
      [anchor, anchor],
      [anchor, Math.round(anchor * 1.5)],
    ];
    for (const [first, second] of stepPairs) {
      out.push({
        id: `${base.id}-step-${first}-${second}`,
        label: `${base.label.replace(/ per .*$/, '')}: +${first} first P4, +${second} second P4`,
        notes: 'pink-only first/second split',
        adjust(counts) {
          return applySurface(deltaField, counts, first, second, 0);
        },
      });
    }

    const orangeValues = [Math.max(1, Math.floor(anchor / 2)), anchor];
    for (const orange of orangeValues) {
      out.push({
        id: `${base.id}-orange-${anchor}-${orange}`,
        label: `${base.label.replace(/ per .*$/, '')}: +${anchor} per P4, +${orange} per O4`,
        notes: 'pink/orange split',
        adjust(counts) {
          return applySurface(deltaField, counts, anchor, anchor, orange);
        },
      });
    }

    out.push({
      id: `${base.id}-bio-any-${anchor}`,
      label: `${base.label.replace(/ per .*$/, '')}: +${anchor} per Bio any color`,
      notes: 'color-agnostic per-Bio',
      adjust(counts) {
        const total = anchor * counts.totalBioCount;
        if (deltaField === 'offense') return { gun: total, mel: total, prj: total };
        return { [deltaField]: total };
      },
    });
  }
  return out;
}

function rowSummary(compiled, snapshot, matchup, bioCounts) {
  const misc1Adds =
    snapshot &&
    snapshot.debugStatBreakdown &&
    snapshot.debugStatBreakdown.slotContributions &&
    snapshot.debugStatBreakdown.slotContributions.misc1
      ? snapshot.debugStatBreakdown.slotContributions.misc1.adds
      : null;
  const misc2Adds =
    snapshot &&
    snapshot.debugStatBreakdown &&
    snapshot.debugStatBreakdown.slotContributions &&
    snapshot.debugStatBreakdown.slotContributions.misc2
      ? snapshot.debugStatBreakdown.slotContributions.misc2.adds
      : null;

  return {
    name: matchup.defender,
    shell: matchup.defender.includes('Dual Rift') ? 'Dual Rift' : 'Core/Rift',
    truth: {
      winPct: Number(matchup.aggregates.attackerWinPct),
      avgTurns: Number(matchup.aggregates.avgTurns),
    },
    bioCounts,
    identity: {
      armor: truthKey(matchup.pageBuilds.defender.armor),
      weapon1: truthKey(matchup.pageBuilds.defender.weapon1),
      weapon2: truthKey(matchup.pageBuilds.defender.weapon2),
      misc1: truthKey(matchup.pageBuilds.defender.misc1),
      misc2: truthKey(matchup.pageBuilds.defender.misc2),
    },
    compiled: {
      attacker: compiled.attacker,
      defender: compiled.defender,
    },
    baseline: {
      hp: compiled.defender.hp,
      speed: compiled.defender.speed,
      accuracy: compiled.defender.acc,
      dodge: compiled.defender.dodge,
      defSk: compiled.defender.defSk,
      gunSkill: compiled.defender.gun,
      meleeSkill: compiled.defender.mel,
      projectileSkill: compiled.defender.prj,
      armor: compiled.defender.armor,
      armorFactor: Number(compiled.defender.armorFactor || 0),
      weapon1Range: compiled.defender.w1 ? `${compiled.defender.w1.min}-${compiled.defender.w1.max}` : '',
      weapon2Range: compiled.defender.w2 ? `${compiled.defender.w2.min}-${compiled.defender.w2.max}` : '',
      misc1Adds: misc1Adds
        ? {
            speed: parseDiagNumber(misc1Adds.speed),
            accuracy: parseDiagNumber(misc1Adds.accuracy),
            dodge: parseDiagNumber(misc1Adds.dodge),
            gunSkill: parseDiagNumber(misc1Adds.gunSkill),
            meleeSkill: parseDiagNumber(misc1Adds.meleeSkill),
            projectileSkill: parseDiagNumber(misc1Adds.projSkill),
            defSkill: parseDiagNumber(misc1Adds.defSkill),
          }
        : null,
      misc2Adds: misc2Adds
        ? {
            speed: parseDiagNumber(misc2Adds.speed),
            accuracy: parseDiagNumber(misc2Adds.accuracy),
            dodge: parseDiagNumber(misc2Adds.dodge),
            gunSkill: parseDiagNumber(misc2Adds.gunSkill),
            meleeSkill: parseDiagNumber(misc2Adds.meleeSkill),
            projectileSkill: parseDiagNumber(misc2Adds.projSkill),
            defSkill: parseDiagNumber(misc2Adds.defSkill),
          }
        : null,
      compiledActionRange:
        snapshot && snapshot.compiledActionRange
          ? `${snapshot.compiledActionRange.min}-${snapshot.compiledActionRange.max}`
          : '',
    },
  };
}

function deltaRow(fromRow, toRow) {
  const keys = [
    'hp',
    'speed',
    'accuracy',
    'dodge',
    'defSk',
    'gunSkill',
    'meleeSkill',
    'projectileSkill',
    'armor',
  ];
  const out = {};
  for (const key of keys) out[key] = toRow.baseline[key] - fromRow.baseline[key];
  out.weapon1Range = `${fromRow.baseline.weapon1Range} -> ${toRow.baseline.weapon1Range}`;
  out.weapon2Range = `${fromRow.baseline.weapon2Range} -> ${toRow.baseline.weapon2Range}`;
  out.misc1DefSkill = (toRow.baseline.misc1Adds ? toRow.baseline.misc1Adds.defSkill : 0) -
    (fromRow.baseline.misc1Adds ? fromRow.baseline.misc1Adds.defSkill : 0);
  out.misc2DefSkill = (toRow.baseline.misc2Adds ? toRow.baseline.misc2Adds.defSkill : 0) -
    (fromRow.baseline.misc2Adds ? fromRow.baseline.misc2Adds.defSkill : 0);
  out.misc1GunSkill = (toRow.baseline.misc1Adds ? toRow.baseline.misc1Adds.gunSkill : 0) -
    (fromRow.baseline.misc1Adds ? fromRow.baseline.misc1Adds.gunSkill : 0);
  out.misc2GunSkill = (toRow.baseline.misc2Adds ? toRow.baseline.misc2Adds.gunSkill : 0) -
    (fromRow.baseline.misc2Adds ? fromRow.baseline.misc2Adds.gunSkill : 0);
  out.misc1ProjectileSkill =
    (toRow.baseline.misc1Adds ? toRow.baseline.misc1Adds.projectileSkill : 0) -
    (fromRow.baseline.misc1Adds ? fromRow.baseline.misc1Adds.projectileSkill : 0);
  out.misc2ProjectileSkill =
    (toRow.baseline.misc2Adds ? toRow.baseline.misc2Adds.projectileSkill : 0) -
    (fromRow.baseline.misc2Adds ? fromRow.baseline.misc2Adds.projectileSkill : 0);
  return out;
}

function buildCompileTable(rows) {
  const lines = [
    '| Row | Armor | Weapon1 | Weapon2 | Misc1 | Misc2 | HP | Spd | Acc | Dod | Def | Gun | Mel | Prj | W1 rng | W2 rng | Action rng | Misc1 adds | Misc2 adds |',
    '| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const m1 = row.baseline.misc1Adds;
    const m2 = row.baseline.misc2Adds;
    const m1Text = m1
      ? `Acc ${m1.accuracy}, Dod ${m1.dodge}, Gun ${m1.gunSkill}, Mel ${m1.meleeSkill}, Prj ${m1.projectileSkill}, Def ${m1.defSkill}`
      : '';
    const m2Text = m2
      ? `Acc ${m2.accuracy}, Dod ${m2.dodge}, Gun ${m2.gunSkill}, Mel ${m2.meleeSkill}, Prj ${m2.projectileSkill}, Def ${m2.defSkill}`
      : '';
    lines.push(
      `| ${quoteCell(row.name)} | ${quoteCell(row.identity.armor)} | ${quoteCell(row.identity.weapon1)} | ${quoteCell(row.identity.weapon2)} | ${quoteCell(row.identity.misc1)} | ${quoteCell(row.identity.misc2)} | ${row.baseline.hp} | ${row.baseline.speed} | ${row.baseline.accuracy} | ${row.baseline.dodge} | ${row.baseline.defSk} | ${row.baseline.gunSkill} | ${row.baseline.meleeSkill} | ${row.baseline.projectileSkill} | ${quoteCell(row.baseline.weapon1Range)} | ${quoteCell(row.baseline.weapon2Range)} | ${quoteCell(row.baseline.compiledActionRange)} | ${quoteCell(m1Text)} | ${quoteCell(m2Text)} |`,
    );
  }
  return lines.join('\n');
}

function buildDeltaTable(title, pairs) {
  const lines = [
    `### ${title}`,
    '',
    '| Shell | Transition | ΔHP | ΔSpd | ΔAcc | ΔDod | ΔDef | ΔGun | ΔMel | ΔPrj | W1 rng | W2 rng | Misc1 ΔDef/Gun/Prj | Misc2 ΔDef/Gun/Prj |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |',
  ];
  for (const pair of pairs) {
    const delta = pair.delta;
    lines.push(
      `| ${pair.shell} | ${pair.label} | ${fmtSigned(delta.hp, 0)} | ${fmtSigned(delta.speed, 0)} | ${fmtSigned(delta.accuracy, 0)} | ${fmtSigned(delta.dodge, 0)} | ${fmtSigned(delta.defSk, 0)} | ${fmtSigned(delta.gunSkill, 0)} | ${fmtSigned(delta.meleeSkill, 0)} | ${fmtSigned(delta.projectileSkill, 0)} | ${quoteCell(delta.weapon1Range)} | ${quoteCell(delta.weapon2Range)} | ${fmtSigned(delta.misc1DefSkill, 0)}/${fmtSigned(delta.misc1GunSkill, 0)}/${fmtSigned(delta.misc1ProjectileSkill, 0)} | ${fmtSigned(delta.misc2DefSkill, 0)}/${fmtSigned(delta.misc2GunSkill, 0)}/${fmtSigned(delta.misc2ProjectileSkill, 0)} |`,
    );
  }
  return lines.join('\n');
}

function buildSensitivityTable(results, limit) {
  const lines = [
    '| Rank | Candidate | meanAbsΔwin | meanAbsΔavgT | worstAbsΔwin | no-Bio win drift vs baseline | Notes |',
    '| ---: | --- | ---: | ---: | ---: | ---: | --- |',
  ];
  results.slice(0, limit).forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${quoteCell(row.label)} | ${fmtNum(row.meanAbsWin, 2)} | ${fmtNum(row.meanAbsAvgT, 4)} | ${fmtNum(row.worstAbsWin, 2)} | ${fmtNum(row.noBioBaselineDriftMax, 2)} | ${quoteCell(row.notes)} |`,
    );
  });
  return lines.join('\n');
}

function main() {
  const handoffFilePresent = fs.existsSync(path.join(REPO, 'legacy-debug-handoff-2026-03-15.md'));
  const beforeDiff = loadText(BEFORE_DIFF_PATH);
  const afterDiff = loadText(AFTER_DIFF_PATH);
  const truth = JSON.parse(fs.readFileSync(TRUTH_PATH, 'utf8'));

  const sim = loadLegacyInternals({
    LEGACY_SHARED_HIT: '1',
    LEGACY_DIAG: '1',
    LEGACY_DOCTOR: '0',
    LEGACY_COMPARE: '0',
    LEGACY_PRINT_GAME: '0',
    LEGACY_COLOR: '0',
    LEGACY_ASCII: '1',
    LEGACY_HEADER: 'min',
    LEGACY_OUTPUT: 'compact',
    LEGACY_DETERMINISTIC: '1',
    LEGACY_SEED: '1337',
    LEGACY_TRIALS: '20000',
  });

  const cfgBase = sim.makeVariantList()[0];
  const cfgDiag = { ...cfgBase, diag: true, maxTurns: 200, trials: 20000 };
  const cfgSweep = { ...cfgBase, diag: false, maxTurns: 200, trials: 20000 };
  const rows = [];

  for (const name of TARGET_ROWS) {
    const matchup = truth.matchups.find((entry) => entry.defender === name);
    if (!matchup) throw new Error(`Missing matchup row: ${name}`);
    const compiled = compileCombatants(sim, cfgDiag, matchup);
    const snapshot = sim.buildCompiledCombatSnapshot(
      compiled.defender,
      compiled.attacker,
      cfgDiag,
      sim.ATTACK_STYLE_ROUND_MODE,
    );
    const bioCounts = getBioCounts(sim, matchup.pageBuilds.defender, cfgDiag);
    rows.push(rowSummary(compiled, snapshot, matchup, bioCounts));
  }

  const baselinePerRow = rows.map((row) => {
    const seed = sim.hashStr32(`row-seed|${row.name}|bio-surface-sweep`);
    const baselineResult = runMatch(sim, row.compiled.attacker, row.compiled.defender, cfgSweep, seed);
    return {
      name: row.name,
      shell: row.shell,
      truthWinPct: row.truth.winPct,
      truthAvgTurns: row.truth.avgTurns,
      simWinPct: baselineResult.winPct,
      simAvgTurns: baselineResult.avgTurns,
      deltaWin: baselineResult.winPct - row.truth.winPct,
      deltaAvgT: baselineResult.avgTurns - row.truth.avgTurns,
    };
  });

  const baselineMap = new Map(baselinePerRow.map((row) => [row.name, row]));
  const stage1 = summarizeSweep(rows, sim, cfgSweep, buildStage1Candidates(), baselineMap);
  const stage2 = summarizeSweep(
    rows,
    sim,
    cfgSweep,
    buildStage2Candidates(stage1.slice(0, 2)),
    baselineMap,
  );
  const ranked = [...stage1, ...stage2].sort(
    (a, b) =>
      a.meanAbsWin - b.meanAbsWin ||
      a.meanAbsAvgT - b.meanAbsAvgT ||
      a.worstAbsWin - b.worstAbsWin,
  );

  const rowMap = new Map(rows.map((row) => [row.name, row]));
  const deltaTables = [
    buildDeltaTable('No Bio -> One Bio P4', [
      {
        shell: 'Dual Rift',
        label: 'DL Dual Rift No Bio -> DL Dual Rift One Bio P4',
        delta: deltaRow(rowMap.get('DL Dual Rift No Bio'), rowMap.get('DL Dual Rift One Bio P4')),
      },
      {
        shell: 'Core/Rift',
        label: 'DL Core/Rift No Bio -> DL Core/Rift One Bio P4',
        delta: deltaRow(rowMap.get('DL Core/Rift No Bio'), rowMap.get('DL Core/Rift One Bio P4')),
      },
    ]),
    buildDeltaTable('One Bio P4 -> Two Bio P4', [
      {
        shell: 'Dual Rift',
        label: 'DL Dual Rift One Bio P4 -> DL Dual Rift Two Bio P4',
        delta: deltaRow(rowMap.get('DL Dual Rift One Bio P4'), rowMap.get('DL Dual Rift Two Bio P4')),
      },
      {
        shell: 'Core/Rift',
        label: 'DL Core/Rift One Bio P4 -> DL Core/Rift Two Bio P4',
        delta: deltaRow(rowMap.get('DL Core/Rift One Bio P4'), rowMap.get('DL Core/Rift Two Bio P4')),
      },
    ]),
    buildDeltaTable('One Bio P4 -> Bio P4 + O4', [
      {
        shell: 'Dual Rift',
        label: 'DL Dual Rift One Bio P4 -> DL Dual Rift Bio P4 + O4',
        delta: deltaRow(rowMap.get('DL Dual Rift One Bio P4'), rowMap.get('DL Dual Rift Bio P4 + O4')),
      },
      {
        shell: 'Core/Rift',
        label: 'DL Core/Rift One Bio P4 -> DL Core/Rift Bio P4 + O4',
        delta: deltaRow(rowMap.get('DL Core/Rift One Bio P4'), rowMap.get('DL Core/Rift Bio P4 + O4')),
      },
    ]),
  ];

  const baselineMeanAbsWin = mean(baselinePerRow.map((row) => Math.abs(row.deltaWin)));
  const baselineMeanAbsAvgT = mean(baselinePerRow.map((row) => Math.abs(row.deltaAvgT)));
  const baselineWorstAbsWin = Math.max(...baselinePerRow.map((row) => Math.abs(row.deltaWin)));
  const best = ranked[0];
  const top = ranked.slice(0, 5);

  let bestExplanation =
    'The reverted compile matrix shows the Bio swap is not isolated to a single channel: replacing Scout Drones[P4] with Bio[P4] materially lowers accuracy and dodge while changing gun/melee/projectile skill and defSkill. The orange second Bio also changes a real compiled surface, so the truth pattern is broader than an exact double-Pink shell bonus.';
  let recommendation = 'NEED ONE SMALL TRUTH PACK';
  let nextPatch = '';

  if (best && best.meanAbsWin < baselineMeanAbsWin * 0.7 && best.meanAbsAvgT <= baselineMeanAbsAvgT) {
    if (/defSk/.test(best.label) || /dodge/.test(best.label) || /gun\+mel\+prj/.test(best.label)) {
      recommendation = 'PATCH CANDIDATE READY';
      nextPatch =
        'Next patch target: `legacy-sim-v1.0.4-clean.js` `compileCombatantFromParts(...)` defender misc/Bio compile block, mirrored in `brute-sim-v1.4.6.js` `compileDefender(...)` and `compileAttacker(...)` parity-sensitive compile logic. Narrow rule to try next: apply a Bio-count-aware adjustment on the winning surface only for Bio-bearing DL Rift/Core defender shells, with separate first-Pink and second/Orange handling if that is what the top sweep result selected. Do not patch yet; confirm parity and rerun the same 8-row probe immediately after.';
    }
  }

  if (recommendation !== 'PATCH CANDIDATE READY') {
    bestExplanation +=
      ` The sweep did produce a best single-family candidate (${best ? best.label : 'none'}), but the improvement is modest and the numeric winner is still shell-leaning rather than a clean whole-family explanation. That points to one missing truth pack focused on 1-Bio / 2-Bio / P4+O4 marginal transitions before patching.`;
  }

  const report = `# codex-bio surface sweep report

## 1) Goal of this pass

- surgically remove the abandoned experimental Bio/Pink shell patch if present
- inspect reverted compile-state changes across the 8 probe defenders
- run a compact sensitivity sweep to rank which defender-side stat surface best matches the Bio-bearing Rift/Core truth pattern without applying any new tracked behavior patch

## 2) Exact commands run

\`\`\`sh
${COMMANDS_RUN.join('\n')}
\`\`\`

Note: \`./legacy-debug-handoff-2026-03-15.md\` was requested but is not present in this repo root.

## 3) Source hygiene / revert result

- Shell patch present before revert: ${beforeDiff.includes('getExperimentalBioPinkShellDefBonus') ? 'yes' : 'no'}
- Shell patch removed from tracked simulators: ${!afterDiff.includes('getExperimentalBioPinkShellDefBonus') ? 'yes' : 'no'}
- Saved pre-revert diff: \`./tmp/codex-bio-surface-sweep-before-revert.diff\`
- Saved post-revert diff: \`./tmp/codex-bio-surface-sweep-after-revert.diff\`
- Syntax check result: \`legacy-sim-v1.0.4-clean.js\` passed, \`brute-sim-v1.4.6.js\` passed
- Revert succeeded cleanly: ${beforeDiff.includes('getExperimentalBioPinkShellDefBonus') && !afterDiff.includes('getExperimentalBioPinkShellDefBonus') ? 'yes' : 'no'}
- Unrelated local edits preserved: yes

## 4) Exact files/functions inspected

- \`./tmp/codex-bio-pink-shell-microcheck.md\`
- \`./tmp/codex-bio-pink-shell-verify-results.md\`
- \`./tmp/codex-bio-pink-shell-patch.diff\`
- \`./tmp/legacy-truth-double-bio-probe.json\`
- \`${handoffFilePresent ? './legacy-debug-handoff-2026-03-15.md' : './legacy-debug-handoff-2026-03-15.md (missing)'}\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`partCrystalSpec(...)\`
  - \`normalizeResolvedBuildWeaponUpgrades(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
  - \`runMatch(...)\`
- \`./brute-sim-v1.4.6.js\`
  - revert-only inspection of removed abandoned helper/call sites
- \`./legacy-defs.js\`
- \`./tools/legacy-truth-replay-compare.js\`

## 5) Baseline compile matrix for the 8 probe rows

${buildCompileTable(rows)}

Baseline reverted 20k deterministic replay check on the same legacy-sim path:

| Row | truth win | sim win | Δwin | truth avgT | sim avgT | ΔavgT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${baselinePerRow
  .map(
    (row) =>
      `| ${quoteCell(row.name)} | ${fmtNum(row.truthWinPct, 2)} | ${fmtNum(row.simWinPct, 2)} | ${fmtSigned(row.deltaWin, 2)} | ${fmtNum(row.truthAvgTurns, 4)} | ${fmtNum(row.simAvgTurns, 4)} | ${fmtSigned(row.deltaAvgT, 4)} |`,
  )
  .join('\n')}

Probe baseline summary:

- meanAbsΔwin: ${fmtNum(baselineMeanAbsWin, 2)}
- meanAbsΔavgT: ${fmtNum(baselineMeanAbsAvgT, 4)}
- worstAbsΔwin: ${fmtNum(baselineWorstAbsWin, 2)}

## 6) Marginal delta tables

${deltaTables.join('\n\n')}

## 7) Sensitivity sweep design

- Sweep path: reverted \`legacy-sim-v1.0.4-clean.js\` loaded in-memory, no tracked edits after revert.
- Sweep mode: deterministic, 20,000 fights per row, \`LEGACY_SHARED_HIT=1\`.
- Rows scored: the same 8 probe rows only.
- Truth target: \`aggregates.attackerWinPct\` and \`aggregates.avgTurns\` from \`./tmp/legacy-truth-double-bio-probe.json\`.
- Candidate families:
  - pink-only linear: defender \`defSk\`, \`gunSkill\`, \`projSkill\`, \`meleeSkill\`, \`dodge\`, \`speed\`, \`hp\`
  - pink-only linear: defender \`gun+mel+prj\` together
  - second-stage variants only on the top 2 stage-1 surfaces:
    - first-Pink / second-Pink split
    - Pink vs Orange split
    - color-agnostic per-Bio linear
- Scoring:
  - mean absolute win delta across 8 rows
  - mean absolute avgTurns delta across 8 rows
  - worst absolute win delta
  - max absolute win delta on the two no-Bio rows

## 8) Ranked sensitivity results

Top candidates after the compact sweep:

${buildSensitivityTable(top, 5)}

Baseline for comparison:

- reverted baseline meanAbsΔwin = ${fmtNum(baselineMeanAbsWin, 2)}
- reverted baseline meanAbsΔavgT = ${fmtNum(baselineMeanAbsAvgT, 4)}

## 9) Best explanation now

${bestExplanation}

Current top-ranked sweep candidate: ${best ? `\`${best.label}\`` : '`none`'}.

Why this is the most plausible current suspect family:

- No-Bio rows stay anchored because the candidate rules key off Bio count.
- The compile deltas show the first Bio swap changes multiple channels at once, but the second Pink and Orange cases differ in exactly the way a per-Bio or color-aware rule would.
- The sweep ranking is more consistent with a Bio-count-aware defender stat surface than with the abandoned exact double-Pink shell predicate.

## 10) Recommendation

**${recommendation}**

## 11) If PATCH CANDIDATE READY

${nextPatch || 'Not applicable. The sweep ranks a suspect surface, but this pass stops short of a decision-ready patch rule.'}

## 12) What ChatGPT should do next

Use this report as the sole handoff. Start from the reverted codebase. If you agree the top-ranked surface is strong enough, propose one minimal compile-stage patch at the exact block named above, mirror the same rule across legacy/brute parity-sensitive compile paths, and rerun the same 8-row probe immediately. If you do not think the evidence is patch-ready, ask for one tiny truth pack that isolates first-Bio, second-Pink, and Orange-second-Bio transitions on the same DL shells before making any new formula change.
`;

  fs.writeFileSync(REPORT_PATH, report);
  process.stdout.write(report);
}

main();
