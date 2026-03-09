'use client';

import { useEffect, useMemo, useState } from 'react';

import { LegacyIcon } from '@/components/legacy-icon';
import { type BuildPart, type ItemCatalogEntry, type SimCatalog } from '@/lib/engine/types';
import {
  buttonClass,
  compactButtonClass,
  innerSurfaceClass,
  labelClass,
  panelCardClass,
  twoLineClampClass,
} from '@/lib/ui/layout-system';
import {
  BUILD_PART_SOCKET_COUNT,
  buildFastCrystalList,
  getBuildPartSocketCrystals,
  getSlotPreview,
} from '@/lib/ui/build-ux';
import { getLegacyIconUrl } from '@/lib/ui/legacy-icons';

interface SlotEditorProps {
  label: string;
  tint: 'attacker' | 'defender';
  value: BuildPart;
  items: ItemCatalogEntry[];
  catalog: SimCatalog;
  errors?: string[];
  onChange: (next: BuildPart) => void;
  onClose: () => void;
}

const helperTextClass = 'text-xs text-ink/55';
const baseButtonClass =
  'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';

function crystalLabel(name: string) {
  return name.replace(/ Crystal$/i, '');
}

export function SlotEditor({
  label,
  tint,
  value,
  items,
  catalog,
  errors = [],
  onChange,
  onClose,
}: SlotEditorProps) {
  const [activeSocket, setActiveSocket] = useState(0);
  const socketCrystals = useMemo(() => getBuildPartSocketCrystals(value), [value]);
  const crystalChoices = useMemo(() => buildFastCrystalList(value.crystal, catalog), [value.crystal, catalog]);
  const [paletteCrystal, setPaletteCrystal] = useState<string>(value.crystal || crystalChoices[0] || '');
  const item = catalog.itemsByName[value.name];
  const upgradeSlots = item?.upgradeSlots || [];
  const preview = getSlotPreview(value, catalog);
  const compactStatLines = preview.statLines.slice(0, 3);
  const selectedSocketCrystal = socketCrystals[activeSocket] || '';
  const accentTone = tint === 'attacker' ? 'text-accent' : 'text-steel';
  const accentBorder = tint === 'attacker' ? 'border-accent/20' : 'border-steel/20';
  const activeItemClass =
    tint === 'attacker'
      ? 'border-accent/45 bg-accent/10 text-accent'
      : 'border-steel/45 bg-steel/10 text-steel';
  const activeSocketClass =
    tint === 'attacker'
      ? 'border-accent bg-accent/10 ring-2 ring-accent/25 shadow-[0_10px_24px_rgba(219,117,36,0.14)]'
      : 'border-steel bg-steel/10 ring-2 ring-steel/25 shadow-[0_10px_24px_rgba(66,118,161,0.14)]';
  const emphasisChipClass =
    tint === 'attacker'
      ? 'border-accent/20 bg-accent/10 text-accent'
      : 'border-steel/20 bg-steel/10 text-steel';
  const crystalComposition = socketCrystals.filter(Boolean).map(crystalLabel).join(' / ');
  const activeSocketSummary = selectedSocketCrystal ? crystalLabel(selectedSocketCrystal) : 'Empty';

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

  function commitSockets(nextSockets: string[]) {
    const normalized = Array.from({ length: BUILD_PART_SOCKET_COUNT }, (_, index) => nextSockets[index] || '');
    const primaryCrystal = normalized.find(Boolean) || '';
    onChange({
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
    onChange({
      ...value,
      upgrades: nextUpgrades.filter(Boolean),
    });
  }

  function updateItem(nextName: string) {
    const nextItem = catalog.itemsByName[nextName];
    onChange({
      ...value,
      name: nextName,
      upgrades: nextItem?.upgradeSlots?.length
        ? value.upgrades.slice(0, nextItem.upgradeSlots.length)
        : [],
    });
  }

  return (
    <div className={`${panelCardClass} ${accentBorder} p-3.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentTone}`}>
            Editing {label}
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-3">
            {getLegacyIconUrl(value.name) ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-panel/55 ring-1 ring-line/10">
                <LegacyIcon name={value.name} size={30} />
              </div>
            ) : null}
            <div className="min-w-0">
              <div className={twoLineClampClass} title={value.name}>
                {value.name}
              </div>
              {compactStatLines.length || preview.damageLine ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {compactStatLines.map((line) => (
                    <span
                      key={`${label}-${line}`}
                      className="inline-flex h-6 items-center rounded-full border border-line/50 bg-white/92 px-2.5 text-[11px] font-semibold text-ink/65"
                    >
                      {line}
                    </span>
                  ))}
                  {preview.damageLine ? (
                    <span className="inline-flex h-6 items-center rounded-full border border-accent/20 bg-accent/10 px-2.5 text-[11px] font-semibold text-accent">
                      {preview.damageLine}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`${buttonClass} px-3 text-ink/70`}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {errors.length ? (
        <div className="mt-3 rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.join(' ')}
        </div>
      ) : null}

      <div className="mt-3.5 grid gap-3.5 border-t border-line/35 pt-3.5">
        <div className={`${innerSurfaceClass} bg-white/72 px-3 py-3`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className={labelClass}>Item Picker</div>
              <div className={helperTextClass}>Choose the equipped item for this slot.</div>
            </div>
            <div className="text-[11px] text-ink/40">{items.length} options</div>
          </div>

          <div className="grid max-h-[16rem] gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {items.map((entry) => {
              const active = entry.name === value.name;
              const itemIconUrl = getLegacyIconUrl(entry.name);

              return (
                <button
                  key={`${label}-${entry.name}`}
                  type="button"
                  className={`${baseButtonClass} rounded-2xl border bg-white/92 p-2.5 text-left ring-1 ring-line/10 hover:border-line/80 ${
                    active ? activeItemClass : 'border-transparent text-ink'
                  }`}
                  onClick={() => updateItem(entry.name)}
                  title={entry.name}
                >
                  <div className="flex items-start gap-2.5">
                    {itemIconUrl ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel/55 ring-1 ring-line/10">
                        <LegacyIcon name={entry.name} size={24} />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className={twoLineClampClass}>{entry.name}</div>
                      {entry.baseWeaponDamage ? (
                        <div className="mt-1 text-[11px] text-ink/55">
                          Damage {entry.baseWeaponDamage.min}-{entry.baseWeaponDamage.max}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${innerSurfaceClass} bg-white/72 px-3 py-3`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className={labelClass}>Crystal Editor</div>
              <div className={helperTextClass}>Choose socket, then crystal. Bulk fill and clear stay close by.</div>
            </div>
            <div className={`inline-flex h-8 items-center rounded-full border px-2.5 text-[11px] font-semibold ${emphasisChipClass}`}>
              Socket {activeSocket + 1} · {activeSocketSummary}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2.5">
              <div className="grid grid-cols-4 gap-2">
                {socketCrystals.map((crystal, index) => {
                  const active = index === activeSocket;
                  return (
                    <button
                      key={`${label}-socket-${index}`}
                      type="button"
                      className={`${baseButtonClass} rounded-2xl border bg-white/92 p-2.5 text-center ring-1 ring-line/10 hover:border-line/80 ${
                        active ? activeSocketClass : 'border-transparent'
                      }`}
                      onClick={() => setActiveSocket(index)}
                      title={crystal || `Socket ${index + 1}`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                        {index + 1}
                      </div>
                      <div className="mt-1 flex h-10 items-center justify-center">
                        {crystal ? (
                          <LegacyIcon name={crystal} size={22} />
                        ) : (
                          <span className="text-lg font-semibold text-ink/25">+</span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[11px] font-medium text-ink/60">
                        {crystal ? crystalLabel(crystal) : 'Empty'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-1.5">
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
                  className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white/92 text-ink/70 hover:border-accent hover:text-accent`}
                  onClick={() => clearSocket()}
                >
                  Clear Socket
                </button>
                <button
                  type="button"
                  className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white/92 text-ink/70 hover:border-accent hover:text-accent`}
                  onClick={copyFirstToAll}
                >
                  Copy 1st to All
                </button>
                <button
                  type="button"
                  className={`${baseButtonClass} ${compactButtonClass} border-line/50 bg-white/92 text-ink/70 hover:border-accent hover:text-accent`}
                  onClick={clearAll}
                >
                  Clear All
                </button>
              </div>

              <div className="rounded-2xl bg-white/92 px-3 py-2 ring-1 ring-line/10">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                  Current Composition
                </div>
                <div className="mt-1 text-sm font-medium text-ink/75">
                  {crystalComposition || 'No crystals selected'}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className={labelClass}>Crystal Palette</div>
                <div className="inline-flex h-7 items-center rounded-full border border-line/50 bg-white/92 px-2.5 text-[11px] font-semibold text-ink/65">
                  Palette · {paletteCrystal ? crystalLabel(paletteCrystal) : 'Choose'}
                </div>
              </div>

              <div className="grid max-h-[15rem] gap-2 overflow-auto pr-1 grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {crystalChoices.map((crystal) => {
                  const active = crystal === paletteCrystal;
                  return (
                    <button
                      key={`${label}-${crystal}`}
                      type="button"
                      className={`${baseButtonClass} flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border bg-white/92 px-2 py-3 text-center ring-1 ring-line/10 hover:border-line/80 ${
                        active ? activeItemClass : 'border-transparent text-ink'
                      }`}
                      onClick={() => assignCrystalToSocket(crystal)}
                      title={crystal}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-panel/55 ring-1 ring-line/10">
                        <LegacyIcon name={crystal} size={24} />
                      </div>
                      <span className="min-w-0 break-words text-[11px] font-semibold leading-4">
                        {crystalLabel(crystal)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {upgradeSlots.length ? (
          <div>
            <div className="mb-2">
              <div className={labelClass}>Upgrades</div>
              <div className={helperTextClass}>Only shown for items that support weapon upgrades.</div>
            </div>

            <div className="grid gap-2">
              {upgradeSlots.map((slotOptions, slotIndex) => {
                const options = [
                  'None',
                  ...slotOptions.filter((option) => catalog.upgrades.includes(option)),
                ];

                return (
                  <div
                    key={`${label}-upgrade-${slotIndex}`}
                    className="rounded-2xl bg-white/92 px-3 py-2 ring-1 ring-line/10"
                  >
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                      Upgrade {slotIndex + 1}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((option) => {
                        const active = (value.upgrades[slotIndex] || 'None') === option;

                        return (
                          <button
                            key={`${label}-upgrade-${slotIndex}-${option}`}
                            type="button"
                            className={`${baseButtonClass} inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold ${
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
