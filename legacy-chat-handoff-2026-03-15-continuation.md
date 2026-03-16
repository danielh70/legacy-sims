# Legacy Simulator Continuation Handoff — 2026-03-15

Use this file as the source of truth in the next chat.

## What the next chat should do first

1. Read this handoff.
2. Read the original baseline handoff: `legacy-bio-debug-handoff-2026-03-15.md`.
3. Read the newest Codex report that comes back from the prompt I already pasted before opening the new chat.
4. Continue from there without re-running old theory branches.

The report that is currently **pending** from Codex should be named:
- `codex-tracked-bio-lane-patch-report.md`

That pending report is expected to answer whether the narrowly scoped tracked Bio-lane mitigation patch is now in place and whether `SG1 Double Maul Droid` is the only clearly separate remaining blocker.

---

## User workflow / preferences

Keep using this workflow unless the user says otherwise:
- Give a **Codex prompt**.
- User runs it in Codex CLI / VS Code Codex.
- Codex writes a **self-contained markdown report**.
- User uploads **only the markdown report** back.
- When truth is needed, user gathers it manually in the browser console with `LegacyTruthCollector`.

Preferences:
- Keep outputs compact and copy/paste-friendly.
- Prefer one decision-ready markdown report over long terminal dumps.
- For hard diagnosis/proof passes, `reasoning effort = high` has been fine.
- Do not ask to re-run tests that were already ruled out below.

---

## Current tracked repo state

### 1) Safe baseline that must remain
The repo should stay on the **reverted live Rule B activation-only baseline** for the Bio helper family.

That means:
- Keep the duplicate-Pink helper path active.
- Keep the activation fix that lets uniform `crystalName === "Perfect Pink Crystal"` activate it.
- Do **not** restore the failed broader helper extension that caused overshoot.
- Do **not** reopen broad Bio helper patching unless a later proof requires it.

### 2) Represented-build patch is already tracked and verified on disk
`legacy-sim-v1.0.4-clean.js` already contains the **narrow represented-build stat patch**, and it was re-audited to match the report exactly.

This patch:
- applies only when a part explicitly carries `crystalSlots` or `slotCount`
- supports mixed-slot represented builds (for example 4-slot armor + 3-slot weapons/miscs)
- uses part-local slot counts
- uses `sum4`/compare-style stat stacking for represented builds
- uses stabilized compare rounding
- leaves ordinary uniform-slot builds unchanged

Verified outcomes:
- the live mixed-slot stat anchor matches exactly
- single-card anchors still match exactly
- an ordinary uniform-slot regression row stayed unchanged pre-vs-post

Important: this represented-build patch is **not** the remaining ordinary full-4 accuracy issue.

---

## Live mixed-slot build context (already handled)

This was the user’s temporary real live build that exposed the representation bug:
- HP `650`
- Speed `216`
- Dodge `164`
- Accuracy `186`
- Gun Skill `580`
- Melee Skill `723`
- Projectile Skill `580`
- Defensive Skill `704`
- Armor `83`
- Predicted Damage `78–92` (de-scoped later)
- Weapon 1 Damage `105–133`
- Weapon 2 Damage `118–129`

Live build shape:
- `Dark Legion Armor`, `4x Abyss`
- `Reaper Axe`, `3x Amulet`
- `Crystal Maul`, `3x Amulet`
- `Bio`, `3x Pink`
- `Bio`, `3x Orange`
- all trainable points into dodge
- user also noted a permanent `+5 min/max damage` ability, which explained the displayed weapon range gap and should not be chased further

Status:
- this mixed-slot **representation problem is fixed** in the tracked represented-build path
- do not reopen predictedDamage or weapon-display theory unless explicitly needed later

---

## What was ruled out already — do not retest these blindly

### Old Bio-helper theory branches already ruled out
- Broad Bio/Pink global scope patching
- Exact-shell flat helper patching
- Slot-order theory as a main cause
- Broad first-copy/second-copy helper extensions beyond current Rule B activation-only baseline
- The failed broader helper extension that pushed meta to bad overshoot and was reverted

### Things that were proven *not* to be the first concrete mismatch earlier
- Basic legacy single-card crystal math for:
  - `Scout Drones + 4x Amulet`
  - `Bio Spinal Enhancer + 4x Perfect Pink`
- Non-duplicate Bio pair-context additive aggregation
- Mixed-slot represented-build stat compilation after the represented-build patch
- Broad compile-time “wrong build totals” as the explanation for the remaining ordinary full-4 mismatch

### Things that should stay de-scoped for now
- `predictedDamage`
- weapon display range theory
- mixed-slot truth-collector work for the temporary underfilled live build
- brute patching / brute parity fixes
- cleanup / file deletion

### Important nuance
Earlier in the arc there was a phase where combat-resolution logic did **not** look like the first mismatch. Later targeted full-4 diagnosis found a narrower remaining issue inside the applied-damage / mitigation lane. Do not confuse those two findings:
- earlier global combat theory was a dead end
- later narrow mitigation-lane evidence became the best remaining lead for ordinary full-4 rows

---

## Truth coverage that now exists

