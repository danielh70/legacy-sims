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
const debugIdentity = /^(1|true|yes|on)$/i.test(
  String(process.env.LEGACY_REPLAY_DEBUG_IDENTITY || '0'),
);
const replayDebugMatchupsRaw = String(process.env.LEGACY_REPLAY_DEBUG_MATCHUPS || '').trim();
const replayDebugTraceFights = Math.max(
  0,
  Number(process.env.LEGACY_REPLAY_DEBUG_TRACE_FIGHTS || '3') || 3,
);
const replayDebugRollDumpFights = Math.max(
  0,
  Number(process.env.LEGACY_REPLAY_DEBUG_ROLL_DUMP_FIGHTS || String(replayDebugTraceFights)) ||
    replayDebugTraceFights,
);
const replayDebugRollDumpMaxTurns = Math.max(
  0,
  Number(process.env.LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_TURNS || '8') || 8,
);
const replayDebugRollDumpMaxLines = Math.max(
  50,
  Number(process.env.LEGACY_REPLAY_DEBUG_ROLL_DUMP_MAX_LINES || '400') || 400,
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

function normalizeAttackType(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!s) return 'normal';
  if (s === 'aimed' || s === 'aim' || s === 'aimed atk' || s === 'aimed attack') return 'aimed';
  if (s === 'cover' || s === 'covered' || s === 'take cover' || s === 'cover attack')
    return 'cover';
  if (s === 'quick' || s === 'quick atk' || s === 'quick attack') return 'quick';
  return 'normal';
}

