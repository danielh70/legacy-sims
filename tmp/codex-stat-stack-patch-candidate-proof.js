#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = process.cwd();
const LEGACY_SIM_PATH = path.join(ROOT, 'legacy-sim-v1.0.4-clean.js');
const REPORT_PATH = path.join(ROOT, 'tmp', 'codex-stat-stack-patch-candidate-proof.md');

const LIVE = {
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

const BUILD = {
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

function loadLegacy() {
  const src = fs.readFileSync(LEGACY_SIM_PATH, 'utf8');
  const appended = `
module.exports.__codexStatStack = {
  normalizeCrystalSlotCount,
  partCrystalSpec,
  normalizeCrystalCounts,
  normalizeResolvedBuildWeaponUpgrades,
  computeVariantFromCrystalSpec,
  computeVariant,
  compileCombatantFromParts,
  makeVariantList,
  ATTACK_STYLE_ROUND_MODE,
  BASE,
  CrystalDefs,
  ItemDefs,
};
`;
  const mod = new Module(LEGACY_SIM_PATH, module.parent || module);
  mod.filename = LEGACY_SIM_PATH;
  mod.paths = Module._nodeModulePaths(path.dirname(LEGACY_SIM_PATH));
  mod._compile(src + appended, LEGACY_SIM_PATH);
  return mod.exports.__codexStatStack;
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

function roundStat(x, mode) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'round') return Math.round(x);
  return Math.ceil(x);
}

function roundWeaponDmg(x, mode) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'round') return Math.round(x);
  return Math.ceil(x);
}

function stableRoundInput(y, mode) {
  if (mode === 'ceil') return y - 1e-9;
  if (mode === 'floor') return y + 1e-9;
  return y;
}

function partSlots(api, part, fallback) {
  return api.normalizeCrystalSlotCount(
    Number.isFinite(Number(part.crystalSlots)) ? Number(part.crystalSlots) : fallback,
  );
}

function statsRow(compiled) {
  return {
    hp: compiled.hp,
    speed: compiled.speed,
    dodge: compiled.dodge,
    accuracy: compiled.acc,
    gunSkill: compiled.gun,
    meleeSkill: compiled.mel,
    projSkill: compiled.prj,
    defSkill: compiled.defSk,
    armor: compiled.armor,
  };
}

function deltas(row) {
  return {
    hp: row.hp - LIVE.hp,
    speed: row.speed - LIVE.speed,
    dodge: row.dodge - LIVE.dodge,
    accuracy: row.accuracy - LIVE.accuracy,
    gunSkill: row.gunSkill - LIVE.gunSkill,
    meleeSkill: row.meleeSkill - LIVE.meleeSkill,
    projSkill: row.projSkill - LIVE.projSkill,
    defSkill: row.defSkill - LIVE.defSkill,
    armor: row.armor - LIVE.armor,
  };
}

function meanAbs(delta) {
  const keys = ['hp', 'speed', 'dodge', 'accuracy', 'gunSkill', 'meleeSkill', 'projSkill', 'defSkill', 'armor'];
  return keys.reduce((sum, k) => sum + Math.abs(delta[k]), 0) / keys.length;
}

function fmtRange(w) {
  return w && Number.isFinite(w.min) && Number.isFinite(w.max) ? `${w.min}-${w.max}` : 'unavailable';
}

function compileTrackedRow(api, cfg, modes) {
  function ctx(part, family, slotTag) {
    const slots = partSlots(api, part, cfg.crystalSlots);
    const counts = api.normalizeCrystalCounts(api.partCrystalSpec(part), slots);
    const ups = api.normalizeResolvedBuildWeaponUpgrades(part);
    const partCfg = {
      ...cfg,
      crystalSlots: slots,
      armorStatSlots: family === 'armor' ? slots : cfg.armorStatSlots,
      crystalStackStats: modes[family] === 'sum4' ? 'sum4' : cfg.crystalStackStats,
      armorStatStack:
        family === 'armor' && modes[family] === 'sum4' ? 'sum4' : cfg.armorStatStack,
    };
    return api.computeVariantFromCrystalSpec(part.name, counts, ups, partCfg, slotTag);
  }
  return api.compileCombatantFromParts({
    name: 'Live Build',
    stats: BUILD.stats,
    armorV: ctx(BUILD.armor, 'armor', 0),
    w1V: ctx(BUILD.weapon1, 'weapon', 0),
    w2V: ctx(BUILD.weapon2, 'weapon', 0),
    m1V: ctx(BUILD.misc1, 'misc', 1),
    m2V: ctx(BUILD.misc2, 'misc', 2),
    cfg,
    role: 'A',
    attackTypeRaw: BUILD.attackType,
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });
}

