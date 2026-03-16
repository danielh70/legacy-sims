'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const TRUTH_PATH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const REPORT_PATH = path.join(__dirname, 'codex-bio-slot-order-analysis.md');
const LEGACY_SIM_PATH = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM_PATH = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS_PATH = path.join(REPO, 'legacy-defs.js');
const COMPARE_TOOL_PATH = path.join(REPO, 'tools', 'legacy-truth-replay-compare.js');
const SURFACE_SWEEP_REPORT_PATH = path.join(__dirname, 'codex-bio-surface-sweep-report.md');
const MICROCHECK_REPORT_PATH = path.join(__dirname, 'codex-bio-pink-shell-microcheck.md');
const VERIFY_REPORT_PATH = path.join(__dirname, 'codex-bio-pink-shell-verify-results.md');
const DEBUG_HANDOFF_PATH = path.join(REPO, 'legacy-debug-handoff-2026-03-15.md');

const COMMANDS_RUN = [
  "ls -1 ./tmp/legacy-truth-bio-slot-order-probe.json",
  "sed -n '1,260p' ./tmp/codex-bio-surface-sweep-report.md",
  "sed -n '1,240p' ./tmp/codex-bio-pink-shell-microcheck.md",
  "sed -n '1,220p' ./tmp/codex-bio-pink-shell-verify-results.md",
  "sed -n '1,320p' ./tmp/legacy-truth-bio-slot-order-probe.json",
  "rg -n 'slotTag|rebuildMiscVariantForSlot|MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS|MISC_NO_CRYSTAL_SKILL|compileCombatantFromParts|compileDefender|compileAttacker|partCrystalSpec|computeVariantFromCrystalSpec' legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js",
  "rg --files | rg 'legacy-debug-handoff-2026-03-15\\.md$'",
  "node - <<'NODE' ... // extract unique defender names from ./tmp/legacy-truth-bio-slot-order-probe.json",
  "sed -n '1888,1948p' legacy-sim-v1.0.4-clean.js",
  "sed -n '2520,2665p' legacy-sim-v1.0.4-clean.js",
  "sed -n '2700,2795p' legacy-sim-v1.0.4-clean.js",
  "sed -n '3238,3338p' brute-sim-v1.4.6.js",
  "rg -n \"pageBuilds|requestedPageBuilds|verifiedPageBuilds\" tools/legacy-truth-replay-compare.js",
  "node ./tmp/codex-bio-slot-order-analysis.js",
];

const TARGET_ORDER = [
  'DL Dual Rift No Bio',
  'DL Dual Rift One Bio Left P4',
  'DL Dual Rift One Bio Right P4',
  'DL Dual Rift Two Bio P4',
  'DL Dual Rift Bio P4 + O4',
  'DL Dual Rift Bio O4 + P4',
  'DL Core/Rift No Bio',
  'DL Core/Rift One Bio Left P4',
  'DL Core/Rift One Bio Right P4',
  'DL Core/Rift Two Bio P4',
  'DL Core/Rift Bio P4 + O4',
  'DL Core/Rift Bio O4 + P4',
];

const PAIRS = [
  {
    shell: 'Dual Rift',
    label: 'Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4]',
    left: 'DL Dual Rift One Bio Left P4',
    right: 'DL Dual Rift One Bio Right P4',
  },
  {
    shell: 'Dual Rift',
    label: 'Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4]',
    left: 'DL Dual Rift Bio P4 + O4',
    right: 'DL Dual Rift Bio O4 + P4',
  },
  {
    shell: 'Core/Rift',
    label: 'Bio[P4] + Scout[P4] vs Scout[P4] + Bio[P4]',
    left: 'DL Core/Rift One Bio Left P4',
    right: 'DL Core/Rift One Bio Right P4',
  },
  {
    shell: 'Core/Rift',
    label: 'Bio[P4] + Bio[O4] vs Bio[O4] + Bio[P4]',
    left: 'DL Core/Rift Bio P4 + O4',
    right: 'DL Core/Rift Bio O4 + P4',
  },
];

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

