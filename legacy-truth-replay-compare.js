#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const truthPath = process.argv[2] || 'legacy-truth-2026-03-08T22-45-46-231Z.json';
const simPath = process.argv[3] || 'legacy-sim-v1.0.1.js';
const trials = Number(process.env.LEGACY_REPLAY_TRIALS || '200000');
const topN = Number(process.env.LEGACY_REPLAY_TOP || '15');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function groupBy(xs, keyFn) {
  const m = new Map();
  for (const x of xs) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

function collapseCrystal(part) {
  const ups = Array.isArray(part && part.upgrades) ? part.upgrades.filter(Boolean) : [];
  const crystal = ups.length ? ups[0] : '';
  const other = ups.filter((u) => u !== crystal);
  return { name: part.name, crystal, upgrades: other };
}

function pageBuildToLegacyCustom(pageBuild) {
  return {
    stats: {
      level: Number(pageBuild.stats.level),
      hp: Number(pageBuild.stats.hp),
      speed: Number(pageBuild.stats.speed),
      dodge: Number(pageBuild.stats.dodge),
      accuracy: Number(pageBuild.stats.accuracy),
    },
    armor: collapseCrystal(pageBuild.armor),
    weapon1: collapseCrystal(pageBuild.weapon1),
    weapon2: collapseCrystal(pageBuild.weapon2),
    misc1: collapseCrystal(pageBuild.misc1),
    misc2: collapseCrystal(pageBuild.misc2),
  };
}

function patchSimToCustom(simText, customBuild) {
  const modePat = /mode:\s*"env"\s*,\s*\/\/ env \| preset \| custom/;
  if (!modePat.test(simText)) throw new Error('Could not find USER_CONFIG attacker mode line to patch');
  let out = simText.replace(modePat, 'mode: "custom", // env | preset | custom');

  const customPat = /custom:\s*\{[\s\S]*?\n\s*\},\n\s*\},\n\n\s*defenders:/;
  const repl = `custom: ${JSON.stringify(customBuild, null, 6).replace(/^/gm, '')},\n  },\n\n  defenders:`;
  if (!customPat.test(out)) throw new Error('Could not find USER_CONFIG.attacker.custom block to patch');
  out = out.replace(customPat, repl);
  return out;
}

function parseCompactOutput(stdout) {
  const results = {};
  const lines = String(stdout).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m1 = line.match(/^\-\s+\d+\s+\[\s*([0-9.]+)%\]\s+(.+?)\s+\|\s+AvgT\s+([0-9.]+)/);
    if (!m1) continue;
    const defName = m1[2].trim();
    results[defName] = {
      winPct: Number(m1[1]),
      avgTurns: Number(m1[3]),
    };
    const next = lines[i + 1] || '';
    const m2 = next.match(/A disp\s+\d+\/\s*\d+\s+rng\s+([0-9]+)-([0-9]+).*?hit\s+(\d+)\/\s*(\d+)\s+sk\|hit\s+(\d+)\/\s*(\d+).*?\|\s+D disp\s+\d+\/\s*\d+\s+rng\s+([0-9]+)-([0-9]+).*?hit\s+(\d+)\/\s*(\d+)\s+sk\|hit\s+(\d+)\/\s*(\d+)/);
    if (m2) {
      Object.assign(results[defName], {
        A_rng: [Number(m2[1]), Number(m2[2])],
        A_hit: Number(m2[4]),
        A_dmg1: Number(m2[6]),
        A_dmg2: Number(m2[6]),
        D_rng: [Number(m2[7]), Number(m2[8])],
        D_hit: Number(m2[10]),
        D_dmg1: Number(m2[12]),
        D_dmg2: Number(m2[12]),
      });
    }
  }
  return results;
}

function truthToRow(m) {
  const j = m.network && m.network.best && m.network.best.json ? m.network.best.json : null;
  if (!j) throw new Error(`Missing network.best.json for ${m.attacker} vs ${m.defender}`);
  return {
    attacker: m.attacker,
    defender: m.defender,
    truth: {
      winPct: Number(((j.attackerWins / j.times) * 100).toFixed(2)),
      avgTurns: Number(j.averageTurns),
      A_hit: Number(j.attackerChances.hit),
      A_dmg1: Number(j.attackerChances.damage1),
      A_dmg2: Number(j.attackerChances.damage2),
      D_hit: Number(j.defenderChances.hit),
      D_dmg1: Number(j.defenderChances.damage1),
      D_dmg2: Number(j.defenderChances.damage2),
      A_rng: [Number(j.attackerDamage.min), Number(j.attackerDamage.max)],
      D_rng: [Number(j.defenderDamage.min), Number(j.defenderDamage.max)],
    },
    pageBuild: m.pageBuilds.attacker,
  };
}

