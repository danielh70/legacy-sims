# codex-global-armor-k-sanity-report

## Files touched

| file | touch type | notes |
| --- | --- | --- |
| `tmp/codex-global-armor-k-sanity-config.js` | instrumentation-only | tiny broad-sweep harness config for the armor-`K` sanity pass |
| `codex-global-armor-k-sanity-report.md` | report-only | self-contained summary |

Reused unchanged:

- `tmp/legacy-sim-v1.0.4-clean.lane-probe.js`
- `tools/codex-lane-probe-harness.js`
- `legacy-sim-v1.0.4-clean.js`

No live combat patch was landed. `brute-sim-v1.4.6.js` was not edited.

## Exact commands run

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' legacy-bio-debug-handoff-2026-03-15.md
sed -n '1,260p' legacy-chat-handoff-2026-03-15-continuation.md
sed -n '1,260p' tmp/codex-tracked-bio-lane-patch-report.md
sed -n '1,260p' codex-dl-riftcore-bio-diagnosis-report.md
sed -n '1,260p' codex-post-bio-restore-residual-ranking-report.md
sed -n '1,260p' codex-lane-probe-harness-reaper-report.md
sed -n '1,260p' codex-reaper-first-attacker-sensitivity-report.md
sed -n '1,260p' codex-sg1-bombs-cluster-harness-report.md
sed -n '1,260p' codex-sg1-bombs-downstream-refinement-report.md

node --check ./tmp/codex-global-armor-k-sanity-config.js
node --check ./tmp/legacy-sim-v1.0.4-clean.lane-probe.js
node --check ./tools/codex-lane-probe-harness.js
node --check ./legacy-sim-v1.0.4-clean.js

