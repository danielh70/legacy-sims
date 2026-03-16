# codex-hf-truth-pack-stop-go-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `codex-hf-truth-pack-stop-go-report.md` | report-only | HF 2x4 truth-pack reconciliation / stop-go decision |

No JS files were edited in this pass.
No behavior-changing patch was made.
No new legacy/brute parity risk was introduced in this pass.

## Exact commands run

```bash
sed -n '1,240p' AGENTS.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' codex-final-post-parking-go-no-go-report.md
sed -n '1,260p' codex-droid-vs-hf-shell-diff-report.md
sed -n '1,260p' codex-dl-riftcore-bio-diagnosis-report.md
sed -n '1,260p' legacy-truth-hf-scythe-shell-probe-2x4.json

env LEGACY_SHARED_HIT=1 LEGACY_REPLAY_TRIALS=20000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-hf-truth-pack-stopgo LEGACY_REPLAY_TAG='hf-stopgo-pack' LEGACY_REPLAY_ATTACKERS='CUSTOM,CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='HF Scythe Pair,HF Scythe Pair | misc2 Scout Drones,HF Scythe Pair | armor SG1 Armor,HF Scythe Pair | weapon2 Crystal Maul' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-hf-scythe-shell-probe-2x4.json ./legacy-sim-v1.0.4-clean.js > ./tmp/codex-hf-truth-pack-stopgo.log 2>&1

node - <<'NODE'
const fs=require('fs');
const j=JSON.parse(fs.readFileSync('./legacy-truth-hf-scythe-shell-probe-2x4.json','utf8'));
for (const m of j.matchups){
  console.log('MATCHUP', m.attacker, '|', m.defender);
  console.log(JSON.stringify(m.aggregates, null, 2));
}
NODE

node - <<'NODE'
const fs=require('fs');
const j=JSON.parse(fs.readFileSync('./legacy-truth-hf-scythe-shell-probe-2x4.json','utf8'));
const baseByAtt={};
for(const m of j.matchups){
  if(m.defender==='HF Scythe Pair') baseByAtt[m.attacker]=m.aggregates.attackerWinPct;
}
console.log('TRUTH_DELTA_FROM_BASE');
for(const m of j.matchups){
  const base=baseByAtt[m.attacker];
  console.log([m.attacker,m.defender,m.aggregates.attackerWinPct.toFixed(3),(m.aggregates.attackerWinPct-base).toFixed(3),m.aggregates.avgTurns.toFixed(4)].join('\t'));
}
console.log('\nDEFENDER_COMPONENTS');
for(const m of j.matchups.slice(0,4)){
  const d=m.requestedPageBuilds.defender;
  console.log([m.defender,d.armor.name,d.weapon1.name,d.weapon2.name,d.misc1.name,d.misc2.name].join('\t'));
}
NODE

tail -n 80 ./tmp/codex-hf-truth-pack-stopgo.log

node - <<'NODE'
const live=require('./data/legacy-defenders.js');
const checks={
  hf_any:d=>d&&d.armor&&d.armor.name==='Hellforged Armor',
  hf_dual_scythe:d=>d&&d.armor&&d.armor.name==='Hellforged Armor'&&d.weapon1&&d.weapon2&&d.weapon1.name==='Scythe T2'&&d.weapon2.name==='Scythe T2',
  hf_scythe_bio_scout:d=>d&&d.armor&&d.armor.name==='Hellforged Armor'&&d.weapon1&&d.weapon2&&d.weapon1.name==='Scythe T2'&&d.weapon2.name==='Scythe T2'&&d.misc1&&d.misc2&&((d.misc1.name==='Scout Drones'&&d.misc2.name==='Bio Spinal Enhancer')||(d.misc2.name==='Scout Drones'&&d.misc1.name==='Bio Spinal Enhancer')),
  hf_scythe_maul_mix:d=>d&&d.armor&&d.armor.name==='Hellforged Armor'&&d.weapon1&&d.weapon2&&((d.weapon1.name==='Scythe T2'&&d.weapon2.name==='Crystal Maul')||(d.weapon2.name==='Scythe T2'&&d.weapon1.name==='Crystal Maul')),
};
for(const [label,fn] of Object.entries(checks)){
  const names=Object.entries(live).filter(([,d])=>fn(d)).map(([n])=>n).sort();
  console.log(label+'\t'+names.length);
  for(const n of names) console.log(n);
}
NODE
```

## Compact 2x4 HF truth-pack summary

Truth values below are attacker win % from `legacy-truth-hf-scythe-shell-probe-2x4.json`. `Δ vs base` is relative to the exact `HF Scythe Pair` row for the same attacker.

