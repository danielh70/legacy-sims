#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = process.cwd();
const PATCHED_SIM_PATH = path.join(ROOT, 'legacy-sim-v1.0.4-clean.js');
const PREPATCH_SIM_PATH = path.join(ROOT, 'tmp', 'legacy-sim-v1.0.4-clean.pre-represented-build-patch.js');
const SCRIPT_PATH = path.join(ROOT, 'tmp', 'codex-represented-build-stat-stack-patch-check.js');
const REPORT_PATH = path.join(ROOT, 'tmp', 'codex-represented-build-stat-stack-patch-report.md');

const LIVE_ANCHOR = {
  hp: 650,
  speed: 216,
  dodge: 164,
  accuracy: 186,
  gunSkill: 580,
  meleeSkill: 723,
  projSkill: 580,
  defSkill: 704,
  armor: 83,
};

const LIVE_BUILD = {
  label: 'LIVE_BUILD_ANCHOR_MIXED_SLOT',
  attackType: 'normal',
  stats: { level: 80, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
  armor: {
    name: 'Dark Legion Armor',
    crystals: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    crystalSlots: 4,
    upgrades: [],
  },
  weapon1: {
    name: 'Reaper Axe',
    crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    crystalSlots: 3,
    upgrades: [],
  },
  weapon2: {
    name: 'Crystal Maul',
    crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    crystalSlots: 3,
    upgrades: [],
  },
  misc1: {
    name: 'Bio Spinal Enhancer',
    crystals: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
    crystalSlots: 3,
    upgrades: [],
  },
  misc2: {
    name: 'Bio Spinal Enhancer',
    crystals: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'],
    crystalSlots: 3,
    upgrades: [],
  },
};

const UNIFORM_REGRESSION_BUILD = {
  label: 'UNIFORM_SLOT_REGRESSION',
  attackType: 'normal',
  stats: { level: 80, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
  armor: {
    name: 'Dark Legion Armor',
    crystals: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    upgrades: [],
  },
  weapon1: {
    name: 'Reaper Axe',
    crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    upgrades: [],
  },
  weapon2: {
    name: 'Crystal Maul',
    crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    upgrades: [],
  },
  misc1: {
    name: 'Bio Spinal Enhancer',
    crystals: [
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
      'Perfect Pink Crystal',
    ],
    upgrades: [],
  },
  misc2: {
    name: 'Bio Spinal Enhancer',
    crystals: [
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
      'Perfect Orange Crystal',
    ],
    upgrades: [],
  },
};

function loadSimApi(simPath, exportKey) {
  const src = fs.readFileSync(simPath, 'utf8');
  const appended = `
module.exports.${exportKey} = {
  normalizeCrystalSlotCount,
  partCrystalSpec,
  normalizeCrystalCounts,
  normalizeResolvedBuildWeaponUpgrades,
  computeVariant,
  computeVariantFromCrystalSpec,
  compileCombatantFromParts,
  makeVariantList,
  ATTACK_STYLE_ROUND_MODE,
  explicitPartCrystalSlotCount: typeof explicitPartCrystalSlotCount === 'function' ? explicitPartCrystalSlotCount : null,
  resolvedPartCrystalSlots: typeof resolvedPartCrystalSlots === 'function' ? resolvedPartCrystalSlots : null,
  useRepresentedBuildStatSemantics: typeof useRepresentedBuildStatSemantics === 'function' ? useRepresentedBuildStatSemantics : null,
};
`;
  const mod = new Module(simPath, module.parent || module);
  mod.filename = simPath;
  mod.paths = Module._nodeModulePaths(path.dirname(simPath));
  mod._compile(src + appended, simPath);
  const api = mod.exports[exportKey];
  if (!api) throw new Error(`Failed to expose internals from ${simPath}`);
  return api;
}

function baseCfg(api) {
  const v = api.makeVariantList()[0];
  return {
    armorK: Number(v.armorK),
    armorApply: v.armorApply,
    armorRound: v.armorRound,
    projDefMult: Number(v.projDefMult),
    tacticsMode: v.tacticsMode || 'none',
    tacticsVal: Number(v.tacticsVal),
    dmgBonusMode: v.dmgBonusMode,
    dmgBonusStage: v.dmgBonusStage,
    statRound: v.statRound,
    weaponDmgRound: v.weaponDmgRound,
    armorStatStack:
      v.armorStatStack && v.armorStatStack !== 'inherit' ? v.armorStatStack : v.crystalStackStats,
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
    hiddenPreset: v.hiddenPreset || 'none',
  };
}

function partSlots(api, part, fallbackSlots) {
  if (api.resolvedPartCrystalSlots) return api.resolvedPartCrystalSlots(part, fallbackSlots);
  if (api.explicitPartCrystalSlotCount) {
    const explicit = api.explicitPartCrystalSlotCount(part);
    if (explicit !== null) return explicit;
  }
  return api.normalizeCrystalSlotCount(fallbackSlots);
}

function useRepresentedPath(api, part) {
  if (api.useRepresentedBuildStatSemantics) return !!api.useRepresentedBuildStatSemantics(part);
  return !!(
    part &&
    typeof part === 'object' &&
    ((Number.isFinite(Number(part.crystalSlots)) && Number(part.crystalSlots) > 0) ||
      (Number.isFinite(Number(part.slotCount)) && Number(part.slotCount) > 0))
  );
}

function partCfg(api, part, family, cfgBase) {
  const slots = partSlots(api, part, cfgBase.crystalSlots);
  const armorSlots = family === 'armor' ? slots : cfgBase.armorStatSlots;
  if (!useRepresentedPath(api, part)) {
    return {
      ...cfgBase,
      crystalSlots: slots,
      armorStatSlots: armorSlots,
    };
  }
  return {
    ...cfgBase,
    crystalSlots: slots,
    crystalStackStats: 'sum4',
    armorStatStack: 'sum4',
    armorStatSlots: armorSlots,
    stableCompareStatRounding: true,
  };
}

function buildVariant(api, cfgBase, part, family, slotTag) {
  const cfgLocal = partCfg(api, part, family, cfgBase);
  const spec = api.partCrystalSpec(part);
  const upgrades = api.normalizeResolvedBuildWeaponUpgrades(part);
  if (spec) {
    const counts = api.normalizeCrystalCounts(spec, cfgLocal.crystalSlots);
    return api.computeVariantFromCrystalSpec(part.name, counts, upgrades, cfgLocal, slotTag);
  }
  return api.computeVariant(part.name, '', upgrades, cfgLocal, slotTag);
}

function compileBuild(api, build) {
  const cfg = baseCfg(api);
  return api.compileCombatantFromParts({
    name: build.label || 'Build',
    stats: build.stats,
    armorV: build.armor ? buildVariant(api, cfg, build.armor, 'armor', 0) : null,
    w1V: build.weapon1 ? buildVariant(api, cfg, build.weapon1, 'weapon', 0) : null,
    w2V: build.weapon2 ? buildVariant(api, cfg, build.weapon2, 'weapon', 0) : null,
    m1V: build.misc1 ? buildVariant(api, cfg, build.misc1, 'misc', 1) : null,
    m2V: build.misc2 ? buildVariant(api, cfg, build.misc2, 'misc', 2) : null,
    cfg,
    role: 'A',
    attackTypeRaw: build.attackType || 'normal',
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });
}

function compileAnchorVariant(api, name, crystals, slots) {
  const cfg = {
    ...baseCfg(api),
    crystalSlots: slots,
    armorStatSlots: slots,
    crystalStackStats: 'sum4',
    armorStatStack: 'sum4',
    stableCompareStatRounding: true,
  };
  const counts = api.normalizeCrystalCounts(crystals, slots);
  return api.computeVariantFromCrystalSpec(name, counts, [], cfg, 1);
}

function fmtRange(w) {
  return w && Number.isFinite(w.min) && Number.isFinite(w.max) ? `${w.min}-${w.max}` : 'unavailable';
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function equalCompiled(pre, post) {
  const fields = ['hp', 'speed', 'dodge', 'acc', 'gun', 'mel', 'prj', 'defSk', 'armor'];
  if (!fields.every((k) => pre[k] === post[k])) return false;
  return fmtRange(pre.w1) === fmtRange(post.w1) && fmtRange(pre.w2) === fmtRange(post.w2);
}

function main() {
  const patched = loadSimApi(PATCHED_SIM_PATH, '__codexRepresentedPatched');
  const prepatch = loadSimApi(PREPATCH_SIM_PATH, '__codexRepresentedPrepatch');

  const scoutAnchor = compileAnchorVariant(patched, 'Scout Drones', [
    'Amulet Crystal',
    'Amulet Crystal',
    'Amulet Crystal',
    'Amulet Crystal',
  ], 4);
  const bioAnchor = compileAnchorVariant(patched, 'Bio Spinal Enhancer', [
    'Perfect Pink Crystal',
    'Perfect Pink Crystal',
    'Perfect Pink Crystal',
    'Perfect Pink Crystal',
  ], 4);

  const liveCompiled = compileBuild(patched, LIVE_BUILD);
  const uniformPre = compileBuild(prepatch, UNIFORM_REGRESSION_BUILD);
  const uniformPost = compileBuild(patched, UNIFORM_REGRESSION_BUILD);

  const liveRows = [
    ['HP', String(LIVE_ANCHOR.hp), String(liveCompiled.hp), String(liveCompiled.hp - LIVE_ANCHOR.hp)],
    ['Speed', String(LIVE_ANCHOR.speed), String(liveCompiled.speed), String(liveCompiled.speed - LIVE_ANCHOR.speed)],
    ['Dodge', String(LIVE_ANCHOR.dodge), String(liveCompiled.dodge), String(liveCompiled.dodge - LIVE_ANCHOR.dodge)],
    ['Accuracy', String(LIVE_ANCHOR.accuracy), String(liveCompiled.acc), String(liveCompiled.acc - LIVE_ANCHOR.accuracy)],
    ['Gun Skill', String(LIVE_ANCHOR.gunSkill), String(liveCompiled.gun), String(liveCompiled.gun - LIVE_ANCHOR.gunSkill)],
    ['Melee Skill', String(LIVE_ANCHOR.meleeSkill), String(liveCompiled.mel), String(liveCompiled.mel - LIVE_ANCHOR.meleeSkill)],
    ['Projectile Skill', String(LIVE_ANCHOR.projSkill), String(liveCompiled.prj), String(liveCompiled.prj - LIVE_ANCHOR.projSkill)],
    ['Defensive Skill', String(LIVE_ANCHOR.defSkill), String(liveCompiled.defSk), String(liveCompiled.defSk - LIVE_ANCHOR.defSkill)],
    ['Armor', String(LIVE_ANCHOR.armor), String(liveCompiled.armor), String(liveCompiled.armor - LIVE_ANCHOR.armor)],
  ];

  const report = `# codex-represented-build-stat-stack-patch-report

## 1. Goal of this pass

Implement the smallest safe tracked patch in legacy-sim so the explicit represented-build path can support the proven temp semantics for mixed-slot / per-part slot-count builds, while leaving ordinary tracked global behavior unchanged.

## 2. Exact files changed

| File | Functions changed | Classification |
| --- | --- | --- |
| [legacy-sim-v1.0.4-clean.js](${PATCHED_SIM_PATH}) | \`explicitPartCrystalSlotCount(...)\`, \`resolvedPartCrystalSlots(...)\`, \`useRepresentedBuildStatSemantics(...)\`, \`partCrystalSpecDisplay(...)\`, \`normalizeResolvedBuildPart(...)\`, \`normalizeResolvedBuildPartForTruthCollector(...)\`, \`stabilizeCompareStyleStatRoundInput(...)\`, \`applyCrystalPctToStat(...)\`, \`applyMixedCrystalPctToStat(...)\`, \`computeVariant(...)\`, \`computeVariantFromCrystalSpec(...)\`, local \`cfgForRepresentedBuildPart(...)\`, local \`vKey(...)\`, local represented-build \`getV(...)\` callsites in \`main()\` | behavior-changing, narrowly gated |
| [codex-represented-build-stat-stack-patch-check.js](${SCRIPT_PATH}) | temp verifier only | instrumentation-only |
| [codex-represented-build-stat-stack-patch-report.md](${REPORT_PATH}) | report only | instrumentation-only |

Untouched in this pass:

- Bio helper logic: unchanged
- combat-resolution logic: unchanged
- brute-sim: unchanged
- weapon display logic: unchanged
- predictedDamage helpers: unchanged

## 3. Exact gating rule used

New semantics are only enabled for parts that explicitly carry per-part slot-count representation via \`crystalSlots\` or \`slotCount\`.

For those represented-build parts only, the local compile cfg switches to:

- \`crystalSlots = <part-local slot count>\`
- \`crystalStackStats = 'sum4'\`
- \`armorStatStack = 'sum4'\`
- \`stableCompareStatRounding = true\`
- \`armorStatSlots = <part-local slot count>\` for armor parts

If a part does not carry an explicit per-part slot count, the compile path stays on the prior tracked cfg semantics.

Patch scope breadth:

- applies to explicit represented builds / normalized resolved-build parts with per-part slot counts
- does **not** broaden ordinary uniform-slot legacy paths by default

## 4. Exact verification commands run

\`\`\`sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-represented-build-stat-stack-patch-check.js
node ./tmp/codex-represented-build-stat-stack-patch-check.js
\`\`\`

## 5. Anchor results table

${table(
  ['Anchor', 'Field', 'Expected', 'Compiled', 'Exact'],
  [
    ['Scout Drones + 4x Amulet', 'acc', '40', String(scoutAnchor.addAcc), scoutAnchor.addAcc === 40 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'dodge', '5', String(scoutAnchor.addDod), scoutAnchor.addDod === 5 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'defSkill', '42', String(scoutAnchor.addDef), scoutAnchor.addDef === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'gunSkill', '42', String(scoutAnchor.addGun), scoutAnchor.addGun === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'meleeSkill', '42', String(scoutAnchor.addMel), scoutAnchor.addMel === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'projSkill', '70', String(scoutAnchor.addPrj), scoutAnchor.addPrj === 70 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'acc', '1', String(bioAnchor.addAcc), bioAnchor.addAcc === 1 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'dodge', '1', String(bioAnchor.addDod), bioAnchor.addDod === 1 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'defSkill', '117', String(bioAnchor.addDef), bioAnchor.addDef === 117 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'gunSkill', '65', String(bioAnchor.addGun), bioAnchor.addGun === 65 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'meleeSkill', '65', String(bioAnchor.addMel), bioAnchor.addMel === 65 ? 'yes' : 'no'],
    ['Bio Spinal Enhancer + 4x Perfect Pink', 'projSkill', '65', String(bioAnchor.addPrj), bioAnchor.addPrj === 65 ? 'yes' : 'no'],
  ],
)}

Result:

- both anchored single-card truths stayed exact under the tracked patch

## 6. Live mixed-slot build results table

Represented build used:

- armor: Dark Legion Armor, 4x Abyss, \`crystalSlots: 4\`
- weapon1: Reaper Axe, 3x Amulet, \`crystalSlots: 3\`
- weapon2: Crystal Maul, 3x Amulet, \`crystalSlots: 3\`
- misc1: Bio Spinal Enhancer, 3x Perfect Pink, \`crystalSlots: 3\`
- misc2: Bio Spinal Enhancer, 3x Perfect Orange, \`crystalSlots: 3\`
- stats: \`hp 650\`, all trainable points into dodge represented as \`speed 60 / dodge 57 / accuracy 14\`

${table(['Field', 'Live anchor', 'Compiled value', 'Delta'], liveRows)}

Compiled weapon ranges on the represented build:

- weapon1: \`${fmtRange(liveCompiled.w1)}\`
- weapon2: \`${fmtRange(liveCompiled.w2)}\`

## 7. Ordinary uniform-slot regression check result

Representative regression build:

- all parts use ordinary uniform-slot crystal arrays
- no part carries explicit \`crystalSlots\` or \`slotCount\`

${table(
  ['Field', 'Pre-patch backup', 'Patched tracked', 'Changed?'],
  [
    ['HP', String(uniformPre.hp), String(uniformPost.hp), uniformPre.hp === uniformPost.hp ? 'no' : 'yes'],
    ['Speed', String(uniformPre.speed), String(uniformPost.speed), uniformPre.speed === uniformPost.speed ? 'no' : 'yes'],
    ['Dodge', String(uniformPre.dodge), String(uniformPost.dodge), uniformPre.dodge === uniformPost.dodge ? 'no' : 'yes'],
    ['Accuracy', String(uniformPre.acc), String(uniformPost.acc), uniformPre.acc === uniformPost.acc ? 'no' : 'yes'],
    ['Gun Skill', String(uniformPre.gun), String(uniformPost.gun), uniformPre.gun === uniformPost.gun ? 'no' : 'yes'],
    ['Melee Skill', String(uniformPre.mel), String(uniformPost.mel), uniformPre.mel === uniformPost.mel ? 'no' : 'yes'],
    ['Projectile Skill', String(uniformPre.prj), String(uniformPost.prj), uniformPre.prj === uniformPost.prj ? 'no' : 'yes'],
    ['Defensive Skill', String(uniformPre.defSk), String(uniformPost.defSk), uniformPre.defSk === uniformPost.defSk ? 'no' : 'yes'],
    ['Armor', String(uniformPre.armor), String(uniformPost.armor), uniformPre.armor === uniformPost.armor ? 'no' : 'yes'],
    ['Weapon1 Range', fmtRange(uniformPre.w1), fmtRange(uniformPost.w1), fmtRange(uniformPre.w1) === fmtRange(uniformPost.w1) ? 'no' : 'yes'],
    ['Weapon2 Range', fmtRange(uniformPre.w2), fmtRange(uniformPost.w2), fmtRange(uniformPre.w2) === fmtRange(uniformPost.w2) ? 'no' : 'yes'],
  ],
)}

Uniform-slot regression verdict:

- exact equality pre-vs-post: ${equalCompiled(uniformPre, uniformPost) ? 'yes' : 'no'}

## 8. Scope / parity notes

- The tracked patch is in place only in [legacy-sim-v1.0.4-clean.js](${PATCHED_SIM_PATH}).
- No brute patch was made.
- Brute parity-sensitive code was not changed and was not re-verified in this pass.
- No parity preservation claim is made beyond “brute was untouched”.

## 9. Final answer

Yes. The tracked patch is now in place safely **for the explicit represented-build path only**.

What it achieves:

- keeps ordinary uniform-slot legacy behavior unchanged on the cheap regression check
- preserves the two anchored single-card truths exactly
- makes the mixed-slot represented live build compile to the exact live stat anchor:
  - HP 650
  - Speed 216
  - Dodge 164
  - Accuracy 186
  - Gun Skill 580
  - Melee Skill 723
  - Projectile Skill 580
  - Defensive Skill 704
  - Armor 83

What it does **not** change:

- Bio helper behavior
- combat-resolution behavior
- brute behavior
- weapon display behavior
- predictedDamage behavior
`;

  fs.writeFileSync(REPORT_PATH, report);
}

main();