function ensureReplayAttackTypeSupported(v, label) {
  const attackType = normalizeAttackType(v);
  if (attackType === 'quick') {
    throw new Error(
      `Quick attack is not supported in legacy truth replay for ${label}. Use normal, aimed, or cover.`,
    );
  }
  return attackType;
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

const LEGACY_CRYSTAL_NAMES = new Set([
  'Amulet Crystal',
  'Perfect Pink Crystal',
  'Perfect Orange Crystal',
  'Perfect Green Crystal',
  'Perfect Yellow Crystal',
  'Perfect Fire Crystal',
  'Abyss Crystal',
  'Cabrusion Crystal',
  'Berserker Crystal',
]);
const LEGACY_CRYSTAL_SORT_ORDER = [
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
const LEGACY_CRYSTAL_SORT_RANK = new Map(
  LEGACY_CRYSTAL_SORT_ORDER.map((name, idx) => [name, idx]),
);

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

function hashStr32(str) {
  str = String(str);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hex8(u32) {
  return (u32 >>> 0).toString(16).padStart(8, '0');
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function crystalSortNames(names) {
  return Array.from(new Set((Array.isArray(names) ? names : []).filter(Boolean))).sort((a, b) => {
    const ra = LEGACY_CRYSTAL_SORT_RANK.has(a) ? LEGACY_CRYSTAL_SORT_RANK.get(a) : 999;
    const rb = LEGACY_CRYSTAL_SORT_RANK.has(b) ? LEGACY_CRYSTAL_SORT_RANK.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b));
  });
}

function crystalCountsFromEntries(entries) {
  const counts = {};
  for (const entry of entries || []) {
    const name = String(entry || '').trim();
    if (!name) continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function collapseCrystal(part) {
  const ups = Array.isArray(part && part.upgrades)
    ? part.upgrades.filter(Boolean)
    : [];
  return {
    name: part && part.name ? part.name : '',
    crystal: part && typeof part.crystal === 'string' ? part.crystal : '',
    upgrades: ups,
  };
}

function crystalEntriesFromCounts(counts) {
  const out = [];
  for (const name of crystalSortNames(Object.keys(counts || {}))) {
    const n = Math.max(0, Math.floor(Number(counts[name]) || 0));
    for (let i = 0; i < n; i += 1) out.push(name);
  }
  return out;
}

function resolveSlotCrystalEntries(slot) {
  if (!slot || typeof slot !== 'object') return [];

  const directCrystals = normalizeStringArray(slot.crystals);
  if (directCrystals.length) return directCrystals;

  if (slot.crystalSpec && typeof slot.crystalSpec === 'object') {
    return crystalEntriesFromCounts(slot.crystalSpec);
  }
  if (slot.crystalCounts && typeof slot.crystalCounts === 'object') {
    return crystalEntriesFromCounts(slot.crystalCounts);
  }
  if (Array.isArray(slot.crystalMix) && slot.crystalMix.length) {
    return normalizeStringArray(slot.crystalMix);
  }
  if (slot.crystalMix && typeof slot.crystalMix === 'object') {
    return crystalEntriesFromCounts(slot.crystalMix);
  }

  const crystal = String(
    (slot.crystal != null ? slot.crystal : slot.crystalName != null ? slot.crystalName : '') || '',
  ).trim();
  if (crystal) return [crystal, crystal, crystal, crystal];
  return [];
}

function normalizeTruthIdentitySlot(slot) {
  const crystalEntries = resolveSlotCrystalEntries(slot);
  const inlineUpgrades = normalizeStringArray(slot && slot.upgrades);
  const fieldUpgrades = normalizeStringArray([slot && slot.upgrade1, slot && slot.upgrade2]);
  let upgrades = inlineUpgrades.length ? inlineUpgrades : fieldUpgrades;

  if (
    crystalEntries.length &&
    upgrades.length >= crystalEntries.length &&
    stableStringify(upgrades.slice(0, crystalEntries.length)) === stableStringify(crystalEntries)
  ) {
    upgrades = upgrades.slice();
  } else if (crystalEntries.length) {
    upgrades = crystalEntries.concat(upgrades);
  }

  return {
    name: String((slot && slot.name) || '').trim(),
    upgrades,
  };
}

function normalizeTruthIdentityBuild(build) {
  const stats = (build && build.stats) || {};
  return {
    stats: {
      level: Number(stats.level),
      hp: Number(stats.hp),
      speed: Number(stats.speed),
      dodge: Number(stats.dodge),
      accuracy: Number(stats.accuracy),
    },
    armor: normalizeTruthIdentitySlot(build && build.armor),
    weapon1: normalizeTruthIdentitySlot(build && build.weapon1),
    weapon2: normalizeTruthIdentitySlot(build && build.weapon2),
    misc1: normalizeTruthIdentitySlot(build && build.misc1),
    misc2: normalizeTruthIdentitySlot(build && build.misc2),
  };
}

function truthIdentityHash(build) {
  return hex8(hashStr32(stableStringify(normalizeTruthIdentityBuild(build))));
}

function buildHashPair(attackerBuild, defenderBuild) {
  return {
    attacker: attackerBuild ? truthIdentityHash(attackerBuild) : null,
    defender: defenderBuild ? truthIdentityHash(defenderBuild) : null,
  };
}

function buildIdentityHashPairFromPageBuilds(pageBuilds) {
  return buildHashPair(
    pageBuilds && pageBuilds.attacker ? pageBuilds.attacker : null,
    pageBuilds && pageBuilds.defender ? pageBuilds.defender : null,
  );
}

function hasMixedCrystals(build) {
  for (const key of ['armor', 'weapon1', 'weapon2', 'misc1', 'misc2']) {
    const crystals = resolveSlotCrystalEntries(build && build[key]);
    if (new Set(crystals).size > 1) return true;
  }
  return false;
}

function buildReplayIdentityInfo(row, attackerBuild, defenderBuild) {
  return {
    expectedHashes:
      row && row.verifiedHashes
        ? { ...row.verifiedHashes }
        : row && row.requestedHashes
          ? { ...row.requestedHashes }
          : buildIdentityHashPairFromPageBuilds(row && row.verifiedPageBuilds
            ? row.verifiedPageBuilds
            : row && row.pageBuilds
              ? row.pageBuilds
              : null),
    normalizedBuilds: {
      attacker: normalizeTruthIdentityBuild(attackerBuild),
      defender: normalizeTruthIdentityBuild(defenderBuild),
    },
    hashes: buildHashPair(attackerBuild, defenderBuild),
    mixedCrystalsPreserved: {
      attacker: hasMixedCrystals(attackerBuild),
      defender: hasMixedCrystals(defenderBuild),
    },
  };
}

function collapseResolvedIdentity(exportPayload, defenderName) {
  const resolvedBuildsRoot = exportPayload && exportPayload.resolvedBuilds ? exportPayload.resolvedBuilds : null;
  const resolvedHashesRoot = exportPayload && exportPayload.resolvedHashes ? exportPayload.resolvedHashes : null;
  const defendersByName =
    resolvedBuildsRoot && resolvedBuildsRoot.defendersByName && typeof resolvedBuildsRoot.defendersByName === 'object'
      ? resolvedBuildsRoot.defendersByName
      : {};
  const resolvedDefender =
    defenderName && defendersByName[defenderName]
      ? defendersByName[defenderName]
      : defendersByName[Object.keys(defendersByName)[0]] || null;
  const exportDefenderHash =
    defenderName &&
    resolvedHashesRoot &&
    resolvedHashesRoot.defendersByName &&
    resolvedHashesRoot.defendersByName[defenderName]
      ? resolvedHashesRoot.defendersByName[defenderName]
      : resolvedHashesRoot &&
          resolvedHashesRoot.defendersByName &&
          resolvedHashesRoot.defendersByName[Object.keys(resolvedHashesRoot.defendersByName || {})[0]]
        ? resolvedHashesRoot.defendersByName[Object.keys(resolvedHashesRoot.defendersByName || {})[0]]
        : null;

  return {
    resolvedBuilds: {
      attacker: resolvedBuildsRoot && resolvedBuildsRoot.attacker ? resolvedBuildsRoot.attacker : null,
      defender: resolvedDefender,
    },
    exportResolvedHashes: {
      attacker: resolvedHashesRoot && resolvedHashesRoot.attacker ? resolvedHashesRoot.attacker : null,
      defender: exportDefenderHash,
    },
    resolvedHashes: buildHashPair(
      resolvedBuildsRoot && resolvedBuildsRoot.attacker ? resolvedBuildsRoot.attacker : null,
      resolvedDefender,
    ),
  };
}

function evaluateExactReplayIdentity(row, simIdentity, replayIdentity) {
  const expected = replayIdentity && replayIdentity.expectedHashes ? replayIdentity.expectedHashes : null;
  const replayHashes = replayIdentity && replayIdentity.hashes ? replayIdentity.hashes : null;
  const simHashes = simIdentity && simIdentity.resolvedHashes ? simIdentity.resolvedHashes : null;
  const reasons = [];

  function comparePair(label, left, right) {
    if (!left || !right) return;
    for (const side of ['attacker', 'defender']) {
      if (left[side] == null || right[side] == null) continue;
      if (String(left[side]) !== String(right[side])) {
        reasons.push(`${label} ${side} hash ${left[side]} != ${right[side]}`);
      }
    }
  }

  if (!expected || expected.attacker == null || expected.defender == null) {
    reasons.push('missing truth verified/requested hashes');
  }
  if (!replayHashes || replayHashes.attacker == null || replayHashes.defender == null) {
    reasons.push('missing replay payload hashes');
  }
  if (!simHashes || simHashes.attacker == null || simHashes.defender == null) {
    reasons.push('missing sim resolved hashes');
  }

  comparePair('replay payload vs truth', replayHashes, expected);
  comparePair('sim resolved vs truth', simHashes, expected);

  return {
    identityMatch: reasons.length === 0,
    identityMismatchReason: reasons.length ? reasons.join(' | ') : null,
  };
}

function maybePrintIdentityDebug(row, replayIdentity, simIdentity) {
  if (!debugIdentity || row.replaySource !== 'pageBuilds-exact') return;
  console.log('[LEGACY_REPLAY_DEBUG_IDENTITY]', JSON.stringify({
    label: row.label,
    truthRequestedHashes: row.requestedHashes || null,
    truthVerifiedHashes: row.verifiedHashes || null,
    replayHashes: replayIdentity ? replayIdentity.hashes : null,
    simResolvedHashes: simIdentity ? simIdentity.resolvedHashes : null,
    simExportResolvedHashes: simIdentity ? simIdentity.exportResolvedHashes : null,
    replayNormalizedBuilds: replayIdentity ? replayIdentity.normalizedBuilds : null,
    simResolvedBuilds: simIdentity ? simIdentity.resolvedBuilds : null,
    mixedCrystalsPreserved: replayIdentity ? replayIdentity.mixedCrystalsPreserved : null,
    identityMatch: simIdentity ? simIdentity.identityMatch : null,
    identityMismatchReason: simIdentity ? simIdentity.identityMismatchReason : null,
  }, null, 2));
}

function normalizeDebugMatchupKey(attacker, defender) {
  const a = String(attacker || '').trim();
  const d = String(defender || '').trim();
  return a && d ? `${a}|${d}` : '';
}

const replayDebugMatchupKeys = new Set(
  parseCsv(replayDebugMatchupsRaw)
    .map((entry) => {
      const pipeIndex = entry.indexOf('|');
      if (pipeIndex < 0) return '';
      return normalizeDebugMatchupKey(entry.slice(0, pipeIndex), entry.slice(pipeIndex + 1));
    })
    .filter(Boolean),
);

function wantsReplayDebugMatchup(row) {
  return replayDebugMatchupKeys.has(normalizeDebugMatchupKey(row.attacker, row.defender));
}

function trimIndentedSection(lines) {
  return lines.map((line) => line.replace(/^\s{2}/, '')).filter((line) => line !== '');
}

function extractTraceSection(stdout, defenderName) {
  const lines = String(stdout || '').split(/\r?\n/);
  const startNeedle = `=== TRACE`;
  const defenderNeedle = `for "${defenderName}"`;
  const start = lines.findIndex((line) => line.includes(startNeedle) && line.includes(defenderNeedle));
  if (start < 0) return [];
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > start && line.startsWith('  === ROLL_DUMP')) break;
    if (i > start && line.startsWith('SUMMARY:')) break;
    if (i > start && line.startsWith('COMPARE:')) break;
    if (i > start && line.startsWith('=== END OUTPUT ===')) break;
    out.push(line);
  }
  return trimIndentedSection(out);
}

function extractRollDumpSection(stdout, defenderName) {
  const lines = String(stdout || '').split(/\r?\n/);
  const startNeedle = `=== ROLL_DUMP for "${defenderName}"`;
  const start = lines.findIndex((line) => line.includes(startNeedle));
  if (start < 0) return [];
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    out.push(line);
    if (line.includes('=== END ROLL_DUMP ===')) break;
  }
  return trimIndentedSection(out);
}

function buildSanityFingerprint(exportPayload, simIdentity) {
  const variant = exportPayload && Array.isArray(exportPayload.variants) ? exportPayload.variants[0] : null;
  const fingerprint = exportPayload && exportPayload.fingerprint ? exportPayload.fingerprint : null;
  const critical = fingerprint && fingerprint.critical ? fingerprint.critical : variant && variant.config ? variant.config : null;
  return {
    sourceSimFile:
      fingerprint && fingerprint.sourceSimFile ? fingerprint.sourceSimFile : null,
    sourceDefsFile:
      exportPayload &&
      exportPayload.resolvedConfig &&
      exportPayload.resolvedConfig.sharedDefsFile
        ? exportPayload.resolvedConfig.sharedDefsFile
        : fingerprint && fingerprint.sharedDefsFile
          ? fingerprint.sharedDefsFile
          : null,
    sourceDefenderFile:
      exportPayload &&
      exportPayload.resolvedConfig &&
      exportPayload.resolvedConfig.defenderSourceFile
        ? exportPayload.resolvedConfig.defenderSourceFile
        : exportPayload && exportPayload.defenders && exportPayload.defenders.sourceFile
          ? exportPayload.defenders.sourceFile
          : null,
    attackerHash: simIdentity && simIdentity.resolvedHashes ? simIdentity.resolvedHashes.attacker : null,
    defenderHash: simIdentity && simIdentity.resolvedHashes ? simIdentity.resolvedHashes.defender : null,
    logicKey:
      fingerprint && fingerprint.logicKey ? fingerprint.logicKey : variant && variant.logicKey ? variant.logicKey : null,
    configKey:
      fingerprint && fingerprint.configKey ? fingerprint.configKey : variant && variant.configKey ? variant.configKey : null,
    runKey:
      fingerprint && fingerprint.runKey ? fingerprint.runKey : variant && variant.runKey ? variant.runKey : null,
    critical: critical
      ? {
          hitRollMode: critical.hitRollMode,
          hitGe: critical.hitGe,
          hitQround: critical.hitQround,
          skillRollMode: critical.skillRollMode,
          skillGe: critical.skillGe,
          skillQround: critical.skillQround,
          dmgRoll: critical.dmgRoll,
          armorK: critical.armorK,
          armorApply: critical.armorApply,
          armorRound: critical.armorRound,
          sharedHit: critical.sharedHit,
          sharedSkillMode: critical.sharedSkillMode,
          actionStopOnKill: critical.actionStopOnKill,
          speedTieMode: critical.speedTieMode,
          roundResolveMode: critical.roundResolveMode,
          crystalStackStats: critical.crystalStackStats,
          crystalStackDmg: critical.crystalStackDmg,
          crystalSlots: critical.crystalSlots,
          attackerAttackType: critical.attackerAttackType,
          defenderAttackType: critical.defenderAttackType,
          attackStyleRoundMode: critical.attackStyleRoundMode,
        }
      : null,
  };
}

function ratioOrNull(n, d, digits = 4) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return Number((n / d).toFixed(digits));
}

