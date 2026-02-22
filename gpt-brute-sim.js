#!/usr/bin/env node
'use strict';

/**
 * =====================
 * LEGACY BRUTE FORCE (CONSTRAINED + STAGED + DETERMINISTIC RNG OPTION)
 * v2.9 + SEARCH-SPACE SANITY CHECKS
 * =====================
 *
 * What changed vs your v2.8:
 * - Removed a couple dead/unused variables.
 * - “Sanity check” expanded:
 *    - Prints EXACT superset counts: armorVariants, weaponVariants, miscVariants, weaponPairs, miscPairs.
 *    - Estimates the *effective* candidates after your per-candidate misc filtering
 *      (this is the important “are we missing combos?” check).
 *    - Shows per-mask misc keep rates (Gun/Gun, Melee/Melee, Gun+Proj, etc).
 * - Trimmed noisy logs (kept progress line + key run header + optional debug flags).
 *
 * Note: “missing combinations” usually means either:
 * - a pool item name typo (not found in ItemDefs), or
 * - crystal-allow rules are too strict (allowedCrystalsForX...), or
 * - miscVariantAllowedForWeaponMask filters more than you intended.
 * This sanity section makes those visible up-front.
 */

// =====================
// IMPORTS
// =====================
const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP_MAX: 865,
  MAX_TURNS: 200,

  // Stage B confirm (full)
  TRIALS_CONFIRM_DEFAULT: 10000,
  // Stage A screen (cheap)
  TRIALS_SCREEN_DEFAULT: 1000,

  // Gatekeeper mini-stage (cheaper than Stage A)
  TRIALS_GATE_DEFAULT: 500,
  GATEKEEPERS_DEFAULT: 3,

  SCREEN_BAIL_MARGIN_DEFAULT: 2.0,

  KEEP_TOP_N_PER_HP: 10,
  PROGRESS_EVERY_MS: 2000,

  // LOCKED ATTACKER STATS
  LOCKED_HP: 600,

  // pruning (default OFF; enable with LEGACY_PRUNE=1)
  PRUNE_DELTA_DEFAULT: 260,
  PRUNE_DEFAULT_ENABLED: false,

  WORKERS_DEFAULT_CAP: 4,

  // Mixed-weapon bonus default
  MIXED_WEAPON_BONUS: true,
};

// =====================
// POOLS: edit these to control what gets brute-forced
// (override via env vars; see parsePoolsFromEnv below)
// =====================
const POOLS = {
  armors: ['SG1 Armor', 'Dark Legion Armor'],
  weapons: [
    'Crystal Maul',
    'Core Staff',
    'Void Axe',
    'Scythe T2',
    'Void Sword',
    'Void Bow',
    'Split Crystal Bombs T2',
    'Rift Gun',
    'Double Barrel Sniper Rifle',
    'Q15 Gun',
  ],
  miscs: [
    'Bio Spinal Enhancer',
    'Scout Drones',
    'Droid Drone',
    'Orphic Amulet',
    'Projector Bots',
    'Recon Drones',
  ],
};

// =====================
// BASE STATS (server baseline)
// =====================
const BASE = {
  level: SETTINGS.LEVEL,
  hp: SETTINGS.HP_MAX,
  speed: 60,
  armor: 5,
  accuracy: 14,
  dodge: 14,
  gunSkill: 450,
  meleeSkill: 450,
  projSkill: 450,
  defSkill: 450,
  baseDamagePerHit: 5,
};