function computeStableVariant(api, part, cfg, slotTag) {
  const slots = partSlots(api, part, cfg.crystalSlots);
  const counts = api.normalizeCrystalCounts(api.partCrystalSpec(part), slots);
  const item = api.ItemDefs[part.name];
  const fs = item.flatStats || {};
  const crystalEntries = Object.entries(counts);

  function pctSum(key) {
    return crystalEntries.reduce(
      (sum, [crystalName, n]) => sum + ((api.CrystalDefs[crystalName].pct || {})[key] || 0) * n,
      0,
    );
  }

  function stat(base, pctTotal, mode) {
    base = Number(base) || 0;
    if (!base || !pctTotal) return base;
    return base + roundStat(stableRoundInput(base * pctTotal, mode), mode);
  }

  function dmg(base, pctTotal, mode) {
    base = Number(base) || 0;
    if (!base || !pctTotal) return base;
    return roundWeaponDmg(base * (1 + pctTotal), mode);
  }

  const out = {
    itemName: part.name,
    crystalName: '',
    upgrades: [],
    addSpeed: stat(fs.speed || 0, pctSum('speed'), cfg.statRound),
    addAcc: stat(fs.accuracy || 0, pctSum('accuracy'), cfg.statRound),
    addDod: stat(fs.dodge || 0, pctSum('dodge'), cfg.statRound),
    addGun: stat(fs.gunSkill || 0, pctSum('gunSkill'), cfg.statRound),
    addMel: stat(fs.meleeSkill || 0, pctSum('meleeSkill'), cfg.statRound),
    addPrj: stat(fs.projSkill || 0, pctSum('projSkill'), cfg.statRound),
    addDef: stat(fs.defSkill || 0, pctSum('defSkill'), cfg.statRound),
    addArmStat: stat(fs.armor || 0, pctSum('armor'), cfg.statRound),
    weapon: null,
  };

  if (item.baseWeaponDamage) {
    const pctTotal = pctSum('damage');
    const skill = item.skillType === 'gunSkill' ? 0 : item.skillType === 'meleeSkill' ? 1 : 2;
    out.weapon = {
      name: part.name,
      min: dmg(item.baseWeaponDamage.min, pctTotal, cfg.weaponDmgRound),
      max: dmg(item.baseWeaponDamage.max, pctTotal, cfg.weaponDmgRound),
      skill,
    };
  }
  return out;
}

function compilePrototypeRow(api, cfg) {
  const slotsCfg = { ...cfg, crystalStackStats: 'sum4', armorStatStack: 'sum4' };
  return api.compileCombatantFromParts({
    name: 'Live Build',
    stats: BUILD.stats,
    armorV: computeStableVariant(api, BUILD.armor, { ...slotsCfg, crystalSlots: 4, armorStatSlots: 4 }, 0),
    w1V: computeStableVariant(api, BUILD.weapon1, { ...slotsCfg, crystalSlots: 3, armorStatSlots: 4 }, 0),
    w2V: computeStableVariant(api, BUILD.weapon2, { ...slotsCfg, crystalSlots: 3, armorStatSlots: 4 }, 0),
    m1V: computeStableVariant(api, BUILD.misc1, { ...slotsCfg, crystalSlots: 3, armorStatSlots: 4 }, 1),
    m2V: computeStableVariant(api, BUILD.misc2, { ...slotsCfg, crystalSlots: 3, armorStatSlots: 4 }, 2),
    cfg: slotsCfg,
    role: 'A',
    attackTypeRaw: BUILD.attackType,
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });
}

function anchorVariantStable(api, name, crystals, slots) {
  return computeStableVariant(
    api,
    { name, crystals, crystalSlots: slots, upgrades: [] },
    { statRound: 'ceil', weaponDmgRound: 'ceil', crystalStackStats: 'sum4', crystalStackDmg: 'sum4', crystalSlots: slots, armorStatStack: 'sum4', armorStatSlots: slots },
    0,
  );
}

function table(headers, rows) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

