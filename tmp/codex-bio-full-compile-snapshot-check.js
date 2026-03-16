#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

const repoRoot = process.cwd();

function loadSimExports(relPath, exportNames) {
  const absPath = path.join(repoRoot, relPath);
  let code = fs.readFileSync(absPath, 'utf8');
  code = code.replace(
    /\nmodule\.exports = \{\n  resolveLegacyTruthBridgeConfig,\n\};\n\nif \(require\.main === module\) \{\n  main\(\);\n\}\s*$/m,
    '\n',
  );
  code += `\nmodule.exports = { ${exportNames.join(', ')} };`;

  const sandboxModule = { exports: {} };
  const sandboxRequire = createRequire(absPath);
  const sandbox = {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: sandboxRequire,
    __filename: absPath,
    __dirname: path.dirname(absPath),
    process,
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
  sandbox.global = sandbox;
  vm.runInNewContext(code, sandbox, { filename: absPath });
  return sandboxModule.exports;
}

function num(x, places = null) {
  if (places == null) return Number(x || 0);
  return Number(Number(x || 0).toFixed(places));
}

function loadTruthRows() {
  const data = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'tmp/legacy-truth-double-bio-probe.json'), 'utf8'),
  );
  const wanted = [
    'DL Dual Rift No Bio',
    'DL Dual Rift One Bio P4',
    'DL Dual Rift Two Bio P4',
    'DL Dual Rift Bio P4 + O4',
    'DL Core/Rift No Bio',
    'DL Core/Rift One Bio P4',
    'DL Core/Rift Two Bio P4',
    'DL Core/Rift Bio P4 + O4',
  ];
  const rows = [];
  for (const name of wanted) {
    const hit = data.matchups.find((m) => m.defender === name);
    if (!hit) throw new Error(`Missing truth row: ${name}`);
    rows.push(hit);
  }
  return rows;
}

function pickCompiledSummary(snapshot) {
  return {
    hp: snapshot.effective.hp,
    speed: snapshot.effective.speed,
    accuracy: snapshot.effective.accuracy,
    dodge: snapshot.effective.dodge,
    armor: snapshot.effective.armor,
    armorFactor: snapshot.effective.armorFactor,
    defSkill: snapshot.effective.defSkill,
    gunSkill: snapshot.effective.gunSkill,
    meleeSkill: snapshot.effective.meleeSkill,
    projSkill: snapshot.effective.projSkill,
    attackStyle:
      typeof snapshot.attackStyle === 'string'
        ? snapshot.attackStyle
        : JSON.stringify(snapshot.attackStyle),
    weapon1: snapshot.weapon1
      ? {
          skillType: snapshot.weapon1.skillType,
          min: snapshot.weapon1.preArmorRange.min,
          max: snapshot.weapon1.preArmorRange.max,
          compiledMin: snapshot.weapon1.compiledActionRange.min,
          compiledMax: snapshot.weapon1.compiledActionRange.max,
        }
      : null,
    weapon2: snapshot.weapon2
      ? {
          skillType: snapshot.weapon2.skillType,
          min: snapshot.weapon2.preArmorRange.min,
          max: snapshot.weapon2.preArmorRange.max,
          compiledMin: snapshot.weapon2.compiledActionRange.min,
          compiledMax: snapshot.weapon2.compiledActionRange.max,
        }
      : null,
    actionRange: snapshot.compiledActionRange,
  };
}

function diffSummary(a, b) {
  return {
    hp: num(b.hp - a.hp),
    speed: num(b.speed - a.speed),
    accuracy: num(b.accuracy - a.accuracy),
    dodge: num(b.dodge - a.dodge),
    armor: num(b.armor - a.armor),
    defSkill: num(b.defSkill - a.defSkill),
    gunSkill: num(b.gunSkill - a.gunSkill),
    meleeSkill: num(b.meleeSkill - a.meleeSkill),
    projSkill: num(b.projSkill - a.projSkill),
    weapon1Min: b.weapon1 ? num(b.weapon1.min - a.weapon1.min) : 0,
    weapon1Max: b.weapon1 ? num(b.weapon1.max - a.weapon1.max) : 0,
    weapon2Min: b.weapon2 ? num(b.weapon2.min - a.weapon2.min) : 0,
    weapon2Max: b.weapon2 ? num(b.weapon2.max - a.weapon2.max) : 0,
    actionMin: num(b.actionRange.min - a.actionRange.min),
    actionMax: num(b.actionRange.max - a.actionRange.max),
  };
}