// =====================
// MIXED BONUS TOGGLE (env override)
// =====================
function mixedBonusEnabled() {
  const raw = String(process.env.LEGACY_MIXED_WEAPON_BONUS ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return !!SETTINGS.MIXED_WEAPON_BONUS;
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false;
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true;
  return !!SETTINGS.MIXED_WEAPON_BONUS;
}

// =====================
// SMALL HELPERS
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
function parseCsvList(s) {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
function parsePoolsFromEnv() {
  const a = process.env.LEGACY_ARMORS;
  const w = process.env.LEGACY_WEAPONS;
  const m = process.env.LEGACY_MISCS;

  return {
    armors: a ? parseCsvList(a) : POOLS.armors.slice(),
    weapons: w ? parseCsvList(w) : POOLS.weapons.slice(),
    miscs: m ? parseCsvList(m) : POOLS.miscs.slice(),
  };
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
    .replace('Split Crystal Bombs T2', 'Bombs')
    .replace('Void Bow', 'VBow')
    .replace('Rift Gun', 'Rift')
    .replace('Double Barrel Sniper Rifle', 'DBSR')
    .replace('Q15 Gun', 'Q15')
    .replace('Bio Spinal Enhancer', 'Bio')
    .replace('Scout Drones', 'Scout')
    .replace('Droid Drone', 'Droid')
    .replace('Orphic Amulet', 'Orphic')
    .replace('Projector Bots', 'ProjBot')
    .replace('Recon Drones', 'Recon');
}

// =====================
// WEAPON ARCHETYPE TAGGING (for reporting)
// =====================
function skillLabel(skillCode) {
  return skillCode === 0 ? 'Gun' : skillCode === 1 ? 'Melee' : 'Proj';
}
function weaponPairTagFromSkills(s1, s2) {
  const a = skillLabel(s1);
  const b = skillLabel(s2);
  return a <= b ? `${a}+${b}` : `${b}+${a}`;
}
function isBetterScore(a, b) {
  if (!b) return true;
  if (a.worstWin !== b.worstWin) return a.worstWin > b.worstWin;
  return a.avgWin > b.avgWin;
}

// =====================
// GLOBAL SHARED FLOOR (Atomics)
// =====================
const FLOOR_SCALE = 1_000_000;

function floorLoadPct(sharedFloorI32) {
  if (!sharedFloorI32) return null;
  const v = Atomics.load(sharedFloorI32, 0);
  if (v < 0) return null;
  return v / FLOOR_SCALE;
}
function floorTryRaise(sharedFloorI32, pct) {
  if (!sharedFloorI32) return;
  const next = Math.max(0, Math.min(100, pct));
  const nextI = (next * FLOOR_SCALE) | 0;

  while (true) {
    const cur = Atomics.load(sharedFloorI32, 0);
    if (cur >= nextI) return;
    const prev = Atomics.compareExchange(sharedFloorI32, 0, cur, nextI);
    if (prev === cur) return;
  }
}

// =====================
// RNG
// =====================
function makeRng(mode, seedA, seedB, seedC, seedD) {
  if (mode !== 'fast') return Math.random;

  // sfc32
  let a = seedA >>> 0,
    b = seedB >>> 0,
    c = seedC >>> 0,
    d = seedD >>> 0;
  return function rng() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
}
function mix32(x) {
  x |= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

// =====================
// COMBAT
// =====================
let RNG = Math.random;

function randFloat(min, max) {
  if (max < min) return min;
  return RNG() * (max - min) + min;
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
// Weapon skill encoding: 0=gun, 1=melee, 2=proj
function skillValue(att, skillCode) {
  return skillCode === 0 ? att.gun : skillCode === 1 ? att.mel : att.prj;
}
// Armor factor: mod/(mod+armor) with mod=(level*7)/2, level capped 80
function armorFactorForArmorValue(level, armor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  return modifier / (modifier + armor);
}
function attemptHitFast(att, def, w) {
  if (!w) return 0;
  if (!rollVsFloat(att.acc, def.dodge)) return 0;

  const atkSkill = skillValue(att, w.skill);
  if (!rollVsFloat(atkSkill, def.defSk)) return 0;

  const raw = rollDamageRaw(w.min, w.max) + att.baseDmg;
  return Math.round(raw * def.armorFactor);
}
function attackBoth(att, def) {
  return attemptHitFast(att, def, att.w1) + attemptHitFast(att, def, att.w2);
}
function fightOnceWikiFast(p1, p2, MAX_TURNS) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  const p1First = p1.speed >= p2.speed;
  const first = p1First ? p1 : p2;
  const second = p1First ? p2 : p1;

  let exchanges = 0;

  while (p1hp > 0 && p2hp > 0 && exchanges < MAX_TURNS) {
    exchanges++;

    const dmgToSecond = attackBoth(first, second);
    if (second === p1) p1hp -= dmgToSecond;
    else p2hp -= dmgToSecond;

    if (p1hp > 0 && p2hp > 0) {
      const dmgToFirst = attackBoth(second, first);
      if (first === p1) p1hp -= dmgToFirst;
      else p2hp -= dmgToFirst;
    }
  }

  let winnerIsP1;
  if (p1hp > 0 && p2hp <= 0) winnerIsP1 = 1;
  else if (p2hp > 0 && p1hp <= 0) winnerIsP1 = 0;
  else if (p1hp > 0 && p2hp > 0) {
    if (p1hp === p2hp) winnerIsP1 = p1First ? 1 : 0;
    else winnerIsP1 = p1hp > p2hp ? 1 : 0;
  } else {
    winnerIsP1 = p1First ? 1 : 0;
  }

  return (winnerIsP1 << 16) | (exchanges & 0xffff);
}
function runMatchPacked(p1, p2, trials, MAX_TURNS) {
  let wins = 0;
  let exSum = 0;
  for (let i = 0; i < trials; i++) {
    const packed = fightOnceWikiFast(p1, p2, MAX_TURNS);
    wins += (packed >>> 16) & 1;
    exSum += packed & 0xffff;
  }
  return [wins, exSum];
}

// =====================
// MIXED WEAPON BONUS HELPERS
// =====================
// If both weapons exist and skill types differ => [2,2] else [1,1]
function mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx) {
  if (!mixedBonusEnabled()) return [1, 1];
  if (w1SkillIdx === null || w2SkillIdx === null) return [1, 1];
  return w1SkillIdx === w2SkillIdx ? [1, 1] : [2, 2];
}

// =====================
// CRYSTALS + ITEMS
// =====================
const CrystalDefs = {
  'Abyss Crystal': {
    pct: { armor: 0.05, dodge: 0.04, speed: 0.1, defSkill: 0.05 },
  },
  'Perfect Pink Crystal': { pct: { defSkill: 0.2 } },
  'Perfect Orange Crystal': { pct: { meleeSkill: 0.2 } },
  'Perfect Green Crystal': { pct: { gunSkill: 0.2 } },
  'Perfect Yellow Crystal': { pct: { projSkill: 0.2 } },
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
  'Cabrusion Crystal': {
    pct: { damage: 0.07, defSkill: 0.07, armor: 0.09, speed: 0.09 },
  },
};

const ItemDefs = {
  // Armors
  'SG1 Armor': {
    type: 'Armor',
    flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 },
  },
  'Dark Legion Armor': {
    type: 'Armor',
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
  },
  'Hellforged Armor': {
    type: 'Armor',
    flatStats: { armor: 115, dodge: 65, speed: 55, defSkill: 55 },
  },

  // Melee weapons
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

  // Proj weapons
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

  // Gun weapons
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

  // Miscs
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
    flatStats: {
      speed: 20,
      accuracy: 20,
      gunSkill: 70,
      meleeSkill: 70,
      projSkill: 70,
    },
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
// DEFENDER PAYLOADS
// =====================
const DEFENDER_PAYLOADS = {
  'DL Gun Build': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Rift Gun',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Double Barrel Sniper Rifle',
      upgrades: [
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
      ],
    },
    misc1: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
  },
  'DL Gun Build 2': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
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
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
  },
  'DL Gun Build 3': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Rift Gun',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Double Barrel Sniper Rifle',
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
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
      ],
    },
    misc2: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
      ],
    },
  },
  'DL Gun Build 4': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
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
  },
  'DL Gun Build 7': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Rift Gun',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Double Barrel Sniper Rifle',
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
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
      ],
    },
    misc2: {
      name: 'Bio Spinal Enhancer',
      upgrades: [
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
        'Perfect Green Crystal',
      ],
    },
  },
  'Core/Void Build 1': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Core Staff',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Void Sword',
      upgrades: [
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
      ],
    },
    misc1: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
  },
  'T2 Scythe Build': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Scythe T2',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Scythe T2',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc1: {
      name: 'Bio Spinal Enhancer',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
  },
  'SG1 Split bombs': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
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
  },
  'HF Core/Void': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Hellforged Armor',
      upgrades: [
        'Cabrusion Crystal',
        'Cabrusion Crystal',
        'Cabrusion Crystal',
        'Cabrusion Crystal',
      ],
    },
    weapon1: {
      name: 'Void Sword',
      upgrades: [
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
        'Perfect Fire Crystal',
      ],
    },
    weapon2: {
      name: 'Core Staff',
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
  },
};

// =====================
// DEFENDER LIST (8)
// =====================
const DEFENDER_PRIORITY = [
  'DL Gun Build 3',
  'DL Gun Build 2',
  'DL Gun Build 7',
  'DL Gun Build 4',
  'SG1 Split bombs',
  'Core/Void Build 1',
  'T2 Scythe Build',
  'HF Core/Void',
];

const defenderBuilds = DEFENDER_PRIORITY.map((name) => {
  const p = DEFENDER_PAYLOADS[name];
  if (!p) throw new Error(`Missing DEFENDER_PAYLOADS entry for "${name}"`);
  return { name, payload: p };
});

// =====================
// LOCK_ONLY_AMULET (weapons-only)
// =====================
function parseLockOnlyAmuletFromEnv() {
  const raw = String(process.env.LEGACY_LOCK_ONLY_AMULET || '').trim();
  if (!raw) {
    return new Set([
      'Core Staff',
      'Rift Gun',
      'Void Bow',
      'Split Crystal Bombs T2',
      'Double Barrel Sniper Rifle',
      'Q15 Gun',
    ]);
  }
  return new Set(parseCsvList(raw));
}
const LOCK_ONLY_AMULET = parseLockOnlyAmuletFromEnv();

