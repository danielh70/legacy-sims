'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { LegacyIcon } from '@/components/legacy-icon';
import { type BuildPart, type ItemCatalogEntry, type SimCatalog } from '@/lib/engine/types';
import {
  buttonClass,
  chipClass,
  compactButtonClass,
  controlClass,
  iconTileClass,
  labelClass,
  panelCardClass,
  socketIconTileClass,
  twoLineClampClass,
} from '@/lib/ui/layout-system';
import {
  BUILD_PART_SOCKET_COUNT,
  buildFastCrystalList,
  getBuildPartSocketCrystals,
  getSlotPreview,
  type SlotKey,
} from '@/lib/ui/build-ux';
import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

interface SlotEditorSlot {
  key: SlotKey;
  label: string;
  value: BuildPart;
  items: ItemCatalogEntry[];
  errors?: string[];
}

interface SlotEditorProps {
  title: string;
  tint: 'attacker' | 'defender';
  slots: SlotEditorSlot[];
  activeSlot: SlotKey;
  catalog: SimCatalog;
  onActiveSlotChange: (slot: SlotKey) => void;
  onChange: (slot: SlotKey, next: BuildPart) => void;
  onClose: () => void;
}

const baseButtonClass =
  'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

export function SlotEditor({
  title,
  tint,
  slots,
  activeSlot,
  catalog,
  onActiveSlotChange,
  onChange,
  onClose,
}: SlotEditorProps) {
  const [activeSocket, setActiveSocket] = useState(0);
  const [itemQuery, setItemQuery] = useState('');
  const deferredItemQuery = useDeferredValue(itemQuery.trim().toLowerCase());
  const currentSlot = slots.find((slot) => slot.key === activeSlot) || slots[0];
  const { label, value, items, errors = [] } = currentSlot;
  const socketCrystals = useMemo(() => getBuildPartSocketCrystals(value), [value]);
  const crystalChoices = useMemo(() => buildFastCrystalList(value.crystal, catalog), [value.crystal, catalog]);
  const [paletteCrystal, setPaletteCrystal] = useState<string>(value.crystal || crystalChoices[0] || '');
  const item = catalog.itemsByName[value.name];
  const upgradeSlots = item?.upgradeSlots || [];
  const preview = getSlotPreview(value, catalog);
  const compactStatLines = preview.statLines.slice(0, 3);
  const selectedSocketCrystal = socketCrystals[activeSocket] || '';
  const accentTone = tint === 'attacker' ? 'text-accent' : 'text-steel';
  const accentSurfaceClass =
    tint === 'attacker'
      ? 'border-accent/18 bg-gradient-to-br from-panel/96 via-white/80 to-orange-50/74'
      : 'border-steel/18 bg-gradient-to-br from-panel/96 via-white/80 to-sky-50/74';
  const activeItemClass =
    tint === 'attacker'
      ? 'border-accent/55 bg-accent/10 text-accent shadow-[0_12px_26px_rgba(180,90,47,0.14)]'
      : 'border-steel/55 bg-steel/10 text-steel shadow-[0_12px_26px_rgba(44,73,84,0.14)]';
  const activeSocketClass =
    tint === 'attacker'
      ? 'border-accent bg-accent/10 shadow-[0_14px_28px_rgba(180,90,47,0.14)]'
      : 'border-steel bg-steel/10 shadow-[0_14px_28px_rgba(44,73,84,0.14)]';
  const emphasisChipClass =
    tint === 'attacker'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-steel/20 bg-steel/10 text-steel';
  const crystalComposition = socketCrystals.filter(Boolean).map(crystalLabel).join(' / ');
  const activeSocketSummary = selectedSocketCrystal ? crystalLabel(selectedSocketCrystal) : 'Empty';
  const filledSocketCount = socketCrystals.filter(Boolean).length;

  const filteredItems = useMemo(() => {
    const sortedItems = [...items].sort((left, right) => {
      if (left.name === value.name) return -1;
      if (right.name === value.name) return 1;
      return left.name.localeCompare(right.name);
    });

    if (!deferredItemQuery) return sortedItems;

    return sortedItems.filter((entry) =>
      entry.name.toLowerCase().includes(deferredItemQuery),
    );
  }, [deferredItemQuery, items, value.name]);

  useEffect(() => {
    if (selectedSocketCrystal) {
      setPaletteCrystal(selectedSocketCrystal);
      return;
    }

    if (!paletteCrystal || !catalog.crystalDetails[paletteCrystal]) {
      setPaletteCrystal(value.crystal || crystalChoices[0] || '');
    }
  }, [
    catalog.crystalDetails,
    crystalChoices,
    paletteCrystal,
    selectedSocketCrystal,
    value.crystal,
  ]);

  useEffect(() => {
    setActiveSocket(0);
    setItemQuery('');
  }, [activeSlot, title]);

  function commitSockets(nextSockets: string[]) {
    const normalized = Array.from({ length: BUILD_PART_SOCKET_COUNT }, (_, index) => nextSockets[index] || '');
    const primaryCrystal = normalized.find(Boolean) || '';
    onChange(currentSlot.key, {
      ...value,
      crystal: primaryCrystal,
      crystals: normalized,
    });
  }

  function assignCrystalToSocket(nextCrystal: string, socketIndex = activeSocket) {
    const nextSockets = [...socketCrystals];
    nextSockets[socketIndex] = nextCrystal;
    setPaletteCrystal(nextCrystal);
    commitSockets(nextSockets);
    const nextEmptySocket = nextSockets.findIndex((crystal, index) => index > socketIndex && !crystal);
    if (nextEmptySocket !== -1) {
      setActiveSocket(nextEmptySocket);
      return;
    }
    if (socketIndex < BUILD_PART_SOCKET_COUNT - 1) {
      setActiveSocket(socketIndex + 1);
    }
  }

  function clearSocket(socketIndex = activeSocket) {
    const nextSockets = [...socketCrystals];
    nextSockets[socketIndex] = '';
    commitSockets(nextSockets);
  }

  function fillAll() {
    if (!paletteCrystal) return;
    commitSockets(Array.from({ length: BUILD_PART_SOCKET_COUNT }, () => paletteCrystal));
  }

  function fillRemaining() {
    if (!paletteCrystal) return;
    commitSockets(socketCrystals.map((crystal) => crystal || paletteCrystal));
  }

  function clearAll() {
    commitSockets(Array.from({ length: BUILD_PART_SOCKET_COUNT }, () => ''));
  }

  function copyFirstToAll() {
    const source = socketCrystals[0] || paletteCrystal;
    if (!source) return;
    setPaletteCrystal(source);
    commitSockets(Array.from({ length: BUILD_PART_SOCKET_COUNT }, () => source));
  }

  function updateUpgrade(slotIndex: number, nextValue: string) {
    const nextUpgrades = [...value.upgrades];
    nextUpgrades[slotIndex] = nextValue;
    onChange(currentSlot.key, {
      ...value,
      upgrades: nextUpgrades.filter(Boolean),
    });
  }

  function updateItem(nextName: string) {
    const nextItem = catalog.itemsByName[nextName];
    onChange(currentSlot.key, {
      ...value,
      name: nextName,
      upgrades: nextItem?.upgradeSlots?.length ? value.upgrades.slice(0, nextItem.upgradeSlots.length) : [],
    });
  }

  return (
    <section className={`${panelCardClass} ${accentSurfaceClass} w-full max-w-[1280px] p-5 md:p-6`}>
      <div className="flex flex-col gap-4 border-b border-line/40 pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${accentTone}`}>
            {title} Equipment
          </div>

          <div className="mt-3 flex items-start gap-3">
            {getLegacyIconUrl(value.name) ? (
              <div className={iconTileClass}>
                <LegacyIcon name={value.name} size={30} />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${emphasisChipClass}`}
                >
                  {label}
                </span>
                <span className="inline-flex h-7 items-center rounded-full border border-line/50 bg-white/90 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/58">
                  Sockets {filledSocketCount}/4
                </span>
                {upgradeSlots.length ? (
                  <span className="inline-flex h-7 items-center rounded-full border border-line/50 bg-white/90 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/58">
                    Upgrades {upgradeSlots.length}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em] text-ink">
                {value.name}
              </h2>

              {(compactStatLines.length || preview.damageLine || crystalComposition) ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {compactStatLines.map((line) => (
                    <span
                      key={`${label}-${line}`}
                      className={`${chipClass} bg-white/90`}
                    >
                      {line}
                    </span>
                  ))}
                  {preview.damageLine ? (
                    <span className={`${chipClass} border-accent/20 bg-accent/10 text-accent`}>
                      {preview.damageLine}
                    </span>
                  ) : null}
                  {crystalComposition ? (
                    <span className={`${chipClass} bg-white/90`}>
                      {crystalComposition}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={buttonClass}
          onClick={onClose}
        >
          Done
        </button>
      </div>

      {errors.length ? (
        <div className="mt-4 rounded-[20px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.join(' ')}
        </div>
      ) : null}

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="grid gap-5">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={labelClass}>Choose Slot</div>
              <div className="text-sm text-ink/52">Five slots, one editor.</div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-5">
              {slots.map((slot) => {
                const active = slot.key === currentSlot.key;
                const slotPreview = getSlotPreview(slot.value, catalog);
                const slotCrystals = getBuildPartSocketCrystals(slot.value);

                return (
                  <button
                    key={`${title}-${slot.key}`}
                    type="button"
                    className={`${baseButtonClass} rounded-[20px] border p-3 text-left ${
                      active ? activeItemClass : 'border-line/55 bg-white/76 text-ink hover:border-line/80'
                    }`}
                    onClick={() => onActiveSlotChange(slot.key)}
                  >
                    <div className="flex items-start gap-3">
                      {getLegacyIconUrl(slot.value.name) ? (
                        <div className={iconTileClass}>
                          <LegacyIcon name={slot.value.name} size={24} />
                        </div>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/48">
                          {slot.label}
                        </div>
                        <div className="truncate text-sm font-semibold text-ink" title={slot.value.name}>
                          {slot.value.name}
                        </div>
                        <div className="mt-1 text-xs text-ink/54">
                          {slotPreview.damageLine || slotPreview.statLines[0] || 'No preview'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {slotCrystals.map((crystal, index) => (
                        <span
                          key={`${slot.key}-${index}`}
                          className={`${socketIconTileClass} h-9 w-full rounded-xl ${
                            crystal ? 'bg-white/92' : 'bg-panel/45'
                          }`}
                          title={crystal || `Socket ${index + 1}`}
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
                            <span className="text-xs font-semibold text-ink/25">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-line/40 pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={labelClass}>Choose Item</div>
                <div className="mt-1 text-sm text-ink/52">
                  {filteredItems.length} option{filteredItems.length === 1 ? '' : 's'} visible
                </div>
              </div>

              <label className="grid gap-1 text-sm md:w-[280px]">
                <span className={labelClass}>Search</span>
                <input
                  className={controlClass}
                  type="search"
                  value={itemQuery}
                  onChange={(event) => setItemQuery(event.target.value)}
                  placeholder={`Find ${label.toLowerCase()}`}
                />
              </label>
            </div>

            <div className="mt-3 grid max-h-[34rem] gap-2 overflow-auto pr-1 sm:grid-cols-2">
              {filteredItems.map((entry) => {
                const active = entry.name === value.name;
                const itemIconUrl = getLegacyIconUrl(entry.name);

                return (
                  <button
                    key={`${label}-${entry.name}`}
                    type="button"
                    className={`${baseButtonClass} rounded-[20px] border p-3 text-left ${
                      active ? activeItemClass : 'border-line/55 bg-white/76 text-ink hover:border-line/80'
                    }`}
                    onClick={() => updateItem(entry.name)}
                    title={entry.name}
                  >
                    <div className="flex items-start gap-3">
                      {itemIconUrl ? (
                        <div className={iconTileClass}>
                          <LegacyIcon name={entry.name} size={26} />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className={twoLineClampClass}>{entry.name}</div>
                        {entry.baseWeaponDamage ? (
                          <div className="mt-1 text-sm text-ink/56">
                            Damage {entry.baseWeaponDamage.min}-{entry.baseWeaponDamage.max}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[22px] border border-line/55 bg-white/76 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={labelClass}>Socket Focus</div>
              <span
                className={`inline-flex h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${emphasisChipClass}`}
              >
                Socket {activeSocket + 1} · {activeSocketSummary}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {socketCrystals.map((crystal, index) => {
                const active = index === activeSocket;
                return (
                  <button
                    key={`${label}-socket-${index}`}
                    type="button"
                    className={`${baseButtonClass} min-h-[104px] rounded-[20px] border bg-white/88 p-3 text-center ${
                      active ? activeSocketClass : 'border-line/50 hover:border-line/80'
                    }`}
                    onClick={() => setActiveSocket(index)}
                    title={crystal || `Socket ${index + 1}`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                      {index + 1}
                    </div>
                    <div className="mt-2 flex h-10 items-center justify-center">
                      {crystal ? (
                        <LegacyIcon name={crystal} size={24} />
                      ) : (
                        <span className="text-lg font-semibold text-ink/25">+</span>
                      )}
                    </div>
                    <div className="mt-2 truncate text-xs font-medium text-ink/58">
                      {crystal ? crystalLabel(crystal) : 'Empty'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`${baseButtonClass} ${compactButtonClass} ${emphasisChipClass}`}
                onClick={fillAll}
              >
                Fill All 4
              </button>
              <button
                type="button"
                className={`${baseButtonClass} ${compactButtonClass} ${emphasisChipClass}`}
                onClick={fillRemaining}
              >
                Fill Remaining
              </button>
              <button
                type="button"
                className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white text-ink/70 hover:border-accent hover:text-accent`}
                onClick={() => clearSocket()}
              >
                Clear Socket
              </button>
              <button
                type="button"
                className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white text-ink/70 hover:border-accent hover:text-accent`}
                onClick={copyFirstToAll}
              >
                Copy 1st to All
              </button>
              <button
                type="button"
                className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white text-ink/70 hover:border-accent hover:text-accent`}
                onClick={clearAll}
              >
                Clear All
              </button>
            </div>

            <div className="mt-3 rounded-[18px] border border-line/45 bg-white/88 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/42">
                Current Composition
              </div>
              <div className="mt-1 text-sm font-medium text-ink/72">
                {crystalComposition || 'No crystals selected'}
              </div>
            </div>
          </section>

          {upgradeSlots.length ? (
            <section className="rounded-[22px] border border-line/55 bg-white/76 p-4">
              <div className={labelClass}>Upgrades</div>
              <div className="mt-3 grid gap-2">
                {upgradeSlots.map((slotOptions, slotIndex) => {
                  const options = ['None', ...slotOptions.filter((option) => catalog.upgrades.includes(option))];

                  return (
                    <div
                      key={`${label}-upgrade-${slotIndex}`}
                      className="rounded-[18px] border border-line/45 bg-white/88 px-3 py-3"
                    >
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/42">
                        Upgrade {slotIndex + 1}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((option) => {
                          const active = (value.upgrades[slotIndex] || 'None') === option;

                          return (
                            <button
                              key={`${label}-upgrade-${slotIndex}-${option}`}
                              type="button"
                              className={`${baseButtonClass} ${compactButtonClass} gap-1.5 ${
                                active
                                  ? activeItemClass
                                  : 'border-line/50 bg-white text-ink/70 hover:border-accent hover:text-accent'
                              }`}
                              onClick={() => updateUpgrade(slotIndex, option === 'None' ? '' : option)}
                            >
                              {option !== 'None' ? <LegacyIcon name={option} size={14} /> : null}
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-line/55 bg-white/76 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={labelClass}>Crystal Palette</div>
              <span className="inline-flex h-7 items-center rounded-full border border-line/50 bg-white/90 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/58">
                Click to apply · {paletteCrystal ? crystalLabel(paletteCrystal) : 'Choose'}
              </span>
            </div>

            <div className="mt-3 grid max-h-[34rem] grid-cols-2 gap-2 overflow-auto pr-1">
              {crystalChoices.map((crystal) => {
                const active = crystal === paletteCrystal;

                return (
                  <button
                    key={`${label}-${crystal}`}
                    type="button"
                    className={`${baseButtonClass} flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-[20px] border p-3 text-center ${
                      active ? activeItemClass : 'border-line/55 bg-white/88 text-ink hover:border-line/80'
                    }`}
                    onClick={() => assignCrystalToSocket(crystal)}
                    title={crystal}
                  >
                    <div className={iconTileClass}>
                      <LegacyIcon name={crystal} size={26} />
                    </div>
                    <span className="text-xs font-semibold leading-4 text-ink">
                      {crystalLabel(crystal)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
