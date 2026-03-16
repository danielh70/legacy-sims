const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

const ROOT = process.cwd();

const truthFiles = [
  ['./tmp/legacy-truth-current-attacker-vs-meta.json', 'CUSTOM'],
  ['./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json', 'CUSTOM_CSTAFF_A4'],
  ['./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json', 'CUSTOM_MAUL_A4_DL_ABYSS'],
  ['./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json', 'CUSTOM_MAUL_A4_SG1_PINK'],
];

const replayFiles = {
  CUSTOM:
    './tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-custom--2026-03-15T19-17-04-496Z.json',
  CUSTOM_CSTAFF_A4:
    './tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-cstaff-full15-merged--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-cstaff--2026-03-15T19-17-04-505Z.json',
  CUSTOM_MAUL_A4_DL_ABYSS:
    './tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-maul-a4-dl-abyss-full15--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-dl-abyss--2026-03-15T19-17-04-517Z.json',
  CUSTOM_MAUL_A4_SG1_PINK:
    './tmp/replay-v4-maul-signoff/legacy-replay--legacy-truth-v4-custom-maul-a4-sg1-pink-full15--legacy-sim-v1.0.4-clean--none--codex-final-maul-signoff-sg1-pink--2026-03-15T19-17-04-524Z.json',
};

const focusDefenders = [
  'DL Dual Rift Bio',
  'SG1 Double Maul Droid',
  'DL Core/Rift Bio',
  'DL Rift/Bombs Scout',
];

function loadLegacyApi() {
  const simPath = path.join(ROOT, 'legacy-sim-v1.0.4-clean.js');
  const source = fs.readFileSync(simPath, 'utf8');
  const appended = `${source}
module.exports = {
  normalizeResolvedBuild,
  normalizeResolvedBuildWeaponUpgrades,
  partCrystalSpec,
  resolvedPartCrystalSlots,
  useRepresentedBuildStatSemantics,
  computeVariantFromCrystalSpec,
  compileCombatantFromParts,
  buildCompiledCombatSnapshot,
  exactDispChances,
  makeVariantList,
  resolveSupportedAttackType,
};`;
  const localRequire = createRequire(simPath);
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: localRequire,
    __dirname: path.dirname(simPath),
    __filename: simPath,
    process: {
      ...process,
      cwd: () => ROOT,
      env: { ...process.env },
      argv: ['node', simPath],
      exit: (code) => {
        throw new Error(`legacy-sim attempted process.exit(${code}) during temp harness load`);
      },
      stdout: process.stdout,
      stderr: process.stderr,
    },
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    USER_CONFIG: {
      attacker: {
        label: 'TEMP_DUMMY',
        armor: {
          name: 'SG1 Armor',
          upgrades: [
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
          ],
        },
        weapon1: {
          name: 'Reaper Axe',
          upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
        },
        weapon2: {
          name: 'Crystal Maul',
          upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
        },
        misc1: {
          name: 'Bio Spinal Enhancer',
          upgrades: [
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
            'Perfect Pink Crystal',
          ],
        },
        misc2: {
          name: 'Bio Spinal Enhancer',
          upgrades: [
            'Perfect Orange Crystal',
            'Perfect Orange Crystal',
            'Perfect Orange Crystal',
            'Perfect Orange Crystal',
          ],
        },
        stats: { hp: 650, level: 80, speed: 60, dodge: 57, accuracy: 14 },
        attackType: 'normal',
      },
    },
  };
  vm.runInNewContext(appended, sandbox, { filename: simPath });
  return sandbox.module.exports;
}

function buildCfg(api) {
  const v = api.makeVariantList()[0];
  return {
    trials: 20000,
    maxTurns: 80,
    diag: true,
    diagArmor: false,
    speedTieMode: v.speedTieMode || 'attacker',
    roundResolveMode: v.roundResolveMode || 'baseline',
    hiddenPreset: v.hiddenPreset || 'none',
    hitRollMode: v.hitRollMode,
    skillRollMode: v.skillRollMode,
    hitGe: !!v.hitGe,
    skillGe: !!v.skillGe,
    hitQround: v.hitQround || 'none',
    skillQround: v.skillQround || 'none',
    dmgRoll: v.dmgRoll,
    projDefMult: Number(v.projDefMult),
    armorK: v.armorK,
    armorApply: v.armorApply,
    armorRound: v.armorRound,
    tacticsMode: v.tacticsMode,
    tacticsVal: Number(v.tacticsVal),
    dmgBonusMode: v.dmgBonusMode,
    dmgBonusStage: v.dmgBonusStage,
    statRound: v.statRound,
    weaponDmgRound: v.weaponDmgRound,
    armorStatStack: v.armorStatStack && v.armorStatStack !== 'inherit' ? v.armorStatStack : 'sum4',
    armorStatRound:
      v.armorStatRound && v.armorStatRound !== 'inherit' ? v.armorStatRound : v.statRound,
    armorStatSlots:
      v.armorStatSlots !== undefined &&
      v.armorStatSlots !== null &&
      v.armorStatSlots !== 'inherit'
        ? Number(v.armorStatSlots)
        : Number.isFinite(Number(v.crystalSlots))
          ? Number(v.crystalSlots)
          : 4,
    crystalStackStats: v.crystalStackStats || 'sum4',
    crystalStackDmg: v.crystalStackDmg || 'sum4',
    crystalSlots: Number.isFinite(Number(v.crystalSlots)) ? Number(v.crystalSlots) : 4,
    sharedHit: Number(v.sharedHit) === 1,
    sharedSkillMode: v.sharedSkillMode || 'none',
    actionStopOnKill: Number(v.actionStopOnKill) === 1 || v.actionStopOnKill === true,
  };
}

