import { useState, useEffect, useCallback, useRef } from 'react';
import EquipmentBuilder from './EquipmentBuilder';
import DefenderSelector from './DefenderSelector';
import ResultsTable from './ResultsTable';
import ConfigPanel from './ConfigPanel';

const DEFAULT_STATS = { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 };

const DEFAULT_ATTACKER = {
  label: 'CUSTOM',
  attackType: 'normal',
  stats: { ...DEFAULT_STATS },
  armor:   { name: 'SG1 Armor',      crystal: 'Abyss Crystal',          upgrades: [] },
  weapon1: { name: 'Reaper Axe',     crystal: 'Berserker Crystal',      upgrades: [] },
  weapon2: { name: 'Crystal Maul',   crystal: 'Amulet Crystal',         upgrades: [] },
  misc1:   { name: 'Orphic Amulet',  crystal: 'Perfect Orange Crystal', upgrades: [] },
  misc2:   { name: 'Orphic Amulet',  crystal: 'Perfect Orange Crystal', upgrades: [] },
};

const PRESETS = {
  'Custom': null,
  'SG1 Reaper/Maul Orphic': {
    label: 'SG1 Reaper/Maul Orphic',
    attackType: 'normal',
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor:   { name: 'SG1 Armor',     crystal: 'Abyss Crystal',          upgrades: [] },
    weapon1: { name: 'Reaper Axe',    crystal: 'Berserker Crystal',      upgrades: [] },
    weapon2: { name: 'Crystal Maul',  crystal: 'Amulet Crystal',         upgrades: [] },
    misc1:   { name: 'Orphic Amulet', crystal: 'Perfect Orange Crystal', upgrades: [] },
    misc2:   { name: 'Orphic Amulet', crystal: 'Perfect Orange Crystal', upgrades: [] },
  },
  'DL Rift/Bombs Scout': {
    label: 'DL Rift/Bombs Scout',
    attackType: 'normal',
    stats: { level: 108, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor:   { name: 'Dark Legion Armor',        crystal: 'Abyss Crystal',  upgrades: [] },
    weapon1: { name: 'Rift Gun',                  crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2',    crystal: 'Amulet Crystal', upgrades: [] },
    misc1:   { name: 'Scout Drones',              crystal: 'Amulet Crystal', upgrades: [] },
    misc2:   { name: 'Scout Drones',              crystal: 'Amulet Crystal', upgrades: [] },
  },
  'HF Scythe Pair': {
    label: 'HF Scythe Pair',
    attackType: 'normal',
    stats: { level: 93, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor:   { name: 'Hellforged Armor',       crystal: 'Abyss Crystal',          upgrades: [] },
    weapon1: { name: 'Scythe T2',             crystal: 'Amulet Crystal',          upgrades: [] },
    weapon2: { name: 'Scythe T2',             crystal: 'Amulet Crystal',          upgrades: [] },
    misc1:   { name: 'Scout Drones',          crystal: 'Perfect Orange Crystal',  upgrades: [] },
    misc2:   { name: 'Bio Spinal Enhancer',   crystal: 'Perfect Orange Crystal',  upgrades: [] },
  },
  'DL Gun Blade Recon': {
    label: 'DL Gun Blade Recon',
    attackType: 'normal',
    stats: { level: 127, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor:   { name: 'Dark Legion Armor', crystal: 'Abyss Crystal',        upgrades: [] },
    weapon1: { name: 'Rift Gun',          crystal: 'Amulet Crystal',       upgrades: [] },
    weapon2: { name: 'Gun Blade Mk4',    crystal: 'Amulet Crystal',       upgrades: ['Sharpened Blade 1', 'Faster Ammo 1'] },
    misc1:   { name: 'Recon Drones',     crystal: 'Perfect Green Crystal', upgrades: [] },
    misc2:   { name: 'Scout Drones',     crystal: 'Amulet Crystal',       upgrades: [] },
  },
  'SG1 Double Maul Droid': {
    label: 'SG1 Double Maul Droid',
    attackType: 'normal',
    stats: { level: 94, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor:   { name: 'SG1 Armor',     crystal: 'Perfect Pink Crystal', upgrades: [] },
    weapon1: { name: 'Crystal Maul',  crystal: 'Amulet Crystal',      upgrades: [] },
    weapon2: { name: 'Crystal Maul',  crystal: 'Amulet Crystal',      upgrades: [] },
    misc1:   { name: 'Scout Drones',  crystal: 'Amulet Crystal',      upgrades: [] },
    misc2:   { name: 'Droid Drone',   crystal: 'Perfect Orange Crystal', upgrades: [] },
  },
  'SG1 Void/Reaper': {
    label: 'SG1 Void/Reaper',
    attackType: 'normal',
    stats: { level: 103, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
    armor:   { name: 'SG1 Armor',   crystal: 'Perfect Pink Crystal', upgrades: [] },
    weapon1: { name: 'Void Bow',    crystal: 'Amulet Crystal',      upgrades: ['Poisoned Tip'] },
    weapon2: { name: 'Reaper Axe',  crystal: 'Amulet Crystal',      upgrades: [] },
    misc1:   { name: 'Scout Drones', crystal: 'Amulet Crystal',     upgrades: [] },
    misc2:   { name: 'Scout Drones', crystal: 'Amulet Crystal',     upgrades: [] },
  },
};

const ATTACK_TYPES = ['normal', 'aimed', 'gun', 'melee', 'projectile'];
const TRIAL_COUNTS = [1000, 10000, 50000, 200000];

export default function App() {
  const [defs, setDefs] = useState(null);
  const [defenderPayloads, setDefenderPayloads] = useState(null);
  const [attacker, setAttacker] = useState(structuredClone(DEFAULT_ATTACKER));
  const [selectedDefenders, setSelectedDefenders] = useState([]);
  const [trials, setTrials] = useState(10000);
  const [attackType, setAttackType] = useState('aimed');
  const [config, setConfig] = useState({
    armorK: '7',
    dmgRoll: 'int',
    hitRollMode: 'int',
    armorApply: 'per_weapon',
    armorRound: 'ceil',
    speedTieMode: 'random',
    roundResolveMode: 'baseline',
    roundMode: 'floor',
  });
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState('Custom');
  const abortRef = useRef(null);

  // Load defs + defenders on mount
  useEffect(() => {
    fetch('/api/defs').then(r => r.json()).then(setDefs).catch(e => setError(e.message));
    fetch('/api/defenders').then(r => r.json()).then(d => {
      setDefenderPayloads(d);
      setSelectedDefenders(Object.keys(d));
    }).catch(e => setError(e.message));
  }, []);

  const handlePresetChange = useCallback((name) => {
    setPreset(name);
    const p = PRESETS[name];
    if (p) {
      setAttacker(structuredClone(p));
    }
  }, []);

  const runSimulation = useCallback(async () => {
    if (!defenderPayloads || selectedDefenders.length === 0) return;
    setRunning(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const defenders = selectedDefenders.map(name => ({
      name,
      payload: defenderPayloads[name],
    }));

    try {
      const resp = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          attacker: { ...attacker, attackType },
          defenders,
          config: {
            ...config,
            trials,
            attackerAttackType: attackType,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Simulation failed');
      } else {
        setResults(data.results);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [attacker, attackType, selectedDefenders, defenderPayloads, trials, config]);

  const cancelSimulation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  if (!defs || !defenderPayloads) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-accent-orange text-lg">Loading definitions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-dark-500 pb-3">
        <h1 className="text-2xl font-bold text-accent-orange tracking-wide">LEGACY SIM</h1>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400">PRESET</label>
          <select
            value={preset}
            onChange={e => handlePresetChange(e.target.value)}
            className="w-52"
          >
            {Object.keys(PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left column: Equipment + Controls */}
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold text-accent-yellow uppercase tracking-wider">Attacker Stats</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(attacker.stats).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1">
                  <label className="text-xs text-gray-400 uppercase w-10">{key}</label>
                  <input
                    type="number"
                    value={val}
                    onChange={e => {
                      setPreset('Custom');
                      setAttacker(a => ({
                        ...a,
                        stats: { ...a.stats, [key]: parseInt(e.target.value) || 0 },
                      }));
                    }}
                    className="w-16 text-center"
                  />
                </div>
              ))}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400 uppercase w-16">ATK TYPE</label>
                <select value={attackType} onChange={e => setAttackType(e.target.value)}>
                  {ATTACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Equipment builder */}
          <EquipmentBuilder
            attacker={attacker}
            setAttacker={(fn) => { setPreset('Custom'); setAttacker(fn); }}
            defs={defs}
          />

          {/* Config panel */}
          <ConfigPanel config={config} setConfig={setConfig} />

          {/* Run controls */}
          <div className="bg-dark-800 rounded-lg p-3 border border-dark-600">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-gray-400 uppercase">Trials</label>
              <select value={trials} onChange={e => setTrials(Number(e.target.value))}>
                {TRIAL_COUNTS.map(n => (
                  <option key={n} value={n}>{n.toLocaleString()}</option>
                ))}
              </select>

              <button
                onClick={runSimulation}
                disabled={running || selectedDefenders.length === 0}
                className={`px-6 py-2 rounded font-bold text-sm uppercase tracking-wider transition-colors ${
                  running
                    ? 'bg-dark-500 text-gray-500 cursor-not-allowed'
                    : 'bg-accent-orange text-dark-900 hover:bg-accent-yellow'
                }`}
              >
                {running ? 'Running...' : 'Run Simulation'}
              </button>

              {running && (
                <button
                  onClick={cancelSimulation}
                  className="px-4 py-2 rounded font-bold text-sm uppercase bg-accent-red text-white hover:bg-red-600"
                >
                  Cancel
                </button>
              )}

              {error && (
                <span className="text-accent-red text-sm">{error}</span>
              )}
            </div>
          </div>

          {/* Results */}
          {results && <ResultsTable results={results} />}
        </div>

        {/* Right column: Defender selection */}
        <div>
          <DefenderSelector
            payloads={defenderPayloads}
            selected={selectedDefenders}
            setSelected={setSelectedDefenders}
          />
        </div>
      </div>
    </div>
  );
}
