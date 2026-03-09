export const LEGACY_ICON_MAP = {
  "SG1 Armor": "https://www.legacy-game.net/img-bin/items/sg1%20armor.png",
  "Dark Legion Armor": "https://www.legacy-game.net/img-bin/items/dark%20legion%20armor.png",
  "Hellforged Armor": "https://www.legacy-game.net/img-bin/items/hellforged%20armor.png",

  "Crystal Maul": "https://www.legacy-game.net/img-bin/items/crystal%20maul.png",
  "Core Staff": "https://www.legacy-game.net/img-bin/items/core%20staff.png",
  "Void Axe": "https://www.legacy-game.net/img-bin/items/void%20axe.png",
  "Scythe T2": "https://www.legacy-game.net/img-bin/items/scythe%20t2.png",
  "Void Sword": "https://www.legacy-game.net/img-bin/items/void%20sword.png",
  "Reaper Axe": "https://www.legacy-game.net/img-bin/items/reaper%20axe.png",
  "Split Crystal Bombs T2": "https://www.legacy-game.net/img-bin/items/split%20crystal%20bombs%20t2.png",
  "Alien Staff": "https://www.legacy-game.net/img-bin/items/alien%20staff.png",
  "Void Bow": "https://www.legacy-game.net/img-bin/items/void%20bow.png",
  "Fortified Void Bow": "https://www.legacy-game.net/img-bin/items/void%20bow.png",
  "Rift Gun": "https://www.legacy-game.net/img-bin/items/rift%20gun.png",
  "Double Barrel Sniper Rifle": "https://www.legacy-game.net/img-bin/items/double%20barrel%20sniper%20rifle.png",
  "Q15 Gun": "https://www.legacy-game.net/img-bin/items/q15%20gun.png",
  "Bio Gun Mk4": "https://www.legacy-game.net/img-bin/items/bio%20gun%20mk4.png",

  "Bio Spinal Enhancer": "https://www.legacy-game.net/img-bin/items/bio%20spinal%20enhancer.png",
  "Scout Drones": "https://www.legacy-game.net/img-bin/items/scout%20drones.png",
  "Droid Drone": "https://www.legacy-game.net/img-bin/items/droid%20drone.png",
  "Orphic Amulet": "https://www.legacy-game.net/img-bin/items/orphic%20amulet.png",
  "Projector Bots": "https://www.legacy-game.net/img-bin/items/projector%20bots.png",
  "Recon Drones": "https://www.legacy-game.net/img-bin/items/recon%20drones.png",

  "Abyss Crystal": "https://www.legacy-game.net/img-bin/items/abyss%20crystal.png",
  "Perfect Pink Crystal": "https://www.legacy-game.net/img-bin/items/perfect%20pink%20crystal.png",
  "Perfect Orange Crystal": "https://www.legacy-game.net/img-bin/items/perfect%20orange%20crystal.png",
  "Perfect Green Crystal": "https://www.legacy-game.net/img-bin/items/perfect%20green%20crystal.png",
  "Perfect Yellow Crystal": "https://www.legacy-game.net/img-bin/items/perfect%20yellow%20crystal.png",
  "Amulet Crystal": "https://www.legacy-game.net/img-bin/items/amulet%20crystal.png",
  "Perfect Fire Crystal": "https://www.legacy-game.net/img-bin/items/perfect%20fire%20crystal.png",
  "Cabrusion Crystal": "https://www.legacy-game.net/img-bin/items/cabrusion%20crystal.png",
  "Berserker Crystal": "https://www.legacy-game.net/img-bin/items/berserker%20crystal.png",

  "Faster Reload 4": "https://www.legacy-game.net/img-bin/items/faster%20reload%204.png",
  "Enhanced Scope 4": "https://www.legacy-game.net/img-bin/items/enhanced%20scope%204.png",
  "Faster Ammo 4": "https://www.legacy-game.net/img-bin/items/faster%20ammo%204.png",
  "Tracer Rounds 4": "https://www.legacy-game.net/img-bin/items/tracer%20rounds%204.png",
  "Laser Sight": "https://www.legacy-game.net/img-bin/items/laser%20sight.png",
  "Poisoned Tip": "https://www.legacy-game.net/img-bin/items/poisoned%20tip.png",
} as const;

export function getLegacyIconUrl(name: string) {
  return LEGACY_ICON_MAP[name as keyof typeof LEGACY_ICON_MAP] || '';
}
