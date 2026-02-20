#!/usr/bin/env node
'use strict';

// =====================
// LEGACY BUILD VS DEFENDER SUITE v1.1 (clean output, no JSON)
// =====================
// Purpose:
// - Take ONE attacker build and run it vs ALL defender builds
// - Print: winrate, avg rounds, and "display-only" hit/skill chances (server-style)
// - Use SAME sim behavior as your brute force script (as described here):
//   - rollVs uses > 0 (no tie wins)
//   - rollWeaponRaw uses Math.random + Math.round
//   - computeDamageArmor uses Math.round
//
// Notes:
// - The "DISPLAY CHANCES" use the wiki display formula (NOT used by the sim).
// - This harness is for validating your Node sim vs in-game output.
//
// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP: 865,
  MAX_TURNS: 200,

  TRIALS: 30000, // set to 10000 to match your in-game baseline comparisons
};

// =====================
// HELPERS
// =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
// =====================
// RNG / ROLL MODES
// =====================
// Toggle this to compare behaviors:
// - "yours"  = int ranges using floor(stat/4) .. floor(stat)
// - "rodmk"  = float-ish ranges using (stat/4) .. stat (no coercion)
const ROLL_MODE = 'yours'; // <-- change to 'rodmk' to test

function randIntInclusive(min, max) {
  // your current behavior: integer inclusive
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randRodmk(min, max) {
  // rodmk behavior: uses (max - min + 1) and adds min, without int coercion
  // This returns floats when min/max are floats, which is what his code effectively does.
  return Math.random() * (max - min + 1) + min;
}

function rollVs(off, def) {
  off = Math.max(0, off);
  def = Math.max(0, def);

  if (ROLL_MODE === 'rodmk') {
    // rodmk-style: min is off/4 (float), max is off (int/float), no flooring
    const offRoll = randRodmk(off / 4, off);
    const defRoll = randRodmk(def / 4, def);
    return offRoll - defRoll > 0; // tie loses
  }

  // your current style: integer ranges with floor()
  const offRoll = randIntInclusive(Math.floor(off / 4), Math.floor(off));
  const defRoll = randIntInclusive(Math.floor(def / 4), Math.floor(def));
  return offRoll - defRoll > 0; // tie loses
}

// "Percentages Calculated" display-only formula (matches wiki-style shown to players)
// a = offensive, d = defensive; returns 0..100
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
    pct = (((d + 1 - d / 4) * x) / ((d + 1 - d / 4) * (a + 1 - a / 4))) * 100;
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
    flatStats: {
      dodge: 1,
      accuracy: 1,
      gunSkill: 65,
      meleeSkill: 65,
      projSkill: 65,
      defSkill: 65,
    },
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

  out.armor = base.armor + (armorItem?.__stats?.armor || 0);
  out.accuracy += extraAcc;
  out.dodge += extraDodge;

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
// COMBAT (unchanged behavior)
// =====================
function rollWeaponRaw(w) {
  const r = w.weaponDamage.min + Math.random() * (w.weaponDamage.max - w.weaponDamage.min);
  return Math.round(r);
}

function computeDamageArmor(level, raw, defenderArmor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  const dealt = raw * (modifier / (modifier + defenderArmor));
  return Math.round(dealt);
}

function doActorAction(actor, target) {
  const w1 = actor.__weapon1;
  const w2 = actor.__weapon2;

  let totalDamage = 0;

  if (w1) {
    if (rollVs(actor.accuracy, target.dodge) && rollVs(actor[w1.skillType], target.defSkill)) {
      totalDamage += computeDamageArmor(actor.level, rollWeaponRaw(w1), target.armor);
    }
  }
  if (w2) {
    if (rollVs(actor.accuracy, target.dodge) && rollVs(actor[w2.skillType], target.defSkill)) {
      totalDamage += computeDamageArmor(actor.level, rollWeaponRaw(w2), target.armor);
    }
  }

  const actual = Math.min(totalDamage, target.hp);
  target.hp = Math.max(0, target.hp - actual);
}

function pickFirst(att, def) {
  if (att.speed > def.speed) return 'A';
  if (def.speed > att.speed) return 'D';
  return 'A';
}

function runOnce(attackerBase, defenderBase, trials) {
  const origAHP = attackerBase.hp;
  const origDHP = defenderBase.hp;
  let aWins = 0;
  let turnsTotal = 0;

  for (let i = 0; i < trials; i++) {
    const A = { ...attackerBase, hp: origAHP };
    const D = { ...defenderBase, hp: origDHP };

    let actor = pickFirst(A, D) === 'A' ? A : D;
    let target = actor === A ? D : A;

    let actions = 0;
    while (A.hp > 0 && D.hp > 0 && actions < SETTINGS.MAX_TURNS * 2) {
      actions++;
      doActorAction(actor, target);
      const tmp = actor;
      actor = target;
      target = tmp;
    }

    turnsTotal += Math.ceil(actions / 2);
    if (A.hp > 0) aWins++;
  }

  return { winPct: (aWins / trials) * 100, avgTurns: turnsTotal / trials };
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
// DISPLAY CHANCES FOR A MATCHUP (NOT USED BY SIM)
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
console.log(`Trials per defender: ${SETTINGS.TRIALS} | MaxRounds: ${SETTINGS.MAX_TURNS}\n`);

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
  const r = runOnce(attacker0, defender0, SETTINGS.TRIALS);

  rows.push({
    name: def.name,
    winPct: r.winPct,
    avgRounds: r.avgTurns,
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
  'Defender'.padEnd(22) + ' | Win%   Rounds | A(hit/skill1/skill2)        | D(hit/skill1/skill2)',
);
console.log('─'.repeat(95));

for (const row of rows) {
  const aTriple = `${row.aHit.toFixed(1)}/${(row.aSkillW1 ?? 0).toFixed(1)}/${(row.aSkillW2 ?? 0).toFixed(1)}`;
  const dTriple = `${row.dHit.toFixed(1)}/${(row.dSkillW1 ?? 0).toFixed(1)}/${(row.dSkillW2 ?? 0).toFixed(1)}`;

  console.log(
    `${row.name.padEnd(22)} | ${row.winPct.toFixed(2).padStart(6)} ${row.avgRounds
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
console.log(' - Rounds = average rounds (ceil(actions/2), same as your sim)');
console.log(
  ' - A(hit/skill1/skill2) = DISPLAY % (wiki display formula): accuracy check, then weapon1 skill-vs-def, weapon2 skill-vs-def',
);
console.log(' - These display % are NOT used by the sim.\n');
