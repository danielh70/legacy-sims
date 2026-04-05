import express from 'express';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const require = createRequire(PROJECT_ROOT + '/');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Serve Vite build
const distPath = resolve(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// --- GET /api/defs ---
app.get('/api/defs', (_req, res) => {
  try {
    // Clear require cache so we always get fresh data
    const defsPath = resolve(PROJECT_ROOT, 'data/legacy-defs.js');
    delete require.cache[defsPath];
    const defs = require(defsPath);
    res.json({
      ItemDefs: defs.ItemDefs || defs.itemDefs,
      CrystalDefs: defs.CrystalDefs || defs.crystalDefs,
      UpgradeDefs: defs.UpgradeDefs || defs.upgradeDefs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/defenders ---
app.get('/api/defenders', (_req, res) => {
  try {
    const defPath = resolve(PROJECT_ROOT, 'data/legacy-defenders-meta-v4-curated.js');
    delete require.cache[defPath];
    const payloads = require(defPath);
    res.json(payloads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/simulate ---
app.post('/api/simulate', (req, res) => {
  const { attacker, defenders, config } = req.body;

  if (!attacker || !defenders || !Array.isArray(defenders) || defenders.length === 0) {
    return res.status(400).json({ error: 'Missing attacker build or defenders list' });
  }

  // Build a temporary sim config file
  const tmpDir = resolve(PROJECT_ROOT, 'tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const tmpId = randomBytes(8).toString('hex');
  const tmpDefenderFile = join(tmpDir, `ui-defenders-${tmpId}.js`);
  const tmpSimFile = join(tmpDir, `ui-sim-${tmpId}.js`);

  try {
    // Write temporary defender payloads
    const defPayloads = {};
    for (const d of defenders) {
      defPayloads[d.name] = d.payload;
    }
    writeFileSync(
      tmpDefenderFile,
      `'use strict';\n` +
      `const S = (name, crystal, upgrades = []) => ({ name, crystal, upgrades });\n` +
      `const M = (name, crystal, crystalCounts, upgrades = []) => ({ name, crystal, crystalCounts, upgrades });\n` +
      `module.exports = ${JSON.stringify(defPayloads, null, 2)};\n`
    );

    // Read the original sim file and patch USER_CONFIG
    const origSimPath = resolve(PROJECT_ROOT, 'legacy-sim-v1.0.4-clean.js');
    const origSim = require('fs').readFileSync(origSimPath, 'utf8');

    // Build USER_CONFIG replacement
    const userConfig = {
      attacker: {
        label: attacker.label || 'UI_CUSTOM',
        attackType: attacker.attackType || 'normal',
        stats: attacker.stats || { level: 80, hp: 865, speed: 60, dodge: 14, accuracy: 14 },
        armor: attacker.armor || { name: 'SG1 Armor', crystal: 'Abyss Crystal', upgrades: [] },
        weapon1: attacker.weapon1 || { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
        weapon2: attacker.weapon2 || { name: 'Crystal Maul', crystal: 'Amulet Crystal', upgrades: [] },
        misc1: attacker.misc1 || { name: 'Orphic Amulet', crystal: 'Amulet Crystal', upgrades: [] },
        misc2: attacker.misc2 || { name: 'Orphic Amulet', crystal: 'Amulet Crystal', upgrades: [] },
      },
      defenders: {
        file: tmpDefenderFile,
      },
      style: {
        attackerAttackType: config?.attackerAttackType || 'aimed',
        defenderAttackType: config?.defenderAttackType || '',
        roundMode: config?.roundMode || 'floor',
      },
    };

    // Replace the USER_CONFIG block in the sim
    const configMarkerStart = '// === USER CONFIG (quick edits) ==';
    const configMarkerEnd = '// === END USER CONFIG ==';
    const startIdx = origSim.indexOf(configMarkerStart);
    const endIdx = origSim.indexOf(configMarkerEnd);

    let patchedSim;
    if (startIdx !== -1 && endIdx !== -1) {
      const afterEnd = origSim.indexOf('\n', endIdx);
      patchedSim =
        origSim.substring(0, startIdx) +
        `const USER_CONFIG = ${JSON.stringify(userConfig, null, 2)};\n` +
        origSim.substring(afterEnd + 1);
    } else {
      // Fallback: just prepend
      patchedSim = origSim.replace(
        /const USER_CONFIG = \{[\s\S]*?\n\};/,
        `const USER_CONFIG = ${JSON.stringify(userConfig, null, 2)};`
      );
    }

    writeFileSync(tmpSimFile, patchedSim);

    // Build env vars
    const defenderNames = defenders.map((d) => d.name).join(',');
    const env = {
      ...process.env,
      LEGACY_TRIALS: String(config?.trials || 10000),
      LEGACY_SEED: String(config?.seed || 1337),
      LEGACY_DETERMINISTIC: '1',
      LEGACY_EXPORT_JSON: '1',
      LEGACY_EXPORT_JSON_FILE: join(tmpDir, `ui-results-${tmpId}.json`),
      LEGACY_DOCTOR: '0',
      LEGACY_OUTPUT: 'compact',
      LEGACY_COLOR: '0',
      LEGACY_VERIFY_DEFENDERS: defenderNames,
      LEGACY_DEFENDER_FILE: tmpDefenderFile,
      LEGACY_ENV_WARN: '0',
    };

    // Apply optional config overrides
    if (config?.armorK != null) env.LEGACY_ARMOR_K = String(config.armorK);
    if (config?.dmgRoll) env.LEGACY_DMG_ROLL = String(config.dmgRoll);
    if (config?.hitRollMode) env.LEGACY_HIT_ROLL_MODE = String(config.hitRollMode);
    if (config?.armorApply) env.LEGACY_ARMOR_APPLY = String(config.armorApply);
    if (config?.armorRound) env.LEGACY_ARMOR_ROUND = String(config.armorRound);
    if (config?.speedTieMode) env.LEGACY_SPEED_TIE_MODE = String(config.speedTieMode);
    if (config?.roundResolveMode) env.LEGACY_ROUND_RESOLVE_MODE = String(config.roundResolveMode);
    if (config?.crystalStackMode) env.LEGACY_CRYSTAL_STACK_MODE = String(config.crystalStackMode);
    if (config?.attackerAttackType) env.LEGACY_ATTACKER_ATTACK_TYPE = String(config.attackerAttackType);
    if (config?.defenderAttackType) env.LEGACY_DEFENDER_ATTACK_TYPE = String(config.defenderAttackType);
    if (config?.attackStyleRound) env.LEGACY_ATTACK_STYLE_ROUND = String(config.attackStyleRound);

    const child = spawn('node', [tmpSimFile], {
      cwd: PROJECT_ROOT,
      env,
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      // Try to read the JSON export file
      const jsonPath = env.LEGACY_EXPORT_JSON_FILE;
      let results = null;
      try {
        if (existsSync(jsonPath)) {
          results = JSON.parse(require('fs').readFileSync(jsonPath, 'utf8'));
        }
      } catch (e) {
        // Fall through
      }

      // Cleanup temp files
      try { unlinkSync(tmpDefenderFile); } catch (_) {}
      try { unlinkSync(tmpSimFile); } catch (_) {}
      try { if (existsSync(jsonPath)) unlinkSync(jsonPath); } catch (_) {}

      if (code !== 0 && !results) {
        return res.status(500).json({
          error: 'Simulation failed',
          code,
          stderr: stderr.substring(0, 2000),
          stdout: stdout.substring(0, 2000),
        });
      }

      res.json({
        results,
        stdout: stdout.substring(0, 5000),
      });
    });

    child.on('error', (err) => {
      try { unlinkSync(tmpDefenderFile); } catch (_) {}
      try { unlinkSync(tmpSimFile); } catch (_) {}
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    try { unlinkSync(tmpDefenderFile); } catch (_) {}
    try { unlinkSync(tmpSimFile); } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (_req, res) => {
  const index = resolve(distPath, 'index.html');
  if (existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(404).send('Run "npm run build" first, or use "npm run dev" for development.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Legacy Sim UI server running on http://localhost:${PORT}`);
});
