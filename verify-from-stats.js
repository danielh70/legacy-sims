#!/usr/bin/env node
'use strict';

/**
 * verify-from-stats.js (calibration harness)
 *
 * Goal: Given already-derived total stats + weapon damage ranges, compute:
 *  - exact hit/skill probabilities (float or int roll modes)
 *  - displayed percentages (floor/round/ceil)
 *  - Monte Carlo win% with deterministic RNG option
 *
 * NEW: optional "FIT" mode that tries small "hidden per-weapon-slot" bonuses
 *      in steps of 3 (0/3/6) to see if it explains the deltas you’re seeing.
 *
 * Usage (example):
 *   LEGACY_TRIALS=250000 LEGACY_SEED=1337 LEGACY_DETERMINISTIC=1 \
 *   LEGACY_DISP_ROUND=floor \
 *   LEGACY_TARGET_WIN=48.78 \
 *   LEGACY_TARGET_A_HIT=85 LEGACY_TARGET_D_HIT=51 \
 *   LEGACY_TARGET_A_SK1=36 LEGACY_TARGET_A_SK2=36 \
 *   LEGACY_TARGET_D_SK1=45 LEGACY_TARGET_D_SK2=45 \
 *   LEGACY_FIT=1 \
 *   node verify-from-stats.js
 */

// -------------------------
// env helpers
// -------------------------
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
function envStr(name, def) {
  const v = process.env[name];
  return v === undefined || v === '' ? def : String(v);
}
function envBool(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return (
    v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes' || v.toLowerCase() === 'on'
  );
}

// -------------------------
// deterministic RNG (fast)
// -------------------------
function mix32(x) {
  x |= 0;
  x = (x ^ (x >>> 16)) | 0;
  x = Math.imul(x, 0x7feb352d) | 0;
  x = (x ^ (x >>> 15)) | 0;
  x = Math.imul(x, 0x846ca68b) | 0;
  x = (x ^ (x >>> 16)) | 0;
  return x | 0;
}
function makeRng(seed) {
  // xorshift32
  let s = seed >>> 0 || 1;
  return {
    u32() {
      s ^= (s << 13) >>> 0;
      s ^= (s >>> 17) >>> 0;
      s ^= (s << 5) >>> 0;
      return s >>> 0;
    },
    f() {
      // [0,1)
      return (this.u32() >>> 0) / 4294967296;
    },
  };
}

// -------------------------
// rounding helpers
// -------------------------
function roundBy(mode, x) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'ceil') return Math.ceil(x);
  return Math.round(x);
}
function dispPct(mode, prob01) {
  const v = prob01 * 100;
  return roundBy(mode, v);
}

// -------------------------
// exact probability P( U[a0,a1] > U[b0,b1] )
// -------------------------
function probUniformGreaterFloat(a0, a1, b0, b1) {
  const lenA = a1 - a0;
  const lenB = b1 - b0;
  if (lenA <= 0 || lenB <= 0) return 0;

  const lo0 = a0;
  const lo1 = Math.min(a1, b0);
  // FY(x)=0 here => contributes 0

  const mid0 = Math.max(a0, b0);
  const mid1 = Math.min(a1, b1);

  const hi0 = Math.max(a0, b1);
  const hi1 = a1;

  let area = 0;

  // mid: integral of (x-b0)/lenB dx
  if (mid1 > mid0) {
    const t0 = mid0 - b0;
    const t1 = mid1 - b0;
    area += (t1 * t1 - t0 * t0) / (2 * lenB);
  }

  // hi: FY(x)=1
  if (hi1 > hi0) {
    area += hi1 - hi0;
  }

  return area / lenA;
}

function probUniformGreaterInt(a0, a1, b0, b1) {
  // inclusive integer uniform
  const A0 = Math.ceil(a0),
    A1 = Math.floor(a1);
  const B0 = Math.ceil(b0),
    B1 = Math.floor(b1);
  if (A1 < A0 || B1 < B0) return 0;

  const nA = A1 - A0 + 1;
  const nB = B1 - B0 + 1;

  let wins = 0;
  for (let x = A0; x <= A1; x++) {
    // count y in [B0,B1] with y < x
    const c = Math.max(0, Math.min(B1, x - 1) - B0 + 1);
    wins += c;
  }
  return wins / (nA * nB);
}

