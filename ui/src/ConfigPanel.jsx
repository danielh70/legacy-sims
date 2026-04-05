const CONFIG_OPTIONS = {
  armorK: {
    label: 'ARMOR_K',
    options: ['5', '6', '7', '8', '9', '10'],
  },
  dmgRoll: {
    label: 'DMG_ROLL',
    options: ['int', 'float', 'floor', 'round', 'ceil'],
  },
  hitRollMode: {
    label: 'HIT_ROLL_MODE',
    options: ['int', 'float'],
  },
  armorApply: {
    label: 'ARMOR_APPLY',
    options: ['per_weapon', 'total'],
  },
  armorRound: {
    label: 'ARMOR_ROUND',
    options: ['ceil', 'floor', 'round'],
  },
  speedTieMode: {
    label: 'SPEED_TIE_MODE',
    options: ['random', 'attacker', 'defender'],
  },
  roundResolveMode: {
    label: 'ROUND_RESOLVE_MODE',
    options: ['baseline', 'simultaneous_round'],
  },
  roundMode: {
    label: 'ATTACK_STYLE_ROUND',
    options: ['floor', 'round', 'ceil'],
  },
};

export default function ConfigPanel({ config, setConfig }) {
  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
      <details>
        <summary className="text-sm font-bold text-accent-yellow uppercase tracking-wider cursor-pointer select-none">
          Sim Config
        </summary>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(CONFIG_OPTIONS).map(([key, { label, options }]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase">{label}</label>
              <select
                value={config[key] || options[0]}
                onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                className="text-xs"
              >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
