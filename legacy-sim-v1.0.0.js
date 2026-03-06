#!/usr/bin/env node
'use strict';

const __ENV_PRESET_KEYS__ = new Set(Object.keys(process.env));
const fs = require('fs');
const path = require('path');

// === USER CONFIG (quick edits) ==============================================
// These are *file-edit* conveniences. All existing LEGACY_* env vars still work.
//
// Attacker selection:
//   mode = 'env'    -> uses LEGACY_ATTACKER_PRESET (default)
//   mode = 'preset' -> forces `preset` below (ignores env var)
//   mode = 'custom' -> uses `custom` build object below
//
// Weapon upgrades:
//   Put upgrade names in `upgrades: []` for weapons that support them (e.g. Void Bow, Bio Gun Mk4).
//   For weapons that don't take upgrades, leave `upgrades: []`.
//
// Defender payloads live in ./legacy-defender-payloads.js (edit that file to tweak meta builds).
// If you rename the defender file, update `defenders.file` here.
const USER_CONFIG = {
  attacker: {
    mode: 'env', // env | preset | custom
    preset: 'MAUL_CSTAFF',

    // Custom attacker build template (only used when mode='custom').
    // Tip: copy one of the ATTACKER_PRESETS below and paste it here to start.
    custom: {
      stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
      armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal', upgrades: [] },

      weapon1: { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
      weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },

      misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
      misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal', upgrades: [] },
    },
  },

  defenders: {
    file: './legacy-defenders.js',
  },
};
// === END USER CONFIG =========================================================

const __DEFAULT_ENV__ = {
  LEGACY_TRIALS: '200000',
  LEGACY_SEED: '1337',
  LEGACY_DETERMINISTIC: '1',

  LEGACY_OUTPUT: 'compact',
  LEGACY_PRINT_EXACT: '0',
  LEGACY_PRINT_GAME: '0',

  LEGACY_COLOR: 'auto', // auto|0|1 (ANSI colors). Use 0 for clean copy/paste.
  LEGACY_ASCII: '0', // 1 = use ASCII separators ('|' and '-') for copy/paste-friendly output
  LEGACY_NAME_W: '0', // 0=auto, otherwise force defender name column width
  LEGACY_SEP: '1', // 1 = print a subtle separator line between defenders (compact output)
  LEGACY_SUMMARY: '1', // 1 = print end-of-variant SUMMARY line (mean/min/max)

  LEGACY_HEADER: 'min', // min|compact|full
  LEGACY_DEF_LIST_MAX: '6', // how many defenders to show in compact header
  LEGACY_COMPARE: '0', // 1 = print baseline compare lines (from file) per defender
  LEGACY_BASELINES_FILE: '',
  LEGACY_BASELINE_KEY: '', // override baseline key (hex) to compare against a different run
  LEGACY_BASELINE_FALLBACK: '0', // allow fallback to built-in baselines by defender name (not recommended)
  LEGACY_PRINT_BASELINE_TEMPLATE: '0', // prints JSON skeleton for this run's baseline key
  LEGACY_DET_TAG: '2', // deterministic RNG tag (2 matches brute-force 'confirm' stage)

  LEGACY_DIAG: '0',
  LEGACY_DIAG_ARMOR: '0',

  LEGACY_DIAG_RANGE: '0',
  LEGACY_DIAG_RANGE_SWEEP: '0',
  LEGACY_DIAG_RANGE_DEFENDER: '',

  LEGACY_ATTACKER_PRESET: 'MAUL_CSTAFF',
  LEGACY_VERIFY_DEFENDERS:
    'SG1 Split Bombs T2,DL Gun Build,DL Gun Build 2,DL Gun Build 3,DL Gun Build 4,DL Gun Build 5,DL Gun Build 6,DL Gun Build 7,DL Gun Build 8,T2 Scythe Build,HF Core/Void,Core/Void Build 1,Dual Bow Build 1,Rift Bow Build 1,Armour stack Cores',

  LEGACY_DMG_ROLL: 'int',

  LEGACY_ARMOR_K: '8',
  LEGACY_ARMOR_APPLY: 'per_weapon',
  LEGACY_ARMOR_ROUND: 'ceil',

  LEGACY_TACTICS_MODE: 'none',
  LEGACY_DISP_ROUND: 'floor',

  LEGACY_PROJ_DEF_MULT: '1',
  LEGACY_SPEED_TIE_MODE: 'attacker',

  LEGACY_HIDDEN_PRESET: 'none',

  LEGACY_CRYSTAL_STACK_MODE: 'sum4',
  LEGACY_CRYSTAL_STACK_STATS: 'iter4',
  LEGACY_CRYSTAL_STACK_DMG: 'sum4',
  LEGACY_CRYSTAL_SLOTS: '4',

  LEGACY_ARMORSTAT_STACK: 'inherit',
  LEGACY_ARMORSTAT_ROUND: 'inherit',
  LEGACY_ARMORSTAT_SLOTS: 'inherit',

  LEGACY_MISC_NO_CRYSTAL_SKILL: '',
  LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES: '',

  LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES: '',

  LEGACY_HF_ARMOR_BASE_OVERRIDE: '125',

  LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE: '',
  LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE: '123',

  LEGACY_SHARED_HIT: '0',
  LEGACY_ACTION_STOP_ON_KILL: '0',
  LEGACY_SHARED_SKILL: 'none',

  LEGACY_HIT_ROLL_MODE: 'int',
  LEGACY_HIT_GE: '1',
  LEGACY_HIT_QROUND: 'round',

  LEGACY_SKILL_ROLL_MODE: 'int',
  LEGACY_SKILL_GE: '1',
  LEGACY_SKILL_QROUND: 'round',
  LEGACY_ROLL_DUMP: '0', // 1 = enable
  LEGACY_ROLL_DUMP_DEFENDERS: '',
  LEGACY_ROLL_DUMP_FIGHTS: '1', // fights to dump per selected defender
  LEGACY_ROLL_DUMP_MAX_TURNS: '8', // stop dumping after N turns within each dumped fight (fight continues)
  LEGACY_ROLL_DUMP_MAX_LINES: '1200', // safety cap
};

