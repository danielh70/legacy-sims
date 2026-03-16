#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function resolveFromCwd(p) {
  return path.resolve(process.cwd(), p);
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mean(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadConfig(configPath) {
  const abs = resolveFromCwd(configPath);
  delete require.cache[abs];
  return require(abs);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function runNode(cmdArgs, env, label) {
  const proc = spawnSync('node', cmdArgs, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    throw new Error(
      `${label} failed\nexit=${proc.status}\nstdout:\n${proc.stdout.slice(-4000)}\nstderr:\n${proc.stderr.slice(-4000)}`,
    );
  }
}

function collectRows(outDir) {
  const rows = [];
  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(outDir, f))
    .sort();
  for (const file of files) {
    const json = readJson(file);
    for (const row of json.rows || []) rows.push(row);
  }
  return rows;
}

function rowKey(row) {
  return `${row.attacker}__${row.defender}`;
}

function toRowMap(rows) {
  const map = new Map();
  for (const row of rows) map.set(rowKey(row), row);
  return map;
}

function defaultPotentialReachCount(toggle, defsByName) {
  const env = toggle.env || {};
  const hasSurface =
    (env.LEGACY_DIAG_W2_AFTER_APPLIED_W1 && env.LEGACY_DIAG_W2_AFTER_APPLIED_W1 !== 'off') ||
    (env.LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION && env.LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION !== 'off') ||
    (env.LEGACY_LANE_PROBE_W2_PRE_REFRESH && env.LEGACY_LANE_PROBE_W2_PRE_REFRESH !== 'off');
  if (!hasSurface) return 0;

  const predicate = String(env.LEGACY_LANE_PROBE_W2_PREDICATE || 'off');
  const exactSig = Object.fromEntries(
    String(env.LEGACY_LANE_PROBE_W2_EXACT_SIG || '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf('=');
        return i > 0 ? [part.slice(0, i).trim(), part.slice(i + 1).trim()] : ['', ''];
      })
      .filter(([k]) => k),
  );

  const names = Object.keys(defsByName);
  let count = 0;
  for (const name of names) {
    const d = defsByName[name];
    if (!d || !d.weapon1 || !d.weapon2) continue;
    const dualMelee =
      d.weapon1.name &&
      d.weapon2.name &&
      ['Reaper Axe', 'Core Staff', 'Crystal Maul', 'Scythe T2', 'Void Sword', 'Gun Blade Mk4'].includes(
        d.weapon1.name,
      ) &&
      ['Reaper Axe', 'Core Staff', 'Crystal Maul', 'Scythe T2', 'Void Sword', 'Gun Blade Mk4'].includes(
        d.weapon2.name,
      );
    const dualProjectile =
      d.weapon1 &&
      d.weapon2 &&
      ['Rift Gun', 'Split Crystal Bombs T2', 'Bow T2'].includes(d.weapon1.name) &&
      ['Rift Gun', 'Split Crystal Bombs T2', 'Bow T2'].includes(d.weapon2.name);
    const bombsW2 = d.weapon2 && d.weapon2.name === 'Split Crystal Bombs T2';
    const dualBombs =
      d.weapon1 && d.weapon1.name === 'Split Crystal Bombs T2' && d.weapon2 && d.weapon2.name === 'Split Crystal Bombs T2';
    const riftBombs =
      d.weapon1 && d.weapon1.name === 'Rift Gun' && d.weapon2 && d.weapon2.name === 'Split Crystal Bombs T2';
    const hasBioMisc =
      (d.misc1 && d.misc1.name === 'Bio Spinal Enhancer') || (d.misc2 && d.misc2.name === 'Bio Spinal Enhancer');
    let match = false;
    if (predicate === 'off') match = true;
    else if (predicate === 'defender_dual_projectile') match = dualProjectile;
    else if (predicate === 'defender_bombs_w2') match = bombsW2;
    else if (predicate === 'defender_dual_bombs') match = dualBombs;
    else if (predicate === 'defender_rift_bombs') match = riftBombs;
    else if (predicate === 'defender_sg1_bombs_w2') {
      match = bombsW2 && d.armor && d.armor.name === 'SG1 Armor';
    } else if (predicate === 'defender_rift_bombs_bio') match = riftBombs && hasBioMisc;
    else if (predicate === 'defender_dual_melee') match = dualMelee;
    else if (predicate === 'defender_melee_melee_per_weapon') match = dualMelee;
    else if (predicate === 'defender_reaper_first_dual_melee') {
      match = dualMelee && d.weapon1 && d.weapon1.name === 'Reaper Axe';
    } else if (predicate === 'defender_dark_legion_riftcore_double_bio') {
      match =
        d.armor &&
        d.armor.name === 'Dark Legion Armor' &&
        d.weapon1 &&
        d.weapon2 &&
        ['Rift Gun', 'Core Staff'].includes(d.weapon1.name) &&
        ['Rift Gun', 'Core Staff'].includes(d.weapon2.name) &&
        d.misc1 &&
        d.misc2 &&
        d.misc1.name === 'Bio Spinal Enhancer' &&
        d.misc2.name === 'Bio Spinal Enhancer';
    } else if (predicate === 'defender_dark_legion_reaper_first_dual_melee') {
      match =
        dualMelee &&
        d.armor &&
        d.armor.name === 'Dark Legion Armor' &&
        d.weapon1 &&
        d.weapon1.name === 'Reaper Axe';
    } else if (predicate === 'defender_exact_signature') {
      match = true;
      for (const [k, v] of Object.entries(exactSig)) {
        const actual =
          k === 'armorItem'
            ? d.armor && d.armor.name
            : k === 'w1Item'
              ? d.weapon1 && d.weapon1.name
              : k === 'w2Item'
                ? d.weapon2 && d.weapon2.name
                : k === 'm1Item'
                  ? d.misc1 && d.misc1.name
                  : k === 'm2Item'
                    ? d.misc2 && d.misc2.name
                    : '';
        if (String(actual || '') !== String(v || '')) {
          match = false;
          break;
        }
      }
    }
    if (match) count++;
  }
  return count;
}