function hitProb(acc, dod, mode) {
  const a0 = acc / 4,
    a1 = acc;
  const b0 = dod / 4,
    b1 = dod;
  if (mode === 'int') return probUniformGreaterInt(a0, a1, b0, b1);
  return probUniformGreaterFloat(a0, a1, b0, b1);
}
function skillProb(off, def, mode) {
  const a0 = off / 4,
    a1 = off;
  const b0 = def / 4,
    b1 = def;
  if (mode === 'int') return probUniformGreaterInt(a0, a1, b0, b1);
  return probUniformGreaterFloat(a0, a1, b0, b1);
}

// -------------------------
// sim config (defaults to your SG1 bombs calibration numbers)
// -------------------------
const TRIALS = Math.max(1, envInt('LEGACY_TRIALS', 250000));
const MAX_TURNS = Math.max(1, envInt('LEGACY_MAX_TURNS', 200));
const SEED = envInt('LEGACY_SEED', 1337) >>> 0 || 1337;
const DETERMINISTIC = envBool('LEGACY_DETERMINISTIC', true);

const HIT_MODE = envStr('LEGACY_HIT_ROLL_MODE', 'float'); // float|int
const SKILL_MODE = envStr('LEGACY_SKILL_ROLL_MODE', 'float'); // float|int
const DISP_ROUND = envStr('LEGACY_DISP_ROUND', 'floor'); // floor|round|ceil

const LEVEL = envInt('LEGACY_LEVEL', 80);

// Armor: matches your factor armF=0.782396 when level=80, K=8, armor=89
const ARMOR_K = envFloat('LEGACY_ARMOR_K', 8);
const ARMOR_APPLY = envStr('LEGACY_ARMOR_APPLY', 'per_weapon'); // per_weapon|sum
const ARMOR_ROUND = envStr('LEGACY_ARMOR_ROUND', 'round'); // floor|round|ceil

const DMG_ROLL = envStr('LEGACY_DMG_ROLL', 'roundfloat'); // roundfloat|int

// displayed stats (what your script prints / what you think totals are)
const A = {
  hp: envInt('LEGACY_A_HP', 600),
  spd: envInt('LEGACY_A_SPD', 226),
  acc: envInt('LEGACY_A_ACC', 203),
  dod: envInt('LEGACY_A_DOD', 156),
  mel: envInt('LEGACY_A_MEL', 734),
  prj: envInt('LEGACY_A_PRJ', 580),
  gun: envInt('LEGACY_A_GUN', 580),
  def: envInt('LEGACY_A_DEF', 862),
  arm: envInt('LEGACY_A_ARM', 89),
};
const D = {
  hp: envInt('LEGACY_D_HP', 865),
  spd: envInt('LEGACY_D_SPD', 334),
  acc: envInt('LEGACY_D_ACC', 152),
  dod: envInt('LEGACY_D_DOD', 111),
  mel: envInt('LEGACY_D_MEL', 0),
  prj: envInt('LEGACY_D_PRJ', 826),
  gun: envInt('LEGACY_D_GUN', 0),
  def: envInt('LEGACY_D_DEF', 866),
  arm: envInt('LEGACY_D_ARM', 89),
};

// weapon setup (pre-armor damage ranges)
const A_W1 = {
  type: envStr('LEGACY_A_W1_TYPE', 'mel'),
  min: envInt('LEGACY_A_W1_MIN', 118),
  max: envInt('LEGACY_A_W1_MAX', 131),
};
const A_W2 = {
  type: envStr('LEGACY_A_W2_TYPE', 'mel'),
  min: envInt('LEGACY_A_W2_MIN', 62),
  max: envInt('LEGACY_A_W2_MAX', 75),
};
const D_W1 = {
  type: envStr('LEGACY_D_W1_TYPE', 'prj'),
  min: envInt('LEGACY_D_W1_MIN', 69),
  max: envInt('LEGACY_D_W1_MAX', 108),
};
const D_W2 = {
  type: envStr('LEGACY_D_W2_TYPE', 'prj'),
  min: envInt('LEGACY_D_W2_MIN', 69),
  max: envInt('LEGACY_D_W2_MAX', 108),
};