function buildDebugActionCounterDiagnosis(actionCounters, row, simRow) {
  if (!actionCounters || !actionCounters.attacker || !actionCounters.defender) return [];

  const attacker = actionCounters.attacker;
  const defender = actionCounters.defender;
  const hints = [];

  const attackerAppliedRaw = ratioOrNull(attacker.appliedDamageTotal, attacker.rawDamageTotal);
  const defenderAppliedRaw = ratioOrNull(defender.appliedDamageTotal, defender.rawDamageTotal);
  const attackerW2OnDeadRate = ratioOrNull(attacker.w2OnDeadCount, attacker.turnsTaken);
  const defenderW2OnDeadRate = ratioOrNull(defender.w2OnDeadCount, defender.turnsTaken);
  const attackerOverkillRate = ratioOrNull(
    attacker.w1OverkillCount + attacker.w2OverkillCount,
    attacker.turnsTaken,
  );
  const defenderOverkillRate = ratioOrNull(
    defender.w1OverkillCount + defender.w2OverkillCount,
    defender.turnsTaken,
  );
  const defenderW2KillRate = ratioOrNull(defender.killsByW2, defender.totalKills);
  const defenderW1FinishRate = ratioOrNull(defender.killsByW1, defender.weapon1DamageEvents);
  const defenderW2FinishRate = ratioOrNull(defender.killsByW2, defender.weapon2DamageEvents);

  const truthA = row && row.truth ? row.truth.A_damagePerFight : null;
  const truthD = row && row.truth ? row.truth.D_damagePerFight : null;
  const simA = simRow ? simRow.A_damagePerFight : null;
  const simD = simRow ? simRow.D_damagePerFight : null;
  if (
    Number.isFinite(truthA) &&
    Number.isFinite(truthD) &&
    Number.isFinite(simA) &&
    Number.isFinite(simD)
  ) {
    const deltaA = Number((simA - truthA).toFixed(1));
    const deltaD = Number((simD - truthD).toFixed(1));
    if (Math.abs(deltaD) > Math.abs(deltaA) + 20) {
      hints.push(
        `throughput gap is defender-skewed (A dmg/f Δ=${deltaA}, D dmg/f Δ=${deltaD})`,
      );
    }
  }

  if (
    defenderW2OnDeadRate != null &&
    (
      defenderW2OnDeadRate >= 0.08 ||
      (
        attackerW2OnDeadRate != null &&
        defender.w2OnDeadCount >= attacker.w2OnDeadCount + 5 &&
        defenderW2OnDeadRate >= attackerW2OnDeadRate * 1.5
      )
    )
  ) {
    hints.push(
      `defender w2OnDead is elevated (${defender.w2OnDeadCount}/${defender.turnsTaken}, rate=${defenderW2OnDeadRate})`,
    );
  }

  if (
    defenderAppliedRaw != null &&
    attackerAppliedRaw != null &&
    defenderAppliedRaw + 0.01 < attackerAppliedRaw
  ) {
    hints.push(
      `defender applied/raw is materially lower than attacker (${defenderAppliedRaw} vs ${attackerAppliedRaw})`,
    );
  }

  if (
    attackerAppliedRaw != null &&
    defenderAppliedRaw != null &&
    attackerAppliedRaw >= defenderAppliedRaw + 0.01
  ) {
    hints.push(
      `attacker applied/raw looks unusually favorable (${attackerAppliedRaw} vs ${defenderAppliedRaw})`,
    );
  }

  if (
    defender.weapon2DamageEvents > 0 &&
    (
      defender.killsByW2 === 0 ||
      (defenderW2KillRate != null && defenderW2KillRate <= 0.15)
    )
  ) {
    hints.push(
      `defender weapon2 lands damage but rarely closes kills (w2DamageEvents=${defender.weapon2DamageEvents}, killsByW2=${defender.killsByW2}, totalKills=${defender.totalKills})`,
    );
  }

  if (
    defenderW1FinishRate != null &&
    defenderW2FinishRate != null &&
    defenderW2FinishRate + 0.02 < defenderW1FinishRate
  ) {
    hints.push(
      `defender weapon2 converts damage events into kills less often than weapon1 (${defenderW2FinishRate} vs ${defenderW1FinishRate})`,
    );
  }

  if (
    defenderOverkillRate != null &&
    attackerOverkillRate != null &&
    defenderOverkillRate >= attackerOverkillRate + 0.05
  ) {
    hints.push(
      `defender overkill/dead-target behavior is more asymmetric than attacker (${defenderOverkillRate} vs ${attackerOverkillRate})`,
    );
  }

  if (!hints.length) {
    hints.push(
      'aggregate counters do not show a large overkill/dead-target asymmetry by themselves; inspect broader action distribution and turn sequencing next',
    );
  }

  return hints;
}

