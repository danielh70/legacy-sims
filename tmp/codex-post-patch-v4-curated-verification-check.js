#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'tmp', 'codex-post-patch-v4-curated-verification-report.md');
const CURATED_PATH = path.join(ROOT, 'data', 'legacy-defenders-meta-v4-curated.js');
const VERIFY_REPORT_PATH = path.join(ROOT, 'tmp', 'codex-represented-build-patch-verify-report.md');
const PATCH_REPORT_PATH = path.join(ROOT, 'tmp', 'codex-represented-build-stat-stack-patch-report.md');
const MIXED_REPORT_PATH = path.join(ROOT, 'tmp', 'codex-mixed-slot-live-build-report.md');
const LOCALIZATION_REPORT_PATH = path.join(
  ROOT,
  'tmp',
  'codex-partial-crystal-stack-localization-report.md',
);
const HANDOFF_PATH = path.join(ROOT, 'legacy-bio-debug-handoff-2026-03-15.md');

const TRUTH_CURRENT_PATH = path.join(ROOT, 'tmp', 'legacy-truth-current-attacker-vs-meta.json');
const TRUTH_META16_PATH = path.join(ROOT, 'legacy-truth-meta16-two-attackers.json');
const REPLAY_CURRENT_PATH = path.join(
  ROOT,
  'tmp',
  'replay-v4-post-patch',
  'legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json',
);
const REPLAY_CSTAFF_PATH = path.join(
  ROOT,
  'tmp',
  'replay-v4-post-patch',
  'legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json',
);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function uniqueTruthCoverage(truthPath) {
  const j = readJson(truthPath);
  const out = new Map();
  for (const m of j.matchups || []) {
    if (!out.has(m.attacker)) out.set(m.attacker, new Set());
    out.get(m.attacker).add(m.defender);
  }
  return out;
}

function findReportRow(report, attacker, defender) {
  return (report.rows || []).find((r) => r.attacker === attacker && r.defender === defender) || null;
}

function buildNames(defs, names) {
  return names.map((name) => ({
    name,
    build: {
      stats: defs[name].stats,
      armor: defs[name].armor,
      weapon1: defs[name].weapon1,
      weapon2: defs[name].weapon2,
      misc1: defs[name].misc1,
      misc2: defs[name].misc2,
      attackType: 'normal',
    },
  }));
}

