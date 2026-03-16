# codex-droid-shared-hit-family-proof-report

## Scope

Source-of-truth docs read first:
- `AGENTS.md`
- `legacy-bio-debug-handoff-2026-03-15.md`
- `tmp/codex-tracked-bio-lane-patch-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-applied-damage-proof-report.md`
- `codex-droid-split-decomposition-report.md`

`legacy-chat-handoff-2026-03-15-continuation.md` was not present in the workspace when searched.

Assumptions preserved:
- verified represented-build baseline stays
- tracked narrow Bio-lane mitigation stays in `legacy-sim-v1.0.4-clean.js`
- no brute edits
- no new truth
- no cleanup
- no broad Bio revisit
- no slot-order / predictedDamage-display / replay-key / global mitigation revisit

## Files touched

| File | Touch type | Notes |
| --- | --- | --- |
| `tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js` | instrumentation-only | temp family-scoped shared-hit proof harness cloned from live sim |
| `codex-droid-shared-hit-family-proof-report.md` | report-only | self-contained findings |

Untouched:
- `legacy-sim-v1.0.4-clean.js`
- `brute-sim-v1.4.6.js`

No behavior-changing live patch was landed, so no live legacy/brute parity change was introduced in this pass.

## Relevant defender mapping by weapon pair / skill family

Curated source used for family mapping:
- `data/legacy-defenders-meta-v4-curated.js`
- `data/legacy-defs.js`

Weapon-family map for the rows relevant to this pass:

| Defender | W1 | W2 | Skill pair | Same skill code | Melee+melee | Same weapon name | Identical dual pair |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SG1 Double Maul Droid` | `Crystal Maul` | `Crystal Maul` | melee + melee | yes | yes | yes | no |
| `HF Scythe Pair` | `Scythe T2` | `Scythe T2` | melee + melee | yes | yes | yes | no |
| `DL Rift/Bombs Scout` | `Rift Gun` | `Split Crystal Bombs T2` | gun + projectile | no | no | no | no |
| `Ashley Build` | `Reaper Axe` | `Core Staff` | melee + melee | yes | yes | no | no |
| `DL Reaper/Maul Orphic Bio` | `Reaper Axe` | `Crystal Maul` | melee + melee | yes | yes | no | no |

Important cluster read:
- the only natural family that isolates droid away from Ashley / Orphic is `same weapon name`
- but that same family still includes `HF Scythe Pair`
- `identical dual pair` excludes both droid and HF because both rows have mixed slot composition on one weapon slot

## Candidate family predicates tested

Temp-only family toggles added around defender-side shared-hit refresh before `w2`:

| Mode | Natural predicate |
| --- | --- |
| `global_refresh_hit` | refresh defender `w2` shared-hit on every eligible defender multiweapon action |
| `same_skill_refresh_hit` | refresh only when defender `w1.skill === w2.skill` |
| `melee_pair_refresh_hit` | refresh only when defender is melee+melee |
| `same_name_refresh_hit` | refresh only when defender `w1Item === w2Item` |
| `same_name_gate_hit` | same as above, plus applied-kill gate after `w1` |
| `identical_dual_refresh_hit` | refresh only when both weapon slots are fully identical in compiled signature |
| `exact_droid_refresh_hit` | temporary exact-shell comparator: SG1 armor + dual Crystal Maul + Scout/Droid misc shell |

Notes:
- `same_skill_refresh_hit` and `melee_pair_refresh_hit` are distinct in curated v4 overall, even though they hit the same rows inside the requested droid/HF/Ashley subset.
- `identical_dual_refresh_hit` is a true zero-case on the key melee rows because droid and HF are not actually identical dual-slot pairs.

## Exact commands run

### Inspection / mapping

```sh
sed -n '1,220p' AGENTS.md
sed -n '1,220p' legacy-bio-debug-handoff-2026-03-15.md
if [ -f legacy-chat-handoff-2026-03-15-continuation.md ]; then sed -n '1,220p' legacy-chat-handoff-2026-03-15-continuation.md; elif [ -f tmp/legacy-chat-handoff-2026-03-15-continuation.md ]; then sed -n '1,220p' tmp/legacy-chat-handoff-2026-03-15-continuation.md; else echo '__MISSING__ legacy-chat-handoff-2026-03-15-continuation.md'; fi
sed -n '1,220p' ./tmp/codex-tracked-bio-lane-patch-report.md
sed -n '1,220p' codex-droid-lane-diagnosis-report.md
sed -n '1,220p' codex-droid-applied-damage-proof-report.md
sed -n '1,260p' codex-droid-split-decomposition-report.md

