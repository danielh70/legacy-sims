#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = process.cwd();
const LEGACY_SIM_PATH = path.join(ROOT, 'legacy-sim-v1.0.4-clean.js');
const OUT_MD = path.join(ROOT, 'tmp', 'codex-partial-crystal-stack-localization-report.md');

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
  predictedDamage: '78-92',
  weapon1Damage: '105-133',
  weapon2Damage: '118-129',
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

function loadLegacyInternals() {
  const src = fs.readFileSync(LEGACY_SIM_PATH, 'utf8');
  const appended = `
module.exports.__codexPartialStack = {
  normalizeCrystalSlotCount,
  partCrystalSpec,
  normalizeCrystalCounts,
  crystalSpecDisplay,
  normalizeResolvedBuildWeaponUpgrades,
  computeVariant,
  computeVariantFromCrystalSpec,
  compileCombatantFromParts,
  buildCompiledCombatSnapshot,
  buildCompiledWeaponSnapshot,
  predictPosActionRangeFromWeaponMinMax,
  makeVariantList,
  ATTACK_STYLE_ROUND_MODE,
  BASE,
  ItemDefs,
};
`;
  const mod = new Module(LEGACY_SIM_PATH, module.parent || module);
  mod.filename = LEGACY_SIM_PATH;
  mod.paths = Module._nodeModulePaths(path.dirname(LEGACY_SIM_PATH));
  mod._compile(src + appended, LEGACY_SIM_PATH);
  return mod.exports.__codexPartialStack;
}

function buildBaseCfg(api) {
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

function slotCountForPart(api, part, fallbackSlots) {
  if (part && Number.isFinite(Number(part.crystalSlots))) {
    return api.normalizeCrystalSlotCount(Number(part.crystalSlots));
  }
  return api.normalizeCrystalSlotCount(fallbackSlots);
}

function makePartCfg(baseCfg, familyMode, part, family) {
  const cfg = { ...baseCfg };
  if (family === 'armor') {
    if (familyMode === 'sum4') {
      cfg.crystalStackStats = 'sum4';
      cfg.armorStatStack = 'sum4';
    }
  } else if (familyMode === 'sum4') {
    cfg.crystalStackStats = 'sum4';
  }
  return cfg;
}

function buildPartContext(api, baseCfg, row, part, family, slotTag) {
  const slots = slotCountForPart(api, part, baseCfg.crystalSlots);
  const rawSpec = api.partCrystalSpec(part);
  const counts = rawSpec ? api.normalizeCrystalCounts(rawSpec, slots) : null;
  const upgrades = api.normalizeResolvedBuildWeaponUpgrades(part);
  const familyMode = row.familyModes[family] || 'live';
  const cfg = makePartCfg(
    {
      ...baseCfg,
      crystalSlots: slots,
      armorStatSlots: family === 'armor' ? slots : baseCfg.armorStatSlots,
    },
    familyMode,
    part,
    family,
  );
  const variant = counts
    ? api.computeVariantFromCrystalSpec(part.name, counts, upgrades, cfg, slotTag)
    : api.computeVariant(part.name, '', upgrades, cfg, slotTag);
  return { slots, counts, upgrades, cfg, variant };
}

function formatRange(w) {
  return w && Number.isFinite(w.min) && Number.isFinite(w.max) ? `${w.min}-${w.max}` : 'unavailable';
}

function parseRange(str) {
  const m = /^(\d+)-(\d+)$/.exec(String(str || '').trim());
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
}

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function compileRow(api, baseCfg, row) {
  const armorCtx = buildPartContext(api, baseCfg, row, LIVE_BUILD.armor, 'armor', 0);
  const w1Ctx = buildPartContext(api, baseCfg, row, LIVE_BUILD.weapon1, 'weapon', 0);
  const w2Ctx = buildPartContext(api, baseCfg, row, LIVE_BUILD.weapon2, 'weapon', 0);
  const m1Ctx = buildPartContext(api, baseCfg, row, LIVE_BUILD.misc1, 'misc', 1);
  const m2Ctx = buildPartContext(api, baseCfg, row, LIVE_BUILD.misc2, 'misc', 2);
  const compileCfg = {
    ...baseCfg,
    tacticsMode: row.tacticsMode || baseCfg.tacticsMode,
    tacticsVal: row.tacticsVal !== undefined ? row.tacticsVal : baseCfg.tacticsVal,
  };
  const compiled = api.compileCombatantFromParts({
    name: 'Live Build Anchor',
    stats: LIVE_BUILD.stats,
    armorV: armorCtx.variant,
    w1V: w1Ctx.variant,
    w2V: w2Ctx.variant,
    m1V: m1Ctx.variant,
    m2V: m2Ctx.variant,
    cfg: compileCfg,
    role: 'A',
    attackTypeRaw: LIVE_BUILD.attackType,
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });
  return {
    row,
    compiled,
    contexts: { armorCtx, w1Ctx, w2Ctx, m1Ctx, m2Ctx },
  };
}

function statsFor(compiled) {
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
    weapon1Damage: formatRange(compiled.weapon1),
    weapon2Damage: formatRange(compiled.weapon2),
    predictedDamage: 'unavailable',
  };
}