// targets (optional)
const TARGET_WIN = envFloat('LEGACY_TARGET_WIN', NaN);
const T_A_HIT = envInt('LEGACY_TARGET_A_HIT', -1);
const T_D_HIT = envInt('LEGACY_TARGET_D_HIT', -1);
const T_A_SK1 = envInt('LEGACY_TARGET_A_SK1', -1);
const T_A_SK2 = envInt('LEGACY_TARGET_A_SK2', -1);
const T_D_SK1 = envInt('LEGACY_TARGET_D_SK1', -1);
const T_D_SK2 = envInt('LEGACY_TARGET_D_SK2', -1);

const FIT = envBool('LEGACY_FIT', false);
const FIT_TRIALS = Math.max(5000, envInt('LEGACY_FIT_TRIALS', 40000));

// -------------------------
// hidden bonus hypothesis (per weapon equipped)
// -------------------------
function applyHiddenBonuses(stats, wCount, hAcc, hDef, hOff) {
  return {
    ...stats,
    acc: stats.acc + hAcc * wCount,
    def: stats.def + hDef * wCount,
    // apply to all offensive skills equally (simple knob).
    mel: stats.mel + hOff * wCount,
    prj: stats.prj + hOff * wCount,
    gun: stats.gun + hOff * wCount,
  };
}

function offSkillFor(weaponType, stats) {
  if (weaponType === 'gun') return stats.gun;
  if (weaponType === 'prj') return stats.prj;
  return stats.mel;
}

function armorFactor(armor) {
  // matches your observed armF when K=8, level=80, armor=89:
  // armF = (level*(K/2)) / (armor + level*(K/2))
  const base = LEVEL * (ARMOR_K / 2);
  return base / (armor + base);
}

function rollDamage(rng, min, max) {
  if (min >= max) return min;
  if (DMG_ROLL === 'int') {
    const r = rng.u32();
    const span = (max - min + 1) >>> 0;
    return min + (r % span);
  }
  // round(random(min,max)) where random is uniform float
  const x = min + rng.f() * (max - min);
  return Math.round(x);
}

function applyArmorOnce(dmg, defArmor) {
  const f = armorFactor(defArmor);
  return roundBy(ARMOR_ROUND, dmg * f);
}

function oneWeaponAttack(rng, atk, def, wep) {
  // hit roll
  const hit =
    HIT_MODE === 'int'
      ? // int mode: inclusive integers
        (() => {
          const a0 = Math.ceil(atk.acc / 4),
            a1 = Math.floor(atk.acc);
          const b0 = Math.ceil(def.dod / 4),
            b1 = Math.floor(def.dod);
          const rx = a0 + (rng.u32() % (a1 - a0 + 1));
          const ry = b0 + (rng.u32() % (b1 - b0 + 1));
          return rx - ry > 0;
        })()
      : (() => {
          const rx = atk.acc / 4 + rng.f() * (atk.acc - atk.acc / 4);
          const ry = def.dod / 4 + rng.f() * (def.dod - def.dod / 4);
          return rx - ry > 0;
        })();

  if (!hit) return 0;

  // skill roll (weapon-specific offensive skill)
  const off = offSkillFor(wep.type, atk);
  const skillOk =
    SKILL_MODE === 'int'
      ? (() => {
          const a0 = Math.ceil(off / 4),
            a1 = Math.floor(off);
          const b0 = Math.ceil(def.def / 4),
            b1 = Math.floor(def.def);
          const rx = a0 + (rng.u32() % (a1 - a0 + 1));
          const ry = b0 + (rng.u32() % (b1 - b0 + 1));
          return rx - ry > 0;
        })()
      : (() => {
          const rx = off / 4 + rng.f() * (off - off / 4);
          const ry = def.def / 4 + rng.f() * (def.def - def.def / 4);
          return rx - ry > 0;
        })();

  if (!skillOk) return 0;

  const raw = rollDamage(rng, wep.min, wep.max);
  return raw; // armor applied at turn-level depending on ARMOR_APPLY
}

