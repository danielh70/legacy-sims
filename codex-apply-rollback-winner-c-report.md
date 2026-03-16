# codex-apply-rollback-winner-c-report

Cleanup note:
- temporary probe configs, logs, and replay outputs referenced below were historical investigation artifacts and may have been removed during final repo cleanup

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `legacy-sim-v1.0.4-clean.js` | behavior-changing | removed live Hellforged Armor base override behavior; left represented-build fix, accepted Bio gate, and `armorK=8` unchanged |
| `tmp/codex-apply-rollback-winner-c-config.js` | instrumentation-only | one-toggle live-file confirmation config for the broad truth-covered set |
| `codex-apply-rollback-winner-c-report.md` | report-only | apply/confirm summary |

`brute-sim-v1.4.6.js` was not edited.

## Exact commands run

```bash
sed -n '1,120p' ./legacy-sim-v1.0.4-clean.js
sed -n '1738,1795p' ./legacy-sim-v1.0.4-clean.js
sed -n '140,165p' ./legacy-sim-v1.0.4-clean.js
sed -n '5598,5615p' ./legacy-sim-v1.0.4-clean.js
sed -n '1,220p' ./codex-full-rollback-vs-k-report.md
sed -n '1,240p' ./tmp/codex-full-rollback-vs-k-config.js
sed -n '1,220p' ./tmp/codex-full-rollback-vs-k-confirm-config.js
sed -n '240,340p' ./data/legacy-defs.js
rg -n "HF_ARMOR_BASE_OVERRIDE|VOID_SWORD_BASE_MIN_OVERRIDE|VOID_SWORD_BASE_MAX_OVERRIDE|Hellforged Armor|Void Sword" ./brute-sim-v1.4.6.js ./legacy-sim-v1.0.4-clean.js
rg -n "summary.json|ranked|targetGain|results.json|toggleSummaries" ./tools/codex-lane-probe-harness.js

node --check ./legacy-sim-v1.0.4-clean.js
node --check ./tmp/codex-apply-rollback-winner-c-config.js
node ./tools/codex-lane-probe-harness.js ./tmp/codex-apply-rollback-winner-c-config.js > ./tmp/codex-apply-rollback-winner-c-harness.log 2>&1

node - <<'NODE'
const fs=require('fs');
const path=require('path');
function loadRows(dir){const rows=[]; for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){rows.push(...(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).rows||[]));} return rows;}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
const live=loadRows('./tmp/lane-probe-harness/apply-rollback-winner-c-1773701099388/live-after-apply-c');
console.log(JSON.stringify({
  rows: live.length,
  broad: {
    meanAbsWin:+mean(live.map(r=>Math.abs(r.dWinPct))).toFixed(3),
    worstAbsWin:+Math.max(...live.map(r=>Math.abs(r.dWinPct))).toFixed(2),
    meanAbsAvgTurns:+mean(live.map(r=>Math.abs(r.dAvgTurns))).toFixed(4),
  },
}, null, 2));
NODE

node - <<'NODE'
const fs=require('fs');
const path=require('path');
function loadRows(dir){const rows=[]; for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){rows.push(...(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).rows||[]));} return rows;}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function summarize(rows){return {meanAbsWin:+mean(rows.map(r=>Math.abs(r.dWinPct))).toFixed(3), worstAbsWin:+Math.max(...rows.map(r=>Math.abs(r.dWinPct))).toFixed(2), meanAbsTurns:+mean(rows.map(r=>Math.abs(r.dAvgTurns))).toFixed(4)};}
const a=loadRows('./tmp/lane-probe-harness/full-rollback-vs-k-confirm-1773700555659/model-a-current');
const live=loadRows('./tmp/lane-probe-harness/apply-rollback-winner-c-1773701099388/live-after-apply-c');
const bioDefs=new Set(['DL Dual Rift Bio','DL Core/Rift Bio']);
const hfDefs=new Set(['HF Scythe Pair','HF Scythe Pair | misc2 Scout Drones','HF Scythe Pair | armor SG1 Armor','HF Scythe Pair | weapon2 Crystal Maul']);
const hfAttackers=new Set(['CUSTOM','CUSTOM_CSTAFF_A4']);
const scoutDef='DL Rift/Bombs Scout';
function filt(rows,fn){return rows.filter(fn);}
console.log(JSON.stringify({
  broad:{A:summarize(a),live:summarize(live)},
  repairedBio:{A:summarize(filt(a,r=>bioDefs.has(r.defender))),live:summarize(filt(live,r=>bioDefs.has(r.defender)))},
  hfTruth:{A:summarize(filt(a,r=>hfDefs.has(r.defender)&&hfAttackers.has(r.attacker))),live:summarize(filt(live,r=>hfDefs.has(r.defender)&&hfAttackers.has(r.attacker)))},
  scout:{A:summarize(filt(a,r=>r.defender===scoutDef)),live:summarize(filt(live,r=>r.defender===scoutDef))}
}, null, 2));
NODE

node - <<'NODE'
const fs=require('fs');
const path=require('path');
function loadRows(dir){const rows=[]; for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){rows.push(...(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).rows||[]));} return rows;}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function cmp(base, other){
 const map=new Map(base.map(r=>[`${r.attacker}__${r.defender}`,r]));
 const diffs=[];
 for(const r of other){ const b=map.get(`${r.attacker}__${r.defender}`); if(!b) continue; diffs.push({dw:Math.abs(r.dWinPct-b.dWinPct), dt:Math.abs(r.dAvgTurns-b.dAvgTurns)}); }
 return {rows:diffs.length, meanAbsWinGap:+mean(diffs.map(x=>x.dw)).toFixed(3), maxAbsWinGap:+Math.max(...diffs.map(x=>x.dw)).toFixed(2), meanAbsTurnGap:+mean(diffs.map(x=>x.dt)).toFixed(4), maxAbsTurnGap:+Math.max(...diffs.map(x=>x.dt)).toFixed(4)};
}
const live=loadRows('./tmp/lane-probe-harness/apply-rollback-winner-c-1773701099388/live-after-apply-c');
const a=loadRows('./tmp/lane-probe-harness/full-rollback-vs-k-confirm-1773700555659/model-a-current');
const c=loadRows('./tmp/lane-probe-harness/full-rollback-vs-k-confirm-1773700555659/model-c-no-item-overrides');
console.log(JSON.stringify({liveVsA:cmp(a,live),liveVsC:cmp(c,live)},null,2));
NODE
```