function buildRangeMismatchHints(compiledSnapshot, row) {
  if (!compiledSnapshot || !row || !row.truth) return [];
  const hints = [];

  function maybeRangeNote(label, predicted, truthRange) {
    if (!predicted || !Array.isArray(truthRange) || truthRange.length < 2) return;
    const dMin = Number(predicted.min || 0) - Number(truthRange[0] || 0);
    const dMax = Number(predicted.max || 0) - Number(truthRange[1] || 0);
    if (dMin >= 4 || dMax >= 8) {
      hints.push(
        `${label} compiled action range looks inflated vs truth (${predicted.min}-${predicted.max} vs ${truthRange[0]}-${truthRange[1]})`,
      );
      return;
    }
    if (dMin <= -4 || dMax <= -8) {
      hints.push(
        `${label} compiled action range looks compressed/capped vs truth (${predicted.min}-${predicted.max} vs ${truthRange[0]}-${truthRange[1]})`,
      );
    }
  }

  maybeRangeNote('attacker', compiledSnapshot.attacker && compiledSnapshot.attacker.compiledActionRange, row.truth.A_rng);
  maybeRangeNote('defender', compiledSnapshot.defender && compiledSnapshot.defender.compiledActionRange, row.truth.D_rng);

  return hints;
}

function buildRangeDiffHint(compiledSnapshot, row) {
  if (!compiledSnapshot || !row || !row.truth) return null;

  function buildSide(sideKey, truthRange, truthLabel) {
    const sideSnapshot = compiledSnapshot && compiledSnapshot[sideKey] ? compiledSnapshot[sideKey] : null;
    const simRange = sideSnapshot && sideSnapshot.compiledActionRange ? sideSnapshot.compiledActionRange : null;
    if (!simRange || !Array.isArray(truthRange) || truthRange.length < 2) return null;

    const math = sideSnapshot && sideSnapshot.debugMathBreakdown ? sideSnapshot.debugMathBreakdown : null;
    const weaponMath = math ? [math.weapon1, math.weapon2].filter(Boolean) : [];
    const crystalActive = weaponMath.some((weapon) => {
      const contrib = weapon && weapon.crystalDamageContribution;
      return !!(contrib && ((contrib.totalDelta && (contrib.totalDelta.min || contrib.totalDelta.max)) || (contrib.aggregatePct && (contrib.aggregatePct.min || contrib.aggregatePct.max))));
    });
    const upgradeActive = weaponMath.some((weapon) => {
      const upgrade = weapon && weapon.upgrade;
      return !!(upgrade && (upgrade.pct || (upgrade.delta && (upgrade.delta.min || upgrade.delta.max))));
    });

    const deltaMin = Number(simRange.min || 0) - Number(truthRange[0] || 0);
    const deltaMax = Number(simRange.max || 0) - Number(truthRange[1] || 0);
    const activeDamageSources = ['base weapon defs'];
    if (crystalActive) activeDamageSources.push('weapon crystal damage contribution');
    if (upgradeActive) activeDamageSources.push('weapon upgrade damage contribution');

    return {
      truthLabel,
      truthRange: [Number(truthRange[0] || 0), Number(truthRange[1] || 0)],
      simRange: [Number(simRange.min || 0), Number(simRange.max || 0)],
      delta: {
        min: deltaMin,
        max: deltaMax,
      },
      activeDamageSources,
      unlikelySources: ['attack-style rounding', 'stat-derived damage bonus'],
      summary:
        `${sideKey} range ${deltaMin >= 0 || deltaMax >= 0 ? 'inflated' : 'compressed'} vs truth ` +
        `by ${formatSigned(deltaMin, 2)}/${formatSigned(deltaMax, 2)}; current sim damage range comes from ` +
        `${activeDamageSources.join(' + ')}.`,
    };
  }

  return {
    attacker: buildSide('attacker', row.truth.A_rng, 'A_rng'),
    defender: buildSide('defender', row.truth.D_rng, 'D_rng'),
  };
}

function buildRangeSourceAudit(exportRow, compiledSnapshot, simRow) {
  function buildSide(sideKey, runtimeNode, compiledNode, replayRange, label) {
    const observedRange = runtimeNode && Array.isArray(runtimeNode.range) ? runtimeNode.range.slice(0, 2) : null;
    const compiledRange =
      compiledNode && compiledNode.compiledActionRange
        ? [Number(compiledNode.compiledActionRange.min || 0), Number(compiledNode.compiledActionRange.max || 0)]
        : null;
    const replayFieldRange = Array.isArray(replayRange) ? replayRange.slice(0, 2) : null;
    const observedMatchesReplay =
      observedRange &&
      replayFieldRange &&
      observedRange[0] === replayFieldRange[0] &&
      observedRange[1] === replayFieldRange[1];
    const differ =
      observedRange &&
      compiledRange &&
      (observedRange[0] !== compiledRange[0] || observedRange[1] !== compiledRange[1]);

    return {
      label,
      observedRangeReporter: {
        value: observedRange,
        replayFieldValue: replayFieldRange,
        sourceField: sideKey === 'attacker' ? 'exportRow.a.range' : 'exportRow.d.range',
        replayField: sideKey === 'attacker' ? 'sim.A_rng' : 'sim.D_rng',
        formulaPath:
          'doAction() updates stats.{side}.minActionDmg/maxActionDmg from realized actionRaw across sampled trials',
        concept: 'observed realized positive action range before HP-cap application',
        matchesReplayField: !!observedMatchesReplay,
      },
      compiledRangeReporter: {
        value: compiledRange,
        sourceField:
          sideKey === 'attacker'
            ? 'compiledSnapshot.attacker.compiledActionRange'
            : 'compiledSnapshot.defender.compiledActionRange',
        formulaPath:
          'predictPosActionRangeFromWeaponMinMax(compiled weapon min/max, target armor, armor config)',
        concept: 'compiled theoretical positive action envelope',
      },
      expectedToMatchExactly: false,
      differ: !!differ,
      differenceReason: differ
        ? 'observedRangeReporter is sample-based runtime output; compiledRangeReporter is a theoretical predictor, so they can disagree without implying a runtime combat-path mismatch'
        : 'runtime observed range and compiled predicted range agree for this matchup at the current trial set',
    };
  }

  return {
    attacker: buildSide(
      'attacker',
      exportRow && exportRow.a ? exportRow.a : null,
      compiledSnapshot && compiledSnapshot.attacker ? compiledSnapshot.attacker : null,
      simRow ? simRow.A_rng : null,
      'A_rng',
    ),
    defender: buildSide(
      'defender',
      exportRow && exportRow.d ? exportRow.d : null,
      compiledSnapshot && compiledSnapshot.defender ? compiledSnapshot.defender : null,
      simRow ? simRow.D_rng : null,
      'D_rng',
    ),
  };
}