sed -n '4300,4475p' ./legacy-sim-v1.0.4-clean.js
sed -n '1,120p' data/legacy-defenders-meta-v4-curated.js
sed -n '110,150p' data/legacy-defenders-meta-v4-curated.js

node - <<'NODE'
const defs=require('./data/legacy-defenders-meta-v4-curated.js');
const names=['SG1 Double Maul Droid','HF Scythe Pair','DL Rift/Bombs Scout','Ashley Build','DL Reaper/Maul Orphic Bio'];
for (const name of names) {
  const d=defs[name];
  console.log('NAME',name);
  if (!d) { console.log('MISSING'); continue; }
  for (const p of ['armor','weapon1','weapon2','misc1','misc2']) console.log(p, JSON.stringify(d[p]||null));
  console.log('---');
}
NODE

node - <<'NODE'
const defs=require('./data/legacy-defenders-meta-v4-curated.js');
const items=require('./data/legacy-defs.js').itemDefs;
function skillCode(name){const s=(items[name]||{}).skillType; return s==='gunSkill'?0:s==='meleeSkill'?1:s==='projSkill'?2:null;}
function sig(slot){ if (!slot) return null; return JSON.stringify({name:slot.name||'',crystal:slot.crystal||'',counts:slot.crystalCounts||null,upgrades:slot.upgrades||[]}); }
function pred(d){
  const w1=d.weapon1||{}, w2=d.weapon2||{};
  const s1=skillCode(w1.name), s2=skillCode(w2.name);
  return {
    same_skill_pair: s1!==null && s1===s2,
    melee_pair: s1===1 && s2===1,
    same_name_pair: !!w1.name && w1.name===w2.name,
    identical_dual_pair: sig(w1)===sig(w2),
    same_name_melee_pair: !!w1.name && w1.name===w2.name && s1===1 && s2===1,
  };
}
const names=['SG1 Double Maul Droid','HF Scythe Pair','DL Rift/Bombs Scout','Ashley Build','DL Reaper/Maul Orphic Bio','SG1 Split Bombs T2'];
for (const name of names) console.log(JSON.stringify({name,...pred(defs[name])},null,2));
console.log('=== CURATED MATCHES ===');
for (const key of ['same_skill_pair','melee_pair','same_name_pair','identical_dual_pair','same_name_melee_pair']) {
  console.log(key+':');
  for (const [name,d] of Object.entries(defs)) if (pred(d)[key]) console.log('  '+name);
}
NODE

node - <<'NODE'
const defs=require('./data/legacy-defs.js').itemDefs;
for (const n of ['Crystal Maul','Scythe T2','Reaper Axe','Rift Gun','Core Staff','Split Crystal Bombs T2']) {
  const d=defs[n];
  console.log(JSON.stringify({name:n,type:d.type,skillType:d.skillType,baseWeaponDamage:d.baseWeaponDamage},null,2));
}
NODE
```

### Temp harness setup / checks

```sh
cp ./legacy-sim-v1.0.4-clean.js ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js
node --check ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js
node --check ./legacy-sim-v1.0.4-clean.js
```

### Representative family compare set

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='global_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-global-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-global-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_skill_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-sameskill-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-sameskill-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='melee_pair_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-melee-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-melee-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-samename-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-samename-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_gate_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-samename-gate-hit' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-samename-gate-hit.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='identical_dual_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-identdual-hit-r2' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-identdual-hit-r2.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='exact_droid_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family LEGACY_REPLAY_TAG='codex-droid-family-exactdroid-hit-r2' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair,Ashley Build' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family-exactdroid-hit-r2.log 2>&1
```

