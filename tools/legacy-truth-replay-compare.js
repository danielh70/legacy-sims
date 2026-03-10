#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const truthPath =
  process.argv[2] ||
  path.join(repoRoot, 'data', 'truth', 'legacy-truth-stratified-v1.json');
const simPath = process.argv[3] || path.join(repoRoot, 'simulator', 'legacy-sim-latest.js');
const trials = Number(process.env.LEGACY_REPLAY_TRIALS || '200000');
const topN = Number(process.env.LEGACY_REPLAY_TOP || '15');
const sweepMode = String(process.env.LEGACY_REPLAY_SWEEP || 'none').trim() || 'none';
const workers = Math.max(1, Number(process.env.LEGACY_REPLAY_WORKERS || '4') || 4);
const progressModeRaw = String(process.env.LEGACY_REPLAY_PROGRESS || 'single').trim().toLowerCase();
const progressEveryMs = Math.max(
  100,
  Number(process.env.LEGACY_REPLAY_PROGRESS_EVERY_MS || '2000') || 2000,
);
const replayOutDirRaw = String(process.env.LEGACY_REPLAY_OUTDIR || './results/replay');
const replayTag = String(process.env.LEGACY_REPLAY_TAG || '').trim();
const replayDefendersRaw = String(process.env.LEGACY_REPLAY_DEFENDERS || '').trim();
const replayAttackersRaw = String(process.env.LEGACY_REPLAY_ATTACKERS || '').trim();
const saveJson = /^(1|true|yes|on)$/i.test(
  String(process.env.LEGACY_REPLAY_SAVE_JSON || '0'),
);
const saveIntermediate = /^(1|true|yes|on)$/i.test(
  String(process.env.LEGACY_REPLAY_SAVE_INTERMEDIATE || '0'),
);
const WORST_MISMATCH_LIMIT = 15;

const NUMERIC_FIELDS = {
  winPct: 2,
  avgTurns: 4,
  A_hit: 0,
  A_dmg1: 0,
  A_dmg2: 0,
  D_hit: 0,
  D_dmg1: 0,
  D_dmg2: 0,
  A_damageTotal: 0,
  D_damageTotal: 0,
  A_damagePerFight: 1,
  D_damagePerFight: 1,
};