function buildRuntimeVsCompiledComparison(runtimeCombatAudit, compiledSnapshot) {
  function eq(a, b, epsilon = 1e-9) {
    if (a == null && b == null) return true;
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= epsilon;
    return a === b;
  }

  function compareWeapon(runtimeSide, compiledSide, weaponKey) {
    const runtime = runtimeSide ? runtimeSide[weaponKey] : null;
    const compiled = compiledSide ? compiledSide[weaponKey] : null;
    if (!runtime || !compiled) return null;

    const comparisons = {
      hitOffenseStatUsed: {
        runtime: runtime.hitOffenseStatUsed ? runtime.hitOffenseStatUsed.value : null,
        compiled: compiled.hitCheckUsed && compiled.hitCheckUsed.offense ? compiled.hitCheckUsed.offense.value : null,
      },
      hitDefenseStatUsed: {
        runtime: runtime.hitDefenseStatUsed ? runtime.hitDefenseStatUsed.value : null,
        compiled: compiled.hitCheckUsed && compiled.hitCheckUsed.defense ? compiled.hitCheckUsed.defense.value : null,
      },
      skillOffenseStatUsed: {
        runtime: runtime.skillOffenseStatUsed ? runtime.skillOffenseStatUsed.value : null,
        compiled: compiled.skillCheckUsed && compiled.skillCheckUsed.offense ? compiled.skillCheckUsed.offense.value : null,
      },
      skillDefenseStatUsed: {
        runtime: runtime.skillDefenseStatUsed ? runtime.skillDefenseStatUsed.value : null,
        compiled: compiled.skillCheckUsed && compiled.skillCheckUsed.defense ? compiled.skillCheckUsed.defense.value : null,
      },
      projectileDefenseMultiplierUsed: {
        runtime: runtime.projectileDefenseMultiplierUsed,
        compiled: compiled.projectileDefenseMultiplier,
      },
      damageMinUsed: {
        runtime: runtime.damageMinMaxUsed ? runtime.damageMinMaxUsed.min : null,
        compiled: compiled.preArmorRange ? compiled.preArmorRange.min : null,
      },
      damageMaxUsed: {
        runtime: runtime.damageMinMaxUsed ? runtime.damageMinMaxUsed.max : null,
        compiled: compiled.preArmorRange ? compiled.preArmorRange.max : null,
      },
      armorFactorUsed: {
        runtime: runtime.armorFactorUsed,
        compiled: compiled.armorReduction ? compiled.armorReduction.targetArmorFactor : null,
      },
      tacticsValueUsed: {
        runtime: runtime.tacticsRuntime ? runtime.tacticsRuntime.value : null,
        compiled:
          compiled.sourceMapping && compiled.sourceMapping.damagePipeline
            ? compiled.sourceMapping.damagePipeline.tacticsValue
            : null,
      },
    };

    for (const entry of Object.values(comparisons)) entry.equal = eq(entry.runtime, entry.compiled, 1e-6);
    const mismatchFields = Object.entries(comparisons)
      .filter(([, entry]) => entry.equal === false)
      .map(([field]) => field);

    return {
      runtime,
      compiled: {
        hitCheckUsed: compiled.hitCheckUsed || null,
        skillCheckUsed: compiled.skillCheckUsed || null,
        damageMinMaxUsed: compiled.preArmorRange || null,
        armorFactorUsed: compiled.armorReduction ? compiled.armorReduction.targetArmorFactor : null,
        tacticsRuntime:
          compiled.sourceMapping && compiled.sourceMapping.damagePipeline
            ? compiled.sourceMapping.damagePipeline
            : null,
      },
      comparisons,
      equal: mismatchFields.length === 0,
      mismatchFields,
    };
  }

  function compareSide(sideKey) {
    const runtimeSide = runtimeCombatAudit ? runtimeCombatAudit[sideKey] : null;
    const compiledSide = compiledSnapshot ? compiledSnapshot[sideKey] : null;
    const weapon1 = compareWeapon(runtimeSide, compiledSide, 'weapon1');
    const weapon2 = compareWeapon(runtimeSide, compiledSide, 'weapon2');
    const mismatchFields = []
      .concat(weapon1 && !weapon1.equal ? weapon1.mismatchFields.map((field) => `weapon1.${field}`) : [])
      .concat(weapon2 && !weapon2.equal ? weapon2.mismatchFields.map((field) => `weapon2.${field}`) : []);
    return {
      weapon1,
      weapon2,
      equal: mismatchFields.length === 0,
      mismatchFields,
    };
  }

  const attacker = compareSide('attacker');
  const defender = compareSide('defender');
  return {
    attacker,
    defender,
    equal: attacker.equal && defender.equal,
    mismatchFields: attacker.mismatchFields.concat(defender.mismatchFields),
  };
}

function buildWeaponSuccessFlowAudit(weaponCounters) {
  function summarize(counter) {
    if (!counter) return null;
    return {
      hitRate: ratioOrNull(counter.hits, counter.attempts),
      skillRateGivenHit: ratioOrNull(counter.skillSuccesses, counter.hits),
      damageEventRatePerAttempt: ratioOrNull(counter.damageEvents || counter.skillSuccesses, counter.attempts),
      averageAppliedDamagePerAttempt: ratioOrNull(counter.appliedDamageTotal, counter.attempts),
      averageAppliedDamagePerHit: ratioOrNull(counter.appliedDamageTotal, counter.hits),
      averageAppliedDamagePerSuccessfulSkill: ratioOrNull(counter.appliedDamageTotal, counter.skillSuccesses),
    };
  }

  return weaponCounters
    ? {
        attacker: {
          weapon1: summarize(weaponCounters.attacker && weaponCounters.attacker.weapon1),
          weapon2: summarize(weaponCounters.attacker && weaponCounters.attacker.weapon2),
        },
        defender: {
          weapon1: summarize(weaponCounters.defender && weaponCounters.defender.weapon1),
          weapon2: summarize(weaponCounters.defender && weaponCounters.defender.weapon2),
        },
      }
    : null;
}

function buildDebugDiagnosisBucket({
  rangeSourceAudit,
  runtimeVsCompiledComparison,
  actionCounters,
  weaponSuccessFlowAudit,
  row,
  simRow,
}) {
  const reasons = [];

  if (runtimeVsCompiledComparison && runtimeVsCompiledComparison.equal === false) {
    reasons.push(`runtime/compiled mismatches: ${runtimeVsCompiledComparison.mismatchFields.join(', ')}`);
    return {
      likelyBucket: 'runtime stat-source mismatch',
      reasons,
    };
  }

  const rangeDisagreement =
    rangeSourceAudit &&
    ((rangeSourceAudit.attacker && rangeSourceAudit.attacker.differ) ||
      (rangeSourceAudit.defender && rangeSourceAudit.defender.differ));
  if (rangeDisagreement) {
    reasons.push('runtime inputs match compiled snapshot, but observed A_rng/D_rng and compiledActionRange come from different reporter concepts');
    reasons.push('this explains part of the earlier range signal, but not by itself the remaining win-rate gap');
    return {
      likelyBucket: 'stale/incorrect range reporter',
      reasons,
    };
  }

  const defenderW2 =
    weaponSuccessFlowAudit &&
    weaponSuccessFlowAudit.defender &&
    weaponSuccessFlowAudit.defender.weapon2
      ? weaponSuccessFlowAudit.defender.weapon2
      : null;
  const defenderW1 =
    weaponSuccessFlowAudit &&
    weaponSuccessFlowAudit.defender &&
    weaponSuccessFlowAudit.defender.weapon1
      ? weaponSuccessFlowAudit.defender.weapon1
      : null;
  if (
    defenderW1 &&
    defenderW2 &&
    defenderW2.averageAppliedDamagePerSuccessfulSkill != null &&
    defenderW1.averageAppliedDamagePerSuccessfulSkill != null &&
    defenderW2.averageAppliedDamagePerSuccessfulSkill + 0.02 < defenderW1.averageAppliedDamagePerSuccessfulSkill
  ) {
    reasons.push(
      `defender weapon2 converts successful skills into less applied damage than weapon1 (${defenderW2.averageAppliedDamagePerSuccessfulSkill} vs ${defenderW1.averageAppliedDamagePerSuccessfulSkill})`,
    );
    return {
      likelyBucket: 'defender successful-skill conversion problem',
      reasons,
    };
  }

  if (
    actionCounters &&
    actionCounters.attacker &&
    actionCounters.defender &&
    actionCounters.defender.turnsTaken + 50000 < actionCounters.attacker.turnsTaken
  ) {
    reasons.push(
      `defender takes materially fewer actions than attacker (${actionCounters.defender.turnsTaken} vs ${actionCounters.attacker.turnsTaken})`,
    );
    return {
      likelyBucket: 'defender turn-throughput problem',
      reasons,
    };
  }

  if (row && row.truth && simRow && Number.isFinite(row.truth.D_damagePerFight) && Number.isFinite(simRow.D_damagePerFight)) {
    reasons.push(
      `defender damage/fight remains low vs truth (${simRow.D_damagePerFight} vs ${row.truth.D_damagePerFight}) even after the range-reporter split is accounted for`,
    );
  }
  return {
    likelyBucket: 'still ambiguous',
    reasons,
  };
}