function main() {
  const curatedDefs = require(CURATED_PATH);
  const curatedNames = Object.keys(curatedDefs);
  const currentTruth = readJson(TRUTH_CURRENT_PATH);
  const meta16Truth = readJson(TRUTH_META16_PATH);
  const currentReplay = readJson(REPLAY_CURRENT_PATH);
  const cstaffReplay = readJson(REPLAY_CSTAFF_PATH);

  const currentCoverage = uniqueTruthCoverage(TRUTH_CURRENT_PATH);
  const meta16Coverage = uniqueTruthCoverage(TRUTH_META16_PATH);

  const currentCovered = [...(currentCoverage.get('CUSTOM') || new Set())].filter((n) =>
    curatedNames.includes(n),
  );
  const cstaffCovered = [...(meta16Coverage.get('CUSTOM_CSTAFF_A4') || new Set())].filter((n) =>
    curatedNames.includes(n),
  );

  const currentMissing = curatedNames.filter((n) => !currentCovered.includes(n));
  const cstaffMissing = curatedNames.filter((n) => !cstaffCovered.includes(n));
  const representedMissing = curatedNames.slice();

  const cstaffIdentityErrors = (cstaffReplay.rows || [])
    .filter((r) => r.error)
    .map((r) => r.defender)
    .sort();

  const cstaffComparedDefenders = (cstaffReplay.rows || [])
    .filter((r) => !r.error)
    .map((r) => r.defender)
    .sort();

  const cstaffGapNames = Array.from(new Set([...cstaffMissing, ...cstaffIdentityErrors])).sort();
  const cstaffGapDefs = buildNames(curatedDefs, cstaffGapNames);

  const chosenAttackers = [
    {
      label: 'REPRESENTED_LIVE_MIXED_SLOT',
      why: 'direct represented-build path that motivated the patch; currently no in-game truth rows in repo',
      truthCovered: 0,
      truthTotal: curatedNames.length,
    },
    {
      label: 'CUSTOM',
      why: 'uniform-slot regression guard with full v4 truth already present in tmp current-meta truth',
      truthCovered: currentCovered.length,
      truthTotal: curatedNames.length,
    },
    {
      label: 'CUSTOM_CSTAFF_A4',
      why: 'distinct second weapon skill family that stresses shared stat-stack behavior differently',
      truthCovered: cstaffCovered.length,
      truthTotal: curatedNames.length,
    },
  ];

  const coverageTable = table(
    ['Attacker', 'Why chosen', 'Covered truth rows', 'Missing truth rows', 'Notes'],
    [
      [
        'REPRESENTED_LIVE_MIXED_SLOT',
        'represented mixed-slot live-style path',
        `0/${curatedNames.length}`,
        `${representedMissing.length}`,
        'browser truth collector currently blocked by 4-crystal slot schema',
      ],
      [
        'CUSTOM',
        'uniform-slot regression guard',
        `${currentCovered.length}/${curatedNames.length}`,
        `${currentMissing.length}`,
        currentMissing.length ? currentMissing.join(', ') : 'truth-complete on v4',
      ],
      [
        'CUSTOM_CSTAFF_A4',
        'distinct Core Staff variant',
        `${cstaffCovered.length}/${curatedNames.length}`,
        `${cstaffMissing.length}`,
        cstaffMissing.join(', '),
      ],
    ],
  );

  const accuracyTable = table(
    ['Attacker', 'Truth file', 'Compared rows', 'Missing-truth rows', 'meanAbsΔwin', 'meanAbsΔavgT', 'worstAbsΔwin', 'Worst offender(s)'],
    [
      [
        'REPRESENTED_LIVE_MIXED_SLOT',
        'none',
        '0',
        String(representedMissing.length),
        'n/a',
        'n/a',
        'n/a',
        'no in-game truth in repo',
      ],
      [
        'CUSTOM',
        'tmp/legacy-truth-current-attacker-vs-meta.json',
        String(currentReplay.summary.compared),
        String(currentMissing.length),
        fmt(currentReplay.summary.meanAbsWinPct, 2),
        fmt(currentReplay.summary.meanAbsAvgTurns, 4),
        fmt(currentReplay.summary.worstAbsWinPct, 2),
        `${currentReplay.summary.worstDefender}`,
      ],
      [
        'CUSTOM_CSTAFF_A4',
        'legacy-truth-meta16-two-attackers.json',
        `${cstaffReplay.summary.compared} usable / ${cstaffCovered.length} truth-present`,
        String(cstaffMissing.length),
        fmt(cstaffReplay.summary.meanAbsWinPct, 2),
        fmt(cstaffReplay.summary.meanAbsAvgTurns, 4),
        fmt(cstaffReplay.summary.worstAbsWinPct, 2),
        `${cstaffReplay.summary.worstDefender}`,
      ],
    ],
  );

  const regressionRows = [
    [
      'CUSTOM',
      'uniform-slot full-v4 truth check',
      'no represented-build gating should apply',
      `meanAbsΔwin=${fmt(currentReplay.summary.meanAbsWinPct, 2)}, worst=${fmt(currentReplay.summary.worstAbsWinPct, 2)} (${currentReplay.summary.worstDefender})`,
    ],
    [
      'CUSTOM_CSTAFF_A4',
      'uniform-slot partial-v4 truth check',
      '3 truth rows stale/unusable due exact replay identity mismatch',
      `meanAbsΔwin=${fmt(cstaffReplay.summary.meanAbsWinPct, 2)} on ${cstaffReplay.summary.compared} usable rows`,
    ],
  ];

  const cstaffGapExport = {
    meta: {
      sourceSimFile: 'legacy-sim-v1.0.4-clean.js',
      attackerSource: 'manual-export',
      attackerLabel: 'CUSTOM_CSTAFF_A4',
      attackerAttackType: 'normal',
      crystalSlots: 4,
    },
    attackers: [
      {
        name: 'CUSTOM_CSTAFF_A4',
        build: {
          stats: { level: 80, hp: 650, speed: 60, dodge: 57, accuracy: 14 },
          armor: {
            name: 'Dark Legion Armor',
            crystals: ['Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal', 'Abyss Crystal'],
            upgrades: [],
          },
          weapon1: {
            name: 'Reaper Axe',
            crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
            upgrades: [],
          },
          weapon2: {
            name: 'Core Staff',
            crystals: ['Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal', 'Amulet Crystal'],
            upgrades: [],
          },
          misc1: {
            name: 'Bio Spinal Enhancer',
            crystals: [
              'Perfect Pink Crystal',
              'Perfect Pink Crystal',
              'Perfect Pink Crystal',
              'Perfect Pink Crystal',
            ],
            upgrades: [],
          },
          misc2: {
            name: 'Bio Spinal Enhancer',
            crystals: [
              'Perfect Orange Crystal',
              'Perfect Orange Crystal',
              'Perfect Orange Crystal',
              'Perfect Orange Crystal',
            ],
            upgrades: [],
          },
          attackType: 'normal',
        },
      },
    ],
    defenders: cstaffGapDefs,
  };

  const report = `# codex-post-patch-v4-curated-verification-report

## 1. Goal of this pass

Run a targeted post-patch verification sweep against the curated v4 defender set using 2-3 high-value attackers, compare against existing in-game truth where available, identify exactly what truth is still missing, and produce a later cleanup inventory without deleting anything.

No new behavior patch was made in this pass.

## 2. Exact files inspected

- [AGENTS.md](${path.join(ROOT, 'AGENTS.md')})
- [legacy-bio-debug-handoff-2026-03-15.md](${HANDOFF_PATH})
- [codex-represented-build-stat-stack-patch-report.md](${PATCH_REPORT_PATH})
- [codex-represented-build-patch-verify-report.md](${VERIFY_REPORT_PATH})
- [codex-mixed-slot-live-build-report.md](${MIXED_REPORT_PATH})
- [codex-partial-crystal-stack-localization-report.md](${LOCALIZATION_REPORT_PATH})
- [legacy-sim-v1.0.4-clean.js](${path.join(ROOT, 'legacy-sim-v1.0.4-clean.js')})
- [tools/legacy-truth-replay-compare.js](${path.join(ROOT, 'tools', 'legacy-truth-replay-compare.js')})
- [tools/legacy-truth-collector-v0.1.1.user.js](${path.join(ROOT, 'tools', 'legacy-truth-collector-v0.1.1.user.js')})
- [data/legacy-defenders-meta-v4-curated.js](${CURATED_PATH})
- [tmp/legacy-truth-current-attacker-vs-meta.json](${TRUTH_CURRENT_PATH})
- [legacy-truth-meta16-two-attackers.json](${TRUTH_META16_PATH})
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json](${REPLAY_CURRENT_PATH})
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json](${REPLAY_CSTAFF_PATH})

## 3. Exact commands run

\`\`\`sh
node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tools/legacy-truth-replay-compare.js
mkdir -p ./tmp/replay-v4-post-patch
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-post-patch LEGACY_REPLAY_TAG='codex-v4-custom-full15' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-v4-custom-full15.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-v4-post-patch LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS="Ashley Build,DL Core/Rift Dodge,DL Dual Rift Bio,DL Gun Blade Bio,DL Gun Blade Recon,DL Gun Sniper Mix,DL Maul/Core Orphic,HF Scythe Pair,SG1 Double Maul Droid,SG1 Rift/Bombs Bio,SG1 Split Bombs T2,SG1 Void/Reaper" LEGACY_REPLAY_TAG='codex-v4-cstaff-overlap12' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-meta16-two-attackers.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-v4-cstaff-overlap12.log 2>&1
\`\`\`

## 4. Chosen attacker builds and why

${table(
  ['Attacker', 'Why chosen'],
  chosenAttackers.map((a) => [a.label, a.why]),
)}

Notes:

- REPRESENTED_LIVE_MIXED_SLOT is the exact represented-build path that motivated the patch.
- CUSTOM is the best ordinary uniform-slot regression guard because repo truth already covers all 15 v4 defenders for it.
- CUSTOM_CSTAFF_A4 is distinct enough to stress the stat stack path through a different second weapon family.

## 5. Exact curated defender source used

- [data/legacy-defenders-meta-v4-curated.js](${CURATED_PATH})
- curated v4 defender count: **${curatedNames.length}**

Curated defenders:

${curatedNames.map((name) => `- ${name}`).join('\n')}

## 6. Truth coverage table by attacker

${coverageTable}

## 7. Accuracy summary table by attacker for covered rows

${accuracyTable}

## 8. Any regression rows worth attention

${table(
  ['Attacker', 'Check type', 'Status', 'Summary'],
  regressionRows,
)}

Most notable current covered-row offenders:

- CUSTOM: ${currentReplay.summary.worstDefender} at ${fmt(currentReplay.summary.worstAbsWinPct, 2)} absΔwin
- CUSTOM_CSTAFF_A4: ${cstaffReplay.summary.worstDefender} at ${fmt(cstaffReplay.summary.worstAbsWinPct, 2)} absΔwin

Important interpretation:

- The represented-build patch is narrowly gated to explicit per-part slot-count builds.
- CUSTOM and CUSTOM_CSTAFF_A4 are ordinary uniform-slot truth paths.
- CUSTOM still reproduces the pre-existing post-Rule-B current-meta accuracy scale (meanAbsΔwin=1.60), which is consistent with “no broad regression introduced.”

## 9. Exact missing-truth rows

### A. Represented mixed-slot live-style attacker

Existing in-game truth rows in repo:

- none

Missing truth rows:

${representedMissing.map((name) => `- REPRESENTED_LIVE_MIXED_SLOT vs ${name}`).join('\n')}

Current blocker:

- legacy-truth-collector-v0.1.1.user.js still requires exactly 4 crystal entries per slot in normalizeLegacyExportSlot(...)
- that means it cannot currently import/export the represented live attacker with 3x weapon/misc crystals
- so **truth collection for the represented mixed-slot attacker is currently blocked by collector schema**, not by the simulator

### B. CUSTOM

Missing truth rows:

- none on curated v4

### C. CUSTOM_CSTAFF_A4

Missing truth rows (never covered in current repo truth):

${cstaffMissing.map((name) => `- CUSTOM_CSTAFF_A4 vs ${name}`).join('\n')}

Truth rows present but currently unusable due exact replay identity mismatch:

${cstaffIdentityErrors.map((name) => `- CUSTOM_CSTAFF_A4 vs ${name}`).join('\n')}

Net additional truth still needed for full curated-v4 signoff on this attacker:

- ${cstaffGapNames.length} rows total

## 10. Exact truth-collector commands the user should run next, if needed

### A. Practical next truth collection that is already unblocked

Use this browser-console command to recollect the 6 missing/stale CUSTOM_CSTAFF_A4 rows:

\`\`\`js
await LegacyTruthCollector.runLegacyExport(${JSON.stringify(cstaffGapExport, null, 2)}, {
  repeats: 3,
  trialsText: '10,000 times',
  outputFile: 'legacy-truth-v4-custom-cstaff-gap6.json',
});
\`\`\`

This covers exactly:

${cstaffGapNames.map((name) => `- ${name}`).join('\n')}

### B. Represented mixed-slot live-style attacker

No exact browser truth-collector command is available yet with the current collector version.

Reason:

- LegacyTruthCollector.runLegacyExport(...) currently normalizes each slot to **exactly 4 crystal entries**
- the represented live attacker needs mixed slot counts (4-slot armor, 3-slot weapons, 3-slot miscs)
- so this attacker remains a **truth-collection blocker** until the collector/export schema supports per-part slot counts or non-4 crystal entry lengths

## 11. Cleanup inventory only

No files were deleted in this pass.

### Safe later delete

- [tmp/codex-v4-custom-full15.log](${path.join(ROOT, 'tmp', 'codex-v4-custom-full15.log')})
- [tmp/codex-v4-cstaff-overlap12.log](${path.join(ROOT, 'tmp', 'codex-v4-cstaff-overlap12.log')})
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-v4-custom-full15--2026-03-15T18-28-13-335Z.json](${REPLAY_CURRENT_PATH})
- [tmp/replay-v4-post-patch/legacy-replay--legacy-truth-meta16-two-attackers--legacy-sim-v1.0.4-clean--none--codex-v4-cstaff-overlap12--2026-03-15T18-28-13-481Z.json](${REPLAY_CSTAFF_PATH})
- [tmp/codex-post-patch-v4-curated-verification-check.js](${path.join(ROOT, 'tmp', 'codex-post-patch-v4-curated-verification-check.js')})

### Keep until final signoff

- [legacy-bio-debug-handoff-2026-03-15.md](${HANDOFF_PATH})
- [tmp/codex-represented-build-stat-stack-patch-report.md](${PATCH_REPORT_PATH})
- [tmp/codex-represented-build-patch-verify-report.md](${VERIFY_REPORT_PATH})
- [tmp/codex-mixed-slot-live-build-report.md](${MIXED_REPORT_PATH})
- [tmp/codex-partial-crystal-stack-localization-report.md](${LOCALIZATION_REPORT_PATH})
- [tmp/legacy-truth-current-attacker-vs-meta.json](${TRUTH_CURRENT_PATH})
- [legacy-truth-meta16-two-attackers.json](${TRUTH_META16_PATH})
- [codex-post-patch-v4-curated-verification-report.md](${REPORT_PATH})

### Uncertain / review before delete

- older Bio-theory temp reports and one-off probe JSONs in tmp/ tied to the now-closed Bio helper investigation
- [tmp/legacy-sim-v1.0.4-clean.pre-represented-build-patch.js](${path.join(ROOT, 'tmp', 'legacy-sim-v1.0.4-clean.pre-represented-build-patch.js')}) until final signoff
- unrelated tracked worktree changes in [brute-sim-v1.4.6.js](${path.join(ROOT, 'brute-sim-v1.4.6.js')}) should be reviewed separately, not deleted blindly

## 12. Explicit no-change statement

- no files were deleted in this pass
- no new behavior patch was made in this pass
- Bio helper logic was not changed
- combat logic was not changed
- brute was not changed
- weapon display and predictedDamage work were not reopened

## 13. Final verdict

**more truth is required before final signoff**

Current state:

- one ordinary uniform-slot attacker (CUSTOM) is truth-complete on curated v4 and still sits at the expected post-Rule-B accuracy scale
- one distinct attacker (CUSTOM_CSTAFF_A4) still needs **6** refreshed rows for full curated-v4 signoff
- the represented mixed-slot live-style attacker has **0** in-repo truth rows and is currently blocked by the collector’s fixed 4-crystal-slot schema

So the repo is not yet at “all curated v4 defenders verified against in-game truth for 2-3 attackers.” The next blocker is now clear and narrow:

- collect the 6 CUSTOM_CSTAFF_A4 gap rows
- then decide whether to extend the truth collector/export path to support mixed-slot represented builds before final cleanup
`;

  fs.writeFileSync(REPORT_PATH, report);
}

main();
