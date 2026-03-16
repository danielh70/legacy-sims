#!/usr/bin/env node
'use strict';

const fs = require('fs');

const p =
  './results/replay/legacy-replay--legacy-truth-double-bio-probe--legacy-sim-v1.0.4-clean--none--2026-03-15T02-21-42-069Z.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const rows = new Map((data.rows || []).map((r) => [r.defender, r]));

function get(name) {
  const r = rows.get(name);
  if (!r) throw new Error(`Missing row: ${name}`);
  return r;
}

function inc(fromName, toName) {
  const a = get(fromName);
  const b = get(toName);
  const truthDrop = Number((a.truth.winPct - b.truth.winPct).toFixed(2));
  const simDrop = Number((a.sim.winPct - b.sim.winPct).toFixed(2));
  return {
    from: fromName,
    to: toName,
    truthWinDrop: truthDrop,
    simWinDrop: simDrop,
    gap: Number((truthDrop - simDrop).toFixed(2)),
    truthAvgTurnsDelta: Number((b.truth.avgTurns - a.truth.avgTurns).toFixed(4)),
    simAvgTurnsDelta: Number((b.sim.avgTurns - a.sim.avgTurns).toFixed(4)),
    truthAHitDelta: Number((b.truth.A_hit - a.truth.A_hit).toFixed(2)),
    simAHitDelta: Number((b.sim.A_hit - a.sim.A_hit).toFixed(2)),
    truthDHitDelta: Number((b.truth.D_hit - a.truth.D_hit).toFixed(2)),
    simDHitDelta: Number((b.sim.D_hit - a.sim.D_hit).toFixed(2)),
    truthADmg1Delta: Number((b.truth.A_dmg1 - a.truth.A_dmg1).toFixed(2)),
    simADmg1Delta: Number((b.sim.A_dmg1 - a.sim.A_dmg1).toFixed(2)),
    truthDDmg1Delta: Number((b.truth.D_dmg1 - a.truth.D_dmg1).toFixed(2)),
    simDDmg1Delta: Number((b.sim.D_dmg1 - a.sim.Dmg1).toFixed(2)),
  };
}

function incFixed(fromName, toName) {
  const a = get(fromName);
  const b = get(toName);
  return {
    from: fromName,
    to: toName,
    truthWinDrop: Number((a.truth.winPct - b.truth.winPct).toFixed(2)),
    simWinDrop: Number((a.sim.winPct - b.sim.winPct).toFixed(2)),
    gap: Number(((a.truth.winPct - b.truth.winPct) - (a.sim.winPct - b.sim.winPct)).toFixed(2)),
    truthAvgTurnsDelta: Number((b.truth.avgTurns - a.truth.avgTurns).toFixed(4)),
    simAvgTurnsDelta: Number((b.sim.avgTurns - a.sim.avgTurns).toFixed(4)),
    truthAHitDelta: b.truth.A_hit - a.truth.A_hit,
    simAHitDelta: Number((b.sim.A_hit - a.sim.A_hit).toFixed(2)),
    truthDHitDelta: b.truth.D_hit - a.truth.D_hit,
    simDHitDelta: Number((b.sim.D_hit - a.sim.D_hit).toFixed(2)),
    truthADmg1Delta: b.truth.A_dmg1 - a.truth.A_dmg1,
    simADmg1Delta: Number((b.sim.A_dmg1 - a.sim.A_dmg1).toFixed(2)),
    truthDDmg1Delta: b.truth.D_dmg1 - a.truth.D_dmg1,
    simDDmg1Delta: Number((b.sim.D_dmg1 - a.sim.D_dmg1).toFixed(2)),
    truthDDmg2Delta: b.truth.D_dmg2 - a.truth.D_dmg2,
    simDDmg2Delta: Number((b.sim.D_dmg2 - a.sim.D_dmg2).toFixed(2)),
    truthDMinDelta: b.truth.D_rng[0] - a.truth.D_rng[0],
    simDMinDelta: b.sim.D_rng[0] - a.sim.D_rng[0],
    truthDMaxDelta: b.truth.D_rng[1] - a.truth.D_rng[1],
    simDMaxDelta: b.sim.D_rng[1] - a.sim.D_rng[1],
  };
}

const out = {
  dualRift: [
    incFixed('DL Dual Rift No Bio', 'DL Dual Rift One Bio P4'),
    incFixed('DL Dual Rift One Bio P4', 'DL Dual Rift Two Bio P4'),
    incFixed('DL Dual Rift One Bio P4', 'DL Dual Rift Bio P4 + O4'),
  ],
  coreRift: [
    incFixed('DL Core/Rift No Bio', 'DL Core/Rift One Bio P4'),
    incFixed('DL Core/Rift One Bio P4', 'DL Core/Rift Two Bio P4'),
    incFixed('DL Core/Rift One Bio P4', 'DL Core/Rift Bio P4 + O4'),
  ],
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