const RANGE_FIELDS = ['A_rng', 'D_rng'];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseCsv(str) {
  return String(str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
  const ups = Array.isArray(part && part.upgrades)
    ? part.upgrades.filter(Boolean)
    : [];
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

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function patchSimToCustom(simText, customBuild) {
  const modePat = /mode:\s*['"](?:env|preset|custom)['"]\s*,\s*\/\/ env \| preset \| custom/;
  if (!modePat.test(simText)) {
    throw new Error('Could not find USER_CONFIG attacker mode line to patch');
  }
  let out = simText.replace(
    modePat,
    'mode: "custom", // env | preset | custom',
  );

  const customMatch = /(^[ \t]*)custom:\s*\{/m.exec(out);
  if (!customMatch) {
    throw new Error('Could not find USER_CONFIG.attacker.custom block to patch');
  }

  const customLineIndent = customMatch[1];
  const customLineStart = customMatch.index;
  const customBraceIndex = out.indexOf('{', customLineStart);
  const customBraceEnd = findMatchingBrace(out, customBraceIndex);
  if (customBraceEnd < 0) {
    throw new Error('Could not find the end of USER_CONFIG.attacker.custom block');
  }

  const defendersMatch = /\n([ \t]*)defenders:\s*\{/m.exec(out.slice(customBraceEnd + 1));
  if (!defendersMatch) {
    throw new Error('Could not find USER_CONFIG.defenders block after attacker.custom');
  }

  const defendersIndent = defendersMatch[1];
  const defendersLineStart = customBraceEnd + 1 + defendersMatch.index + 1;
  const customJson = JSON.stringify(customBuild, null, 2)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `${customLineIndent}${line}`))
    .join('\n');
  const repl = `${customLineIndent}custom: ${customJson},\n${defendersIndent}},\n\n`;
  out = out.slice(0, customLineStart) + repl + out.slice(defendersLineStart);
  return out;
}

function isUsablePageBuild(pageBuild) {
  if (!pageBuild || typeof pageBuild !== 'object') return false;
  const stats = pageBuild.stats || {};
  const statKeys = ['level', 'hp', 'speed', 'dodge', 'accuracy'];
  for (const key of statKeys) {
    if (!Number.isFinite(Number(stats[key]))) return false;
  }
  const slotKeys = ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2'];
  for (const key of slotKeys) {
    if (!pageBuild[key] || !String(pageBuild[key].name || '').trim()) return false;
  }
  return true;
}

function getCustomBuildFromPageBuild(pageBuild) {
  if (!isUsablePageBuild(pageBuild)) return null;
  return pageBuildToLegacyCustom(pageBuild);
}

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickFinite(...vals) {
  for (const v of vals) {
    const n = toFiniteNumber(v);
    if (n !== null) return n;
  }
  return null;
}

function pairOrNull(v) {
  if (!Array.isArray(v) || v.length < 2) return null;
  const a = toFiniteNumber(v[0]);
  const b = toFiniteNumber(v[1]);
  return a === null || b === null ? null : [a, b];
}

function roundMaybe(v, digits) {
  const n = toFiniteNumber(v);
  if (n === null) return null;
  if (digits == null) return n;
  return Number(n.toFixed(digits));
}

function signedDelta(sim, truth, digits) {
  const a = toFiniteNumber(sim);
  const b = toFiniteNumber(truth);
  return a === null || b === null ? null : roundMaybe(a - b, digits);
}

function absDelta(sim, truth, digits) {
  const d = signedDelta(sim, truth, digits);
  return d === null ? null : roundMaybe(Math.abs(d), digits);
}

function pairDelta(simPair, truthPair) {
  const a = pairOrNull(simPair);
  const b = pairOrNull(truthPair);
  if (!a || !b) return null;
  return {
    min: a[0] - b[0],
    max: a[1] - b[1],
  };
}

function pairAbsDelta(simPair, truthPair) {
  const d = pairDelta(simPair, truthPair);
  if (!d) return null;
  return {
    min: Math.abs(d.min),
    max: Math.abs(d.max),
  };
}

function avg(nums, digits) {
  const xs = nums.map(toFiniteNumber).filter((n) => n !== null);
  if (!xs.length) return null;
  return roundMaybe(xs.reduce((a, b) => a + b, 0) / xs.length, digits);
}

function sum(nums, digits) {
  const xs = nums.map(toFiniteNumber).filter((n) => n !== null);
  if (!xs.length) return null;
  return roundMaybe(xs.reduce((a, b) => a + b, 0), digits);
}

function formatNum(v, digits) {
  const n = toFiniteNumber(v);
  if (n === null) return 'n/a';
  return digits == null ? String(n) : n.toFixed(digits);
}

function formatSigned(v, digits) {
  const n = toFiniteNumber(v);
  if (n === null) return 'n/a';
  const s = digits == null ? String(n) : n.toFixed(digits);
  return n >= 0 ? `+${s}` : s;
}

function formatPair(pair) {
  const p = pairOrNull(pair);
  return p ? `${p[0]}-${p[1]}` : 'n/a';
}

function formatPairDelta(delta) {
  return delta
    ? `${formatSigned(delta.min, 0)}/${formatSigned(delta.max, 0)}`
    : 'n/a';
}

function formatDeltaWithAbs(delta, abs, digits) {
  const signed = toFiniteNumber(delta);
  const absolute = toFiniteNumber(abs);
  if (signed === null || absolute === null) return 'n/a';
  return `${formatSigned(signed, digits)} / ${formatNum(absolute, digits)}`;
}

function formatPairDeltaWithAbs(delta, abs) {
  if (!delta || !abs) return 'n/a';
  return (
    `${formatSigned(delta.min, 0)}/${formatSigned(delta.max, 0)} / ` +
    `${formatNum(abs.min, 0)}/${formatNum(abs.max, 0)}`
  );
}

function matchupKey(attacker, defender) {
  return `${attacker}__${defender}`;
}

function sanitizeFilePart(v) {
  return String(v || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
    s,
  ).padStart(2, '0')}`;
}

function ellipsize(s, maxLen) {
  const str = String(s || '');
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.max(0, maxLen - 3))}...`;
}

function parseCompactOutput(stdout) {
  const results = {};
  const lines = String(stdout).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m1 = line.match(
      /^\-\s+\d+\s+\[\s*([0-9.]+)%\]\s+(.+?)\s+\|\s+AvgT\s+([0-9.]+)/,
    );
    if (!m1) continue;
    const defName = m1[2].trim();
    results[defName] = {
      winPct: Number(m1[1]),
      avgTurns: Number(m1[3]),
    };
    const next = lines[i + 1] || '';
    const m2 = next.match(
      /^\s+\|\s+A disp\s+(\d+)\/\s*(\d+)\s+rng\s+([0-9]+)-([0-9]+)\s+dmg\/f\s+([0-9.]+)\s+hit\s+(\d+)\/\s*(\d+)\s+sk\|hit\s+(\d+)\/\s*(\d+)\s+\|\s+D disp\s+(\d+)\/\s*(\d+)\s+rng\s+([0-9]+)-([0-9]+)\s+dmg\/f\s+([0-9.]+)\s+hit\s+(\d+)\/\s*(\d+)\s+sk\|hit\s+(\d+)\/\s*(\d+)/,
    );
    if (m2) {
      Object.assign(results[defName], {
        A_rng: [Number(m2[3]), Number(m2[4])],
        A_damagePerFight: Number(m2[5]),
        D_rng: [Number(m2[12]), Number(m2[13])],
        D_damagePerFight: Number(m2[14]),
      });
    }
  }
  return results;
}

function parseExportRows(exportPath) {
  if (!fs.existsSync(exportPath)) return {};
  const payload = readJson(exportPath);
  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const variant = variants[0];
  if (!variant || !Array.isArray(variant.defenders)) return {};
  const rows = {};
  for (const row of variant.defenders) rows[row.name] = row;
  return rows;
}

function normalizeSimRow(stdoutRow, exportRow) {
  if (!stdoutRow && !exportRow) return null;
  const aNode = exportRow && exportRow.a ? exportRow.a : null;
  const dNode = exportRow && exportRow.d ? exportRow.d : null;
  return {
    winPct: pickFinite(
      exportRow && exportRow.winPct,
      stdoutRow && stdoutRow.winPct,
    ),
    avgTurns: pickFinite(
      exportRow && exportRow.avgTurns,
      stdoutRow && stdoutRow.avgTurns,
    ),
    A_hit: pickFinite(exportRow && exportRow.A_hit),
    A_dmg1: pickFinite(exportRow && exportRow.A_dmg1),
    A_dmg2: pickFinite(exportRow && exportRow.A_dmg2),
    D_hit: pickFinite(exportRow && exportRow.D_hit),
    D_dmg1: pickFinite(exportRow && exportRow.D_dmg1),
    D_dmg2: pickFinite(exportRow && exportRow.D_dmg2),
    A_rng:
      pairOrNull(exportRow && exportRow.A_rng) ||
      pairOrNull(aNode && aNode.range) ||
      pairOrNull(stdoutRow && stdoutRow.A_rng),
    D_rng:
      pairOrNull(exportRow && exportRow.D_rng) ||
      pairOrNull(dNode && dNode.range) ||
      pairOrNull(stdoutRow && stdoutRow.D_rng),
    A_damageTotal: pickFinite(
      exportRow && exportRow.A_damageTotal,
      aNode && aNode.damageTotal,
    ),
    D_damageTotal: pickFinite(
      exportRow && exportRow.D_damageTotal,
      dNode && dNode.damageTotal,
    ),
    A_damagePerFight: pickFinite(
      exportRow && exportRow.A_damagePerFight,
      aNode && aNode.dmgPerFight,
      stdoutRow && stdoutRow.A_damagePerFight,
    ),
    D_damagePerFight: pickFinite(
      exportRow && exportRow.D_damagePerFight,
      dNode && dNode.dmgPerFight,
      stdoutRow && stdoutRow.D_damagePerFight,
    ),
  };
}

function truthToRow(m) {
  const j = m.network && m.network.best && m.network.best.json
    ? m.network.best.json
    : null;
  if (!j) {
    throw new Error(`Missing network.best.json for ${m.attacker} vs ${m.defender}`);
  }
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
      A_damageTotal: Number(j.attackerDamage.total),
      D_damageTotal: Number(j.defenderDamage.total),
      A_damagePerFight: Number((j.attackerDamage.total / j.times).toFixed(1)),
      D_damagePerFight: Number((j.defenderDamage.total / j.times).toFixed(1)),
    },
    pageBuild: m.pageBuilds.attacker,
    matchupKey: matchupKey(m.attacker, m.defender),
    label: `${m.attacker} | ${m.defender}`,
  };
}