function simulateMatchup(trials, hA, hD) {
  const Aeff = applyHiddenBonuses(A, 2, hA.acc, hA.def, hA.off);
  const Deff = applyHiddenBonuses(D, 2, hD.acc, hD.def, hD.off);

  const A_first = Aeff.spd > Deff.spd || Aeff.spd === Deff.spd; // tie -> attacker first
  const fA = armorFactor(Deff.arm);
  const fD = armorFactor(Aeff.arm);

  let aWins = 0;
  let totalTurns = 0;
  let minT = Infinity,
    maxT = -Infinity;

  // rng ranges (post-armor) for nonzero damage packets (rough)
  let rngAmin = Infinity,
    rngAmax = -Infinity;
  let rngDmin = Infinity,
    rngDmax = -Infinity;

  // display-ish chances (computed from exact probs below; sim counts not needed)
  for (let i = 0; i < trials; i++) {
    const baseSeed = DETERMINISTIC
      ? mix32((SEED ^ mix32(i)) | 0) >>> 0
      : (Math.random() * 0xffffffff) >>> 0;
    const rng = makeRng(baseSeed);

    let hpA = Aeff.hp;
    let hpD = Deff.hp;

    let turns = 0;
    while (turns < MAX_TURNS && hpA > 0 && hpD > 0) {
      turns++;

      // actor turn helper
      const act = (atk, def, w1, w2, defArmor, armorF, track) => {
        // do weapon1 then weapon2 (if target alive)
        let d1 = oneWeaponAttack(rng, atk, def, w1);
        if (def.hp_dummy > 0) {
        } // noop

        if (ARMOR_APPLY === 'sum') {
          // sum raw then apply armor once
          let d2 = 0;
          if (def._hp > 0) d2 = oneWeaponAttack(rng, atk, def, w2);
          const rawSum = d1 + d2;
          const post = applyArmorOnce(rawSum, defArmor);
          if (post > 0) {
            track.min = Math.min(track.min, post);
            track.max = Math.max(track.max, post);
          }
          return post;
        } else {
          // per weapon armor
          const p1 = d1 > 0 ? applyArmorOnce(d1, defArmor) : 0;
          let p2 = 0;
          // apply weapon2 only if target alive after p1
          if (def._hp - p1 > 0) {
            const d2 = oneWeaponAttack(rng, atk, def, w2);
            p2 = d2 > 0 ? applyArmorOnce(d2, defArmor) : 0;
          }
          const post = p1 + p2;
          if (post > 0) {
            track.min = Math.min(track.min, post);
            track.max = Math.max(track.max, post);
          }
          return post;
        }
      };

      // We need a tiny wrapper to allow weapon2 condition based on remaining HP
      // without duplicating logic.
      if (A_first) {
        // A attacks
        const dTrackA = { min: rngAmin, max: rngAmax };
        const defWrapD = { ...Deff, _hp: hpD };
        const atkWrapA = { ...Aeff };
        const dmgA =
          ARMOR_APPLY === 'sum'
            ? (() => {
                const d1 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W1);
                const d2 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W2);
                const post = applyArmorOnce(d1 + d2, Deff.arm);
                if (post > 0) {
                  dTrackA.min = Math.min(dTrackA.min, post);
                  dTrackA.max = Math.max(dTrackA.max, post);
                }
                return post;
              })()
            : (() => {
                const d1 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W1);
                const p1 = d1 > 0 ? applyArmorOnce(d1, Deff.arm) : 0;
                let p2 = 0;
                if (hpD - p1 > 0) {
                  const d2 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W2);
                  p2 = d2 > 0 ? applyArmorOnce(d2, Deff.arm) : 0;
                }
                const post = p1 + p2;
                if (post > 0) {
                  dTrackA.min = Math.min(dTrackA.min, post);
                  dTrackA.max = Math.max(dTrackA.max, post);
                }
                return post;
              })();
        hpD -= dmgA;
        rngAmin = dTrackA.min;
        rngAmax = dTrackA.max;
        if (hpD <= 0) break;

        // D attacks
        const dTrackD = { min: rngDmin, max: rngDmax };
        const defWrapA = { ...Aeff, _hp: hpA };
        const atkWrapD = { ...Deff };
        const dmgD =
          ARMOR_APPLY === 'sum'
            ? (() => {
                const d1 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W1);
                const d2 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W2);
                const post = applyArmorOnce(d1 + d2, Aeff.arm);
                if (post > 0) {
                  dTrackD.min = Math.min(dTrackD.min, post);
                  dTrackD.max = Math.max(dTrackD.max, post);
                }
                return post;
              })()
            : (() => {
                const d1 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W1);
                const p1 = d1 > 0 ? applyArmorOnce(d1, Aeff.arm) : 0;
                let p2 = 0;
                if (hpA - p1 > 0) {
                  const d2 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W2);
                  p2 = d2 > 0 ? applyArmorOnce(d2, Aeff.arm) : 0;
                }
                const post = p1 + p2;
                if (post > 0) {
                  dTrackD.min = Math.min(dTrackD.min, post);
                  dTrackD.max = Math.max(dTrackD.max, post);
                }
                return post;
              })();
        hpA -= dmgD;
        rngDmin = dTrackD.min;
        rngDmax = dTrackD.max;
      } else {
        // D attacks first
        const dTrackD = { min: rngDmin, max: rngDmax };
        const defWrapA = { ...Aeff, _hp: hpA };
        const atkWrapD = { ...Deff };
        const dmgD =
          ARMOR_APPLY === 'sum'
            ? (() => {
                const d1 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W1);
                const d2 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W2);
                const post = applyArmorOnce(d1 + d2, Aeff.arm);
                if (post > 0) {
                  dTrackD.min = Math.min(dTrackD.min, post);
                  dTrackD.max = Math.max(dTrackD.max, post);
                }
                return post;
              })()
            : (() => {
                const d1 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W1);
                const p1 = d1 > 0 ? applyArmorOnce(d1, Aeff.arm) : 0;
                let p2 = 0;
                if (hpA - p1 > 0) {
                  const d2 = oneWeaponAttack(rng, atkWrapD, defWrapA, D_W2);
                  p2 = d2 > 0 ? applyArmorOnce(d2, Aeff.arm) : 0;
                }
                const post = p1 + p2;
                if (post > 0) {
                  dTrackD.min = Math.min(dTrackD.min, post);
                  dTrackD.max = Math.max(dTrackD.max, post);
                }
                return post;
              })();
        hpA -= dmgD;
        rngDmin = dTrackD.min;
        rngDmax = dTrackD.max;
        if (hpA <= 0) break;

        // A attacks
        const dTrackA = { min: rngAmin, max: rngAmax };
        const defWrapD = { ...Deff, _hp: hpD };
        const atkWrapA = { ...Aeff };
        const dmgA =
          ARMOR_APPLY === 'sum'
            ? (() => {
                const d1 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W1);
                const d2 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W2);
                const post = applyArmorOnce(d1 + d2, Deff.arm);
                if (post > 0) {
                  dTrackA.min = Math.min(dTrackA.min, post);
                  dTrackA.max = Math.max(dTrackA.max, post);
                }
                return post;
              })()
            : (() => {
                const d1 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W1);
                const p1 = d1 > 0 ? applyArmorOnce(d1, Deff.arm) : 0;
                let p2 = 0;
                if (hpD - p1 > 0) {
                  const d2 = oneWeaponAttack(rng, atkWrapA, defWrapD, A_W2);
                  p2 = d2 > 0 ? applyArmorOnce(d2, Deff.arm) : 0;
                }
                const post = p1 + p2;
                if (post > 0) {
                  dTrackA.min = Math.min(dTrackA.min, post);
                  dTrackA.max = Math.max(dTrackA.max, post);
                }
                return post;
              })();
        hpD -= dmgA;
        rngAmin = dTrackA.min;
        rngAmax = dTrackA.max;
      }
    }

    totalTurns += turns;
    minT = Math.min(minT, turns);
    maxT = Math.max(maxT, turns);

    // decide winner
    if (hpA > 0 && hpD <= 0) aWins++;
    else if (hpA > 0 && hpD > 0) {
      // max turns reached -> higher HP wins, tie breaks to first attacker
      if (hpA > hpD) aWins++;
      else if (hpA === hpD && A_first) aWins++;
    }
  }

  return {
    Aeff,
    Deff,
    A_first,
    winPct: (aWins / trials) * 100,
    avgT: totalTurns / trials,
    minT,
    maxT,
    rngAmin: rngAmin === Infinity ? 0 : rngAmin,
    rngAmax: rngAmax === -Infinity ? 0 : rngAmax,
    rngDmin: rngDmin === Infinity ? 0 : rngDmin,
    rngDmax: rngDmax === -Infinity ? 0 : rngDmax,
  };
}

