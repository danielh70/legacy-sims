#!/usr/bin/env node
"use strict";

/**
 * =====================
 * LEGACY BRUTE FORCE (CONSTRAINED + STAGED + DETERMINISTIC RNG OPTION)
 * v2.1-melee-staged
 * =====================
 *
 * Goal: find the true best melee build in HP 400..600 with your constraints, faster + more reliable.
 *
 * What changed vs your v2.0 constrained:
 * 1) Two-stage evaluation (big win):
 *    - Stage A: cheap screen trials/def (default 80) with early-bail margin
 *    - Stage B: full confirm trials/def (default 450) only for survivors
 *
 * 2) Better early-exit effectiveness:
 *    - evaluates toughest defenders first (priority order: DL3, DL2, DL7, DL4, DL1, DL5..)
 *
 * 3) Optional deterministic RNG per (candidate, defender, stage):
 *    - set LEGACY_DETERMINISTIC=1 to make results stable across runs/workers
 *    - still uses sfc32, just re-seeded per matchup
 *
 * 4) Your constraints enforced (tight):
 *    - Armor tested ONLY: SG1 with (Pink OR Abyss), Dark Legion with (Abyss)
 *    - NO Hellforged armor in candidates
 *    - Weapons locked to Amulet only for: Core Staff, Void Axe, Rift Gun, Split Bombs, Void Bow
 *    - Bio crystals ONLY: Pink or Orange (no Green)
 *    - Misc crystals only if they actually affect that item (no pointless Pink on no-defSkill items, etc.)
 *
 * Combat logic unchanged from your spec:
 * - rollVs: random(off/4,off) - random(def/4,def) > 0   (float roll)
 * - skill check after hit check
 * - damage = round(random(min,max))
 * - armor formula: round(raw * (mod/(mod+armor))), mod=(level*7)/2, level capped 80
 * - speed decides first; tie => attacker first; sequential retaliation only if alive
 * - base damage per successful weapon hit: +5 (before armor)
 */

// =====================
// IMPORTS
// =====================
const os = require("os");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP_MAX: 865,
  MAX_TURNS: 200,

  // Stage B confirm (full)
  TRIALS_CONFIRM_DEFAULT: 450,
  // Stage A screen (cheap)
  TRIALS_SCREEN_DEFAULT: 80,

  // If Stage A worstWin is below floorWorst - margin, bail
  SCREEN_BAIL_MARGIN_DEFAULT: 2.0, // percent points

  KEEP_TOP_N_PER_HP: 8,
  PROGRESS_EVERY_MS: 1200,

  // HP sweep
  HP_MIN: 400,
  HP_MAX_SWEEP: 600,
  HP_STEP: 25,

  // Stat allocation sweep granularity (points, not HP)
  STAT_STEP: 5,

  // prune: set LEGACY_PRUNE=0 to disable
  PRUNE_DELTA_DEFAULT: 260,

  // Default cap; actual default workers biased to physical cores
  WORKERS_DEFAULT_CAP: 12,
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
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function shortCrystal(c) {
  switch (c) {
    case "Amulet Crystal":
      return "A";
    case "Perfect Pink Crystal":
      return "P";
    case "Perfect Orange Crystal":
      return "O";
    case "Perfect Fire Crystal":
      return "F";
    case "Abyss Crystal":
      return "B";
    case "Cabrusion Crystal":
      return "C";
    default:
      return "?";
  }
}
function shortItem(name) {
  return name
    .replace("Dark Legion Armor", "DLArm")
    .replace("SG1 Armor", "SG1")
    .replace("Hellforged Armor", "HF")
    .replace("Crystal Maul", "CM")
    .replace("Core Staff", "CS")
    .replace("Void Axe", "VA")
    .replace("Scythe T2", "Scy")
    .replace("Void Sword", "VS")
    .replace("Bio Spinal Enhancer", "Bio")
    .replace("Scout Drones", "Scout")
    .replace("Droid Drone", "Droid")
    .replace("Orphic Amulet", "Orphic")
    .replace("Projector Bots", "ProjBot")
    .replace("Recon Drones", "Recon")
    .replace("Split Crystal Bombs T2", "Bombs")
    .replace("Void Bow", "VBow")
    .replace("Rift Gun", "Rift");
}

// =====================
// RNG
// =====================
function makeRng(mode, seedA, seedB, seedC, seedD) {
  if (mode !== "fast") return Math.random;

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

// a small stable hash for seeding (xorshift-ish)
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
// COMBAT (same math; tight loops)
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

  const raw = rollDamageRaw(w.min, w.max) + att.baseDmg; // +5 per successful weapon hit
  return Math.round(raw * def.armorFactor);
}

