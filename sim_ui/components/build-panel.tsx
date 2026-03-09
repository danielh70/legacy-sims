'use client';

import { LegacyIcon } from '@/components/legacy-icon';
import {
  type BuildPart,
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
} from '@/lib/engine/types';
import {
  buttonClass,
  chipClass,
  controlClass,
  disclosureClass,
  disclosureSummaryClass,
  innerSurfaceClass,
  labelClass,
  numericControlClass,
  panelCardClass,
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
  featuredPresetKeys: string[];
  catalog: SimCatalog;
  validationSummary: string[];
  slotErrors: Partial<Record<SlotKey, string[]>>;
  activeSlot: SlotKey | null;
  onPresetChange: (presetKey: string) => void;
  onBuildChange: (next: SimBuild) => void;
  onSwapWeapons: () => void;
  onSlotFocus: (slot: SlotKey | null) => void;
}

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

const statCellClass = 'rounded-xl bg-white/88 px-2.5 py-2 ring-1 ring-line/10';
const presetGridClass = 'grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]';
const overflowPresetGridClass = 'grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]';
const quickStatGridClass = 'grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(92px,1fr))]';
const quickStatInputClass = `${numericControlClass} h-9 min-w-0 px-2.5 text-center text-base leading-none`;

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

function presetIconFallback(label: string) {
  return label.slice(0, 2).toUpperCase();
}