// =====================
// CRYSTAL CONSTRAINTS
// =====================
function allowedCrystalsForArmor(itemName) {
  if (itemName === 'Dark Legion Armor') return ['Abyss Crystal'];
  if (itemName === 'SG1 Armor') return ['Perfect Pink Crystal', 'Abyss Crystal'];
  if (itemName === 'Hellforged Armor') return ['Cabrusion Crystal'];
  return ['Abyss Crystal'];
}
function allowedCrystalsForWeapon(itemName) {
  if (LOCK_ONLY_AMULET.has(itemName)) return ['Amulet Crystal'];
  return ['Amulet Crystal', 'Perfect Fire Crystal'];
}

// Build a CONTEXT-FREE misc crystal superset for each misc item.
// Bio excludes amulet; non-bio includes amulet + (pink if defSkill>0) + (G/O/Y if that skill exists).
function allowedCrystalsForMiscSuperset(itemName) {
  const idef = ItemDefs[itemName];
  const flat = (idef && idef.flatStats) || {};

  const isBio = itemName === 'Bio Spinal Enhancer';

  const hasDef = (flat.defSkill || 0) > 0;
  const hasGun = (flat.gunSkill || 0) > 0;
  const hasMel = (flat.meleeSkill || 0) > 0;
  const hasPrj = (flat.projSkill || 0) > 0;

  const out = [];

  if (!isBio) {
    const amuletRelevant = (flat.accuracy || 0) > 0 || hasGun || hasMel || hasPrj || hasDef;
    if (amuletRelevant) out.push('Amulet Crystal');
  }

  if (hasDef) out.push('Perfect Pink Crystal');
  if (hasGun) out.push('Perfect Green Crystal');
  if (hasMel) out.push('Perfect Orange Crystal');
  if (hasPrj) out.push('Perfect Yellow Crystal');

  if (isBio) return out.filter((c) => c !== 'Amulet Crystal');
  return Array.from(new Set(out));
}

// weaponMask: bit0=gun, bit1=melee, bit2=proj
function miscVariantAllowedForWeaponMask(mv, weaponMask) {
  const isBio = mv.itemName === 'Bio Spinal Enhancer';

  if (mv.crystalName === 'Amulet Crystal') return !isBio;

  if (mv.crystalName === 'Perfect Pink Crystal') {
    return !!mv.__misc && !!mv.__misc.hasDef;
  }

  if (mv.crystalName === 'Perfect Green Crystal') {
    if (isBio) return (weaponMask & 0b001) !== 0;
    return !!mv.__misc && !!mv.__misc.hasGun && (weaponMask & 0b001) !== 0;
  }
  if (mv.crystalName === 'Perfect Orange Crystal') {
    if (isBio) return (weaponMask & 0b010) !== 0;
    return !!mv.__misc && !!mv.__misc.hasMel && (weaponMask & 0b010) !== 0;
  }
  if (mv.crystalName === 'Perfect Yellow Crystal') {
    if (isBio) return (weaponMask & 0b100) !== 0;
    return !!mv.__misc && !!mv.__misc.hasPrj && (weaponMask & 0b100) !== 0;
  }

  return false;
}

// =====================
// VARIANT COMPUTE (numbers only)
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

  let miscMeta = null;
  if (idef.type === 'Misc') {
    miscMeta = {
      hasDef: (fs.defSkill || 0) > 0,
      hasGun: (fs.gunSkill || 0) > 0,
      hasMel: (fs.meleeSkill || 0) > 0,
      hasPrj: (fs.projSkill || 0) > 0,
    };
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
    __misc: miscMeta,
  };
}

