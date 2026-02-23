// combat.ts (AssemblyScript)
// Flat, deterministic-seedable RNG + speed-ordered combat.
// Returns packed i64: (wins<<32) | exSum

// ---------------------
// RNG (sfc32) with persistent state
// ---------------------
let ra: u32 = 0x9e3779b9;
let rb: u32 = 0x243f6a88;
let rc: u32 = 0xb7e15162;
let rd: u32 = 0xdeadbeef;

export function seedRng(a: u32, b: u32, c: u32, d: u32): void {
  ra = a;
  rb = b;
  rc = c;
  rd = d;
}

// returns [0,1)
function rng01(): f64 {
  const t: i32 = (ra + rb) as i32;
  ra = rb ^ (rb >>> 9);
  rb = (rc + (rc << 3)) as u32;
  rc = (rc << 21) | (rc >>> 11);
  rd = (rd + 1) as u32;
  const r: i32 = (t + (rd as i32)) as i32;
  rc = (rc + (r as u32)) as u32;
  return ((r >>> 0) as f64) / 4294967296.0;
}

function randFloat(min: f64, max: f64): f64 {
  if (max <= min) return min;
  return min + rng01() * (max - min);
}

function rollVsFloat(off: i32, def: i32): bool {
  const o: i32 = off > 0 ? off : 0;
  const d: i32 = def > 0 ? def : 0;
  const x = randFloat((o as f64) / 4.0, o as f64) - randFloat((d as f64) / 4.0, d as f64);
  return x > 0.0;
}

function rollDamageRaw(min: i32, max: i32): i32 {
  // matches JS: Math.round(random(min,max))
  const v = randFloat(min as f64, max as f64);
  return Mathf.round(v as f32) as i32;
}

function attemptHitFast(
  attAcc: i32,
  defDodge: i32,
  attGun: i32,
  attMel: i32,
  attPrj: i32,
  defDefSk: i32,
  defArmorFactor: f64,
  attBaseDmg: i32,
  wMin: i32,
  wMax: i32,
  wSkill: i32,
): i32 {
  if (wMin == 0 && wMax == 0) return 0;

  if (!rollVsFloat(attAcc, defDodge)) return 0;

  const atkSkill: i32 = wSkill === 0 ? attGun : wSkill === 1 ? attMel : attPrj;
  if (!rollVsFloat(atkSkill, defDefSk)) return 0;

  const raw: i32 = rollDamageRaw(wMin, wMax) + attBaseDmg;

  // JS does: Math.round(raw * def.armorFactor)
  // We'll match that closely: round(f64) -> i32
  const scaled = (raw as f64) * defArmorFactor;
  return Mathf.round(scaled as f32) as i32;
}

function attackBoth(
  attAcc: i32,
  defDodge: i32,
  attGun: i32,
  attMel: i32,
  attPrj: i32,
  defDefSk: i32,
  defArmorFactor: f64,
  attBaseDmg: i32,
  w1min: i32,
  w1max: i32,
  w1skill: i32,
  w2min: i32,
  w2max: i32,
  w2skill: i32,
): i32 {
  return (
    attemptHitFast(
      attAcc,
      defDodge,
      attGun,
      attMel,
      attPrj,
      defDefSk,
      defArmorFactor,
      attBaseDmg,
      w1min,
      w1max,
      w1skill,
    ) +
    attemptHitFast(
      attAcc,
      defDodge,
      attGun,
      attMel,
      attPrj,
      defDefSk,
      defArmorFactor,
      attBaseDmg,
      w2min,
      w2max,
      w2skill,
    )
  );
}