function attackBoth(att, def) {
  return attemptHitFast(att, def, att.w1) + attemptHitFast(att, def, att.w2);
}

/**
 * fightOnceWikiFast(p1,p2)
 * returns packed int: (winnerBit<<16) | exchanges
 * winnerBit=1 means p1 wins
 */
function fightOnceWikiFast(p1, p2, MAX_TURNS) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  const p1First = p1.speed >= p2.speed; // tie => attacker first
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

  const winnerIsP1 = p1hp > 0 ? 1 : p2hp > 0 ? 0 : first === p1 ? 1 : 0;
  return (winnerIsP1 << 16) | (exchanges & 0xffff);
}

// packed result: wins (upper 16) | exSum (lower 16) doesn't fit; use two ints
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
// CRYSTALS + ITEMS
// =====================
const CrystalDefs = {
  "Abyss Crystal": {
    pct: { armor: 0.05, dodge: 0.04, speed: 0.1, defSkill: 0.05 },
  },
  "Perfect Pink Crystal": { pct: { defSkill: 0.2 } },
  "Amulet Crystal": {
    pct: {
      accuracy: 0.06,
      damage: 0.06,
      gunSkill: 0.1,
      meleeSkill: 0.1,
      projSkill: 0.1,
      defSkill: 0.1,
    },
  },
  "Perfect Fire Crystal": { pct: { damage: 0.1 } },
  "Perfect Green Crystal": { pct: { gunSkill: 0.2 } },
  "Perfect Yellow Crystal": { pct: { projSkill: 0.2 } },
  "Perfect Orange Crystal": { pct: { meleeSkill: 0.2 } },
  "Cabrusion Crystal": {
    pct: { damage: 0.07, defSkill: 0.07, armor: 0.09, speed: 0.09 },
  },
};

const ItemDefs = {
  "SG1 Armor": {
    type: "Armor",
    flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 },
  },
  "Dark Legion Armor": {
    type: "Armor",
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
  },
  "Hellforged Armor": {
    type: "Armor",
    flatStats: { armor: 115, dodge: 65, speed: 55, defSkill: 55 },
  },

  "Crystal Maul": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  "Core Staff": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { speed: 75, accuracy: 55, meleeSkill: 110, defSkill: 50 },
    baseWeaponDamage: { min: 50, max: 60 },
  },
  "Void Axe": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { speed: 78, accuracy: 44, meleeSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 68, max: 96 },
  },
  "Scythe T2": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { speed: 75, accuracy: 42, meleeSkill: 65, defSkill: 18 },
    baseWeaponDamage: { min: 80, max: 101 },
  },
  "Void Sword": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { speed: 60, accuracy: 35, meleeSkill: 40, defSkill: 5 },
    baseWeaponDamage: { min: 90, max: 120 },
  },

  "Split Crystal Bombs T2": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 79, accuracy: 23, projSkill: 84, defSkill: 80 },
    baseWeaponDamage: { min: 55, max: 87 },
  },
  "Void Bow": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 70, accuracy: 48, projSkill: 65, defSkill: 20 },
    baseWeaponDamage: { min: 10, max: 125 },
  },

  "Rift Gun": {
    type: "Weapon",
    skillType: "gunSkill",
    flatStats: { speed: 50, accuracy: 85, gunSkill: 85, defSkill: 5 },
    baseWeaponDamage: { min: 60, max: 65 },
  },
  "Double Barrel Sniper Rifle": {
    type: "Weapon",
    skillType: "gunSkill",
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  "Q15 Gun": {
    type: "Weapon",
    skillType: "gunSkill",
    flatStats: { speed: 120, accuracy: 42, gunSkill: 48, defSkill: 31 },
    baseWeaponDamage: { min: 82, max: 95 },
  },

  "Bio Spinal Enhancer": {
    type: "Misc",
    flatStats: {
      dodge: 1,
      accuracy: 1,
      gunSkill: 65,
      meleeSkill: 65,
      projSkill: 65,
      defSkill: 65,
    },
  },
  "Scout Drones": {
    type: "Misc",
    flatStats: {
      dodge: 5,
      accuracy: 32,
      gunSkill: 30,
      meleeSkill: 30,
      projSkill: 50,
      defSkill: 30,
    },
  },
  "Droid Drone": {
    type: "Misc",
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 40, meleeSkill: 60 },
  },
  "Orphic Amulet": {
    type: "Misc",
    flatStats: {
      speed: 20,
      accuracy: 20,
      gunSkill: 70,
      meleeSkill: 70,
      projSkill: 70,
    },
  },
  "Projector Bots": {
    type: "Misc",
    flatStats: {
      dodge: 25,
      accuracy: 10,
      gunSkill: 5,
      meleeSkill: 15,
      projSkill: 40,
      defSkill: 40,
    },
  },
  "Recon Drones": {
    type: "Misc",
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 60, projSkill: 40 },
  },
};

