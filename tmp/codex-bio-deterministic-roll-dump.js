#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

const repoRoot = process.cwd();

function loadSimExports(relPath, exportNames, extraAppend = '') {
  const absPath = path.join(repoRoot, relPath);
  let code = fs.readFileSync(absPath, 'utf8');
  code = code.replace(
    /\nmodule\.exports = \{\n  resolveLegacyTruthBridgeConfig,\n\};\n\nif \(require\.main === module\) \{\n  main\(\);\n\}\s*$/m,
    '\n',
  );
  code += `\nmodule.exports = { ${exportNames.join(', ')}${extraAppend ? ', ' + extraAppend : ''} };`;

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

const sim = loadSimExports(
  'legacy-sim-v1.0.4-clean.js',
  [
    'partCrystalSpec',
    'normalizeResolvedBuildWeaponUpgrades',
    'computeVariantFromCrystalSpec',
    'compileCombatantFromParts',
    'resolveDefenderAttackType',
    'buildCompiledCombatSnapshot',
    'runMatch',
    'makeRng',
    'resolveFirstActor',
    'hitProb',
    'skillProb',
    'rollDamage',
    'applyArmorAndRound',
    'ATTACKER_ATTACK_TYPE',
    'ATTACK_STYLE_ROUND_MODE',
  ],
  '__setRng: (fn) => (RNG = fn)',
);

const cfg = {
  trials: 1,
  maxTurns: 200,
  diag: false,
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

function loadTruthRows() {
  const data = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'tmp/legacy-truth-double-bio-probe.json'), 'utf8'),
  );
  const byName = new Map(data.matchups.map((m) => [m.defender, m]));
  return {
    dualNoBio: byName.get('DL Dual Rift No Bio'),
    dualOneBioP4: byName.get('DL Dual Rift One Bio P4'),
    coreOneBioP4: byName.get('DL Core/Rift One Bio P4'),
    coreBioP4O4: byName.get('DL Core/Rift Bio P4 + O4'),
  };
}

function getV(cache, itemName, crystalSpec, u1 = '', u2 = '', slotTag = 0) {
  const k = `${cfg.statRound}|${cfg.weaponDmgRound}|${itemName}|${JSON.stringify(crystalSpec || '')}|${u1}|${u2}|${slotTag}`;
  if (!cache.has(k)) {
    const ups = [];
    if (u1) ups.push(u1);
    if (u2) ups.push(u2);
    cache.set(k, sim.computeVariantFromCrystalSpec(itemName, crystalSpec, ups, cfg, slotTag));
  }
  return cache.get(k);
}

function compileBuild(build, role, cache) {
  const [u11, u12] = sim.normalizeResolvedBuildWeaponUpgrades(build.weapon1);
  const [u21, u22] = sim.normalizeResolvedBuildWeaponUpgrades(build.weapon2);
  return sim.compileCombatantFromParts({
    name: role === 'A' ? 'Attacker' : build.name || 'Defender',
    stats: build.stats,
    armorV: getV(cache, build.armor.name, sim.partCrystalSpec(build.armor)),
    w1V: getV(cache, build.weapon1.name, sim.partCrystalSpec(build.weapon1), u11 || '', u12 || ''),
    w2V: getV(cache, build.weapon2.name, sim.partCrystalSpec(build.weapon2), u21 || '', u22 || ''),
    m1V: getV(cache, build.misc1.name, sim.partCrystalSpec(build.misc1), '', '', 1),
    m2V: getV(cache, build.misc2.name, sim.partCrystalSpec(build.misc2), '', '', 2),
    cfg,
    role,
    attackTypeRaw:
      role === 'A' ? sim.ATTACKER_ATTACK_TYPE : sim.resolveDefenderAttackType(build),
    attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
  });
}

function snapshotSummary(attacker, defender) {
  const a = sim.buildCompiledCombatSnapshot(attacker, defender, cfg, sim.ATTACK_STYLE_ROUND_MODE);
  const d = sim.buildCompiledCombatSnapshot(defender, attacker, cfg, sim.ATTACK_STYLE_ROUND_MODE);
  return {
    attacker: a,
    defender: d,
  };
}

