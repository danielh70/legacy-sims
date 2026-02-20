#!/usr/bin/env node
'use strict';

/**
 * =====================
 * LEGACY BRUTE FORCE (FAST + PARALLEL + HP/STAT SWEEP)
 * v1.8: HP sweep 400..600 step 25 + acc/dodge allocations from freed HP points
 * =====================
 *
 * Combat logic/math is unchanged:
 * - rollVs: random(off/4,off) - random(def/4,def) > 0   (float roll)
 * - skill check after hit check
 * - damage = round(random(min,max))
 * - armor formula: round(raw * (mod/(mod+armor))), mod=(level*7)/2, level capped 80
 * - speed decides first; tie => attacker first; sequential retaliation only if alive
 *
 * New search dimension:
 * - HP sweep: 400..600 in 25 HP steps
 * - 1 stat point = 5 HP
 * - At 865 HP: all points into HP (0 free points)
 * - For each HP: freePoints = (865 - HP)/5
 * - Test acc/dodge splits of those freePoints (no points into speed)
 *
 * Minimal reassurance checks:
 * - Prints variant counts, pair counts, plan counts, and total candidates
 * - Asserts worker ranges cover [0,total) without gaps/overlaps
 * - Prints HP plan table (HP, freePoints, #allocations) so you can sanity-check coverage
 */

const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP_MAX: 865,
  MAX_TURNS: 200,

  // Keep low for speed; override with LEGACY_TRIALS=...
  TRIALS_FAST: 450,

  // leaderboards
  KEEP_TOP_N_PER_HP: 8,

  PROGRESS_EVERY_MS: 1200,

  // Worker default: quad-core i7 => 4 usually best
  WORKERS_DEFAULT: 4,

  // HP sweep
  HP_MIN: 400,
  HP_MAX_SWEEP: 600,
  HP_STEP: 25,

  // Stat allocation sweep granularity (points, not HP)
  // freePoints can be up to (865-400)/5=93
  // step=5 => about ~19 allocations at HP=400
  STAT_STEP: 5,
};

// =====================
// BASE
// =====================
const BASE = {
  hp: SETTINGS.HP_MAX,
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
// HELPERS
// =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function nowMs() {
  return Date.now();
}
function padRight(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function shortCrystal(c) {
  switch (c) {
    case 'Amulet Crystal':
      return 'A';
    case 'Perfect Pink Crystal':
      return 'P';
    case 'Perfect Orange Crystal':
      return 'O';
    case 'Perfect Fire Crystal':
      return 'F';
    case 'Abyss Crystal':
      return 'B';
    case 'Cabrusion Crystal':
      return 'C';
    default:
      return '?';
  }
}
function shortItem(name) {
  return name
    .replace('Dark Legion Armor', 'DLArm')
    .replace('SG1 Armor', 'SG1')
    .replace('Hellforged Armor', 'HF')
    .replace('Crystal Maul', 'CM')
    .replace('Core Staff', 'CS')
    .replace('Void Axe', 'VA')
    .replace('Scythe T2', 'Scy')
    .replace('Void Sword', 'VS')
    .replace('Bio Spinal Enhancer', 'Bio')
    .replace('Scout Drones', 'Scout')
    .replace('Droid Drone', 'Droid')
    .replace('Orphic Amulet', 'Orphic')
    .replace('Projector Bots', 'ProjBot')
    .replace('Recon Drones', 'Recon');
}

// =====================
// RNG + COMBAT (unchanged)
// =====================
function randFloat(min, max) {
  if (max < min) return min;
  return Math.random() * (max - min) + min;
}
function rollVsFloat(off, def) {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;
  const x = randFloat(off / 4, off) - randFloat(def / 4, def);
  return x > 0;
}
function rollDamageRaw(min, max) {
  return Math.round(randFloat(min, max));
}
function computeDamageArmor(level, raw, defenderArmor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  const dealt = raw * (modifier / (modifier + defenderArmor));
  return Math.round(dealt);
}
function attemptHitFast(att, def, w) {
  if (!w) return 0;

  if (!rollVsFloat(att.acc, def.dodge)) return 0;

  const atkSkill = w.skill === 0 ? att.gun : w.skill === 1 ? att.mel : att.prj;
  if (!rollVsFloat(atkSkill, def.defSk)) return 0;

  const raw = rollDamageRaw(w.min, w.max);
  return computeDamageArmor(att.level, raw, def.armor);
}
function attackWithBothWeaponsFast(att, def) {
  return attemptHitFast(att, def, att.w1) + attemptHitFast(att, def, att.w2);
}
function fightOnceWikiFast(p1, p2, MAX_TURNS) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  const p1First = p1.speed >= p2.speed; // tie => attacker first
  const first = p1First ? p1 : p2;
  const second = p1First ? p2 : p1;

  let exchanges = 0;
  while (p1hp > 0 && p2hp > 0 && exchanges < MAX_TURNS) {
    exchanges++;

    const dmgToSecond = attackWithBothWeaponsFast(first, second);
    if (second === p1) p1hp -= dmgToSecond;
    else p2hp -= dmgToSecond;

    if (p1hp > 0 && p2hp > 0) {
      const dmgToFirst = attackWithBothWeaponsFast(second, first);
      if (first === p1) p1hp -= dmgToFirst;
      else p2hp -= dmgToFirst;
    }
  }

  const winnerIsP1 = p1hp > 0 ? true : p2hp > 0 ? false : first === p1;
  return { winnerIsP1, exchanges };
}
function runMatchWikiFast(p1, p2, trials, MAX_TURNS) {
  let p1Wins = 0;
  let exchangesTotal = 0;
  for (let i = 0; i < trials; i++) {
    const r = fightOnceWikiFast(p1, p2, MAX_TURNS);
    if (r.winnerIsP1) p1Wins++;
    exchangesTotal += r.exchanges;
  }
  return {
    winPct: (p1Wins / trials) * 100,
    avgExchanges: exchangesTotal / trials,
  };
}

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

