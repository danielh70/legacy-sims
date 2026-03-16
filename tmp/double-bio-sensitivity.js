#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { CrystalDefs, ItemDefs } = require('../data/legacy-defs.js');

function roundStat(x) {
  return Math.ceil(x);
}

function crystalPct(itemName, crystalName, slotTag = 0) {
  void itemName;
  void slotTag;
  return { ...(((CrystalDefs[crystalName] || {}).pct) || {}) };
}

function applyStat(base, statKey, crystalName, slotTag = 0, slots = 4) {
  let x = base || 0;
  const pct = (crystalPct('', crystalName, slotTag)[statKey] || 0);
  for (let i = 0; i < slots; i += 1) x = roundStat(x * (1 + pct));
  return x;
}

function miscAdds(itemName, crystalName, slotTag = 0) {
  if (!itemName || !crystalName) {
    return {
      speed: 0,
      accuracy: 0,
      dodge: 0,
      gunSkill: 0,
      meleeSkill: 0,
      projSkill: 0,
      defSkill: 0,
      armor: 0,
    };
  }
  const flat = (ItemDefs[itemName] && ItemDefs[itemName].flatStats) || {};
  return {
    speed: applyStat(flat.speed || 0, 'speed', crystalName, slotTag),
    accuracy: applyStat(flat.accuracy || 0, 'accuracy', crystalName, slotTag),
    dodge: applyStat(flat.dodge || 0, 'dodge', crystalName, slotTag),
    gunSkill: applyStat(flat.gunSkill || 0, 'gunSkill', crystalName, slotTag),
    meleeSkill: applyStat(flat.meleeSkill || 0, 'meleeSkill', crystalName, slotTag),
    projSkill: applyStat(flat.projSkill || 0, 'projSkill', crystalName, slotTag),
    defSkill: applyStat(flat.defSkill || 0, 'defSkill', crystalName, slotTag),
    armor: applyStat(flat.armor || 0, 'armor', crystalName, slotTag),
  };
}

function loadShell(path) {
  const row = JSON.parse(fs.readFileSync(path, 'utf8')).rows[0];
  const d = row.debugAudit.compiledCombatSnapshot.defender;
  const slot = d.debugStatBreakdown.slotContributions;
  const fixed = {
    speed: d.effective.speed - slot.misc1.adds.speed - slot.misc2.adds.speed,
    accuracy: d.effective.accuracy - slot.misc1.adds.accuracy - slot.misc2.adds.accuracy,
    dodge: d.effective.dodge - slot.misc1.adds.dodge - slot.misc2.adds.dodge,
    gunSkill: d.effective.gunSkill - slot.misc1.adds.gunSkill - slot.misc2.adds.gunSkill,
    meleeSkill: d.effective.meleeSkill - slot.misc1.adds.meleeSkill - slot.misc2.adds.meleeSkill,
    projSkill: d.effective.projSkill - slot.misc1.adds.projSkill - slot.misc2.adds.projSkill,
    defSkill: d.effective.defSkill - slot.misc1.adds.defSkill - slot.misc2.adds.defSkill,
    armor: d.effective.armor - slot.misc1.adds.armor - slot.misc2.adds.armor,
  };
  return { defender: row.defender, fixed };
}

const shells = [
  loadShell(
    './results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-compiled-debug-dual-rift--2026-03-15T00-58-35-465Z.json',
  ),
  loadShell(
    './results/replay/legacy-replay--legacy-truth-current-attacker-vs-meta--legacy-sim-v1.0.4-clean--none--codex-rift-family-core-rift-debug--2026-03-15T01-55-03-778Z.json',
  ),
];

const scenarios = [
  { name: 'no Bio', m1: null, m2: null },
  { name: 'one Bio[P4]', m1: 'Perfect Pink Crystal', m2: null },
  { name: 'two Bio[P4]', m1: 'Perfect Pink Crystal', m2: 'Perfect Pink Crystal' },
  { name: 'Bio[P4]+Bio[O4]', m1: 'Perfect Pink Crystal', m2: 'Perfect Orange Crystal' },
  { name: 'two Bio[O4]', m1: 'Perfect Orange Crystal', m2: 'Perfect Orange Crystal' },
];

const out = shells.map((shell) => {
  return {
    defender: shell.defender,
    fixedNoMisc: shell.fixed,
    scenarios: scenarios.map((s) => {
      const a1 = miscAdds('Bio Spinal Enhancer', s.m1, 1);
      const a2 = miscAdds('Bio Spinal Enhancer', s.m2, 2);
      const compiled = {
        speed: shell.fixed.speed + a1.speed + a2.speed,
        accuracy: shell.fixed.accuracy + a1.accuracy + a2.accuracy,
        dodge: shell.fixed.dodge + a1.dodge + a2.dodge,
        gunSkill: shell.fixed.gunSkill + a1.gunSkill + a2.gunSkill,
        meleeSkill: shell.fixed.meleeSkill + a1.meleeSkill + a2.meleeSkill,
        projSkill: shell.fixed.projSkill + a1.projSkill + a2.projSkill,
        defSkill: shell.fixed.defSkill + a1.defSkill + a2.defSkill,
        armor: shell.fixed.armor + a1.armor + a2.armor,
      };
      return {
        scenario: s.name,
        compiled,
        deltaFromNoBio: {
          accuracy: compiled.accuracy - shell.fixed.accuracy,
          dodge: compiled.dodge - shell.fixed.dodge,
          gunSkill: compiled.gunSkill - shell.fixed.gunSkill,
          meleeSkill: compiled.meleeSkill - shell.fixed.meleeSkill,
          projSkill: compiled.projSkill - shell.fixed.projSkill,
          defSkill: compiled.defSkill - shell.fixed.defSkill,
        },
      };
    }),
  };
});

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