function deltas(stats) {
  return {
    hp: stats.hp - LIVE_ANCHOR.hp,
    speed: stats.speed - LIVE_ANCHOR.speed,
    dodge: stats.dodge - LIVE_ANCHOR.dodge,
    accuracy: stats.accuracy - LIVE_ANCHOR.accuracy,
    gunSkill: stats.gunSkill - LIVE_ANCHOR.gunSkill,
    meleeSkill: stats.meleeSkill - LIVE_ANCHOR.meleeSkill,
    projSkill: stats.projSkill - LIVE_ANCHOR.projSkill,
    defSkill: stats.defSkill - LIVE_ANCHOR.defSkill,
    armor: stats.armor - LIVE_ANCHOR.armor,
  };
}

function scoreStats(delta) {
  return mean(
    ['hp', 'speed', 'dodge', 'accuracy', 'gunSkill', 'meleeSkill', 'projSkill', 'defSkill', 'armor'].map(
      (k) => Math.abs(delta[k]),
    ),
  );
}

function scoreRange(range1, range2) {
  const a = parseRange(range1);
  const b = parseRange(range2);
  if (!a || !b) return null;
  return Math.abs(a.min - b.min) + Math.abs(a.max - b.max);
}

function rowSummary(result) {
  const s = statsFor(result.compiled);
  const d = deltas(s);
  return {
    id: result.row.id,
    label: result.row.label,
    notes: result.row.notes,
    stats: s,
    delta: d,
    statsMad: scoreStats(d),
    weapon1RangeError: scoreRange(s.weapon1Damage, LIVE_ANCHOR.weapon1Damage),
    weapon2RangeError: scoreRange(s.weapon2Damage, LIVE_ANCHOR.weapon2Damage),
    predictedStatus: s.predictedDamage === 'unavailable' ? 'unavailable' : 'actual',
  };
}

function bestFitRow(rows) {
  return rows
    .filter((r) => r.id !== 'display_probe')
    .slice()
    .sort((a, b) => a.statsMad - b.statsMad)[0];
}