// =====================
// DEFENDER BUILDS (unchanged)
// =====================
function mkItem(name, crystals4Same) {
  return { name, crystals4Same };
}
const defenderBuilds = [
  {
    name: 'DL Gun Build',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Double Barrel Sniper Rifle', 'Perfect Fire Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'DL Gun Build 2',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Q15 Gun', 'Perfect Fire Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'DL Gun Build 3',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Double Barrel Sniper Rifle', 'Perfect Fire Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
    },
  },
  {
    name: 'DL Gun Build 3.1',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Double Barrel Sniper Rifle', 'Amulet Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
    },
  },
  {
    name: 'DL Gun Build 4',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Q15 Gun', 'Perfect Fire Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
    },
  },
  {
    name: 'DL Gun Build 4.1',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Q15 Gun', 'Amulet Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
    },
  },
  {
    name: 'DL Gun Build 5',
    hp: 700,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Double Barrel Sniper Rifle', 'Perfect Fire Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'DL Gun Build 6',
    hp: 700,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Q15 Gun', 'Perfect Fire Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'DL Gun Build 7',
    hp: 700,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Double Barrel Sniper Rifle', 'Perfect Fire Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Green Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Green Crystal'),
    },
  },
  {
    name: 'DL Gun Build 8',
    hp: 700,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Rift Gun', 'Amulet Crystal'),
      weapon2: mkItem('Q15 Gun', 'Perfect Fire Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
    },
  },
  {
    name: 'Core/Void Build 1',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Core Staff', 'Amulet Crystal'),
      weapon2: mkItem('Void Sword', 'Perfect Fire Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'T2 Scythe Build',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Scythe T2', 'Amulet Crystal'),
      weapon2: mkItem('Scythe T2', 'Amulet Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'T2 Scythe Build 2',
    hp: 865,
    equipped: {
      armor: mkItem('Dark Legion Armor', 'Abyss Crystal'),
      weapon1: mkItem('Scythe T2', 'Amulet Crystal'),
      weapon2: mkItem('Scythe T2', 'Amulet Crystal'),
      misc1: mkItem('Bio Spinal Enhancer', 'Perfect Pink Crystal'),
      misc2: mkItem('Bio Spinal Enhancer', 'Perfect Orange Crystal'),
    },
  },
  {
    name: 'SG1 Split bombs',
    hp: 865,
    equipped: {
      armor: mkItem('SG1 Armor', 'Abyss Crystal'),
      weapon1: mkItem('Split Crystal Bombs T2', 'Amulet Crystal'),
      weapon2: mkItem('Split Crystal Bombs T2', 'Amulet Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
  {
    name: 'HF Core/Void',
    hp: 865,
    equipped: {
      armor: mkItem('Hellforged Armor', 'Cabrusion Crystal'),
      weapon1: mkItem('Void Sword', 'Perfect Fire Crystal'),
      weapon2: mkItem('Core Staff', 'Amulet Crystal'),
      misc1: mkItem('Scout Drones', 'Amulet Crystal'),
      misc2: mkItem('Scout Drones', 'Amulet Crystal'),
    },
  },
];

// =====================
// CRYSTAL CONSTRAINTS
// =====================
const LOCK_ONLY_AMULET = new Set([
  'Core Staff',
  'Rift Gun',
  'Void Axe',
  'Split Crystal Bombs T2',
  'Void Bow',
  'Scout Drones',
]);

function allowedCrystalsForItem(itemName, slotKind, archetype) {
  if (LOCK_ONLY_AMULET.has(itemName)) return ['Amulet Crystal'];

  if (itemName === 'Bio Spinal Enhancer') return ['Perfect Pink Crystal', 'Perfect Orange Crystal'];
  if (itemName === 'Dark Legion Armor') return ['Abyss Crystal'];
  if (itemName === 'SG1 Armor') return ['Perfect Pink Crystal', 'Abyss Crystal'];
  if (itemName === 'Hellforged Armor') return ['Cabrusion Crystal'];

  if (archetype === 'melee') {
    if (slotKind === 'weapon') {
      // non-locked melee weapons: Amulet or Fire
      return ['Amulet Crystal', 'Perfect Fire Crystal'];
    }
    if (slotKind === 'misc') {
      const flat = ItemDefs[itemName]?.flatStats || {};
      const out = ['Amulet Crystal'];
      if ((flat.meleeSkill || 0) > 0) out.push('Perfect Orange Crystal');
      if ((flat.defSkill || 0) > 0) out.push('Perfect Pink Crystal');
      return Array.from(new Set(out));
    }
  }
  return ['Amulet Crystal'];
}

// =====================
// VARIANT PRECOMPUTE (item + 4 identical crystals)
// =====================
function computeVariant(itemName, crystalName) {
  const idef = ItemDefs[itemName];
  const cdef = CrystalDefs[crystalName];
  if (!idef) throw new Error(`Unknown item: ${itemName}`);
  if (!cdef) throw new Error(`Unknown crystal: ${crystalName}`);

  const pct = cdef.pct || {};
  const pctSum = {};
  for (const k of Object.keys(pct)) pctSum[k] = (pct[k] || 0) * 4;

  const fs = idef.flatStats || {};

  const addSpeed = (fs.speed || 0) + Math.ceil((fs.speed || 0) * (pctSum.speed || 0));
  const addAcc = (fs.accuracy || 0) + Math.ceil((fs.accuracy || 0) * (pctSum.accuracy || 0));
  const addDod = (fs.dodge || 0) + Math.ceil((fs.dodge || 0) * (pctSum.dodge || 0));
  const addGun = (fs.gunSkill || 0) + Math.ceil((fs.gunSkill || 0) * (pctSum.gunSkill || 0));
  const addMel = (fs.meleeSkill || 0) + Math.ceil((fs.meleeSkill || 0) * (pctSum.meleeSkill || 0));
  const addPrj = (fs.projSkill || 0) + Math.ceil((fs.projSkill || 0) * (pctSum.projSkill || 0));
  const addDef = (fs.defSkill || 0) + Math.ceil((fs.defSkill || 0) * (pctSum.defSkill || 0));
  const addArmStat = (fs.armor || 0) + Math.ceil((fs.armor || 0) * (pctSum.armor || 0));

  let weapon = null;
  if (idef.baseWeaponDamage) {
    const dmgPctSum = pctSum.damage || 0;
    const min = Math.ceil(idef.baseWeaponDamage.min * (1 + dmgPctSum));
    const max = Math.ceil(idef.baseWeaponDamage.max * (1 + dmgPctSum));
    const skill = idef.skillType === 'gunSkill' ? 0 : idef.skillType === 'meleeSkill' ? 1 : 2;
    weapon = { min, max, skill };
  }

  return {
    itemName,
    crystalName,
    addSpeed,
    addAcc,
    addDod,
    addGun,
    addMel,
    addPrj,
    addDef,
    addArmStat,
    weapon,
  };
}

const variantCache = new Map();
function getVariant(itemName, crystalName) {
  const key = `${itemName}|${crystalName}`;
  let v = variantCache.get(key);
  if (!v) {
    v = computeVariant(itemName, crystalName);
    variantCache.set(key, v);
  }
  return v;
}

// =====================
// SEARCH SPACE: variants, pairs, and HP/stat plans
// =====================
const archetype = 'melee';

const meleeWeapons = ['Crystal Maul', 'Core Staff', 'Void Axe', 'Scythe T2', 'Void Sword'];
const armorChoices = ['SG1 Armor', 'Dark Legion Armor'];
const miscChoices = [
  'Bio Spinal Enhancer',
  'Scout Drones',
  'Droid Drone',
  'Orphic Amulet',
  'Projector Bots',
  'Recon Drones',
];

function buildVariantsForSlot(names, slotKind) {
  const out = [];
  for (const nm of names) {
    const crystals = allowedCrystalsForItem(nm, slotKind, archetype);
    for (const c of crystals) out.push(getVariant(nm, c));
  }
  return out;
}
function buildWeaponPairs(weaponVariants) {
  const pairs = [];
  for (let i = 0; i < weaponVariants.length; i++) {
    for (let j = i; j < weaponVariants.length; j++) pairs.push([i, j]); // orderless
  }
  return pairs;
}
function buildMiscPairsOrderless(miscVariants) {
  const pairs = [];
  for (let i = 0; i < miscVariants.length; i++) {
    const a = miscVariants[i];
    for (let j = i; j < miscVariants.length; j++) {
      const b = miscVariants[j];
      if (i === j) {
        const nm = a.itemName;
        if (!(nm === 'Bio Spinal Enhancer' || nm === 'Scout Drones')) continue;
      }
      pairs.push([i, j]);
    }
  }
  return pairs;
}

// Build HP/stat plans
function buildHpPlans() {
  const plans = [];
  const perHpSummary = [];
  for (let hp = SETTINGS.HP_MIN; hp <= SETTINGS.HP_MAX_SWEEP; hp += SETTINGS.HP_STEP) {
    const freePoints = Math.round((SETTINGS.HP_MAX - hp) / 5);
    if (freePoints < 0 || (SETTINGS.HP_MAX - hp) % 5 !== 0) {
      throw new Error(`HP sweep produced invalid freePoints for hp=${hp}`);
    }

    const step = Math.max(1, SETTINGS.STAT_STEP);
    const allocs = [];
    for (let accPts = 0; accPts <= freePoints; accPts += step) {
      const dodgePts = freePoints - accPts;
      allocs.push({ hp, extraAcc: accPts, extraDodge: dodgePts, freePoints });
    }
    // ensure endpoints included even if step doesn't land on them cleanly
    if (allocs.length === 0 || allocs[0].extraAcc !== 0)
      allocs.unshift({ hp, extraAcc: 0, extraDodge: freePoints, freePoints });
    if (allocs[allocs.length - 1].extraAcc !== freePoints)
      allocs.push({ hp, extraAcc: freePoints, extraDodge: 0, freePoints });

    // de-dupe in case step=1
    const uniq = new Map();
    for (const a of allocs) uniq.set(a.extraAcc, a);
    const allocs2 = Array.from(uniq.values()).sort((a, b) => a.extraAcc - b.extraAcc);

    perHpSummary.push({ hp, freePoints, allocCount: allocs2.length });
    for (const a of allocs2) plans.push(a);
  }
  return { plans, perHpSummary };
}

// =====================
// COMPILE DEFENDERS
// =====================
function compileDefender(def) {
  const e = def.equipped;
  const armorV = getVariant(e.armor.name, e.armor.crystals4Same);
  const w1V = getVariant(e.weapon1.name, e.weapon1.crystals4Same);
  const w2V = getVariant(e.weapon2.name, e.weapon2.crystals4Same);
  const m1V = getVariant(e.misc1.name, e.misc1.crystals4Same);
  const m2V = getVariant(e.misc2.name, e.misc2.crystals4Same);

  const speed = Math.floor(
    BASE.speed + armorV.addSpeed + w1V.addSpeed + w2V.addSpeed + m1V.addSpeed + m2V.addSpeed,
  );
  const acc = Math.floor(
    BASE.accuracy + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1V.addAcc + m2V.addAcc,
  );
  const dodge = Math.floor(
    BASE.dodge + armorV.addDod + w1V.addDod + w2V.addDod + m1V.addDod + m2V.addDod,
  );

  const gun = Math.floor(
    BASE.gunSkill + armorV.addGun + w1V.addGun + w2V.addGun + m1V.addGun + m2V.addGun,
  );
  const mel = Math.floor(
    BASE.meleeSkill + armorV.addMel + w1V.addMel + w2V.addMel + m1V.addMel + m2V.addMel,
  );
  const prj = Math.floor(
    BASE.projSkill + armorV.addPrj + w1V.addPrj + w2V.addPrj + m1V.addPrj + m2V.addPrj,
  );
  const defSk = Math.floor(
    BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1V.addDef + m2V.addDef,
  );

  const armor = Math.floor(BASE.armor + armorV.addArmStat);

  return {
    name: def.name,
    compiled: {
      hp: def.hp,
      level: BASE.level,
      speed,
      armor,
      acc,
      dodge,
      gun,
      mel,
      prj,
      defSk,
      w1: w1V.weapon,
      w2: w2V.weapon,
    },
  };
}

// =====================
// BUILD COMPILATION (attacker)
// =====================
function compileAttackerFromVariants(plan, av, w1v, w2v, m1v, m2v) {
  // NOTE: We do NOT allocate points into speed (per your request).
  // plan.extraAcc / plan.extraDodge are the *only* stat-point allocations.
  const speed = Math.floor(
    BASE.speed + av.addSpeed + w1v.addSpeed + w2v.addSpeed + m1v.addSpeed + m2v.addSpeed,
  );

  const acc = Math.floor(
    BASE.accuracy + av.addAcc + w1v.addAcc + w2v.addAcc + m1v.addAcc + m2v.addAcc + plan.extraAcc,
  );
  const dodge = Math.floor(
    BASE.dodge + av.addDod + w1v.addDod + w2v.addDod + m1v.addDod + m2v.addDod + plan.extraDodge,
  );

  const gun = Math.floor(
    BASE.gunSkill + av.addGun + w1v.addGun + w2v.addGun + m1v.addGun + m2v.addGun,
  );
  const mel = Math.floor(
    BASE.meleeSkill + av.addMel + w1v.addMel + w2v.addMel + m1v.addMel + m2v.addMel,
  );
  const prj = Math.floor(
    BASE.projSkill + av.addPrj + w1v.addPrj + w2v.addPrj + m1v.addPrj + m2v.addPrj,
  );
  const defSk = Math.floor(
    BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef,
  );

  const armor = Math.floor(BASE.armor + av.addArmStat);

  return {
    hp: plan.hp,
    level: BASE.level,
    speed,
    armor,
    acc,
    dodge,
    gun,
    mel,
    prj,
    defSk,
    w1: w1v.weapon,
    w2: w2v.weapon,
  };
}

// =====================
// LEADERBOARD + SCORING
// =====================
function pushLeaderboard(lb, entry, keepN) {
  lb.push(entry);
  lb.sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);
  if (lb.length > keepN) lb.length = keepN;
}

function evalCandidate(att, defendersCompiled, trials, MAX_TURNS) {
  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = '';

  for (let i = 0; i < defendersCompiled.length; i++) {
    const D = defendersCompiled[i];
    const r = runMatchWikiFast(att, D.compiled, trials, MAX_TURNS);
    sumWin += r.winPct;
    sumEx += r.avgExchanges;
    if (r.winPct < worstWin) {
      worstWin = r.winPct;
      worstName = D.name;
    }
  }

  return {
    avgWin: sumWin / defendersCompiled.length,
    avgEx: sumEx / defendersCompiled.length,
    worstWin,
    worstName,
  };
}

function buildLabel(plan, av, w1v, w2v, m1v, m2v, isBaseline = false) {
  const prefix = isBaseline ? 'BASE ' : '';
  return (
    prefix +
    `HP${plan.hp} A${plan.extraAcc} D${plan.extraDodge} | ` +
    `${shortItem(av.itemName)}[${shortCrystal(av.crystalName)}] ` +
    `${shortItem(w1v.itemName)}[${shortCrystal(w1v.crystalName)}]+${shortItem(w2v.itemName)}[${shortCrystal(w2v.crystalName)}] ` +
    `${shortItem(m1v.itemName)}[${shortCrystal(m1v.crystalName)}]+${shortItem(m2v.itemName)}[${shortCrystal(m2v.crystalName)}]`
  );
}

// =====================
// WORKER LOGIC
// =====================
function workerMain() {
  const {
    trials,
    maxTurns,
    keepTopNPerHp,
    progressEveryMs,

    armorVariants,
    weaponVariants,
    miscVariants,
    weaponPairs,
    miscPairs,
    defenders,

    plans, // flattened HP/stat plans

    startIndex,
    endIndex,

    // prune reference by plan: we pass a single conservative delta (not logic)
    pruneDelta,
  } = workerData;

  const WP = weaponPairs.length;
  const MP = miscPairs.length;
  const AV = armorVariants.length;

  const perGear = AV * WP * MP;
  const totalLocal = endIndex - startIndex;

  // per HP leaderboards (keyed by hp as string)
  const topsByHp = Object.create(null);

  const t0 = nowMs();
  let lastProgress = t0;

  let processed = 0;

  for (let globalIdx = startIndex; globalIdx < endIndex; globalIdx++) {
    processed++;

    // decode globalIdx into (planIdx, gearIdx)
    const planIdx = Math.floor(globalIdx / perGear);
    const gearIdx = globalIdx - planIdx * perGear;

    const plan = plans[planIdx];

    // decode gearIdx into (ai, wpi, mpi)
    const ai = Math.floor(gearIdx / (WP * MP));
    const rem = gearIdx - ai * (WP * MP);
    const wpi = Math.floor(rem / MP);
    const mpi = rem - wpi * MP;

    const av = armorVariants[ai];

    const wp = weaponPairs[wpi];
    const w1v = weaponVariants[wp[0]];
    const w2v = weaponVariants[wp[1]];

    const mp = miscPairs[mpi];
    const m1v = miscVariants[mp[0]];
    const m2v = miscVariants[mp[1]];

    // very cheap prune proxy (same style as before), but plan-aware on acc/dodge isn’t needed:
    // We prune only on gear-dependent core melee survivability-ish stats (mel+def+armor).
    // This does not change combat logic; it just skips clearly weak candidates.
    const mel = BASE.meleeSkill + av.addMel + w1v.addMel + w2v.addMel + m1v.addMel + m2v.addMel;
    const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;
    const armor = BASE.armor + av.addArmStat;

    // Baseline-ish reference per plan: we approximate by using "mel+def+armor + (some constant)".
    // We keep it conservative: only skip if VERY far below.
    if (mel + defSk + armor >= 1200 - pruneDelta) {
      const att = compileAttackerFromVariants(plan, av, w1v, w2v, m1v, m2v);
      const score = evalCandidate(att, defenders, trials, maxTurns);

      const hpKey = String(plan.hp);
      let lb = topsByHp[hpKey];
      if (!lb) lb = topsByHp[hpKey] = [];

      const floor = lb.length ? lb[lb.length - 1] : null;
      if (lb.length < keepTopNPerHp || score.worstWin >= floor.worstWin - 1e-9) {
        const label = buildLabel(plan, av, w1v, w2v, m1v, m2v, false);
        pushLeaderboard(
          lb,
          {
            label,
            ...score,
            stats: {
              hp: plan.hp,
              extraAcc: plan.extraAcc,
              extraDodge: plan.extraDodge,
              speed: att.speed,
              armor: att.armor,
              acc: att.acc,
              dodge: att.dodge,
              mel: att.mel,
              defSk: att.defSk,
            },
          },
          keepTopNPerHp,
        );
      }
    }

    const t = nowMs();
    if (t - lastProgress >= progressEveryMs) {
      lastProgress = t;

      // compute best seen so far across all HPs (for progress display only)
      let bestWorst = null;
      let bestAvg = null;
      for (const hpKey in topsByHp) {
        const lb = topsByHp[hpKey];
        if (!lb || !lb.length) continue;
        const b = lb[0];
        if (bestWorst === null || b.worstWin > bestWorst) {
          bestWorst = b.worstWin;
          bestAvg = b.avgWin;
        }
      }

      parentPort.postMessage({
        type: 'progress',
        processed,
        totalLocal,
        bestWorst,
        bestAvg,
      });
    }
  }

  parentPort.postMessage({
    type: 'done',
    processed,
    topsByHp,
    elapsedSec: (nowMs() - t0) / 1000,
  });
}

// =====================
// MAIN THREAD
// =====================
async function main() {
  // knobs
  const single = process.argv.includes('--single');
  const cpuCount = os.cpus().length || 1;
  const envW = parseInt(process.env.LEGACY_WORKERS || '', 10);
  const workers = single
    ? 1
    : Number.isFinite(envW) && envW > 0
      ? Math.min(envW, cpuCount)
      : Math.min(SETTINGS.WORKERS_DEFAULT, cpuCount);

  const envTrials = parseInt(process.env.LEGACY_TRIALS || '', 10);
  const TRIALS = Number.isFinite(envTrials) && envTrials > 0 ? envTrials : SETTINGS.TRIALS_FAST;

  // Build space
  const armorVariants = buildVariantsForSlot(armorChoices, 'armor');
  const weaponVariants = buildVariantsForSlot(meleeWeapons, 'weapon');
  const miscVariants = buildVariantsForSlot(miscChoices, 'misc');
  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderless(miscVariants);
  const defenders = defenderBuilds.map(compileDefender);

  const { plans, perHpSummary } = buildHpPlans();

  // Minimal reassurance prints (counts + plan table)
  const perGear = armorVariants.length * weaponPairs.length * miscPairs.length;
  const totalCandidates = plans.length * perGear;

  console.log(
    `LEGACY brute-force (v1.8) | melee attacker | defenders=${defenders.length} | trials/def=${TRIALS}`,
  );
  console.log(
    `Variants: armor=${armorVariants.length}, weapon=${weaponVariants.length}, misc=${miscVariants.length}`,
  );
  console.log(
    `Pairs(orderless): weaponPairs=${weaponPairs.length}, miscPairs=${miscPairs.length} (Bio+Bio and Scout+Scout allowed)`,
  );
  console.log(
    `HP sweep: ${SETTINGS.HP_MIN}..${SETTINGS.HP_MAX_SWEEP} step ${SETTINGS.HP_STEP} | statPoint=5HP | acc/dodge step=${SETTINGS.STAT_STEP}`,
  );
  console.log('HP plans (reassurance):');
  for (const r of perHpSummary) {
    console.log(
      `  HP=${r.hp} freePoints=${r.freePoints} allocs=${r.allocCount}  (acc+dodge=${r.freePoints}, speed=0)`,
    );
  }
  console.log(
    `Total plans=${plans.length} | perGear=${perGear} | totalCandidates=${totalCandidates}`,
  );
  console.log(`Workers=${workers}${single ? ' (single-thread forced)' : ''}\n`);

  // Global per-HP leaderboards
  const globalByHp = Object.create(null);
  for (const r of perHpSummary) globalByHp[String(r.hp)] = [];

  // Conservative prune delta (kept large so we don't accidentally skip plausible stuff)
  const pruneDelta = 260;

  // Range partition assurance
  function assertRangesCover(ranges, total) {
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
    if (sorted[0][0] !== 0) throw new Error('Worker ranges do not start at 0');
    if (sorted[sorted.length - 1][1] !== total)
      throw new Error('Worker ranges do not end at total');
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][0] !== sorted[i - 1][1]) throw new Error('Worker ranges have gap/overlap');
    }
  }

  // Single-thread fallback
  if (workers === 1) {
    const t0 = nowMs();
    let lastProgress = t0;

    const WP = weaponPairs.length;
    const MP = miscPairs.length;
    const AV = armorVariants.length;

    for (let globalIdx = 0; globalIdx < totalCandidates; globalIdx++) {
      const planIdx = Math.floor(globalIdx / perGear);
      const gearIdx = globalIdx - planIdx * perGear;

      const plan = plans[planIdx];

      const ai = Math.floor(gearIdx / (WP * MP));
      const rem = gearIdx - ai * (WP * MP);
      const wpi = Math.floor(rem / MP);
      const mpi = rem - wpi * MP;

      const av = armorVariants[ai];
      const wp = weaponPairs[wpi];
      const w1v = weaponVariants[wp[0]];
      const w2v = weaponVariants[wp[1]];
      const mp = miscPairs[mpi];
      const m1v = miscVariants[mp[0]];
      const m2v = miscVariants[mp[1]];

      const mel = BASE.meleeSkill + av.addMel + w1v.addMel + w2v.addMel + m1v.addMel + m2v.addMel;
      const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;
      const armor = BASE.armor + av.addArmStat;

      if (mel + defSk + armor >= 1200 - pruneDelta) {
        const att = compileAttackerFromVariants(plan, av, w1v, w2v, m1v, m2v);
        const score = evalCandidate(att, defenders, TRIALS, SETTINGS.MAX_TURNS);

        const hpKey = String(plan.hp);
        const lb = globalByHp[hpKey];

        const floor = lb.length ? lb[lb.length - 1] : null;
        if (lb.length < SETTINGS.KEEP_TOP_N_PER_HP || score.worstWin >= floor.worstWin - 1e-9) {
          const label = buildLabel(plan, av, w1v, w2v, m1v, m2v, false);
          pushLeaderboard(
            lb,
            {
              label,
              ...score,
              stats: {
                hp: plan.hp,
                extraAcc: plan.extraAcc,
                extraDodge: plan.extraDodge,
                speed: att.speed,
                armor: att.armor,
                acc: att.acc,
                dodge: att.dodge,
                mel: att.mel,
                defSk: att.defSk,
              },
            },
            SETTINGS.KEEP_TOP_N_PER_HP,
          );
        }
      }

      const t = nowMs();
      if (t - lastProgress >= SETTINGS.PROGRESS_EVERY_MS) {
        lastProgress = t;
        const elapsed = (t - t0) / 1000;

        // best overall across HPs for a quick progress line
        let best = null;
        for (const k in globalByHp) {
          const lb = globalByHp[k];
          if (!lb.length) continue;
          if (!best || lb[0].worstWin > best.worstWin) best = lb[0];
        }

        process.stdout.write(
          `\rtested=${globalIdx + 1}/${totalCandidates} elapsed=${elapsed.toFixed(1)}s bestWorst=${best ? best.worstWin.toFixed(2) : '—'}% bestAvg=${best ? best.avgWin.toFixed(2) : '—'}%   `,
        );
      }
    }

    process.stdout.write('\n');
    const elapsedAll = (nowMs() - t0) / 1000;
    printResults(globalByHp, elapsedAll, totalCandidates);
    return;
  }

  // =====================
  // PARALLEL WORKERS
  // =====================
  const start = nowMs();
  let lastRender = start;
  const processedByWorker = new Array(workers).fill(0);

  // partition [0,totalCandidates)
  const perWorker = Math.floor(totalCandidates / workers);
  const ranges = [];
  for (let w = 0; w < workers; w++) {
    const s = w * perWorker;
    const e = w === workers - 1 ? totalCandidates : (w + 1) * perWorker;
    ranges.push([s, e]);
  }
  assertRangesCover(ranges, totalCandidates);

  await new Promise((resolve, reject) => {
    let doneCount = 0;

    for (let w = 0; w < workers; w++) {
      const [startIndex, endIndex] = ranges[w];

      const wk = new Worker(__filename, {
        workerData: {
          trials: TRIALS,
          maxTurns: SETTINGS.MAX_TURNS,
          keepTopNPerHp: SETTINGS.KEEP_TOP_N_PER_HP,
          progressEveryMs: SETTINGS.PROGRESS_EVERY_MS,

          armorVariants,
          weaponVariants,
          miscVariants,
          weaponPairs,
          miscPairs,
          defenders,

          plans,

          startIndex,
          endIndex,

          pruneDelta,
        },
      });

      wk.on('message', (msg) => {
        if (!msg || !msg.type) return;

        if (msg.type === 'progress') {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          const t = nowMs();
          if (t - lastRender >= SETTINGS.PROGRESS_EVERY_MS) {
            lastRender = t;
            const doneProcessed = processedByWorker.reduce((a, b) => a + b, 0);
            const elapsed = (t - start) / 1000;

            // best overall across HPs for progress
            let best = null;
            for (const k in globalByHp) {
              const lb = globalByHp[k];
              if (!lb.length) continue;
              if (!best || lb[0].worstWin > best.worstWin) best = lb[0];
            }

            process.stdout.write(
              `\rtested~=${Math.min(doneProcessed, totalCandidates)}/${totalCandidates} elapsed=${elapsed.toFixed(1)}s bestWorst=${best ? best.worstWin.toFixed(2) : '—'}% bestAvg=${best ? best.avgWin.toFixed(2) : '—'}%   `,
            );
          }
        }

        if (msg.type === 'done') {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          // merge per-HP leaderboards
          const topsByHp = msg.topsByHp || {};
          for (const hpKey in topsByHp) {
            const localLB = topsByHp[hpKey];
            if (!localLB || !localLB.length) continue;

            const globalLB = globalByHp[hpKey] || (globalByHp[hpKey] = []);
            for (const e of localLB) pushLeaderboard(globalLB, e, SETTINGS.KEEP_TOP_N_PER_HP);
          }

          doneCount++;
          if (doneCount >= workers) resolve();
        }
      });

      wk.on('error', reject);
      wk.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
      });
    }
  });

  process.stdout.write('\n');
  const elapsedAll = (nowMs() - start) / 1000;
  printResults(globalByHp, elapsedAll, totalCandidates);
}