function buildVariantsForArmors(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForArmor(nm);
    for (const c of crystals) {
      const key = `${nm}|${c}`;
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c);
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function buildVariantsForWeapons(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForWeapon(nm);
    for (const c of crystals) {
      const key = `${nm}|${c}`;
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c);
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function buildVariantsForMiscsSuperset(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForMiscSuperset(nm);
    for (const c of crystals) {
      const key = `${nm}|${c}`;
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c);
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function buildWeaponPairs(weaponVariants) {
  const pairsA = [];
  for (let i = 0; i < weaponVariants.length; i++) {
    for (let j = i; j < weaponVariants.length; j++) pairsA.push(i, j);
  }
  return new Uint16Array(pairsA);
}

// Miscs: allow ANY duplicates for ANY item (fully orderless with dup allowed)
function buildMiscPairsOrderlessAllDup(miscVariants) {
  const pairsA = [];
  for (let i = 0; i < miscVariants.length; i++) {
    for (let j = i; j < miscVariants.length; j++) pairsA.push(i, j);
  }
  return new Uint16Array(pairsA);
}

// =====================
// LOCKED HP/stat plan
// =====================
function buildHpPlans() {
  const hp = SETTINGS.LOCKED_HP;
  const freePoints = Math.round((SETTINGS.HP_MAX - hp) / 5);

  if (freePoints < 0 || (SETTINGS.HP_MAX - hp) % 5 !== 0) {
    throw new Error(
      `Locked HP must be a multiple of 5 below HP_MAX. HP_MAX=${SETTINGS.HP_MAX} LOCKED_HP=${hp}`,
    );
  }

  // Default behavior: all free points to dodge (as in your runs)
  const plan = { hp, extraAcc: 0, extraDodge: freePoints, freePoints };
  return {
    plans: [plan],
    perHpSummary: [{ hp, freePoints, allocCount: 1 }],
  };
}

// =====================
// BUILD / COMPILE DEFENDERS
// =====================
function compileDefender(def, variantCacheLocal) {
  const p = def.payload;
  const st = p.stats;

  const armorV = variantCacheLocal.get(`${p.armor.name}|${p.armor.upgrades[0]}`);
  const w1V = variantCacheLocal.get(`${p.weapon1.name}|${p.weapon1.upgrades[0]}`);
  const w2V = variantCacheLocal.get(`${p.weapon2.name}|${p.weapon2.upgrades[0]}`);
  const m1V = variantCacheLocal.get(`${p.misc1.name}|${p.misc1.upgrades[0]}`);
  const m2V = variantCacheLocal.get(`${p.misc2.name}|${p.misc2.upgrades[0]}`);
  if (!armorV || !w1V || !w2V || !m1V || !m2V)
    throw new Error(`Missing variant cache entries for defender ${def.name}`);

  const baseSpeed = Math.floor(Number(st.speed));
  const baseAcc = Math.floor(Number(st.accuracy));
  const baseDod = Math.floor(Number(st.dodge));
  const hp = Math.floor(Number(st.hp));
  const level = Math.floor(Number(st.level));

  const speed =
    baseSpeed + armorV.addSpeed + w1V.addSpeed + w2V.addSpeed + m1V.addSpeed + m2V.addSpeed;
  const acc = baseAcc + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1V.addAcc + m2V.addAcc;
  const dodge = baseDod + armorV.addDod + w1V.addDod + w2V.addDod + m1V.addDod + m2V.addDod;

  const w1SkillIdx = w1V.weapon ? w1V.weapon.skill : null;
  const w2SkillIdx = w2V.weapon ? w2V.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  const w1Gun = w1V.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2V.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1V.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2V.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1V.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2V.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + armorV.addGun + w1Gun + w2Gun + m1V.addGun + m2V.addGun;
  const mel = BASE.meleeSkill + armorV.addMel + w1Mel + w2Mel + m1V.addMel + m2V.addMel;
  const prj = BASE.projSkill + armorV.addPrj + w1Prj + w2Prj + m1V.addPrj + m2V.addPrj;

  const defSk = BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1V.addDef + m2V.addDef;

  const armor = BASE.armor + armorV.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor);

  return {
    name: def.name,
    hp,
    level,
    speed: Math.floor(speed),
    armor: Math.floor(armor),
    armorFactor,
    acc: Math.floor(acc),
    dodge: Math.floor(dodge),
    gun: Math.floor(gun),
    mel: Math.floor(mel),
    prj: Math.floor(prj),
    defSk: Math.floor(defSk),
    w1: w1V.weapon,
    w2: w2V.weapon,
    baseDmg: BASE.baseDamagePerHit,
  };
}

// =====================
// COMPILE ATTACKER
// =====================
function compileAttacker(plan, av, w1v, w2v, m1v, m2v) {
  const level = BASE.level;

  const speed =
    BASE.speed + av.addSpeed + w1v.addSpeed + w2v.addSpeed + m1v.addSpeed + m2v.addSpeed;

  const acc =
    BASE.accuracy + av.addAcc + w1v.addAcc + w2v.addAcc + m1v.addAcc + m2v.addAcc + plan.extraAcc;

  const dodge =
    BASE.dodge + av.addDod + w1v.addDod + w2v.addDod + m1v.addDod + m2v.addDod + plan.extraDodge;

  const w1SkillIdx = w1v.weapon ? w1v.weapon.skill : null;
  const w2SkillIdx = w2v.weapon ? w2v.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  const w1Gun = w1v.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2v.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1v.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2v.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1v.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2v.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + av.addGun + w1Gun + w2Gun + m1v.addGun + m2v.addGun;
  const mel = BASE.meleeSkill + av.addMel + w1Mel + w2Mel + m1v.addMel + m2v.addMel;
  const prj = BASE.projSkill + av.addPrj + w1Prj + w2Prj + m1v.addPrj + m2v.addPrj;

  const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;

  const armor = BASE.armor + av.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor);

  return {
    hp: plan.hp,
    level,
    speed: Math.floor(speed),
    armor: Math.floor(armor),
    armorFactor,
    acc: Math.floor(acc),
    dodge: Math.floor(dodge),
    gun: Math.floor(gun),
    mel: Math.floor(mel),
    prj: Math.floor(prj),
    defSk: Math.floor(defSk),
    w1: w1v.weapon,
    w2: w2v.weapon,
    baseDmg: BASE.baseDamagePerHit,
  };
}

// =====================
// LEADERBOARD
// =====================
function pushLeaderboard(lb, entry, keepN) {
  lb.push(entry);
  lb.sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);
  if (lb.length > keepN) lb.length = keepN;
}

function buildLabel(plan, av, w1v, w2v, m1v, m2v) {
  return (
    `HP${plan.hp} A${plan.extraAcc} D${plan.extraDodge} | ` +
    `${shortItem(av.itemName)}[${shortCrystal(av.crystalName)}] ` +
    `${shortItem(w1v.itemName)}[${shortCrystal(w1v.crystalName)}]+${shortItem(w2v.itemName)}[${shortCrystal(w2v.crystalName)}] ` +
    `${shortItem(m1v.itemName)}[${shortCrystal(m1v.crystalName)}]+${shortItem(m2v.itemName)}[${shortCrystal(m2v.crystalName)}]`
  );
}

// =====================
// STAGED EVALUATION (with Gatekeepers)
// =====================
function evalCandidateStaged({
  att,
  defenders,
  maxTurns,
  trialsGate,
  gatekeepers,
  trialsScreen,
  trialsConfirm,
  floorWorst,
  bailMargin,
  deterministic,
  baseSeed,
  candidateKey,
  stageTagG = 0,
  stageTagA = 1,
  stageTagB = 2,
}) {
  function setDetRng(i, tag) {
    const s = mix32((baseSeed ^ mix32(candidateKey ^ (i * 0x9e3779b9) ^ tag)) | 0);
    RNG = makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d);
  }

  if (floorWorst !== null && gatekeepers > 0 && trialsGate > 0) {
    let worstG = 101;
    let worstNameG = '';

    const gCount = Math.min(gatekeepers, defenders.length);
    for (let i = 0; i < gCount; i++) {
      if (deterministic) setDetRng(i, stageTagG);

      const D = defenders[i];
      const [wins] = runMatchPacked(att, D, trialsGate, maxTurns);
      const winPct = (wins / trialsGate) * 100;

      if (winPct < worstG) {
        worstG = winPct;
        worstNameG = D.name;

        if (worstG + 1e-9 < floorWorst - bailMargin) {
          return {
            avgWin: -1,
            avgEx: 0,
            worstWin: worstG,
            worstName: worstNameG,
            bailed: true,
            stage: 'G',
          };
        }
      }
    }
  }

  let worstA = 101;
  let worstNameA = '';

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) setDetRng(i, stageTagA);

    const D = defenders[i];
    const [wins] = runMatchPacked(att, D, trialsScreen, maxTurns);
    const winPct = (wins / trialsScreen) * 100;

    if (winPct < worstA) {
      worstA = winPct;
      worstNameA = D.name;

      if (floorWorst !== null && worstA + 1e-9 < floorWorst - bailMargin) {
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin: worstA,
          worstName: worstNameA,
          bailed: true,
          stage: 'A',
        };
      }
    }
  }

  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = '';

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) setDetRng(i, stageTagB);

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
    const winPct = (wins / trialsConfirm) * 100;
    const avgEx = exSum / trialsConfirm;

    sumWin += winPct;
    sumEx += avgEx;

    if (winPct < worstWin) {
      worstWin = winPct;
      worstName = D.name;

      if (floorWorst !== null && worstWin + 1e-9 < floorWorst) {
        return { avgWin: -1, avgEx: 0, worstWin, worstName, bailed: true, stage: 'B' };
      }
    }
  }

  return {
    avgWin: sumWin / defenders.length,
    avgEx: sumEx / defenders.length,
    worstWin,
    worstName,
    bailed: false,
    stage: 'B',
  };
}