function resolveProgressMode() {
  if (progressModeRaw === 'off' || progressModeRaw === 'lines') return progressModeRaw;
  if (progressModeRaw === 'single') {
    return process.stdout.isTTY ? 'single' : 'lines';
  }
  return process.stdout.isTTY ? 'single' : 'lines';
}

function createProgressTracker(totalJobs) {
  const mode = resolveProgressMode();
  const state = {
    mode,
    totalJobs,
    completed: 0,
    currentVariant: '',
    currentMatchup: '',
    active: new Set(),
    startMs: Date.now(),
    timer: null,
    lastLineLen: 0,
  };

  function render(force) {
    if (state.mode === 'off') return;
    const now = Date.now();
    const elapsedMs = now - state.startMs;
    const pct = state.totalJobs
      ? ((100 * state.completed) / state.totalJobs).toFixed(1)
      : '100.0';
    const etaMs =
      state.completed > 0
        ? (elapsedMs / state.completed) * (state.totalJobs - state.completed)
        : 0;
    const current = ellipsize(
      state.currentMatchup || Array.from(state.active)[0] || '-',
      72,
    );
    const line =
      `PROGRESS variant=${state.currentVariant || '-'} jobs=${state.completed}/${state.totalJobs} ` +
      `${pct}% elapsed=${formatDuration(elapsedMs)} eta=${formatDuration(etaMs)} current=${current}`;

    if (state.mode === 'single') {
      const padded = line.padEnd(state.lastLineLen, ' ');
      process.stdout.write(`\r${padded}`);
      state.lastLineLen = padded.length;
      if (force && state.completed >= state.totalJobs) process.stdout.write('\n');
      return;
    }

    if (force || state.completed < state.totalJobs) console.log(line);
  }

  return {
    start() {
      if (state.mode === 'off') return;
      render(false);
      state.timer = setInterval(() => render(false), progressEveryMs);
    },
    startVariant(name) {
      state.currentVariant = name;
      render(false);
    },
    jobStarted(label) {
      state.currentMatchup = label;
      state.active.add(label);
    },
    jobFinished(label) {
      state.active.delete(label);
      state.completed += 1;
      render(false);
    },
    stop() {
      if (state.timer) clearInterval(state.timer);
      render(true);
    },
  };
}

