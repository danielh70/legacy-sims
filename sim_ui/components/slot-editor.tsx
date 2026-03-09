'use client';

import { type ChangeEvent } from 'react';

import { buildFastCrystalList, getSlotPreview } from '@/lib/ui/build-ux';
import { type BuildPart, type ItemCatalogEntry, type SimCatalog } from '@/lib/engine/types';

interface SlotEditorProps {
  label: string;
  value: BuildPart;
  items: ItemCatalogEntry[];
  catalog: SimCatalog;
  errors?: string[];
  onChange: (next: BuildPart) => void;
}

export function SlotEditor({
  label,
  value,
  items,
  catalog,
  errors = [],
  onChange,
}: SlotEditorProps) {
  const item = catalog.itemsByName[value.name];
  const upgradeSlots = item?.upgradeSlots || [];
  const preview = getSlotPreview(value, catalog);
  const fastCrystals = buildFastCrystalList(value.crystal, catalog).slice(0, 8);

  function updateField<K extends keyof BuildPart>(field: K, next: BuildPart[K]) {
    onChange({
      ...value,
      [field]: next,
    });
  }

  function updateUpgrade(slotIndex: number, nextValue: string) {
    const nextUpgrades = [...value.upgrades];
    nextUpgrades[slotIndex] = nextValue;
    onChange({
      ...value,
      upgrades: nextUpgrades.filter(Boolean),
    });
  }

  function handleItemChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextName = event.target.value;
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
    <div className="rounded-2xl border border-line/80 bg-panel/90 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-steel">
          {label}
        </div>
        {item?.baseWeaponDamage ? (
          <div className="text-xs font-medium text-ink/60">
            {item.baseWeaponDamage.min}-{item.baseWeaponDamage.max}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-ink/55">Item</span>
          <select
            className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-accent"
            value={value.name}
            onChange={handleItemChange}
          >
            {items.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.12em] text-ink/55">Crystal</span>
          <select
            className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-accent"
            value={value.crystal}
            onChange={(event) => updateField('crystal', event.target.value)}
          >
            {catalog.crystals.map((crystal) => (
              <option key={crystal} value={crystal}>
                {crystal}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {fastCrystals.map((crystal) => {
          const active = crystal === value.crystal;
          return (
            <button
              key={`${label}-${crystal}`}
              type="button"
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-white/80 text-ink/70 hover:border-accent hover:text-accent'
              }`}
              onClick={() => updateField('crystal', crystal)}
            >
              {crystal.replace(' Crystal', '')}
            </button>
          );
        })}
      </div>

      {upgradeSlots.length ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {upgradeSlots.map((slotOptions, slotIndex) => {
            const options = ['None', ...slotOptions.filter((option) => catalog.upgrades.includes(option))];
            return (
              <label key={`${value.name}-upgrade-${slotIndex}`} className="grid gap-1 text-sm">
                <span className="text-xs uppercase tracking-[0.12em] text-ink/55">
                  Upgrade {slotIndex + 1}
                </span>
                <select
                  className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-accent"
                  value={value.upgrades[slotIndex] || 'None'}
                  onChange={(event) =>
                    updateUpgrade(
                      slotIndex,
                      event.target.value === 'None' ? '' : event.target.value,
                    )
                  }
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      ) : null}

      {preview.statLines.length || preview.damageLine ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {preview.statLines.map((line) => (
            <span
              key={`${label}-${line}`}
              className="rounded-full border border-line/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-ink/70"
            >
              {line}
            </span>
          ))}
          {preview.damageLine ? (
            <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
              {preview.damageLine}
            </span>
          ) : null}
        </div>
      ) : null}

      {errors.length ? (
        <div className="mt-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.join(' ')}
        </div>
      ) : null}
    </div>
  );
}
