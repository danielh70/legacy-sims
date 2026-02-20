#!/usr/bin/env node
'use strict';

/**
 * VERIFY LEGACY SIM AGAINST CAPTURED SERVER PAYLOADS
 *
 * - rollVs uses float RNG + Math.round:
 *     round(rand(off/4, off)) - round(rand(def/4, def)) > 0
 * - weapon raw damage roll uses round(rand(min,max))
 * - armor reduction uses modifier = 4*level (level 80 => 320)
 * - reduced damage uses Math.round(...)
 * - payload.stats (hp/level/speed/dodge/accuracy) are authoritative (stat points already applied)
 *
 * Robustness:
 * - crystal/item name normalization so minor payload formatting differences don't crash the sim
 */

const SETTINGS = {
  TRIALS: 5000, // set to 10000 to match server runs
  MAX_TURNS: 200,
};

// =====================
// RNG + ROLLS (FLOAT-ROUNDED)
// =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function randFloat(min, max) {
  if (max < min) return min;
  return Math.random() * (max - min) + min;
}

// round(rand(off/4, off)) - round(rand(def/4, def)) > 0
function rollVs(off, def) {
  off = Math.max(0, off);
  def = Math.max(0, def);
  const a = Math.round(randFloat(off / 4, off));
  const b = Math.round(randFloat(def / 4, def));
  return a - b > 0;
}

function rollWeaponRaw(w) {
  return Math.round(randFloat(w.weaponDamage.min, w.weaponDamage.max));
}

// Confirmed from your captures: modifier = 4*level, reduced damage = round(...)
function computeDamageArmor(level, raw, defenderArmor) {
  const L = clamp(level, 1, 80);
  const armor = Math.max(0, defenderArmor);
  const modifier = 4 * L; // level 80 => 320
  return Math.round(raw * (modifier / (modifier + armor)));
}

function attemptHit(att, def, weapon) {
  if (!weapon || !weapon.weaponDamage) return 0;
  if (!rollVs(att.accuracy, def.dodge)) return 0;
  if (!rollVs(att[weapon.skillType], def.defSkill)) return 0;
  const raw = rollWeaponRaw(weapon);
  return computeDamageArmor(att.level, raw, def.armor);
}

function attackWithBothWeapons(att, def) {
  return attemptHit(att, def, att.__weapon1) + attemptHit(att, def, att.__weapon2);
}

// Turn loop: faster attacks first; ties => attacker (p1) first
function fightOnce(p1, p2) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  const first = p1.speed >= p2.speed ? p1 : p2;
  const second = first === p1 ? p2 : p1;

  let turns = 0;
  while (p1hp > 0 && p2hp > 0 && turns < SETTINGS.MAX_TURNS) {
    turns++;

    const dmgToSecond = attackWithBothWeapons(first, second);
    if (second === p1) p1hp -= dmgToSecond;
    else p2hp -= dmgToSecond;

    if (p1hp > 0 && p2hp > 0) {
      const dmgToFirst = attackWithBothWeapons(second, first);
      if (first === p1) p1hp -= dmgToFirst;
      else p2hp -= dmgToFirst;
    }
  }

  const winnerIsP1 = p1hp > 0 ? true : p2hp > 0 ? false : first === p1;
  return { winnerIsP1, turns };
}

function runMatch(p1, p2, trials) {
  let p1Wins = 0;
  let turnsTotal = 0;
  for (let i = 0; i < trials; i++) {
    const r = fightOnce(p1, p2);
    if (r.winnerIsP1) p1Wins++;
    turnsTotal += r.turns;
  }
  return {
    winPct: (p1Wins / trials) * 100,
    avgTurns: turnsTotal / trials,
  };
}

// =====================
// BASES + ITEMS/CRYSTALS
// =====================
const BASE_SKILLS = { gunSkill: 450, meleeSkill: 450, projSkill: 450, defSkill: 450 };
const BASE_ARMOR = 5;

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

function normalizeCrystalName(name) {
  if (!name) return name;
  let s = String(name).trim();
  // common payload/typo variants
  if (s === 'AmuletCrystal') s = 'Amulet Crystal';
  // collapse repeated whitespace
  s = s.replace(/\s+/g, ' ');
  return s;
}

function makeCrystal(name) {
  const norm = normalizeCrystalName(name);
  const def = CrystalDefs[norm];
  if (!def) throw new Error(`Unknown crystal: ${norm}`);
  return { name: norm, ...def };
}

const ItemDefs = {
  'SG1 Armor': { type: 'Armor', flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 } },
  'Dark Legion Armor': {
    type: 'Armor',
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
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

  'Split Crystal Bombs T2': {
    type: 'Weapon',
    skillType: 'projSkill',
    flatStats: { speed: 79, accuracy: 23, projSkill: 84, defSkill: 80 },
    baseWeaponDamage: { min: 55, max: 87 },
  },

  'Rift Gun': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { speed: 50, accuracy: 85, gunSkill: 85, defSkill: 5 },
    baseWeaponDamage: { min: 60, max: 65 },
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
};