function buildMatchupResult(row, sim) {
  if (!sim) {
    return {
      attacker: row.attacker,
      defender: row.defender,
      error: 'missing sim row',
      truth: row.truth,
      sim: null,
      delta: {},
      absDelta: {},
      dWinPct: null,
      absWinPct: null,
      dAvgTurns: null,
      absAvgTurns: null,
      matchupKey: row.matchupKey,
    };
  }

  const out = {
    attacker: row.attacker,
    defender: row.defender,
    truth: row.truth,
    sim,
    delta: {},
    absDelta: {},
    error: null,
    matchupKey: row.matchupKey,
  };

  for (const [field, digits] of Object.entries(NUMERIC_FIELDS)) {
    out.delta[field] = signedDelta(sim[field], row.truth[field], digits);
    out.absDelta[field] = absDelta(sim[field], row.truth[field], digits);
  }
  for (const field of RANGE_FIELDS) {
    out.delta[field] = pairDelta(sim[field], row.truth[field]);
    out.absDelta[field] = pairAbsDelta(sim[field], row.truth[field]);
  }

  out.dWinPct = out.delta.winPct;
  out.absWinPct = out.absDelta.winPct;
  out.dAvgTurns = out.delta.avgTurns;
  out.absAvgTurns = out.absDelta.avgTurns;
  return out;
}

function sortRows(rows) {
  return rows.slice().sort((a, b) => {
    const absWinA = toFiniteNumber(a.absWinPct);
    const absWinB = toFiniteNumber(b.absWinPct);
    if (absWinA === null && absWinB !== null) return 1;
    if (absWinB === null && absWinA !== null) return -1;
    if (absWinA !== null && absWinB !== null && absWinB !== absWinA) {
      return absWinB - absWinA;
    }

    const absTurnsA = toFiniteNumber(a.absAvgTurns);
    const absTurnsB = toFiniteNumber(b.absAvgTurns);
    if (absTurnsA === null && absTurnsB !== null) return 1;
    if (absTurnsB === null && absTurnsA !== null) return -1;
    if (
      absTurnsA !== null &&
      absTurnsB !== null &&
      absTurnsB !== absTurnsA
    ) {
      return absTurnsB - absTurnsA;
    }

    return a.matchupKey.localeCompare(b.matchupKey);
  });
}

function buildGroupedSummary(rows, key) {
  const okRows = rows.filter((r) => !r.error && toFiniteNumber(r.absWinPct) !== null);
  const groups = groupBy(okRows, (r) => r[key]);
  const out = [];
  for (const [name, group] of groups.entries()) {
    const worst = group
      .slice()
      .sort((a, b) => {
        if (b.absWinPct !== a.absWinPct) return b.absWinPct - a.absWinPct;
        return (b.absAvgTurns || 0) - (a.absAvgTurns || 0);
      })[0];
    out.push({
      name,
      matchups: group.length,
      avgAbsWinPct: avg(group.map((r) => r.absWinPct), 2),
      worstAbsWinPct: worst.absWinPct,
      worstSignedWinPct: worst.dWinPct,
      worstAbsAvgTurns: worst.absAvgTurns,
      worstCounterpart: key === 'attacker' ? worst.defender : worst.attacker,
    });
  }
  return out.sort((a, b) => {
    if (b.worstAbsWinPct !== a.worstAbsWinPct) return b.worstAbsWinPct - a.worstAbsWinPct;
    if (b.avgAbsWinPct !== a.avgAbsWinPct) return b.avgAbsWinPct - a.avgAbsWinPct;
    return a.name.localeCompare(b.name);
  });
}

function buildSummary(rows) {
  const okRows = rows.filter((r) => !r.error && toFiniteNumber(r.absWinPct) !== null);
  const sorted = sortRows(okRows);
  const worst = sorted[0] || null;
  return {
    matchups: rows.length,
    compared: okRows.length,
    meanAbsWinPct: avg(okRows.map((r) => r.absWinPct), 2),
    meanAbsAvgTurns: avg(okRows.map((r) => r.absAvgTurns), 4),
    worstAbsWinPct: worst ? worst.absWinPct : null,
    worstAbsAvgTurns: worst ? worst.absAvgTurns : null,
    worstAttacker: worst ? worst.attacker : null,
    worstDefender: worst ? worst.defender : null,
    topAbsWinPctSum: sum(sorted.slice(0, topN).map((r) => r.absWinPct), 2),
    topAbsAvgTurnsSum: sum(sorted.slice(0, topN).map((r) => r.absAvgTurns), 4),
  };
}