function cfgForPart(api, part, baseCfg) {
  const partSlots = api.resolvedPartCrystalSlots(part, baseCfg.crystalSlots);
  if (!api.useRepresentedBuildStatSemantics(part)) {
    return {
      ...baseCfg,
      crystalSlots: partSlots,
      armorStatSlots:
        part && part.name === 'Dark Legion Armor' ? partSlots : baseCfg.armorStatSlots,
    };
  }
  return {
    ...baseCfg,
    crystalSlots: partSlots,
    crystalStackStats: 'sum4',
    armorStatStack: 'sum4',
    armorStatSlots: part && part.name === 'Dark Legion Armor' ? partSlots : baseCfg.armorStatSlots,
    stableCompareStatRounding: true,
  };
}

function compileBuild(api, build, role, baseCfg) {
  const cache = new Map();
  function vKey(itemName, crystalSpec, cfgLocal, u1 = '', u2 = '') {
    return [
      cfgLocal.statRound,
      cfgLocal.weaponDmgRound,
      cfgLocal.crystalStackStats,
      cfgLocal.armorStatStack,
      cfgLocal.crystalSlots,
      cfgLocal.armorStatSlots,
      cfgLocal.stableCompareStatRounding ? 1 : 0,
      itemName,
      JSON.stringify(crystalSpec || ''),
      u1,
      u2,
    ].join('|');
  }
  function getV(itemName, part, cfgLocal, slotTag = 0) {
    const upgrades = api.normalizeResolvedBuildWeaponUpgrades(part);
    const spec = api.partCrystalSpec(part);
    const key = vKey(itemName, spec, cfgLocal, upgrades[0] || '', upgrades[1] || '');
    if (!cache.has(key)) {
      cache.set(
        key,
        api.computeVariantFromCrystalSpec(
          itemName,
          spec,
          upgrades.filter(Boolean),
          cfgLocal,
          slotTag,
        ),
      );
    }
    return cache.get(key);
  }

  return api.compileCombatantFromParts({
    name: role === 'A' ? 'Attacker' : 'Defender',
    stats: build.stats,
    armorV: getV(build.armor.name, build.armor, cfgForPart(api, build.armor, baseCfg)),
    w1V: getV(build.weapon1.name, build.weapon1, cfgForPart(api, build.weapon1, baseCfg), 0),
    w2V: getV(build.weapon2.name, build.weapon2, cfgForPart(api, build.weapon2, baseCfg), 0),
    m1V: getV(build.misc1.name, build.misc1, cfgForPart(api, build.misc1, baseCfg), 1),
    m2V: getV(build.misc2.name, build.misc2, cfgForPart(api, build.misc2, baseCfg), 2),
    cfg: baseCfg,
    role,
    attackTypeRaw: api.resolveSupportedAttackType(build.attackType, `${role} build attackType`),
    attackStyleRoundMode: 'floor',
  });
}

function pickBuilds() {
  const byAttacker = new Map();
  const byDefender = new Map();
  for (const [file, label] of truthFiles) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    for (const m of j.matchups || []) {
      if (m.attacker === label && !byAttacker.has(label)) {
        byAttacker.set(label, m.pageBuilds.attacker);
      }
      if (focusDefenders.includes(m.defender) && !byDefender.has(m.defender)) {
        byDefender.set(m.defender, m.pageBuilds.defender);
      }
    }
  }
  return { attackers: byAttacker, defenders: byDefender };
}