for (const [k, v] of Object.entries(__DEFAULT_ENV__)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const DEFAULTS = {
  LEVEL: 80,
  HP_MAX: 865,
  MAX_TURNS: 200,
  TRIALS: 200000,
};

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function parseCsv(str) {
  return String(str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
function parseNumCsv(str) {
  return parseCsv(str).map((s) => Number(s));
}
function pickEnv(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === null || v === '' ? fallback : v;
}
function yn(v) {
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function swapWeaponsInPlace(c) {
  if (!c) return;
  if (!c.w1 && !c.w2 && !c.weapon1 && !c.weapon2) return;

  const t = c.w1;
  c.w1 = c.w2;
  c.w2 = t;

  c.weapon1 = c.w1;
  c.weapon2 = c.w2;
}

function hex8(u32) {
  return (u32 >>> 0).toString(16).padStart(8, '0');
}

function hashStr32(str) {
  str = String(str);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableStringify(x) {
  if (x === null) return 'null';
  const t = typeof x;
  if (t === 'number' || t === 'boolean') return String(x);
  if (t === 'string') return JSON.stringify(x);
  if (t !== 'object') return JSON.stringify(String(x));
  if (Array.isArray(x)) return '[' + x.map((v) => stableStringify(v)).join(',') + ']';
  const keys = Object.keys(x).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(x[k])).join(',') + '}';
}

function summarizeList(list, maxItems) {
  maxItems = Math.max(0, maxItems | 0);
  if (!Array.isArray(list) || list.length === 0) return '';
  if (maxItems === 0) return `(+${list.length} items)`;
  if (list.length <= maxItems) return list.join(', ');
  const head = list.slice(0, maxItems).join(', ');
  return `${head}, ... (+${list.length - maxItems} more)`;
}

function resolvePathRelToScript(p) {
  if (!p) return '';
  return path.isAbsolute(p) ? p : path.join(__dirname, p);
}

function loadBaselineFile(filePath) {
  try {
    const abs = resolvePathRelToScript(filePath);
    if (!fs.existsSync(abs)) return null;
    const raw = fs.readFileSync(abs, 'utf8');
    const json = JSON.parse(raw);

    if (json && typeof json === 'object') return json;
    return null;
  } catch (e) {
    console.error(`NOTE: failed to parse baselines file "${filePath}": ${e.message}`);
    return null;
  }
}

function baselineLookup(store, keyHex, defenderName) {
  if (!store || !keyHex) return null;

  const b1 = store.baselines && store.baselines[keyHex];
  if (b1 && b1[defenderName]) return b1[defenderName];

  const r = store.runs && store.runs[keyHex];
  if (r && r.defenders && r.defenders[defenderName]) return r.defenders[defenderName];

  const b3 = store[keyHex];
  if (b3 && b3[defenderName]) return b3[defenderName];

  return null;
}

function makeBaselineTemplate({ keyHex, attackerPreset, cfgSigObj, defenderNames }) {
  const defenders = {};
  for (const n of defenderNames) {
    defenders[n] = {
      winPct: null,
      avgTurns: null,
      A_hit: null,
      A_dmg1: null,
      A_dmg2: null,
      D_hit: null,
      D_dmg1: null,
      D_dmg2: null,
      A_rng: [null, null],
      D_rng: [null, null],
    };
  }

  return {
    baselines: {
      [keyHex]: {
        meta: {
          attackerPreset,
          cfg: cfgSigObj,
          createdUtc: new Date().toISOString(),
        },
        defenders,
      },
    },
  };
}

const MISC_NO_CRYSTAL_SKILL = new Set(
  String(pickEnv('LEGACY_MISC_NO_CRYSTAL_SKILL', '') || '')
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

const MISC_NO_CRYSTAL_SKILL_TYPES_RAW = String(
  pickEnv('LEGACY_MISC_NO_CRYSTAL_SKILL_TYPES', 'gun,melee,proj'),
);
const MISC_NO_CRYSTAL_SKILL_TYPE_MULTS = parseSkillTypeMultipliers(MISC_NO_CRYSTAL_SKILL_TYPES_RAW);
const MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES_RAW = String(
  pickEnv('LEGACY_MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES', ''),
);
const MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS = parseSkillTypeMultipliers(
  MISC_NO_CRYSTAL_SKILL_SLOT2_TYPES_RAW,
);
const MISC_NO_CRYSTAL_SKILL_TWEAK_TAG = (() => {
  if (!MISC_NO_CRYSTAL_SKILL.size || !MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.size) return 'none';
  const items = Array.from(MISC_NO_CRYSTAL_SKILL).join('|');
  const types = Array.from(MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => (v === 0 ? k : `${k}=${v}`))
    .join(',');
  return `${items}:${types}`;
})();

const PRINT_WEAPON_RNG = yn(String(pickEnv('LEGACY_PRINT_WEAPON_RNG', '0')));
const SWAP_ATTACKER_WEPS = yn(String(pickEnv('LEGACY_SWAP_ATTACKER_WEPS', '0')));
const SWAP_DEFENDER_WEPS = yn(String(pickEnv('LEGACY_SWAP_DEFENDER_WEPS', '0')));

const MISC_NO_CRYSTAL_SKILL_ZERO_DEF = yn(
  String(pickEnv('LEGACY_MISC_NO_CRYSTAL_SKILL_ZERO_DEF', '0')),
);
if (MISC_NO_CRYSTAL_SKILL_ZERO_DEF) MISC_NO_CRYSTAL_SKILL_TYPES.add('def');

function normalizeNameKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function buildNameIndex(obj) {
  const m = new Map();
  for (const k of Object.keys(obj)) {
    m.set(normalizeNameKey(k), k);
  }
  return m;
}

function resolveKeyOrFallback(raw, obj, idx, fallbackKey) {
  const r = String(raw || '').trim();
  if (!r) return fallbackKey;
  if (Object.prototype.hasOwnProperty.call(obj, r)) return r;
  const n = normalizeNameKey(r);
  const k = idx.get(n);
  return k || fallbackKey;
}

function resolveKeyOrNull(raw, obj, idx) {
  const r = String(raw || '').trim();
  if (!r) return null;
  if (Object.prototype.hasOwnProperty.call(obj, r)) return r;
  const n = normalizeNameKey(r);
  return idx.get(n) || null;
}

let RNG = Math.random;

function makeRng(mode, seedA, seedB, seedC, seedD) {
  if (mode !== 'fast') return Math.random;

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

function randLegacyInt(min, max) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  return Math.floor(RNG() * (max - min + 1) + min);
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
  qround = normalizeQround(qround);
  if (qround === 'floor') return Math.floor(x);
  if (qround === 'ceil') return Math.ceil(x);
  if (qround === 'round') return Math.round(x);
  return x;
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

function rollVs(off, def, rollMode, ge = false, qround = 'none') {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;

  const mode = normalizeRollMode(rollMode);
  const q = normalizeQround(qround);

  let aMin = off / 4;
  let aMax = off;
  let dMin = def / 4;
  let dMax = def;

  if (q !== 'none') {
    aMin = applyQuarterRound(aMin, q);
    dMin = applyQuarterRound(dMin, q);
  }

  let a;
  let b;
  if (mode === 'float') {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  } else if (mode === 'int') {
    a = randLegacyInt(aMin, aMax);
    b = randLegacyInt(dMin, dMax);
  } else if (mode === 'int_uniform') {
    a = randIntInclusive(aMin, aMax);
    b = randIntInclusive(dMin, dMax);
  } else if (mode === 'int_excl') {
    const rA = intRange(aMin, aMax, 'int_excl');
    const rB = intRange(dMin, dMax, 'int_excl');
    a = randIntInclusive(rA.lo, rA.hi);
    b = randIntInclusive(rB.lo, rB.hi);
  } else {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  }

  return ge ? a - b >= 0 : a - b > 0;
}

function fmtBound(x) {
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x - Math.round(x)) < 1e-12) return String(Math.round(x));
  let s = x.toFixed(4);
  s = s.replace(/0+$/g, '').replace(/\.$/g, '');
  return s;
}

function rollDumpPush(ctx, line) {
  if (!ctx || !ctx.enabled || !ctx.out) return;
  const out = ctx.out;

  if (out.lines.length >= out.maxLines) {
    if (!out._capped) {
      out.lines.push(
        `RD NOTE: output capped at ${out.maxLines} lines (set LEGACY_ROLL_DUMP_MAX_LINES to raise)`,
      );
      out._capped = true;
    }
    ctx.enabled = false;
    return;
  }
  out.lines.push(line);
}

function rollVsDump(off, def, rollMode, ge = false, qround = 'none', ctx = null, meta = null) {
  off = off > 0 ? off : 0;
  def = def > 0 ? def : 0;

  const mode = normalizeRollMode(rollMode);
  const q = normalizeQround(qround);
  const cmp = ge ? '>=' : '>';

  const aMinRaw = off / 4;
  const aMax = off;
  const dMinRaw = def / 4;
  const dMax = def;

  let aMin = aMinRaw;
  let dMin = dMinRaw;
  if (q !== 'none') {
    aMin = applyQuarterRound(aMin, q);
    dMin = applyQuarterRound(dMin, q);
  }

  let a;
  let b;

  let offLo = aMin;
  let offHi = aMax;
  let defLo = dMin;
  let defHi = dMax;

  if (mode === 'float') {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  } else if (mode === 'int') {
    a = randLegacyInt(aMin, aMax);
    b = randLegacyInt(dMin, dMax);
    offLo = Math.floor(aMin);
    offHi = Math.floor(aMax);
    defLo = Math.floor(dMin);
    defHi = Math.floor(dMax);
  } else if (mode === 'int_uniform') {
    const rA = intRange(aMin, aMax, 'int_uniform');
    const rB = intRange(dMin, dMax, 'int_uniform');
    a = randIntInclusive(rA.lo, rA.hi);
    b = randIntInclusive(rB.lo, rB.hi);
    offLo = rA.lo;
    offHi = rA.hi;
    defLo = rB.lo;
    defHi = rB.hi;
  } else if (mode === 'int_excl') {
    const rA = intRange(aMin, aMax, 'int_excl');
    const rB = intRange(dMin, dMax, 'int_excl');
    a = randIntInclusive(rA.lo, rA.hi);
    b = randIntInclusive(rB.lo, rB.hi);
    offLo = rA.lo;
    offHi = rA.hi;
    defLo = rB.lo;
    defHi = rB.hi;
  } else {
    a = randFloat(aMin, aMax);
    b = randFloat(dMin, dMax);
  }

  const diff = a - b;
  const res = ge ? diff >= 0 : diff > 0;

  if (ctx && ctx.enabled && meta) {
    const who = `${ctx.actorSide || '?'}->${ctx.targetSide || '?'}${ctx.isRet ? '(ret)' : ''}`;
    const wTag = meta.weaponSlot ? ` w${meta.weaponSlot}` : '';
    const wName = meta.weaponName ? `(${meta.weaponName})` : '';
    const kind = meta.kind || 'ROLL';

    const offStat = meta.offStat || 'off';
    const defStat = meta.defStat || 'def';

    const offNote = q !== 'none' ? `${fmtBound(aMinRaw)}→${fmtBound(aMin)}` : fmtBound(aMinRaw);
    const defNote = q !== 'none' ? `${fmtBound(dMinRaw)}→${fmtBound(dMin)}` : fmtBound(dMinRaw);

    const line =
      `RD ${kind} def="${ctx.matchName}" fight=${ctx.fight} turn=${ctx.turn} ${who}${wTag}${wName}` +
      ` | mode=${mode} q=${q} ge=${ge ? 1 : 0}` +
      ` | off=${offStat}=${off} offMin=${offNote} offMax=${fmtBound(aMax)} offLo=${fmtBound(offLo)} offHi=${fmtBound(offHi)}` +
      ` | def=${defStat}=${def} defMin=${defNote} defMax=${fmtBound(dMax)} defLo=${fmtBound(defLo)} defHi=${fmtBound(defHi)}` +
      ` | rolls: offRoll=${fmtBound(a)} defRoll=${fmtBound(b)} diff=${fmtBound(diff)} cmp=${cmp} => ${res ? 1 : 0}` +
      (meta.note ? ` | note=${meta.note}` : '');

    rollDumpPush(ctx, line);
  }

  return res;
}

function probUniformGreaterFloat(a0, a1, b0, b1) {
  const A = a1 - a0;
  const B = b1 - b0;
  if (A <= 0 || B <= 0) return a0 > b0 ? 1 : 0;

  const left = b0;
  const right = b1;

  const seg1_end = Math.min(right, a0);
  const seg2_start = Math.max(left, a0);
  const seg2_end = Math.min(right, a1);
  const seg3_start = Math.max(left, a1);

  let area = 0;

  if (seg1_end > left) area += (seg1_end - left) * 1;

  if (seg2_end > seg2_start) {
    const len = seg2_end - seg2_start;
    const part = (a1 * len - 0.5 * (seg2_end * seg2_end - seg2_start * seg2_start)) / A;
    area += part;
  }

  return area / (right - left);
}

function probUniformGreaterInt(a0, a1, b0, b1) {
  a0 = Math.floor(a0);
  a1 = Math.floor(a1);
  b0 = Math.floor(b0);
  b1 = Math.floor(b1);
  const A = a1 - a0 + 1;
  const B = b1 - b0 + 1;
  if (A <= 0 || B <= 0) return a0 > b0 ? 1 : 0;

  let wins = 0;
  for (let a = a0; a <= a1; a++) {
    const lo = b0;
    const hi = Math.min(b1, a - 1);
    if (hi >= lo) wins += hi - lo + 1;
  }
  return wins / (A * B);
}

function legacyIntWeights(min, max) {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  const span = max - min + 1;
  const k0 = Math.floor(min);
  const k1 = Math.floor(max);
  const n = k1 - k0 + 1;
  const ps = new Array(n);
  let s = 0;

  for (let i = 0; i < n; i++) {
    const k = k0 + i;
    const u0 = (k - min) / span;
    const u1 = (k + 1 - min) / span;
    const lo = Math.max(0, u0);
    const hi = Math.min(1, u1);
    const p = Math.max(0, hi - lo);
    ps[i] = p;
    s += p;
  }

  if (s <= 0) {
    ps.fill(0);
    ps[0] = 1;
    return { k0, k1, ps };
  }
  for (let i = 0; i < n; i++) ps[i] /= s;
  return { k0, k1, ps };
}

function probLegacyGreaterInt(a0, a1, b0, b1, ge = false) {
  const A = legacyIntWeights(a0, a1);
  const B = legacyIntWeights(b0, b1);

  const nB = B.ps.length;
  const pref = new Array(nB + 1);
  pref[0] = 0;
  for (let i = 0; i < nB; i++) pref[i + 1] = pref[i] + B.ps[i];

  let p = 0;
  for (let i = 0; i < A.ps.length; i++) {
    const x = A.k0 + i;

    let pY = 0;
    if (x < B.k0) {
      pY = 0;
    } else if (x > B.k1) {
      pY = 1;
    } else {
      const idx = x - B.k0;
      if (ge) {
        pY = pref[Math.min(idx + 1, nB)];
      } else {
        pY = pref[idx];
      }
    }

    p += A.ps[i] * pY;
  }
  return p;
}

function hitProb(acc, dodge, hitRollMode, ge = false, qround = 'none') {
  const mode = normalizeRollMode(hitRollMode);
  const q = normalizeQround(qround);

  let a0 = acc / 4;
  let a1 = acc;
  let b0 = dodge / 4;
  let b1 = dodge;

  if (q !== 'none') {
    a0 = applyQuarterRound(a0, q);
    b0 = applyQuarterRound(b0, q);
  }

  if (mode === 'int') return probLegacyGreaterInt(a0, a1, b0, b1, ge);
  if (mode === 'int_uniform') {
    const A = intRange(a0, a1, 'int_uniform');
    const B = intRange(b0, b1, 'int_uniform');
    return probLegacyGreaterInt(A.lo, A.hi, B.lo, B.hi, ge);
  }
  if (mode === 'int_excl') {
    const A = intRange(a0, a1, 'int_excl');
    const B = intRange(b0, b1, 'int_excl');
    return probLegacyGreaterInt(A.lo, A.hi, B.lo, B.hi, ge);
  }
  return probUniformGreaterFloat(a0, a1, b0, b1);
}

function skillProb(offSkill, defSkill, skillRollMode, ge = false, qround = 'none') {
  const mode = normalizeRollMode(skillRollMode);
  const q = normalizeQround(qround);

  let a0 = offSkill / 4;
  let a1 = offSkill;
  let b0 = defSkill / 4;
  let b1 = defSkill;

  if (q !== 'none') {
    a0 = applyQuarterRound(a0, q);
    b0 = applyQuarterRound(b0, q);
  }

  if (mode === 'int') return probLegacyGreaterInt(a0, a1, b0, b1, ge);
  if (mode === 'int_uniform') {
    const A = intRange(a0, a1, 'int_uniform');
    const B = intRange(b0, b1, 'int_uniform');
    return probLegacyGreaterInt(A.lo, A.hi, B.lo, B.hi, ge);
  }
  if (mode === 'int_excl') {
    const A = intRange(a0, a1, 'int_excl');
    const B = intRange(b0, b1, 'int_excl');
    return probLegacyGreaterInt(A.lo, A.hi, B.lo, B.hi, ge);
  }
  return probUniformGreaterFloat(a0, a1, b0, b1);
}

function exactDispChances(att, def, cfg) {
  const hitP = hitProb(att.acc, def.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround);
  const sk1P = skillProb(
    skillValue(att, att.w1.skill),
    def.defSk,
    cfg.skillRollMode,
    cfg.skillGe,
    cfg.skillQround,
  );
  const sk2P = att.w2
    ? skillProb(
        skillValue(att, att.w2.skill),
        def.defSk,
        cfg.skillRollMode,
        cfg.skillGe,
        cfg.skillQround,
      )
    : null;

  const dhitP = hitProb(def.acc, att.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround);
  const dsk1P = skillProb(
    skillValue(def, def.w1.skill),
    att.defSk,
    cfg.skillRollMode,
    cfg.skillGe,
    cfg.skillQround,
  );
  const dsk2P = def.w2
    ? skillProb(
        skillValue(def, def.w2.skill),
        att.defSk,
        cfg.skillRollMode,
        cfg.skillGe,
        cfg.skillQround,
      )
    : null;

  const A_hit = dispPct(hitP);
  const A_sk1 = dispPct(sk1P);
  const A_sk2 = sk2P === null ? 0 : dispPct(sk2P);

  const D_hit = dispPct(dhitP);
  const D_sk1 = dispPct(dsk1P);
  const D_sk2 = dsk2P === null ? 0 : dispPct(dsk2P);

  const A_all1 = dispPct(hitP * sk1P);
  const A_all2 = sk2P === null ? 0 : dispPct(hitP * sk2P);
  const D_all1 = dispPct(dhitP * dsk1P);
  const D_all2 = dsk2P === null ? 0 : dispPct(dhitP * dsk2P);

  const A_sk1_swap = sk2P === null ? 0 : dispPct(sk2P);
  const A_sk2_swap = sk2P === null ? 0 : dispPct(sk1P);
  const D_sk1_swap = dsk2P === null ? 0 : dispPct(dsk2P);
  const D_sk2_swap = dsk2P === null ? 0 : dispPct(dsk1P);

  const A_all1_swap = sk2P === null ? 0 : dispPct(hitP * sk2P);
  const A_all2_swap = sk2P === null ? 0 : dispPct(hitP * sk1P);
  const D_all1_swap = dsk2P === null ? 0 : dispPct(dhitP * dsk2P);
  const D_all2_swap = dsk2P === null ? 0 : dispPct(dhitP * dsk1P);

  return {
    A_hit,
    A_sk1,
    A_sk2,
    A_all1,
    A_all2,
    D_hit,
    D_sk1,
    D_sk2,
    D_all1,
    D_all2,
    A_sk1_swap,
    A_sk2_swap,
    A_all1_swap,
    A_all2_swap,
    D_sk1_swap,
    D_sk2_swap,
    D_all1_swap,
    D_all2_swap,
    A_hit_p: hitP,
    A_sk1_p: sk1P,
    A_sk2_p: sk2P ?? 0,
    D_hit_p: dhitP,
    D_sk1_p: dsk1P,
    D_sk2_p: dsk2P ?? 0,
  };
}

function rollDamage(min, max, dmgRollMode) {
  if (dmgRollMode === 'int') return randLegacyInt(min, max);
  return Math.round(randFloat(min, max));
}

function skillValue(att, skillCode) {
  return skillCode === 0 ? att.gun : skillCode === 1 ? att.mel : att.prj;
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

function predictMaxActionFromWeaponMax(w1Max, w2Max, level, armor, armorK, armorApply, armorRound) {
  const f = armorFactorForArmorValue(level, armor, armorK);
  const a1 = w1Max > 0 ? applyArmorAndRound(w1Max, f, armorRound) : 0;
  const a2 = w2Max > 0 ? applyArmorAndRound(w2Max, f, armorRound) : 0;
  if (armorApply === 'per_weapon') return a1 + a2;
  const sum = (w1Max || 0) + (w2Max || 0);
  return sum > 0 ? applyArmorAndRound(sum, f, armorRound) : 0;
}

function predictPosActionRangeFromWeaponMinMax(
  w1Min,
  w1Max,
  w2Min,
  w2Max,
  level,
  armor,
  armorK,
  armorApply,
  armorRound,
) {
  const f = armorFactorForArmorValue(level, armor, armorK);
  const p1Min = w1Min > 0 ? applyArmorAndRound(w1Min, f, armorRound) : 0;
  const p2Min = w2Min > 0 ? applyArmorAndRound(w2Min, f, armorRound) : 0;
  const mins = [];
  if (p1Min > 0) mins.push(p1Min);
  if (p2Min > 0) mins.push(p2Min);
  const predMin = mins.length ? Math.min(...mins) : 0;
  const predMax = predictMaxActionFromWeaponMax(
    w1Max || 0,
    w2Max || 0,
    level,
    armor,
    armorK,
    armorApply,
    armorRound,
  );
  return { min: predMin, max: predMax };
}

function predictMinActionFromWeaponMin(w1Min, w2Min, level, armor, armorK, armorApply, armorRound) {
  const f = armorFactorForArmorValue(level, armor, armorK);
  const a1 = w1Min > 0 ? applyArmorAndRound(w1Min, f, armorRound) : 0;
  const a2 = w2Min > 0 ? applyArmorAndRound(w2Min, f, armorRound) : 0;
  if (armorApply === 'per_weapon') return a1 + a2;
  const sum = (w1Min || 0) + (w2Min || 0);
  return sum > 0 ? applyArmorAndRound(sum, f, armorRound) : 0;
}

function solveImpliedArmorForTargetMax(opts) {
  const w1Max = opts.w1Max || 0;
  const w2Max = opts.w2Max || 0;
  const level = opts.level || 80;
  const armorK = opts.armorK;
  const armorApply = opts.armorApply || 'per_weapon';
  const armorRound = opts.armorRound || 'round';
  const targetMax = Number(opts.targetMax) || 0;
  const searchMax = Math.max(200, Number(opts.searchMax) || 800);

  let bestArmor = 0;
  let bestPred = 0;
  let bestErr = 1e9;

  for (let armor = 0; armor <= searchMax; armor++) {
    const pred = predictMaxActionFromWeaponMax(
      w1Max,
      w2Max,
      level,
      armor,
      armorK,
      armorApply,
      armorRound,
    );
    const err = Math.abs(pred - targetMax);
    if (err < bestErr) {
      bestErr = err;
      bestArmor = armor;
      bestPred = pred;
      if (bestErr === 0) break;
    }
  }

  return { armor: bestArmor, pred: bestPred, err: bestErr, target: targetMax };
}

function solveImpliedKForTargetMax(opts) {
  const w1Max = opts.w1Max || 0;
  const w2Max = opts.w2Max || 0;
  const level = opts.level || 80;
  const armor = opts.armor || 0;
  const armorApply = opts.armorApply || 'per_weapon';
  const armorRound = opts.armorRound || 'round';
  const targetMax = Number(opts.targetMax) || 0;
  const kLo = Number.isFinite(Number(opts.kLo)) ? Number(opts.kLo) : 1;
  const kHi = Number.isFinite(Number(opts.kHi)) ? Number(opts.kHi) : 20;
  const kStep = Number.isFinite(Number(opts.kStep)) ? Number(opts.kStep) : 0.01;

  let bestK = kLo;
  let bestPred = 0;
  let bestErr = 1e9;

  for (let k = kLo; k <= kHi + 1e-12; k += kStep) {
    const pred = predictMaxActionFromWeaponMax(
      w1Max,
      w2Max,
      level,
      armor,
      k,
      armorApply,
      armorRound,
    );
    const err = Math.abs(pred - targetMax);
    if (err < bestErr) {
      bestErr = err;
      bestK = k;
      bestPred = pred;
      if (bestErr === 0) break;
    }
  }
  return { k: bestK, pred: bestPred, err: bestErr, target: targetMax };
}

function mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx) {
  if (w1SkillIdx === null || w2SkillIdx === null) return [1, 1];
  return w1SkillIdx === w2SkillIdx ? [1, 1] : [2, 2];
}

let CrystalDefs = {
  'Abyss Crystal': { pct: { armor: 0.05, dodge: 0.04, speed: 0.1, defSkill: 0.05 } },
  'Perfect Pink Crystal': { pct: { defSkill: 0.2 } },
  'Perfect Orange Crystal': { pct: { meleeSkill: 0.2 } },
  'Perfect Green Crystal': { pct: { gunSkill: 0.2 } },
  'Perfect Yellow Crystal': { pct: { projSkill: 0.2 } },
  'Amulet Crystal': {
    pct: {
      accuracy: 0.06,
      damage: 0.06,
      gunSkill: 0.1,
      meleeSkill: 0.1,
      projSkill: 0.1,
      defSkill: 0.1,
    },
  },
  'Perfect Fire Crystal': { pct: { damage: 0.1 } },
  'Cabrusion Crystal': { pct: { damage: 0.07, defSkill: 0.07, armor: 0.09, speed: 0.09 } },
};

let UpgradeDefs = {
  'Faster Reload 4': { pct: { accuracy: 0.05, damage: 0.05 } },
  'Enhanced Scope 4': { pct: { accuracy: 0.1 } },
  'Faster Ammo 4': { pct: { damage: 0.2 } },
  'Tracer Rounds 4': { pct: { accuracy: 0.15, damage: 0.05 } },
  'Laser Sight': { pct: { accuracy: 0.14 } },
  'Poisoned Tip': { pct: { damage: 0.1 } },
};

let ItemDefs = {
  'SG1 Armor': { type: 'Armor', flatStats: { armor: 70, dodge: 75, speed: 65, defSkill: 90 } },
  'Dark Legion Armor': {
    type: 'Armor',
    flatStats: { armor: 65, dodge: 90, speed: 65, defSkill: 60 },
  },
  'Hellforged Armor': {
    type: 'Armor',
    flatStats: { armor: 115, dodge: 65, speed: 55, defSkill: 55 },
  },

  'Crystal Maul': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  'Core Staff': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 75, accuracy: 55, meleeSkill: 110, defSkill: 50 },
    baseWeaponDamage: { min: 50, max: 60 },
  },
  'Void Axe': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 78, accuracy: 44, meleeSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 68, max: 96 },
  },
  'Scythe T2': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 75, accuracy: 42, meleeSkill: 65, defSkill: 18 },
    baseWeaponDamage: { min: 80, max: 101 },
  },
  'Void Sword': {
    type: 'Weapon',
    skillType: 'meleeSkill',
    flatStats: { speed: 60, accuracy: 35, meleeSkill: 40, defSkill: 5 },
    baseWeaponDamage: { min: 90, max: 120 },
  },

  'Split Crystal Bombs T2': {
    type: 'Weapon',
    skillType: 'projSkill',
    flatStats: { speed: 79, accuracy: 23, projSkill: 84, defSkill: 80 },
    baseWeaponDamage: { min: 55, max: 87 },
  },
  'Void Bow': {
    type: 'Weapon',
    skillType: 'projSkill',
    flatStats: { speed: 70, accuracy: 48, projSkill: 60, defSkill: 20 },
    baseWeaponDamage: { min: 10, max: 125 },
    upgradeSlots: [['Laser Sight', 'Poisoned Tip']],
  },

  'Rift Gun': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { speed: 50, accuracy: 85, gunSkill: 85, defSkill: 5 },
    baseWeaponDamage: { min: 60, max: 65 },
  },
  'Double Barrel Sniper Rifle': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { accuracy: 95 },
    baseWeaponDamage: { min: 95, max: 105 },
  },
  'Q15 Gun': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { speed: 120, accuracy: 42, gunSkill: 48, defSkill: 31 },
    baseWeaponDamage: { min: 82, max: 95 },
  },
  'Bio Gun Mk4': {
    type: 'Weapon',
    skillType: 'gunSkill',
    flatStats: { accuracy: 47, speed: 50, defSkill: 15, gunSkill: 42 },
    baseWeaponDamage: { min: 76, max: 91 },
    upgradeSlots: [
      ['Faster Reload 4', 'Enhanced Scope 4'],
      ['Faster Ammo 4', 'Tracer Rounds 4'],
    ],
  },

  'Bio Spinal Enhancer': {
    type: 'Misc',
    flatStats: {
      dodge: 1,
      accuracy: 1,
      gunSkill: 65,
      meleeSkill: 65,
      projSkill: 65,
      defSkill: 65,
    },
  },
  'Scout Drones': {
    type: 'Misc',
    flatStats: {
      dodge: 5,
      accuracy: 32,
      gunSkill: 30,
      meleeSkill: 30,
      projSkill: 50,
      defSkill: 30,
    },
  },
  'Droid Drone': {
    type: 'Misc',
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 40, meleeSkill: 60 },
  },
  'Orphic Amulet': {
    type: 'Misc',
    flatStats: { speed: 20, accuracy: 20, gunSkill: 70, meleeSkill: 70, projSkill: 70 },
  },
  'Projector Bots': {
    type: 'Misc',
    flatStats: {
      dodge: 25,
      accuracy: 10,
      gunSkill: 5,
      meleeSkill: 15,
      projSkill: 40,
      defSkill: 40,
    },
  },
  'Recon Drones': {
    type: 'Misc',
    flatStats: { dodge: 14, accuracy: 14, gunSkill: 60, projSkill: 40 },
  },
};

// Prefer external shared defs (single source of truth), if present.
// This keeps canonical and brute-force aligned without duplicating tables.
try {
  const defs = require('./legacy-defs.js');
  const extCrystal = defs && (defs.CrystalDefs || defs.crystalDefs);
  const extUpgrade = defs && (defs.UpgradeDefs || defs.upgradeDefs);
  const extItem = defs && (defs.ItemDefs || defs.itemDefs);
  if (extCrystal && typeof extCrystal === 'object') CrystalDefs = extCrystal;
  if (extUpgrade && typeof extUpgrade === 'object') UpgradeDefs = extUpgrade;
  if (extItem && typeof extItem === 'object') ItemDefs = extItem;
} catch (_) {
  // no-op
}

const HF_ARMOR_BASE_OVERRIDE = Number(pickEnv('LEGACY_HF_ARMOR_BASE_OVERRIDE', ''));
if (Number.isFinite(HF_ARMOR_BASE_OVERRIDE) && HF_ARMOR_BASE_OVERRIDE > 0) {
  if (ItemDefs['Hellforged Armor'] && ItemDefs['Hellforged Armor'].flatStats) {
    ItemDefs['Hellforged Armor'].flatStats.armor = Math.floor(HF_ARMOR_BASE_OVERRIDE);
  }
}

const VOID_SWORD_BASE_MIN_OVERRIDE = Number(pickEnv('LEGACY_VOID_SWORD_BASE_MIN_OVERRIDE', ''));
const VOID_SWORD_BASE_MAX_OVERRIDE = Number(pickEnv('LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE', ''));
if (ItemDefs['Void Sword'] && ItemDefs['Void Sword'].baseWeaponDamage) {
  if (Number.isFinite(VOID_SWORD_BASE_MIN_OVERRIDE) && VOID_SWORD_BASE_MIN_OVERRIDE > 0) {
    ItemDefs['Void Sword'].baseWeaponDamage.min = Math.floor(VOID_SWORD_BASE_MIN_OVERRIDE);
  }
  if (Number.isFinite(VOID_SWORD_BASE_MAX_OVERRIDE) && VOID_SWORD_BASE_MAX_OVERRIDE > 0) {
    ItemDefs['Void Sword'].baseWeaponDamage.max = Math.floor(VOID_SWORD_BASE_MAX_OVERRIDE);
  }
  if (ItemDefs['Void Sword'].baseWeaponDamage.min > ItemDefs['Void Sword'].baseWeaponDamage.max) {
    const t = ItemDefs['Void Sword'].baseWeaponDamage.min;
    ItemDefs['Void Sword'].baseWeaponDamage.min = ItemDefs['Void Sword'].baseWeaponDamage.max;
    ItemDefs['Void Sword'].baseWeaponDamage.max = t;
  }
}

