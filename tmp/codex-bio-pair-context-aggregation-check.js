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

  if (relPath.includes('legacy-sim')) {
    code = code.replace(
      /\nmodule\.exports = \{\n  resolveLegacyTruthBridgeConfig,\n\};\n\nif \(require\.main === module\) \{\n  main\(\);\n\}\s*$/m,
      '\n',
    );
  } else if (relPath.includes('brute-sim')) {
    code = code.replace(
      /\nif \(isMainThread\) \{\n  main\(\)\.catch\(\(err\) => \{\n    console\.error\('\\nFatal:', err && err\.stack \? err\.stack : err\);\n    process\.exit\(1\);\n  \}\);\n\} else \{\n  workerMain\(\);\n\}\s*$/m,
      '\n',
    );
  }

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

function pickAdd(v) {
  return {
    acc: v.addAcc || 0,
    dodge: v.addDod || 0,
    defSkill: v.addDef || 0,
    gunSkill: v.addGun || 0,
    meleeSkill: v.addMel || 0,
    projSkill: v.addPrj || 0,
    speed: v.addSpeed || 0,
    armor: v.addArmStat || 0,
    crystalName: v.crystalName || null,
    itemName: v.itemName || null,
  };
}

function sumAdds(a, b) {
  return {
    acc: a.acc + b.acc,
    dodge: a.dodge + b.dodge,
    defSkill: a.defSkill + b.defSkill,
    gunSkill: a.gunSkill + b.gunSkill,
    meleeSkill: a.meleeSkill + b.meleeSkill,
    projSkill: a.projSkill + b.projSkill,
    speed: a.speed + b.speed,
    armor: a.armor + b.armor,
  };
}

function diffAdds(a, b) {
  return {
    acc: b.acc - a.acc,
    dodge: b.dodge - a.dodge,
    defSkill: b.defSkill - a.defSkill,
    gunSkill: b.gunSkill - a.gunSkill,
    meleeSkill: b.meleeSkill - a.meleeSkill,
    projSkill: b.projSkill - a.projSkill,
    speed: b.speed - a.speed,
    armor: b.armor - a.armor,
  };
}

function fmtVec(v) {
  return `acc ${v.acc}, dodge ${v.dodge}, def ${v.defSkill}, gun ${v.gunSkill}, mel ${v.meleeSkill}, prj ${v.projSkill}, spd ${v.speed}, arm ${v.armor}`;
}

function changedFields(v) {
  return Object.entries(v)
    .filter(([, val]) => val !== 0)
    .map(([k, val]) => `${k} ${val > 0 ? '+' : ''}${val}`)
    .join(', ') || 'none';
}

const legacy = loadSimExports('legacy-sim-v1.0.4-clean.js', [
  'computeVariant',
  'applyValidatedDuplicateBioPinkScaling',
  'compileCombatantFromParts',
  'BASE',
]);

const brute = loadSimExports('brute-sim-v1.4.6.js', [
  'computeVariant',
  'applyValidatedDuplicateBioPinkScaling',
  'VARIANT_CFG',
  'BASE',
]);

const legacyCfg = {
  statRound: 'ceil',
  weaponDmgRound: 'ceil',
  armorStatStack: 'sum4',
  armorStatRound: 'ceil',
  armorStatSlots: 4,
  crystalStackStats: 'sum4',
  crystalStackDmg: 'sum4',
  crystalSlots: 4,
  armorK: 8,
  tacticsMode: 'none',
  tacticsVal: 0,
  hiddenPreset: 'none',
  diag: false,
};

const zeroVariant = {
  itemName: 'ZERO',
  crystalName: '',
  addSpeed: 0,
  addAcc: 0,
  addDod: 0,
  addGun: 0,
  addMel: 0,
  addPrj: 0,
  addDef: 0,
  addArmStat: 0,
  weapon: null,
};

const zeroStats = {
  level: 80,
  hp: 865,
  speed: 0,
  accuracy: 0,
  dodge: 0,
};

const defs = {
  scoutP4: { itemName: 'Scout Drones', crystalName: 'Perfect Pink Crystal' },
  bioP4: { itemName: 'Bio Spinal Enhancer', crystalName: 'Perfect Pink Crystal' },
  bioO4: { itemName: 'Bio Spinal Enhancer', crystalName: 'Perfect Orange Crystal' },
};