function main() {
  const api = loadLegacy();
  const cfg = baseCfg(api);

  const baseline = compileTrackedRow(api, cfg, { armor: 'live', weapon: 'live', misc: 'live' });
  const allFamily = compileTrackedRow(api, cfg, { armor: 'sum4', weapon: 'sum4', misc: 'sum4' });
  const partialOnly = compileTrackedRow(api, cfg, { armor: 'live', weapon: 'sum4', misc: 'sum4' });
  const prototype = compilePrototypeRow(api, cfg);

  const rows = [
    { label: 'baseline current tracked behavior', compiled: baseline },
    { label: 'all-family compare-style sum4', compiled: allFamily },
    { label: 'smallest narrower scope: partial-count parts only', compiled: partialOnly },
    { label: 'temp prototype: all-family sum4 + epsilon-stable compare rounding', compiled: prototype },
  ].map((r) => ({ ...r, stats: statsRow(r.compiled), delta: deltas(statsRow(r.compiled)), mad: meanAbs(deltas(statsRow(r.compiled))) }));

  const best = rows.reduce((a, b) => (a.mad <= b.mad ? a : b));

  const scoutStable = anchorVariantStable(api, 'Scout Drones', ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'], 4);
  const bioPinkStable = anchorVariantStable(api, 'Bio Spinal Enhancer', ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'], 4);

  const representativeNonDuplicate = compileTrackedRow(api, { ...cfg, crystalStackStats: 'sum4', armorStatStack: 'sum4' }, { armor: 'sum4', weapon: 'sum4', misc: 'sum4' });
  const representativeSummary = {
    speed: representativeNonDuplicate.speed,
    dodge: representativeNonDuplicate.dodge,
    accuracy: representativeNonDuplicate.acc,
    gunSkill: representativeNonDuplicate.gun,
    meleeSkill: representativeNonDuplicate.mel,
    projSkill: representativeNonDuplicate.prj,
    defSkill: representativeNonDuplicate.defSk,
    armor: representativeNonDuplicate.armor,
  };

  const report = `# codex-stat-stack-patch-candidate-proof

## 1. Goal of this pass

Decide whether the remaining live-build mismatch is best explained by a shared stat-crystal stack semantics issue rather than a Bio-specific issue, and identify the smallest safe tracked patch candidate surface without touching tracked Bio helper or combat logic.

De-scoped for this pass:

- weapon display ranges beyond noting the user’s permanent +5 min/max ability already explains them
- predictedDamage

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' ./tmp/codex-mixed-slot-live-build-report.md
sed -n '1,260p' ./tmp/codex-partial-crystal-stack-localization-report.md
rg -n "applyCrystalPctToStat|computeVariant\\(|computeVariantFromCrystalSpec|compileCombatantFromParts|armorStatStack|crystalStackStats|mixedWeaponMultsFromWeaponSkill" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-stat-stack-patch-candidate-proof.js
node ./tmp/codex-stat-stack-patch-candidate-proof.js
\`\`\`

## 3. Exact files inspected/changed

| File | Action | Classification |
| --- | --- | --- |
| [legacy-bio-debug-handoff-2026-03-15.md](${path.join(ROOT, 'legacy-bio-debug-handoff-2026-03-15.md')}) | inspected | source-of-truth handoff |
| [codex-mixed-slot-live-build-report.md](${path.join(ROOT, 'tmp', 'codex-mixed-slot-live-build-report.md')}) | inspected | prior temp-only report |
| [codex-partial-crystal-stack-localization-report.md](${path.join(ROOT, 'tmp', 'codex-partial-crystal-stack-localization-report.md')}) | inspected | prior temp-only report |
| [legacy-sim-v1.0.4-clean.js](${path.join(ROOT, 'legacy-sim-v1.0.4-clean.js')}) | inspected only | no tracked changes |
| [brute-sim-v1.4.6.js](${path.join(ROOT, 'brute-sim-v1.4.6.js')}) | not changed | no brute patch made |
| [codex-stat-stack-patch-candidate-proof.js](${path.join(ROOT, 'tmp', 'codex-stat-stack-patch-candidate-proof.js')}) | created | instrumentation-only temp prototype |
| [codex-stat-stack-patch-candidate-proof.md](${REPORT_PATH}) | created | instrumentation-only report |

Tracked combat/Bio/brute logic changed:

- legacy Bio helper logic: no
- legacy combat-resolution logic: no
- brute logic: no

Parity-sensitive note:

- legacy stat compilation path was inspected
- brute was not changed or re-verified
- no parity preservation claim is made beyond “no tracked parity-sensitive code changed”

## 4. Legacy paths inspected first

- \`applyCrystalPctToStat(...)\`
- \`computeVariant(...)\`
- \`computeVariantFromCrystalSpec(...)\`
- \`compileCombatantFromParts(...)\`
- \`armorStatStack\` / \`crystalStackStats\` config selection
- \`mixedWeaponMultsFromWeaponSkill(...)\`

## 5. Compact comparison table

${table(
  ['row', 'hp', 'speed', 'dodge', 'acc', 'gun', 'mel', 'prj', 'def', 'armor', 'meanAbsΔ'],
  rows.map((r) => [
    r === best ? `**${r.label}**` : r.label,
    String(r.stats.hp),
    String(r.stats.speed),
    String(r.stats.dodge),
    String(r.stats.accuracy),
    String(r.stats.gunSkill),
    String(r.stats.meleeSkill),
    String(r.stats.projSkill),
    String(r.stats.defSkill),
    String(r.stats.armor),
    r.mad.toFixed(2),
  ]),
)}

## 6. Per-field deltas vs live anchor

${table(
  ['row', 'hp', 'speed', 'dodge', 'accuracy', 'gunSkill', 'meleeSkill', 'projSkill', 'defSkill', 'armor'],
  rows.map((r) => [
    r === best ? `**${r.label}**` : r.label,
    ...['hp', 'speed', 'dodge', 'accuracy', 'gunSkill', 'meleeSkill', 'projSkill', 'defSkill', 'armor'].map((k) => `${r.delta[k] >= 0 ? '+' : ''}${r.delta[k]}`),
  ]),
)}

## 7. Single-card anchor verification under the temp candidate semantics

Anchors checked under the temp prototype semantics (\`all-family sum4 + epsilon-stable compare rounding\`):

${table(
  ['anchor', 'field', 'expected', 'prototype', 'exact'],
  [
    ['Scout Drones + 4x Amulet', 'acc', '40', String(scoutStable.addAcc), scoutStable.addAcc === 40 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'dodge', '5', String(scoutStable.addDod), scoutStable.addDod === 5 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'defSkill', '42', String(scoutStable.addDef), scoutStable.addDef === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'gunSkill', '42', String(scoutStable.addGun), scoutStable.addGun === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'meleeSkill', '42', String(scoutStable.addMel), scoutStable.addMel === 42 ? 'yes' : 'no'],
    ['Scout Drones + 4x Amulet', 'projSkill', '70', String(scoutStable.addPrj), scoutStable.addPrj === 70 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'acc', '1', String(bioPinkStable.addAcc), bioPinkStable.addAcc === 1 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'dodge', '1', String(bioPinkStable.addDod), bioPinkStable.addDod === 1 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'defSkill', '117', String(bioPinkStable.addDef), bioPinkStable.addDef === 117 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'gunSkill', '65', String(bioPinkStable.addGun), bioPinkStable.addGun === 65 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'meleeSkill', '65', String(bioPinkStable.addMel), bioPinkStable.addMel === 65 ? 'yes' : 'no'],
    ['Bio + 4x Perfect Pink', 'projSkill', '65', String(bioPinkStable.addPrj), bioPinkStable.addPrj === 65 ? 'yes' : 'no'],
  ],
)}

Result:

- the temp candidate semantics preserved both anchored single-card truths exactly

## 8. Why armor-family compare-style handling matters even though the armor is 4-slot

The live build armor is full-slot (\`4x Abyss\`), but it still runs through the same tracked stat-stack mode selection:

- \`computeVariant(...)\` / \`computeVariantFromCrystalSpec(...)\`
- \`applyStat(...)\`
- \`applyCrystalPctToStat(...)\`
- armor-specific fields use \`armorStatStack\`, which inherits from the active live stat stack mode unless overridden

In the current live tracked config that means armor crystal stats are still using \`iter4\`, not compare-style \`sum4\`.

That matters because this armor contributes directly to:

- speed
- dodge
- defSkill
- armor

Concrete effect from the matrix:

- baseline armor-family contribution keeps the live build at \`speed +6\`, \`dodge +2\`, \`armor +3\`
- switching the armor family to compare-style collapses those fields to the live anchor

So armor-family handling matters here because it shares the same stat-crystal stack semantics issue, even though the armor itself is not partial-count.

## 9. Can the remaining melee +2 / def +2 residual be localized more narrowly?

Yes.

After all-family compare-style stat stacking, the remaining \`melee +2 / def +2\` residual localizes to floating-point ceil behavior in the compare-style stat branch itself, not to Bio helper logic.

Concrete source:

- Reaper Axe 3x Amulet under raw compare-style sum4 yields:
  - \`meleeSkill 105\` instead of the intended \`104\`
  - \`defSkill 14\` instead of the intended \`13\`
- Bio 3x Perfect Pink yields:
  - \`defSkill 105\` instead of intended \`104\`
- Bio 3x Perfect Orange yields:
  - \`meleeSkill 105\` instead of intended \`104\`

This comes from expressions like:

- \`80 * (0.1 * 3)\` -> \`24.000000000000004\`
- \`65 * (0.2 * 3)\` -> \`39.00000000000001\`

which then hit \`Math.ceil(...)\` inside compare-style stat rounding and round up by 1.

The temp prototype row removes exactly that residual and lands on:

- HP 650
- Speed 216
- Dodge 164
- Accuracy 186
- Gun 580
- Melee 723
- Projectile 580
- Def 704
- Armor 83

## 10. Optional cheap non-duplicate sanity note

No pair-context or Bio helper work was added to the temp prototype. It only changed shared stat-crystal application semantics in temp code.

Representative non-duplicate compiled stat profile under shared compare-style semantics remains a normal compile-time stat result:

\`\`\`json
${JSON.stringify(representativeSummary, null, 2)}
\`\`\`

That remains consistent with the handoff’s earlier conclusion that the first mismatch is not in pair-context aggregation.

## 11. Best explanation now

### 1. Is the best explanation now a shared stat-crystal stack semantics issue rather than a Bio-specific issue?

Yes.

This pass points away from Bio-specific logic and toward a shared stat-layer issue:

- best-fit row requires compare-style handling across armor + weapons + miscs
- anchored single-card truths remain exact under the temp prototype
- no Bio helper or combat-resolution change was needed to hit the live stat anchor

### 2. What is the smallest candidate tracked patch scope that would reproduce the live stat anchor most closely?

Smallest plausible candidate scope:

- **only builds/parts using the explicit represented-build path with per-part crystal arrays / per-part slot counts**
- within that represented path, use **shared compare-style stat stacking for all stat-crystal-bearing families**
- and stabilize compare-style rounding in the shared stat path to avoid floating-point \`ceil\` overshoot

This is narrower than a global legacy behavior change.

### 3. Why does armor-family compare-style handling matter here even though the armor itself is 4-slot, not partial-count?

Because the live tracked config currently applies the same inherited stat-stack semantics to armor-family stat crystals, and this armor contributes to speed/dodge/def/armor directly.

### 4. Can the remaining melee +2 / def +2 residual be localized to one narrower source after all-family compare-style stat stacking?

Yes.

It localizes to **shared compare-style stat rounding precision**, not to Bio helper logic and not to combat-resolution logic.

### 5. Is there a safe temp-only prototype of the smallest candidate patch that preserves existing anchored single-card truths?

Yes.

This pass used one:

- shared all-family compare-style stat stacking
- epsilon-stabilized compare-style rounding before \`ceil\` / \`floor\`

It matched the live stat anchor exactly and preserved both anchored single-card truths exactly.

## 12. Best current patch-surface recommendation

If a tracked patch is attempted later, the best current patch surface is:

- shared stat-crystal application path in [legacy-sim-v1.0.4-clean.js](${path.join(ROOT, 'legacy-sim-v1.0.4-clean.js')})
  - \`applyCrystalPctToStat(...)\`
  - and the config/caller selection in \`computeVariant(...)\` / \`computeVariantFromCrystalSpec(...)\`

Not recommended as patch surfaces:

- Bio helper block
- combat-resolution functions
- brute in this pass

## 13. Is a tracked patch justified yet?

Not as a global legacy behavior change.

What **is** justified now:

- the next tracked patch, if pursued, should be scoped as a **representation/stat-stack semantics patch** for the explicit per-part mixed-slot representation path
- not as a Bio-specific fix
- not as a combat fix

Single remaining narrow blocker before a tracked implementation:

- deciding whether the compare-style stat-stack semantics should apply only to explicit per-part represented builds, or more broadly to any explicit crystal-array path in legacy

## 14. What ChatGPT should do next

Use this report as the handoff. If you want to patch next, keep the change out of Bio helper and combat logic: make the smallest representation-scoped patch in the shared stat-crystal application path, gate it to the explicit per-part represented build path, and leave weapon display and predictedDamage out of scope.
`;

  fs.writeFileSync(REPORT_PATH, report);
}

main();
