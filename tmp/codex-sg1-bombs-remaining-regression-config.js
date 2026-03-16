'use strict';

module.exports = {
  id: 'sg1-bombs-remaining-regression',
  simPath: './tmp/legacy-sim-v1.0.4-clean.lane-probe.js',
  compareTool: './tools/legacy-truth-replay-compare.js',
  outputRoot: './tmp/lane-probe-harness',
  trials: 100000,
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
  targetDefenders: ['SG1 Split Bombs T2', 'SG1 Rift/Bombs Bio'],
  controlDefenders: ['DL Rift/Bombs Scout'],
  contrastDefenders: ['DL Dual Rift Bio', 'Ashley Build', 'HF Scythe Pair'],
  toggles: [
    {
      id: 'off',
      label: 'Off',
      env: {},
    },
    {
      id: 'refresh_hit_sg1_bombs_w2',
      label: 'refresh hit sg1 bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
    {
      id: 'refresh_hit_sg1_bombs_w2_target_dark_legion_dual_melee',
      label: 'refresh hit sg1 bombs w2 + target dark legion dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_dark_legion_dual_melee',
      },
    },
    {
      id: 'refresh_hit_sg1_bombs_w2_target_sg1_dual_melee',
      label: 'refresh hit sg1 bombs w2 + target sg1 dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_sg1_dual_melee',
      },
    },
    {
      id: 'refresh_hit_sg1_bombs_w2_target_maul_first_dual_melee',
      label: 'refresh hit sg1 bombs w2 + target maul-first dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_maul_first_dual_melee',
      },
    },
    {
      id: 'refresh_hit_dual_bombs',
      label: 'refresh hit dual bombs',
      analysisBound: true,
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_bombs',
      },
    },
    {
      id: 'refresh_hit_rift_bombs_bio',
      label: 'refresh hit rift+bombs+bio',
      analysisBound: true,
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_rift_bombs_bio',
      },
    },
  ],
};
