'use strict';

const path = require('path');
const truth = require(path.resolve(__dirname, 'legacy-truth-double-bio-probe.json'));
const { ItemDefs } = require(path.resolve(__dirname, '..', 'legacy-defs.js'));

const TARGET_ROWS = [
  'DL Dual Rift No Bio',
  'DL Dual Rift One Bio P4',
  'DL Dual Rift Two Bio P4',
  'DL Dual Rift Bio P4 + O4',
  'DL Core/Rift No Bio',
  'DL Core/Rift One Bio P4',
  'DL Core/Rift Two Bio P4',
  'DL Core/Rift Bio P4 + O4',
];

const CRYSTAL_SORT_ORDER = [
  'Amulet Crystal',
  'Perfect Pink Crystal',
  'Perfect Orange Crystal',
  'Perfect Green Crystal',
  'Perfect Yellow Crystal',
  'Perfect Fire Crystal',
  'Abyss Crystal',
  'Cabrusion Crystal',
  'Berserker Crystal',
];
const CRYSTAL_SORT_RANK = new Map(CRYSTAL_SORT_ORDER.map((name, idx) => [name, idx]));

function crystalSortNames(names) {
  return Array.from(new Set((Array.isArray(names) ? names : []).filter(Boolean))).sort((a, b) => {
    const ra = CRYSTAL_SORT_RANK.has(a) ? CRYSTAL_SORT_RANK.get(a) : 999;
    const rb = CRYSTAL_SORT_RANK.has(b) ? CRYSTAL_SORT_RANK.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b));
  });
}

function shortCrystal(c) {
  switch (c) {
    case 'Amulet Crystal':
      return 'A';
    case 'Perfect Pink Crystal':
      return 'P';
    case 'Perfect Orange Crystal':
      return 'O';
    case 'Perfect Green Crystal':
      return 'G';
    case 'Perfect Yellow Crystal':
      return 'Y';
    case 'Perfect Fire Crystal':
      return 'F';
    case 'Abyss Crystal':
      return 'B';
    case 'Cabrusion Crystal':
      return 'C';
    case 'Berserker Crystal':
      return 'Z';
    default:
      return String(c || '');
  }
}

function legacyCrystalSpecFromUpgradeArray(upgrades) {
  if (!Array.isArray(upgrades) || !upgrades.length) return '';
  const crystals = [];
  for (const raw of upgrades) {
    const name = String(raw || '').trim();
    if (!name) continue;
    crystals.push(name);
  }
  if (!crystals.length) return '';
  return crystals.length === 1 ? crystals[0] : crystals;
}

function legacyPartCrystalSpec(part) {
  if (!part) return '';
  if (Array.isArray(part.crystalMix) && part.crystalMix.length) return part.crystalMix;
  if (part.crystalMix && typeof part.crystalMix === 'object') return part.crystalMix;
  if (part.crystalCounts && typeof part.crystalCounts === 'object') return part.crystalCounts;
  if (Array.isArray(part.crystals) && part.crystals.length) return part.crystals;
  if (typeof part.crystal === 'string' && part.crystal) return part.crystal;
  if (typeof part.crystalName === 'string' && part.crystalName) return part.crystalName;
  if (Array.isArray(part.upgrades) && part.upgrades.length) {
    return legacyCrystalSpecFromUpgradeArray(part.upgrades);
  }
  if (typeof part.upgrades === 'string' && part.upgrades) return part.upgrades;
  return '';
}

function brutePartCrystalSpec(part) {
  if (!part) return '';
  if (part.crystalMix) return part.crystalMix;
  if (part.crystalCounts) return part.crystalCounts;
  if (part.crystals) return part.crystals;
  return part.crystal || part.crystalName || '';
}