const BASE = {
  level: DEFAULTS.LEVEL,
  hp: DEFAULTS.HP_MAX,
  speed: 60,
  armor: 5, // Resilience (+5 armor) baked in here
  accuracy: 14,
  dodge: 14,
  gunSkill: 450,
  meleeSkill: 450,
  projSkill: 450,
  defSkill: 450,
  tacticsVal: 5,
};

const DISP_ROUND = pickEnv('LEGACY_DISP_ROUND', 'floor');
const EXACT_VERBOSE = yn(pickEnv('LEGACY_EXACT_VERBOSE', '0'));
const EXACT_SWAP = yn(pickEnv('LEGACY_EXACT_SWAP', '1'));
const ACTION_STOP_ON_KILL = yn(pickEnv('LEGACY_ACTION_STOP_ON_KILL', '0'));
const GAME_TRIALS = Math.max(0, parseInt(pickEnv('LEGACY_GAME_TRIALS', '10000'), 10) || 0);

function dispPct(prob01, mode = DISP_ROUND) {
  const v = prob01 * 100;
  if (mode === 'floor') return Math.floor(v);
  if (mode === 'ceil') return Math.ceil(v);
  return Math.round(v);
}

function roundStat(x, mode) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'round') return Math.round(x);
  return Math.ceil(x); // default ceil
}
function roundWeaponDmg(x, mode) {
  if (mode === 'floor') return Math.floor(x);
  if (mode === 'round') return Math.round(x);
  return Math.ceil(x); // default ceil
}

function normalizeCrystalStackMode(m) {
  m = String(m || 'sum4')
    .trim()
    .toLowerCase();
  if (m === 'iter' || m === 'iter4' || m === 'per_crystal' || m === 'percrystal') return 'iter4';
  return 'sum4';
}

function applyCrystalPctToStat(base, pctPerCrystal, n, roundMode, stackMode) {
  base = Number(base) || 0;
  pctPerCrystal = Number(pctPerCrystal) || 0;
  n = Math.max(0, n | 0);
  stackMode = normalizeCrystalStackMode(stackMode);

  let x = base;
  if (pctPerCrystal <= 0 || n <= 0 || x === 0) return x;

  if (stackMode === 'iter4') {
    for (let i = 0; i < n; i++) x = x + roundStat(x * pctPerCrystal, roundMode);
    return x;
  }
  return x + roundStat(x * (pctPerCrystal * n), roundMode);
}

function applyCrystalPctToWeaponDmg(base, pctPerCrystal, n, weaponRoundMode, stackMode) {
  base = Number(base) || 0;
  pctPerCrystal = Number(pctPerCrystal) || 0;
  n = Math.max(0, n | 0);
  stackMode = normalizeCrystalStackMode(stackMode);

  let x = base;
  if (pctPerCrystal <= 0 || n <= 0 || x === 0) return x;

  if (stackMode === 'iter4') {
    for (let i = 0; i < n; i++) x = roundWeaponDmg(x * (1 + pctPerCrystal), weaponRoundMode);
    return x;
  }
  return roundWeaponDmg(x * (1 + pctPerCrystal * n), weaponRoundMode);
}

function computeVariant(itemName, crystalName, upgrades = [], cfg, slotTag = 0) {
  const idef = ItemDefs[itemName];
  const cdef = CrystalDefs[crystalName];
  if (!idef) throw new Error(`Unknown item: ${itemName}`);
  if (!cdef) throw new Error(`Unknown crystal: ${crystalName}`);

  const crystalPctRaw = cdef.pct || {};
  const crystalPct = { ...crystalPctRaw };

  const upgradePct = {};

  if (upgrades && upgrades.length) {
    for (const u of upgrades) {
      if (!u || u === 'None') continue;
      const udef = UpgradeDefs[u];
      if (!udef) throw new Error(`Unknown upgrade "${u}" on item "${itemName}"`);
      const up = udef.pct || {};
      for (const k of Object.keys(up)) upgradePct[k] = (upgradePct[k] || 0) + (up[k] || 0);
    }
  }

  // Validate chosen upgrades against ItemDefs upgradeSlots (if present).
  // This keeps manual payload edits honest (e.g. Void Bow has 1 slot: Laser Sight OR Poisoned Tip).
  const chosenUpgrades = (upgrades || []).filter((u) => u && u !== 'None');
  if (chosenUpgrades.length) {
    if (!idef.upgradeSlots || !idef.upgradeSlots.length) {
      throw new Error(
        `Item "${itemName}" does not support upgrades but got: ${chosenUpgrades.join(', ')}`,
      );
    }
    if (chosenUpgrades.length > idef.upgradeSlots.length) {
      throw new Error(
        `Too many upgrades on item "${itemName}": chose ${chosenUpgrades.length} but item has ${idef.upgradeSlots.length} slot(s)`,
      );
    }
    const taken = new Array(idef.upgradeSlots.length).fill(false);
    for (const u of chosenUpgrades) {
      let ok = false;
      for (let si = 0; si < idef.upgradeSlots.length; si++) {
        const slot = idef.upgradeSlots[si];
        if (!taken[si] && Array.isArray(slot) && slot.includes(u)) {
          taken[si] = true;
          ok = true;
          break;
        }
      }
      if (!ok) {
        throw new Error(
          `Upgrade "${u}" not allowed for item "${itemName}" (allowed slots: ${JSON.stringify(
            idef.upgradeSlots,
          )})`,
        );
      }
    }
  }

  if (
    idef.type === 'Misc' &&
    MISC_NO_CRYSTAL_SKILL.has(itemName) &&
    MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.size
  ) {
    const mg = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('gun');
    if (mg !== undefined) crystalPct.gunSkill = (crystalPct.gunSkill || 0) * mg;

    const mm = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('melee');
    if (mm !== undefined) crystalPct.meleeSkill = (crystalPct.meleeSkill || 0) * mm;

    const mp = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('proj');
    if (mp !== undefined) crystalPct.projSkill = (crystalPct.projSkill || 0) * mp;

    const md = MISC_NO_CRYSTAL_SKILL_TYPE_MULTS.get('def');
    if (md !== undefined) crystalPct.defSkill = (crystalPct.defSkill || 0) * md;
  }

  if (
    slotTag === 2 &&
    idef.type === 'Misc' &&
    MISC_NO_CRYSTAL_SKILL.has(itemName) &&
    MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.size
  ) {
    const mg2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('gun');
    if (mg2 !== undefined) crystalPct.gunSkill = (crystalPct.gunSkill || 0) * mg2;

    const mm2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('melee');
    if (mm2 !== undefined) crystalPct.meleeSkill = (crystalPct.meleeSkill || 0) * mm2;

    const mp2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('proj');
    if (mp2 !== undefined) crystalPct.projSkill = (crystalPct.projSkill || 0) * mp2;

    const md2 = MISC_NO_CRYSTAL_SKILL_SLOT2_TYPE_MULTS.get('def');
    if (md2 !== undefined) crystalPct.defSkill = (crystalPct.defSkill || 0) * md2;
  }

  const fs = idef.flatStats || {};
  const statRound = cfg.statRound;
  const nCrystals = cfg.crystalSlots || 4;
  const stackModeStats = cfg.crystalStackStats || 'sum4';

  function applyStat(base, crystalKey, upgradeKey) {
    const rMode = crystalKey === 'armor' ? cfg.armorStatRound || statRound : statRound;
    const sMode = crystalKey === 'armor' ? cfg.armorStatStack || stackModeStats : stackModeStats;
    const nLocal =
      crystalKey === 'armor'
        ? Number.isFinite(Number(cfg.armorStatSlots))
          ? Math.max(0, Number(cfg.armorStatSlots) | 0)
          : nCrystals
        : nCrystals;
    let x = applyCrystalPctToStat(base || 0, crystalPct[crystalKey] || 0, nLocal, rMode, sMode);
    const up = upgradePct[upgradeKey];
    if (up) x = x + roundStat(x * up, statRound);
    return x;
  }

  const addSpeed = applyStat(fs.speed || 0, 'speed', 'speed');
  const addAcc = applyStat(fs.accuracy || 0, 'accuracy', 'accuracy');
  const addDod = applyStat(fs.dodge || 0, 'dodge', 'dodge');

  const addGun = applyStat(fs.gunSkill || 0, 'gunSkill', 'gunSkill');
  const addMel = applyStat(fs.meleeSkill || 0, 'meleeSkill', 'meleeSkill');
  const addPrj = applyStat(fs.projSkill || 0, 'projSkill', 'projSkill');
  const addDef = applyStat(fs.defSkill || 0, 'defSkill', 'defSkill');

  const addArmStat = applyStat(fs.armor || 0, 'armor', 'armor');

  let weapon = null;
  if (idef.baseWeaponDamage) {
    const wRound = cfg.weaponDmgRound;
    const nCrystals = cfg.crystalSlots || 4;
    const stackModeDmg = cfg.crystalStackDmg || 'sum4';

    let min = applyCrystalPctToWeaponDmg(
      idef.baseWeaponDamage.min,
      crystalPct.damage || 0,
      nCrystals,
      wRound,
      stackModeDmg,
    );
    let max = applyCrystalPctToWeaponDmg(
      idef.baseWeaponDamage.max,
      crystalPct.damage || 0,
      nCrystals,
      wRound,
      stackModeDmg,
    );

    const upDmg = upgradePct.damage || 0;
    if (upDmg) {
      min = roundWeaponDmg(min * (1 + upDmg), wRound);
      max = roundWeaponDmg(max * (1 + upDmg), wRound);
    }

    const skill = idef.skillType === 'gunSkill' ? 0 : idef.skillType === 'meleeSkill' ? 1 : 2;
    weapon = { name: itemName, min, max, skill };
  }

  const u1 = upgrades && upgrades[0] ? upgrades[0] : null;
  const u2 = upgrades && upgrades[1] ? upgrades[1] : null;

  return {
    itemName,
    crystalName,
    upgrades: [u1, u2].filter(Boolean),

    addSpeed,
    addAcc,
    addDod,
    addGun,
    addMel,
    addPrj,
    addDef,
    addArmStat,
    weapon,
  };
}

function compileCombatantFromParts({ name, stats, armorV, w1V, w2V, m1V, m2V, cfg, role }) {
  const level = Math.floor(Number(stats.level));
  const hp = Math.floor(Number(stats.hp));

  const baseSpeed = Math.floor(Number(stats.speed));
  const baseAcc = Math.floor(Number(stats.accuracy));
  const baseDod = Math.floor(Number(stats.dodge));

  const speed =
    baseSpeed + armorV.addSpeed + w1V.addSpeed + w2V.addSpeed + m1V.addSpeed + m2V.addSpeed;
  const acc = baseAcc + armorV.addAcc + w1V.addAcc + w2V.addAcc + m1V.addAcc + m2V.addAcc;
  const dodge = baseDod + armorV.addDod + w1V.addDod + w2V.addDod + m1V.addDod + m2V.addDod;

  const w1SkillIdx = w1V.weapon ? w1V.weapon.skill : null;
  const w2SkillIdx = w2V.weapon ? w2V.weapon.skill : null;
  const [w1Mult, w2Mult] = mixedWeaponMultsFromWeaponSkill(w1SkillIdx, w2SkillIdx);

  const w1Gun = w1V.addGun * (w1SkillIdx === 0 ? w1Mult : 1);
  const w2Gun = w2V.addGun * (w2SkillIdx === 0 ? w2Mult : 1);
  const w1Mel = w1V.addMel * (w1SkillIdx === 1 ? w1Mult : 1);
  const w2Mel = w2V.addMel * (w2SkillIdx === 1 ? w2Mult : 1);
  const w1Prj = w1V.addPrj * (w1SkillIdx === 2 ? w1Mult : 1);
  const w2Prj = w2V.addPrj * (w2SkillIdx === 2 ? w2Mult : 1);

  const gun = BASE.gunSkill + armorV.addGun + w1Gun + w2Gun + m1V.addGun + m2V.addGun;
  const mel = BASE.meleeSkill + armorV.addMel + w1Mel + w2Mel + m1V.addMel + m2V.addMel;
  const prj = BASE.projSkill + armorV.addPrj + w1Prj + w2Prj + m1V.addPrj + m2V.addPrj;

  const defSk = BASE.defSkill + armorV.addDef + w1V.addDef + w2V.addDef + m1V.addDef + m2V.addDef;

  const armor = BASE.armor + armorV.addArmStat;
  const armorFactor = armorFactorForArmorValue(level, armor, cfg.armorK);

  const tacticsVal = cfg.tacticsVal;
  const tacticsMode = cfg.tacticsMode;

  function applyMinMax(w) {
    if (!w) return null;
    if (tacticsMode === 'minmax' || tacticsMode === 'both') {
      return { ...w, min: w.min + tacticsVal, max: w.max + tacticsVal };
    }
    return w;
  }

  const c = {
    name,
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
    w1: applyMinMax(w1V.weapon),
    w2: applyMinMax(w2V.weapon),
    weapon1: applyMinMax(w1V.weapon),
    weapon2: applyMinMax(w2V.weapon),
  };

  c.weapon1 = c.w1;
  c.weapon2 = c.w2;

  if (cfg && cfg.diagArmor) {
    c.__meta = {
      armor: { itemName: armorV.itemName, crystalName: armorV.crystalName },
      w1: { itemName: w1V.itemName, crystalName: w1V.crystalName },
      w2: { itemName: w2V.itemName, crystalName: w2V.crystalName },
      m1: { itemName: m1V.itemName, crystalName: m1V.crystalName },
      m2: { itemName: m2V.itemName, crystalName: m2V.crystalName },
    };
  }

  applyHiddenRoleBonuses(c, role, cfg);
  return c;
}

function applyHiddenRoleBonuses(c, role, cfg) {
  if (!cfg || !cfg.hiddenPreset || cfg.hiddenPreset === 'none') return c;

  const wCount = c.weapon1 && c.weapon2 ? 2 : c.weapon1 || c.weapon2 ? 1 : 0;
  if (!wCount) return c;

  if (cfg.hiddenPreset === 'slot3') {
    if (role === 'A') {
      c.defSk += 3 * wCount;
    } else if (role === 'D') {
      c.acc += 3 * wCount;
      c.defSk += 3 * wCount;
    }
  } else if (cfg.hiddenPreset === 'slot3_prjdef') {
    const prjCount =
      (c.weapon1 && c.weapon1.skill === 2 ? 1 : 0) + (c.weapon2 && c.weapon2.skill === 2 ? 1 : 0);

    if (role === 'A') {
      c.defSk += 3 * wCount;
    } else if (role === 'D') {
      c.acc += 3 * prjCount;
      c.defSk += 3 * prjCount;
    }
  }

  return c;
}

let DEFENDER_PAYLOADS;
try {
  DEFENDER_PAYLOADS = require(path.resolve(__dirname, USER_CONFIG.defenders.file));
} catch (e) {
  // Fallback for older repos that still have the original filename.
  DEFENDER_PAYLOADS = require(path.resolve(__dirname, './legacy-defenders.js'));
}

// --- Defender name aliases / backwards-compat ---
// Important: don't overwrite an existing canonical payload with undefined.
// The shared defender-payloads file uses "Dual Bow Build 1" and "Rift Bow Build 1",
// while some older scripts used "Dual Bow Build" and "Bow/rift build".
if (!DEFENDER_PAYLOADS['SG1 Split Bombs T2'] && DEFENDER_PAYLOADS['SG1 Split bombs']) {
  DEFENDER_PAYLOADS['SG1 Split Bombs T2'] = DEFENDER_PAYLOADS['SG1 Split bombs'];
}

if (!DEFENDER_PAYLOADS['Dual Bow Build'] && DEFENDER_PAYLOADS['Dual Bow Build 1']) {
  DEFENDER_PAYLOADS['Dual Bow Build'] = DEFENDER_PAYLOADS['Dual Bow Build 1'];
}
if (!DEFENDER_PAYLOADS['Dual Bow Build 1'] && DEFENDER_PAYLOADS['Dual Bow Build']) {
  DEFENDER_PAYLOADS['Dual Bow Build 1'] = DEFENDER_PAYLOADS['Dual Bow Build'];
}

if (!DEFENDER_PAYLOADS['Bow/rift build'] && DEFENDER_PAYLOADS['Rift Bow Build 1']) {
  DEFENDER_PAYLOADS['Bow/rift build'] = DEFENDER_PAYLOADS['Rift Bow Build 1'];
}
if (!DEFENDER_PAYLOADS['Rift Bow Build 1'] && DEFENDER_PAYLOADS['Bow/rift build']) {
  DEFENDER_PAYLOADS['Rift Bow Build 1'] = DEFENDER_PAYLOADS['Bow/rift build'];
}

const _DEFENDER_NAME_INDEX = buildNameIndex(DEFENDER_PAYLOADS);
function resolveDefenderName(raw) {
  return resolveKeyOrNull(raw, DEFENDER_PAYLOADS, _DEFENDER_NAME_INDEX);
}

const DEFENDER_PRIORITY = [
  'DL Gun Build 3',
  'SG1 Split bombs',
  'T2 Scythe/Cstaff',
  'DL Gun Build 4',
  'DL Gun Build 2',
  'DL Gun Build 7',
  'Core/Void Build 1',
  'T2 Scythe Build',
  'HF Core/Void',
  'DL Gun Build 3.1',
];