function fightOnceWikiFast(
  p1hp: i32,
  p1speed: i32,
  p1acc: i32,
  p1dodge: i32,
  p1gun: i32,
  p1mel: i32,
  p1prj: i32,
  p1defSk: i32,
  p1armorFactor: f64,
  p1baseDmg: i32,
  p1w1min: i32,
  p1w1max: i32,
  p1w1skill: i32,
  p1w2min: i32,
  p1w2max: i32,
  p1w2skill: i32,
  p2hp: i32,
  p2speed: i32,
  p2acc: i32,
  p2dodge: i32,
  p2gun: i32,
  p2mel: i32,
  p2prj: i32,
  p2defSk: i32,
  p2armorFactor: f64,
  p2baseDmg: i32,
  p2w1min: i32,
  p2w1max: i32,
  p2w1skill: i32,
  p2w2min: i32,
  p2w2max: i32,
  p2w2skill: i32,
  MAX_TURNS: i32,
): i32 {
  let hp1 = p1hp;
  let hp2 = p2hp;

  const p1First = p1speed >= p2speed;

  // Map “first” and “second” to either p1 or p2 without heap allocations.
  let exchanges = 0;

  while (hp1 > 0 && hp2 > 0 && exchanges < MAX_TURNS) {
    exchanges++;

    if (p1First) {
      // p1 hits p2
      const dmgTo2 = attackBoth(
        p1acc,
        p2dodge,
        p1gun,
        p1mel,
        p1prj,
        p2defSk,
        p2armorFactor,
        p1baseDmg,
        p1w1min,
        p1w1max,
        p1w1skill,
        p1w2min,
        p1w2max,
        p1w2skill,
      );
      hp2 -= dmgTo2;

      if (hp1 > 0 && hp2 > 0) {
        // p2 retaliates
        const dmgTo1 = attackBoth(
          p2acc,
          p1dodge,
          p2gun,
          p2mel,
          p2prj,
          p1defSk,
          p1armorFactor,
          p2baseDmg,
          p2w1min,
          p2w1max,
          p2w1skill,
          p2w2min,
          p2w2max,
          p2w2skill,
        );
        hp1 -= dmgTo1;
      }
    } else {
      // p2 hits p1
      const dmgTo1 = attackBoth(
        p2acc,
        p1dodge,
        p2gun,
        p2mel,
        p2prj,
        p1defSk,
        p1armorFactor,
        p2baseDmg,
        p2w1min,
        p2w1max,
        p2w1skill,
        p2w2min,
        p2w2max,
        p2w2skill,
      );
      hp1 -= dmgTo1;

      if (hp1 > 0 && hp2 > 0) {
        // p1 retaliates
        const dmgTo2 = attackBoth(
          p1acc,
          p2dodge,
          p1gun,
          p1mel,
          p1prj,
          p2defSk,
          p2armorFactor,
          p1baseDmg,
          p1w1min,
          p1w1max,
          p1w1skill,
          p1w2min,
          p1w2max,
          p1w2skill,
        );
        hp2 -= dmgTo2;
      }
    }
  }

  let winnerIsP1: i32 = 0;

  if (hp1 > 0 && hp2 <= 0) winnerIsP1 = 1;
  else if (hp2 > 0 && hp1 <= 0) winnerIsP1 = 0;
  else if (hp1 > 0 && hp2 > 0) {
    if (hp1 == hp2) winnerIsP1 = p1First ? 1 : 0;
    else winnerIsP1 = hp1 > hp2 ? 1 : 0;
  } else {
    winnerIsP1 = p1First ? 1 : 0;
  }

  return (winnerIsP1 << 16) | (exchanges & 0xffff);
}

export function runMatchPackedWASM(
  p1hp: i32,
  p1speed: i32,
  p1acc: i32,
  p1dodge: i32,
  p1gun: i32,
  p1mel: i32,
  p1prj: i32,
  p1defSk: i32,
  p1armorFactor: f64,
  p1baseDmg: i32,
  p1w1min: i32,
  p1w1max: i32,
  p1w1skill: i32,
  p1w2min: i32,
  p1w2max: i32,
  p1w2skill: i32,
  p2hp: i32,
  p2speed: i32,
  p2acc: i32,
  p2dodge: i32,
  p2gun: i32,
  p2mel: i32,
  p2prj: i32,
  p2defSk: i32,
  p2armorFactor: f64,
  p2baseDmg: i32,
  p2w1min: i32,
  p2w1max: i32,
  p2w1skill: i32,
  p2w2min: i32,
  p2w2max: i32,
  p2w2skill: i32,
  trials: i32,
  MAX_TURNS: i32,
): i64 {
  let wins: i64 = 0;
  let exSum: i64 = 0;

  for (let i = 0; i < trials; i++) {
    const packed = fightOnceWikiFast(
      p1hp,
      p1speed,
      p1acc,
      p1dodge,
      p1gun,
      p1mel,
      p1prj,
      p1defSk,
      p1armorFactor,
      p1baseDmg,
      p1w1min,
      p1w1max,
      p1w1skill,
      p1w2min,
      p1w2max,
      p1w2skill,
      p2hp,
      p2speed,
      p2acc,
      p2dodge,
      p2gun,
      p2mel,
      p2prj,
      p2defSk,
      p2armorFactor,
      p2baseDmg,
      p2w1min,
      p2w1max,
      p2w1skill,
      p2w2min,
      p2w2max,
      p2w2skill,
      MAX_TURNS,
    );

    // packed: (winnerIsP1 << 16) | exchanges
    wins += ((packed >>> 16) & 1) as i64;
    exSum += (packed & 0xffff) as i64;
  }

  // Return packed i64: (wins<<32) | exSum
  return (wins << 32) | (exSum & 0xffffffff);
}