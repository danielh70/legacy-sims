#!/usr/bin/env node
'use strict';

/**
 * main-verify.js
 *
 * Focus: verify one fixed attacker build vs a set of fixed defenders,
 * printing:
 * - win%, avgTurns, turns range
 * - damage ranges per action (post-armor)
 * - hit% (accuracy check)
 * - dmg% (overall chance to deal >0 damage)
 * - sGH% = dmg% / hit%  (skill-given-hit)
 *
 * Key change vs your previous logging confusion:
 * ✅ sGH is ALWAYS printed as (skill success GIVEN you already hit)
 *    i.e. sGH = dmg / hit
 *
 * ENV:
 *   LEGACY_TRIALS=20000
 *   LEGACY_SEED=1337
 *
 *   LEGACY_VERIFY_DEFENDERS="SG1 Split bombs,DL Gun Build 3"
 *
 *   LEGACY_SHOW_ATTEMPTS=1         (prints attempt counts for hit/dmg)
 *
 *   LEGACY_ARMOR_MOD=280           (wiki-ish; you’ve been effectively using 280)
 *   LEGACY_ROLL_MODE=float|int     (float default)
 *   LEGACY_DMG_ROLL=roundfloat|int (roundfloat default)
 *
 * NOTE:
 * - This harness assumes you already know the compiled stats + weapon ranges
 *   for the attacker and defenders (the stuff you were printing in your debug).
 * - Replace / adjust the BUILD objects below if your compiled values differ.
 */

// =====================
// ENV / SETTINGS
// =====================
const TRIALS = Math.max(1, parseInt(process.env.LEGACY_TRIALS || '20000', 10));
const SEED = parseInt(process.env.LEGACY_SEED || '1337', 10) >>> 0 || 1337;

const ARMOR_MOD = Math.max(1, parseFloat(process.env.LEGACY_ARMOR_MOD || '280'));

const ROLL_MODE = (process.env.LEGACY_ROLL_MODE || 'float').toLowerCase(); // float|int
const DMG_ROLL = (process.env.LEGACY_DMG_ROLL || 'roundfloat').toLowerCase(); // roundfloat|int
const SHOW_ATTEMPTS = (process.env.LEGACY_SHOW_ATTEMPTS || '') === '1';