At this point there is enough truth coverage for judgment on normal full-4 curated-v4 use.

### Curated defender source
Use:
- `data/legacy-defenders-meta-v4-curated.js`

### Full truth-covered attackers used in the signoff arc
1. `CUSTOM`
2. `CUSTOM_CSTAFF_A4`
3. `CUSTOM_MAUL_A4_DL_ABYSS`
4. `CUSTOM_MAUL_A4_SG1_PINK`

### Exact fresh truth files that were explicitly collected and used
- `./tmp/legacy-truth-current-attacker-vs-meta.json` — `CUSTOM`
- `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json` — merged full-15 for `CUSTOM_CSTAFF_A4`
- `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
- `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

### What those signoff passes showed
- `CUSTOM` stayed the healthiest attacker family
- `CUSTOM_CSTAFF_A4` remained materially worse than `CUSTOM`
- both fresh maul attackers were also materially worse than `CUSTOM`
- this proved the remaining issue is **broader than just Core Staff** and **not just an armor-family split**

Recurring bad defenders across the non-`CUSTOM` attackers:
- `DL Dual Rift Bio`
- `DL Core/Rift Bio`
- `SG1 Double Maul Droid`

Control / healthier row often used:
- `DL Rift/Bombs Scout`

---

## Current best diagnosis arc for the remaining ordinary full-4 issue

### Stage A: enough truth to localize a shared non-CUSTOM issue
The full-v4 signoff work showed a real ordinary full-4 mismatch remained after the represented-build patch. This was not a truth-coverage problem anymore.

### Stage B: ordinary-full4 mismatch diagnosis
The best lead became:
- not mainly attacker stat compilation
- not mainly hit-rate drift
- not mainly displayed weapon ranges
- the Bio rows looked like attacker **applied damage after a hit** was too low by roughly `2–4`
- likely surface: `attemptWeapon(...)` / `doAction(...)`

### Stage C: applied-damage trace proof
The deterministic trace localized the first concrete divergence to the **armor/mitigation path inside `attemptWeapon(...)`**.

Key discovery:
- in the per-weapon mitigation branch, runtime was using:
  - `armorFactorForArmorValue(BASE.level, def.armor, cfg.armorK)`
- while the compiled snapshots used the defender’s compiled:
  - `def.armorFactor`

This became the best concrete suspect for the remaining Bio-lane mismatch.

### Stage D: broad one-line mitigation swap proof
Temp-only proof changed the per-weapon mitigation source globally to `def.armorFactor`.

What happened:
- it **helped** the Bio bad rows materially
- but it was **too broad**:
  - healthy scout control rows overshot
  - optional broader full-v4 checks got worse overall
- it also did basically nothing for the maul-vs-`SG1 Double Maul Droid` lane

Conclusion:
- broad global mitigation-source swap is **not** patchable
- `SG1 Double Maul Droid` likely remains a separate second issue

### Stage E: exact-label Bio gate proof
A narrow exact-label gate worked in local trace harnesses but had no effect in real replay-compare.

Why it failed:
- during replay-compare, `def.name` is not the human label; it is a synthetic replay key like `__REPLAY_DEFENDER__...`

### Stage F: replay runtime structural gate proof
Codex instrumented the real replay path and found what defender identity survives at runtime.

Then it proved that a **replay-key suffix gate** makes the Bio rows improve materially while scout control stays flat.

That was good evidence that the lane is real, but replay-key suffixes are not an acceptable tracked patch surface.

### Stage G: structural Bio gate temp proof (most important current proof)
Codex added a tiny temp-only always-on defender runtime signature in `compileCombatantFromParts(...)`:
- armor item
- weapon1 item
- weapon2 item
- misc1 item
- misc2 item
- misc1 crystal
- misc2 crystal

Then it used this narrow structural Bio gate in `attemptWeapon(...)`:
- defender has `Dark Legion Armor`
- defender has `Bio Spinal Enhancer` in both misc slots
- both misc crystals are `Perfect Pink Crystal`
- defender weapons are one of:
  - `Rift Gun` + `Rift Gun`
  - `Core Staff` + `Rift Gun`
  - `Rift Gun` + `Core Staff`

And it applied the mitigation source swap only when all of these were true:
- `cfg.armorApply === 'per_weapon'`
- attacker-side action only (`att.name === 'Attacker'` in the temp proof)
- defender matches the structural Bio predicate

### Result of the structural Bio gate temp proof
It materially improved the Bio rows while keeping scout control rows flat.

Representative improvements from the temp proof:
- `CUSTOM_CSTAFF_A4` vs `DL Dual Rift Bio`: `-5.93 -> -3.08`
- `CUSTOM_CSTAFF_A4` vs `DL Core/Rift Bio`: `-5.79 -> -3.02`
- `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Dual Rift Bio`: `-4.80 -> -2.68`
- `CUSTOM_MAUL_A4_DL_ABYSS` vs `DL Core/Rift Bio`: `-3.85 -> -1.61`
- `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Dual Rift Bio`: `-5.74 -> -3.27`
- `CUSTOM_MAUL_A4_SG1_PINK` vs `DL Core/Rift Bio`: `-3.02 -> -0.82`
- `CUSTOM` improved modestly on those Bio rows too
- `DL Rift/Bombs Scout` control stayed flat
- `SG1 Double Maul Droid` stayed unchanged