| attacker | defender | attacker win % | Δ vs base | avgTurns | structural swap |
| --- | --- | ---: | ---: | ---: | --- |
| `CUSTOM` | `HF Scythe Pair` | `65.710` | `0.000` | `9.5231` | baseline exact shell |
| `CUSTOM` | `HF Scythe Pair | misc2 Scout Drones` | `69.300` | `+3.590` | `9.1871` | remove Bio misc |
| `CUSTOM` | `HF Scythe Pair | armor SG1 Armor` | `68.806` | `+3.096` | `9.2432` | swap armor |
| `CUSTOM` | `HF Scythe Pair | weapon2 Crystal Maul` | `59.108` | `-6.602` | `8.9460` | break dual-Scythe pair |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `82.494` | `0.000` | `11.7786` | baseline exact shell |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | misc2 Scout Drones` | `74.626` | `-7.868` | `11.3648` | remove Bio misc |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | armor SG1 Armor` | `75.802` | `-6.692` | `11.7661` | swap armor |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | weapon2 Crystal Maul` | `55.794` | `-26.700` | `10.4551` | break dual-Scythe pair |

Direct read from the truth pack:

- `weapon2 Crystal Maul` is the strongest single swap.
- `misc2 Scout Drones` and `armor SG1 Armor` are not stable factors:
  - they help the attacker on `CUSTOM`
  - they hurt the attacker on `CUSTOM_CSTAFF_A4`
- so neither armor nor misc shell is a clean reusable explanation by itself.

## Current live-file fit on the same 8 rows

Current accepted `legacy-sim-v1.0.4-clean.js` vs the same truth pack:

| attacker | defender | win Δ | abs win Δ | avgTurns Δ |
| --- | --- | ---: | ---: | ---: |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | misc2 Scout Drones` | `-3.96` | `3.96` | `-0.0586` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair` | `-3.67` | `3.67` | `-0.0570` |
| `CUSTOM` | `HF Scythe Pair | weapon2 Crystal Maul` | `-3.32` | `3.32` | `-0.0127` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | armor SG1 Armor` | `-3.09` | `3.09` | `-0.1333` |
| `CUSTOM_CSTAFF_A4` | `HF Scythe Pair | weapon2 Crystal Maul` | `-2.37` | `2.37` | `-0.1116` |
| `CUSTOM` | `HF Scythe Pair | misc2 Scout Drones` | `-2.34` | `2.34` | `+0.0650` |
| `CUSTOM` | `HF Scythe Pair` | `-0.43` | `0.43` | `+0.0089` |
| `CUSTOM` | `HF Scythe Pair | armor SG1 Armor` | `-0.30` | `0.30` | `-0.0610` |

Read:

- the current sim misses all `8/8` rows in the same direction: attacker win too low
- but the truth-pack swap effects are not aligned across attackers
- so the truth pack is showing attacker-sensitive shell interaction, not a simple one-factor structural correction that the sim is universally missing

## Which factor is strongest?

Strongest single factor:

- breaking the dual-`Scythe T2` pair with `weapon2 Crystal Maul`

Why:

- it is the only swap that moves both attackers in the same direction
- it is also the largest effect in the pack:
  - `CUSTOM: -6.60`
  - `CUSTOM_CSTAFF_A4: -26.70`

Why it still does **not** become a clean reusable patch target:

- the magnitude is wildly attacker-sensitive
- it is only one swapped row
- it does not explain the opposite-direction misc and armor swaps
- there are `0` direct matches for this shell or its near variants in `data/legacy-defenders.js`

So the strongest factor is real, but not reusable enough.

## Does the truth pack show a clean structural split?

No.

What it shows instead:

- `misc` and `armor` are attacker-sensitive multi-factor effects, not stable reusable factors
- `weapon2 Crystal Maul` is the strongest shell change, but it behaves like a near-exact-shell interaction, not a broadly reusable family rule
- the exact `HF Scythe Pair` shell is not explained cleanly by:
  - `Hellforged Armor` alone
  - dual same-name melee alone
  - `Scout Drones + Bio` misc shell alone

Best summary:

- the pack supports a **near-exact-shell / attacker-sensitive interaction**
- not a clean structural split suitable for one more repo-side family proof pass

This also lines up with the earlier `codex-droid-vs-hf-shell-diff-report.md` result:

- HF movement under shared-hit probes tracked the HF shell more than the same-name melee family
- the new truth pack now shows that even inside the HF shell, the obvious one-factor swaps do not isolate one reusable cause cleanly

## Live/default reach note

Using `data/legacy-defenders.js`:

- `Hellforged Armor` rows: `2`
- exact `HF Scythe Pair`: `0`
- `Hellforged + dual Scythe T2`: `0`
- `Hellforged + Scythe/Crystal Maul mix`: `0`

So even if a narrow HF theory looked somewhat plausible, it would still be a curated-only or near-curated-only local theory branch.

## Recommendation

**Stop local diagnosis entirely.**

Why:

1. the new truth pack does not reveal one reusable factor strong enough to justify another proof pass
2. the strongest swap (`weapon2 Crystal Maul`) is still near-exact-shell and heavily attacker-sensitive
3. the other candidate factors (`Hellforged Armor`, `Scout Drones + Bio`) flip direction between the two attackers
4. default/live reach is effectively zero for the actual HF shell family we would need to patch
5. this is exactly the failure mode the prior go/no-go report warned about: a shell-local problem that looks interesting, but not patch-safe

The accepted Bio gate should still be treated honestly as a narrow calibrated fix for its proven lane, not as evidence that every remaining shell can be solved locally the same way.

So the current live file is the best justified local state for now.

## Explicit untouched statements

- No new truth was collected in this pass.
- `legacy-sim-v1.0.4-clean.js` was untouched.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.

HF truth pack shows near-exact-shell behavior; stop local diagnosis