function normalizeCrystalCounts(crystalSpec, totalSlots = 4) {
  if (typeof crystalSpec === 'string') {
    const name = crystalSpec.trim();
    if (!name) throw new Error('Missing crystal spec');
    return { [name]: totalSlots };
  }

  const out = Object.create(null);
  if (Array.isArray(crystalSpec)) {
    for (const raw of crystalSpec) {
      const name = String(raw || '').trim();
      if (!name) continue;
      out[name] = (out[name] || 0) + 1;
    }
    const names = Object.keys(out);
    if (names.length === 1 && out[names[0]] === 1) return { [names[0]]: totalSlots };
  } else if (crystalSpec && typeof crystalSpec === 'object') {
    if (Array.isArray(crystalSpec.crystalMix) && crystalSpec.crystalMix.length) {
      return normalizeCrystalCounts(crystalSpec.crystalMix, totalSlots);
    }
    if (crystalSpec.crystalCounts && typeof crystalSpec.crystalCounts === 'object') {
      return normalizeCrystalCounts(crystalSpec.crystalCounts, totalSlots);
    }
    if (crystalSpec.counts && typeof crystalSpec.counts === 'object') {
      return normalizeCrystalCounts(crystalSpec.counts, totalSlots);
    }
    if (typeof crystalSpec.crystal === 'string' && crystalSpec.crystal) {
      return normalizeCrystalCounts(crystalSpec.crystal, totalSlots);
    }
    if (typeof crystalSpec.crystalName === 'string' && crystalSpec.crystalName) {
      return normalizeCrystalCounts(crystalSpec.crystalName, totalSlots);
    }
    if (Array.isArray(crystalSpec.crystals) && crystalSpec.crystals.length) {
      return normalizeCrystalCounts(crystalSpec.crystals, totalSlots);
    }

    for (const [k, v] of Object.entries(crystalSpec)) {
      if (
        k === 'counts' ||
        k === 'crystal' ||
        k === 'crystalName' ||
        k === 'crystals' ||
        k === 'crystalMix' ||
        k === 'crystalCounts'
      ) {
        continue;
      }
      const name = String(k || '').trim();
      const n = Math.floor(Number(v));
      if (!name || !Number.isFinite(n) || n <= 0) continue;
      out[name] = (out[name] || 0) + n;
    }
  } else {
    throw new Error('Missing crystal spec');
  }

  const names = Object.keys(out);
  const total = names.reduce((sum, name) => sum + out[name], 0);
  if (total !== totalSlots) {
    throw new Error(`Crystal spec must use exactly ${totalSlots} slots (got ${total})`);
  }
  return Object.fromEntries(crystalSortNames(names).map((name) => [name, out[name]]));
}

function crystalSpecKey(crystalSpec, totalSlots = 4) {
  const counts = normalizeCrystalCounts(crystalSpec, totalSlots);
  return crystalSortNames(Object.keys(counts))
    .map((name) => `${name}:${counts[name]}`)
    .join(',');
}

function crystalSpecDisplay(crystalSpec, totalSlots = 4) {
  const counts = normalizeCrystalCounts(crystalSpec, totalSlots);
  const names = crystalSortNames(Object.keys(counts));
  if (names.length === 1 && counts[names[0]] === totalSlots) return names[0];
  return names
    .map((name) => `${name}${counts[name] === 1 ? '' : ` x${counts[name]}`}`)
    .join(' + ');
}

function crystalSpecShort(crystalSpec, totalSlots = 4) {
  const counts = normalizeCrystalCounts(crystalSpec, totalSlots);
  return crystalSortNames(Object.keys(counts))
    .map((name) => `${shortCrystal(name)}${counts[name] === 1 ? '' : counts[name]}`)
    .join('+');
}

function roundStat(x, roundMode) {
  return String(roundMode || 'ceil').toLowerCase() === 'floor' ? Math.floor(x) : Math.ceil(x);
}

function normalizeCrystalStackMode(mode) {
  return String(mode || 'sum4').toLowerCase() === 'iter4' ? 'iter4' : 'sum4';
}

function applyCrystalPctToStat(base, pctPerCrystal, n, roundMode, stackMode) {
  base = Number(base) || 0;
  pctPerCrystal = Number(pctPerCrystal) || 0;
  n = Math.max(0, n | 0);
  stackMode = normalizeCrystalStackMode(stackMode);

  let x = base;
  if (pctPerCrystal <= 0 || n <= 0 || x === 0) return x;
  if (stackMode === 'iter4') {
    for (let i = 0; i < n; i += 1) x = x + roundStat(x * pctPerCrystal, roundMode);
    return x;
  }
  return x + roundStat(x * (pctPerCrystal * n), roundMode);
}

function legacyCompiledMisc(part) {
  const spec = legacyPartCrystalSpec(part);
  if (!spec) {
    return {
      itemName: String(part && part.name || ''),
      crystalName: '',
      crystalMix: null,
      crystalSpecKey: '',
      exactBioPink4: false,
    };
  }
  const counts = normalizeCrystalCounts(spec, 4);
  return {
    itemName: String(part && part.name || ''),
    crystalName: crystalSpecDisplay(counts, 4),
    crystalMix: counts,
    crystalSpecKey: crystalSpecKey(counts, 4),
    exactBioPink4:
      String(part && part.name || '') === 'Bio Spinal Enhancer' &&
      crystalSpecKey(counts, 4) === 'Perfect Pink Crystal:4',
  };
}