This is why the latest conclusion is:
- the narrow Bio-lane mitigation idea is **patch-ready for that lane**
- `SG1 Double Maul Droid` should remain split off as a separate second issue

---

## Current highest-priority question

The last prompt already pasted to Codex is meant to answer exactly this:

> Make the tracked narrow Bio-lane patch in `legacy-sim-v1.0.4-clean.js`, rerun compact verification on the covered attackers, and determine whether `SG1 Double Maul Droid` is now the only clearly separate remaining blocker.

The expected report from that prompt is:
- `codex-tracked-bio-lane-patch-report.md`

### What that pending patch prompt is supposed to do
1. Implement the tracked always-on defender signature in `compileCombatantFromParts(...)`
2. Implement the narrow structural Bio predicate in `attemptWeapon(...)`
3. Use `def.armorFactor` instead of `armorFactorForArmorValue(...)` only when:
   - `cfg.armorApply === 'per_weapon'`
   - attacker-side action only
   - defender matches the structural Bio predicate
4. Leave all other paths untouched
5. Do **not** bundle `SG1 Double Maul Droid` handling into that patch
6. Rerun compact targeted row checks and compact full-v4 summaries

### The decision expected after that report
The next chat should determine whether the verdict is one of these:
- **“tracked Bio-lane patch in place; only Double Maul Droid remains”**
- or **“tracked Bio-lane patch in place; additional blocker remains”**

---

## Important files / reports to keep in mind in the new chat

### Baseline / must-read handoffs
- `legacy-bio-debug-handoff-2026-03-15.md`
- this file: `legacy-chat-handoff-2026-03-15-continuation.md`

### Key verification / diagnosis reports already produced
- `codex-represented-build-patch-verify-report.md`
- `codex-final-v4-signoff-check-report.md`
- `codex-final-v4-maul-signoff-report.md`
- `codex-ordinary-full4-mismatch-diagnosis-report.md`
- `codex-applied-damage-trace-proof-report.md`
- `codex-per-weapon-armorfactor-toggle-proof-report.md`
- `codex-bio-lane-armorfactor-gate-proof-report.md`
- `codex-replay-runtime-structural-gate-report.md`
- `codex-structural-bio-gate-temp-proof-report.md`

### Pending next report
- `codex-tracked-bio-lane-patch-report.md`

### Key code files
- `legacy-sim-v1.0.4-clean.js`
- `legacy-truth-replay-compare.js`
- `legacy-truth-collector-v0.1.1.user.js`
- `brute-sim-v1.4.6.js` (untouched in this branch; do not patch yet)

### Key truth files
- `./tmp/legacy-truth-current-attacker-vs-meta.json`
- `./tmp/legacy-truth-v4-custom-cstaff-full15-merged.json`
- `./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
- `./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

---

## What the next chat should NOT waste time on

Unless the new report changes the picture, do **not** reopen these:
- broad Bio helper re-theory
- slot-order theory
- mixed-slot truth collector work
- predictedDamage / weapon display theory
- brute parity / brute patching
- cleanup / delete-temp-files pass
- new truth collection
- broad global `def.armorFactor` mitigation swap
- replay-key-suffix-based tracked gating

---

## Likely next actions depending on what the pending report says

### If the pending report says the tracked Bio-lane patch behaves like the temp proof
Then the next chat should:
1. accept that tracked patch as valid
2. assess whether `SG1 Double Maul Droid` is now the only clearly separate blocker
3. decide the smallest next diagnosis/proof pass for the droid lane
4. still avoid cleanup until that second lane is understood

### If the pending report says the tracked patch does not preserve the temp-proof gains
Then the next chat should:
1. compare the tracked patch implementation against the temp proof exactly
2. find what changed between temp and tracked runtime shape
3. do **not** abandon the Bio-lane lead without explaining the discrepancy

---

## Suggested leading message for the new chat

Upload:
1. this file
2. the newest Codex report (`codex-tracked-bio-lane-patch-report.md`)

Then use this leading message:

> Use both attached handoffs as source of truth. We are on the verified represented-build baseline, and the pending branch is the tracked narrow Bio-lane mitigation patch. Please read the new Codex report first, do not reopen ruled-out branches, and tell me whether the tracked Bio-lane patch is valid and whether `SG1 Double Maul Droid` is now the only separate blocker.

If you only upload the two markdown files and no message, that is probably still enough, but the line above will reduce ambiguity.

---

## Bottom line status at handoff time

- represented-build mixed-slot support is already fixed and verified
- ordinary full-4 truth coverage is now sufficient
- remaining full-4 mismatch is **not** a broad missing-truth problem
- strongest current lead is a **narrow Bio-defender mitigation lane** in `attemptWeapon(...)`
- temp structural proof for that lane is strong enough that a tracked narrow patch is justified to test
- `SG1 Double Maul Droid` should remain split off as a likely separate second issue
- cleanup should wait until after the tracked Bio-lane patch report is reviewed