function buildReplayDebugAudit({
  row,
  defenderKey,
  replayIdentity,
  simIdentity,
  exportPayload,
  exportRow,
  simRow,
  stdout,
}) {
  const firstMove = exportRow && exportRow.firstMove ? exportRow.firstMove : null;
  const aNode = exportRow && exportRow.a ? exportRow.a : null;
  const dNode = exportRow && exportRow.d ? exportRow.d : null;
  const actionCounters = exportRow && exportRow.actionCounters ? exportRow.actionCounters : null;
  const weaponCounters = exportRow && exportRow.weaponCounters ? exportRow.weaponCounters : null;
  const runtimeCombatAudit = exportRow && exportRow.runtimeCombatAudit ? exportRow.runtimeCombatAudit : null;
  const compiledSnapshot = exportRow && exportRow.compiledSnapshot ? exportRow.compiledSnapshot : null;
  const sanityFingerprint = buildSanityFingerprint(exportPayload, simIdentity);
  const rangeMismatchHints = buildRangeMismatchHints(compiledSnapshot, row);
  const rangeDiffHint = buildRangeDiffHint(compiledSnapshot, row);
  const rangeSourceAudit = buildRangeSourceAudit(exportRow, compiledSnapshot, simRow);
  const runtimeVsCompiledComparison = buildRuntimeVsCompiledComparison(runtimeCombatAudit, compiledSnapshot);
  const weaponSuccessFlowAudit = buildWeaponSuccessFlowAudit(weaponCounters);
  const diagnosisBucket = buildDebugDiagnosisBucket({
    rangeSourceAudit,
    runtimeVsCompiledComparison,
    actionCounters,
    weaponSuccessFlowAudit,
    row,
    simRow,
  });
  return {
    verification: {
      truthRequestedHashes: row.requestedHashes || null,
      truthVerifiedHashes: row.verifiedHashes || null,
      simResolvedHashes: simIdentity ? simIdentity.resolvedHashes : null,
      simExportResolvedHashes: simIdentity ? simIdentity.exportResolvedHashes : null,
      identityMatch: simIdentity ? simIdentity.identityMatch : null,
      identityMismatchReason: simIdentity ? simIdentity.identityMismatchReason : null,
      normalizedAttackerBuild: replayIdentity ? replayIdentity.normalizedBuilds.attacker : null,
      normalizedDefenderBuild: replayIdentity ? replayIdentity.normalizedBuilds.defender : null,
      mixedCrystalsPreserved: replayIdentity ? replayIdentity.mixedCrystalsPreserved : null,
      sourceDefenderFile: sanityFingerprint.sourceDefenderFile,
      sourceDefsFile: sanityFingerprint.sourceDefsFile,
    },
    combatSummary: {
      truth: row.truth,
      sim: simRow,
      firstMove,
      simSkillGivenHit: {
        attacker: aNode && aNode.skillGivenHit ? aNode.skillGivenHit : null,
        defender: dNode && dNode.skillGivenHit ? dNode.skillGivenHit : null,
      },
      activeFlags: sanityFingerprint.critical,
    },
    sampledFightDiagnostics: {
      trace: extractTraceSection(stdout, defenderKey),
      rollDump: extractRollDumpSection(stdout, defenderKey),
    },
    compiledCombatSnapshot: compiledSnapshot,
    rangeSourceAudit,
    runtimeCombatAudit,
    runtimeVsCompiledComparison,
    debugStatBreakdown: compiledSnapshot
      ? {
          attacker: compiledSnapshot.attacker ? compiledSnapshot.attacker.debugStatBreakdown : null,
          defender: compiledSnapshot.defender ? compiledSnapshot.defender.debugStatBreakdown : null,
        }
      : null,
    debugMathBreakdown: compiledSnapshot
      ? {
          attacker: compiledSnapshot.attacker ? compiledSnapshot.attacker.debugMathBreakdown : null,
          defender: compiledSnapshot.defender ? compiledSnapshot.defender.debugMathBreakdown : null,
        }
      : null,
    weaponSourceMapping: compiledSnapshot
      ? {
          attacker: compiledSnapshot.attacker ? compiledSnapshot.attacker.weaponSourceMapping : null,
          defender: compiledSnapshot.defender ? compiledSnapshot.defender.weaponSourceMapping : null,
        }
      : null,
    debugActionCounters: actionCounters,
    debugWeaponCounters: weaponCounters,
    weaponSuccessFlowAudit,
    rangeDiffHint,
    rangeMismatchHints,
    diagnosisBucket,
    diagnosisHints: [
      ...(diagnosisBucket && diagnosisBucket.likelyBucket
        ? [`diagnosis bucket: ${diagnosisBucket.likelyBucket}`]
        : []),
      ...(diagnosisBucket && Array.isArray(diagnosisBucket.reasons) ? diagnosisBucket.reasons : []),
      ...(rangeDiffHint && rangeDiffHint.attacker && rangeDiffHint.attacker.summary
        ? [rangeDiffHint.attacker.summary]
        : []),
      ...(rangeDiffHint && rangeDiffHint.defender && rangeDiffHint.defender.summary
        ? [rangeDiffHint.defender.summary]
        : []),
      ...rangeMismatchHints,
      ...buildDebugActionCounterDiagnosis(actionCounters, row, simRow),
    ],
    sanityFingerprint,
  };
}

