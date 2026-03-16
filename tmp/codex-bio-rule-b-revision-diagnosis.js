'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const TRACKED_LEGACY = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const TRACKED_BRUTE = path.join(REPO, 'brute-sim-v1.4.6.js');
const TMP_LEGACY = path.join(__dirname, 'legacy-sim-v1.0.4-clean.unpatched-bio.js');
const TMP_BRUTE = path.join(__dirname, 'brute-sim-v1.4.6.unpatched-bio.js');
const DOUBLE_TRUTH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const DOUBLE_PATCHED_LOG = path.join(__dirname, 'codex-bio-rule-b-revision-double-patched.log');
const DOUBLE_UNPATCHED_LOG = path.join(__dirname, 'codex-bio-rule-b-revision-double-unpatched.log');
const SLOT_PATCHED_LOG = path.join(__dirname, 'codex-bio-rule-b-revision-slot-patched.log');
const SLOT_UNPATCHED_LOG = path.join(__dirname, 'codex-bio-rule-b-revision-slot-unpatched.log');
const PATCH_REPORT = path.join(__dirname, 'codex-bio-rule-b-patch-report.md');
const VALIDATION_REPORT = path.join(__dirname, 'codex-bio-rule-validation.md');
const VARIANT_REPORT = path.join(__dirname, 'codex-bio-variant-instrumentation.md');
const DUP_COLOR_REPORT = path.join(__dirname, 'codex-bio-duplicate-color-diagnosis.md');
const REPLAY_COMPARE = path.join(REPO, 'tools', 'legacy-truth-replay-compare.js');
const REPORT_PATH = path.join(__dirname, 'codex-bio-rule-b-revision-diagnosis.md');

const REQUIRED = [
  PATCH_REPORT,
  VALIDATION_REPORT,
  VARIANT_REPORT,
  DUP_COLOR_REPORT,
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  TRACKED_LEGACY,
  TRACKED_BRUTE,
  REPLAY_COMPARE,
  TMP_LEGACY,
  TMP_BRUTE,
  DOUBLE_PATCHED_LOG,
  DOUBLE_UNPATCHED_LOG,
  SLOT_PATCHED_LOG,
  SLOT_UNPATCHED_LOG,
];

const COMMANDS = [
  'ls -1 ./tmp/codex-bio-rule-b-patch-report.md ./tmp/codex-bio-rule-validation.md ./tmp/codex-bio-variant-instrumentation.md ./tmp/codex-bio-duplicate-color-diagnosis.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./tools/legacy-truth-replay-compare.js',
  'rg -n "isValidatedDuplicateBioPinkVariant|scaleVariantCrystalDelta|applyValidatedDuplicateBioPinkScaling|const \\\\[m1Eff, m2Eff\\\\]" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  "cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js",
  "cp ./brute-sim-v1.4.6.js ./tmp/brute-sim-v1.4.6.unpatched-bio.js",
  'apply_patch ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js (remove only Rule B helper block and call site)',
  'apply_patch ./tmp/brute-sim-v1.4.6.unpatched-bio.js (remove only Rule B helper block and call sites)',
  'node --check ./legacy-sim-v1.0.4-clean.js',
  'node --check ./brute-sim-v1.4.6.js',
  'node --check ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js',
  'node --check ./tmp/brute-sim-v1.4.6.unpatched-bio.js',
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-double-patched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-revision-double-patched.log 2>&1",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-double-unpatched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js > ./tmp/codex-bio-rule-b-revision-double-unpatched.log 2>&1",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-slot-patched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-revision-slot-patched.log 2>&1",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-revision-slot-unpatched' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js > ./tmp/codex-bio-rule-b-revision-slot-unpatched.log 2>&1",
  'node ./tmp/codex-bio-rule-b-revision-diagnosis.js',
];