const VERIFY_FILTER_RAW = (process.env.LEGACY_VERIFY_DEFENDERS || '').trim();
const VERIFY_FILTER = VERIFY_FILTER_RAW
  ? new Set(
      VERIFY_FILTER_RAW.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

// =====================
// RNG (xorshift32)
// =====================
let RNG_STATE = SEED >>> 0;
function randU32() {
  // xorshift32
  let x = RNG_STATE;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x >>>= 0;
  x ^= x << 5;
  x >>>= 0;
  RNG_STATE = x >>> 0;
  return RNG_STATE;
}
function rand01() {
  return randU32() / 0x100000000;
}
function randFloat(min, max) {
  return min + (max - min) * rand01();
}
function randInt(min, max) {
  // inclusive
  if (max <= min) return min;
  const r = randU32() >>> 0;
  return min + (r % (max - min + 1));
}

// =====================
// ROLLS (wiki-ish)
// =====================
function rollStat(stat) {
  const lo = stat / 4;
  const hi = stat;
  if (ROLL_MODE === 'int') {
    return randInt(Math.ceil(lo), Math.floor(hi));
  }
  return randFloat(lo, hi);
}

function passCheck(off, def) {
  return rollStat(off) - rollStat(def) > 0;
}

function rollDamage(minD, maxD) {
  if (DMG_ROLL === 'int') {
    return randInt(minD, maxD);
  }
  // wiki: round(random(min,max))
  return Math.round(randFloat(minD, maxD));
}

function armorFactor(armor) {
  return ARMOR_MOD / (ARMOR_MOD + Math.max(0, armor));
}

function applyArmorSum(rawSum, armor) {
  return Math.round(rawSum * armorFactor(armor));
}

// =====================
// BUILD STRUCTURES (precompiled)
// =====================
// skillType: 'gun' | 'prj' | 'mel'
function skillFor(type, stats) {
  if (type === 'gun') return stats.gun;
  if (type === 'prj') return stats.prj;
  return stats.mel;
}

function makeCombatant(name, stats, w1, w2) {
  return { name, stats, w1, w2 };
}

// ---- YOUR ATTACKER (from your printed header) ----
// If your weapon ranges differ, update w1/w2 min/max + type here.
const ATTACKER = makeCombatant(
  'Attacker',
  {
    hp: 600,
    speed: 226,
    acc: 203,
    dodge: 156,
    gun: 580,
    prj: 580,
    mel: 734,
    defSkill: 862,
    armor: 89,
  },
  { name: 'W1', type: 'mel', min: 118, max: 131 },
  { name: 'W2', type: 'mel', min: 62, max: 75 },
);

// ---- DEFENDERS ----
// For SG1 Split bombs, you *already had these exact compiled stats in your debug*.
const DEFENDERS = [
  makeCombatant(
    'SG1 Split bombs',
    {
      hp: 865,
      speed: 200,
      acc: 152,
      dodge: 190,
      gun: 701,
      prj: 826,
      mel: 580,
      defSkill: 866,
      armor: 89,
    },
    { name: 'Split Crystal Bombs T2', type: 'prj', min: 69, max: 108 },
    { name: 'Split Crystal Bombs T2', type: 'prj', min: 69, max: 108 },
  ),

  // These 5 are placeholders unless you paste the compiled numbers from your current script.
  // The harness (and the sGH math) is correct either way.
  // ✅ Recommendation: run your current main.js once with a "dump compiled" flag,
  // then paste exact stats/min/max in here.

  makeCombatant(
    'DL Gun Build 2',
    {
      hp: 865,
      speed: 321,
      acc: 220,
      dodge: 200,
      gun: 701,
      prj: 580,
      mel: 580,
      defSkill: 866,
      armor: 70,
    },
    { name: 'Rift Gun', type: 'gun', min: 65, max: 90 },
    { name: 'Q15 Gun', type: 'gun', min: 80, max: 110 },
  ),

  makeCombatant(
    'DL Gun Build 3',
    {
      hp: 865,
      speed: 201,
      acc: 230,
      dodge: 200,
      gun: 750,
      prj: 580,
      mel: 580,
      defSkill: 866,
      armor: 70,
    },
    { name: 'Rift Gun', type: 'gun', min: 65, max: 90 },
    { name: 'DB Sniper', type: 'gun', min: 95, max: 120 },
  ),

  makeCombatant(
    'DL Gun Build 4',
    {
      hp: 865,
      speed: 201,
      acc: 225,
      dodge: 190,
      gun: 740,
      prj: 580,
      mel: 580,
      defSkill: 850,
      armor: 70,
    },
    { name: 'Rift Gun', type: 'gun', min: 65, max: 90 },
    { name: 'Q15 Gun', type: 'gun', min: 80, max: 110 },
  ),

  makeCombatant(
    'DL Gun Build 8',
    {
      hp: 865,
      speed: 201,
      acc: 220,
      dodge: 190,
      gun: 720,
      prj: 580,
      mel: 580,
      defSkill: 850,
      armor: 70,
    },
    { name: 'Rift Gun', type: 'gun', min: 65, max: 90 },
    { name: 'Q15 Gun', type: 'gun', min: 80, max: 110 },
  ),

  makeCombatant(
    'HF core/void',
    {
      hp: 865,
      speed: 201,
      acc: 210,
      dodge: 190,
      gun: 580,
      prj: 580,
      mel: 700,
      defSkill: 900,
      armor: 69,
    },
    { name: 'Core Staff', type: 'mel', min: 60, max: 80 },
    { name: 'Void Sword', type: 'mel', min: 90, max: 115 },
  ),
];

// in-game baselines you provided (10k trials)
const GAME = {
  'SG1 Split bombs': {
    times: 10000,
    attackerWins: 4878,
    defenderWins: 5122,
    averageTurns: 16.9629,
    attackerChances: { hit: 85, damage1: 36, damage2: 36 },
    defenderChances: { hit: 51, damage1: 45, damage2: 45 },
  },
  // If you want, paste your other 10k baselines here and it will print deltas too.
};

// =====================
// SIM CORE
// =====================
function simulateOneFight(att, def) {
  let hpA = att.stats.hp;
  let hpD = def.stats.hp;

  const aFirst = att.stats.speed > def.stats.speed;

  let turns = 0;

  // stats counters per weapon attempt
  const A = { w1: mkCounters(), w2: mkCounters(), dmgMin: Infinity, dmgMax: 0, dmgTotal: 0 };
  const D = {
    w1: mkCounters(),
    w2: mkCounters(),
    dmgMin: Infinity,
    dmgMax: 0,
    dmgMax: 0,
    dmgTotal: 0,
  };

  function doAction(src, dst, box) {
    // roll weapon1
    const d1 = weaponAttempt(src, dst, src.w1, box.w1);
    // roll weapon2
    const d2 = weaponAttempt(src, dst, src.w2, box.w2);

    const rawSum = d1.raw + d2.raw;
    const dealt = rawSum > 0 ? applyArmorSum(rawSum, dst.stats.armor) : 0;

    if (dealt > 0) {
      box.dmgTotal += dealt;
      if (dealt < box.dmgMin) box.dmgMin = dealt;
      if (dealt > box.dmgMax) box.dmgMax = dealt;
    }

    dst._hp -= dealt;
  }

  // attach mutable hp for inner function convenience
  att._hp = hpA;
  def._hp = hpD;

  // 200-turn cap like your setup
  while (turns < 200 && att._hp > 0 && def._hp > 0) {
    turns++;

    if (aFirst) {
      doAction(att, def, A);
      if (def._hp <= 0) break;
      doAction(def, att, D);
    } else {
      doAction(def, att, D);
      if (att._hp <= 0) break;
      doAction(att, def, A);
    }
  }

  // winner logic: higher remaining hp, tie -> first
  let winner = 0; // 1 attacker, -1 defender
  if (att._hp > 0 && def._hp <= 0) winner = 1;
  else if (def._hp > 0 && att._hp <= 0) winner = -1;
  else {
    if (att._hp > def._hp) winner = 1;
    else if (def._hp > att._hp) winner = -1;
    else winner = aFirst ? 1 : -1;
  }

  return { winner, turns, aFirst, A, D };
}

function mkCounters() {
  return { attempts: 0, hit: 0, dmg: 0, skillGivenHit: 0 };
}

function weaponAttempt(src, dst, weapon, c) {
  c.attempts++;

  // accuracy check
  if (!passCheck(src.stats.acc, dst.stats.dodge)) {
    return { raw: 0 };
  }
  c.hit++;

  // skill check (this is the thing your sGH is describing)
  const offSkill = skillFor(weapon.type, src.stats);
  const defSkill = dst.stats.defSkill;

  if (!passCheck(offSkill, defSkill)) {
    // "hit but no damage"
    return { raw: 0 };
  }
  c.skillGivenHit++;

  // damage roll (raw)
  const raw = rollDamage(weapon.min, weapon.max);
  if (raw > 0) c.dmg++;

  return { raw };
}

// =====================
// REPORTING
// =====================
function pct(n, d) {
  if (!d) return 0;
  return (100 * n) / d;
}
function pctR(n, d) {
  return Math.round(pct(n, d));
}
function sghPctR(dmgCount, hitCount) {
  if (!hitCount) return 0;
  return Math.round(100 * (dmgCount / hitCount));
}

function summarizeSide(side) {
  const w1 = side.w1,
    w2 = side.w2;
  return {
    hit1: pctR(w1.hit, w1.attempts),
    hit2: pctR(w2.hit, w2.attempts),

    dmg1: pctR(w1.dmg, w1.attempts),
    dmg2: pctR(w2.dmg, w2.attempts),

    // sGH = skillGivenHit / hits
    sgh1: sghPctR(w1.dmg, w1.hit), // dmg implies skill passed; same denominator you’re expecting
    sgh2: sghPctR(w2.dmg, w2.hit),

    attempts1: w1.attempts,
    attempts2: w2.attempts,
  };
}

function runOneMatchup(def) {
  // reset rng per matchup for repeatability
  RNG_STATE = SEED >>> 0;

  let aWins = 0,
    dWins = 0;
  let turnsTotal = 0;
  let tMin = Infinity,
    tMax = 0;
  let aFirstCount = 0;

  // aggregate counters
  const aggA = { w1: mkCounters(), w2: mkCounters(), dmgMin: Infinity, dmgMax: 0, dmgTotal: 0 };
  const aggD = { w1: mkCounters(), w2: mkCounters(), dmgMin: Infinity, dmgMax: 0, dmgTotal: 0 };

  for (let i = 0; i < TRIALS; i++) {
    const res = simulateOneFight(ATTACKER, def);

    if (res.aFirst) aFirstCount++;

    turnsTotal += res.turns;
    if (res.turns < tMin) tMin = res.turns;
    if (res.turns > tMax) tMax = res.turns;

    if (res.winner === 1) aWins++;
    else dWins++;

    // merge counters
    mergeAgg(aggA, res.A);
    mergeAgg(aggD, res.D);
  }

  const avgTurns = turnsTotal / TRIALS;

  const A = summarizeSide(aggA);
  const D = summarizeSide(aggD);

  const aDmgMin = isFinite(aggA.dmgMin) ? aggA.dmgMin : 0;
  const aDmgMax = aggA.dmgMax || 0;
  const dDmgMin = isFinite(aggD.dmgMin) ? aggD.dmgMin : 0;
  const dDmgMax = aggD.dmgMax || 0;

  console.log(`\n=== ${def.name} ===`);
  console.log(
    `Trials=${TRIALS} | A_win=${((100 * aWins) / TRIALS).toFixed(2)}% | AvgT=${avgTurns.toFixed(4)} | T=${tMin}-${tMax} | A_first=${((100 * aFirstCount) / TRIALS).toFixed(1)}%`,
  );
  console.log(
    `SIM A dmgRange=${aDmgMin}-${aDmgMax} | hit=${A.hit1}/${A.hit2} | dmg%=${A.dmg1}/${A.dmg2} | sGH(dmg|hit)=${A.sgh1}/${A.sgh2}${SHOW_ATTEMPTS ? ` | att=${A.attempts1}/${A.attempts2}` : ''}`,
  );
  console.log(
    `SIM D dmgRange=${dDmgMin}-${dDmgMax} | hit=${D.hit1}/${D.hit2} | dmg%=${D.dmg1}/${D.dmg2} | sGH(dmg|hit)=${D.sgh1}/${D.sgh2}${SHOW_ATTEMPTS ? ` | att=${D.attempts1}/${D.attempts2}` : ''}`,
  );

  const g = GAME[def.name];
  if (g) {
    const gA_sgh1 = Math.round(100 * (g.attackerChances.damage1 / g.attackerChances.hit));
    const gD_sgh1 = Math.round(100 * (g.defenderChances.damage1 / g.defenderChances.hit));

    console.log(
      `GAME A_win=${((100 * g.attackerWins) / g.times).toFixed(2)}% | AvgT=${g.averageTurns.toFixed(4)} | A_hit=${g.attackerChances.hit} dmg%=${g.attackerChances.damage1}/${g.attackerChances.damage2} sGH=${gA_sgh1}`,
    );
    console.log(
      `GAME D_hit=${g.defenderChances.hit} dmg%=${g.defenderChances.damage1}/${g.defenderChances.damage2} sGH=${gD_sgh1}`,
    );
  }
}

function mergeAgg(dst, src) {
  for (const k of ['w1', 'w2']) {
    dst[k].attempts += src[k].attempts;
    dst[k].hit += src[k].hit;
    dst[k].dmg += src[k].dmg;
    dst[k].skillGivenHit += src[k].skillGivenHit;
  }
  dst.dmgTotal += src.dmgTotal;
  dst.dmgMin = Math.min(dst.dmgMin, src.dmgMin);
  dst.dmgMax = Math.max(dst.dmgMax, src.dmgMax);
}

// =====================
// MAIN
// =====================
console.log('=== LEGACY VERIFY (copy/paste output) ===');
console.log(
  `Seed=${SEED} | Trials=${TRIALS} | roll=${ROLL_MODE} | dmgRoll=${DMG_ROLL} | armorMod=${ARMOR_MOD}`,
);
console.log(`Filter=${VERIFY_FILTER_RAW || '(none)'}`);

for (const def of DEFENDERS) {
  if (VERIFY_FILTER && !VERIFY_FILTER.has(def.name)) continue;
  runOneMatchup(def);
}

console.log('\n=== END ===');