// =====================
// DEFENDER PAYLOADS (unchanged from your script)
// =====================
const DEFENDER_PAYLOADS = {
  "DL Gun Build": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Double Barrel Sniper Rifle",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "DL Gun Build 2": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Q15 Gun",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "DL Gun Build 3": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Double Barrel Sniper Rifle",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
      ],
    },
    misc2: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
      ],
    },
  },
  "DL Gun Build 4": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Q15 Gun",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
      ],
    },
    misc2: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
      ],
    },
  },
  "DL Gun Build 5": {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Double Barrel Sniper Rifle",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "DL Gun Build 6": {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Q15 Gun",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "DL Gun Build 7": {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Double Barrel Sniper Rifle",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
      ],
    },
    misc2: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
        "Perfect Green Crystal",
      ],
    },
  },
  "DL Gun Build 8": {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Rift Gun",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Q15 Gun",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
      ],
    },
    misc2: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
        "Perfect Pink Crystal",
      ],
    },
  },
  "Core/Void Build 1": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Core Staff",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Void Sword",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "T2 Scythe Build": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Dark Legion Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Scythe T2",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Scythe T2",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc1: {
      name: "Bio Spinal Enhancer",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "SG1 Split bombs": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "SG1 Armor",
      upgrades: [
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
        "Abyss Crystal",
      ],
    },
    weapon1: {
      name: "Split Crystal Bombs T2",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    weapon2: {
      name: "Split Crystal Bombs T2",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
  "HF Core/Void": {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: "Hellforged Armor",
      upgrades: [
        "Cabrusion Crystal",
        "Cabrusion Crystal",
        "Cabrusion Crystal",
        "Cabrusion Crystal",
      ],
    },
    weapon1: {
      name: "Void Sword",
      upgrades: [
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
        "Perfect Fire Crystal",
      ],
    },
    weapon2: {
      name: "Core Staff",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc1: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
    misc2: {
      name: "Scout Drones",
      upgrades: [
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
        "Amulet Crystal",
      ],
    },
  },
};

// =====================
// DEFENDER LIST (order matters for early-exit)
// Put the “usual worst” first based on your results (DL3/DL2/DL7).
// =====================
const DEFENDER_PRIORITY = [
  "DL Gun Build 3",
  "DL Gun Build 2",
  "DL Gun Build 7",
  "DL Gun Build 4",
  "DL Gun Build",
  "DL Gun Build 5",
  "DL Gun Build 6",
  "DL Gun Build 8",
  "SG1 Split bombs",
  "Core/Void Build 1",
  "T2 Scythe Build",
  "HF Core/Void",
];

const defenderBuilds = DEFENDER_PRIORITY.map((name) => {
  const p = DEFENDER_PAYLOADS[name];
  if (!p) throw new Error(`Missing DEFENDER_PAYLOADS entry for "${name}"`);
  return { name, payload: p };
});

// =====================
// CRYSTAL CONSTRAINTS (tight)
// =====================
const LOCK_ONLY_AMULET = new Set([
  "Core Staff",
  "Rift Gun",
  "Void Axe",
  "Split Crystal Bombs T2",
  "Void Bow",
  "Scout Drones", // per your earlier constraint
]);

function allowedCrystalsForItem(itemName, slotKind, archetype) {
  // Hard locks
  if (LOCK_ONLY_AMULET.has(itemName)) return ["Amulet Crystal"];

  // Armor constraints: NO HF in candidate search; enforce crystal sets
  if (itemName === "Dark Legion Armor") return ["Abyss Crystal"];
  if (itemName === "SG1 Armor")
    return ["Perfect Pink Crystal", "Abyss Crystal"];
  if (itemName === "Hellforged Armor") return []; // candidate search should never include it

  // Bio: ONLY Orange or Pink (your request)
  if (itemName === "Bio Spinal Enhancer")
    return ["Perfect Pink Crystal", "Perfect Orange Crystal"];

  // Archetype rules
  if (archetype === "melee") {
    if (slotKind === "weapon") {
      // For other melee weapons (Maul/Scy/Void Sword), allow Fire (damage) and Amulet (damage+acc+skills)
      return ["Amulet Crystal", "Perfect Fire Crystal"];
    }

    if (slotKind === "misc") {
      const flat = (ItemDefs[itemName] && ItemDefs[itemName].flatStats) || {};

      const out = [];

      // Only include Amulet if it actually affects something this misc has (accuracy or relevant skills)
      const hasAmuletRelevant =
        (flat.accuracy || 0) > 0 ||
        (flat.gunSkill || 0) > 0 ||
        (flat.meleeSkill || 0) > 0 ||
        (flat.projSkill || 0) > 0 ||
        (flat.defSkill || 0) > 0;
      if (hasAmuletRelevant) out.push("Amulet Crystal");

      // Only include Orange if meleeSkill exists
      if ((flat.meleeSkill || 0) > 0) out.push("Perfect Orange Crystal");

      // Only include Pink if defSkill exists
      if ((flat.defSkill || 0) > 0) out.push("Perfect Pink Crystal");

      // De-dupe
      return Array.from(new Set(out));
    }
  }

  // Default: keep safe
  return ["Amulet Crystal"];
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

  const addSpeed =
    (fs.speed || 0) + Math.ceil((fs.speed || 0) * (pctSum.speed || 0));
  const addAcc =
    (fs.accuracy || 0) + Math.ceil((fs.accuracy || 0) * (pctSum.accuracy || 0));
  const addDod =
    (fs.dodge || 0) + Math.ceil((fs.dodge || 0) * (pctSum.dodge || 0));
  const addGun =
    (fs.gunSkill || 0) + Math.ceil((fs.gunSkill || 0) * (pctSum.gunSkill || 0));
  const addMel =
    (fs.meleeSkill || 0) +
    Math.ceil((fs.meleeSkill || 0) * (pctSum.meleeSkill || 0));
  const addPrj =
    (fs.projSkill || 0) +
    Math.ceil((fs.projSkill || 0) * (pctSum.projSkill || 0));
  const addDef =
    (fs.defSkill || 0) + Math.ceil((fs.defSkill || 0) * (pctSum.defSkill || 0));
  const addArmStat =
    (fs.armor || 0) + Math.ceil((fs.armor || 0) * (pctSum.armor || 0));

  let weapon = null;
  if (idef.baseWeaponDamage) {
    const dmgPctSum = pctSum.damage || 0;
    const min = Math.ceil(idef.baseWeaponDamage.min * (1 + dmgPctSum));
    const max = Math.ceil(idef.baseWeaponDamage.max * (1 + dmgPctSum));
    const skill =
      idef.skillType === "gunSkill"
        ? 0
        : idef.skillType === "meleeSkill"
          ? 1
          : 2;
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

function buildVariantsForSlot(names, slotKind, archetype) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForItem(nm, slotKind, archetype);
    if (!crystals || !crystals.length) continue;
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

function buildMiscPairsOrderless(miscVariants) {
  const pairsA = [];
  for (let i = 0; i < miscVariants.length; i++) {
    const a = miscVariants[i];
    for (let j = i; j < miscVariants.length; j++) {
      const b = miscVariants[j];
      if (i === j) {
        const nm = a.itemName;
        if (!(nm === "Bio Spinal Enhancer" || nm === "Scout Drones")) continue;
      }
      pairsA.push(i, j);
    }
  }
  return new Uint16Array(pairsA);
}

// =====================
// HP/stat plans
// =====================
function buildHpPlans() {
  const plans = [];
  const perHpSummary = [];
  for (
    let hp = SETTINGS.HP_MIN;
    hp <= SETTINGS.HP_MAX_SWEEP;
    hp += SETTINGS.HP_STEP
  ) {
    const freePoints = Math.round((SETTINGS.HP_MAX - hp) / 5);
    if (freePoints < 0 || (SETTINGS.HP_MAX - hp) % 5 !== 0)
      throw new Error(`Bad freePoints at hp=${hp}`);

    const step = Math.max(1, SETTINGS.STAT_STEP);
    const uniq = new Map();
    for (let accPts = 0; accPts <= freePoints; accPts += step) {
      const dodgePts = freePoints - accPts;
      uniq.set(accPts, {
        hp,
        extraAcc: accPts,
        extraDodge: dodgePts,
        freePoints,
      });
    }
    uniq.set(0, { hp, extraAcc: 0, extraDodge: freePoints, freePoints });
    uniq.set(freePoints, {
      hp,
      extraAcc: freePoints,
      extraDodge: 0,
      freePoints,
    });

    const allocs2 = Array.from(uniq.values()).sort(
      (a, b) => a.extraAcc - b.extraAcc,
    );
    perHpSummary.push({ hp, freePoints, allocCount: allocs2.length });
    for (const a of allocs2) plans.push(a);
  }
  return { plans, perHpSummary };
}

// =====================
// BUILD / COMPILE DEFENDERS
// =====================
function compileDefender(def, variantCacheLocal) {
  const p = def.payload;
  const st = p.stats;

  const armorV = variantCacheLocal.get(
    `${p.armor.name}|${p.armor.upgrades[0]}`,
  );
  const w1V = variantCacheLocal.get(
    `${p.weapon1.name}|${p.weapon1.upgrades[0]}`,
  );
  const w2V = variantCacheLocal.get(
    `${p.weapon2.name}|${p.weapon2.upgrades[0]}`,
  );
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
    baseSpeed +
    armorV.addSpeed +
    w1V.addSpeed +
    w2V.addSpeed +
    m1V.addSpeed +
    m2V.addSpeed;
  const acc =
    baseAcc + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1V.addAcc + m2V.addAcc;
  const dodge =
    baseDod + armorV.addDod + w1V.addDod + w2V.addDod + m1V.addDod + m2V.addDod;

  const gun =
    BASE.gunSkill +
    armorV.addGun +
    w1V.addGun +
    w2V.addGun +
    m1V.addGun +
    m2V.addGun;
  const mel =
    BASE.meleeSkill +
    armorV.addMel +
    w1V.addMel +
    w2V.addMel +
    m1V.addMel +
    m2V.addMel;
  const prj =
    BASE.projSkill +
    armorV.addPrj +
    w1V.addPrj +
    w2V.addPrj +
    m1V.addPrj +
    m2V.addPrj;
  const defSk =
    BASE.defSkill +
    armorV.addDef +
    w1V.addDef +
    w2V.addDef +
    m1V.addDef +
    m2V.addDef;

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
    BASE.speed +
    av.addSpeed +
    w1v.addSpeed +
    w2v.addSpeed +
    m1v.addSpeed +
    m2v.addSpeed;

  const acc =
    BASE.accuracy +
    av.addAcc +
    w1v.addAcc +
    w2v.addAcc +
    m1v.addAcc +
    m2v.addAcc +
    plan.extraAcc;
  const dodge =
    BASE.dodge +
    av.addDod +
    w1v.addDod +
    w2v.addDod +
    m1v.addDod +
    m2v.addDod +
    plan.extraDodge;

  const gun =
    BASE.gunSkill +
    av.addGun +
    w1v.addGun +
    w2v.addGun +
    m1v.addGun +
    m2v.addGun;
  const mel =
    BASE.meleeSkill +
    av.addMel +
    w1v.addMel +
    w2v.addMel +
    m1v.addMel +
    m2v.addMel;
  const prj =
    BASE.projSkill +
    av.addPrj +
    w1v.addPrj +
    w2v.addPrj +
    m1v.addPrj +
    m2v.addPrj;
  const defSk =
    BASE.defSkill +
    av.addDef +
    w1v.addDef +
    w2v.addDef +
    w2v.addDef +
    m1v.addDef +
    m2v.addDef;

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
// STAGED EVALUATION (big improvement)
// =====================
function evalCandidateStaged({
  att,
  defenders,
  maxTurns,
  trialsScreen,
  trialsConfirm,
  floorWorst,
  bailMargin,
  deterministic,
  baseSeed,
  candidateKey, // stable per candidate (globalIdx)
  stageTagA = 1,
  stageTagB = 2,
}) {
  // ---------- Stage A: screen ----------
  let sumWinA = 0;
  let sumExA = 0;
  let worstA = 101;
  let worstNameA = "";

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) {
      const s = mix32(
        (baseSeed ^ mix32(candidateKey ^ (i * 0x9e3779b9) ^ stageTagA)) | 0,
      );
      RNG = makeRng("fast", s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d);
    }

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsScreen, maxTurns);
    const winPct = (wins / trialsScreen) * 100;
    const avgEx = exSum / trialsScreen;

    sumWinA += winPct;
    sumExA += avgEx;

    if (winPct < worstA) {
      worstA = winPct;
      worstNameA = D.name;

      if (floorWorst !== null) {
        // conservative bail: only bail if clearly below floorWorst - margin
        if (worstA + 1e-9 < floorWorst - bailMargin) {
          return {
            avgWin: -1,
            avgEx: 0,
            worstWin: worstA,
            worstName: worstNameA,
            bailed: true,
            stage: "A",
          };
        }
      }
    }
  }

  // ---------- Stage B: confirm ----------
  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = "";

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) {
      const s = mix32(
        (baseSeed ^ mix32(candidateKey ^ (i * 0x9e3779b9) ^ stageTagB)) | 0,
      );
      RNG = makeRng("fast", s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d);
    }

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
    const winPct = (wins / trialsConfirm) * 100;
    const avgEx = exSum / trialsConfirm;

    sumWin += winPct;
    sumEx += avgEx;

    if (winPct < worstWin) {
      worstWin = winPct;
      worstName = D.name;

      // still keep your tight confirm early-exit (no margin here)
      if (floorWorst !== null && worstWin + 1e-9 < floorWorst) {
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin,
          worstName,
          bailed: true,
          stage: "B",
        };
      }
    }
  }

  return {
    avgWin: sumWin / defenders.length,
    avgEx: sumEx / defenders.length,
    worstWin,
    worstName,
    bailed: false,
    stage: "B",
  };
}