const DOUBLE_ROWS = [
  'DL Dual Rift No Bio',
  'DL Dual Rift One Bio P4',
  'DL Dual Rift Two Bio P4',
  'DL Dual Rift Bio P4 + O4',
  'DL Core/Rift No Bio',
  'DL Core/Rift One Bio P4',
  'DL Core/Rift Two Bio P4',
  'DL Core/Rift Bio P4 + O4',
];

const SLOT_PAIRS = [
  {
    shell: 'Dual Rift',
    left: 'DL Dual Rift One Bio Left P4',
    right: 'DL Dual Rift One Bio Right P4',
    label: 'Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4]',
  },
  {
    shell: 'Dual Rift',
    left: 'DL Dual Rift Bio P4 + O4',
    right: 'DL Dual Rift Bio O4 + P4',
    label: 'Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4]',
  },
  {
    shell: 'Core/Rift',
    left: 'DL Core/Rift One Bio Left P4',
    right: 'DL Core/Rift One Bio Right P4',
    label: 'Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4]',
  },
  {
    shell: 'Core/Rift',
    left: 'DL Core/Rift Bio P4 + O4',
    right: 'DL Core/Rift Bio O4 + P4',
    label: 'Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4]',
  },
];

const STATE_KEYS = ['speed', 'acc', 'dodge', 'defSk', 'gun', 'mel', 'prj'];
const CANONICAL_PARTS = {
  scoutP4: {
    name: 'Scout Drones',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  },
  bioP4: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  },
  bioO4: {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'],
  },
};

