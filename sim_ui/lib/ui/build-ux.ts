import { cloneBuild, type BuildPart, type SimBuild, type SimCatalog, type StatModifierKey } from '@/lib/engine/types';

const CRYSTAL_SLOT_COUNT = 4;
const DEFAULT_STAT_ROUND: 'floor' | 'round' | 'ceil' = 'ceil';
const DEFAULT_STAT_STACK: 'sum4' | 'iter4' = 'iter4';
const DEFAULT_ARMOR_STACK: 'sum4' | 'iter4' = 'sum4';
const DEFAULT_ARMOR_ROUND: 'floor' | 'round' | 'ceil' = 'ceil';
const DEFAULT_DMG_ROUND: 'floor' | 'round' | 'ceil' = 'ceil';
const DEFAULT_DMG_STACK: 'sum4' | 'iter4' = 'sum4';

const STAT_LABELS: Array<[Exclude<StatModifierKey, 'damage'>, string]> = [
  ['armor', 'Arm'],
  ['speed', 'Spd'],
  ['accuracy', 'Acc'],
  ['dodge', 'Dod'],
  ['gunSkill', 'Gun'],
  ['meleeSkill', 'Mel'],
  ['projSkill', 'Prj'],
  ['defSkill', 'Def'],
];

export const FAST_CRYSTAL_ORDER = [
  'Amulet Crystal',
  'Abyss Crystal',
  'Perfect Fire Crystal',
  'Perfect Pink Crystal',
  'Perfect Orange Crystal',
  'Perfect Green Crystal',
  'Perfect Yellow Crystal',
  'Cabrusion Crystal',
  'Berserker Crystal',
];

export type SlotKey = keyof Omit<SimBuild, 'stats'>;

export interface SlotPreview {
  statLines: string[];
  damageLine: string | null;
}

export interface BuildValidation {
  hasErrors: boolean;
  errorCount: number;
  summary: string[];
  slotErrors: Partial<Record<SlotKey, string[]>>;
}

export interface BuildPreviewStats {
  hp: number;
  level: number;
  speed: number;
  accuracy: number;
  dodge: number;
  armor: number;
  gunSkill: number;
  meleeSkill: number;
  projSkill: number;
  defSkill: number;
}

export const BUILD_PART_SOCKET_COUNT = CRYSTAL_SLOT_COUNT;

export function getBuildPartCrystals(part: BuildPart): string[] {
  if (Array.isArray(part.crystals) && part.crystals.length) {
    return part.crystals.filter((value): value is string => typeof value === 'string' && Boolean(value));
  }

  if (part.crystal) {
    return [part.crystal, part.crystal, part.crystal, part.crystal];
  }

  return [];
}

export function getBuildPartSocketCrystals(part: BuildPart, socketCount = BUILD_PART_SOCKET_COUNT): string[] {
  const explicit = Array.isArray(part.crystals)
    ? part.crystals.slice(0, socketCount).map((value) => (typeof value === 'string' ? value : ''))
    : [];

  if (explicit.length) {
    return Array.from({ length: socketCount }, (_, index) => explicit[index] || '');
  }

  if (part.crystal) {
    return Array.from({ length: socketCount }, () => part.crystal);
  }

  return Array.from({ length: socketCount }, () => '');
}

function roundValue(value: number, mode: 'floor' | 'round' | 'ceil') {
  if (mode === 'floor') return Math.floor(value);
  if (mode === 'round') return Math.round(value);
  return Math.ceil(value);
}

function applyPct(base: number, pct: number, count: number, roundMode: 'floor' | 'round' | 'ceil', stackMode: 'sum4' | 'iter4') {
  let value = Number(base) || 0;
  if (!value || !pct || count <= 0) return value;

  if (stackMode === 'iter4') {
    for (let index = 0; index < count; index += 1) {
      value += roundValue(value * pct, roundMode);
    }
    return value;
  }

  return value + roundValue(value * pct * count, roundMode);
}

function applyWeaponDamagePct(base: number, pct: number, count: number) {
  let value = Number(base) || 0;
  if (!value || !pct || count <= 0) return value;

  if (DEFAULT_DMG_STACK === 'iter4') {
    for (let index = 0; index < count; index += 1) {
      value = roundValue(value * (1 + pct), DEFAULT_DMG_ROUND);
    }
    return value;
  }

  return roundValue(value * (1 + pct * count), DEFAULT_DMG_ROUND);
}

