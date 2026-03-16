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

function pickStats(v) {
  return {
    speed: v.addSpeed || 0,
    acc: v.addAcc || 0,
    dodge: v.addDod || 0,
    defSkill: v.addDef || 0,
    gunSkill: v.addGun || 0,
    meleeSkill: v.addMel || 0,
    projSkill: v.addPrj || 0,
    armor: v.addArmStat || 0,
    crystalName: v.crystalName || null,
    crystalMix: v.crystalMix || null,
    tag: v.tag || null,
  };
}

function compareStats(expected, actual) {
  const keys = ['acc', 'dodge', 'defSkill', 'gunSkill', 'meleeSkill', 'projSkill'];
  return keys.map((key) => {
    const exp = expected[key];
    const got = actual[key];
    return {
      key,
      expected: exp,
      simulated: got,
      delta: got - exp,
      exact: got === exp ? 'yes' : 'no',
    };
  });
}

const legacy = loadSimExports('legacy-sim-v1.0.4-clean.js', [
  'computeVariant',
  'computeVariantFromCrystalSpec',
  'getEffectiveCrystalPct',
]);
const brute = loadSimExports('brute-sim-v1.4.6.js', [
  'computeVariant',
  'computeVariantFromCrystalSpec',
  'getEffectiveCrystalPct',
  'VARIANT_CFG',
  'rebuildMiscVariantForSlot',
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
};

const anchors = {
  scoutAmulet: {
    itemName: 'Scout Drones',
    crystalName: 'Amulet Crystal',
    expected: {
      acc: 40,
      dodge: 5,
      defSkill: 42,
      gunSkill: 42,
      meleeSkill: 42,
      projSkill: 70,
    },
  },
  bioPink: {
    itemName: 'Bio Spinal Enhancer',
    crystalName: 'Perfect Pink Crystal',
    expected: {
      acc: 1,
      dodge: 1,
      defSkill: 117,
      gunSkill: 65,
      meleeSkill: 65,
      projSkill: 65,
    },
  },
};

const extra = {
  itemName: 'Bio Spinal Enhancer',
  crystalName: 'Perfect Orange Crystal',
};

const legacyScout = pickStats(
  legacy.computeVariant(anchors.scoutAmulet.itemName, anchors.scoutAmulet.crystalName, [], legacyCfg, 1),
);
const legacyBioPink = pickStats(
  legacy.computeVariant(anchors.bioPink.itemName, anchors.bioPink.crystalName, [], legacyCfg, 1),
);
const legacyBioOrange = pickStats(
  legacy.computeVariant(extra.itemName, extra.crystalName, [], legacyCfg, 1),
);

const bruteScout = pickStats(
  brute.computeVariant(anchors.scoutAmulet.itemName, anchors.scoutAmulet.crystalName, '', '', 1),
);
const bruteBioPink = pickStats(
  brute.computeVariant(anchors.bioPink.itemName, anchors.bioPink.crystalName, '', '', 1),
);
const bruteBioOrange = pickStats(
  brute.computeVariant(extra.itemName, extra.crystalName, '', '', 1),
);

const legacyScoutCmp = compareStats(anchors.scoutAmulet.expected, legacyScout);
const legacyBioPinkCmp = compareStats(anchors.bioPink.expected, legacyBioPink);
const bruteScoutCmp = compareStats(anchors.scoutAmulet.expected, bruteScout);
const bruteBioPinkCmp = compareStats(anchors.bioPink.expected, bruteBioPink);

function table(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

const cardRows = [];
for (const row of legacyScoutCmp) cardRows.push(['legacy', 'Scout Drones + 4x Amulet', row.key, row.expected, row.simulated, row.delta, row.exact]);
for (const row of legacyBioPinkCmp) cardRows.push(['legacy', 'Bio Spinal Enhancer + 4x Perfect Pink', row.key, row.expected, row.simulated, row.delta, row.exact]);
for (const row of bruteScoutCmp) cardRows.push(['brute', 'Scout Drones + 4x Amulet', row.key, row.expected, row.simulated, row.delta, row.exact]);
for (const row of bruteBioPinkCmp) cardRows.push(['brute', 'Bio Spinal Enhancer + 4x Perfect Pink', row.key, row.expected, row.simulated, row.delta, row.exact]);

const legacyExact = legacyScoutCmp.every((r) => r.exact === 'yes') && legacyBioPinkCmp.every((r) => r.exact === 'yes');
const bruteExact = bruteScoutCmp.every((r) => r.exact === 'yes') && bruteBioPinkCmp.every((r) => r.exact === 'yes');

const md = `# codex-bio card-anchor instrumentation

## 1. Goal of this pass

Use the current reverted live Rule B activation-only code as the baseline and test the user's plain-English model directly at the single-misc card layer: compute the misc item stats with crystals first, then ask whether those card totals already match known in-game anchors before any character-level aggregation happens.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' ./tmp/codex-bio-revert-to-live-rule-b-report.md
rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|computeVariant\\(|rebuildMiscVariantForSlot|getEffectiveCrystalPct|partCrystalSpec" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js
sed -n '1888,1978p' legacy-sim-v1.0.4-clean.js
sed -n '2288,2498p' legacy-sim-v1.0.4-clean.js
sed -n '2067,2105p' brute-sim-v1.4.6.js
sed -n '2184,2668p' brute-sim-v1.4.6.js
sed -n '1,40p' data/legacy-defs.js
sed -n '190,225p' data/legacy-defs.js
sed -n '3270,3305p' brute-sim-v1.4.6.js
node ./tmp/codex-bio-card-anchor-instrumentation.js
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-revert-to-live-rule-b-report.md\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`getEffectiveCrystalPct(...)\`
  - \`computeVariant(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - local duplicate helper block above \`compileCombatantFromParts(...)\`
- \`./brute-sim-v1.4.6.js\`
  - \`getEffectiveCrystalPct(...)\`
  - \`computeVariant(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`rebuildMiscVariantForSlot(...)\`
  - local duplicate helper block above defender/attacker compile
- \`./data/legacy-defs.js\`
  - \`CrystalDefs\`
  - \`ItemDefs['Scout Drones']\`
  - \`ItemDefs['Bio Spinal Enhancer']\`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- The single-misc computation path is unchanged by the duplicate helper on these anchors.
- First concrete single-misc path:
  - legacy: \`computeVariant(...)\` / \`computeVariantFromCrystalSpec(...)\` with compare-style config
  - brute: \`computeVariant(...)\` / \`computeVariantFromCrystalSpec(...)\` under \`VARIANT_CFG\`
- Duplicate helper position remains higher:
  - it acts only after two misc variants exist, inside \`applyValidatedDuplicateBioPinkScaling(...)\`

## 5. Legacy single-misc outputs

Legacy config used for these single-card checks:

- \`statRound=ceil\`
- \`weaponDmgRound=ceil\`
- \`crystalStackStats=sum4\`
- \`crystalStackDmg=sum4\`
- \`armorStatStack=sum4\`
- \`armorStatRound=ceil\`
- \`crystalSlots=4\`

${table([
  ['Scout Drones + 4x Amulet Crystal', legacyScout.acc, legacyScout.dodge, legacyScout.defSkill, legacyScout.gunSkill, legacyScout.meleeSkill, legacyScout.projSkill, legacyScout.speed, legacyScout.armor, legacyScout.crystalName],
  ['Bio Spinal Enhancer + 4x Perfect Pink Crystal', legacyBioPink.acc, legacyBioPink.dodge, legacyBioPink.defSkill, legacyBioPink.gunSkill, legacyBioPink.meleeSkill, legacyBioPink.projSkill, legacyBioPink.speed, legacyBioPink.armor, legacyBioPink.crystalName],
  ['Bio Spinal Enhancer + 4x Perfect Orange Crystal', legacyBioOrange.acc, legacyBioOrange.dodge, legacyBioOrange.defSkill, legacyBioOrange.gunSkill, legacyBioOrange.meleeSkill, legacyBioOrange.projSkill, legacyBioOrange.speed, legacyBioOrange.armor, legacyBioOrange.crystalName],
], ['Variant', 'acc', 'dodge', 'defSkill', 'gunSkill', 'meleeSkill', 'projSkill', 'speed', 'armor', 'crystal'])}

## 6. Brute single-misc outputs

Brute default variant config used:

- \`statRound=${brute.VARIANT_CFG.statRound}\`
- \`weaponDmgRound=${brute.VARIANT_CFG.weaponDmgRound}\`
- \`crystalStackStats=${brute.VARIANT_CFG.crystalStackStats}\`
- \`crystalStackDmg=${brute.VARIANT_CFG.crystalStackDmg}\`
- \`armorStatStack=${brute.VARIANT_CFG.armorStatStack}\`
- \`armorStatRound=${brute.VARIANT_CFG.armorStatRound}\`
- \`crystalSlots=${brute.VARIANT_CFG.crystalSlots}\`

${table([
  ['Scout Drones + 4x Amulet Crystal', bruteScout.acc, bruteScout.dodge, bruteScout.defSkill, bruteScout.gunSkill, bruteScout.meleeSkill, bruteScout.projSkill, bruteScout.speed, bruteScout.armor, bruteScout.crystalName],
  ['Bio Spinal Enhancer + 4x Perfect Pink Crystal', bruteBioPink.acc, bruteBioPink.dodge, bruteBioPink.defSkill, bruteBioPink.gunSkill, bruteBioPink.meleeSkill, bruteBioPink.projSkill, bruteBioPink.speed, bruteBioPink.armor, bruteBioPink.crystalName],
  ['Bio Spinal Enhancer + 4x Perfect Orange Crystal', bruteBioOrange.acc, bruteBioOrange.dodge, bruteBioOrange.defSkill, bruteBioOrange.gunSkill, bruteBioOrange.meleeSkill, bruteBioOrange.projSkill, bruteBioOrange.speed, bruteBioOrange.armor, bruteBioOrange.crystalName],
], ['Variant', 'acc', 'dodge', 'defSkill', 'gunSkill', 'meleeSkill', 'projSkill', 'speed', 'armor', 'crystal'])}

## 7. Card-anchor comparison table

${table(cardRows.map((r) => r.map(String)), ['sim', 'anchor', 'stat', 'expected', 'simulated', 'delta', 'exact'])}

## 8. Legacy vs brute parity notes for these exact single-misc cases

- Legacy reproduces both provided in-game card anchors exactly: ${legacyExact ? 'yes' : 'no'}.
- Brute reproduces both provided in-game card anchors exactly: ${bruteExact ? 'yes' : 'no'}.
- First concrete parity divergence is already visible at single-misc stat-crystal stacking:
  - legacy uses compare-style \`sum4\` stat stacking for these checks
  - brute default \`VARIANT_CFG\` uses \`iter4\` for stat stacking
- That difference alone explains the brute overshoot on card totals:
  - Scout Drones + Amulet: legacy \`40/42/42/42/70\` vs brute \`43/46/46/46/75\` on the anchored skill fields
  - Bio + Perfect Pink: legacy \`117 defSkill\` vs brute \`136 defSkill\`
- \`rebuildMiscVariantForSlot(...)\` is not the first divergence here because these anchors were computed directly from single-misc variants before slot-2 rebuild is needed.

## 9. Best explanation now

- Do current helpers reproduce the in-game misc card stats?
  - legacy: yes, exactly for both supplied anchors
  - brute: no, not under its current default stat-crystal stack mode
- First concrete divergence:
  - not in the defs for these two cards
  - not in field mapping
  - not in duplicate-copy logic
  - it starts at stat-crystal application mode: brute \`iter4\` vs legacy compare-style \`sum4\`
- Because legacy matches both anchors exactly, this weakens the idea that the remaining live legacy calibration problem is in basic single-misc item crystal computation.
- Smallest higher layer still plausible in legacy:
  - the local pair-context Bio helper path above final combatant aggregation
  - or another aggregation/context rule that only appears once two misc items are combined with character stats

## 10. Recommendation

**${legacyExact ? 'BASIC MISC COMPUTATION LOOKS CORRECT; KEEP LOOKING HIGHER' : 'FOUND CONCRETE SINGLE-MISC COMPUTATION MISMATCH'}**

## 11. What ChatGPT should do next

Use this report as the handoff. Keep treating legacy single-misc card math as anchored for these two items, and focus the next diagnosis step above the single-card layer: pair-context Bio helper behavior, duplicate/mixed-copy context, or final character aggregation rather than basic misc crystal application.
`;

fs.writeFileSync(
  path.join(repoRoot, 'tmp/codex-bio-card-anchor-instrumentation.md'),
  md,
);