function exactReport(hA, hD) {
  const Aeff = applyHiddenBonuses(A, 2, hA.acc, hA.def, hA.off);
  const Deff = applyHiddenBonuses(D, 2, hD.acc, hD.def, hD.off);

  const pA_hit = hitProb(Aeff.acc, Deff.dod, HIT_MODE);
  const pD_hit = hitProb(Deff.acc, Aeff.dod, HIT_MODE);

  const pA_sk1 = skillProb(offSkillFor(A_W1.type, Aeff), Deff.def, SKILL_MODE);
  const pA_sk2 = skillProb(offSkillFor(A_W2.type, Aeff), Deff.def, SKILL_MODE);
  const pD_sk1 = skillProb(offSkillFor(D_W1.type, Deff), Aeff.def, SKILL_MODE);
  const pD_sk2 = skillProb(offSkillFor(D_W2.type, Deff), Aeff.def, SKILL_MODE);

  const disp = {
    A_hit: dispPct(DISP_ROUND, pA_hit),
    D_hit: dispPct(DISP_ROUND, pD_hit),
    A_sk1: dispPct(DISP_ROUND, pA_sk1),
    A_sk2: dispPct(DISP_ROUND, pA_sk2),
    D_sk1: dispPct(DISP_ROUND, pD_sk1),
    D_sk2: dispPct(DISP_ROUND, pD_sk2),
    A_ov1: dispPct(DISP_ROUND, pA_hit * pA_sk1),
    A_ov2: dispPct(DISP_ROUND, pA_hit * pA_sk2),
    D_ov1: dispPct(DISP_ROUND, pD_hit * pD_sk1),
    D_ov2: dispPct(DISP_ROUND, pD_hit * pD_sk2),
  };

  return { Aeff, Deff, probs: { pA_hit, pD_hit, pA_sk1, pA_sk2, pD_sk1, pD_sk2 }, disp };
}