function getSweepVariants(mode) {
  if (mode === 'none') return [{ name: 'baseline', env: {} }];
  if (mode === 'corevoid_debug') {
    return [
      { name: 'baseline', env: {} },
      { name: 'armor115', env: { LEGACY_HF_ARMOR_BASE_OVERRIDE: '115' } },
      { name: 'void120', env: { LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '120' } },
      { name: 'stop_on_kill', env: { LEGACY_ACTION_STOP_ON_KILL: '1' } },
      {
        name: 'armor115+void120',
        env: {
          LEGACY_HF_ARMOR_BASE_OVERRIDE: '115',
          LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '120',
        },
      },
      {
        name: 'armor115+void120+stop_on_kill',
        env: {
          LEGACY_HF_ARMOR_BASE_OVERRIDE: '115',
          LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '120',
          LEGACY_ACTION_STOP_ON_KILL: '1',
        },
      },
    ];
  }
  if (mode === 'package_calib') {
    return [
      { name: 'baseline', env: {} },
      {
        name: 'dbsr_up2',
        env: {
          LEGACY_OVR_DBSR_BASE_MIN: '97',
          LEGACY_OVR_DBSR_BASE_MAX: '107',
        },
      },
      {
        name: 'dbsr_up4',
        env: {
          LEGACY_OVR_DBSR_BASE_MIN: '99',
          LEGACY_OVR_DBSR_BASE_MAX: '109',
        },
      },
      {
        name: 'bombs_up2',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '57',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '89',
        },
      },
      {
        name: 'bombs_up4',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '59',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '91',
        },
      },
      {
        name: 'scythe_down2',
        env: {
          LEGACY_OVR_SCYTHE_T2_BASE_MIN: '78',
          LEGACY_OVR_SCYTHE_T2_BASE_MAX: '99',
        },
      },
      {
        name: 'scythe_down4',
        env: {
          LEGACY_OVR_SCYTHE_T2_BASE_MIN: '76',
          LEGACY_OVR_SCYTHE_T2_BASE_MAX: '97',
        },
      },
      {
        name: 'voidsword_down2',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
        },
      },
      {
        name: 'hfarmor_down5',
        env: {
          LEGACY_OVR_HF_ARMOR_BASE: '120',
        },
      },
      {
        name: 'bombs_up2+dbsr_up2',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '57',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '89',
          LEGACY_OVR_DBSR_BASE_MIN: '97',
          LEGACY_OVR_DBSR_BASE_MAX: '107',
        },
      },
      {
        name: 'bombs_up2+scythe_down2',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '57',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '89',
          LEGACY_OVR_SCYTHE_T2_BASE_MIN: '78',
          LEGACY_OVR_SCYTHE_T2_BASE_MAX: '99',
        },
      },
      {
        name: 'dbsr_up2+voidsword_down2',
        env: {
          LEGACY_OVR_DBSR_BASE_MIN: '97',
          LEGACY_OVR_DBSR_BASE_MAX: '107',
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
        },
      },
    ];
  }
  if (mode === 'hf_corevoid_calib') {
    return [
      { name: 'baseline', env: {} },
      {
        name: 'voidsword_down2',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
        },
      },
      {
        name: 'voidsword_down4',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '86',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '116',
        },
      },
      {
        name: 'hfarmor_down5',
        env: {
          LEGACY_OVR_HF_ARMOR_BASE: '120',
        },
      },
      {
        name: 'hfarmor_down10',
        env: {
          LEGACY_OVR_HF_ARMOR_BASE: '115',
        },
      },
      {
        name: 'voidsword_down2+hfarmor_down5',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
          LEGACY_OVR_HF_ARMOR_BASE: '120',
        },
      },
      {
        name: 'voidsword_down4+hfarmor_down5',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '86',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '116',
          LEGACY_OVR_HF_ARMOR_BASE: '120',
        },
      },
      {
        name: 'voidsword_down2+hfarmor_down10',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
          LEGACY_OVR_HF_ARMOR_BASE: '115',
        },
      },
    ];
  }
  if (mode === 'final_calib_check') {
    return [
      { name: 'baseline', env: {} },
      {
        name: 'bombs_up2+dbsr_up2',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '57',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '89',
          LEGACY_OVR_DBSR_BASE_MIN: '97',
          LEGACY_OVR_DBSR_BASE_MAX: '107',
        },
      },
      {
        name: 'voidsword_down2',
        env: {
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
        },
      },
      {
        name: 'bombs_up2+dbsr_up2+voidsword_down2',
        env: {
          LEGACY_OVR_BOMBS_T2_BASE_MIN: '57',
          LEGACY_OVR_BOMBS_T2_BASE_MAX: '89',
          LEGACY_OVR_DBSR_BASE_MIN: '97',
          LEGACY_OVR_DBSR_BASE_MAX: '107',
          LEGACY_OVR_VOID_SWORD_BASE_MIN: '88',
          LEGACY_OVR_VOID_SWORD_BASE_MAX: '118',
        },
      },
    ];
  }
  throw new Error(
    `Unsupported LEGACY_REPLAY_SWEEP=${mode}. Supported: none, corevoid_debug, package_calib, hf_corevoid_calib, final_calib_check`,
  );
}

function formatVariantEnv(variant) {
  const pairs = Object.entries(variant.env || {});
  return pairs.length
    ? pairs.map(([k, v]) => `${k}=${v}`).join(' ')
    : '(default env)';
}

function printGroupedSummary(title, rows) {
  console.log(title);
  for (const row of rows) {
    console.log(
      `${row.name} | avgAbsΔwin=${formatNum(row.avgAbsWinPct, 2)} | worst=${formatNum(
        row.worstAbsWinPct,
        2,
      )} (${formatSigned(row.worstSignedWinPct, 2)}) | vs=${row.worstCounterpart}`,
    );
  }
}

