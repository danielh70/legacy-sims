import 'server-only';

import { loadLegacyModules } from '@/lib/engine/legacy-source';
import {
  cloneBuild,
  normalizeAttackStyle,
  type CrystalCatalogEntry,
  type ItemCatalogEntry,
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
  type UpgradeCatalogEntry,
} from '@/lib/engine/types';

function normalizeCrystalList(part: any): string[] | undefined {
  if (Array.isArray(part?.crystals)) {
    const crystals = part.crystals.filter((value: unknown): value is string => typeof value === 'string' && Boolean(value));
    return crystals.length ? crystals : undefined;
  }

  if (typeof part?.crystal === 'string' && part.crystal) {
    return [part.crystal, part.crystal, part.crystal, part.crystal];
  }

  if (typeof part?.crystalName === 'string' && part.crystalName) {
    return [part.crystalName, part.crystalName, part.crystalName, part.crystalName];
  }

  if (Array.isArray(part?.upgrades)) {
    const crystals = part.upgrades.filter(
      (value: unknown): value is string =>
        typeof value === 'string' && value.toLowerCase().includes('crystal'),
    );
    return crystals.length ? crystals.slice(0, 4) : undefined;
  }

  if (typeof part?.upgrades === 'string' && part.upgrades.toLowerCase().includes('crystal')) {
    return [part.upgrades];
  }

  return undefined;
}

function normalizePart(part: any) {
  const crystals = normalizeCrystalList(part);
  const upgrades = Array.isArray(part?.upgrades)
    ? part.upgrades.filter(
        (value: unknown): value is string =>
          typeof value === 'string' && !value.toLowerCase().includes('crystal'),
      )
    : [];
  return {
    name: part?.name || part?.item || '',
    crystal:
      part?.crystal ||
      part?.crystalName ||
      crystals?.[0] ||
      '',
    upgrades,
    crystals,
  };
}

function normalizeBuild(build: SimBuild): SimBuild {
  return cloneBuild({
    attackStyle: normalizeAttackStyle((build as SimBuild & { attackType?: string }).attackStyle ?? (build as SimBuild & { attackType?: string }).attackType),
    stats: {
      level: Number(build.stats.level),
      hp: Number(build.stats.hp),
      speed: Number(build.stats.speed),
      dodge: Number(build.stats.dodge),
      accuracy: Number(build.stats.accuracy),
    },
    armor: normalizePart(build.armor),
    weapon1: normalizePart(build.weapon1),
    weapon2: normalizePart(build.weapon2),
    misc1: normalizePart(build.misc1),
    misc2: normalizePart(build.misc2),
  });
}

function buildPresetList(source: 'attacker-preset' | 'defender-preset', raw: Record<string, SimBuild>): NamedBuildPreset[] {
  return Object.entries(raw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, build]) => ({
      key,
      label: key,
      source,
      build: normalizeBuild(build),
    }));
}

function buildItemCatalog(legacyDefs: any): {
  armors: ItemCatalogEntry[];
  weapons: ItemCatalogEntry[];
  miscs: ItemCatalogEntry[];
  itemsByName: Record<string, ItemCatalogEntry>;
} {
  const itemsByName: Record<string, ItemCatalogEntry> = {};

  for (const [name, item] of Object.entries(legacyDefs.ItemDefs as Record<string, ItemCatalogEntry>)) {
    itemsByName[name] = {
      name,
      type: item.type,
      skillType: item.skillType,
      upgradeSlots: item.upgradeSlots,
      flatStats: item.flatStats,
      baseWeaponDamage: item.baseWeaponDamage,
    };
  }

  const all = Object.values(itemsByName).sort((a, b) => a.name.localeCompare(b.name));

  return {
    itemsByName,
    armors: all.filter((item) => item.type === 'Armor'),
    weapons: all.filter((item) => item.type === 'Weapon'),
    miscs: all.filter((item) => item.type === 'Misc'),
  };
}

export async function getSimCatalog(): Promise<SimCatalog> {
  const { legacyDefs, legacyDefenders, legacySim } = await loadLegacyModules();
  const { armors, weapons, miscs, itemsByName } = buildItemCatalog(legacyDefs);

  const attackerPresets = [
    {
      key: '__current_cli__',
      label: 'Current CLI Build',
      source: 'current-cli' as const,
      build: normalizeBuild(legacySim.ATTACKER_BUILD),
    },
    ...buildPresetList('attacker-preset', legacySim.ATTACKER_PRESETS),
  ];

  const defenderPresets = buildPresetList('defender-preset', legacyDefenders);

  const initialAttacker = attackerPresets[0];
  const initialDefender =
    defenderPresets.find((preset) => preset.key === 'DL Gun Build') ?? defenderPresets[0];

  const crystalDetails = Object.fromEntries(
    Object.entries(legacyDefs.CrystalDefs).map(([name, value]) => [
      name,
      {
        name,
        pct: { ...(value as CrystalCatalogEntry).pct },
      },
    ]),
  );

  const upgradeDetails = Object.fromEntries(
    Object.entries(legacyDefs.UpgradeDefs).map(([name, value]) => [
      name,
      {
        name,
        pct: { ...(value as UpgradeCatalogEntry).pct },
      },
    ]),
  );

  const featuredAttackerPresetKeys = [
    '__current_cli__',
    'MAUL_CSTAFF',
    'MAUL_CSTAFF_OLD',
    'BOMBS_RIFT_MAXHP',
    'BOMBS_BOMBS_MAXHP',
  ].filter((key) => attackerPresets.some((preset) => preset.key === key));

  const featuredDefenderPresetKeys = [
    'DL Gun Build',
    'DL Gun Build 3',
    'SG1 Split Bombs T2',
    'HF Core/Void',
    'T2 Scythe Build',
  ].filter((key) => defenderPresets.some((preset) => preset.key === key));

  return {
    crystals: Object.keys(legacyDefs.CrystalDefs).sort((a, b) => a.localeCompare(b)),
    upgrades: Object.keys(legacyDefs.UpgradeDefs).sort((a, b) => a.localeCompare(b)),
    crystalDetails,
    upgradeDetails,
    armors,
    weapons,
    miscs,
    itemsByName,
    attackerPresets,
    defenderPresets,
    featuredAttackerPresetKeys,
    featuredDefenderPresetKeys,
    initialAttacker,
    initialDefender,
  };
}