function printHeader() {
  console.log('=== VERIFY-FROM-STATS (calibration harness) ===');
  console.log(
    `Trials=${TRIALS} MAX_TURNS=${MAX_TURNS} seed=${SEED} det=${DETERMINISTIC ? 'ON' : 'OFF'}`,
  );
  console.log(`Rolls: HIT=${HIT_MODE} SKILL=${SKILL_MODE} | DISP=${DISP_ROUND}`);
  console.log(
    `Armor: level=${LEVEL} K=${ARMOR_K} apply=${ARMOR_APPLY} armorRound=${ARMOR_ROUND} | dmgRoll=${DMG_ROLL}`,
  );
  console.log('');
}

function printStats(label, s) {
  console.log(
    `${label}: HP=${s.hp} Spd=${s.spd} Acc=${s.acc} Dod=${s.dod} Mel=${s.mel} Prj=${s.prj} Gun=${s.gun} Def=${s.def} Arm=${s.arm} (armF=${armorFactor(s.arm).toFixed(6)})`,
  );
}

function scoreAgainstTargets(disp, winPct) {
  let e = 0;
  function add(t, v) {
    if (t < 0) return;
    const d = v - t;
    e += d * d;
  }
  add(T_A_HIT, disp.A_hit);
  add(T_D_HIT, disp.D_hit);
  add(T_A_SK1, disp.A_sk1);
  add(T_A_SK2, disp.A_sk2);
  add(T_D_SK1, disp.D_sk1);
  add(T_D_SK2, disp.D_sk2);

  if (Number.isFinite(TARGET_WIN)) {
    const d = winPct - TARGET_WIN;
    e += d * d * 4; // weight win% a bit more
  }
  return e;
}