function ensureFiles() {
  for (const filePath of REQUIRED) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fmtNum(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function fmtSigned(value, digits = 3) {
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function quote(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function loadSimInternals(simPath) {
  const source = fs.readFileSync(simPath, 'utf8').replace(/^#!.*\n/, '');
  const exportBlock = `
module.exports.__codex = {
  makeVariantList,
  computeVariantFromCrystalSpec,
  partCrystalSpec,
};
`;
  const wrapped = Module.wrap(source + '\n' + exportBlock);
  const compiled = vm.runInThisContext(wrapped, { filename: simPath });
  const mod = { exports: {} };
  const req = Module.createRequire(simPath);
  const originalEnv = process.env;
  process.env = {
    ...process.env,
    LEGACY_SHARED_HIT: '1',
    LEGACY_COMPARE: '0',
    LEGACY_DIAG: '1',
    LEGACY_PRINT_GAME: '0',
    LEGACY_COLOR: '0',
    LEGACY_ASCII: '1',
    LEGACY_HEADER: 'min',
    LEGACY_OUTPUT: 'compact',
  };
  try {
    compiled(mod.exports, req, mod, simPath, path.dirname(simPath));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function parseCompareLog(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const summaryMatch = text.match(
    /SUMMARY meanAbsΔwin=([0-9.]+) meanAbsΔavgT=([0-9.]+) worstAbsΔwin=([0-9.]+) \((.+?)\)/,
  );
  const rows = new Map();
  const rowRe =
    /^\d+\s+CUSTOM \| (.+?) \| win ([0-9.]+)->([0-9.]+) s\/a ([+-][0-9.]+) \/ [0-9.]+ \| avgT ([0-9.]+)->([0-9.]+) s\/a ([+-][0-9.]+) \/ [0-9.]+$/gm;
  let match;
  while ((match = rowRe.exec(text))) {
    rows.set(match[1], {
      row: match[1],
      truthWin: Number(match[2]),
      simWin: Number(match[3]),
      errWin: Number(match[4]),
      truthAvgT: Number(match[5]),
      simAvgT: Number(match[6]),
      errAvgT: Number(match[7]),
    });
  }
  return {
    text,
    rows,
    summary: summaryMatch
      ? {
          meanAbsWin: Number(summaryMatch[1]),
          meanAbsAvgT: Number(summaryMatch[2]),
          worstAbsWin: Number(summaryMatch[3]),
          worstRow: summaryMatch[4],
        }
      : null,
  };
}

function truthMap(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) out.set(matchup.defender, matchup);
  return out;
}

function partCrystalSpecSummary(sim, part) {
  const spec = sim.partCrystalSpec(part);
  if (spec == null) return '';
  if (typeof spec === 'string') return spec;
  const names = Object.keys(spec).sort((a, b) => a.localeCompare(b));
  return names.map((name) => `${name}:${spec[name]}`).join('+');
}

function variantState(v) {
  return {
    speed: v.addSpeed || 0,
    acc: v.addAcc || 0,
    dodge: v.addDod || 0,
    defSk: v.addDef || 0,
    gun: v.addGun || 0,
    mel: v.addMel || 0,
    prj: v.addPrj || 0,
  };
}

function addState(a, b) {
  const out = {};
  for (const key of STATE_KEYS) out[key] = (a[key] || 0) + (b[key] || 0);
  return out;
}

function diffState(a, b) {
  const out = {};
  for (const key of STATE_KEYS) out[key] = (b[key] || 0) - (a[key] || 0);
  return out;
}

function currentRuleWouldMatch(v) {
  if (!v || v.itemName !== 'Bio Spinal Enhancer') return false;
  const mix = v.crystalMix || null;
  if (!mix || typeof mix !== 'object') return false;
  const names = Object.keys(mix);
  return names.length === 1 && names[0] === 'Perfect Pink Crystal' && Number(mix[names[0]]) === 4;
}

function stateString(s) {
  return `Spd ${fmtNum(s.speed, 1)}, Acc ${fmtNum(s.acc, 1)}, Dod ${fmtNum(s.dodge, 1)}, Def ${fmtNum(s.defSk, 1)}, Gun ${fmtNum(s.gun, 1)}, Mel ${fmtNum(s.mel, 1)}, Prj ${fmtNum(s.prj, 1)}`;
}

function loadCanonicalStates(simPath) {
  const sim = loadSimInternals(simPath);
  const cfg = { ...sim.makeVariantList()[0], diag: true };
  function getVariant(part, slotTag) {
    const spec = sim.partCrystalSpec(part);
    return {
      spec,
      specSummary: partCrystalSpecSummary(sim, part),
      variant: sim.computeVariantFromCrystalSpec(part.name, spec, [], cfg, slotTag),
    };
  }
  const scout = getVariant(CANONICAL_PARTS.scoutP4, 1);
  const bioP = getVariant(CANONICAL_PARTS.bioP4, 1);
  const bioO = getVariant(CANONICAL_PARTS.bioO4, 2);
  const states = {
    'Scout[P4] + Scout[P4]': addState(variantState(scout.variant), variantState(scout.variant)),
    'Bio[P4] + Scout[P4]': addState(variantState(bioP.variant), variantState(scout.variant)),
    'Bio[P4] + Bio[P4]': addState(variantState(bioP.variant), variantState(bioP.variant)),
    'Bio[P4] + Bio[O4]': addState(variantState(bioP.variant), variantState(bioO.variant)),
  };
  return {
    scout,
    bioP,
    bioO,
    states,
  };
}

function rowTableRows(doubleTruthMap, unpatched, patched) {
  return DOUBLE_ROWS.map((row) => {
    const truth = doubleTruthMap.get(row).aggregates;
    const u = unpatched.rows.get(row);
    const p = patched.rows.get(row);
    return {
      row,
      truthWin: Number(truth.attackerWinPct),
      truthAvgT: Number(truth.avgTurns),
      unpatchedWin: u.simWin,
      unpatchedAvgT: u.simAvgT,
      patchedWin: p.simWin,
      patchedAvgT: p.simAvgT,
      unpatchedErrWin: u.errWin,
      unpatchedErrAvgT: u.errAvgT,
      patchedErrWin: p.errWin,
      patchedErrAvgT: p.errAvgT,
      deltaWin: p.simWin - u.simWin,
      deltaAvgT: p.simAvgT - u.simAvgT,
    };
  });
}

function pairTruth(slotTruthMap, left, right) {
  const l = slotTruthMap.get(left).aggregates;
  const r = slotTruthMap.get(right).aggregates;
  return {
    win: Number(r.attackerWinPct) - Number(l.attackerWinPct),
    avgT: Number(r.avgTurns) - Number(l.avgTurns),
  };
}

function pairSim(rowsMap, left, right) {
  const l = rowsMap.get(left);
  const r = rowsMap.get(right);
  return {
    win: r.simWin - l.simWin,
    avgT: r.simAvgT - l.simAvgT,
  };
}

function main() {
  ensureFiles();

  const doubleTruth = truthMap(readJson(DOUBLE_TRUTH));
  const slotTruth = truthMap(readJson(SLOT_TRUTH));
  const doublePatched = parseCompareLog(DOUBLE_PATCHED_LOG);
  const doubleUnpatched = parseCompareLog(DOUBLE_UNPATCHED_LOG);
  const slotPatched = parseCompareLog(SLOT_PATCHED_LOG);
  const slotUnpatched = parseCompareLog(SLOT_UNPATCHED_LOG);

  const patchedStates = loadCanonicalStates(TRACKED_LEGACY);
  const unpatchedStates = loadCanonicalStates(TMP_LEGACY);

  const doubleRows = rowTableRows(doubleTruth, doubleUnpatched, doublePatched);

  const pairRows = SLOT_PAIRS.map((pair) => {
    const truth = pairTruth(slotTruth, pair.left, pair.right);
    const u = pairSim(slotUnpatched.rows, pair.left, pair.right);
    const p = pairSim(slotPatched.rows, pair.left, pair.right);
    return {
      ...pair,
      truthWin: truth.win,
      truthAvgT: truth.avgT,
      unpatchedWin: u.win,
      unpatchedAvgT: u.avgT,
      patchedWin: p.win,
      patchedAvgT: p.avgT,
      deltaWin: p.win - u.win,
      deltaAvgT: p.avgT - u.avgT,
    };
  });

  const compileDeltaRows = Object.keys(unpatchedStates.states).map((label) => {
    const u = unpatchedStates.states[label];
    const p = patchedStates.states[label];
    return { label, unpatched: u, patched: p, delta: diffState(u, p) };
  });

  const variantDiag = [
    {
      label: 'Bio[P4] variant',
      spec: patchedStates.bioP.specSummary,
      crystalName: patchedStates.bioP.variant.crystalName || '',
      crystalMix: patchedStates.bioP.variant.crystalMix || null,
      matches: currentRuleWouldMatch(patchedStates.bioP.variant),
    },
    {
      label: 'Bio[O4] variant',
      spec: patchedStates.bioO.specSummary,
      crystalName: patchedStates.bioO.variant.crystalName || '',
      crystalMix: patchedStates.bioO.variant.crystalMix || null,
      matches: currentRuleWouldMatch(patchedStates.bioO.variant),
    },
    {
      label: 'Scout[P4] variant',
      spec: patchedStates.scout.specSummary,
      crystalName: patchedStates.scout.variant.crystalName || '',
      crystalMix: patchedStates.scout.variant.crystalMix || null,
      matches: currentRuleWouldMatch(patchedStates.scout.variant),
    },
  ];

  const identicalDouble = doubleRows.every((row) => row.deltaWin === 0 && row.deltaAvgT === 0);
  const identicalSlot = pairRows.every((row) => row.deltaWin === 0 && row.deltaAvgT === 0);
  const allCompileZero = compileDeltaRows.every((row) =>
    STATE_KEYS.every((key) => row.delta[key] === 0),
  );

  const lines = [];
  lines.push('# codex-bio Rule B revision diagnosis');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push(
    'Diagnose why the tracked Rule B patch still leaves full-replay Bio-family rows materially high by comparing the current tracked patched source against temp-only unpatched source copies with only the Rule B hunks removed.',
  );
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions inspected');
  lines.push('');
  lines.push('- `./tmp/codex-bio-rule-b-patch-report.md`');
  lines.push('- `./tmp/codex-bio-rule-validation.md`');
  lines.push('- `./tmp/codex-bio-variant-instrumentation.md`');
  lines.push('- `./tmp/codex-bio-duplicate-color-diagnosis.md`');
  lines.push('- `./tmp/legacy-truth-double-bio-probe.json`');
  lines.push('- `./tmp/legacy-truth-bio-slot-order-probe.json`');
  lines.push('- `./legacy-sim-v1.0.4-clean.js`');
  lines.push('  - `computeVariant(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `compileCombatantFromParts(...)`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('- `./brute-sim-v1.4.6.js`');
  lines.push('  - `computeVariant(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `compileDefender(...)`');
  lines.push('  - `compileAttacker(...)`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('- `./tools/legacy-truth-replay-compare.js`');
  lines.push('');
  lines.push('## 4. Source hygiene result');
  lines.push('');
  lines.push('- Rule B helpers/call sites currently exist in tracked source: yes');
  lines.push('- Tracked legacy hunks: helper block at `legacy-sim-v1.0.4-clean.js:2586-2614`, compile call at `legacy-sim-v1.0.4-clean.js:2632`');
  lines.push('- Tracked brute hunks: helper block at `brute-sim-v1.4.6.js:2748-2776`, compile calls at `brute-sim-v1.4.6.js:3393` and `brute-sim-v1.4.6.js:3456`');
  lines.push('- Exact Rule B hunk content: predicate helper, crystal-delta scaler, duplicate-Bio wrapper, and compile-time `m1Eff/m2Eff` call sites only');
  lines.push('');
  lines.push('## 5. How temp unpatched copies were created');
  lines.push('');
  lines.push('- Copied tracked sources to:');
  lines.push('  - `./tmp/legacy-sim-v1.0.4-clean.unpatched-bio.js`');
  lines.push('  - `./tmp/brute-sim-v1.4.6.unpatched-bio.js`');
  lines.push('- Removed only the Rule B helper block and Rule B call sites from those temp copies.');
  lines.push('- No tracked source files were reverted or otherwise changed during this diagnosis pass.');
  lines.push('');
  lines.push('## 6. Syntax-check results');
  lines.push('');
  lines.push('- tracked legacy sim: passed');
  lines.push('- tracked brute sim: passed');
  lines.push('- temp unpatched legacy sim: passed');
  lines.push('- temp unpatched brute sim: passed');
  lines.push('');
  lines.push('## 7. Double-bio probe: unpatched vs Rule B side-by-side');
  lines.push('');
  lines.push(
    `Replay summary comparison: unpatched meanAbsΔwin=${fmtNum(doubleUnpatched.summary.meanAbsWin, 2)}, patched meanAbsΔwin=${fmtNum(doublePatched.summary.meanAbsWin, 2)}; unpatched meanAbsΔavgT=${fmtNum(doubleUnpatched.summary.meanAbsAvgT, 4)}, patched meanAbsΔavgT=${fmtNum(doublePatched.summary.meanAbsAvgT, 4)}.`,
  );
  lines.push('');
  lines.push(`Patched vs unpatched row outputs identical on this probe: ${identicalDouble ? 'yes' : 'no'}.`);
  lines.push('');
  lines.push('| Row | Truth win / avgT | Unpatched win / avgT | Rule B win / avgT | Unpatched err | Rule B err | Rule B delta alone |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of doubleRows) {
    lines.push(
      `| ${quote(row.row)} | ${fmtNum(row.truthWin)} / ${fmtNum(row.truthAvgT, 4)} | ${fmtNum(row.unpatchedWin)} / ${fmtNum(row.unpatchedAvgT, 4)} | ${fmtNum(row.patchedWin)} / ${fmtNum(row.patchedAvgT, 4)} | ${fmtSigned(row.unpatchedErrWin)} / ${fmtSigned(row.unpatchedErrAvgT, 4)} | ${fmtSigned(row.patchedErrWin)} / ${fmtSigned(row.patchedErrAvgT, 4)} | ${fmtSigned(row.deltaWin)} / ${fmtSigned(row.deltaAvgT, 4)} |`,
    );
  }
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- Which rows materially improved under Rule B? none.');
  lines.push('- Which rows materially worsened under Rule B? none.');
  lines.push('- Remaining error on one-Bio and mixed rows is already fully present in the unpatched baseline on this probe.');
  lines.push('- On this replay path, Rule B did not add any duplicate correction at all.');
  lines.push('');
  lines.push('## 8. Slot-order probe: unpatched vs Rule B side-by-side');
  lines.push('');
  lines.push(
    `Replay summary comparison: unpatched meanAbsΔwin=${fmtNum(slotUnpatched.summary.meanAbsWin, 2)}, patched meanAbsΔwin=${fmtNum(slotPatched.summary.meanAbsWin, 2)}; unpatched meanAbsΔavgT=${fmtNum(slotUnpatched.summary.meanAbsAvgT, 4)}, patched meanAbsΔavgT=${fmtNum(slotPatched.summary.meanAbsAvgT, 4)}.`,
  );
  lines.push('');
  lines.push(`Patched vs unpatched swapped-pair outputs identical on this probe: ${identicalSlot ? 'yes' : 'no'}.`);
  lines.push('');
  lines.push('| Shell | Pair | Truth right-left Δwin / ΔavgT | Unpatched Δwin / ΔavgT | Rule B Δwin / ΔavgT | Rule B delta alone |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of pairRows) {
    lines.push(
      `| ${quote(row.shell)} | ${quote(row.label)} | ${fmtSigned(row.truthWin)} / ${fmtSigned(row.truthAvgT, 4)} | ${fmtSigned(row.unpatchedWin)} / ${fmtSigned(row.unpatchedAvgT, 4)} | ${fmtSigned(row.patchedWin)} / ${fmtSigned(row.patchedAvgT, 4)} | ${fmtSigned(row.deltaWin)} / ${fmtSigned(row.deltaAvgT, 4)} |`,
    );
  }
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- Slot-order containment stayed unchanged because the patched and unpatched replay outputs are identical.');
  lines.push('- This confirms the current tracked Rule B patch did not activate on the slot-order pack either.');
  lines.push('');
  lines.push('## 9. Compile-state delta table: unpatched vs Rule B');
  lines.push('');
  lines.push('Variant-level activation diagnostic on the tracked legacy path:');
  lines.push('');
  lines.push('| Variant | partCrystalSpec(...) result | variant.crystalName | variant.crystalMix | current Rule B predicate match? |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of variantDiag) {
    lines.push(
      `| ${quote(row.label)} | ${quote(row.spec)} | ${quote(row.crystalName)} | ${quote(JSON.stringify(row.crystalMix))} | ${row.matches ? 'yes' : 'no'} |`,
    );
  }
  lines.push('');
  lines.push('Canonical aggregated misc totals on legacy compile path:');
  lines.push('');
  lines.push('| State | Unpatched misc total | Rule B misc total | Rule B minus unpatched |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of compileDeltaRows) {
    lines.push(
      `| ${quote(row.label)} | ${quote(stateString(row.unpatched))} | ${quote(stateString(row.patched))} | ${quote(stateString(row.delta))} |`,
    );
  }
  lines.push('');
  lines.push(`All canonical compile-state deltas are zero: ${allCompileZero ? 'yes' : 'no'}.`);
  lines.push('');
  lines.push('Why this happened:');
  lines.push('');
  lines.push('- `partCrystalSpec(...)` resolves uniform four-Pink Bio slots to the string `Perfect Pink Crystal`, not to a mixed-count object.');
  lines.push('- `computeVariantFromCrystalSpec(...)` short-circuits that uniform string into `computeVariant(...)` in both simulators.');
  lines.push('- `computeVariant(...)` returns `crystalName` but not `crystalMix` in both simulators.');
  lines.push('- The tracked Rule B predicate only checks `variant.crystalMix` for `{ "Perfect Pink Crystal": 4 }`, so it is false for the actual replay variants.');
  lines.push('- Result: the helper/call sites exist, but the current Rule B patch is dead code on the active replay path.');
  lines.push('');
  lines.push('## 10. Best explanation now');
  lines.push('');
  lines.push('Rule B looked good offline because the helper-only validation operated directly on extracted legacy misc totals. The tracked implementation, however, keyed its exact-Pink duplicate detection off `variant.crystalMix`, while the real replay path compiles uniform four-slot misc crystals through the uniform-string `computeVariant(...)` path that does not retain `crystalMix`.');
  lines.push('');
  lines.push('That means the full-replay Bio-family rows stayed materially high for a simple reason: the tracked Rule B patch never actually fired.');
  lines.push('');
  lines.push('What this isolates cleanly:');
  lines.push('');
  lines.push('- The remaining one-Bio and mixed-color error is not a new regression from Rule B.');
  lines.push('- That error is a pre-existing baseline miss already visible in the unpatched rows.');
  lines.push('- Rule B currently does not add the intended duplicate correction on top of that miss, because its match plumbing is too narrow.');
  lines.push('- After Rule B activation is fixed, the existing unpatched row pattern still points to follow-up work on both first-copy Bio[P4] and mixed `P4+O4`, not on one alone.');
  lines.push('');
  lines.push('Exact answers:');
  lines.push('');
  lines.push('- Which rows materially improved under Rule B? none.');
  lines.push('- Which rows materially worsened under Rule B? none.');
  lines.push('- Is the remaining error mostly already present in unpatched one-Bio and mixed rows? yes, entirely on the compared probes.');
  lines.push('- Does Rule B mainly add the duplicate correction on top of a pre-existing first-Bio baseline miss? not in the tracked implementation; it currently adds no replay correction at all.');
  lines.push('- Is the next revision more likely to require a) first-copy Bio[P4] adjustment b) mixed P4+O4 adjustment c) both d) abandon Rule B entirely? `c) both`, but only after fixing Rule B activation plumbing.');
  lines.push('');
  lines.push('## 11. Recommendation');
  lines.push('');
  lines.push('**REVISE RULE B WITH BOTH**');
  lines.push('');
  lines.push('Reason:');
  lines.push('');
  lines.push('- do not abandon the duplicate-Bio theory yet, because the tracked patch was not actually exercised');
  lines.push('- first fix the exact-Pink duplicate activation so Rule B can run on uniform variants');
  lines.push('- after that, the pre-existing unpatched miss pattern indicates follow-up work is likely needed for both first-copy Bio[P4] and mixed `P4+O4`');
  lines.push('');
  lines.push('## 12. If a revision is recommended');
  lines.push('');
  lines.push('- Exact next smallest rule to test: keep Rule B magnitude unchanged, but change the exact-Pink duplicate detection so it matches both mixed-count and uniform-string Bio[P4] variants. Concretely: treat `Bio Spinal Enhancer` with either `crystalMix = { Perfect Pink Crystal: 4 }` or `crystalName === "Perfect Pink Crystal"` as exact Bio[P4] for the local duplicate helper.');
  lines.push('- Exact file/function/block to patch next:');
  lines.push('  - `legacy-sim-v1.0.4-clean.js` local Rule B helper block immediately above `compileCombatantFromParts(...)`');
  lines.push('  - mirrored in `brute-sim-v1.4.6.js` local Rule B helper block immediately above `buildVariantsForArmors(...)` / before compile-time call sites');
  lines.push('- Do not apply it in this pass.');
  lines.push('');
  lines.push('## 13. What ChatGPT should do next');
  lines.push('');
  lines.push('Use this report as the only handoff. The next pass should make one minimal tracked edit: fix Rule B activation so exact uniform `Bio[P4]` variants match the local duplicate helper in both simulators, rerun the same patched-vs-unpatched double-bio and slot-order probes immediately, and only then decide the magnitude of any first-copy or mixed-color follow-up.');

  const content = lines.join('\n') + '\n';
  fs.writeFileSync(REPORT_PATH, content);
  process.stdout.write(content);
}

main();
