'use client';

import { cloneBuild, type NamedBuildPreset, type SimBuild, type SimCatalog } from '@/lib/engine/types';
import { buildDeltaLines } from '@/lib/ui/build-ux';
import { SlotEditor } from '@/components/slot-editor';

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
  slotErrors: Partial<Record<keyof Omit<SimBuild, 'stats'>, string[]>>;
  onPresetChange: (presetKey: string) => void;
  onBuildChange: (next: SimBuild) => void;
  onSwapWeapons: () => void;
}

const statFields: Array<keyof SimBuild['stats']> = ['hp', 'accuracy', 'dodge', 'speed', 'level'];

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
  onPresetChange,
  onBuildChange,
  onSwapWeapons,
}: BuildPanelProps) {
  const theme =
    tint === 'attacker'
      ? 'border-accent/30 bg-gradient-to-br from-white/85 to-orange-50/80'
      : 'border-steel/30 bg-gradient-to-br from-white/85 to-sky-50/80';

  function updateStat(field: keyof SimBuild['stats'], raw: string) {
    onBuildChange({
      ...build,
      stats: {
        ...build.stats,
        [field]: Math.max(0, Math.floor(Number(raw) || 0)),
      },
    });
  }

  function updatePart(field: keyof Omit<SimBuild, 'stats'>, nextPart: SimBuild[typeof field]) {
    const next = cloneBuild(build);
    next[field] = nextPart;
    onBuildChange(next);
  }

  const presetByKey = new Map(presets.map((preset) => [preset.key, preset]));
  const deltaLines = buildDeltaLines(build, referenceBuild, catalog);
  const featuredPresets = featuredPresetKeys
    .map((key) => presetByKey.get(key))
    .filter((preset): preset is NamedBuildPreset => Boolean(preset));

  return (
    <section className={`rounded-[28px] border p-4 shadow-panel ${theme}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
          <p className="text-sm text-ink/60">Preset-backed build editor with live slot overrides.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line bg-white/90 px-3 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
          onClick={onSwapWeapons}
        >
          Swap W1 / W2
        </button>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs uppercase tracking-[0.14em] text-ink/55">Preset</span>
            <select
              className="rounded-xl border border-line bg-white/90 px-3 py-2 outline-none transition focus:border-accent"
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
          <div className="flex flex-wrap gap-1.5">
            {featuredPresets.map((preset) => {
              const active = preset.key === selectedPresetKey;
              return (
                <button
                  key={`${title}-${preset.key}`}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'border-steel bg-steel text-white'
                      : 'border-line bg-white/90 text-ink/70 hover:border-accent hover:text-accent'
                  }`}
                  onClick={() => onPresetChange(preset.key)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {statFields.map((field) => (
            <label key={field} className="grid gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.14em] text-ink/55">{field}</span>
              <input
                className="rounded-xl border border-line bg-white/90 px-3 py-2 outline-none transition focus:border-accent"
                type="number"
                min={0}
                value={build.stats[field]}
                onChange={(event) => updateStat(field, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-line/70 bg-white/70 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
            Inline Delta vs Reference
          </div>
          <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
            {deltaLines.length ? (
              deltaLines.map((line) => (
                <span
                  key={`${title}-${line}`}
                  className="rounded-full border border-line/80 bg-panel px-2.5 py-1 text-[11px] font-medium text-ink/70"
                >
                  {line}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink/45">No delta from reference build.</span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-line/70 bg-white/70 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
            Validation
          </div>
          <div className="mt-2 text-xs text-ink/65">
            {validationSummary.length ? `${validationSummary.length} issue(s) on this side.` : 'No local validation issues.'}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <SlotEditor
          label="Armor"
          value={build.armor}
          items={catalog.armors}
          catalog={catalog}
          errors={slotErrors.armor}
          onChange={(next) => updatePart('armor', next)}
        />
        <div className="grid gap-3 xl:grid-cols-2">
          <SlotEditor
            label="Weapon 1"
            value={build.weapon1}
            items={catalog.weapons}
            catalog={catalog}
            errors={slotErrors.weapon1}
            onChange={(next) => updatePart('weapon1', next)}
          />
          <SlotEditor
            label="Weapon 2"
            value={build.weapon2}
            items={catalog.weapons}
            catalog={catalog}
            errors={slotErrors.weapon2}
            onChange={(next) => updatePart('weapon2', next)}
          />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <SlotEditor
            label="Misc 1"
            value={build.misc1}
            items={catalog.miscs}
            catalog={catalog}
            errors={slotErrors.misc1}
            onChange={(next) => updatePart('misc1', next)}
          />
          <SlotEditor
            label="Misc 2"
            value={build.misc2}
            items={catalog.miscs}
            catalog={catalog}
            errors={slotErrors.misc2}
            onChange={(next) => updatePart('misc2', next)}
          />
        </div>
      </div>
    </section>
  );
}
