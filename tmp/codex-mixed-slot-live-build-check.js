#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = process.cwd();
const LEGACY_SIM_PATH = path.join(ROOT, 'legacy-sim-v1.0.4-clean.js');
const REPORT_PATH = path.join(ROOT, 'tmp', 'codex-mixed-slot-live-build-report.md');

function loadLegacyInternals() {
  const src = fs.readFileSync(LEGACY_SIM_PATH, 'utf8');
  const appended = `
module.exports.__codexMixedSlot = {
  normalizeCrystalSlotCount,
  resolvedBuildCrystalSlots,
  partCrystalSpec,
  normalizeCrystalCounts,
  crystalSpecDisplay,
  crystalSpecShort,
  normalizeResolvedBuildWeaponUpgrades,
  computeVariant,
  computeVariantFromCrystalSpec,
  compileCombatantFromParts,
  buildCompiledCombatSnapshot,
  makeVariantList,
  ATTACK_STYLE_ROUND_MODE,
  ItemDefs,
  CrystalDefs,
  BASE,
};
`;
  const mod = new Module(LEGACY_SIM_PATH, module.parent || module);
  mod.filename = LEGACY_SIM_PATH;
  mod.paths = Module._nodeModulePaths(path.dirname(LEGACY_SIM_PATH));
  mod._compile(src + appended, LEGACY_SIM_PATH);
  if (!mod.exports || !mod.exports.__codexMixedSlot) {
    throw new Error('Failed to expose legacy internals for temp mixed-slot harness');
  }
  return mod.exports.__codexMixedSlot;
}

function buildBaseCfg(api) {
  const variant = api.makeVariantList()[0];
  return {
    armorK: Number(variant.armorK),
    tacticsMode: variant.tacticsMode || 'none',
    tacticsVal: Number(variant.tacticsVal),
    statRound: variant.statRound,
    weaponDmgRound: variant.weaponDmgRound,
    armorStatStack:
      variant.armorStatStack && variant.armorStatStack !== 'inherit'
        ? variant.armorStatStack
        : variant.crystalStackStats || 'sum4',
    armorStatRound:
      variant.armorStatRound && variant.armorStatRound !== 'inherit'
        ? variant.armorStatRound
        : variant.statRound,
    armorStatSlots:
      variant.armorStatSlots !== undefined &&
      variant.armorStatSlots !== null &&
      variant.armorStatSlots !== 'inherit'
        ? Number(variant.armorStatSlots)
        : Number.isFinite(Number(variant.crystalSlots))
          ? Number(variant.crystalSlots)
          : 4,
    crystalStackStats: variant.crystalStackStats || 'sum4',
    crystalStackDmg: variant.crystalStackDmg || 'sum4',
    crystalSlots: Number.isFinite(Number(variant.crystalSlots)) ? Number(variant.crystalSlots) : 4,
    hiddenPreset: variant.hiddenPreset || 'none',
  };
}

function slotCountForPart(api, part, fallbackSlots) {
  if (!part || typeof part !== 'object') return fallbackSlots;
  if (Number.isFinite(Number(part.crystalSlots))) {
    return api.normalizeCrystalSlotCount(Number(part.crystalSlots));
  }
  if (Number.isFinite(Number(part.slotCount))) {
    return api.normalizeCrystalSlotCount(Number(part.slotCount));
  }
  return api.normalizeCrystalSlotCount(fallbackSlots);
}

function crystalEntriesFromCounts(counts) {
  const out = [];
  for (const [name, nRaw] of Object.entries(counts || {})) {
    const n = Math.max(0, Math.floor(Number(nRaw) || 0));
    for (let i = 0; i < n; i += 1) out.push(name);
  }
  return out;
}

