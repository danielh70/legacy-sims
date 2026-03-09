import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const legacySim = require(path.join(repoRoot, 'legacy-sim-v1.0.4-clean.js'));

const CASES = ['DL Gun Build', 'SG1 Split Bombs T2'];
const TRIALS = 500;

function parseCliOutput(stdout, defenderName) {
  const keyMatch = stdout.match(/KEY=([0-9a-f]{8})/i);
  const lines = stdout.split('\n');
  const targetLine = lines.find((line) => line.includes(defenderName));
  if (!targetLine) {
    throw new Error(`Could not find defender line for "${defenderName}"`);
  }

  const winMatch = targetLine.match(/\[\s*([0-9.]+)%\]/);
  const avgMatch = targetLine.match(/AvgT\s+([0-9.]+)/);

  if (!keyMatch || !winMatch || !avgMatch) {
    throw new Error(`Could not parse CLI output for "${defenderName}"`);
  }

  return {
    logicKey: keyMatch[1],
    attackerWinPct: Number(winMatch[1]),
    avgTurns: Number(avgMatch[1]),
  };
}

let failures = 0;

for (const defenderName of CASES) {
  const engineResult = legacySim.runSingleSimulation({
    attackerKey: legacySim.ATTACKER_PRESET,
    attackerName: 'Attacker',
    attackerBuild: legacySim.ATTACKER_BUILD,
    defenderName,
    defenderBuild: legacySim.DEFENDER_PAYLOADS[defenderName],
    trials: TRIALS,
    seed: 1337,
    deterministic: true,
  });

  const cli = spawnSync('node', ['legacy-sim-v1.0.4-clean.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LEGACY_TRIALS: String(TRIALS),
      LEGACY_DOCTOR: '0',
      LEGACY_HEADER: 'min',
      LEGACY_SUMMARY: '0',
      LEGACY_SEP: '0',
      LEGACY_OUTPUT: 'compact',
      LEGACY_VERIFY_DEFENDERS: defenderName,
    },
    encoding: 'utf8',
  });

  if (cli.status !== 0) {
    throw new Error(cli.stderr || `CLI run failed for "${defenderName}"`);
  }

  const cliResult = parseCliOutput(cli.stdout, defenderName);
  const engineWin = Number(engineResult.summary.attackerWinPct.toFixed(2));
  const engineAvg = Number(engineResult.summary.avgTurns.toFixed(2));
  const engineKey = engineResult.signatures.logicKey;

  const ok =
    engineKey === cliResult.logicKey &&
    engineWin === cliResult.attackerWinPct &&
    engineAvg === cliResult.avgTurns;

  if (!ok) failures++;

  console.log(
    [
      defenderName,
      `logicKey ${engineKey} vs ${cliResult.logicKey}`,
      `win ${engineWin.toFixed(2)} vs ${cliResult.attackerWinPct.toFixed(2)}`,
      `avgT ${engineAvg.toFixed(2)} vs ${cliResult.avgTurns.toFixed(2)}`,
      ok ? 'OK' : 'FAIL',
    ].join(' | '),
  );
}

if (failures > 0) {
  process.exitCode = 1;
}