function summarizeToggle(config, toggle, baseMap, curMap, defaultDefs) {
  const targets = [];
  const controls = [];
  const contrasts = [];
  const rowSummaries = [];

  const groups = [
    ['target', config.targetDefenders || []],
    ['control', config.controlDefenders || []],
    ['contrast', config.contrastDefenders || []],
  ];

  for (const [groupName, defenders] of groups) {
    for (const defender of defenders) {
      for (const attacker of config.attackers || []) {
        const k = `${attacker}__${defender}`;
        const base = baseMap.get(k);
        const cur = curMap.get(k);
        if (!base || !cur) continue;
        const improvement = Math.abs(base.dWinPct) - Math.abs(cur.dWinPct);
        const movement = Math.abs(cur.dWinPct - base.dWinPct);
        const turnImprovement = Math.abs(base.dAvgTurns) - Math.abs(cur.dAvgTurns);
        rowSummaries.push({
          group: groupName,
          attacker,
          defender,
          baseWinDelta: Number(base.dWinPct.toFixed(2)),
          curWinDelta: Number(cur.dWinPct.toFixed(2)),
          improvement: Number(improvement.toFixed(2)),
          movement: Number(movement.toFixed(2)),
          baseTurnsDelta: Number(base.dAvgTurns.toFixed(4)),
          curTurnsDelta: Number(cur.dAvgTurns.toFixed(4)),
          turnImprovement: Number(turnImprovement.toFixed(4)),
        });
        if (groupName === 'target') targets.push(improvement);
        if (groupName === 'control') controls.push(movement);
        if (groupName === 'contrast') contrasts.push(movement);
      }
    }
  }

  const targetGain = mean(targets);
  const controlMove = mean(controls);
  const contrastMove = mean(contrasts);
  const defaultReachCount =
    typeof config.defaultReachCount === 'function'
      ? config.defaultReachCount(toggle, defaultDefs)
      : defaultPotentialReachCount(toggle, defaultDefs);
  const defaultReachPenalty = defaultReachCount * Number(config.defaultReachWeight || 0.1);
  const tradeoffScore = targetGain - controlMove - contrastMove - defaultReachPenalty;

  return {
    id: toggle.id,
    label: toggle.label || toggle.id,
    analysisBound: !!toggle.analysisBound,
    targetGain: Number(targetGain.toFixed(2)),
    controlMove: Number(controlMove.toFixed(2)),
    contrastMove: Number(contrastMove.toFixed(2)),
    defaultReachCount,
    tradeoffScore: Number(tradeoffScore.toFixed(2)),
    rowSummaries,
  };
}