// =====================
// SEARCH-SPACE SANITY CHECKS
// =====================
function maskName(mask) {
  if (mask === 0b001) return 'Gun+Gun';
  if (mask === 0b010) return 'Melee+Melee';
  if (mask === 0b100) return 'Proj+Proj';
  if (mask === (0b001 | 0b010)) return 'Gun+Melee';
  if (mask === (0b001 | 0b100)) return 'Gun+Proj';
  if (mask === (0b010 | 0b100)) return 'Melee+Proj';
  return `mask(${mask.toString(2)})`;
}

function buildAllowedMiscTable(miscVariants) {
  // For each mask, store a boolean array allowed[maskIdx][i]
  const masks = [0b001, 0b010, 0b100, 0b001 | 0b010, 0b001 | 0b100, 0b010 | 0b100];
  const allow = new Array(masks.length);
  for (let mi = 0; mi < masks.length; mi++) {
    const m = masks[mi];
    const a = new Uint8Array(miscVariants.length);
    for (let i = 0; i < miscVariants.length; i++) {
      a[i] = miscVariantAllowedForWeaponMask(miscVariants[i], m) ? 1 : 0;
    }
    allow[mi] = a;
  }
  return { masks, allow };
}

function estimateEffectiveCounts(
  armorVariants,
  weaponVariants,
  weaponPairs,
  miscVariants,
  miscPairs,
) {
  const AV = armorVariants.length;
  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const { masks, allow } = buildAllowedMiscTable(miscVariants);

  // Count kept miscPairs for each mask, exactly (iterate miscPairs once per mask).
  const keptPairsByMask = new Map();
  for (let mi = 0; mi < masks.length; mi++) {
    const a = allow[mi];
    let keptPairs = 0;
    for (let p = 0; p < miscPairs.length; p += 2) {
      const i = miscPairs[p];
      const j = miscPairs[p + 1];
      if (a[i] && a[j]) keptPairs++;
    }
    keptPairsByMask.set(masks[mi], keptPairs);
  }

  // Count weaponPairs by mask
  const weaponPairsByMask = new Map();
  for (const m of masks) weaponPairsByMask.set(m, 0);

  for (let p = 0; p < weaponPairs.length; p += 2) {
    const w1 = weaponVariants[weaponPairs[p]];
    const w2 = weaponVariants[weaponPairs[p + 1]];
    let mask = 0;
    mask |= w1.weapon.skill === 0 ? 0b001 : w1.weapon.skill === 1 ? 0b010 : 0b100;
    mask |= w2.weapon.skill === 0 ? 0b001 : w2.weapon.skill === 1 ? 0b010 : 0b100;
    if (!weaponPairsByMask.has(mask)) weaponPairsByMask.set(mask, 0);
    weaponPairsByMask.set(mask, weaponPairsByMask.get(mask) + 1);
  }

  let effPerArmor = 0;
  const breakdown = [];
  for (const [mask, wpCount] of weaponPairsByMask.entries()) {
    const mpKept = keptPairsByMask.get(mask) ?? 0;
    const contrib = wpCount * mpKept;
    effPerArmor += contrib;
    breakdown.push({ mask, wpCount, mpKept, contrib });
  }

  const effTotal = AV * effPerArmor;

  return {
    AV,
    WP,
    MP,
    effPerArmor,
    effTotal,
    breakdown,
    keptPairsByMask,
    weaponPairsByMask,
  };
}

