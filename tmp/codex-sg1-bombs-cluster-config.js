'use strict';

module.exports = {
  id: 'sg1-bombs-cluster',
  simPath: './tmp/legacy-sim-v1.0.4-clean.lane-probe.js',
  compareTool: './tools/legacy-truth-replay-compare.js',
  outputRoot: './tmp/lane-probe-harness',
  trials: 50000,
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
      id: 'w2gate_defender_global',
      label: 'w2 gate defender global',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
      },
    },
    {
      id: 'split_defender_global',
      label: 'split defender global',
      env: {
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
      id: 'refresh_skill_dual_projectile',
      label: 'refresh skill dual projectile',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_projectile',
      },
    },
    {
      id: 'refresh_full_dual_projectile',
      label: 'refresh full dual projectile',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_projectile',
      },
    },
    {
      id: 'refresh_hit_bombs_w2',
      label: 'refresh hit bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_bombs_w2',
      },
    },
    {
      id: 'refresh_skill_bombs_w2',
      label: 'refresh skill bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_bombs_w2',
      },
    },
    {
      id: 'refresh_full_bombs_w2',
      label: 'refresh full bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_bombs_w2',
      },
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
      id: 'refresh_skill_sg1_bombs_w2',
      label: 'refresh skill sg1 bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
    {
      id: 'refresh_full_sg1_bombs_w2',
      label: 'refresh full sg1 bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
    {
      id: 'w2gate_sg1_bombs_w2',
      label: 'w2 gate sg1 bombs w2',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
    {
      id: 'split_defender_sg1_bombs_w2',
      label: 'split defender sg1 bombs w2',
      env: {
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
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
