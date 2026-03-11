'use client';

import { LegacyIcon } from '@/components/legacy-icon';
import {
  type AttackStyle,
  type BuildPart,
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
} from '@/lib/engine/types';
import {
  chipClass,
  compactButtonClass,
  compactControlClass,
  compactNumericControlClass,
  disclosureClass,
  disclosureSummaryClass,
  iconTileClass,
  labelClass,
  panelCardClass,
  socketIconTileClass,
  twoLineClampClass,
} from '@/lib/ui/layout-system';
import {
  buildDeltaLines,
  buildPreviewStats,
  getBuildPartSocketCrystals,
  getSlotPreview,
  type SlotKey,
} from '@/lib/ui/build-ux';
import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

interface BuildPanelProps {
  title: string;
  tint: 'attacker' | 'defender';
  build: SimBuild;
  referenceBuild: SimBuild;
  selectedPresetKey: string;
  presets: NamedBuildPreset[];
  catalog: SimCatalog;
  validationSummary: string[];
  slotErrors: Partial<Record<SlotKey, string[]>>;
  activeSlot: SlotKey | null;
  activeSocketIndex: number | null;
  onBuildFocus: () => void;
  onBuildChange: (next: SimBuild) => void;
  onSwapWeapons: () => void;
  onSlotFocus: (slot: SlotKey) => void;
  onSocketInteract: (slot: SlotKey, socketIndex: number) => void;
}

const attackStyleOptions: AttackStyle[] = ['normal', 'aimed', 'cover'];

const statFields: Array<{ key: keyof SimBuild['stats']; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'accuracy', label: 'Acc' },
  { key: 'dodge', label: 'Dod' },
  { key: 'speed', label: 'Spd' },
  { key: 'level', label: 'Lvl' },
];

const previewFields: Array<{ key: keyof ReturnType<typeof buildPreviewStats>; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'armor', label: 'Arm' },
  { key: 'speed', label: 'Spd' },
  { key: 'accuracy', label: 'Acc' },
  { key: 'dodge', label: 'Dod' },
  { key: 'gunSkill', label: 'Gun' },
  { key: 'meleeSkill', label: 'Mel' },
  { key: 'projSkill', label: 'Prj' },
  { key: 'defSkill', label: 'Def' },
];

const wholeNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function attackStyleLabel(style: AttackStyle) {
  return style[0].toUpperCase() + style.slice(1);
}

function sourceLabel(source: NamedBuildPreset['source'] | 'custom') {
  if (source === 'custom') return 'Live';
  if (source === 'current-cli') return 'CLI';
  return 'Preset';
}

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

function slotLabel(slot: SlotKey) {
  if (slot === 'armor') return 'Armor';
  if (slot === 'weapon1') return 'Weapon 1';
  if (slot === 'weapon2') return 'Weapon 2';
  if (slot === 'misc1') return 'Misc 1';
  return 'Misc 2';
}