function printSearchSpaceSanity(
  pools,
  armorVariants,
  weaponVariants,
  miscVariants,
  weaponPairs,
  miscPairs,
) {
  const AV = armorVariants.length;
  const WV = weaponVariants.length;
  const MV = miscVariants.length;
  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const supersetCandidates = AV * WP * MP;

  console.log('=== SANITY CHECK: search-space / combinations ===');
  console.log(
    `Pools: armors=${pools.armors.length}, weapons=${pools.weapons.length}, miscs=${pools.miscs.length}`,
  );
  console.log(
    `Variants (supersets): armorVariants=${AV}, weaponVariants=${WV}, miscVariants=${MV}`,
  );
  console.log(
    `Pairs (orderless): weaponPairs=${WP} (=WV*(WV+1)/2), miscPairs=${MP} (=MV*(MV+1)/2)`,
  );
  console.log(
    `Superset candidates (before misc per-candidate filter): AV*WP*MP = ${supersetCandidates}`,
  );
  console.log('');

  // Per-item variant counts (helps catch “why is WV smaller than expected?”)
  console.log('Per-item variant counts (by item + allowed crystals):');
  for (const a of pools.armors) {
    const cs = allowedCrystalsForArmor(a);
    console.log(`  Armor  ${padRight(a, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  for (const w of pools.weapons) {
    const cs = allowedCrystalsForWeapon(w);
    console.log(`  Weapon ${padRight(w, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  for (const m of pools.miscs) {
    const cs = allowedCrystalsForMiscSuperset(m);
    console.log(`  Misc   ${padRight(m, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  console.log('');

  // Effective count after misc filter
  const eff = estimateEffectiveCounts(
    armorVariants,
    weaponVariants,
    weaponPairs,
    miscVariants,
    miscPairs,
  );

  console.log(
    'Effective candidates AFTER misc per-candidate filter (exact for your current superset lists):',
  );
  console.log(`  Per armor: sum_over_weaponPairs(keptMiscPairsForMask) = ${eff.effPerArmor}`);
  console.log(
    `  Effective total: AV * perArmor = ${eff.AV} * ${eff.effPerArmor} = ${eff.effTotal}`,
  );
  const keepPct = supersetCandidates ? (eff.effTotal / supersetCandidates) * 100 : 0;
  console.log(`  Keep rate vs superset: ${keepPct.toFixed(2)}%`);
  console.log('');

  console.log('Breakdown by weapon mask (weaponPairs count * kept miscPairs):');
  eff.breakdown
    .sort((a, b) => b.contrib - a.contrib)
    .forEach((r) => {
      const pctWP = eff.WP ? (r.wpCount / eff.WP) * 100 : 0;
      const pctMP = eff.MP ? (r.mpKept / eff.MP) * 100 : 0;
      console.log(
        `  ${padRight(maskName(r.mask), 10)} | weaponPairs=${padRight(r.wpCount, 6)} (${pctWP.toFixed(
          1,
        )}%) | keptMiscPairs=${padRight(r.mpKept, 7)} (${pctMP.toFixed(1)}%) | contrib=${r.contrib}`,
      );
    });

  console.log('=== END SANITY CHECK ===\n');
}

// =====================
// WORKER MAIN
// =====================
function workerMain() {
  const {
    trialsConfirm,
    trialsScreen,
    trialsGate,
    gatekeepers,
    maxTurns,
    keepTopNPerHp,
    progressEveryMs,
    startIndex,
    endIndex,
    pruneDelta,
    pruneEnabled,
    workerId,
    rngMode,
    rngSeed,
    deterministic,
    bailMargin,
    sharedFloorBuf,
    pools,
    debugMixed,
    debugMixedN,
  } = workerData;

  const sharedFloorI32 = sharedFloorBuf ? new Int32Array(sharedFloorBuf) : null;

  if (rngMode === 'fast') {
    const baseSeed = (Number(rngSeed) || 0) >>> 0;
    const s0 = (baseSeed ^ (0x9e3779b9 * (workerId + 1))) >>> 0;
    RNG = makeRng('fast', s0, s0 ^ 0xa341316c, s0 ^ 0xc8013ea4, s0 ^ 0xad90777d);
  } else {
    RNG = Math.random;
  }

  const weapons = pools.weapons;
  const armorChoices = pools.armors;
  const miscChoices = pools.miscs;

  // Local variant cache
  const localCache = new Map();
  function getV(itemName, crystalName) {
    const key = `${itemName}|${crystalName}`;
    let v = localCache.get(key);
    if (!v) {
      v = computeVariant(itemName, crystalName);
      localCache.set(key, v);
    }
    return v;
  }

  // Build variants
  const armorVariants = [];
  for (const nm of armorChoices)
    for (const c of allowedCrystalsForArmor(nm)) armorVariants.push(getV(nm, c));

  const weaponVariants = [];
  for (const nm of weapons)
    for (const c of allowedCrystalsForWeapon(nm)) weaponVariants.push(getV(nm, c));

  // SUPerset misc variants
  const miscVariants = [];
  for (const nm of miscChoices)
    for (const c of allowedCrystalsForMiscSuperset(nm)) miscVariants.push(getV(nm, c));

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const { plans } = buildHpPlans();

  // Ensure defender variants exist in cache
  for (const def of defenderBuilds) {
    const p = def.payload;
    getV(p.armor.name, p.armor.upgrades[0]);
    getV(p.weapon1.name, p.weapon1.upgrades[0]);
    getV(p.weapon2.name, p.weapon2.upgrades[0]);
    getV(p.misc1.name, p.misc1.upgrades[0]);
    getV(p.misc2.name, p.misc2.upgrades[0]);
  }

  const defenders = defenderBuilds.map((d) => compileDefender(d, localCache));

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const topsByHp = Object.create(null);
  const bestByTypeByHp = Object.create(null); // hpKey -> { type -> bestEntry }

  const t0 = nowMs();
  let lastProgress = t0;
  let processed = 0;

  const detBaseSeed = (Number(rngSeed) || 0) >>> 0;

  let debugPrinted = 0;

  for (let globalIdx = startIndex; globalIdx < endIndex; globalIdx++) {
    processed++;

    const plan = plans[0];
    const gearIdx = globalIdx;

    const ai = Math.floor(gearIdx / (WP * MP));
    const rem = gearIdx - ai * (WP * MP);
    const wpi = Math.floor(rem / MP);
    const mpi = rem - wpi * MP;

    const av = armorVariants[ai];

    const wpBase = wpi * 2;
    const w1v = weaponVariants[weaponPairs[wpBase]];
    const w2v = weaponVariants[weaponPairs[wpBase + 1]];

    const wpTag = weaponPairTagFromSkills(w1v.weapon.skill, w2v.weapon.skill);

    // Weapon mask for misc filtering
    let weaponMask = 0;
    weaponMask |= w1v.weapon.skill === 0 ? 0b001 : w1v.weapon.skill === 1 ? 0b010 : 0b100;
    weaponMask |= w2v.weapon.skill === 0 ? 0b001 : w2v.weapon.skill === 1 ? 0b010 : 0b100;

    const mpBase = mpi * 2;
    const m1v = miscVariants[miscPairs[mpBase]];
    const m2v = miscVariants[miscPairs[mpBase + 1]];

    // Per-candidate misc crystal filter
    if (
      !miscVariantAllowedForWeaponMask(m1v, weaponMask) ||
      !miscVariantAllowedForWeaponMask(m2v, weaponMask)
    ) {
      const t = nowMs();
      if (t - lastProgress >= progressEveryMs) {
        lastProgress = t;
        parentPort.postMessage({ type: 'progress', processed, bestWorst: null, bestAvg: null });
      }
      continue;
    }

    // Optional prune (default OFF)
    if (pruneEnabled) {
      const w1SkillIdx = w1v.weapon ? w1v.weapon.skill : null;
      const w2SkillIdx = w2v.weapon ? w2v.weapon.skill : null;
      const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

      const w1Mel = w1v.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
      const w2Mel = w2v.addMel * (w2SkillIdx === 1 ? w2Mult : 1);

      const mel = BASE.meleeSkill + av.addMel + w1Mel + w2Mel + m1v.addMel + m2v.addMel;
      const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;
      const armor = BASE.armor + av.addArmStat;

      if (mel + defSk + armor < 1200 - pruneDelta) {
        const t = nowMs();
        if (t - lastProgress >= progressEveryMs) {
          lastProgress = t;
          parentPort.postMessage({ type: 'progress', processed, bestWorst: null, bestAvg: null });
        }
        continue;
      }
    }

    const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v);

    // Mixed debug (optional)
    if (debugMixed && workerId === 0 && debugPrinted < debugMixedN) {
      const s1 = w1v.weapon.skill;
      const s2 = w2v.weapon.skill;
      const isMixed = s1 !== s2;
      if (isMixed || debugPrinted < Math.min(3, debugMixedN)) {
        debugPrinted++;
        const [m1, m2] = mixedWeaponMultsFromWeaponSkill(s1, s2);
        const tag = isMixed ? 'MIXED' : 'SAME';
        console.log(
          `[DEBUG_MIXED] ${tag} | W1=${w1v.itemName}(skill=${s1}, mult=${m1}) W2=${w2v.itemName}(skill=${s2}, mult=${m2}) | FINAL skills: gun=${att.gun} mel=${att.mel} prj=${att.prj}`,
        );
      }
    }

    const hpKey = String(plan.hp);
    let lb = topsByHp[hpKey];
    if (!lb) lb = topsByHp[hpKey] = [];

    const localFloor = lb.length >= keepTopNPerHp ? lb[lb.length - 1].worstWin : null;
    const globalFloor = floorLoadPct(sharedFloorI32);
    const floorWorst =
      localFloor === null && globalFloor === null
        ? null
        : localFloor === null
          ? globalFloor
          : globalFloor === null
            ? localFloor
            : Math.max(localFloor, globalFloor);

    const score = evalCandidateStaged({
      att,
      defenders,
      maxTurns,
      trialsGate,
      gatekeepers,
      trialsScreen,
      trialsConfirm,
      floorWorst,
      bailMargin,
      deterministic,
      baseSeed: detBaseSeed,
      candidateKey: globalIdx,
    });

    if (!score.bailed) {
      let bestTypes = bestByTypeByHp[hpKey];
      if (!bestTypes) bestTypes = bestByTypeByHp[hpKey] = Object.create(null);

      const candidateEntry = {
        wpTag,
        label: buildLabel(plan, av, w1v, w2v, m1v, m2v),
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
          gun: att.gun,
          prj: att.prj,
        },
      };

      if (isBetterScore(candidateEntry, bestTypes[wpTag])) bestTypes[wpTag] = candidateEntry;

      const floor = lb.length ? lb[lb.length - 1] : null;
      if (lb.length < keepTopNPerHp || score.worstWin >= floor.worstWin - 1e-9) {
        pushLeaderboard(
          lb,
          { wpTag, label: candidateEntry.label, ...score, stats: candidateEntry.stats },
          keepTopNPerHp,
        );

        if (lb.length >= keepTopNPerHp) {
          const newLocalFloor = lb[lb.length - 1].worstWin;
          floorTryRaise(sharedFloorI32, newLocalFloor);
        }
      }
    }

    const t = nowMs();
    if (t - lastProgress >= progressEveryMs) {
      lastProgress = t;

      let bestWorst = null;
      let bestAvg = null;
      for (const k in topsByHp) {
        const b = topsByHp[k] && topsByHp[k][0];
        if (!b) continue;
        if (bestWorst === null || b.worstWin > bestWorst) {
          bestWorst = b.worstWin;
          bestAvg = b.avgWin;
        }
      }

      parentPort.postMessage({ type: 'progress', processed, bestWorst, bestAvg });
    }
  }

  parentPort.postMessage({
    type: 'done',
    processed,
    topsByHp,
    bestByTypeByHp,
    elapsedSec: (nowMs() - t0) / 1000,
  });
}

// =====================
// MAIN THREAD
// =====================
async function main() {
  const single = process.argv.includes('--single');

  const logical =
    typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : os.cpus().length || 1;

  const physicalGuess = logical >= 8 ? Math.ceil(logical / 2) : logical;

  const envW = parseInt(process.env.LEGACY_WORKERS || '', 10);
  const defaultWorkers = Math.min(physicalGuess, SETTINGS.WORKERS_DEFAULT_CAP);

  const workers = single
    ? 1
    : Number.isFinite(envW) && envW > 0
      ? Math.min(envW, logical)
      : defaultWorkers;

  const envConfirm = parseInt(process.env.LEGACY_TRIALS || '', 10);
  const TRIALS_CONFIRM =
    Number.isFinite(envConfirm) && envConfirm > 0 ? envConfirm : SETTINGS.TRIALS_CONFIRM_DEFAULT;

  const envScreen = parseInt(process.env.LEGACY_TRIALS_SCREEN || '', 10);
  const TRIALS_SCREEN =
    Number.isFinite(envScreen) && envScreen > 0 ? envScreen : SETTINGS.TRIALS_SCREEN_DEFAULT;

  const envGate = parseInt(process.env.LEGACY_TRIALS_GATE || '', 10);
  const TRIALS_GATE =
    Number.isFinite(envGate) && envGate > 0 ? envGate : SETTINGS.TRIALS_GATE_DEFAULT;

  const envGatekeepers = parseInt(process.env.LEGACY_GATEKEEPERS || '', 10);
  const GATEKEEPERS =
    Number.isFinite(envGatekeepers) && envGatekeepers >= 0
      ? envGatekeepers
      : SETTINGS.GATEKEEPERS_DEFAULT;

  const envBailMargin = parseFloat(process.env.LEGACY_SCREEN_MARGIN || '');
  const BAIL_MARGIN =
    Number.isFinite(envBailMargin) && envBailMargin >= 0
      ? envBailMargin
      : SETTINGS.SCREEN_BAIL_MARGIN_DEFAULT;

  // Prune (default OFF; enable with LEGACY_PRUNE=1/true/on)
  const envPruneRaw = String(process.env.LEGACY_PRUNE ?? '')
    .trim()
    .toLowerCase();
  const pruneEnabled = envPruneRaw
    ? envPruneRaw === '1' || envPruneRaw === 'true' || envPruneRaw === 'on' || envPruneRaw === 'yes'
    : !!SETTINGS.PRUNE_DEFAULT_ENABLED;

  const pruneDelta = (() => {
    const x = parseInt(process.env.LEGACY_PRUNE_DELTA || '', 10);
    return Number.isFinite(x) ? x : SETTINGS.PRUNE_DELTA_DEFAULT;
  })();

  const rngMode = (process.env.LEGACY_RNG || 'fast').toLowerCase();
  const rngSeed = parseInt(process.env.LEGACY_SEED || '', 10) || 123456789;
  const deterministic =
    process.env.LEGACY_DETERMINISTIC === '1' || process.env.LEGACY_DETERMINISTIC === 'true';

  const pools = parsePoolsFromEnv();

  const debugMixed =
    process.env.LEGACY_DEBUG_MIXED === '1' || process.env.LEGACY_DEBUG_MIXED === 'true';
  const debugMixedN = parseInt(process.env.LEGACY_DEBUG_MIXED_N || '', 10) || 12;

  // Build superset variants/pairs for sanity + totalCandidates
  const armorVariants = buildVariantsForArmors(pools.armors);
  const weaponVariants = buildVariantsForWeapons(pools.weapons);
  const miscVariants = buildVariantsForMiscsSuperset(pools.miscs);

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const { plans, perHpSummary } = buildHpPlans();

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const AV = armorVariants.length;

  const perGearSuperset = AV * WP * MP;
  const totalCandidatesSuperset = perGearSuperset; // one locked plan

  // Print sanity checks unless explicitly disabled
  if (process.env.LEGACY_SANITY_DISABLE !== '1' && process.env.LEGACY_SANITY_DISABLE !== 'true') {
    printSearchSpaceSanity(
      pools,
      armorVariants,
      weaponVariants,
      miscVariants,
      weaponPairs,
      miscPairs,
    );
  }

  const sharedFloorBuf = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const sharedFloorI32 = new Int32Array(sharedFloorBuf);
  sharedFloorI32[0] = -1;

  // Minimal, useful header logs
  console.log(
    `LEGACY brute-force (v2.9) | defenders=${defenderBuilds.length} | trialsGate/def=${TRIALS_GATE} | trialsScreen/def=${TRIALS_SCREEN} | trialsConfirm/def=${TRIALS_CONFIRM}`,
  );
  console.log(
    `Workers=${workers} (logical=${logical}, physicalGuess=${physicalGuess}) | RNG=${
      rngMode === 'fast' ? 'fast(sfc32)' : 'Math.random'
    } | deterministic=${deterministic ? 'ON' : 'OFF'} | baseDmgPerHit=+${BASE.baseDamagePerHit}`,
  );
  console.log(
    `Mixed weapon bonus: ${mixedBonusEnabled() ? 'ON' : 'OFF'} | Prune: ${pruneEnabled ? `ON (delta=${pruneDelta})` : 'OFF'}`,
  );
  console.log(
    `LOCK_ONLY_AMULET (weapons-only): ${LOCK_ONLY_AMULET.size ? Array.from(LOCK_ONLY_AMULET).join(', ') : '(none)'}`,
  );
  console.log(
    `Superset: armorVariants=${AV} weaponPairs=${WP} miscPairs=${MP} => totalCandidates(superset)=${totalCandidatesSuperset}`,
  );

  const locked = plans[0];
  console.log(
    `LOCKED attacker plan: HP=${locked.hp} extraAcc=${locked.extraAcc} extraDodge=${locked.extraDodge} (freePoints=${locked.freePoints})`,
  );
  console.log(
    `Gatekeepers: N=${GATEKEEPERS} trialsGate=${TRIALS_GATE} | StageA bail margin=${BAIL_MARGIN.toFixed(2)}%`,
  );
  if (debugMixed)
    console.log(
      `DEBUG: LEGACY_DEBUG_MIXED=1 enabled (prints up to ${debugMixedN} lines from worker 0).`,
    );

  console.log('HP plans (reassurance):');
  for (const r of perHpSummary) {
    console.log(
      `  HP=${r.hp} freePoints=${r.freePoints} allocs=${r.allocCount}  (acc+dodge=${r.freePoints}, speed=0)`,
    );
  }
  console.log('');

  const globalByHp = Object.create(null);
  const globalBestByTypeByHp = Object.create(null);
  for (const r of perHpSummary) {
    globalByHp[String(r.hp)] = [];
    globalBestByTypeByHp[String(r.hp)] = Object.create(null);
  }

  let liveBestWorst = null;
  let liveBestAvg = null;

  const start = nowMs();
  let lastRender = start;
  const processedByWorker = new Array(workers).fill(0);

  const perWorker = Math.floor(totalCandidatesSuperset / workers);
  const ranges = [];
  for (let w = 0; w < workers; w++) {
    const s = w * perWorker;
    const e = w === workers - 1 ? totalCandidatesSuperset : (w + 1) * perWorker;
    ranges.push([s, e]);
  }

  await new Promise((resolve, reject) => {
    let doneCount = 0;

    for (let w = 0; w < workers; w++) {
      const [startIndex, endIndex] = ranges[w];

      const wk = new Worker(__filename, {
        workerData: {
          workerId: w,
          trialsConfirm: TRIALS_CONFIRM,
          trialsScreen: TRIALS_SCREEN,
          trialsGate: TRIALS_GATE,
          gatekeepers: GATEKEEPERS,
          bailMargin: BAIL_MARGIN,
          maxTurns: SETTINGS.MAX_TURNS,
          keepTopNPerHp: SETTINGS.KEEP_TOP_N_PER_HP,
          progressEveryMs: SETTINGS.PROGRESS_EVERY_MS,
          startIndex,
          endIndex,
          pruneDelta,
          pruneEnabled,
          rngMode: rngMode === 'fast' ? 'fast' : 'math',
          rngSeed,
          deterministic,
          sharedFloorBuf,
          pools,
          debugMixed,
          debugMixedN,
        },
      });

      wk.on('message', (msg) => {
        if (!msg || !msg.type) return;

        if (msg.type === 'progress') {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          if (typeof msg.bestWorst === 'number') {
            if (liveBestWorst === null || msg.bestWorst > liveBestWorst) {
              liveBestWorst = msg.bestWorst;
              liveBestAvg = msg.bestAvg;
            }
          }

          const t = nowMs();
          if (t - lastRender >= SETTINGS.PROGRESS_EVERY_MS) {
            lastRender = t;
            const doneProcessed = processedByWorker.reduce((a, b) => a + b, 0);
            const elapsed = (t - start) / 1000;
            const sharedFloor = floorLoadPct(sharedFloorI32);

            process.stdout.write(
              `\rtested~=${Math.min(doneProcessed, totalCandidatesSuperset)}/${totalCandidatesSuperset} elapsed=${elapsed.toFixed(
                1,
              )}s sharedFloor=${sharedFloor !== null ? sharedFloor.toFixed(2) : '—'}% bestWorst=${
                liveBestWorst !== null ? liveBestWorst.toFixed(2) : '—'
              }% bestAvg=${liveBestAvg !== null ? liveBestAvg.toFixed(2) : '—'}%   `,
            );
          }
        }

        if (msg.type === 'done') {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          const topsByHp = msg.topsByHp || {};
          for (const hpKey in topsByHp) {
            const localLB = topsByHp[hpKey];
            if (!localLB || !localLB.length) continue;

            const globalLB = globalByHp[hpKey] || (globalByHp[hpKey] = []);
            for (const e of localLB) pushLeaderboard(globalLB, e, SETTINGS.KEEP_TOP_N_PER_HP);
          }

          const bestByType = msg.bestByTypeByHp || {};
          for (const hpKey in bestByType) {
            const types = bestByType[hpKey];
            if (!types) continue;

            let g = globalBestByTypeByHp[hpKey];
            if (!g) g = globalBestByTypeByHp[hpKey] = Object.create(null);

            for (const typeKey in types) {
              const cand = types[typeKey];
              if (!cand) continue;
              if (isBetterScore(cand, g[typeKey])) g[typeKey] = cand;
            }
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
  printResults(globalByHp, globalBestByTypeByHp, elapsedAll, totalCandidatesSuperset);
}

function printResults(globalByHp, globalBestByTypeByHp, elapsedSec, totalCandidates) {
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
      `Best stats: Acc=${best.acc} Dod=${best.dodge} Gun=${best.gun} Prj=${best.prj} Mel=${best.mel} Def=${best.defSk} Arm=${best.armor} Spd=${best.speed} (alloc A${best.extraAcc} D${best.extraDodge})\n`,
    );

    const bestTypes = globalBestByTypeByHp[String(hp)] || {};
    const typeKeys = Object.keys(bestTypes);
    if (typeKeys.length) {
      console.log('Best by weapon archetype:');
      typeKeys.sort((a, b) => {
        const A = bestTypes[a];
        const B = bestTypes[b];
        return B.worstWin - A.worstWin || B.avgWin - A.avgWin;
      });

      console.log(
        padRight('Type', 12) +
          padRight('Worst%', 8) +
          padRight('WorstVs', 20) +
          padRight('Avg%', 7) +
          padRight('AvgEx', 7) +
          'Build',
      );
      console.log('─'.repeat(105));

      for (const t of typeKeys) {
        const e = bestTypes[t];
        console.log(
          padRight(t, 12) +
            padRight(e.worstWin.toFixed(2), 8) +
            padRight(e.worstName, 20) +
            padRight(e.avgWin.toFixed(2), 7) +
            padRight(e.avgEx.toFixed(2), 7) +
            e.label,
        );
      }
      console.log('');
    }
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