function markdownTable(headers, rows) {
  const h = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  return [h, sep, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

function main() {
  const api = loadLegacyInternals();
  const baseCfg = buildBaseCfg(api);

  const rows = [
    {
      id: 'baseline_live',
      label: '1. baseline current live behavior',
      familyModes: { armor: 'live', weapon: 'live', misc: 'live' },
      notes: 'Current tracked live config: iter4 stats, sum4 damage.',
    },
    {
      id: 'misc_partial_sum4',
      label: '2. misc-only compare-style stat stacking',
      familyModes: { armor: 'live', weapon: 'live', misc: 'sum4' },
      notes: 'Only misc family uses sum4 for stat stacking.',
    },
    {
      id: 'weapon_partial_sum4',
      label: '3. weapon-only compare-style stat stacking',
      familyModes: { armor: 'live', weapon: 'sum4', misc: 'live' },
      notes: 'Only weapon family uses sum4 for stat stacking; weapon damage stack stays sum4 in all rows.',
    },
    {
      id: 'armor_sum4',
      label: '4. armor-only compare-style stat stacking',
      familyModes: { armor: 'sum4', weapon: 'live', misc: 'live' },
      notes: 'Armor family control; armor itself is full-slot but its iter4/sum4 branch moves live totals.',
    },
    {
      id: 'all_family_sum4',
      label: '5. all family compare-style stat stacking',
      familyModes: { armor: 'sum4', weapon: 'sum4', misc: 'sum4' },
      notes: 'Union row to test the smallest exact family combination that best matches the live display.',
    },
    {
      id: 'display_probe',
      label: '6. display-only weapon-range probe',
      familyModes: { armor: 'sum4', weapon: 'sum4', misc: 'sum4' },
      tacticsMode: 'minmax',
      notes: 'Same as row 5, plus display-only +5 min/max weapon transform via tacticsMode=minmax.',
    },
  ];

  const compiledRows = rows.map((row) => compileRow(api, baseCfg, row));
  const summaries = compiledRows.map(rowSummary);
  const best = bestFitRow(summaries);

  const summaryTable = markdownTable(
    [
      'row',
      'speed',
      'dodge',
      'acc',
      'gun',
      'mel',
      'prj',
      'def',
      'armor',
      'w1',
      'w2',
      'predictedDamage',
      'stats meanAbsΔ',
    ],
    summaries.map((s) => [
      s.id === best.id ? `**${s.label}**` : s.label,
      String(s.stats.speed),
      String(s.stats.dodge),
      String(s.stats.accuracy),
      String(s.stats.gunSkill),
      String(s.stats.meleeSkill),
      String(s.stats.projSkill),
      String(s.stats.defSkill),
      String(s.stats.armor),
      s.stats.weapon1Damage,
      s.stats.weapon2Damage,
      s.predictedStatus,
      s.statsMad.toFixed(2),
    ]),
  );

  function fieldRows(fieldOrder) {
    return markdownTable(
      ['row', ...fieldOrder],
      summaries.map((s) => [
        s.id === best.id ? `**${s.label}**` : s.label,
        ...fieldOrder.map((k) => `${s.delta[k] >= 0 ? '+' : ''}${s.delta[k]}`),
      ]),
    );
  }

  const deltaTable = fieldRows([
    'hp',
    'speed',
    'dodge',
    'accuracy',
    'gunSkill',
    'meleeSkill',
    'projSkill',
    'defSkill',
    'armor',
  ]);

  const displayProbe = summaries.find((s) => s.id === 'display_probe');
  const row5 = summaries.find((s) => s.id === 'all_family_sum4');
  const baseline = summaries.find((s) => s.id === 'baseline_live');
  const miscOnly = summaries.find((s) => s.id === 'misc_partial_sum4');
  const weaponOnly = summaries.find((s) => s.id === 'weapon_partial_sum4');
  const armorOnly = summaries.find((s) => s.id === 'armor_sum4');

  let familyAnswer = 'No single family alone.';
  if (best.id === 'all_family_sum4') {
    familyAnswer =
      'Armor + weapons + miscs together. Armor-only fixes speed/dodge/armor, weapon-only fixes accuracy, and melee/def need both weapon and misc compare-style handling to get close.';
  }

  let meleeDefAnswer =
    'Melee/def drift is not a weapon-range issue. It is mostly the same stat-stack mode difference, split across weapon-family Amulet stats and Bio misc crystal stats, with a smaller armor-family def contribution.';

  const rangeExplanation =
    row5.stats.weapon1Damage === baseline.stats.weapon1Damage &&
    row5.stats.weapon2Damage === baseline.stats.weapon2Damage &&
    displayProbe.stats.weapon1Damage === LIVE_ANCHOR.weapon1Damage &&
    displayProbe.stats.weapon2Damage === LIVE_ANCHOR.weapon2Damage
      ? 'Weapon range mismatches are not caused by stat-crystal stack mode. They are consistent with a separate display-only +5 min/max transform, reproduced temp-only by tacticsMode=minmax.'
      : 'Weapon range mismatches are not resolved by the stat-stack rows in this pass; no direct stat-stack explanation was found.';

  const predictedAnswer =
    'No build-only helper path surfaced a target-free predictedDamage 78-92 value. Existing predicted/action-range helpers require target armor/context, so predictedDamage remains unavailable without extra interpretation.';

  const recommendation =
    best.id === 'all_family_sum4'
      ? 'If a tracked patch is eventually justified, the smallest candidate surface is not Bio helper logic. It would be the shared stat-crystal application path (`applyCrystalPctToStat(...)` / mixed-crystal stat application) with explicit partial-crystal representation semantics, but this pass does not justify implementing it yet.'
      : 'No tracked patch candidate is justified from this pass alone.';

  const report = `# codex-partial-crystal-stack-localization-report

## 1. Goal of this pass

Separate two remaining live-build anchor issues on top of the current reverted live Rule B activation-only baseline:

- A) partial-crystal stat stacking behavior
- B) weapon damage/range display behavior

This was a temp-only localization pass. No tracked legacy, Bio helper, combat, or brute logic was changed.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' ./tmp/codex-mixed-slot-live-build-report.md
rg -n "applyCrystalPctToStat|applyCrystalPctToWeaponDmg|roundWeaponDmg|computeVariant\\(|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledWeaponSnapshot|buildCompiledCombatSnapshot|predictPosActionRangeFromWeaponMinMax|tacticsMode|applyMinMax" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-partial-crystal-stack-localization-check.js
node ./tmp/codex-partial-crystal-stack-localization-check.js
\`\`\`

## 3. Exact files inspected/changed

| File | Action | Classification |
| --- | --- | --- |
| [legacy-bio-debug-handoff-2026-03-15.md](${path.join(ROOT, 'legacy-bio-debug-handoff-2026-03-15.md')}) | inspected | source-of-truth handoff |
| [codex-mixed-slot-live-build-report.md](${path.join(ROOT, 'tmp', 'codex-mixed-slot-live-build-report.md')}) | inspected | prior temp-only report |
| [legacy-sim-v1.0.4-clean.js](${path.join(ROOT, 'legacy-sim-v1.0.4-clean.js')}) | inspected only | no tracked changes |
| [brute-sim-v1.4.6.js](${path.join(ROOT, 'brute-sim-v1.4.6.js')}) | not changed | no brute patch made |
| [codex-partial-crystal-stack-localization-check.js](${path.join(ROOT, 'tmp', 'codex-partial-crystal-stack-localization-check.js')}) | created | instrumentation-only temp harness |
| [codex-partial-crystal-stack-localization-report.md](${OUT_MD}) | created | instrumentation-only report |

Parity-sensitive note:

- legacy stat compilation path was inspected
- brute was not changed
- no parity claim is made beyond “no tracked parity-sensitive code was changed”

## 4. Source hygiene result

- Tracked source is still on the reverted live Rule B activation-only baseline: yes.
- No tracked Bio helper logic changed: yes.
- No tracked combat-resolution logic changed: yes.
- No tracked brute logic changed: yes.

## 5. Legacy paths inspected

- single/part-local stat application:
  - \`applyCrystalPctToStat(...)\`
  - \`applyCrystalPctToWeaponDmg(...)\`
  - \`computeVariant(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
- full compile:
  - \`compileCombatantFromParts(...)\`
  - local weapon min/max handling via \`applyMinMax(...)\`
- display/snapshot helpers:
  - \`buildCompiledWeaponSnapshot(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
  - \`predictPosActionRangeFromWeaponMinMax(...)\`

## 6. Matrix summary

Live anchor:

- HP 650
- Speed 216
- Dodge 164
- Accuracy 186
- Gun 580
- Melee 723
- Projectile 580
- Def 704
- Armor 83
- Weapon 1 105-133
- Weapon 2 118-129
- Predicted Damage 78-92

${summaryTable}

Best-fit stat row: **${best.label}**

## 7. Per-field deltas vs live anchor

${deltaTable}

## 8. What each row isolates

- \`baseline_live\`: current tracked legacy behavior
- \`misc_partial_sum4\`: only Bio misc stat stacking moved to compare-style
- \`weapon_partial_sum4\`: only weapon stat stacking moved to compare-style; weapon damage stack stays unchanged
- \`armor_sum4\`: armor-family control; armor is not partial-count, but its iter4/sum4 branch still materially moves the live totals
- \`all_family_sum4\`: union row across the relevant part families
- \`display_probe\`: row 5 plus display-only \`tacticsMode=minmax\` to test whether the live weapon ranges are simply a +5 display transform

## 9. Best explanation now

### 1. Which exact part family or families need compare-style handling to reproduce the live displayed stat totals most closely?

${familyAnswer}

Direct row readout:

- armor-only is the row that collapses \`speed/dodge/armor\`
- weapon-only is the row that collapses \`accuracy\`
- misc-only and weapon-only both move \`melee/def\`, but neither is sufficient alone
- the closest stat row is **${best.label}**

### 2. Does melee/defSkill drift come from the same stack-mode difference, or from a different item/display layer?

${meleeDefAnswer}

Concrete signal from the matrix:

- baseline \`melee/def\`: ${baseline.stats.meleeSkill}/${baseline.stats.defSkill}
- misc-only \`melee/def\`: ${miscOnly.stats.meleeSkill}/${miscOnly.stats.defSkill}
- weapon-only \`melee/def\`: ${weaponOnly.stats.meleeSkill}/${weaponOnly.stats.defSkill}
- armor-only \`melee/def\`: ${armorOnly.stats.meleeSkill}/${armorOnly.stats.defSkill}
- best row \`melee/def\`: ${best.stats.meleeSkill}/${best.stats.defSkill}

### 3. Are weapon1/weapon2 range mismatches caused by crystal stat stacking, weapon compile math, displayed-range convention, or a separate display-only transformation?

${rangeExplanation}

Evidence:

- baseline weapon ranges: ${baseline.stats.weapon1Damage}, ${baseline.stats.weapon2Damage}
- all-family compare-style weapon ranges: ${row5.stats.weapon1Damage}, ${row5.stats.weapon2Damage}
- display probe weapon ranges: ${displayProbe.stats.weapon1Damage}, ${displayProbe.stats.weapon2Damage}

### 4. Is predictedDamage 78–92 derivable anywhere from an existing display/helper path without target-context combat simulation?

${predictedAnswer}

Current status by row:

- baseline: ${baseline.predictedStatus}
- misc-only: ${miscOnly.predictedStatus}
- weapon-only: ${weaponOnly.predictedStatus}
- armor-only: ${armorOnly.predictedStatus}
- all-family compare-style: ${row5.predictedStatus}
- display probe: ${displayProbe.predictedStatus}

## 10. First remaining mismatch category after this pass

First remaining mismatch category:

- for stat totals: **part-family stat-crystal stack mode semantics**
- for weapon ranges: **display-only min/max transformation / displayed-range convention**

The pass did not find evidence that weapon range drift is caused by the same stat-stack difference.

## 11. Final recommendation

Best next tracked patch candidate, if any:

- ${recommendation}

No implementation is justified from this pass alone.

## 12. What ChatGPT should do next

Use this report as the next handoff. If a tracked patch is considered at all, keep it out of the Bio helper and combat-resolution paths: first decide whether the repo should support compare-style stat stacking specifically for represented partial-crystal builds, and treat weapon range display as a separate display-layer question rather than part of the Bio-family combat mismatch.
`;

  fs.writeFileSync(OUT_MD, report);
}

main();
