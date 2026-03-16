'use strict';

module.exports = {
  id: 'reaper-first-mixed-melee',
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
  targetDefenders: ['Ashley Build', 'DL Reaper/Maul Orphic Bio'],
  controlDefenders: ['DL Rift/Bombs Scout'],
  contrastDefenders: ['DL Dual Rift Bio', 'SG1 Split Bombs T2'],
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
      id: 'refresh_hit_dual_melee',
      label: 'refresh hit dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_melee',
      },
    },
    {
      id: 'refresh_skill_dual_melee',
      label: 'refresh skill dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_melee',
      },
    },
    {
      id: 'split_defender_dual_melee',
      label: 'split defender dual melee',
      env: {
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first',
      label: 'refresh hit reaper-first',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_skill_reaper_first',
      label: 'refresh skill reaper-first',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'skill',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_full_reaper_first',
      label: 'refresh full reaper-first',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first_w2gate',
      label: 'refresh hit reaper-first + w2 gate',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_full_reaper_first_w2gate',
      label: 'refresh full reaper-first + w2 gate',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'full',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'split_reaper_first_w2gate',
      label: 'split reaper-first + w2 gate',
      env: {
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
  ],
};