function makeItem(name, upgradeNames = []) {
  const def = ItemDefs[name];
  if (!def) throw new Error(`Unknown item: ${name}`);
  const sockets = (upgradeNames || []).map(makeCrystal);
  return {
    name,
    type: def.type,
    flatStats: { ...def.flatStats },
    skillType: def.skillType,
    baseWeaponDamage: def.baseWeaponDamage ? { ...def.baseWeaponDamage } : null,
    sockets,
  };
}

// Sum pct across sockets; add ceil(baseStat * totalPct) once (matches your tooltip)
const itemBonusCache = new Map();
function itemKey(item) {
  return `${item.name}|${item.sockets.map((s) => s.name).join(',')}`;
}

function applyItemBonuses(item) {
  const key = itemKey(item);
  if (itemBonusCache.has(key)) return itemBonusCache.get(key);

  const pctMap = {};
  for (const c of item.sockets) {
    for (const [k, v] of Object.entries(c.pct || {})) {
      pctMap[k] = (pctMap[k] || 0) + v;
    }
  }

  const stats = { ...item.flatStats };
  for (const k in stats) {
    stats[k] += Math.ceil(stats[k] * (pctMap[k] || 0));
  }

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

/**
 * Build a fighter directly from the server payload JSON.
 * payload.stats = { hp, level, speed, dodge, accuracy } AFTER stat points.
 */
function buildFromPayloadSide(side) {
  const stats = side.stats || {};
  const base = {
    hp: Number(stats.hp),
    level: Number(stats.level),
    speed: Number(stats.speed),
    dodge: Number(stats.dodge),
    accuracy: Number(stats.accuracy),
    armor: BASE_ARMOR,
    ...BASE_SKILLS,
  };

  const armorItem = side.armor
    ? applyItemBonuses(makeItem(side.armor.name, side.armor.upgrades))
    : null;
  const w1 = side.weapon1
    ? applyItemBonuses(makeItem(side.weapon1.name, side.weapon1.upgrades))
    : null;
  const w2 = side.weapon2
    ? applyItemBonuses(makeItem(side.weapon2.name, side.weapon2.upgrades))
    : null;
  const m1 = side.misc1 ? applyItemBonuses(makeItem(side.misc1.name, side.misc1.upgrades)) : null;
  const m2 = side.misc2 ? applyItemBonuses(makeItem(side.misc2.name, side.misc2.upgrades)) : null;

  const out = { ...base };

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

  out.armor = BASE_ARMOR + (armorItem?.__stats?.armor || 0);

  [
    'hp',
    'level',
    'speed',
    'dodge',
    'accuracy',
    'armor',
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

function runCaptured(name, captured) {
  const att = buildFromPayloadSide(captured.attacker);
  const def = buildFromPayloadSide(captured.defender);

  console.log(`\n=== ${name} ===`);
  console.log(
    `ATT: HP=${att.hp} Acc=${att.accuracy} Dodge=${att.dodge} Spd=${att.speed} Arm=${att.armor}`,
  );
  console.log(
    `DEF: HP=${def.hp} Acc=${def.accuracy} Dodge=${def.dodge} Spd=${def.speed} Arm=${def.armor}`,
  );

  const r = runMatch(att, def, SETTINGS.TRIALS);

  console.log(
    `Node:   winPct=${r.winPct.toFixed(2)}% avgTurns=${r.avgTurns.toFixed(4)} (trials=${SETTINGS.TRIALS})`,
  );
  console.log(
    `Server: winPct=${((captured.response.attackerWins / captured.response.times) * 100).toFixed(2)}% avgTurns=${captured.response.averageTurns.toFixed(4)} (trials=${captured.response.times})`,
  );
}

// =====================
// YOUR TWO CAPTURES
// =====================
const CAPTURE_DL_VS_GUN8 = {
  attacker: {
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Crystal Maul',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Core Staff',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc1: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
    misc2: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
    stats: { hp: '600', level: '80', speed: '60', dodge: '67', accuracy: '14' },
    attackType: 'normal',
  },
  defender: {
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Rift Gun',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Q15 Gun',
      upgrades: [
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
      ],
    },
    misc1: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
    misc2: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
    stats: { hp: '700', level: '80', speed: '60', dodge: '14', accuracy: '47' },
    attackType: 'normal',
  },
  response: { times: 10000, attackerWins: 6150, defenderWins: 3850, averageTurns: 13.0979 },
};

const CAPTURE_DL_VS_SPLITBOMBS = {
  attacker: CAPTURE_DL_VS_GUN8.attacker,
  defender: {
    armor: {
      name: 'SG1 Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Split Crystal Bombs T2',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Split Crystal Bombs T2',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc1: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    stats: { hp: '865', level: '80', speed: '60', dodge: '14', accuracy: '14' },
    attackType: 'normal',
  },
  response: { times: 10000, attackerWins: 5625, defenderWins: 4375, averageTurns: 17.5242 },
};

// =====================
// RUN
// =====================
console.log('Verifying Node sim against captured server matchups...');
runCaptured('Captured: DL (HP600 Dodge67) vs DL Gun Build 8 (HP700 Acc47)', CAPTURE_DL_VS_GUN8);
runCaptured(
  'Captured: DL (HP600 Dodge67) vs SG1 Split Bombs (HP865 base stats)',
  CAPTURE_DL_VS_SPLITBOMBS,
);
console.log('\nDone.');