function legacyVariant(spec, slotTag) {
  return legacy.computeVariant(spec.itemName, spec.crystalName, [], legacyCfg, slotTag);
}

function bruteVariant(spec, slotTag) {
  return brute.computeVariant(spec.itemName, spec.crystalName, '', '', slotTag);
}

const states = [
  ['Scout[P4] + Scout[P4]', defs.scoutP4, defs.scoutP4],
  ['Bio[P4] + Scout[P4]', defs.bioP4, defs.scoutP4],
  ['Bio[P4] + Bio[P4]', defs.bioP4, defs.bioP4],
  ['Bio[P4] + Bio[O4]', defs.bioP4, defs.bioO4],
  ['Bio[O4] + Scout[P4]', defs.bioO4, defs.scoutP4],
  ['Bio[O4] + Bio[O4]', defs.bioO4, defs.bioO4],
];

const legacyRows = [];
const bruteRows = [];

for (const [label, s1, s2] of states) {
  const m1 = legacyVariant(s1, 1);
  const m2 = legacyVariant(s2, 2);
  const m1Add = pickAdd(m1);
  const m2Add = pickAdd(m2);
  const naive = sumAdds(m1Add, m2Add);
  const [m1Eff, m2Eff] = legacy.applyValidatedDuplicateBioPinkScaling(m1, m2);
  const post = sumAdds(pickAdd(m1Eff), pickAdd(m2Eff));
  const helperDelta = diffAdds(naive, post);
  const compiled = legacy.compileCombatantFromParts({
    name: label,
    stats: zeroStats,
    armorV: zeroVariant,
    w1V: zeroVariant,
    w2V: zeroVariant,
    m1V: m1,
    m2V: m2,
    cfg: legacyCfg,
    role: 'D',
    attackTypeRaw: 'normal',
    attackStyleRoundMode: 'floor',
  });

  legacyRows.push({
    label,
    m1: m1Add,
    m2: m2Add,
    naive,
    helperDelta,
    post,
    compiled: {
      acc: compiled.acc,
      dodge: compiled.dodge,
      defSkill: compiled.defSk,
      gunSkill: compiled.gun,
      meleeSkill: compiled.mel,
      projSkill: compiled.prj,
      speed: compiled.speed,
    },
  });

  const b1 = bruteVariant(s1, 1);
  const b2 = bruteVariant(s2, 2);
  const bNaive = sumAdds(pickAdd(b1), pickAdd(b2));
  const [b1Eff, b2Eff] = brute.applyValidatedDuplicateBioPinkScaling(b1, b2);
  const bPost = sumAdds(pickAdd(b1Eff), pickAdd(b2Eff));
  bruteRows.push({
    label,
    naive: bNaive,
    helperDelta: diffAdds(bNaive, bPost),
    post: bPost,
  });
}

function stateSection(row) {
  const finalVsPost = {
    acc: row.compiled.acc - row.post.acc,
    dodge: row.compiled.dodge - row.post.dodge,
    defSkill: row.compiled.defSkill - row.post.defSkill,
    gunSkill: row.compiled.gunSkill - row.post.gunSkill,
    meleeSkill: row.compiled.meleeSkill - row.post.meleeSkill,
    projSkill: row.compiled.projSkill - row.post.projSkill,
    speed: row.compiled.speed - row.post.speed,
    armor: 0,
  };

  return `### ${row.label}

- misc1 single-card: ${fmtVec(row.m1)}
- misc2 single-card: ${fmtVec(row.m2)}
- naive additive misc total: ${fmtVec(row.naive)}
- helper delta after pair context: ${fmtVec(row.helperDelta)}
- final misc total after helper: ${fmtVec(row.post)}
- final compiled defender stats: acc ${row.compiled.acc}, dodge ${row.compiled.dodge}, def ${row.compiled.defSkill}, gun ${row.compiled.gunSkill}, mel ${row.compiled.meleeSkill}, prj ${row.compiled.projSkill}, spd ${row.compiled.speed}
- naive -> post-helper changed fields: ${changedFields(row.helperDelta)}
- post-helper misc total -> final compiled stat offsets: ${changedFields(finalVsPost)}
`;
}

const bruteTable = bruteRows.map((row) => [
  row.label,
  changedFields(row.helperDelta),
  fmtVec(row.post),
]);