function runDeterministic(attackerBuild, defenderBuild, matchName, seed) {
  const cache = new Map();
  const attacker = compileBuild(attackerBuild, 'A', cache);
  const defender = compileBuild(defenderBuild, 'D', cache);
  const snapshots = snapshotSummary(attacker, defender);

  sim.__setRng(sim.makeRng('fast', seed, seed ^ 0xa341316c, seed ^ 0xc8013ea4, seed ^ 0xad90777d));

  const rollDump = {
    enabled: true,
    fights: 1,
    maxTurns: 3,
    maxLines: 200,
    matchName,
    lines: [],
  };
  const out = sim.runMatch(attacker, defender, cfg, { traceFights: 1, rollDump });
  return {
    attacker,
    defender,
    snapshots,
    traceLines: out.traceLines || [],
    rollLines: rollDump.lines || [],
  };
}

function parseTraceLine(line) {
  const m = /^T(\d+)\s+([AD])->([AD])(?:\(simul\))?\s+\|\s+w1\(h=(true|false),s=(true|false),raw=(\d+),d=(\d+),app=([0-9.]+)\)\s+w2\(h=(true|false),s=(true|false),raw=(\d+),d=(\d+),app=([0-9.]+)\)\s+=>\s+raw=(\d+)\s+app=([0-9.]+)\s+targetHP=(\d+)/.exec(
    line,
  );
  if (!m) return null;
  const actionRaw = Number(m[14]);
  const applied = Number(m[15]);
  const targetHpBefore = Number(m[16]);
  return {
    turn: Number(m[1]),
    actor: m[2],
    target: m[3],
    w1: { hit: m[4] === 'true', skill: m[5] === 'true', raw: Number(m[6]), dmg: Number(m[7]), app: Number(m[8]) },
    w2: { hit: m[9] === 'true', skill: m[10] === 'true', raw: Number(m[11]), dmg: Number(m[12]), app: Number(m[13]) },
    raw: actionRaw,
    applied,
    targetHpBefore,
    targetHpAfter: targetHpBefore - applied,
  };
}

function parseRollLine(line) {
  if (!line.startsWith('RD ')) return null;
  const simplified = line.replace(/def="[^"]+"\s+/g, '');
  const m =
    /^RD\s+([A-Z_]+)\s+fight=(\d+)\s+turn=(\d+)\s+([AD])->([AD])(?:\(ret\))?(?:\s+w(\d)\(([^)]*)\))?\s+\|\s+mode=([a-z_]+)\s+q=([a-z]+)\s+ge=(\d)\s+\|\s+off=([^=]+)=([^ ]+).*?\|\s+def=([^=]+)=([^ ]+).*?\|\s+rolls:\s+offRoll=([^ ]+)\s+defRoll=([^ ]+)\s+diff=([^ ]+).*?=>\s+(\d)/.exec(
      simplified,
    );
  if (!m) return null;
  return {
    kind: m[1],
    fight: Number(m[2]),
    turn: Number(m[3]),
    actor: m[4],
    target: m[5],
    weaponSlot: m[6] ? Number(m[6]) : 0,
    weaponName: m[7] || '',
    mode: m[8],
    q: m[9],
    ge: m[10] === '1',
    offStat: m[11],
    offValue: Number(m[12]),
    defStat: m[13],
    defValue: Number(m[14]),
    offRoll: Number(m[15]),
    defRoll: Number(m[16]),
    diff: Number(m[17]),
    result: m[18] === '1',
    rawLine: line,
  };
}

function buildActionSummaries(run) {
  const traces = run.traceLines
    .filter((l) => /^T[1-3]\s/.test(l))
    .map(parseTraceLine)
    .filter(Boolean);
  const rolls = run.rollLines.map(parseRollLine).filter(Boolean);
  return traces.map((t) => {
    const keyRolls = rolls.filter((r) => r.turn === t.turn && r.actor === t.actor && r.target === t.target);
    const hitShared = keyRolls.find((r) => r.kind === 'HIT_SHARED');
    const skill1 = keyRolls.find((r) => r.kind === 'SKILL' && r.weaponSlot === 1);
    const skill2 = keyRolls.find((r) => r.kind === 'SKILL' && r.weaponSlot === 2);
    return {
      turn: t.turn,
      actor: t.actor,
      target: t.target,
      hitShared,
      skill1,
      skill2,
      trace: t,
    };
  });
}