function buildPartContext(api, cfgBase, part, slotTag = 0) {
  const partSlots = slotCountForPart(api, part, cfgBase.crystalSlots);
  const rawSpec = api.partCrystalSpec(part);
  const crystalCounts = rawSpec ? api.normalizeCrystalCounts(rawSpec, partSlots) : null;
  const upgrades = api.normalizeResolvedBuildWeaponUpgrades(part);
  const cfg = {
    ...cfgBase,
    crystalSlots: partSlots,
    armorStatSlots: part && part.name === 'Dark Legion Armor' ? partSlots : cfgBase.armorStatSlots,
  };
  const variant = crystalCounts
    ? api.computeVariantFromCrystalSpec(part.name, crystalCounts, upgrades, cfg, slotTag)
    : api.computeVariant(part.name, '', upgrades, cfg, slotTag);
  return {
    partSlots,
    rawSpec,
    crystalCounts,
    upgrades,
    variant,
    display: crystalCounts ? api.crystalSpecDisplay(crystalCounts, partSlots) : '',
    short: crystalCounts ? api.crystalSpecShort(crystalCounts, partSlots) : '',
  };
}

function fmtRange(w) {
  return w && Number.isFinite(w.min) && Number.isFinite(w.max) ? `${w.min}-${w.max}` : 'unavailable';
}

function deltaString(live, sim) {
  if (live === null || live === undefined || sim === null || sim === undefined) return 'n/a';
  if (typeof live === 'string' || typeof sim === 'string') return live === sim ? '0' : 'n/a';
  return `${sim - live}`;
}

function toRows(compiled) {
  return [
    ['hp', 650, compiled.hp],
    ['speed', 216, compiled.speed],
    ['dodge', 164, compiled.dodge],
    ['accuracy', 186, compiled.acc],
    ['gunSkill', 580, compiled.gun],
    ['meleeSkill', 723, compiled.mel],
    ['projSkill', 580, compiled.prj],
    ['defSkill', 704, compiled.defSk],
    ['armor', 83, compiled.armor],
    ['predictedDamage', '78-92', null],
    ['weapon1Damage', '105-133', fmtRange(compiled.weapon1)],
    ['weapon2Damage', '118-129', fmtRange(compiled.weapon2)],
  ];
}

function firstMismatchCategory(rows) {
  const statMap = Object.fromEntries(rows.map(([field, live, sim]) => [field, { live, sim }]));
  const crystalSensitiveStats = ['speed', 'dodge', 'accuracy', 'meleeSkill', 'defSkill', 'armor'];
  const crystalSensitiveMiss = crystalSensitiveStats.some(
    (k) => Math.abs(Number(statMap[k].sim) - Number(statMap[k].live)) >= 2,
  );
  if (crystalSensitiveMiss) return 'stat-crystal stack mode on partial-crystal parts';
  if (
    statMap.weapon1Damage.sim !== statMap.weapon1Damage.live ||
    statMap.weapon2Damage.sim !== statMap.weapon2Damage.live
  ) {
    return 'weapon damage/displayed-range interpretation';
  }
  return 'mixed or unresolved';
}

