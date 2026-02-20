#!/usr/bin/env node
'use strict';

/**
 * LEGACY MATCHUP SUITE — clean table output (NO JSON)
 *
 * - Single attacker vs ALL defenders
 * - Outputs a readable matchup table (win%, avgRounds, empirical hit/skill chances)
 * - Defaults back to the “classic” model that was mostly matching your other matchups:
 *    - hitGate=weapon, skillGate=weapon, armorApply=perWeapon
 *    - rollVs: random(floor(stat/4), stat) - random(floor(stat/4), stat) > 0
 *    - damage: modern wiki-style modifier=(level*7)/2 and dealt=raw*(mod/(mod+armor)), rounded
 *    - weapon damage roll: floatRound (like your old scripts)
 *
 * Usage:
 *   node main.js
 *   node main.js --trials 30000
 *   node main.js --seed 1337
 *
 * Optional toggles:
 *   --hitGate page|weapon
 *   --skillGate page|weapon
 *   --armorApply perWeapon|perPage
 *   --stopOnKill true|false
 *   --roll uniformInt|floatRound
 *
 * NOTE:
 * - This file includes a few defender builds you’ve been using. If your local script
 *   already has the full defender list, just paste your full defenderBuilds array
 *   into the section marked “DEFENDER BUILDS”.
 */

// =====================
// ARG PARSE
// =====================
const argv = process.argv.slice(2);
function argVal(name, fallback = null) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  return argv[i + 1] ?? fallback;
}
function argBool(name, fallback = null) {
  const v = argVal(name, null);
  if (v == null) return fallback;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}
const TRIALS = Number(argVal('--trials', '30000'));
const SEED_IN = argVal('--seed', null);
const HIT_GATE = (argVal('--hitGate', 'weapon') || 'weapon').toLowerCase(); // weapon|page
const SKILL_GATE = (argVal('--skillGate', 'weapon') || 'weapon').toLowerCase(); // weapon|page
const ARMOR_APPLY = (argVal('--armorApply', 'perWeapon') || 'perWeapon').toLowerCase(); // perweapon|perpage
const STOP_ON_KILL = argBool('--stopOnKill', false) ?? false;
const DAMAGE_ROLL_MODE = (argVal('--roll', 'floatRound') || 'floatRound').toLowerCase(); // floatround|uniformint

// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  BASE_HP: 865,
  MAX_ROUNDS: 200,

  // rollVs core behavior
  ROLLVS_TIE_WINS: false, // diff > 0 (classic)
  HIT_GATE_MODE: HIT_GATE, // weapon | page
  SKILL_GATE_MODE: SKILL_GATE, // weapon | page
  ARMOR_APPLY_MODE: ARMOR_APPLY, // perweapon | perpage
  STOP_ON_KILL: STOP_ON_KILL,

  // damage
  DAMAGE_MODEL: 'modern', // modern
  DAMAGE_ROLL_MODE: DAMAGE_ROLL_MODE, // floatRound | uniformInt

  // HP->points conversion (you said: 1 stat point = 5 HP)
  HP_BONUS_DIVISOR: 5,
};

// =====================
// SEEDED RNG
// =====================
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = (() => {
  if (SEED_IN == null) return Math.random;
  const seedFn = xmur3(String(SEED_IN));
  return mulberry32(seedFn());
})();

function randIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(rng() * (max - min + 1)) + min;
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

// =====================
// rollVs (classic)
// random(floor(stat/4), stat) - random(floor(stat/4), stat) > 0
// =====================
function rollVs(off, def) {
  off = Math.max(0, off);
  def = Math.max(0, def);
  const offLo = Math.floor(off / 4);
  const offHi = Math.floor(off);
  const defLo = Math.floor(def / 4);
  const defHi = Math.floor(def);
  const diff = randIntInclusive(offLo, offHi) - randIntInclusive(defLo, defHi);
  return SETTINGS.ROLLVS_TIE_WINS ? diff >= 0 : diff > 0;
}

// =====================
// BASE STATS
// =====================
const BASE = {
  hp: SETTINGS.BASE_HP,
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
};

function makeCrystal(name) {
  const def = CrystalDefs[name];
  if (!def) throw new Error(`Unknown crystal: ${name}`);
  return { name, ...def };
}