// =====================
// WORKER MAIN
// =====================
function workerMain() {
  const {
    trialsConfirm,
    trialsScreen,
    maxTurns,
    keepTopNPerHp,
    progressEveryMs,
    startIndex,
    endIndex,
    pruneDelta,
    disablePrune,
    workerId,
    rngMode,
    rngSeed,
    deterministic,
    bailMargin,
  } = workerData;

  // Worker stream RNG (used only when deterministic=0; otherwise overwritten per matchup)
  if (rngMode === "fast") {
    const baseSeed = (Number(rngSeed) || 0) >>> 0;
    const s0 = (baseSeed ^ (0x9e3779b9 * (workerId + 1))) >>> 0;
    RNG = makeRng(
      "fast",
      s0,
      s0 ^ 0xa341316c,
      s0 ^ 0xc8013ea4,
      s0 ^ 0xad90777d,
    );
  } else {
    RNG = Math.random;
  }

  const archetype = "melee";

  // Candidate search space (constrained)
  const meleeWeapons = [
    "Crystal Maul",
    "Core Staff",
    "Void Axe",
    "Scythe T2",
    "Void Sword",
  ];
  const armorChoices = ["SG1 Armor", "Dark Legion Armor"]; // ✅ NO Hellforged in candidates
  const miscChoices = [
    "Bio Spinal Enhancer",
    "Scout Drones",
    "Droid Drone",
    "Orphic Amulet",
    "Projector Bots",
    "Recon Drones",
  ];

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

  function buildVariantsForSlotLocal(names, slotKind) {
    const out = [];
    for (const nm of names) {
      const crystals = allowedCrystalsForItem(nm, slotKind, archetype);
      if (!crystals || !crystals.length) continue;
      for (const c of crystals) out.push(getV(nm, c));
    }
    return out;
  }

  const armorVariants = buildVariantsForSlotLocal(armorChoices, "armor");
  const weaponVariants = buildVariantsForSlotLocal(meleeWeapons, "weapon");
  const miscVariants = buildVariantsForSlotLocal(miscChoices, "misc");

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderless(miscVariants);

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

  // Compile defenders in priority order
  const defenders = defenderBuilds.map((d) => compileDefender(d, localCache));

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const AV = armorVariants.length;
  const perGear = AV * WP * MP;

  const topsByHp = Object.create(null);

  const t0 = nowMs();
  let lastProgress = t0;
  let processed = 0;

  // deterministic base seed should be stable across all workers
  const detBaseSeed = (Number(rngSeed) || 0) >>> 0;

  for (let globalIdx = startIndex; globalIdx < endIndex; globalIdx++) {
    processed++;

    const planIdx = Math.floor(globalIdx / perGear);
    const gearIdx = globalIdx - planIdx * perGear;
    const plan = plans[planIdx];

    const ai = Math.floor(gearIdx / (WP * MP));
    const rem = gearIdx - ai * (WP * MP);
    const wpi = Math.floor(rem / MP);
    const mpi = rem - wpi * MP;

    const av = armorVariants[ai];

    const wpBase = wpi * 2;
    const w1v = weaponVariants[weaponPairs[wpBase]];
    const w2v = weaponVariants[weaponPairs[wpBase + 1]];

    const mpBase = mpi * 2;
    const m1v = miscVariants[miscPairs[mpBase]];
    const m2v = miscVariants[miscPairs[mpBase + 1]];

    // Coarse prune proxy (keep as-is)
    if (!disablePrune) {
      const mel =
        BASE.meleeSkill +
        av.addMel +
        w1v.addMel +
        w2v.addMel +
        m1v.addMel +
        m2v.addMel;
      const defSk =
        BASE.defSkill +
        av.addDef +
        w1v.addDef +
        w2v.addDef +
        m1v.addDef +
        m2v.addDef;
      const armor = BASE.armor + av.addArmStat;
      if (mel + defSk + armor < 1200 - pruneDelta) {
        const t = nowMs();
        if (t - lastProgress >= progressEveryMs) {
          lastProgress = t;
          parentPort.postMessage({
            type: "progress",
            processed,
            bestWorst: null,
            bestAvg: null,
          });
        }
        continue;
      }
    }

    const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v);

    const hpKey = String(plan.hp);
    let lb = topsByHp[hpKey];
    if (!lb) lb = topsByHp[hpKey] = [];

    const floorWorst =
      lb.length >= keepTopNPerHp ? lb[lb.length - 1].worstWin : null;

    const score = evalCandidateStaged({
      att,
      defenders,
      maxTurns,
      trialsScreen,
      trialsConfirm,
      floorWorst,
      bailMargin,
      deterministic,
      baseSeed: detBaseSeed,
      candidateKey: globalIdx, // stable across workers
    });

    if (!score.bailed) {
      const floor = lb.length ? lb[lb.length - 1] : null;
      if (
        lb.length < keepTopNPerHp ||
        score.worstWin >= floor.worstWin - 1e-9
      ) {
        pushLeaderboard(
          lb,
          {
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
            },
          },
          keepTopNPerHp,
        );
      }
    }

    const t = nowMs();
    if (t - lastProgress >= progressEveryMs) {
      lastProgress = t;

      // best across HPs (worker-local)
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

      parentPort.postMessage({
        type: "progress",
        processed,
        bestWorst,
        bestAvg,
      });
    }
  }

  parentPort.postMessage({
    type: "done",
    processed,
    topsByHp,
    elapsedSec: (nowMs() - t0) / 1000,
  });
}