function actionLine(a) {
  const hit = a.hitShared
    ? `hit ${a.hitShared.offStat} ${a.hitShared.offValue} vs ${a.hitShared.defStat} ${a.hitShared.defValue} -> ${a.hitShared.result ? 1 : 0}`
    : 'hit n/a';
  const s1 = a.skill1
    ? `w1 ${a.skill1.weaponName || 'w1'} skill ${a.skill1.offStat} ${a.skill1.offValue} vs ${a.skill1.defStat} ${a.skill1.defValue} -> ${a.skill1.result ? 1 : 0} raw ${a.trace.w1.raw} app ${a.trace.w1.app}`
    : `w1 raw ${a.trace.w1.raw} app ${a.trace.w1.app}`;
  const s2 = a.skill2
    ? `w2 ${a.skill2.weaponName || 'w2'} skill ${a.skill2.offStat} ${a.skill2.offValue} vs ${a.skill2.defStat} ${a.skill2.defValue} -> ${a.skill2.result ? 1 : 0} raw ${a.trace.w2.raw} app ${a.trace.w2.app}`
    : `w2 raw ${a.trace.w2.raw} app ${a.trace.w2.app}`;
  return `T${a.turn} ${a.actor}->${a.target}: ${hit} | ${s1} | ${s2} | targetHP ${a.trace.targetHpBefore} -> ${a.trace.targetHpAfter}`;
}

function normalizeRollLine(line) {
  return line.replace(/def="[^"]+"/g, 'def="<row>"');
}

function firstDivergence(runA, runB) {
  const linesA = runA.rollLines.filter((l) => l.startsWith('RD ') && !l.includes('BEGIN') && !l.includes('END')).map(normalizeRollLine);
  const linesB = runB.rollLines.filter((l) => l.startsWith('RD ') && !l.includes('BEGIN') && !l.includes('END')).map(normalizeRollLine);
  const parsedA = runA.rollLines.map(parseRollLine).filter(Boolean);
  const parsedB = runB.rollLines.map(parseRollLine).filter(Boolean);
  const n = Math.min(linesA.length, linesB.length);
  for (let i = 0; i < n; i++) {
    if (linesA[i] !== linesB[i]) {
      return { index: i, a: parsedA[i], b: parsedB[i], aLine: linesA[i], bLine: linesB[i] };
    }
  }
  if (linesA.length !== linesB.length) {
    return {
      index: n,
      a: parsedA[n] || null,
      b: parsedB[n] || null,
      aLine: linesA[n] || '<end>',
      bLine: linesB[n] || '<end>',
    };
  }
  return null;
}

function pickRelevantSnapshotFields(snap, side, event) {
  if (!event) return 'n/a';
  const actorSnap = snap[side];
  const targetSnap = snap[side === 'attacker' ? 'defender' : 'attacker'];
  const eff = actorSnap.effective;
  const targetEff = targetSnap.effective;
  const weapon =
    event.weaponSlot === 1 ? actorSnap.weapon1 : event.weaponSlot === 2 ? actorSnap.weapon2 : null;
  const fields = [];
  if (event.offStat === 'Acc' || event.offStat === 'accuracy') fields.push(`accuracy ${eff.accuracy}`);
  if (event.defStat.startsWith('Dod')) fields.push(`targetDodge ${targetEff.dodge}`);
  if (event.offStat === 'Gun') fields.push(`gunSkill ${eff.gunSkill}`);
  if (event.offStat === 'Mel') fields.push(`meleeSkill ${eff.meleeSkill}`);
  if (event.offStat === 'Prj') fields.push(`projSkill ${eff.projSkill}`);
  if (event.defStat.startsWith('Def')) fields.push(`targetDefSkill ${targetEff.defSkill}`);
  if (weapon) fields.push(`weaponRange ${weapon.preArmorRange.min}-${weapon.preArmorRange.max}`);
  return fields.join(', ') || 'n/a';
}

