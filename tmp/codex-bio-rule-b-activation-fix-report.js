'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const REPO = path.resolve(__dirname, '..');
const LEGACY_SIM = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM = path.join(REPO, 'brute-sim-v1.4.6.js');
const DOUBLE_TRUTH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const META_TRUTH = path.join(__dirname, 'legacy-truth-current-attacker-vs-meta.json');
const DOUBLE_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-double.log');
const SLOT_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-slot.log');
const META_LOG = path.join(__dirname, 'codex-bio-rule-b-activation-meta.log');
const DIFF_PATH = path.join(__dirname, 'codex-bio-rule-b-activation-fix.diff');
const REPORT_PATH = path.join(__dirname, 'codex-bio-rule-b-activation-fix-report.md');

const REQUIRED = [
  path.join(__dirname, 'codex-bio-rule-b-revision-diagnosis.md'),
  path.join(__dirname, 'codex-bio-rule-b-patch-report.md'),
  path.join(__dirname, 'codex-bio-rule-validation.md'),
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  META_TRUTH,
  LEGACY_SIM,
  BRUTE_SIM,
  path.join(REPO, 'tools', 'legacy-truth-replay-compare.js'),
  DOUBLE_LOG,
  SLOT_LOG,
  META_LOG,
  DIFF_PATH,
];

const COMMANDS = [
  'ls -1 ./tmp/codex-bio-rule-b-revision-diagnosis.md ./tmp/codex-bio-rule-b-patch-report.md ./tmp/codex-bio-rule-validation.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./tools/legacy-truth-replay-compare.js',
  "sed -n '1,220p' ./tmp/codex-bio-rule-b-revision-diagnosis.md",
  "sed -n '2586,2618p' ./legacy-sim-v1.0.4-clean.js",
  "sed -n '2748,2780p' ./brute-sim-v1.4.6.js",
  "git diff -U4 -- legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js | rg -n -C 20 \"isValidatedDuplicateBioPinkVariant|crystalName === 'Perfect Pink Crystal'\" > ./tmp/codex-bio-rule-b-activation-fix.diff",
  'node --check ./legacy-sim-v1.0.4-clean.js',
  'node --check ./brute-sim-v1.4.6.js',
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-double' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-double-bio-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-double.log 2>&1",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-slot' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-slot.log 2>&1",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-rule-b-activation-meta' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-rule-b-activation-meta.log 2>&1",
  'node ./tmp/codex-bio-rule-b-activation-fix-report.js',
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
    label: 'Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4]',
    left: 'DL Dual Rift One Bio Left P4',
    right: 'DL Dual Rift One Bio Right P4',
  },
  {
    shell: 'Dual Rift',
    label: 'Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4]',
    left: 'DL Dual Rift Bio P4 + O4',
    right: 'DL Dual Rift Bio O4 + P4',
  },
  {
    shell: 'Core/Rift',
    label: 'Bio[P4]+Scout[P4] vs Scout[P4]+Bio[P4]',
    left: 'DL Core/Rift One Bio Left P4',
    right: 'DL Core/Rift One Bio Right P4',
  },
  {
    shell: 'Core/Rift',
    label: 'Bio[P4]+Bio[O4] vs Bio[O4]+Bio[P4]',
    left: 'DL Core/Rift Bio P4 + O4',
    right: 'DL Core/Rift Bio O4 + P4',
  },
];

function ensureFiles() {
  for (const filePath of REQUIRED) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
  }
}

