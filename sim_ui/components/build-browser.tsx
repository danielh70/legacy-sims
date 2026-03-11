'use client';

import { useDeferredValue, useMemo, useState } from 'react';

import { LegacyIcon } from '@/components/legacy-icon';
import {
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
} from '@/lib/engine/types';
import {
  chipClass,
  compactButtonClass,
  controlClass,
  miniIconTileClass,
  socketIconTileClass,
  twoLineClampClass,
} from '@/lib/ui/layout-system';
import { buildPreviewStats, getBuildPartSocketCrystals } from '@/lib/ui/build-ux';
import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

interface BuildBrowserProps {
  sideLabel: string;
  tint: 'attacker' | 'defender';
  currentBuild: SimBuild;
  selectedPresetKey: string;
  presets: NamedBuildPreset[];
  featuredPresetKeys: string[];
  catalog: SimCatalog;
  onSelect: (presetKey: string) => void;
}

type BrowserEntry = {
  key: string;
  label: string;
  build: SimBuild;
  source: NamedBuildPreset['source'] | 'custom';
  featured: boolean;
};

type BrowserFilter = 'all' | 'featured';

const wholeNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

function attackStyleLabel(style: SimBuild['attackStyle']) {
  return style[0].toUpperCase() + style.slice(1);
}

function sourceLabel(source: BrowserEntry['source']) {
  if (source === 'custom') return 'Live';
  if (source === 'current-cli') return 'CLI';
  return 'Preset';
}

function buildParts(build: SimBuild) {
  return [build.armor, build.weapon1, build.weapon2, build.misc1, build.misc2];
}

function BrowserCard({
  entry,
  active,
  tint,
  catalog,
  onClick,
}: {
  entry: BrowserEntry;
  active: boolean;
  tint: 'attacker' | 'defender';
  catalog: SimCatalog;
  onClick: () => void;
}) {
  const previewStats = buildPreviewStats(entry.build, catalog);
  const parts = buildParts(entry.build);
  const activeSurfaceClass =
    tint === 'attacker'
      ? 'border-accent/65 bg-accent/10 shadow-[0_14px_28px_rgba(180,90,47,0.14)]'
      : 'border-steel/65 bg-steel/10 shadow-[0_14px_28px_rgba(44,73,84,0.14)]';
  const toneChipClass =
    tint === 'attacker'
      ? 'border-accent/18 bg-accent/8 text-accent'
      : 'border-steel/18 bg-steel/8 text-steel';
  const sourceChipClass =
    entry.source === 'custom'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : entry.source === 'current-cli'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : toneChipClass;

  return (
    <button
      type="button"
      className={`w-full rounded-[18px] border p-3 text-left transition hover:border-line/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        active ? activeSurfaceClass : 'border-line/55 bg-white/76'
      }`}
      onClick={onClick}
      title={entry.label}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={twoLineClampClass}>{entry.label}</div>
          <div className="mt-1 text-[11px] text-ink/55">
            HP {wholeNumber.format(previewStats.hp)} · S/A/D {wholeNumber.format(previewStats.speed)}/
            {wholeNumber.format(previewStats.accuracy)}/{wholeNumber.format(previewStats.dodge)}
          </div>
        </div>
        {active ? <span className={`${chipClass} shrink-0 bg-white/92`}>Selected</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${sourceChipClass}`}
        >
          {sourceLabel(entry.source)}
        </span>
        {entry.featured ? (
          <span className="inline-flex h-6 items-center rounded-full border border-line/45 bg-white/92 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/58">
            Pinned
          </span>
        ) : null}
        <span
          className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            tint === 'attacker'
              ? 'border-accent/15 bg-accent/8 text-accent'
              : 'border-steel/15 bg-steel/8 text-steel'
          }`}
        >
          {attackStyleLabel(entry.build.attackStyle)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {parts.map((part, index) => (
          <div
            key={`${entry.key}-part-${index}`}
            className={miniIconTileClass}
            title={part.name}
          >
            {getLegacyIconUrl(part.name) ? (
              <LegacyIcon name={part.name} size={22} />
            ) : (
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                {index + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {parts.map((part, index) => {
          const socketCrystal = getBuildPartSocketCrystals(part)[0] || '';
          return (
            <span
              key={`${entry.key}-crystal-${index}`}
              className={`${socketIconTileClass} h-8 w-full rounded-xl ${
                socketCrystal ? 'bg-white/92' : 'bg-panel/45'
              }`}
              title={socketCrystal || 'No crystal'}
            >
              {socketCrystal ? (
                getLegacyIconUrl(socketCrystal) ? (
                  <LegacyIcon name={socketCrystal} size={16} />
                ) : (
                  <span className="text-[10px] font-semibold text-ink/60">
                    {crystalLabel(socketCrystal).slice(0, 2)}
                  </span>
                )
              ) : (
                <span className="text-xs font-semibold text-ink/25">+</span>
              )}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export function BuildBrowser({
  sideLabel,
  tint,
  currentBuild,
  selectedPresetKey,
  presets,
  featuredPresetKeys,
  catalog,
  onSelect,
}: BuildBrowserProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BrowserFilter>('all');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const entries = useMemo(() => {
    const featuredKeys = new Set(featuredPresetKeys);
    const baseEntries: BrowserEntry[] = [
      ...(selectedPresetKey === '__custom__'
        ? [
            {
              key: '__custom__',
              label: 'Custom build',
              build: currentBuild,
              source: 'custom' as const,
              featured: false,
            },
          ]
        : []),
      ...presets.map((preset) => ({
        key: preset.key,
        label: preset.label,
        build: preset.build,
        source: preset.source,
        featured: featuredKeys.has(preset.key),
      })),
    ];

    const filteredEntries = baseEntries.filter((entry) => {
      if (filter === 'featured' && !entry.featured && entry.key !== selectedPresetKey) {
        return false;
      }

      if (!deferredQuery) return true;

      const haystack = [entry.label, ...buildParts(entry.build).map((part) => part.name)]
        .join(' ')
        .toLowerCase();

      return haystack.includes(deferredQuery);
    });

    return filteredEntries.sort((left, right) => {
      const score = (entry: BrowserEntry) => {
        if (entry.key === selectedPresetKey) return 0;
        if (entry.featured) return 1;
        if (entry.source === 'current-cli') return 2;
        if (entry.source === 'custom') return 3;
        return 4;
      };
      const diff = score(left) - score(right);
      if (diff !== 0) return diff;
      return left.label.localeCompare(right.label);
    });
  }, [currentBuild, deferredQuery, featuredPresetKeys, filter, presets, selectedPresetKey]);

  const filterClass =
    tint === 'attacker'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-steel/20 bg-steel/10 text-steel';

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-ink/56">
          {entries.length} preset{entries.length === 1 ? '' : 's'}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`${compactButtonClass} ${
              filter === 'all' ? filterClass : 'border-line/55 bg-white/90 text-ink/70'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`${compactButtonClass} ${
              filter === 'featured' ? filterClass : 'border-line/55 bg-white/90 text-ink/70'
            }`}
            onClick={() => setFilter('featured')}
          >
            Pinned
          </button>
        </div>
      </div>

      <input
        className={controlClass}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Find ${sideLabel.toLowerCase()} build`}
      />

      {entries.length ? (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <BrowserCard
              key={`${sideLabel}-${entry.key}`}
              entry={entry}
              active={entry.key === selectedPresetKey}
              tint={tint}
              catalog={catalog}
              onClick={() => onSelect(entry.key)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
          No builds matched the current filter.
        </div>
      )}
    </div>
  );
}
