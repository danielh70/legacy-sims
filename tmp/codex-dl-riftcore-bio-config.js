'use strict';

module.exports = {
  id: 'dl-riftcore-bio',
  simPath: './tmp/legacy-sim-v1.0.4-clean.lane-probe.js',
  compareTool: './tools/legacy-truth-replay-compare.js',
  outputRoot: './tmp/lane-probe-harness',
  trials: 20000,
  baselineToggleId: 'off',
  defaultDefenderFile: './data/legacy-defenders.js',
  defaultReachWeight: 0.1,
  attackers: ['CUSTOM', 'CUSTOM_CSTAFF_A4', 'CUSTOM_MAUL_A4_DL_ABYSS', 'CUSTOM_MAUL_A4_SG1_PINK'],
  truthCases: [
    { attacker: 'CUSTOM', truthFile: './tmp/legacy-truth-current-attacker-vs-meta.json' },
    { attacker: 'CUSTOM_CSTAFF_A4', truthFile: './tmp/legacy-truth-v4-custom-cstaff-full15-merged.json' },
    { attacker: 'CUSTOM_MAUL_A4_DL_ABYSS', truthFile: './legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json' },
    { attacker: 'CUSTOM_MAUL_A4_SG1_PINK', truthFile: './legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json' },
  ],
  targetDefenders: ['DL Dual Rift Bio', 'DL Core/Rift Bio'],
  controlDefenders: ['DL Rift/Bombs Scout'],
  contrastDefenders: ['SG1 Split Bombs T2', 'Ashley Build', 'HF Scythe Pair'],
  toggles: [
    { id: 'off', label: 'off', env: {} },
    {
      id: 'refresh_hit_dl_riftcore_double_bio',
      label: 'refresh hit dl riftcore double bio',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
      },
    },
    {
      id: 'refresh_skill_dl_riftcore_double_bio',
      label: 'refresh skill dl riftcore double bio',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
      },
    },
    {
      id: 'refresh_full_dl_riftcore_double_bio',
      label: 'refresh full dl riftcore double bio',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
      },
    },
    {
      id: 'w2gate_defender_dl_riftcore_double_bio',
      label: 'w2 gate defender dl riftcore double bio',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
      },
    },
    {
      id: 'split_defender_dl_riftcore_double_bio',
      label: 'split defender dl riftcore double bio',
      env: {
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
      },
    },
    {
      id: 'refresh_hit_plus_w2gate_dl_riftcore_double_bio',
      label: 'refresh hit + w2 gate dl riftcore double bio',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
      },
    },
    {
      id: 'refresh_hit_plus_split_dl_riftcore_double_bio',
      label: 'refresh hit + split dl riftcore double bio',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dark_legion_riftcore_double_bio',
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
      },
    },
    {
      id: 'refresh_hit_dual_projectile',
      label: 'refresh hit dual projectile',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_projectile',
      },
    },
    {
      id: 'split_defender_dual_projectile',
      label: 'split defender dual projectile',
      env: {
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_projectile',
      },
    },
    {
      id: 'refresh_hit_exact_dual_rift_bound',
      label: 'refresh hit exact dual rift bound',
      analysisBound: true,
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_exact_signature',
        LEGACY_LANE_PROBE_W2_EXACT_SIG:
          'armorItem=Dark Legion Armor,w1Item=Rift Gun,w2Item=Rift Gun,m1Item=Bio Spinal Enhancer,m2Item=Bio Spinal Enhancer',
      },
    },
    {
      id: 'refresh_hit_exact_core_rift_bound',
      label: 'refresh hit exact core rift bound',
      analysisBound: true,
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_exact_signature',
        LEGACY_LANE_PROBE_W2_EXACT_SIG:
          'armorItem=Dark Legion Armor,w1Item=Core Staff,w2Item=Rift Gun,m1Item=Bio Spinal Enhancer,m2Item=Bio Spinal Enhancer',
      },
    },
  ],
};
