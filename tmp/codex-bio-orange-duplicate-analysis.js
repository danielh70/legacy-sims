'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ORANGE_TRUTH = path.join(__dirname, 'legacy-truth-bio-orange-duplicate-probe.json');
const FINAL_MICROCHECK = path.join(__dirname, 'codex-bio-final-followup-microcheck.md');
const FOLLOWUP_DIAG = path.join(__dirname, 'codex-bio-post-rule-b-followup-diagnosis.md');
const ACTIVATION_REPORT = path.join(__dirname, 'codex-bio-rule-b-activation-fix-report.md');
const DOUBLE_TRUTH = path.join(__dirname, 'legacy-truth-double-bio-probe.json');
const SLOT_TRUTH = path.join(__dirname, 'legacy-truth-bio-slot-order-probe.json');
const LEGACY_SIM = path.join(REPO, 'legacy-sim-v1.0.4-clean.js');
const BRUTE_SIM = path.join(REPO, 'brute-sim-v1.4.6.js');
const LEGACY_DEFS = path.join(REPO, 'legacy-defs.js');
const COMPARE_TOOL = path.join(REPO, 'tools', 'legacy-truth-replay-compare.js');
const LIVE_LOG = path.join(__dirname, 'codex-bio-orange-duplicate-live.log');
const REPORT_PATH = path.join(__dirname, 'codex-bio-orange-duplicate-analysis.md');

const REQUIRED = [
  ORANGE_TRUTH,
  FINAL_MICROCHECK,
  FOLLOWUP_DIAG,
  ACTIVATION_REPORT,
  DOUBLE_TRUTH,
  SLOT_TRUTH,
  LEGACY_SIM,
  BRUTE_SIM,
  LEGACY_DEFS,
  COMPARE_TOOL,
  LIVE_LOG,
];

const COMMANDS = [
  'ls -1 ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./tmp/codex-bio-final-followup-microcheck.md ./tmp/codex-bio-post-rule-b-followup-diagnosis.md ./tmp/codex-bio-rule-b-activation-fix-report.md ./tmp/legacy-truth-double-bio-probe.json ./tmp/legacy-truth-bio-slot-order-probe.json ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./legacy-defs.js ./tools/legacy-truth-replay-compare.js',
  'rg -n "isValidatedDuplicateBioPinkVariant|applyValidatedDuplicateBioPinkScaling|scaleVariantCrystalDelta|computeVariantFromCrystalSpec|getEffectiveCrystalPct" legacy-sim-v1.0.4-clean.js brute-sim-v1.4.6.js',
  "sed -n '1,220p' ./tmp/codex-bio-post-rule-b-followup-diagnosis.md",
  "env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_TAG='codex-bio-orange-duplicate-live' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-bio-orange-duplicate-probe.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-bio-orange-duplicate-live.log 2>&1",
  'node ./tmp/codex-bio-orange-duplicate-analysis.js',
];

