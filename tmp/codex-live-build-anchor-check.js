#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

const repoRoot = process.cwd();

function loadLegacy(exportNames) {
  const absPath = path.join(repoRoot, 'legacy-sim-v1.0.4-clean.js');
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

const sim = loadLegacy([
  'normalizeResolvedBuild',
  'partCrystalSpec',
  'normalizeResolvedBuildWeaponUpgrades',
  'computeVariantFromCrystalSpec',
  'compileCombatantFromParts',
  'buildCompiledCombatSnapshot',
]);

const liveBuild = {
  stats: {
    level: 80,
    hp: 650,
    speed: 216,
    dodge: 164,
    accuracy: 186,
  },
  armor: {
    name: 'Dark Legion Armor',
    upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
  },
  weapon1: {
    name: 'Reaper Axe',
    upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
  },
  weapon2: {
    name: 'Crystal Maul',
    upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
  },
  misc1: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  },
  misc2: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'],
  },
  attackType: 'normal',
};

const displayed = {
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

function tryNormalize(slotCount) {
  const old = process.env.LEGACY_CRYSTAL_SLOTS;
  process.env.LEGACY_CRYSTAL_SLOTS = String(slotCount);
  try {
    const resolved = sim.normalizeResolvedBuild(liveBuild, 'normal', slotCount);
    return { ok: true, resolved };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  } finally {
    if (old === undefined) delete process.env.LEGACY_CRYSTAL_SLOTS;
    else process.env.LEGACY_CRYSTAL_SLOTS = old;
  }
}

const try4 = tryNormalize(4);
const try3 = tryNormalize(3);

const md = `# codex-live build anchor check

## 1. Goal of this pass

Use the user's displayed in-game totals as a loose live sanity anchor and compare them against what the current legacy-sim can compile for the same described build, without patching tracked code or guessing any missing crystals.

## 2. Exact commands run

\`\`\`sh
sed -n '1,220p' ./tmp/codex-bio-card-anchor-instrumentation.md
sed -n '1,260p' ./tmp/codex-bio-pair-context-aggregation-check.md
sed -n '1,220p' ./tmp/codex-bio-full-compile-snapshot-check.md
sed -n '1,220p' ./tmp/codex-bio-deterministic-roll-dump.md
sed -n '343,560p' legacy-sim-v1.0.4-clean.js
sed -n '2446,2725p' legacy-sim-v1.0.4-clean.js
node ./tmp/codex-live-build-anchor-check.js
\`\`\`

## 3. Exact files/functions inspected

- \`./tmp/codex-bio-card-anchor-instrumentation.md\`
- \`./tmp/codex-bio-pair-context-aggregation-check.md\`
- \`./tmp/codex-bio-full-compile-snapshot-check.md\`
- \`./tmp/codex-bio-deterministic-roll-dump.md\`
- \`./legacy-sim-v1.0.4-clean.js\`
  - \`normalizeCrystalSlotCount(...)\`
  - \`resolvedBuildCrystalSlots(...)\`
  - \`legacyCrystalSpecFromUpgradeArray(...)\`
  - \`partCrystalSpec(...)\`
  - \`normalizeCrystalCounts(...)\`
  - \`normalizeResolvedBuild(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
- \`./legacy-defs.js\`

## 4. Source hygiene result

- Tracked source is still in the reverted live Rule B activation-only state: yes.
- Exact compile path for one described build is:
  - part crystal extraction -> \`partCrystalSpec(...)\`
  - slot normalization -> \`normalizeCrystalCounts(...)\`
  - per-part variant build -> \`computeVariantFromCrystalSpec(...)\`
  - full combatant compile -> \`compileCombatantFromParts(...)\`
  - optional snapshot export -> \`buildCompiledCombatSnapshot(...)\`
- No tracked edits were made in this pass.

## 5. Constructed build definition used for the check

- armor: \`Dark Legion Armor\`, \`4x Abyss Crystal\`
- weapon1: \`Reaper Axe\`, \`3x Amulet Crystal\`
- weapon2: \`Crystal Maul\`, \`3x Amulet Crystal\`
- misc1: \`Bio Spinal Enhancer\`, \`3x Perfect Pink Crystal\`
- misc2: \`Bio Spinal Enhancer\`, \`3x Perfect Orange Crystal\`
- shown stats entered directly:
  - HP \`650\`
  - Speed \`216\`
  - Dodge \`164\`
  - Accuracy \`186\`
- attackType: \`normal\`

## 6. Simulated compiled totals

Exact full-build compile under the current legacy path was **not obtainable** without changing how crystal slots are interpreted.

Strict normalization outcomes:

| Global crystal slot count tested | Result |
| --- | --- |
| \`4\` | failed: \`${try4.ok ? 'ok' : try4.error}\` |
| \`3\` | failed: \`${try3.ok ? 'ok' : try3.error}\` |

Implication:

- with the current default/global \`4\`-slot handling, the 3-crystal weapons and miscs are rejected
- if forced to global \`3\` slots instead, the 4-crystal armor is rejected

Because the current compile path uses one global crystal slot count, it cannot represent this mixed \`4-slot armor + 3-slot weapons/miscs\` live build exactly.

## 7. In-game vs simulated comparison table

No exact full-build comparison table is available from the current compile path, because the build does not normalize successfully under the current global slot-count rules.

Reference in-game totals provided by the user:

| field | in-game value | simulated value | delta |
| --- | --- | --- | --- |
| hp | 650 | n/a | n/a |
| speed | 216 | n/a | n/a |
| dodge | 164 | n/a | n/a |
| accuracy | 186 | n/a | n/a |
| gunSkill | 580 | n/a | n/a |
| meleeSkill | 723 | n/a | n/a |
| projSkill | 580 | n/a | n/a |
| defSkill | 704 | n/a | n/a |
| armor | 83 | n/a | n/a |
| predictedDamage | 78-92 | n/a | n/a |
| weapon1Damage | 105-133 | n/a | n/a |
| weapon2Damage | 118-129 | n/a | n/a |

## 8. Best explanation now

Current legacy-sim does **not** reproduce this live build closely, because it cannot compile the build shape exactly in the first place.

First concrete mismatching field category:

- **partial crystal handling**

More specifically:

- the current legacy path assumes one global crystal slot count for build normalization
- the described live build mixes 4-crystal armor with 3-crystal weapons and miscs
- that mismatch blocks exact compile before trainable allocation, armor math, weapon damage math, or misc contribution totals can even be compared

What this does and does not imply:

- this is a real representational mismatch in the current build-normalization path
- it does **not** by itself prove anything about the Bio helper theory
- it also means this single live anchor is too ambiguous to use as a direct calibration check unless the build can first be represented exactly

## 9. Recommendation

**LIVE BUILD ANCHOR SHOWS A CONCRETE NEW MISMATCH**

## 10. What ChatGPT should do next

Use this report as the handoff. Do not use this live build as a calibration anchor until the build-shape mismatch is resolved at the temp/instrumentation level: first confirm how the live game treats partial crystal slots across armor, weapons, and miscs, then mirror that representation in a temp-only harness before drawing any conclusions from the displayed totals.
`;

fs.writeFileSync(path.join(repoRoot, 'tmp/codex-live-build-anchor-check.md'), md);