function summedUpgradePct(part: BuildPart, catalog: SimCatalog) {
  const totals: Partial<Record<StatModifierKey, number>> = {};

  for (const upgradeName of part.upgrades || []) {
    const pct = catalog.upgradeDetails[upgradeName]?.pct || {};
    for (const [key, value] of Object.entries(pct)) {
      totals[key as StatModifierKey] = (totals[key as StatModifierKey] || 0) + (value || 0);
    }
  }

  return totals;
}

function previewPartContribution(part: BuildPart, catalog: SimCatalog) {
  const item = catalog.itemsByName[part.name];
  const crystal = catalog.crystalDetails[part.crystal];
  const upgrades = summedUpgradePct(part, catalog);
  const flatStats = item?.flatStats || {};

  const stats: Partial<Record<Exclude<StatModifierKey, 'damage'>, number>> = {};

  for (const [key] of STAT_LABELS) {
    const base = Number(flatStats[key] || 0);
    const crystalPct = Number(crystal?.pct?.[key] || 0);
    const upgradePct = Number(upgrades[key] || 0);
    const roundMode = key === 'armor' ? DEFAULT_ARMOR_ROUND : DEFAULT_STAT_ROUND;
    const stackMode = key === 'armor' ? DEFAULT_ARMOR_STACK : DEFAULT_STAT_STACK;
    let value = applyPct(base, crystalPct, CRYSTAL_SLOT_COUNT, roundMode, stackMode);
    if (upgradePct) value += roundValue(value * upgradePct, DEFAULT_STAT_ROUND);
    stats[key] = value;
  }

  let damageRange: [number, number] | null = null;
  if (item?.baseWeaponDamage) {
    const damagePct = Number(crystal?.pct?.damage || 0);
    const upgradeDamagePct = Number(upgrades.damage || 0);

    let min = applyWeaponDamagePct(item.baseWeaponDamage.min, damagePct, CRYSTAL_SLOT_COUNT);
    let max = applyWeaponDamagePct(item.baseWeaponDamage.max, damagePct, CRYSTAL_SLOT_COUNT);

    if (upgradeDamagePct) {
      min = roundValue(min * (1 + upgradeDamagePct), DEFAULT_DMG_ROUND);
      max = roundValue(max * (1 + upgradeDamagePct), DEFAULT_DMG_ROUND);
    }

    damageRange = [min, max];
  }

  return { stats, damageRange };
}

export function getSlotPreview(part: BuildPart, catalog: SimCatalog): SlotPreview {
  const contribution = previewPartContribution(part, catalog);

  const statLines = STAT_LABELS.flatMap(([key, label]) => {
    const value = contribution.stats[key] || 0;
    if (!value) return [];
    return [`${label} +${value}`];
  });

  return {
    statLines,
    damageLine: contribution.damageRange
      ? `Dmg ${contribution.damageRange[0]}-${contribution.damageRange[1]}`
      : null,
  };
}

export function buildFastCrystalList(currentCrystal: string, catalog: SimCatalog) {
  const ordered = [...FAST_CRYSTAL_ORDER, ...catalog.crystals];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const crystal of [currentCrystal, ...ordered]) {
    if (!crystal || seen.has(crystal) || !catalog.crystalDetails[crystal]) continue;
    seen.add(crystal);
    result.push(crystal);
  }

  return result;
}

function pushError(
  slotErrors: Partial<Record<SlotKey, string[]>>,
  slot: SlotKey,
  message: string,
) {
  if (!slotErrors[slot]) slotErrors[slot] = [];
  slotErrors[slot]?.push(message);
}

