#!/usr/bin/env node
'use strict';

// =====================
// LEGACY BUILD VS DEFENDER SUITE v1.3 (WIKI-FAITHFUL COMBAT LOOP, MODERN ARMOR FORMULA)
// =====================
// Wiki-faithful changes vs v1.2:
// - Speed ties: attacker hits first (NOT 50/50 split)  :contentReference[oaicite:6]{index=6}
// - Sequential exchange: first hitter attacks, damage applied, defender retaliates ONLY if alive :contentReference[oaicite:7]{index=7}
// - Removed "min 1 damage on hit" (wiki doesn't state that for current formula) :contentReference[oaicite:8]{index=8}
//
// Still matches wiki:
// - Hit roll: random(acc/4,acc) - random(dodge/4,dodge) > 0  :contentReference[oaicite:9]{index=9}
// - Skill roll after hit roll; fail => "hit but no damage" (0 dmg) :contentReference[oaicite:10]{index=10}
// - Damage roll: damage = round(random(min,max)) :contentReference[oaicite:11]{index=11}
// - Modern armor: dealt = damage * (modifier/(modifier+armor)), modifier = level(capped80)*7/2 :contentReference[oaicite:12]{index=12}
//
// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP: 865,
  MAX_TURNS: 200, // interpreted here as max "exchanges" (attacks+possible retaliation)
  TRIALS: 30000,
};

// =====================
// HELPERS
// =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

// Wiki uses random(stat/4, stat). In practice Legacy is/was PHP-ish, which typically
// means integer random with integer casting of bounds.
// We'll implement "inclusive integer random" with floored bounds.
function randIntInclusive(min, max) {
  min = Math.floor(min);
  max = Math.floor(max);
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Wiki: x = random(off/4, off) - random(def/4, def); if (x > 0) success :contentReference[oaicite:13]{index=13}
function rollVs(off, def) {
  off = Math.max(0, off);
  def = Math.max(0, def);
  const x = randFloat(off / 4, off) - randFloat(def / 4, def);
  return x > 0; // strict >
}

// "Percentages Calculated" display-only formula (not used by sim) :contentReference[oaicite:14]{index=14}
function displayChancePct(a, d) {
  a = Math.max(0, a);
  d = Math.max(0, d);

  let x, pct;
  if (d > a) {
    x = a + 1 - d / 4;
    if (x < 0) x = 0;
    pct = ((x * (x / 2)) / ((d + 1 - d / 4) * (a + 1 - a / 4))) * 100;
  } else {
    x = d + 1 - a / 4;
    if (x < 0) x = 0;
    pct =
      (((d + 1 - d / 4) * (a + 1 - a / 4) - x * (x / 2)) / ((d + 1 - d / 4) * (a + 1 - a / 4))) *
      100;
  }
  if (!Number.isFinite(pct)) return 0;
  return clamp(pct, 0, 100);
}

// =====================
// BASE
// =====================
const BASE = {
  hp: SETTINGS.HP,
  level: SETTINGS.LEVEL,
  speed: 60,
  armor: 5,
  accuracy: 14,
  dodge: 14,
  gunSkill: 450,
  meleeSkill: 450,
  projSkill: 450,
  defSkill: 450,
};

// =====================
// CRYSTALS + ITEMS
// =====================
const CrystalDefs = {
  'Abyss Crystal': { pct: { armor: 0.05, dodge: 0.04, speed: 0.1, defSkill: 0.05 } },
  'Perfect Pink Crystal': { pct: { defSkill: 0.2 } },
  'Amulet Crystal': {
    pct: {
      accuracy: 0.06,
      damage: 0.06,
      gunSkill: 0.1,
      meleeSkill: 0.1,
      projSkill: 0.1,
      defSkill: 0.1,
    },
  },
  'Perfect Fire Crystal': { pct: { damage: 0.1 } },
  'Perfect Green Crystal': { pct: { gunSkill: 0.2 } },
  'Perfect Yellow Crystal': { pct: { projSkill: 0.2 } },
  'Perfect Orange Crystal': { pct: { meleeSkill: 0.2 } },
  'Cabrusion Crystal': { pct: { damage: 0.07, defSkill: 0.07, armor: 0.09, speed: 0.09 } },
};

function makeCrystal(name) {
  const def = CrystalDefs[name];
  if (!def) throw new Error(`Unknown crystal: ${name}`);
  return { name, ...def };
}

const ItemDefs = {
  'SG1 Armor': { type: 'Armor', flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 } },
  'Dark Legion Armor': {
    type: 'Armor',
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
  },
  'Hellforged Armor': {
    type: 'Armor',
    flatStats: { armor: 115, dodge: 65, speed: 55, defSkill: 55 },
  },

  'Crystal Maul': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  'Core Staff': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 75, accuracy: 55, meleeSkill: 110, defSkill: 50 },
    baseWeaponDamage: { min: 50, max: 60 },
  },
  'Void Axe': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 78, accuracy: 44, meleeSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 68, max: 96 },
  },
  'Scythe T2': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 75, accuracy: 42, meleeSkill: 65, defSkill: 18 },
    baseWeaponDamage: { min: 80, max: 101 },
  },
  'Void Sword': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 60, accuracy: 35, meleeSkill: 40, defSkill: 5 },
    baseWeaponDamage: { min: 90, max: 120 },
  },

  'Split Crystal Bombs T2': {
    type: 'Weapon',
    skillType: 'projSkill',
    flatStats: { speed: 79, accuracy: 23, projSkill: 84, defSkill: 80 },
    baseWeaponDamage: { min: 55, max: 87 },
  },
  'Void Bow': {
    type: 'Weapon',
    skillType: 'projSkill',
    flatStats: { speed: 70, accuracy: 48, projSkill: 65, defSkill: 20 },
    baseWeaponDamage: { min: 10, max: 125 },
  },

  'Rift Gun': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { speed: 50, accuracy: 85, gunSkill: 85, defSkill: 5 },
    baseWeaponDamage: { min: 60, max: 65 },
  },
  'Double Barrel Sniper Rifle': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  'Q15 Gun': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { speed: 120, accuracy: 42, gunSkill: 48, defSkill: 31 },
    baseWeaponDamage: { min: 82, max: 95 },
  },

  'Bio Spinal Enhancer': {
    type: 'Misc',
    flatStats: { dodge: 1, accuracy: 1, gunSkill: 65, meleeSkill: 65, projSkill: 65, defSkill: 65 },
  },
  'Scout Drones': {
    type: 'Misc',
    flatStats: {
      dodge: 5,
      accuracy: 32,
      gunSkill: 30,
      meleeSkill: 30,
      projSkill: 50,
      defSkill: 30,
    },
  },
  'Droid Drone': {
    type: 'Misc',
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 40, meleeSkill: 60 },
  },
  'Orphic Amulet': {
    type: 'Misc',
    flatStats: { speed: 20, accuracy: 20, gunSkill: 70, meleeSkill: 70, projSkill: 70 },
  },
  'Projector Bots': {
    type: 'Misc',
    flatStats: {
      dodge: 25,
      accuracy: 10,
      gunSkill: 5,
      meleeSkill: 15,
      projSkill: 40,
      defSkill: 40,
    },
  },
  'Recon Drones': {
    type: 'Misc',
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 60, projSkill: 40 },
  },
};

