'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { BuildBrowser } from '@/components/build-browser';
import { LegacyIcon } from '@/components/legacy-icon';
import {
  type ItemCatalogEntry,
  type NamedBuildPreset,
  type SimBuild,
  type SimCatalog,
} from '@/lib/engine/types';
import {
  buildFastCrystalList,
  getBuildPartSocketCrystals,
  getSlotPreview,
  type SlotKey,
} from '@/lib/ui/build-ux';
import {
  chipClass,
  compactButtonClass,
  controlClass,
  iconTileClass,
  labelClass,
  panelCardClass,
  twoLineClampClass,
} from '@/lib/ui/layout-system';
import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

export type WorkbenchTab = 'builds' | 'armors' | 'weapons' | 'miscs' | 'crystals' | 'upgrades';

export interface WorkbenchState {
  side: 'attacker' | 'defender';
  tab: WorkbenchTab;
  slot: SlotKey | null;
  socketIndex: number | null;
  upgradeIndex: number;
}

interface WorkbenchProps {
  catalog: SimCatalog;
  attackerBuild: SimBuild;
  defenderBuild: SimBuild;
  attackerPresetKey: string;
  defenderPresetKey: string;
  attackerPresets: NamedBuildPreset[];
  defenderPresets: NamedBuildPreset[];
  featuredAttackerPresetKeys: string[];
  featuredDefenderPresetKeys: string[];
  state: WorkbenchState;
  onSideChange: (side: 'attacker' | 'defender') => void;
  onTabChange: (tab: WorkbenchTab) => void;
  onPresetSelect: (side: 'attacker' | 'defender', presetKey: string) => void;
  onSocketFocus: (socketIndex: number) => void;
  onUpgradeIndexChange: (upgradeIndex: number) => void;
  onItemApply: (side: 'attacker' | 'defender', slot: SlotKey, itemName: string) => void;
  onCrystalApply: (
    side: 'attacker' | 'defender',
    slot: SlotKey,
    socketIndex: number,
    crystalName: string,
  ) => void;
  onFillAllCrystals: (side: 'attacker' | 'defender', slot: SlotKey, crystalName: string) => void;
  onFillRemainingCrystals: (
    side: 'attacker' | 'defender',
    slot: SlotKey,
    crystalName: string,
  ) => void;
  onClearAllCrystals: (side: 'attacker' | 'defender', slot: SlotKey) => void;
  onUpgradeApply: (
    side: 'attacker' | 'defender',
    slot: SlotKey,
    upgradeIndex: number,
    upgradeName: string,
  ) => void;
}

const TAB_LABELS: Record<WorkbenchTab, string> = {
  builds: 'Builds',
  armors: 'Armors',
  weapons: 'Weapons',
  miscs: 'Miscs',
  crystals: 'Crystals',
  upgrades: 'Upgrades',
};

const SLOT_LABELS: Record<SlotKey, string> = {
  armor: 'Armor',
  weapon1: 'Weapon 1',
  weapon2: 'Weapon 2',
  misc1: 'Misc 1',
  misc2: 'Misc 2',
};

const MODIFIER_LABELS: Partial<Record<string, string>> = {
  armor: 'Arm',
  speed: 'Spd',
  accuracy: 'Acc',
  dodge: 'Dod',
  gunSkill: 'Gun',
  meleeSkill: 'Mel',
  projSkill: 'Prj',
  defSkill: 'Def',
  damage: 'Dmg',
};

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

