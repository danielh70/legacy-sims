import { useState } from 'react';

const SLOT_LABELS = {
  armor: 'Armor',
  weapon1: 'Weapon 1',
  weapon2: 'Weapon 2',
  misc1: 'Misc 1',
  misc2: 'Misc 2',
};

const CRYSTAL_SLOTS = 4;

const CRYSTAL_COLORS = {
  'Abyss Crystal': '#6a4c93',
  'Perfect Pink Crystal': '#e891b9',
  'Perfect Orange Crystal': '#e8a629',
  'Perfect Green Crystal': '#50c878',
  'Perfect Yellow Crystal': '#f0c040',
  'Amulet Crystal': '#5090d0',
  'Perfect Fire Crystal': '#e05050',
  'Cabrusion Crystal': '#b8860b',
  'Berserker Crystal': '#cc3333',
};

function shortCrystal(name) {
  if (!name) return '--';
  return name
    .replace(' Crystal', '')
    .replace('Perfect ', 'P.')
    .substring(0, 8);
}

function getItemsByType(defs, type) {
  return Object.entries(defs.ItemDefs)
    .filter(([, def]) => def.type === type)
    .map(([name]) => name);
}

function getUpgradesForItem(defs, itemName) {
  const item = defs.ItemDefs[itemName];
  if (!item || !item.upgradeSlots) return [];
  return item.upgradeSlots;
}