function summarizeSnapshot(attSnap, defSnap, chances) {
  return {
    attacker: {
      effective: attSnap.effective,
      weapon1: {
        skillType: attSnap.weapon1 && attSnap.weapon1.skillType,
        preArmorRange: attSnap.weapon1 && attSnap.weapon1.preArmorRange,
        compiledActionRange: attSnap.weapon1 && attSnap.weapon1.compiledActionRange,
      },
      weapon2: {
        skillType: attSnap.weapon2 && attSnap.weapon2.skillType,
        preArmorRange: attSnap.weapon2 && attSnap.weapon2.preArmorRange,
        compiledActionRange: attSnap.weapon2 && attSnap.weapon2.compiledActionRange,
      },
      totalActionRange: attSnap.compiledActionRange,
      exact: {
        A_hit: attSnap.weapon1 ? chances.A_hit : 0,
        A_sk1: attSnap.weapon1 ? chances.A_sk1 : 0,
        A_sk2: attSnap.weapon2 ? chances.A_sk2 : 0,
        A_all1: attSnap.weapon1 ? chances.A_all1 : 0,
        A_all2: attSnap.weapon2 ? chances.A_all2 : 0,
      },
    },
    defender: {
      effective: defSnap.effective,
      weapon1: {
        skillType: defSnap.weapon1 && defSnap.weapon1.skillType,
        preArmorRange: defSnap.weapon1 && defSnap.weapon1.preArmorRange,
        compiledActionRange: defSnap.weapon1 && defSnap.weapon1.compiledActionRange,
      },
      weapon2: {
        skillType: defSnap.weapon2 && defSnap.weapon2.skillType,
        preArmorRange: defSnap.weapon2 && defSnap.weapon2.preArmorRange,
        compiledActionRange: defSnap.weapon2 && defSnap.weapon2.compiledActionRange,
      },
      totalActionRange: defSnap.compiledActionRange,
      exact: {
        D_hit: defSnap.weapon1 ? chances.D_hit : 0,
        D_sk1: defSnap.weapon1 ? chances.D_sk1 : 0,
        D_sk2: defSnap.weapon2 ? chances.D_sk2 : 0,
        D_all1: defSnap.weapon1 ? chances.D_all1 : 0,
        D_all2: defSnap.weapon2 ? chances.D_all2 : 0,
      },
    },
  };
}

function main() {
  const api = loadLegacyApi();
  const cfg = buildCfg(api);
  const { attackers, defenders } = pickBuilds();

  const replayRows = {};
  for (const [att, file] of Object.entries(replayFiles)) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    replayRows[att] = Object.fromEntries((j.rows || []).map((r) => [r.defender, r]));
  }

  const attackerSummary = [...attackers.entries()].map(([label, build]) => ({
    attacker: label,
    armor: build.armor.name,
    weapon1: build.weapon1.name,
    weapon2: build.weapon2.name,
    misc1: build.misc1.name,
    misc2: build.misc2.name,
    attackType: build.attackType,
    weapon1Crystals: build.weapon1.upgrades,
    weapon2Crystals: build.weapon2.upgrades,
  }));

  const focused = [];
  for (const [attLabel, attBuild] of attackers.entries()) {
    const attacker = compileBuild(api, attBuild, 'A', cfg);
    for (const [defLabel, defBuild] of defenders.entries()) {
      const defender = compileBuild(api, defBuild, 'D', cfg);
      const attSnap = api.buildCompiledCombatSnapshot(attacker, defender, cfg, 'floor');
      const defSnap = api.buildCompiledCombatSnapshot(defender, attacker, cfg, 'floor');
      const chances = api.exactDispChances(attacker, defender, cfg);
      const row = replayRows[attLabel][defLabel];
      focused.push({
        attacker: attLabel,
        defender: defLabel,
        truth: row.truth,
        sim: row.sim,
        delta: {
          winPct: row.dWinPct,
          avgTurns: row.dAvgTurns,
          A_hit: row.sim.A_hit - row.truth.A_hit,
          A_dmg1: row.sim.A_dmg1 - row.truth.A_dmg1,
          A_dmg2: row.sim.A_dmg2 - row.truth.A_dmg2,
          D_hit: row.sim.D_hit - row.truth.D_hit,
          D_dmg1: row.sim.D_dmg1 - row.truth.D_dmg1,
          D_dmg2: row.sim.D_dmg2 - row.truth.D_dmg2,
          A_dpf: row.sim.A_damagePerFight - row.truth.A_damagePerFight,
          D_dpf: row.sim.D_damagePerFight - row.truth.D_damagePerFight,
          A_rng: row.delta.A_rng,
          D_rng: row.delta.D_rng,
        },
        compiled: summarizeSnapshot(attSnap, defSnap, chances),
      });
    }
  }

  const out = {
    attackerSummary,
    focused,
  };
  process.stdout.write(JSON.stringify(out, null, 2));
}

main();