function PresetIconStrip({ preset, tint }: { preset: NamedBuildPreset; tint: 'attacker' | 'defender' }) {
  const parts: Array<{ name: string; label: string }> = [
    { name: preset.build.armor.name, label: 'A' },
    { name: preset.build.weapon1.name, label: '1' },
    { name: preset.build.weapon2.name, label: '2' },
    { name: preset.build.misc1.name, label: 'M1' },
    { name: preset.build.misc2.name, label: 'M2' },
  ];
  const fallbackClass =
    tint === 'attacker'
      ? 'border-accent/15 bg-accent/8 text-accent'
      : 'border-steel/15 bg-steel/8 text-steel';

  return (
    <div className="grid min-w-[136px] grid-cols-5 gap-1">
      {parts.map((part, index) => (
        <span
          key={`${preset.key}-${part.label}-${index}`}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/92 ring-1 ring-line/10"
          title={part.name}
        >
          {getLegacyIconUrl(part.name) ? (
            <LegacyIcon name={part.name} size={14} />
          ) : (
            <span className={`rounded-md border px-1 py-0.5 text-[9px] font-semibold ${fallbackClass}`}>
              {presetIconFallback(part.label)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function PresetChoiceButton({
  preset,
  active,
  tint,
  onClick,
}: {
  preset: NamedBuildPreset;
  active: boolean;
  tint: 'attacker' | 'defender';
  onClick: () => void;
}) {
  const activeClass =
    tint === 'attacker'
      ? 'border-accent bg-accent/10 shadow-[0_8px_24px_rgba(219,117,36,0.12)]'
      : 'border-steel bg-steel/10 shadow-[0_8px_24px_rgba(66,118,161,0.12)]';

  return (
    <button
      type="button"
      className={`min-w-0 min-h-[74px] rounded-2xl border px-3 py-3 text-left transition hover:border-line/80 ${
        active ? activeClass : 'border-line/50 bg-white/92'
      }`}
      onClick={onClick}
      title={preset.label}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className={twoLineClampClass}>{preset.label}</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink/40">
            Quick preset
          </div>
        </div>
        <div className="shrink-0 overflow-hidden">
          <PresetIconStrip preset={preset} tint={tint} />
        </div>
      </div>
    </button>
  );
}

function LoadoutSummarySlot({
  label,
  part,
  tint,
  isActive,
  errorCount,
  onClick,
  catalog,
}: {
  label: string;
  part: BuildPart;
  tint: 'attacker' | 'defender';
  isActive: boolean;
  errorCount: number;
  onClick: () => void;
  catalog: SimCatalog;
}) {
  const itemIconUrl = getLegacyIconUrl(part.name);
  const socketCrystals = getBuildPartSocketCrystals(part);
  const damageLine = getSlotPreview(part, catalog).damageLine;
  const crystalSummary = socketCrystals.filter(Boolean).map(crystalLabel).join(' / ') || 'No crystals selected';
  const activeClass =
    tint === 'attacker'
      ? 'border-accent/70 bg-accent/10 ring-2 ring-accent/25 shadow-[0_12px_34px_rgba(219,117,36,0.16)]'
      : 'border-steel/70 bg-steel/10 ring-2 ring-steel/25 shadow-[0_12px_34px_rgba(66,118,161,0.16)]';
  const badgeClass =
    tint === 'attacker'
      ? 'border-accent/15 bg-accent/8 text-accent'
      : 'border-steel/15 bg-steel/8 text-steel';

  return (
    <button
      type="button"
      className={`min-w-0 rounded-[20px] border p-3 text-left transition hover:border-line/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        isActive ? activeClass : 'border-line/50 bg-white/92'
      }`}
      onClick={onClick}
      title={`${label}: ${part.name}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
            {label}
          </div>
          <div className="mt-2 flex min-w-0 items-start gap-2.5">
            {itemIconUrl ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-panel/55 ring-1 ring-line/10">
                <LegacyIcon name={part.name} size={36} />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className={twoLineClampClass} title={part.name}>
                {part.name}
              </div>
              {damageLine ? (
                <div className="mt-1 text-[11px] font-medium text-ink/55">{damageLine}</div>
              ) : null}
            </div>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            errorCount
              ? 'border-red-300 bg-red-50 text-red-700'
              : isActive
                ? badgeClass
                : 'border-line/50 bg-white/92 text-ink/45'
          }`}
        >
          {errorCount ? `${errorCount} issue${errorCount === 1 ? '' : 's'}` : isActive ? 'Editing' : 'Edit'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {socketCrystals.map((crystal, index) => (
          <span
            key={`${label}-${part.name}-${crystal}-${index}`}
            className={`flex h-9 items-center justify-center rounded-[13px] ring-1 ring-line/10 ${
              crystal ? 'bg-white/92' : 'bg-panel/45'
            }`}
            title={crystal || `Socket ${index + 1}`}
          >
            {crystal ? (
              getLegacyIconUrl(crystal) ? (
                <LegacyIcon name={crystal} size={20} />
              ) : (
                <span className="text-[10px] font-semibold text-ink/60">
                  {crystalLabel(crystal).slice(0, 3)}
                </span>
              )
            ) : (
              <span className="text-sm font-semibold text-ink/25">+</span>
            )}
          </span>
        ))}
      </div>

      <div className="mt-2 break-words text-[11px] leading-4 text-ink/60" title={crystalSummary}>
        {crystalSummary}
      </div>
    </button>
  );
}

export function BuildPanel({
  title,
  tint,
  build,
  referenceBuild,
  selectedPresetKey,
  presets,
  featuredPresetKeys,
  catalog,
  validationSummary,
  slotErrors,
  activeSlot,
  onPresetChange,
  onBuildChange,
  onSwapWeapons,
  onSlotFocus,
}: BuildPanelProps) {
  const theme =
    tint === 'attacker'
      ? 'border-accent/25 bg-gradient-to-br from-white/92 to-orange-50/70'
      : 'border-steel/25 bg-gradient-to-br from-white/92 to-sky-50/70';
  const accentTone = tint === 'attacker' ? 'text-accent' : 'text-steel';
  const slotConfigs: Array<{ key: SlotKey; label: string; part: BuildPart }> = [
    { key: 'armor', label: 'Armor', part: build.armor },
    { key: 'weapon1', label: 'Weapon 1', part: build.weapon1 },
    { key: 'weapon2', label: 'Weapon 2', part: build.weapon2 },
    { key: 'misc1', label: 'Misc 1', part: build.misc1 },
    { key: 'misc2', label: 'Misc 2', part: build.misc2 },
  ];

  function updateStat(field: keyof SimBuild['stats'], raw: string) {
    onBuildChange({
      ...build,
      stats: {
        ...build.stats,
        [field]: Math.max(0, Math.floor(Number(raw) || 0)),
      },
    });
  }

  const presetByKey = new Map(presets.map((preset) => [preset.key, preset]));
  const selectedPresetLabel =
    selectedPresetKey === '__custom__'
      ? 'Custom loadout'
      : presetByKey.get(selectedPresetKey)?.label || selectedPresetKey;
  const featuredPresets = featuredPresetKeys
    .map((key) => presetByKey.get(key))
    .filter((preset): preset is NamedBuildPreset => Boolean(preset));
  const quickPresets = featuredPresets.slice(0, 3);
  const overflowPresets = featuredPresets.slice(3);
  const previewStats = buildPreviewStats(build, catalog);
  const deltaLines = buildDeltaLines(build, referenceBuild, catalog);
  const activeSlotConfig = slotConfigs.find((slot) => slot.key === activeSlot) || null;
  const topSurfaceClass =
    tint === 'attacker'
      ? 'mt-3 ring-accent/10'
      : 'mt-3 ring-steel/10';
  const loadoutSurfaceClass =
    tint === 'attacker'
      ? 'mt-2 bg-gradient-to-br from-white/88 to-orange-50/70 ring-accent/10'
      : 'mt-2 bg-gradient-to-br from-white/88 to-sky-50/70 ring-steel/10';
  const quickStatTileClass =
    tint === 'attacker'
      ? 'grid min-w-[92px] gap-1 rounded-xl bg-white px-2.5 py-2 ring-1 ring-accent/12'
      : 'grid min-w-[92px] gap-1 rounded-xl bg-white px-2.5 py-2 ring-1 ring-steel/12';
  const activeEditorChipClass =
    tint === 'attacker'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-steel/20 bg-steel/10 text-steel';

  return (
    <section className={`${panelCardClass} ${theme}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentTone}`}>
            {title}
          </div>
          <div className="mt-1 break-words text-sm font-semibold leading-4 text-ink">{selectedPresetLabel}</div>
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={onSwapWeapons}
        >
          Swap W1 / W2
        </button>
      </div>

      <div className={`${innerSurfaceClass} ${topSurfaceClass}`}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:items-start">
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span className={labelClass}>Preset</span>
              <select
                className={controlClass}
                value={selectedPresetKey}
                onChange={(event) => onPresetChange(event.target.value)}
              >
                <option value="__custom__">Custom Build</option>
                {presets.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            {quickPresets.length ? (
              <div className={presetGridClass}>
                {quickPresets.map((preset) => (
                  <PresetChoiceButton
                    key={`${title}-${preset.key}`}
                    preset={preset}
                    active={preset.key === selectedPresetKey}
                    tint={tint}
                    onClick={() => onPresetChange(preset.key)}
                  />
                ))}
              </div>
            ) : null}

            {overflowPresets.length ? (
              <details className={disclosureClass}>
                <summary className={disclosureSummaryClass}>
                  <span>More Presets</span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/35">
                    Expand
                  </span>
                </summary>
                <div className={`${overflowPresetGridClass} border-t border-line/40 px-3 py-3`}>
                  {overflowPresets.map((preset) => (
                    <PresetChoiceButton
                      key={`${title}-more-${preset.key}`}
                      preset={preset}
                      active={preset.key === selectedPresetKey}
                      tint={tint}
                      onClick={() => onPresetChange(preset.key)}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={labelClass}>
                  Quick Stats
                </div>
                <div className="text-xs text-ink/60">Editable base stats without leaving the loadout view.</div>
              </div>
            </div>
            <div className={quickStatGridClass}>
              {statFields.map(({ key, label }) => (
                <label
                  key={`${title}-${key}`}
                  className={quickStatTileClass}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/60">
                    {label}
                  </span>
                  <input
                    className={quickStatInputClass}
                    type="number"
                    min={0}
                    value={build.stats[key]}
                    onChange={(event) => updateStat(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${innerSurfaceClass} ${loadoutSurfaceClass}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className={labelClass}>
              Current Loadout
            </div>
            <div className="text-xs text-ink/55">Choose a slot, tweak gear and crystals, then run the sim.</div>
          </div>
          {activeSlotConfig ? (
            <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${activeEditorChipClass}`}>
              Editing {activeSlotConfig.label} · {activeSlotConfig.part.name}
            </div>
          ) : null}
        </div>

        <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {slotConfigs.map((slot) => (
            <LoadoutSummarySlot
              key={`${title}-${slot.key}`}
              label={slot.label}
              part={slot.part}
              tint={tint}
              isActive={activeSlot === slot.key}
              errorCount={slotErrors[slot.key]?.length || 0}
              catalog={catalog}
              onClick={() => onSlotFocus(activeSlot === slot.key ? null : slot.key)}
            />
          ))}
        </div>

      </div>

      {validationSummary.length ? (
        <div className="mt-2 rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {validationSummary.join(' ')}
        </div>
      ) : null}

      <details className={`mt-2 ${disclosureClass}`}>
        <summary className={disclosureSummaryClass}>
          <span>Advanced</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink/35">
            Expand
          </span>
        </summary>
        <div className="grid gap-3 border-t border-line/40 px-3 py-3">
          <div className="rounded-2xl bg-panel/60 p-3 ring-1 ring-line/10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                Final Preview
              </div>
              <div className="text-[11px] text-ink/45">Base stats plus current gear, crystals, and upgrades</div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-9">
              {previewFields.map(({ key, label }) => (
                <div key={`${title}-${key}`} className={statCellClass}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</div>
                  <div className="mt-1 font-display text-sm font-semibold text-ink">
                    {wholeNumber.format(previewStats[key])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {deltaLines.length ? (
            <div className="rounded-2xl bg-white/90 px-3 py-2 ring-1 ring-line/10">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                Delta vs Preset
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deltaLines.map((line) => (
                  <span
                    key={`${title}-${line}`}
                    className={`${chipClass} bg-panel/80`}
                  >
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