export default function EquipmentBuilder({ attacker, setAttacker, defs }) {
  const [selectedCrystal, setSelectedCrystal] = useState(null);
  const crystalNames = Object.keys(defs.CrystalDefs);

  const updateSlot = (slotKey, field, value) => {
    setAttacker(a => ({
      ...a,
      [slotKey]: { ...a[slotKey], [field]: value },
    }));
  };

  // Build crystals array from the current slot state
  const getCrystals = (slot) => {
    if (slot.crystals) return slot.crystals;
    if (slot.crystalCounts) {
      const arr = [];
      for (const [name, count] of Object.entries(slot.crystalCounts)) {
        for (let i = 0; i < count; i++) arr.push(name);
      }
      while (arr.length < CRYSTAL_SLOTS) arr.push(slot.crystal || '');
      return arr.slice(0, CRYSTAL_SLOTS);
    }
    return Array(CRYSTAL_SLOTS).fill(slot.crystal || '');
  };

  const setCrystalAtIndex = (slotKey, index) => {
    if (!selectedCrystal) return;
    setAttacker(a => {
      const slot = a[slotKey];
      const current = getCrystals(slot);
      const next = [...current];
      next[index] = selectedCrystal;
      // If all same, use uniform crystal. Otherwise use crystals array.
      const allSame = next.every(c => c === next[0]);
      const updated = { ...slot };
      delete updated.crystalCounts;
      delete updated.crystalMix;
      if (allSame) {
        updated.crystal = next[0];
        delete updated.crystals;
      } else {
        updated.crystals = next;
        updated.crystal = next[0]; // keep first as fallback
      }
      return { ...a, [slotKey]: updated };
    });
  };

  const fillAllCrystals = (slotKey) => {
    if (!selectedCrystal) return;
    setAttacker(a => {
      const updated = { ...a[slotKey] };
      delete updated.crystals;
      delete updated.crystalCounts;
      delete updated.crystalMix;
      updated.crystal = selectedCrystal;
      return { ...a, [slotKey]: updated };
    });
  };

  const getSlotType = (slotKey) => {
    if (slotKey === 'armor') return 'Armor';
    if (slotKey.startsWith('weapon')) return 'Weapon';
    return 'Misc';
  };

  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
      <h2 className="text-sm font-bold text-accent-yellow uppercase tracking-wider mb-3">Equipment</h2>

      {/* Crystal palette */}
      <div className="mb-3 p-2 bg-dark-700 rounded border border-dark-600">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 uppercase">Crystal Palette</span>
          <span className="text-xs text-gray-500">
            {selectedCrystal ? `Selected: ${selectedCrystal}` : 'Click a crystal, then click a slot'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {crystalNames.map(name => {
            const color = CRYSTAL_COLORS[name] || '#888';
            const isSelected = selectedCrystal === name;
            return (
              <button
                key={name}
                onClick={() => setSelectedCrystal(isSelected ? null : name)}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  isSelected
                    ? 'border-white ring-1 ring-white scale-105'
                    : 'border-dark-500 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: color + '33',
                  color: color,
                  borderColor: isSelected ? '#fff' : undefined,
                }}
                title={name + ': ' + Object.entries(defs.CrystalDefs[name].pct).map(([k,v]) => `${k} +${(v*100).toFixed(0)}%`).join(', ')}
              >
                {shortCrystal(name)}
              </button>
            );
          })}
          {selectedCrystal && (
            <button
              onClick={() => setSelectedCrystal(null)}
              className="px-2 py-1 text-xs rounded border border-dark-500 text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Equipment slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Object.keys(SLOT_LABELS).map(slotKey => {
          const slot = attacker[slotKey];
          const type = getSlotType(slotKey);
          const items = getItemsByType(defs, type);
          const crystals = getCrystals(slot);
          const upgradeSlots = getUpgradesForItem(defs, slot.name);

          return (
            <div
              key={slotKey}
              className="bg-dark-700 rounded p-2 border border-dark-600"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-accent-orange uppercase">{SLOT_LABELS[slotKey]}</span>
                {selectedCrystal && (
                  <button
                    onClick={() => fillAllCrystals(slotKey)}
                    className="text-[10px] text-gray-400 hover:text-accent-orange"
                    title="Fill all slots with selected crystal"
                  >
                    Fill All
                  </button>
                )}
              </div>

              {/* Item selector */}
              <select
                value={slot.name}
                onChange={e => updateSlot(slotKey, 'name', e.target.value)}
                className="w-full mb-1.5 text-xs"
              >
                {items.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {/* Crystal slots */}
              <div className="flex gap-1 mb-1">
                {crystals.map((crystal, i) => {
                  const color = CRYSTAL_COLORS[crystal] || '#555';
                  return (
                    <button
                      key={i}
                      onClick={() => setCrystalAtIndex(slotKey, i)}
                      className={`flex-1 h-6 rounded text-[9px] font-medium border transition-all truncate px-0.5 ${
                        selectedCrystal
                          ? 'border-dashed border-gray-400 hover:border-white cursor-pointer'
                          : 'border-dark-500 cursor-default'
                      }`}
                      style={{
                        backgroundColor: color + '33',
                        color: color,
                      }}
                      title={crystal || 'Empty'}
                    >
                      {shortCrystal(crystal)}
                    </button>
                  );
                })}
              </div>

              {/* Upgrades (for weapons with upgrade slots) */}
              {upgradeSlots.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {upgradeSlots.map((options, ui) => (
                    <select
                      key={ui}
                      value={slot.upgrades?.[ui] || ''}
                      onChange={e => {
                        setAttacker(a => {
                          const s = { ...a[slotKey] };
                          const ups = [...(s.upgrades || [])];
                          ups[ui] = e.target.value;
                          s.upgrades = ups.filter(Boolean);
                          return { ...a, [slotKey]: s };
                        });
                      }}
                      className="w-full text-[10px]"
                    >
                      <option value="">No upgrade</option>
                      {options.map(u => (
                        <option key={u} value={u}>{u} ({Object.entries(defs.UpgradeDefs[u]?.pct || {}).map(([k,v]) => `${k}+${(v*100).toFixed(0)}%`).join(', ')})</option>
                      ))}
                    </select>
                  ))}
                </div>
              )}

              {/* Item stats tooltip-like display */}
              <div className="mt-1 text-[9px] text-gray-500 leading-tight">
                {defs.ItemDefs[slot.name]?.flatStats &&
                  Object.entries(defs.ItemDefs[slot.name].flatStats)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' | ')}
                {defs.ItemDefs[slot.name]?.baseWeaponDamage &&
                  ` | dmg:${defs.ItemDefs[slot.name].baseWeaponDamage.min}-${defs.ItemDefs[slot.name].baseWeaponDamage.max}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