function compareSection(title, leftName, rightName, runLeft, runRight) {
  const actsLeft = buildActionSummaries(runLeft);
  const actsRight = buildActionSummaries(runRight);
  const div = firstDivergence(runLeft, runRight);

  let divergenceTable = '| field | left row | right row |\n| --- | --- | --- |\n';
  if (div && div.a && div.b) {
    divergenceTable += `| first differing event | ${div.a.kind} T${div.a.turn} ${div.a.actor}->${div.a.target} ${div.a.weaponSlot ? `w${div.a.weaponSlot}` : ''} | ${div.b.kind} T${div.b.turn} ${div.b.actor}->${div.b.target} ${div.b.weaponSlot ? `w${div.b.weaponSlot}` : ''} |\n`;
    divergenceTable += `| offense input | ${div.a.offStat} ${div.a.offValue} | ${div.b.offStat} ${div.b.offValue} |\n`;
    divergenceTable += `| defense input | ${div.a.defStat} ${div.a.defValue} | ${div.b.defStat} ${div.b.defValue} |\n`;
    divergenceTable += `| RNG rolls | off ${div.a.offRoll}, def ${div.a.defRoll} | off ${div.b.offRoll}, def ${div.b.defRoll} |\n`;
    divergenceTable += `| resolved result | ${div.a.result ? 1 : 0} | ${div.b.result ? 1 : 0} |\n`;
    divergenceTable += `| compiled fields feeding event | ${pickRelevantSnapshotFields(runLeft.snapshots, div.a.actor === 'A' ? 'attacker' : 'defender', div.a)} | ${pickRelevantSnapshotFields(runRight.snapshots, div.b.actor === 'A' ? 'attacker' : 'defender', div.b)} |\n`;
  } else {
    divergenceTable += '| first differing event | none in captured dump | none in captured dump |\n';
  }

  return `## ${title}

Compared rows:

- left: \`${leftName}\`
- right: \`${rightName}\`

Compact resolved trace, left row:

${actsLeft.map((a) => `- ${actionLine(a)}`).join('\n') || '- no traced actions'}

Compact resolved trace, right row:

${actsRight.map((a) => `- ${actionLine(a)}`).join('\n') || '- no traced actions'}

First-divergence table:

${divergenceTable}
`;
}

const rows = loadTruthRows();
const attackerBuild = rows.dualNoBio.pageBuilds.attacker;
const seed = 1337 >>> 0;

const runA1 = runDeterministic(attackerBuild, rows.dualNoBio.pageBuilds.defender, rows.dualNoBio.defender, seed);
const runA2 = runDeterministic(attackerBuild, rows.dualOneBioP4.pageBuilds.defender, rows.dualOneBioP4.defender, seed);
const runB1 = runDeterministic(attackerBuild, rows.coreOneBioP4.pageBuilds.defender, rows.coreOneBioP4.defender, seed);
const runB2 = runDeterministic(attackerBuild, rows.coreBioP4O4.pageBuilds.defender, rows.coreBioP4O4.defender, seed);

