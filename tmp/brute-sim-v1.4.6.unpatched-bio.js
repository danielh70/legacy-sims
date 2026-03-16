#!/usr/bin/env node
'use strict';

/**
 * =====================
 * LEGACY BRUTE FORCE (CONSTRAINED + STAGED + DETERMINISTIC RNG OPTION)
 * v1.4.6 (attacker-only attack style control by product requirement)
 * =====================
 *
 * Fixes / Improvements:
 * ✅ Catalog confirmation now compiles defenders ONCE and reuses them for all confirm calls.
 *    (Previously it rebuilt a variant cache + recompiled defenders per catalog entry.)
 *
 * Mixed weapon bonus (as you described):
 * ✅ If weapon types are mixed => double EACH weapon’s OWN offensive skill contribution,
 *    and only the skill coming from that weapon variant (weapon flats + weapon crystal effects).
 *    (No doubling armor/misc skill, no doubling defSkill/speed/accuracy, etc.)
 *
 * Env knobs:
 *   LEGACY_CATALOG_TOP_N=10
 *   LEGACY_CATALOG_MARGIN=12
 *   LEGACY_CATALOG_CONFIRM_TRIALS= (defaults to TRIALS_CONFIRM)
 *
 * Speed/quality knobs:
 *   LEGACY_WARM_START=1|0                # evaluate a known strong seed build to set the shared floor (default ON)
 *   LEGACY_WARM_START_TRIALS=5000        # trials/def for warm-start (defaults to TRIALS_CONFIRM)
 *
 * Staged evaluation knobs:
 *   LEGACY_TRIALS=20000                  # confirm trials/def (Stage B)
 *   LEGACY_TRIALS_SCREEN=2000            # screen trials/def (Stage A)
 *   LEGACY_TRIALS_GATE=500               # gate trials/def (Stage 0)
 *   LEGACY_GATEKEEPERS=4                 # number of gatekeeper defenders
 *   LEGACY_SCREEN_MARGIN=6               # Stage A early-bail margin (pct)
 *
 * RNG/repro:
 *   LEGACY_RNG=fast|math                 # default: fast (sfc32)
 *   LEGACY_SEED=123456789                # base seed for fast RNG
 *   LEGACY_DETERMINISTIC=1               # deterministic per-defender seeding (slower, reproducible)
 *
 * Combat knobs (defaults are the calibrated settings):
 *   LEGACY_SPEED_TIE_MODE=random|attacker
 *   LEGACY_HIT_ROLL_MODE=int             LEGACY_HIT_GE=1     LEGACY_HIT_QROUND=round
 *   LEGACY_SKILL_ROLL_MODE=int           LEGACY_SKILL_GE=1   LEGACY_SKILL_QROUND=round
 *   LEGACY_DMG_ROLL=int
 *   LEGACY_ARMOR_K=8                     LEGACY_ARMOR_APPLY=per_weapon  LEGACY_ARMOR_ROUND=ceil
 *   LEGACY_ATTACK_STYLE_MODE=lock|sweep
 *   LEGACY_ATTACKER_ATTACK_TYPE=normal|aimed|cover
 *   LEGACY_ATTACK_STYLE_SET=normal,aimed,cover
 *   LEGACY_ATTACK_STYLE_ROUND=floor|round|ceil
 *   LEGACY_DEFENDER_ATTACK_TYPE is intentionally ignored in brute-sim.
 *
 * Optional debugging:
 *   LEGACY_WATCH_BUILD=1                 # log one watched build when encountered
 *   LEGACY_FORCE_WEAPON_PAIR="Crystal Maul,Reaper Axe"  # temporary exact weapon item-pair lock
 *   LEGACY_FORCE_MISC_INCLUDE="Orphic Amulet"  # require at least one listed misc item in the final build; crystal variants still flow through
 *
 * Output/UI knobs:
 *   LEGACY_REPORT=quiet|compact|verbose  # default: compact
 *   LEGACY_PROGRESS=single|checkpoints|lines|off
 *   LEGACY_SANITY=auto|always|never
 *   LEGACY_SHOW_TOP=10                   # finalists shown per HP block
 *   LEGACY_SHOW_REFINE_TOP=6             # meaningful refine rows shown
 */

// =====================
// IMPORTS
// =====================
const fs = require('fs');
const os = require('os');
const VERSION = 'v1.4.6';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// =====================
// SETTINGS
// =====================
const SETTINGS = {
  LEVEL: 80,
  HP_MAX: 865,
  MAX_TURNS: 200,

  TRIALS_CONFIRM_DEFAULT: 15000,
  TRIALS_SCREEN_DEFAULT: 1000,
  TRIALS_GATE_DEFAULT: 300,
  GATEKEEPERS_DEFAULT: 4,

  SCREEN_BAIL_MARGIN_DEFAULT: 6.0,
  INIT_FLOOR_PCT: 41, // 0 disables manual shared-floor seeding

  KEEP_TOP_N_PER_HP: 15,
  PROGRESS_EVERY_MS: 2000,

  // Historical single-HP default.
  LOCKED_HP: 650,

  WORKERS_DEFAULT_CAP: 4,
};

// =====================
// PLAN / SWEEP CONFIG (edit these for HP + allocation sweeps)
// =====================
const PLAN_SWEEP_CONFIG = {
  // 'single' = only use singleHp below
  // 'sweep'  = use hpSweep.min..max in hpSweep.step increments
  hpMode: 'single',
  singleHp: SETTINGS.LOCKED_HP,

  hpSweep: {
    min: 500,
    max: 700,
    step: 50,
    includeSingleHp: false,
  },

  // 'dodge_only'      = old behavior (all free points into dodge)
  // 'acc_dodge_sweep' = sweep accuracy allocations and put the rest into dodge
  allocationMode: 'dodge_only',
  allocation: {
    accStep: 10,
    customAccValues: [], // e.g. [15, 25] to force extra checkpoints when valid for a given HP
    includeFullDodge: true,
    includeFullAcc: true,
  },

  // Conservative local bail for a single gear build while stepping accuracy upward.
  // This only stops additional HIGHER-accuracy allocations for the same HP once the
  // results are clearly worse for consecutive steps.
  safeAccuracyBail: {
    enabled: true,
    metric: 'screen_or_confirm', // 'screen_or_confirm' | 'confirm_only'
    minEvaluatedPlans: 3,
    minAccAheadOfBest: 20,
    worseByPct: 2.5,
    consecutiveSteps: 2,
  },
};

// Normal default: edit this block for routine runs.
// One-off runs can still override these values with LEGACY_* env vars.
const ATTACK_STYLE_CONFIG = {
  mode: 'lock', // 'lock' | 'sweep'
  attackerAttackType: 'normal', // 'normal' | 'aimed' | 'cover'
  attackStyleSet: ['normal', 'aimed', 'cover'],
  roundMode: 'floor', // 'floor' | 'round' | 'ceil'
};

// =====================
// POOLS
// =====================
const POOLS = {
  armors: ['SG1 Armor', 'Dark Legion Armor'],
  weapons: [
    'Crystal Maul',
    'Core Staff',
    'Void Axe',
    'Scythe T2',
    // 'Void Sword',
    // "Ritual Dagger IV",
    // "Warlords Katana",
    'Fortified Void Bow',
    'Split Crystal Bombs T2',
    'Rift Gun',
    'Double Barrel Sniper Rifle',
    'Q15 Gun',
    'Bio Gun Mk4',
    // "Gun Blade Mk4",
    'Reaper Axe',
    'Alien Staff',
  ],
  miscs: [
    'Bio Spinal Enhancer',
    'Scout Drones',
    'Droid Drone',
    'Orphic Amulet',
    'Projector Bots',
    'Recon Drones',
    'Nerve Gauntlet',
  ],
};

// =====================
// BASE STATS (server baseline)
// =====================
const BASE = {
  level: SETTINGS.LEVEL,
  hp: SETTINGS.HP_MAX,
  speed: 60,
  armor: 5,
  accuracy: 14,
  dodge: 14,
  gunSkill: 450,
  meleeSkill: 450,
  projSkill: 450,
  defSkill: 450,
  baseDamagePerHit: 0,
};