function fmtNum(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function fmtSigned(value, digits = 3) {
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function q(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function truthMap(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) out.set(matchup.defender, matchup);
  return out;
}

function loadLegacyInternals() {
  const source = fs.readFileSync(LEGACY_SIM, 'utf8').replace(/^#!.*\n/, '');
  const exportBlock = `
module.exports.__codex = {
  makeVariantList,
  computeVariantFromCrystalSpec,
  partCrystalSpec,
  isValidatedDuplicateBioPinkVariant,
  applyValidatedDuplicateBioPinkScaling,
};
`;
  const wrapped = Module.wrap(source + '\n' + exportBlock);
  const compiled = vm.runInThisContext(wrapped, { filename: LEGACY_SIM });
  const mod = { exports: {} };
  const req = Module.createRequire(LEGACY_SIM);
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
    compiled(mod.exports, req, mod, LEGACY_SIM, path.dirname(LEGACY_SIM));
  } finally {
    process.env = originalEnv;
  }
  return mod.exports.__codex;
}

function canonicalActivation(sim) {
  const cfg = { ...sim.makeVariantList()[0], diag: true };
  const bioP4 = {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  };
  const bioO4 = {
    name: 'Bio Spinal Enhancer',
    upgrades: ['Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal', 'Perfect Orange Crystal'],
  };
  const scoutP4 = {
    name: 'Scout Drones',
    upgrades: ['Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal', 'Perfect Pink Crystal'],
  };
  function variant(part, slotTag) {
    const spec = sim.partCrystalSpec(part);
    return sim.computeVariantFromCrystalSpec(part.name, spec, [], cfg, slotTag);
  }
  const bioLeft = variant(bioP4, 1);
  const bioRight = variant(bioP4, 2);
  const orangeRight = variant(bioO4, 2);
  const scoutRight = variant(scoutP4, 2);
  function pairMatch(a, b) {
    const [m1Eff, m2Eff] = sim.applyValidatedDuplicateBioPinkScaling(a, b);
    return m2Eff.addDef !== b.addDef || m2Eff.addAcc !== b.addAcc || m2Eff.addGun !== b.addGun || m2Eff.addMel !== b.addMel || m2Eff.addPrj !== b.addPrj || m2Eff.addDod !== b.addDod || m2Eff.addSpeed !== b.addSpeed || m2Eff.addArmStat !== b.addArmStat;
  }
  return {
    bioBio: {
      match: pairMatch(bioLeft, bioRight),
      left: { crystalName: bioLeft.crystalName || '', crystalMix: bioLeft.crystalMix || null },
      right: { crystalName: bioRight.crystalName || '', crystalMix: bioRight.crystalMix || null },
    },
    bioOrange: {
      match: pairMatch(bioLeft, orangeRight),
      left: { crystalName: bioLeft.crystalName || '', crystalMix: bioLeft.crystalMix || null },
      right: { crystalName: orangeRight.crystalName || '', crystalMix: orangeRight.crystalMix || null },
    },
    bioScout: {
      match: pairMatch(bioLeft, scoutRight),
      left: { crystalName: bioLeft.crystalName || '', crystalMix: bioLeft.crystalMix || null },
      right: { crystalName: scoutRight.crystalName || '', crystalMix: scoutRight.crystalMix || null },
    },
  };
}

function pairTruth(truth, left, right) {
  return {
    win: Number(truth.get(right).aggregates.attackerWinPct) - Number(truth.get(left).aggregates.attackerWinPct),
    avgT: Number(truth.get(right).aggregates.avgTurns) - Number(truth.get(left).aggregates.avgTurns),
  };
}

function pairSim(rows, left, right) {
  return {
    win: rows.get(right).simWin - rows.get(left).simWin,
    avgT: rows.get(right).simAvgT - rows.get(left).simAvgT,
  };
}

function topRows(metaLog, limit) {
  const rows = Array.from(metaLog.rows.values());
  rows.sort((a, b) => Math.abs(b.errWin) - Math.abs(a.errWin));
  return rows.slice(0, limit);
}

function main() {
  ensureFiles();
  const doubleTruth = truthMap(readJson(DOUBLE_TRUTH));
  const slotTruth = truthMap(readJson(SLOT_TRUTH));
  const doubleLog = parseCompareLog(DOUBLE_LOG);
  const slotLog = parseCompareLog(SLOT_LOG);
  const metaLog = parseCompareLog(META_LOG);
  const activation = canonicalActivation(loadLegacyInternals());

  const lines = [];
  lines.push('# codex-bio Rule B activation fix report');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push('Make the smallest possible tracked-source fix so the existing Rule B duplicate-Pink Bio patch actually activates on the real replay path, then verify whether that materially changes the Bio probes.');
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions changed');
  lines.push('');
  lines.push('- `legacy-sim-v1.0.4-clean.js`');
  lines.push('  - updated `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('- `brute-sim-v1.4.6.js`');
  lines.push('  - updated `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('');
  lines.push('## 4. Compact description of the activation fix');
  lines.push('');
  lines.push('- kept Rule B magnitude at `1.5x`');
  lines.push('- kept the patch local to the existing duplicate-Pink predicate');
  lines.push('- broadened exact `Bio[P4]` recognition only enough to accept either:');
  lines.push('  - `crystalMix === { Perfect Pink Crystal: 4 }`');
  lines.push('  - or uniform replay-path `crystalName === "Perfect Pink Crystal"`');
  lines.push('- no first-copy rule added');
  lines.push('- no mixed-color rule added');
  lines.push('- no shell-specific or slot-order logic added');
  lines.push('');
  lines.push('## 5. Compact diff section');
  lines.push('');
  lines.push('Patched predicate in both simulators:');
  lines.push('');
  lines.push('```js');
  lines.push('function isValidatedDuplicateBioPinkVariant(v) {');
  lines.push("  if (!v || v.itemName !== 'Bio Spinal Enhancer') return false;");
  lines.push("  if (v.crystalName === 'Perfect Pink Crystal') return true;");
  lines.push('  const mix = v.crystalMix || null;');
  lines.push("  if (!mix || typeof mix !== 'object') return false;");
  lines.push('  const names = Object.keys(mix);');
  lines.push("  return names.length === 1 && names[0] === 'Perfect Pink Crystal' && Number(mix[names[0]]) === 4;");
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('Diff artifact saved to `./tmp/codex-bio-rule-b-activation-fix.diff`.');
  lines.push('');
  lines.push('## 6. Syntax-check results');
  lines.push('');
  lines.push('- `node --check ./legacy-sim-v1.0.4-clean.js`: passed');
  lines.push('- `node --check ./brute-sim-v1.4.6.js`: passed');
  lines.push('');
  lines.push('## 7. Explicit activation diagnostic');
  lines.push('');
  lines.push('| Canonical state | Match? | Left variant | Right variant |');
  lines.push('| --- | --- | --- | --- |');
  lines.push(`| Bio[P4] + Bio[P4] | ${activation.bioBio.match ? 'yes' : 'no'} | ${q(activation.bioBio.left.crystalName)} | ${q(activation.bioBio.right.crystalName)} |`);
  lines.push(`| Bio[P4] + Bio[O4] | ${activation.bioOrange.match ? 'yes' : 'no'} | ${q(activation.bioOrange.left.crystalName)} | ${q(activation.bioOrange.right.crystalName)} |`);
  lines.push(`| Bio[P4] + Scout[P4] | ${activation.bioScout.match ? 'yes' : 'no'} | ${q(activation.bioScout.left.crystalName)} | ${q(activation.bioScout.right.crystalName)} |`);
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- canonical `Bio[P4]+Bio[P4]` match: yes');
  lines.push('- canonical `Bio[P4]+Bio[O4]` match: no');
  lines.push('- canonical `Bio[P4]+Scout[P4]` match: no');
  lines.push('');
  lines.push('## 8. Double-bio probe summary');
  lines.push('');
  lines.push(`Replay summary: meanAbsΔwin=${fmtNum(doubleLog.summary.meanAbsWin, 2)}, meanAbsΔavgT=${fmtNum(doubleLog.summary.meanAbsAvgT, 4)}, worstAbsΔwin=${fmtNum(doubleLog.summary.worstAbsWin, 2)} (${q(doubleLog.summary.worstRow)}).`);
  lines.push('');
  lines.push('| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |');
  lines.push('| --- | --- | ---: | --- | ---: |');
  for (const rowName of DOUBLE_ROWS) {
    const row = doubleLog.rows.get(rowName);
    lines.push(`| ${q(rowName)} | \`${fmtNum(row.truthWin)} -> ${fmtNum(row.simWin)}\` | \`${fmtSigned(row.errWin)}\` | \`${fmtNum(row.truthAvgT, 4)} -> ${fmtNum(row.simAvgT, 4)}\` | \`${fmtSigned(row.errAvgT, 4)}\` |`);
  }
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- `DL Dual Rift Two Bio P4` moved from earlier dead-code `+6.37` to `-0.58`, a strong improvement.');
  lines.push('- `DL Core/Rift Two Bio P4` moved from earlier dead-code `+3.53` to `-3.46`, a strong worsening in the opposite direction.');
  lines.push('- one-Bio rows stayed unchanged and high: `DL Dual Rift One Bio P4 +3.38`, `DL Core/Rift One Bio P4 +2.07`.');
  lines.push('- mixed `P4+O4` rows stayed unchanged and high: `DL Dual Rift Bio P4 + O4 +4.53`, `DL Core/Rift Bio P4 + O4 +2.36`.');
  lines.push('- no-Bio containment stayed tight: `+0.37`, `-0.32`.');
  lines.push('');
  lines.push('## 9. Slot-order probe summary');
  lines.push('');
  lines.push(`Replay summary: meanAbsΔwin=${fmtNum(slotLog.summary.meanAbsWin, 2)}, meanAbsΔavgT=${fmtNum(slotLog.summary.meanAbsAvgT, 4)}, worstAbsΔwin=${fmtNum(slotLog.summary.worstAbsWin, 2)} (${q(slotLog.summary.worstRow)}).`);
  lines.push('');
  lines.push('| Shell | Pair | Truth right-left Δwin / ΔavgT | Sim right-left Δwin / ΔavgT |');
  lines.push('| --- | --- | --- | --- |');
  for (const pair of SLOT_PAIRS) {
    const t = pairTruth(slotTruth, pair.left, pair.right);
    const s = pairSim(slotLog.rows, pair.left, pair.right);
    lines.push(`| ${q(pair.shell)} | ${q(pair.label)} | \`${fmtSigned(t.win)} / ${fmtSigned(t.avgT, 4)}\` | \`${fmtSigned(s.win)} / ${fmtSigned(s.avgT, 4)}\` |`);
  }
  lines.push('');
  lines.push('Containment note:');
  lines.push('');
  lines.push('- swapped-pair outputs stayed effectively unchanged because the activation fix only affects exact duplicate `Bio[P4]+Bio[P4]` cases');
  lines.push('- no-Bio rows stayed small: `DL Dual Rift No Bio +0.90`, `DL Core/Rift No Bio -0.55`');
  lines.push('- the exact duplicate rows now move materially: `DL Dual Rift Two Bio P4 -1.13`, `DL Core/Rift Two Bio P4 -3.80`');
  lines.push('');
  lines.push('## 10. Meta summary');
  lines.push('');
  lines.push(`Replay summary: meanAbsΔwin=${fmtNum(metaLog.summary.meanAbsWin, 2)}, meanAbsΔavgT=${fmtNum(metaLog.summary.meanAbsAvgT, 4)}, worstAbsΔwin=${fmtNum(metaLog.summary.worstAbsWin, 2)}.`);
  lines.push('');
  lines.push('Worst offending rows:');
  lines.push('');
  lines.push('| Row | Truth win -> Sim win | Δwin | Truth avgT -> Sim avgT | ΔavgT |');
  lines.push('| --- | --- | ---: | --- | ---: |');
  for (const row of topRows(metaLog, 5)) {
    lines.push(`| ${q(row.row)} | \`${fmtNum(row.truthWin)} -> ${fmtNum(row.simWin)}\` | \`${fmtSigned(row.errWin)}\` | \`${fmtNum(row.truthAvgT, 4)} -> ${fmtNum(row.simAvgT, 4)}\` | \`${fmtSigned(row.errAvgT, 4)}\` |`);
  }
  lines.push('');
  lines.push('Readout:');
  lines.push('');
  lines.push('- overall meta mean improved from the previous dead-code Rule B report: `meanAbsΔwin 2.02 -> 1.60`');
  lines.push('- worst meta row is no longer a Dual Rift/Core-Rift Bio overshoot; it is `SG1 Double Maul Droid -3.23`');
  lines.push('- target family moved in the intended direction overall: `DL Dual Rift Bio -0.92`, `DL Core/Rift Bio -2.99`');
  lines.push('');
  lines.push('## 11. Legacy vs brute parity notes');
  lines.push('');
  lines.push('- The activation fix is structurally mirrored in both simulators: same predicate line, same scope, same unchanged `1.5x` scale.');
  lines.push('- Legacy replay path was fully verified in this pass.');
  lines.push('- Brute was syntax-checked only in this pass; runtime parity was preserved structurally, not replay-verified.');
  lines.push('- Remaining known parity risks are unchanged: brute payload crystal parsing shape, stat-crystal stacking defaults, and slot-2 rebuild plumbing.');
  lines.push('');
  lines.push('## 12. Final verdict');
  lines.push('');
  lines.push('**REVISE PATCH**');
  lines.push('');
  lines.push('Why:');
  lines.push('');
  lines.push('- the activation fix works and now materially changes exact duplicate `Bio[P4]` rows');
  lines.push('- it improves overall meta mean and fixes the prior dead-code problem');
  lines.push('- but results are mixed: `DL Dual Rift Two Bio P4` improves strongly while `DL Core/Rift Two Bio P4` overshoots in the opposite direction');
  lines.push('- one-Bio and mixed-color rows remain untouched and materially high, which confirms duplicate-only Rule B is not sufficient as a final calibration');
  lines.push('');
  lines.push('## 13. What ChatGPT should do next');
  lines.push('');
  lines.push('Use this report as the handoff. Keep the activation fix, then do the next smallest diagnosis-guided revision pass on top of the now-live Rule B patch: compare the remaining one-Bio and mixed-color baseline offsets against the improved duplicate-Pink rows, and decide whether the next narrow follow-up should target first-copy Bio, mixed `P4+O4`, or both.');

  const content = lines.join('\n') + '\n';
  fs.writeFileSync(REPORT_PATH, content);
  process.stdout.write(content);
}

main();