const GAME_BASELINES = {
  'DL Gun Build': {
    winPct: 78.79,
    avgTurns: 11.0966,
    A_hit: 79,
    A_dmg1: 63,
    A_dmg2: 63,
    D_hit: 87,
    D_dmg1: 28,
    D_dmg2: 28,
    A_rng: [50, 164],
    D_rng: [59, 183],
  },
  'DL Gun Build 2': {
    winPct: 68.99,
    avgTurns: 11.5905,
    A_hit: 79,
    A_dmg1: 60,
    A_dmg2: 60,
    D_hit: 79,
    D_dmg1: 32,
    D_dmg2: 32,
    A_rng: [50, 164],
    D_rng: [59, 171],
  },
  'DL Gun Build 3': {
    winPct: 50.27,
    avgTurns: 10.2423,
    A_hit: 82,
    A_dmg1: 59,
    A_dmg2: 59,
    D_hit: 72,
    D_dmg1: 45,
    D_dmg2: 45,
    A_rng: [50, 164],
    D_rng: [59, 183],
  },
  'DL Gun Build 4': {
    winPct: 60.78,
    avgTurns: 16.0125,
    A_hit: 82,
    A_dmg1: 41,
    A_dmg2: 41,
    D_hit: 54,
    D_dmg1: 36,
    D_dmg2: 36,
    A_rng: [50, 164],
    D_rng: [59, 171],
  },
  'DL Gun Build 5': {
    winPct: 88.73,
    avgTurns: 9.3339,
    A_hit: 79,
    A_dmg1: 63,
    A_dmg2: 63,
    D_hit: 90,
    D_dmg1: 28,
    D_dmg2: 28,
    A_rng: [50, 164],
    D_rng: [59, 183],
  },
  'DL Gun Build 6': {
    winPct: 79.35,
    avgTurns: 9.7661,
    A_hit: 79,
    A_dmg1: 60,
    A_dmg2: 60,
    D_hit: 84,
    D_dmg1: 32,
    D_dmg2: 32,
    A_rng: [50, 164],
    D_rng: [59, 171],
  },
  'DL Gun Build 7': {
    winPct: 62.16,
    avgTurns: 8.8451,
    A_hit: 82,
    A_dmg1: 59,
    A_dmg2: 59,
    D_hit: 79,
    D_dmg1: 45,
    D_dmg2: 45,
    A_rng: [50, 164],
    D_rng: [59, 183],
  },
  'DL Gun Build 8': {
    winPct: 59.28,
    avgTurns: 13.033,
    A_hit: 82,
    A_dmg1: 41,
    A_dmg2: 41,
    D_hit: 66,
    D_dmg1: 36,
    D_dmg2: 36,
    A_rng: [50, 164],
    D_rng: [59, 171],
  },
  'Core/Void Build 1': {
    winPct: 62.45,
    avgTurns: 12.2149,
    A_hit: 79,
    A_dmg1: 55,
    A_dmg2: 55,
    D_hit: 68,
    D_dmg1: 35,
    D_dmg2: 35,
    A_rng: [50, 164],
    D_rng: [49, 194],
  },
  'Dual Bow Build 1': {
    winPct: 72.1,
    avgTurns: 12.1616,
    A_hit: 79,
    A_dmg1: 57,
    A_dmg2: 57,
    D_hit: 73,
    D_dmg1: 40,
    D_dmg2: 40,
    A_rng: [50, 164],
    D_rng: [10, 242],
  },
  'Rift Bow Build 1': {
    winPct: 69.28,
    avgTurns: 11.6384,
    A_hit: 79,
    A_dmg1: 60,
    A_dmg2: 60,
    D_hit: 82,
    D_dmg1: 40,
    D_dmg2: 40,
    A_rng: [50, 164],
    D_rng: [10, 185],
  },
  'T2 Scythe Build': {
    winPct: 61.39,
    avgTurns: 12.6685,
    A_hit: 81,
    A_dmg1: 52,
    A_dmg2: 52,
    D_hit: 56,
    D_dmg1: 39,
    D_dmg2: 39,
    A_rng: [50, 164],
    D_rng: [78, 198],
  },
  'SG1 Split bombs': {
    winPct: 48.0,
    avgTurns: 16.9372,
    A_hit: 85,
    A_dmg1: 36,
    A_dmg2: 36,
    D_hit: 51,
    D_dmg1: 45,
    D_dmg2: 45,
    A_rng: [49, 161],
    D_rng: [54, 170],
  },
  'HF Core/Void': {
    winPct: 58.01,
    avgTurns: 12.6552,
    A_hit: 93,
    A_dmg1: 55,
    A_dmg2: 55,
    D_hit: 68,
    D_dmg1: 35,
    D_dmg2: 35,
    A_rng: [40, 133],
    D_rng: [49, 194],
  },
  'Armour stack Cores': {
    winPct: 52.51,
    avgTurns: 16.0628,
    A_hit: 93,
    A_dmg1: 44,
    A_dmg2: 44,
    D_hit: 72,
    D_dmg1: 44,
    D_dmg2: 44,
    A_rng: [40, 133],
    D_rng: [49, 118],
  },
  'MAUL_CSTAFF|SG1 Split Bombs T2': {
    winPct: 59.02,
    avgTurns: 15.9441,
    A_hit: 82,
    A_dmg1: 38,
    A_dmg2: 38,
    D_hit: 41,
    D_dmg1: 56,
    D_dmg2: 56,
    A_rng: [49, 178],
    D_rng: [54, 170],
  },
  'MAUL_CSTAFF|DL Gun Build': {
    winPct: 65.62,
    avgTurns: 9.993,
    A_hit: 75,
    A_dmg1: 65,
    A_dmg2: 65,
    D_hit: 81,
    D_dmg1: 38,
    D_dmg2: 38,
    A_rng: [50, 180],
    D_rng: [59, 183],
  },
  'MAUL_CSTAFF|DL Gun Build 2': {
    winPct: 56.14,
    avgTurns: 10.4951,
    A_hit: 75,
    A_dmg1: 62,
    A_dmg2: 62,
    D_hit: 71,
    D_dmg1: 43,
    D_dmg2: 43,
    A_rng: [50, 180],
    D_rng: [59, 171],
  },
  'MAUL_CSTAFF|DL Gun Build 3': {
    winPct: 46.61,
    avgTurns: 9.3781,
    A_hit: 78,
    A_dmg1: 61,
    A_dmg2: 61,
    D_hit: 63,
    D_dmg1: 56,
    D_dmg2: 56,
    A_rng: [50, 180],
    D_rng: [59, 183],
  },
  'MAUL_CSTAFF|DL Gun Build 4': {
    winPct: 64.44,
    avgTurns: 14.9005,
    A_hit: 78,
    A_dmg1: 43,
    A_dmg2: 43,
    D_hit: 43,
    D_dmg1: 47,
    D_dmg2: 47,
    A_rng: [50, 180],
    D_rng: [59, 171],
  },
  'MAUL_CSTAFF|DL Gun Build 5': {
    winPct: 78.41,
    avgTurns: 8.5644,
    A_hit: 75,
    A_dmg1: 65,
    A_dmg2: 65,
    D_hit: 85,
    D_dmg1: 38,
    D_dmg2: 38,
    A_rng: [50, 180],
    D_rng: [59, 183],
  },
  'MAUL_CSTAFF|DL Gun Build 6': {
    winPct: 66.41,
    avgTurns: 8.9786,
    A_hit: 75,
    A_dmg1: 62,
    A_dmg2: 62,
    D_hit: 78,
    D_dmg1: 43,
    D_dmg2: 43,
    A_rng: [50, 180],
    D_rng: [59, 171],
  },
  'MAUL_CSTAFF|DL Gun Build 7': {
    winPct: 55.01,
    avgTurns: 7.975,
    A_hit: 78,
    A_dmg1: 61,
    A_dmg2: 61,
    D_hit: 72,
    D_dmg1: 56,
    D_dmg2: 56,
    A_rng: [50, 180],
    D_rng: [59, 183],
  },
  'MAUL_CSTAFF|DL Gun Build 8': {
    winPct: 55.15,
    avgTurns: 11.8399,
    A_hit: 78,
    A_dmg1: 43,
    A_dmg2: 43,
    D_hit: 56,
    D_dmg1: 47,
    D_dmg2: 47,
    A_rng: [50, 180],
    D_rng: [59, 171],
  },
  'MAUL_CSTAFF|T2 Scythe Build': {
    winPct: 64.05,
    avgTurns: 11.9357,
    A_hit: 77,
    A_dmg1: 54,
    A_dmg2: 54,
    D_hit: 45,
    D_dmg1: 50,
    D_dmg2: 50,
    A_rng: [50, 180],
    D_rng: [78, 198],
  },
  'MAUL_CSTAFF|HF Core/Void': {
    winPct: 54.98,
    avgTurns: 11.2491,
    A_hit: 91,
    A_dmg1: 57,
    A_dmg2: 57,
    D_hit: 59,
    D_dmg1: 46,
    D_dmg2: 46,
    A_rng: [40, 147],
    D_rng: [49, 194],
  },
  'MAUL_CSTAFF|Core/Void Build 1': {
    winPct: 56.14,
    avgTurns: 11.1798,
    A_hit: 75,
    A_dmg1: 57,
    A_dmg2: 57,
    D_hit: 59,
    D_dmg1: 46,
    D_dmg2: 46,
    A_rng: [50, 180],
    D_rng: [49, 194],
  },
  'MAUL_CSTAFF|Dual Bow Build 1': {
    winPct: 64.41,
    avgTurns: 11.2204,
    A_hit: 75,
    A_dmg1: 59,
    A_dmg2: 59,
    D_hit: 65,
    D_dmg1: 51,
    D_dmg2: 51,
    A_rng: [50, 180],
    D_rng: [10, 242],
  },
  'MAUL_CSTAFF|Rift Bow Build 1': {
    winPct: 56.84,
    avgTurns: 10.5824,
    A_hit: 75,
    A_dmg1: 62,
    A_dmg2: 62,
    D_hit: 76,
    D_dmg1: 51,
    D_dmg2: 51,
    A_rng: [50, 180],
    D_rng: [10, 185],
  },
  'MAUL_CSTAFF|Armour stack Cores': {
    winPct: 50.41,
    avgTurns: 14.1563,
    A_hit: 91,
    A_dmg1: 46,
    A_dmg2: 46,
    D_hit: 63,
    D_dmg1: 55,
    D_dmg2: 55,
    A_rng: [40, 147],
    D_rng: [49, 118],
  },
};

GAME_BASELINES['SG1 Split Bombs T2'] = GAME_BASELINES['SG1 Split bombs'];
GAME_BASELINES['Dual Bow Build'] = GAME_BASELINES['Dual Bow Build 1'];
GAME_BASELINES['Bow/rift build'] = GAME_BASELINES['Rift Bow Build 1'];

// Alias historical MAUL_CSTAFF baselines to MAUL_CSTAFF_OLD (so you can A/B attacker presets cleanly)
for (const k of Object.keys(GAME_BASELINES)) {
  if (k.startsWith('MAUL_CSTAFF|')) {
    const defName = k.slice('MAUL_CSTAFF|'.length);
    const k2 = `MAUL_CSTAFF_OLD|${defName}`;
    if (!GAME_BASELINES[k2]) GAME_BASELINES[k2] = GAME_BASELINES[k];
  }
}

