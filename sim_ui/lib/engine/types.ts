export type BuildSide = 'attacker' | 'defender';
export type ItemType = 'Armor' | 'Weapon' | 'Misc';
export type SkillType = 'gunSkill' | 'meleeSkill' | 'projSkill';
export type AttackStyle = 'normal' | 'aimed' | 'cover';
export type StatModifierKey =
  | 'armor'
  | 'speed'
  | 'accuracy'
  | 'dodge'
  | 'gunSkill'
  | 'meleeSkill'
  | 'projSkill'
  | 'defSkill'
  | 'damage';

export interface BuildStats {
  level: number;
  hp: number;
  speed: number;
  dodge: number;
  accuracy: number;
}

export interface BuildPart {
  name: string;
  crystal: string;
  upgrades: string[];
  crystals?: string[];
}

export interface SimBuild {
  attackStyle: AttackStyle;
  stats: BuildStats;
  armor: BuildPart;
  weapon1: BuildPart;
  weapon2: BuildPart;
  misc1: BuildPart;
  misc2: BuildPart;
}

export interface ItemCatalogEntry {
  name: string;
  type: ItemType;
  skillType?: SkillType;
  upgradeSlots?: string[][];
  flatStats?: Partial<Record<'armor' | 'speed' | 'accuracy' | 'dodge' | 'gunSkill' | 'meleeSkill' | 'projSkill' | 'defSkill', number>>;
  baseWeaponDamage?: {
    min: number;
    max: number;
  };
}

export interface CrystalCatalogEntry {
  name: string;
  pct: Partial<Record<StatModifierKey, number>>;
}

export interface UpgradeCatalogEntry {
  name: string;
  pct: Partial<Record<StatModifierKey, number>>;
}

export interface NamedBuildPreset {
  key: string;
  label: string;
  build: SimBuild;
  source: 'attacker-preset' | 'defender-preset' | 'current-cli';
}

export interface SimCatalog {
  crystals: string[];
  upgrades: string[];
  crystalDetails: Record<string, CrystalCatalogEntry>;
  upgradeDetails: Record<string, UpgradeCatalogEntry>;
  armors: ItemCatalogEntry[];
  weapons: ItemCatalogEntry[];
  miscs: ItemCatalogEntry[];
  itemsByName: Record<string, ItemCatalogEntry>;
  attackerPresets: NamedBuildPreset[];
  defenderPresets: NamedBuildPreset[];
  featuredAttackerPresetKeys: string[];
  featuredDefenderPresetKeys: string[];
  initialAttacker: NamedBuildPreset;
  initialDefender: NamedBuildPreset;
}

export interface SimRequest {
  attacker: {
    key?: string;
    label?: string;
    build: SimBuild;
  };
  defender: {
    key?: string;
    label?: string;
    build: SimBuild;
  };
  trials: number;
  maxTurns?: number;
  seed?: number;
  includeTrace?: boolean;
}

export interface WeaponChanceSummary {
  attempts: number;
  hitChancePct: number;
  skillGivenHitPct: number;
  overallDamageChancePct: number;
  damageRollRange: [number, number];
}

export interface SideSummary {
  totalDamage: number;
  minDamage: number;
  maxDamage: number;
  attempts: number;
  overallDamageChancePct: number;
  weapon1: WeaponChanceSummary;
  weapon2: WeaponChanceSummary;
  diag?: Record<string, number> | null;
}

export interface CompiledCombatant {
  attackType?: AttackStyle;
  hp: number;
  level: number;
  speed: number;
  armor: number;
  armorFactor: number;
  acc: number;
  dodge: number;
  gun: number;
  mel: number;
  prj: number;
  defSk: number;
  weapon1: { name: string; min: number; max: number; skill: number } | null;
  weapon2: { name: string; min: number; max: number; skill: number } | null;
}