## Exact live change made

Applied the practical rollback winner `C` change to [legacy-sim-v1.0.4-clean.js](/Users/danielhook/Desktop/code_projects/legacy_sims/legacy-sim-v1.0.4-clean.js):

- removed the live `LEGACY_HF_ARMOR_BASE_OVERRIDE` default (`125`)
- removed the block that mutated `ItemDefs['Hellforged Armor'].flatStats.armor` from the live sim
- removed the now-dead `hfArmorBaseOverride` config-signature field tied to that live override

Left unchanged on purpose:

- represented-build fix
- accepted narrow Bio gate
- `armorK = 8`
- live Void Sword override plumbing

Void Sword note:

- the live `VOID_SWORD_BASE_MAX_OVERRIDE` plumbing is still present
- I did not broaden this pass into removing it because the rollback report already showed it is effectively inert against current shared defs (`data/legacy-defs.js` already carries `Void Sword` base max `120`)

## Compact confirmation

20k broad truth-covered confirmation, using the same 6 truth files and attacker set from the rollback report:

| bucket | old accepted `A` (stored) | rollback winner `C` (stored) | live after apply `C` |
| --- | ---: | ---: | ---: |
| broad mean abs win Δ | `2.023` | `1.875` | `1.899` |
| broad worst abs win Δ | `6.53` | `6.19` | `7.27` |
| broad mean abs avgTurns Δ | `0.0891` | `0.1134` | `0.1111` |
| repaired Bio lane mean abs win Δ | `2.297` | `2.220` in rollback report / `2.064` live bucket check | `2.064` |
| HF truth-pack rows mean abs win Δ | `2.227` | `1.789` in rollback report / `1.619` live bucket check | `1.619` |
| scout healthy/control mean abs win Δ | `0.635` | n/a | `0.532` |

Direct similarity to stored 20k rollback confirmation:

| comparison | mean abs win-gap across rows | max abs win-gap | mean abs avgTurns-gap |
| --- | ---: | ---: | ---: |
| live vs old accepted `A` | `0.649` | `4.47` | `0.0499` |
| live vs stored winner `C` | `0.406` | `1.19` | `0.0210` |

Read:

- the patched live file is materially closer to the stored rollback-winner `C` behavior than to the old accepted `A` behavior
- broad mean abs win delta moved in the expected winning direction
- repaired Bio lane and HF truth-pack rows both moved in the expected winning direction
- control/scout rows stayed acceptable and slightly improved on mean abs win delta
- exact worst-row reproduction did not stay identical to the stored temp `C` run, but the live file still matches the rollback-winner direction overall

## Parity note

Parity with [brute-sim-v1.4.6.js](/Users/danielhook/Desktop/code_projects/legacy_sims/brute-sim-v1.4.6.js) was **not preserved** on the item-override surface, because brute still contains the old Hellforged override plumbing and was intentionally left untouched in this pass.

## Confirmation result

Yes. The live file now matches the rollback-winner expectation closely enough to justify the practical `C` application:

- remove live Hellforged Armor override behavior
- keep represented-build fix ON
- keep accepted Bio gate ON
- keep `armorK = 8`

No new truth was collected.
`brute-sim-v1.4.6.js` was untouched.

rollback winner C applied and confirmed