// =====================
// SMALL HELPERS
// =====================
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function nowMs() {
  return Date.now();
}
function padRight(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function fmtSigned(x) {
  const n = Number(x || 0);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}
function classifyRefineOutcome(deltaWorst, deltaAvg, eps = 0.05) {
  const dw = Number(deltaWorst || 0);
  const da = Number(deltaAvg || 0);
  if (Math.abs(dw) <= eps && Math.abs(da) <= eps) return 'same';
  if (dw > eps && da > eps) return 'better both';
  if (dw > eps && da >= -eps) return 'improved floor';
  if (da > eps && dw >= -eps) return 'improved avg';
  if (dw < -eps && da < -eps) return 'worse both';
  if (dw < -eps && da <= eps) return 'worse floor';
  if (da < -eps && dw <= eps) return 'worse avg';
  return 'tradeoff';
}
function parseCsvList(s) {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
function parsePoolsFromEnv() {
  const a = process.env.LEGACY_ARMORS;
  const w = process.env.LEGACY_WEAPONS;
  const m = process.env.LEGACY_MISCS;

  return {
    armors: a ? parseCsvList(a) : POOLS.armors.slice(),
    weapons: w ? parseCsvList(w) : POOLS.weapons.slice(),
    miscs: m ? parseCsvList(m) : POOLS.miscs.slice(),
  };
}

function detectColorSupport() {
  const override = String(process.env.LEGACY_COLORS || '')
    .trim()
    .toLowerCase();
  if (override === 'always') return true;
  if (override === 'never') return false;
  if (typeof process.stdout?.isTTY === 'boolean' && !process.stdout.isTTY) return false;
  if ('NO_COLOR' in process.env) return false;
  if (String(process.env.TERM || '').toLowerCase() === 'dumb') return false;
  return true;
}

const TERM_UI = {
  colors: detectColorSupport(),
  mode: (() => {
    const raw = String(process.env.LEGACY_OUTPUT || '')
      .trim()
      .toLowerCase();
    if (['pretty', 'compact', 'plain'].includes(raw)) return raw;
    return process.stdout?.isTTY ? 'pretty' : 'plain';
  })(),
  detail: (() => {
    const raw = String(process.env.LEGACY_REPORT || process.env.LEGACY_DETAIL || '')
      .trim()
      .toLowerCase();
    if (['quiet', 'compact', 'verbose'].includes(raw)) return raw;
    const legacyVerbose = String(process.env.LEGACY_VERBOSE || '')
      .trim()
      .toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(legacyVerbose)) return 'verbose';
    return 'compact';
  })(),
  progress: (() => {
    const raw = String(process.env.LEGACY_PROGRESS || '')
      .trim()
      .toLowerCase();
    if (['single', 'checkpoints', 'lines', 'off'].includes(raw)) return raw;
    return process.stdout?.isTTY && String(process.env.TERM || '').toLowerCase() !== 'dumb'
      ? 'single'
      : 'checkpoints';
  })(),
  sanity: (() => {
    const raw = String(process.env.LEGACY_SANITY || '')
      .trim()
      .toLowerCase();
    if (['auto', 'always', 'never'].includes(raw)) return raw;
    return 'auto';
  })(),
};

const REPORT_CFG = {
  finalistsTopN: (() => {
    const n = parseInt(process.env.LEGACY_SHOW_TOP || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  })(),
  refineChangesTopN: (() => {
    const n = parseInt(process.env.LEGACY_SHOW_REFINE_TOP || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 6;
  })(),
  checkpointStepPct: (() => {
    const n = parseInt(process.env.LEGACY_PROGRESS_CHECKPOINT || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  })(),
};

function ansi(code, s) {
  s = String(s);
  return TERM_UI.colors ? `[${code}m${s}[0m` : s;
}

const C = {
  bold: (s) => ansi('1', s),
  dim: (s) => ansi('2', s),
  red: (s) => ansi('31', s),
  green: (s) => ansi('32', s),
  yellow: (s) => ansi('33', s),
  blue: (s) => ansi('34', s),
  magenta: (s) => ansi('35', s),
  cyan: (s) => ansi('36', s),
  gray: (s) => ansi('90', s),
};

function toneText(tone, s) {
  if (tone === 'green') return C.green(s);
  if (tone === 'yellow') return C.yellow(s);
  if (tone === 'red') return C.red(s);
  if (tone === 'magenta') return C.magenta(s);
  if (tone === 'blue') return C.blue(s);
  if (tone === 'dim') return C.dim(s);
  if (tone === 'bold') return C.bold(s);
  return C.cyan(s);
}

function statusTag(label, tone = 'cyan') {
  return toneText(tone, `[${label}]`);
}

function section(title, tone = 'cyan') {
  return `
${toneText(tone, `=== ${title} ===`)}`;
}

function kv(label, value) {
  return `${C.dim(`${label}:`)} ${value}`;
}

function stripAnsi(s) {
  return String(s ?? '').replace(/\[[0-9;]*m/g, '');
}

function padAnsi(s, width, align = 'left') {
  s = String(s ?? '');
  const len = stripAnsi(s).length;
  const pad = Math.max(0, width - len);
  return align === 'right' ? ' '.repeat(pad) + s : s + ' '.repeat(pad);
}

function pctTone(n) {
  if (!Number.isFinite(n)) return 'dim';
  if (n >= 80) return 'green';
  if (n >= 70) return 'cyan';
  if (n >= 60) return 'yellow';
  return 'red';
}

function fmtPct(n, digits = 2) {
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
}

function fmtPctTone(n, digits = 2) {
  return toneText(pctTone(n), fmtPct(n, digits));
}

function fmtDelta(n, digits = 2) {
  if (!Number.isFinite(n)) return C.dim('—');
  const s = `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
  const tone = n > 0.05 ? 'green' : n < -0.05 ? 'red' : 'dim';
  return toneText(tone, s);
}

function progressBar(frac, width = 22) {
  const f = clamp(Number(frac) || 0, 0, 1);
  const filled = Math.round(f * width);
  const raw = `[${'#'.repeat(filled)}${'-'.repeat(Math.max(0, width - filled))}]`;
  if (!TERM_UI.colors) return raw;
  const bar = `${C.green('█'.repeat(filled))}${C.gray('░'.repeat(Math.max(0, width - filled)))}`;
  return `[${bar}]`;
}

function renderTable(headers, rows, aligns = []) {
  const safeRows = rows || [];
  const widths = headers.map((h, i) => {
    let w = stripAnsi(h).length;
    for (const row of safeRows) w = Math.max(w, stripAnsi(row[i] ?? '').length);
    return w;
  });
  const head = headers.map((h, i) => padAnsi(C.bold(h), widths[i], aligns[i] || 'left')).join('  ');
  const sep = widths.map((w) => toneText('dim', '─'.repeat(w))).join('  ');
  const body = safeRows.map((row) =>
    row.map((cell, i) => padAnsi(cell ?? '', widths[i], aligns[i] || 'left')).join('  '),
  );
  return [head, sep, ...body].join('\n');
}

function printTable(headers, rows, aligns = []) {
  if (!rows || !rows.length) return;
  console.log(renderTable(headers, rows, aligns));
}

function uiWantsVerbose() {
  return TERM_UI.detail === 'verbose';
}

function formatDuration(sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s < 0) return '—';
  if (s < 60) return `${s.toFixed(1)}s`;
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = Math.floor(s % 60);
  if (hours > 0) return `${hours}h ${mins}m ${rem}s`;
  return `${mins}m ${rem}s`;
}

function shortenMiddle(text, maxLen = 96) {
  const s = String(text ?? '');
  if (s.length <= maxLen) return s;
  if (maxLen <= 7) return `${s.slice(0, Math.max(1, maxLen - 1))}…`;
  const keep = maxLen - 1;
  const left = Math.ceil(keep * 0.62);
  const right = keep - left;
  return `${s.slice(0, left)}…${s.slice(Math.max(0, s.length - right))}`;
}

function compactBuildLabel(label, maxLen = 88) {
  return shortenMiddle(label, maxLen);
}

let LIVE_LINE_ACTIVE = false;

function clearLiveLine() {
  if (TERM_UI.progress !== 'single' || !process.stdout?.isTTY) return;
  if (typeof process.stdout.clearLine === 'function') {
    process.stdout.clearLine(0);
    if (typeof process.stdout.cursorTo === 'function') process.stdout.cursorTo(0);
  } else {
    process.stdout.write('\r\u001b[2K');
  }
  LIVE_LINE_ACTIVE = false;
}

function writeLiveLine(text) {
  clearLiveLine();
  process.stdout.write(String(text ?? ''));
  LIVE_LINE_ACTIVE = true;
}

function flushLiveLine() {
  if (TERM_UI.progress !== 'single' || !process.stdout?.isTTY) return;
  if (!LIVE_LINE_ACTIVE) return;
  process.stdout.write('\n');
  LIVE_LINE_ACTIVE = false;
}

function buildRunProgressLine({ done, total, elapsedSec, etaSec, floorPct, bestWorst, bestAvg }) {
  const frac = total > 0 ? done / total : 0;
  return `${statusTag('RUN', 'cyan')} ${fmtPct(frac * 100, 1)}  tested=${done}/${total}  elapsed=${formatDuration(
    elapsedSec,
  )}  eta=${etaSec !== null && etaSec !== undefined ? formatDuration(etaSec) : '—'}  floor=${floorPct !== null && floorPct !== undefined ? fmtPct(floorPct) : '—'}  bestWorst=${
    bestWorst !== null && bestWorst !== undefined ? fmtPctTone(bestWorst) : '—'
  }  bestAvg=${bestAvg !== null && bestAvg !== undefined ? fmtPctTone(bestAvg) : '—'}`;
}

function buildFinalizationProgressLine({ phase, done, total, elapsedSec, etaSec, hp, note }) {
  const frac = total > 0 ? done / total : 0;
  const hpTag = hp !== null && hp !== undefined ? `  hp=${hp}` : '';
  const noteText = note ? `  ${note}` : '';
  return `${statusTag('FINAL', 'magenta')} ${progressBar(frac)} ${fmtPct(frac * 100, 1)}  phase=${phase}  done=${done}/${total}  elapsed=${formatDuration(
    elapsedSec,
  )}  eta=${etaSec !== null && etaSec !== undefined ? formatDuration(etaSec) : '—'}${hpTag}${noteText}`;
}

function printCompactRunHeader({
  defenderCount,
  hiddenPreset,
  workers,
  logical,
  physicalGuess,
  rngMode,
  deterministic,
  useSuperset,
  totalGearCandidatesEffective,
  totalGearCandidatesSuperset,
  hpMode,
  allocationMode,
  buckets,
  totalPlans,
  locked,
  gatekeepers,
  trialsGate,
  trialsScreen,
  trialsConfirm,
  screenBailMarginEffective,
  catalogMargin,
  catalogTopN,
  catalogConfirmTrials,
  mixedCrystalRefine,
  mixedCrystalSearchTrials,
  mixedCrystalPasses,
  exportJsonPath,
}) {
  console.log(section(`LEGACY BRUTE FORCE ${VERSION}`, 'cyan'));
  console.log(
    `${kv('run', `defs=${defenderCount} hidden=${hiddenPreset} workers=${workers} (${logical}/${physicalGuess})`)} ${kv('ui', `${TERM_UI.detail}/${TERM_UI.progress} colors=${TERM_UI.colors ? 'ON' : 'OFF'}`)}`,
  );
  console.log(
    `${kv('search', `${useSuperset ? 'SUPERSET' : 'EFFECTIVE'} gear=${useSuperset ? totalGearCandidatesSuperset : totalGearCandidatesEffective} plans=${totalPlans} styles=${ATTACK_STYLE_MODE_LABEL} buckets=${buckets}`)} ${kv('plan', `hpMode=${hpMode} alloc=${allocationMode}`)}`,
  );
  console.log(
    `${kv('trials', `gate=${trialsGate} screen=${trialsScreen} confirm=${trialsConfirm}`)} ${kv('gate', `N=${gatekeepers} bail=${screenBailMarginEffective.toFixed(2)}%`)} ${kv('catalog', `top=${catalogTopN} margin=${catalogMargin.toFixed(1)}% confirm=${catalogConfirmTrials}`)}`,
  );
  console.log(
    `${kv('rng', `${rngMode === 'fast' ? 'fast(sfc32)' : 'Math.random'}/${deterministic ? 'det' : 'live'}`)} ${kv('attack style', ATTACK_STYLE_MODE_LABEL)} ${kv('warm', `HP=${locked.hp} A${locked.extraAcc} D${locked.extraDodge} free=${locked.freePoints}`)} ${kv('refine', `${mixedCrystalRefine ? 'ON' : 'OFF'} ${mixedCrystalSearchTrials}x${mixedCrystalPasses}`)}`,
  );
  if (exportJsonPath) console.log(`${kv('json', exportJsonPath)}`);
  console.log('');
}

function printVerboseRunHeader({
  defenderCount,
  hiddenPreset,
  workers,
  logical,
  physicalGuess,
  rngMode,
  deterministic,
  useSuperset,
  totalGearCandidatesEffective,
  totalGearCandidatesSuperset,
  hpMode,
  allocationMode,
  buckets,
  totalPlans,
  locked,
  gatekeepers,
  trialsGate,
  trialsScreen,
  trialsConfirm,
  screenBailMarginEffective,
  bailMargin,
  catalogMargin,
  alignBailToCatalog,
  catalogTopN,
  catalogConfirmTrials,
  mixedCrystalRefine,
  mixedCrystalSearchTrials,
  mixedCrystalPasses,
  exportJsonPath,
  totalCandidates,
}) {
  console.log(section(`LEGACY BRUTE FORCE ${VERSION}`, 'cyan'));
  console.log(
    `${kv('defenders', defenderCount)} ${kv('hidden', hiddenPreset)} ${kv('ui', `mode=${TERM_UI.mode} detail=${TERM_UI.detail} progress=${TERM_UI.progress} colors=${TERM_UI.colors ? 'ON' : 'OFF'}`)}`,
  );
  console.log(
    `${kv('trials', `gate=${trialsGate} screen=${trialsScreen} confirm=${trialsConfirm}`)} ${kv('workers', `${workers} (logical=${logical}, guess=${physicalGuess})`)}`,
  );
  console.log(
    `${kv('rng', `${rngMode === 'fast' ? 'fast(sfc32)' : 'Math.random'} | deterministic=${deterministic ? 'ON' : 'OFF'}`)} ${kv('baseDmg', `+${BASE.baseDamagePerHit}`)}`,
  );
  console.log(
    `${kv('crystals', `slots=${VARIANT_CFG.crystalSlots} stats=${normalizeCrystalStackMode(VARIANT_CFG.crystalStackStats)}/${VARIANT_CFG.statRound} dmg=${normalizeCrystalStackMode(VARIANT_CFG.crystalStackDmg)}/${VARIANT_CFG.weaponDmgRound} armor=${normalizeCrystalStackMode(VARIANT_CFG.armorStatStack)}/${VARIANT_CFG.armorStatRound}`)}`,
  );
  console.log(
    `${kv('mixed bonus', 'ON')} ${kv('locked amulet', LOCK_ONLY_AMULET.size ? Array.from(LOCK_ONLY_AMULET).join(', ') : '(none)')}`,
  );

  if (useSuperset) {
    console.log(
      `${kv('search mode', 'SUPERSET (compat)')} ${kv('gear candidates', `${totalGearCandidatesSuperset}`)} ${kv('attacker style', ATTACK_STYLE_MODE_LABEL)} ${kv('tested', `${totalCandidates}`)}`,
    );
  } else {
    console.log(
      `${kv('search mode', 'EFFECTIVE (optimized)')} ${kv('gear candidates', `${totalGearCandidatesEffective}`)} ${kv('superset size', `${totalGearCandidatesSuperset}`)} ${kv('attacker style', ATTACK_STYLE_MODE_LABEL)}`,
    );
  }

  console.log(
    `${kv('plan sweep', `hpMode=${hpMode} allocation=${allocationMode} buckets=${buckets} totalPlans=${totalPlans}`)}`,
  );
  console.log(
    `${kv('warm start', `HP=${locked.hp} extraAcc=${locked.extraAcc} extraDodge=${locked.extraDodge} freePoints=${locked.freePoints}`)}`,
  );
  console.log(
    `${kv('gatekeepers', `N=${gatekeepers} gateTrials=${trialsGate} bail=${screenBailMarginEffective.toFixed(2)}% (raw=${bailMargin.toFixed(2)} catalog=${catalogMargin.toFixed(2)} align=${alignBailToCatalog ? 'ON' : 'OFF'})`)}`,
  );
  console.log(
    `${kv('catalog', `topN=${catalogTopN} marginBelowFloor=${catalogMargin.toFixed(1)}% confirmTrials=${catalogConfirmTrials}`)}`,
  );
  console.log(
    `${kv('mixed refine', `${mixedCrystalRefine ? 'ON' : 'OFF'} searchTrials=${mixedCrystalSearchTrials} passes=${mixedCrystalPasses}`)}`,
  );
  if (exportJsonPath) console.log(`${kv('json export', exportJsonPath)}`);
  console.log('');
}

function statsSummaryLine(stats) {
  if (!stats) return '—';
  return `Acc=${stats.acc} Dod=${stats.dodge} Gun=${stats.gun} Prj=${stats.prj} Mel=${stats.mel} Def=${stats.defSk} Arm=${stats.armor} Spd=${stats.speed}`;
}

function outcomeLabelForSource(kind) {
  switch (kind) {
    case 'refined':
      return 'mixed-crystal refine';
    case 'catalog':
      return 'catalog full confirm';
    default:
      return 'kept finalist';
  }
}

function refineNote(entry) {
  if (!entry || !Number.isFinite(entry.baseWorstWin) || !Number.isFinite(entry.baseAvgWin))
    return '';
  const dw = entry.worstWin - entry.baseWorstWin;
  const da = entry.avgWin - entry.baseAvgWin;
  const note = classifyRefineOutcome(dw, da);
  if (note === 'same') return 'checked, no material change';
  return `${note} (ΔMin ${fmtSigned(dw)} / ΔAvg ${fmtSigned(da)})`;
}

function printWinnerCard(title, entry, options = {}) {
  if (!entry) return;
  const stats = entry.stats || {};
  const lines = [
    ['MinWR / AvgWR', `${fmtPctTone(entry.worstWin)} / ${fmtPctTone(entry.avgWin)}`],
    ['Worst Matchup', C.bold(entry.worstName || '—')],
    ['Archetype', entry.type || entry.wpTag || '—'],
  ];
  if (options.source) lines.push(['Source', options.source]);
  if (Number.isFinite(options.hp)) lines.push(['HP', String(options.hp)]);
  lines.push(['Build', entry.label || '—']);
  lines.push(['Stats', statsSummaryLine(stats)]);
  if (stats && (stats.extraAcc != null || stats.extraDodge != null)) {
    lines.push(['Alloc', `A${stats.extraAcc ?? 0} D${stats.extraDodge ?? 0}`]);
  }
  if (options.refine) lines.push(['Refine', options.refine]);

  console.log(`${statusTag('BEST', 'green')} ${C.bold(title)}`);
  for (const [label, value] of lines) {
    const rendered = label === 'Build' ? C.bold(value) : value;
    console.log(`  ${padAnsi(C.dim(label), 13)} ${rendered}`);
  }
  console.log('');
}

function maybeWriteJson(pathLike, payload) {
  if (!pathLike) return;
  try {
    fs.writeFileSync(pathLike, JSON.stringify(payload, null, 2));
    console.log(`${statusTag('SAVE', 'green')} wrote JSON summary -> ${pathLike}`);
  } catch (err) {
    console.warn(
      `${statusTag('SAVE', 'red')} failed to write JSON summary -> ${pathLike}: ${err && err.message ? err.message : err}`,
    );
  }
}

function shortCrystal(c) {
  switch (c) {
    case 'Amulet Crystal':
      return 'A';
    case 'Perfect Pink Crystal':
      return 'P';
    case 'Perfect Orange Crystal':
      return 'O';
    case 'Perfect Green Crystal':
      return 'G';
    case 'Perfect Yellow Crystal':
      return 'Y';
    case 'Perfect Fire Crystal':
      return 'F';
    case 'Abyss Crystal':
      return 'B';
    case 'Cabrusion Crystal':
      return 'C';
    // case "Berserker Crystal":
    //   return "Z";
    default:
      return '?';
  }
}

const CRYSTAL_SORT_ORDER = [
  'Amulet Crystal',
  'Perfect Pink Crystal',
  'Perfect Orange Crystal',
  'Perfect Green Crystal',
  'Perfect Yellow Crystal',
  'Perfect Fire Crystal',
  'Abyss Crystal',
  'Cabrusion Crystal',
  'Berserker Crystal',
];
const CRYSTAL_SORT_RANK = new Map(CRYSTAL_SORT_ORDER.map((name, idx) => [name, idx]));

function crystalSortNames(names) {
  return Array.from(new Set((Array.isArray(names) ? names : []).filter(Boolean))).sort((a, b) => {
    const ra = CRYSTAL_SORT_RANK.has(a) ? CRYSTAL_SORT_RANK.get(a) : 999;
    const rb = CRYSTAL_SORT_RANK.has(b) ? CRYSTAL_SORT_RANK.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b));
  });
}

function partCrystalSpec(part) {
  if (!part) return '';
  if (part.crystalMix) return part.crystalMix;
  if (part.crystalCounts) return part.crystalCounts;
  if (part.crystals) return part.crystals;
  return part.crystal || part.crystalName || '';
}

function normalizeCrystalCounts(crystalSpec, totalSlots = VARIANT_CFG.crystalSlots) {
  if (typeof crystalSpec === 'string') {
    const name = crystalSpec.trim();
    if (!name) throw new Error('Missing crystal spec');
    return { [name]: totalSlots };
  }

  const out = Object.create(null);
  if (Array.isArray(crystalSpec)) {
    for (const raw of crystalSpec) {
      const name = String(raw || '').trim();
      if (!name) continue;
      out[name] = (out[name] || 0) + 1;
    }
  } else if (crystalSpec && typeof crystalSpec === 'object') {
    const src =
      crystalSpec.counts && typeof crystalSpec.counts === 'object'
        ? crystalSpec.counts
        : crystalSpec;
    for (const [k, v] of Object.entries(src)) {
      if (k === 'counts' || k === 'crystal' || k === 'crystalName' || k === 'crystals') continue;
      const n = Math.floor(Number(v));
      if (!Number.isFinite(n) || n <= 0) continue;
      out[k] = (out[k] || 0) + n;
    }
    if (
      !Object.keys(out).length &&
      typeof crystalSpec.crystal === 'string' &&
      crystalSpec.crystal
    ) {
      return normalizeCrystalCounts(crystalSpec.crystal, totalSlots);
    }
    if (!Object.keys(out).length && Array.isArray(crystalSpec.crystals)) {
      return normalizeCrystalCounts(crystalSpec.crystals, totalSlots);
    }
  } else {
    throw new Error('Missing crystal spec');
  }

  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (total !== totalSlots) {
    throw new Error(`Crystal spec must use exactly ${totalSlots} slots (got ${total})`);
  }
  return Object.fromEntries(crystalSortNames(Object.keys(out)).map((name) => [name, out[name]]));
}

function crystalSpecKey(crystalSpec, totalSlots = VARIANT_CFG.crystalSlots) {
  const counts = normalizeCrystalCounts(crystalSpec, totalSlots);
  return crystalSortNames(Object.keys(counts))
    .map((name) => `${name}:${counts[name]}`)
    .join(',');
}

function crystalSpecShort(crystalSpec, totalSlots = VARIANT_CFG.crystalSlots) {
  const counts = normalizeCrystalCounts(crystalSpec, totalSlots);
  return crystalSortNames(Object.keys(counts))
    .map((name) => `${shortCrystal(name)}${counts[name] === 1 ? '' : counts[name]}`)
    .join('+');
}

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function formatAttackStyleShort(attackTypeRaw) {
  return normalizeBruteAttackType(attackTypeRaw);
}

function partKeyForSpec(part) {
  const u1 = part && part.u1 ? part.u1 : '';
  const u2 = part && part.u2 ? part.u2 : '';
  return `${part.item}|${crystalSpecKey(partCrystalSpec(part))}|${u1}|${u2}`;
}

function specKey(spec) {
  const plan = spec.plan || {};
  const miscParts =
    spec.misc1.item === spec.misc2.item
      ? [partKeyForSpec(spec.misc1), partKeyForSpec(spec.misc2)].sort()
      : [partKeyForSpec(spec.misc1), partKeyForSpec(spec.misc2)];
  const parts = [
    partKeyForSpec(spec.armor),
    partKeyForSpec(spec.weapon1),
    partKeyForSpec(spec.weapon2),
    ...miscParts,
  ];
  const attackType = formatAttackStyleShort(spec.attackType);
  return `HP${plan.hp}|A${plan.extraAcc}|D${plan.extraDodge}|S${attackType}|${parts.join('|')}`;
}

function formatWeaponShortFromSpecPart(part) {
  const u1 = shortUpgrade(part.u1 || '');
  const u2 = shortUpgrade(part.u2 || '');
  const u = [u1, u2].filter(Boolean).join('+');
  const mix = crystalSpecShort(partCrystalSpec(part));
  return u ? `${shortItem(part.item)}[${mix}]{${u}}` : `${shortItem(part.item)}[${mix}]`;
}

function buildLabelFromSpec(spec) {
  const plan = spec.plan || {};
  const attackType = formatAttackStyleShort(spec.attackType);
  return (
    `HP${plan.hp} A${plan.extraAcc} D${plan.extraDodge} S${attackType} | ` +
    `${shortItem(spec.armor.item)}[${crystalSpecShort(partCrystalSpec(spec.armor))}] ` +
    `${formatWeaponShortFromSpecPart(spec.weapon1)}+${formatWeaponShortFromSpecPart(spec.weapon2)} ` +
    `${shortItem(spec.misc1.item)}[${crystalSpecShort(partCrystalSpec(spec.misc1))}]+${shortItem(spec.misc2.item)}[${crystalSpecShort(partCrystalSpec(spec.misc2))}]`
  );
}

function buildPartMiscMeta(itemName) {
  const idef = ItemDefs[itemName] || {};
  const fs = idef.flatStats || {};
  return {
    isBio: itemName === 'Bio Spinal Enhancer',
    hasGun: !!(fs.gunSkill || 0),
    hasMel: !!(fs.meleeSkill || 0),
    hasPrj: !!(fs.projSkill || 0),
    hasDef: !!(fs.defSkill || 0),
  };
}

function weaponMaskBitForItem(itemName) {
  const idef = ItemDefs[itemName];
  if (!idef || idef.type !== 'Weapon') return 0;
  const st = String(idef.skillType || 'meleeSkill');
  if (st === 'gunSkill') return 0b001;
  if (st === 'meleeSkill') return 0b010;
  if (st === 'projSkill') return 0b100;
  return 0;
}

function weaponMaskFromSpec(spec) {
  return weaponMaskBitForItem(spec.weapon1.item) | weaponMaskBitForItem(spec.weapon2.item);
}

function allowedCrystalsForSpecPart(spec, partKey) {
  const part = spec[partKey];
  if (!part) return [];
  if (partKey === 'armor') return allowedCrystalsForArmor(part.item);
  if (partKey === 'weapon1' || partKey === 'weapon2') return allowedCrystalsForWeapon(part.item);

  const meta = buildPartMiscMeta(part.item);
  const weaponMask = weaponMaskFromSpec(spec);
  return allowedCrystalsForMiscSuperset(part.item).filter((crystalName) =>
    miscVariantAllowedForWeaponMask({ itemName: part.item, crystalName, __misc: meta }, weaponMask),
  );
}

function enumerateCrystalCountMixes(allowedCrystals, totalSlots = VARIANT_CFG.crystalSlots) {
  const crystals = crystalSortNames(allowedCrystals);
  if (!crystals.length) return [];
  const out = [];
  const counts = new Array(crystals.length).fill(0);

  function rec(idx, remaining) {
    if (idx === crystals.length - 1) {
      counts[idx] = remaining;
      const mix = Object.create(null);
      for (let i = 0; i < crystals.length; i++) {
        if (counts[i] > 0) mix[crystals[i]] = counts[i];
      }
      out.push(mix);
      return;
    }
    for (let n = 0; n <= remaining; n++) {
      counts[idx] = n;
      rec(idx + 1, remaining - n);
    }
  }

  rec(0, totalSlots);
  return out;
}

function shortUpgrade(u) {
  if (!u || u === 'None') return '';
  return u
    .replace('Faster Reload 4', 'FR4')
    .replace('Enhanced Scope 4', 'ES4')
    .replace('Faster Ammo 4', 'FA4')
    .replace('Tracer Rounds 4', 'TR4')
    .replace('Sharpened Blade 1', 'SB1')
    .replace('Faster Reload 1', 'FR1')
    .replace('Magnetic Blade 1', 'MB1')
    .replace('Faster Ammo 1', 'FA1')
    .replace('Magnetic Blade 3', 'MB3')
    .replace('Stronger Guard 3', 'SG3')
    .replace('Sharpened Blade 3', 'SB3')
    .replace('Extra Grip 3', 'EG3')
    .replace('Magnetic Blade 2', 'MB2')
    .replace('Enhanced Poison 2', 'EP2')
    .replace('Sharpened Blade 2', 'SB2')
    .replace('Extra Grip 2', 'EG2')
    .replace('Laser Sight', 'LS')
    .replace('Poisoned Tip', 'PT');
}

function shortItem(name) {
  return name
    .replace('Dark Legion Armor', 'DLArm')
    .replace('SG1 Armor', 'SG1')
    .replace('Hellforged Armor', 'HF')
    .replace('Crystal Maul', 'CM')
    .replace('Core Staff', 'CS')
    .replace('Void Axe', 'VA')
    .replace('Scythe T2', 'Scy')
    .replace('Void Sword', 'VS')
    .replace('Ritual Dagger IV', 'RD4')
    .replace('Warlords Katana', 'WK')
    .replace('Fortified Void Bow', 'FVBow')
    .replace('Split Crystal Bombs T2', 'Bombs')
    .replace('Void Bow', 'VBow')
    .replace('Rift Gun', 'Rift')
    .replace('Double Barrel Sniper Rifle', 'DBSR')
    .replace('Q15 Gun', 'Q15')
    .replace('Bio Gun Mk4', 'Mk4')
    .replace('Gun Blade Mk4', 'GB4')
    .replace('Reaper Axe', 'RA')
    .replace('Alien Staff', 'AS')
    .replace('Bio Spinal Enhancer', 'Bio')
    .replace('Scout Drones', 'Scout')
    .replace('Droid Drone', 'Droid')
    .replace('Orphic Amulet', 'Orphic')
    .replace('Projector Bots', 'ProjBot')
    .replace('Recon Drones', 'Recon')
    .replace('Nerve Gauntlet', 'Nerve');
}

// =====================
// WEAPON ARCHETYPE TAGGING (for reporting)
// =====================
function skillLabel(skillCode) {
  return skillCode === 0 ? 'Gun' : skillCode === 1 ? 'Melee' : 'Proj';
}
function weaponPairTagFromSkills(s1, s2) {
  const a = skillLabel(s1);
  const b = skillLabel(s2);
  return a <= b ? `${a}+${b}` : `${b}+${a}`;
}
function isBetterScore(a, b) {
  if (!b) return true;
  if (a.worstWin !== b.worstWin) return a.worstWin > b.worstWin;
  return a.avgWin > b.avgWin;
}

// =====================
// GLOBAL SHARED FLOOR + FLAGS (Atomics)
// sharedI32[0] = floorPctScaled or -1
// sharedI32[1] = watchHitFlag (0/1)
// =====================
const FLOOR_SCALE = 1_000_000;

function floorLoadPct(sharedI32) {
  if (!sharedI32) return null;
  const v = Atomics.load(sharedI32, 0);
  if (v < 0) return null;
  return v / FLOOR_SCALE;
}
function floorTryRaise(sharedI32, pct) {
  if (!sharedI32) return;
  const next = Math.max(0, Math.min(100, pct));
  const nextI = (next * FLOOR_SCALE) | 0;

  while (true) {
    const cur = Atomics.load(sharedI32, 0);
    if (cur >= nextI) return;
    const prev = Atomics.compareExchange(sharedI32, 0, cur, nextI);
    if (prev === cur) return;
  }
}

// =====================
// RNG
// =====================
function makeRng(mode, seedA, seedB, seedC, seedD) {
  if (mode !== 'fast') return Math.random;

  // sfc32
  let a = seedA >>> 0,
    b = seedB >>> 0,
    c = seedC >>> 0,
    d = seedD >>> 0;
  return function rng() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
}
function mix32(x) {
  x |= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

// =====================
// COMBAT (CALIBRATED ENGINE)
// Mirrors the calibrated main-calib roll semantics:
//   - roll bounds: [stat/4 .. stat] with optional quarter-rounding on the MIN bound
//   - integer mode uses legacy-int sampling over (possibly fractional) bounds
//   - supports >= (GE) comparator
//   - armor factor uses K (default 8): mod=(level*K)/2; factor=mod/(mod+armor)
//   - armor rounding default: ceil
// Notes:
//   - This section is intentionally self-contained and uses the global RNG function that
//     is swapped by the staged deterministic harness.
// =====================
let RNG = Math.random;

// ---------------------
// Env-backed knobs (defaults match our calibrated settings)
// ---------------------
function _envStr(name, def) {
  const v = process.env[name];
  return v === undefined || v === null || v === '' ? def : String(v);
}
function _envNum(name, def) {
  const v = Number(_envStr(name, def));
  return Number.isFinite(v) ? v : Number(def);
}
function _envBool(name, def) {
  const v = _envStr(name, def ? '1' : '0')
    .trim()
    .toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

function normalizeRollMode(m) {
  m = String(m || 'float')
    .trim()
    .toLowerCase();
  if (m === 'int') return 'int';
  if (m === 'float') return 'float';
  if (m === 'int_u' || m === 'int_uniform' || m === 'uniform_int' || m === 'intcf')
    return 'int_uniform';
  if (m === 'int_excl' || m === 'int_exclusive' || m === 'int_exclmax' || m === 'int_x')
    return 'int_excl';
  return 'float';
}
function normalizeQround(m) {
  m = String(m || 'none')
    .trim()
    .toLowerCase();
  if (m === 'none' || m === 'off' || m === '0') return 'none';
  if (m === 'floor') return 'floor';
  if (m === 'ceil' || m === 'ceiling') return 'ceil';
  if (m === 'round') return 'round';
  return 'none';
}
function applyQuarterRound(x, qround) {
  if (qround === 'floor') return Math.floor(x);
  if (qround === 'ceil') return Math.ceil(x);
  if (qround === 'round') return Math.round(x);
  return x;
}

// default: random speed ties (matches legacy-sim-v1.0.4 direction)
const SPEED_TIE_MODE = _envStr('LEGACY_SPEED_TIE_MODE', 'random').trim().toLowerCase();

// calibrated defaults (normalized once up-front for speed)
const HIT_ROLL_MODE = normalizeRollMode(_envStr('LEGACY_HIT_ROLL_MODE', 'int'));
const HIT_GE = _envBool('LEGACY_HIT_GE', true);
const HIT_QROUND = normalizeQround(_envStr('LEGACY_HIT_QROUND', 'round'));

const SKILL_ROLL_MODE = normalizeRollMode(_envStr('LEGACY_SKILL_ROLL_MODE', 'int'));
const SKILL_GE = _envBool('LEGACY_SKILL_GE', true);
const SKILL_QROUND = normalizeQround(_envStr('LEGACY_SKILL_QROUND', 'round'));

const DMG_ROLL = String(_envStr('LEGACY_DMG_ROLL', 'int')).trim().toLowerCase();

const ARMOR_K = _envNum('LEGACY_ARMOR_K', 8);
const ARMOR_APPLY = _envStr('LEGACY_ARMOR_APPLY', 'per_weapon').trim().toLowerCase();
const ARMOR_ROUND = _envStr('LEGACY_ARMOR_ROUND', 'ceil').trim().toLowerCase();

const PROJ_DEF_MULT = _envNum('LEGACY_PROJ_DEF_MULT', 1);

// main-calib compatibility: whether the 2nd weapon is skipped if the 1st weapon kills the target
const ACTION_STOP_ON_KILL = _envBool('LEGACY_ACTION_STOP_ON_KILL', false);
const DIAG_W2_AFTER_APPLIED_W1 = _envStr('LEGACY_DIAG_W2_AFTER_APPLIED_W1', 'auto')
  .trim()
  .toLowerCase();
const DIAG_SPLIT_MULTIWEAPON_ACTION = _envStr('LEGACY_DIAG_SPLIT_MULTIWEAPON_ACTION', 'auto')
  .trim()
  .toLowerCase();
const DIAG_QUEUED_SECOND_ACTION = _envStr('LEGACY_DIAG_QUEUED_SECOND_ACTION', 'auto')
  .trim()
  .toLowerCase();
const DIAG_FIRST_ACTOR_OVERRIDE = _envStr('LEGACY_DIAG_FIRST_ACTOR_OVERRIDE', 'auto')
  .trim()
  .toLowerCase();

// main-calib compatibility: shared hit roll once per action (forces both weapons to use same hit result)
const SHARED_HIT = _envBool('LEGACY_SHARED_HIT', false);

// main-calib compatibility: shared skill roll caching
//   none | same_type | gun_same_type
const SHARED_SKILL_MODE = _envStr('LEGACY_SHARED_SKILL', 'none').trim().toLowerCase();
const SHARED_SKILL_ATTACKER_OVERRIDE = _envStr(
  'LEGACY_SHARED_SKILL_ATTACKER_OVERRIDE',
  'auto',
)
  .trim()
  .toLowerCase();
const SHARED_SKILL_DEFENDER_OVERRIDE = _envStr(
  'LEGACY_SHARED_SKILL_DEFENDER_OVERRIDE',
  'auto',
)
  .trim()
  .toLowerCase();

// tactics/base damage bonus support (matches legacy_simulator.canonical semantics)
//   LEGACY_TACTICS_MODE: none | base | both
//   LEGACY_TACTICS_VAL: numeric (default 5)
//   LEGACY_DMG_BONUS_MODE: per_action | per_weapon | split_equipped
//   LEGACY_DMG_BONUS_STAGE: pre_armor | post_armor
const TACTICS_MODE = _envStr('LEGACY_TACTICS_MODE', 'none').trim().toLowerCase();
const TACTICS_VAL = _envNum('LEGACY_TACTICS_VAL', 5);
const DMG_BONUS_MODE = _envStr('LEGACY_DMG_BONUS_MODE', 'per_action').trim().toLowerCase();
const DMG_BONUS_STAGE = _envStr('LEGACY_DMG_BONUS_STAGE', 'pre_armor').trim().toLowerCase();

const TACTICS_BASE_ENABLED = TACTICS_MODE === 'base' || TACTICS_MODE === 'both';
const TACTICS_BASE_VAL = TACTICS_BASE_ENABLED ? TACTICS_VAL : 0;

// ---------------------
// RNG helpers
// ---------------------
function randFloat(min, max) {
  if (max < min) return min;
  return RNG() * (max - min) + min;
}
function randIntInclusive(min, max) {
  if (max < min) return min;
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return lo;
  return lo + Math.floor(RNG() * (hi - lo + 1));
}

// Legacy-int sampler (inclusive) that matches main-calib behavior even with fractional bounds.
function randLegacyInt(min, max) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  return Math.floor(RNG() * (max - min + 1) + min);
}

function intRange(min, max, mode) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) return { lo, hi: lo };
  if (mode === 'int_excl') return { lo, hi: Math.max(lo, hi - 1) };
  return { lo, hi };
}

// rollMode and qround are expected to be normalized strings (we normalize once at init).
function rollVs(off, def, rollMode, ge, qround) {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;

  let aMin = off / 4;
  const aMax = off;
  let dMin = def / 4;
  const dMax = def;

  if (qround !== 'none') {
    aMin = applyQuarterRound(aMin, qround);
    dMin = applyQuarterRound(dMin, qround);
  }

  let a, b;
  if (rollMode === 'float') {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  } else if (rollMode === 'int') {
    a = randLegacyInt(aMin, aMax);
    b = randLegacyInt(dMin, dMax);
  } else if (rollMode === 'int_uniform') {
    a = randIntInclusive(aMin, aMax);
    b = randIntInclusive(dMin, dMax);
  } else if (rollMode === 'int_excl') {
    const rA = intRange(aMin, aMax, 'int_excl');
    const rB = intRange(dMin, dMax, 'int_excl');
    a = randIntInclusive(rA.lo, rA.hi);
    b = randIntInclusive(rB.lo, rB.hi);
  } else {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  }

  const diff = a - b;
  return ge ? diff >= 0 : diff > 0;
}

// ---------------------
// Combat helpers
// ---------------------
// Weapon skill encoding: 0=gun, 1=melee, 2=proj
function skillValue(att, skillCode) {
  return skillCode === 0 ? att.gun : skillCode === 1 ? att.mel : att.prj;
}
function normalizeSharedSkillOverride(v) {
  return v === 'off' || v === 'broad' || v === 'exact' || v === 'auto' ? v : 'auto';
}
function normalizeDiagW2AfterAppliedW1(v) {
  return v === 'off' || v === 'attacker' || v === 'defender' || v === 'both' || v === 'auto'
    ? v
    : 'auto';
}
function normalizeDiagSplitMultiweaponAction(v) {
  return v === 'off' || v === 'attacker' || v === 'defender' || v === 'both' || v === 'auto'
    ? v
    : 'auto';
}
function normalizeDiagQueuedSecondAction(v) {
  return v === 'off' || v === 'attacker' || v === 'defender' || v === 'both' || v === 'auto'
    ? v
    : 'auto';
}
function normalizeDiagFirstActorOverride(v) {
  return v === 'off' ||
    v === 'attacker' ||
    v === 'defender' ||
    v === 'alternate' ||
    v === 'auto'
    ? v
    : 'auto';
}
function sharedSkillBroadAllowed(mode, skillCode) {
  return mode === 'same_type' || (mode === 'gun_same_type' && skillCode === 0);
}
function sharedSkillOverrideForActor(att) {
  return att && att.name === 'Attacker'
    ? normalizeSharedSkillOverride(SHARED_SKILL_ATTACKER_OVERRIDE)
    : normalizeSharedSkillOverride(SHARED_SKILL_DEFENDER_OVERRIDE);
}
function resolveSharedSkillEligibility(att) {
  const override = sharedSkillOverrideForActor(att);
  if (!att || !att.w1 || !att.w2 || att.w1.skill !== att.w2.skill) {
    return { enabled: false, skillCode: null, override };
  }

  const skillCode = att.w1.skill;
  const broadAllowed = sharedSkillBroadAllowed(SHARED_SKILL_MODE, skillCode);
  if (!broadAllowed || override === 'off') {
    return { enabled: false, skillCode: null, override };
  }
  if (override === 'exact') {
    const w1Name = String((att.w1 && att.w1.name) || '');
    const w2Name = String((att.w2 && att.w2.name) || '');
    const exactAllowed = !!w1Name && w1Name === w2Name;
    return { enabled: exactAllowed, skillCode: exactAllowed ? skillCode : null, override };
  }

  return { enabled: true, skillCode, override };
}
function diagW2AfterAppliedW1EnabledForActor(mode, att) {
  const normalized = normalizeDiagW2AfterAppliedW1(mode);
  if (normalized === 'auto' || normalized === 'off') return false;
  const actorIsAttacker = !!(att && att.name === 'Attacker');
  if (normalized === 'both') return true;
  if (normalized === 'attacker') return actorIsAttacker;
  if (normalized === 'defender') return !actorIsAttacker;
  return false;
}
function diagSplitMultiweaponActionEnabledForActor(mode, att) {
  const normalized = normalizeDiagSplitMultiweaponAction(mode);
  if (normalized === 'auto' || normalized === 'off') return false;
  const actorIsAttacker = !!(att && att.name === 'Attacker');
  if (normalized === 'both') return true;
  if (normalized === 'attacker') return actorIsAttacker;
  if (normalized === 'defender') return !actorIsAttacker;
  return false;
}
function diagQueuedSecondActionEnabledForActor(mode, actor) {
  const normalized = normalizeDiagQueuedSecondAction(mode);
  if (normalized === 'auto' || normalized === 'off') return false;
  const actorIsAttacker = !!(actor && actor.name === 'Attacker');
  if (normalized === 'both') return true;
  if (normalized === 'attacker') return actorIsAttacker;
  if (normalized === 'defender') return !actorIsAttacker;
  return false;
}
function resolveFirstActor(attacker, defender, speedTieMode, diagFirstActorOverride, fightIndex) {
  const override = normalizeDiagFirstActorOverride(diagFirstActorOverride);
  if (override === 'attacker') return true;
  if (override === 'defender') return false;
  if (override === 'alternate') return fightIndex % 2 === 0;
  if (attacker.speed > defender.speed) return true;
  if (attacker.speed < defender.speed) return false;
  return speedTieMode === 'random' ? RNG() < 0.5 : true;
}

function rollDamage(min, max, dmgRollMode) {
  if (dmgRollMode === 'int') return randLegacyInt(min, max);
  return Math.round(randFloat(min, max));
}

function armorFactorForArmorValue(level, armor, armorK) {
  const k = armorK == null ? 8 : armorK;
  const mod = (level * k) / 2;
  return mod / (mod + armor);
}

function applyArmorAndRound(raw, armorFactor, armorRound) {
  const x = raw * armorFactor;
  if (armorRound === 'none') return x;
  if (armorRound === 'floor') return Math.floor(x);
  if (armorRound === 'ceil') return Math.ceil(x);
  return Math.round(x);
}

const _PRE_ACTION = {
  forceHit: null, // boolean|null
  sharedSkillOn: false,
  sharedSkillSkillCode: null,
  sharedSkillCached: false,
  sharedSkillCachedVal: false,
};

// scratch space reused to avoid per-action allocations
const _TW1 = new Float64Array(2); // [val, rawPosFlag]
const _TW2 = new Float64Array(2);

function attemptWeaponFast(att, def, w, pre, out) {
  out[0] = 0;
  out[1] = 0;
  if (!w) return;

  // HIT roll (or forced shared hit)
  let hit;
  if (pre && pre.forceHit !== null && pre.forceHit !== undefined) {
    hit = pre.forceHit;
  } else {
    hit = rollVs(att.acc, def.dodge, HIT_ROLL_MODE, HIT_GE, HIT_QROUND);
  }
  if (!hit) return;

  // SKILL roll (optionally shared/cached)
  const atkSkill = skillValue(att, w.skill);
  let defSkill = def.defSk;
  if (w.skill === 2) defSkill *= PROJ_DEF_MULT;

  let skillOk;
  if (pre && pre.sharedSkillOn && w.skill === pre.sharedSkillSkillCode) {
    if (!pre.sharedSkillCached) {
      pre.sharedSkillCachedVal = rollVs(
        atkSkill,
        defSkill,
        SKILL_ROLL_MODE,
        SKILL_GE,
        SKILL_QROUND,
      );
      pre.sharedSkillCached = true;
    }
    skillOk = pre.sharedSkillCachedVal;
  } else {
    skillOk = rollVs(atkSkill, defSkill, SKILL_ROLL_MODE, SKILL_GE, SKILL_QROUND);
  }
  if (!skillOk) return;

  // DAMAGE roll
  let raw = rollDamage(w.min, w.max, DMG_ROLL);
  if (raw <= 0) return;

  // tactics/base bonus (per-weapon variants)
  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE !== 'per_action') {
    if (DMG_BONUS_MODE === 'per_weapon') {
      raw += TACTICS_BASE_VAL;
    } else if (DMG_BONUS_MODE === 'split_equipped') {
      if (String(w.name).includes('Split Crystal Bombs')) raw += TACTICS_BASE_VAL;
    }
  }

  // ARMOR application
  const val =
    ARMOR_APPLY === 'per_weapon'
      ? applyArmorAndRound(
          raw,
          armorFactorForArmorValue(BASE.level, def.armor, ARMOR_K),
          ARMOR_ROUND,
        )
      : raw;

  out[0] = val > 0 ? val : 0;
  out[1] = 1; // raw>0 (hit+skill succeeded)
}

function doActionFast(att, def, targetHp0) {
  if (targetHp0 <= 0) return 0;

  function preparePreAction() {
    _PRE_ACTION.forceHit = SHARED_HIT
      ? rollVs(att.acc, def.dodge, HIT_ROLL_MODE, HIT_GE, HIT_QROUND)
      : null;

    _PRE_ACTION.sharedSkillOn = false;
    _PRE_ACTION.sharedSkillSkillCode = null;
    _PRE_ACTION.sharedSkillCached = false;
    _PRE_ACTION.sharedSkillCachedVal = false;

    const sharedSkillDecision = resolveSharedSkillEligibility(att);
    if (sharedSkillDecision.enabled) {
      _PRE_ACTION.sharedSkillOn = true;
      _PRE_ACTION.sharedSkillSkillCode = sharedSkillDecision.skillCode;
    }
  }

  const splitMultiweaponActionEnabled =
    targetHp0 > 0 &&
    ARMOR_APPLY === 'per_weapon' &&
    TACTICS_BASE_VAL === 0 &&
    !!att &&
    !!att.w1 &&
    !!att.w2 &&
    diagSplitMultiweaponActionEnabledForActor(DIAG_SPLIT_MULTIWEAPON_ACTION, att);

  preparePreAction();

  // weapon 1
  attemptWeaponFast(att, def, att.w1, _PRE_ACTION, _TW1);

  let skipW2 = false;
  if (splitMultiweaponActionEnabled) {
    const postW1Hp = Math.max(0, targetHp0 - Math.min(_TW1[0], targetHp0));
    if (postW1Hp <= 0) {
      skipW2 = true;
    } else {
      preparePreAction();
    }
  } else {
    const diagW2AfterAppliedW1Enabled =
      targetHp0 > 0 &&
      ARMOR_APPLY === 'per_weapon' &&
      TACTICS_BASE_VAL === 0 &&
      diagW2AfterAppliedW1EnabledForActor(DIAG_W2_AFTER_APPLIED_W1, att);
    const w1AppliedPreW2Gate =
      diagW2AfterAppliedW1Enabled && _TW1[0] > 0 ? Math.min(_TW1[0], targetHp0) : 0;

    // optional "stop on kill" optimization must match legacy_simulator.canonical:
    // only valid for ARMOR_APPLY=per_weapon AND baseVal==0 (tactics disabled),
    // otherwise rolling weapon2 changes RNG consumption and/or damage semantics.
    if (
      ACTION_STOP_ON_KILL &&
      targetHp0 > 0 &&
      ARMOR_APPLY === 'per_weapon' &&
      TACTICS_BASE_VAL === 0 &&
      _TW1[0] >= targetHp0
    ) {
      skipW2 = true;
    } else if (diagW2AfterAppliedW1Enabled && w1AppliedPreW2Gate >= targetHp0) {
      skipW2 = true;
    }
  }

  if (!skipW2) attemptWeaponFast(att, def, att.w2, _PRE_ACTION, _TW2);
  else {
    _TW2[0] = 0;
    _TW2[1] = 0;
  }

  // combine damage
  if (ARMOR_APPLY === 'per_weapon') {
    let actionDmg = _TW1[0] + _TW2[0];

    // per-action tactics bonus (post-weapon, pre-cap)
    if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action') {
      const any = _TW1[1] > 0 || _TW2[1] > 0;
      if (any) actionDmg += TACTICS_BASE_VAL;
    }

    return actionDmg >= targetHp0 ? targetHp0 : actionDmg;
  }

  // sum mode: armor applied at action level
  let sumRaw = _TW1[0] + _TW2[0];
  if (sumRaw <= 0) return 0;

  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action' && DMG_BONUS_STAGE === 'pre_armor') {
    sumRaw += TACTICS_BASE_VAL;
  }

  let actionDmg = applyArmorAndRound(sumRaw, def.armorFactor, ARMOR_ROUND);

  if (TACTICS_BASE_VAL > 0 && DMG_BONUS_MODE === 'per_action' && DMG_BONUS_STAGE === 'post_armor') {
    // match canonical: only add if there was any raw damage pre-armor
    if (_TW1[0] + _TW2[0] > 0) actionDmg += TACTICS_BASE_VAL;
  }

  return actionDmg >= targetHp0 ? targetHp0 : actionDmg;
}

function fightOnceCalibFast(p1, p2, MAX_TURNS, fightIndex = 0) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  const p1First = resolveFirstActor(
    p1,
    p2,
    SPEED_TIE_MODE,
    DIAG_FIRST_ACTOR_OVERRIDE,
    fightIndex,
  );

  const first = p1First ? p1 : p2;
  const second = p1First ? p2 : p1;

  let turns = 0;

  while (p1hp > 0 && p2hp > 0 && turns < MAX_TURNS) {
    turns++;
    const p1hp0 = p1hp;
    const p2hp0 = p2hp;

    // first acts
    if (second === p1) p1hp -= doActionFast(first, second, p1hp);
    else p2hp -= doActionFast(first, second, p2hp);

    const secondKilled = second === p1 ? p1hp <= 0 : p2hp <= 0;
    const firstAlive = first === p1 ? p1hp > 0 : p2hp > 0;
    const queuedSecondActionEnabled =
      secondKilled &&
      firstAlive &&
      diagQueuedSecondActionEnabledForActor(DIAG_QUEUED_SECOND_ACTION, second);

    if (secondKilled && !queuedSecondActionEnabled) break;

    // second acts
    if (first === p1)
      p1hp -= doActionFast(second, first, queuedSecondActionEnabled ? p1hp0 : p1hp);
    else p2hp -= doActionFast(second, first, queuedSecondActionEnabled ? p2hp0 : p2hp);
  }

  let winnerIsP1;
  if (p1hp > 0 && p2hp <= 0) winnerIsP1 = 1;
  else if (p2hp > 0 && p1hp <= 0) winnerIsP1 = 0;
  else if (p1hp > 0 && p2hp > 0) {
    if (p1hp === p2hp) winnerIsP1 = p1First ? 1 : 0;
    else winnerIsP1 = p1hp > p2hp ? 1 : 0;
  } else {
    winnerIsP1 = p1First ? 1 : 0;
  }

  return (winnerIsP1 << 16) | (turns & 0xffff);
}

function runMatchPacked(p1, p2, trials, MAX_TURNS) {
  let wins = 0;
  let exSum = 0;
  for (let i = 0; i < trials; i++) {
    const packed = fightOnceCalibFast(p1, p2, MAX_TURNS, i);
    wins += (packed >>> 16) & 1;
    exSum += packed & 0xffff;
  }
  return [wins, exSum];
}

// =====================
// MIXED WEAPON BONUS HELPERS
// =====================
// If both weapons exist and skill types differ => [2,2] else [1,1]
// If both weapons exist and skill types differ => [2,2] else [1,1]
function mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx) {
  if (w1SkillIdx === null || w2SkillIdx === null) return [1, 1];
  return w1SkillIdx === w2SkillIdx ? [1, 1] : [2, 2];
}

// =====================
// CRYSTALS + UPGRADES + ITEMS
// =====================
let CrystalDefs = null;
let UpgradeDefs = null;
let ItemDefs = null;

function loadSharedDefs() {
  const errors = [];
  for (const defsPath of ['./legacy-defs.js', './legacy-defs-v1.0.0.js']) {
    try {
      const defs = require(defsPath);
      const extCrystal = defs && (defs.CrystalDefs || defs.crystalDefs);
      const extUpgrade = defs && (defs.UpgradeDefs || defs.upgradeDefs);
      const extItem = defs && (defs.ItemDefs || defs.itemDefs);
      if (!extCrystal || typeof extCrystal !== 'object') {
        throw new Error('missing CrystalDefs export');
      }
      if (!extUpgrade || typeof extUpgrade !== 'object') {
        throw new Error('missing UpgradeDefs export');
      }
      if (!extItem || typeof extItem !== 'object') {
        throw new Error('missing ItemDefs export');
      }
      CrystalDefs = extCrystal;
      UpgradeDefs = extUpgrade;
      ItemDefs = extItem;
      return defsPath;
    } catch (err) {
      errors.push(`${defsPath}: ${err && err.message ? err.message : err}`);
    }
  }

  throw new Error(`Unable to load shared defs file. Tried: ${errors.join(' | ')}`);
}

const LOADED_DEFS_PATH = loadSharedDefs();

// =====================
// DEFENDER PAYLOADS
// =====================
let DEFENDER_PAYLOADS;
(function loadDefenderPayloads() {
  const path = require('path');

  // Allow explicit override (relative or absolute):
  //   LEGACY_DEFENDERS_FILE=./legacy_defenders.js
  const override = String(process.env.LEGACY_DEFENDERS_FILE || '').trim();
  const candidates = override
    ? [override]
    : [
        './legacy-defenders-v1.0.0.js',
        './legacy-defenders-latest.js',
        // Fallbacks for older repos / alternate filenames:
        './legacy_defenders.js',
        './legacy-defenders.js',
      ];

  for (const p of candidates) {
    try {
      const mod = require(path.resolve(__dirname, p));
      // Support either `module.exports = payloads` or `{ DEFENDER_PAYLOADS }`
      DEFENDER_PAYLOADS = (mod && mod.DEFENDER_PAYLOADS) || mod;
      if (DEFENDER_PAYLOADS && typeof DEFENDER_PAYLOADS === 'object') return;
    } catch (_) {
      // keep trying
    }
  }
  throw new Error(
    `Could not load defender payloads. Tried: ${candidates
      .map((s) => JSON.stringify(s))
      .join(', ')} (set LEGACY_DEFENDERS_FILE to override)`,
  );
})();

// Defender-name aliases (backwards compat).
// We canonicalize names for selection so aliases don't inflate defender count
// (e.g. "SG1 Split bombs" vs "SG1 Split Bombs T2").
const DEFENDER_ALIAS_TO_CANON = new Map([
  ['SG1 Split Bombs T2', 'SG1 Split Bombs T2'],
  ['Dual Bow Build', 'Dual Bow Build 1'],
  ['Bow/rift build', 'Rift Bow Build 1'],
]);

function resolveDefenderKey(raw) {
  const name = String(raw || '').trim();
  if (!name) return null;

  // Prefer canonical name when the input is a known alias *and* the canonical exists.
  const canon = DEFENDER_ALIAS_TO_CANON.get(name);
  if (canon && DEFENDER_PAYLOADS && DEFENDER_PAYLOADS[canon]) return canon;

  // Otherwise accept the exact key if present.
  if (DEFENDER_PAYLOADS && DEFENDER_PAYLOADS[name]) return name;

  // Inverse lookup: if someone passes the canonical name but the file only has an alias.
  if (DEFENDER_PAYLOADS) {
    for (const [alias, c] of DEFENDER_ALIAS_TO_CANON.entries()) {
      if (c === name && DEFENDER_PAYLOADS[alias]) return alias;
    }
  }

  return null;
}

function isAliasKey(k) {
  const canon = DEFENDER_ALIAS_TO_CANON.get(k);
  return !!(canon && canon !== k && DEFENDER_PAYLOADS && DEFENDER_PAYLOADS[canon]);
}

function getOrderedDefenderKeys() {
  const seen = new Set();
  const out = [];

  for (const raw of Object.keys(DEFENDER_PAYLOADS)) {
    if (isAliasKey(raw)) continue;
    const key = resolveDefenderKey(raw) || raw;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

function priorityFirstAll(mode) {
  const ordered = getOrderedDefenderKeys();
  if (mode === 'priority') return ordered.slice();
  return ordered.slice();
}

function DEFENDER_NAMES() {
  const raw = String(process.env.LEGACY_DEFENDERS || '').trim();
  const mode = raw.toLowerCase();

  if (!raw || mode === 'all') return priorityFirstAll('all');
  if (mode === 'priority') return priorityFirstAll('priority');

  const items = parseCsvList(raw);
  const out = [];
  const seen = new Set();

  for (const it of items) {
    const key = resolveDefenderKey(it);
    if (!key) {
      console.warn(`WARN: defender "${it}" not found; skipping`);
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

const defenderBuilds = [];
for (const rawName of DEFENDER_NAMES()) {
  const key = resolveDefenderKey(rawName) || rawName;
  const payload = DEFENDER_PAYLOADS[key];
  if (!payload) {
    console.warn(`WARN: defender "${rawName}" resolved to "${key}" but payload missing; skipping`);
    continue;
  }
  defenderBuilds.push({ name: key, payload });
}

if (!defenderBuilds.length) {
  throw new Error('No defenders selected. Check LEGACY_DEFENDERS or your defenders file.');
}
// =====================
// LOCK_ONLY_AMULET (weapons-only)
// =====================
function parseLockOnlyAmuletFromEnv() {
  const raw = String(process.env.LEGACY_LOCK_ONLY_AMULET || '').trim();
  if (!raw) return new Set(['Core Staff', 'Rift Gun', 'Split Crystal Bombs T2', 'Void Axe']);
  return new Set(parseCsvList(raw));
}
const LOCK_ONLY_AMULET = parseLockOnlyAmuletFromEnv();

function parseForcedWeaponPairFromEnv() {
  const raw = String(process.env.LEGACY_FORCE_WEAPON_PAIR || '').trim();
  if (!raw) return null;
  const names = parseCsvList(raw);
  if (names.length !== 2) {
    throw new Error(
      `LEGACY_FORCE_WEAPON_PAIR must be a CSV list of exactly 2 weapon item names; got ${names.length}`,
    );
  }
  return names;
}
const FORCED_WEAPON_PAIR = parseForcedWeaponPairFromEnv();

function parseForcedMiscIncludeFromEnv() {
  const raw = String(process.env.LEGACY_FORCE_MISC_INCLUDE || '').trim();
  if (!raw) return null;

  const names = String(process.env.LEGACY_FORCE_MISC_INCLUDE || '')
    .split(',')
    .map((x) => x.trim());
  if (!names.length || names.some((name) => !name)) {
    throw new Error(
      'LEGACY_FORCE_MISC_INCLUDE must be a CSV list of misc item names with no empty entries',
    );
  }

  for (const name of names) {
    const idef = ItemDefs[name];
    if (!idef) {
      throw new Error(`LEGACY_FORCE_MISC_INCLUDE contains unknown item "${name}"`);
    }
    if (idef.type !== 'Misc') {
      throw new Error(`LEGACY_FORCE_MISC_INCLUDE item "${name}" is not a Misc item`);
    }
  }

  return new Set(names);
}
const FORCED_MISC_INCLUDE = parseForcedMiscIncludeFromEnv();

// =====================
// CRYSTAL CONSTRAINTS
// =====================
function allowedCrystalsForArmor(itemName) {
  if (itemName === 'Dark Legion Armor') return ['Abyss Crystal'];
  if (itemName === 'SG1 Armor') return ['Perfect Pink Crystal', 'Abyss Crystal'];
  if (itemName === 'Hellforged Armor') return ['Cabrusion Crystal', 'Abyss Crystal'];
  return ['Abyss Crystal'];
}
function allowedCrystalsForWeapon(itemName) {
  if (LOCK_ONLY_AMULET.has(itemName)) return ['Amulet Crystal'];
  return ['Amulet Crystal', 'Perfect Fire Crystal'];
}
function upgradeSlotsForWeapon(itemName) {
  const idef = ItemDefs[itemName];
  const slots = (idef && idef.upgradeSlots) || null;
  return Array.isArray(slots) ? slots : null;
}
function allowedCrystalsForMiscSuperset(itemName) {
  const idef = ItemDefs[itemName];
  const flat = (idef && idef.flatStats) || {};

  const isBio = itemName === 'Bio Spinal Enhancer';
  const hasDef = (flat.defSkill || 0) > 0;
  const hasGun = (flat.gunSkill || 0) > 0;
  const hasMel = (flat.meleeSkill || 0) > 0;
  const hasPrj = (flat.projSkill || 0) > 0;

  const out = [];

  if (!isBio) {
    const amuletRelevant = (flat.accuracy || 0) > 0 || hasGun || hasMel || hasPrj || hasDef;
    if (amuletRelevant) out.push('Amulet Crystal');
  }

  if (hasDef) out.push('Perfect Pink Crystal');
  if (hasGun) out.push('Perfect Green Crystal');
  if (hasMel) out.push('Perfect Orange Crystal');
  if (hasPrj) out.push('Perfect Yellow Crystal');

  if (isBio) return out.filter((c) => c !== 'Amulet Crystal');
  return Array.from(new Set(out));
}
function miscVariantAllowedForWeaponMask(mv, weaponMask) {
  const isBio = mv.itemName === 'Bio Spinal Enhancer';

  if (mv.crystalName === 'Amulet Crystal') return !isBio;

  if (mv.crystalName === 'Perfect Pink Crystal') return !!mv.__misc && !!mv.__misc.hasDef;

  if (mv.crystalName === 'Perfect Green Crystal') {
    if (isBio) return (weaponMask & 0b001) !== 0;
    return !!mv.__misc && !!mv.__misc.hasGun && (weaponMask & 0b001) !== 0;
  }
  if (mv.crystalName === 'Perfect Orange Crystal') {
    if (isBio) return (weaponMask & 0b010) !== 0;
    return !!mv.__misc && !!mv.__misc.hasMel && (weaponMask & 0b010) !== 0;
  }
  if (mv.crystalName === 'Perfect Yellow Crystal') {
    if (isBio) return (weaponMask & 0b100) !== 0;
    return !!mv.__misc && !!mv.__misc.hasPrj && (weaponMask & 0b100) !== 0;
  }

  return false;
}

// =====================
// WARM-START SEED BUILD
// =====================
const WARM_START_BUILD = {
  armor: { item: 'Dark Legion Armor', crystal: 'Abyss Crystal' },
  weapon1: { item: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
  weapon2: { item: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
  misc1: { item: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
  misc2: { item: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
};

function warmStartEnabled() {
  const raw = String(process.env.LEGACY_WARM_START ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no');
}
function parseWarmStartTrials(defaultTrialsConfirm) {
  const raw = String(process.env.LEGACY_WARM_START_TRIALS ?? '').trim();
  if (!raw) return defaultTrialsConfirm;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultTrialsConfirm;
}

// =====================
// WATCH BUILD
// =====================
const WATCH_BUILD = {
  armor: { item: 'Dark Legion Armor', crystal: 'Abyss Crystal' },
  weapon1: { item: 'Core Staff', crystal: 'Amulet Crystal' },
  weapon2: { item: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal' },
  misc1: { item: 'Scout Drones', crystal: 'Amulet Crystal' },
  misc2: { item: 'Scout Drones', crystal: 'Amulet Crystal' },
};

function checkWatchBuildReachable(pools) {
  const reasons = [];
  function inPool(kind, item) {
    const arr = kind === 'armor' ? pools.armors : kind === 'weapon' ? pools.weapons : pools.miscs;
    return arr.includes(item);
  }

  if (!inPool('armor', WATCH_BUILD.armor.item))
    reasons.push(`Armor "${WATCH_BUILD.armor.item}" is not in pool`);
  if (!inPool('weapon', WATCH_BUILD.weapon1.item))
    reasons.push(`Weapon "${WATCH_BUILD.weapon1.item}" is not in pool`);
  if (!inPool('weapon', WATCH_BUILD.weapon2.item))
    reasons.push(`Weapon "${WATCH_BUILD.weapon2.item}" is not in pool`);
  if (!inPool('misc', WATCH_BUILD.misc1.item))
    reasons.push(`Misc "${WATCH_BUILD.misc1.item}" is not in pool`);
  if (!inPool('misc', WATCH_BUILD.misc2.item))
    reasons.push(`Misc "${WATCH_BUILD.misc2.item}" is not in pool`);

  const aOk = allowedCrystalsForArmor(WATCH_BUILD.armor.item).includes(WATCH_BUILD.armor.crystal);
  if (!aOk)
    reasons.push(
      `Armor "${WATCH_BUILD.armor.item}" does not allow crystal "${WATCH_BUILD.armor.crystal}"`,
    );

  const w1Ok = allowedCrystalsForWeapon(WATCH_BUILD.weapon1.item).includes(
    WATCH_BUILD.weapon1.crystal,
  );
  if (!w1Ok)
    reasons.push(
      `Weapon "${WATCH_BUILD.weapon1.item}" does not allow crystal "${WATCH_BUILD.weapon1.crystal}"`,
    );

  const w2Ok = allowedCrystalsForWeapon(WATCH_BUILD.weapon2.item).includes(
    WATCH_BUILD.weapon2.crystal,
  );
  if (!w2Ok)
    reasons.push(
      `Weapon "${WATCH_BUILD.weapon2.item}" does not allow crystal "${WATCH_BUILD.weapon2.crystal}"`,
    );

  const m1Ok = allowedCrystalsForMiscSuperset(WATCH_BUILD.misc1.item).includes(
    WATCH_BUILD.misc1.crystal,
  );
  if (!m1Ok)
    reasons.push(
      `Misc "${WATCH_BUILD.misc1.item}" does not allow crystal "${WATCH_BUILD.misc1.crystal}"`,
    );

  const m2Ok = allowedCrystalsForMiscSuperset(WATCH_BUILD.misc2.item).includes(
    WATCH_BUILD.misc2.crystal,
  );
  if (!m2Ok)
    reasons.push(
      `Misc "${WATCH_BUILD.misc2.item}" does not allow crystal "${WATCH_BUILD.misc2.crystal}"`,
    );

  return { reachable: reasons.length === 0, reasons };
}

function isWatchBuildCandidate(av, w1v, w2v, m1v, m2v) {
  if (av.itemName !== WATCH_BUILD.armor.item || av.crystalName !== WATCH_BUILD.armor.crystal)
    return false;

  const wA = `${w1v.itemName}|${w1v.crystalName}`;
  const wB = `${w2v.itemName}|${w2v.crystalName}`;
  const wantW1 = `${WATCH_BUILD.weapon1.item}|${WATCH_BUILD.weapon1.crystal}`;
  const wantW2 = `${WATCH_BUILD.weapon2.item}|${WATCH_BUILD.weapon2.crystal}`;
  const weaponsOk = (wA === wantW1 && wB === wantW2) || (wA === wantW2 && wB === wantW1);
  if (!weaponsOk) return false;

  const mA = `${m1v.itemName}|${m1v.crystalName}`;
  const mB = `${m2v.itemName}|${m2v.crystalName}`;
  const wantM = `${WATCH_BUILD.misc1.item}|${WATCH_BUILD.misc1.crystal}`;
  return mA === wantM && mB === wantM;
}

// =====================
// VARIANT COMPUTE (numbers only) + UPGRADES
// =====================
//
// This section is intentionally kept in lock-step with legacy-sim-latest.js for:
//   - crystal stacking modes (sum4 vs iter4)
//   - rounding behavior (ceil/floor/round)
//   - default calibration overrides (HF armor base, Void Sword max)

function _envStr(name, dflt) {
  const v = process.env[name];
  return v === undefined || v === null || String(v).trim() === '' ? dflt : String(v).trim();
}
function _envInt(name, dflt) {
  const v = parseInt(_envStr(name, ''), 10);
  return Number.isFinite(v) ? v : dflt;
}

// ---- default calibration overrides (match legacy-sim-latest defaults) ----
(function applyCalibOverrides() {
  const hfRaw = _envStr('LEGACY_HF_ARMOR_BASE_OVERRIDE', '125');
  if (hfRaw.toLowerCase() !== 'off') {
    const hf = parseInt(hfRaw, 10);
    if (
      Number.isFinite(hf) &&
      hf > 0 &&
      ItemDefs['Hellforged Armor'] &&
      ItemDefs['Hellforged Armor'].flatStats
    ) {
      ItemDefs['Hellforged Armor'].flatStats.armor = hf;
    }
  }

  const vsMinRaw = _envStr('LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE', '');
  const vsMaxRaw = _envStr('LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE', '120');
  if (ItemDefs['Void Sword'] && ItemDefs['Void Sword'].baseWeaponDamage) {
    if (vsMinRaw.toLowerCase() !== 'off') {
      const mn = parseInt(vsMinRaw, 10);
      if (Number.isFinite(mn) && mn > 0) {
        ItemDefs['Void Sword'].baseWeaponDamage.min = mn;
      }
    }
    if (vsMaxRaw.toLowerCase() !== 'off') {
      const mx = parseInt(vsMaxRaw, 10);
      if (Number.isFinite(mx) && mx > 0) {
        ItemDefs['Void Sword'].baseWeaponDamage.max = mx;
      }
    }
    if (ItemDefs['Void Sword'].baseWeaponDamage.min > ItemDefs['Void Sword'].baseWeaponDamage.max) {
      const t = ItemDefs['Void Sword'].baseWeaponDamage.min;
      ItemDefs['Void Sword'].baseWeaponDamage.min = ItemDefs['Void Sword'].baseWeaponDamage.max;
      ItemDefs['Void Sword'].baseWeaponDamage.max = t;
    }
  }
})();

const VARIANT_CFG = (() => {
  const statRound = _envStr('LEGACY_STAT_ROUND', 'ceil').toLowerCase();
  const weaponDmgRound = _envStr('LEGACY_WEAPON_DMG_ROUND', 'ceil').toLowerCase();
  const crystalStackModeDefault = _envStr('LEGACY_CRYSTAL_STACK_MODE', '').toLowerCase();
  const crystalStackStats = _envStr(
    'LEGACY_CRYSTAL_STACK_STATS',
    crystalStackModeDefault || 'iter4',
  ).toLowerCase();
  const crystalStackDmg = _envStr(
    'LEGACY_CRYSTAL_STACK_DMG',
    crystalStackModeDefault || 'sum4',
  ).toLowerCase();
  const crystalSlots = _envInt('LEGACY_CRYSTAL_SLOTS', 4);

  // Armor-stat stacking appears to differ from normal stat stacking in-game; default it to sum4.
  const armorStatStackRaw = _envStr('LEGACY_ARMORSTAT_STACK', 'inherit').toLowerCase();
  const armorStatRoundRaw = _envStr('LEGACY_ARMORSTAT_ROUND', 'inherit').toLowerCase();
  const armorStatSlotsRaw = _envStr('LEGACY_ARMORSTAT_SLOTS', 'inherit').toLowerCase();

  const armorStatStack = armorStatStackRaw === 'inherit' ? 'sum4' : armorStatStackRaw;
  const armorStatRound = armorStatRoundRaw === 'inherit' ? statRound : armorStatRoundRaw;
  const armorStatSlots =
    armorStatSlotsRaw === 'inherit'
      ? crystalSlots
      : parseInt(armorStatSlotsRaw, 10) || crystalSlots;

  return {
    statRound,
    weaponDmgRound,
    crystalStackStats,
    crystalStackDmg,
    crystalSlots,
    armorStatStack,
    armorStatRound,
    armorStatSlots,
  };
})();

const ATTACK_STYLE_ROUND_MODE = (() => {
  const raw = _envStr('LEGACY_ATTACK_STYLE_ROUND', ATTACK_STYLE_CONFIG.roundMode)
    .trim()
    .toLowerCase();
  return raw === 'round' || raw === 'ceil' ? raw : 'floor';
})();
const ATTACK_STYLE_MODE = (() => {
  const raw = _envStr('LEGACY_ATTACK_STYLE_MODE', ATTACK_STYLE_CONFIG.mode).trim().toLowerCase();
  return raw === 'sweep' ? 'sweep' : 'lock';
})();
const ATTACKER_ATTACK_TYPE = normalizeBruteAttackType(
  _envStr('LEGACY_ATTACKER_ATTACK_TYPE', ATTACK_STYLE_CONFIG.attackerAttackType),
);
const ATTACK_STYLE_SET = parseAttackStyleSet(
  _envStr('LEGACY_ATTACK_STYLE_SET', ATTACK_STYLE_CONFIG.attackStyleSet.join(',')),
);
const ACTIVE_ATTACKER_ATTACK_TYPES =
  ATTACK_STYLE_MODE === 'sweep' ? ATTACK_STYLE_SET.slice() : [ATTACKER_ATTACK_TYPE];
const ATTACK_STYLE_SWEEP_COUNT = ACTIVE_ATTACKER_ATTACK_TYPES.length;
const ATTACK_STYLE_MODE_LABEL =
  ATTACK_STYLE_MODE === 'sweep'
    ? `sweep(${ACTIVE_ATTACKER_ATTACK_TYPES.join(',')})`
    : `lock(${ATTACKER_ATTACK_TYPE})`;
const DEFENDER_ATTACK_TYPE_ENV_IGNORED = _envStr('LEGACY_DEFENDER_ATTACK_TYPE', '').trim();
const DEFENDER_ATTACK_TYPE = 'normal';

const MISC_NO_CRYSTAL_SKILL = new Set(
  _envStr('LEGACY_MISC_NO_CRYSTAL_SKILL', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
function parseSkillTypeMultipliers(str) {
  const out = new Map();
  const raw0 = String(str || '')
    .trim()
    .toLowerCase();
  if (!raw0 || raw0 === 'none') return out;

  for (const tok0 of raw0.split(',')) {
    const tok = tok0.trim();
    if (!tok) continue;

    const parts = tok.split(/[:=]/);
    const key = (parts[0] || '').trim();
    if (!key) continue;

    if (key !== 'gun' && key !== 'melee' && key !== 'proj' && key !== 'def') {
      throw new Error(
        `Unknown skill type in LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES: "${key}" (allowed: gun, melee, proj, def)`,
      );
    }

    let mult = 0;
    if (parts.length > 1 && (parts[1] || '').trim() !== '') {
      const n = Number((parts[1] || '').trim());
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(
          `Bad multiplier for "${key}" in LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES: "${parts[1]}" (expected number >= 0)`,
        );
      }
      mult = n;
    }
    out.set(key, mult);
  }
  return out;
}
const MISC_NO_CRYSTAL_SKILL_TYPES_RAW = _envStr(
  'LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES',
  'gun,melee,proj',
);
const MISC_NO_CRYSTAL_SKILL_TYPE_MULTS = parseSkillTypeMultipliers(MISC_NO_CRYSTAL_SKILL_TYPES_RAW);
const MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES_RAW = _envStr(
  'LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES',
  '',
);
const MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS = parseSkillTypeMultipliers(
  MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES_RAW,
);
const MISC_NO_CRYSTAL_SKILL_ZERO_DEF = _envBool('LEGACY_MISC_NO_CRYSTAL_SKILL_ZERO_DEF', false);
if (MISC_NO_CRYSTAL_SKILL_ZERO_DEF) MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.set('def', 0);

function getEffectiveCrystalPct(itemName, crystalName, slotTag = 0) {
  const cdef = CrystalDefs[crystalName];
  if (!cdef) throw new Error(`Unknown crystal "${crystalName}"`);

  const crystalPctRaw = cdef.pct || {};
  const idef = ItemDefs[itemName];
  if (!idef || idef.type !== 'Misc' || !MISC_NO_CRYSTAL_SKILL.has(itemName)) {
    return crystalPctRaw;
  }

  const crystalPct = { ...crystalPctRaw };

  if (MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.size) {
    const mg = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('gun');
    if (mg !== undefined) crystalPct.gunSkill = (crystalPct.gunSkill || 0) * mg;

    const mm = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('melee');
    if (mm !== undefined) crystalPct.meleeSkill = (crystalPct.meleeSkill || 0) * mm;

    const mp = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('proj');
    if (mp !== undefined) crystalPct.projSkill = (crystalPct.projSkill || 0) * mp;

    const md = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('def');
    if (md !== undefined) crystalPct.defSkill = (crystalPct.defSkill || 0) * md;
  }

  if (slotTag === 2 && MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.size) {
    const mg2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('gun');
    if (mg2 !== undefined) crystalPct.gunSkill = (crystalPct.gunSkill || 0) * mg2;

    const mm2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('melee');
    if (mm2 !== undefined) crystalPct.meleeSkill = (crystalPct.meleeSkill || 0) * mm2;

    const mp2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('proj');
    if (mp2 !== undefined) crystalPct.projSkill = (crystalPct.projSkill || 0) * mp2;

    const md2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('def');
    if (md2 !== undefined) crystalPct.defSkill = (crystalPct.defSkill || 0) * md2;
  }

  return crystalPct;
}

// ---- rounding + stacking helpers (matches legacy-sim-latest.js) ----
function roundStat(v, mode) {
  switch (mode) {
    case 'ceil':
      return Math.ceil(v);
    case 'floor':
      return Math.floor(v);
    case 'round':
      return Math.round(v);
    default:
      return Math.ceil(v);
  }
}
function roundWeaponDmg(v, mode) {
  // weapon dmg behaves like stats rounding for our current best-fit; keep distinct for future.
  return roundStat(v, mode);
}
function normalizeAttackType(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!s) return 'normal';
  if (s === 'quick' || s === 'quick atk' || s === 'quick attack') return 'quick';
  if (s === 'aimed' || s === 'aim' || s === 'aimed atk' || s === 'aimed attack') return 'aimed';
  if (s === 'cover' || s === 'covered' || s === 'take cover' || s === 'cover attack')
    return 'cover';
  return 'normal';
}
function normalizeBruteAttackType(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!s) return 'normal';
  if (s === 'normal' || s === 'normal atk' || s === 'normal attack') return 'normal';
  if (s === 'aimed' || s === 'aim' || s === 'aimed atk' || s === 'aimed attack') return 'aimed';
  if (s === 'cover' || s === 'covered' || s === 'take cover' || s === 'cover attack')
    return 'cover';
  return 'normal';
}
function isRecognizedBruteAttackTypeToken(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return (
    s === 'normal' ||
    s === 'normal atk' ||
    s === 'normal attack' ||
    s === 'aimed' ||
    s === 'aim' ||
    s === 'aimed atk' ||
    s === 'aimed attack' ||
    s === 'cover' ||
    s === 'covered' ||
    s === 'take cover' ||
    s === 'cover attack'
  );
}
function parseAttackStyleSet(raw) {
  const toks = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const tok of toks) {
    if (!isRecognizedBruteAttackTypeToken(tok)) continue;
    const attackType = normalizeBruteAttackType(tok);
    if (attackType !== 'normal' && attackType !== 'aimed' && attackType !== 'cover') continue;
    if (!seen.has(attackType)) {
      seen.add(attackType);
      out.push(attackType);
    }
  }
  if (!out.length) out.push('normal');
  return out;
}
function roundAttackStyleStat(v, mode) {
  mode = String(mode || 'floor')
    .trim()
    .toLowerCase();
  if (mode === 'round') return Math.round(v);
  if (mode === 'ceil') return Math.ceil(v);
  return Math.floor(v);
}
function applyAttackStyle(c, attackTypeRaw) {
  if (!c) return c;
  const attackType = normalizeAttackType(attackTypeRaw);
  c.attackType = attackType;

  if (attackType === 'aimed') {
    c.acc = Math.max(0, roundAttackStyleStat(c.acc * 1.2, ATTACK_STYLE_ROUND_MODE));
    c.dodge = Math.max(0, roundAttackStyleStat(c.dodge * 0.9, ATTACK_STYLE_ROUND_MODE));
    c.speed = Math.max(0, roundAttackStyleStat(c.speed * 0.9, ATTACK_STYLE_ROUND_MODE));
  } else if (attackType === 'cover') {
    c.dodge = Math.max(0, roundAttackStyleStat(c.dodge * 1.2, ATTACK_STYLE_ROUND_MODE));
    c.acc = Math.max(0, roundAttackStyleStat(c.acc * 0.9, ATTACK_STYLE_ROUND_MODE));
    c.speed = Math.max(0, roundAttackStyleStat(c.speed * 0.9, ATTACK_STYLE_ROUND_MODE));
  }

  return c;
}
function normalizeCrystalStackMode(mode) {
  if (!mode) return 'sum4';
  mode = String(mode).toLowerCase();
  if (mode === 'iter4' || mode === 'iter') return 'iter4';
  return 'sum4';
}
function applyCrystalPctToStat(base, pctPerCrystal, nCrystals, roundMode, stackMode) {
  const m = normalizeCrystalStackMode(stackMode);
  const pct = pctPerCrystal || 0;
  if (!pct || !nCrystals) return base;

  if (m === 'iter4') {
    let v = base;
    for (let i = 0; i < nCrystals; i++) v += roundStat(v * pct, roundMode);
    return v;
  }
  // sum4
  return base + roundStat(base * pct * nCrystals, roundMode);
}
function applyCrystalPctToWeaponDmg(base, pctPerCrystal, nCrystals, roundMode, stackMode) {
  const m = normalizeCrystalStackMode(stackMode);
  const pct = pctPerCrystal || 0;
  if (!pct || !nCrystals) return base;

  if (m === 'iter4') {
    let v = base;
    for (let i = 0; i < nCrystals; i++) v += roundWeaponDmg(v * pct, roundMode);
    return v;
  }
  // sum4
  return base + roundWeaponDmg(base * pct * nCrystals, roundMode);
}

function normalizeSelectedWeaponUpgrades(itemName, upgrade1, upgrade2) {
  const idef = ItemDefs[itemName];
  const raw = [upgrade1, upgrade2]
    .map((u) => (u == null ? '' : String(u).trim()))
    .filter((u) => u.length > 0 && u !== 'None');
  if (!raw.length) return [];
  if (!idef || !idef.upgradeSlots || !idef.upgradeSlots.length) return [];

  const kept = [];
  const taken = new Array(idef.upgradeSlots.length).fill(false);
  for (const upName of raw) {
    if (!UpgradeDefs[upName]) continue;
    for (let si = 0; si < idef.upgradeSlots.length; si++) {
      const slot = idef.upgradeSlots[si];
      if (!taken[si] && Array.isArray(slot) && slot.includes(upName)) {
        taken[si] = true;
        kept.push(upName);
        break;
      }
    }
  }
  return kept;
}

function computeVariant(itemName, crystalName, upgrade1, upgrade2, slotTag = 0) {
  const idef = ItemDefs[itemName];
  if (!idef) throw new Error(`Unknown item "${itemName}"`);

  const isArmor = idef.type === 'Armor';
  const isWeapon = idef.type === 'Weapon';
  const isMisc = idef.type === 'Misc';

  const crystalPct = getEffectiveCrystalPct(itemName, crystalName, slotTag);

  const upgrades = normalizeSelectedWeaponUpgrades(itemName, upgrade1, upgrade2);

  // Base item flat stats (bonuses from the item itself).
  const fs = idef.flatStats || {};
  let outStats = {
    speed: fs.speed || 0,
    accuracy: fs.accuracy || 0,
    dodge: fs.dodge || 0,
    gunSkill: fs.gunSkill || 0,
    meleeSkill: fs.meleeSkill || 0,
    projSkill: fs.projSkill || 0,
    defSkill: fs.defSkill || 0,
    armor: fs.armor || 0,
  };

  // Weapon base damage.
  const wBase = idef.baseWeaponDamage || null;
  let wDmg = isWeapon && wBase ? { min: wBase.min, max: wBase.max } : null;

  // Apply crystals to flat stats on the item.
  const nStats = VARIANT_CFG.crystalSlots;
  const nArm = VARIANT_CFG.armorStatSlots;
  for (const sk of Object.keys(outStats)) {
    const pct = crystalPct[sk] || 0;
    if (!pct) continue;
    const isArmorStat = sk === 'armor';
    const stackMode = isArmorStat ? VARIANT_CFG.armorStatStack : VARIANT_CFG.crystalStackStats;
    const roundMode = isArmorStat ? VARIANT_CFG.armorStatRound : VARIANT_CFG.statRound;
    const n = isArmorStat ? nArm : nStats;
    outStats[sk] = applyCrystalPctToStat(outStats[sk], pct, n, roundMode, stackMode);
  }

  // Apply crystals to weapon damage (uses 'damage' key).
  if (wDmg) {
    const dmgPct = crystalPct.damage || 0;
    if (dmgPct) {
      wDmg.min = applyCrystalPctToWeaponDmg(
        wDmg.min,
        dmgPct,
        VARIANT_CFG.crystalSlots,
        VARIANT_CFG.weaponDmgRound,
        VARIANT_CFG.crystalStackDmg,
      );
      wDmg.max = applyCrystalPctToWeaponDmg(
        wDmg.max,
        dmgPct,
        VARIANT_CFG.crystalSlots,
        VARIANT_CFG.weaponDmgRound,
        VARIANT_CFG.crystalStackDmg,
      );
    }
  }

  // Apply upgrades (once each, multiplicative on the current outStats / wDmg).
  for (const upName of upgrades) {
    const udef = UpgradeDefs[upName];
    const upPct = udef.pct || {};

    for (const sk of Object.keys(outStats)) {
      const pct = upPct[sk] || 0;
      if (!pct) continue;
      outStats[sk] += roundStat(outStats[sk] * pct, VARIANT_CFG.statRound);
    }

    if (wDmg) {
      const pct = upPct.damage || 0;
      if (pct) {
        wDmg.min += roundWeaponDmg(wDmg.min * pct, VARIANT_CFG.weaponDmgRound);
        wDmg.max += roundWeaponDmg(wDmg.max * pct, VARIANT_CFG.weaponDmgRound);
      }
    }
  }

  const addSpeed = outStats.speed;
  const addAcc = outStats.accuracy;
  const addDod = outStats.dodge;
  const addArmStat = outStats.armor;

  const addGun = outStats.gunSkill;
  const addMel = outStats.meleeSkill;
  const addPrj = outStats.projSkill;
  const addDef = outStats.defSkill;

  const upTag = upgrades.length ? `{${upgrades.map(shortUpgrade).join('+')}}` : '';
  const tag = `${shortCrystal(crystalName)}${upTag}`;

  let weapon = null;
  let weaponMaskBit = 0;
  if (isWeapon && wDmg) {
    const st = String(idef.skillType || 'meleeSkill');
    const skill = st === 'gunSkill' ? 0 : st === 'meleeSkill' ? 1 : st === 'projSkill' ? 2 : null;
    if (skill === null)
      throw new Error(`Weapon "${itemName}" has unknown skillType="${idef.skillType}"`);

    weapon = { name: itemName, min: wDmg.min, max: wDmg.max, skill, tag };
    weaponMaskBit = 1 << skill; // gun=1, melee=2, proj=4
  }

  const miscMeta = isMisc
    ? {
        isBio: itemName === 'Bio Spinal Enhancer',
        hasGun: !!(fs.gunSkill || 0),
        hasMel: !!(fs.meleeSkill || 0),
        hasPrj: !!(fs.projSkill || 0),
        hasDef: !!(fs.defSkill || 0),
      }
    : null;

  return {
    itemName,
    crystalName,
    upgrade1: upgrades[0] || '',
    upgrade2: upgrades[1] || '',
    tag,
    addSpeed,
    addAcc,
    addDod,
    addGun,
    addMel,
    addPrj,
    addDef,
    addArmStat,
    weapon,
    weaponMaskBit,
    __misc: miscMeta,
  };
}

function variantKey(itemName, crystalName, upgrade1, upgrade2) {
  const u1 = upgrade1 || '';
  const u2 = upgrade2 || '';
  return `${itemName}|${crystalName}|${u1}|${u2}`;
}

function variantKeyFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2) {
  const u1 = upgrade1 || '';
  const u2 = upgrade2 || '';
  return `${itemName}|${crystalSpecKey(crystalSpec)}|${u1}|${u2}`;
}

function applyMixedCrystalPctToStat(
  base,
  crystalNamesExpanded,
  statName,
  roundMode,
  stackMode,
  pctLookup = null,
) {
  const m = normalizeCrystalStackMode(stackMode);
  if (!crystalNamesExpanded.length) return base;

  if (m === 'iter4') {
    let v = base;
    for (const crystalName of crystalNamesExpanded) {
      const pct = pctLookup
        ? pctLookup(crystalName)[statName] || 0
        : (CrystalDefs[crystalName] &&
            CrystalDefs[crystalName].pct &&
            CrystalDefs[crystalName].pct[statName]) ||
          0;
      if (!pct) continue;
      v += roundStat(v * pct, roundMode);
    }
    return v;
  }

  let pctSum = 0;
  for (const crystalName of crystalNamesExpanded) {
    pctSum += pctLookup
      ? pctLookup(crystalName)[statName] || 0
      : (CrystalDefs[crystalName] &&
          CrystalDefs[crystalName].pct &&
          CrystalDefs[crystalName].pct[statName]) ||
        0;
  }
  return pctSum ? base + roundStat(base * pctSum, roundMode) : base;
}

function applyMixedCrystalPctToWeaponDmg(
  base,
  crystalNamesExpanded,
  roundMode,
  stackMode,
  pctLookup = null,
) {
  const m = normalizeCrystalStackMode(stackMode);
  if (!crystalNamesExpanded.length) return base;

  if (m === 'iter4') {
    let v = base;
    for (const crystalName of crystalNamesExpanded) {
      const pct = pctLookup
        ? pctLookup(crystalName).damage || 0
        : (CrystalDefs[crystalName] &&
            CrystalDefs[crystalName].pct &&
            CrystalDefs[crystalName].pct.damage) ||
          0;
      if (!pct) continue;
      v += roundWeaponDmg(v * pct, roundMode);
    }
    return v;
  }

  let pctSum = 0;
  for (const crystalName of crystalNamesExpanded) {
    pctSum += pctLookup
      ? pctLookup(crystalName).damage || 0
      : (CrystalDefs[crystalName] &&
          CrystalDefs[crystalName].pct &&
          CrystalDefs[crystalName].pct.damage) ||
        0;
  }
  return pctSum ? base + roundWeaponDmg(base * pctSum, roundMode) : base;
}

function computeVariantFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag = 0) {
  if (typeof crystalSpec === 'string')
    return computeVariant(itemName, crystalSpec, upgrade1, upgrade2, slotTag);

  const idef = ItemDefs[itemName];
  if (!idef) throw new Error(`Unknown item "${itemName}"`);

  const isWeapon = idef.type === 'Weapon';
  const isMisc = idef.type === 'Misc';
  const counts = normalizeCrystalCounts(crystalSpec, VARIANT_CFG.crystalSlots);
  const crystalNamesExpanded = [];
  for (const crystalName of crystalSortNames(Object.keys(counts))) {
    if (!CrystalDefs[crystalName]) throw new Error(`Unknown crystal "${crystalName}"`);
    for (let i = 0; i < counts[crystalName]; i++) crystalNamesExpanded.push(crystalName);
  }

  const upgrades = normalizeSelectedWeaponUpgrades(itemName, upgrade1, upgrade2);
  const crystalPctLookup = (crystalName) => getEffectiveCrystalPct(itemName, crystalName, slotTag);

  const fs = idef.flatStats || {};
  let outStats = {
    speed: fs.speed || 0,
    accuracy: fs.accuracy || 0,
    dodge: fs.dodge || 0,
    gunSkill: fs.gunSkill || 0,
    meleeSkill: fs.meleeSkill || 0,
    projSkill: fs.projSkill || 0,
    defSkill: fs.defSkill || 0,
    armor: fs.armor || 0,
  };

  const wBase = idef.baseWeaponDamage || null;
  let wDmg = isWeapon && wBase ? { min: wBase.min, max: wBase.max } : null;

  for (const sk of Object.keys(outStats)) {
    const isArmorStat = sk === 'armor';
    const stackMode = isArmorStat ? VARIANT_CFG.armorStatStack : VARIANT_CFG.crystalStackStats;
    const roundMode = isArmorStat ? VARIANT_CFG.armorStatRound : VARIANT_CFG.statRound;
    outStats[sk] = applyMixedCrystalPctToStat(
      outStats[sk],
      crystalNamesExpanded,
      sk,
      roundMode,
      stackMode,
      crystalPctLookup,
    );
  }

  if (wDmg) {
    wDmg.min = applyMixedCrystalPctToWeaponDmg(
      wDmg.min,
      crystalNamesExpanded,
      VARIANT_CFG.weaponDmgRound,
      VARIANT_CFG.crystalStackDmg,
      crystalPctLookup,
    );
    wDmg.max = applyMixedCrystalPctToWeaponDmg(
      wDmg.max,
      crystalNamesExpanded,
      VARIANT_CFG.weaponDmgRound,
      VARIANT_CFG.crystalStackDmg,
      crystalPctLookup,
    );
  }

  for (const upName of upgrades) {
    const udef = UpgradeDefs[upName];
    const upPct = udef.pct || {};

    for (const sk of Object.keys(outStats)) {
      const pct = upPct[sk] || 0;
      if (!pct) continue;
      outStats[sk] += roundStat(outStats[sk] * pct, VARIANT_CFG.statRound);
    }

    if (wDmg) {
      const pct = upPct.damage || 0;
      if (pct) {
        wDmg.min += roundWeaponDmg(wDmg.min * pct, VARIANT_CFG.weaponDmgRound);
        wDmg.max += roundWeaponDmg(wDmg.max * pct, VARIANT_CFG.weaponDmgRound);
      }
    }
  }

  const addSpeed = outStats.speed;
  const addAcc = outStats.accuracy;
  const addDod = outStats.dodge;
  const addArmStat = outStats.armor;

  const addGun = outStats.gunSkill;
  const addMel = outStats.meleeSkill;
  const addPrj = outStats.projSkill;
  const addDef = outStats.defSkill;

  const upTag = upgrades.length ? `{${upgrades.map(shortUpgrade).join('+')}}` : '';
  const tag = `${crystalSpecShort(counts)}${upTag}`;

  let weapon = null;
  let weaponMaskBit = 0;
  if (isWeapon && wDmg) {
    const st = String(idef.skillType || 'meleeSkill');
    const skill = st === 'gunSkill' ? 0 : st === 'meleeSkill' ? 1 : st === 'projSkill' ? 2 : null;
    if (skill === null)
      throw new Error(`Weapon "${itemName}" has unknown skillType="${idef.skillType}"`);

    weapon = { name: itemName, min: wDmg.min, max: wDmg.max, skill, tag };
    weaponMaskBit = 1 << skill;
  }

  const miscMeta = isMisc ? buildPartMiscMeta(itemName) : null;

  return {
    itemName,
    crystalName: crystalSpecShort(counts),
    crystalMix: counts,
    upgrade1: upgrades[0] || '',
    upgrade2: upgrades[1] || '',
    tag,
    addSpeed,
    addAcc,
    addDod,
    addGun,
    addMel,
    addPrj,
    addDef,
    addArmStat,
    weapon,
    weaponMaskBit,
    __misc: miscMeta,
  };
}

function buildVariantsForArmors(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForArmor(nm);
    for (const c of crystals) {
      const key = variantKey(nm, c, '', '');
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c, '', '');
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function* iterateWeaponUpgradeCombos(itemName) {
  const slots = upgradeSlotsForWeapon(itemName);
  if (!slots || !slots.length) {
    yield [];
    return;
  }
  if (slots.length === 1) {
    for (const a of slots[0]) yield [a];
    return;
  }
  if (slots.length === 2) {
    for (const a of slots[0]) for (const b of slots[1]) yield [a, b];
    return;
  }
  function* rec(idx, acc) {
    if (idx >= slots.length) {
      yield acc.slice();
      return;
    }
    for (const opt of slots[idx]) {
      acc[idx] = opt;
      yield* rec(idx + 1, acc);
    }
  }
  yield* rec(0, new Array(slots.length));
}

function buildVariantsForWeapons(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForWeapon(nm);
    for (const c of crystals) {
      for (const ups of iterateWeaponUpgradeCombos(nm)) {
        const u1 = ups[0] || '';
        const u2 = ups[1] || '';
        const key = variantKey(nm, c, u1, u2);
        let v = cache.get(key);
        if (!v) {
          v = computeVariant(nm, c, u1, u2);
          cache.set(key, v);
        }
        out.push(v);
      }
    }
  }
  return out;
}

function buildVariantsForMiscsSuperset(names) {
  const out = [];
  const cache = new Map();
  for (const nm of names) {
    const crystals = allowedCrystalsForMiscSuperset(nm);
    for (const c of crystals) {
      const key = variantKey(nm, c, '', '');
      let v = cache.get(key);
      if (!v) {
        v = computeVariant(nm, c, '', '');
        cache.set(key, v);
      }
      out.push(v);
    }
  }
  return out;
}

function buildWeaponPairs(weaponVariants) {
  const pairsA = [];
  const forcedPair = FORCED_WEAPON_PAIR;
  // Temporary env-controlled exact weapon item-pair lock; crystal/upgrade variants still flow through.
  const forcedA = forcedPair ? forcedPair[0] : null;
  const forcedB = forcedPair ? forcedPair[1] : null;
  for (let i = 0; i < weaponVariants.length; i++) {
    for (let j = i; j < weaponVariants.length; j++) {
      if (forcedPair) {
        const left = weaponVariants[i].itemName;
        const right = weaponVariants[j].itemName;
        if (left === right) continue;
        const matchesForcedPair =
          (left === forcedA && right === forcedB) || (left === forcedB && right === forcedA);
        if (!matchesForcedPair) continue;
      }
      pairsA.push(i, j);
    }
  }
  return new Uint16Array(pairsA);
}

function buildMiscPairsOrderlessAllDup(miscVariants) {
  const pairsA = [];
  const forcedInclude = FORCED_MISC_INCLUDE;
  for (let i = 0; i < miscVariants.length; i++) {
    for (let j = i; j < miscVariants.length; j++) {
      if (forcedInclude) {
        const left = miscVariants[i].itemName;
        const right = miscVariants[j].itemName;
        if (!forcedInclude.has(left) && !forcedInclude.has(right)) continue;
      }
      pairsA.push(i, j);
    }
  }
  return new Uint16Array(pairsA);
}

// =====================
// EFFECTIVE-SPACE PRECOMPUTE
// =====================
const MASKS = [0b001, 0b010, 0b100, 0b001 | 0b010, 0b001 | 0b100, 0b010 | 0b100];

function buildAllowedMiscTable(miscVariants) {
  const allow = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) {
    const m = MASKS[mi];
    const a = new Uint8Array(miscVariants.length);
    for (let i = 0; i < miscVariants.length; i++) {
      a[i] = miscVariantAllowedForWeaponMask(miscVariants[i], m) ? 1 : 0;
    }
    allow[mi] = a;
  }
  return { masks: MASKS, allow };
}

function buildMiscPairsAllowedByMask(miscPairs, miscAllowTable) {
  const { allow } = miscAllowTable;
  const out = new Array(MASKS.length);

  for (let mi = 0; mi < MASKS.length; mi++) {
    const a = allow[mi];
    const tmp = [];
    for (let p = 0; p < miscPairs.length; p += 2) {
      const i = miscPairs[p];
      const j = miscPairs[p + 1];
      if (a[i] && a[j]) tmp.push(i, j);
    }
    out[mi] = new Uint16Array(tmp);
  }
  return out;
}

function buildWeaponPairIndicesByMask(weaponVariants, weaponPairs) {
  const buckets = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) buckets[mi] = [];

  for (let p = 0, wpi = 0; p < weaponPairs.length; p += 2, wpi++) {
    const w1 = weaponVariants[weaponPairs[p]];
    const w2 = weaponVariants[weaponPairs[p + 1]];
    const mask = w1.weaponMaskBit | w2.weaponMaskBit | 0;

    let maskIdx = -1;
    for (let mi = 0; mi < MASKS.length; mi++) {
      if (MASKS[mi] === mask) {
        maskIdx = mi;
        break;
      }
    }
    if (maskIdx >= 0) buckets[maskIdx].push(wpi);
  }

  const out = new Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) out[mi] = new Uint32Array(buckets[mi]);
  return out;
}

function computeEffectiveCounts(armorVariants, weaponPairIndicesByMask, miscPairsAllowedByMask) {
  const AV = armorVariants.length;
  let effPerArmor = 0;
  const breakdown = [];

  for (let mi = 0; mi < MASKS.length; mi++) {
    const wpCount = weaponPairIndicesByMask[mi].length;
    const mpCount = miscPairsAllowedByMask[mi].length / 2;
    const contrib = wpCount * mpCount;
    effPerArmor += contrib;
    breakdown.push({ mask: MASKS[mi], wpCount, mpKept: mpCount, contrib });
  }

  return { AV, effPerArmor, effTotal: AV * effPerArmor, breakdown };
}

// Precompute bucket sizes to speed decodeEffectiveIndex (minor win)
function buildMaskBuckets(weaponPairIndicesByMask, miscPairsAllowedByMask) {
  const bucket = new Uint32Array(MASKS.length);
  const mpCount = new Uint32Array(MASKS.length);
  for (let mi = 0; mi < MASKS.length; mi++) {
    const wpCount = weaponPairIndicesByMask[mi].length;
    const mpc = (miscPairsAllowedByMask[mi].length / 2) | 0;
    mpCount[mi] = mpc;
    bucket[mi] = (wpCount * mpc) >>> 0;
  }
  return { bucket, mpCount };
}

// =====================
// HP/stat plans / sweep config
// =====================
function clampInt(x, lo, hi) {
  const n = Math.floor(Number(x));
  if (!Number.isFinite(n)) return lo;
  return clamp(n, lo, hi);
}

function uniqueSortedNums(xs) {
  return Array.from(
    new Set(
      (Array.isArray(xs) ? xs : [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x))
        .map((x) => Math.floor(x)),
    ),
  ).sort((a, b) => a - b);
}

function buildAccAllocValues(freePoints, cfg) {
  const out = [];
  const mode = String((cfg && cfg.allocationMode) || 'dodge_only')
    .trim()
    .toLowerCase();

  if (mode === 'dodge_only') return [0];

  const alloc = (cfg && cfg.allocation) || {};
  const accStep = Math.max(1, clampInt(alloc.accStep, 1, Math.max(1, freePoints || 1)));

  if (alloc.includeFullDodge !== false) out.push(0);
  for (let acc = 0; acc <= freePoints; acc += accStep) out.push(acc);
  if (alloc.includeFullAcc !== false) out.push(freePoints);

  const custom = Array.isArray(alloc.customAccValues) ? alloc.customAccValues : [];
  for (const acc of custom) out.push(clampInt(acc, 0, freePoints));

  return uniqueSortedNums(out).filter((acc) => acc >= 0 && acc <= freePoints);
}

function groupPlansByHp(plans) {
  const map = new Map();
  for (const plan of plans) {
    const hp = String(plan.hp);
    let arr = map.get(hp);
    if (!arr) {
      arr = [];
      map.set(hp, arr);
    }
    arr.push(plan);
  }

  return Array.from(map.entries())
    .map(([hp, arr]) => ({
      hp: Number(hp),
      plans: arr.slice().sort((a, b) => a.extraAcc - b.extraAcc || a.extraDodge - b.extraDodge),
    }))
    .sort((a, b) => a.hp - b.hp);
}

function pickWarmStartPlan(plans) {
  if (!plans || !plans.length) return null;

  let best = null;
  for (const plan of plans) {
    if (plan.hp === SETTINGS.LOCKED_HP && plan.extraAcc === 0) return plan;
    if (!best) {
      best = plan;
      continue;
    }

    const a = Math.abs(plan.hp - SETTINGS.LOCKED_HP);
    const b = Math.abs(best.hp - SETTINGS.LOCKED_HP);
    if (a < b) {
      best = plan;
      continue;
    }
    if (a === b && plan.extraAcc < best.extraAcc) best = plan;
  }
  return best;
}

function buildHpPlans() {
  const cfg = PLAN_SWEEP_CONFIG || {};
  const hpMode = String(cfg.hpMode || 'single')
    .trim()
    .toLowerCase();
  const allocationMode = String(cfg.allocationMode || 'dodge_only')
    .trim()
    .toLowerCase();

  const hpValues = [];
  if (hpMode === 'sweep') {
    const hpSweep = cfg.hpSweep || {};
    const hpMin = clampInt(hpSweep.min, 1, SETTINGS.HP_MAX);
    const hpMax = clampInt(hpSweep.max, hpMin, SETTINGS.HP_MAX);
    const hpStep = Math.max(1, clampInt(hpSweep.step, 1, SETTINGS.HP_MAX));

    for (let hp = hpMin; hp <= hpMax; hp += hpStep) hpValues.push(hp);
    if (hpSweep.includeSingleHp) hpValues.push(clampInt(cfg.singleHp, 1, SETTINGS.HP_MAX));
  } else {
    hpValues.push(clampInt(cfg.singleHp, 1, SETTINGS.HP_MAX));
  }

  const plans = [];
  const perHpSummary = [];

  for (const hp of uniqueSortedNums(hpValues)) {
    const delta = SETTINGS.HP_MAX - hp;
    if (delta < 0 || delta % 5 !== 0) {
      throw new Error(
        `HP ${hp} is invalid for HP_MAX=${SETTINGS.HP_MAX}; expected a value <= HP_MAX with (HP_MAX-hp) divisible by 5.`,
      );
    }

    const freePoints = delta / 5;
    const accValues = buildAccAllocValues(freePoints, {
      allocationMode,
      allocation: cfg.allocation,
    });
    if (!accValues.length) {
      throw new Error(`No stat allocations were generated for HP ${hp}. Check PLAN_SWEEP_CONFIG.`);
    }

    for (const extraAcc of accValues) {
      plans.push({
        hp,
        extraAcc,
        extraDodge: freePoints - extraAcc,
        freePoints,
      });
    }

    perHpSummary.push({
      hp,
      freePoints,
      allocCount: accValues.length,
      accMin: accValues[0],
      accMax: accValues[accValues.length - 1],
      accStep:
        allocationMode === 'dodge_only'
          ? 0
          : Math.max(1, clampInt(cfg.allocation && cfg.allocation.accStep, 1, freePoints || 1)),
    });
  }

  plans.sort((a, b) => a.hp - b.hp || a.extraAcc - b.extraAcc || a.extraDodge - b.extraDodge);

  return {
    plans,
    perHpSummary,
    planGroups: groupPlansByHp(plans),
    hpMode,
    allocationMode,
    warmStartPlan: pickWarmStartPlan(plans),
  };
}

function extractAccuracySweepMetric(score, defendersLen, cfg) {
  if (!cfg || !cfg.enabled || !score) return null;

  if (!score.bailed && typeof score.worstWin === 'number' && Number.isFinite(score.worstWin)) {
    return { value: score.worstWin, source: 'confirm' };
  }

  if (
    String(cfg.metric || 'screen_or_confirm')
      .trim()
      .toLowerCase() === 'confirm_only'
  ) {
    return null;
  }

  if (
    score.screenSampled === defendersLen &&
    typeof score.screenWorstWin === 'number' &&
    Number.isFinite(score.screenWorstWin)
  ) {
    return { value: score.screenWorstWin, source: 'screen' };
  }

  return null;
}

function createAccuracySweepState(cfg) {
  const enabled = !!(cfg && cfg.enabled);
  return {
    cfg: cfg || {},
    enabled,
    metricBest: -Infinity,
    bestAcc: 0,
    bestMetricSource: '',
    evaluatedPlans: 0,
    worseStreak: 0,
    stop: false,
    stopReason: '',
  };
}

function updateAccuracySweepState(state, plan, score, defendersLen) {
  if (!state || !state.enabled || state.stop) return false;

  const metric = extractAccuracySweepMetric(score, defendersLen, state.cfg);
  if (!metric) return false;

  state.evaluatedPlans++;

  if (metric.value > state.metricBest + 1e-9) {
    state.metricBest = metric.value;
    state.bestAcc = plan.extraAcc;
    state.bestMetricSource = metric.source;
    state.worseStreak = 0;
    return false;
  }

  const minEvaluatedPlans = Math.max(1, clampInt(state.cfg.minEvaluatedPlans, 1, 999999));
  const minAccAheadOfBest = Math.max(0, clampInt(state.cfg.minAccAheadOfBest, 0, 999999));
  const worseByPct = Math.max(0, Number(state.cfg.worseByPct) || 0);
  const consecutiveSteps = Math.max(1, clampInt(state.cfg.consecutiveSteps, 1, 999999));

  const deficit = state.metricBest - metric.value;
  const accAhead = plan.extraAcc - state.bestAcc;

  if (
    state.evaluatedPlans >= minEvaluatedPlans &&
    accAhead >= minAccAheadOfBest &&
    deficit + 1e-9 >= worseByPct
  ) {
    state.worseStreak++;
    if (state.worseStreak >= consecutiveSteps) {
      state.stop = true;
      state.stopReason =
        `best=${state.metricBest.toFixed(2)}% at A${state.bestAcc}; ` +
        `current=${metric.value.toFixed(2)}% at A${plan.extraAcc}; ` +
        `deficit=${deficit.toFixed(2)}% for ${state.worseStreak} step(s)`;
      return true;
    }
    return false;
  }

  state.worseStreak = 0;
  return false;
}

// =====================
// HIDDEN SLOT (parity with legacy-sim)
// =====================
const HIDDEN_PRESET = String(process.env.LEGACY_HIDDEN_PRESET || 'none')
  .trim()
  .toLowerCase();

function applyHiddenRoleBonuses(c, role) {
  if (!HIDDEN_PRESET || HIDDEN_PRESET === 'none') return;

  const wCount = (c.w1 ? 1 : 0) + (c.w2 ? 1 : 0);
  const prjCount = (c.w1 && c.w1.skill === 2 ? 1 : 0) + (c.w2 && c.w2.skill === 2 ? 1 : 0);

  if (HIDDEN_PRESET === 'slot3') {
    if (role === 'A') {
      c.defSk += 3 * wCount;
    } else {
      c.acc += 3 * wCount;
      c.defSk += 3 * wCount;
    }
    return;
  }

  if (HIDDEN_PRESET === 'slot3_prjdef') {
    if (role === 'A') {
      c.defSk += 3 * wCount;
    } else {
      c.acc += 3 * prjCount;
      c.defSk += 3 * prjCount;
    }
    return;
  }

  // Unknown preset -> ignore
}

function applyCompiledTacticsMinMax(w) {
  if (!w) return w;
  if (TACTICS_MODE === 'minmax' || TACTICS_MODE === 'both') {
    return { ...w, min: w.min + TACTICS_VAL, max: w.max + TACTICS_VAL };
  }
  return w;
}

function rebuildMiscVariantForSlot(v, slotTag) {
  if (
    !v ||
    slotTag !== 2 ||
    !MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.size ||
    !MISC_NO_CRYSTAL_SKILL.has(v.itemName)
  ) {
    return v;
  }
  if (v.crystalMix) {
    return computeVariantFromCrystalSpec(v.itemName, v.crystalMix, v.upgrade1, v.upgrade2, slotTag);
  }
  return computeVariant(v.itemName, v.crystalName, v.upgrade1, v.upgrade2, slotTag);
}
// =====================
// BUILD / COMPILE DEFENDERS
// =====================

function partName(part) {
  if (!part) return '';
  return String(part.name || part.item || part.itemName || '').trim();
}

// Defender payloads historically used `upgrades: [<crystal>, ...]` to mean *crystals*.
// For weapons that support actual upgrades (Void Bow, Bio Gun Mk4, etc), you can either:
//   A) add upgrade names after the crystal in the same array:
//        upgrades: ['Amulet Crystal', 'Poisoned Tip']
//   B) or use explicit fields:
//        crystal: 'Amulet Crystal', upgrades: ['Poisoned Tip']
//   C) or use explicit upgrade fields:
//        upgrade1: 'Poisoned Tip', upgrade2: 'Laser Sight'
function partCrystal(part) {
  if (!part) return '';
  if (typeof part.crystal === 'string' && part.crystal) return part.crystal;
  if (typeof part.crystalName === 'string' && part.crystalName) return part.crystalName;
  if (Array.isArray(part.crystals) && part.crystals.length) return part.crystals[0];
  if (Array.isArray(part.upgrades) && part.upgrades.length) return part.upgrades[0];
  if (typeof part.upgrades === 'string' && part.upgrades) return part.upgrades;
  return '';
}

function partWeaponUpgrades(part) {
  if (!part) return ['', ''];

  let ups = [];
  if (Array.isArray(part.weaponUpgrades)) {
    ups = part.weaponUpgrades;
  } else if (Array.isArray(part.upgrades) && part.crystal) {
    // New-style: `crystal` carries the crystal, `upgrades` carries actual upgrades.
    ups = part.upgrades;
  } else if (Array.isArray(part.upgrades) && !part.crystal) {
    // Legacy-style: treat entries after the crystal as upgrades *only* if they match UpgradeDefs.
    ups = part.upgrades.slice(1).filter((u) => !!UpgradeDefs[u]);
  } else {
    const u1 = typeof part.upgrade1 === 'string' ? part.upgrade1 : '';
    const u2 = typeof part.upgrade2 === 'string' ? part.upgrade2 : '';
    ups = [u1, u2].filter(Boolean);
  }

  const u1 = (typeof part.upgrade1 === 'string' && part.upgrade1) || ups[0] || '';
  const u2 = (typeof part.upgrade2 === 'string' && part.upgrade2) || ups[1] || '';
  return [u1, u2];
}

function defenderVariantKeyFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag = 0) {
  return `${variantKeyFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2)}|${slotTag || 0}`;
}

function prefillVariantsFromDefenders(defenders, getV) {
  for (const def of defenders) {
    const p = def.payload;

    getV(partName(p.armor), partCrystalSpec(p.armor));

    {
      const [u1, u2] = partWeaponUpgrades(p.weapon1);
      getV(partName(p.weapon1), partCrystalSpec(p.weapon1), u1, u2);
    }
    {
      const [u1, u2] = partWeaponUpgrades(p.weapon2);
      getV(partName(p.weapon2), partCrystalSpec(p.weapon2), u1, u2);
    }

    getV(partName(p.misc1), partCrystalSpec(p.misc1), '', '', 1);
    getV(partName(p.misc2), partCrystalSpec(p.misc2), '', '', 2);
  }
}

function compileDefender(def, variantCacheLocal) {
  const p = def.payload;
  const st = p.stats;

  const armorName = partName(p.armor);
  const m1Name = partName(p.misc1);
  const m2Name = partName(p.misc2);
  const w1Name = partName(p.weapon1);
  const w2Name = partName(p.weapon2);

  const armorCr = partCrystalSpec(p.armor);
  const m1Cr = partCrystalSpec(p.misc1);
  const m2Cr = partCrystalSpec(p.misc2);

  const w1Cr = partCrystalSpec(p.weapon1);
  const w2Cr = partCrystalSpec(p.weapon2);
  const [w1u1, w1u2] = partWeaponUpgrades(p.weapon1);
  const [w2u1, w2u2] = partWeaponUpgrades(p.weapon2);

  const armorV = variantCacheLocal.get(defenderVariantKeyFromCrystalSpec(armorName, armorCr, '', ''));
  const w1V = variantCacheLocal.get(defenderVariantKeyFromCrystalSpec(w1Name, w1Cr, w1u1, w1u2));
  const w2V = variantCacheLocal.get(defenderVariantKeyFromCrystalSpec(w2Name, w2Cr, w2u1, w2u2));
  const m1V = variantCacheLocal.get(defenderVariantKeyFromCrystalSpec(m1Name, m1Cr, '', '', 1));
  const m2V = variantCacheLocal.get(defenderVariantKeyFromCrystalSpec(m2Name, m2Cr, '', '', 2));
  if (!armorV || !w1V || !w2V || !m1V || !m2V)
    throw new Error(`Missing variant cache entries for defender ${def.name}`);
  const m1Eff = m1V;
  const m2Eff = m2V;

  const baseSpeed = Math.floor(Number(st.speed));
  const baseAcc = Math.floor(Number(st.accuracy));
  const baseDod = Math.floor(Number(st.dodge));
  const hp = Math.floor(Number(st.hp));
  const level = Math.floor(Number(st.level));

  const speed =
    baseSpeed + armorV.addSpeed + w1V.addSpeed + w2V.addSpeed + m1Eff.addSpeed + m2Eff.addSpeed;
  const acc = baseAcc + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1Eff.addAcc + m2Eff.addAcc;
  const dodge = baseDod + armorV.addDod + w1V.addDod + w2V.addDod + m1Eff.addDod + m2Eff.addDod;

  const w1SkillIdx = w1V.weapon ? w1V.weapon.skill : null;
  const w2SkillIdx = w2V.weapon ? w2V.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  // IMPORTANT: mixed bonus applies ONLY to each weapon's OWN offensive skill contribution.
  // (Not to armor/misc skill, not to defSkill, not to speed/acc/dodge.)
  const w1Gun = w1V.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2V.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1V.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2V.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1V.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2V.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + armorV.addGun + w1Gun + w2Gun + m1Eff.addGun + m2Eff.addGun;
  const mel = BASE.meleeSkill + armorV.addMel + w1Mel + w2Mel + m1Eff.addMel + m2Eff.addMel;
  const prj = BASE.projSkill + armorV.addPrj + w1Prj + w2Prj + m1Eff.addPrj + m2Eff.addPrj;

  const defSk =
    BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1Eff.addDef + m2Eff.addDef;

  const armor = BASE.armor + armorV.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor, ARMOR_K);

  const c = {
    name: def.name,
    hp,
    level,
    speed: Math.floor(speed),
    armor: Math.floor(armor),
    armorFactor,
    acc: Math.floor(acc),
    dodge: Math.floor(dodge),
    gun: Math.floor(gun),
    mel: Math.floor(mel),
    prj: Math.floor(prj),
    defSk: Math.floor(defSk),
    w1: applyCompiledTacticsMinMax(w1V.weapon),
    w2: applyCompiledTacticsMinMax(w2V.weapon),
    baseDmg: BASE.baseDamagePerHit,
  };
  applyHiddenRoleBonuses(c, 'D');
  applyAttackStyle(c, DEFENDER_ATTACK_TYPE);
  return c;
}

// =====================
// COMPILE ATTACKER
// =====================
function compileAttacker(plan, av, w1v, w2v, m1v, m2v, attackTypeRaw = ATTACKER_ATTACK_TYPE) {
  const level = BASE.level;
  const m1Eff = m1v;
  const m2Eff = rebuildMiscVariantForSlot(m2v, 2);

  const speed =
    BASE.speed + av.addSpeed + w1v.addSpeed + w2v.addSpeed + m1Eff.addSpeed + m2Eff.addSpeed;

  const acc =
    BASE.accuracy +
    av.addAcc +
    w1v.addAcc +
    w2v.addAcc +
    m1Eff.addAcc +
    m2Eff.addAcc +
    plan.extraAcc;

  const dodge =
    BASE.dodge +
    av.addDod +
    w1v.addDod +
    w2v.addDod +
    m1Eff.addDod +
    m2Eff.addDod +
    plan.extraDodge;

  const w1SkillIdx = w1v.weapon ? w1v.weapon.skill : null;
  const w2SkillIdx = w2v.weapon ? w2v.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  // IMPORTANT: mixed bonus applies ONLY to each weapon's OWN offensive skill contribution.
  const w1Gun = w1v.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2v.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1v.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2v.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1v.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2v.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + av.addGun + w1Gun + w2Gun + m1Eff.addGun + m2Eff.addGun;
  const mel = BASE.meleeSkill + av.addMel + w1Mel + w2Mel + m1Eff.addMel + m2Eff.addMel;
  const prj = BASE.projSkill + av.addPrj + w1Prj + w2Prj + m1Eff.addPrj + m2Eff.addPrj;

  const defSk = BASE.defSkill + av.addDef + w1v.addDef + w2v.addDef + m1Eff.addDef + m2Eff.addDef;

  const armor = BASE.armor + av.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor, ARMOR_K);

  const c = {
    hp: plan.hp,
    level,
    speed: Math.floor(speed),
    armor: Math.floor(armor),
    armorFactor,
    acc: Math.floor(acc),
    dodge: Math.floor(dodge),
    gun: Math.floor(gun),
    mel: Math.floor(mel),
    prj: Math.floor(prj),
    defSk: Math.floor(defSk),
    w1: applyCompiledTacticsMinMax(w1v.weapon),
    w2: applyCompiledTacticsMinMax(w2v.weapon),
    baseDmg: BASE.baseDamagePerHit,
  };
  applyHiddenRoleBonuses(c, 'A');
  applyAttackStyle(c, attackTypeRaw);
  return c;
}

// =====================
// LEADERBOARD
// =====================
function pushLeaderboard(lb, entry, keepN) {
  lb.push(entry);
  lb.sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);
  if (lb.length > keepN) lb.length = keepN;
}

function formatWeaponShort(wv) {
  const u1 = shortUpgrade(wv.upgrade1);
  const u2 = shortUpgrade(wv.upgrade2);
  const u = [u1, u2].filter(Boolean).join('+');
  return u
    ? `${shortItem(wv.itemName)}[${shortCrystal(wv.crystalName)}]{${u}}`
    : `${shortItem(wv.itemName)}[${shortCrystal(wv.crystalName)}]`;
}

function buildLabel(plan, av, w1v, w2v, m1v, m2v, attackTypeRaw = ATTACKER_ATTACK_TYPE) {
  const attackType = formatAttackStyleShort(attackTypeRaw);
  return (
    `HP${plan.hp} A${plan.extraAcc} D${plan.extraDodge} S${attackType} | ` +
    `${shortItem(av.itemName)}[${shortCrystal(av.crystalName)}] ` +
    `${formatWeaponShort(w1v)}+${formatWeaponShort(w2v)} ` +
    `${shortItem(m1v.itemName)}[${shortCrystal(m1v.crystalName)}]+${shortItem(m2v.itemName)}[${shortCrystal(m2v.crystalName)}]`
  );
}

function buildSpec(av, w1v, w2v, m1v, m2v, plan, attackTypeRaw = ATTACKER_ATTACK_TYPE) {
  return {
    attackType: formatAttackStyleShort(attackTypeRaw),
    plan: {
      hp: plan.hp,
      extraAcc: plan.extraAcc,
      extraDodge: plan.extraDodge,
      freePoints: plan.freePoints,
    },
    armor: { item: av.itemName, crystal: av.crystalName },
    weapon1: {
      item: w1v.itemName,
      crystal: w1v.crystalName,
      u1: w1v.upgrade1 || '',
      u2: w1v.upgrade2 || '',
    },
    weapon2: {
      item: w2v.itemName,
      crystal: w2v.crystalName,
      u1: w2v.upgrade1 || '',
      u2: w2v.upgrade2 || '',
    },
    misc1: { item: m1v.itemName, crystal: m1v.crystalName },
    misc2: { item: m2v.itemName, crystal: m2v.crystalName },
  };
}

// =====================
// STAGED EVALUATION (with Gatekeepers)
// Returns:
//  - confirmed avg/worst if not bailed
//  - screenAvgWin/screenWorstWin if Stage A ran (even if bailed)
// =====================
function evalCandidateStaged({
  att,
  defenders,
  maxTurns,
  trialsGate,
  gatekeepers,
  trialsScreen,
  trialsConfirm,
  floorWorst,
  gateBailMargin,
  screenBailMargin,
  deterministic,
  baseSeed,
  candidateKey,
  stageTagG = 0,
  stageTagA = 1,
  stageTagB = 2,
}) {
  // Bail margins: gatekeeper stage can be tighter; screening stage must be >= catalog margin.
  const gateBail = gateBailMargin == null ? 0 : gateBailMargin;
  const screenBail = screenBailMargin == null ? gateBail : screenBailMargin;

  function setDetRng(i, tag) {
    const s = mix32((baseSeed ^ mix32(candidateKey ^ (i * 0x9e3779b9) ^ tag)) | 0);
    RNG = makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d);
  }

  // Gatekeeper stage
  if (floorWorst !== null && gatekeepers > 0 && trialsGate > 0) {
    let worstG = 101;
    let worstNameG = '';

    const gCount = Math.min(gatekeepers, defenders.length);
    for (let i = 0; i < gCount; i++) {
      if (deterministic) setDetRng(i, stageTagG);

      const D = defenders[i];
      const [wins] = runMatchPacked(att, D, trialsGate, maxTurns);
      const winPct = (wins / trialsGate) * 100;

      if (winPct < worstG) {
        worstG = winPct;
        worstNameG = D.name;

        if (worstG + 1e-9 < floorWorst - gateBail) {
          return {
            avgWin: -1,
            avgEx: 0,
            worstWin: worstG,
            worstName: worstNameG,
            bailed: true,
            stage: 'G',
            screenAvgWin: 0,
            screenAvgEx: 0,
            screenWorstWin: null,
            screenWorstName: '',
            screenSampled: 0,
          };
        }
      }
    }
  }

  // If Stage A is disabled, skip straight to Stage B
  if (!trialsScreen || trialsScreen <= 0) {
    const screenAvgWin = 0;
    const screenAvgEx = 0;

    let sumWin = 0;
    let sumEx = 0;
    let worstWin = 101;
    let worstName = '';

    for (let i = 0; i < defenders.length; i++) {
      if (deterministic) setDetRng(i, stageTagB);

      const D = defenders[i];
      const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
      const winPct = (wins / trialsConfirm) * 100;
      const avgEx = exSum / trialsConfirm;

      sumWin += winPct;
      sumEx += avgEx;

      if (winPct < worstWin) {
        worstWin = winPct;
        worstName = D.name;

        if (floorWorst !== null && worstWin + 1e-9 < floorWorst) {
          return {
            avgWin: -1,
            avgEx: 0,
            worstWin,
            worstName,
            bailed: true,
            stage: 'B',
            screenAvgWin,
            screenAvgEx,
            screenWorstWin: null,
            screenWorstName: '',
            screenSampled: 0,
          };
        }
      }
    }

    return {
      avgWin: sumWin / defenders.length,
      avgEx: sumEx / defenders.length,
      worstWin,
      worstName,
      bailed: false,
      stage: 'B',
      screenAvgWin,
      screenAvgEx,
      screenWorstWin: null,
      screenWorstName: '',
      screenSampled: 0,
    };
  }

  // Stage A (screen)
  let worstA = 101;
  let worstNameA = '';
  let sumWinA = 0;
  let sumExA = 0;

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) setDetRng(i, stageTagA);

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsScreen, maxTurns);
    const winPct = (wins / trialsScreen) * 100;
    const avgEx = exSum / trialsScreen;

    sumWinA += winPct;
    sumExA += avgEx;

    if (winPct < worstA) {
      worstA = winPct;
      worstNameA = D.name;

      if (floorWorst !== null && worstA + 1e-9 < floorWorst - screenBail) {
        const sampled = i + 1;
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin: worstA,
          worstName: worstNameA,
          bailed: true,
          stage: 'A',
          // FIX: use sampled defenders, not defenders.length
          screenAvgWin: sumWinA / sampled,
          screenAvgEx: sumExA / sampled,
          screenWorstWin: worstA,
          screenWorstName: worstNameA,
          screenSampled: sampled,
        };
      }
    }
  }

  const screenAvgWin = sumWinA / defenders.length;
  const screenAvgEx = sumExA / defenders.length;

  // Stage B (confirm)
  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = '';

  for (let i = 0; i < defenders.length; i++) {
    if (deterministic) setDetRng(i, stageTagB);

    const D = defenders[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
    const winPct = (wins / trialsConfirm) * 100;
    const avgEx = exSum / trialsConfirm;

    sumWin += winPct;
    sumEx += avgEx;

    if (winPct < worstWin) {
      worstWin = winPct;
      worstName = D.name;

      if (floorWorst !== null && worstWin + 1e-9 < floorWorst) {
        return {
          avgWin: -1,
          avgEx: 0,
          worstWin,
          worstName,
          bailed: true,
          stage: 'B',
          screenAvgWin,
          screenAvgEx,
          screenWorstWin: worstA,
          screenWorstName: worstNameA,
          screenSampled: defenders.length,
        };
      }
    }
  }

  return {
    avgWin: sumWin / defenders.length,
    avgEx: sumEx / defenders.length,
    worstWin,
    worstName,
    bailed: false,
    stage: 'B',
    screenAvgWin,
    screenAvgEx,
    screenWorstWin: worstA,
    screenWorstName: worstNameA,
    screenSampled: defenders.length,
  };
}

// =====================
// SEARCH-SPACE SANITY
// =====================
function maskName(mask) {
  if (mask === 0b001) return 'Gun+Gun';
  if (mask === 0b010) return 'Melee+Melee';
  if (mask === 0b100) return 'Proj+Proj';
  if (mask === (0b001 | 0b010)) return 'Gun+Melee';
  if (mask === (0b001 | 0b100)) return 'Gun+Proj';
  if (mask === (0b010 | 0b100)) return 'Melee+Proj';
  return `mask(${mask.toString(2)})`;
}

function estimateEffectiveCounts(
  armorVariants,
  weaponVariants,
  weaponPairs,
  miscVariants,
  miscPairs,
) {
  const AV = armorVariants.length;
  const WV = weaponVariants.length;
  const MV = miscVariants.length;
  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowed = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIdxByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);

  const eff = computeEffectiveCounts(armorVariants, weaponPairIdxByMask, miscPairsAllowed);

  return {
    AV,
    WV,
    MV,
    WP,
    MP,
    effPerArmor: eff.effPerArmor,
    effTotal: eff.effTotal,
    breakdown: eff.breakdown,
  };
}

function buildSearchSpaceStats(
  pools,
  armorVariants,
  weaponVariants,
  miscVariants,
  weaponPairs,
  miscPairs,
) {
  const AV = armorVariants.length;
  const WV = weaponVariants.length;
  const MV = miscVariants.length;
  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const supersetCandidatesBase = AV * WP * MP;
  const eff = estimateEffectiveCounts(
    armorVariants,
    weaponVariants,
    weaponPairs,
    miscVariants,
    miscPairs,
  );
  const supersetCandidates = supersetCandidatesBase * ATTACK_STYLE_SWEEP_COUNT;
  const keepPct = supersetCandidatesBase ? (eff.effTotal / supersetCandidatesBase) * 100 : 0;
  return {
    pools,
    AV,
    WV,
    MV,
    WP,
    MP,
    supersetCandidatesBase,
    supersetCandidates,
    attackerStyleCount: ATTACK_STYLE_SWEEP_COUNT,
    attackStyleModeLabel: ATTACK_STYLE_MODE_LABEL,
    eff,
    keepPct,
  };
}

function printSearchSpaceSummary(
  pools,
  armorVariants,
  weaponVariants,
  miscVariants,
  weaponPairs,
  miscPairs,
) {
  const s = buildSearchSpaceStats(
    pools,
    armorVariants,
    weaponVariants,
    miscVariants,
    weaponPairs,
    miscPairs,
  );
  console.log(section('SEARCH SPACE', 'magenta'));
  console.log(
    `${kv('effective', `${s.eff.effTotal * s.attackerStyleCount} candidates`)} ${kv('superset', `${s.supersetCandidates}`)} ${kv('keep', `${s.keepPct.toFixed(2)}%`)}`,
  );
  console.log(
    `${kv('pools', `armors=${s.pools.armors.length} weapons=${s.pools.weapons.length} miscs=${s.pools.miscs.length}`)} ${kv('variants', `A=${s.AV} W=${s.WV} M=${s.MV}`)}`,
  );
  console.log(
    `${kv('pairing', `weaponPairs=${s.WP} miscPairs=${s.MP}`)} ${kv('perArmor', `${s.eff.effPerArmor}`)} ${kv('attacker style', `${s.attackStyleModeLabel} x${s.attackerStyleCount}`)}`,
  );
  console.log('');
}

function printSearchSpaceSanity(
  pools,
  armorVariants,
  weaponVariants,
  miscVariants,
  weaponPairs,
  miscPairs,
) {
  const s = buildSearchSpaceStats(
    pools,
    armorVariants,
    weaponVariants,
    miscVariants,
    weaponPairs,
    miscPairs,
  );

  console.log('=== SANITY CHECK: search-space / combinations ===');
  console.log(
    `Pools: armors=${pools.armors.length}, weapons=${pools.weapons.length}, miscs=${pools.miscs.length}`,
  );
  console.log(
    `Variants (supersets): armorVariants=${s.AV}, weaponVariants=${s.WV}, miscVariants=${s.MV}`,
  );
  console.log(
    `Pairs (orderless): weaponPairs=${s.WP} (=WV*(WV+1)/2), miscPairs=${s.MP} (=MV*(MV+1)/2)`,
  );
  console.log(
    `Superset candidates (before misc per-candidate filter): AV*WP*MP = ${s.supersetCandidatesBase} | attackerStyle=${s.attackStyleModeLabel} => ${s.supersetCandidates}`,
  );
  console.log('');

  console.log('Per-item variant counts (by item + allowed crystals + upgrades):');
  for (const a of pools.armors) {
    const cs = allowedCrystalsForArmor(a);
    console.log(`  Armor  ${padRight(a, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  for (const w of pools.weapons) {
    const cs = allowedCrystalsForWeapon(w);
    const slots = upgradeSlotsForWeapon(w);
    let upCount = 1;
    if (slots && slots.length) upCount = slots.reduce((acc, arr) => acc * (arr.length || 1), 1);
    console.log(
      `  Weapon ${padRight(w, 24)} -> ${cs.map(shortCrystal).join('')} * upgrades(${upCount})  (${cs.length * upCount})`,
    );
  }
  for (const m of pools.miscs) {
    const cs = allowedCrystalsForMiscSuperset(m);
    console.log(`  Misc   ${padRight(m, 24)} -> ${cs.map(shortCrystal).join('')}  (${cs.length})`);
  }
  console.log('');

  console.log(
    'Effective candidates AFTER misc per-candidate filter (exact for your current superset lists):',
  );
  console.log(`  Per armor: sum_over_weaponPairs(keptMiscPairsForMask) = ${s.eff.effPerArmor}`);
  console.log(
    `  Effective total: (${s.eff.AV} * ${s.eff.effPerArmor}) * ${s.attackerStyleCount} = ${s.eff.effTotal * s.attackerStyleCount}`,
  );
  console.log(`  Keep rate vs superset: ${s.keepPct.toFixed(2)}%`);
  console.log('');

  console.log('Breakdown by weapon mask (weaponPairs count * kept miscPairs):');
  s.eff.breakdown
    .sort((a, b) => b.contrib - a.contrib)
    .forEach((r) => {
      const pctWP = s.eff.WP ? (r.wpCount / s.eff.WP) * 100 : 0;
      const pctMP = s.eff.MP ? (r.mpKept / s.eff.MP) * 100 : 0;
      console.log(
        `  ${padRight(maskName(r.mask), 10)} | weaponPairs=${padRight(r.wpCount, 6)} (${pctWP.toFixed(
          1,
        )}%) | keptMiscPairs=${padRight(r.mpKept, 7)} (${pctMP.toFixed(1)}%) | contrib=${r.contrib}`,
      );
    });

  console.log('=== END SANITY CHECK ===\n');
}

// =====================
// CATALOG HELPERS
// =====================
function parseCatalogTopN() {
  const n = parseInt(process.env.LEGACY_CATALOG_TOP_N || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}
function parseCatalogMargin() {
  const x = parseFloat(process.env.LEGACY_CATALOG_MARGIN || '');
  return Number.isFinite(x) && x >= 0 ? x : 12.0;
}
function parseCatalogConfirmTrials(TRIALS_CONFIRM) {
  const n = parseInt(process.env.LEGACY_CATALOG_CONFIRM_TRIALS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : TRIALS_CONFIRM;
}
function parseExportJsonPath() {
  const raw = String(process.env.LEGACY_EXPORT_JSON || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (['0', 'false', 'off', 'no'].includes(low)) return '';
  if (['1', 'true', 'on', 'yes'].includes(low)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `brute-sim-results-${stamp}.json`;
  }
  return raw;
}

// Ranking metric for catalog (screen-only):
// prefer higher screenWorst, then screenAvg.
function isBetterScreen(a, b) {
  if (!b) return true;
  if (a.screenWorstWin !== b.screenWorstWin) return a.screenWorstWin > b.screenWorstWin;
  return a.screenAvgWin > b.screenAvgWin;
}
function pushCatalogTop(lb, entry, keepN) {
  lb.push(entry);
  lb.sort((a, b) => b.screenWorstWin - a.screenWorstWin || b.screenAvgWin - a.screenAvgWin);
  if (lb.length > keepN) lb.length = keepN;
}

function mixedCrystalRefineEnabled() {
  const raw = String(process.env.LEGACY_MIXED_CRYSTALS ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return true;
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'no');
}

function parseMixedCrystalSearchTrials(defaultTrialsScreen, defaultConfirmTrials) {
  const raw = String(process.env.LEGACY_MIXED_CRYSTAL_SEARCH_TRIALS ?? '').trim();
  const fallback = Math.max(defaultTrialsScreen || 0, Math.min(defaultConfirmTrials || 0, 2000));
  if (!raw) return fallback > 0 ? fallback : defaultConfirmTrials;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseMixedCrystalPasses() {
  const raw = String(process.env.LEGACY_MIXED_CRYSTAL_PASSES ?? '').trim();
  if (!raw) return 2;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

// =====================
// WORKER MAIN
// =====================
function workerMain() {
  const {
    trialsConfirm,
    trialsScreen,
    trialsGate,
    gatekeepers,
    maxTurns,
    keepTopNPerHp,
    progressEveryMs,
    startIndex,
    endIndex,
    stride,
    workerId,
    rngMode,
    rngSeed,
    deterministic,
    gateBailMargin,
    screenBailMargin,
    sharedBuf,
    pools,
    debugMixed,
    debugMixedN,
    watchEnabled,
    useSuperset,
    schedMode,
    profileEnabled,
    catalogTopN,
    catalogMargin,
  } = workerData;

  const sharedI32 = sharedBuf ? new Int32Array(sharedBuf) : null;

  if (rngMode === 'fast') {
    const baseSeed = (Number(rngSeed) || 0) >>> 0;
    const s0 = (baseSeed ^ (0x9e3779b9 * (workerId + 1))) >>> 0;
    RNG = makeRng('fast', s0, s0 ^ 0xa341316c, s0 ^ 0xc8013ea4, s0 ^ 0xad90777d);
  } else {
    RNG = Math.random;
  }

  const weapons = pools.weapons;
  const armorChoices = pools.armors;
  const miscChoices = pools.miscs;

  // Local variant cache
  const localCache = new Map();
  function getV(itemName, crystalName, upgrade1 = '', upgrade2 = '') {
    const key = variantKey(itemName, crystalName, upgrade1, upgrade2);
    let v = localCache.get(key);
    if (!v) {
      v = computeVariant(itemName, crystalName, upgrade1, upgrade2);
      localCache.set(key, v);
    }
    return v;
  }

  function getDefenderV(itemName, crystalSpec, upgrade1 = '', upgrade2 = '', slotTag = 0) {
    const key = defenderVariantKeyFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag);
    let v = localCache.get(key);
    if (!v) {
      v = computeVariantFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag);
      localCache.set(key, v);
    }
    return v;
  }

  // Build variants
  const armorVariants = [];
  for (const nm of armorChoices)
    for (const c of allowedCrystalsForArmor(nm)) armorVariants.push(getV(nm, c));

  const weaponVariants = [];
  for (const nm of weapons) {
    for (const c of allowedCrystalsForWeapon(nm)) {
      for (const ups of iterateWeaponUpgradeCombos(nm)) {
        const u1 = ups[0] || '';
        const u2 = ups[1] || '';
        weaponVariants.push(getV(nm, c, u1, u2));
      }
    }
  }

  const miscVariants = [];
  for (const nm of miscChoices)
    for (const c of allowedCrystalsForMiscSuperset(nm)) miscVariants.push(getV(nm, c));

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowedByMask = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIndicesByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);
  const effCounts = computeEffectiveCounts(
    armorVariants,
    weaponPairIndicesByMask,
    miscPairsAllowedByMask,
  );
  const maskBuckets = buildMaskBuckets(weaponPairIndicesByMask, miscPairsAllowedByMask);

  const { plans, planGroups } = buildHpPlans();
  const attackerAttackTypes = ACTIVE_ATTACKER_ATTACK_TYPES;
  const attackerStyleSweepCount = attackerAttackTypes.length;

  // Ensure defender variants exist in cache
  prefillVariantsFromDefenders(defenderBuilds, getDefenderV);
  const defenders = defenderBuilds.map((d) => compileDefender(d, localCache));

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;

  const topsByHp = Object.create(null);
  const bestByTypeByHp = Object.create(null);

  // Catalog collections (screen-only during run; confirmed later in main)
  const catalogTopByHp = Object.create(null); // array of entries
  const catalogBestTypeByHp = Object.create(null); // wpTag -> entry

  const t0 = nowMs();
  let lastProgress = t0;
  let processed = 0;

  const prof = profileEnabled
    ? {
        bailedG: 0,
        bailedA: 0,
        bailedB: 0,
        confirmedB: 0,
        screenCalls: 0,
        screenSampledSum: 0,
        screenFull: 0,
        accBailStops: 0,
        accPlansSkipped: 0,
      }
    : null;

  const detBaseSeed = (Number(rngSeed) || 0) >>> 0;
  let debugPrinted = 0;

  function currentBestSummary() {
    let bestWorst = null;
    let bestAvg = null;
    for (const k in topsByHp) {
      const b = topsByHp[k] && topsByHp[k][0];
      if (!b) continue;
      if (bestWorst === null || b.worstWin > bestWorst) {
        bestWorst = b.worstWin;
        bestAvg = b.avgWin;
      }
    }
    return { bestWorst, bestAvg };
  }

  function maybeReportProgress() {
    const t = nowMs();
    if (t - lastProgress < progressEveryMs) return;
    lastProgress = t;
    const { bestWorst, bestAvg } = currentBestSummary();
    parentPort.postMessage({ type: 'progress', processed, bestWorst, bestAvg });
  }

  function decodeSupersetIndex(gearIdx) {
    const ai = Math.floor(gearIdx / (WP * MP));
    const rem = gearIdx - ai * (WP * MP);
    const wpi = Math.floor(rem / MP);
    const mpi = rem - wpi * MP;

    const av = armorVariants[ai];

    const wpBase = wpi * 2;
    const w1v = weaponVariants[weaponPairs[wpBase]];
    const w2v = weaponVariants[weaponPairs[wpBase + 1]];

    const mpBase = mpi * 2;
    const m1v = miscVariants[miscPairs[mpBase]];
    const m2v = miscVariants[miscPairs[mpBase + 1]];

    const weaponMask = w1v.weaponMaskBit | w2v.weaponMaskBit | 0;
    return { av, w1v, w2v, m1v, m2v, weaponMask };
  }

  function decodeEffectiveIndex(eIdx) {
    const perArmor = effCounts.effPerArmor;
    const ai = Math.floor(eIdx / perArmor);
    let r = eIdx - ai * perArmor;

    let maskIdx = 0;
    while (maskIdx < MASKS.length) {
      const b = maskBuckets.bucket[maskIdx];
      if (r < b) break;
      r -= b;
      maskIdx++;
    }
    if (maskIdx >= MASKS.length) maskIdx = MASKS.length - 1;

    const wpList = weaponPairIndicesByMask[maskIdx];
    const mpList = miscPairsAllowedByMask[maskIdx];
    const mpCount = maskBuckets.mpCount[maskIdx];

    const localWpIdx = Math.floor(r / mpCount);
    const localMpIdx = r - localWpIdx * mpCount;

    const wpi = wpList[localWpIdx];
    const wpBase = (wpi * 2) | 0;
    const w1v = weaponVariants[weaponPairs[wpBase]];
    const w2v = weaponVariants[weaponPairs[wpBase + 1]];

    const mpBase = (localMpIdx * 2) | 0;
    const m1v = miscVariants[mpList[mpBase]];
    const m2v = miscVariants[mpList[mpBase + 1]];

    const av = armorVariants[ai];
    const weaponMask = w1v.weaponMaskBit | w2v.weaponMaskBit | 0;
    return { av, w1v, w2v, m1v, m2v, weaponMask };
  }

  const accuracyBailCfg = (PLAN_SWEEP_CONFIG && PLAN_SWEEP_CONFIG.safeAccuracyBail) || null;

  for (let idx = startIndex; idx < endIndex; idx += stride || 1) {
    const dec = useSuperset ? decodeSupersetIndex(idx) : decodeEffectiveIndex(idx);
    const av = dec.av;
    const w1v = dec.w1v;
    const w2v = dec.w2v;
    const m1v = dec.m1v;
    const m2v = dec.m2v;
    const weaponMask = dec.weaponMask;

    if (watchEnabled && sharedI32) {
      if (Atomics.load(sharedI32, 1) === 0) {
        if (isWatchBuildCandidate(av, w1v, w2v, m1v, m2v)) {
          const won = Atomics.compareExchange(sharedI32, 1, 0, 1);
          if (won === 0) {
            parentPort.postMessage({
              type: 'watch_hit',
              workerId,
              idx,
              label: buildLabel(
                plans[0] || { hp: BASE.hp, extraAcc: 0, extraDodge: 0 },
                av,
                w1v,
                w2v,
                m1v,
                m2v,
                attackerAttackTypes[0],
              ),
            });
          }
        }
      }
    }

    if (useSuperset) {
      if (
        !miscVariantAllowedForWeaponMask(m1v, weaponMask) ||
        !miscVariantAllowedForWeaponMask(m2v, weaponMask)
      ) {
        processed += plans.length * attackerStyleSweepCount;
        maybeReportProgress();
        continue;
      }
    }

    if (debugMixed && workerId === 0 && debugPrinted < debugMixedN) {
      const debugPlan = planGroups[0] && planGroups[0].plans[0] ? planGroups[0].plans[0] : plans[0];
      if (debugPlan) {
        const s1 = w1v.weapon.skill;
        const s2 = w2v.weapon.skill;
        const isMixed = s1 !== s2;
        if (isMixed || debugPrinted < Math.min(3, debugMixedN)) {
          debugPrinted++;
          const [m1, m2] = mixedWeaponMultsFromWeaponSkill(s1, s2);
          const dbgAtt = compileAttacker(debugPlan, av, w1v, w2v, m1v, m2v, attackerAttackTypes[0]);
          const tag = isMixed ? 'MIXED' : 'SAME';
          console.log(
            `[DEBUG_MIXED] ${tag} | style=${dbgAtt.attackType} | W1=${w1v.itemName}(skill=${s1}, mult=${m1}) W2=${w2v.itemName}(skill=${s2}, mult=${m2}) | FINAL skills: gun=${dbgAtt.gun} mel=${dbgAtt.mel} prj=${dbgAtt.prj}`,
          );
        }
      }
    }

    for (const group of planGroups) {
      const hpKey = String(group.hp);
      const accuracyState = createAccuracySweepState(accuracyBailCfg);

      for (let planIdx = 0; planIdx < group.plans.length; planIdx++) {
        const plan = group.plans[planIdx];
        let bestPlanScore = null;
        for (let styleIdx = 0; styleIdx < attackerAttackTypes.length; styleIdx++) {
          const attackType = attackerAttackTypes[styleIdx];
          processed++;

          const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v, attackType);

          let lb = topsByHp[hpKey];
          if (!lb) lb = topsByHp[hpKey] = [];

          const localFloor = lb.length >= keepTopNPerHp ? lb[lb.length - 1].worstWin : null;
          const globalFloor = floorLoadPct(sharedI32);
          const floorWorst =
            localFloor === null && globalFloor === null
              ? null
              : localFloor === null
                ? globalFloor
                : globalFloor === null
                  ? localFloor
                  : Math.max(localFloor, globalFloor);

          const planKeySeed =
            (((plan.hp & 0xffff) << 8) ^
              ((plan.extraAcc & 0xff) << 1) ^
              (plan.extraDodge & 0xff)) >>>
            0;
          const styleKeySeed = ((styleIdx + 1) * 0x9e3779b9) >>> 0;
          const score = evalCandidateStaged({
            att,
            defenders,
            maxTurns,
            trialsGate,
            gatekeepers,
            trialsScreen,
            trialsConfirm,
            floorWorst,
            gateBailMargin,
            screenBailMargin,
            deterministic,
            baseSeed: detBaseSeed,
            candidateKey: mix32((idx + 1) ^ planKeySeed ^ styleKeySeed),
          });
          if (!bestPlanScore || isBetterScore(score, bestPlanScore)) bestPlanScore = score;

          if (prof) {
            if (score.stage === 'G') prof.bailedG++;
            else if (score.stage === 'A') prof.bailedA++;
            else if (score.stage === 'B') {
              if (score.bailed) prof.bailedB++;
              else prof.confirmedB++;
            }
            if (typeof score.screenSampled === 'number' && score.screenSampled > 0) {
              prof.screenCalls++;
              prof.screenSampledSum += score.screenSampled;
              if (score.screenSampled === defenders.length) prof.screenFull++;
            }
          }

          const wpTag = weaponPairTagFromSkills(w1v.weapon.skill, w2v.weapon.skill);
          const label = buildLabel(plan, av, w1v, w2v, m1v, m2v, attackType);
          const spec = buildSpec(av, w1v, w2v, m1v, m2v, plan, attackType);

          if (trialsScreen > 0 && score.screenSampled === defenders.length) {
            const sw = score.screenWorstWin;
            const sa = score.screenAvgWin;

            const eligible = floorWorst === null ? true : sw + 1e-9 >= floorWorst - catalogMargin;

            if (eligible && sw !== null && sw !== undefined) {
              let topArr = catalogTopByHp[hpKey];
              if (!topArr) topArr = catalogTopByHp[hpKey] = [];
              pushCatalogTop(
                topArr,
                {
                  wpTag,
                  label,
                  spec,
                  screenWorstWin: sw,
                  screenWorstName: score.screenWorstName,
                  screenAvgWin: sa,
                },
                catalogTopN,
              );

              let bestTypes = catalogBestTypeByHp[hpKey];
              if (!bestTypes) bestTypes = catalogBestTypeByHp[hpKey] = Object.create(null);
              const cand = {
                wpTag,
                label,
                spec,
                screenWorstWin: sw,
                screenWorstName: score.screenWorstName,
                screenAvgWin: sa,
              };
              if (isBetterScreen(cand, bestTypes[wpTag])) bestTypes[wpTag] = cand;
            }
          }

          if (!score.bailed) {
            let bestTypes = bestByTypeByHp[hpKey];
            if (!bestTypes) bestTypes = bestByTypeByHp[hpKey] = Object.create(null);

            const candidateEntry = {
              wpTag,
              label,
              spec,
              ...score,
              stats: {
                hp: plan.hp,
                attackType: att.attackType,
                extraAcc: plan.extraAcc,
                extraDodge: plan.extraDodge,
                speed: att.speed,
                armor: att.armor,
                acc: att.acc,
                dodge: att.dodge,
                mel: att.mel,
                defSk: att.defSk,
                gun: att.gun,
                prj: att.prj,
              },
            };

            if (isBetterScore(candidateEntry, bestTypes[wpTag])) bestTypes[wpTag] = candidateEntry;

            const floor = lb.length ? lb[lb.length - 1] : null;
            if (lb.length < keepTopNPerHp || score.worstWin >= floor.worstWin - 1e-9) {
              pushLeaderboard(
                lb,
                { wpTag, label, spec, ...score, stats: candidateEntry.stats },
                keepTopNPerHp,
              );
              if (lb.length >= keepTopNPerHp) {
                const newLocalFloor = lb[lb.length - 1].worstWin;
                floorTryRaise(sharedI32, newLocalFloor);
              }
            }
          }
        }

        const triggeredAccuracyBail = updateAccuracySweepState(
          accuracyState,
          plan,
          bestPlanScore,
          defenders.length,
        );
        if (triggeredAccuracyBail) {
          const remaining = group.plans.length - (planIdx + 1);
          if (remaining > 0) {
            processed += remaining * attackerStyleSweepCount;
            if (prof) {
              prof.accBailStops++;
              prof.accPlansSkipped += remaining * attackerStyleSweepCount;
            }
          }
          maybeReportProgress();
          break;
        }

        maybeReportProgress();
      }
    }
  }

  parentPort.postMessage({
    type: 'done',
    processed,
    topsByHp,
    bestByTypeByHp,
    catalogTopByHp,
    catalogBestTypeByHp,
    elapsedSec: (nowMs() - t0) / 1000,
    profile: prof,
  });
}

// =====================
// INIT FLOOR (optional)
// =====================
function getInitFloorPctSetting() {
  const v = Number(SETTINGS.INIT_FLOOR_PCT);
  if (!Number.isFinite(v) || v <= 0) return null;
  return clamp(v, 0, 100);
}

// =====================
// WARM-START MEASURE
// =====================
function runWarmStartAndGetWorstPct({
  plan,
  trialsConfirm,
  maxTurns,
  rngMode,
  rngSeed,
  defenders,
}) {
  const baseSeed = (Number(rngSeed) || 0) >>> 0;
  RNG =
    rngMode === 'fast'
      ? makeRng(
          'fast',
          baseSeed,
          baseSeed ^ 0xa341316c,
          baseSeed ^ 0xc8013ea4,
          baseSeed ^ 0xad90777d,
        )
      : Math.random;

  const localCache = new Map();
  function getV(itemName, crystalName, upgrade1 = '', upgrade2 = '') {
    const key = variantKey(itemName, crystalName, upgrade1, upgrade2);
    let v = localCache.get(key);
    if (!v) {
      v = computeVariant(itemName, crystalName, upgrade1, upgrade2);
      localCache.set(key, v);
    }
    return v;
  }

  function getDefenderV(itemName, crystalSpec, upgrade1 = '', upgrade2 = '', slotTag = 0) {
    const key = defenderVariantKeyFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag);
    let v = localCache.get(key);
    if (!v) {
      v = computeVariantFromCrystalSpec(itemName, crystalSpec, upgrade1, upgrade2, slotTag);
      localCache.set(key, v);
    }
    return v;
  }

  prefillVariantsFromDefenders(defenderBuilds, getDefenderV);
  const compiledDefenders = defenders || defenderBuilds.map((d) => compileDefender(d, localCache));

  const av = getV(WARM_START_BUILD.armor.item, WARM_START_BUILD.armor.crystal);

  const w1u1 = (WARM_START_BUILD.weapon1.upgrades && WARM_START_BUILD.weapon1.upgrades[0]) || '';
  const w1u2 = (WARM_START_BUILD.weapon1.upgrades && WARM_START_BUILD.weapon1.upgrades[1]) || '';
  const w2u1 = (WARM_START_BUILD.weapon2.upgrades && WARM_START_BUILD.weapon2.upgrades[0]) || '';
  const w2u2 = (WARM_START_BUILD.weapon2.upgrades && WARM_START_BUILD.weapon2.upgrades[1]) || '';

  const w1v = getV(WARM_START_BUILD.weapon1.item, WARM_START_BUILD.weapon1.crystal, w1u1, w1u2);
  const w2v = getV(WARM_START_BUILD.weapon2.item, WARM_START_BUILD.weapon2.crystal, w2u1, w2u2);

  const m1v = getV(WARM_START_BUILD.misc1.item, WARM_START_BUILD.misc1.crystal);
  const m2v = getV(WARM_START_BUILD.misc2.item, WARM_START_BUILD.misc2.crystal);
  let best = null;
  for (let styleIdx = 0; styleIdx < ACTIVE_ATTACKER_ATTACK_TYPES.length; styleIdx++) {
    const attackType = ACTIVE_ATTACKER_ATTACK_TYPES[styleIdx];
    const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v, attackType);
    const score = evalCandidateStaged({
      att,
      defenders: compiledDefenders,
      maxTurns,
      trialsGate: 0,
      gatekeepers: 0,
      trialsScreen: 0,
      trialsConfirm,
      floorWorst: null,
      gateBailMargin: 0,
      screenBailMargin: 0,
      deterministic: true,
      baseSeed: (Number(rngSeed) || 0) >>> 0,
      candidateKey: mix32(0xc0ffee ^ ((styleIdx + 1) * 0x9e3779b9)),
    });
    const row = {
      worstWin: score.worstWin,
      avgWin: score.avgWin,
      worstName: score.worstName,
      attackType,
    };
    if (!best || isBetterScore(row, best)) best = row;
  }
  return best;
}

// =====================
// CATALOG CONFIRM (main thread)
// =====================
function confirmSpecAgainstDefenders({
  spec,
  trialsConfirm,
  maxTurns,
  rngMode,
  rngSeed,
  defenders,
}) {
  const baseSeed = (Number(rngSeed) || 0) >>> 0;
  RNG =
    rngMode === 'fast'
      ? makeRng(
          'fast',
          baseSeed ^ 0x1234abcd,
          baseSeed ^ 0x1234abcd ^ 0xa341316c,
          baseSeed ^ 0x1234abcd ^ 0xc8013ea4,
          baseSeed ^ 0x1234abcd ^ 0xad90777d,
        )
      : Math.random;

  const compiledDef = defenders;
  const localCache = new Map();
  function getV(itemName, crystalSpec, u1 = '', u2 = '') {
    const key = variantKeyFromCrystalSpec(itemName, crystalSpec, u1, u2);
    let v = localCache.get(key);
    if (!v) {
      v = computeVariantFromCrystalSpec(itemName, crystalSpec, u1, u2);
      localCache.set(key, v);
    }
    return v;
  }

  const plan = spec.plan;

  const av = getV(spec.armor.item, partCrystalSpec(spec.armor));
  const w1v = getV(
    spec.weapon1.item,
    partCrystalSpec(spec.weapon1),
    spec.weapon1.u1,
    spec.weapon1.u2,
  );
  const w2v = getV(
    spec.weapon2.item,
    partCrystalSpec(spec.weapon2),
    spec.weapon2.u1,
    spec.weapon2.u2,
  );
  const m1v = getV(spec.misc1.item, partCrystalSpec(spec.misc1));
  const m2v = getV(spec.misc2.item, partCrystalSpec(spec.misc2));

  const attackType = formatAttackStyleShort(spec.attackType);
  const att = compileAttacker(plan, av, w1v, w2v, m1v, m2v, attackType);

  let sumWin = 0;
  let sumEx = 0;
  let worstWin = 101;
  let worstName = '';

  for (let i = 0; i < compiledDef.length; i++) {
    const D = compiledDef[i];
    const [wins, exSum] = runMatchPacked(att, D, trialsConfirm, maxTurns);
    const winPct = (wins / trialsConfirm) * 100;
    const avgEx = exSum / trialsConfirm;

    sumWin += winPct;
    sumEx += avgEx;
    if (winPct < worstWin) {
      worstWin = winPct;
      worstName = D.name;
    }
  }

  return {
    worstWin,
    worstName,
    avgWin: sumWin / compiledDef.length,
    avgEx: sumEx / compiledDef.length,
    stats: {
      hp: att.hp,
      attackType: att.attackType,
      extraAcc: plan.extraAcc,
      extraDodge: plan.extraDodge,
      speed: att.speed,
      armor: att.armor,
      acc: att.acc,
      dodge: att.dodge,
      gun: att.gun,
      prj: att.prj,
      mel: att.mel,
      defSk: att.defSk,
    },
  };
}

function refineSpecMixedCrystals({
  baseEntry,
  trialsSearch,
  trialsConfirm,
  maxTurns,
  rngMode,
  rngSeed,
  defenders,
  passes,
  sharedEvalCache,
}) {
  const evalCache = sharedEvalCache || new Map();

  function evalSpec(spec, trials) {
    const key = `${trials}|${specKey(spec)}`;
    let hit = evalCache.get(key);
    if (!hit) {
      hit = confirmSpecAgainstDefenders({
        spec,
        trialsConfirm: trials,
        maxTurns,
        rngMode,
        rngSeed,
        defenders,
      });
      evalCache.set(key, hit);
    }
    return hit;
  }

  let currentSpec = cloneSpec(baseEntry.spec);
  let currentSearch = evalSpec(currentSpec, trialsSearch);
  let improvedMoves = 0;
  let passesRan = 0;

  for (let pass = 0; pass < passes; pass++) {
    passesRan++;
    let passImproved = false;

    for (const partKey of ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2']) {
      const allowed = allowedCrystalsForSpecPart(currentSpec, partKey);
      if (!allowed.length) continue;

      const mixes = enumerateCrystalCountMixes(allowed, VARIANT_CFG.crystalSlots);
      const currentMixKey = crystalSpecKey(partCrystalSpec(currentSpec[partKey]));
      let bestSpec = currentSpec;
      let bestScore = currentSearch;

      for (const mix of mixes) {
        if (crystalSpecKey(mix) === currentMixKey) continue;
        const cand = cloneSpec(currentSpec);
        delete cand[partKey].crystal;
        cand[partKey].crystalMix = mix;

        const candScore = evalSpec(cand, trialsSearch);
        if (
          isBetterScore(
            { worstWin: candScore.worstWin, avgWin: candScore.avgWin },
            { worstWin: bestScore.worstWin, avgWin: bestScore.avgWin },
          )
        ) {
          bestSpec = cand;
          bestScore = candScore;
        }
      }

      if (bestSpec !== currentSpec) {
        currentSpec = bestSpec;
        currentSearch = bestScore;
        improvedMoves++;
        passImproved = true;
      }
    }

    if (!passImproved) break;
  }

  const finalScore =
    trialsConfirm === trialsSearch ? currentSearch : evalSpec(currentSpec, trialsConfirm);

  return {
    ...finalScore,
    spec: currentSpec,
    label: buildLabelFromSpec(currentSpec),
    baseWorstWin: baseEntry.worstWin,
    baseAvgWin: baseEntry.avgWin,
    baseLabel: baseEntry.label,
    searchWorstWin: currentSearch.worstWin,
    searchAvgWin: currentSearch.avgWin,
    improvedMoves,
    passesRan,
  };
}

// =====================
// MAIN THREAD
// =====================
async function main() {
  const single = process.argv.includes('--single');

  const logical =
    typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : os.cpus().length || 1;

  const physicalGuess = logical >= 8 ? Math.ceil(logical / 2) : logical;

  const envW = parseInt(process.env.LEGACY_WORKERS || '', 10);
  const defaultWorkers = Math.min(physicalGuess, SETTINGS.WORKERS_DEFAULT_CAP);

  const workers = single
    ? 1
    : Number.isFinite(envW) && envW > 0
      ? Math.min(envW, logical)
      : defaultWorkers;

  const envConfirm = parseInt(process.env.LEGACY_TRIALS || '', 10);
  const TRIALS_CONFIRM =
    Number.isFinite(envConfirm) && envConfirm > 0 ? envConfirm : SETTINGS.TRIALS_CONFIRM_DEFAULT;

  const envScreen = parseInt(process.env.LEGACY_TRIALS_SCREEN || '', 10);
  const TRIALS_SCREEN =
    Number.isFinite(envScreen) && envScreen > 0 ? envScreen : SETTINGS.TRIALS_SCREEN_DEFAULT;

  const printStage =
    process.env.LEGACY_PRINT_STAGE === '1' || process.env.LEGACY_PRINT_STAGE === 'true';

  const envGate = parseInt(process.env.LEGACY_TRIALS_GATE || '', 10);
  const TRIALS_GATE =
    Number.isFinite(envGate) && envGate > 0 ? envGate : SETTINGS.TRIALS_GATE_DEFAULT;

  const envGatekeepers = parseInt(process.env.LEGACY_GATEKEEPERS || '', 10);
  const GATEKEEPERS =
    Number.isFinite(envGatekeepers) && envGatekeepers >= 0
      ? envGatekeepers
      : SETTINGS.GATEKEEPERS_DEFAULT;

  const envBailMargin = parseFloat(process.env.LEGACY_SCREEN_MARGIN || '');
  const BAIL_MARGIN =
    Number.isFinite(envBailMargin) && envBailMargin >= 0
      ? envBailMargin
      : SETTINGS.SCREEN_BAIL_MARGIN_DEFAULT;
  const rngMode = (process.env.LEGACY_RNG || 'fast').toLowerCase();
  const rngSeed = parseInt(process.env.LEGACY_SEED || '', 10) || 123456789;
  const deterministic =
    process.env.LEGACY_DETERMINISTIC === '1' || process.env.LEGACY_DETERMINISTIC === 'true';

  const pools = parsePoolsFromEnv();
  if (DEFENDER_ATTACK_TYPE_ENV_IGNORED) {
    console.warn(
      `[WARN] LEGACY_DEFENDER_ATTACK_TYPE=${DEFENDER_ATTACK_TYPE_ENV_IGNORED} is ignored in brute-sim; defenders are always normal by product requirement.`,
    );
  }

  const debugMixed =
    process.env.LEGACY_DEBUG_MIXED === '1' || process.env.LEGACY_DEBUG_MIXED === 'true';
  const debugMixedN = parseInt(process.env.LEGACY_DEBUG_MIXED_N || '', 10) || 12;

  const watchRaw = String(process.env.LEGACY_WATCH_BUILD ?? '')
    .trim()
    .toLowerCase();
  const watchEnabled =
    watchRaw === '1' || watchRaw === 'true' || watchRaw === 'on' || watchRaw === 'yes';
  const useSuperset =
    String(process.env.LEGACY_USE_SUPERSET ?? '')
      .trim()
      .toLowerCase() === '1';

  const catalogTopN = parseCatalogTopN();
  const catalogMargin = parseCatalogMargin();
  const catalogConfirmTrials = parseCatalogConfirmTrials(TRIALS_CONFIRM);
  const exportJsonPath = parseExportJsonPath();
  const mixedCrystalRefine = mixedCrystalRefineEnabled();
  const mixedCrystalSearchTrials = parseMixedCrystalSearchTrials(
    TRIALS_SCREEN,
    catalogConfirmTrials,
  );
  const mixedCrystalPasses = parseMixedCrystalPasses();

  // Bail-margin behavior:
  // - Default: use raw LEGACY_SCREEN_MARGIN (fast, matches older behavior)
  // - Optional: LEGACY_ALIGN_BAIL_TO_CATALOG=1 makes Stage A bail margin >= catalog margin (more forgiving, slower)
  const alignBailToCatalog = (() => {
    const v = String(process.env.LEGACY_ALIGN_BAIL_TO_CATALOG ?? '')
      .trim()
      .toLowerCase();
    if (!v) return false;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  })();

  const gateBailMarginEffective = BAIL_MARGIN; // keep Stage 0 tight by default
  const screenBailMarginEffective = alignBailToCatalog
    ? Math.max(BAIL_MARGIN, catalogMargin)
    : BAIL_MARGIN;

  // Work scheduling:
  // - stride (default): interleave indices across workers to avoid tail slowdowns from uneven ranges
  // - range: contiguous ranges (older behavior)
  const schedMode = (() => {
    const v = String(process.env.LEGACY_SCHED ?? '')
      .trim()
      .toLowerCase();
    return v === 'range' ? 'range' : 'stride';
  })();

  const profileEnabled = (() => {
    const v = String(process.env.LEGACY_PROFILE ?? '')
      .trim()
      .toLowerCase();
    if (!v) return false;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  })();

  // Build variants/pairs for sanity + counts
  const armorVariants = buildVariantsForArmors(pools.armors);
  const weaponVariants = buildVariantsForWeapons(pools.weapons);
  const miscVariants = buildVariantsForMiscsSuperset(pools.miscs);

  const weaponPairs = buildWeaponPairs(weaponVariants);
  const miscPairs = buildMiscPairsOrderlessAllDup(miscVariants);

  const { plans, perHpSummary, hpMode, allocationMode, warmStartPlan } = buildHpPlans();

  const WP = weaponPairs.length / 2;
  const MP = miscPairs.length / 2;
  const AV = armorVariants.length;

  const totalGearCandidatesSuperset = AV * WP * MP;

  const miscAllow = buildAllowedMiscTable(miscVariants);
  const miscPairsAllowedByMask = buildMiscPairsAllowedByMask(miscPairs, miscAllow);
  const weaponPairIndicesByMask = buildWeaponPairIndicesByMask(weaponVariants, weaponPairs);
  const effCounts = computeEffectiveCounts(
    armorVariants,
    weaponPairIndicesByMask,
    miscPairsAllowedByMask,
  );
  const totalGearCandidatesEffective = effCounts.effTotal;

  const totalGearCandidates = useSuperset
    ? totalGearCandidatesSuperset
    : totalGearCandidatesEffective;
  const totalCandidates = totalGearCandidates * plans.length * ATTACK_STYLE_SWEEP_COUNT;

  const sanityDisabledCompat =
    process.env.LEGACY_SANITY_DISABLE === '1' || process.env.LEGACY_SANITY_DISABLE === 'true';
  if (!sanityDisabledCompat) {
    const fullSanity =
      TERM_UI.sanity === 'always' || (TERM_UI.sanity === 'auto' && uiWantsVerbose());
    const shortSanity = TERM_UI.sanity === 'auto' && !uiWantsVerbose();

    if (fullSanity) {
      printSearchSpaceSanity(
        pools,
        armorVariants,
        weaponVariants,
        miscVariants,
        weaponPairs,
        miscPairs,
      );
    } else if (shortSanity) {
      printSearchSpaceSummary(
        pools,
        armorVariants,
        weaponVariants,
        miscVariants,
        weaponPairs,
        miscPairs,
      );
    }
  }

  const sharedBuf = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
  const sharedI32 = new Int32Array(sharedBuf);
  sharedI32[0] = -1;
  sharedI32[1] = 0;

  // Warm-start shared floor, if provided
  const initFloor = getInitFloorPctSetting();
  if (initFloor !== null) {
    sharedI32[0] = (initFloor * FLOOR_SCALE) | 0;
    console.log(
      `Warm-start: seeded shared floor to ${initFloor.toFixed(2)}% via SETTINGS.INIT_FLOOR_PCT`,
    );
  }

  // Warm-start by evaluating a known strong seed build (recommended)
  if (warmStartEnabled()) {
    const warmTrials = parseWarmStartTrials(TRIALS_CONFIRM);

    const ws = runWarmStartAndGetWorstPct({
      plan: warmStartPlan || plans[0],
      trialsConfirm: warmTrials,
      maxTurns: SETTINGS.MAX_TURNS,
      rngMode: rngMode === 'fast' ? 'fast' : 'math',
      rngSeed,
    });

    const existing = floorLoadPct(sharedI32);
    const next = existing === null ? ws.worstWin : Math.max(existing, ws.worstWin);

    sharedI32[0] = (next * FLOOR_SCALE) | 0;

    console.log(
      `Warm-start(build): measured worst=${ws.worstWin.toFixed(2)}% (worstVs=${ws.worstName}) avg=${ws.avgWin.toFixed(
        2,
      )}% using ${warmTrials} trials/def; seeded shared floor to ${next.toFixed(2)}%`,
    );
  }

  const locked = warmStartPlan || plans[0];
  if (uiWantsVerbose()) {
    printVerboseRunHeader({
      defenderCount: defenderBuilds.length,
      hiddenPreset: HIDDEN_PRESET,
      workers,
      logical,
      physicalGuess,
      rngMode,
      deterministic,
      useSuperset,
      totalGearCandidatesEffective,
      totalGearCandidatesSuperset,
      hpMode,
      allocationMode,
      buckets: perHpSummary.length,
      totalPlans: plans.length,
      locked,
      gatekeepers: GATEKEEPERS,
      trialsGate: TRIALS_GATE,
      trialsScreen: TRIALS_SCREEN,
      trialsConfirm: TRIALS_CONFIRM,
      screenBailMarginEffective,
      bailMargin: BAIL_MARGIN,
      catalogMargin,
      alignBailToCatalog,
      catalogTopN,
      catalogConfirmTrials,
      mixedCrystalRefine,
      mixedCrystalSearchTrials,
      mixedCrystalPasses,
      exportJsonPath,
      totalCandidates,
    });
  } else {
    printCompactRunHeader({
      defenderCount: defenderBuilds.length,
      hiddenPreset: HIDDEN_PRESET,
      workers,
      logical,
      physicalGuess,
      rngMode,
      deterministic,
      useSuperset,
      totalGearCandidatesEffective,
      totalGearCandidatesSuperset,
      hpMode,
      allocationMode,
      buckets: perHpSummary.length,
      totalPlans: plans.length,
      locked,
      gatekeepers: GATEKEEPERS,
      trialsGate: TRIALS_GATE,
      trialsScreen: TRIALS_SCREEN,
      trialsConfirm: TRIALS_CONFIRM,
      screenBailMarginEffective,
      catalogMargin,
      catalogTopN,
      catalogConfirmTrials,
      mixedCrystalRefine,
      mixedCrystalSearchTrials,
      mixedCrystalPasses,
      exportJsonPath,
    });
  }
  if (debugMixed)
    console.log(
      `${statusTag('DEBUG', 'yellow')} LEGACY_DEBUG_MIXED=1 enabled (prints up to ${debugMixedN} lines from worker 0).`,
    );

  console.log(section('HP PLANS', 'magenta'));
  if (TERM_UI.detail === 'quiet') {
    const r = perHpSummary[0];
    if (r) {
      const allocNote =
        allocationMode === 'dodge_only'
          ? 'dodge-only'
          : `acc=${r.accMin}..${r.accMax}${r.accStep > 0 ? ` step=${r.accStep}` : ''}`;
      console.log(
        `HP=${r.hp} freePoints=${r.freePoints} allocs=${r.allocCount} (${allocNote}, dodge=freePoints-acc, speed=0)`,
      );
    }
  } else {
    console.log('HP plans (reassurance):');
    for (const r of perHpSummary) {
      const allocNote =
        allocationMode === 'dodge_only'
          ? 'dodge-only'
          : `acc=${r.accMin}..${r.accMax}${r.accStep > 0 ? ` step=${r.accStep}` : ''}`;
      console.log(
        `  HP=${r.hp} freePoints=${r.freePoints} allocs=${r.allocCount}  (${allocNote}, dodge=freePoints-acc, speed=0)`,
      );
    }
  }
  console.log('');

  if (watchEnabled) {
    const chk = checkWatchBuildReachable(pools);
    const pretty =
      `Armor=${WATCH_BUILD.armor.item}[${shortCrystal(WATCH_BUILD.armor.crystal)}], ` +
      `Wpn=${WATCH_BUILD.weapon1.item}[${shortCrystal(WATCH_BUILD.weapon1.crystal)}]+${WATCH_BUILD.weapon2.item}[${shortCrystal(WATCH_BUILD.weapon2.crystal)}], ` +
      `Misc=${WATCH_BUILD.misc1.item}[${shortCrystal(WATCH_BUILD.misc1.crystal)}]+${WATCH_BUILD.misc2.item}[${shortCrystal(WATCH_BUILD.misc2.crystal)}]`;

    console.log(`WATCH_BUILD: ${pretty}`);
    if (chk.reachable) {
      console.log('WATCH_BUILD: reachable in current search-space. Will log once when hit.\n');
    } else {
      console.log('WATCH_BUILD: NOT reachable in current search-space due to constraints:');
      for (const r of chk.reasons) console.log(`  - ${r}`);
      console.log('WATCH_BUILD: (so it will never be “hit” unless you loosen constraints.)\n');
    }
  }

  const globalByHp = Object.create(null);
  const globalBestByTypeByHp = Object.create(null);

  // Catalog aggregates
  const globalCatalogTopByHp = Object.create(null);
  const globalCatalogBestTypeByHp = Object.create(null);

  for (const r of perHpSummary) {
    globalByHp[String(r.hp)] = [];
    globalBestByTypeByHp[String(r.hp)] = Object.create(null);
    globalCatalogTopByHp[String(r.hp)] = [];
    globalCatalogBestTypeByHp[String(r.hp)] = Object.create(null);
  }

  let liveBestWorst = null;
  let liveBestAvg = null;

  const start = nowMs();
  let lastRender = start;
  let nextCheckpointPct = REPORT_CFG.checkpointStepPct;
  const processedByWorker = new Array(workers).fill(0);
  const profileByWorker = new Array(workers).fill(null);

  const ranges = [];
  if (schedMode === 'range') {
    const perWorker = Math.floor(totalGearCandidates / workers);
    for (let w = 0; w < workers; w++) {
      const s = w * perWorker;
      const e = w === workers - 1 ? totalGearCandidates : (w + 1) * perWorker;
      ranges.push([s, e]);
    }
  }

  await new Promise((resolve, reject) => {
    let doneCount = 0;

    for (let w = 0; w < workers; w++) {
      let startIndex, endIndex, stride;
      if (schedMode === 'range') {
        [startIndex, endIndex] = ranges[w];
        stride = 1;
      } else {
        // stride scheduling: interleave indices (w, w+workers, ...)
        startIndex = w;
        endIndex = totalGearCandidates;
        stride = workers;
      }

      const wk = new Worker(__filename, {
        workerData: {
          workerId: w,
          trialsConfirm: TRIALS_CONFIRM,
          trialsScreen: TRIALS_SCREEN,
          trialsGate: TRIALS_GATE,
          gatekeepers: GATEKEEPERS,
          gateBailMargin: gateBailMarginEffective,
          screenBailMargin: screenBailMarginEffective,
          maxTurns: SETTINGS.MAX_TURNS,
          keepTopNPerHp: SETTINGS.KEEP_TOP_N_PER_HP,
          progressEveryMs: SETTINGS.PROGRESS_EVERY_MS,
          startIndex,
          endIndex,
          stride,
          rngMode: rngMode === 'fast' ? 'fast' : 'math',
          rngSeed,
          deterministic,
          sharedBuf,
          pools,
          debugMixed,
          debugMixedN,
          watchEnabled,
          useSuperset,
          schedMode,
          profileEnabled,
          catalogTopN,
          catalogMargin,
        },
      });

      wk.on('message', (msg) => {
        if (!msg || !msg.type) return;

        if (msg.type === 'watch_hit') {
          clearLiveLine();
          console.log(`\n[WATCH_BUILD HIT] worker=${msg.workerId} idx=${msg.idx} | ${msg.label}\n`);
          return;
        }

        if (msg.type === 'progress') {
          processedByWorker[w] = msg.processed || processedByWorker[w];

          if (typeof msg.bestWorst === 'number') {
            if (liveBestWorst === null || msg.bestWorst > liveBestWorst) {
              liveBestWorst = msg.bestWorst;
              liveBestAvg = msg.bestAvg;
            }
          }

          const t = nowMs();
          if (t - lastRender >= SETTINGS.PROGRESS_EVERY_MS) {
            lastRender = t;
            const doneProcessed = processedByWorker.reduce((a, b) => a + b, 0);
            const elapsed = (t - start) / 1000;
            const sharedFloor = floorLoadPct(sharedI32);

            const done = Math.min(doneProcessed, totalCandidates);
            const frac = totalCandidates ? done / totalCandidates : 0;
            const rate = elapsed > 0 ? done / elapsed : 0;
            const eta = rate > 0 ? (totalCandidates - done) / rate : null;
            const line = buildRunProgressLine({
              done,
              total: totalCandidates,
              elapsedSec: elapsed,
              etaSec: eta,
              floorPct: sharedFloor,
              bestWorst: liveBestWorst,
              bestAvg: liveBestAvg,
            });

            if (TERM_UI.progress === 'off') {
              // no-op
            } else if (TERM_UI.progress === 'single') {
              writeLiveLine(line);
            } else if (TERM_UI.progress === 'checkpoints') {
              const pct = frac * 100;
              if (pct >= nextCheckpointPct || done >= totalCandidates) {
                console.log(line);
                while (pct >= nextCheckpointPct) nextCheckpointPct += REPORT_CFG.checkpointStepPct;
              }
            } else {
              console.log(line);
            }
          }
        }

        if (msg.type === 'done') {
          processedByWorker[w] = msg.processed || processedByWorker[w];
          if (msg.profile) profileByWorker[w] = msg.profile;

          const topsByHp = msg.topsByHp || {};
          for (const hpKey in topsByHp) {
            const localLB = topsByHp[hpKey];
            if (!localLB || !localLB.length) continue;

            const globalLB = globalByHp[hpKey] || (globalByHp[hpKey] = []);
            for (const e of localLB) pushLeaderboard(globalLB, e, SETTINGS.KEEP_TOP_N_PER_HP);
          }

          const bestByType = msg.bestByTypeByHp || {};
          for (const hpKey in bestByType) {
            const types = bestByType[hpKey];
            if (!types) continue;

            let g = globalBestByTypeByHp[hpKey];
            if (!g) g = globalBestByTypeByHp[hpKey] = Object.create(null);

            for (const typeKey in types) {
              const cand = types[typeKey];
              if (!cand) continue;
              if (isBetterScore(cand, g[typeKey])) g[typeKey] = cand;
            }
          }

          // merge catalog
          const cTop = msg.catalogTopByHp || {};
          for (const hpKey in cTop) {
            const arr = cTop[hpKey];
            if (!arr || !arr.length) continue;
            const gArr = globalCatalogTopByHp[hpKey] || (globalCatalogTopByHp[hpKey] = []);
            for (const e of arr) pushCatalogTop(gArr, e, catalogTopN);
          }

          const cTypes = msg.catalogBestTypeByHp || {};
          for (const hpKey in cTypes) {
            const types = cTypes[hpKey];
            if (!types) continue;
            let g = globalCatalogBestTypeByHp[hpKey];
            if (!g) g = globalCatalogBestTypeByHp[hpKey] = Object.create(null);

            for (const tKey in types) {
              const cand = types[tKey];
              if (!cand) continue;
              if (isBetterScreen(cand, g[tKey])) g[tKey] = cand;
            }
          }

          doneCount++;
          if (doneCount >= workers) resolve();
        }
      });

      wk.on('error', reject);
      wk.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
      });
    }
  });

  const elapsedAll = (nowMs() - start) / 1000;
  if (TERM_UI.progress === 'single' && process.stdout?.isTTY) {
    const finalFloor = floorLoadPct(sharedI32);
    const finalLine = buildRunProgressLine({
      done: totalCandidates,
      total: totalCandidates,
      elapsedSec: elapsedAll,
      etaSec: 0,
      floorPct: finalFloor,
      bestWorst: liveBestWorst,
      bestAvg: liveBestAvg,
    });
    writeLiveLine(finalLine);
  }
  flushLiveLine();

  if (profileEnabled) {
    console.log('\n\n=== PROFILE (LEGACY_PROFILE=1) ===');
    for (let w = 0; w < workers; w++) {
      const p = profileByWorker[w];
      if (!p) continue;
      const avgSampled = p.screenCalls ? p.screenSampledSum / p.screenCalls : 0;
      console.log(
        `worker=${w} processed=${processedByWorker[w]} | G_bail=${p.bailedG} A_bail=${p.bailedA} B_bail=${p.bailedB} B_keep=${p.confirmedB} | screenAvgSampled=${avgSampled.toFixed(
          2,
        )}/${defenderBuilds.length} fullScreens=${p.screenFull} | accBailStops=${p.accBailStops} accPlansSkipped=${p.accPlansSkipped}`,
      );
    }
    console.log('=== END PROFILE ===\n');
  }

  printResults({
    globalByHp,
    globalBestByTypeByHp,
    globalCatalogTopByHp,
    globalCatalogBestTypeByHp,
    elapsedAll,
    totalCandidates,
    printStage,
    rngMode: rngMode === 'fast' ? 'fast' : 'math',
    rngSeed,
    catalogConfirmTrials,
    exportJsonPath,
    mixedCrystalRefine,
    mixedCrystalSearchTrials,
    mixedCrystalPasses,
  });
}

// =====================
// PRINT RESULTS
// =====================
function dedupeRefinedEntries(entries) {
  const bySpec = new Map();
  for (let idx = 0; idx < entries.length; idx++) {
    const e = entries[idx];
    const key = specKey(e.spec);
    const prior = bySpec.get(key);
    if (!prior) {
      bySpec.set(key, { ...e, _firstIdx: idx, mergedCount: 1 });
      continue;
    }

    prior.mergedCount += 1;
    const takeCurrent =
      e.worstWin > prior.worstWin ||
      (e.worstWin === prior.worstWin && e.avgWin > prior.avgWin) ||
      (e.worstWin === prior.worstWin &&
        e.avgWin === prior.avgWin &&
        (e.baseWorstWin > prior.baseWorstWin ||
          (e.baseWorstWin === prior.baseWorstWin && e.baseAvgWin > prior.baseAvgWin))) ||
      (e.worstWin === prior.worstWin &&
        e.avgWin === prior.avgWin &&
        e.baseWorstWin === prior.baseWorstWin &&
        e.baseAvgWin === prior.baseAvgWin &&
        idx < prior._firstIdx);

    if (takeCurrent) {
      bySpec.set(key, { ...e, _firstIdx: idx, mergedCount: prior.mergedCount });
    }
  }

  return Array.from(bySpec.values())
    .sort(
      (a, b) =>
        b.worstWin - a.worstWin ||
        b.avgWin - a.avgWin ||
        b.baseWorstWin - a.baseWorstWin ||
        b.baseAvgWin - a.baseAvgWin ||
        a._firstIdx - b._firstIdx,
    )
    .map(({ _firstIdx, ...rest }) => rest);
}

function dedupeRefinedEntries(entries) {
  const bySpec = new Map();
  for (let idx = 0; idx < entries.length; idx++) {
    const e = entries[idx];
    const key = specKey(e.spec);
    const prior = bySpec.get(key);
    if (!prior) {
      bySpec.set(key, { ...e, _firstIdx: idx, mergedCount: 1 });
      continue;
    }

    prior.mergedCount += 1;
    const takeCurrent =
      e.worstWin > prior.worstWin ||
      (e.worstWin === prior.worstWin && e.avgWin > prior.avgWin) ||
      (e.worstWin === prior.worstWin &&
        e.avgWin === prior.avgWin &&
        (e.baseWorstWin > prior.baseWorstWin ||
          (e.baseWorstWin === prior.baseWorstWin && e.baseAvgWin > prior.baseAvgWin))) ||
      (e.worstWin === prior.worstWin &&
        e.avgWin === prior.avgWin &&
        e.baseWorstWin === prior.baseWorstWin &&
        e.baseAvgWin === prior.baseAvgWin &&
        idx < prior._firstIdx);

    if (takeCurrent) {
      bySpec.set(key, { ...e, _firstIdx: idx, mergedCount: prior.mergedCount });
    }
  }

  return Array.from(bySpec.values())
    .sort(
      (a, b) =>
        b.worstWin - a.worstWin ||
        b.avgWin - a.avgWin ||
        b.baseWorstWin - a.baseWorstWin ||
        b.baseAvgWin - a.baseAvgWin ||
        a._firstIdx - b._firstIdx,
    )
    .map(({ _firstIdx, ...rest }) => rest);
}

function printResults({
  globalByHp,
  globalBestByTypeByHp,
  globalCatalogTopByHp,
  globalCatalogBestTypeByHp,
  elapsedAll,
  totalCandidates,
  printStage,
  rngMode,
  rngSeed,
  catalogConfirmTrials,
  exportJsonPath,
  mixedCrystalRefine,
  mixedCrystalSearchTrials,
  mixedCrystalPasses,
}) {
  console.log(section('RUN COMPLETE', 'green'));
  console.log(
    `${kv('tested', totalCandidates)} ${kv('attack style', ATTACK_STYLE_MODE_LABEL)} ${kv('elapsed', formatDuration(elapsedAll))} ${kv('kept/HP', SETTINGS.KEEP_TOP_N_PER_HP)} ${kv('catalogTrials', catalogConfirmTrials)}`,
  );
  if (TERM_UI.detail !== 'quiet') {
    console.log(
      `${kv('mixed refine', `${mixedCrystalRefine ? 'ON' : 'OFF'} search=${mixedCrystalSearchTrials} passes=${mixedCrystalPasses}`)} ${kv('report', `${TERM_UI.detail} top=${REPORT_CFG.finalistsTopN}`)}`,
    );
  }

  const archetypes = ['Gun+Gun', 'Gun+Melee', 'Gun+Proj', 'Melee+Melee', 'Melee+Proj', 'Proj+Proj'];

  const hpKeys = Object.keys(globalByHp)
    .map((x) => parseInt(x, 10))
    .sort((a, b) => a - b);

  let estimatedConfirmTasks = 0;
  let estimatedRefineTasks = 0;
  for (const hp of hpKeys) {
    const hpKey = String(hp);
    const catTop = globalCatalogTopByHp[hpKey] || [];
    const catTypes = globalCatalogBestTypeByHp[hpKey] || {};
    const uniqueSpecs = new Set();

    for (const e of catTop) {
      const key = specKey(e.spec);
      uniqueSpecs.add(key);
      estimatedConfirmTasks++;
    }

    for (const t of archetypes) {
      const e = catTypes[t];
      if (!e) continue;
      const key = specKey(e.spec);
      if (uniqueSpecs.has(key)) continue;
      uniqueSpecs.add(key);
      estimatedConfirmTasks++;
    }

    if (mixedCrystalRefine) estimatedRefineTasks += uniqueSpecs.size;
  }

  const finalProgress = {
    startMs: nowMs(),
    totalUnits: Math.max(1, 1 + estimatedConfirmTasks + estimatedRefineTasks),
    doneUnits: 0,
    lastCheckpointPct: -1,
    lastPhase: '',
  };

  function renderFinalizationProgress({ phase, hp = null, note = '', force = false }) {
    if (TERM_UI.progress === 'off') return;
    const elapsedSec = (nowMs() - finalProgress.startMs) / 1000;
    const frac =
      finalProgress.totalUnits > 0 ? finalProgress.doneUnits / finalProgress.totalUnits : 1;
    const etaSec = frac > 0 && frac < 1 ? (elapsedSec / frac) * (1 - frac) : 0;
    const line = buildFinalizationProgressLine({
      phase,
      done: finalProgress.doneUnits,
      total: finalProgress.totalUnits,
      elapsedSec,
      etaSec,
      hp,
      note,
    });

    if (TERM_UI.progress === 'single') {
      writeLiveLine(line);
      return;
    }

    const pct = Math.floor(frac * 100);
    const checkpoint = Math.floor(pct / REPORT_CFG.checkpointStepPct);
    const shouldPrint =
      force ||
      TERM_UI.progress === 'lines' ||
      phase !== finalProgress.lastPhase ||
      checkpoint > finalProgress.lastCheckpointPct;

    if (shouldPrint) {
      clearLiveLine();
      console.log(line);
      finalProgress.lastCheckpointPct = checkpoint;
      finalProgress.lastPhase = phase;
    }
  }

  function advanceFinalization(phase, hp = null, note = '', force = false) {
    finalProgress.doneUnits = Math.min(finalProgress.totalUnits, finalProgress.doneUnits + 1);
    renderFinalizationProgress({ phase, hp, note, force });
  }

  renderFinalizationProgress({
    phase: 'compile defenders',
    note: `defs=${defenderBuilds.length}`,
    force: true,
  });

  const compiledDefendersOnce = (() => {
    const localCache = new Map();
    function getV(itemName, crystalName, u1 = '', u2 = '') {
      const key = variantKey(itemName, crystalName, u1, u2);
      let v = localCache.get(key);
      if (!v) {
        v = computeVariant(itemName, crystalName, u1, u2);
        localCache.set(key, v);
      }
      return v;
    }

    function getDefenderV(itemName, crystalSpec, u1 = '', u2 = '', slotTag = 0) {
      const key = defenderVariantKeyFromCrystalSpec(itemName, crystalSpec, u1, u2, slotTag);
      let v = localCache.get(key);
      if (!v) {
        v = computeVariantFromCrystalSpec(itemName, crystalSpec, u1, u2, slotTag);
        localCache.set(key, v);
      }
      return v;
    }

    prefillVariantsFromDefenders(defenderBuilds, getDefenderV);
    return defenderBuilds.map((d) => compileDefender(d, localCache));
  })();
  advanceFinalization('compile defenders', null, `defs=${compiledDefendersOnce.length}`, true);

  const mixedRefineEvalCache = new Map();
  const mixedRefineResultCache = new Map();
  const catalogConfirmCache = new Map();

  function confirmCatalogSpec(spec, hp = null, note = '') {
    const key = specKey(spec);
    let hit = catalogConfirmCache.get(key);
    if (!hit) {
      hit = confirmSpecAgainstDefenders({
        spec,
        trialsConfirm: catalogConfirmTrials,
        maxTurns: SETTINGS.MAX_TURNS,
        rngMode,
        rngSeed,
        defenders: compiledDefendersOnce,
      });
      catalogConfirmCache.set(key, hit);
      mixedRefineEvalCache.set(`${catalogConfirmTrials}|${key}`, hit);
      advanceFinalization(
        'catalog confirm',
        hp,
        note || compactBuildLabel(buildLabelFromSpec(spec), 64),
      );
    }
    return hit;
  }

  function getMixedRefinedEntry(baseEntry, hp = null) {
    const key = specKey(baseEntry.spec);
    let hit = mixedRefineResultCache.get(key);
    if (!hit) {
      hit = refineSpecMixedCrystals({
        baseEntry,
        trialsSearch: mixedCrystalSearchTrials,
        trialsConfirm: catalogConfirmTrials,
        maxTurns: SETTINGS.MAX_TURNS,
        rngMode,
        rngSeed,
        defenders: compiledDefendersOnce,
        passes: mixedCrystalPasses,
        sharedEvalCache: mixedRefineEvalCache,
      });
      mixedRefineResultCache.set(key, hit);
      advanceFinalization('mixed refine', hp, compactBuildLabel(hit.label || baseEntry.label, 64));
    }
    return hit;
  }

  function pickDisplayTop(refinedTop, confirmedTop, lb, wantN) {
    const out = [];
    const seen = new Set();

    for (const arr of [refinedTop || [], confirmedTop || [], lb || []]) {
      for (const e of arr) {
        const key = specKey(e.spec);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e);
        if (out.length >= wantN) return out;
      }
    }

    return out;
  }

  const exportPayload = {
    meta: {
      version: VERSION,
      totalCandidates,
      elapsedSec: Number(elapsedAll.toFixed(3)),
      attackStyleMode: ATTACK_STYLE_MODE,
      attackerAttackType: ATTACKER_ATTACK_TYPE,
      attackStyleSet: ACTIVE_ATTACKER_ATTACK_TYPES.slice(),
      attackStyleModeLabel: ATTACK_STYLE_MODE_LABEL,
      rngMode,
      rngSeed,
      catalogConfirmTrials,
      mixedCrystalRefine,
      mixedCrystalSearchTrials,
      mixedCrystalPasses,
      outputMode: TERM_UI.mode,
      outputDetail: TERM_UI.detail,
      outputProgress: TERM_UI.progress,
      colors: TERM_UI.colors,
    },
    hp: [],
    summary: {
      bestOverall: null,
      bestByHp: [],
      bestByType: {},
      refineSummary: [],
    },
  };

  const hpReports = [];

  for (const hp of hpKeys) {
    const hpKey = String(hp);
    const lb = globalByHp[hpKey] || [];
    const bestTypes = globalBestByTypeByHp[hpKey] || {};

    const hpExport = {
      hp,
      kept: lb,
      keptByType: bestTypes,
      catalogTop: [],
      catalogByType: [],
      mixedCatalogTop: [],
      mixedCatalogByType: [],
    };

    if (!lb.length) {
      hpReports.push({
        hp,
        kept: [],
        winner: null,
        winnerSourceKind: 'kept',
        winnerSourceLabel: outcomeLabelForSource('kept'),
        displayTop: [],
        displayTypes: [],
        refineChanges: [],
      });
      exportPayload.hp.push(hpExport);
      continue;
    }

    const catTop = globalCatalogTopByHp[hpKey] || [];
    const catTypes = globalCatalogBestTypeByHp[hpKey] || {};
    const confirmedTop = catTop
      .map((e) => ({
        ...e,
        ...confirmCatalogSpec(e.spec, hp, compactBuildLabel(e.label, 64)),
      }))
      .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    hpExport.catalogTop = confirmedTop;

    const confirmedCatalogByKey = new Map();
    for (const e of confirmedTop) {
      const key = specKey(e.spec);
      if (!confirmedCatalogByKey.has(key)) confirmedCatalogByKey.set(key, e);
    }
    for (const t of archetypes) {
      const e = catTypes[t];
      if (!e) continue;
      const key = specKey(e.spec);
      if (confirmedCatalogByKey.has(key)) continue;
      const conf = confirmCatalogSpec(e.spec, hp, compactBuildLabel(e.label, 64));
      confirmedCatalogByKey.set(key, { ...e, ...conf });
    }

    const confirmedTypesMap = Object.create(null);
    for (const e of confirmedCatalogByKey.values()) {
      const type = e.type || e.wpTag;
      if (!type) continue;
      const candidate = { type, ...e };
      if (isBetterScore(candidate, confirmedTypesMap[type])) confirmedTypesMap[type] = candidate;
    }
    const confirmedTypes = archetypes
      .map((t) => confirmedTypesMap[t])
      .filter(Boolean)
      .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    hpExport.catalogByType = confirmedTypes;

    let refinedTop = [];
    let refinedTypes = [];
    if (mixedCrystalRefine && confirmedTop.length) {
      refinedTop = dedupeRefinedEntries(
        confirmedTop.map((e) => ({ ...e, ...getMixedRefinedEntry(e, hp) })),
      );
      hpExport.mixedCatalogTop = refinedTop;
    }
    if (mixedCrystalRefine && confirmedTypes.length) {
      refinedTypes = confirmedTypes
        .map((e) => ({ type: e.type, ...e, ...getMixedRefinedEntry(e, hp) }))
        .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);
      hpExport.mixedCatalogByType = refinedTypes;
    }

    const keptTypes = Object.keys(bestTypes)
      .map((t) => ({ type: t, ...bestTypes[t] }))
      .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    const displayTop = pickDisplayTop(refinedTop, confirmedTop, lb, REPORT_CFG.finalistsTopN);
    const displayTypes = refinedTypes.length
      ? refinedTypes
      : confirmedTypes.length
        ? confirmedTypes
        : keptTypes;

    const winner = displayTop[0] || lb[0];
    const winnerSourceKind = refinedTop.length
      ? 'refined'
      : confirmedTop.length
        ? 'catalog'
        : 'kept';
    const winnerRefine = winnerSourceKind === 'refined' ? refineNote(winner) : '';
    const refineChanges = refinedTop
      .map((e, idx) => {
        const deltaWorst = e.worstWin - e.baseWorstWin;
        const deltaAvg = e.avgWin - e.baseAvgWin;
        return {
          ...e,
          rank: idx + 1,
          deltaWorst,
          deltaAvg,
          note: classifyRefineOutcome(deltaWorst, deltaAvg),
        };
      })
      .filter((e) => e.note !== 'same')
      .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

    hpReports.push({
      hp,
      kept: lb,
      keptTypes,
      confirmedTop,
      confirmedTypes,
      refinedTop,
      refinedTypes,
      displayTop,
      displayTypes,
      winner,
      winnerSourceKind,
      winnerSourceLabel: outcomeLabelForSource(winnerSourceKind),
      winnerRefine,
      refineChanges,
    });

    exportPayload.hp.push(hpExport);
  }

  const hpWinners = hpReports
    .filter((r) => r.winner)
    .map((r) => ({
      hp: r.hp,
      winnerSourceKind: r.winnerSourceKind,
      winnerSourceLabel: r.winnerSourceLabel,
      winnerRefine: r.winnerRefine,
      ...r.winner,
    }))
    .sort((a, b) => b.worstWin - a.worstWin || b.avgWin - a.avgWin);

  if (hpWinners.length) {
    exportPayload.summary.bestOverall = hpWinners[0];
    exportPayload.summary.bestByHp = hpWinners;

    const bestByTypeSummary = Object.create(null);
    for (const report of hpReports) {
      for (const e of report.displayTypes || []) {
        const type = e.type || e.wpTag;
        if (!type) continue;
        const current = bestByTypeSummary[type];
        if (!current || isBetterScore(e, current)) {
          bestByTypeSummary[type] = { hp: report.hp, ...e };
        }
      }
    }
    exportPayload.summary.bestByType = bestByTypeSummary;

    const refineSummary = [];
    for (const report of hpReports) {
      for (const e of (report.refineChanges || []).slice(0, REPORT_CFG.refineChangesTopN)) {
        refineSummary.push({ hp: report.hp, ...e });
      }
    }
    exportPayload.summary.refineSummary = refineSummary
      .sort((a, b) => b.deltaWorst - a.deltaWorst || b.worstWin - a.worstWin || b.avgWin - a.avgWin)
      .slice(0, REPORT_CFG.refineChangesTopN);
  }

  finalProgress.doneUnits = finalProgress.totalUnits;
  renderFinalizationProgress({
    phase: 'render tables',
    note: `hp=${hpReports.length}`,
    force: true,
  });
  flushLiveLine();

  if (hpWinners.length > 1) {
    console.log(section('HP WINNERS', 'cyan'));
    const rows = hpWinners.map((e) => [
      `HP${e.hp}`,
      fmtPctTone(e.worstWin),
      fmtPctTone(e.avgWin),
      e.worstName,
      e.winnerSourceLabel,
      compactBuildLabel(e.label, 94),
    ]);
    printTable(['HP', 'MinWR', 'AvgWR', 'Worst Matchup', 'Source', 'Build'], rows, [
      'left',
      'right',
      'right',
      'left',
      'left',
      'left',
    ]);
    console.log('');
  }

  for (const report of hpReports) {
    console.log(section(`HP ${report.hp}`, 'cyan'));

    if (!report.winner) {
      console.log(`${statusTag('NOTE', 'yellow')} no kept results.\n`);
      continue;
    }

    printWinnerCard('overall winner', report.winner, {
      hp: report.hp,
      source: report.winnerSourceLabel,
      refine: report.winnerRefine,
    });

    const topRows = report.displayTop
      .slice(0, REPORT_CFG.finalistsTopN)
      .map((e, i) => [
        `#${i + 1}`,
        fmtPctTone(e.worstWin),
        fmtPctTone(e.avgWin),
        e.type || e.wpTag || '—',
        e.worstName,
        compactBuildLabel(e.label, 96),
      ]);
    console.log(
      `${statusTag('TOP', 'cyan')} top ${Math.min(REPORT_CFG.finalistsTopN, report.displayTop.length)} finalists`,
    );
    printTable(['Rank', 'MinWR', 'AvgWR', 'Type', 'Worst Matchup', 'Build'], topRows, [
      'left',
      'right',
      'right',
      'left',
      'left',
      'left',
    ]);
    console.log('');

    if (report.displayTypes.length) {
      console.log(`${statusTag('TYPE', 'magenta')} best by weapon archetype`);
      const rows = report.displayTypes.map((e) => [
        e.type || e.wpTag || '—',
        fmtPctTone(e.worstWin),
        fmtPctTone(e.avgWin),
        e.worstName,
        compactBuildLabel(e.label, 96),
      ]);
      printTable(['Type', 'MinWR', 'AvgWR', 'Worst Matchup', 'Build'], rows, [
        'left',
        'right',
        'right',
        'left',
        'left',
      ]);
      console.log('');
    }

    if (mixedCrystalRefine && report.refineChanges.length) {
      console.log(`${statusTag('REFINE', 'green')} meaningful mixed-crystal changes`);
      const rows = report.refineChanges
        .slice(0, REPORT_CFG.refineChangesTopN)
        .map((e) => [
          `#${e.rank}`,
          fmtPctTone(e.worstWin),
          fmtPctTone(e.avgWin),
          fmtDelta(e.deltaWorst),
          fmtDelta(e.deltaAvg),
          e.note,
          compactBuildLabel(e.label, 96),
        ]);
      printTable(['Rank', 'MinWR', 'AvgWR', 'ΔMin', 'ΔAvg', 'Result', 'Build'], rows, [
        'left',
        'right',
        'right',
        'right',
        'right',
        'left',
        'left',
      ]);
      console.log('');
    }

    if (uiWantsVerbose()) {
      console.log(`${statusTag('DETAIL', 'dim')} kept finalists`);
      const keptRows = report.kept.map((e, i) =>
        printStage
          ? [
              `#${i + 1}`,
              fmtPctTone(e.worstWin),
              fmtPctTone(e.avgWin),
              e.wpTag,
              e.worstName,
              e.stage || '?',
              compactBuildLabel(e.label, 100),
            ]
          : [
              `#${i + 1}`,
              fmtPctTone(e.worstWin),
              fmtPctTone(e.avgWin),
              e.wpTag,
              e.worstName,
              compactBuildLabel(e.label, 100),
            ],
      );
      printTable(
        printStage
          ? ['Rank', 'MinWR', 'AvgWR', 'Type', 'Worst Matchup', 'Stage', 'Build']
          : ['Rank', 'MinWR', 'AvgWR', 'Type', 'Worst Matchup', 'Build'],
        keptRows,
        printStage
          ? ['left', 'right', 'right', 'left', 'left', 'left', 'left']
          : ['left', 'right', 'right', 'left', 'left', 'left'],
      );
      console.log('');

      if (report.confirmedTop.length) {
        console.log(`${statusTag('DETAIL', 'dim')} catalog finalists (full confirm)`);
        const rows = report.confirmedTop.map((e, i) => [
          `#${i + 1}`,
          fmtPctTone(e.worstWin),
          fmtPctTone(e.avgWin),
          e.wpTag,
          e.worstName,
          fmtPct(e.screenWorstWin),
          compactBuildLabel(e.label, 100),
        ]);
        printTable(['Rank', 'MinWR', 'AvgWR', 'Type', 'Worst Matchup', 'ScreenWR', 'Build'], rows, [
          'left',
          'right',
          'right',
          'left',
          'left',
          'right',
          'left',
        ]);
        console.log('');
      }

      if (mixedCrystalRefine && report.refinedTop.length) {
        console.log(`${statusTag('DETAIL', 'dim')} refined catalog finalists`);
        const rows = report.refinedTop.map((e, i) => {
          const deltaWorst = e.worstWin - e.baseWorstWin;
          const deltaAvg = e.avgWin - e.baseAvgWin;
          return [
            `#${i + 1}`,
            fmtPctTone(e.worstWin),
            fmtPctTone(e.avgWin),
            fmtDelta(deltaWorst),
            fmtDelta(deltaAvg),
            classifyRefineOutcome(deltaWorst, deltaAvg),
            compactBuildLabel(e.label, 100),
          ];
        });
        printTable(['Rank', 'MinWR', 'AvgWR', 'ΔMin', 'ΔAvg', 'Result', 'Build'], rows, [
          'left',
          'right',
          'right',
          'right',
          'right',
          'left',
          'left',
        ]);
        console.log('');
      }
    }
  }

  maybeWriteJson(exportJsonPath, exportPayload);
}

// =====================
// ENTRY
// =====================
// ENTRY
// =====================
if (isMainThread) {
  main().catch((err) => {
    console.error('\nFatal:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
} else {
  workerMain();
}
