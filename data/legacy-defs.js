'use strict';

const CrystalDefs = {
  "Abyss Crystal": {
    pct: { armor: 0.05, dodge: 0.04, speed: 0.1, defSkill: 0.05 },
  },
  "Perfect Pink Crystal": { pct: { defSkill: 0.2 } },
  "Perfect Orange Crystal": { pct: { meleeSkill: 0.2 } },
  "Perfect Green Crystal": { pct: { gunSkill: 0.2 } },
  "Perfect Yellow Crystal": { pct: { projSkill: 0.2 } },
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
  "Cabrusion Crystal": {
    pct: { damage: 0.07, defSkill: 0.07, armor: 0.09, speed: 0.09 },
  },
  // "Aeon Crystal": { pct: { dodge: 0.06, defSkill: 0.03 } },
  "Berserker Crystal": {
    pct: {
      speed: 0.1,
      damage: 0.12,
      gunSkill: 0.02,
      meleeSkill: 0.02,
      projSkill: 0.02,
      defSkill: 0.07,
    },
  },
};

const UpgradeDefs = {
  "Faster Reload 4": { pct: { accuracy: 0.05, damage: 0.05 } },
  "Enhanced Scope 4": { pct: { accuracy: 0.1 } },
  "Faster Ammo 4": { pct: { damage: 0.2 } },
  "Tracer Rounds 4": { pct: { accuracy: 0.15, damage: 0.05 } },

  "Sharpened Blade 1": { pct: { damage: 0.1 } },
  "Faster Reload 1": { pct: { accuracy: 0.05, damage: 0.05 } },
  "Magnetic Blade 1": { pct: { accuracy: 0.2 } },
  "Faster Ammo 1": { pct: { damage: 0.2 } },

  "Magnetic Blade 3": { pct: { accuracy: 0.1 } },
  "Stronger Guard 3": { pct: { accuracy: 0.05, damage: 0.05 } },
  "Sharpened Blade 3": { pct: { damage: 0.2 } },
  "Extra Grip 3": { pct: { accuracy: 0.1, damage: 0.1 } },

  "Magnetic Blade 2": { pct: { accuracy: 0.1 } },
  "Enhanced Poison 2": { pct: { damage: 0.1 } },
  "Sharpened Blade 2": { pct: { damage: 0.2 } },
  "Extra Grip 2": { pct: { accuracy: 0.1, damage: 0.1 } },

  "Laser Sight": { pct: { accuracy: 0.14 } },
  "Poisoned Tip": { pct: { damage: 0.1 } },
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
  "Reaper Axe": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { speed: 65, accuracy: 48, meleeSkill: 80, defSkill: 10 },
    baseWeaponDamage: { min: 84, max: 108 },
  },
  "Split Crystal Bombs T2": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 79, accuracy: 23, projSkill: 84, defSkill: 80 },
    baseWeaponDamage: { min: 55, max: 87 },
  },
  "Alien Staff": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 50, accuracy: 34, projSkill: 48, defSkill: 8 },
    baseWeaponDamage: { min: 89, max: 112 },
  },
  "Void Bow": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 70, accuracy: 48, projSkill: 65, defSkill: 20 },
    baseWeaponDamage: { min: 10, max: 125 },
    upgradeSlots: [["Laser Sight", "Poisoned Tip"]],
  },
  "Fortified Void Bow": {
    type: "Weapon",
    skillType: "projSkill",
    flatStats: { speed: 70, accuracy: 48, projSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 25, max: 125 },
    upgradeSlots: [["Laser Sight", "Poisoned Tip"]],
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
  "Bio Gun Mk4": {
    type: "Weapon",
    skillType: "gunSkill",
    flatStats: { accuracy: 47, speed: 50, defSkill: 15, gunSkill: 42 },
    baseWeaponDamage: { min: 76, max: 91 },
    upgradeSlots: [
      ["Faster Reload 4", "Enhanced Scope 4"],
      ["Faster Ammo 4", "Tracer Rounds 4"],
    ],
  },
  "Gun Blade Mk4": {
    type: "Weapon",
    skillType: "gunSkill",
    flatStats: { accuracy: 50, speed: 50, defSkill: 15, gunSkill: 42 },
    baseWeaponDamage: { min: 73, max: 87 },
    upgradeSlots: [
      ["Sharpened Blade 1", "Faster Reload 1"],
      ["Magnetic Blade 1", "Faster Ammo 1"],
    ],
  },
  "Ritual Dagger IV": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { accuracy: 32, speed: 50, defSkill: 15, meleeSkill: 42 },
    baseWeaponDamage: { min: 76, max: 94 },
    upgradeSlots: [
      ["Magnetic Blade 2", "Enhanced Poison 2"],
      ["Sharpened Blade 2", "Extra Grip 2"],
    ],
  },
  "Warlords Katana": {
    type: "Weapon",
    skillType: "meleeSkill",
    flatStats: { accuracy: 30, speed: 50, defSkill: 15, meleeSkill: 42 },
    baseWeaponDamage: { min: 79, max: 98 },
    upgradeSlots: [
      ["Magnetic Blade 3", "Stronger Guard 3"],
      ["Sharpened Blade 3", "Extra Grip 3"],
    ],
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
  "Nerve Gauntlet": {
    type: "Misc",
    flatStats: {
      accuracy: 23,
      gunSkill: -20,
      meleeSkill: 40,
      projSkill: 75,
    },
  },
  "Recon Drones": {
    type: "Misc",
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 60, projSkill: 40 },
  },
};

module.exports = {
  CrystalDefs,
  UpgradeDefs,
  ItemDefs,
  crystalDefs: CrystalDefs,
  upgradeDefs: UpgradeDefs,
  itemDefs: ItemDefs,
};