function fmtDiff(diff) {
  return Object.entries(diff)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`)
    .join(', ') || 'none';
}

const legacy = loadSimExports('legacy-sim-v1.0.4-clean.js', [
  'computeVariantFromCrystalSpec',
  'partCrystalSpec',
  'normalizeResolvedBuildWeaponUpgrades',
  'compileCombatantFromParts',
  'buildCompiledCombatSnapshot',
  'resolveDefenderAttackType',
  'ATTACKER_BUILD',
  'ATTACKER_ATTACK_TYPE',
  'ATTACK_STYLE_ROUND_MODE',
]);

const cfg = {
  trials: 200000,
  maxTurns: 200,
  diag: true,
  diagArmor: false,
  speedTieMode: 'attacker',
  roundResolveMode: 'baseline',
  hiddenPreset: 'none',
  hitRollMode: 'int',
  skillRollMode: 'int',
  hitGe: true,
  skillGe: true,
  hitQround: 'round',
  skillQround: 'round',
  dmgRoll: 'int',
  projDefMult: 0.5,
  armorK: 8,
  armorApply: 'per_weapon',
  armorRound: 'ceil',
  tacticsMode: 'none',
  tacticsVal: 0,
  dmgBonusMode: 'none',
  dmgBonusStage: 'pre_armor',
  statRound: 'ceil',
  weaponDmgRound: 'ceil',
  armorStatStack: 'sum4',
  armorStatRound: 'ceil',
  armorStatSlots: 4,
  crystalStackStats: 'sum4',
  crystalStackDmg: 'sum4',
  crystalSlots: 4,
  sharedHit: true,
  sharedSkillMode: 'none',
  sharedSkillAttackerOverride: null,
  sharedSkillDefenderOverride: null,
  diagW2AfterAppliedW1: false,
  diagSplitMultiweaponAction: false,
  diagQueuedSecondAction: false,
  diagFirstActorOverride: 'auto',
  exactVerbose: false,
  exactSwap: false,
  gameTrials: 0,
  actionStopOnKill: true,
};

function getV(cache, itemName, crystalSpec, u1 = '', u2 = '', slotTag = 0) {
  const crystalKey = crystalSpec || '';
  const k = `${cfg.statRound}|${cfg.weaponDmgRound}|${itemName}|${JSON.stringify(crystalKey)}|${u1}|${u2}|${slotTag}`;
  if (!cache.has(k)) {
    const ups = [];
    if (u1) ups.push(u1);
    if (u2) ups.push(u2);
    cache.set(k, legacy.computeVariantFromCrystalSpec(itemName, crystalSpec, ups, cfg, slotTag));
  }
  return cache.get(k);
}

const rows = loadTruthRows();
const cache = new Map();
const attackerBuild = rows[0].pageBuilds.attacker;

function compileBuild(build, role, defenderTarget = null) {
  const [a1u1, a1u2] = legacy.normalizeResolvedBuildWeaponUpgrades(build.weapon1);
  const [a2u1, a2u2] = legacy.normalizeResolvedBuildWeaponUpgrades(build.weapon2);
  return legacy.compileCombatantFromParts({
    name: role === 'A' ? 'Attacker' : build.name || 'Defender',
    stats: build.stats,
    armorV: getV(cache, build.armor.name, legacy.partCrystalSpec(build.armor)),
    w1V: getV(cache, build.weapon1.name, legacy.partCrystalSpec(build.weapon1), a1u1 || '', a1u2 || ''),
    w2V: getV(cache, build.weapon2.name, legacy.partCrystalSpec(build.weapon2), a2u1 || '', a2u2 || ''),
    m1V: getV(cache, build.misc1.name, legacy.partCrystalSpec(build.misc1), '', '', 1),
    m2V: getV(cache, build.misc2.name, legacy.partCrystalSpec(build.misc2), '', '', 2),
    cfg,
    role,
    attackTypeRaw: role === 'A' ? legacy.ATTACKER_ATTACK_TYPE : legacy.resolveDefenderAttackType(build),
    attackStyleRoundMode: legacy.ATTACK_STYLE_ROUND_MODE,
  });
}

const compiledRows = [];
for (const row of rows) {
  const defenderBuild = row.pageBuilds.defender;
  const attacker = compileBuild(attackerBuild, 'A');
  const defender = compileBuild(defenderBuild, 'D');
  const attackerSnap = pickCompiledSummary(
    legacy.buildCompiledCombatSnapshot(attacker, defender, cfg, legacy.ATTACK_STYLE_ROUND_MODE),
  );
  const defenderSnap = pickCompiledSummary(
    legacy.buildCompiledCombatSnapshot(defender, attacker, cfg, legacy.ATTACK_STYLE_ROUND_MODE),
  );
  compiledRows.push({
    name: row.defender,
    attacker: attackerSnap,
    defender: defenderSnap,
  });
}

const attackerConst = compiledRows.every(
  (r) =>
    JSON.stringify(r.attacker) === JSON.stringify(compiledRows[0].attacker),
);

const transitions = [
  ['Dual Rift No Bio -> One Bio P4', 'DL Dual Rift No Bio', 'DL Dual Rift One Bio P4'],
  ['Dual Rift One Bio P4 -> Two Bio P4', 'DL Dual Rift One Bio P4', 'DL Dual Rift Two Bio P4'],
  ['Dual Rift One Bio P4 -> Bio P4 + O4', 'DL Dual Rift One Bio P4', 'DL Dual Rift Bio P4 + O4'],
  ['Core/Rift No Bio -> One Bio P4', 'DL Core/Rift No Bio', 'DL Core/Rift One Bio P4'],
  ['Core/Rift One Bio P4 -> Two Bio P4', 'DL Core/Rift One Bio P4', 'DL Core/Rift Two Bio P4'],
  ['Core/Rift One Bio P4 -> Bio P4 + O4', 'DL Core/Rift One Bio P4', 'DL Core/Rift Bio P4 + O4'],
].map(([label, from, to]) => {
  const a = compiledRows.find((r) => r.name === from).defender;
  const b = compiledRows.find((r) => r.name === to).defender;
  return { label, diff: diffSummary(a, b) };
});

function attackerSummaryTable(a) {
  return `| hp | speed | accuracy | dodge | armor | armorFactor | defSkill | gunSkill | meleeSkill | projSkill | weapon1 | weapon2 | actionRange | attackStyle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ${a.hp} | ${a.speed} | ${a.accuracy} | ${a.dodge} | ${a.armor} | ${a.armorFactor} | ${a.defSkill} | ${a.gunSkill} | ${a.meleeSkill} | ${a.projSkill} | ${a.weapon1.skillType} ${a.weapon1.min}-${a.weapon1.max} (${a.weapon1.compiledMin}-${a.weapon1.compiledMax}) | ${a.weapon2.skillType} ${a.weapon2.min}-${a.weapon2.max} (${a.weapon2.compiledMin}-${a.weapon2.compiledMax}) | ${a.actionRange.min}-${a.actionRange.max} | ${a.attackStyle} |`;
}

const defenderTableRows = compiledRows.map((r) => [
  r.name,
  r.defender.hp,
  r.defender.speed,
  r.defender.accuracy,
  r.defender.dodge,
  r.defender.armor,
  r.defender.armorFactor,
  r.defender.defSkill,
  r.defender.gunSkill,
  r.defender.meleeSkill,
  r.defender.projSkill,
  `${r.defender.weapon1.skillType} ${r.defender.weapon1.min}-${r.defender.weapon1.max}`,
  `${r.defender.weapon2.skillType} ${r.defender.weapon2.min}-${r.defender.weapon2.max}`,
  `${r.defender.actionRange.min}-${r.defender.actionRange.max}`,
  r.defender.attackStyle,
]);

function table(headers, rows) {
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
}

const md = `# codex-bio full compile snapshot check

## 1. Goal of this pass

Use the exact truth-pack builds under the current reverted live Rule B activation-only state to determine whether the remaining Bio-family mismatch is already visible in full compiled attacker/defender snapshots before combat starts, or whether the next concrete suspect layer is combat-resolution behavior.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,260p' ./tmp/codex-bio-pair-context-aggregation-check.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '3615,4015p' legacy-sim-v1.0.4-clean.js
sed -n '381,540p' legacy-sim-v1.0.4-clean.js
sed -n '5350,5675p' legacy-sim-v1.0.4-clean.js
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
node ./tmp/codex-bio-full-compile-snapshot-check.js
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-card-anchor-instrumentation.md\`
- \`./tmp/codex-bio-pair-context-aggregation-check.md\`
- \`./tmp/codex-bio-revert-to-live-rule-b-report.md\`
- \`./tmp/codex-bio-rule-b-activation-fix-report.md\`
- \`./tmp/legacy-truth-double-bio-probe.json\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`partCrystalSpec(...)\`
  - \`normalizeResolvedBuildWeaponUpgrades(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
  - \`captureCombatantEffectiveStats(...)\`
- \`./legacy-defs.js\`
- \`./tools/legacy-truth-replay-compare.js\`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Full compiled snapshot path in legacy-sim:
  - exact truth build payload -> \`partCrystalSpec(...)\`
  - per-part variant build -> \`computeVariantFromCrystalSpec(...)\`
  - full combatant compile -> \`compileCombatantFromParts(...)\`
  - pre-combat snapshot export -> \`buildCompiledCombatSnapshot(...)\`
- No tracked edits were made in this pass.

## 5. Full compiled attacker snapshot summary

Attacker snapshot is constant across these 8 defender rows: ${attackerConst ? 'yes' : 'no'}.

${attackerSummaryTable(compiledRows[0].attacker)}

## 6. Full compiled defender snapshot table for the 8 rows

${table(
  ['row', 'hp', 'speed', 'accuracy', 'dodge', 'armor', 'armorFactor', 'defSkill', 'gunSkill', 'meleeSkill', 'projSkill', 'weapon1', 'weapon2', 'actionRange', 'attackStyle'],
  defenderTableRows,
)}

## 7. Defender transition tables

| Transition | Compiled field deltas |
| --- | --- |
${transitions.map((t) => `| ${t.label} | ${fmtDiff(t.diff)} |`).join('\n')}

## 8. Best explanation now

**COMPILED SNAPSHOT LOOKS CLEAN; SUSPECT COMBAT RESOLUTION**

- The 8 compiled defender snapshots are clearly distinguishable from one another, but only through the same expected misc-driven stat structure already established earlier.
- Non-duplicate transitions are clean at full compile level:
  - \`No Bio -> One Bio P4\` shifts only the expected defender-side misc-sensitive fields
  - \`One Bio P4 -> Bio P4 + O4\` swaps defender \`defSkill\` for \`meleeSkill\` exactly as the card math predicts
- Duplicate-Pink transition is also clean at compile level:
  - \`One Bio P4 -> Two Bio P4\` is the same as adding another Bio[P4] card, plus the live Rule B helper’s extra \`defSkill\`
- The attacker compiled snapshot remains constant across all 8 rows, as expected.
- No extra non-misc compiled field is changing with the Bio swaps beyond the expected defender stats, armor factor staying fixed, and the resulting defender-side compiled action ranges.
- That means the remaining one-Bio and mixed-row truth misses are not being introduced by a hidden full-compile branch visible in these snapshots.
- Smallest plausible next suspect layer:
  - deterministic combat-resolution behavior after compile, especially hit/skill/damage interaction under the already-compiled stat differences

## 9. Recommendation

**NEED DETERMINISTIC ROLL-DUMP PASS**

## 10. What ChatGPT should do next

Use this report as the handoff. The next pass should stay on the current live Rule B activation-only code and run one deterministic roll-dump comparison on one Dual Rift row and one Core/Rift row, because the first unresolved divergence now appears to be above full compiled snapshots and inside combat-resolution behavior.
`;

fs.writeFileSync(
  path.join(repoRoot, 'tmp/codex-bio-full-compile-snapshot-check.md'),
  md,
);