function main() {
  const configArg = process.argv[2];
  if (!configArg) {
    console.error('usage: node ./tools/codex-lane-probe-harness.js <config.js>');
    process.exit(1);
  }

  const config = loadConfig(configArg);
  const compareTool = resolveFromCwd(config.compareTool || './tools/legacy-truth-replay-compare.js');
  const simPath = resolveFromCwd(config.simPath);
  const outputRoot = resolveFromCwd(config.outputRoot || './tmp/lane-probe-harness');
  const runRoot = path.join(outputRoot, `${slugify(config.id || 'lane-probe')}-${Date.now()}`);
  ensureDir(runRoot);

  const allDefenders = [
    ...(config.targetDefenders || []),
    ...(config.controlDefenders || []),
    ...(config.contrastDefenders || []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const allDefendersCsv = allDefenders.join(',');
  const toggles = config.toggles || [];
  const baseEnv = {
    LEGACY_SHARED_HIT: '1',
    LEGACY_REPLAY_TRIALS: String(config.trials || 200000),
    LEGACY_REPLAY_WORKERS: '1',
    LEGACY_REPLAY_PROGRESS: 'single',
    LEGACY_REPLAY_SAVE_JSON: '1',
    ...(config.baseEnv || {}),
  };

  const defaultDefs = fs.existsSync(resolveFromCwd(config.defaultDefenderFile || './data/legacy-defenders.js'))
    ? require(resolveFromCwd(config.defaultDefenderFile || './data/legacy-defenders.js'))
    : {};

  const toggleResults = [];
  for (const toggle of toggles) {
    const outDir = path.join(runRoot, slugify(toggle.id));
    ensureDir(outDir);
    for (const tc of config.truthCases || []) {
      const env = {
        ...process.env,
        ...baseEnv,
        ...((toggle && toggle.env) || {}),
        LEGACY_REPLAY_OUTDIR: outDir,
        LEGACY_REPLAY_TAG: `${slugify(config.id)}-${slugify(toggle.id)}-${slugify(tc.attacker)}`,
        LEGACY_REPLAY_ATTACKERS: tc.attacker,
        LEGACY_REPLAY_DEFENDERS: allDefendersCsv,
      };
      runNode(
        [compareTool, resolveFromCwd(tc.truthFile), simPath],
        env,
        `${toggle.id} ${tc.attacker}`,
      );
    }
    toggleResults.push({
      id: toggle.id,
      label: toggle.label || toggle.id,
      analysisBound: !!toggle.analysisBound,
      outDir,
      rows: collectRows(outDir),
      env: toggle.env || {},
    });
  }

  const baseline = toggleResults.find((x) => x.id === (config.baselineToggleId || 'off')) || toggleResults[0];
  const baseMap = toRowMap(baseline.rows);
  const ranked = toggleResults
    .map((res) =>
      summarizeToggle(
        config,
        { id: res.id, label: res.label, env: res.env, analysisBound: res.analysisBound },
        baseMap,
        toRowMap(res.rows),
        defaultDefs,
      ),
    )
    .sort((a, b) => b.tradeoffScore - a.tradeoffScore || b.targetGain - a.targetGain || a.controlMove - b.controlMove);

  const summary = {
    configId: config.id,
    simPath,
    compareTool,
    runRoot,
    baselineToggleId: baseline.id,
    toggles: ranked,
  };
  const summaryFile = path.join(runRoot, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log(`RUN_ROOT\t${runRoot}`);
  console.log(`SUMMARY_JSON\t${summaryFile}`);
  console.log('RANK\tID\tTARGET_GAIN\tCONTROL_MOVE\tCONTRAST_MOVE\tDEFAULT_REACH\tSCORE\tBOUND');
  ranked.forEach((r, i) => {
    console.log(
      [
        i + 1,
        r.id,
        r.targetGain.toFixed(2),
        r.controlMove.toFixed(2),
        r.contrastMove.toFixed(2),
        String(r.defaultReachCount),
        r.tradeoffScore.toFixed(2),
        r.analysisBound ? 'yes' : 'no',
      ].join('\t'),
    );
  });
}

main();
