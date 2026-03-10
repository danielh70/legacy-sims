'use strict';

// Focused/meta defender payloads.
// Same export format as legacy-defenders.js so you can swap files directly.
//
// Notes:
// - Built from the in-game JSON exports you pasted.
// - Exact duplicate export removed: Reaper Axe + Core Staff + double Scout appeared twice.
// - Preserved your existing canonical names where the build already existed in the main file.
//
// Schema per slot:
//   { name: <item>, crystal: <crystal>, upgrades: [<weapon-upgrade>, ...] }
//
// NOTE: `upgrades` is ONLY for weapon upgrades (Gun Blade Mk4, Void Bow, etc).
// For most weapons, leave `upgrades: []`.
const S = (name, crystal, upgrades = []) => ({ name, crystal, upgrades });

const DEFENDER_PAYLOADS = {
  'DL Gun Blade Dodge': {
    stats: { level: 97, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Gun Blade Mk4', 'Amulet Crystal', ['Faster Ammo 1', 'Sharpened Blade 1']),
    weapon2: S('Rift Gun', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
  'DL Reaper/Core Dodge': {
    stats: { level: 97, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Reaper Axe', 'Amulet Crystal', []),
    weapon2: S('Core Staff', 'Amulet Crystal', []),
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
  'SG1 Split Bombs T2': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('SG1 Armor', 'Abyss Crystal', []),
    weapon1: S('Split Crystal Bombs T2', 'Amulet Crystal', []),
    weapon2: S('Split Crystal Bombs T2', 'Amulet Crystal', []),
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
  'DL Gun Build 8': {
    stats: { level: 80, hp: 700, speed: 60, dodge: 14, accuracy: 47 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Q15 Gun', 'Perfect Fire Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  },
  'SG1 Rift/Core Bio': {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: S('SG1 Armor', 'Perfect Pink Crystal', []),
    weapon1: S('Rift Gun', 'Amulet Crystal', []),
    weapon2: S('Core Staff', 'Amulet Crystal', []),
    misc1: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
    misc2: S('Bio Spinal Enhancer', 'Perfect Pink Crystal', []),
  },
  'DL Core/Rift Dodge': {
    stats: { level: 97, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor: S('Dark Legion Armor', 'Abyss Crystal', []),
    weapon1: S('Core Staff', 'Amulet Crystal', []),
    weapon2: S('Rift Gun', 'Amulet Crystal', []),
    misc1: S('Scout Drones', 'Amulet Crystal', []),
    misc2: S('Scout Drones', 'Amulet Crystal', []),
  },
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