function SlotTile({
  label,
  part,
  tint,
  active,
  activeSocketIndex,
  errorCount,
  onClick,
  onSocketClick,
  catalog,
}: {
  label: string;
  part: BuildPart;
  tint: 'attacker' | 'defender';
  active: boolean;
  activeSocketIndex: number | null;
  errorCount: number;
  onClick: () => void;
  onSocketClick: (socketIndex: number) => void;
  catalog: SimCatalog;
}) {
  const slotPreview = getSlotPreview(part, catalog);
  const socketCrystals = getBuildPartSocketCrystals(part);
  const activeClass =
    tint === 'attacker'
      ? 'border-accent/60 bg-accent/10 shadow-[0_12px_24px_rgba(180,90,47,0.14)]'
      : 'border-steel/60 bg-steel/10 shadow-[0_12px_24px_rgba(44,73,84,0.14)]';
  const badgeClass =
    tint === 'attacker'
      ? 'border-accent/15 bg-accent/8 text-accent'
      : 'border-steel/15 bg-steel/8 text-steel';

  return (
    <div
      role="button"
      tabIndex={0}
      className={`min-w-0 rounded-[18px] border p-2.5 text-left transition hover:border-line/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        active ? activeClass : 'border-line/55 bg-white/76'
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      title={`${label}: ${part.name}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
        >
          {label}
        </span>
        {errorCount ? (
          <span className="inline-flex h-6 items-center rounded-full border border-red-300 bg-red-50 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">
            {errorCount}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex justify-center">
        <div className={iconTileClass}>
          {getLegacyIconUrl(part.name) ? (
            <LegacyIcon name={part.name} size={28} />
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">
              {label}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 px-1 text-center">
        <div className={twoLineClampClass}>{part.name}</div>
      </div>
      <div className="mt-1 truncate text-center text-[11px] text-ink/48">
        {slotPreview.damageLine || slotPreview.statLines[0] || 'Click to target'}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {socketCrystals.map((crystal, index) => {
          const socketActive = active && activeSocketIndex === index;
          return (
            <button
              key={`${label}-${part.name}-${index}`}
              type="button"
              className={`${socketIconTileClass} h-9 w-full rounded-xl transition ${
                socketActive
                  ? tint === 'attacker'
                    ? 'border border-accent/55 bg-accent/10'
                    : 'border border-steel/55 bg-steel/10'
                  : crystal
                    ? 'bg-white/92'
                    : 'bg-panel/45'
              }`}
              title={crystal ? `Remove ${crystalLabel(crystal)}` : `Socket ${index + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                onSocketClick(index);
              }}
            >
              {crystal ? (
                getLegacyIconUrl(crystal) ? (
                  <LegacyIcon name={crystal} size={18} />
                ) : (
                  <span className="text-[10px] font-semibold text-ink/60">
                    {crystalLabel(crystal).slice(0, 2)}
                  </span>
                )
              ) : (
                <span className="text-xs font-semibold text-ink/25">{index + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuildPanel({
  title,
  tint,
  build,
  referenceBuild,
  selectedPresetKey,
  presets,
  catalog,
  validationSummary,
  slotErrors,
  activeSlot,
  activeSocketIndex,
  onBuildFocus,
  onBuildChange,
  onSwapWeapons,
  onSlotFocus,
  onSocketInteract,
}: BuildPanelProps) {
  const presetByKey = new Map(presets.map((preset) => [preset.key, preset]));
  const selectedPreset = presetByKey.get(selectedPresetKey) || null;
  const selectedPresetSource =
    selectedPresetKey === '__custom__' ? 'custom' : selectedPreset?.source || 'attacker-preset';
  const selectedPresetLabel =
    selectedPresetKey === '__custom__'
      ? 'Custom loadout'
      : presetByKey.get(selectedPresetKey)?.label || selectedPresetKey;
  const previewStats = buildPreviewStats(build, catalog);
  const deltaLines = buildDeltaLines(build, referenceBuild, catalog);
  const slotConfigs: Array<{ key: SlotKey; label: string; part: BuildPart }> = [
    { key: 'armor', label: 'Armor', part: build.armor },
    { key: 'weapon1', label: 'Weapon 1', part: build.weapon1 },
    { key: 'weapon2', label: 'Weapon 2', part: build.weapon2 },
    { key: 'misc1', label: 'Misc 1', part: build.misc1 },
    { key: 'misc2', label: 'Misc 2', part: build.misc2 },
  ];
  const sourceChipClass =
    selectedPresetKey === '__custom__'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : selectedPresetSource === 'current-cli'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : tint === 'attacker'
          ? 'border-accent/18 bg-accent/8 text-accent'
          : 'border-steel/18 bg-steel/8 text-steel';
  const toneChipClass =
    tint === 'attacker'
      ? 'border-accent/18 bg-accent/8 text-accent'
      : 'border-steel/18 bg-steel/8 text-steel';
  const activeTargetLabel = activeSlot
    ? `${slotLabel(activeSlot)}${activeSocketIndex !== null ? ` · Socket ${activeSocketIndex + 1}` : ''}`
    : null;

  function updateStat(field: keyof SimBuild['stats'], raw: string) {
    onBuildChange({
      ...build,
      stats: {
        ...build.stats,
        [field]: Math.max(0, Math.floor(Number(raw) || 0)),
      },
    });
  }

  function updateAttackStyle(nextStyle: AttackStyle) {
    onBuildChange({
      ...build,
      attackStyle: nextStyle,
    });
  }

  return (
    <section className={`${panelCardClass} bg-panel/94`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/40 pb-3">
        <div className="min-w-0">
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
              tint === 'attacker' ? 'text-accent' : 'text-steel'
            }`}
          >
            {title}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
              {selectedPresetLabel}
            </h2>
            <span
              className={`inline-flex h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${sourceChipClass}`}
            >
              {sourceLabel(selectedPresetSource)}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className={`${chipClass} ${toneChipClass}`}>{attackStyleLabel(build.attackStyle)}</span>
            <span className={`${chipClass} bg-white/90`}>HP {wholeNumber.format(previewStats.hp)}</span>
            <span className={`${chipClass} bg-white/90`}>
              S/A/D {wholeNumber.format(previewStats.speed)}/{wholeNumber.format(previewStats.accuracy)}/{wholeNumber.format(previewStats.dodge)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${compactButtonClass} px-4 text-sm`}
            onClick={onBuildFocus}
          >
            Builds
          </button>
          <button
            type="button"
            className={`${compactButtonClass} px-4 text-sm`}
            onClick={onSwapWeapons}
          >
            Swap W1 / W2
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className={labelClass}>Stats and Style</div>
        <div className="mt-2 grid grid-cols-3 gap-2 xl:grid-cols-6">
          {statFields.map(({ key, label }) => (
            <label key={`${title}-${key}`} className="grid gap-1 text-sm">
              <span className={labelClass}>{label}</span>
              <input
                className={compactNumericControlClass}
                type="number"
                min={0}
                value={build.stats[key]}
                onChange={(event) => updateStat(key, event.target.value)}
              />
            </label>
          ))}

          <label className="grid gap-1 text-sm">
            <span className={labelClass}>Style</span>
            <select
              className={compactControlClass}
              value={build.attackStyle}
              onChange={(event) => updateAttackStyle(event.target.value as AttackStyle)}
            >
              {attackStyleOptions.map((style) => (
                <option key={`${title}-${style}`} value={style}>
                  {attackStyleLabel(style)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-3 border-t border-line/40 pt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className={labelClass}>Equipment</div>
          {activeTargetLabel ? <span className={`${chipClass} bg-white/92`}>{activeTargetLabel}</span> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {slotConfigs.map((slot) => (
            <SlotTile
              key={`${title}-${slot.key}`}
              label={slot.label}
              part={slot.part}
              tint={tint}
              active={activeSlot === slot.key}
              activeSocketIndex={activeSlot === slot.key ? activeSocketIndex : null}
              errorCount={slotErrors[slot.key]?.length || 0}
              catalog={catalog}
              onClick={() => onSlotFocus(slot.key)}
              onSocketClick={(socketIndex) => onSocketInteract(slot.key, socketIndex)}
            />
          ))}
        </div>
      </div>

      {validationSummary.length ? (
        <div className="mt-3 rounded-[18px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationSummary.join(' ')}
        </div>
      ) : null}

      <details className={`mt-3 ${disclosureClass}`}>
        <summary className={disclosureSummaryClass}>
          <span>Advanced preview</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/35">Expand</span>
        </summary>
        <div className="grid gap-4 border-t border-line/40 px-4 py-4">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
              Final compiled base
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5">
              {previewFields.map(({ key, label }) => (
                <div
                  key={`${title}-${key}`}
                  className="rounded-[18px] border border-line/45 bg-white/82 px-3 py-2.5"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                    {label}
                  </div>
                  <div className="mt-1 font-display text-sm font-semibold text-ink">
                    {wholeNumber.format(previewStats[key])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {deltaLines.length ? (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                Delta vs source preset
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deltaLines.map((line) => (
                  <span key={`${title}-${line}`} className={`${chipClass} bg-white/88`}>
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
