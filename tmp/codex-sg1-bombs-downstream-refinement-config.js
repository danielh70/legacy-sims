'use strict';

module.exports = {
  id: 'sg1-bombs-downstream-refinement',
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
    { id: 'off', label: 'Off', env: {} },
    {
      id: 'parent_refresh_hit_sg1_bombs_w2',
      label: 'parent refresh hit sg1 bombs w2',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
      },
    },
    {
      id: 'parent_plus_w2gate',
      label: 'parent + w2 after applied w1 gate',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
      },
    },
    {
      id: 'parent_plus_split',
      label: 'parent + split defender action',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
      },
    },
    {
      id: 'parent_plus_w2gate_split',
      label: 'parent + w2 gate + split defender action',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_DIAG_W2_AFTER_APPLIED_W1: 'defender',
        LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION: 'defender',
      },
    },
    {
      id: 'parent_plus_stop_on_kill',
      label: 'parent + stop on kill',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_ACTION_STOP_ON_KILL: '1',
      },
    },
    {
      id: 'parent_plus_queued_second_defender',
      label: 'parent + queued second action defender',
      env: {
        LEGACY_LANE_PROBE_W2_PRE_REFRESH: 'hit',
        LEGACY_LANE_PROBE_W2_PREDICATE: 'defender_sg1_bombs_w2',
        LEGACY_DIAG_QUEUED_SECOND_ACTION: 'defender',
      },
    },
  ],
};