const md = `# codex-bio pair-context aggregation check

## 1. Goal of this pass

Use the current reverted live Rule B activation-only code as the baseline and test the next layer above single-card misc anchors: add misc1 + misc2 card totals, compare that naive sum to the helper-adjusted sum, then compare both to the final compiled defender state to isolate exactly where pair-context or aggregation divergence begins.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '2611,2825p' legacy-sim-v1.0.4-clean.js
sed -n '3370,3425p' legacy-sim-v1.0.4-clean.js
sed -n '3386,3475p' brute-sim-v1.4.6.js
node ./tmp/codex-bio-pair-context-aggregation-check.js
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-card-anchor-instrumentation.md\`
- \`./tmp/codex-bio-revert-to-live-rule-b-report.md\`
- \`./tmp/codex-bio-rule-b-activation-fix-report.md\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`computeVariant(...)\`
  - \`applyValidatedDuplicateBioPinkScaling(...)\`
  - \`compileCombatantFromParts(...)\`
- \`./brute-sim-v1.4.6.js\`
  - \`computeVariant(...)\`
  - \`applyValidatedDuplicateBioPinkScaling(...)\`
  - \`compileDefender(...)\`
- \`./legacy-defs.js\`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Legacy compile path layers for misc contribution handling are:
  - single-misc variant build: \`computeVariant(...)\`
  - two-misc combination before helper: direct additive use of \`m1V\` + \`m2V\`
  - Rule B / local Bio helper adjustment: \`applyValidatedDuplicateBioPinkScaling(...)\`
  - final compiled combatant stats: \`compileCombatantFromParts(...)\`
- No tracked edits were made in this pass.

## 5. Legacy layered decomposition tables for the canonical states

These final compiled checks used zeroed armor/weapon variants and zero speed/accuracy/dodge base stats so the misc contribution path is isolated. Gun/melee/projectile/defense still carry the simulator's fixed \`BASE\` offsets in the final compiled layer; that offset is not pair-context logic.

${legacyRows.map(stateSection).join('\n')}

## 6. Optional brute parity notes

Brute shows the same pair-context pattern at this layer, but on different single-card totals because its default stat-crystal stacking is still \`iter4\`.

| State | helper delta | post-helper misc total |
| --- | --- | --- |
${bruteTable.map((row) => `| ${row.join(' | ')} |`).join('\n')}

## 7. Best explanation now

- Is legacy behaving as simple item-card addition except where Rule B explicitly intervenes?
  - yes
- State-by-state:
  - \`Scout[P4] + Scout[P4]\`: simple sum, no helper delta
  - \`Bio[P4] + Scout[P4]\`: simple sum, no helper delta
  - \`Bio[P4] + Bio[P4]\`: first state where simple sum stops; helper adds only \`defSkill +26\`
  - \`Bio[P4] + Bio[O4]\`: simple sum, no helper delta
  - \`Bio[O4] + Scout[P4]\`: simple sum, no helper delta
  - \`Bio[O4] + Bio[O4]\`: simple sum, no helper delta
- Is the divergence entirely explained by the local Rule B helper, or is there another aggregation/context effect above it?
  - at this pair-context aggregation layer, the only divergence from naive item-card addition is the local Rule B helper on exact \`Bio[P4] + Bio[P4]\`
- For \`Bio[P4] + Scout[P4]\` and \`Bio[P4] + Bio[O4]\`, is there any pair-context delta right now?
  - no
- If one-Bio and mixed rows still miss truth while compile remains a simple sum for them, does that push suspicion upward into combat resolution rather than misc aggregation?
  - yes; the smallest plausible suspect now sits above basic misc pair aggregation in legacy, not inside single-card math or non-duplicate misc summation

## 8. Recommendation

**PAIR-CONTEXT/AGGREGATION LOOKS CORRECT; LOOK HIGHER**

## 9. What ChatGPT should do next

Use this report as the handoff. Keep treating legacy misc aggregation as anchored for all non-duplicate Bio pair states, and shift the next diagnosis step above this layer: final compiled combatant context outside misc summation or combat-resolution behavior rather than additional misc-card aggregation rules.
`;

fs.writeFileSync(
  path.join(repoRoot, 'tmp/codex-bio-pair-context-aggregation-check.md'),
  md,
);