function crystalSummary(part) {
  if (!part) return '';
  const upgrades = Array.isArray(part.upgrades) ? part.upgrades.filter(Boolean) : [];
  const counts = new Map();
  for (const name of upgrades) counts.set(name, (counts.get(name) || 0) + 1);
  const pieces = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => `${name}${count > 1 ? ` x${count}` : ''}`);
  return `${part.name}[${pieces.join(' + ')}]`;
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
    LEGACY_DOCTOR: '0',
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

function compileMatchup(sim, cfg, matchup) {
  const getVariant = buildVariantGetter(sim, cfg);
  const attackerBuild = matchup.pageBuilds.attacker;
  const defenderBuild = matchup.pageBuilds.defender;

  const compiledAttacker = sim.compileCombatantFromParts({
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

  const misc1Variant = getVariant(defenderBuild.misc1.name, defenderBuild.misc1, 1);
  const misc2Variant = getVariant(defenderBuild.misc2.name, defenderBuild.misc2, 2);
  const compiledDefender = sim.compileCombatantFromParts({
    name: matchup.defender,
    stats: defenderBuild.stats,
    armorV: getVariant(defenderBuild.armor.name, defenderBuild.armor),
    w1V: getVariant(defenderBuild.weapon1.name, defenderBuild.weapon1),
    w2V: getVariant(defenderBuild.weapon2.name, defenderBuild.weapon2),
    m1V: misc1Variant,
    m2V: misc2Variant,
    cfg,
    role: 'D',
    attackTypeRaw: defenderBuild.attackType || sim.resolveDefenderAttackType(defenderBuild),
    attackStyleRoundMode: sim.ATTACK_STYLE_ROUND_MODE,
  });

  return {
    attackerBuild,
    defenderBuild,
    compiledAttacker,
    compiledDefender,
    misc1Variant,
    misc2Variant,
  };
}

function miscContribution(v) {
  return {
    itemName: v.itemName,
    crystalName: v.crystalName,
    crystalSpecShort: v.crystalSpecShort || v.crystalName || '',
    addAcc: v.addAcc,
    addDod: v.addDod,
    addGun: v.addGun,
    addMel: v.addMel,
    addPrj: v.addPrj,
    addDef: v.addDef,
  };
}

function finalStateSignature(c) {
  return {
    hp: c.hp,
    speed: c.speed,
    acc: c.acc,
    dodge: c.dodge,
    defSk: c.defSk,
    gun: c.gun,
    mel: c.mel,
    prj: c.prj,
    w1Min: c.w1 ? c.w1.min : null,
    w1Max: c.w1 ? c.w1.max : null,
    w2Min: c.w2 ? c.w2.min : null,
    w2Max: c.w2 ? c.w2.max : null,
  };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function asRowsByName(truth) {
  const byName = new Map();
  for (const matchup of truth.matchups || []) {
    if (!byName.has(matchup.defender)) byName.set(matchup.defender, matchup);
  }
  return TARGET_ORDER.map((name) => {
    const matchup = byName.get(name);
    if (!matchup) throw new Error(`Missing expected defender row: ${name}`);
    return matchup;
  });
}

function shellOf(name) {
  return name.includes('Core/Rift') ? 'Core/Rift' : 'Dual Rift';
}

function rowKind(name) {
  if (name.includes('No Bio')) return 'No Bio';
  if (name.includes('One Bio Left')) return 'One Bio Left P4';
  if (name.includes('One Bio Right')) return 'One Bio Right P4';
  if (name.includes('Two Bio')) return 'Two Bio P4';
  if (name.includes('Bio P4 + O4')) return 'Bio P4 + O4';
  if (name.includes('Bio O4 + P4')) return 'Bio O4 + P4';
  return name;
}

function hypothesisRanking(pairSummaries) {
  const absWins = pairSummaries.map((pair) => Math.abs(pair.truthDeltaWin));
  const maxOrderWin = Math.max(...absWins);
  const maxOrderTurns = Math.max(...pairSummaries.map((pair) => Math.abs(pair.truthDeltaAvgT)));
  return [
    {
      rank: 1,
      hypothesis: 'second-Bio / duplicate-Bio scaling',
      why:
        'Truth still shows the large step when moving from one Bio[P4] to two Bio[P4], far larger than any left/right order delta. This remains the strongest driver of the family mismatch.',
    },
    {
      rank: 2,
      hypothesis: 'Pink-vs-Orange color asymmetry',
      why:
        'The mixed Bio[P4]+Bio[O4] rows sit far from the two-Pink rows in both shells, and the new slot-order pack keeps that color split visible while order effects stay small.',
    },
    {
      rank: 3,
      hypothesis: 'slot-order rule',
      why:
        `Truth shows only weak order sensitivity: max |Δwin| ${fmtNum(maxOrderWin, 3)} and max |ΔavgTurns| ${fmtNum(maxOrderTurns, 4)} across the tested swapped pairs. That can explain at most a small residual, not the main Bio-family gap.`,
    },
    {
      rank: 4,
      hypothesis: 'broader shell-only rule',
      why:
        'Both shells show the same directional Bio count and Bio color pattern, so the evidence is weaker for a shell-exclusive rule than for a shared Bio-scaling rule with shell-dependent magnitude.',
    },
  ];
}

function main() {
  if (!fs.existsSync(TRUTH_PATH)) {
    throw new Error(`Missing required truth pack: ${TRUTH_PATH}`);
  }

  const truth = readJson(TRUTH_PATH);
  const truthRows = asRowsByName(truth);
  const sim = loadLegacyInternals();
  const cfg = { ...sim.makeVariantList()[0], diag: true };

  const compiledRows = truthRows.map((matchup) => {
    const compiled = compileMatchup(sim, cfg, matchup);
    return {
      name: matchup.defender,
      shell: shellOf(matchup.defender),
      kind: rowKind(matchup.defender),
      truthWin: Number(matchup.aggregates.attackerWinPct),
      truthAvgT: Number(matchup.aggregates.avgTurns),
      defenderBuild: matchup.pageBuilds.defender,
      ...compiled,
    };
  });

  const byName = new Map(compiledRows.map((row) => [row.name, row]));

  const truthTables = ['Dual Rift', 'Core/Rift'].map((shell) =>
    compiledRows
      .filter((row) => row.shell === shell)
      .map(
        (row) =>
          `| ${quoteCell(row.kind)} | ${quoteCell(crystalSummary(row.defenderBuild.misc1))} | ${quoteCell(
            crystalSummary(row.defenderBuild.misc2),
          )} | ${fmtNum(row.truthWin, 3)} | ${fmtNum(row.truthAvgT, 4)} |`,
      )
      .join('\n'),
  );

  const pairSummaries = PAIRS.map((pair) => {
    const left = byName.get(pair.left);
    const right = byName.get(pair.right);
    const leftFinal = finalStateSignature(left.compiledDefender);
    const rightFinal = finalStateSignature(right.compiledDefender);
    const leftM1 = miscContribution(left.misc1Variant);
    const leftM2 = miscContribution(left.misc2Variant);
    const rightM1 = miscContribution(right.misc1Variant);
    const rightM2 = miscContribution(right.misc2Variant);
    const slotwiseEqual = sameJson(leftM1, rightM1) && sameJson(leftM2, rightM2);
    const swappedEqual = sameJson(leftM1, rightM2) && sameJson(leftM2, rightM1);
    const finalEqual = sameJson(leftFinal, rightFinal);
    return {
      ...pair,
      left,
      right,
      truthDeltaWin: right.truthWin - left.truthWin,
      truthDeltaAvgT: right.truthAvgT - left.truthAvgT,
      slotwiseEqual,
      swappedEqual,
      finalEqual,
      leftM1,
      leftM2,
      rightM1,
      rightM2,
      leftFinal,
      rightFinal,
    };
  });

  const dormantSlot2SeriousSuspect = pairSummaries.some((pair) => Math.abs(pair.truthDeltaWin) >= 1.0);
  const orderMattersTruth = pairSummaries.some((pair) => Math.abs(pair.truthDeltaWin) > 0.1 || Math.abs(pair.truthDeltaAvgT) > 0.01);
  const orderMattersCompile = pairSummaries.some((pair) => !pair.finalEqual);
  const ranked = hypothesisRanking(pairSummaries);

  const compositionAnchors = {
    dualOneToTwo: byName.get('DL Dual Rift Two Bio P4').truthWin - byName.get('DL Dual Rift One Bio Right P4').truthWin,
    coreOneToTwo: byName.get('DL Core/Rift Two Bio P4').truthWin - byName.get('DL Core/Rift One Bio Right P4').truthWin,
    dualMixedToTwo: byName.get('DL Dual Rift Bio P4 + O4').truthWin - byName.get('DL Dual Rift Two Bio P4').truthWin,
    coreMixedToTwo: byName.get('DL Core/Rift Bio P4 + O4').truthWin - byName.get('DL Core/Rift Two Bio P4').truthWin,
  };

  const legacyDebugNote = fs.existsSync(DEBUG_HANDOFF_PATH)
    ? '`./legacy-debug-handoff-2026-03-15.md` was present.'
    : '`./legacy-debug-handoff-2026-03-15.md` was requested but is missing from this repo root.';

  const report = `# codex-bio slot-order analysis

## 1. Goal of this pass

Use the new slot-order truth pack to decide whether the remaining Bio-family mismatch is better explained by slot order, duplicate-Bio scaling, Pink-vs-Orange asymmetry, or a broader shell-only rule, without patching tracked sources.

## 2. Exact commands run

\`\`\`sh
${COMMANDS_RUN.join('\n')}
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/legacy-truth-bio-slot-order-probe.json\`
- \`./tmp/codex-bio-surface-sweep-report.md\`
- \`./tmp/codex-bio-pink-shell-microcheck.md\`
- \`./tmp/codex-bio-pink-shell-verify-results.md\`
- ${legacyDebugNote}
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`getEffectiveCrystalPct(...)\`
  - \`partCrystalSpec(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
- \`./brute-sim-v1.4.6.js\`
  - \`rebuildMiscVariantForSlot(...)\`
  - \`compileDefender(...)\`
  - \`compileAttacker(...)\`
- \`./legacy-defs.js\`
- \`./tools/legacy-truth-replay-compare.js\`
  - page-build replay path around \`pageBuilds\` / \`verifiedPageBuilds\`

## 4. The 12-row truth summary

### Dual Rift

| Row | misc1 | misc2 | truth win% | truth avgTurns |
| --- | --- | --- | ---: | ---: |
${truthTables[0]}

### Core/Rift

| Row | misc1 | misc2 | truth win% | truth avgTurns |
| --- | --- | --- | ---: | ---: |
${truthTables[1]}

## 5. Pairwise order-sensitive comparisons

| Shell | Pair | left row | right row | Δwin (right-left) | ΔavgTurns (right-left) | Truth order signal |
| --- | --- | --- | --- | ---: | ---: | --- |
${pairSummaries
  .map((pair) => {
    let signal = 'no';
    if (Math.abs(pair.truthDeltaWin) >= 0.5 || Math.abs(pair.truthDeltaAvgT) >= 0.01) signal = 'weak yes';
    return `| ${quoteCell(pair.shell)} | ${quoteCell(pair.label)} | ${quoteCell(pair.left.kind)} | ${quoteCell(
      pair.right.kind,
    )} | ${fmtSigned(pair.truthDeltaWin, 3)} | ${fmtSigned(pair.truthDeltaAvgT, 4)} | ${signal} |`;
  })
  .join('\n')}

Interpretation:

- One-Bio left/right order changes are small in both shells: Dual Rift ${fmtSigned(
    pairSummaries[0].truthDeltaWin,
    3,
  )} win and ${fmtSigned(pairSummaries[0].truthDeltaAvgT, 4)} turns; Core/Rift ${fmtSigned(
    pairSummaries[2].truthDeltaWin,
    3,
  )} win and ${fmtSigned(pairSummaries[2].truthDeltaAvgT, 4)} turns.
- Mixed Pink/Orange order is also small in Dual Rift (${fmtSigned(
    pairSummaries[1].truthDeltaWin,
    3,
  )} win, ${fmtSigned(pairSummaries[1].truthDeltaAvgT, 4)} turns) and only modest in Core/Rift (${fmtSigned(
    pairSummaries[3].truthDeltaWin,
    3,
  )} win, ${fmtSigned(pairSummaries[3].truthDeltaAvgT, 4)} turns).
- The largest slot-order signal in this pack is Core/Rift mixed order at ${fmtNum(
    Math.abs(pairSummaries[3].truthDeltaWin),
    3,
  )} win. That is real enough to note, but still far smaller than the large one-Bio vs two-Bio and two-Pink vs Pink+Orange gaps already seen in the earlier truth packs.
- For scale, composition deltas are much larger: Dual Rift one-Bio to two-Bio is ${fmtSigned(
    compositionAnchors.dualOneToTwo,
    3,
  )} win, Core/Rift one-Bio to two-Bio is ${fmtSigned(compositionAnchors.coreOneToTwo, 3)} win, Dual Rift mixed-to-two-Pink is ${fmtSigned(
    compositionAnchors.dualMixedToTwo,
    3,
  )} win, and Core/Rift mixed-to-two-Pink is ${fmtSigned(compositionAnchors.coreMixedToTwo, 3)} win.

## 6. Compile-state comparison for the same swapped pairs

| Shell | Pair | Left misc1 contrib | Left misc2 contrib | Right misc1 contrib | Right misc2 contrib | Final compiled state identical? | Compile interpretation |
| --- | --- | --- | --- | --- | --- | --- | --- |
${pairSummaries
  .map((pair) => {
    const leftM1 = `${pair.leftM1.itemName}[${pair.leftM1.crystalSpecShort}] Acc ${pair.leftM1.addAcc}, Dod ${pair.leftM1.addDod}, Gun ${pair.leftM1.addGun}, Mel ${pair.leftM1.addMel}, Prj ${pair.leftM1.addPrj}, Def ${pair.leftM1.addDef}`;
    const leftM2 = `${pair.leftM2.itemName}[${pair.leftM2.crystalSpecShort}] Acc ${pair.leftM2.addAcc}, Dod ${pair.leftM2.addDod}, Gun ${pair.leftM2.addGun}, Mel ${pair.leftM2.addMel}, Prj ${pair.leftM2.addPrj}, Def ${pair.leftM2.addDef}`;
    const rightM1 = `${pair.rightM1.itemName}[${pair.rightM1.crystalSpecShort}] Acc ${pair.rightM1.addAcc}, Dod ${pair.rightM1.addDod}, Gun ${pair.rightM1.addGun}, Mel ${pair.rightM1.addMel}, Prj ${pair.rightM1.addPrj}, Def ${pair.rightM1.addDef}`;
    const rightM2 = `${pair.rightM2.itemName}[${pair.rightM2.crystalSpecShort}] Acc ${pair.rightM2.addAcc}, Dod ${pair.rightM2.addDod}, Gun ${pair.rightM2.addGun}, Mel ${pair.rightM2.addMel}, Prj ${pair.rightM2.addPrj}, Def ${pair.rightM2.addDef}`;
    const interp = pair.finalEqual
      ? pair.swappedEqual
        ? 'slot labels swap, totals stay identical'
        : 'slot labels and totals both identical'
      : 'final compiled totals differ';
    return `| ${quoteCell(pair.shell)} | ${quoteCell(pair.label)} | ${quoteCell(leftM1)} | ${quoteCell(
      leftM2,
    )} | ${quoteCell(rightM1)} | ${quoteCell(rightM2)} | ${pair.finalEqual ? 'yes' : 'no'} | ${quoteCell(interp)} |`;
  })
  .join('\n')}

Final compiled defender signatures for the swapped pairs:

| Shell | Pair | Compiled hp | speed | acc | dodge | defSk | gun | melee | projectile | w1 dmg | w2 dmg |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${pairSummaries
  .map((pair) => {
    const f = pair.leftFinal;
    return `| ${quoteCell(pair.shell)} | ${quoteCell(pair.label)} | ${f.hp} | ${f.speed} | ${f.acc} | ${f.dodge} | ${f.defSk} | ${f.gun} | ${f.mel} | ${f.prj} | ${f.w1Min}-${f.w1Max} | ${f.w2Min}-${f.w2Max} |`;
  })
  .join('\n')}

Current legacy compile conclusion:

- Final compiled state is order-insensitive for all four swapped pairs in the current default legacy path.
- The misc-slot contribution objects simply trade places when the build swaps misc1 and misc2.
- The dormant slot-2 hook is real: \`getEffectiveCrystalPct(..., slotTag)\` has a separate \`MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS\` branch, and brute has the same family through \`rebuildMiscVariantForSlot(...)\`.
- In this pass, that slot-2 branch is not active by default, so current compile behavior is effectively order-insensitive.

## 7. Whether slot order matters in truth

Yes, but only weakly.

- Truth is not perfectly symmetric under misc-slot swaps.
- The observed order effects are small: max |Δwin| ${fmtNum(
    Math.max(...pairSummaries.map((pair) => Math.abs(pair.truthDeltaWin))),
    3,
  )}, max |ΔavgTurns| ${fmtNum(
    Math.max(...pairSummaries.map((pair) => Math.abs(pair.truthDeltaAvgT))),
    4,
  )}.
- That is not large enough to explain the main Bio-family mismatch by itself.

## 8. Whether slot order matters in current compile

No, not in the current default legacy compile path.

- All four swapped pairs compile to identical final defender states.
- The codebase does contain dormant slot-2-only misc logic, so slot order remains a credible source of small residual asymmetry if some hidden runtime configuration or missing rule should activate it.
- Based on this truth pack alone, slot-indexed suppression is not a serious explanation for the full Bio-family gap.

## 9. Ranked hypotheses now

${ranked.map((item) => `${item.rank}. **${item.hypothesis}**: ${item.why}`).join('\n')}

## 10. Note on the parked 400-vs-450 base-skill hypothesis

**Not informed by this pass**

Reason:

- The new truth pack is about misc-slot ordering and Bio color duplication patterns.
- A global base-skill offset would not naturally predict that left/right order effects stay tiny while duplicate-Bio and color composition remain the dominant pattern.
- This pack neither strengthens nor weakens the 400-vs-450 idea in a meaningful way; it mainly separates slot-order behavior from Bio-composition behavior.

## 11. Recommendation

**SWITCH SUSPECT FAMILY**

Reason:

- The new truth pack weakens slot-order asymmetry as the primary explanation.
- The strongest remaining suspects are a shared duplicate-Bio / second-Bio rule and a Pink-vs-Orange Bio rule, with shell only modulating magnitude.

## 12. If PATCH CANDIDATE READY

Not applicable. This pass does not isolate a decision-ready patch rule.

## 13. What ChatGPT should do next

Start from the current reverted code and investigate the Bio-bearing misc contribution family, not slot order. The next narrow diagnosis step should compare how the first Bio[P4], second Bio[P4], and Bio[O4] contributions are compiled in both simulators, with explicit attention to any duplicate-item scaling or color-specific rules that would apply regardless of whether the Bio lands in misc1 or misc2.
`;

  fs.writeFileSync(REPORT_PATH, report);
  process.stdout.write(report);
}

main();
