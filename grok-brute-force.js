#!/usr/bin/env node
'use strict';

// =====================
// LEGACY BUILD OPTIMIZER v2.5 (FULL BRUTE FORCE - 4 WORKERS, SAFE BUILD COUNT)
// =====================
// • 100% original ItemDefs, CrystalDefs, defenderBuilds, combat loop
// • 4 workers (full speed on your Quad-Core i7)
// • HP 400-600 step 25 + free stat points to acc/dodge (step 20)
// • No swapped duplicates
// • Expected runtime: 4-7 minutes

const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const SETTINGS = {
  LEVEL: 80,
  HP: 865,
  MAX_TURNS: 200,
  TRIALS: 250,
};

const LOCK_ONLY_AMULET = new Set([
  'Core Staff',
  'Rift Gun',
  'Void Axe',
  'Split Crystal Bombs T2',
  'Void Bow',
  'Scout Drones',
]);

// ===================== SHARED FUNCTIONS =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function randFloat(min, max) {
  if (max < min) return min;
  return Math.random() * (max - min) + min;
}
function rollVs(off, def) {
  off = Math.max(0, off);
  def = Math.max(0, def);
  return randFloat(off / 4, off) - randFloat(def / 4, def) > 0;
}
function rollWeaponRaw(w) {
  return Math.round(randFloat(w.weaponDamage.min, w.weaponDamage.max));
}
function computeDamageArmor(level, raw, defenderArmor) {
  const modifier = (clamp(level, 1, 80) * 7) / 2;
  return Math.round(raw * (modifier / (modifier + defenderArmor)));
}
function attemptHit(att, def, weapon) {
  if (!weapon) return 0;
  if (!rollVs(att.accuracy, def.dodge)) return 0;
  if (!rollVs(att[weapon.skillType], def.defSkill)) return 0;
  return computeDamageArmor(att.level, rollWeaponRaw(weapon), def.armor);
}
function attackWithBothWeapons(att, def) {
  return attemptHit(att, def, att.__weapon1) + attemptHit(att, def, att.__weapon2);
}
function fightOnceWiki(p1, p2) {
  let p1hp = p1.hp,
    p2hp = p2.hp;
  let first = p1.speed >= p2.speed ? p1 : p2;
  let second = first === p1 ? p2 : p1;
  let exchanges = 0;
  while (p1hp > 0 && p2hp > 0 && exchanges < SETTINGS.MAX_TURNS) {
    exchanges++;
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
  return { winnerIsP1, exchanges };
}

// ===================== BASE =====================
const BASE = {
  hp: SETTINGS.HP,
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

// ===================== CRYSTALS + ITEMS (100% original) =====================
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

function makeCrystal(name) {
  const def = CrystalDefs[name];
  if (!def) throw new Error(`Unknown crystal: ${name}`);
  return { name, ...def };
}

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

// ===================== DEFENDER BUILDS (100% original) =====================
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
      misc2: makeItem('Bio Spinal Enhancer', all('Perfect Orange Crystal', 4)),
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

// ===================== BUILD FUNCTIONS =====================
const itemBonusCache = new Map();
function itemKey(item) {
  return `${item.name}|${item.sockets.map((s) => s.name).join(',')}`;
}
function applyItemBonuses(item) {
  const key = itemKey(item);
  if (itemBonusCache.has(key)) return itemBonusCache.get(key);
  const pctMap = {};
  for (const c of item.sockets)
    for (const [k, v] of Object.entries(c.pct || {})) pctMap[k] = (pctMap[k] || 0) + v;
  const stats = { ...item.flatStats };
  for (const k in stats) stats[k] += Math.ceil(stats[k] * (pctMap[k] || 0));
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
function applyBuild(base, equipped, extraAcc = 0, extraDodge = 0) {
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
  out.accuracy += extraAcc;
  out.dodge += extraDodge;
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

// ===================== ATTACKER GENERATOR =====================
const armorOptions = [
  { name: 'SG1 Armor', crystal: 'Perfect Pink Crystal', label: 'SG1-Pink' },
  { name: 'SG1 Armor', crystal: 'Abyss Crystal', label: 'SG1-Abyss' },
  { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', label: 'DL-Abyss' },
  { name: 'Hellforged Armor', crystal: 'Cabrusion Crystal', label: 'HF-Cabr' },
];

const meleeWeaponNames = ['Crystal Maul', 'Void Sword', 'Scythe T2', 'Core Staff', 'Void Axe'];
const miscTypes = [
  'Bio Spinal Enhancer',
  'Scout Drones',
  'Droid Drone',
  'Orphic Amulet',
  'Projector Bots',
  'Recon Drones',
];

const allowedCrystalsForMisc = {
  'Bio Spinal Enhancer': ['Perfect Pink Crystal', 'Perfect Orange Crystal'],
  'Scout Drones': ['Amulet Crystal'],
  'Droid Drone': ['Amulet Crystal', 'Perfect Orange Crystal'],
  'Orphic Amulet': ['Amulet Crystal', 'Perfect Orange Crystal'],
  'Projector Bots': ['Amulet Crystal', 'Perfect Pink Crystal', 'Perfect Orange Crystal'],
  'Recon Drones': ['Amulet Crystal', 'Perfect Orange Crystal'],
};

function generateAttackerCandidates() {
  const candidates = [];
  const seen = new Set();
  const hpOptions = [];
  for (let hp = 400; hp <= 600; hp += 25) hpOptions.push(hp);

  for (const hp of hpOptions) {
    const freePoints = Math.floor((865 - hp) / 5);
    for (let extraAcc = 0; extraAcc <= freePoints; extraAcc += 20) {
      const extraDodge = freePoints - extraAcc;
      const statLabel = `HP${hp}Acc${extraAcc}Dod${extraDodge}`;

      for (const arm of armorOptions) {
        for (const w1n of meleeWeaponNames) {
          const w1Crystals = LOCK_ONLY_AMULET.has(w1n)
            ? ['Amulet Crystal']
            : ['Amulet Crystal', 'Perfect Fire Crystal'];
          for (const w1c of w1Crystals) {
            for (const w2n of meleeWeaponNames) {
              const w2Crystals = LOCK_ONLY_AMULET.has(w2n)
                ? ['Amulet Crystal']
                : ['Amulet Crystal', 'Perfect Fire Crystal'];
              for (const w2c of w2Crystals) {
                let wa = { n: w1n, c: w1c };
                let wb = { n: w2n, c: w2c };
                if (wa.n + wa.c > wb.n + wb.c) [wa, wb] = [wb, wa];

                for (const m1 of miscTypes) {
                  const c1List = allowedCrystalsForMisc[m1];
                  for (const c1 of c1List) {
                    for (const m2 of miscTypes) {
                      const c2List = allowedCrystalsForMisc[m2];
                      for (const c2 of c2List) {
                        let ma = { n: m1, c: c1 };
                        let mb = { n: m2, c: c2 };
                        if (ma.n + ma.c > mb.n + mb.c) [ma, mb] = [mb, ma];

                        const key = `${arm.label}|${wa.n}|${wa.c}|${wb.n}|${wb.c}|${ma.n}|${ma.c}|${mb.n}|${mb.c}|${hp}|${extraAcc}|${extraDodge}`;
                        if (seen.has(key)) continue;
                        seen.add(key);

                        const shortW1 = wa.n.substring(0, 8);
                        const shortW2 = wb.n.substring(0, 8);
                        const shortM1 = ma.n.substring(0, 4);
                        const shortC1 =
                          ma.c === 'Amulet Crystal'
                            ? 'Amu'
                            : ma.c === 'Perfect Pink Crystal'
                              ? 'Pink'
                              : 'Orng';
                        const shortM2 = mb.n.substring(0, 4);
                        const shortC2 =
                          mb.c === 'Amulet Crystal'
                            ? 'Amu'
                            : mb.c === 'Perfect Pink Crystal'
                              ? 'Pink'
                              : 'Orng';

                        const buildName = `${arm.label} | ${shortW1}-${wa.c.substring(0, 4)} + ${shortW2}-${wb.c.substring(0, 4)} | ${shortM1}${shortC1}+${shortM2}${shortC2} | ${statLabel}`;

                        candidates.push({
                          name: buildName,
                          hp,
                          extraAcc,
                          extraDodge,
                          equipped: {
                            armor: makeItem(arm.name, all(arm.crystal, 4)),
                            weapon1: makeItem(wa.n, all(wa.c, 4)),
                            weapon2: makeItem(wb.n, all(wb.c, 4)),
                            misc1: makeItem(ma.n, all(ma.c, 4)),
                            misc2: makeItem(mb.n, all(mb.c, 4)),
                          },
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return candidates;
}

// ===================== WORKER + MAIN =====================
if (!isMainThread) {
  const { attChunk, defenderPre, trials } = workerData;
  const chunkResults = [];
  for (const { name, att } of attChunk) {
    let sumWin = 0,
      minWin = 100,
      sumEx = 0;
    for (const d of defenderPre) {
      let p1Wins = 0,
        exchangesTotal = 0;
      for (let i = 0; i < trials; i++) {
        const res = fightOnceWiki(att, d.build);
        if (res.winnerIsP1) p1Wins++;
        exchangesTotal += res.exchanges;
      }
      const winPct = (p1Wins / trials) * 100;
      sumWin += winPct;
      sumEx += exchangesTotal / trials;
      if (winPct < minWin) minWin = winPct;
    }
    chunkResults.push({
      name,
      avgWin: (sumWin / defenderPre.length).toFixed(1),
      minWin: minWin.toFixed(1),
      avgEx: (sumEx / defenderPre.length).toFixed(1),
    });
  }
  parentPort.postMessage(chunkResults);
  return;
}

// ===================== MAIN =====================
console.log(`=== LEGACY OPTIMIZER v2.5 - FULL BRUTE FORCE (4 WORKERS) ===`);
console.log(`Trials: ${SETTINGS.TRIALS} | Using all 4 cores of your Quad-Core i7\n`);

const attackerCandidates = generateAttackerCandidates();

console.log(
  `✅ Generated ${attackerCandidates.length} unique builds (safe number for your laptop)`,
);
console.log(`   HP 400-600 step 25 + acc/dodge every 20 points\n`);

const defenderPre = defenderBuilds.map((d) => ({
  name: d.name,
  build: applyBuild(BASE, { ...d.equipped, hp: d.hp }),
}));

const precomputedAtts = attackerCandidates.map((cand) => ({
  name: cand.name,
  att: applyBuild(BASE, { ...cand.equipped, hp: cand.hp }, cand.extraAcc, cand.extraDodge),
}));

const numWorkers = 4;
const chunkSize = Math.ceil(precomputedAtts.length / numWorkers);
const allResults = [];
const startTime = Date.now();

console.log(`Spawning ${numWorkers} workers...`);

for (let i = 0; i < numWorkers; i++) {
  const chunk = precomputedAtts.slice(i * chunkSize, (i + 1) * chunkSize);
  const worker = new Worker(__filename, {
    workerData: { attChunk: chunk, defenderPre, trials: SETTINGS.TRIALS },
  });

  worker.on('message', (chunkResults) => allResults.push(...chunkResults));
  worker.on('exit', () => {
    if (allResults.length === precomputedAtts.length) finish();
  });
}

function finish() {
  allResults.sort((a, b) => parseFloat(b.avgWin) - parseFloat(a.avgWin));

  console.log('\n\n=== TOP 10 BEST BUILDS ===');
  console.log('Rank  AvgWin%  MinWin%  AvgEx   Build');
  console.log('─────────────────────────────────────────────────────────────');

  for (let i = 0; i < 10 && i < allResults.length; i++) {
    const r = allResults[i];
    console.log(
      `${(i + 1).toString().padStart(2)}    ${r.avgWin.padStart(6)}%   ${r.minWin.padStart(6)}%   ${r.avgEx.padStart(5)}   ${r.name}`,
    );
  }

  const best = allResults[0];
  const totalTimeMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n✅ BEST BUILD: ${best.name}`);
  console.log(`   Avg win ${best.avgWin}% | Worst ${best.minWin}% | Avg exchanges ${best.avgEx}`);
  console.log(`\nTotal runtime: ${totalTimeMin} minutes (4 workers on your Quad-Core i7)`);
  console.log('\nScript complete.');
}
