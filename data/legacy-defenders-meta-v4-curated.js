'use strict';
// Curated current-meta defender payloads refreshed against the newer March 13-14 online snapshot pulls.
//
// Notes:
// - Kept only builds that either repeated cleanly in the new pulls or still looked worth preserving.
// - Replaced several stale one-off entries with newer repeated current sightings.
// - `crystalCounts` is preserved for mixed slots when exact mixed data is available.

const S = (name, crystal, upgrades = []) => ({ name, crystal, upgrades });
const M = (name, crystal, crystalCounts, upgrades = []) => ({
  name,
  crystal,
  crystalCounts,
  upgrades,
});
const MAXHP = (level) => ({ level, hp: 865, speed: 60, dodge: 14, accuracy: 14 });
const DODGE = (level) => ({ level, hp: 650, speed: 60, dodge: 57, accuracy: 14 });
const EVADE = (level) => ({ level, hp: 600, speed: 60, dodge: 67, accuracy: 14 });

const DEFENDER_PAYLOADS = {
  // observed x3 exact snapshots in the new pulls | player: 007Ben | gang: The Chapter | level 108
  "DL Rift/Bombs Scout": {
    stats: MAXHP(108),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Split Crystal Bombs T2", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x2 exact in the new pulls | player: Architect | gang: Dark Flame | level 96
  "SG1 Rift/Bombs Bio": {
    stats: MAXHP(96),
    armor: S("SG1 Armor", "Perfect Pink Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Split Crystal Bombs T2", "Amulet Crystal", []),
    misc1: S("Bio Spinal Enhancer", "Perfect Yellow Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x2 exact in the new pulls | player: Bob | gang: The Chapter | level 103
  "DL Maul/Core Orphic": {
    stats: DODGE(103),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Crystal Maul", "Perfect Fire Crystal", []),
    weapon2: S("Core Staff", "Amulet Crystal", []),
    misc1: M("Bio Spinal Enhancer", "Perfect Orange Crystal", { "Perfect Pink Crystal": 2, "Perfect Orange Crystal": 2 }, []),
    misc2: S("Orphic Amulet", "Perfect Orange Crystal", [])
  },
  // observed x2 exact in the new pulls | player: blenok | gang: Dark Flame | level 101
  "DL Reaper/Maul Orphic Bio": {
    stats: DODGE(101),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Reaper Axe", "Amulet Crystal", []),
    weapon2: S("Crystal Maul", "Perfect Fire Crystal", []),
    misc1: S("Orphic Amulet", "Perfect Orange Crystal", []),
    misc2: S("Bio Spinal Enhancer", "Perfect Pink Crystal", [])
  },
  // re-seen x2 exact in the new pulls | player: Ashley | gang: The Chapter | level 101
  "Ashley Build": {
    stats: EVADE(101),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Reaper Axe", "Berserker Crystal", []),
    weapon2: S("Core Staff", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x2 exact in the new pulls | player: JckdaReapr | gang: Blades of Dawn | level 93
  "HF Scythe Pair": {
    stats: MAXHP(93),
    armor: S("Hellforged Armor", "Abyss Crystal", []),
    weapon1: S("Scythe T2", "Amulet Crystal", []),
    weapon2: M("Scythe T2", "Amulet Crystal", { "Amulet Crystal": 3, "Perfect Fire Crystal": 1 }, []),
    misc1: S("Scout Drones", "Perfect Orange Crystal", []),
    misc2: S("Bio Spinal Enhancer", "Perfect Orange Crystal", [])
  },
  // observed x2 exact in the new pulls | player: MuadDib | gang: The Chapter | level 91
  "DL Core/Rift Bio": {
    stats: MAXHP(91),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Core Staff", "Amulet Crystal", []),
    weapon2: S("Rift Gun", "Amulet Crystal", []),
    misc1: S("Bio Spinal Enhancer", "Perfect Pink Crystal", []),
    misc2: S("Bio Spinal Enhancer", "Perfect Pink Crystal", [])
  },
  // re-seen x1 exact in the new pulls | player: k3nny | gang: The Chapter | level 127
  "DL Gun Blade Recon": {
    stats: DODGE(127),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Gun Blade Mk4", "Amulet Crystal", ["Sharpened Blade 1", "Faster Ammo 1"]),
    misc1: S("Recon Drones", "Perfect Green Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x2 sim-ready high-confidence in the new pulls | player: Afinitak | gang: The Chapter | level 92
  "DL Gun Blade Bio": {
    stats: DODGE(92),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Gun Blade Mk4", "Amulet Crystal", ["Sharpened Blade 1", "Faster Ammo 1"]),
    misc1: S("Bio Spinal Enhancer", "Perfect Green Crystal", []),
    misc2: M("Scout Drones", "Perfect Green Crystal", { "Perfect Green Crystal": 3, "Amulet Crystal": 1 }, [])
  },
  // re-seen x1 exact in the new pulls | player: Crater | gang: Dark Flame | level 110
  "SG1 Split Bombs T2": {
    stats: MAXHP(110),
    armor: S("SG1 Armor", "Abyss Crystal", []),
    weapon1: S("Split Crystal Bombs T2", "Amulet Crystal", []),
    weapon2: S("Split Crystal Bombs T2", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x1 exact in the new pulls | player: CroFighter | gang: The Chapter | level 103
  "SG1 Void/Reaper": {
    stats: DODGE(103),
    armor: S("SG1 Armor", "Perfect Pink Crystal", []),
    weapon1: S("Void Bow", "Amulet Crystal", ["Poisoned Tip"]),
    weapon2: S("Reaper Axe", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // re-seen x1 sim-ready high-confidence in the new pulls | player: ZyoniK | gang: The Chapter | level 94
  "SG1 Double Maul Droid": {
    stats: DODGE(94),
    armor: S("SG1 Armor", "Perfect Pink Crystal", []),
    weapon1: M("Crystal Maul", "Amulet Crystal", { "Perfect Fire Crystal": 2, "Amulet Crystal": 2 }, []),
    weapon2: S("Crystal Maul", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Droid Drone", "Perfect Orange Crystal", [])
  },
  // re-seen x1 exact in the new pulls | player: Varamin | gang: Blades of Dawn | level 105
  "DL Core/Rift Dodge": {
    stats: DODGE(105),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Core Staff", "Amulet Crystal", []),
    misc1: S("Scout Drones", "Amulet Crystal", []),
    misc2: S("Scout Drones", "Amulet Crystal", [])
  },
  // restored from the earlier curated set at your request | old exact snapshot: Antics | Dark Flame | level 98
  // rationale: plausible/common gun-gun shell even though it did not reappear in this small March 13-14 batch.
  "DL Gun Sniper Mix": {
    stats: MAXHP(98),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: S("Rift Gun", "Amulet Crystal", []),
    weapon2: S("Double Barrel Sniper Rifle", "Perfect Fire Crystal", []),
    misc1: M("Scout Drones", "Amulet Crystal", { "Perfect Pink Crystal": 1, "Amulet Crystal": 3 }, []),
    misc2: M("Bio Spinal Enhancer", "Perfect Green Crystal", { "Perfect Pink Crystal": 2, "Perfect Green Crystal": 2 }, [])
  },
  // restored from the earlier curated set at your request | old exact snapshot: MuadDib | The Chapter | level 91
  // rationale: broader meta coverage; newer pulls showed related core/rift and rift/rift variants, though not this exact dual-bio shell.
  "DL Dual Rift Bio": {
    stats: MAXHP(91),
    armor: S("Dark Legion Armor", "Abyss Crystal", []),
    weapon1: M("Rift Gun", "Amulet Crystal", { "Amulet Crystal": 3, "Perfect Fire Crystal": 1 }, []),
    weapon2: S("Rift Gun", "Amulet Crystal", []),
    misc1: S("Bio Spinal Enhancer", "Perfect Pink Crystal", []),
    misc2: S("Bio Spinal Enhancer", "Perfect Pink Crystal", [])
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