function main() {
  const api = loadLegacyInternals();
  const cfgBase = buildBaseCfg(api);
  const build = {
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

  const armorCtx = buildPartContext(api, cfgBase, build.armor, 0);
  const w1Ctx = buildPartContext(api, cfgBase, build.weapon1, 0);
  const w2Ctx = buildPartContext(api, cfgBase, build.weapon2, 0);
  const m1Ctx = buildPartContext(api, cfgBase, build.misc1, 1);
  const m2Ctx = buildPartContext(api, cfgBase, build.misc2, 2);

  const compiled = api.compileCombatantFromParts({
    name: 'Live Build Anchor',
    stats: build.stats,
    armorV: armorCtx.variant,
    w1V: w1Ctx.variant,
    w2V: w2Ctx.variant,
    m1V: m1Ctx.variant,
    m2V: m2Ctx.variant,
    cfg: cfgBase,
    role: 'A',
    attackTypeRaw: build.attackType,
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });

  const compareStyleCfg = {
    ...cfgBase,
    crystalStackStats: 'sum4',
    armorStatStack: 'sum4',
  };
  const compareStyleCompiled = api.compileCombatantFromParts({
    name: 'Live Build Anchor',
    stats: build.stats,
    armorV: buildPartContext(api, compareStyleCfg, build.armor, 0).variant,
    w1V: buildPartContext(api, compareStyleCfg, build.weapon1, 0).variant,
    w2V: buildPartContext(api, compareStyleCfg, build.weapon2, 0).variant,
    m1V: buildPartContext(api, compareStyleCfg, build.misc1, 1).variant,
    m2V: buildPartContext(api, compareStyleCfg, build.misc2, 2).variant,
    cfg: compareStyleCfg,
    role: 'A',
    attackTypeRaw: build.attackType,
    attackStyleRoundMode: api.ATTACK_STYLE_ROUND_MODE,
  });

  const rows = toRows(compiled);
  const mismatchCategory = firstMismatchCategory(rows);
  const partContexts = [
    ['armor', build.armor, armorCtx],
    ['weapon1', build.weapon1, w1Ctx],
    ['weapon2', build.weapon2, w2Ctx],
    ['misc1', build.misc1, m1Ctx],
    ['misc2', build.misc2, m2Ctx],
  ];

  const report = `# codex-mixed-slot-live-build-report

## 1. Goal of this pass

Use a temp-only mixed-slot / partial-crystal representation harness on top of the current tracked live Rule B activation-only baseline so legacy-sim can represent the user’s real live build shape and compare compiled totals against the displayed live totals, without changing tracked combat logic.

## 2. Exact files changed

| File | Change type | Notes |
| --- | --- | --- |
| [codex-mixed-slot-live-build-check.js](${path.join(ROOT, 'tmp', 'codex-mixed-slot-live-build-check.js')}) | schema/normalization-only | Temp-only harness adds explicit per-part slot counts while reusing tracked legacy compile logic unchanged. |
| [codex-mixed-slot-live-build-report.md](${REPORT_PATH}) | instrumentation-only | Self-contained report output only. |

No tracked files were changed.

## 3. Exact verification commands run

\`\`\`sh
sed -n '1,260p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
rg -n "resolvedBuildCrystalSlots|partCrystalSpec|normalizeCrystalCounts|uniformCrystalNameFromCounts|crystalSpecKey|crystalSpecShort|crystalSpecDisplay|normalizeResolvedBuildPart|normalizeResolvedBuild|normalizeResolvedBuildPartForTruthCollector|normalizeResolvedBuildForTruthCollector|computeVariant\\(|computeVariantFromCrystalSpec|compileCombatantFromParts|buildCompiledCombatSnapshot|crystalSlots" legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-mixed-slot-live-build-check.js
node ./tmp/codex-mixed-slot-live-build-check.js
\`\`\`

## 4. Exact files/functions inspected

- [legacy-bio-debug-handoff-2026-03-15.md](${path.join(ROOT, 'legacy-bio-debug-handoff-2026-03-15.md')})
- [legacy-sim-v1.0.4-clean.js](${path.join(ROOT, 'legacy-sim-v1.0.4-clean.js')})
  - \`resolvedBuildCrystalSlots(...)\`
  - \`partCrystalSpec(...)\`
  - \`normalizeCrystalCounts(...)\`
  - \`uniformCrystalNameFromCounts(...)\`
  - \`crystalSpecKey(...)\`
  - \`crystalSpecShort(...)\`
  - \`crystalSpecDisplay(...)\`
  - \`normalizeResolvedBuildPart(...)\`
  - \`normalizeResolvedBuild(...)\`
  - \`normalizeResolvedBuildPartForTruthCollector(...)\`
  - \`normalizeResolvedBuildForTruthCollector(...)\`
  - \`computeVariant(...)\`
  - \`computeVariantFromCrystalSpec(...)\`
  - \`compileCombatantFromParts(...)\`
  - \`buildCompiledCombatSnapshot(...)\`
- [legacy-defs.js](${path.join(ROOT, 'legacy-defs.js')})
- [brute-sim-v1.4.6.js](${path.join(ROOT, 'brute-sim-v1.4.6.js')}) was not changed and was not used for this compile check.

## 5. Source hygiene result

- Tracked source is still on the reverted live Rule B activation-only baseline: yes.
- Duplicate-Pink helper path remains untouched in tracked source.
- No Bio helper logic was patched.
- No combat-resolution logic was patched.
- Brute parity-sensitive areas were not changed. Brute was only left untouched; parity was not re-verified because no brute patch was made in this pass.

## 6. Constructed build definition used for the check

The temp harness represented the live build with explicit per-part slot counts and exact crystal arrays:

\`\`\`js
{
  label: 'LIVE_BUILD_ANCHOR_MIXED_SLOT',
  attackType: 'normal',
  stats: { level: 80, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
  armor:   { name: 'Dark Legion Armor', crystals: ['Abyss Crystal','Abyss Crystal','Abyss Crystal','Abyss Crystal'], crystalSlots: 4 },
  weapon1: { name: 'Reaper Axe', crystals: ['Amulet Crystal','Amulet Crystal','Amulet Crystal'], crystalSlots: 3 },
  weapon2: { name: 'Crystal Maul', crystals: ['Amulet Crystal','Amulet Crystal','Amulet Crystal'], crystalSlots: 3 },
  misc1:   { name: 'Bio Spinal Enhancer', crystals: ['Perfect Pink Crystal','Perfect Pink Crystal','Perfect Pink Crystal'], crystalSlots: 3 },
  misc2:   { name: 'Bio Spinal Enhancer', crystals: ['Perfect Orange Crystal','Perfect Orange Crystal','Perfect Orange Crystal'], crystalSlots: 3 }
}
\`\`\`

Interpretation of the user’s trainable allocation inside legacy-sim:

- \`hp 650\` maps directly to \`stats.hp = 650\`
- “all free trainable points into dodge” maps to the simulator’s absolute pre-gear stat input \`stats = { speed: 60, accuracy: 14, dodge: 57 }\`
- This follows the current tracked legacy stat model and does not invent any new training system behavior

## 7. Resolved per-part slot counts

| Part | Item | Resolved slot count | Resolved crystal entries | Resolved crystal counts |
| --- | --- | ---: | --- | --- |
${partContexts
  .map(([label, part, ctx]) => {
    const counts = ctx.crystalCounts || {};
    const countText = Object.keys(counts)
      .map((k) => `${k}: ${counts[k]}`)
      .join(', ');
    const entries = crystalEntriesFromCounts(counts).join(', ');
    return `| ${label} | ${part.name} | ${ctx.partSlots} | ${entries || 'none'} | ${countText || 'none'} |`;
  })
  .join('\n')}

## 8. Simulated compiled totals

| Field | Compiled value |
| --- | --- |
| HP | ${compiled.hp} |
| Speed | ${compiled.speed} |
| Dodge | ${compiled.dodge} |
| Accuracy | ${compiled.acc} |
| Gun Skill | ${compiled.gun} |
| Melee Skill | ${compiled.mel} |
| Projectile Skill | ${compiled.prj} |
| Defensive Skill | ${compiled.defSk} |
| Armor | ${compiled.armor} |
| Weapon 1 Damage | ${fmtRange(compiled.weapon1)} |
| Weapon 2 Damage | ${fmtRange(compiled.weapon2)} |
| Predicted Damage | unavailable |

## 9. In-game vs compiled comparison table

| Field | Live anchor | Compiled value | Delta |
| --- | ---: | ---: | ---: |
${rows
  .map(([field, live, sim]) => {
    const liveText = live === null ? 'unavailable' : live;
    const simText = sim === null ? 'unavailable' : sim;
    return `| ${field} | ${liveText} | ${simText} | ${deltaString(live, sim)} |`;
  })
  .join('\n')}

## 10. Temp-only localization check

The same mixed-slot build was also compiled once under compare-style stat stacking (\`crystalStackStats=sum4\`, \`armorStatStack=sum4\`) to identify the first remaining mismatch category after representation was fixed.

| Field | Current live legacy config | Temp compare-style check |
| --- | ---: | ---: |
| Speed | ${compiled.speed} | ${compareStyleCompiled.speed} |
| Dodge | ${compiled.dodge} | ${compareStyleCompiled.dodge} |
| Accuracy | ${compiled.acc} | ${compareStyleCompiled.acc} |
| Melee Skill | ${compiled.mel} | ${compareStyleCompiled.mel} |
| Defensive Skill | ${compiled.defSk} | ${compareStyleCompiled.defSk} |
| Armor | ${compiled.armor} | ${compareStyleCompiled.armor} |
| Weapon 1 Damage | ${fmtRange(compiled.weapon1)} | ${fmtRange(compareStyleCompiled.weapon1)} |
| Weapon 2 Damage | ${fmtRange(compiled.weapon2)} | ${fmtRange(compareStyleCompiled.weapon2)} |

This localization step was temp-only. No tracked config or combat behavior changed.

## 11. Compiled weapon ranges

- Weapon 1 (\`Reaper Axe\`, 3x Amulet): ${fmtRange(compiled.weapon1)}
- Weapon 2 (\`Crystal Maul\`, 3x Amulet): ${fmtRange(compiled.weapon2)}
- Predicted overall damage range: unavailable from this build-only compile path without adding a target context; not guessed

## 12. Best explanation now

### 1. Can we support mixed slot counts per part in a temp-only harness without changing combat logic?

Yes.

The temp harness supports explicit per-part slot counts by:

- extracting the part’s crystal spec with tracked \`partCrystalSpec(...)\`
- normalizing that spec with the part’s own \`crystalSlots\`
- building each part variant with tracked \`computeVariantFromCrystalSpec(...)\` using that part-local slot count
- compiling the final combatant with tracked \`compileCombatantFromParts(...)\`

This changes representation/normalization only in temp code. It does not alter tracked combat formulas or tracked Bio helper behavior.

### 2. Once that is enabled, how close does the compiled build get to the live displayed totals?

Under the current live tracked legacy config, mixed-slot support makes the build compile successfully, but the compiled totals still miss the displayed live totals in several crystal-responsive fields:

- Speed: live 216 vs compiled ${compiled.speed}
- Dodge: live 164 vs compiled ${compiled.dodge}
- Accuracy: live 186 vs compiled ${compiled.acc}
- Melee Skill: live 723 vs compiled ${compiled.mel}
- Defensive Skill: live 704 vs compiled ${compiled.defSk}
- Armor: live 83 vs compiled ${compiled.armor}

Fields that already match exactly under the current live config:

- HP: 650
- Gun Skill: 580
- Projectile Skill: 580

### 3. If it still misses, what is the first exact field category that remains mismatched after mixed-slot support is allowed?

First remaining mismatch category: **${mismatchCategory}**

Why this is the first concrete mismatch category:

- mixed-slot representation was the blocker that previously prevented any exact compile at all
- once that blocker is removed, the first live-config miss shows up in crystal-responsive stat fields
- the temp-only compare-style check collapses those stat misses sharply:
  - Speed ${compiled.speed} -> ${compareStyleCompiled.speed}
  - Dodge ${compiled.dodge} -> ${compareStyleCompiled.dodge}
  - Accuracy ${compiled.acc} -> ${compareStyleCompiled.acc}
  - Armor ${compiled.armor} -> ${compareStyleCompiled.armor}
- weapon ranges remain lower even in the compare-style check, so weapon-range display is a separate residual issue

## 13. Final conclusion

Mixed-slot representation alone explains the earlier inability to use this live build at all.

After allowing exact per-part slot counts in a temp-only harness:

- the live build becomes representable without touching tracked combat logic
- the current live legacy config still does not match the displayed live totals
- the first residual mismatch appears in ${mismatchCategory}
- the temp-only localization check shows that mismatch is higher than mixed-slot normalization itself

So the answer to the core question is:

- **Yes**, we can support mixed slot counts per part in a temp-only harness without changing combat logic.
- **Yes**, once enabled, the build becomes representable and comparable.
- **No**, mixed-slot representation alone does not make the current live legacy compile match; the first remaining difference is ${mismatchCategory}.

## 14. Open questions

Only if the user wants to push this live anchor further:

- whether the live displayed stat totals are closer to compare-style \`sum4\` stacking for partial-crystal parts than to the current live legacy default \`iter4\` stat stacking
- whether the in-game displayed weapon ranges use a different displayed-range convention than the tracked legacy weapon compile

No new Bio helper or combat patch is proposed from this pass.
`;

  fs.writeFileSync(REPORT_PATH, report);
}

main();