const ATTACKER_PRESETS = {
  MAUL_CSTAFF: {
    stats: { level: 80, hp: 595, speed: 60, dodge: 68, accuracy: 14 },
    armor: { name: 'Dark Legion Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
    misc2: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Pink Crystal' },
  },

  // Original calibration attacker (kept for regression tests)
  MAUL_CSTAFF_OLD: {
    stats: { level: 80, hp: 595, speed: 60, dodge: 68, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Crystal Maul', crystal: 'Perfect Fire Crystal', upgrades: [] },
    weapon2: { name: 'Core Staff', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Bio Spinal Enhancer', crystal: 'Perfect Orange Crystal' },
    misc2: { name: 'Projector Bots', crystal: 'Perfect Pink Crystal' },
  },

  BOMBS_RIFT_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  BOMBS_BOMBS_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  RIFT_BOMBS_MAXHP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },

  RIFT_BOMBS_MAXHP_SWAP: {
    stats: { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
    armor: { name: 'SG1 Armor', crystal: 'Abyss Crystal' },
    weapon1: { name: 'Rift Gun', crystal: 'Amulet Crystal', upgrades: [] },
    weapon2: { name: 'Split Crystal Bombs T2', crystal: 'Amulet Crystal', upgrades: [] },
    misc1: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
    misc2: { name: 'Scout Drones', crystal: 'Amulet Crystal' },
  },
};

const _ATTACKER_PRESET_INDEX = buildNameIndex(ATTACKER_PRESETS);

function resolveAttackerSelection() {
  const modeRaw = (USER_CONFIG && USER_CONFIG.attacker && USER_CONFIG.attacker.mode) || 'env';
  const mode = String(modeRaw).trim().toLowerCase();
  const presetFallback =
    (USER_CONFIG && USER_CONFIG.attacker && USER_CONFIG.attacker.preset) || 'MAUL_CSTAFF';

  if (mode === 'custom') {
    const build = USER_CONFIG && USER_CONFIG.attacker && USER_CONFIG.attacker.custom;
    return { name: 'CUSTOM', raw: 'CUSTOM', build, source: 'custom' };
  }

  const raw =
    mode === 'preset' ? String(presetFallback) : pickEnv('LEGACY_ATTACKER_PRESET', presetFallback);

  const name = resolveKeyOrFallback(raw, ATTACKER_PRESETS, _ATTACKER_PRESET_INDEX, presetFallback);
  const build = ATTACKER_PRESETS[name];
  return { name, raw, build, source: mode === 'preset' ? 'preset' : 'env' };
}

const {
  name: ATTACKER_PRESET,
  raw: ATTACKER_PRESET_RAW,
  build: ATTACKER_BUILD,
  source: ATTACKER_SOURCE,
} = resolveAttackerSelection();

if (!ATTACKER_BUILD) {
  const keys = Object.keys(ATTACKER_PRESETS).sort();
  if (ATTACKER_SOURCE === 'custom') {
    console.error(
      `ERROR: USER_CONFIG.attacker.mode="custom" but USER_CONFIG.attacker.custom is missing/invalid.`,
    );
  } else {
    console.error(
      `ERROR: Unknown LEGACY_ATTACKER_PRESET="${ATTACKER_PRESET_RAW}". ` +
        `Valid presets: ${keys.join(', ')}`,
    );
  }
  process.exit(1);
}

function makeCounters() {
  return { attempts: 0, hit: 0, skill: 0, dmg: 0, rngMin: Infinity, rngMax: -Infinity };
}

function makeActionDiag() {
  return {
    actions: 0,
    rawSum: 0,
    appliedSum: 0,
    w1Overkill: 0,
    w2Overkill: 0,
    w2OnDead: 0,
  };
}
function pct(n, d) {
  if (!d) return 0;
  return (n / d) * 100;
}
function fmtPct(x) {
  return `${x.toFixed(0)}`;
}
function fmtPct2(x) {
  return `${x.toFixed(2)}`;
}
function padLeft(s, w) {
  s = String(s);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}
function fmtPctW(x, w = 3) {
  const v = dispPct(+x / 100, DISP_ROUND);
  return padLeft(String(v), w);
}
function fmtPairPct(a, b, w = 3) {
  return `${fmtPctW(a, w)}/${fmtPctW(b, w)}`;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

let USE_COLOR = false;

let USE_ASCII = false;
function glyphVbar() {
  return USE_ASCII ? '|' : '│';
}
function glyphHbar() {
  return USE_ASCII ? '-' : '─';
}

function wantColor(mode) {
  mode = String(mode || 'auto')
    .trim()
    .toLowerCase();
  if (['0', 'false', 'off', 'none', 'no'].includes(mode)) return false;
  if (['1', 'true', 'on', 'yes'].includes(mode)) return true;

  if (!process.stdout.isTTY) return false;
  if (process.env.NO_COLOR !== undefined) return false;
  if (String(process.env.TERM || '').toLowerCase() === 'dumb') return false;
  return true;
}

function wrapAnsi(s, prefix) {
  return USE_COLOR ? prefix + s + ANSI.reset : s;
}
function sBold(s) {
  return wrapAnsi(s, ANSI.bold);
}
function sDim(s) {
  return wrapAnsi(s, ANSI.dim);
}
function sCyanBold(s) {
  return wrapAnsi(s, ANSI.bold + ANSI.cyan);
}
function sGray(s) {
  return wrapAnsi(s, ANSI.gray);
}
function sMagenta(s) {
  return wrapAnsi(s, ANSI.magenta);
}
function sMagentaBold(s) {
  return wrapAnsi(s, ANSI.bold + ANSI.magenta);
}
function colorWinPct(winPct, s) {
  if (!USE_COLOR) return s;
  const c = winPct >= 70 ? ANSI.green : winPct >= 55 ? ANSI.yellow : ANSI.red;
  return ANSI.bold + c + s + ANSI.reset;
}
function colorFirst(firstDisp) {
  if (!USE_COLOR) return firstDisp;
  const c = firstDisp === 'A' ? ANSI.green : firstDisp === 'D' ? ANSI.red : ANSI.yellow;
  return ANSI.bold + c + firstDisp + ANSI.reset;
}
function ellipsizePad(name, w) {
  if (w <= 0) return name;
  if (name.length > w) {
    if (w <= 1) return name.slice(0, w);
    return name.slice(0, w - 1) + '…';
  }
  return name.padEnd(w);
}

function makeSepLine() {
  const cols = process.stdout && process.stdout.columns ? process.stdout.columns : 0;
  const w = Math.max(40, Math.min(92, cols ? cols - 2 : 92));
  return sGray('  ' + glyphHbar().repeat(w));
}

function attemptWeapon(
  att,
  def,
  weapon,
  cfg,
  counters,
  traceObj,
  pre = {},
  rollCtx = null,
  weaponSlot = 0,
) {
  counters.attempts++;

  const forcedHit = pre.forceHit !== null && pre.forceHit !== undefined;
  const h = forcedHit
    ? !!pre.forceHit
    : rollCtx && rollCtx.enabled
      ? rollVsDump(att.acc, def.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround, rollCtx, {
          kind: 'HIT',
          weaponSlot,
          weaponName: weapon && weapon.name ? weapon.name : '',
          offStat: 'Acc',
          defStat: 'Dod',
        })
      : rollVs(att.acc, def.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround);

  if (forcedHit && rollCtx && rollCtx.enabled) {
    rollDumpPush(
      rollCtx,
      `RD HIT_USED_SHARED def="${rollCtx.matchName}" fight=${rollCtx.fight} turn=${rollCtx.turn} ` +
        `${rollCtx.actorSide || '?'}->${rollCtx.targetSide || '?'}${rollCtx.isRet ? '(ret)' : ''}` +
        ` w${weaponSlot}(${weapon && weapon.name ? weapon.name : ''}) | forced=${h ? 1 : 0}`,
    );
  }
  if (h) counters.hit++;
  else {
    if (traceObj) traceObj.push({ h: false, s: false, raw: 0, d: 0 });
    return { raw: 0, dmg: 0, hit: false, skill: false };
  }

  const atkSkill = skillValue(att, weapon.skill);
  let defSkill = def.defSk;
  const isProj = weapon.skill === 2;
  if (isProj) defSkill *= cfg.projDefMult;

  const skillLabel = weapon.skill === 0 ? 'Gun' : weapon.skill === 1 ? 'Mel' : 'Prj';

  let s;
  if (
    (cfg.sharedSkillMode === 'same_type' || cfg.sharedSkillMode === 'gun_same_type') &&
    pre.sharedSkillFn &&
    pre.sharedSkillSkillCode !== null &&
    weapon.skill === pre.sharedSkillSkillCode
  ) {
    s = !!pre.sharedSkillFn(atkSkill, defSkill, cfg.skillRollMode, cfg.skillGe, cfg.skillQround);
  } else {
    s =
      rollCtx && rollCtx.enabled
        ? rollVsDump(atkSkill, defSkill, cfg.skillRollMode, cfg.skillGe, cfg.skillQround, rollCtx, {
            kind: 'SKILL',
            weaponSlot,
            weaponName: weapon && weapon.name ? weapon.name : '',
            offStat: skillLabel,
            defStat: isProj ? `Def*${cfg.projDefMult}` : 'Def',
            note: isProj ? `projDefMult=${cfg.projDefMult}` : '',
          })
        : rollVs(atkSkill, defSkill, cfg.skillRollMode, cfg.skillGe, cfg.skillQround);
  }

  if (s) counters.skill++;
  else {
    if (traceObj) traceObj.push({ h: true, s: false, raw: 0, d: 0 });
    return { raw: 0, dmg: 0, hit: true, skill: false };
  }

  let raw = rollDamage(weapon.min, weapon.max, cfg.dmgRoll);

  const baseEnabled = cfg.tacticsMode === 'base' || cfg.tacticsMode === 'both';
  const baseVal = baseEnabled ? cfg.tacticsVal : 0;

  if (baseVal > 0 && cfg.dmgBonusMode !== 'per_action') {
    if (cfg.dmgBonusMode === 'per_weapon') raw += baseVal;
    else if (cfg.dmgBonusMode === 'split_equipped') {
      if (String(weapon.name).includes('Split Crystal Bombs')) raw += baseVal;
    }
  }

  const postArmorPerWeapon = applyArmorAndRound(raw, def.armorFactor, cfg.armorRound);
  if (postArmorPerWeapon > 0) counters.dmg++;

  if (cfg.armorApply === 'per_weapon' && postArmorPerWeapon > 0) {
    if (postArmorPerWeapon < counters.rngMin) counters.rngMin = postArmorPerWeapon;
    if (postArmorPerWeapon > counters.rngMax) counters.rngMax = postArmorPerWeapon;
  }

  let dmg;
  if (cfg.armorApply === 'per_weapon') {
    dmg = postArmorPerWeapon;
  } else {
    dmg = raw;
  }

  if (traceObj) traceObj.push({ h: true, s: true, raw, d: dmg });
  return { raw, dmg, hit: true, skill: true };
}

function doAction(
  att,
  def,
  targetHp0,
  cfg,
  sideStats,
  traceLine,
  diagSide,
  rollCtx = null,
  isRet = false,
) {
  sideStats.acts++;

  if (rollCtx) {
    rollCtx.actorSide = att && att.name === 'Attacker' ? 'A' : 'D';
    rollCtx.targetSide = def && def.name === 'Attacker' ? 'A' : 'D';
    rollCtx.isRet = !!isRet;
  }

  const traceW = traceLine ? [] : null;

  const sharedHit = cfg.sharedHit
    ? rollCtx && rollCtx.enabled
      ? rollVsDump(att.acc, def.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround, rollCtx, {
          kind: 'HIT_SHARED',
          weaponSlot: 0,
          weaponName: '',
          offStat: 'Acc',
          defStat: 'Dod',
        })
      : rollVs(att.acc, def.dodge, cfg.hitRollMode, cfg.hitGe, cfg.hitQround)
    : null;

  let sharedSkillSkillCode = null;
  let sharedSkillFn = null;

  if (att.w1 && att.w2 && att.w1.skill === att.w2.skill) {
    const sc = att.w1.skill;
    const allow =
      cfg.sharedSkillMode === 'same_type' || (cfg.sharedSkillMode === 'gun_same_type' && sc === 0);

    if (allow) {
      sharedSkillSkillCode = sc;
      let cached = false;
      let cachedVal = false;

      sharedSkillFn = (atkSkill, defSkill, rollMode, ge, qround) => {
        if (!cached) {
          const skillLabel = sc === 0 ? 'Gun' : sc === 1 ? 'Mel' : 'Prj';
          cachedVal =
            rollCtx && rollCtx.enabled
              ? rollVsDump(atkSkill, defSkill, rollMode, ge, qround, rollCtx, {
                  kind: 'SKILL_SHARED',
                  weaponSlot: 0,
                  weaponName: '',
                  offStat: skillLabel,
                  defStat: sc === 2 ? `Def*${cfg.projDefMult}` : 'Def',
                  note: 'sharedSkill',
                })
              : rollVs(atkSkill, defSkill, rollMode, ge, qround);
          cached = true;
        }
        return cachedVal;
      };
    }
  }

  const pre = {
    forceHit: cfg.sharedHit ? sharedHit : null,
    sharedSkillFn,
    sharedSkillSkillCode,
  };

  const baseEnabled = cfg.tacticsMode === 'base' || cfg.tacticsMode === 'both';
  const baseVal = baseEnabled ? cfg.tacticsVal : 0;

  const r1 = attemptWeapon(att, def, att.w1, cfg, sideStats.w1, traceW, pre, rollCtx, 1);

  let r2;
  if (
    cfg.actionStopOnKill &&
    targetHp0 > 0 &&
    cfg.armorApply === 'per_weapon' &&
    baseVal === 0 &&
    (r1.dmg || 0) >= targetHp0
  ) {
    if (traceW) traceW.push({ h: false, s: false, raw: 0, d: 0, skip: true });
    r2 = { raw: 0, dmg: 0, hit: false, skill: false, skipped: true };
    if (diagSide) diagSide.w2StopOnKill = (diagSide.w2StopOnKill || 0) + 1;
  } else {
    r2 = attemptWeapon(att, def, att.w2, cfg, sideStats.w2, traceW, pre, rollCtx, 2);
  }

  let actionDmg = 0;

  if (cfg.armorApply === 'per_weapon') {
    actionDmg = (r1.dmg || 0) + (r2.dmg || 0);

    if (baseVal > 0 && cfg.dmgBonusMode === 'per_action') {
      const any = r1.raw > 0 || r2.raw > 0;
      if (any) actionDmg += baseVal;
    }
  } else {
    let sumRaw = (r1.dmg || 0) + (r2.dmg || 0);

    if (baseVal > 0 && cfg.dmgBonusMode === 'per_action') {
      const any = sumRaw > 0;
      if (any && cfg.dmgBonusStage === 'pre_armor') sumRaw += baseVal;
    }

    actionDmg = applyArmorAndRound(sumRaw, def.armorFactor, cfg.armorRound);

    if (baseVal > 0 && cfg.dmgBonusMode === 'per_action' && cfg.dmgBonusStage === 'post_armor') {
      if (sumRaw > 0) actionDmg += baseVal;
    }
  }

  const actionRaw = actionDmg;

  let actionApplied = 0;
  let w1Applied = 0;
  let w2Applied = 0;

  const w1Dmg = r1.dmg || 0;
  const w2Dmg = r2.dmg || 0;

  const tw1 = (traceW && traceW[0]) || { h: false, s: false, raw: 0, d: 0 };
  const tw2 = (traceW && traceW[1]) || { h: false, s: false, raw: 0, d: 0 };

  if (targetHp0 > 0) {
    if (cfg.armorApply === 'per_weapon' && baseVal === 0) {
      let rem = targetHp0;
      w1Applied = Math.min(w1Dmg, rem);
      rem -= w1Applied;
      const remBeforeW2 = rem;
      w2Applied = rem > 0 ? Math.min(w2Dmg, rem) : 0;
      rem -= w2Applied;
      actionApplied = w1Applied + w2Applied;

      if (diagSide) {
        if (w1Dmg > 0 && w1Applied < w1Dmg) diagSide.w1Overkill++;
        if (w2Dmg > 0 && w2Applied < w2Dmg) diagSide.w2Overkill++;
        if (w2Dmg > 0 && remBeforeW2 <= 0) diagSide.w2OnDead++;
      }
    } else {
      actionApplied = Math.min(actionRaw, targetHp0);
    }
  }

  if (diagSide) {
    diagSide.actions++;
    diagSide.rawSum += actionRaw;
    diagSide.appliedSum += actionApplied;
  }

  if (actionRaw > 0) {
    if (actionRaw < sideStats.minActionDmg) sideStats.minActionDmg = actionRaw;
    if (actionRaw > sideStats.maxActionDmg) sideStats.maxActionDmg = actionRaw;
  }
  sideStats.totalActionDmg += actionApplied;

  if (traceLine && traceW) {
    traceLine.push(
      `w1(h=${tw1.h},s=${tw1.s},raw=${tw1.raw},d=${tw1.d},app=${w1Applied}) w2(h=${tw2.h},s=${tw2.s},raw=${tw2.raw},d=${tw2.d},app=${w2Applied}) => raw=${actionRaw} app=${actionApplied} targetHP=${targetHp0}`,
    );
  }

  return { raw: actionRaw, applied: actionApplied };
}

function fightOnce(p1, p2, cfg, stats, trace, rollCtx = null) {
  let p1hp = p1.hp;
  let p2hp = p2.hp;

  let p1First;
  if (p1.speed > p2.speed) p1First = true;
  else if (p1.speed < p2.speed) p1First = false;
  else p1First = cfg.speedTieMode === 'random' ? RNG() < 0.5 : true;

  const first = p1First ? p1 : p2;
  const second = p1First ? p2 : p1;

  const firstSide = p1First ? stats.A : stats.D;
  const secondSide = p1First ? stats.D : stats.A;

  let turns = 0;

  while (p1hp > 0 && p2hp > 0 && turns < cfg.maxTurns) {
    turns++;

    if (rollCtx) {
      rollCtx.turn = turns;
      if (rollCtx.maxTurns > 0 && turns > rollCtx.maxTurns) rollCtx.enabled = false;
    }

    const t1 = trace ? [] : null;
    const hpSecond0 = second === p1 ? p1hp : p2hp;
    const r1 = doAction(
      first,
      second,
      hpSecond0,
      cfg,
      firstSide,
      t1,
      first === p1 ? stats.diagA : stats.diagD,
      rollCtx,
      false,
    );
    if (second === p1) p1hp -= r1.applied;
    else p2hp -= r1.applied;

    if (trace)
      trace.push(
        `T${turns} ${first === p1 ? 'A' : 'D'}->${second === p1 ? 'A' : 'D'} | ${t1.join(' ')}`,
      );

    if (p1hp <= 0 || p2hp <= 0) break;

    const t2 = trace ? [] : null;
    const hpFirst0 = first === p1 ? p1hp : p2hp;
    const r2 = doAction(
      second,
      first,
      hpFirst0,
      cfg,
      secondSide,
      t2,
      second === p1 ? stats.diagA : stats.diagD,
      rollCtx,
      true,
    );
    if (first === p1) p1hp -= r2.applied;
    else p2hp -= r2.applied;

    if (trace)
      trace.push(
        `T${turns} ${second === p1 ? 'A' : 'D'}->${first === p1 ? 'A' : 'D'}(ret) | ${t2.join(' ')}`,
      );
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

  return { winnerIsP1, turns };
}

function runMatch(attacker, defender, cfg, traceCfg) {
  const stats = {
    wins: 0,
    turnsTotal: 0,
    turnsMin: 1e9,
    turnsMax: 0,
    A: {
      w1: makeCounters(),
      w2: makeCounters(),
      acts: 0,
      minActionDmg: 1e9,
      maxActionDmg: 0,
      totalActionDmg: 0,
    },
    D: {
      w1: makeCounters(),
      w2: makeCounters(),
      acts: 0,
      minActionDmg: 1e9,
      maxActionDmg: 0,
      totalActionDmg: 0,
    },
    diagA: cfg.diag ? makeActionDiag() : null,
    diagD: cfg.diag ? makeActionDiag() : null,
  };

  const traceFights = traceCfg.traceFights;
  const rollDump = traceCfg && traceCfg.rollDump ? traceCfg.rollDump : null;
  const traceLines = [];

  for (let i = 0; i < cfg.trials; i++) {
    const doTrace = traceFights > 0 && i < traceFights;

    const trace = doTrace ? [] : null;
    let rollCtx = null;
    if (rollDump && rollDump.enabled && rollDump.fights > 0 && i < rollDump.fights) {
      rollCtx = {
        out: rollDump,
        enabled: true,
        matchName: rollDump.matchName || defender.name || 'Defender',
        fight: i + 1,
        turn: 0,
        maxTurns: rollDump.maxTurns || 0,
        actorSide: '',
        targetSide: '',
        isRet: false,
      };
      rollDumpPush(rollCtx, `RD === BEGIN def="${rollCtx.matchName}" fight=${rollCtx.fight} ===`);
    }

    const { winnerIsP1, turns } = fightOnce(attacker, defender, cfg, stats, trace, rollCtx);

    if (rollCtx && rollCtx.out) {
      rollDumpPush(
        rollCtx,
        `RD === END def="${rollCtx.matchName}" fight=${rollCtx.fight} turns=${turns} ===`,
      );
    }

    stats.wins += winnerIsP1;
    stats.turnsTotal += turns;
    if (turns < stats.turnsMin) stats.turnsMin = turns;
    if (turns > stats.turnsMax) stats.turnsMax = turns;

    if (doTrace) {
      traceLines.push(`-- Fight ${i + 1} --`);
      traceLines.push(...trace);
    }
  }

  return { stats, traceLines };
}

function makeVariantList() {
  const zip = yn(pickEnv('LEGACY_SWEEP_ZIP', '0'));

  function listOrSingle(key, parser, fallback) {
    const sweepKey = `${key}_SWEEP`;
    const v = pickEnv(sweepKey, '');
    if (v) return parser(v);
    return [parser(String(pickEnv(key, fallback)))].flat();
  }

  function listOrSingleChained(primaryKey, parser, fallback, legacyKey) {
    const primarySweep = pickEnv(`${primaryKey}_SWEEP`, '');
    if (primarySweep) return parser(primarySweep);

    const primary = pickEnv(primaryKey, '');
    if (primary) return parser(primary);

    if (legacyKey) {
      const legacySweep = pickEnv(`${legacyKey}_SWEEP`, '');
      if (legacySweep) return parser(legacySweep);

      const legacy = pickEnv(legacyKey, '');
      if (legacy) return parser(legacy);
    }

    return parser(String(fallback));
  }

  const projDef = listOrSingle('LEGACY_PROJ_DEF_MULT', (s) => parseNumCsv(s), '1');

  const hitRollMode = listOrSingleChained(
    'LEGACY_HIT_ROLL_MODE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'float',
    'LEGACY_ROLL_MODE',
  );
  const skillRollMode = listOrSingleChained(
    'LEGACY_SKILL_ROLL_MODE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'float',
    'LEGACY_ROLL_MODE',
  );
  const hitGe = listOrSingleChained(
    'LEGACY_HIT_GE',
    (s) =>
      parseCsv(s).map((x) => x === '1' || x.toLowerCase() === 'true' || x.toLowerCase() === 'ge'),
    '0',
    'LEGACY_GE',
  );
  const skillGe = listOrSingleChained(
    'LEGACY_SKILL_GE',
    (s) =>
      parseCsv(s).map((x) => x === '1' || x.toLowerCase() === 'true' || x.toLowerCase() === 'ge'),
    '0',
    'LEGACY_GE',
  );
  const hitQround = listOrSingle(
    'LEGACY_HIT_QROUND',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'none',
  );
  const skillQround = listOrSingle(
    'LEGACY_SKILL_QROUND',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'none',
  );

  const dmgRoll = listOrSingle(
    'LEGACY_DMG_ROLL',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'roundfloat',
  );
  const armorApply = listOrSingle(
    'LEGACY_ARMOR_APPLY',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'sum',
  );
  const armorK = listOrSingle('LEGACY_ARMOR_K', parseNumCsv, '8');
  const armorRound = listOrSingle(
    'LEGACY_ARMOR_ROUND',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'round',
  );

  const tacticsMode = listOrSingle(
    'LEGACY_TACTICS_MODE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'base',
  );
  const tacticsVal = listOrSingle(
    'LEGACY_TACTICS_VAL',
    (s) => parseNumCsv(s),
    String(BASE.tacticsVal),
  );

  const dmgBonusMode = listOrSingle(
    'LEGACY_DMG_BONUS_MODE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'per_action',
  );
  const dmgBonusStage = listOrSingle(
    'LEGACY_DMG_BONUS_STAGE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'pre_armor',
  );

  const statRound = listOrSingle(
    'LEGACY_STAT_ROUND',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'ceil',
  );
  const weaponDmgRound = listOrSingle(
    'LEGACY_WEAPON_DMG_ROUND',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'ceil',
  );

  const armorStatStack = listOrSingle(
    'LEGACY_ARMORSTAT_STACK',
    (s) => parseCsv(s).map((x) => String(x).trim().toLowerCase()),
    'inherit',
  );
  const armorStatRound = listOrSingle(
    'LEGACY_ARMORSTAT_ROUND',
    (s) => parseCsv(s).map((x) => String(x).trim().toLowerCase()),
    'inherit',
  );

  const armorStatSlots = listOrSingle(
    'LEGACY_ARMORSTAT_SLOTS',
    (s) =>
      parseCsv(s).map((x) => {
        x = String(x).trim().toLowerCase();
        if (!x || x === 'inherit') return 'inherit';
        const n = Number(x);
        return Number.isFinite(n) ? n : 'inherit';
      }),
    'inherit',
  );

  const crystalStackStats = listOrSingle(
    'LEGACY_CRYSTAL_STACK_STATS',
    (s) => parseCsv(s).map((x) => String(x).trim().toLowerCase()),
    pickEnv('LEGACY_CRYSTAL_STACK_MODE', 'sum4'),
  );
  const crystalStackDmg = listOrSingle(
    'LEGACY_CRYSTAL_STACK_DMG',
    (s) => parseCsv(s).map((x) => String(x).trim().toLowerCase()),
    pickEnv('LEGACY_CRYSTAL_STACK_MODE', 'sum4'),
  );
  const crystalSlots = listOrSingle('LEGACY_CRYSTAL_SLOTS', (s) => parseNumCsv(s), '4');

  const sharedHit = listOrSingle(
    'LEGACY_SHARED_HIT',
    (s) => parseCsv(s).map((x) => (x === '1' || x === 'true' || x === 'yes' ? 1 : 0)),
    '0',
  );
  const sharedSkill = listOrSingle(
    'LEGACY_SHARED_SKILL',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'none',
  );
  const speedTieMode = listOrSingle(
    'LEGACY_SPEED_TIE_MODE',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'attacker',
  );
  const hiddenPreset = listOrSingle(
    'LEGACY_HIDDEN_PRESET',
    (s) => parseCsv(s).map((x) => x.toLowerCase()),
    'none',
  );

  function zipLists() {
    const lists = {
      projDef,
      hitRollMode,
      skillRollMode,
      hitGe,
      skillGe,
      hitQround,
      skillQround,
      dmgRoll,
      armorK,
      armorApply,
      armorRound,
      tacticsMode,
      tacticsVal,
      dmgBonusMode,
      dmgBonusStage,
      statRound,
      weaponDmgRound,
      armorStatStack,
      armorStatRound,
      armorStatSlots,
      crystalStackStats,
      crystalStackDmg,
      crystalSlots,
      sharedHit,
      sharedSkill,
      speedTieMode,
      hiddenPreset,
    };
    const lens = Object.values(lists).map((a) => a.length);
    const N = Math.max(...lens);

    for (const [k, arr] of Object.entries(lists)) {
      if (arr.length !== 1 && arr.length !== N) {
        throw new Error(`ZIP sweep mismatch: ${k} has length ${arr.length} but expected 1 or ${N}`);
      }
    }

    const out = [];
    for (let i = 0; i < N; i++) {
      out.push({
        projDefMult: projDef.length === 1 ? projDef[0] : projDef[i],
        hitRollMode: hitRollMode.length === 1 ? hitRollMode[0] : hitRollMode[i],
        skillRollMode: skillRollMode.length === 1 ? skillRollMode[0] : skillRollMode[i],
        hitGe: hitGe.length === 1 ? hitGe[0] : hitGe[i],
        skillGe: skillGe.length === 1 ? skillGe[0] : skillGe[i],
        hitQround: hitQround.length === 1 ? hitQround[0] : hitQround[i],
        skillQround: skillQround.length === 1 ? skillQround[0] : skillQround[i],
        dmgRoll: dmgRoll.length === 1 ? dmgRoll[0] : dmgRoll[i],
        armorK: armorK.length === 1 ? armorK[0] : armorK[i],
        armorApply: armorApply.length === 1 ? armorApply[0] : armorApply[i],
        armorRound: armorRound.length === 1 ? armorRound[0] : armorRound[i],
        tacticsMode: tacticsMode.length === 1 ? tacticsMode[0] : tacticsMode[i],
        tacticsVal: tacticsVal.length === 1 ? tacticsVal[0] : tacticsVal[i],
        dmgBonusMode: dmgBonusMode.length === 1 ? dmgBonusMode[0] : dmgBonusMode[i],
        dmgBonusStage: dmgBonusStage.length === 1 ? dmgBonusStage[0] : dmgBonusStage[i],
        statRound: statRound.length === 1 ? statRound[0] : statRound[i],
        weaponDmgRound: weaponDmgRound.length === 1 ? weaponDmgRound[0] : weaponDmgRound[i],
        armorStatStack: armorStatStack.length === 1 ? armorStatStack[0] : armorStatStack[i],
        armorStatRound: armorStatRound.length === 1 ? armorStatRound[0] : armorStatRound[i],
        armorStatSlots: armorStatSlots.length === 1 ? armorStatSlots[0] : armorStatSlots[i],
        crystalStackStats:
          crystalStackStats.length === 1 ? crystalStackStats[0] : crystalStackStats[i],
        crystalStackDmg: crystalStackDmg.length === 1 ? crystalStackDmg[0] : crystalStackDmg[i],
        crystalSlots: crystalSlots.length === 1 ? crystalSlots[0] : crystalSlots[i],
        sharedHit: sharedHit.length === 1 ? sharedHit[0] : sharedHit[i],
        sharedSkillMode: sharedSkill.length === 1 ? sharedSkill[0] : sharedSkill[i],
        speedTieMode: speedTieMode.length === 1 ? speedTieMode[0] : speedTieMode[i],
        hiddenPreset: hiddenPreset.length === 1 ? hiddenPreset[0] : hiddenPreset[i],
      });
    }
    return out;
  }

  function cartesian(lists) {
    const keys = Object.keys(lists);
    const out = [];

    function rec(idx, acc) {
      if (idx === keys.length) {
        out.push({ ...acc });
        return;
      }
      const k = keys[idx];
      for (const v of lists[k]) {
        acc[k] = v;
        rec(idx + 1, acc);
      }
    }

    rec(0, {});
    return out.map((x) => ({
      projDefMult: x.projDef,
      hitRollMode: x.hitRollMode,
      skillRollMode: x.skillRollMode,
      hitGe: x.hitGe,
      skillGe: x.skillGe,
      hitQround: x.hitQround,
      skillQround: x.skillQround,
      dmgRoll: x.dmgRoll,
      armorK: x.armorK,
      armorApply: x.armorApply,
      armorRound: x.armorRound,
      tacticsMode: x.tacticsMode,
      tacticsVal: x.tacticsVal,
      dmgBonusMode: x.dmgBonusMode,
      dmgBonusStage: x.dmgBonusStage,
      statRound: x.statRound,
      weaponDmgRound: x.weaponDmgRound,
      armorStatStack: x.armorStatStack,
      armorStatRound: x.armorStatRound,
      armorStatSlots: x.armorStatSlots,
      crystalStackStats: x.crystalStackStats,
      crystalStackDmg: x.crystalStackDmg,
      crystalSlots: x.crystalSlots,
      sharedHit: x.sharedHit,
      sharedSkillMode: x.sharedSkill,
      speedTieMode: x.speedTieMode,
      hiddenPreset: x.hiddenPreset,
    }));
  }

  return zip
    ? zipLists()
    : cartesian({
        projDef,
        hitRollMode,
        skillRollMode,
        hitGe,
        skillGe,
        hitQround,
        skillQround,
        dmgRoll,
        armorK,
        armorApply,
        armorRound,
        tacticsMode,
        tacticsVal,
        dmgBonusMode,
        dmgBonusStage,
        statRound,
        weaponDmgRound,
        armorStatStack,
        armorStatRound,
        armorStatSlots,
        crystalStackStats,
        crystalStackDmg,
        crystalSlots,
        sharedHit,
        sharedSkill,
        speedTieMode,
        hiddenPreset,
      });
}

function main() {
  const trials = Math.max(1, parseInt(pickEnv('LEGACY_TRIALS', String(DEFAULTS.TRIALS)), 10));
  const maxTurns = Math.max(
    1,
    parseInt(pickEnv('LEGACY_MAX_TURNS', String(DEFAULTS.MAX_TURNS)), 10),
  );

  const rngMode = String(pickEnv('LEGACY_RNG', 'fast')).toLowerCase();
  const seed = parseInt(pickEnv('LEGACY_SEED', '1337'), 10) >>> 0 || 1337;
  const deterministic = yn(pickEnv('LEGACY_DETERMINISTIC', '0'));
  const debugStats = yn(pickEnv('LEGACY_DEBUG_STATS', '0'));
  const debugDps = yn(pickEnv('LEGACY_DEBUG_DPS', '0'));

  const rollDumpOn = yn(pickEnv('LEGACY_ROLL_DUMP', '0'));
  const rollDumpDefEnv = String(pickEnv('LEGACY_ROLL_DUMP_DEFENDERS', '')).trim();
  const rollDumpFights = Math.max(0, parseInt(pickEnv('LEGACY_ROLL_DUMP_FIGHTS', '1'), 10) || 0);
  const rollDumpMaxTurns = Math.max(
    0,
    parseInt(pickEnv('LEGACY_ROLL_DUMP_MAX_TURNS', '8'), 10) || 0,
  );
  const rollDumpMaxLines = Math.max(
    50,
    parseInt(pickEnv('LEGACY_ROLL_DUMP_MAX_LINES', '1200'), 10) || 1200,
  );

  let rollDumpDefRaw = rollDumpDefEnv;
  let rollDumpNameKeys = new Set();
  let wantRollDumpFor = (_defName) => false;

  const diag = yn(pickEnv('LEGACY_DIAG', '0'));

  const diagArmor = yn(pickEnv('LEGACY_DIAG_ARMOR', '0'));
  const diagRange = yn(pickEnv('LEGACY_DIAG_RANGE', '0'));
  const diagRangeSweep = yn(pickEnv('LEGACY_DIAG_RANGE_SWEEP', '0'));
  const diagRangeDefFilter = String(pickEnv('LEGACY_DIAG_RANGE_DEFENDER', '') || '')
    .trim()
    .toLowerCase();

  const traceDef = String(pickEnv('LEGACY_TRACE_DEFENDER', '')).trim();
  const traceFights = Math.max(
    0,
    parseInt(pickEnv('LEGACY_TRACE_FIGHTS', pickEnv('LEGACY_TRACE', '0')), 10) || 0,
  );

  const outputMode = String(pickEnv('LEGACY_OUTPUT', 'compact')).trim().toLowerCase();
  const outputVerbose = outputMode === 'verbose' || outputMode === 'full' || outputMode === '1';
  const printExact = yn(pickEnv('LEGACY_PRINT_EXACT', outputVerbose ? '1' : '0'));
  const printGame = yn(pickEnv('LEGACY_PRINT_GAME', '0'));

  USE_COLOR = wantColor(pickEnv('LEGACY_COLOR', 'auto'));
  USE_ASCII = yn(pickEnv('LEGACY_ASCII', '0'));

  const sepOn = yn(pickEnv('LEGACY_SEP', '1'));
  const summaryOn = yn(pickEnv('LEGACY_SUMMARY', '1'));
  const sepLine = sepOn ? makeSepLine() : '';

  const headerMode = String(pickEnv('LEGACY_HEADER', 'min')).trim().toLowerCase();
  const defListMax = Math.max(0, parseInt(pickEnv('LEGACY_DEF_LIST_MAX', '6'), 10) || 6);

  const compareBaselines = yn(pickEnv('LEGACY_COMPARE', '0'));
  const baselinesFile = String(pickEnv('LEGACY_BASELINES_FILE', '')).trim();
  const baselineKeyOverride = String(pickEnv('LEGACY_BASELINE_KEY', '')).trim().toLowerCase();
  const baselineFallback = yn(pickEnv('LEGACY_BASELINE_FALLBACK', '0'));
  const printBaselineTemplate = yn(pickEnv('LEGACY_PRINT_BASELINE_TEMPLATE', '0'));

  const detTagBase = parseInt(pickEnv('LEGACY_DET_TAG', '2'), 10) | 0 || 2;

  const baselineStore = baselinesFile ? loadBaselineFile(baselinesFile) : null;
  if ((compareBaselines || printBaselineTemplate) && baselinesFile && !baselineStore) {
    console.error(
      `NOTE: baselines file not found or unreadable (will use embedded GAME baselines if available): ${resolvePathRelToScript(baselinesFile)}`,
    );
  }

  if (!deterministic) {
    RNG =
      rngMode === 'fast'
        ? makeRng('fast', seed, seed ^ 0xa341316c, seed ^ 0xc8013ea4, seed ^ 0xad90777d)
        : Math.random;
  }

  const verifyList = parseCsv(pickEnv('LEGACY_VERIFY_DEFENDERS', ''));
  let defenderNames = verifyList.length ? verifyList : DEFENDER_PRIORITY.slice();

  if (!verifyList.length) {
    const withBaselines = DEFENDER_PRIORITY.filter((n) => GAME_BASELINES[n]);
    if (withBaselines.length) defenderNames = withBaselines;
  }

  {
    const unresolved = [];
    defenderNames = defenderNames.map((raw) => {
      const canon = resolveDefenderName(raw);
      if (!canon) {
        unresolved.push(raw);
        return raw;
      }
      return canon;
    });

    if (unresolved.length) {
      const known = Object.keys(DEFENDER_PAYLOADS)
        .filter((k) => !k.includes('|'))
        .slice(0, 60)
        .join(', ');
      throw new Error(
        `Unknown defender name(s): ${unresolved.join(', ')}. ` +
          `Try exact names (examples): ${known} ...`,
      );
    }

    const seen = new Set();
    defenderNames = defenderNames.filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  }
  if (rollDumpOn && rollDumpFights > 0) {
    if (!rollDumpDefRaw) {
      rollDumpDefRaw = defenderNames.length ? defenderNames[0] : '';
    }
    rollDumpNameKeys = new Set(parseCsv(rollDumpDefRaw).map((x) => normalizeNameKey(x)));
    wantRollDumpFor = (defName) =>
      rollDumpOn && rollDumpFights > 0 && rollDumpNameKeys.has(normalizeNameKey(defName));
  }
  const nameWEnv = Math.max(0, parseInt(pickEnv('LEGACY_NAME_W', '0'), 10) || 0);
  const maxNameLen = defenderNames.reduce((m, n) => (n.length > m ? n.length : m), 0);
  const nameWAuto = Math.min(34, Math.max(18, Math.min(30, maxNameLen)));
  const nameW = nameWEnv > 0 ? Math.min(80, Math.max(10, nameWEnv)) : nameWAuto;

  const variants = makeVariantList();
  const variantCmpSummaries = [];

  console.log('=== LEGACY VERIFY ===');
  // If you have exported any LEGACY_* variables in your shell, they'll silently override defaults.
  // We capture which env keys existed BEFORE this script injects its own defaults.
  if (pickEnv('LEGACY_ENV_WARN', '1') !== '0') {
    const presetLegacy = [...__ENV_PRESET_KEYS__].filter((k) => k.startsWith('LEGACY_')).sort();
    if (presetLegacy.length) {
      // Keep it short: show up to 12 keys.
      const shown = presetLegacy
        .slice(0, 12)
        .map((k) => `${k}=${process.env[k]}`)
        .join(' ');
      const more = presetLegacy.length > 12 ? ` …(+${presetLegacy.length - 12} more)` : '';
      console.log(`ENV OVERRIDES: ${shown}${more}`);
      console.log(
        'NOTE: If this was unintentional, run with a clean env: env -i PATH="$PATH" HOME="$HOME" node legacy_simulator.best-defaults.js',
      );
    }
  }
  const outTag = `${outputMode}${printExact ? '+exact' : ''}${printGame ? '+game' : ''}${compareBaselines ? '+cmp' : ''}`;
  let runLine = `RUN: trials/def=${trials} seed=${seed} det=${deterministic ? 'ON' : 'OFF'} rng=${rngMode} maxT=${maxTurns} defs=${defenderNames.length} out=${outTag}`;
  if (variants.length !== 1) runLine += ` vars=${variants.length}`;
  console.log(runLine);

  if (headerMode !== 'min') {
    const defLine =
      headerMode === 'full' ? defenderNames.join(', ') : summarizeList(defenderNames, defListMax);
    console.log(`DEFS: ${defLine}`);
  }
  console.log('');

  const payloads = defenderNames.map((n) => ({ name: n, payload: DEFENDER_PAYLOADS[n] }));

  const defsSig = hashStr32(
    stableStringify(payloads.map((p) => ({ name: p.name, payload: p.payload }))),
  );
  const defsSigHex = hex8(defsSig);
  const attSig = hashStr32(
    stableStringify({
      preset: ATTACKER_PRESET,
      build: ATTACKER_BUILD,
      swapWeps: SWAP_ATTACKER_WEPS,
    }),
  );
  const attSigHex = hex8(attSig);

  for (let vi = 0; vi < variants.length; vi++) {
    const v = variants[vi];

    const cfg = {
      trials,
      maxTurns,
      diag,
      diagArmor,
      speedTieMode: v.speedTieMode || 'attacker',
      hiddenPreset: v.hiddenPreset || 'none',
      hitRollMode: v.hitRollMode,
      skillRollMode: v.skillRollMode,
      hitGe: !!v.hitGe,
      skillGe: !!v.skillGe,
      hitQround: v.hitQround || 'none',
      skillQround: v.skillQround || 'none',
      dmgRoll: v.dmgRoll,
      projDefMult: Number(v.projDefMult),
      armorK: v.armorK,
      armorApply: v.armorApply,
      armorRound: v.armorRound,
      tacticsMode: v.tacticsMode,
      tacticsVal: Number(v.tacticsVal),
      dmgBonusMode: v.dmgBonusMode,
      dmgBonusStage: v.dmgBonusStage,
      statRound: v.statRound,
      weaponDmgRound: v.weaponDmgRound,
      armorStatStack:
        v.armorStatStack && v.armorStatStack !== 'inherit' ? v.armorStatStack : 'sum4',
      armorStatRound:
        v.armorStatRound && v.armorStatRound !== 'inherit' ? v.armorStatRound : v.statRound,
      armorStatSlots:
        v.armorStatSlots !== undefined &&
        v.armorStatSlots !== null &&
        v.armorStatSlots !== 'inherit'
          ? Number(v.armorStatSlots)
          : Number.isFinite(Number(v.crystalSlots))
            ? Number(v.crystalSlots)
            : 4,
      crystalStackStats: v.crystalStackStats || 'sum4',
      crystalStackDmg: v.crystalStackDmg || 'sum4',
      crystalSlots: Number.isFinite(Number(v.crystalSlots)) ? Number(v.crystalSlots) : 4,
      sharedHit: Number(v.sharedHit) === 1,
      sharedSkillMode: v.sharedSkillMode || 'none',
      exactVerbose: EXACT_VERBOSE,
      exactSwap: EXACT_SWAP,
      gameTrials: GAME_TRIALS,
      actionStopOnKill: ACTION_STOP_ON_KILL,
    };

    const cache = new Map();
    const vKey = (itemName, crystalName, u1 = '', u2 = '') =>
      `${cfg.statRound}|${cfg.weaponDmgRound}|${itemName}|${crystalName}|${u1}|${u2}`;

    function getV(itemName, crystalName, u1 = '', u2 = '', slotTag = 0) {
      const k = vKey(itemName, crystalName, u1, u2);
      let vv = cache.get(k);
      if (!vv) {
        const ups = [];
        if (u1) ups.push(u1);
        if (u2) ups.push(u2);
        vv = computeVariant(itemName, crystalName, ups, cfg, slotTag);
        cache.set(k, vv);
      }
      return vv;
    }

    const a = ATTACKER_BUILD;
    const attacker = compileCombatantFromParts({
      name: 'Attacker',
      stats: a.stats,
      armorV: getV(a.armor.name, a.armor.crystal),
      w1V: getV(
        a.weapon1.name,
        a.weapon1.crystal,
        a.weapon1.upgrades[0] || '',
        a.weapon1.upgrades[1] || '',
      ),
      w2V: getV(
        a.weapon2.name,
        a.weapon2.crystal,
        a.weapon2.upgrades[0] || '',
        a.weapon2.upgrades[1] || '',
      ),
      m1V: getV(a.misc1.name, a.misc1.crystal, '', '', 1),
      m2V: getV(a.misc2.name, a.misc2.crystal, '', '', 2),
      cfg,
      role: 'A',
    });

    if (SWAP_ATTACKER_WEPS) swapWeaponsInPlace(attacker);

    if (vi === 0) {
      let w1Part = a.weapon1;
      let w2Part = a.weapon2;
      if (SWAP_ATTACKER_WEPS) {
        const tmp = w1Part;
        w1Part = w2Part;
        w2Part = tmp;
      }

      function fmtCrystal(cr) {
        return cr ? sDim(`[${cr}]`) : sDim('[none]');
      }
      function fmtUpgrades(upgs) {
        const u = (upgs || []).filter(Boolean);
        return u.length ? sDim(' +' + u.join('+')) : '';
      }
      function fmtSlot(part) {
        if (!part) return 'none';
        return `${part.name} ${fmtCrystal(part.crystal)}${fmtUpgrades(part.upgrades)}`;
      }
      function fmtWeapon(part, wObj) {
        if (!part) return 'none';
        const rng = wObj ? `(${sMagentaBold(`${wObj.min}-${wObj.max}`)})` : '';
        return `${part.name} ${fmtCrystal(part.crystal)}${fmtUpgrades(part.upgrades)} ${rng}`.trimEnd();
      }

      const armorStr = fmtSlot(a.armor);
      const misc1Str = fmtSlot(a.misc1);
      const misc2Str = fmtSlot(a.misc2);
      const w1Str = fmtWeapon(w1Part, attacker.w1);
      const w2Str = fmtWeapon(w2Part, attacker.w2);

      console.log(`${sGray('ATTACKER:')} ${sCyanBold(ATTACKER_PRESET)}`);
      console.log(`${sGray('  Armor:')} ${armorStr}`);
      console.log(`${sGray('  Weps :')} ${w1Str}  +  ${w2Str}`);
      console.log(`${sGray('  Miscs:')} ${misc1Str}  +  ${misc2Str}`);
      console.log(
        `${sGray('  Stats:')} HP=${attacker.hp} Spd=${attacker.speed} Acc=${attacker.acc} Dod=${attacker.dodge} ` +
          `Arm=${attacker.armor} (armF=${attacker.armorFactor.toFixed(6)})`,
      );
      console.log(
        `${sGray('  Skill:')} Gun=${attacker.gun} Prj=${attacker.prj} Mel=${attacker.mel} Def=${attacker.defSk}`,
      );
      console.log('');
    }

    const tactTag = cfg.tacticsMode === 'none' ? 'none' : `${cfg.tacticsMode}:${cfg.tacticsVal}`;
    const armSlotsTag = cfg.armorStatSlots === 'inherit' ? '' : `/s${cfg.armorStatSlots}`;
    const armStatTag =
      cfg.armorStatStack === cfg.crystalStackStats &&
      cfg.armorStatRound === cfg.statRound &&
      cfg.armorStatSlots === 'inherit'
        ? ''
        : ` ARMSTAT=${cfg.armorStatStack}/${cfg.armorStatRound}${armSlotsTag}`;

    const cfgSigObj = {
      hitRollMode: cfg.hitRollMode,
      hitGe: cfg.hitGe,
      hitQround: cfg.hitQround,
      skillRollMode: cfg.skillRollMode,
      skillGe: cfg.skillGe,
      skillQround: cfg.skillQround,
      dmgRoll: cfg.dmgRoll,

      armorK: cfg.armorK,
      armorApply: cfg.armorApply,
      armorRound: cfg.armorRound,
      projDefMult: cfg.projDefMult,
      hiddenPreset: cfg.hiddenPreset,
      speedTieMode: cfg.speedTieMode,
      tacticsMode: cfg.tacticsMode,
      tacticsVal: cfg.tacticsVal,
      sharedHit: cfg.sharedHit,
      sharedSkillMode: cfg.sharedSkillMode,

      crystalStackStats: cfg.crystalStackStats,
      crystalStackDmg: cfg.crystalStackDmg,
      crystalSlots: cfg.crystalSlots,

      actionStopOnKill: cfg.actionStopOnKill,

      maxTurns: cfg.maxTurns,
      rngMode,

      miscSkillTag: MISC_NO_CRYSTAL_SKILL_TWEAK_TAG,
      hfArmorBaseOverride: HF_ARMOR_BASE_OVERRIDE,
      voidSwordBaseMaxOverride: VOID_SWORD_BASE_MAX_OVERRIDE,
      armorStatStack: cfg.armorStatStack,
      armorStatRound: cfg.armorStatRound,
      armorStatSlots: cfg.armorStatSlots,
    };

    const cfgSig = hashStr32(stableStringify(cfgSigObj));
    const cfgSigHex = hex8(cfgSig);

    const logicKey = hashStr32(stableStringify({ attSig, cfgSig, defsSig }));
    const logicKeyHex = hex8(logicKey);

    const runKey = hashStr32(stableStringify({ logicKey, trials, seed, deterministic, rngMode }));
    const runKeyHex = hex8(runKey);

    const baselineKeyHex = baselineKeyOverride || logicKeyHex;

    const variantLineVerbose =
      `=== VARIANT ${vi + 1}/${variants.length}: ` +
      `HIT_ROLL=${cfg.hitRollMode}${cfg.hitGe ? '+GE' : ''} | HIT_QROUND=${cfg.hitQround} | ` +
      `SKILL_ROLL=${cfg.skillRollMode}${cfg.skillGe ? '+GE' : ''} | SKILL_QROUND=${cfg.skillQround} | ` +
      `DMG_ROLL=${cfg.dmgRoll} | CRYS=${cfg.crystalStackStats}/${cfg.crystalStackDmg}${armStatTag} | PROJ_DEF_MULT=${cfg.projDefMult} | ` +
      `SHARED_HIT=${cfg.sharedHit ? 'ON' : 'OFF'} | SHARED_SKILL=${cfg.sharedSkillMode} | ` +
      `SPEED_TIE=${cfg.speedTieMode} | HIDDEN=${cfg.hiddenPreset} | ` +
      `TACTICS=${tactTag} | ARMOR_K=${cfg.armorK} | ARMOR_APPLY=${cfg.armorApply} ARMOR_ROUND=${cfg.armorRound} | ` +
      `KEY=${logicKeyHex} ===`;

    const variantLineCompact =
      `=== VARIANT ${vi + 1}/${variants.length}: ` +
      `HIT=${cfg.hitRollMode}${cfg.hitGe ? '+GE' : ''}/${cfg.hitQround} ` +
      `SKILL=${cfg.skillRollMode}${cfg.skillGe ? '+GE' : ''}/${cfg.skillQround} ` +
      `DMG=${cfg.dmgRoll} CRYS=${cfg.crystalStackStats}/${cfg.crystalStackDmg}${armStatTag} ARMOR=K${cfg.armorK} ${cfg.armorApply}/${cfg.armorRound} ` +
      `SHIT=${cfg.sharedHit ? 1 : 0} SSK=${cfg.sharedSkillMode} ` +
      `TIE=${cfg.speedTieMode} HIDDEN=${cfg.hiddenPreset} TACT=${tactTag} ` +
      `MISC=${MISC_NO_CRYSTAL_SKILL_TWEAK_TAG} KEY=${logicKeyHex}`;

    console.log(outputVerbose ? variantLineVerbose : variantLineCompact);

    if (outputVerbose || compareBaselines || printBaselineTemplate) {
      console.log(
        `SIG: logic=${logicKeyHex} run=${runKeyHex} att=${attSigHex} cfg=${cfgSigHex} defs=${defsSigHex}` +
          (compareBaselines ? ` baselineKey=${baselineKeyHex}` : ''),
      );
    }

    if (printBaselineTemplate) {
      const tpl = makeBaselineTemplate({
        keyHex: baselineKeyHex,
        attackerPreset: ATTACKER_PRESET,
        cfgSigObj,
        defenderNames,
      });
      console.log('--- BASELINE TEMPLATE (paste/merge into legacy-baselines.json) ---');
      console.log(JSON.stringify(tpl, null, 2));
      console.log('--- END BASELINE TEMPLATE ---');
    }

    const _wins = [];
    let _sumWin = 0;
    let _minWin = 101;
    let _maxWin = -1;
    let _minName = '';
    let _maxName = '';
    const _cmp = { n: 0, meanAbsWin: 0, worstAbsWin: -1, worstName: '', rmsWin: 0 };

    // --- Payload helpers ---
    // Defender payloads historically used `upgrades: [<crystal>, <crystal>, <crystal>, <crystal>]` to mean *crystals*.
    // For weapons that support actual upgrades (Void Bow, Bio Gun Mk4, etc), you can now either:
    //   A) add upgrade names after the crystal in the same array:
    //        upgrades: ['Amulet Crystal', 'Laser Sight']
    //   B) or use explicit fields:
    //        crystal: 'Amulet Crystal', upgrades: ['Laser Sight']
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
      // Prefer explicit weaponUpgrades if present.
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
    for (let di = 0; di < payloads.length; di++) {
      const { name, payload } = payloads[di];

      if (deterministic) {
        const tag = (detTagBase ^ vi) | 0;
        const s = mix32((seed ^ mix32((logicKey ^ Math.imul(di, 0x9e3779b9) ^ tag) | 0)) | 0);
        RNG =
          rngMode === 'fast'
            ? makeRng('fast', s, s ^ 0xa341316c, s ^ 0xc8013ea4, s ^ 0xad90777d)
            : Math.random;
      }

      const defender = compileCombatantFromParts({
        name,
        stats: payload.stats,
        armorV: getV(payload.armor.name, partCrystal(payload.armor)),
        w1V: (() => {
          const [u1, u2] = partWeaponUpgrades(payload.weapon1);
          return getV(payload.weapon1.name, partCrystal(payload.weapon1), u1, u2);
        })(),
        w2V: (() => {
          const [u1, u2] = partWeaponUpgrades(payload.weapon2);
          return getV(payload.weapon2.name, partCrystal(payload.weapon2), u1, u2);
        })(),
        m1V: getV(payload.misc1.name, partCrystal(payload.misc1), '', '', 1),
        m2V: getV(payload.misc2.name, partCrystal(payload.misc2), '', '', 2),
        cfg,
        role: 'D',
      });

      if (SWAP_DEFENDER_WEPS) swapWeaponsInPlace(defender);

      const aFirst = attacker.speed >= defender.speed ? 'yes' : 'no';

      const aFirstLabel =
        attacker.speed > defender.speed
          ? 'yes'
          : attacker.speed < defender.speed
            ? 'no'
            : cfg.speedTieMode === 'random'
              ? 'tie-rand'
              : 'yes';

      if (debugStats) {
        const aArmorName =
          (ATTACKER_BUILD && ATTACKER_BUILD.armor && ATTACKER_BUILD.armor.name) || '';
        const aArmorCr =
          (ATTACKER_BUILD && ATTACKER_BUILD.armor && ATTACKER_BUILD.armor.crystal) || '';
        const dArmorName = (payload && payload.armor && payload.armor.name) || '';
        const dArmorCr = (payload && payload.armor ? partCrystal(payload.armor) : '') || '';
        console.log(
          `  DBG: ` +
            `A(Spd=${attacker.speed} Acc=${attacker.acc} Dod=${attacker.dodge} Arm=${attacker.armor} f=${attacker.armorFactor.toFixed(6)} ` +
            `Gun=${attacker.gun} Mel=${attacker.mel} Prj=${attacker.prj} Def=${attacker.defSk}) | ` +
            `D(Spd=${defender.speed} Acc=${defender.acc} Dod=${defender.dodge} Arm=${defender.armor} f=${defender.armorFactor.toFixed(6)} ` +
            `Gun=${defender.gun} Mel=${defender.mel} Prj=${defender.prj} Def=${defender.defSk}) | ` +
            (aArmorName ? `A_armor=${aArmorName}${aArmorCr ? ` [${aArmorCr}]` : ''} | ` : '') +
            (dArmorName ? `D_armor=${dArmorName}${dArmorCr ? ` [${dArmorCr}]` : ''} | ` : '') +
            `D_weps=${defender.w1 ? `${defender.w1.name}(${defender.w1.min}-${defender.w1.max})` : 'none'},${defender.w2 ? `${defender.w2.name}(${defender.w2.min}-${defender.w2.max})` : 'none'}`,
        );
      }

      const shouldTrace = traceFights > 0 && (traceDef ? traceDef === name : di === 0);
      const rollDump = wantRollDumpFor(name)
        ? {
            enabled: true,
            matchName: name,
            fights: rollDumpFights,
            maxTurns: rollDumpMaxTurns,
            maxLines: rollDumpMaxLines,
            lines: [],
          }
        : null;
      const traceCfg = { traceFights: shouldTrace ? traceFights : 0, rollDump };
      const { stats, traceLines } = runMatch(attacker, defender, cfg, traceCfg);

      const winPct = pct(stats.wins, cfg.trials);
      const avgT = stats.turnsTotal / cfg.trials;

      const A1 = stats.A.w1,
        A2 = stats.A.w2;
      const D1 = stats.D.w1,
        D2 = stats.D.w2;

      const A_hit1 = pct(A1.hit, A1.attempts),
        A_hit2 = pct(A2.hit, A2.attempts);
      const D_hit1 = pct(D1.hit, D1.attempts),
        D_hit2 = pct(D2.hit, D2.attempts);

      const A_skillGivenHit1 = pct(A1.skill, A1.hit),
        A_skillGivenHit2 = pct(A2.skill, A2.hit);
      const D_skillGivenHit1 = pct(D1.skill, D1.hit),
        D_skillGivenHit2 = pct(D2.skill, D2.hit);

      const A_overall1 = pct(A1.skill, A1.attempts),
        A_overall2 = pct(A2.skill, A2.attempts);
      const D_overall1 = pct(D1.skill, D1.attempts),
        D_overall2 = pct(D2.skill, D2.attempts);

      const aMin = stats.A.minActionDmg === 1e9 ? 0 : stats.A.minActionDmg;
      const aMax = stats.A.maxActionDmg;
      const dMin = stats.D.minActionDmg === 1e9 ? 0 : stats.D.minActionDmg;
      const dMax = stats.D.maxActionDmg;

      const gbFile = compareBaselines ? baselineLookup(baselineStore, baselineKeyHex, name) : null;

      const gbBuiltin =
        printGame || compareBaselines
          ? GAME_BASELINES[`${ATTACKER_PRESET}|${name}`] ||
            (baselineFallback ? GAME_BASELINES[name] : null)
          : null;

      const gb = gbFile || gbBuiltin;

      {
        const firstDisp = aFirstLabel === 'yes' ? 'A' : aFirstLabel === 'no' ? 'D' : 'Rand';

        const idxPlain = String(di + 1).padStart(2, '0');
        const idxStyled = USE_COLOR ? sGray(idxPlain) : idxPlain;

        const nameCol = ellipsizePad(name, nameW);
        const nameStyled = sCyanBold(nameCol);

        const winColPlain = `${fmtPct2(winPct)}%`.padStart(7);
        const winBadgePlain = `[${winColPlain}]`;
        const winBadgeStyled = colorWinPct(winPct, winBadgePlain);

        const firstStyled = colorFirst(firstDisp);

        const lineHeader = `- ${idxStyled} ${winBadgeStyled} ${nameStyled} | ${sBold('AvgT')} ${avgT.toFixed(2).padStart(6)} [${stats.turnsMin}-${stats.turnsMax}] | ${sBold('First')} ${firstStyled}`;

        const aDisp = fmtPairPct(A_overall1, A_overall2);
        const dDisp = fmtPairPct(D_overall1, D_overall2);

        const aHit = fmtPairPct(A_hit1, A_hit2);
        const dHit = fmtPairPct(D_hit1, D_hit2);

        const aDh = fmtPairPct(A_skillGivenHit1, A_skillGivenHit2);
        const dDh = fmtPairPct(D_skillGivenHit1, D_skillGivenHit2);

        const aRng = `${aMin}-${aMax}`;
        const dRng = `${dMin}-${dMax}`;

        const aDmgF = (stats.A.totalActionDmg / cfg.trials).toFixed(1);
        const dDmgF = (stats.D.totalActionDmg / cfg.trials).toFixed(1);

        const lab = (t) => (USE_COLOR ? sGray(t) : t);
        const hi = (t) => (USE_COLOR ? sBold(t) : t);
        const hiRng = (t) => (USE_COLOR ? sMagentaBold(t) : t);
        const mid = USE_COLOR ? sGray(' | ') : ' | ';

        const lineDetails =
          `  ${glyphVbar()} ${lab('A')} ${lab('disp')} ${hi(aDisp)} ${lab('rng')} ${hiRng(aRng)} ${lab('dmg/f')} ${hi(aDmgF)} ${lab('hit')} ${aHit} ${lab('sk|hit')} ${aDh}` +
          `${mid}${lab('D')} ${lab('disp')} ${hi(dDisp)} ${lab('rng')} ${hiRng(dRng)} ${lab('dmg/f')} ${hi(dDmgF)} ${lab('hit')} ${dHit} ${lab('sk|hit')} ${dDh}`;

        const lineVerbose = `${lineHeader} (A_spd=${attacker.speed} D_spd=${defender.speed})`;
        const lineCompact = `${lineHeader}
  ${lineDetails}`;

        const verboseBlocks =
          outputVerbose ||
          debugStats ||
          debugDps ||
          cfg.diag ||
          cfg.diagArmor ||
          PRINT_WEAPON_RNG ||
          shouldTrace;

        console.log(verboseBlocks ? lineVerbose : lineCompact);
        if (!verboseBlocks && sepOn && di < payloads.length - 1) console.log(sepLine);

        _wins.push(winPct);
        _sumWin += winPct;
        if (winPct < _minWin) {
          _minWin = winPct;
          _minName = name;
        }
        if (winPct > _maxWin) {
          _maxWin = winPct;
          _maxName = name;
        }

        if (compareBaselines && gb && gb.winPct != null) {
          const baseWin = gb.winPct;
          const baseAvgT = gb.avgTurns != null ? gb.avgTurns : null;
          const dWin = winPct - baseWin;
          const absWin = Math.abs(dWin);

          _cmp.n++;
          _cmp.meanAbsWin += absWin;
          _cmp.rmsWin += dWin * dWin;
          if (absWin > _cmp.worstAbsWin) {
            _cmp.worstAbsWin = absWin;
            _cmp.worstName = name;
          }

          if (!verboseBlocks) {
            const sDW = (dWin >= 0 ? '+' : '') + dWin.toFixed(2);
            let extra = '';
            if (baseAvgT != null) {
              const dT = avgT - baseAvgT;
              const sDT = (dT >= 0 ? '+' : '') + dT.toFixed(2);
              extra = ` avgT=${baseAvgT.toFixed(2)} (Δ${sDT})`;
            }
            console.log(
              `    INGAME win=${baseWin.toFixed(2)}% (Δ${sDW})${extra}  [key=${baselineKeyHex}]`,
            );
          }
        }

        if (verboseBlocks) {
          console.log(
            `  SIM A: hit=${fmtPct(A_hit1)}/${fmtPct(A_hit2)} dmg|hit=${fmtPct(A_skillGivenHit1)}/${fmtPct(A_skillGivenHit2)} overall=${fmtPct(A_overall1)}/${fmtPct(A_overall2)} | rng=${aMin}-${aMax}`,
          );
          console.log(
            `  SIM D: hit=${fmtPct(D_hit1)}/${fmtPct(D_hit2)} dmg|hit=${fmtPct(D_skillGivenHit1)}/${fmtPct(D_skillGivenHit2)} overall=${fmtPct(D_overall1)}/${fmtPct(D_overall2)} | rng=${dMin}-${dMax}`,
          );

          if (PRINT_WEAPON_RNG) {
            const fmtR = (c) =>
              Number.isFinite(c.rngMin) && c.dmg > 0 ? `${c.rngMin}-${c.rngMax}` : 'n/a';
            const Aw1 = fmtR(stats.A.w1);
            const Aw2 = fmtR(stats.A.w2);
            const Dw1 = fmtR(stats.D.w1);
            const Dw2 = fmtR(stats.D.w2);
            console.log(`  RNG by weapon: A_w1=${Aw1} A_w2=${Aw2} | D_w1=${Dw1} D_w2=${Dw2}`);
          }

          if (cfg.diag && stats.diagA && stats.diagD) {
            const pct2 = (n, d) => (d ? ((100 * n) / d).toFixed(2) : '0.00');
            const avg2 = (sum, d) => (d ? (sum / d).toFixed(2) : '0.00');
            const da = stats.diagA;
            const dd = stats.diagD;
            console.log(
              `  DIAG A: avgRawAct=${avg2(da.rawSum, da.actions)} avgAppAct=${avg2(da.appliedSum, da.actions)} ` +
                `w1Over=${pct2(da.w1Overkill, da.actions)}% w2Over=${pct2(da.w2Overkill, da.actions)}% w2OnDead=${pct2(da.w2OnDead, da.actions)}%`,
            );
            console.log(
              `  DIAG D: avgRawAct=${avg2(dd.rawSum, dd.actions)} avgAppAct=${avg2(dd.appliedSum, dd.actions)} ` +
                `w1Over=${pct2(dd.w1Overkill, dd.actions)}% w2Over=${pct2(dd.w2Overkill, dd.actions)}% w2OnDead=${pct2(dd.w2OnDead, dd.actions)}%`,
            );
          }

          if (debugDps) {
            const turnsTotal = stats.turnsTotal || 1;
            const A_dpt = stats.A.totalActionDmg / turnsTotal;
            const D_dpt = stats.D.totalActionDmg / turnsTotal;
            const A_dpa = stats.A.acts ? stats.A.totalActionDmg / stats.A.acts : 0;
            const D_dpa = stats.D.acts ? stats.D.totalActionDmg / stats.D.acts : 0;
            console.log(
              `  SIM DPS: A(dpt=${A_dpt.toFixed(1)} dpa=${A_dpa.toFixed(1)} acts=${stats.A.acts}) | D(dpt=${D_dpt.toFixed(1)} dpa=${D_dpa.toFixed(1)} acts=${stats.D.acts})`,
            );
          }

          if (gb) {
            const A_overall_game_1 = (gb.A_hit * gb.A_dmg1) / 100;
            const A_overall_game_2 = (gb.A_hit * gb.A_dmg2) / 100;
            const D_overall_game_1 = (gb.D_hit * gb.D_dmg1) / 100;
            const D_overall_game_2 = (gb.D_hit * gb.D_dmg2) / 100;

            console.log(
              `  GAME : Win=${gb.winPct.toFixed(2)}% AvgT=${gb.avgTurns.toFixed(2)} | ` +
                `A_hit=${gb.A_hit} dmg|hit=${gb.A_dmg1}/${gb.A_dmg2} overall=${Math.round(A_overall_game_1)}/${Math.round(A_overall_game_2)} | ` +
                `D_hit=${gb.D_hit} dmg|hit=${gb.D_dmg1}/${gb.D_dmg2} overall=${Math.round(D_overall_game_1)}/${Math.round(D_overall_game_2)} | ` +
                `A_rng=${gb.A_rng[0]}-${gb.A_rng[1]} D_rng=${gb.D_rng[0]}-${gb.D_rng[1]}`,
            );

            if (diagRange && gb && gb.A_rng && gb.D_rng) {
              const want =
                !diagRangeDefFilter ||
                String(name || '')
                  .toLowerCase()
                  .includes(diagRangeDefFilter);
              if (want) {
                const aR = predictPosActionRangeFromWeaponMinMax(
                  attacker.w1 ? attacker.w1.min : 0,
                  attacker.w1 ? attacker.w1.max : 0,
                  attacker.w2 ? attacker.w2.min : 0,
                  attacker.w2 ? attacker.w2.max : 0,
                  attacker.level,
                  defender.armor,
                  cfg.armorK,
                  cfg.armorApply,
                  cfg.armorRound,
                );
                const dR = predictPosActionRangeFromWeaponMinMax(
                  defender.w1 ? defender.w1.min : 0,
                  defender.w1 ? defender.w1.max : 0,
                  defender.w2 ? defender.w2.min : 0,
                  defender.w2 ? defender.w2.max : 0,
                  defender.level,
                  attacker.armor,
                  cfg.armorK,
                  cfg.armorApply,
                  cfg.armorRound,
                );

                console.log(
                  `  DIAG_RANGE: ` +
                    `A(pred=${aR.min}-${aR.max} obs=${aMin}-${aMax} game=${gb.A_rng[0]}-${gb.A_rng[1]}) | ` +
                    `D(pred=${dR.min}-${dR.max} obs=${dMin}-${dMax} game=${gb.D_rng[0]}-${gb.D_rng[1]}) | ` +
                    `defArm=${defender.armor} attArm=${attacker.armor} K=${cfg.armorK} ${cfg.armorApply}/${cfg.armorRound}`,
                );

                if (diagRangeSweep) {
                  const rounds = ['floor', 'round', 'ceil'];
                  const applies = ['per_weapon', 'sum'];

                  const aParts = [];
                  const dParts = [];

                  for (const ap of applies) {
                    for (const rd of rounds) {
                      const aRR = predictPosActionRangeFromWeaponMinMax(
                        attacker.w1 ? attacker.w1.min : 0,
                        attacker.w1 ? attacker.w1.max : 0,
                        attacker.w2 ? attacker.w2.min : 0,
                        attacker.w2 ? attacker.w2.max : 0,
                        attacker.level,
                        defender.armor,
                        cfg.armorK,
                        ap,
                        rd,
                      );
                      aParts.push(`${ap}/${rd}:${aRR.min}-${aRR.max}`);

                      const dRR = predictPosActionRangeFromWeaponMinMax(
                        defender.w1 ? defender.w1.min : 0,
                        defender.w1 ? defender.w1.max : 0,
                        defender.w2 ? defender.w2.min : 0,
                        defender.w2 ? defender.w2.max : 0,
                        defender.level,
                        attacker.armor,
                        cfg.armorK,
                        ap,
                        rd,
                      );
                      dParts.push(`${ap}/${rd}:${dRR.min}-${dRR.max}`);
                    }
                  }

                  console.log(
                    `  DIAG_RANGE_SWEEP: A ${aParts.join(' | ')} (game=${gb.A_rng[0]}-${gb.A_rng[1]})`,
                  );
                  console.log(
                    `  DIAG_RANGE_SWEEP: D ${dParts.join(' | ')} (game=${gb.D_rng[0]}-${gb.D_rng[1]})`,
                  );
                }
              }
            }

            if (cfg.diagArmor) {
              const A_w1Max = attacker.w1 ? attacker.w1.max : 0;
              const A_w2Max = attacker.w2 ? attacker.w2.max : 0;

              const predAmaxAtDefArmor = predictMaxActionFromWeaponMax(
                A_w1Max,
                A_w2Max,
                attacker.level,
                defender.armor,
                cfg.armorK,
                cfg.armorApply,
                cfg.armorRound,
              );
              const impliedDef = solveImpliedArmorForTargetMax({
                w1Max: A_w1Max,
                w2Max: A_w2Max,
                level: attacker.level,
                armorK: cfg.armorK,
                armorApply: cfg.armorApply,
                armorRound: cfg.armorRound,
                targetMax: gb.A_rng[1],
                searchMax: 1200,
              });

              const D_w1Max = defender.w1 ? defender.w1.max : 0;
              const D_w2Max = defender.w2 ? defender.w2.max : 0;

              const predDmaxAtAttArmor = predictMaxActionFromWeaponMax(
                D_w1Max,
                D_w2Max,
                defender.level,
                attacker.armor,
                cfg.armorK,
                cfg.armorApply,
                cfg.armorRound,
              );
              const impliedAtt = solveImpliedArmorForTargetMax({
                w1Max: D_w1Max,
                w2Max: D_w2Max,
                level: defender.level,
                armorK: cfg.armorK,
                armorApply: cfg.armorApply,
                armorRound: cfg.armorRound,
                targetMax: gb.D_rng[1],
                searchMax: 1200,
              });

              console.log(
                `  DIAG_ARMOR: Amax@defArmor=${predAmaxAtDefArmor} gameAmax=${gb.A_rng[1]} ` +
                  `=> impliedDefArmor≈${impliedDef.armor} (Δ=${impliedDef.armor - defender.armor}, err=${impliedDef.err})`,
              );
              console.log(
                `  DIAG_ARMOR: Dmax@attArmor=${predDmaxAtAttArmor} gameDmax=${gb.D_rng[1]} ` +
                  `=> impliedAttArmor≈${impliedAtt.armor} (Δ=${impliedAtt.armor - attacker.armor}, err=${impliedAtt.err})`,
              );
              const impliedDefK = solveImpliedKForTargetMax({
                w1Max: A_w1Max,
                w2Max: A_w2Max,
                level: attacker.level,
                armor: defender.armor,
                armorApply: cfg.armorApply,
                armorRound: cfg.armorRound,
                targetMax: gb.A_rng[1],
                kLo: 4,
                kHi: 14,
                kStep: 0.01,
              });
              const impliedAttK = solveImpliedKForTargetMax({
                w1Max: D_w1Max,
                w2Max: D_w2Max,
                level: defender.level,
                armor: attacker.armor,
                armorApply: cfg.armorApply,
                armorRound: cfg.armorRound,
                targetMax: gb.D_rng[1],
                kLo: 4,
                kHi: 14,
                kStep: 0.01,
              });
              console.log(
                `  DIAG_ARMOR_K: ` +
                  `Amax@defArmor => impliedK≈${impliedDefK.k.toFixed(2)} (pred=${impliedDefK.pred}, err=${impliedDefK.err}) | ` +
                  `Dmax@attArmor => impliedK≈${impliedAttK.k.toFixed(2)} (pred=${impliedAttK.pred}, err=${impliedAttK.err})`,
              );

              try {
                const meta = defender && defender.__meta ? defender.__meta : null;
                const gameDmax = gb.D_rng[1];
                const simDmax = predDmaxAtAttArmor;
                const delta = gameDmax - simDmax;
                if (
                  meta &&
                  delta !== 0 &&
                  (meta.w1?.itemName === 'Void Sword' || meta.w2?.itemName === 'Void Sword')
                ) {
                  const f = attacker.armorFactor;
                  const w1Max = defender.w1?.max ?? defender.weapon1?.max;
                  const w2Max = defender.w2?.max ?? defender.weapon2?.max;
                  const r1 = applyArmorAndRound(w1Max, f, cfg.armorRound);
                  const r2 = applyArmorAndRound(w2Max, f, cfg.armorRound);

                  const voidIsW1 = meta.w1?.itemName === 'Void Sword';
                  const otherR = voidIsW1 ? r2 : r1;
                  const needR = gameDmax - otherR;
                  const lo = (needR - 0.5) / f;
                  const hi = (needR + 0.499999) / f;
                  const needPost = Math.max(1, Math.round((lo + hi) / 2));

                  const voidCrystal = voidIsW1 ? meta.w1?.crystalName : meta.w2?.crystalName;
                  const baseNow =
                    ItemDefs['Void Sword'] && ItemDefs['Void Sword'].baseWeaponDamage
                      ? ItemDefs['Void Sword'].baseWeaponDamage.max
                      : 0;
                  const dmgPctEach =
                    voidCrystal && CrystalDefs[voidCrystal] && CrystalDefs[voidCrystal].dmgPct
                      ? CrystalDefs[voidCrystal].dmgPct
                      : 0;
                  const dmgPctSum = 4 * dmgPctEach;

                  let bestBase = baseNow;
                  let bestPost = applyWeaponDmgRound(baseNow * (1 + dmgPctSum), cfg.weaponDmgRound);
                  let bestErr = Math.abs(bestPost - needPost);
                  for (let b = Math.max(1, baseNow - 25); b <= baseNow + 25; b++) {
                    const post = applyWeaponDmgRound(b * (1 + dmgPctSum), cfg.weaponDmgRound);
                    const e = Math.abs(post - needPost);
                    if (e < bestErr) {
                      bestErr = e;
                      bestBase = b;
                      bestPost = post;
                    }
                  }

                  console.log(
                    `  DIAG_WEAPON: GAME Dmax delta=${delta} suggests Void Sword postMax≈${needPost} (current ${voidIsW1 ? w1Max : w2Max}); ` +
                      `try LEGACY_VOID_SWORD_BASE_MAX_OVERRIDE≈${bestBase} (postMax=${bestPost}, crystal=${voidCrystal || 'n/a'}, dmgPctSum=${Math.round(dmgPctSum * 100)}%)`,
                  );
                }
              } catch {}
            }
          }
        } else {
          if (gb && printGame) {
            const A_overall_game_1 = (gb.A_hit * gb.A_dmg1) / 100;
            const A_overall_game_2 = (gb.A_hit * gb.A_dmg2) / 100;
            const D_overall_game_1 = (gb.D_hit * gb.D_dmg1) / 100;
            const D_overall_game_2 = (gb.D_hit * gb.D_dmg2) / 100;
            console.log(
              `  GAME : Win=${gb.winPct.toFixed(2)}% AvgT=${gb.avgTurns.toFixed(2)} | ` +
                `A_hit=${gb.A_hit} dmg|hit=${gb.A_dmg1}/${gb.A_dmg2} overall=${Math.round(A_overall_game_1)}/${Math.round(A_overall_game_2)} | ` +
                `D_hit=${gb.D_hit} dmg|hit=${gb.D_dmg1}/${gb.D_dmg2} overall=${Math.round(D_overall_game_1)}/${Math.round(D_overall_game_2)} | ` +
                `A_rng=${gb.A_rng[0]}-${gb.A_rng[1]} D_rng=${gb.D_rng[0]}-${gb.D_rng[1]}`,
            );

            if (diagRange && gb && gb.A_rng && gb.D_rng) {
              const want =
                !diagRangeDefFilter ||
                String(name || '')
                  .toLowerCase()
                  .includes(diagRangeDefFilter);
              if (want) {
                const aR = predictPosActionRangeFromWeaponMinMax(
                  attacker.w1 ? attacker.w1.min : 0,
                  attacker.w1 ? attacker.w1.max : 0,
                  attacker.w2 ? attacker.w2.min : 0,
                  attacker.w2 ? attacker.w2.max : 0,
                  attacker.level,
                  defender.armor,
                  cfg.armorK,
                  cfg.armorApply,
                  cfg.armorRound,
                );
                const dR = predictPosActionRangeFromWeaponMinMax(
                  defender.w1 ? defender.w1.min : 0,
                  defender.w1 ? defender.w1.max : 0,
                  defender.w2 ? defender.w2.min : 0,
                  defender.w2 ? defender.w2.max : 0,
                  defender.level,
                  attacker.armor,
                  cfg.armorK,
                  cfg.armorApply,
                  cfg.armorRound,
                );

                console.log(
                  `  DIAG_RANGE: ` +
                    `A(pred=${aR.min}-${aR.max} obs=${aMin}-${aMax} game=${gb.A_rng[0]}-${gb.A_rng[1]}) | ` +
                    `D(pred=${dR.min}-${dR.max} obs=${dMin}-${dMax} game=${gb.D_rng[0]}-${gb.D_rng[1]}) | ` +
                    `defArm=${defender.armor} attArm=${attacker.armor} K=${cfg.armorK} ${cfg.armorApply}/${cfg.armorRound}`,
                );

                if (diagRangeSweep) {
                  const rounds = ['floor', 'round', 'ceil'];
                  const applies = ['per_weapon', 'sum'];
                  const aParts = [];
                  const dParts = [];
                  for (const ap of applies) {
                    for (const rd of rounds) {
                      const aRR = predictPosActionRangeFromWeaponMinMax(
                        attacker.w1 ? attacker.w1.min : 0,
                        attacker.w1 ? attacker.w1.max : 0,
                        attacker.w2 ? attacker.w2.min : 0,
                        attacker.w2 ? attacker.w2.max : 0,
                        attacker.level,
                        defender.armor,
                        cfg.armorK,
                        ap,
                        rd,
                      );
                      aParts.push(`${ap}/${rd}:${aRR.min}-${aRR.max}`);

                      const dRR = predictPosActionRangeFromWeaponMinMax(
                        defender.w1 ? defender.w1.min : 0,
                        defender.w1 ? defender.w1.max : 0,
                        defender.w2 ? defender.w2.min : 0,
                        defender.w2 ? defender.w2.max : 0,
                        defender.level,
                        attacker.armor,
                        cfg.armorK,
                        ap,
                        rd,
                      );
                      dParts.push(`${ap}/${rd}:${dRR.min}-${dRR.max}`);
                    }
                  }
                  console.log(
                    `  DIAG_RANGE_SWEEP: A ${aParts.join(' | ')} (game=${gb.A_rng[0]}-${gb.A_rng[1]})`,
                  );
                  console.log(
                    `  DIAG_RANGE_SWEEP: D ${dParts.join(' | ')} (game=${gb.D_rng[0]}-${gb.D_rng[1]})`,
                  );
                }
              }
            }
          }
        }

        const wantExact = cfg.exactVerbose || verboseBlocks || printExact;
        if (wantExact) {
          const ex = exactDispChances(attacker, defender, cfg);

          let swapNote = '';
          if (cfg.exactSwap && attacker.w2) {
            swapNote =
              ` (swap dmg|hit=${ex.A_sk1_swap}/${ex.A_sk2_swap} overall=${ex.A_all1_swap}/${ex.A_all2_swap}` +
              ` | D swap dmg|hit=${ex.D_sk1_swap}/${ex.D_sk2_swap} overall=${ex.D_all1_swap}/${ex.D_all2_swap})`;
          }

          console.log(
            `${verboseBlocks ? 'Exact UI:' : '  Exact:'} A hit=${ex.A_hit} dmg|hit=${ex.A_sk1}/${ex.A_sk2} overall=${ex.A_all1}/${ex.A_all2} ` +
              `| D hit=${ex.D_hit} dmg|hit=${ex.D_sk1}/${ex.D_sk2} overall=${ex.D_all1}/${ex.D_all2}` +
              swapNote,
          );

          if (cfg.exactVerbose) {
            const pct = (x) => (x * 100).toFixed(3);
            console.log(
              `Exact raw: A hit=${pct(ex.A_hit_p)}% dmg|hit=${pct(ex.A_sk1_p)}%/${pct(ex.A_sk2_p)}% ` +
                `| D hit=${pct(ex.D_hit_p)}% dmg|hit=${pct(ex.D_sk1_p)}%/${pct(ex.D_sk2_p)}%`,
            );
          }
        }
      }

      if (traceLines.length) {
        console.log(
          `\n  === TRACE (${traceLines.filter((l) => l.startsWith('-- Fight')).length} fights) for "${name}" ===`,
        );
        for (const line of traceLines) console.log(`  ${line}`);
        console.log('');
      }

      if (
        traceCfg &&
        traceCfg.rollDump &&
        traceCfg.rollDump.lines &&
        traceCfg.rollDump.lines.length
      ) {
        console.log(
          `\n  === ROLL_DUMP for "${name}" (fights=${traceCfg.rollDump.fights}, maxTurns=${traceCfg.rollDump.maxTurns}, maxLines=${traceCfg.rollDump.maxLines}) ===`,
        );
        for (const line of traceCfg.rollDump.lines) console.log(`  ${line}`);
        console.log('  === END ROLL_DUMP ===\n');
      }
    }

    if (summaryOn && _wins.length) {
      const meanWin = _sumWin / _wins.length;
      console.log(
        `SUMMARY: meanWin=${meanWin.toFixed(2)}% min=${_minWin.toFixed(2)}% (${_minName}) max=${_maxWin.toFixed(2)}% (${_maxName})`,
      );
    }

    if (compareBaselines) {
      if (_cmp.n > 0) {
        const meanAbs = _cmp.meanAbsWin / _cmp.n;
        const rms = Math.sqrt(_cmp.rmsWin / _cmp.n);
        console.log(
          `COMPARE: n=${_cmp.n} meanAbsΔWin=${meanAbs.toFixed(2)}% rmsΔWin=${rms.toFixed(2)}% ` +
            `worstAbsΔWin=${_cmp.worstAbsWin.toFixed(2)}% (${_cmp.worstName}) [key=${baselineKeyHex}]`,
        );
        variantCmpSummaries.push({
          vi,
          logicKeyHex,
          baselineKeyHex,
          n: _cmp.n,
          meanAbs,
          rms,
          worstAbs: _cmp.worstAbsWin,
          worstName: _cmp.worstName,
          params: {
            hitRollMode: cfg.hitRollMode,
            hitGe: cfg.hitGe,
            hitQround: cfg.hitQround,
            skillRollMode: cfg.skillRollMode,
            skillGe: cfg.skillGe,
            skillQround: cfg.skillQround,
            dmgRoll: cfg.dmgRoll,
            armorK: cfg.armorK,
            armorApply: cfg.armorApply,
            armorRound: cfg.armorRound,
            statRound: cfg.statRound,
          },
        });
      } else {
        console.log(`COMPARE: no baselines matched for key=${baselineKeyHex}`);
      }
    }

    console.log('');
  }

  if (compareBaselines && variantCmpSummaries.length > 1) {
    const best = variantCmpSummaries.slice().sort((a, b) => {
      if (a.rms !== b.rms) return a.rms - b.rms;
      if (a.meanAbs !== b.meanAbs) return a.meanAbs - b.meanAbs;
      return a.worstAbs - b.worstAbs;
    })[0];

    const ENV_MAP = {
      hitRollMode: 'LEGACY_HIT_ROLL_MODE',
      hitGe: 'LEGACY_HIT_GE',
      hitQround: 'LEGACY_HIT_QROUND',
      skillRollMode: 'LEGACY_SKILL_ROLL_MODE',
      skillGe: 'LEGACY_SKILL_GE',
      skillQround: 'LEGACY_SKILL_QROUND',
      dmgRoll: 'LEGACY_DMG_ROLL',
      armorK: 'LEGACY_ARMOR_K',
      armorApply: 'LEGACY_ARMOR_APPLY',
      armorRound: 'LEGACY_ARMOR_ROUND',
      statRound: 'LEGACY_STAT_ROUND',
    };

    const keys = Object.keys(best.params || {});
    const varying = [];
    for (const k of keys) {
      const s = new Set();
      for (const row of variantCmpSummaries) s.add(String((row.params || {})[k]));
      if (s.size > 1) varying.push(k);
    }

    console.log(
      `BEST MATCH: VARIANT ${best.vi + 1}/${variants.length} | meanAbsΔWin=${fmtPct2(best.meanAbs)} rmsΔWin=${fmtPct2(
        best.rms,
      )} worstAbsΔWin=${fmtPct2(best.worstAbs)} (${best.worstName}) | KEY=${best.logicKeyHex}`,
    );

    const envLines = [];
    for (const k of varying) {
      const envName = ENV_MAP[k];
      if (!envName) continue;
      const val = best.params[k];
      if (val === undefined || val === null || val === '') continue;
      envLines.push(`${envName}=${val}`);
    }

    if (envLines.length) {
      console.log('RE-RUN (no sweeps): ' + envLines.join(' '));
    }
  }

  console.log('=== END OUTPUT ===');
}

main();
