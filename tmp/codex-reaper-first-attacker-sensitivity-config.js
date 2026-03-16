'use strict';

module.exports = {
  id: 'reaper-first-attacker-sensitivity',
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
      id: 'refresh_hit_reaper_first',
      label: 'refresh hit reaper-first',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first_target_reaper_first_dual_melee',
      label: 'refresh hit reaper-first + attacker reaper-first dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_reaper_first_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first_target_maul_first_reaper_second',
      label: 'refresh hit reaper-first + attacker maul-first reaper-second',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_maul_first_reaper_second',
      },
    },
    {
      id: 'refresh_hit_reaper_first_target_dark_legion_dual_melee',
      label: 'refresh hit reaper-first + attacker dark legion dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_dark_legion_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first_target_sg1_dual_melee',
      label: 'refresh hit reaper-first + attacker sg1 dual melee',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_sg1_dual_melee',
      },
    },
    {
      id: 'refresh_hit_reaper_first_target_reaper_first_maul_second',
      label: 'refresh hit reaper-first + attacker reaper-first maul-second',
      analysisBound: true,
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_reaper_first_dual_melee',
        LEGACY_LANE_PROBE_W2_TARGET_PREDICATE: 'target_reaper_first_maul_second',
      },
    },
  ],
};