function printMatchupRow(rank, row) {
  if (row.error) {
    console.log(`${rank} ${row.attacker} | ${row.defender} | ERROR ${row.error}`);
    return;
  }

  console.log(
    `${rank} ${row.attacker} | ${row.defender} | ` +
      `win ${formatNum(row.truth.winPct, 2)}->${formatNum(
        row.sim.winPct,
        2,
      )} s/a ${formatDeltaWithAbs(row.dWinPct, row.absWinPct, 2)} | ` +
      `avgT ${formatNum(row.truth.avgTurns, 4)}->${formatNum(
        row.sim.avgTurns,
        4,
      )} s/a ${formatDeltaWithAbs(row.dAvgTurns, row.absAvgTurns, 4)}`,
  );
  console.log(
    `   A hit ${formatNum(row.truth.A_hit, 0)}->${formatNum(
      row.sim.A_hit,
      0,
    )} s/a ${formatDeltaWithAbs(row.delta.A_hit, row.absDelta.A_hit, 0)} | ` +
      `dmg1 ${formatNum(row.truth.A_dmg1, 0)}->${formatNum(
        row.sim.A_dmg1,
        0,
      )} s/a ${formatDeltaWithAbs(row.delta.A_dmg1, row.absDelta.A_dmg1, 0)} | ` +
      `dmg2 ${formatNum(row.truth.A_dmg2, 0)}->${formatNum(
        row.sim.A_dmg2,
        0,
      )} s/a ${formatDeltaWithAbs(row.delta.A_dmg2, row.absDelta.A_dmg2, 0)} | ` +
      `dmg/f ${formatNum(row.truth.A_damagePerFight, 1)}->${formatNum(
        row.sim.A_damagePerFight,
        1,
      )} s/a ${formatDeltaWithAbs(
        row.delta.A_damagePerFight,
        row.absDelta.A_damagePerFight,
        1,
      )} | ` +
      `rng ${formatPair(row.truth.A_rng)}->${formatPair(
        row.sim.A_rng,
      )} s/a ${formatPairDeltaWithAbs(row.delta.A_rng, row.absDelta.A_rng)}`,
  );
  console.log(
    `   D hit ${formatNum(row.truth.D_hit, 0)}->${formatNum(
      row.sim.D_hit,
      0,
    )} s/a ${formatDeltaWithAbs(row.delta.D_hit, row.absDelta.D_hit, 0)} | ` +
      `dmg1 ${formatNum(row.truth.D_dmg1, 0)}->${formatNum(
        row.sim.D_dmg1,
        0,
      )} s/a ${formatDeltaWithAbs(row.delta.D_dmg1, row.absDelta.D_dmg1, 0)} | ` +
      `dmg2 ${formatNum(row.truth.D_dmg2, 0)}->${formatNum(
        row.sim.D_dmg2,
        0,
      )} s/a ${formatDeltaWithAbs(row.delta.D_dmg2, row.absDelta.D_dmg2, 0)} | ` +
      `dmg/f ${formatNum(row.truth.D_damagePerFight, 1)}->${formatNum(
        row.sim.D_damagePerFight,
        1,
      )} s/a ${formatDeltaWithAbs(
        row.delta.D_damagePerFight,
        row.absDelta.D_damagePerFight,
        1,
      )} | ` +
      `rng ${formatPair(row.truth.D_rng)}->${formatPair(
        row.sim.D_rng,
      )} s/a ${formatPairDeltaWithAbs(row.delta.D_rng, row.absDelta.D_rng)}`,
  );
}

function printVariantReport(report) {
  console.log(
    `MATCHUPS=${report.summary.matchups} COMPARED=${report.summary.compared} TRIALS=${trials} ` +
      `WORKERS=${workers} VARIANT=${report.variant} ENV=${formatVariantEnv(report)}`,
  );
  console.log(
    `SUMMARY meanAbsΔwin=${formatNum(report.summary.meanAbsWinPct, 2)} ` +
      `meanAbsΔavgT=${formatNum(report.summary.meanAbsAvgTurns, 4)} ` +
      `worstAbsΔwin=${formatNum(report.summary.worstAbsWinPct, 2)} ` +
      `(${report.summary.worstAttacker} vs ${report.summary.worstDefender})`,
  );
  console.log(`Worst mismatches (top ${WORST_MISMATCH_LIMIT}):`);
  report.worstMismatches.forEach((row, idx) =>
    printMatchupRow(String(idx + 1).padStart(2, '0'), row),
  );
  printGroupedSummary('\nBy attacker:', report.byAttacker);
  printGroupedSummary('\nBy defender:', report.byDefender);
}

function buildSweepScores(reports) {
  const baseline = reports[0];
  const baselineTopKeys = baseline.topRows.map((r) => r.matchupKey);
  return reports.map((report) => {
    const rowByKey = new Map(report.rows.map((r) => [r.matchupKey, r]));
    const baselineTopRows = baselineTopKeys
      .map((k) => rowByKey.get(k))
      .filter(Boolean);
    return {
      variant: report.variant,
      env: report.env,
      meanAbsWinPct: report.summary.meanAbsWinPct,
      worstAbsWinPct: report.summary.worstAbsWinPct,
      baselineTopAbsWinPctSum: sum(
        baselineTopRows.map((r) => r.absWinPct),
        2,
      ),
      baselineTopAbsAvgTurnsSum: sum(
        baselineTopRows.map((r) => r.absAvgTurns),
        4,
      ),
      attackerAvgAbsWinPct: avg(
        report.byAttacker.map((r) => r.avgAbsWinPct),
        2,
      ),
      attackerWorstAbsWinPct: report.byAttacker.length
        ? report.byAttacker[0].worstAbsWinPct
        : null,
      defenderAvgAbsWinPct: avg(
        report.byDefender.map((r) => r.avgAbsWinPct),
        2,
      ),
      defenderWorstAbsWinPct: report.byDefender.length
        ? report.byDefender[0].worstAbsWinPct
        : null,
    };
  });
}

