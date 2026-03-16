const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

const ROOT = process.cwd();
const TRACE_LIMIT = 12;

const CASES = [
  ['./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json', 'CUSTOM_MAUL_A4_SG1_PINK', 'SG1 Double Maul Droid'],
  ['./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json', 'CUSTOM_MAUL_A4_SG1_PINK', 'DL Rift/Bombs Scout'],
];

const VARIANTS = [
  { name: 'baseline', cfg: {} },
  { name: 'w2_after_applied_defender', cfg: { diagW2AfterAppliedW1: 'defender' } },
  { name: 'split_multiweapon_defender', cfg: { diagSplitMultiweaponAction: 'defender' } },
];

function loadLegacyApi() {
  const simPath = path.resolve(ROOT, process.argv[2] || 'legacy-sim-v1.0.4-clean.js');
  const source = fs.readFileSync(simPath, 'utf8');
  const appended = `${source}
function __tempSetFastRng(seed) {
  const s = (seed >>> 0) || 1337;
  RNG = makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d);
}
module.exports = {
  normalizeResolvedBuild,
  normalizeResolvedBuildWeaponUpgrades,
  partCrystalSpec,
  resolvedPartCrystalSlots,
  useRepresentedBuildStatSemantics,
  computeVariantFromCrystalSpec,
  compileCombatantFromParts,
  buildCompiledCombatSnapshot,
  makeVariantList,
  resolveSupportedAttackType,
  runMatch,
  __tempSetFastRng,
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
          name: 'Crystal Maul',
          upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
        },
        weapon2: {
          name: 'Reaper Axe',
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

function buildCfg(api, overrides = {}) {
  const v = api.makeVariantList()[0];
  return {
    trials: 1,
    maxTurns: 12,
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
    diagW2AfterAppliedW1: overrides.diagW2AfterAppliedW1 || 'auto',
    diagQueuedSecondAction: overrides.diagQueuedSecondAction || 'auto',
    diagSplitMultiweaponAction: overrides.diagSplitMultiweaponAction || 'auto',
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

function compileBuild(api, build, role, baseCfg, displayName = null) {
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
    name: displayName || (role === 'A' ? 'Attacker' : 'Defender'),
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

function loadTruthBuild(truthPath, attackerLabel, defenderName) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, truthPath), 'utf8'));
  const rows = Array.isArray(raw.matchups) ? raw.matchups : [];
  const attackerFromList = Array.isArray(raw.attackers)
    ? raw.attackers.find((a) => a && a.name === attackerLabel)
    : null;
  const attacker =
    (attackerFromList && attackerFromList.build) ||
    raw.attacker ||
    raw.attackerBuild ||
    raw.build ||
    (raw.meta && raw.meta.attacker) ||
    (rows[0] && rows[0].sourceBuilds && rows[0].sourceBuilds.attacker) ||
    (rows[0] && rows[0].pageBuilds && rows[0].pageBuilds.attacker) ||
    null;
  const defenderRow =
    rows.find((r) => r.attacker === attackerLabel && r.defender === defenderName) ||
    rows.find((r) => (r.name || r.defender || r.label) === defenderName);
  if (!attacker) throw new Error(`No attacker build found in ${truthPath}`);
  if (!defenderRow) throw new Error(`No defender row "${defenderName}" in ${truthPath}`);
  const defender =
    (defenderRow.sourceBuilds && defenderRow.sourceBuilds.defender) ||
    (defenderRow.pageBuilds && defenderRow.pageBuilds.defender) ||
    defenderRow.payload ||
    defenderRow.build ||
    defenderRow.defenderBuild ||
    defenderRow;
  return { attacker, defender };
}

function parseTraceLine(line) {
  const header = /^T(\d+)\s+([AD])->([AD])(\([^)]+\))?\s+\|\s+/.exec(line);
  if (!header) return [];
  const turn = Number(header[1]);
  const actorSide = header[2];
  const targetSide = header[3];
  const phase = header[4] || '';
  const rest = line.slice(header[0].length);
  const targetHpMatch = /targetHP=(\d+(?:\.\d+)?)/.exec(rest);
  const targetHp0 = targetHpMatch ? Number(targetHpMatch[1]) : null;
  const weaponRe =
    /w([12])\(h=(true|false),s=(true|false),raw=([0-9.]+),d=([0-9.]+),app=([0-9.]+)\)/g;
  const out = [];
  let hp = targetHp0;
  let m;
  while ((m = weaponRe.exec(rest))) {
    const slot = Number(m[1]);
    const hit = m[2] === 'true';
    const skill = m[3] === 'true';
    const raw = Number(m[4]);
    const postArmor = Number(m[5]);
    const applied = Number(m[6]);
    if (!hit || !skill || raw <= 0) continue;
    const hpAfter = hp === null ? null : Math.max(0, hp - applied);
    out.push({
      turn,
      actorSide,
      targetSide,
      phase: phase || 'lead',
      weaponSlot: slot,
      rawDamage: raw,
      postArmorDamage: postArmor,
      appliedDamage: applied,
      targetHpBefore: hp,
      targetHpAfter: hpAfter,
      lethalAtWeapon: hp !== null ? applied >= hp : null,
    });
    hp = hpAfter;
  }
  return out;
}

const api = loadLegacyApi();
const results = [];

for (const [truthPath, attackerLabel, defenderName] of CASES) {
  const { attacker, defender } = loadTruthBuild(truthPath, attackerLabel, defenderName);
  const seed = defenderName === 'SG1 Double Maul Droid' ? 3337 : 4337;
  for (const variant of VARIANTS) {
    const cfg = buildCfg(api, variant.cfg);
    const compiledAttacker = compileBuild(api, attacker, 'A', cfg, 'Attacker');
    const compiledDefender = compileBuild(api, defender, 'D', cfg, defenderName);
    api.__tempSetFastRng(seed);
    const traceCfg = {
      traceFights: 1,
      rollDump: {
        enabled: true,
        fights: 1,
        maxTurns: 8,
        maxLines: 200,
        lines: [],
        matchName: defenderName,
      },
    };
    const run = api.runMatch(compiledAttacker, compiledDefender, cfg, traceCfg);
    const defenderEvents = [];
    for (const line of run.traceLines || []) {
      const parsed = parseTraceLine(line).filter((event) => event.actorSide === 'D');
      defenderEvents.push(...parsed);
      if (defenderEvents.length >= TRACE_LIMIT) break;
    }
    results.push({
      attacker: attackerLabel,
      defender: defenderName,
      variant: variant.name,
      seed,
      cfg: {
        armorApply: cfg.armorApply,
        armorRound: cfg.armorRound,
        sharedHit: cfg.sharedHit,
        actionStopOnKill: cfg.actionStopOnKill,
        diagW2AfterAppliedW1: cfg.diagW2AfterAppliedW1,
        diagSplitMultiweaponAction: cfg.diagSplitMultiweaponAction,
      },
      traceLines: (run.traceLines || []).slice(0, 8),
      defenderSuccessfulEvents: defenderEvents.slice(0, TRACE_LIMIT),
    });
  }
}

console.log(JSON.stringify({ results }, null, 2));