export interface SimResponse {
  attackerWinPct: number;
  defenderWinPct: number;
  avgTurns: number;
  turnsMin: number;
  turnsMax: number;
  attacker: SideSummary;
  defender: SideSummary;
  compiled: {
    attacker: CompiledCombatant;
    defender: CompiledCombatant;
  };
  signatures: {
    logicKey: string;
    attSig: string;
    cfgSig: string;
    defsSig: string;
  };
  cfg: Record<string, unknown>;
  traceLines: string[];
}

export function cloneBuild<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeAttackStyle(value: unknown): AttackStyle {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (token === 'aimed' || token === 'aim' || token === 'aimed attack' || token === 'aimed atk') {
    return 'aimed';
  }

  if (
    token === 'cover' ||
    token === 'covered' ||
    token === 'take cover' ||
    token === 'cover attack'
  ) {
    return 'cover';
  }

  return 'normal';
}

export function normalizeBuildPart(value: unknown): BuildPart {
  const part = (value && typeof value === 'object' ? value : {}) as Partial<BuildPart> & {
    crystalName?: unknown;
    upgrade1?: unknown;
    upgrade2?: unknown;
  };

  const upgrades = Array.isArray(part.upgrades)
    ? part.upgrades.filter((entry): entry is string => typeof entry === 'string')
    : [part.upgrade1, part.upgrade2].filter((entry): entry is string => typeof entry === 'string' && Boolean(entry));
  const crystals = Array.isArray(part.crystals)
    ? part.crystals.filter((entry): entry is string => typeof entry === 'string')
    : undefined;

  return {
    name: typeof part.name === 'string' ? part.name : '',
    crystal:
      (typeof part.crystal === 'string' && part.crystal) ||
      (typeof part.crystalName === 'string' && part.crystalName) ||
      crystals?.[0] ||
      '',
    upgrades,
    crystals,
  };
}

export function normalizeSimBuild(value: unknown): SimBuild {
  const build = (value && typeof value === 'object' ? value : {}) as Partial<SimBuild> & {
    attackType?: unknown;
  };
  const stats = (build.stats && typeof build.stats === 'object' ? build.stats : {}) as Partial<BuildStats>;

  return {
    attackStyle: normalizeAttackStyle(build.attackStyle ?? build.attackType),
    stats: {
      level: Math.max(0, Math.floor(Number(stats.level) || 0)),
      hp: Math.max(0, Math.floor(Number(stats.hp) || 0)),
      speed: Math.max(0, Math.floor(Number(stats.speed) || 0)),
      dodge: Math.max(0, Math.floor(Number(stats.dodge) || 0)),
      accuracy: Math.max(0, Math.floor(Number(stats.accuracy) || 0)),
    },
    armor: normalizeBuildPart(build.armor),
    weapon1: normalizeBuildPart(build.weapon1),
    weapon2: normalizeBuildPart(build.weapon2),
    misc1: normalizeBuildPart(build.misc1),
    misc2: normalizeBuildPart(build.misc2),
  };
}

export function isBuildPart(value: unknown): value is BuildPart {
  if (!value || typeof value !== 'object') return false;
  const item = value as BuildPart;
  return typeof item.name === 'string' && typeof item.crystal === 'string' && Array.isArray(item.upgrades);
}

export function isSimBuild(value: unknown): value is SimBuild {
  if (!value || typeof value !== 'object') return false;
  const build = value as SimBuild & { attackType?: unknown };
  return Boolean(
    (typeof build.attackStyle === 'string' || typeof build.attackType === 'string') &&
    build.stats &&
      typeof build.stats.level === 'number' &&
      typeof build.stats.hp === 'number' &&
      typeof build.stats.speed === 'number' &&
      typeof build.stats.dodge === 'number' &&
      typeof build.stats.accuracy === 'number' &&
      isBuildPart(build.armor) &&
      isBuildPart(build.weapon1) &&
      isBuildPart(build.weapon2) &&
      isBuildPart(build.misc1) &&
      isBuildPart(build.misc2),
  );
}
