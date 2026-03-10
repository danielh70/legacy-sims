'use strict';

// Shared defender payloads (used by both legacy_simulator.js and brute-force).
//
// Schema per slot:
//   { name: <item>, crystal: <crystal>, upgrades: [<weapon-upgrade>, ...] }
//
// NOTE: `upgrades` is ONLY for weapon upgrades (Void Bow, Bio Gun Mk4, etc).
// For most weapons, leave `upgrades: []`.
const S = (name, crystal, upgrades = []) => ({ name, crystal, upgrades });

const DEFENDER_PAYLOADS = {
  'DL Gun Build': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Double Barrel Sniper Rifle', 'Perfect Fire Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'DL Gun Build 2': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Q15 Gun', 'Perfect Fire Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'DL Gun Build 3': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Double Barrel Sniper Rifle', 'Perfect Fire Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Green Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Green Crystal', []),
  },
  'DL Gun Build 4': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Q15 Gun', 'Perfect Fire Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  },
  'DL Gun Build 5': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Double Barrel Sniper Rifle', 'Perfect Fire Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'DL Gun Build 6': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Q15 Gun', 'Perfect Fire Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'DL Gun Build 7': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Double Barrel Sniper Rifle', 'Perfect Fire Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Green Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Green Crystal', []),
  },
  'DL Gun Build 8': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Q15 Gun', 'Perfect Fire Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  },
  'Core/Void Build 1': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Core Staff', 'Amulet Crystal', []),
    weapon2: S('Void Sword', 'Perfect Fire Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'Dual Bow Build 1': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Void Bow', 'Amulet Crystal', []),
    weapon2: S('Void Bow', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'Rift Bow Build 1': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Void Bow', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'T2 Scythe Build': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Scythe T2', 'Amulet Crystal', []),
    weapon2: S('Scythe T2', 'Amulet Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'SG1 Split Bombs T2': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('SG1 Armor', 'Abyss Crystal', []),
    weapon1: S('Split Crystal Bombs T2', 'Amulet Crystal', []),
    weapon2: S('Split Crystal Bombs T2', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'HF Core/Void': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Hellforged Armor', 'Cabrusion Crystal', []),
    weapon1: S('Void Sword', 'Perfect Fire Crystal', []),
    weapon2: S('Core Staff', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'Armour stack Cores': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('Hellforged Armor', 'Cabrusion Crystal', []),
    weapon1: S('Core Staff', 'Amulet Crystal', []),
    weapon2: S('Core Staff', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Perfect Pink Crystal', []),
    misc2: S('Scout Drones', 'Perfect Pink Crystal', []),
  },
  // 'Reaper Axe Build 1': {
  //   stats: { level: 80, hp: 600, speed: 60, dodge: 67, accuracy: 14 },
  //   armor: S('Dark Legion Armor', 'Abyss Crystal', []),
  //   weapon1: S('Reaper Axe', 'Amulet Crystal', []),
  //   weapon2: S('Core Staff', 'Amulet Crystal', []),
  //   misc1: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  //   misc2: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  // },
  // 'Reaper Axe Build 2': {
  //   stats: { level: 80, hp: 600, speed: 60, dodge: 67, accuracy: 14 },
  //   armor: S('Dark Legion Armor', 'Abyss Crystal', []),
  //   weapon1: S('Reaper Axe', 'Amulet Crystal', []),
  //   weapon2: S('Core Staff', 'Amulet Crystal', []),
  //   misc1: S('Scout Drones', 'Amulet Crystal', []),
  //   misc2: S('Scout Drones', 'Amulet Crystal', []),
  // },
};

if (!DEFENDER_PAYLOADS['SG1 Split Bombs T2'] && DEFENDER_PAYLOADS['SG1 Split bombs']) {
  DEFENDER_PAYLOADS['SG1 Split Bombs T2'] = DEFENDER_PAYLOADS['SG1 Split bombs'];
}
if (!DEFENDER_PAYLOADS['SG1 Split bombs'] && DEFENDER_PAYLOADS['SG1 Split Bombs T2']) {
  Object.defineProperty(DEFENDER_PAYLOADS, 'SG1 Split bombs', {
    value: DEFENDER_PAYLOADS['SG1 Split Bombs T2'],
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

module.exports = DEFENDER_PAYLOADS;