function modifierSummary(
  pct: Partial<Record<string, number>> | undefined,
  fallback = 'No bonus details',
) {
  const lines = Object.entries(pct || {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${MODIFIER_LABELS[key] || key} +${Math.round(Number(value || 0) * 100)}%`);

  return lines.slice(0, 2).join(' · ') || fallback;
}

function itemSummary(item: ItemCatalogEntry) {
  if (item.baseWeaponDamage) {
    return `Dmg ${item.baseWeaponDamage.min}-${item.baseWeaponDamage.max}`;
  }

  const flatLines = Object.entries(item.flatStats || {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${MODIFIER_LABELS[key] || key} +${value}`);

  return flatLines.slice(0, 2).join(' · ') || item.type;
}

function WorkbenchTarget({
  active,
  tint,
  children,
  onClick,
}: {
  active: boolean;
  tint: 'attacker' | 'defender';
  children: ReactNode;
  onClick?: () => void;
}) {
  const activeClass =
    tint === 'attacker'
      ? 'border-accent/35 bg-accent/10 text-accent'
      : 'border-steel/35 bg-steel/10 text-steel';
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold transition ${
        active ? activeClass : 'border-line/55 bg-white/92 text-ink/70 hover:border-accent hover:text-accent'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LibraryCard({
  active,
  name,
  detail,
  onClick,
}: {
  active: boolean;
  name: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-[18px] border p-3 text-left transition hover:border-line/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        active
          ? 'border-accent/60 bg-accent/10 shadow-[0_12px_24px_rgba(180,90,47,0.14)]'
          : 'border-line/55 bg-white/88'
      }`}
      onClick={onClick}
      title={name}
    >
      <div className="flex items-start gap-3">
        <div className={iconTileClass}>
          {getLegacyIconUrl(name) ? (
            <LegacyIcon name={name} size={28} />
          ) : (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/45">
              Item
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className={twoLineClampClass}>{name}</div>
          <div className="mt-1 text-xs text-ink/55">{detail}</div>
        </div>
      </div>
    </button>
  );
}

function PaletteTile({
  active,
  name,
  detail,
  onClick,
}: {
  active: boolean;
  name: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-[18px] border p-3 text-center transition hover:border-line/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
        active
          ? 'border-accent/60 bg-accent/10 shadow-[0_12px_24px_rgba(180,90,47,0.14)]'
          : 'border-line/55 bg-white/88'
      }`}
      onClick={onClick}
      title={name}
    >
      <div className="flex justify-center">
        <div className={iconTileClass}>
          {getLegacyIconUrl(name) ? (
            <LegacyIcon name={name} size={28} />
          ) : (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/45">
              {name.slice(0, 2)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{crystalLabel(name)}</div>
      <div className="mt-1 text-[11px] text-ink/50">{detail}</div>
    </button>
  );
}

export function Workbench({
  catalog,
  attackerBuild,
  defenderBuild,
  attackerPresetKey,
  defenderPresetKey,
  attackerPresets,
  defenderPresets,
  featuredAttackerPresetKeys,
  featuredDefenderPresetKeys,
  state,
  onSideChange,
  onTabChange,
  onPresetSelect,
  onSocketFocus,
  onUpgradeIndexChange,
  onItemApply,
  onCrystalApply,
  onFillAllCrystals,
  onFillRemainingCrystals,
  onClearAllCrystals,
  onUpgradeApply,
}: WorkbenchProps) {
  const [query, setQuery] = useState('');
  const [selectedCrystal, setSelectedCrystal] = useState('Amulet Crystal');

  const build = state.side === 'attacker' ? attackerBuild : defenderBuild;
  const selectedPresetKey = state.side === 'attacker' ? attackerPresetKey : defenderPresetKey;
  const presets = state.side === 'attacker' ? attackerPresets : defenderPresets;
  const featuredPresetKeys =
    state.side === 'attacker' ? featuredAttackerPresetKeys : featuredDefenderPresetKeys;
  const targetPart = state.slot ? build[state.slot] : null;
  const targetItem = targetPart ? catalog.itemsByName[targetPart.name] : null;
  const preview = targetPart ? getSlotPreview(targetPart, catalog) : null;
  const socketCrystals = targetPart ? getBuildPartSocketCrystals(targetPart) : [];
  const socketLabel =
    state.slot && state.socketIndex !== null ? `Socket ${state.socketIndex + 1}` : null;
  const upgradeSlots = targetItem?.upgradeSlots || [];
  const activeUpgradeName = targetPart?.upgrades?.[state.upgradeIndex] || '';
  const crystalPalette = useMemo(
    () => buildFastCrystalList(targetPart?.crystal || selectedCrystal, catalog),
    [catalog, selectedCrystal, targetPart?.crystal],
  );
  const toneChipClass =
    state.side === 'attacker'
      ? 'border-accent/18 bg-accent/8 text-accent'
      : 'border-steel/18 bg-steel/8 text-steel';
  const sideTitle = state.side === 'attacker' ? 'Attacker' : 'Defender';
  const targetLabel = state.slot ? SLOT_LABELS[state.slot] : 'Builds';

  useEffect(() => {
    if (!catalog.crystalDetails[selectedCrystal]) {
      const nextCrystal = buildFastCrystalList(targetPart?.crystal || '', catalog)[0] || catalog.crystals[0] || '';
      if (nextCrystal) setSelectedCrystal(nextCrystal);
    }
  }, [catalog, selectedCrystal, targetPart?.crystal]);

  useEffect(() => {
    setQuery('');
  }, [state.side, state.tab, state.slot]);

  const itemEntries = useMemo(() => {
    const source =
      state.tab === 'armors'
        ? catalog.armors
        : state.tab === 'weapons'
          ? catalog.weapons
          : state.tab === 'miscs'
            ? catalog.miscs
            : [];
    const search = query.trim().toLowerCase();

    return source
      .filter((item) => {
        if (!search) return true;
        return [item.name, item.type, item.skillType || ''].join(' ').toLowerCase().includes(search);
      })
      .sort((left, right) => {
        if (left.name === targetPart?.name) return -1;
        if (right.name === targetPart?.name) return 1;
        return left.name.localeCompare(right.name);
      });
  }, [catalog.armors, catalog.miscs, catalog.weapons, query, state.tab, targetPart?.name]);

  const crystalEntries = useMemo(() => {
    const search = query.trim().toLowerCase();
    return crystalPalette.filter((crystal) => {
      if (!search) return true;
      return crystal.toLowerCase().includes(search);
    });
  }, [crystalPalette, query]);

  const upgradeEntries = useMemo(() => {
    const search = query.trim().toLowerCase();
    const uniqueUpgrades = Array.from(new Set((upgradeSlots[state.upgradeIndex] || []).filter(Boolean)));

    return uniqueUpgrades.filter((upgradeName) => {
      if (!search) return true;
      return upgradeName.toLowerCase().includes(search);
    });
  }, [query, state.upgradeIndex, upgradeSlots]);

  const searchPlaceholder =
    state.tab === 'armors'
      ? 'Find armor'
      : state.tab === 'weapons'
        ? 'Find weapon'
        : state.tab === 'miscs'
          ? 'Find misc'
          : state.tab === 'crystals'
            ? 'Find crystal'
            : state.tab === 'upgrades'
              ? 'Find upgrade'
              : '';

  return (
    <section className={`${panelCardClass} flex h-full min-h-[34rem] flex-col overflow-hidden bg-panel/96 p-4`}>
      <div className="flex items-start justify-between gap-3 border-b border-line/40 pb-3">
        <div className="min-w-0">
          <div className={labelClass}>Editor</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`${chipClass} ${toneChipClass}`}>{sideTitle}</span>
            <span className={`${chipClass} bg-white/92`}>{TAB_LABELS[state.tab]}</span>
            <span className={`${chipClass} bg-white/92`}>{targetLabel}</span>
            {socketLabel ? <span className={`${chipClass} bg-white/92`}>{socketLabel}</span> : null}
            {state.tab === 'upgrades' && targetPart ? (
              <span className={`${chipClass} bg-white/92`}>Upgrade {state.upgradeIndex + 1}</span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-1.5 rounded-full border border-line/55 bg-white/82 p-1">
          {(['attacker', 'defender'] as const).map((side) => {
            const active = state.side === side;
            return (
              <button
                key={side}
                type="button"
                className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition ${
                  active
                    ? side === 'attacker'
                      ? 'bg-accent/12 text-accent'
                      : 'bg-steel/12 text-steel'
                    : 'text-ink/55 hover:text-ink'
                }`}
                onClick={() => onSideChange(side)}
              >
                {side === 'attacker' ? 'Attacker' : 'Defender'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5" role="tablist" aria-label="Workbench categories">
          {(Object.keys(TAB_LABELS) as WorkbenchTab[]).map((tab) => {
            const active = tab === state.tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[12px] font-semibold transition ${
                  active
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line/55 bg-white/90 text-ink/72 hover:border-accent hover:text-accent'
                }`}
                onClick={() => onTabChange(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-line/45 bg-white/80">
        <div className="border-b border-line/40 px-3 py-3">
          {state.tab === 'builds' ? (
            <div>
              <div className={labelClass}>Active side</div>
              <div className="mt-2 font-display text-lg font-semibold text-ink">{sideTitle} builds</div>
              <div className="mt-1 text-sm text-ink/56">
                Pick a visual preset or keep the live loadout.
              </div>
            </div>
          ) : targetPart ? (
            <div className="flex items-start gap-3">
              <div className={iconTileClass}>
                {getLegacyIconUrl(targetPart.name) ? (
                  <LegacyIcon name={targetPart.name} size={28} />
                ) : (
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                    {targetLabel}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={labelClass}>{targetLabel}</div>
                <div className="mt-1 truncate font-display text-lg font-semibold text-ink">
                  {targetPart.name}
                </div>
                <div className="mt-1 text-sm text-ink/56">
                  {preview?.damageLine || preview?.statLines[0] || 'Ready to edit'}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className={labelClass}>Target</div>
              <div className="mt-2 font-display text-lg font-semibold text-ink">Select a slot</div>
              <div className="mt-1 text-sm text-ink/56">
                Click a slot in either build to load items, crystals, or upgrades here.
              </div>
            </div>
          )}

          {state.tab === 'crystals' && targetPart ? (
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-4 gap-2">
                {socketCrystals.map((crystal, index) => (
                  <button
                    key={`${state.side}-${state.slot}-${index}`}
                    type="button"
                    className={`flex h-12 items-center justify-center rounded-2xl border transition ${
                      state.socketIndex === index
                        ? 'border-accent/55 bg-accent/10'
                        : 'border-line/45 bg-white/92 hover:border-accent/45'
                    }`}
                    onClick={() => onSocketFocus(index)}
                    title={crystal || `Socket ${index + 1}`}
                  >
                    {crystal ? (
                      getLegacyIconUrl(crystal) ? (
                        <LegacyIcon name={crystal} size={20} />
                      ) : (
                        <span className="text-xs font-semibold text-ink/60">{index + 1}</span>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-ink/28">{index + 1}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={compactButtonClass}
                  disabled={!selectedCrystal}
                  onClick={() => onFillAllCrystals(state.side, state.slot!, selectedCrystal)}
                >
                  Fill all
                </button>
                <button
                  type="button"
                  className={compactButtonClass}
                  disabled={!selectedCrystal}
                  onClick={() => onFillRemainingCrystals(state.side, state.slot!, selectedCrystal)}
                >
                  Fill remaining
                </button>
                <button
                  type="button"
                  className={compactButtonClass}
                  onClick={() => onClearAllCrystals(state.side, state.slot!)}
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : null}

          {state.tab === 'upgrades' && targetPart ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {upgradeSlots.length ? (
                upgradeSlots.map((slotOptions, index) => (
                  <WorkbenchTarget
                    key={`${state.side}-${state.slot}-upgrade-${index}`}
                    active={state.upgradeIndex === index}
                    tint={state.side}
                    onClick={() => onUpgradeIndexChange(index)}
                  >
                    U{index + 1}
                    {targetPart.upgrades[index] ? ` · ${targetPart.upgrades[index]}` : ` · ${slotOptions.length}`}
                  </WorkbenchTarget>
                ))
              ) : (
                <span className="text-sm text-ink/56">Selected item has no upgrade slots.</span>
              )}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {state.tab === 'builds' ? (
            <BuildBrowser
              sideLabel={sideTitle}
              tint={state.side}
              currentBuild={build}
              selectedPresetKey={selectedPresetKey}
              presets={presets}
              featuredPresetKeys={featuredPresetKeys}
              catalog={catalog}
              onSelect={(presetKey) => onPresetSelect(state.side, presetKey)}
            />
          ) : !targetPart ? (
            <div className="rounded-[18px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
              Click a slot in either build to start editing.
            </div>
          ) : state.tab === 'armors' || state.tab === 'weapons' || state.tab === 'miscs' ? (
            <div className="grid gap-3">
              <input
                className={controlClass}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              {itemEntries.length ? (
                <div className="grid gap-2">
                  {itemEntries.map((item) => (
                    <LibraryCard
                      key={`${state.tab}-${item.name}`}
                      active={item.name === targetPart.name}
                      name={item.name}
                      detail={itemSummary(item)}
                      onClick={() => onItemApply(state.side, state.slot!, item.name)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
                  No items matched the current search.
                </div>
              )}
            </div>
          ) : state.tab === 'crystals' ? (
            <div className="grid gap-3">
              <input
                className={controlClass}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              {crystalEntries.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {crystalEntries.map((crystalName) => (
                    <PaletteTile
                      key={crystalName}
                      active={selectedCrystal === crystalName}
                      name={crystalName}
                      detail={modifierSummary(catalog.crystalDetails[crystalName]?.pct)}
                      onClick={() => {
                        setSelectedCrystal(crystalName);
                        onCrystalApply(state.side, state.slot!, state.socketIndex ?? 0, crystalName);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
                  No crystals matched the current search.
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              <input
                className={controlClass}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              {upgradeSlots.length ? (
                upgradeEntries.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {upgradeEntries.map((upgradeName) => (
                      <PaletteTile
                        key={`${state.slot}-${state.upgradeIndex}-${upgradeName}`}
                        active={activeUpgradeName === upgradeName}
                        name={upgradeName}
                        detail={modifierSummary(catalog.upgradeDetails[upgradeName]?.pct, 'Upgrade')}
                        onClick={() =>
                          onUpgradeApply(state.side, state.slot!, state.upgradeIndex, upgradeName)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
                    No upgrades matched the current search.
                  </div>
                )
              ) : (
                <div className="rounded-[18px] border border-dashed border-line/70 bg-white/74 px-4 py-8 text-sm text-ink/55">
                  Selected item has no upgrades to edit.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
