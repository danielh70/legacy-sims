export type BuildSide = 'attacker' | 'defender';
export type ItemType = 'Armor' | 'Weapon' | 'Misc';
export type SkillType = 'gunSkill' | 'meleeSkill' | 'projSkill';
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
}

export interface SimBuild {
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

export function isBuildPart(value: unknown): value is BuildPart {
  if (!value || typeof value !== 'object') return false;
  const item = value as BuildPart;
  return typeof item.name === 'string' && typeof item.crystal === 'string' && Array.isArray(item.upgrades);
}

export function isSimBuild(value: unknown): value is SimBuild {
  if (!value || typeof value !== 'object') return false;
  const build = value as SimBuild;
  return Boolean(
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