node ./tools/codex-lane-probe-harness.js ./tmp/codex-global-armor-k-sanity-config.js > ./tmp/codex-global-armor-k-sanity-harness.log 2>&1
node ./tools/codex-lane-probe-harness.js ./tmp/codex-global-armor-k-sanity-config.js > ./tmp/codex-global-armor-k-sanity-harness-fast.log 2>&1
node ./tools/codex-lane-probe-harness.js ./tmp/codex-global-armor-k-sanity-config.js > ./tmp/codex-global-armor-k-sanity-harness-fastest.log 2>&1
```

Notes:

- I started heavier 100k and 50k harness passes first, then reduced the config to a 10k final sweep to match the requested fast falsifiable check.
- The decision tables below use only the completed final run:
  - `./tmp/lane-probe-harness/global-armor-k-sanity-1773638603050`

Saved-JSON extraction for the tables below used local `node - <<'NODE' ... NODE` one-liners against that final run root.

## Broad score table

All stats below are from the final 10k broad sweep over the de-duplicated 64 truth-covered attacker/defender rows.

| variant | mean abs win Δ | worst abs win Δ | mean abs avgTurns Δ | improved / worsened / flat rows | healthy-row mean move | scout mean move | default reach | read |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| `baseline live` | `2.042` | `6.96` | `0.0975` | `0 / 0 / 64` | `0.000` | `0.000` | `0` | current accepted reference |
| `global armorK=7.5` | `1.915` | `6.93` | `0.1182` | `32 / 27 / 5` | `1.089` | `1.085` | `15` | numerically best global-K mean, but very broad reshuffle |
| `sg1 bombs parent branch` | `1.974` | `6.96` | `0.0854` | `6 / 1 / 57` | `0.000` | `0.000` | `1` | narrow local improvement, still diagnosis-only |
| `global armorK=7` | `2.276` | `7.90` | `0.2478` | `23 / 37 / 4` | `1.831` | `2.165` | `15` | clearly worse overall |
| `sg1 bombs parent + global armorK=7` | `2.279` | `7.90` | `0.2565` | `24 / 35 / 5` | `1.831` | `2.165` | `15` | basically `K=7` plus noise |
| `global armorK=9` | `3.010` | `9.10` | `0.2356` | `19 / 44 / 1` | `1.774` | `0.698` | `15` | symmetry sanity point fails badly |

## Lane-level summary table

Mean absolute win delta by residual bucket:

| variant | Bio repaired | Droid parked | Reaper parked | SG1 bombs | Remaining rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| `baseline live` | `2.407` | `3.667` | `2.930` | `2.495` | `1.209` |
| `global armorK=7.5` | `2.256` | `3.705` | `2.764` | `2.066` | `1.132` |
| `sg1 bombs parent branch` | `2.407` | `3.667` | `2.930` | `1.951` | `1.209` |
| `global armorK=7` | `3.093` | `3.735` | `2.723` | `1.512` | `1.787` |
| `sg1 bombs parent + global armorK=7` | `3.093` | `3.735` | `2.723` | `1.536` | `1.787` |
| `global armorK=9` | `5.288` | `4.271` | `3.260` | `2.345` | `2.228` |

Read:

- `K=7` helps the SG1 bombs bucket, but it does it by blowing up the repaired Bio lane and the broad remaining bucket.
- `K=7.5` is less destructive than `K=7`, but it still moves every lane at once and does not preserve the parked droid lane.
- the existing SG1 bombs parent proof branch is much cleaner than any global-`K` move because it improves only the active lane and leaves the rest flat.

## Control / healthy-row summary

Healthy bucket used here:

- all baseline rows with `abs(win Δ) <= 1.0`
- `19` rows total

Most important control read:

- `global armorK=7`: healthy-row mean movement `1.831`, scout mean movement `2.165`
- `global armorK=7.5`: healthy-row mean movement `1.089`, scout mean movement `1.085`
- `sg1 bombs parent branch`: healthy-row mean movement `0.000`, scout mean movement `0.000`

Concrete falsifiers for `global armorK=7`:

- `CUSTOM_MAUL_A4_DL_ABYSS | DL Gun Sniper Mix`: `0.10 -> 4.32`
- `CUSTOM_MAUL_A4_SG1_PINK | DL Rift/Bombs Scout`: `0.23 -> 3.60`
- `CUSTOM_MAUL_A4_SG1_PINK | DL Dual Rift Bio`: `3.54 -> 6.14`

Concrete reshuffle signs for `global armorK=7.5`:

- strong improvements exist:
  - `CUSTOM | DL Core/Rift Bio`: `2.57 -> 0.05`
  - `CUSTOM | Ashley Build`: `3.18 -> 0.86`
- but they are traded against broad regressions:
  - `CUSTOM | DL Dual Rift Bio`: `0.13 -> 2.25`
  - `CUSTOM_MAUL_A4_SG1_PINK | DL Rift/Bombs Scout`: `0.23 -> 1.30`
  - `CUSTOM | DL Reaper/Maul Orphic Bio`: `3.10 -> 4.71`

So the middle value is not a clean broad correction. It is a trade.

## Default-defender sanity note

Using `data/legacy-defenders.js`:

- any global `armorK` change has effective live reach across the whole default file: `15` defenders
- the current SG1 bombs parent proof branch has direct live reach to only `1` default defender row: `SG1 Split Bombs T2`

That makes the scout/healthy-row collateral above materially important:

- the global-`K` moves are not quarantined curated-only tweaks
- they would be broad live-behavior changes

## Conclusions

1. `global armorK=7` is **rejected**.
   - It is worse than baseline on overall mean abs win delta.
   - It makes worst-case error worse.
   - It creates large collateral on healthy rows and the scout control.

2. `global armorK=7.5` is **not clearly better than both 8 and 7 in a patch-safe way**.
   - It is the least-bad global-`K` value in this fast sweep.
   - But it improves only by reshuffling rows: `32` improved, `27` worsened, `5` flat.
   - Healthy/control movement is far too large for a reusable global constant change.

3. `global armorK=9` is a useful symmetry check and also fails.

4. `armorK=7` does **not** interact helpfully with the SG1 bombs parent branch.
   - `sg1 bombs parent branch` alone: `mean abs win Δ 1.974`
   - `sg1 bombs parent + global armorK=7`: `2.279`
   - the combo is effectively as bad as `K=7` alone

5. The right engineering decision after this sweep is to kill the live `global K=7` theory and move on.

## Explicit untouched statements

- No new truth was collected.
- `brute-sim-v1.4.6.js` was untouched.
- Cleanup was untouched.
- No live behavior-changing patch was landed.

global armorK=7 rejected
