import { useState } from 'react';

export default function DefenderSelector({ payloads, selected, setSelected }) {
  const [filter, setFilter] = useState('');
  const names = Object.keys(payloads);
  const filtered = filter
    ? names.filter(n => n.toLowerCase().includes(filter.toLowerCase()))
    : names;

  const allSelected = selected.length === names.length;

  const toggle = (name) => {
    setSelected(sel =>
      sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]
    );
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : [...names]);
  };

  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-600 sticky top-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-accent-yellow uppercase tracking-wider">
          Defenders ({selected.length}/{names.length})
        </h2>
        <button
          onClick={toggleAll}
          className="text-xs text-accent-orange hover:text-accent-yellow"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <input
        type="text"
        placeholder="Filter..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full mb-2 text-xs"
      />

      <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        {filtered.map(name => {
          const checked = selected.includes(name);
          const p = payloads[name];
          const level = p.stats?.level || '?';
          const w1 = p.weapon1?.name || '?';
          const w2 = p.weapon2?.name || '?';

          return (
            <label
              key={name}
              className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                checked ? 'bg-dark-700' : 'hover:bg-dark-700/50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(name)}
                className="mt-0.5 accent-orange-500"
              />
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-medium truncate ${checked ? 'text-gray-200' : 'text-gray-400'}`}>
                  {name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  L{level} {w1} / {w2}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
