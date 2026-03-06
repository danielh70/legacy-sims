#!/usr/bin/env node
'use strict';

/**
 * =====================
 * LEGACY BRUTE FORCE (CONSTRAINED + STAGED + DETERMINISTIC RNG OPTION)
 * v2.12.1 (CATALOG CONFIRM SPEEDUP + mixed bonus clarified)
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
 *
 * Speed/quality knobs:
 *   LEGACY_INIT_FLOOR_PCT=42.5           # seed shared floor (worst%) to ramp faster
 *   LEGACY_WARM_START=1|0                # evaluate a known strong seed build to set the shared floor (default ON)
 *   LEGACY_WARM_START_TRIALS=5000        # trials/def for warm-start (defaults to TRIALS_CONFIRM)
 *
 * Staged evaluation knobs:
 *   LEGACY_TRIALS=20000                  # confirm trials/def (Stage B)
 *   LEGACY_TRIALS_SCREEN=2000            # screen trials/def (Stage A)
 *   LEGACY_TRIALS_GATE=500               # gate trials/def (Stage 0)
 *   LEGACY_GATEKEEPERS=4                 # number of gatekeeper defenders
 *   LEGACY_SCREEN_MARGIN=6               # Stage A early-bail margin (pct)
 *
 * RNG/repro:
 *   LEGACY_RNG=fast|math                 # default: fast (sfc32)
 *   LEGACY_SEED=123456789                # base seed for fast RNG
 *   LEGACY_DETERMINISTIC=1               # deterministic per-defender seeding (slower, reproducible)
 *
 * Combat knobs (defaults are the calibrated settings):
 *   LEGACY_SPEED_TIE_MODE=random|attacker
 *   LEGACY_HIT_ROLL_MODE=int             LEGACY_HIT_GE=1     LEGACY_HIT_QROUND=round
 *   LEGACY_SKILL_ROLL_MODE=int           LEGACY_SKILL_GE=1   LEGACY_SKILL_QROUND=round
 *   LEGACY_DMG_ROLL=int
 *   LEGACY_ARMOR_K=8                     LEGACY_ARMOR_APPLY=per_weapon  LEGACY_ARMOR_ROUND=ceil
 *
 * Optional debugging:
 *   LEGACY_WATCH_BUILD=1                 # log one watched build when encountered
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
  HP_MAX: 595,
  MAX_TURNS: 200,

  TRIALS_CONFIRM_DEFAULT: 20000,
  TRIALS_SCREEN_DEFAULT: 1200,
  TRIALS_GATE_DEFAULT: 300,
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
  baseDamagePerHit: 0,
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
// COMBAT (CALIBRATED ENGINE)
// Mirrors the calibrated main-calib roll semantics:
//   - roll bounds: [stat/4 .. stat] with optional quarter-rounding on the MIN bound
//   - integer mode uses legacy-int sampling over (possibly fractional) bounds
//   - supports >= (GE) comparator
//   - armor factor uses K (default 8): mod=(level*K)/2; factor=mod/(mod+armor)
//   - armor rounding default: ceil
// Notes:
//   - This section is intentionally self-contained and uses the global RNG function that
//     is swapped by the staged deterministic harness.
// =====================
let RNG = Math.random;

// ---------------------
// Env-backed knobs (defaults match our calibrated settings)
// ---------------------
function _envStr(name, def) {
  const v = process.env[name];
  return v === undefined || v === null || v === '' ? def : String(v);
}
function _envNum(name, def) {
  const v = Number(_envStr(name, def));
  return Number.isFinite(v) ? v : Number(def);
}
function _envBool(name, def) {
  const v = _envStr(name, def ? '1' : '0')
    .trim()
    .toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

function normalizeRollMode(m) {
  m = String(m || 'float')
    .trim()
    .toLowerCase();
  if (m === 'int') return 'int';
  if (m === 'float') return 'float';
  if (m === 'int_u' || m === 'int_uniform' || m === 'uniform_int' || m === 'intcf')
    return 'int_uniform';
  if (m === 'int_excl' || m === 'int_exclusive' || m === 'int_exclmax' || m === 'int_x')
    return 'int_excl';
  return 'float';
}
function normalizeQround(m) {
  m = String(m || 'none')
    .trim()
    .toLowerCase();
  if (m === 'none' || m === 'off' || m === '0') return 'none';
  if (m === 'floor') return 'floor';
  if (m === 'ceil' || m === 'ceiling') return 'ceil';
  if (m === 'round') return 'round';
  return 'none';
}
function applyQuarterRound(x, qround) {
  if (qround === 'floor') return Math.floor(x);
  if (qround === 'ceil') return Math.ceil(x);
  if (qround === 'round') return Math.round(x);
  return x;
}

// default: attacker wins speed ties (matches legacy_simulator.canonical)
const SPEED_TIE_MODE = _envStr('LEGACY_SPEED_TIE_MODE', 'attacker').trim().toLowerCase();

// calibrated defaults (normalized once up-front for speed)
const HIT_ROLL_MODE = normalizeRollMode(_envStr('LEGACY_HIT_ROLL_MODE', 'int'));
const HIT_GE = _envBool('LEGACY_HIT_GE', true);
const HIT_QROUND = normalizeQround(_envStr('LEGACY_HIT_QROUND', 'round'));

const SKILL_ROLL_MODE = normalizeRollMode(_envStr('LEGACY_SKILL_ROLL_MODE', 'int'));
const SKILL_GE = _envBool('LEGACY_SKILL_GE', true);
const SKILL_QROUND = normalizeQround(_envStr('LEGACY_SKILL_QROUND', 'round'));

const DMG_ROLL = String(_envStr('LEGACY_DMG_ROLL', 'int')).trim().toLowerCase();

const ARMOR_K = _envNum('LEGACY_ARMOR_K', 8);
const ARMOR_APPLY = _envStr('LEGACY_ARMOR_APPLY', 'per_weapon').trim().toLowerCase();
const ARMOR_ROUND = _envStr('LEGACY_ARMOR_ROUND', 'ceil').trim().toLowerCase();

const PROJ_DEF_MULT = _envNum('LEGACY_PROJ_DEF_MULT', 1);

// main-calib compatibility: whether the 2nd weapon is skipped if the 1st weapon kills the target
const ACTION_STOP_ON_KILL = _envBool('LEGACY_ACTION_STOP_ON_KILL', false);

// main-calib compatibility: shared hit roll once per action (forces both weapons to use same hit result)
const SHARED_HIT = _envBool('LEGACY_SHARED_HIT', false);

// main-calib compatibility: shared skill roll caching
//   none | same_type | gun_same_type
const SHARED_SKILL_MODE = _envStr('LEGACY_SHARED_SKILL', 'none').trim().toLowerCase();

// tactics/base damage bonus support (matches legacy_simulator.canonical semantics)
//   LEGACY_TACTICS_MODE: none | base | both
//   LEGACY_TACTICS_VAL: numeric (default 5)
//   LEGACY_DMG_BONUS_MODE: per_action | per_weapon | split_equipped
//   LEGACY_DMG_BONUS_STAGE: pre_armor | post_armor
const TACTICS_MODE = _envStr('LEGACY_TACTICS_MODE', 'none').trim().toLowerCase();
const TACTICS_VAL = _envNum('LEGACY_TACTICS_VAL', 5);
const DMG_BONUS_MODE = _envStr('LEGACY_DMG_BONUS_MODE', 'per_action').trim().toLowerCase();
const DMG_BONUS_STAGE = _envStr('LEGACY_DMG_BONUS_STAGE', 'pre_armor').trim().toLowerCase();

const TACTICS_BASE_ENABLED = TACTICS_MODE === 'base' || TACTICS_MODE === 'both';
const TACTICS_BASE_VAL = TACTICS_BASE_ENABLED ? TACTICS_VAL : 0;

// ---------------------
// RNG helpers
// ---------------------
function randFloat(min, max) {
  if (max < min) return min;
  return RNG() * (max - min) + min;
}
function randIntInclusive(min, max) {
  if (max < min) return min;
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return lo + Math.floor(RNG() * (hi - lo + 1));
}

// Legacy-int sampler (inclusive) that matches main-calib behavior even with fractional bounds.
function randLegacyInt(min, max) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  return Math.floor(RNG() * (max - min + 1) + min);
}

function intRange(min, max, mode) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return { lo, hi: lo };
  if (mode === 'int_excl') return { lo, hi: Math.max(lo, hi - 1) };
  return { lo, hi };
}

// rollMode and qround are expected to be normalized strings (we normalize once at init).
function rollVs(off, def, rollMode, ge, qround) {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;

  let aMin = off / 4;
  const aMax = off;
  let dMin = def / 4;
  const dMax = def;

  if (qround !== 'none') {
    aMin = applyQuarterRound(aMin, qround);
    dMin = applyQuarterRound(dMin, qround);
  }

  let a, b;
  if (rollMode === 'float') {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  } else if (rollMode === 'int') {
    a = randLegacyInt(aMin, aMax);
    b = randLegacyInt(dMin, dMax);
  } else if (rollMode === 'int_uniform') {
    a = randIntInclusive(aMin, aMax);
    b = randIntInclusive(dMin, dMax);
  } else if (rollMode === 'int_excl') {
    const rA = intRange(aMin, aMax, 'int_excl');
    const rB = intRange(dMin, dMax, 'int_excl');
    a = randIntInclusive(rA.lo, rA.hi);
    b = randIntInclusive(rB.lo, rB.hi);
  } else {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  }

  const diff = a - b;
  return ge ? diff >= 0 : diff > 0;
}

// ---------------------
// Combat helpers
// ---------------------
// Weapon skill encoding: 0=gun, 1=melee, 2=proj
function skillValue(att, skillCode) {
  return skillCode === 0 ? att.gun : skillCode === 1 ? att.mel : att.prj;
}

function rollDamage(min, max, dmgRollMode) {
  if (dmgRollMode === 'int') return randLegacyInt(min, max);
  return Math.round(randFloat(min, max));
}

function armorFactorForArmorValue(level, armor, armorK) {
  const k = armorK == null ? 8 : armorK;
  const mod = (level * k) / 2;
  return mod / (mod + armor);
}

function applyArmorAndRound(raw, armorFactor, armorRound) {
  const x = raw * armorFactor;
  if (armorRound === 'none') return x;
  if (armorRound === 'floor') return Math.floor(x);
  if (armorRound === 'ceil') return Math.ceil(x);
  return Math.round(x);
}

const _PRE_ACTION = {
  forceHit: null, // boolean|null
  sharedSkillOn: false,
  sharedSkillSkillCode: null,
  sharedSkillCached: false,
  sharedSkillCachedVal: false,
};

// scratch space reused to avoid per-action allocations
const _TW1 = new Float64Array(2); // [val, rawPosFlag]
const _TW2 = new Float64Array(2);

function attemptWeaponFast(att, def, w, pre, out) {
  out[0] = 0;
  out[1] = 0;
  if (!w) return;

  // HIT roll (or forced shared hit)
  let hit;
  if (pre && pre.forceHit !== null && pre.forceHit !== undefined) {
    hit = pre.forceHit;
  } else {
    hit = rollVs(att.acc, def.dodge, HIT_ROLL_MODE, HIT_GE, HIT_QROUND);
  }
  if (!hit) return;

  // SKILL roll (optionally shared/cached)
  const atkSkill = skillValue(att, w.skill);
  let defSkill = def.defSk;
  if (w.skill === 2) defSkill *= PROJ_DEF_MULT;

  let skillOk;
  if (pre && pre.sharedSkillOn && w.skill === pre.sharedSkillSkillCode) {
    if (!pre.sharedSkillCached) {
      pre.sharedSkillCachedVal = rollVs(
        atkSkill,
        defSkill,
        SKILL_ROLL_MODE,
        SKILL_GE,
        SKILL_QROUND,
      );
      pre.sharedSkillCached = true;
    }
    skillOk = pre.sharedSkillCachedVal;
  } else {
    skillOk = rollVs(atkSkill, defSkill, SKILL_ROLL_MODE, SKILL_GE, SKILL_QROUND);
  }
  if (!skillOk) return;

  // DAMAGE roll
  let raw = rollDamage(w.min, w.max, DMG_ROLL);
  if (raw <= 0) return;

  // tactics/base bonus (per-weapon variants)
  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE !== 'per_action') {
    if (DMG_BONUS_MODE === 'per_weapon') {
      raw += TACTICS_BASE_VAL;
    } else if (DMG_BONUS_MODE === 'split_equipped') {
      if (String(w.name).includes('Split Crystal Bombs')) raw += TACTICS_BASE_VAL;
    }
  }

  // ARMOR application
  const val =
    ARMOR_APPLY === 'per_weapon' ? applyArmorAndRound(raw, def.armorFactor, ARMOR_ROUND) : raw;

  out[0] = val > 0 ? val : 0;
  out[1] = 1; // raw>0 (hit+skill succeeded)
}

function doActionFast(att, def, targetHp0) {
  if (targetHp0 <= 0) return 0;

  // Shared hit (if enabled): one hit roll per action, applied to both weapons.
  _PRE_ACTION.forceHit = SHARED_HIT
    ? rollVs(att.acc, def.dodge, HIT_ROLL_MODE, HIT_GE, HIT_QROUND)
    : null;

  // Shared skill (if enabled + eligible): cache a single skill roll per action.
  _PRE_ACTION.sharedSkillOn = false;
  _PRE_ACTION.sharedSkillSkillCode = null;
  _PRE_ACTION.sharedSkillCached = false;
  _PRE_ACTION.sharedSkillCachedVal = false;

  if (SHARED_SKILL_MODE !== 'none' && att.w1 && att.w2 && att.w1.skill === att.w2.skill) {
    const sc = att.w1.skill;
    const allow =
      SHARED_SKILL_MODE === 'same_type' || (SHARED_SKILL_MODE === 'gun_same_type' && sc === 0);
    if (allow) {
      _PRE_ACTION.sharedSkillOn = true;
      _PRE_ACTION.sharedSkillSkillCode = sc;
    }
  }

  // weapon 1
  attemptWeaponFast(att, def, att.w1, _PRE_ACTION, _TW1);

  // optional "stop on kill" optimization must match legacy_simulator.canonical:
  // only valid for ARMOR_APPLY=per_weapon AND baseVal==0 (tactics disabled),
  // otherwise rolling weapon2 changes RNG consumption and/or damage semantics.
  let skipW2 = false;
  if (
    ACTION_STOP_ON_KILL &&
    targetHp0 > 0 &&
    ARMOR_APPLY === 'per_weapon' &&
    TACTICS_BASE_VAL === 0 &&
    _TW1[0] >= targetHp0
  ) {
    skipW2 = true;
  }

  if (!skipW2) attemptWeaponFast(att, def, att.w2, _PRE_ACTION, _TW2);
  else {
    _TW2[0] = 0;
    _TW2[1] = 0;
  }

  // combine damage
  if (ARMOR_APPLY === 'per_weapon') {
    let actionDmg = _TW1[0] + _TW2[0];

    // per-action tactics bonus (post-weapon, pre-cap)
    if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action') {
      const any = _TW1[1] > 0 || _TW2[1] > 0;
      if (any) actionDmg += TACTICS_BASE_VAL;
    }

    return actionDmg >= targetHp0 ? targetHp0 : actionDmg;
  }

  // sum mode: armor applied at action level
  let sumRaw = _TW1[0] + _TW2[0];
  if (sumRaw <= 0) return 0;

  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action' && DMG_BONUS_STAGE === 'pre_armor') {
    sumRaw += TACTICS_BASE_VAL;
  }

  let actionDmg = applyArmorAndRound(sumRaw, def.armorFactor, ARMOR_ROUND);

  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action' && DMG_BONUS_STAGE === 'post_armor') {
    // match canonical: only add if there was any raw damage pre-armor
    if (_TW1[0] + _TW2[0] > 0) actionDmg += TACTICS_BASE_VAL;
  }

  return actionDmg >= targetHp0 ? targetHp0 : actionDmg;
}

function fightOnceCalibFast(p1, p2, MAX_TURNS) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  let p1First;
  if (p1.speed > p2.speed) p1First = true;
  else if (p1.speed < p2.speed) p1First = false;
  else p1First = SPEED_TIE_MODE === 'random' ? RNG() < 0.5 : true;

  const first = p1First ? p1 : p2;
  const second = p1First ? p2 : p1;

  let turns = 0;

  while (p1hp > 0 && p2hp > 0 && turns < MAX_TURNS) {
    turns++;

    // first acts
    if (second === p1) p1hp -= doActionFast(first, second, p1hp);
    else p2hp -= doActionFast(first, second, p2hp);

    if (p1hp <= 0 || p2hp <= 0) break;

    // second acts
    if (first === p1) p1hp -= doActionFast(second, first, p1hp);
    else p2hp -= doActionFast(second, first, p2hp);
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

  return (winnerIsP1 << 16) | (turns & 0xffff);
}

function runMatchPacked(p1, p2, trials, MAX_TURNS) {
  let wins = 0;
  let exSum = 0;
  for (let i = 0; i < trials; i++) {
    const packed = fightOnceCalibFast(p1, p2, MAX_TURNS);
    wins += (packed >>> 16) & 1;
    exSum += packed & 0xffff;
  }
  return [wins, exSum];
}

// =====================
// MIXED WEAPON BONUS HELPERS
// =====================
// If both weapons exist and skill types differ => [2,2] else [1,1]
// If both weapons exist and skill types differ => [2,2] else [1,1]
function mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx) {
  if (w1SkillIdx === null || w2SkillIdx === null) return [1, 1];
  return w1SkillIdx === w2SkillIdx ? [1, 1] : [2, 2];
}

// =====================
// CRYSTALS + UPGRADES + ITEMS
// =====================
let CrystalDefs = {
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

let UpgradeDefs = {
  'Faster Reload 4': { pct: { accuracy: 0.05, damage: 0.05 } },
  'Enhanced Scope 4': { pct: { accuracy: 0.1 } },
  'Faster Ammo 4': { pct: { damage: 0.2 } },
  'Tracer Rounds 4': { pct: { accuracy: 0.15, damage: 0.05 } },
  'Laser Sight': { pct: { accuracy: 0.14 } },
  'Poisoned Tip': { pct: { damage: 0.1 } },
};

let ItemDefs = {
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
    baseWeaponDamage: { min: 25, max: 125 },
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

// Prefer external shared defs (single source of truth), if present.
// This keeps brute-force and canonical aligned without duplicating tables.
try {
  const defs = require('./legacy-defs-latest.js');
  const extCrystal = defs && (defs.CrystalDefs || defs.crystalDefs);
  const extUpgrade = defs && (defs.UpgradeDefs || defs.upgradeDefs);
  const extItem = defs && (defs.ItemDefs || defs.itemDefs);
  if (extCrystal && typeof extCrystal === 'object') CrystalDefs = extCrystal;
  if (extUpgrade && typeof extUpgrade === 'object') UpgradeDefs = extUpgrade;
  if (extItem && typeof extItem === 'object') ItemDefs = extItem;
} catch (_) {
  // no-op
}

// =====================
// DEFENDER PAYLOADS
// =====================
let DEFENDER_PAYLOADS;
(function loadDefenderPayloads() {
  const path = require('path');

  // Allow explicit override (relative or absolute):
  //   LEGACY_DEFENDERS_FILE=./legacy_defenders.js
  const override = String(process.env.LEGACY_DEFENDERS_FILE || '').trim();
  const candidates = override
    ? [override]
    : ['./legacy-defenders-latest.js', './legacy-defenders-latest.js'];

  for (const p of candidates) {
    try {
      const mod = require(path.resolve(__dirname, p));
      // Support either `module.exports = payloads` or `{ DEFENDER_PAYLOADS }`
      DEFENDER_PAYLOADS = (mod && mod.DEFENDER_PAYLOADS) || mod;
      if (DEFENDER_PAYLOADS && typeof DEFENDER_PAYLOADS === 'object') return;
    } catch (_) {
      // keep trying
    }
  }
  throw new Error(
    `Could not load defender payloads. Tried: ${candidates
      .map((s) => JSON.stringify(s))
      .join(', ')} (set LEGACY_DEFENDERS_FILE to override)`,
  );
})();

const DEFENDER_PRIORITY = [
  'DL Gun Build 3',
  'SG1 Split Bombs T2',
  'T2 Scythe Build',
  'DL Gun Build 4',
  'DL Gun Build 2',
  'DL Gun Build 7',
  'Core/Void Build 1',
  'HF Core/Void',
  // 'Dual Rifts',
];

// Defender selection:
// - Default: run against *all* defenders in legacy-defender-payloads.js (priority list first).
//   This keeps your gatekeeper ordering aggressive while still scoring builds vs the full set.
// - To run ONLY the priority/core set, set:
//     LEGACY_DEFENDERS=priority
// - To run against *all* defenders explicitly, set (same as default):
//     LEGACY_DEFENDERS=all
// - To run against a custom comma-separated set, set:
//     LEGACY_DEFENDERS="Name 1,Name 2,Name 3"
const DEFENDER_NAMES = (() => {
  const raw = String(process.env.LEGACY_DEFENDERS || '').trim();
  const lower = raw.toLowerCase();

  // helper: priority-first all defenders
  const priorityFirstAll = () => {
    const all = Object.keys(DEFENDER_PAYLOADS).slice().sort();
    const seen = new Set();
    const out = [];
    for (const n of DEFENDER_PRIORITY) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    for (const n of all) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out;
  };

  // default: ALL defenders (priority first)
  if (!raw) return priorityFirstAll();

  if (lower === 'all' || lower === '*') return priorityFirstAll();
  if (lower === 'priority' || lower === 'core' || lower === 'default')
    return DEFENDER_PRIORITY.slice();

  // custom list
  return parseCsvList(raw);
})();

const defenderBuilds = DEFENDER_NAMES.map((name) => {
  const p = DEFENDER_PAYLOADS[name];
  if (!p) {
    console.warn(`WARN: Missing DEFENDER_PAYLOADS entry for "${name}" (skipping)`);
    return null;
  }
  return { name, payload: p };
}).filter(Boolean);

if (!defenderBuilds.length) {
  throw new Error('No defenders loaded. Check your defenders file / DEFENDER_NAMES.');
}

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

// ---------------------------------------------------------------------------
// Variant compilation (crystals + upgrades) — kept in sync with legacy-sim-latest.js
// ---------------------------------------------------------------------------

function normalizeRoundMode(mode) {
  const m = String(mode || '')
    .trim()
    .toLowerCase();
  if (!m) return 'ceil';
  if (m === 'ceil' || m === 'floor' || m === 'round') return m;
  throw new Error(`Unknown round mode: "${mode}" (expected ceil|floor|round)`);
}

function normalizeCrystalStackMode(mode) {
  const m = String(mode || '')
    .trim()
    .toLowerCase();
  if (!m) return 'sum4';
  if (m === 'iter4' || m === 'sum4') return m;
  throw new Error(`Unknown crystal stack mode: "${mode}" (expected iter4|sum4)`);
}

function roundStat(x, mode) {
  if (mode === 'ceil') return Math.ceil(x);
  if (mode === 'floor') return Math.floor(x);
  return Math.round(x);
}

function roundWeaponDmg(x, mode) {
  if (mode === 'ceil') return Math.ceil(x);
  if (mode === 'floor') return Math.floor(x);
  return Math.round(x);
}

function applyCrystalPctToStat(base, pct, n, mode, roundFn) {
  if (!pct || !n) return base;
  if (mode === 'sum4') return base + roundFn(base * pct * n);
  // iter4
  let x = base;
  for (let i = 0; i < n; i++) x = x + roundFn(x * pct);
  return x;
}

function applyCrystalPctToWeaponDmg(base, pct, n, mode, roundFn) {
  if (!pct || !n) return base;
  if (mode === 'sum4') return roundFn(base * (1 + pct * n));
  // iter4
  let x = base;
  for (let i = 0; i < n; i++) x = roundFn(x * (1 + pct));
  return x;
}

// Crystal stack/rounding config (legacy defaults)
const CRYSTAL_STACK_MODE = normalizeCrystalStackMode(_envStr('LEGACY_CRYSTAL_STACK_MODE', 'sum4'));
const CRYSTAL_STACK_STATS = normalizeCrystalStackMode(
  _envStr('LEGACY_CRYSTAL_STACK_STATS', 'iter4') || CRYSTAL_STACK_MODE,
);
const CRYSTAL_STACK_DMG = normalizeCrystalStackMode(
  _envStr('LEGACY_CRYSTAL_STACK_DMG', 'sum4') || CRYSTAL_STACK_MODE,
);
const CRYSTAL_SLOTS = Math.max(0, _envNum('LEGACY_CRYSTAL_SLOTS', 4));

const STAT_ROUND_MODE = normalizeRoundMode(_envStr('LEGACY_STAT_ROUND', 'ceil'));
const WEP_DMG_ROUND_MODE = normalizeRoundMode(_envStr('LEGACY_WEAPON_DMG_ROUND', 'ceil'));

const ARMORSTAT_STACK_RAW = String(_envStr('LEGACY_ARMORSTAT_STACK', 'inherit') || 'inherit')
  .trim()
  .toLowerCase();
const ARMORSTAT_ROUND_RAW = String(_envStr('LEGACY_ARMORSTAT_ROUND', 'inherit') || 'inherit')
  .trim()
  .toLowerCase();
const ARMORSTAT_SLOTS_RAW = String(_envStr('LEGACY_ARMORSTAT_SLOTS', 'inherit') || 'inherit')
  .trim()
  .toLowerCase();

const ARMORSTAT_STACK_MODE =
  ARMORSTAT_STACK_RAW === 'inherit' ? 'inherit' : normalizeCrystalStackMode(ARMORSTAT_STACK_RAW);
const ARMORSTAT_ROUND_MODE =
  ARMORSTAT_ROUND_RAW === 'inherit' ? 'inherit' : normalizeRoundMode(ARMORSTAT_ROUND_RAW);
const ARMORSTAT_SLOTS =
  ARMORSTAT_SLOTS_RAW === 'inherit'
    ? 'inherit'
    : Math.max(0, parseInt(ARMORSTAT_SLOTS_RAW, 10) || CRYSTAL_SLOTS);

const VARIANT_CFG = {
  crystalSlots: CRYSTAL_SLOTS,
  statRound: STAT_ROUND_MODE,
  wepDmgRound: WEP_DMG_ROUND_MODE,
  stackModeStats: CRYSTAL_STACK_STATS,
  stackModeDmg: CRYSTAL_STACK_DMG,
  armorStatStack: ARMORSTAT_STACK_MODE,
  armorStatRound: ARMORSTAT_ROUND_MODE,
  armorStatSlots: ARMORSTAT_SLOTS,
};

// Misc "no-crystal skill" tweaks (legacy-compatible). Note: brute sim uses orderless misc pairs;
// slot2-specific lists are accepted but (currently) treated the same as slot1.
function parseSkillTypeMultipliers(s) {
  const out = new Map();
  const txt = String(s || '').trim();
  if (!txt) return out;
  for (const rawTok of txt.split(',')) {
    const tok = rawTok.trim();
    if (!tok) continue;
    let key = tok;
    let mult = 0;
    const eq = tok.indexOf('=');
    if (eq !== -1) {
      key = tok.slice(0, eq).trim();
      const rhs = tok.slice(eq + 1).trim();
      const v = Number(rhs);
      mult = Number.isFinite(v) ? v : 0;
    }
    const k = key.toLowerCase();
    if (k === 'gun' || k === 'guns' || k === 'gunskill') out.set('gun', mult);
    else if (k === 'melee' || k === 'mels' || k === 'melees' || k === 'meleeskill')
      out.set('melee', mult);
    else if (k === 'proj' || k === 'projectile' || k === 'prj' || k === 'projskill')
      out.set('proj', mult);
    else if (k === 'def' || k === 'defense' || k === 'defskill') out.set('def', mult);
  }
  return out;
}

const MISC_NO_CRYSTAL_SKILL = new Set(parseCsvList(_envStr('LEGACY_MISC_NO_CRYSTAL_SKILL', '')));
let MISC_NO_CRYSTAL_TYPE_MULTS = parseSkillTypeMultipliers(
  _envStr('LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES', 'gun,melee,proj'),
);
const MISC_NO_CRYSTAL_ZERO_DEF = _envBool('LEGACY_MISC_NO_CRYSTAL_SKILL_ZERO_DEF', false);

if (MISC_NO_CRYSTAL_ZERO_DEF && !MISC_NO_CRYSTAL_TYPE_MULTS.has('def'))
  MISC_NO_CRYSTAL_TYPE_MULTS.set('def', 0);

// Slot2 variants: accepted, but treated the same as slot1 unless you switch to ordered misc pairs (not implemented here).
const MISC_NO_CRYSTAL_SKILL_SLOT2 = new Set(
  parseCsvList(_envStr('LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2', '')),
);
const MISC_NO_CRYSTAL_TYPE_MULTS_SLOT2 = parseSkillTypeMultipliers(
  _envStr('LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES', ''),
);

const HAS_SLOT2_NO_CRYSTAL_CFG =
  MISC_NO_CRYSTAL_SKILL_SLOT2.size > 0 || MISC_NO_CRYSTAL_TYPE_MULTS_SLOT2.size > 0;
if (HAS_SLOT2_NO_CRYSTAL_CFG) {
  console.error(
    'WARN: slot2-specific LEGACY_MISC_NO_CRYSTAL_* settings were provided, but brute sim uses orderless misc pairs; treating slot2 the same as slot1.',
  );
}

function computeVariant(itemName, crystalName, upgrades = [], cfg = VARIANT_CFG, slotTag = 0) {
  const idef = ItemDefs[itemName];
  if (!idef) throw new Error(`Unknown item: "${itemName}"`);

  const cdef = crystalName ? CrystalDefs[crystalName] : null;
  if (crystalName && !cdef) throw new Error(`Unknown crystal: "${crystalName}"`);
  const pct = cdef && cdef.pct ? cdef.pct : {};

  // Upgrade defs + validation (legacy semantics: at most one upgrade per slot)
  const udefs = [];
  const upgradesShort = [];
  if (upgrades && upgrades.length) {
    for (const uName of upgrades) {
      const udef = UpgradeDefs[uName];
      if (!udef) throw new Error(`Unknown upgrade: "${uName}"`);
      udefs.push({ name: uName, short: shortUpgrade(uName), pct: udef.pct || {} });
      upgradesShort.push(shortUpgrade(uName));
    }

    if (idef.upgradeSlots && idef.upgradeSlots.length) {
      const taken = new Set();
      for (const u of udefs) {
        let ok = false;
        for (let si = 0; si < idef.upgradeSlots.length; si++) {
          const slot = idef.upgradeSlots[si];
          if (slot.includes(u.name) && !taken.has(si)) {
            ok = true;
            taken.add(si);
            break;
          }
        }
        if (!ok) throw new Error(`Upgrade "${u.name}" not allowed for item "${itemName}"`);
      }
    } else {
      throw new Error(
        `Item "${itemName}" has no upgrade slots but upgrades were provided: ${upgrades.join(', ')}`,
      );
    }
  }

  const isWeapon = idef.type === 'weapon';
  const isMisc = idef.type === 'misc';

  // Tag bits
  const itemShort = idef.short || itemName;
  const cl = crystalName ? shortCrystal(crystalName) : '-';
  const upTag = upgradesShort.length ? `{${upgradesShort.join('+')}}` : '';
  const tag = `${itemShort}[${cl}]${upTag}`;

  // Stat keys
  const SKILLS = ['gunSkill', 'meleeSkill', 'projSkill', 'defSkill'];
  const CORE = ['hp', 'speed', 'accuracy', 'dodge', 'armor'];

  const baseStats = idef.stats || {};
  const outStats = {};

  // Crystal slots + special handling for armor stat
  const statRound = cfg.statRound;
  const wepRound = cfg.wepDmgRound;

  const isArmorStatKey = (k) => k === 'armor';

  const roundFnStatDefault = (x) => roundStat(x, statRound);
  const roundFnWep = (x) => roundWeaponDmg(x, wepRound);

  // No-crystal misc scaling
  let miscNoCrystal = false;
  if (isMisc && !crystalName) {
    // We accept slotTag (1/2) for completeness, but brute sim misc pairs are orderless.
    const useSlot2 = slotTag === 2 && HAS_SLOT2_NO_CRYSTAL_CFG;
    const nameSet = useSlot2 ? MISC_NO_CRYSTAL_SKILL_SLOT2 : MISC_NO_CRYSTAL_SKILL;
    miscNoCrystal = nameSet.has(itemName);
  }

  // Compute core stats
  for (const k of CORE) {
    const base = baseStats[k] || 0;

    const isArmorStat = isArmorStatKey(k);
    const stackMode =
      isArmorStat && cfg.armorStatStack !== 'inherit' ? cfg.armorStatStack : cfg.stackModeStats;
    const roundMode =
      isArmorStat && cfg.armorStatRound !== 'inherit' ? cfg.armorStatRound : statRound;
    const nLocal =
      isArmorStat && cfg.armorStatSlots !== 'inherit' ? cfg.armorStatSlots : cfg.crystalSlots;
    const n = crystalName ? nLocal : 0;
    const roundFn = (x) => roundStat(x, roundMode);

    let x = base;
    x = applyCrystalPctToStat(x, pct[k] || 0, n, stackMode, roundFn);

    // upgrades apply after crystals
    let upPct = 0;
    for (const u of udefs) upPct += u.pct[k] || 0;
    if (upPct) x = x + roundStat(x * upPct, roundMode);

    outStats[k] = x;
  }

  // Compute skill stats (either the one skillType, or all)
  const skillKeys = idef.skillType ? [idef.skillType] : SKILLS;
  for (const k of skillKeys) {
    const base0 = baseStats[k] || 0;

    // misc no-crystal: scale base skill contributions by configured multipliers (default is 0)
    let mult = 1;
    if (miscNoCrystal) {
      const token =
        k === 'gunSkill'
          ? 'gun'
          : k === 'meleeSkill'
            ? 'melee'
            : k === 'projSkill'
              ? 'proj'
              : 'def';

      const useSlot2 = slotTag === 2 && HAS_SLOT2_NO_CRYSTAL_CFG;
      const m = useSlot2 ? MISC_NO_CRYSTAL_TYPE_MULTS_SLOT2 : MISC_NO_CRYSTAL_TYPE_MULTS;
      mult = m.has(token) ? m.get(token) : 0;
    }

    const base = Math.round(base0 * mult);
    const n = crystalName ? cfg.crystalSlots : 0;

    let x = base;
    x = applyCrystalPctToStat(x, pct[k] || 0, n, cfg.stackModeStats, roundFnStatDefault);

    let upPct = 0;
    for (const u of udefs) upPct += u.pct[k] || 0;
    if (upPct) x = x + roundStat(x * upPct, statRound);

    outStats[k] = x;
  }

  // Weapon dmg / mask
  let weapon = null;
  let weaponMaskBit = 0;
  if (isWeapon) {
    const baseWeapon = idef.baseWeaponDamage;
    if (!baseWeapon) throw new Error(`Weapon "${itemName}" missing baseWeaponDamage`);
    const n = crystalName ? cfg.crystalSlots : 0;

    const dmgPct = pct.weaponDamage || 0;
    let min = applyCrystalPctToWeaponDmg(baseWeapon.min, dmgPct, n, cfg.stackModeDmg, roundFnWep);
    let max = applyCrystalPctToWeaponDmg(baseWeapon.max, dmgPct, n, cfg.stackModeDmg, roundFnWep);

    let upDmgPct = 0;
    for (const u of udefs) upDmgPct += u.pct.weaponDamage || 0;
    if (upDmgPct) {
      min = min + roundWeaponDmg(min * upDmgPct, wepRound);
      max = max + roundWeaponDmg(max * upDmgPct, wepRound);
    }

    const weaponSkill = idef.skillType;
    const skill =
      weaponSkill === 'gunSkill'
        ? 0
        : weaponSkill === 'meleeSkill'
          ? 1
          : weaponSkill === 'projSkill'
            ? 2
            : 0;

    weapon = { name: itemName, min, max, skill };
    weaponMaskBit = skill === 0 ? 0b001 : skill === 1 ? 0b010 : 0b100;
  }

  return {
    itemName,
    tag,
    crystal: crystalName || null,
    upgrades,
    upgradesShort: upgradesShort.join('+'),
    stats: outStats,
    weaponMaskBit,
    weapon,
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

function partName(part) {
  if (!part) return '';
  return String(part.name || part.item || part.itemName || '').trim();
}

// Defender payloads historically used `upgrades: [<crystal>, ...]` to mean *crystals*.
// For weapons that support actual upgrades (Void Bow, Bio Gun Mk4, etc), you can either:
//   A) add upgrade names after the crystal in the same array:
//        upgrades: ['Amulet Crystal', 'Poisoned Tip']
//   B) or use explicit fields:
//        crystal: 'Amulet Crystal', upgrades: ['Poisoned Tip']
//   C) or use explicit upgrade fields:
//        upgrade1: 'Poisoned Tip', upgrade2: 'Laser Sight'
function partCrystal(part) {
  if (!part) return '';
  if (typeof part.crystal === 'string' && part.crystal) return part.crystal;
  if (typeof part.crystalName === 'string' && part.crystalName) return part.crystalName;
  if (Array.isArray(part.crystals) && part.crystals.length) return part.crystals[0];
  if (Array.isArray(part.upgrades) && part.upgrades.length) return part.upgrades[0];
  if (typeof part.upgrades === 'string' && part.upgrades) return part.upgrades;
  return '';
}

function partWeaponUpgrades(part) {
  if (!part) return ['', ''];

  let ups = [];
  if (Array.isArray(part.weaponUpgrades)) {
    ups = part.weaponUpgrades;
  } else if (Array.isArray(part.upgrades) && part.crystal) {
    // New-style: `crystal` carries the crystal, `upgrades` carries actual upgrades.
    ups = part.upgrades;
  } else if (Array.isArray(part.upgrades) && !part.crystal) {
    // Legacy-style: treat entries after the crystal as upgrades *only* if they match UpgradeDefs.
    ups = part.upgrades.slice(1).filter((u) => !!UpgradeDefs[u]);
  } else {
    const u1 = typeof part.upgrade1 === 'string' ? part.upgrade1 : '';
    const u2 = typeof part.upgrade2 === 'string' ? part.upgrade2 : '';
    ups = [u1, u2].filter(Boolean);
  }

  const u1 = (typeof part.upgrade1 === 'string' && part.upgrade1) || ups[0] || '';
  const u2 = (typeof part.upgrade2 === 'string' && part.upgrade2) || ups[1] || '';
  return [u1, u2];
}

function prefillVariantsFromDefenders(defenders, getV) {
  for (const def of defenders) {
    const p = def.payload;

    getV(partName(p.armor), partCrystal(p.armor));

    {
      const [u1, u2] = partWeaponUpgrades(p.weapon1);
      getV(partName(p.weapon1), partCrystal(p.weapon1), u1, u2);
    }
    {
      const [u1, u2] = partWeaponUpgrades(p.weapon2);
      getV(partName(p.weapon2), partCrystal(p.weapon2), u1, u2);
    }

    getV(partName(p.misc1), partCrystal(p.misc1));
    getV(partName(p.misc2), partCrystal(p.misc2));
  }
}

function compileDefender(def, variantCacheLocal) {
  const p = def.payload;
  const st = p.stats;

  const armorName = partName(p.armor);
  const m1Name = partName(p.misc1);
  const m2Name = partName(p.misc2);
  const w1Name = partName(p.weapon1);
  const w2Name = partName(p.weapon2);

  const armorCr = partCrystal(p.armor);
  const m1Cr = partCrystal(p.misc1);
  const m2Cr = partCrystal(p.misc2);

  const w1Cr = partCrystal(p.weapon1);
  const w2Cr = partCrystal(p.weapon2);
  const [w1u1, w1u2] = partWeaponUpgrades(p.weapon1);
  const [w2u1, w2u2] = partWeaponUpgrades(p.weapon2);

  const armorV = variantCacheLocal.get(variantKey(armorName, armorCr, '', ''));
  const w1V = variantCacheLocal.get(variantKey(w1Name, w1Cr, w1u1, w1u2));
  const w2V = variantCacheLocal.get(variantKey(w2Name, w2Cr, w2u1, w2u2));
  const m1V = variantCacheLocal.get(variantKey(m1Name, m1Cr, '', ''));
  const m2V = variantCacheLocal.get(variantKey(m2Name, m2Cr, '', ''));
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

  const defSk = BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1V.addDef + m2V.addDef;

  const armor = BASE.armor + armorV.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor, ARMOR_K);

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

  const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1v.addDef + m2v.addDef;

  const armor = BASE.armor + av.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor, ARMOR_K);

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
  prefillVariantsFromDefenders(defenderBuilds, getV);
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

  prefillVariantsFromDefenders(defenderBuilds, getV);
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
    watchRaw === '1' || watchRaw === 'true' || watchRaw === 'on' || watchRaw === 'yes';
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
    `LEGACY brute-force (v2.12.4) | defenders=${defenderBuilds.length} | trialsGate/def=${TRIALS_GATE} | trialsScreen/def=${TRIALS_SCREEN} | trialsConfirm/def=${TRIALS_CONFIRM}`,
  );
  console.log(
    `Crystals: slots=${CRYSTAL_SLOTS} stats=${CRYSTAL_STACK_STATS}/${STAT_ROUND_MODE} dmg=${CRYSTAL_STACK_DMG}/${WEP_DMG_ROUND_MODE}` +
      (ARMORSTAT_STACK_MODE === 'inherit' &&
      ARMORSTAT_ROUND_MODE === 'inherit' &&
      ARMORSTAT_SLOTS === 'inherit'
        ? ''
        : ` | armorStat=${ARMORSTAT_STACK_MODE === 'inherit' ? CRYSTAL_STACK_STATS : ARMORSTAT_STACK_MODE}` +
          `/${ARMORSTAT_ROUND_MODE === 'inherit' ? STAT_ROUND_MODE : ARMORSTAT_ROUND_MODE}` +
          `/${ARMORSTAT_SLOTS === 'inherit' ? CRYSTAL_SLOTS : ARMORSTAT_SLOTS}`),
  );
  if (MISC_NO_CRYSTAL_SKILL.size) {
    const typeStr = [...MISC_NO_CRYSTAL_TYPE_MULTS.entries()]
      .map(([k, v]) => (v ? `${k}=${v}` : k))
      .join(',');
    console.log(
      `No-crystal misc skill tweak: items=${[...MISC_NO_CRYSTAL_SKILL].join(', ')} types=${typeStr}${MISC_NO_CRYSTAL_ZERO_DEF ? ' +def' : ''}`,
    );
  }
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

    prefillVariantsFromDefenders(defenderBuilds, getV);
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