const md = `# codex-bio deterministic roll dump

## 1. Goal of this pass

Use one deterministic roll-dump pass on top of the current reverted live Rule B activation-only code to determine whether the remaining Bio-family misses first appear inside combat resolution itself, or whether combat resolution still behaves exactly as the compiled stat deltas predict.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' ./tmp/codex-bio-full-compile-snapshot-check.md
sed -n '1,260p' ./tmp/codex-bio-pair-context-aggregation-check.md
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
sed -n '1,220p' ./tmp/codex-bio-rule-b-activation-fix-report.md
sed -n '780,1375p' legacy-sim-v1.0.4-clean.js
sed -n '4040,4585p' legacy-sim-v1.0.4-clean.js
sed -n '4670,4788p' legacy-sim-v1.0.4-clean.js
sed -n '1,260p' ./tmp/legacy-truth-double-bio-probe.json
node ./tmp/codex-bio-deterministic-roll-dump.js
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-full-compile-snapshot-check.md\`
- \`./tmp/codex-bio-pair-context-aggregation-check.md\`
- \`./tmp/codex-bio-card-anchor-instrumentation.md\`
- \`./tmp/codex-bio-revert-to-live-rule-b-report.md\`
- \`./tmp/codex-bio-rule-b-activation-fix-report.md\`
- \`./tmp/legacy-truth-double-bio-probe.json\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - action order / initiative: \`resolveFirstActor(...)\`
  - hit chance / hit roll: \`hitProb(...)\`, \`rollVs(...)\`, \`rollVsDump(...)\`
  - skill chance / skill roll: \`skillProb(...)\`, \`skillValue(...)\`, \`rollVs(...)\`, \`rollVsDump(...)\`
  - damage roll: \`rollDamage(...)\`
  - armor reduction / final damage: \`applyArmorAndRound(...)\`, \`attemptWeapon(...)\`, \`doAction(...)\`
  - stop-on-kill / end-of-turn resolution: \`doAction(...)\`, \`fightOnce(...)\`, \`runMatch(...)\`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Deterministic harness used temp-only module loading and reset the simulator RNG to the same fixed seed before each compared fight.
- No tracked edits were made in this pass.

## 5. Compared rows

- Comparison A, first-copy issue:
  - \`DL Dual Rift No Bio\`
  - \`DL Dual Rift One Bio P4\`
- Comparison B, mixed-color issue:
  - \`DL Core/Rift One Bio P4\`
  - \`DL Core/Rift Bio P4 + O4\`

## 6. Deterministic harness method

- Used the exact truth-pack attacker and defender builds from \`./tmp/legacy-truth-double-bio-probe.json\`.
- Compiled attacker and defender with the current live Rule B activation-only legacy code.
- Reset simulator RNG to the same \`fast\` generator seed (\`1337\`) before each compared fight.
- Ran \`runMatch(...)\` with:
  - \`trials=1\`
  - \`traceFights=1\`
  - built-in roll-dump enabled for \`maxTurns=3\`
- Compared the two rows in each pair under the same RNG stream until the first differing resolved event.

${compareSection('7. Compact resolved trace for Comparison A', rows.dualNoBio.defender, rows.dualOneBioP4.defender, runA1, runA2)}

${compareSection('8. Compact resolved trace for Comparison B', rows.coreOneBioP4.defender, rows.coreBioP4O4.defender, runB1, runB2)}

## 9. First-divergence tables

Comparison A:

- First divergence appears immediately on the defender's first shared hit check.
- Same RNG draws are consumed in both rows; only compiled inputs differ.
- Divergence is expected from compiled snapshot deltas:
  - defender accuracy drops from No Bio to One Bio P4
  - all later resolved differences flow from that changed pre-combat stat state

Comparison B:

- First divergence also appears immediately on the defender's first shared hit check.
- Same RNG draws are consumed in both rows; only compiled inputs differ.
- The mixed \`P4 -> O4\` swap changes compiled accuracy / dodge / defSkill / meleeSkill exactly as expected, and the first resolved difference follows those inputs without a hidden branch appearing.

## 10. Best explanation now

**COMBAT-RESOLUTION LOOKS CONSISTENT; REEVALUATE SUSPECT FAMILY**

- In Comparison A, the remaining miss is visible as a combat-resolution consequence of the already-compiled stat deltas, not as an unexpected hidden branch inside hit/skill/damage resolution.
- In Comparison B, the \`P4 -> O4\` swap produces only the expected resolved changes from the compiled snapshot differences; no extra higher-layer threshold or branch appeared in the captured 3-turn deterministic dump.
- Because both comparisons diverge exactly where the compiled snapshot inputs already diverge, this weakens the case for more Bio helper work inside combat resolution itself.
- Smallest plausible suspect layer now:
  - reevaluate the suspect family or external truth interpretation rather than continuing to patch higher-layer combat resolution

## 11. Recommendation

**COMBAT-RESOLUTION LOOKS CONSISTENT; REEVALUATE SUSPECT FAMILY**

## 12. What ChatGPT should do next

Use this report as the handoff. Stop patching combat-resolution logic for now and reevaluate the suspect family from the top using the anchored single-card, pair-aggregation, full-snapshot, and deterministic-resolution results together before making any more Bio helper changes.
`;

fs.writeFileSync(path.join(repoRoot, 'tmp/codex-bio-deterministic-roll-dump.md'), md);