function printResults(globalByHp, elapsedSec, totalCandidates) {
  console.log(`\nDone. tested=${totalCandidates} | elapsed=${elapsedSec.toFixed(1)}s`);
  console.log(`Per-HP Top ${SETTINGS.KEEP_TOP_N_PER_HP} (ranked by worstWin, then avgWin)\n`);

  const hpKeys = Object.keys(globalByHp)
    .map((x) => parseInt(x, 10))
    .sort((a, b) => a - b);

  for (const hp of hpKeys) {
    const lb = globalByHp[String(hp)] || [];
    if (!lb.length) {
      console.log(`HP=${hp}: (no results kept)`);
      continue;
    }

    console.log(`HP=${hp}`);
    console.log(
      padRight('Rank', 5) +
        padRight('Worst%', 8) +
        padRight('WorstVs', 20) +
        padRight('Avg%', 7) +
        padRight('AvgEx', 7) +
        'Build',
    );
    console.log('─'.repeat(105));

    for (let i = 0; i < lb.length; i++) {
      const e = lb[i];
      console.log(
        padRight(`#${i + 1}`, 5) +
          padRight(e.worstWin.toFixed(2), 8) +
          padRight(e.worstName, 20) +
          padRight(e.avgWin.toFixed(2), 7) +
          padRight(e.avgEx.toFixed(2), 7) +
          e.label,
      );
    }

    const best = lb[0].stats;
    console.log(
      `Best stats: Acc=${best.acc} Dod=${best.dodge} Mel=${best.mel} Def=${best.defSk} Arm=${best.armor} Spd=${best.speed} (alloc A${best.extraAcc} D${best.extraDodge})\n`,
    );
  }
}

// =====================
// ENTRY
// =====================
if (isMainThread) {
  main().catch((err) => {
    console.error('\nFatal:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
} else {
  workerMain();
}