### Four-attacker verification for the cleanest natural family

```sh
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-custom-off' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-custom-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-custom-samename' LEGACY_REPLAY_ATTACKERS='CUSTOM' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-current-attacker-vs-meta.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-custom-samename.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-cstaff-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-cstaff-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-cstaff-samename' LEGACY_REPLAY_ATTACKERS='CUSTOM_CSTAFF_A4' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-cstaff-samename.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-dl-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-dl-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-dl-samename' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_DL_ABYSS' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-dl-samename.log 2>&1

env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='off' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-sg1-off' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-sg1-off.log 2>&1
env LEGACY_SHARED_HIT=1 LEGACY_DIAG_DROID_SHARED_HIT_FAMILY='same_name_refresh_hit' LEGACY_REPLAY_TRIALS=200000 LEGACY_REPLAY_WORKERS=1 LEGACY_REPLAY_PROGRESS=single LEGACY_REPLAY_SAVE_JSON=1 LEGACY_REPLAY_OUTDIR=./tmp/replay-droid-shared-hit-family-4atk LEGACY_REPLAY_TAG='codex-droid-family4-sg1-samename' LEGACY_REPLAY_ATTACKERS='CUSTOM_MAUL_A4_SG1_PINK' LEGACY_REPLAY_DEFENDERS='SG1 Double Maul Droid,DL Rift/Bombs Scout,HF Scythe Pair' node ./tools/legacy-truth-replay-compare.js ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js > ./tmp/codex-droid-family4-sg1-samename.log 2>&1
```

## Representative movement table

Reference attacker:
- `CUSTOM_MAUL_A4_SG1_PINK`

All values are `win delta vs truth`, with movement relative to `off`.

| Predicate | Droid | Scout | HF | Ashley |
| --- | --- | --- | --- | --- |
| `off` | `-4.57` | `+0.07` | `-0.11` | `+2.57` |
| `global_refresh_hit` | `-4.30` `(+0.27)` | `+0.10` `(+0.03)` | `+0.77` `(+0.88)` | `+2.67` `(+0.10)` |
| `same_skill_refresh_hit` | `-4.47` `(+0.10)` | `+0.12` `(+0.05)` | `+0.85` `(+0.96)` | `+2.59` `(+0.02)` |
| `melee_pair_refresh_hit` | `-4.54` `(+0.03)` | `+0.12` `(+0.05)` | `+0.89` `(+1.00)` | `+2.65` `(+0.08)` |
| `same_name_refresh_hit` | `-4.38` `(+0.19)` | `+0.05` `(-0.02)` | `+0.78` `(+0.89)` | `+2.66` `(+0.09)` |
| `same_name_gate_hit` | `-4.50` `(+0.07)` | `+0.06` `(-0.01)` | `+0.95` `(+1.06)` | `+2.58` `(+0.01)` |
| `identical_dual_refresh_hit` | `-4.47` `(+0.10)` | `+0.02` `(-0.05)` | `-0.09` `(+0.02)` | `+2.67` `(+0.10)` |
| `exact_droid_refresh_hit` | `-4.65` `(-0.08)` | `+0.03` `(-0.04)` | `-0.06` `(+0.05)` | `+2.62` `(+0.05)` |

Key read:
- `same_name_refresh_hit` is the cleanest natural family on scout
- but it does **not** materially reduce HF collateral versus the global refresh
- and it gives **less** droid improvement than the global refresh on the representative row
- `same_name_gate_hit` is worse than `same_name_refresh_hit`
- `identical_dual_refresh_hit` is effectively a zero-case
- the temporary exact-shell comparator did not reveal a strong hidden droid-only gain

## Does any family predicate beat the prior global refresh-hit proof?

No.

Best natural family found:
- `same_name_refresh_hit`

Why it still loses to the prior global refresh-hit proof on the tradeoff that matters:
- pink-row droid gain is smaller:
  - global: `+0.27`
  - same-name: `+0.19`
- HF collateral is essentially unchanged:
  - global: `+0.88`
  - same-name: `+0.89`
