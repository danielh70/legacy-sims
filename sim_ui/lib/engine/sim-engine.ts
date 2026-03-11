import 'server-only';

import { loadLegacyModules } from '@/lib/engine/legacy-source';
import { normalizeSimBuild, type CompiledCombatant, type SimRequest, type SimResponse } from '@/lib/engine/types';

function toCompiledCombatant(value: any): CompiledCombatant {
  return {
    attackType: value.attackType,
    hp: value.hp,
    level: value.level,
    speed: value.speed,
    armor: value.armor,
    armorFactor: value.armorFactor,
    acc: value.acc,
    dodge: value.dodge,
    gun: value.gun,
    mel: value.mel,
    prj: value.prj,
    defSk: value.defSk,
    weapon1: value.weapon1,
    weapon2: value.weapon2,
  };
}

function validateRequest(input: unknown): SimRequest {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be an object.');
  }

  const request = input as SimRequest;
  if (!request.attacker?.build) {
    throw new Error('Invalid attacker build.');
  }
  if (!request.defender?.build) {
    throw new Error('Invalid defender build.');
  }

  const trials = Math.max(1, Math.floor(Number(request.trials) || 0));
  if (!Number.isFinite(trials) || trials <= 0) {
    throw new Error('Trials must be a positive integer.');
  }

  return {
    attacker: {
      key: request.attacker.key || 'CUSTOM',
      label: request.attacker.label || 'Attacker',
      build: normalizeSimBuild(request.attacker.build),
    },
    defender: {
      key: request.defender.key || 'CUSTOM',
      label: request.defender.label || 'Defender',
      build: normalizeSimBuild(request.defender.build),
    },
    trials,
    maxTurns: request.maxTurns ? Math.max(1, Math.floor(Number(request.maxTurns) || 0)) : undefined,
    seed: request.seed ? Math.floor(Number(request.seed) || 0) : 1337,
    includeTrace: Boolean(request.includeTrace),
  };
}

export async function runLegacySimulation(input: unknown): Promise<SimResponse> {
  const request = validateRequest(input);
  const { legacySim } = await loadLegacyModules();
  const cfg = legacySim.variantToCfg(legacySim.getDefaultVariant(), {
    trials: request.trials,
    maxTurns: request.maxTurns,
    diag: request.includeTrace,
  });

  const result = legacySim.runSingleSimulation({
    attackerKey: request.attacker.key,
    attackerName: request.attacker.label,
    attackerBuild: request.attacker.build,
    defenderName: request.defender.label,
    defenderBuild: request.defender.build,
    cfg,
    trials: request.trials,
    maxTurns: request.maxTurns,
    seed: request.seed,
    deterministic: true,
    traceFights: request.includeTrace ? 1 : 0,
  });

  return {
    attackerWinPct: result.summary.attackerWinPct,
    defenderWinPct: result.summary.defenderWinPct,
    avgTurns: result.summary.avgTurns,
    turnsMin: result.summary.turnsMin,
    turnsMax: result.summary.turnsMax,
    attacker: result.summary.attacker,
    defender: result.summary.defender,
    compiled: {
      attacker: toCompiledCombatant(result.attacker),
      defender: toCompiledCombatant(result.defender),
    },
    signatures: result.signatures,
    cfg: legacySim.buildCfgSignatureObject(result.cfg, 'fast'),
    traceLines: result.traceLines,
  };
}
