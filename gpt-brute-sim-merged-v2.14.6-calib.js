#!/usr/bin/env node
'use strict';

/**
 * =====================
 * LEGACY BRUTE FORCE (CONSTRAINED + STAGED + DETERMINISTIC RNG OPTION)
 * v2.14.2 (CATALOG CONFIRM SPEEDUP + mixed bonus clarified)
 * =====================
 *
 * Fixes / Improvements:
 * ✅ Catalog confirmation now compiles defenders ONCE and reuses them for all confirm calls.
 *    (Previously it rebuilt a variant cache + recompiled defenders per catalog entry.)
 *
 * Mixed weapon bonus (as you described):
 * ✅ If weapon types are mixed => double EACH weapon’s OWN offensive skill contribution,
 *    and only the skill coming from that weapon variant (weapon flats + weapon crystal effects).
 *    (No doubling armor/misc skill, no doubling defSkill/speed/accuracy, etc.)
 *
 * Env knobs:
 *   LEGACY_CATALOG_TOP_N=10
 *   LEGACY_CATALOG_MARGIN=12
 *   LEGACY_CATALOG_CONFIRM_TRIALS= (defaults to TRIALS_CONFIRM)
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

  TRIALS_CONFIRM_DEFAULT: 10000,
  TRIALS_SCREEN_DEFAULT: 1000,
  TRIALS_GATE_DEFAULT: 500,
  GATEKEEPERS_DEFAULT: 4,

  SCREEN_BAIL_MARGIN_DEFAULT: 6.0,

  KEEP_TOP_N_PER_HP: 10,
  PROGRESS_EVERY_MS: 2000,

  // LOCKED ATTACKER STATS
  LOCKED_HP: 595,

  // pruning (default OFF; enable with LEGACY_PRUNE=1)
  PRUNE_DELTA_DEFAULT: 260,
  PRUNE_DEFAULT_ENABLED: true,

  WORKERS_DEFAULT_CAP: 4,
};

// =====================
// COMBAT CONFIG (defaults match your best-fit calibration)
// =====================
function envStr(name, def) {
  const v = process.env[name];
  return v === undefined || v === '' ? def : String(v);
}
function envInt(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function envFloat(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}
function envBool(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on';
}

function normalizeRollMode(s, def = 'int') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'int' || s === 'integer') return 'int';
  if (s === 'float') return 'float';
  if (s === 'roundfloat' || s === 'round_float' || s === 'round-float') return 'roundfloat';
  return def;
}
function normalizeQround(s, def = 'round') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'floor') return 'floor';
  if (s === 'ceil' || s === 'ceiling') return 'ceil';
  if (s === 'round') return 'round';
  return def;
}
function normalizeArmorApply(s, def = 'per_weapon') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'per_weapon' || s === 'per-weapon' || s === 'weapon') return 'per_weapon';
  if (s === 'sum' || s === 'combined') return 'sum';
  return def;
}
function normalizeSpeedTie(s, def = 'random') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'random' || s === 'rand') return 'random';
  if (s === 'attacker' || s === 'a') return 'attacker';
  if (s === 'defender' || s === 'd') return 'defender';
  return def;
}
function normalizeSharedSkill(s, def = 'none') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'none' || s === 'off' || s === '0') return 'none';
  if (s === 'same' || s === 'same_type' || s === 'same-type') return 'same_type';
  if (s === 'all') return 'all';
  return def;
}
function normalizeHiddenPreset(s, def = 'slot3_prjdef') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'none' || s === 'off' || s === '0') return 'none';
  if (s === 'slot3_prjdef' || s === 'slot3-projdef') return 'slot3_prjdef';
  return def;
}
function normalizeTacticsMode(s, def = 'none') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'none' || s === 'off' || s === '0') return 'none';
  if (s === 'always' || s === 'on' || s === '1') return 'always';
  return def;
}
function normalizeDmgBonusMode(s, def = 'per_action') {
  s = (s ?? def).toString().trim().toLowerCase();
  if (s === 'per_action' || s === 'per-action' || s === 'action') return 'per_action';
  if (s === 'per_weapon' || s === 'per-weapon' || s === 'weapon') return 'per_weapon';
  return def;
}

// parse "gun,melee=0.5" -> { gun:1, melee:0.5 }
function parseTypeMults(str) {
  const out = Object.create(null);
  const s = (str || '').toString().trim();
  if (!s) return out;
  for (const partRaw of s.split(',')) {
    const part = partRaw.trim();
    if (!part) continue;
    const [kRaw, vRaw] = part.split('=').map((x) => x.trim());
    const k = (kRaw || '').toLowerCase();
    if (!k) continue;
    const v = vRaw === undefined || vRaw === '' ? 0 : parseFloat(vRaw);
    out[k] = Number.isFinite(v) ? v : 1;
  }
  return out;
}

const CFG = Object.freeze({
  // roll logic
  HIT_ROLL_MODE: normalizeRollMode(envStr('LEGACY_HIT_ROLL_MODE', 'int'), 'int'),
  HIT_GE: envBool('LEGACY_HIT_GE', true), // int+GE
  HIT_QROUND: normalizeQround(envStr('LEGACY_HIT_QROUND', 'round'), 'round'),

  SKILL_ROLL_MODE: normalizeRollMode(envStr('LEGACY_SKILL_ROLL_MODE', 'int'), 'int'),
  SKILL_GE: envBool('LEGACY_SKILL_GE', false), // strict >
  SKILL_QROUND: normalizeQround(envStr('LEGACY_SKILL_QROUND', 'round'), 'round'),

  DMG_ROLL: normalizeRollMode(envStr('LEGACY_DMG_ROLL', 'int'), 'int'),

  // armor
  ARMOR_K: envInt('LEGACY_ARMOR_K', 8),
  ARMOR_APPLY: normalizeArmorApply(envStr('LEGACY_ARMOR_APPLY', 'per_weapon'), 'per_weapon'),
  ARMOR_ROUND: normalizeQround(envStr('LEGACY_ARMOR_ROUND', 'round'), 'round'),

  // misc knobs
  PROJ_DEF_MULT: envFloat('LEGACY_PROJ_DEF_MULT', 1),
  SPEED_TIE_MODE: normalizeSpeedTie(envStr('LEGACY_SPEED_TIE_MODE', 'random'), 'random'),
  SHARED_HIT: envBool('LEGACY_SHARED_HIT', false),
  SHARED_SKILL: normalizeSharedSkill(envStr('LEGACY_SHARED_SKILL', 'none'), 'none'),

  // tactics (kept for compatibility; default OFF)
  TACTICS_MODE: normalizeTacticsMode(envStr('LEGACY_TACTICS_MODE', 'none'), 'none'),
  TACTICS_VAL: envInt('LEGACY_TACTICS_VAL', 5),
  DMG_BONUS_MODE: normalizeDmgBonusMode(
    envStr('LEGACY_DMG_BONUS_MODE', 'per_action'),
    'per_action',
  ),

  // hidden slot bonus
  HIDDEN_PRESET: normalizeHiddenPreset(
    envStr('LEGACY_HIDDEN_PRESET', 'slot3_prjdef'),
    'slot3_prjdef',
  ),

  // calibration patches / overrides (can be disabled)
  CALIB_PATCHES: envBool('LEGACY_CALIB_PATCHES', true),
  HF_ARMOR_BASE_OVERRIDE: envInt('LEGACY_HF_ARMOR_BASE_OVERRIDE', 125),
  VOID_SWORD_BASE_MAX_OVERRIDE: envInt('LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE', 123),

  // "misc skill % crystal scaling" (default matches your Scout Drones finding)
  MISC_NO_CRYSTAL_SKILL: envStr('LEGACY_MISC_NO_CRYSTAL_SKILL', 'Scout Drones'),
  MISC_NO_CRYSTAL_SKILL_TYPES: parseTypeMults(
    envStr('LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES', 'gun,melee=0.5'),
  ),
});

// small one-liner for logging
function cfgSummary() {
  return [
    `HIT=${CFG.HIT_ROLL_MODE}${CFG.HIT_GE ? '+GE' : ''}/${CFG.HIT_QROUND}`,
    `SKILL=${CFG.SKILL_ROLL_MODE}${CFG.SKILL_GE ? '+GE' : ''}/${CFG.SKILL_QROUND}`,
    `DMG=${CFG.DMG_ROLL}`,
    `ARMOR=K${CFG.ARMOR_K} ${CFG.ARMOR_APPLY}/${CFG.ARMOR_ROUND}`,
    `TIE=${CFG.SPEED_TIE_MODE}`,
    `HIDDEN=${CFG.HIDDEN_PRESET}`,
    `PROJ_DEF_MULT=${CFG.PROJ_DEF_MULT}`,
    `PATCHES=${CFG.CALIB_PATCHES ? 'ON' : 'OFF'}`,
  ].join(' | ');
}

// =====================
// POOLS
// =====================
const POOLS = {
  armors: ['SG1 Armor', 'Dark Legion Armor', 'Hellforged Armor'],
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
    'Bio Gun Mk4',
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
  baseDamagePerHit: 0, // default: no global flat damage (tactics handled via CFG.TACTICS_MODE)
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

function shortUpgrade(u) {
  if (!u || u === 'None') return '';
  return u
    .replace('Faster Reload 4', 'FR4')
    .replace('Enhanced Scope 4', 'ES4')
    .replace('Faster Ammo 4', 'FA4')
    .replace('Tracer Rounds 4', 'TR4')
    .replace('Laser Sight', 'LS')
    .replace('Poisoned Tip', 'PT');
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
    .replace('Bio Gun Mk4', 'Mk4')
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
// GLOBAL SHARED FLOOR + FLAGS (Atomics)
// sharedI32[0] = floorPctScaled or -1
// sharedI32[1] = watchHitFlag (0/1)
// =====================
const FLOOR_SCALE = 1_000_000;

function floorLoadPct(sharedI32) {
  if (!sharedI32) return null;
  const v = Atomics.load(sharedI32, 0);
  if (v < 0) return null;
  return v / FLOOR_SCALE;
}
function floorTryRaise(sharedI32, pct) {
  if (!sharedI32) return;
  const next = Math.max(0, Math.min(100, pct));
  const nextI = (next * FLOOR_SCALE) | 0;

  while (true) {
    const cur = Atomics.load(sharedI32, 0);
    if (cur >= nextI) return;
    const prev = Atomics.compareExchange(sharedI32, 0, cur, nextI);
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

// =====================
// COMBAT (calibrated kernel)
// =====================
let RNG = Math.random;

// legacy-style integer RNG, inclusive, allowing fractional min/max
function randLegacyInt(min, max) {
  // Match main-calib behavior exactly: integer RNG inclusive, with safe bounds.
  min = Math.ceil(min);
  max = Math.floor(max);
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  return Math.floor(RNG() * (max - min + 1) + min);
}
function randLegacyFloat(min, max) {
  if (max < min) return min;
  return min + RNG() * (max - min);
}
function applyQuarterRound(x, mode) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'ceil') return Math.ceil(x);
  return Math.round(x);
}

function rollVs(off, def, mode, ge, qround) {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;

  if (mode === 'float') {
    const a = randLegacyFloat(off / 4, off);
    const b = randLegacyFloat(def / 4, def);
    return ge ? a >= b : a > b;
  }

  // int mode (Legacy style with quarter rounding)
  const offLo = applyQuarterRound(off / 4, qround);
  const offHi = Math.floor(off);
  const defLo = applyQuarterRound(def / 4, qround);
  const defHi = Math.floor(def);

  const a = randLegacyInt(offLo, offHi);
  const b = randLegacyInt(defLo, defHi);
  return ge ? a >= b : a > b;
}

function rollDamage(min, max) {
  if (CFG.DMG_ROLL === 'roundfloat') return Math.round(randLegacyFloat(min, max));
  if (CFG.DMG_ROLL === 'float') return randLegacyFloat(min, max);
  return randLegacyInt(min, max);
}

function applyArmorAndRound(raw, armorFactor) {
  const x = raw * armorFactor;
  if (CFG.ARMOR_ROUND === 'floor') return Math.floor(x);
  if (CFG.ARMOR_ROUND === 'ceil') return Math.ceil(x);
  return Math.round(x);
}

// NOTE: This is the core armor scalar: damage' = damage * (M/(M+armor)), where M = level*K/2.
function armorFactorForArmorValue(level, armorValue) {
  const M = (level * CFG.ARMOR_K) / 2;
  return M / (M + armorValue);
}

// Hidden slot bonus (ported from your calibrated harness)
function applyHiddenRoleBonuses(role, st, w1SkillType, w2SkillType) {
  if (CFG.HIDDEN_PRESET === 'none') return;
  if (CFG.HIDDEN_PRESET !== 'slot3_prjdef') return;

  // +3% acc for defenders, +3 defSkill for attackers
  if (role === 'D') {
    st.acc = Math.round(st.acc * 1.03);
  } else if (role === 'A') {
    st.defSk += 3;
  }

  // Extra defender defSkill ONLY vs projectile weapons in each slot.
  // Skill types: 'gun' | 'melee' | 'proj'
  const dHasW1Proj = role === 'D' && w1SkillType === 'proj';
  const dHasW2Proj = role === 'D' && w2SkillType === 'proj';
  if (dHasW1Proj) st.defSk += 3;
  if (dHasW2Proj) st.defSk += 3;
}

// Apply hidden slot bonuses to numeric (acc, defSkill) using weapon skill indexes.
// Mirrors main-calib calibration logic for HIDDEN_PRESET=slot3_prjdef.
function applyHiddenRoleBonusesAccDef(role, acc, defSkill, w1SkillIdx, w2SkillIdx) {
  if (CFG.HIDDEN_PRESET === 'none') return { acc, defSkill };
  if (CFG.HIDDEN_PRESET !== 'slot3_prjdef') return { acc, defSkill };

  // Match main-calib behavior:
  // - attacker (A): +3 defSkill per weapon slot
  // - defender (D): +3 accuracy AND +3 defSkill per projectile-typed weapon slot
  const wCount = (w1SkillIdx !== null ? 1 : 0) + (w2SkillIdx !== null ? 1 : 0);
  const prjCount = (w1SkillIdx === 2 ? 1 : 0) + (w2SkillIdx === 2 ? 1 : 0);

  let a = acc;
  let d = defSkill;

  if (role === 'A') {
    d += 3 * wCount;
  } else if (role === 'D') {
    a += 3 * prjCount;
    d += 3 * prjCount;
  }

  return { acc: a, defSkill: d };
}

// returns { raw, dmg } where dmg is post-armor depending on CFG.ARMOR_APPLY
function attemptWeaponFast(att, def, w, shared) {
  if (!w) return { raw: 0, dmg: 0 };

  const hitOk =
    shared.sharedHitOk !== null
      ? shared.sharedHitOk
      : rollVs(att.acc, def.dodge, CFG.HIT_ROLL_MODE, CFG.HIT_GE, CFG.HIT_QROUND);

  if (!hitOk) return { raw: 0, dmg: 0 };

  // skill check
  const offSkill = w.skill === 0 ? att.gun : w.skill === 1 ? att.mel : att.prj;
  const defSkillAdj = w.skill === 2 ? def.defSk * CFG.PROJ_DEF_MULT : def.defSk;

  let skillOk;
  if (shared.sharedSkillMode === 'all') {
    skillOk =
      shared.sharedSkillOk !== null
        ? shared.sharedSkillOk
        : (shared.sharedSkillOk = rollVs(
            offSkill,
            defSkillAdj,
            CFG.SKILL_ROLL_MODE,
            CFG.SKILL_GE,
            CFG.SKILL_QROUND,
          ));
  } else if (shared.sharedSkillMode === 'same_type') {
    // shared only if both weapons are same type (caller sets sharedSkillCode)
    if (shared.sharedSkillCode !== null && shared.sharedSkillCode === w.skill) {
      skillOk =
        shared.sharedSkillOk !== null
          ? shared.sharedSkillOk
          : (shared.sharedSkillOk = rollVs(
              offSkill,
              defSkillAdj,
              CFG.SKILL_ROLL_MODE,
              CFG.SKILL_GE,
              CFG.SKILL_QROUND,
            ));
    } else {
      skillOk = rollVs(offSkill, defSkillAdj, CFG.SKILL_ROLL_MODE, CFG.SKILL_GE, CFG.SKILL_QROUND);
    }
  } else {
    // none
    skillOk = rollVs(offSkill, defSkillAdj, CFG.SKILL_ROLL_MODE, CFG.SKILL_GE, CFG.SKILL_QROUND);
  }

  if (!skillOk) return { raw: 0, dmg: 0 };

  // damage
  const baseVal =
    CFG.TACTICS_MODE === 'always' && CFG.DMG_BONUS_MODE === 'per_weapon' ? CFG.TACTICS_VAL : 0;
  const raw = rollDamage(w.min, w.max) + baseVal;

  if (CFG.ARMOR_APPLY === 'per_weapon') {
    return { raw, dmg: applyArmorAndRound(raw, def.armorFactor) };
  }
  return { raw, dmg: raw };
}

function doActionFast(att, def) {
  // shared hit
  const sharedHitOk = CFG.SHARED_HIT
    ? rollVs(att.acc, def.dodge, CFG.HIT_ROLL_MODE, CFG.HIT_GE, CFG.HIT_QROUND)
    : null;

  const shared = {
    sharedHitOk,
    sharedSkillMode: CFG.SHARED_SKILL,
    sharedSkillOk: null,
    sharedSkillCode: null,
  };

  if (CFG.SHARED_SKILL === 'same_type' && att.w1 && att.w2 && att.w1.skill === att.w2.skill) {
    shared.sharedSkillCode = att.w1.skill;
  }

  const r1 = attemptWeaponFast(att, def, att.w1, shared);
  const r2 = attemptWeaponFast(att, def, att.w2, shared);

  let dmg;
  if (CFG.ARMOR_APPLY === 'per_weapon') {
    dmg = r1.dmg + r2.dmg;
  } else {
    const sumRaw = r1.raw + r2.raw;
    dmg = sumRaw > 0 ? applyArmorAndRound(sumRaw, def.armorFactor) : 0;
  }

  // tactics / base bonus per-action (added post-armor, matches harness behavior)
  if (CFG.TACTICS_MODE === 'always' && CFG.DMG_BONUS_MODE === 'per_action') {
    dmg += CFG.TACTICS_VAL;
  }

  return dmg;
}

function fightOnceWikiFast(p1, p2, maxTurns) {
  // speed ordering (p1First means: p1 acts first)
  let p1First = false;
  if (p1.speed > p2.speed) p1First = true;
  else if (p1.speed < p2.speed) p1First = false;
  else {
    // tie
    if (CFG.SPEED_TIE_MODE === 'random') p1First = RNG() < 0.5;
    else if (CFG.SPEED_TIE_MODE === 'attacker') p1First = true;
    else if (CFG.SPEED_TIE_MODE === 'defender') p1First = false;
    else p1First = true;
  }

  let hp1 = p1.hp;
  let hp2 = p2.hp;

  let turns = 0;
  while (hp1 > 0 && hp2 > 0 && turns < maxTurns) {
    turns++;

    if (p1First) {
      // p1 -> p2
      hp2 -= doActionFast(p1, p2);
      if (hp2 <= 0) break;
      // p2 -> p1
      hp1 -= doActionFast(p2, p1);
    } else {
      // p2 -> p1
      hp1 -= doActionFast(p2, p1);
      if (hp1 <= 0) break;
      // p1 -> p2
      hp2 -= doActionFast(p1, p2);
    }
  }

  // Determine winner from p1 perspective (1 = p1 wins)
  let win;
  if (hp1 > 0 && hp2 <= 0) win = 1;
  else if (hp2 > 0 && hp1 <= 0) win = 0;
  else if (hp1 > hp2) win = 1;
  else if (hp2 > hp1) win = 0;
  else win = p1First ? 1 : 0; // exact tie => first actor wins (matches wiki tiebreak behavior)

  // pack: win in high 16, turns in low 16
  return (win << 16) | (turns & 0xffff);
}

// Run N fights and return [wins, turnsSum] packed for speed (matches older brute harness).
function runMatchPacked(p1, p2, trials, maxTurns) {
  let wins = 0;
  let turnsSum = 0;
  for (let i = 0; i < trials; i++) {
    const packed = fightOnceWikiFast(p1, p2, maxTurns);
    wins += packed >>> 16;
    turnsSum += packed & 0xffff;
  }
  return [wins, turnsSum];
}

function mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx) {
  if (w1SkillIdx === null || w2SkillIdx === null) return [1, 1];
  return w1SkillIdx === w2SkillIdx ? [1, 1] : [2, 2];
}

// =====================
// CRYSTALS + UPGRADES + ITEMS
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

const UpgradeDefs = {
  'Faster Reload 4': { pct: { accuracy: 0.05, damage: 0.05 } },
  'Enhanced Scope 4': { pct: { accuracy: 0.1 } },
  'Faster Ammo 4': { pct: { damage: 0.2 } },
  'Tracer Rounds 4': { pct: { accuracy: 0.15, damage: 0.05 } },
  'Laser Sight': { pct: { accuracy: 0.14 } },
  'Poisoned Tip': { pct: { damage: 0.1 } },
};

const ItemDefs = {
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
    flatStats: { speed: 70, accuracy: 48, projSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 10, max: 125 },
    upgradeSlots: [['Laser Sight', 'Poisoned Tip']],
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

  'Bio Gun Mk4': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { accuracy: 47, speed: 50, defSkill: 15, gunSkill: 42 },
    baseWeaponDamage: { min: 76, max: 91 },
    upgradeSlots: [
      ['Faster Reload 4', 'Enhanced Scope 4'],
      ['Faster Ammo 4', 'Tracer Rounds 4'],
    ],
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

// Apply "game-data" overrides (helps match in-game ranges you measured).
// You can disable with LEGACY_CALIB_PATCHES=0 or override the values directly via env.
(function applyItemOverrides() {
  if (!CFG.CALIB_PATCHES) return;
  try {
    if (ItemDefs['Hellforged Armor'] && CFG.HF_ARMOR_BASE_OVERRIDE) {
      ItemDefs['Hellforged Armor'].flatStats.armor = CFG.HF_ARMOR_BASE_OVERRIDE;
    }
    if (ItemDefs['Void Sword'] && CFG.VOID_SWORD_BASE_MAX_OVERRIDE) {
      ItemDefs['Void Sword'].baseWeaponDamage.max = CFG.VOID_SWORD_BASE_MAX_OVERRIDE;
    }
  } catch (e) {
    // ignore; never fail startup due to overrides
  }
})();

// =====================
// ATTACKER PRESETS (for --verify)
// =====================
const ATTACKER_PRESETS = {
  MAUL_CSTAFF: {
    stats: { level: 80, hp: 600, speed: 60, dodge: 67, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
    misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
  },

  // Calibration presets (max HP: 865 => base acc/dodge 14/14)
  BOMBS_RIFT_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  BOMBS_BOMBS_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  RIFT_BOMBS_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    // Swapped weapon order vs BOMBS_RIFT_MAXHP:
    weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  // Explicit alias so the intent is obvious in shell commands.
  RIFT_BOMBS_MAXHP_SWAP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
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
  'DL Gun Build 3.1': {
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
  // 'Dual Rifts': {
  //   stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
  //   armor: {
  //     name: 'Dark Legion Armor',
  //     upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
  //   },
  //   weapon1: {
  //     name: 'Rift Gun',
  //     upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
  //   },
  //   weapon2: {
  //     name: 'Rift Gun',
  //     upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
  //   },
  //   misc1: {
  //     name: 'Bio Spinal Enhancer',
  //     upgrades: [
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //     ],
  //   },
  //   misc2: {
  //     name: 'Bio Spinal Enhancer',
  //     upgrades: [
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //       'Perfect Pink Crystal',
  //     ],
  //   },
  // },
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
  'T2 Scythe/Cstaff': {
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
  'DL Gun Build 5': {
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
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
  },

  'DL Gun Build 6': {
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

  'DL Gun Build 8': {
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

  'Dual Bow Build': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: {
      name: 'Dark Legion Armor',
      upgrades: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
    },
    weapon1: {
      name: 'Void Bow',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Void Bow',
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

  'Bow/rift build': {
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
      name: 'Void Bow',
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

  'Armour stack Cores': {
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
      name: 'Core Staff',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    weapon2: {
      name: 'Core Staff',
      upgrades: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
    },
    misc1: {
      name: 'Scout Drones',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
    misc2: {
      name: 'Scout Drones',
      upgrades: [
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
        'Perfect Pink Crystal',
      ],
    },
  },
};

const DEFENDER_PRIORITY = [
  'DL Gun Build 3',
  'SG1 Split bombs',
  'T2 Scythe/Cstaff',
  'DL Gun Build 4',
  'DL Gun Build 2',
  'DL Gun Build 7',
  'Core/Void Build 1',
  'T2 Scythe Build',
  'HF Core/Void',
  // 'Dual Rifts',
  'DL Gun Build 3.1',
];

const defendersRaw = String(
  process.env.LEGACY_BRUTE_DEFENDERS || process.env.LEGACY_DEFENDERS || '',
).trim();
const defenderNames = defendersRaw ? parseCsvList(defendersRaw) : DEFENDER_PRIORITY;

const defenderBuilds = defenderNames.map((nameRaw) => {
  const name = normalizeDefenderName(nameRaw);
  const p = DEFENDER_PAYLOADS[name];
  if (!p)
    throw new Error(`Missing DEFENDER_PAYLOADS entry for "${nameRaw}" (normalized="${name}")`);
  return { name, payload: p };
});

// =====================
// LOCK_ONLY_AMULET (weapons-only)
// =====================
function parseLockOnlyAmuletFromEnv() {
  const raw = String(process.env.LEGACY_LOCK_ONLY_AMULET || '').trim();
  if (!raw) return new Set(['Core Staff', 'Rift Gun', 'Split Crystal Bombs T2', 'Void Axe']);
  return new Set(parseCsvList(raw));
}
const LOCK_ONLY_AMULET = parseLockOnlyAmuletFromEnv();

// =====================
// CRYSTAL CONSTRAINTS
// =====================
function allowedCrystalsForArmor(itemName) {
  if (itemName === 'Dark Legion Armor') return ['Abyss Crystal'];
  if (itemName === 'SG1 Armor') return ['Perfect Pink Crystal', 'Abyss Crystal'];
  if (itemName === 'Hellforged Armor') return ['Cabrusion Crystal', 'Abyss Crystal'];
  return ['Abyss Crystal'];
}
function allowedCrystalsForWeapon(itemName) {
  if (LOCK_ONLY_AMULET.has(itemName)) return ['Amulet Crystal'];
  return ['Amulet Crystal', 'Perfect Fire Crystal'];
}
function upgradeSlotsForWeapon(itemName) {
  const idef = ItemDefs[itemName];
  const slots = (idef && idef.upgradeSlots) || null;
  return Array.isArray(slots) ? slots : null;
}
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
function miscVariantAllowedForWeaponMask(mv, weaponMask) {
  const isBio = mv.itemName === 'Bio Spinal Enhancer';

  if (mv.crystalName === 'Amulet Crystal') return !isBio;

  if (mv.crystalName === 'Perfect Pink Crystal') return !!mv.__misc && !!mv.__misc.hasDef;

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
// WARM-START SEED BUILD
// =====================
const WARM_START_BUILD = {
  armor: { item: 'Dark Legion Armor', crystal: 'Abyss Crystal' },
  weapon1: { item: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
  weapon2: { item: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
  misc1: { item: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
  misc2: { item: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
};

function warmStartEnabled() {
  const raw = String(process.env.LEGACY_WARM_START ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no');
}
function parseWarmStartTrials(defaultTrialsConfirm) {
  const raw = String(process.env.LEGACY_WARM_START_TRIALS ?? '').trim();
  if (!raw) return defaultTrialsConfirm;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultTrialsConfirm;
}

// =====================
// WATCH BUILD
// =====================
const WATCH_BUILD = {
  armor: { item: 'Dark Legion Armor', crystal: 'Abyss Crystal' },
  weapon1: { item: 'Core Staff', crystal: 'Amulet Crystal' },
  weapon2: { item: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal' },
  misc1: { item: 'Scout Drones', crystal: 'Amulet Crystal' },
  misc2: { item: 'Scout Drones', crystal: 'Amulet Crystal' },
};

function checkWatchBuildReachable(pools) {
  const reasons = [];
  function inPool(kind, item) {
    const arr = kind === 'armor' ? pools.armors : kind === 'weapon' ? pools.weapons : pools.miscs;
    return arr.includes(item);
  }

  if (!inPool('armor', WATCH_BUILD.armor.item))
    reasons.push(`Armor "${WATCH_BUILD.armor.item}" is not in pool`);
  if (!inPool('weapon', WATCH_BUILD.weapon1.item))
    reasons.push(`Weapon "${WATCH_BUILD.weapon1.item}" is not in pool`);
  if (!inPool('weapon', WATCH_BUILD.weapon2.item))
    reasons.push(`Weapon "${WATCH_BUILD.weapon2.item}" is not in pool`);
  if (!inPool('misc', WATCH_BUILD.misc1.item))
    reasons.push(`Misc "${WATCH_BUILD.misc1.item}" is not in pool`);
  if (!inPool('misc', WATCH_BUILD.misc2.item))
    reasons.push(`Misc "${WATCH_BUILD.misc2.item}" is not in pool`);

  const aOk = allowedCrystalsForArmor(WATCH_BUILD.armor.item).includes(WATCH_BUILD.armor.crystal);
  if (!aOk)
    reasons.push(
      `Armor "${WATCH_BUILD.armor.item}" does not allow crystal "${WATCH_BUILD.armor.crystal}"`,
    );

  const w1Ok = allowedCrystalsForWeapon(WATCH_BUILD.weapon1.item).includes(
    WATCH_BUILD.weapon1.crystal,
  );
  if (!w1Ok)
    reasons.push(
      `Weapon "${WATCH_BUILD.weapon1.item}" does not allow crystal "${WATCH_BUILD.weapon1.crystal}"`,
    );

  const w2Ok = allowedCrystalsForWeapon(WATCH_BUILD.weapon2.item).includes(
    WATCH_BUILD.weapon2.crystal,
  );
  if (!w2Ok)
    reasons.push(
      `Weapon "${WATCH_BUILD.weapon2.item}" does not allow crystal "${WATCH_BUILD.weapon2.crystal}"`,
    );

  const m1Ok = allowedCrystalsForMiscSuperset(WATCH_BUILD.misc1.item).includes(
    WATCH_BUILD.misc1.crystal,
  );
  if (!m1Ok)
    reasons.push(
      `Misc "${WATCH_BUILD.misc1.item}" does not allow crystal "${WATCH_BUILD.misc1.crystal}"`,
    );

  const m2Ok = allowedCrystalsForMiscSuperset(WATCH_BUILD.misc2.item).includes(
    WATCH_BUILD.misc2.crystal,
  );
  if (!m2Ok)
    reasons.push(
      `Misc "${WATCH_BUILD.misc2.item}" does not allow crystal "${WATCH_BUILD.misc2.crystal}"`,
    );

  return { reachable: reasons.length === 0, reasons };
}

function isWatchBuildCandidate(av, w1v, w2v, m1v, m2v) {
  if (av.itemName !== WATCH_BUILD.armor.item || av.crystalName !== WATCH_BUILD.armor.crystal)
    return false;

  const wA = `${w1v.itemName}|${w1v.crystalName}`;
  const wB = `${w2v.itemName}|${w2v.crystalName}`;
  const wantW1 = `${WATCH_BUILD.weapon1.item}|${WATCH_BUILD.weapon1.crystal}`;
  const wantW2 = `${WATCH_BUILD.weapon2.item}|${WATCH_BUILD.weapon2.crystal}`;
  const weaponsOk = (wA === wantW1 && wB === wantW2) || (wA === wantW2 && wB === wantW1);
  if (!weaponsOk) return false;

  const mA = `${m1v.itemName}|${m1v.crystalName}`;
  const mB = `${m2v.itemName}|${m2v.crystalName}`;
  const wantM = `${WATCH_BUILD.misc1.item}|${WATCH_BUILD.misc1.crystal}`;
  return mA === wantM && mB === wantM;
}

// =====================
// VARIANT COMPUTE (numbers only) + UPGRADES
// =====================
function computeVariant(itemName, crystalName, upgrades = []) {
  const idef = ItemDefs[itemName];
  const cdef = CrystalDefs[crystalName];
  if (!idef) throw new Error(`Unknown item: ${itemName}`);
  if (!cdef) throw new Error(`Unknown crystal: ${crystalName}`);

  const pct = cdef.pct || {};
  const pctSum = {};

  for (const k of Object.keys(pct)) {
    let v = (pct[k] || 0) * 4;
    if (
      idef.type === 'Misc' &&
      CFG.MISC_NO_CRYSTAL_SKILL &&
      itemName === CFG.MISC_NO_CRYSTAL_SKILL
    ) {
      if (k === 'gunSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.gun !== undefined)
        v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.gun;
      if (k === 'meleeSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.melee !== undefined)
        v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.melee;
      if (k === 'projSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.proj !== undefined)
        v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.proj;
      if (k === 'defSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.def !== undefined)
        v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.def;
    }
    pctSum[k] = v;
  }

  if (upgrades && upgrades.length) {
    for (const u of upgrades) {
      if (!u || u === 'None') continue;
      const udef = UpgradeDefs[u];
      if (!udef) throw new Error(`Unknown upgrade "${u}" on item "${itemName}"`);
      const up = udef.pct || {};

      for (const k of Object.keys(up)) {
        let v = up[k] || 0;
        if (
          idef.type === 'Misc' &&
          CFG.MISC_NO_CRYSTAL_SKILL &&
          itemName === CFG.MISC_NO_CRYSTAL_SKILL
        ) {
          if (k === 'gunSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.gun !== undefined)
            v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.gun;
          if (k === 'meleeSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.melee !== undefined)
            v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.melee;
          if (k === 'projSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.proj !== undefined)
            v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.proj;
          if (k === 'defSkill' && CFG.MISC_NO_CRYSTAL_SKILL_TYPES.def !== undefined)
            v *= CFG.MISC_NO_CRYSTAL_SKILL_TYPES.def;
        }
        pctSum[k] = (pctSum[k] || 0) + v;
      }
    }
  }

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
  let weaponMaskBit = 0;
  if (idef.baseWeaponDamage) {
    const dmgPctSum = pctSum.damage || 0;
    const min = Math.ceil(idef.baseWeaponDamage.min * (1 + dmgPctSum));
    const max = Math.ceil(idef.baseWeaponDamage.max * (1 + dmgPctSum));
    const skill = idef.skillType === 'gunSkill' ? 0 : idef.skillType === 'meleeSkill' ? 1 : 2;
    weapon = { name: itemName, min, max, skill };
    weaponMaskBit = skill === 0 ? 0b001 : skill === 1 ? 0b010 : 0b100;
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

  const u1 = upgrades && upgrades[0] ? upgrades[0] : null;
  const u2 = upgrades && upgrades[1] ? upgrades[1] : null;

  return {
    itemName,
    crystalName,
    upgrade1: u1,
    upgrade2: u2,
    upgrades: [u1, u2].filter(Boolean),

    addSpeed,
    addAcc,
    addDod,
    addGun,
    addMel,
    addPrj,
    addDef,
    addArmStat,
    weapon,
    weaponMaskBit,
    __misc: miscMeta,
  };
}

function variantKey(itemName, crystalName, upgrade1, upgrade2) {
  const u1 = upgrade1 || '';
  const u2 = upgrade2 || '';
  return `${itemName}|${crystalName}|${u1}|${u2}`;
}

function buildVariantsForArmors(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForArmor(nm);
    for (const c of crystals) {
      const key = variantKey(nm, c, '', '');
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c, []);
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function* iterateWeaponUpgradeCombos(itemName) {
  const slots = upgradeSlotsForWeapon(itemName);
  if (!slots || !slots.length) {
    yield [];
    return;
  }
  if (slots.length === 1) {
    for (const a of slots[0]) yield [a];
    return;
  }
  if (slots.length === 2) {
    for (const a of slots[0]) for (const b of slots[1]) yield [a, b];
    return;
  }
  function* rec(idx, acc) {
    if (idx >= slots.length) {
      yield acc.slice();
      return;
    }
    for (const opt of slots[idx]) {
      acc[idx] = opt;
      yield* rec(idx + 1, acc);
    }
  }
  yield* rec(0, new Array(slots.length));
}

function buildVariantsForWeapons(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForWeapon(nm);
    for (const c of crystals) {
      for (const ups of iterateWeaponUpgradeCombos(nm)) {
        const u1 = ups[0] || '';
        const u2 = ups[1] || '';
        const key = variantKey(nm, c, u1, u2);
        let v = cache.get(key);
        if (!v) {
          v = computeVariant(nm, c, ups);
          cache.set(key, v);
        }
        out.push(v);
      }
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
      const key = variantKey(nm, c, '', '');
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c, []);
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

function buildMiscPairsOrderlessAllDup(miscVariants) {
  const pairsA = [];
  for (let i = 0; i < miscVariants.length; i++) {
    for (let j = i; j < miscVariants.length; j++) pairsA.push(i, j);
  }
  return new Uint16Array(pairsA);
}

// =====================
// EFFECTIVE-SPACE PRECOMPUTE
// =====================
const MASKS = [0b001, 0b010, 0b100, 0b001 | 0b010, 0b001 | 0b100, 0b010 | 0b100];

function buildAllowedMiscTable(miscVariants) {
  const allow = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) {
    const m = MASKS[mi];
    const a = new Uint8Array(miscVariants.length);
    for (let i = 0; i < miscVariants.length; i++) {
      a[i] = miscVariantAllowedForWeaponMask(miscVariants[i], m) ? 1 : 0;
    }
    allow[mi] = a;
  }
  return { masks: MASKS, allow };
}

function buildMiscPairsAllowedByMask(miscPairs, miscAllowTable) {
  const { allow } = miscAllowTable;
  const out = new Array(MASKS.length);

  for (let mi = 0; mi < MASKS.length; mi++) {
    const a = allow[mi];
    const tmp = [];
    for (let p = 0; p < miscPairs.length; p += 2) {
      const i = miscPairs[p];
      const j = miscPairs[p + 1];
      if (a[i] && a[j]) tmp.push(i, j);
    }
    out[mi] = new Uint16Array(tmp);
  }
  return out;
}

function buildWeaponPairIndicesByMask(weaponVariants, weaponPairs) {
  const buckets = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) buckets[mi] = [];

  for (let p = 0, wpi = 0; p < weaponPairs.length; p += 2, wpi++) {
    const w1 = weaponVariants[weaponPairs[p]];
    const w2 = weaponVariants[weaponPairs[p + 1]];
    const mask = w1.weaponMaskBit | w2.weaponMaskBit | 0;

    let maskIdx = -1;
    for (let mi = 0; mi < MASKS.length; mi++) {
      if (MASKS[mi] === mask) {
        maskIdx = mi;
        break;
      }
    }
    if (maskIdx >= 0) buckets[maskIdx].push(wpi);
  }

  const out = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) out[mi] = new Uint32Array(buckets[mi]);
  return out;
}

function computeEffectiveCounts(armorVariants, weaponPairIndicesByMask, miscPairsAllowedByMask) {
  const AV = armorVariants.length;
  let effPerArmor = 0;
  const breakdown = [];

  for (let mi = 0; mi < MASKS.length; mi++) {
    const wpCount = weaponPairIndicesByMask[mi].length;
    const mpCount = miscPairsAllowedByMask[mi].length / 2;
    const contrib = wpCount * mpCount;
    effPerArmor += contrib;
    breakdown.push({ mask: MASKS[mi], wpCount, mpKept: mpCount, contrib });
  }

  return { AV, effPerArmor, effTotal: AV * effPerArmor, breakdown };
}

// Precompute bucket sizes to speed decodeEffectiveIndex (minor win)
function buildMaskBuckets(weaponPairIndicesByMask, miscPairsAllowedByMask) {
  const bucket = new Uint32Array(MASKS.length);
  const mpCount = new Uint32Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) {
    const wpCount = weaponPairIndicesByMask[mi].length;
    const mpc = (miscPairsAllowedByMask[mi].length / 2) | 0;
    mpCount[mi] = mpc;
    bucket[mi] = (wpCount * mpc) >>> 0;
  }
  return { bucket, mpCount };
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

  const armorV = variantCacheLocal.get(variantKey(p.armor.name, p.armor.upgrades[0], '', ''));
  const w1V = variantCacheLocal.get(variantKey(p.weapon1.name, p.weapon1.upgrades[0], '', ''));
  const w2V = variantCacheLocal.get(variantKey(p.weapon2.name, p.weapon2.upgrades[0], '', ''));
  const m1V = variantCacheLocal.get(variantKey(p.misc1.name, p.misc1.upgrades[0], '', ''));
  const m2V = variantCacheLocal.get(variantKey(p.misc2.name, p.misc2.upgrades[0], '', ''));
  if (!armorV || !w1V || !w2V || !m1V || !m2V)
    throw new Error(`Missing variant cache entries for defender ${def.name}`);

  const baseSpeed = Math.floor(Number(st.speed));
  const baseAcc = Math.floor(Number(st.accuracy));
  const baseDod = Math.floor(Number(st.dodge));
  const hp = Math.floor(Number(st.hp));
  const level = Math.floor(Number(st.level));

  const speed =
    baseSpeed + armorV.addSpeed + w1V.addSpeed + w2V.addSpeed + m1V.addSpeed + m2V.addSpeed;
  let acc = baseAcc + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1V.addAcc + m2V.addAcc;
  const dodge = baseDod + armorV.addDod + w1V.addDod + w2V.addDod + m1V.addDod + m2V.addDod;

  const w1SkillIdx = w1V.weapon ? w1V.weapon.skill : null;
  const w2SkillIdx = w2V.weapon ? w2V.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  // IMPORTANT: mixed bonus applies ONLY to each weapon's OWN offensive skill contribution.
  // (Not to armor/misc skill, not to defSkill, not to speed/acc/dodge.)
  const w1Gun = w1V.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2V.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1V.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2V.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1V.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2V.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + armorV.addGun + w1Gun + w2Gun + m1V.addGun + m2V.addGun;
  const mel = BASE.meleeSkill + armorV.addMel + w1Mel + w2Mel + m1V.addMel + m2V.addMel;
  const prj = BASE.projSkill + armorV.addPrj + w1Prj + w2Prj + m1V.addPrj + m2V.addPrj;

  let defSk = BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1V.addDef + m2V.addDef;

  const armor = BASE.armor + armorV.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor);
  // Hidden bonuses (if enabled)
  ({ acc, defSkill: defSk } = applyHiddenRoleBonusesAccDef(
    'D',
    acc,
    defSk,
    w1SkillIdx,
    w2SkillIdx,
  ));

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

  let acc =
    BASE.accuracy + av.addAcc + w1v.addAcc + w2v.addAcc + m1v.addAcc + m2v.addAcc + plan.extraAcc;

  const dodge =
    BASE.dodge + av.addDod + w1v.addDod + w2v.addDod + m1v.addDod + m2v.addDod + plan.extraDodge;

  const w1SkillIdx = w1v.weapon ? w1v.weapon.skill : null;
  const w2SkillIdx = w2v.weapon ? w2v.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  // IMPORTANT: mixed bonus applies ONLY to each weapon's OWN offensive skill contribution.
  const w1Gun = w1v.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2v.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1v.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2v.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1v.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2v.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + av.addGun + w1Gun + w2Gun + m1v.addGun + m2v.addGun;
  const mel = BASE.meleeSkill + av.addMel + w1Mel + w2Mel + m1v.addMel + m2v.addMel;
  const prj = BASE.projSkill + av.addPrj + w1Prj + w2Prj + m1v.addPrj + m2v.addPrj;

  let defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;

  const armor = BASE.armor + av.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor);
  // Hidden bonuses (if enabled)
  ({ acc, defSkill: defSk } = applyHiddenRoleBonusesAccDef(
    'A',
    acc,
    defSk,
    w1SkillIdx,
    w2SkillIdx,
  ));

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

function formatWeaponShort(wv) {
  const u1 = shortUpgrade(wv.upgrade1);
  const u2 = shortUpgrade(wv.upgrade2);
  const u = [u1, u2].filter(Boolean).join('+');
  return u
    ? `${shortItem(wv.itemName)}[${shortCrystal(wv.crystalName)}]{${u}}`
    : `${shortItem(wv.itemName)}[${shortCrystal(wv.crystalName)}]`;
}

function buildLabel(plan, av, w1v, w2v, m1v, m2v) {
  return (
    `HP${plan.hp} A${plan.extraAcc} D${plan.extraDodge} | ` +
    `${shortItem(av.itemName)}[${shortCrystal(av.crystalName)}] ` +
    `${formatWeaponShort(w1v)}+${formatWeaponShort(w2v)} ` +
    `${shortItem(m1v.itemName)}[${shortCrystal(m1v.crystalName)}]+${shortItem(m2v.itemName)}[${shortCrystal(m2v.crystalName)}]`
  );
}

function buildSpec(av, w1v, w2v, m1v, m2v, plan) {
  return {
    plan: {
      hp: plan.hp,
      extraAcc: plan.extraAcc,
      extraDodge: plan.extraDodge,
      freePoints: plan.freePoints,
    },
    armor: { item: av.itemName, crystal: av.crystalName },
    weapon1: {
      item: w1v.itemName,
      crystal: w1v.crystalName,
      u1: w1v.upgrade1 || '',
      u2: w1v.upgrade2 || '',
    },
    weapon2: {
      item: w2v.itemName,
      crystal: w2v.crystalName,
      u1: w2v.upgrade1 || '',
      u2: w2v.upgrade2 || '',
    },
    misc1: { item: m1v.itemName, crystal: m1v.crystalName },
    misc2: { item: m2v.itemName, crystal: m2v.crystalName },
  };
}

// =====================
// STAGED EVALUATION (with Gatekeepers)
// Returns:
//  - confirmed avg/worst if not bailed
//  - screenAvgWin/screenWorstWin if Stage A ran (even if bailed)
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

  // Gatekeeper stage
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
            screenAvgWin: 0,
            screenAvgEx: 0,
            screenWorstWin: null,
            screenWorstName: '',
            screenSampled: 0,
          };
        }
      }
    }
  }

  // If Stage A is disabled, skip straight to Stage B
  if (!trialsScreen || trialsScreen <= 0) {
    const screenAvgWin = 0;
    const screenAvgEx = 0;

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
          return {
            avgWin: -1,
            avgEx: 0,
            worstWin,
            worstName,
            bailed: true,
            stage: 'B',
            screenAvgWin,
            screenAvgEx,
            screenWorstWin: null,
            screenWorstName: '',
            screenSampled: 0,
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
      stage: 'B',
      screenAvgWin,
      screenAvgEx,
      screenWorstWin: null,
      screenWorstName: '',
      screenSampled: 0,
    };
  }

  // Stage A (screen)
  let worstA = 101;
  let worstNameA = '';
  let sumWinA = 0;
  let sumExA = 0;

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) setDetRng(i, stageTagA);

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsScreen, maxTurns);
    const winPct = (wins / trialsScreen) * 100;
    const avgEx = exSum / trialsScreen;

    sumWinA += winPct;
    sumExA += avgEx;

    if (winPct < worstA) {
      worstA = winPct;
      worstNameA = D.name;

      if (floorWorst !== null && worstA + 1e-9 < floorWorst - bailMargin) {
        const sampled = i + 1;
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin: worstA,
          worstName: worstNameA,
          bailed: true,
          stage: 'A',
          // FIX: use sampled defenders, not defenders.length
          screenAvgWin: sumWinA / sampled,
          screenAvgEx: sumExA / sampled,
          screenWorstWin: worstA,
          screenWorstName: worstNameA,
          screenSampled: sampled,
        };
      }
    }
  }

  const screenAvgWin = sumWinA / defenders.length;
  const screenAvgEx = sumExA / defenders.length;

  // Stage B (confirm)
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
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin,
          worstName,
          bailed: true,
          stage: 'B',
          screenAvgWin,
          screenAvgEx,
          screenWorstWin: worstA,
          screenWorstName: worstNameA,
          screenSampled: defenders.length,
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
    stage: 'B',
    screenAvgWin,
    screenAvgEx,
    screenWorstWin: worstA,
    screenWorstName: worstNameA,
    screenSampled: defenders.length,
  };
}

// =====================
// SEARCH-SPACE SANITY
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

function estimateEffectiveCounts(
  armorVariants,
  weaponVariants,
  weaponPairs,
  miscVariants,
  miscPairs,
) {
  const AV = armorVariants.length;
  const WV = weaponVariants.length;
  const MV = miscVariants.length;
  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowed = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIdxByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);

  const eff = computeEffectiveCounts(armorVariants, weaponPairIdxByMask, miscPairsAllowed);

  return {
    AV,
    WV,
    MV,
    WP,
    MP,
    effPerArmor: eff.effPerArmor,
    effTotal: eff.effTotal,
    breakdown: eff.breakdown,
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

  console.log('Per-item variant counts (by item + allowed crystals + upgrades):');
  for (const a of pools.armors) {
    const cs = allowedCrystalsForArmor(a);
    console.log(`  Armor  ${padRight(a, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  for (const w of pools.weapons) {
    const cs = allowedCrystalsForWeapon(w);
    const slots = upgradeSlotsForWeapon(w);
    let upCount = 1;
    if (slots && slots.length) upCount = slots.reduce((acc, arr) => acc * (arr.length || 1), 1);
    console.log(
      `  Weapon ${padRight(w, 24)} -> ${cs.map(shortCrystal).join('')} * upgrades(${upCount})  (${cs.length * upCount})`,
    );
  }
  for (const m of pools.miscs) {
    const cs = allowedCrystalsForMiscSuperset(m);
    console.log(`  Misc   ${padRight(m, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  console.log('');

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
// CATALOG HELPERS
// =====================
function parseCatalogTopN() {
  const n = parseInt(process.env.LEGACY_CATALOG_TOP_N || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}
function parseCatalogMargin() {
  const x = parseFloat(process.env.LEGACY_CATALOG_MARGIN || '');
  return Number.isFinite(x) && x >= 0 ? x : 12.0;
}
function parseCatalogConfirmTrials(TRIALS_CONFIRM) {
  const n = parseInt(process.env.LEGACY_CATALOG_CONFIRM_TRIALS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : TRIALS_CONFIRM;
}

// Ranking metric for catalog (screen-only):
// prefer higher screenWorst, then screenAvg.
function isBetterScreen(a, b) {
  if (!b) return true;
  if (a.screenWorstWin !== b.screenWorstWin) return a.screenWorstWin > b.screenWorstWin;
  return a.screenAvgWin > b.screenAvgWin;
}
function pushCatalogTop(lb, entry, keepN) {
  lb.push(entry);
  lb.sort((a, b) => b.screenWorstWin - a.screenWorstWin || b.screenAvgWin - a.screenAvgWin);
  if (lb.length > keepN) lb.length = keepN;
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
    sharedBuf,
    pools,
    debugMixed,
    debugMixedN,
    watchEnabled,
    useSuperset,
    catalogTopN,
    catalogMargin,
  } = workerData;

  const sharedI32 = sharedBuf ? new Int32Array(sharedBuf) : null;

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
  function getV(itemName, crystalName, upgrade1 = '', upgrade2 = '') {
    const key = variantKey(itemName, crystalName, upgrade1, upgrade2);
    let v = localCache.get(key);
    if (!v) {
      const ups = [];
      if (upgrade1) ups.push(upgrade1);
      if (upgrade2) ups.push(upgrade2);
      v = computeVariant(itemName, crystalName, ups);
      localCache.set(key, v);
    }
    return v;
  }

  // Build variants
  const armorVariants = [];
  for (const nm of armorChoices)
    for (const c of allowedCrystalsForArmor(nm)) armorVariants.push(getV(nm, c));

  const weaponVariants = [];
  for (const nm of weapons) {
    for (const c of allowedCrystalsForWeapon(nm)) {
      for (const ups of iterateWeaponUpgradeCombos(nm)) {
        const u1 = ups[0] || '';
        const u2 = ups[1] || '';
        weaponVariants.push(getV(nm, c, u1, u2));
      }
    }
  }

  const miscVariants = [];
  for (const nm of miscChoices)
    for (const c of allowedCrystalsForMiscSuperset(nm)) miscVariants.push(getV(nm, c));

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowedByMask = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIndicesByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);
  const effCounts = computeEffectiveCounts(
    armorVariants,
    weaponPairIndicesByMask,
    miscPairsAllowedByMask,
  );
  const maskBuckets = buildMaskBuckets(weaponPairIndicesByMask, miscPairsAllowedByMask);

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
  const bestByTypeByHp = Object.create(null);

  // Catalog collections (screen-only during run; confirmed later in main)
  const catalogTopByHp = Object.create(null); // array of entries
  const catalogBestTypeByHp = Object.create(null); // wpTag -> entry

  const t0 = nowMs();
  let lastProgress = t0;
  let processed = 0;

  const detBaseSeed = (Number(rngSeed) || 0) >>> 0;
  let debugPrinted = 0;

  function decodeSupersetIndex(globalIdx) {
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

    const mpBase = mpi * 2;
    const m1v = miscVariants[miscPairs[mpBase]];
    const m2v = miscVariants[miscPairs[mpBase + 1]];

    const weaponMask = w1v.weaponMaskBit | w2v.weaponMaskBit | 0;
    return { plan, av, w1v, w2v, m1v, m2v, weaponMask };
  }

  function decodeEffectiveIndex(eIdx) {
    const plan = plans[0];

    const perArmor = effCounts.effPerArmor;
    const ai = Math.floor(eIdx / perArmor);
    let r = eIdx - ai * perArmor;

    // find bucket (only 6 masks; keep linear but using precomputed sizes)
    let maskIdx = 0;
    while (maskIdx < MASKS.length) {
      const b = maskBuckets.bucket[maskIdx];
      if (r < b) break;
      r -= b;
      maskIdx++;
    }
    if (maskIdx >= MASKS.length) maskIdx = MASKS.length - 1;

    const wpList = weaponPairIndicesByMask[maskIdx];
    const mpList = miscPairsAllowedByMask[maskIdx];
    const mpCount = maskBuckets.mpCount[maskIdx];

    const localWpIdx = Math.floor(r / mpCount);
    const localMpIdx = r - localWpIdx * mpCount;

    const wpi = wpList[localWpIdx];
    const wpBase = (wpi * 2) | 0;
    const w1v = weaponVariants[weaponPairs[wpBase]];
    const w2v = weaponVariants[weaponPairs[wpBase + 1]];

    const mpBase = (localMpIdx * 2) | 0;
    const m1v = miscVariants[mpList[mpBase]];
    const m2v = miscVariants[mpList[mpBase + 1]];

    const av = armorVariants[ai];
    const weaponMask = w1v.weaponMaskBit | w2v.weaponMaskBit | 0;
    return { plan, av, w1v, w2v, m1v, m2v, weaponMask };
  }

  for (let idx = startIndex; idx < endIndex; idx++) {
    processed++;

    const dec = useSuperset ? decodeSupersetIndex(idx) : decodeEffectiveIndex(idx);
    const plan = dec.plan;
    const av = dec.av;
    const w1v = dec.w1v;
    const w2v = dec.w2v;
    const m1v = dec.m1v;
    const m2v = dec.m2v;
    const weaponMask = dec.weaponMask;

    if (watchEnabled && sharedI32) {
      if (Atomics.load(sharedI32, 1) === 0) {
        if (isWatchBuildCandidate(av, w1v, w2v, m1v, m2v)) {
          const won = Atomics.compareExchange(sharedI32, 1, 0, 1);
          if (won === 0) {
            parentPort.postMessage({
              type: 'watch_hit',
              workerId,
              idx,
              label:
                `${shortItem(av.itemName)}[${shortCrystal(av.crystalName)}] ` +
                `${formatWeaponShort(w1v)}+${formatWeaponShort(w2v)} ` +
                `${shortItem(m1v.itemName)}[${shortCrystal(m1v.crystalName)}]+${shortItem(m2v.itemName)}[${shortCrystal(m2v.crystalName)}]`,
            });
          }
        }
      }
    }

    if (useSuperset) {
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
    }

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
    const globalFloor = floorLoadPct(sharedI32);
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
      candidateKey: idx,
    });

    const wpTag = weaponPairTagFromSkills(w1v.weapon.skill, w2v.weapon.skill);
    const label = buildLabel(plan, av, w1v, w2v, m1v, m2v);
    const spec = buildSpec(av, w1v, w2v, m1v, m2v, plan);

    // -------------------------
    // CATALOG CAPTURE (screen-based)
    // -------------------------
    if (trialsScreen > 0 && score.screenSampled === defenders.length) {
      const sw = score.screenWorstWin;
      const sa = score.screenAvgWin;

      const eligible = floorWorst === null ? true : sw + 1e-9 >= floorWorst - catalogMargin;

      if (eligible && sw !== null && sw !== undefined) {
        let topArr = catalogTopByHp[hpKey];
        if (!topArr) topArr = catalogTopByHp[hpKey] = [];
        pushCatalogTop(
          topArr,
          {
            wpTag,
            label,
            spec,
            screenWorstWin: sw,
            screenWorstName: score.screenWorstName,
            screenAvgWin: sa,
          },
          catalogTopN,
        );

        let bestTypes = catalogBestTypeByHp[hpKey];
        if (!bestTypes) bestTypes = catalogBestTypeByHp[hpKey] = Object.create(null);
        const cand = {
          wpTag,
          label,
          spec,
          screenWorstWin: sw,
          screenWorstName: score.screenWorstName,
          screenAvgWin: sa,
        };
        if (isBetterScreen(cand, bestTypes[wpTag])) bestTypes[wpTag] = cand;
      }
    }

    // -------------------------
    // COMPETITIVE KEEP (confirmed, not bailed)
    // -------------------------
    if (!score.bailed) {
      let bestTypes = bestByTypeByHp[hpKey];
      if (!bestTypes) bestTypes = bestByTypeByHp[hpKey] = Object.create(null);

      const candidateEntry = {
        wpTag,
        label,
        spec,
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
          { wpTag, label, spec, ...score, stats: candidateEntry.stats },
          keepTopNPerHp,
        );
        if (lb.length >= keepTopNPerHp) {
          const newLocalFloor = lb[lb.length - 1].worstWin;
          floorTryRaise(sharedI32, newLocalFloor);
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
    catalogTopByHp,
    catalogBestTypeByHp,
    elapsedSec: (nowMs() - t0) / 1000,
  });
}

// =====================
// INIT FLOOR (optional)
// =====================
function parseInitFloorPctFromEnv() {
  const raw = String(process.env.LEGACY_INIT_FLOOR_PCT ?? '').trim();
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return clamp(v, 0, 100);
}

// =====================
// WARM-START MEASURE
// =====================
function runWarmStartAndGetWorstPct({
  plan,
  trialsConfirm,
  maxTurns,
  rngMode,
  rngSeed,
  defenders,
}) {
  const baseSeed = (Number(rngSeed) || 0) >>> 0;
  RNG =
    rngMode === 'fast'
      ? makeRng(
          'fast',
          baseSeed,
          baseSeed ^ 0xa341316c,
          baseSeed ^ 0xc8013ea4,
          baseSeed ^ 0xad90777d,
        )
      : Math.random;

  const localCache = new Map();
  function getV(itemName, crystalName, upgrade1 = '', upgrade2 = '') {
    const key = variantKey(itemName, crystalName, upgrade1, upgrade2);
    let v = localCache.get(key);
    if (!v) {
      const ups = [];
      if (upgrade1) ups.push(upgrade1);
      if (upgrade2) ups.push(upgrade2);
      v = computeVariant(itemName, crystalName, ups);
      localCache.set(key, v);
    }
    return v;
  }

  for (const def of defenderBuilds) {
    const p = def.payload;
    getV(p.armor.name, p.armor.upgrades[0]);
    getV(p.weapon1.name, p.weapon1.upgrades[0]);
    getV(p.weapon2.name, p.weapon2.upgrades[0]);
    getV(p.misc1.name, p.misc1.upgrades[0]);
    getV(p.misc2.name, p.misc2.upgrades[0]);
  }

  const compiledDefenders = defenders || defenderBuilds.map((d) => compileDefender(d, localCache));

  const av = getV(WARM_START_BUILD.armor.item, WARM_START_BUILD.armor.crystal);

  const w1u1 = (WARM_START_BUILD.weapon1.upgrades && WARM_START_BUILD.weapon1.upgrades[0]) || '';
  const w1u2 = (WARM_START_BUILD.weapon1.upgrades && WARM_START_BUILD.weapon1.upgrades[1]) || '';
  const w2u1 = (WARM_START_BUILD.weapon2.upgrades && WARM_START_BUILD.weapon2.upgrades[0]) || '';
  const w2u2 = (WARM_START_BUILD.weapon2.upgrades && WARM_START_BUILD.weapon2.upgrades[1]) || '';

  const w1v = getV(WARM_START_BUILD.weapon1.item, WARM_START_BUILD.weapon1.crystal, w1u1, w1u2);
  const w2v = getV(WARM_START_BUILD.weapon2.item, WARM_START_BUILD.weapon2.crystal, w2u1, w2u2);

  const m1v = getV(WARM_START_BUILD.misc1.item, WARM_START_BUILD.misc1.crystal);
  const m2v = getV(WARM_START_BUILD.misc2.item, WARM_START_BUILD.misc2.crystal);

  const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v);

  const score = evalCandidateStaged({
    att,
    defenders: compiledDefenders,
    maxTurns,
    trialsGate: 0,
    gatekeepers: 0,
    trialsScreen: 0,
    trialsConfirm,
    floorWorst: null,
    bailMargin: 0,
    deterministic: true,
    baseSeed: (Number(rngSeed) || 0) >>> 0,
    candidateKey: 0xc0ffee,
  });

  return { worstWin: score.worstWin, avgWin: score.avgWin, worstName: score.worstName };
}

// =====================
// CATALOG CONFIRM (main thread)
// =====================
function confirmSpecAgainstDefenders({
  spec,
  trialsConfirm,
  maxTurns,
  rngMode,
  rngSeed,
  defenders,
}) {
  const baseSeed = (Number(rngSeed) || 0) >>> 0;
  RNG =
    rngMode === 'fast'
      ? makeRng(
          'fast',
          baseSeed ^ 0x1234abcd,
          baseSeed ^ 0x1234abcd ^ 0xa341316c,
          baseSeed ^ 0x1234abcd ^ 0xc8013ea4,
          baseSeed ^ 0x1234abcd ^ 0xad90777d,
        )
      : Math.random;

  // If compiled defenders are supplied, we don't need to rebuild them here.
  const compiledDef = defenders;

  // Build only the variants needed for this attacker spec.
  const localCache = new Map();
  function getV(itemName, crystalName, u1 = '', u2 = '') {
    const key = variantKey(itemName, crystalName, u1, u2);
    let v = localCache.get(key);
    if (!v) {
      const ups = [];
      if (u1) ups.push(u1);
      if (u2) ups.push(u2);
      v = computeVariant(itemName, crystalName, ups);
      localCache.set(key, v);
    }
    return v;
  }

  const plan = spec.plan;

  const av = getV(spec.armor.item, spec.armor.crystal);
  const w1v = getV(spec.weapon1.item, spec.weapon1.crystal, spec.weapon1.u1, spec.weapon1.u2);
  const w2v = getV(spec.weapon2.item, spec.weapon2.crystal, spec.weapon2.u1, spec.weapon2.u2);
  const m1v = getV(spec.misc1.item, spec.misc1.crystal);
  const m2v = getV(spec.misc2.item, spec.misc2.crystal);

  const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v);

  // confirm only (no floor)
  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = '';

  for (let i = 0; i < compiledDef.length; i++) {
    const D = compiledDef[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
    const winPct = (wins / trialsConfirm) * 100;
    const avgEx = exSum / trialsConfirm;

    sumWin += winPct;
    sumEx += avgEx;
    if (winPct < worstWin) {
      worstWin = winPct;
      worstName = D.name;
    }
  }

  return {
    worstWin,
    worstName,
    avgWin: sumWin / compiledDef.length,
    avgEx: sumEx / compiledDef.length,
    stats: {
      hp: att.hp,
      extraAcc: plan.extraAcc,
      extraDodge: plan.extraDodge,
      speed: att.speed,
      armor: att.armor,
      acc: att.acc,
      dodge: att.dodge,
      gun: att.gun,
      prj: att.prj,
      mel: att.mel,
      defSk: att.defSk,
    },
  };
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

  const printStage =
    process.env.LEGACY_PRINT_STAGE === '1' || process.env.LEGACY_PRINT_STAGE === 'true';

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

  const watchRaw = String(process.env.LEGACY_WATCH_BUILD ?? '')
    .trim()
    .toLowerCase();
  const watchEnabled =
    watchRaw === ''
      ? true
      : !(watchRaw === '0' || watchRaw === 'false' || watchRaw === 'off' || watchRaw === 'no');

  const useSuperset =
    String(process.env.LEGACY_USE_SUPERSET ?? '')
      .trim()
      .toLowerCase() === '1';

  const catalogTopN = parseCatalogTopN();
  const catalogMargin = parseCatalogMargin();
  const catalogConfirmTrials = parseCatalogConfirmTrials(TRIALS_CONFIRM);

  // Build variants/pairs for sanity + counts
  const armorVariants = buildVariantsForArmors(pools.armors);
  const weaponVariants = buildVariantsForWeapons(pools.weapons);
  const miscVariants = buildVariantsForMiscsSuperset(pools.miscs);

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const { plans, perHpSummary } = buildHpPlans();

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const AV = armorVariants.length;

  const totalCandidatesSuperset = AV * WP * MP;

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowedByMask = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIndicesByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);
  const effCounts = computeEffectiveCounts(
    armorVariants,
    weaponPairIndicesByMask,
    miscPairsAllowedByMask,
  );
  const totalCandidatesEffective = effCounts.effTotal;

  const totalCandidates = useSuperset ? totalCandidatesSuperset : totalCandidatesEffective;

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

  const sharedBuf = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
  const sharedI32 = new Int32Array(sharedBuf);
  sharedI32[0] = -1;
  sharedI32[1] = 0;

  // Warm-start shared floor, if provided
  const initFloor = parseInitFloorPctFromEnv();
  if (initFloor !== null) {
    sharedI32[0] = (initFloor * FLOOR_SCALE) | 0;
    console.log(
      `Warm-start: seeded shared floor to ${initFloor.toFixed(2)}% via LEGACY_INIT_FLOOR_PCT`,
    );
  }

  // Warm-start by evaluating a known strong seed build (recommended)
  if (warmStartEnabled()) {
    const warmTrials = parseWarmStartTrials(TRIALS_CONFIRM);

    const ws = runWarmStartAndGetWorstPct({
      plan: plans[0],
      trialsConfirm: warmTrials,
      maxTurns: SETTINGS.MAX_TURNS,
      rngMode: rngMode === 'fast' ? 'fast' : 'math',
      rngSeed,
    });

    const existing = floorLoadPct(sharedI32);
    const next = existing === null ? ws.worstWin : Math.max(existing, ws.worstWin);

    sharedI32[0] = (next * FLOOR_SCALE) | 0;

    console.log(
      `Warm-start(build): measured worst=${ws.worstWin.toFixed(2)}% (worstVs=${ws.worstName}) avg=${ws.avgWin.toFixed(
        2,
      )}% using ${warmTrials} trials/def; seeded shared floor to ${next.toFixed(2)}%`,
    );
  }

  console.log(
    `LEGACY brute-force (v2.14.6-calib) | defenders=${defenderBuilds.length} | trialsGate/def=${TRIALS_GATE} | trialsScreen/def=${TRIALS_SCREEN} | trialsConfirm/def=${TRIALS_CONFIRM}`,
  );
  console.log(
    `Workers=${workers} (logical=${logical}, physicalGuess=${physicalGuess}) | RNG=${
      rngMode === 'fast' ? 'fast(sfc32)' : 'Math.random'
    } | deterministic=${deterministic ? 'ON' : 'OFF'} | baseDmgPerHit=+${BASE.baseDamagePerHit}`,
  );
  console.log(
    `Mixed weapon bonus: ON | Prune: ${pruneEnabled ? `ON (delta=${pruneDelta})` : 'OFF'}`,
  );
  console.log(
    `LOCK_ONLY_AMULET (weapons-only): ${
      LOCK_ONLY_AMULET.size ? Array.from(LOCK_ONLY_AMULET).join(', ') : '(none)'
    }`,
  );

  if (useSuperset) {
    console.log(
      `Mode: SUPERSET (compat) | armorVariants=${AV} weaponPairs=${WP} miscPairs=${MP} => totalCandidates=${totalCandidatesSuperset}`,
    );
  } else {
    console.log(
      `Mode: EFFECTIVE (optimized) | armorVariants=${AV} effectivePerArmor=${effCounts.effPerArmor} => totalCandidates=${totalCandidatesEffective}`,
    );
    console.log(
      `Superset info: weaponPairs=${WP} miscPairs=${MP} => supersetCandidates=${totalCandidatesSuperset}`,
    );
  }

  const locked = plans[0];
  console.log(
    `LOCKED attacker plan: HP=${locked.hp} extraAcc=${locked.extraAcc} extraDodge=${locked.extraDodge} (freePoints=${locked.freePoints})`,
  );
  console.log(
    `Gatekeepers: N=${GATEKEEPERS} trialsGate=${TRIALS_GATE} | StageA bail margin=${BAIL_MARGIN.toFixed(2)}%`,
  );
  console.log(
    `Catalog: topN=${catalogTopN} | marginBelowFloor=${catalogMargin.toFixed(1)}% | confirmTrials=${catalogConfirmTrials}`,
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

  if (watchEnabled) {
    const chk = checkWatchBuildReachable(pools);
    const pretty =
      `Armor=${WATCH_BUILD.armor.item}[${shortCrystal(WATCH_BUILD.armor.crystal)}], ` +
      `Wpn=${WATCH_BUILD.weapon1.item}[${shortCrystal(WATCH_BUILD.weapon1.crystal)}]+${WATCH_BUILD.weapon2.item}[${shortCrystal(WATCH_BUILD.weapon2.crystal)}], ` +
      `Misc=${WATCH_BUILD.misc1.item}[${shortCrystal(WATCH_BUILD.misc1.crystal)}]+${WATCH_BUILD.misc2.item}[${shortCrystal(WATCH_BUILD.misc2.crystal)}]`;

    console.log(`WATCH_BUILD: ${pretty}`);
    if (chk.reachable) {
      console.log('WATCH_BUILD: reachable in current search-space. Will log once when hit.\n');
    } else {
      console.log('WATCH_BUILD: NOT reachable in current search-space due to constraints:');
      for (const r of chk.reasons) console.log(`  - ${r}`);
      console.log('WATCH_BUILD: (so it will never be “hit” unless you loosen constraints.)\n');
    }
  }

  const globalByHp = Object.create(null);
  const globalBestByTypeByHp = Object.create(null);

  // Catalog aggregates
  const globalCatalogTopByHp = Object.create(null);
  const globalCatalogBestTypeByHp = Object.create(null);

  for (const r of perHpSummary) {
    globalByHp[String(r.hp)] = [];
    globalBestByTypeByHp[String(r.hp)] = Object.create(null);
    globalCatalogTopByHp[String(r.hp)] = [];
    globalCatalogBestTypeByHp[String(r.hp)] = Object.create(null);
  }

  let liveBestWorst = null;
  let liveBestAvg = null;

  const start = nowMs();
  let lastRender = start;
  const processedByWorker = new Array(workers).fill(0);

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
          sharedBuf,
          pools,
          debugMixed,
          debugMixedN,
          watchEnabled,
          useSuperset,
          catalogTopN,
          catalogMargin,
        },
      });

      wk.on('message', (msg) => {
        if (!msg || !msg.type) return;

        if (msg.type === 'watch_hit') {
          console.log(`\n[WATCH_BUILD HIT] worker=${msg.workerId} idx=${msg.idx} | ${msg.label}\n`);
          return;
        }

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
            const sharedFloor = floorLoadPct(sharedI32);

            process.stdout.write(
              `\rtested~=${Math.min(doneProcessed, totalCandidates)}/${totalCandidates} elapsed=${elapsed.toFixed(
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

          // merge catalog
          const cTop = msg.catalogTopByHp || {};
          for (const hpKey in cTop) {
            const arr = cTop[hpKey];
            if (!arr || !arr.length) continue;
            const gArr = globalCatalogTopByHp[hpKey] || (globalCatalogTopByHp[hpKey] = []);
            for (const e of arr) pushCatalogTop(gArr, e, catalogTopN);
          }

          const cTypes = msg.catalogBestTypeByHp || {};
          for (const hpKey in cTypes) {
            const types = cTypes[hpKey];
            if (!types) continue;
            let g = globalCatalogBestTypeByHp[hpKey];
            if (!g) g = globalCatalogBestTypeByHp[hpKey] = Object.create(null);

            for (const tKey in types) {
              const cand = types[tKey];
              if (!cand) continue;
              if (isBetterScreen(cand, g[tKey])) g[tKey] = cand;
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

  printResults({
    globalByHp,
    globalBestByTypeByHp,
    globalCatalogTopByHp,
    globalCatalogBestTypeByHp,
    elapsedAll,
    totalCandidates,
    printStage,
    rngMode: rngMode === 'fast' ? 'fast' : 'math',
    rngSeed,
    catalogConfirmTrials,
  });
}

// =====================
// PRINT RESULTS
// =====================
function printResults({
  globalByHp,
  globalBestByTypeByHp,
  globalCatalogTopByHp,
  globalCatalogBestTypeByHp,
  elapsedAll,
  totalCandidates,
  printStage,
  rngMode,
  rngSeed,
  catalogConfirmTrials,
}) {
  console.log(`\nDone. tested=${totalCandidates} | elapsed=${elapsedAll.toFixed(1)}s`);
  console.log(
    `Per-HP Top ${SETTINGS.KEEP_TOP_N_PER_HP} (KEPT by floor; ranked by worstWin, then avgWin)\n`,
  );

  // ✅ SPEEDUP: compile defenders ONCE for catalog confirm (and reuse for every confirm call).
  const compiledDefendersOnce = (() => {
    const localCache = new Map();
    function getV(itemName, crystalName, u1 = '', u2 = '') {
      const key = variantKey(itemName, crystalName, u1, u2);
      let v = localCache.get(key);
      if (!v) {
        const ups = [];
        if (u1) ups.push(u1);
        if (u2) ups.push(u2);
        v = computeVariant(itemName, crystalName, ups);
        localCache.set(key, v);
      }
      return v;
    }

    for (const def of defenderBuilds) {
      const p = def.payload;
      getV(p.armor.name, p.armor.upgrades[0]);
      getV(p.weapon1.name, p.weapon1.upgrades[0]);
      getV(p.weapon2.name, p.weapon2.upgrades[0]);
      getV(p.misc1.name, p.misc1.upgrades[0]);
      getV(p.misc2.name, p.misc2.upgrades[0]);
    }

    return defenderBuilds.map((d) => compileDefender(d, localCache));
  })();

  const hpKeys = Object.keys(globalByHp)
    .map((x) => parseInt(x, 10))
    .sort((a, b) => a - b);

  for (const hp of hpKeys) {
    const hpKey = String(hp);
    const lb = globalByHp[hpKey] || [];
    if (!lb.length) {
      console.log(`HP=${hp}: (no results kept)`);
    } else {
      console.log(`HP=${hp}`);

      if (printStage) {
        console.log(
          padRight('Rank', 5) +
            padRight('Stage', 6) +
            padRight('Worst%', 8) +
            padRight('WorstVs', 20) +
            padRight('Avg%', 7) +
            padRight('AvgEx', 7) +
            'Build',
        );
      } else {
        console.log(
          padRight('Rank', 5) +
            padRight('Worst%', 8) +
            padRight('WorstVs', 20) +
            padRight('Avg%', 7) +
            padRight('AvgEx', 7) +
            'Build',
        );
      }

      console.log('─'.repeat(printStage ? 112 : 105));

      for (let i = 0; i < lb.length; i++) {
        const e = lb[i];
        const stage = e.stage || '?';

        if (printStage) {
          console.log(
            padRight(`#${i + 1}`, 5) +
              padRight(stage, 6) +
              padRight(e.worstWin.toFixed(2), 8) +
              padRight(e.worstName, 20) +
              padRight(e.avgWin.toFixed(2), 7) +
              padRight(e.avgEx.toFixed(2), 7) +
              e.label,
          );
        } else {
          console.log(
            padRight(`#${i + 1}`, 5) +
              padRight(e.worstWin.toFixed(2), 8) +
              padRight(e.worstName, 20) +
              padRight(e.avgWin.toFixed(2), 7) +
              padRight(e.avgEx.toFixed(2), 7) +
              e.label,
          );
        }
      }

      const best = lb[0].stats;
      console.log(
        `Best stats: Acc=${best.acc} Dod=${best.dodge} Gun=${best.gun} Prj=${best.prj} Mel=${best.mel} Def=${best.defSk} Arm=${best.armor} Spd=${best.speed} (alloc A${best.extraAcc} D${best.extraDodge})\n`,
      );

      const bestTypes = globalBestByTypeByHp[hpKey] || {};
      const typeKeys = Object.keys(bestTypes);
      if (typeKeys.length) {
        console.log('Best by weapon archetype (KEPT; prefers confirmed Stage B):');
        typeKeys.sort((a, b) => {
          const A = bestTypes[a];
          const B = bestTypes[b];
          return B.worstWin - A.worstWin || B.avgWin - A.avgWin;
        });

        console.log(
          padRight('Type', 12) +
            padRight('Stage', 6) +
            padRight('Worst%', 8) +
            padRight('WorstVs', 20) +
            padRight('Avg%', 7) +
            padRight('AvgEx', 7) +
            'Build',
        );
        console.log('─'.repeat(120));

        for (const t of typeKeys) {
          const e = bestTypes[t];
          console.log(
            padRight(t, 12) +
              padRight(e.stage || '?', 6) +
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

    // -----------------------------
    // CATALOG PRINT (confirmed after run)
    // -----------------------------
    const catTop = globalCatalogTopByHp[hpKey] || [];
    const catTypes = globalCatalogBestTypeByHp[hpKey] || {};

    if (!catTop.length && !Object.keys(catTypes).length) {
      console.log(
        `HP=${hp} Catalog: (no catalog candidates captured — increase LEGACY_CATALOG_MARGIN or ensure TRIALS_SCREEN>0)\n`,
      );
      continue;
    }

    // confirm top N
    const confirmedTop = [];
    for (const e of catTop) {
      const conf = confirmSpecAgainstDefenders({
        spec: e.spec,
        trialsConfirm: catalogConfirmTrials,
        maxTurns: SETTINGS.MAX_TURNS,
        rngMode,
        rngSeed,
        defenders: compiledDefendersOnce, // ✅ reuse
      });
      confirmedTop.push({ ...e, ...conf });
    }
    confirmedTop.sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    console.log(`HP=${hp} Catalog Top ${catTop.length} (FINAL confirmed; ignores seeded floor):`);
    console.log(
      padRight('Rank', 5) +
        padRight('Worst%', 8) +
        padRight('WorstVs', 20) +
        padRight('Avg%', 7) +
        padRight('AvgEx', 7) +
        padRight('ScrWorst', 9) +
        padRight('ScrAvg', 8) +
        'Build',
    );
    console.log('─'.repeat(135));
    for (let i = 0; i < confirmedTop.length; i++) {
      const e = confirmedTop[i];
      console.log(
        padRight(`#${i + 1}`, 5) +
          padRight(e.worstWin.toFixed(2), 8) +
          padRight(e.worstName, 20) +
          padRight(e.avgWin.toFixed(2), 7) +
          padRight(e.avgEx.toFixed(2), 7) +
          padRight((e.screenWorstWin ?? 0).toFixed(2), 9) +
          padRight((e.screenAvgWin ?? 0).toFixed(2), 8) +
          e.label,
      );
    }
    console.log('');

    // confirm best per archetype
    const archetypes = [
      'Gun+Gun',
      'Gun+Melee',
      'Gun+Proj',
      'Melee+Melee',
      'Melee+Proj',
      'Proj+Proj',
    ];
    const confirmedTypes = [];
    for (const t of archetypes) {
      const e = catTypes[t];
      if (!e) continue;
      const conf = confirmSpecAgainstDefenders({
        spec: e.spec,
        trialsConfirm: catalogConfirmTrials,
        maxTurns: SETTINGS.MAX_TURNS,
        rngMode,
        rngSeed,
        defenders: compiledDefendersOnce, // ✅ reuse
      });
      confirmedTypes.push({ type: t, ...e, ...conf });
    }
    confirmedTypes.sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    console.log(
      `HP=${hp} Catalog Best by weapon archetype (FINAL confirmed; ignores seeded floor):`,
    );
    console.log(
      padRight('Type', 12) +
        padRight('Worst%', 8) +
        padRight('WorstVs', 20) +
        padRight('Avg%', 7) +
        padRight('AvgEx', 7) +
        padRight('ScrWorst', 9) +
        padRight('ScrAvg', 8) +
        'Build',
    );
    console.log('─'.repeat(140));
    for (const e of confirmedTypes) {
      console.log(
        padRight(e.type, 12) +
          padRight(e.worstWin.toFixed(2), 8) +
          padRight(e.worstName, 20) +
          padRight(e.avgWin.toFixed(2), 7) +
          padRight(e.avgEx.toFixed(2), 7) +
          padRight((e.screenWorstWin ?? 0).toFixed(2), 9) +
          padRight((e.screenAvgWin ?? 0).toFixed(2), 8) +
          e.label,
      );
    }
    console.log('');
  }
}

// =====================
// VERIFY HARNESS (compares merged brute kernel vs main-calib expectations)
// Run with: node gpt-brute-sim-merged-v2.14.6-calib.js --verify
// =====================

const DEFAULT_VERIFY_DEFENDERS =
  'SG1 Split Bombs T2,DL Gun Build,DL Gun Build 2,DL Gun Build 3,DL Gun Build 4,DL Gun Build 5,DL Gun Build 6,DL Gun Build 7,DL Gun Build 8,T2 Scythe Build,HF Core/Void,Core/Void Build 1,Dual Bow Build 1,Rift Bow Build 1,Armour stack Cores';

function normalizeDefenderName(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;

  const lo = s.toLowerCase();
  if (lo === 'sg1 split bombs t2' || lo === 'sg1 split bombs') return 'SG1 Split bombs';

  if (lo === 'dual bow build 1' || lo === 'dual bow build') return 'Dual Bow Build';

  if (lo === 'rift bow build 1' || lo === 'rift bow build' || lo === 'bow/rift build 1')
    return 'Bow/rift build';

  if (lo === 'armor stack cores' || lo === 'armour stack cores') return 'Armour stack Cores';

  return s;
}

function pickDefenderPayload(nameRaw) {
  const name = normalizeDefenderName(nameRaw);
  const p = DEFENDER_PAYLOADS[name];
  if (!p) throw new Error(`Unknown defender "${nameRaw}" (normalized="${name}")`);
  return { name, payload: p };
}

function buildVariantCacheForPayloads(payloads) {
  const cache = new Map();

  function ensure(itemName, crystalName) {
    const key = variantKey(itemName, crystalName, '', '');
    if (!cache.has(key)) cache.set(key, computeVariant(itemName, crystalName, []));
  }

  for (const { payload } of payloads) {
    ensure(payload.armor.name, payload.armor.upgrades[0]);
    ensure(payload.weapon1.name, payload.weapon1.upgrades[0]);
    ensure(payload.weapon2.name, payload.weapon2.upgrades[0]);
    ensure(payload.misc1.name, payload.misc1.upgrades[0]);
    ensure(payload.misc2.name, payload.misc2.upgrades[0]);
  }

  return cache;
}

function compileAttackerFromPreset(presetName) {
  const preset = ATTACKER_PRESETS[presetName];
  if (!preset) throw new Error(`Unknown attacker preset "${presetName}"`);

  const st = preset.stats;
  const plan = {
    hp: Math.floor(Number(st.hp)),
    extraAcc: Math.floor(Number(st.accuracy)) - BASE.accuracy,
    extraDodge: Math.floor(Number(st.dodge)) - BASE.dodge,
  };

  const av = computeVariant(preset.armor.name, preset.armor.crystal, []);
  const w1v = computeVariant(
    preset.weapon1.name,
    preset.weapon1.crystal,
    preset.weapon1.upgrades || [],
  );
  const w2v = computeVariant(
    preset.weapon2.name,
    preset.weapon2.crystal,
    preset.weapon2.upgrades || [],
  );
  const m1v = computeVariant(preset.misc1.name, preset.misc1.crystal, []);
  const m2v = computeVariant(preset.misc2.name, preset.misc2.crystal, []);

  const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v);
  att.name = presetName;
  return att;
}

function fmtPct(x) {
  return x.toFixed(2).padStart(6);
}
function fmtNum(x, w) {
  return String(x).padStart(w);
}

function verifyMain() {
  const presetName =
    String(process.env.LEGACY_ATTACKER_PRESET || 'MAUL_CSTAFF').trim() || 'MAUL_CSTAFF';

  const rngMode = (process.env.LEGACY_RNG || 'fast').toLowerCase();
  const seed = parseInt(process.env.LEGACY_SEED || '1337', 10) || 1337;
  const deterministic =
    process.env.LEGACY_DETERMINISTIC === '1' || process.env.LEGACY_DETERMINISTIC === 'true';

  const trials = Math.max(
    1,
    parseInt(process.env.LEGACY_TRIALS || process.env.LEGACY_VERIFY_TRIALS || '200000', 10),
  );
  const maxTurns = SETTINGS.MAX_TURNS;

  const raw = String(process.env.LEGACY_VERIFY_DEFENDERS || DEFAULT_VERIFY_DEFENDERS).trim();
  const names = raw ? parseCsvList(raw) : [];

  const defenderBuilds = names.map(pickDefenderPayload);
  const vcache = buildVariantCacheForPayloads(defenderBuilds);
  const defenders = defenderBuilds.map((d) => compileDefender(d, vcache));
  const attacker = compileAttackerFromPreset(presetName);

  console.log('=== LEGACY VERIFY (COPY/PASTE OUTPUT) ===');
  console.log(
    `Trials/def=${trials} | MAX_TURNS=${maxTurns} | RNG=${rngMode} | seed=${seed} | deterministic=${deterministic ? 'ON' : 'OFF'}`,
  );
  console.log(`Defenders=${defenders.length} | ${names.join(', ')}`);
  console.log('');
  console.log(`Attacker preset=${presetName}`);
  console.log(
    `Attacker: HP=${attacker.hp} Spd=${attacker.speed} Acc=${attacker.acc} Dod=${attacker.dodge} Gun=${attacker.gun} Prj=${attacker.prj} Mel=${attacker.mel} Def=${attacker.defSk} Arm=${attacker.armor} (armF=${attacker.armorFactor.toFixed(6)})`,
  );
  console.log(
    `A_weps: w1=${attacker.w1 ? `${attacker.w1.name}(${attacker.w1.min}-${attacker.w1.max})` : 'none'} w2=${attacker.w2 ? `${attacker.w2.name}(${attacker.w2.min}-${attacker.w2.max})` : 'none'}`,
  );
  console.log('');

  // deterministic reseed per defender (matches main-calib)
  function setDetRng(di, vi = 0) {
    const s = mix32((seed ^ mix32(0x51ed270b ^ di ^ (vi * 0x9e3779b9))) | 0);
    RNG =
      rngMode === 'fast'
        ? makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d)
        : Math.random;
  }

  console.log('Defender                    Win%   AvgTurns');
  console.log('──────────────────────────────────────────');
  for (let di = 0; di < defenders.length; di++) {
    if (deterministic) setDetRng(di, 0);
    const D = defenders[di];
    const [wins, turnsSum] = runMatchPacked(attacker, D, trials, maxTurns);
    const winPct = (wins / trials) * 100;
    const avgTurns = turnsSum / trials;
    const name = D.name.padEnd(26).slice(0, 26);
    console.log(`${name} ${fmtPct(winPct)}  ${avgTurns.toFixed(3).padStart(8)}`);
  }
  console.log('=== END VERIFY ===');
}

// =====================
// ENTRY
// =====================
if (isMainThread) {
  console.log('=== COMBAT CFG === ' + cfgSummary());

  if (process.argv.includes('--verify')) {
    verifyMain();
  } else {
    main().catch((err) => {
      console.error('\nFatal:', err && err.stack ? err.stack : err);
      process.exit(1);
    });
  }
} else {
  workerMain();
}