- scout is a little flatter:
  - global: `+0.03`
  - same-name: `-0.02`

That is not a materially cleaner policy. It mainly trims scout spill while leaving the real collateral row, `HF Scythe Pair`, almost untouched.

## Four-attacker verification for the cleanest natural family

Chosen family for expansion:
- `same_name_refresh_hit`

Compact before/after table:

| Attacker | Droid `off -> same-name` | Droid move | Scout `off -> same-name` | Scout move | HF `off -> same-name` | HF move |
| --- | --- | ---: | --- | ---: | --- | ---: |
| `CUSTOM` | `-3.15 -> -2.97` | `+0.18` | `+0.31 -> +0.40` | `+0.09` | `-0.79 -> +0.06` | `+0.85` |
| `CUSTOM_CSTAFF_A4` | `-6.58 -> -6.38` | `+0.20` | `+0.13 -> +0.23` | `+0.10` | `-3.31 -> -1.28` | `+2.03` |
| `CUSTOM_MAUL_A4_DL_ABYSS` | `-4.60 -> -4.51` | `+0.09` | `+0.98 -> +1.02` | `+0.04` | `-3.57 -> -0.86` | `+2.71` |
| `CUSTOM_MAUL_A4_SG1_PINK` | `-4.57 -> -4.38` | `+0.19` | `+0.07 -> +0.05` | `-0.02` | `-0.11 -> +0.78` | `+0.89` |

What this proves:
- the same-name family does help droid a little on all 4 attackers
- but the gain is still modest: `+0.09` to `+0.20`
- HF moves much more on every attacker
- scout is not uniformly flat either

So the cleanest natural family still fails the “droid gain vs collateral movement” test.

## Family interpretation

What each natural family means on the requested rows:

| Predicate | Matches droid | Matches HF | Matches scout | Matches Ashley | Read |
| --- | --- | --- | --- | --- | --- |
| `same_skill_pair` | yes | yes | no | yes | too broad among melee residuals |
| `melee_pair` | yes | yes | no | yes | same broad spill shape on requested rows |
| `same_name_pair` | yes | yes | no | no | narrowest natural family that still covers droid |
| `identical_dual_pair` | no | no | no | no | not applicable to droid/HF because both have mixed-slot asymmetry |
| `exact_droid_shell` | yes | no | no | no | useful only as a temporary upper-bound comparator |

Most important conclusion:
- the only natural family that narrows away Ashley/Orphic is `same_name_pair`
- but it still includes `HF Scythe Pair`
- and HF remains the dominant collateral mover

## Patch decision

No patch was applied to `legacy-sim-v1.0.4-clean.js`.

Why not:
- no family-scoped shared-hit rule beat the prior global refresh-hit proof on droid gain vs collateral movement
- the best natural family, `same_name_refresh_hit`, still moves HF heavily
- the droid improvement stays small
- the temporary exact-shell comparator did not surface a stronger droid-local version worth promoting into live logic

## Strongest remaining specific lead

After rejecting family-scoped shared-hit policy, the strongest remaining concrete lead is:

`defender-side w2 shared-hit reuse is real, but the droid movement is not captured cleanly by any natural weapon-family predicate; the remaining issue looks like attacker-build-sensitive doAction/attemptWeapon state coupling inside the SG1 double-maul shell, beyond same-skill or same-name family scope`

In other words:
- the surviving lead is still in defender-side `pre.forceHit` reuse before `w2`
- but it does not reduce to a patch-safe family rule such as melee-pair, same-skill, or same-name
- the next useful proof, if any, would need to inspect shell-specific downstream coupling inside the defender double-maul lane, not another broader family policy

## Verification notes

- `node --check ./tmp/legacy-sim-v1.0.4-clean.droid-shared-hit-family.js` passed
- `node --check ./legacy-sim-v1.0.4-clean.js` passed
- no new truth was collected
- brute was untouched
- cleanup was untouched
- no live behavior patch was left behind

## Verdict

family-scoped shared-hit rule rejected; strongest lead is attacker-build-sensitive defender w2 shared-hit / action-state coupling inside the SG1 double-maul shell