const SHELL_ROWS = {
  'Dual Rift': {
    noBio: 'DL Dual Rift No Bio',
    oneP4: 'DL Dual Rift One Bio P4',
    oneO4: 'DL Dual Rift One Bio O4',
    twoP4: 'DL Dual Rift Two Bio P4',
    mixed: 'DL Dual Rift Bio P4 + O4',
    twoO4: 'DL Dual Rift Two Bio O4',
  },
  'Core/Rift': {
    noBio: 'DL Core/Rift No Bio',
    oneP4: 'DL Core/Rift One Bio P4',
    oneO4: 'DL Core/Rift One Bio O4',
    twoP4: 'DL Core/Rift Two Bio P4',
    mixed: 'DL Core/Rift Bio P4 + O4',
    twoO4: 'DL Core/Rift Two Bio O4',
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
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '';
}

function fmtSigned(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

function quote(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|');
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function mapTruth(json) {
  const out = new Map();
  for (const matchup of json.matchups || []) {
    if (!out.has(matchup.defender)) out.set(matchup.defender, matchup);
  }
  return out;
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

function buildTruthTable(truthMap, shellNames) {
  return Object.values(shellNames).map((rowName) => {
    const m = truthMap.get(rowName);
    return {
      row: rowName,
      win: Number(m.aggregates.attackerWinPct),
      avgT: Number(m.aggregates.avgTurns),
    };
  });
}

function marginalsFromRows(rowMap, shellNames, useSim) {
  const noBio = rowMap.get(shellNames.noBio);
  const oneP4 = rowMap.get(shellNames.oneP4);
  const oneO4 = rowMap.get(shellNames.oneO4);
  const twoP4 = rowMap.get(shellNames.twoP4);
  const mixed = rowMap.get(shellNames.mixed);
  const twoO4 = rowMap.get(shellNames.twoO4);
  const win = (row) => (useSim ? row.simWin : Number(row.aggregates.attackerWinPct));
  const avgT = (row) => (useSim ? row.simAvgT : Number(row.aggregates.avgTurns));
  return {
    noToOneP4: { win: win(oneP4) - win(noBio), avgT: avgT(oneP4) - avgT(noBio) },
    noToOneO4: { win: win(oneO4) - win(noBio), avgT: avgT(oneO4) - avgT(noBio) },
    oneP4ToTwoP4: { win: win(twoP4) - win(oneP4), avgT: avgT(twoP4) - avgT(oneP4) },
    oneO4ToTwoO4: { win: win(twoO4) - win(oneO4), avgT: avgT(twoO4) - avgT(oneO4) },
    oneP4ToMixed: { win: win(mixed) - win(oneP4), avgT: avgT(mixed) - avgT(oneP4) },
    oneO4ToMixed: { win: win(mixed) - win(oneO4), avgT: avgT(mixed) - avgT(oneO4) },
  };
}

function main() {
  ensureFiles();
  const truthJson = readJson(ORANGE_TRUTH);
  const truthMap = mapTruth(truthJson);
  const live = parseCompareLog(LIVE_LOG);

  const truthShellTables = {};
  const truthMarginals = {};
  const liveMarginals = {};
  const marginalComparison = {};

  for (const [shell, shellNames] of Object.entries(SHELL_ROWS)) {
    truthShellTables[shell] = buildTruthTable(truthMap, shellNames);
    truthMarginals[shell] = marginalsFromRows(truthMap, shellNames, false);
    liveMarginals[shell] = marginalsFromRows(live.rows, shellNames, true);
    marginalComparison[shell] = {};
    for (const [key, truthVal] of Object.entries(truthMarginals[shell])) {
      const simVal = liveMarginals[shell][key];
      marginalComparison[shell][key] = {
        winErr: simVal.win - truthVal.win,
        avgTErr: simVal.avgT - truthVal.avgT,
      };
    }
  }

  const firstPinkErr = mean([
    marginalComparison['Dual Rift'].noToOneP4.winErr,
    marginalComparison['Core/Rift'].noToOneP4.winErr,
  ]);
  const firstOrangeErr = mean([
    marginalComparison['Dual Rift'].noToOneO4.winErr,
    marginalComparison['Core/Rift'].noToOneO4.winErr,
  ]);
  const secondOrangeErr = mean([
    Math.abs(marginalComparison['Dual Rift'].oneO4ToTwoO4.winErr),
    Math.abs(marginalComparison['Core/Rift'].oneO4ToTwoO4.winErr),
  ]);
  const mixedFromP4Err = mean([
    marginalComparison['Dual Rift'].oneP4ToMixed.winErr,
    marginalComparison['Core/Rift'].oneP4ToMixed.winErr,
  ]);
  const mixedFromO4Err = mean([
    marginalComparison['Dual Rift'].oneO4ToMixed.winErr,
    marginalComparison['Core/Rift'].oneO4ToMixed.winErr,
  ]);
  const dupPinkErr = mean([
    marginalComparison['Dual Rift'].oneP4ToTwoP4.winErr,
    marginalComparison['Core/Rift'].oneP4ToTwoP4.winErr,
  ]);

  const firstCopyBoth = Math.abs(firstOrangeErr) > 0.5;
  const secondOrangeLinear = secondOrangeErr < 0.25;
  const ruleBOverstrong = dupPinkErr < -1.0;

  const lines = [];
  lines.push('# codex-bio orange-duplicate analysis');
  lines.push('');
  lines.push('## 1. Goal of this pass');
  lines.push('');
  lines.push('Use the orange-anchor truth pack to decide whether the remaining follow-up on top of live Rule B should target first-copy Pink only, first-copy Orange too, second-Orange only, a combined first-copy plus second-Orange rule, or a rebalance of the current duplicate-Pink branch.');
  lines.push('');
  lines.push('## 2. Exact commands run');
  lines.push('');
  lines.push('```sh');
  lines.push(...COMMANDS);
  lines.push('```');
  lines.push('');
  lines.push('## 3. Exact files/functions inspected');
  lines.push('');
  lines.push('- `./tmp/legacy-truth-bio-orange-duplicate-probe.json`');
  lines.push('- `./tmp/codex-bio-final-followup-microcheck.md`');
  lines.push('- `./tmp/codex-bio-post-rule-b-followup-diagnosis.md`');
  lines.push('- `./tmp/codex-bio-rule-b-activation-fix-report.md`');
  lines.push('- `./tmp/legacy-truth-double-bio-probe.json`');
  lines.push('- `./tmp/legacy-truth-bio-slot-order-probe.json`');
  lines.push('- `./legacy-sim-v1.0.4-clean.js`');
  lines.push('  - `isValidatedDuplicateBioPinkVariant(...)`');
  lines.push('  - `scaleVariantCrystalDelta(...)`');
  lines.push('  - `applyValidatedDuplicateBioPinkScaling(...)`');
  lines.push('  - `computeVariantFromCrystalSpec(...)`');
  lines.push('  - `getEffectiveCrystalPct(...)`');
  lines.push('- `./brute-sim-v1.4.6.js`');
  lines.push('  - mirrored Rule B helper block and shared variant functions');
  lines.push('- `./legacy-defs.js`');
  lines.push('- `./tools/legacy-truth-replay-compare.js`');
  lines.push('');
  lines.push('## 4. Truth tables');
  lines.push('');
  for (const [shell, rows] of Object.entries(truthShellTables)) {
    lines.push(`### ${shell}`);
    lines.push('');
    lines.push('| Row | Truth win | Truth avgT |');
    lines.push('| --- | ---: | ---: |');
    for (const row of rows) {
      lines.push(`| ${quote(row.row)} | ${fmtNum(row.win)} | ${fmtNum(row.avgT, 4)} |`);
    }
    lines.push('');
  }
  lines.push('## 5. Marginal tables');
  lines.push('');
  lines.push('| Shell | No Bio -> One Bio P4 | No Bio -> One Bio O4 | One Bio P4 -> Two Bio P4 | One Bio O4 -> Two Bio O4 | One Bio P4 -> Bio P4 + O4 | One Bio O4 -> Bio P4 + O4 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const [shell, m] of Object.entries(truthMarginals)) {
    lines.push(`| ${quote(shell)} | \`${fmtSigned(m.noToOneP4.win)} / ${fmtSigned(m.noToOneP4.avgT, 4)}\` | \`${fmtSigned(m.noToOneO4.win)} / ${fmtSigned(m.noToOneO4.avgT, 4)}\` | \`${fmtSigned(m.oneP4ToTwoP4.win)} / ${fmtSigned(m.oneP4ToTwoP4.avgT, 4)}\` | \`${fmtSigned(m.oneO4ToTwoO4.win)} / ${fmtSigned(m.oneO4ToTwoO4.avgT, 4)}\` | \`${fmtSigned(m.oneP4ToMixed.win)} / ${fmtSigned(m.oneP4ToMixed.avgT, 4)}\` | \`${fmtSigned(m.oneO4ToMixed.win)} / ${fmtSigned(m.oneO4ToMixed.avgT, 4)}\` |`);
  }
  lines.push('');
  lines.push('## 6. Live Rule B comparison');
  lines.push('');
  lines.push(`Live replay summary on the orange-anchor pack: meanAbsΔwin ${fmtNum(live.summary.meanAbsWin)}, meanAbsΔavgT ${fmtNum(live.summary.meanAbsAvgT, 4)}, worstAbsΔwin ${fmtNum(live.summary.worstAbsWin)} (${quote(live.summary.worstRow)}).`);
  lines.push('');
  lines.push('| Shell | Marginal | Truth win / avgT | Live Rule B win / avgT | Live - Truth |');
  lines.push('| --- | --- | --- | --- | --- |');
  const marginalOrder = [
    ['noToOneP4', 'No Bio -> One Bio P4'],
    ['noToOneO4', 'No Bio -> One Bio O4'],
    ['oneP4ToTwoP4', 'One Bio P4 -> Two Bio P4'],
    ['oneO4ToTwoO4', 'One Bio O4 -> Two Bio O4'],
    ['oneP4ToMixed', 'One Bio P4 -> Bio P4 + O4'],
    ['oneO4ToMixed', 'One Bio O4 -> Bio P4 + O4'],
  ];
  for (const [shell, truthVals] of Object.entries(truthMarginals)) {
    for (const [key, label] of marginalOrder) {
      const truthVal = truthVals[key];
      const simVal = liveMarginals[shell][key];
      const err = marginalComparison[shell][key];
      lines.push(`| ${quote(shell)} | ${label} | ${fmtSigned(truthVal.win)} / ${fmtSigned(truthVal.avgT, 4)} | ${fmtSigned(simVal.win)} / ${fmtSigned(simVal.avgT, 4)} | ${fmtSigned(err.winErr)} / ${fmtSigned(err.avgTErr, 4)} |`);
    }
  }
  lines.push('');
  lines.push('## 7. Temp-only candidate check, if used');
  lines.push('');
  lines.push('Not used. The new truth pack is already decisive on the key follow-up questions because it directly anchors one-copy Orange and duplicate Orange behavior under the live Rule B baseline.');
  lines.push('');
  lines.push('## 8. Best explanation now');
  lines.push('');
  lines.push(`- First-copy baseline miss is ${firstCopyBoth ? '**both Pink and Orange**' : '**Pink-only**'}, not just Pink. The live miss on \`No Bio -> One Bio O4\` is still shallow in both shells (Dual Rift ${fmtSigned(marginalComparison['Dual Rift'].noToOneO4.winErr)}, Core/Rift ${fmtSigned(marginalComparison['Core/Rift'].noToOneO4.winErr)}), although smaller than the Pink miss.`);
  lines.push(`- Second-Orange behavior looks **${secondOrangeLinear ? 'linear' : 'non-linear'}** relative to truth. \`One Bio O4 -> Two Bio O4\` is almost exact in both shells (Dual Rift ${fmtSigned(marginalComparison['Dual Rift'].oneO4ToTwoO4.winErr)}, Core/Rift ${fmtSigned(marginalComparison['Core/Rift'].oneO4ToTwoO4.winErr)}).`);
  lines.push(`- The current duplicate-Pink Rule B branch now looks **${ruleBOverstrong ? 'over-strong' : 'not obviously over-strong'}**. \`One Bio P4 -> Two Bio P4\` is too negative by ${fmtSigned(marginalComparison['Dual Rift'].oneP4ToTwoP4.winErr)} in Dual Rift and ${fmtSigned(marginalComparison['Core/Rift'].oneP4ToTwoP4.winErr)} in Core/Rift.`);
  lines.push(`- Mixed-color error is present, but the orange-anchor rows show it is not primarily a second-Orange duplicate problem. \`One Bio O4 -> Bio P4 + O4\` is shallow by ${fmtSigned(marginalComparison['Dual Rift'].oneO4ToMixed.winErr)} in Dual Rift and ${fmtSigned(marginalComparison['Core/Rift'].oneO4ToMixed.winErr)} in Core/Rift, which points more to the missing first-copy Pink surface than to Orange duplicate scaling.`);
  lines.push('- The smallest remaining helper-level follow-up is therefore **not patch-ready yet**. The orange pack shifts the priority order: rebalance the live duplicate-Pink branch first, then revisit whether a first-copy follow-up should apply to Pink only or to both colors.');
  lines.push('');
  lines.push('## 9. Recommendation');
  lines.push('');
  lines.push('**NEED ONE LAST MICRO-INSTRUMENTATION PASS**');
  lines.push('');
  lines.push('## 10. If PATCH CANDIDATE READY');
  lines.push('');
  lines.push('Not applicable. The orange-anchor truth pack indicates the live duplicate-Pink Rule B branch likely needs rebalance before any new first-copy or mixed-color follow-up can be called patch-ready.');
  lines.push('');
  lines.push('## 11. What ChatGPT should do next');
  lines.push('');
  lines.push('Use this report as the handoff. Do one last temp-only helper-level pass centered on the existing Rule B block, first reducing the duplicate-Pink branch magnitude from the live `1.5x` setting and checking the orange-anchor duplicate rows, then re-test whether any first-copy follow-up is still needed and whether it should apply to Pink only or to both Pink and Orange.');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

main();
