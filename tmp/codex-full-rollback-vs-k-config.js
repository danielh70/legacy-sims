'use strict';

const defaultDefs = require('../data/legacy-defenders.js');

const ALL_TRUTH_DEFENDERS = [
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
  'HF Scythe Pair | misc2 Scout Drones',
  'HF Scythe Pair | armor SG1 Armor',
  'HF Scythe Pair | weapon2 Crystal Maul',
  'SG1 Double Maul Droid',
  'SG1 Double Maul Droid | armor Hellforged Armor',
  'SG1 Double Maul Droid | misc2 Bio Spinal Enhancer',
  'SG1 Rift/Bombs Bio',
  'SG1 Split Bombs T2',
  'SG1 Void/Reaper',
];

module.exports = {
  id: 'full-rollback-vs-k',
  simPath: './tmp/legacy-sim-v1.0.4-clean.lane-probe.js',
  compareTool: './tools/legacy-truth-replay-compare.js',
  outputRoot: './tmp/lane-probe-harness',
  trials: 10000,
  baselineToggleId: 'model_a_current',
  defaultDefenderFile: './data/legacy-defenders.js',
  attackers: ['CUSTOM', 'CUSTOM_CSTAFF_A4', 'CUSTOM_MAUL_A4_DL_ABYSS', 'CUSTOM_MAUL_A4_SG1_PINK'],
  truthCases: [
    { attacker: 'CUSTOM', truthFile: './tmp/legacy-truth-current-attacker-vs-meta.json' },
    { attacker: 'CUSTOM_CSTAFF_A4', truthFile: './tmp/legacy-truth-v4-custom-cstaff-full15-merged.json' },
    { attacker: 'CUSTOM_MAUL_A4_DL_ABYSS', truthFile: './legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json' },
    { attacker: 'CUSTOM_MAUL_A4_SG1_PINK', truthFile: './legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json' },
    { attacker: 'CUSTOM', truthFile: './legacy-truth-droid-shell-probe-2x4.json' },
    { attacker: 'CUSTOM_MAUL_A4_SG1_PINK', truthFile: './legacy-truth-droid-shell-probe-2x4.json' },
    { attacker: 'CUSTOM', truthFile: './legacy-truth-hf-scythe-shell-probe-2x4.json' },
    { attacker: 'CUSTOM_CSTAFF_A4', truthFile: './legacy-truth-hf-scythe-shell-probe-2x4.json' },
  ],
  targetDefenders: ALL_TRUTH_DEFENDERS,
  controlDefenders: [],
  contrastDefenders: [],
  defaultReachCount(toggle) {
    const env = (toggle && toggle.env) || {};
    const total = Object.keys(defaultDefs).length;
    if (Object.prototype.hasOwnProperty.call(env, 'LEGACY_ARMOR_K')) return total;
    return 0;
  },
  toggles: [
    {
      id: 'model_a_current',
      label: 'A current accepted live behavior',
      env: {},
    },
    {
      id: 'model_b_no_bio_gate',
      label: 'B rollback narrow Bio gate only',
      env: {
        LEGACY_ROLLBACK_DISABLE_BIO_GATE: '1',
      },
    },
    {
      id: 'model_c_no_item_overrides',
      label: 'C rollback item-stat overrides only',
      env: {
        LEGACY_ROLLBACK_DISABLE_HF_OVERRIDE: '1',
        LEGACY_ROLLBACK_DISABLE_VOID_SWORD_OVERRIDE: '1',
        LEGACY_HF_ARMOR_BASE_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '',
      },
    },
    {
      id: 'model_d_no_bio_no_item_overrides',
      label: 'D rollback Bio gate + item-stat overrides',
      env: {
        LEGACY_ROLLBACK_DISABLE_BIO_GATE: '1',
        LEGACY_ROLLBACK_DISABLE_HF_OVERRIDE: '1',
        LEGACY_ROLLBACK_DISABLE_VOID_SWORD_OVERRIDE: '1',
        LEGACY_HF_ARMOR_BASE_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '',
      },
    },
    {
      id: 'model_e_no_bio_no_item_overrides_k7',
      label: 'E rollback Bio gate + item-stat overrides + armorK=7',
      env: {
        LEGACY_ARMOR_K: '7',
        LEGACY_ROLLBACK_DISABLE_BIO_GATE: '1',
        LEGACY_ROLLBACK_DISABLE_HF_OVERRIDE: '1',
        LEGACY_ROLLBACK_DISABLE_VOID_SWORD_OVERRIDE: '1',
        LEGACY_HF_ARMOR_BASE_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '',
      },
    },
    {
      id: 'model_f_current_k7',
      label: 'F current stack but armorK=7',
      env: {
        LEGACY_ARMOR_K: '7',
      },
    },
    {
      id: 'model_g_no_bio_no_item_overrides_k7_5',
      label: 'G rollback Bio gate + item-stat overrides + armorK=7.5',
      env: {
        LEGACY_ARMOR_K: '7.5',
        LEGACY_ROLLBACK_DISABLE_BIO_GATE: '1',
        LEGACY_ROLLBACK_DISABLE_HF_OVERRIDE: '1',
        LEGACY_ROLLBACK_DISABLE_VOID_SWORD_OVERRIDE: '1',
        LEGACY_HF_ARMOR_BASE_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE: '',
        LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '',
      },
    },
  ],
};