function all(name, n) {
  return Array.from({ length: n }, () => name);
}

function makeItem(name, crystalNames = []) {
  const def = ItemDefs[name];
  if (!def) throw new Error(`Unknown item: ${name}`);
  const sockets = crystalNames.map(makeCrystal);
  return {
    name,
    type: def.type,
    flatStats: { ...def.flatStats },
    skillType: def.skillType,
    baseWeaponDamage: def.baseWeaponDamage ? { ...def.baseWeaponDamage } : null,
    sockets,
  };
}

// =====================
// DEFENDER BUILDS
// =====================
const defenderBuilds = [
  {
    name: 'DL Gun Build',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Double Barrel Sniper Rifle', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 2',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Q15 Gun', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 3',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Double Barrel Sniper Rifle', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 3.1',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Double Barrel Sniper Rifle', all('Amulet Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 4',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Q15 Gun', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 4.1',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Q15 Gun', all('Amulet Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 5',
    hp: 700,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Double Barrel Sniper Rifle', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 6',
    hp: 700,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Q15 Gun', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 7',
    hp: 700,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Double Barrel Sniper Rifle', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Green Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Green Crystal', 4)),
    },
  },
  {
    name: 'DL Gun Build 8',
    hp: 700,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Rift Gun', all('Amulet Crystal', 4)),
      weapon2: makeItem('Q15 Gun', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    },
  },
  {
    name: 'Core/Void Build 1',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Core Staff', all('Amulet Crystal', 4)),
      weapon2: makeItem('Void Sword', all('Perfect Fire Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'T2 Scythe Build',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Scythe T2', all('Amulet Crystal', 4)),
      weapon2: makeItem('Scythe T2', all('Amulet Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'T2 Scythe Build 2',
    hp: 865,
    equipped: {
      armor: makeItem('Dark Legion Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Scythe T2', all('Amulet Crystal', 4)),
      weapon2: makeItem('Scythe T2', all('Amulet Crystal', 4)),
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Orange Crystal', 4)),
    },
  },
  {
    name: 'SG1 Split bombs',
    hp: 865,
    equipped: {
      armor: makeItem('SG1 Armor', all('Abyss Crystal', 4)),
      weapon1: makeItem('Split Crystal Bombs T2', all('Amulet Crystal', 4)),
      weapon2: makeItem('Split Crystal Bombs T2', all('Amulet Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
  {
    name: 'HF Core/Void',
    hp: 865,
    equipped: {
      armor: makeItem('Hellforged Armor', all('Cabrusion Crystal', 4)),
      weapon1: makeItem('Void Sword', all('Perfect Fire Crystal', 4)),
      weapon2: makeItem('Core Staff', all('Amulet Crystal', 4)),
      misc1: makeItem('Scout Drones', all('Amulet Crystal', 4)),
      misc2: makeItem('Scout Drones', all('Amulet Crystal', 4)),
    },
  },
];

// =====================
// BUILD CALC (CACHED)
// =====================
function itemPctSums(item) {
  const pctMap = {};
  for (const c of item.sockets) {
    const pct = c.pct || {};
    for (const [k, v] of Object.entries(pct)) pctMap[k] = (pctMap[k] || 0) + v;
  }
  return pctMap;
}

const itemBonusCache = new Map();
function itemKey(item) {
  return `${item.name}|${item.sockets.map((s) => s.name).join(',')}`;
}

function applyItemBonuses(item) {
  const key = itemKey(item);
  const cached = itemBonusCache.get(key);
  if (cached) return cached;

  const pctMap = itemPctSums(item);
  const stats = { ...item.flatStats };

  // Stat bonuses from crystals: ceil(itemStat * pctSum) per your prior approach
  for (const k in stats) stats[k] += Math.ceil(stats[k] * (pctMap[k] || 0));

  let weaponDamage = null;
  if (item.baseWeaponDamage) {
    const dmgPct = pctMap.damage || 0;
    weaponDamage = {
      min: Math.ceil(item.baseWeaponDamage.min * (1 + dmgPct)),
      max: Math.ceil(item.baseWeaponDamage.max * (1 + dmgPct)),
    };
  }

  const out = { ...item, __stats: stats, weaponDamage };
  itemBonusCache.set(key, out);
  return out;
}

function applyBuild(base, equipped, extraAcc = 0, extraDodge = 0) {
  const armorItem = equipped.armor ? applyItemBonuses(equipped.armor) : null;
  const w1 = equipped.weapon1 ? applyItemBonuses(equipped.weapon1) : null;
  const w2 = equipped.weapon2 ? applyItemBonuses(equipped.weapon2) : null;
  const m1 = equipped.misc1 ? applyItemBonuses(equipped.misc1) : null;
  const m2 = equipped.misc2 ? applyItemBonuses(equipped.misc2) : null;

  const out = { ...base, hp: equipped.hp ?? base.hp };

  [armorItem, w1, w2, m1, m2].filter(Boolean).forEach((it) => {
    const s = it.__stats || {};
    out.speed += s.speed || 0;
    out.accuracy += s.accuracy || 0;
    out.dodge += s.dodge || 0;
    out.gunSkill += s.gunSkill || 0;
    out.meleeSkill += s.meleeSkill || 0;
    out.projSkill += s.projSkill || 0;
    out.defSkill += s.defSkill || 0;
  });

  // Armor only from armor item (plus base armor)
  out.armor = base.armor + (armorItem?.__stats?.armor || 0);

  out.accuracy += extraAcc;
  out.dodge += extraDodge;

  // Keep integer stats
  [
    'speed',
    'armor',
    'accuracy',
    'dodge',
    'gunSkill',
    'meleeSkill',
    'projSkill',
    'defSkill',
  ].forEach((k) => {
    out[k] = Math.floor(out[k]);
  });

  out.__weapon1 = w1;
  out.__weapon2 = w2;
  return out;
}

// =====================
// COMBAT (WIKI-FAITHFUL SEQUENCE)
// =====================

// Wiki: damage = round(random(min, max)) :contentReference[oaicite:15]{index=15}
function randFloat(min, max) {
  if (max < min) return min;
  return Math.random() * (max - min) + min;
}

function rollWeaponRaw(w) {
  return Math.round(randFloat(w.weaponDamage.min, w.weaponDamage.max));
}

// Wiki current armor formula :contentReference[oaicite:16]{index=16}
function computeDamageArmor(level, raw, defenderArmor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  const dealt = raw * (modifier / (modifier + defenderArmor));
  return Math.round(dealt);
}

// One weapon attempt: accuracy roll, then skill roll, then damage
function attemptHit(att, def, weapon) {
  if (!weapon) return 0;

  // Determine Hit :contentReference[oaicite:17]{index=17}
  if (!rollVs(att.accuracy, def.dodge)) return 0;

  // Weapon Skill vs Defense Skill :contentReference[oaicite:18]{index=18}
  if (!rollVs(att[weapon.skillType], def.defSkill)) return 0;

  // Determine Damage :contentReference[oaicite:19]{index=19}
  const raw = rollWeaponRaw(weapon);
  return computeDamageArmor(att.level, raw, def.armor);
}

// One "page attack": 2 attacks, 1 with each weapon :contentReference[oaicite:20]{index=20}
function attackWithBothWeapons(att, def) {
  return attemptHit(att, def, att.__weapon1) + attemptHit(att, def, att.__weapon2);
}

// Wiki first-hit: higher speed first; tie => attacker first :contentReference[oaicite:21]{index=21}
// Also wiki implies alternating exchanges: attacker hits, if defender alive they hit back :contentReference[oaicite:22]{index=22}
function fightOnceWiki(p1, p2) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  // p1 is the "attacker" in your suite output sense.
  // Determine who goes first based on speed (tie => attacker (p1) first) :contentReference[oaicite:23]{index=23}
  let first = p1.speed >= p2.speed ? p1 : p2;
  let second = first === p1 ? p2 : p1;

  let exchanges = 0;

  while (p1hp > 0 && p2hp > 0 && exchanges < SETTINGS.MAX_TURNS) {
    exchanges++;

    // First attacks
    const dmgToSecond = attackWithBothWeapons(first, second);
    if (second === p1) p1hp -= dmgToSecond;
    else p2hp -= dmgToSecond;

    // If defender still alive, they hit back (retaliate) :contentReference[oaicite:24]{index=24}
    if (p1hp > 0 && p2hp > 0) {
      const dmgToFirst = attackWithBothWeapons(second, first);
      if (first === p1) p1hp -= dmgToFirst;
      else p2hp -= dmgToFirst;
    }

    // Next exchange: same first/second (speed decides first hit; wiki doesn't say it rerolls)
  }

  // Winner: whoever has hp > 0; if both <= 0 (possible via rounding), treat first as winner? (rare edge)
  const winnerIsP1 = p1hp > 0 ? true : p2hp > 0 ? false : first === p1;

  return { winnerIsP1, exchanges };
}

function runMatchWikiStyle(p1, p2, trials) {
  let p1Wins = 0;
  let exchangesTotal = 0;

  for (let i = 0; i < trials; i++) {
    const res = fightOnceWiki(p1, p2);
    if (res.winnerIsP1) p1Wins++;
    exchangesTotal += res.exchanges;
  }

  return {
    winPct: (p1Wins / trials) * 100,
    avgExchanges: exchangesTotal / trials,
  };
}

// =====================
// ATTACKER BUILD
// =====================
const attackerConfig = {
  name: 'YOU: CM + CS (baseline)',
  hp: 595,
  extraAcc: 0,
  extraDodge: 54,
  equipped: {
    armor: makeItem('SG1 Armor', all('Perfect Pink Crystal', 4)),
    weapon1: makeItem('Crystal Maul', all('Amulet Crystal', 4)),
    weapon2: makeItem('Core Staff', all('Amulet Crystal', 4)),
    misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
    misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
  },
};

// =====================
// DISPLAY CHANCES (NOT USED BY SIM)
// =====================
function computeDisplayChances(A, D) {
  const aHit = displayChancePct(A.accuracy, D.dodge);
  const dHit = displayChancePct(D.accuracy, A.dodge);

  const aW1 = A.__weapon1 ? displayChancePct(A[A.__weapon1.skillType], D.defSkill) : null;
  const aW2 = A.__weapon2 ? displayChancePct(A[A.__weapon2.skillType], D.defSkill) : null;

  const dW1 = D.__weapon1 ? displayChancePct(D[D.__weapon1.skillType], A.defSkill) : null;
  const dW2 = D.__weapon2 ? displayChancePct(D[D.__weapon2.skillType], A.defSkill) : null;

  return { aHit, dHit, aW1, aW2, dW1, dW2 };
}

// =====================
// MAIN
// =====================
console.log(`=== LEGACY MATCHUP SUITE (single attacker vs all defenders) ===`);
console.log(`Trials per defender: ${SETTINGS.TRIALS} | MaxExchanges: ${SETTINGS.MAX_TURNS}`);
console.log(`Combat core: WIKI-FAITHFUL (speed tie => attacker first, sequential retaliation)`);
console.log(`Armor: modern computeDamageArmor (wiki)\n`);

const attacker0 = applyBuild(
  BASE,
  { ...attackerConfig.equipped, hp: attackerConfig.hp },
  attackerConfig.extraAcc,
  attackerConfig.extraDodge,
);

console.log(`--- ATTACKER (derived) ---`);
console.log(
  `HP=${attacker0.hp} Lvl=${attacker0.level} Spd=${attacker0.speed} Arm=${attacker0.armor} Acc=${attacker0.accuracy} Dod=${attacker0.dodge}\n` +
    `Gun=${attacker0.gunSkill} Mel=${attacker0.meleeSkill} Prj=${attacker0.projSkill} Def=${attacker0.defSkill}\n` +
    `W1=${attacker0.__weapon1?.name || '-'} (${attacker0.__weapon1?.skillType || '-'}) dmg=${
      attacker0.__weapon1
        ? `${attacker0.__weapon1.weaponDamage.min}-${attacker0.__weapon1.weaponDamage.max}`
        : '-'
    }\n` +
    `W2=${attacker0.__weapon2?.name || '-'} (${attacker0.__weapon2?.skillType || '-'}) dmg=${
      attacker0.__weapon2
        ? `${attacker0.__weapon2.weaponDamage.min}-${attacker0.__weapon2.weaponDamage.max}`
        : '-'
    }\n`,
);

const rows = [];

for (const def of defenderBuilds) {
  const defender0 = applyBuild(BASE, { ...def.equipped, hp: def.hp });

  const disp = computeDisplayChances(attacker0, defender0);
  const r = runMatchWikiStyle(attacker0, defender0, SETTINGS.TRIALS);

  rows.push({
    name: def.name,
    winPct: r.winPct,
    avgExchanges: r.avgExchanges,
    aHit: disp.aHit,
    aSkillW1: disp.aW1,
    aSkillW2: disp.aW2,
    dHit: disp.dHit,
    dSkillW1: disp.dW1,
    dSkillW2: disp.dW2,
  });
}

// hardest first
rows.sort((a, b) => a.winPct - b.winPct);

console.log('--- RESULTS (hardest first) ---');
console.log(
  'Defender'.padEnd(22) + ' | Win%   Exchg | A(hit/skill1/skill2)        | D(hit/skill1/skill2)',
);
console.log('─'.repeat(95));

for (const row of rows) {
  const aTriple = `${row.aHit.toFixed(1)}/${(row.aSkillW1 ?? 0).toFixed(1)}/${(row.aSkillW2 ?? 0).toFixed(1)}`;
  const dTriple = `${row.dHit.toFixed(1)}/${(row.dSkillW1 ?? 0).toFixed(1)}/${(row.dSkillW2 ?? 0).toFixed(1)}`;

  console.log(
    `${row.name.padEnd(22)} | ${row.winPct.toFixed(2).padStart(6)} ${row.avgExchanges
      .toFixed(2)
      .padStart(7)} | ${aTriple.padEnd(28)} | ${dTriple}`,
  );
}

const best = rows.reduce((p, c) => (c.winPct > p.winPct ? c : p), rows[0]);
const worst = rows[0];

console.log('\nSummary:');
console.log(` - Easiest: ${best.name} (Win ${best.winPct.toFixed(2)}%)`);
console.log(` - Hardest: ${worst.name} (Win ${worst.winPct.toFixed(2)}%)`);

console.log('\nLegend:');
console.log(' - Win% = attacker win rate');
console.log(' - Exchg = average exchanges (attacks + possible retaliation)');
console.log(
  ' - A(hit/skill1/skill2) = DISPLAY % (wiki display formula): accuracy check, then weapon1 skill-vs-def, weapon2 skill-vs-def',
);
console.log(' - These display % are NOT used by the sim.\n');