function bruteRawMiscShape(part) {
  const spec = brutePartCrystalSpec(part);
  if (!spec) {
    return {
      rawSpecPresent: false,
      crystalName: '',
      crystalMix: null,
      crystalSpecKey: '',
    };
  }
  const counts = normalizeCrystalCounts(spec, 4);
  return {
    rawSpecPresent: true,
    crystalName: crystalSpecShort(counts, 4),
    crystalMix: counts,
    crystalSpecKey: crystalSpecKey(counts, 4),
  };
}

function legacyOverallShellPredicate(defender) {
  const armorName = defender.armor && defender.armor.name;
  const w1Name = defender.weapon1 && defender.weapon1.name;
  const w2Name = defender.weapon2 && defender.weapon2.name;
  const isDualRift = w1Name === 'Rift Gun' && w2Name === 'Rift Gun';
  const isCoreRift =
    (w1Name === 'Core Staff' && w2Name === 'Rift Gun') ||
    (w1Name === 'Rift Gun' && w2Name === 'Core Staff');
  const m1 = legacyCompiledMisc(defender.misc1);
  const m2 = legacyCompiledMisc(defender.misc2);
  const matched =
    armorName === 'Dark Legion Armor' &&
    (isDualRift || isCoreRift) &&
    m1.exactBioPink4 &&
    m2.exactBioPink4;
  return {
    matched,
    m1,
    m2,
  };
}

function legacyExperimentalBonusValue() {
  const bioDefSkill =
    ((((ItemDefs['Bio Spinal Enhancer'] || {}).flatStats || {}).defSkill || 0) >>> 0);
  const baseDef = applyCrystalPctToStat(bioDefSkill, 0.2, 4, 'ceil', 'sum4');
  const boostedDef = applyCrystalPctToStat(bioDefSkill, 0.25, 4, 'ceil', 'sum4');
  return {
    baseDef,
    boostedDef,
    bonus: (boostedDef - baseDef) * 2,
  };
}

function bruteExperimentalBonusValue() {
  const bioDefSkill =
    ((((ItemDefs['Bio Spinal Enhancer'] || {}).flatStats || {}).defSkill || 0) >>> 0);
  const baseDef = applyCrystalPctToStat(bioDefSkill, 0.2, 4, 'ceil', 'iter4');
  const boostedDef = applyCrystalPctToStat(bioDefSkill, 0.25, 4, 'ceil', 'iter4');
  return {
    baseDef,
    boostedDef,
    bonus: (boostedDef - baseDef) * 2,
  };
}

const rows = TARGET_ROWS.map((name) => {
  const matchup = (truth.matchups || []).find((entry) => entry.defender === name);
  if (!matchup) throw new Error(`Missing matchup: ${name}`);
  const defender = matchup.pageBuilds && matchup.pageBuilds.defender;
  const attacker = matchup.pageBuilds && matchup.pageBuilds.attacker;
  const legacy = legacyOverallShellPredicate(defender);
  return {
    defenderName: name,
    attackerName: matchup.attacker,
    defender,
    attacker,
    legacy,
    bruteMisc1Raw: bruteRawMiscShape(defender && defender.misc1),
    bruteMisc2Raw: bruteRawMiscShape(defender && defender.misc2),
    bonus: legacy.matched ? legacyExperimentalBonusValue().bonus : 0,
  };
});

const attacker = rows[0].attacker;
const attackerLegacy = legacyOverallShellPredicate({
  armor: attacker.armor,
  weapon1: attacker.weapon1,
  weapon2: attacker.weapon2,
  misc1: attacker.misc1,
  misc2: attacker.misc2,
});

const out = {
  targets: rows.map((row) => ({
    defenderName: row.defenderName,
    misc1: row.legacy.m1,
    misc2: row.legacy.m2,
    shellPredicateMatched: row.legacy.matched,
    experimentalBonus: row.bonus,
    bruteRawMisc1: row.bruteMisc1Raw,
    bruteRawMisc2: row.bruteMisc2Raw,
  })),
  attacker: {
    name: rows[0].attackerName,
    build: {
      armor: attacker.armor.name,
      weapon1: attacker.weapon1.name,
      weapon2: attacker.weapon2.name,
      misc1: legacyCompiledMisc(attacker.misc1),
      misc2: legacyCompiledMisc(attacker.misc2),
    },
    legacyPredicateMatched: attackerLegacy.matched,
    legacyExperimentalBonus: attackerLegacy.matched ? legacyExperimentalBonusValue().bonus : 0,
  },
  legacyBonusMath: legacyExperimentalBonusValue(),
  bruteBonusMath: bruteExperimentalBonusValue(),
};

console.log(JSON.stringify(out, null, 2));