function pickBest(scores, keyA, keyB) {
  return scores.slice().sort((a, b) => {
    const av = toFiniteNumber(a[keyA]);
    const bv = toFiniteNumber(b[keyA]);
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    if (av !== null && bv !== null && av !== bv) return av - bv;

    const at = toFiniteNumber(a[keyB]);
    const bt = toFiniteNumber(b[keyB]);
    if (at === null && bt !== null) return 1;
    if (bt === null && at !== null) return -1;
    if (at !== null && bt !== null && at !== bt) return at - bt;

    return a.variant.localeCompare(b.variant);
  })[0];
}

function printSweepSummary(scores) {
  const baseline = scores[0];
  console.log('\nSWEEP SCORES:');
  for (const s of scores) {
    const topImprove =
      toFiniteNumber(baseline.baselineTopAbsWinPctSum) !== null &&
      toFiniteNumber(s.baselineTopAbsWinPctSum) !== null
        ? baseline.baselineTopAbsWinPctSum - s.baselineTopAbsWinPctSum
        : null;
    console.log(
      `${s.variant} | meanAbsΔwin=${formatNum(s.meanAbsWinPct, 2)} | worst=${formatNum(
        s.worstAbsWinPct,
        2,
      )} | ` +
        `top${topN}AbsWin=${formatNum(
          s.baselineTopAbsWinPctSum,
          2,
        )} (${formatSigned(topImprove, 2)} vs baseline) | ` +
        `atkAvg=${formatNum(s.attackerAvgAbsWinPct, 2)} atkWorst=${formatNum(
          s.attackerWorstAbsWinPct,
          2,
        )} | ` +
        `defAvg=${formatNum(s.defenderAvgAbsWinPct, 2)} defWorst=${formatNum(
          s.defenderWorstAbsWinPct,
          2,
        )}`,
    );
  }

  const bestTop = pickBest(
    scores,
    'baselineTopAbsWinPctSum',
    'baselineTopAbsAvgTurnsSum',
  );
  const bestAttacker = pickBest(
    scores,
    'attackerAvgAbsWinPct',
    'attackerWorstAbsWinPct',
  );
  const bestDefender = pickBest(
    scores,
    'defenderAvgAbsWinPct',
    'defenderWorstAbsWinPct',
  );

  console.log('\nSWEEP BEST:');
  console.log(
    `top mismatches: ${bestTop.variant} | top${topN}AbsWin=${formatNum(
      bestTop.baselineTopAbsWinPctSum,
      2,
    )} (${formatSigned(
      baseline.baselineTopAbsWinPctSum - bestTop.baselineTopAbsWinPctSum,
      2,
    )} vs baseline)`,
  );
  console.log(
    `attacker summaries: ${bestAttacker.variant} | avgAbsΔwin=${formatNum(
      bestAttacker.attackerAvgAbsWinPct,
      2,
    )} worst=${formatNum(bestAttacker.attackerWorstAbsWinPct, 2)}`,
  );
  console.log(
    `defender summaries: ${bestDefender.variant} | avgAbsΔwin=${formatNum(
      bestDefender.defenderAvgAbsWinPct,
      2,
    )} worst=${formatNum(bestDefender.defenderWorstAbsWinPct, 2)}`,
  );

  return {
    bestTop,
    bestAttacker,
    bestDefender,
  };
}

function makeRunBaseName() {
  const parts = [
    'legacy-replay',
    sanitizeFilePart(path.basename(truthPath)),
    sanitizeFilePart(path.basename(simPath)),
    sanitizeFilePart(sweepMode),
  ];
  if (replayTag) parts.push(sanitizeFilePart(replayTag));
  parts.push(makeTimestamp());
  return parts.filter(Boolean).join('--');
}

function makeVariantFileName(baseName, variantName) {
  return `${baseName}--${sanitizeFilePart(variantName)}.json`;
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function buildFinalPayload({
  reports,
  scores,
  best,
  truth,
  simAbs,
  outDir,
  totalJobs,
}) {
  const first = reports[0];
  return {
    createdUtc: new Date().toISOString(),
    truthFile: path.basename(truthPath),
    simFile: path.basename(simAbs),
    truthMatchups: truth.matchups.length,
    trials,
    topN,
    sweepMode,
    workers,
    totalJobs,
    progressMode: resolveProgressMode(),
    progressEveryMs,
    outDir,
    tag: replayTag || null,
    variant: first.variant,
    env: first.env,
    summary: first.summary,
    byAttacker: first.byAttacker,
    byDefender: first.byDefender,
    worstMismatches: first.worstMismatches,
    rows: first.rows,
    scores: scores || null,
    best: best || null,
    variants: reports,
  };
}

function createJobRunner({
  simAbs,
  variant,
  variantTmpDir,
  customScriptCache,
  generatedScripts,
  tracker,
}) {
  return async function runJob(row) {
    let scriptToRun = simAbs;
    const customBuild = getCustomBuildFromPageBuild(row.pageBuild);
    const exportPath = path.join(
      variantTmpDir,
      `${sanitizeFilePart(row.attacker)}--${sanitizeFilePart(row.defender)}--${process.pid}.json`,
    );

    if (customBuild) {
      const key = JSON.stringify(customBuild);
      scriptToRun = customScriptCache.get(key);
      if (!scriptToRun) {
        const patched = patchSimToCustom(fs.readFileSync(simAbs, 'utf8'), customBuild);
        scriptToRun = path.join(
          path.dirname(simAbs),
          `.legacy-sim-custom--${process.pid}--${sanitizeFilePart(variant.name)}--${customScriptCache.size + 1}.js`,
        );
        fs.writeFileSync(scriptToRun, patched);
        customScriptCache.set(key, scriptToRun);
        generatedScripts.add(scriptToRun);
      }
    }

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
      LEGACY_EXPORT_JSON: '1',
      LEGACY_EXPORT_JSON_FILE: exportPath,
      LEGACY_VERIFY_DEFENDERS: row.defender,
      ...(variant.env || {}),
    };

    if (!customBuild) {
      env.LEGACY_ATTACKER_PRESET = row.attacker;
    }

    tracker.jobStarted(row.label);
    try {
      const proc = await new Promise((resolve, reject) => {
        const child = cp.spawn(process.execPath, [scriptToRun], {
          cwd: path.dirname(simAbs),
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
          stdout += String(chunk);
        });
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk);
        });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `Run failed for ${variant.name} | ${row.label}:\n${stderr || stdout}`,
              ),
            );
            return;
          }
          resolve({ stdout, stderr });
        });
      });

      const compactRows = parseCompactOutput(proc.stdout);
      const exportRows = parseExportRows(exportPath);
      return buildMatchupResult(
        row,
        normalizeSimRow(compactRows[row.defender], exportRows[row.defender]),
      );
    } finally {
      tracker.jobFinished(row.label);
      try {
        fs.unlinkSync(exportPath);
      } catch {}
    }
  };
}

