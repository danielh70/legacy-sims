'use strict';

module.exports = {
  id: 'sg1-bombs-landing-sanity',
  simPath: './tmp/legacy-sim-v1.0.4-clean.lane-probe.js',
  compareTool: './tools/legacy-truth-replay-compare.js',
  outputRoot: './tmp/lane-probe-harness',
  trials: 20000,
  baselineToggleId: 'baseline_live',
  defaultDefenderFile: './data/legacy-defenders.js',
  defaultReachWeight: 0.1,
  attackers: ['CUSTOM', 'CUSTOM_CSTAFF_A4', 'CUSTOM_MAUL_A4_DL_ABYSS', 'CUSTOM_MAUL_A4_SG1_PINK'],
  truthCases: [
    { attacker: 'CUSTOM', truthFile: './tmp/legacy-truth-current-attacker-vs-meta.json' },
    { attacker: 'CUSTOM_CSTAFF_A4', truthFile: './tmp/legacy-truth-v4-custom-cstaff-full15-merged.json' },
    { attacker: 'CUSTOM_MAUL_A4_DL_ABYSS', truthFile: './legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json' },
    { attacker: 'CUSTOM_MAUL_A4_SG1_PINK', truthFile: './legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json' },
    { attacker: 'CUSTOM', truthFile: './legacy-truth-droid-shell-probe-2x4.json' },
    { attacker: 'CUSTOM_MAUL_A4_SG1_PINK', truthFile: './legacy-truth-droid-shell-probe-2x4.json' },
  ],
  targetDefenders: [
    'Ashley Build',
    'DL Core/Rift Bio',
    'DL Core/Rift Dodge',
    'DL Dual Rift Bio',
    'DL Gun Blade Bio',
    'DL Gun Blade Recon',
    'DL Gun Sniper Mix',
    'DL Maul/Core Orphic',
    'DL Reaper/Maul Orphic Bio',
    'DL Rift/Bombs Scout',
    'HF Scythe Pair',
    'SG1 Double Maul Droid',
    'SG1 Double Maul Droid | armor Hellforged Armor',
    'SG1 Double Maul Droid | misc2 Bio Spinal Enhancer',
    'SG1 Rift/Bombs Bio',
    'SG1 Split Bombs T2',
    'SG1 Void/Reaper',
  ],
  controlDefenders: [],
  contrastDefenders: [],
  defaultReachCount(toggle) {
    const env = (toggle && toggle.env) || {};
    if (
      env.LEGACY_LANE_PROBE_W2_PRE_REFRESH === 'hit' &&
      env.LEGACY_LANE_PROBE_W2_PREDICATE === 'defender_sg1_bombs_w2'
    ) {
      return 1;
    }
    return 0;
  },
  toggles: [
    { id: 'baseline_live', label: 'baseline live', env: {} },
    {
      id: 'sg1_bombs_parent',
      label: 'sg1 bombs parent',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
  ],
};