function pageBuildToLegacyBuild(pageBuild) {
  return {
    attackType: ensureReplayAttackTypeSupported(
      pageBuild && pageBuild.attackType,
      'page build attackType',
    ),
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

function pageBuildToLegacyCustom(pageBuild) {
  return pageBuildToLegacyBuild(pageBuild);
}

function pageBuildToLegacyDefenderPayload(pageBuild) {
  return pageBuildToLegacyBuild(pageBuild);
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

function findUserConfigBounds(simText) {
  const userConfigMatch = /const USER_CONFIG = \{/.exec(simText);
  if (!userConfigMatch) {
    throw new Error('Could not find const USER_CONFIG = {');
  }
  const userConfigBraceIndex = simText.indexOf('{', userConfigMatch.index);
  const userConfigBraceEnd = findMatchingBrace(simText, userConfigBraceIndex);
  if (userConfigBraceEnd < 0) {
    throw new Error('Could not find the end of USER_CONFIG');
  }
  return {
    userConfigBraceIndex,
    userConfigBraceEnd,
  };
}

function patchSimToCustomNewShape(simText, customBuild) {
  const { userConfigBraceIndex, userConfigBraceEnd } = findUserConfigBounds(simText);
  const userConfigBody = simText.slice(userConfigBraceIndex + 1, userConfigBraceEnd);
  const attackerMatch = /(^[ \t]*)attacker:\s*\{/m.exec(userConfigBody);
  if (!attackerMatch) {
    throw new Error('Could not find USER_CONFIG.attacker block in new layout');
  }

  const attackerLineIndent = attackerMatch[1];
  const attackerLineStart = userConfigBraceIndex + 1 + attackerMatch.index;
  const attackerBraceIndex = simText.indexOf('{', attackerLineStart);
  const attackerBraceEnd = findMatchingBrace(simText, attackerBraceIndex);
  if (attackerBraceEnd < 0) {
    throw new Error('Could not find the end of USER_CONFIG.attacker block in new layout');
  }

  const attackerBlockText = simText.slice(attackerLineStart, attackerBraceEnd + 1);
  if (
    /(^[ \t]*)mode:\s*['"](?:env|preset|custom)['"]/m.test(attackerBlockText) ||
    /(^[ \t]*)custom:\s*\{/m.test(attackerBlockText)
  ) {
    throw new Error('USER_CONFIG.attacker looks like the old mode/custom layout');
  }

  const defendersMatch = new RegExp(`\\n${attackerLineIndent}defenders:\\s*\\{`).exec(
    simText.slice(attackerBraceEnd + 1, userConfigBraceEnd + 1),
  );
  if (!defendersMatch) {
    throw new Error('Could not find USER_CONFIG.defenders block after USER_CONFIG.attacker');
  }

  const defendersLineStart = attackerBraceEnd + 1 + defendersMatch.index + 1;
  const attackerJson = JSON.stringify(customBuild, null, 2)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `${attackerLineIndent}${line}`))
    .join('\n');
  const replacement = `${attackerLineIndent}attacker: ${attackerJson},\n\n`;
  return simText.slice(0, attackerLineStart) + replacement + simText.slice(defendersLineStart);
}

function patchSimToCustomOldShape(simText, customBuild) {
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

function patchSimToCustom(simText, customBuild) {
  const errors = [];

  try {
    return patchSimToCustomNewShape(simText, customBuild);
  } catch (err) {
    errors.push(`new layout: ${err && err.message ? err.message : String(err)}`);
  }

  try {
    return patchSimToCustomOldShape(simText, customBuild);
  } catch (err) {
    errors.push(`old layout: ${err && err.message ? err.message : String(err)}`);
  }

  throw new Error(
    `Could not patch USER_CONFIG.attacker. Supported layouts: new always-active attacker block and old mode/custom block. ${errors.join(' | ')}`,
  );
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

function buildExactReplayError(message) {
  return `exact replay requires truth.pageBuilds.attacker and truth.pageBuilds.defender (${message})`;
}

function writeExactDefenderPayloadFile(filePath, defenderKey, defenderPayload) {
  const payload = { [defenderKey]: defenderPayload };
  fs.writeFileSync(filePath, `module.exports = ${JSON.stringify(payload, null, 2)};\n`);
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
  if (!fs.existsSync(exportPath)) {
    return {
      rows: {},
      payload: null,
      resolvedBuilds: null,
      resolvedHashes: null,
      exportResolvedHashes: null,
      resolvedConfig: null,
    };
  }
  const payload = readJson(exportPath);
  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const variant = variants[0];
  const rows = {};
  if (variant && Array.isArray(variant.defenders)) {
    for (const row of variant.defenders) rows[row.name] = row;
  }
  return {
    rows,
    payload,
    resolvedBuilds: payload && payload.resolvedBuilds ? payload.resolvedBuilds : null,
    resolvedHashes: null,
    exportResolvedHashes: payload && payload.resolvedHashes ? payload.resolvedHashes : null,
    resolvedConfig: payload && payload.resolvedConfig ? payload.resolvedConfig : null,
  };
}

function buildIdentitySection(row, simIdentity) {
  return {
    replaySource: row.replaySource || 'pageBuilds-exact',
    truthBuildVerified: typeof row.buildVerified === 'boolean' ? row.buildVerified : null,
    truthRequestedHashes: row.requestedHashes || null,
    truthVerifiedHashes: row.verifiedHashes || null,
    identityMatch:
      simIdentity && typeof simIdentity.identityMatch === 'boolean' ? simIdentity.identityMatch : null,
    identityMismatchReason:
      simIdentity && Object.prototype.hasOwnProperty.call(simIdentity, 'identityMismatchReason')
        ? simIdentity.identityMismatchReason
        : null,
    simResolvedHashes:
      simIdentity && simIdentity.resolvedHashes ? simIdentity.resolvedHashes : null,
    simExportResolvedHashes:
      simIdentity && simIdentity.exportResolvedHashes ? simIdentity.exportResolvedHashes : null,
  };
}

function attachIdentityFields(out, row, simIdentity) {
  out.requestedPageBuilds = row.requestedPageBuilds || null;
  out.verifiedPageBuilds = row.verifiedPageBuilds || null;
  out.requestedHashes = row.requestedHashes || null;
  out.verifiedHashes = row.verifiedHashes || null;
  out.buildVerified = typeof row.buildVerified === 'boolean' ? row.buildVerified : null;
  out.resolvedBuilds = simIdentity && simIdentity.resolvedBuilds ? simIdentity.resolvedBuilds : null;
  out.resolvedHashes = simIdentity && simIdentity.resolvedHashes ? simIdentity.resolvedHashes : null;
  out.exportResolvedHashes =
    simIdentity && simIdentity.exportResolvedHashes ? simIdentity.exportResolvedHashes : null;
  out.resolvedConfig = simIdentity && simIdentity.resolvedConfig ? simIdentity.resolvedConfig : null;
  out.identityMatch =
    simIdentity && typeof simIdentity.identityMatch === 'boolean' ? simIdentity.identityMatch : null;
  out.identityMismatchReason =
    simIdentity && Object.prototype.hasOwnProperty.call(simIdentity, 'identityMismatchReason')
      ? simIdentity.identityMismatchReason
      : null;
  out.sanityFingerprint =
    simIdentity && simIdentity.sanityFingerprint ? simIdentity.sanityFingerprint : null;
  out.debugAudit = simIdentity && simIdentity.debugAudit ? simIdentity.debugAudit : null;
  out.identity = buildIdentitySection(row, simIdentity);
  return out;
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
    A_hit: pickFinite(
      exportRow && exportRow.A_hit,
      aNode && Array.isArray(aNode.hit) ? aNode.hit[0] : null,
    ),
    A_dmg1: pickFinite(
      exportRow && exportRow.A_dmg1,
      aNode && Array.isArray(aNode.skillGivenHit) ? aNode.skillGivenHit[0] : null,
    ),
    A_dmg2: pickFinite(
      exportRow && exportRow.A_dmg2,
      aNode && Array.isArray(aNode.skillGivenHit) ? aNode.skillGivenHit[1] : null,
    ),
    D_hit: pickFinite(
      exportRow && exportRow.D_hit,
      dNode && Array.isArray(dNode.hit) ? dNode.hit[0] : null,
    ),
    D_dmg1: pickFinite(
      exportRow && exportRow.D_dmg1,
      dNode && Array.isArray(dNode.skillGivenHit) ? dNode.skillGivenHit[0] : null,
    ),
    D_dmg2: pickFinite(
      exportRow && exportRow.D_dmg2,
      dNode && Array.isArray(dNode.skillGivenHit) ? dNode.skillGivenHit[1] : null,
    ),
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
  const attackerPageBuild = m.pageBuilds && m.pageBuilds.attacker ? m.pageBuilds.attacker : null;
  const defenderPageBuild = m.pageBuilds && m.pageBuilds.defender ? m.pageBuilds.defender : null;
  let replayError = null;
  try {
    ensureReplayAttackTypeSupported(
      attackerPageBuild && attackerPageBuild.attackType,
      `${m.attacker} attacker attackType`,
    );
    ensureReplayAttackTypeSupported(
      defenderPageBuild && defenderPageBuild.attackType,
      `${m.defender} defender attackType`,
    );
  } catch (err) {
    replayError = buildExactReplayError(err && err.message ? err.message : String(err));
  }
  replayError =
    replayError ||
    (!isUsablePageBuild(attackerPageBuild)
      ? buildExactReplayError('missing/invalid attacker page build')
      : !isUsablePageBuild(defenderPageBuild)
        ? buildExactReplayError('missing/invalid defender page build')
        : null);

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
    pageBuild: attackerPageBuild,
    pageBuilds: {
      attacker: attackerPageBuild,
      defender: defenderPageBuild,
    },
    attackerPageBuild,
    defenderPageBuild,
    requestedPageBuilds: m.requestedPageBuilds || null,
    verifiedPageBuilds: m.verifiedPageBuilds || null,
    requestedHashes: m.requestedHashes || null,
    verifiedHashes: m.verifiedHashes || null,
    buildVerified: typeof m.buildVerified === 'boolean' ? m.buildVerified : null,
    replaySource: 'pageBuilds-exact',
    replayError,
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

function buildMatchupResult(row, sim, simIdentity) {
  if (!sim) {
    return attachIdentityFields({
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
      replaySource: row.replaySource || 'pageBuilds-exact',
      matchupKey: row.matchupKey,
    }, row, simIdentity);
  }

  const out = attachIdentityFields({
    attacker: row.attacker,
    defender: row.defender,
    truth: row.truth,
    sim,
    delta: {},
    absDelta: {},
    error: null,
    replaySource: row.replaySource || 'pageBuilds-exact',
    matchupKey: row.matchupKey,
  }, row, simIdentity);

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

function buildReplayErrorResult(row, error, sim = null, simIdentity = null) {
  return attachIdentityFields({
    attacker: row.attacker,
    defender: row.defender,
    truth: row.truth,
    sim,
    delta: {},
    absDelta: {},
    dWinPct: null,
    absWinPct: null,
    dAvgTurns: null,
    absAvgTurns: null,
    error,
    replaySource: row.replaySource || 'pageBuilds-exact',
    matchupKey: row.matchupKey,
  }, row, simIdentity);
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
    if (row.replayError) return buildReplayErrorResult(row, row.replayError);

    let scriptToRun = simAbs;
    const attackerPageBuild =
      (row.pageBuilds && row.pageBuilds.attacker) || row.attackerPageBuild || row.pageBuild || null;
    const defenderPageBuild =
      (row.pageBuilds && row.pageBuilds.defender) || row.defenderPageBuild || null;
    let attackerAttackType = 'normal';
    let defenderAttackType = 'normal';
    try {
      attackerAttackType = ensureReplayAttackTypeSupported(
        attackerPageBuild && attackerPageBuild.attackType,
        `${row.attacker} attacker attackType`,
      );
      defenderAttackType = ensureReplayAttackTypeSupported(
        defenderPageBuild && defenderPageBuild.attackType,
        `${row.defender} defender attackType`,
      );
    } catch (err) {
      return buildReplayErrorResult(row, err && err.message ? err.message : String(err));
    }
    const customBuild = getCustomBuildFromPageBuild(attackerPageBuild);
    if (!customBuild || !isUsablePageBuild(defenderPageBuild)) {
      return buildReplayErrorResult(row, buildExactReplayError('missing exact attacker/defender page builds at replay time'));
    }
    const defenderPayload = pageBuildToLegacyDefenderPayload(defenderPageBuild);
    const replayIdentity = buildReplayIdentityInfo(row, customBuild, defenderPayload);
    const debugMatchup = wantsReplayDebugMatchup(row);

    const defenderKey = `__REPLAY_DEFENDER__${sanitizeFilePart(row.attacker)}__${sanitizeFilePart(row.defender)}`.slice(0, 120);
    const exportPath = path.join(
      variantTmpDir,
      `${sanitizeFilePart(row.attacker)}--${sanitizeFilePart(row.defender)}--${process.pid}.json`,
    );
    const defenderFilePath = path.join(
      variantTmpDir,
      `${sanitizeFilePart(row.attacker)}--${sanitizeFilePart(row.defender)}--defender.js`,
    );

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
    writeExactDefenderPayloadFile(defenderFilePath, defenderKey, defenderPayload);

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
      LEGACY_DEFENDER_FILE: defenderFilePath,
      LEGACY_VERIFY_DEFENDERS: defenderKey,
      LEGACY_ATTACKER_ATTACK_TYPE: attackerAttackType,
      LEGACY_DEFENDER_ATTACK_TYPE: defenderAttackType,
      ...(debugMatchup
        ? {
            LEGACY_DIAG: '1',
            LEGACY_TRACE_FIGHTS: String(replayDebugTraceFights),
            LEGACY_ROLL_DUMP: replayDebugRollDumpFights > 0 ? '1' : '0',
            LEGACY_ROLL_DUMP_FIGHTS: String(replayDebugRollDumpFights),
            LEGACY_ROLL_DUMP_MAX_TURNS: String(replayDebugRollDumpMaxTurns),
            LEGACY_ROLL_DUMP_MAX_LINES: String(replayDebugRollDumpMaxLines),
          }
        : {}),
      ...(variant.env || {}),
    };

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
      const exportResult = parseExportRows(exportPath);
      const collapsedIdentity = collapseResolvedIdentity(exportResult.payload, defenderKey);
      const simRow = normalizeSimRow(compactRows[defenderKey], exportResult.rows[defenderKey]);
      const simIdentity = {
        resolvedBuilds: collapsedIdentity.resolvedBuilds,
        resolvedHashes: collapsedIdentity.resolvedHashes,
        exportResolvedHashes: collapsedIdentity.exportResolvedHashes,
        resolvedConfig: exportResult.resolvedConfig,
        sanityFingerprint: buildSanityFingerprint(exportResult.payload, collapsedIdentity),
        ...evaluateExactReplayIdentity(row, collapsedIdentity, replayIdentity),
      };
      if (debugMatchup) {
        simIdentity.debugAudit = buildReplayDebugAudit({
          row,
          defenderKey,
          replayIdentity,
          simIdentity,
          exportPayload: exportResult.payload,
          exportRow: exportResult.rows[defenderKey],
          simRow,
          stdout: proc.stdout,
        });
        console.log('[LEGACY_REPLAY_DEBUG_MATCHUP]', JSON.stringify(simIdentity.debugAudit, null, 2));
      }
      maybePrintIdentityDebug(row, replayIdentity, simIdentity);
      if (row.replaySource === 'pageBuilds-exact' && simIdentity.identityMatch === false) {
        return buildReplayErrorResult(
          row,
          `exact replay identity mismatch: ${simIdentity.identityMismatchReason}`,
          simRow,
          simIdentity,
        );
      }

      return buildMatchupResult(row, simRow, simIdentity);
    } finally {
      tracker.jobFinished(row.label);
      try {
        fs.unlinkSync(exportPath);
      } catch {}
      try {
        fs.unlinkSync(defenderFilePath);
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