function main() {
  printHeader();

  // baseline (no hidden bonuses)
  const h0 = { acc: 0, def: 0, off: 0 };
  const rep0 = exactReport(h0, h0);

  printStats('A (display)', A);
  printStats('D (display)', D);
  console.log(
    `A weapons: w1=${A_W1.type}(${A_W1.min}-${A_W1.max}) w2=${A_W2.type}(${A_W2.min}-${A_W2.max})`,
  );
  console.log(
    `D weapons: w1=${D_W1.type}(${D_W1.min}-${D_W1.max}) w2=${D_W2.type}(${D_W2.min}-${D_W2.max})`,
  );
  console.log('');

  console.log('--- EXACT PROBS (using displayed totals) ---');
  console.log(`A_hit prob=${(rep0.probs.pA_hit * 100).toFixed(4)}% | disp=${rep0.disp.A_hit}`);
  console.log(`D_hit prob=${(rep0.probs.pD_hit * 100).toFixed(4)}% | disp=${rep0.disp.D_hit}`);
  console.log(
    `A_skill(w1) prob=${(rep0.probs.pA_sk1 * 100).toFixed(4)}% | disp=${rep0.disp.A_sk1}`,
  );
  console.log(
    `A_skill(w2) prob=${(rep0.probs.pA_sk2 * 100).toFixed(4)}% | disp=${rep0.disp.A_sk2}`,
  );
  console.log(
    `D_skill(w1) prob=${(rep0.probs.pD_sk1 * 100).toFixed(4)}% | disp=${rep0.disp.D_sk1}`,
  );
  console.log(
    `D_skill(w2) prob=${(rep0.probs.pD_sk2 * 100).toFixed(4)}% | disp=${rep0.disp.D_sk2}`,
  );
  console.log('');

  // optional fitting
  let best = null;

  if (FIT) {
    console.log('--- FIT MODE: searching hidden per-weapon bonuses in {0,3,6} ---');
    console.log('Knobs: A(acc,def,off) and D(acc,def,off), each applied per weapon (2 weapons).');
    console.log(`Fit trials per candidate=${FIT_TRIALS}`);
    console.log('');

    const steps = [0, 3, 6];
    // keep it small: most of your “smell” is acc/def, off often doesn’t need changing
    // but we’ll still allow it; grid stays manageable.
    for (const aAcc of steps)
      for (const aDef of steps)
        for (const aOff of [0, 3]) {
          for (const dAcc of steps)
            for (const dDef of steps)
              for (const dOff of [0, 3]) {
                const hA = { acc: aAcc, def: aDef, off: aOff };
                const hD = { acc: dAcc, def: dDef, off: dOff };

                const rep = exactReport(hA, hD);
                const sim = simulateMatchup(FIT_TRIALS, hA, hD);
                const sc = scoreAgainstTargets(rep.disp, sim.winPct);

                if (!best || sc < best.score) {
                  best = { score: sc, hA, hD, rep, sim };
                }
              }
        }

    console.log('BEST FIT (coarse) =>');
    console.log(`  A hidden per-weapon: +acc${best.hA.acc} +def${best.hA.def} +off${best.hA.off}`);
    console.log(`  D hidden per-weapon: +acc${best.hD.acc} +def${best.hD.def} +off${best.hD.off}`);
    console.log(
      `  fitScore=${best.score.toFixed(2)} | win@fitTrials=${best.sim.winPct.toFixed(2)}% (target=${Number.isFinite(TARGET_WIN) ? TARGET_WIN : 'n/a'})`,
    );
    console.log(
      `  disp: A_hit=${best.rep.disp.A_hit} D_hit=${best.rep.disp.D_hit} A_sk=${best.rep.disp.A_sk1}/${best.rep.disp.A_sk2} D_sk=${best.rep.disp.D_sk1}/${best.rep.disp.D_sk2}`,
    );
    console.log('');
  } else {
    best = { hA: h0, hD: h0, rep: rep0 };
  }

  // full sim using best (or baseline)
  console.log('--- SIM (using best/baseline hidden-bonus hypothesis) ---');
  const simFull = simulateMatchup(TRIALS, best.hA, best.hD);

  printStats('A (effective)', simFull.Aeff);
  printStats('D (effective)', simFull.Deff);
  console.log(`A_first=${simFull.A_first ? 'yes' : 'no'}`);
  console.log(
    `Win=${simFull.winPct.toFixed(2)}% AvgT=${simFull.avgT.toFixed(2)} [${simFull.minT}-${simFull.maxT}] | rngA=${simFull.rngAmin}-${simFull.rngAmax} rngD=${simFull.rngDmin}-${simFull.rngDmax}`,
  );

  const repFull = exactReport(best.hA, best.hD);
  console.log(
    `DISP A: hit=${repFull.disp.A_hit} dmg|hit=${repFull.disp.A_sk1}/${repFull.disp.A_sk2} overall=${repFull.disp.A_ov1}/${repFull.disp.A_ov2}`,
  );
  console.log(
    `DISP D: hit=${repFull.disp.D_hit} dmg|hit=${repFull.disp.D_sk1}/${repFull.disp.D_sk2} overall=${repFull.disp.D_ov1}/${repFull.disp.D_ov2}`,
  );
  console.log('=== END ===');
}

main();