// =====================
// MAIN THREAD
// =====================
async function main() {
  const single = process.argv.includes("--single");

  const logical =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : os.cpus().length || 1;

  const physicalGuess = logical >= 8 ? Math.ceil(logical / 2) : logical;

  const envW = parseInt(process.env.LEGACY_WORKERS || "", 10);
  const defaultWorkers = Math.min(physicalGuess, SETTINGS.WORKERS_DEFAULT_CAP);

  const workers = single
    ? 1
    : Number.isFinite(envW) && envW > 0
      ? Math.min(envW, logical)
      : defaultWorkers;

  const envConfirm = parseInt(process.env.LEGACY_TRIALS || "", 10);
  const TRIALS_CONFIRM =
    Number.isFinite(envConfirm) && envConfirm > 0
      ? envConfirm
      : SETTINGS.TRIALS_CONFIRM_DEFAULT;

  const envScreen = parseInt(process.env.LEGACY_TRIALS_SCREEN || "", 10);
  const TRIALS_SCREEN =
    Number.isFinite(envScreen) && envScreen > 0
      ? envScreen
      : SETTINGS.TRIALS_SCREEN_DEFAULT;

  const envBailMargin = parseFloat(process.env.LEGACY_SCREEN_MARGIN || "");
  const BAIL_MARGIN =
    Number.isFinite(envBailMargin) && envBailMargin >= 0
      ? envBailMargin
      : SETTINGS.SCREEN_BAIL_MARGIN_DEFAULT;

  const envPrune = process.env.LEGACY_PRUNE;
  const disablePrune = envPrune === "0" || envPrune === "false";
  const pruneDelta = (() => {
    const x = parseInt(process.env.LEGACY_PRUNE_DELTA || "", 10);
    return Number.isFinite(x) ? x : SETTINGS.PRUNE_DELTA_DEFAULT;
  })();

  const rngMode = (process.env.LEGACY_RNG || "fast").toLowerCase(); // "math" | "fast"
  const rngSeed = parseInt(process.env.LEGACY_SEED || "", 10) || 123456789;
  const deterministic =
    process.env.LEGACY_DETERMINISTIC === "1" ||
    process.env.LEGACY_DETERMINISTIC === "true";

  // Reassurance counts (using same constrained space)
  const archetype = "melee";
  const meleeWeapons = [
    "Crystal Maul",
    "Core Staff",
    "Void Axe",
    "Scythe T2",
    "Void Sword",
  ];
  const armorChoices = ["SG1 Armor", "Dark Legion Armor"]; // ✅ constrained
  const miscChoices = [
    "Bio Spinal Enhancer",
    "Scout Drones",
    "Droid Drone",
    "Orphic Amulet",
    "Projector Bots",
    "Recon Drones",
  ];

  const armorVariants = buildVariantsForSlot(armorChoices, "armor", archetype);
  const weaponVariants = buildVariantsForSlot(
    meleeWeapons,
    "weapon",
    archetype,
  );
  const miscVariants = buildVariantsForSlot(miscChoices, "misc", archetype);

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderless(miscVariants);

  const { plans, perHpSummary } = buildHpPlans();

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const AV = armorVariants.length;

  const perGear = AV * WP * MP;
  const totalCandidates = plans.length * perGear;

  console.log(
    `LEGACY brute-force (v2.1 staged) | melee attacker | defenders=${defenderBuilds.length} | trialsScreen/def=${TRIALS_SCREEN} | trialsConfirm/def=${TRIALS_CONFIRM}`,
  );
  console.log(
    `Workers=${workers} (logical=${logical}, physicalGuess=${physicalGuess}) | RNG=${rngMode === "fast" ? "fast(sfc32)" : "Math.random"} | deterministic=${deterministic ? "ON" : "OFF"} | baseDmgPerHit=+${BASE.baseDamagePerHit}`,
  );
  console.log(
    `Variants: armor=${armorVariants.length}, weapon=${weaponVariants.length}, misc=${miscVariants.length}`,
  );
  console.log(
    `Pairs(orderless): weaponPairs=${WP}, miscPairs=${MP} (Bio+Bio and Scout+Scout allowed)`,
  );
  console.log(
    `HP sweep: ${SETTINGS.HP_MIN}..${SETTINGS.HP_MAX_SWEEP} step ${SETTINGS.HP_STEP} | statPoint=5HP | acc/dodge step=${SETTINGS.STAT_STEP}`,
  );
  console.log(`Prune: ${disablePrune ? "OFF" : `ON (delta=${pruneDelta})`}`);
  console.log(
    `StageA bail margin: ${BAIL_MARGIN.toFixed(2)}% (bail if worst < floorWorst - margin)`,
  );
  console.log("HP plans (reassurance):");
  for (const r of perHpSummary) {
    console.log(
      `  HP=${r.hp} freePoints=${r.freePoints} allocs=${r.allocCount}  (acc+dodge=${r.freePoints}, speed=0)`,
    );
  }
  console.log(
    `Total plans=${plans.length} | perGear=${perGear} | totalCandidates=${totalCandidates}\n`,
  );

  // Global per-HP leaderboards
  const globalByHp = Object.create(null);
  for (const r of perHpSummary) globalByHp[String(r.hp)] = [];

  let liveBestWorst = null;
  let liveBestAvg = null;

  const start = nowMs();
  let lastRender = start;
  const processedByWorker = new Array(workers).fill(0);

  // Partition [0, totalCandidates)
  const perWorker = Math.floor(totalCandidates / workers);
  const ranges = [];
  for (let w = 0; w < workers; w++) {
    const s = w * perWorker;
    const e = w === workers - 1 ? totalCandidates : (w + 1) * perWorker;
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
          bailMargin: BAIL_MARGIN,
          maxTurns: SETTINGS.MAX_TURNS,
          keepTopNPerHp: SETTINGS.KEEP_TOP_N_PER_HP,
          progressEveryMs: SETTINGS.PROGRESS_EVERY_MS,
          startIndex,
          endIndex,
          pruneDelta,
          disablePrune,
          rngMode: rngMode === "fast" ? "fast" : "math",
          rngSeed,
          deterministic,
        },
      });

      wk.on("message", (msg) => {
        if (!msg || !msg.type) return;

        if (msg.type === "progress") {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          if (typeof msg.bestWorst === "number") {
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

            process.stdout.write(
              `\rtested~=${Math.min(doneProcessed, totalCandidates)}/${totalCandidates} elapsed=${elapsed.toFixed(
                1,
              )}s bestWorst=${liveBestWorst !== null ? liveBestWorst.toFixed(2) : "—"}% bestAvg=${liveBestAvg !== null ? liveBestAvg.toFixed(2) : "—"}%   `,
            );
          }
        }

        if (msg.type === "done") {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          // merge per-HP leaderboards
          const topsByHp = msg.topsByHp || {};
          for (const hpKey in topsByHp) {
            const localLB = topsByHp[hpKey];
            if (!localLB || !localLB.length) continue;

            const globalLB = globalByHp[hpKey] || (globalByHp[hpKey] = []);
            for (const e of localLB)
              pushLeaderboard(globalLB, e, SETTINGS.KEEP_TOP_N_PER_HP);
          }

          doneCount++;
          if (doneCount >= workers) resolve();
        }
      });

      wk.on("error", reject);
      wk.on("exit", (code) => {
        if (code !== 0)
          reject(new Error(`Worker ${w} exited with code ${code}`));
      });
    }
  });

  process.stdout.write("\n");
  const elapsedAll = (nowMs() - start) / 1000;
  printResults(globalByHp, elapsedAll, totalCandidates);
}

function printResults(globalByHp, elapsedSec, totalCandidates) {
  console.log(
    `\nDone. tested=${totalCandidates} | elapsed=${elapsedSec.toFixed(1)}s`,
  );
  console.log(
    `Per-HP Top ${SETTINGS.KEEP_TOP_N_PER_HP} (ranked by worstWin, then avgWin)\n`,
  );

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
      padRight("Rank", 5) +
        padRight("Worst%", 8) +
        padRight("WorstVs", 20) +
        padRight("Avg%", 7) +
        padRight("AvgEx", 7) +
        "Build",
    );
    console.log("─".repeat(105));

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
    console.error("\nFatal:", err && err.stack ? err.stack : err);
    process.exit(1);
  });
} else {
  workerMain();
}