function runSimForAttacker(attackerName, matchups, simPathAbs) {
  const defenders = matchups.map((m) => m.defender);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-replay-'));
  let scriptToRun = simPathAbs;
  const env = {
    ...process.env,
    LEGACY_TRIALS: String(trials),
    LEGACY_COLOR: '0',
    LEGACY_ASCII: '1',
    LEGACY_HEADER: 'min',
    LEGACY_OUTPUT: 'compact',
    LEGACY_DOCTOR: '0',
    LEGACY_COMPARE: '0',
    LEGACY_PRINT_GAME: '0',
    LEGACY_EXPORT_JSON: '0',
    LEGACY_VERIFY_DEFENDERS: defenders.join(','),
  };

  if (attackerName === 'CORE_VOID_ATTACKER') {
    const custom = pageBuildToLegacyCustom(matchups[0].pageBuild);
    const patched = patchSimToCustom(fs.readFileSync(simPathAbs, 'utf8'), custom);
    scriptToRun = path.join(path.dirname(simPathAbs), `.legacy-sim-custom-${process.pid}-${Date.now()}.js`);
    fs.writeFileSync(scriptToRun, patched);
  } else {
    env.LEGACY_ATTACKER_PRESET = attackerName;
  }

  const proc = cp.spawnSync(process.execPath, [scriptToRun], {
    cwd: path.dirname(simPathAbs),
    env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (proc.status !== 0) {
    throw new Error(`Run failed for ${attackerName}:\n${proc.stderr || proc.stdout}`);
  }
  if (scriptToRun !== simPathAbs) { try { fs.unlinkSync(scriptToRun); } catch {} }
  return parseCompactOutput(proc.stdout);
}

function main() {
  const truth = readJson(path.resolve(truthPath));
  const simAbs = path.resolve(simPath);
  const rows = truth.matchups.map(truthToRow);
  const groups = groupBy(rows, (r) => r.attacker);

  const all = [];
  for (const [attacker, group] of groups.entries()) {
    const simRows = runSimForAttacker(attacker, group, simAbs);
    for (const row of group) {
      const sim = simRows[row.defender];
      if (!sim) {
        all.push({ attacker, defender: row.defender, error: 'missing sim row' });
        continue;
      }
      all.push({
        attacker,
        defender: row.defender,
        truthWinPct: row.truth.winPct,
        simWinPct: sim.winPct,
        dWinPct: Number((sim.winPct - row.truth.winPct).toFixed(2)),
        absWinPct: Number(Math.abs(sim.winPct - row.truth.winPct).toFixed(2)),
        truthAvgTurns: row.truth.avgTurns,
        simAvgTurns: sim.avgTurns,
        dAvgTurns: Number((sim.avgTurns - row.truth.avgTurns).toFixed(4)),
        truthAHit: row.truth.A_hit,
        simAHit: sim.A_hit,
        dAHit: sim.A_hit - row.truth.A_hit,
        truthDHit: row.truth.D_hit,
        simDHit: sim.D_hit,
        dDHit: sim.D_hit - row.truth.D_hit,
        truthARng: row.truth.A_rng.join('-'),
        simARng: sim.A_rng ? sim.A_rng.join('-') : '',
        truthDRng: row.truth.D_rng.join('-'),
        simDRng: sim.D_rng ? sim.D_rng.join('-') : '',
      });
    }
  }

  all.sort((a, b) => (b.absWinPct || -1) - (a.absWinPct || -1));
  console.log(`MATCHUPS=${all.length}  TRIALS=${trials}`);
  console.log('Top win% mismatches:');
  for (const r of all.slice(0, topN)) {
    if (r.error) {
      console.log(`${r.attacker} | ${r.defender} | ERROR ${r.error}`);
      continue;
    }
    console.log(
      `${r.attacker} | ${r.defender} | truth=${r.truthWinPct.toFixed(2)} sim=${r.simWinPct.toFixed(2)} d=${r.dWinPct >= 0 ? '+' : ''}${r.dWinPct.toFixed(2)} | avgT ${r.truthAvgTurns.toFixed(4)}->${r.simAvgTurns.toFixed(4)} d=${r.dAvgTurns >= 0 ? '+' : ''}${r.dAvgTurns.toFixed(4)} | A_hit ${r.truthAHit}->${r.simAHit} | D_hit ${r.truthDHit}->${r.simDHit}`
    );
  }

  const outPath = path.resolve(`legacy-truth-vs-sim-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ truthFile: path.basename(truthPath), simFile: path.basename(simPath), trials, rows: all }, null, 2));
  console.log(`\nSaved ${outPath}`);
}

main();