const ItemDefs = {
  // Armor
  'SG1 Armor': { type: 'Armor', flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 } },
  'Dark Legion Armor': {
    type: 'Armor',
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
  },
  'Hellforged Armor': {
    type: 'Armor',
    flatStats: { armor: 115, dodge: 65, speed: 55, defSkill: 55 },
  },

  // Weapons
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
  'Scythe T2': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 75, accuracy: 42, meleeSkill: 65, defSkill: 18 },
    baseWeaponDamage: { min: 80, max: 101 },
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

  // Misc
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
// Crystal model (the one you’ve been using): % applies to THAT item’s stats (sum then ceil)
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

  for (const k in stats) {
    const p = pctMap[k] || 0;
    stats[k] += Math.ceil(stats[k] * p);
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

// HP->bonus stat points allocator (you: 1 point per 5 HP)
function hpToBonusPoints(hp) {
  const hpLost = Math.max(0, SETTINGS.BASE_HP - hp);
  return Math.floor(hpLost / SETTINGS.HP_BONUS_DIVISOR);
}

function applyBuild(base, equipped, alloc /* {accPoints, dodgePoints} */) {
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

  // Apply HP bonus allocation (you want +54 dodge when HP=595)
  const bonus = hpToBonusPoints(out.hp);
  const accPts = alloc?.accPoints || 0;
  const dodgePts = alloc?.dodgePoints || 0;
  if (accPts + dodgePts !== bonus) {
    // If user didn’t supply, default all to dodge (your current pattern).
    out.dodge += bonus;
  } else {
    out.accuracy += accPts;
    out.dodge += dodgePts;
  }

  // Final rounding
  [
    'speed',
    'armor',
    'accuracy',
    'dodge',
    'gunSkill',
    'meleeSkill',
    'projSkill',
    'defSkill',
  ].forEach((k) => (out[k] = Math.floor(out[k])));

  out.__weapon1 = w1;
  out.__weapon2 = w2;
  return out;
}

// =====================
// DAMAGE
// =====================
function rollWeaponRaw(w) {
  if (SETTINGS.DAMAGE_ROLL_MODE === 'uniformint') {
    return randIntInclusive(w.weaponDamage.min, w.weaponDamage.max);
  }
  // floatRound
  const r = w.weaponDamage.min + rng() * (w.weaponDamage.max - w.weaponDamage.min);
  return Math.round(r);
}

// modern wiki: modifier=(level*7)/2
function dmgModern(level, raw, defenderArmor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  const dealt = raw * (modifier / (modifier + defenderArmor));
  return Math.round(dealt);
}

function computeDamage(level, raw, defenderArmor) {
  return dmgModern(level, raw, defenderArmor);
}

// =====================
// ONE ACTION
// =====================
function doAction(actor, target, counters, side /*'A'|'D'*/) {
  const w1 = actor.__weapon1;
  const w2 = actor.__weapon2;

  // helpers to count attempts/wins in a way that matches your “chances” expectation
  function countHitAttempt() {
    counters[side].hitAttempts++;
  }
  function countHitWin() {
    counters[side].hitWins++;
  }
  function countSkillAttempt(slot) {
    counters[side]['dmg' + slot + 'Attempts']++;
  }
  function countSkillWin(slot) {
    counters[side]['dmg' + slot + 'Wins']++;
  }

  // PAGE hit gate
  let pageHitOk = true;
  if (SETTINGS.HIT_GATE_MODE === 'page') {
    countHitAttempt();
    pageHitOk = rollVs(actor.accuracy, target.dodge);
    if (pageHitOk) countHitWin();
  }

  // PAGE skill gate
  let pageSkillOk = true;
  if (SETTINGS.SKILL_GATE_MODE === 'page') {
    // choose “off” as the skill for the weapon being used doesn’t exist at page-level;
    // we treat page skill as “weapon1’s skillType” (matches typical implementation)
    const w = w1 || w2;
    if (w) {
      countSkillAttempt(1);
      pageSkillOk = rollVs(actor[w.skillType], target.defSkill);
      if (pageSkillOk) countSkillWin(1);
    }
  }

  // Armor apply style
  let rawSum = 0;
  let dmgSum = 0;
  let anyLanded = false;

  function oneWeapon(w, slot) {
    if (!w) return;

    // weapon hit gate
    let hitOk = pageHitOk;
    if (SETTINGS.HIT_GATE_MODE === 'weapon') {
      countHitAttempt();
      hitOk = rollVs(actor.accuracy, target.dodge);
      if (hitOk) countHitWin();
    }
    if (!hitOk) return;

    // weapon skill gate
    let skillOk = pageSkillOk;
    if (SETTINGS.SKILL_GATE_MODE === 'weapon') {
      countSkillAttempt(slot);
      skillOk = rollVs(actor[w.skillType], target.defSkill);
      if (skillOk) countSkillWin(slot);
    }
    if (!skillOk) return;

    anyLanded = true;

    const raw = rollWeaponRaw(w);

    if (SETTINGS.ARMOR_APPLY_MODE === 'perpage') {
      rawSum += raw;
      return;
    }

    const dealt = computeDamage(actor.level, raw, target.armor);
    dmgSum += dealt;
  }

  oneWeapon(w1, 1);
  if (SETTINGS.STOP_ON_KILL && target.hp <= 0) return;
  oneWeapon(w2, 2);

  if (SETTINGS.ARMOR_APPLY_MODE === 'perpage') {
    if (anyLanded && rawSum > 0) dmgSum = computeDamage(actor.level, rawSum, target.armor);
  }

  const applied = Math.min(dmgSum, target.hp);
  target.hp = Math.max(0, target.hp - applied);

  counters[side].damageTotal += applied;
  counters[side].damageMin = Math.min(counters[side].damageMin, applied);
  counters[side].damageMax = Math.max(counters[side].damageMax, applied);
}

function pickFirst(att, def) {
  if (att.speed > def.speed) return 'A';
  if (def.speed > att.speed) return 'D';
  return 'A'; // tie attacker
}

// =====================
// SIM
// =====================
function simulate(attackerBase, defenderBase, trials) {
  const origAHP = attackerBase.hp;
  const origDHP = defenderBase.hp;

  let aWins = 0;
  let dWins = 0;
  let actionsTotal = 0;
  let roundsTotal = 0;

  const counters = {
    A: {
      hitAttempts: 0,
      hitWins: 0,
      dmg1Attempts: 0,
      dmg1Wins: 0,
      dmg2Attempts: 0,
      dmg2Wins: 0,
      damageTotal: 0,
      damageMin: Infinity,
      damageMax: -Infinity,
    },
    D: {
      hitAttempts: 0,
      hitWins: 0,
      dmg1Attempts: 0,
      dmg1Wins: 0,
      dmg2Attempts: 0,
      dmg2Wins: 0,
      damageTotal: 0,
      damageMin: Infinity,
      damageMax: -Infinity,
    },
  };

  for (let i = 0; i < trials; i++) {
    const A = { ...attackerBase, hp: origAHP };
    const D = { ...defenderBase, hp: origDHP };

    let actor = pickFirst(A, D) === 'A' ? A : D;
    let target = actor === A ? D : A;

    let actions = 0;
    while (A.hp > 0 && D.hp > 0 && actions < SETTINGS.MAX_ROUNDS * 2) {
      actions++;
      doAction(actor, target, counters, actor === A ? 'A' : 'D');
      // swap
      const tmp = actor;
      actor = target;
      target = tmp;
    }

    actionsTotal += actions;
    roundsTotal += Math.ceil(actions / 2);

    if (A.hp > 0 && D.hp <= 0) aWins++;
    else dWins++;
  }

  function pct(w, a) {
    return a > 0 ? (w / a) * 100 : 0;
  }

  return {
    winPct: (aWins / trials) * 100,
    avgRounds: roundsTotal / trials,
    empA: {
      hit: pct(counters.A.hitWins, counters.A.hitAttempts),
      s1: pct(counters.A.dmg1Wins, counters.A.dmg1Attempts),
      s2: pct(counters.A.dmg2Wins, counters.A.dmg2Attempts),
    },
    empD: {
      hit: pct(counters.D.hitWins, counters.D.hitAttempts),
      s1: pct(counters.D.dmg1Wins, counters.D.dmg1Attempts),
      s2: pct(counters.D.dmg2Wins, counters.D.dmg2Attempts),
    },
  };
}

// =====================
// YOUR ATTACKER BUILD (back to your “main” build)
// HP=595 => +54 bonus points (all to dodge) with divisor=5
// =====================
const attackerEquipped = {
  armor: makeItem('SG1 Armor', all('Perfect Pink Crystal', 4)),
  weapon1: makeItem('Crystal Maul', all('Amulet Crystal', 4)),
  weapon2: makeItem('Core Staff', all('Amulet Crystal', 4)),
  misc1: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
  misc2: makeItem('Bio Spinal Enhancer', all('Perfect Pink Crystal', 4)),
  hp: 595,
};

// If you ever want to split the bonus points, set accPoints/dodgePoints to sum=bonus.
const attacker = applyBuild(BASE, attackerEquipped, null);

// =====================
// DEFENDER BUILDS
// IMPORTANT: if your local script already has the full list,
// paste it here and delete the minimal list below.
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
      misc1: makeItem('Bio Spinal Enhancer', all('Perfect Orange Crystal', 4)),
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
// PRETTY PRINT
// =====================
function fmtNum(x, w, d = 2) {
  const s = x.toFixed(d);
  return s.padStart(w, ' ');
}
function fmtPct(x, w) {
  return fmtNum(x, w, 2);
}
function fmtCh(triple) {
  return `${fmtNum(triple.hit, 5, 1)}/${fmtNum(triple.s1, 5, 1)}/${fmtNum(triple.s2, 5, 1)}`;
}

function fmtActor(label, a) {
  console.log(`--- ${label} (derived) ---`);
  console.log(
    `HP=${a.hp} Lvl=${a.level} Spd=${a.speed} Arm=${a.armor} Acc=${a.accuracy} Dod=${a.dodge}`,
  );
  console.log(`Gun=${a.gunSkill} Mel=${a.meleeSkill} Prj=${a.projSkill} Def=${a.defSkill}`);
  console.log(
    `W1=${a.__weapon1?.name || '-'} (${a.__weapon1?.skillType || '-'}) dmg=${a.__weapon1?.weaponDamage?.min || '-'}-${a.__weapon1?.weaponDamage?.max || '-'}`,
  );
  console.log(
    `W2=${a.__weapon2?.name || '-'} (${a.__weapon2?.skillType || '-'}) dmg=${a.__weapon2?.weaponDamage?.min || '-'}-${a.__weapon2?.weaponDamage?.max || '-'}`,
  );
  console.log('');
}

// =====================
// RUN ALL
// =====================
console.log(`=== LEGACY MATCHUP SUITE (clean output) ===`);
console.log(
  `Trials per defender: ${TRIALS} | MaxRounds: ${SETTINGS.MAX_ROUNDS}` +
    (SEED_IN != null ? ` | seed=${SEED_IN}` : ''),
);
console.log(
  `Model: hitGate=${SETTINGS.HIT_GATE_MODE} skillGate=${SETTINGS.SKILL_GATE_MODE} armorApply=${SETTINGS.ARMOR_APPLY_MODE} stopOnKill=${SETTINGS.STOP_ON_KILL} roll=${SETTINGS.DAMAGE_ROLL_MODE}`,
);
console.log('');

fmtActor('ATTACKER', attacker);

const results = [];

for (const def of defenderBuilds) {
  const built = applyBuild(BASE, { ...def.equipped, hp: def.hp }, null);
  const out = simulate(attacker, built, TRIALS);
  results.push({
    name: def.name,
    win: out.winPct,
    rounds: out.avgRounds,
    a: out.empA,
    d: out.empD,
  });
}

// hardest first = lowest attacker win%
results.sort((a, b) => a.win - b.win);

console.log('--- RESULTS (hardest first) ---');
console.log(
  'Defender'.padEnd(22) +
    ' | ' +
    'Win%'.padStart(6) +
    ' | ' +
    'Rnds'.padStart(6) +
    ' | ' +
    'A emp(hit/s1/s2)'.padEnd(19) +
    ' | ' +
    'D emp(hit/s1/s2)',
);
console.log(
  '─'.repeat(22) +
    '─┼' +
    '─'.repeat(8) +
    '┼' +
    '─'.repeat(8) +
    '┼' +
    '─'.repeat(21) +
    '┼' +
    '─'.repeat(19),
);

for (const r of results) {
  console.log(
    r.name.padEnd(22) +
      ' | ' +
      fmtPct(r.win, 6) +
      ' | ' +
      fmtNum(r.rounds, 6, 2) +
      ' | ' +
      fmtCh(r.a).padEnd(19) +
      ' | ' +
      fmtCh(r.d),
  );
}

console.log('\nLegend:');
console.log(' - Win% = attacker win rate');
console.log(' - Rnds = average rounds (ceil(actions/2))');
console.log(' - A/D emp(hit/s1/s2) = empirical rollVs success rates measured during sim');