function validatePart(slot: SlotKey, part: BuildPart, catalog: SimCatalog, slotType: 'Armor' | 'Weapon' | 'Misc', slotErrors: Partial<Record<SlotKey, string[]>>) {
  const item = catalog.itemsByName[part.name];
  if (!item) {
    pushError(slotErrors, slot, 'Unknown item.');
    return;
  }

  if (item.type !== slotType) {
    pushError(slotErrors, slot, `Expected ${slotType.toLowerCase()} item.`);
  }

  if (!catalog.crystalDetails[part.crystal]) {
    pushError(slotErrors, slot, 'Unknown crystal.');
  }

  const upgradeSlots = item.upgradeSlots || [];
  if (!upgradeSlots.length && part.upgrades.length) {
    pushError(slotErrors, slot, 'Selected item does not support upgrades.');
  }

  if (part.upgrades.length > upgradeSlots.length) {
    pushError(slotErrors, slot, 'Too many upgrades selected for this item.');
  }

  const usedSlots = new Set<number>();
  for (const upgradeName of part.upgrades) {
    if (!catalog.upgradeDetails[upgradeName]) {
      pushError(slotErrors, slot, `Unknown upgrade: ${upgradeName}`);
      continue;
    }

    let matched = false;
    for (let index = 0; index < upgradeSlots.length; index += 1) {
      if (usedSlots.has(index)) continue;
      if (upgradeSlots[index]?.includes(upgradeName)) {
        usedSlots.add(index);
        matched = true;
        break;
      }
    }

    if (!matched) {
      pushError(slotErrors, slot, `Illegal upgrade for ${part.name}: ${upgradeName}`);
    }
  }
}

export function validateBuild(build: SimBuild, catalog: SimCatalog): BuildValidation {
  const slotErrors: Partial<Record<SlotKey, string[]>> = {};

  validatePart('armor', build.armor, catalog, 'Armor', slotErrors);
  validatePart('weapon1', build.weapon1, catalog, 'Weapon', slotErrors);
  validatePart('weapon2', build.weapon2, catalog, 'Weapon', slotErrors);
  validatePart('misc1', build.misc1, catalog, 'Misc', slotErrors);
  validatePart('misc2', build.misc2, catalog, 'Misc', slotErrors);

  const summary = Object.entries(slotErrors).flatMap(([slot, errors]) =>
    (errors || []).map((message) => `${slot}: ${message}`),
  );

  return {
    hasErrors: summary.length > 0,
    errorCount: summary.length,
    summary,
    slotErrors,
  };
}

export function buildPreviewStats(build: SimBuild, catalog: SimCatalog): BuildPreviewStats {
  const slotKeys: SlotKey[] = ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2'];
  const totals: BuildPreviewStats = {
    hp: build.stats.hp,
    level: build.stats.level,
    speed: build.stats.speed,
    accuracy: build.stats.accuracy,
    dodge: build.stats.dodge,
    armor: 0,
    gunSkill: 0,
    meleeSkill: 0,
    projSkill: 0,
    defSkill: 0,
  };

  for (const slotKey of slotKeys) {
    const contribution = previewPartContribution(build[slotKey], catalog);
    totals.speed += contribution.stats.speed || 0;
    totals.accuracy += contribution.stats.accuracy || 0;
    totals.dodge += contribution.stats.dodge || 0;
    totals.armor += contribution.stats.armor || 0;
    totals.gunSkill += contribution.stats.gunSkill || 0;
    totals.meleeSkill += contribution.stats.meleeSkill || 0;
    totals.projSkill += contribution.stats.projSkill || 0;
    totals.defSkill += contribution.stats.defSkill || 0;
  }

  return totals;
}

export function buildDeltaLines(build: SimBuild, referenceBuild: SimBuild, catalog: SimCatalog) {
  const current = buildPreviewStats(build, catalog);
  const reference = buildPreviewStats(referenceBuild, catalog);

  const deltas: Array<[keyof typeof current, string]> = [
    ['hp', 'HP'],
    ['speed', 'Spd'],
    ['accuracy', 'Acc'],
    ['dodge', 'Dod'],
    ['armor', 'Arm'],
    ['gunSkill', 'Gun'],
    ['meleeSkill', 'Mel'],
    ['projSkill', 'Prj'],
    ['defSkill', 'Def'],
  ];

  return deltas.flatMap(([key, label]) => {
    const diff = current[key] - reference[key];
    if (!diff) return [];
    const sign = diff > 0 ? '+' : '';
    return [`${label} ${sign}${diff}`];
  });
}

export function swapBuildWeapons(build: SimBuild): SimBuild {
  return {
    ...cloneBuild(build),
    weapon1: cloneBuild(build.weapon2),
    weapon2: cloneBuild(build.weapon1),
  };
}