async function runWithConcurrency(items, limit, workerFn) {
  const results = new Array(items.length);
  let index = 0;

  async function runOne() {
    while (true) {
      const myIndex = index;
      index += 1;
      if (myIndex >= items.length) return;
      results[myIndex] = await workerFn(items[myIndex], myIndex);
    }
  }

  const count = Math.min(limit, items.length);
  const runners = [];
  for (let i = 0; i < count; i++) runners.push(runOne());
  await Promise.all(runners);
  return results;
}

async function buildVariantReport({
  variant,
  rows,
  simAbs,
  tracker,
  baseName,
  outDir,
}) {
  tracker.startVariant(variant.name);
  const variantTmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `legacy-replay-${sanitizeFilePart(variant.name)}-`),
  );
  const customScriptCache = new Map();
  const generatedScripts = new Set();
  try {
    const results = await runWithConcurrency(
      rows,
      workers,
      createJobRunner({
        simAbs,
        variant,
        variantTmpDir,
        customScriptCache,
        generatedScripts,
        tracker,
      }),
    );

    const sortedRows = sortRows(results);
    const report = {
      variant: variant.name,
      env: variant.env,
      rows: sortedRows,
      topRows: sortedRows.slice(0, topN),
      worstMismatches: sortedRows.slice(0, WORST_MISMATCH_LIMIT),
      byAttacker: buildGroupedSummary(sortedRows, 'attacker'),
      byDefender: buildGroupedSummary(sortedRows, 'defender'),
      summary: buildSummary(sortedRows),
    };

    if (saveIntermediate) {
      const intermediatePath = path.join(
        outDir,
        makeVariantFileName(baseName, variant.name),
      );
      writeJsonFile(intermediatePath, report);
    }

    return report;
  } finally {
    for (const filePath of generatedScripts) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
    try {
      fs.rmSync(variantTmpDir, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  const truth = readJson(path.resolve(truthPath));
  const simAbs = path.resolve(simPath);
  const attackerFilters = new Set(parseCsv(replayAttackersRaw));
  const defenderFilters = new Set(parseCsv(replayDefendersRaw));
  const filteredMatchups = truth.matchups.filter((m) => {
    if (attackerFilters.size && !attackerFilters.has(m.attacker)) return false;
    if (defenderFilters.size && !defenderFilters.has(m.defender)) return false;
    return true;
  });
  const rows = filteredMatchups.map(truthToRow);
  const variants = getSweepVariants(sweepMode);
  const totalJobs = rows.length * variants.length;
  const outDir = path.resolve(replayOutDirRaw);
  const baseName = makeRunBaseName();
  if (saveJson || saveIntermediate) ensureDir(outDir);

  console.log(`JSON_SAVE: ${saveJson ? 'ON' : 'OFF'}`);
  console.log(
    `FILTERS attackers=${attackerFilters.size ? Array.from(attackerFilters).join(', ') : '(all)'} ` +
      `defenders=${defenderFilters.size ? Array.from(defenderFilters).join(', ') : '(all)'}`,
  );

  const tracker = createProgressTracker(totalJobs);
  tracker.start();

  const reports = [];
  try {
    for (const variant of variants) {
      const report = await buildVariantReport({
        variant,
        rows,
        simAbs,
        tracker,
        baseName,
        outDir,
      });
      reports.push(report);
    }
  } finally {
    tracker.stop();
  }

  printVariantReport(reports[0]);

  let scores = null;
  let best = null;
  if (sweepMode !== 'none') {
    scores = buildSweepScores(reports);
    best = printSweepSummary(scores);
  }

  if (saveJson) {
    const finalPayload = buildFinalPayload({
      reports,
      scores,
      best,
      truth,
      simAbs,
      outDir,
      totalJobs,
    });
    const finalPath = path.join(outDir, `${baseName}.json`);
    writeJsonFile(finalPath, finalPayload);
    console.log(`\nSaved ${finalPath}`);
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
