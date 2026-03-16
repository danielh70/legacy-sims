# Legacy Bio Debug Handoff — 2026-03-15

## Purpose

This handoff is the source of truth for the next chat. It summarizes the full Bio-family debugging arc, what was tested, what was ruled out, the current code state, and the safest next step so we do not repeat dead ends.

---

## Current repo/code state to preserve

Keep the repo at the **reverted live Rule B activation-only state**.

Meaning:
- **Keep** the duplicate-Pink helper path active.
- **Keep** the activation fix so uniform `crystalName === "Perfect Pink Crystal"` can activate the helper.
- **Do not** keep the later failed follow-up patch that added first-copy both-colors scaling and duplicate-Pink rebalance to `1.20x`.
- **Do not** add new Bio helper patches until the next diagnosis pass finishes.

Why this is the current safe baseline:
- Revert succeeded and restored the earlier activation-fix profile.
- No-Bio containment returned near noise.
- Broad regression from the failed final patch disappeared.
- Meta returned to the earlier activation-fix scale (`meanAbsΔwin 1.60`, `meanAbsΔavgT 0.1014`, `worstAbsΔwin 3.23`). fileciteturn64file18

---

## User workflow / preferences

Default workflow going forward:
- Assistant gives a **Codex prompt**.
- User runs it in **Codex CLI** or **VS Code Codex**.
- Codex writes a **self-contained markdown report**.
- User sends back **only the markdown file**.
- Truth data is still gathered by the user in the browser console via the truth collector when needed.

Prompt style preferences:
- Put **reasoning effort outside the prompt**, not inside it.
- Keep Codex terminal chatter minimal.
- Prefer one self-contained `.md` report over long terminal dumps.

---

## Core external truth / baseline context

### Primary calibration truth used in this thread
The debugging work focused on Bio-family defender rows under the current custom attacker, mainly these shells:
- `DL Dual Rift No Bio`
- `DL Dual Rift One Bio P4`
- `DL Dual Rift Two Bio P4`
- `DL Dual Rift Bio P4 + O4`
- `DL Core/Rift No Bio`
- `DL Core/Rift One Bio P4`
- `DL Core/Rift Two Bio P4`
- `DL Core/Rift Bio P4 + O4`

Later truth packs added:
- slot-order variants (`One Bio Left`, `One Bio Right`, `P4+O4`, `O4+P4`)
- orange-anchor rows (`One Bio O4`, `Two Bio O4`)

### Latest extra live anchor
A real in-game displayed build was provided:
- HP `650`
- Speed `216`
- Dodge `164`
- Accuracy `186`
- Gun Skill `580`
- Melee Skill `723`
- Projectile Skill `580`
- Defensive Skill `704`
- Armor `83`
- Predicted Damage `78–92`
- Weapon 1 Damage `105–133`
- Weapon 2 Damage `118–129`

Described live build:
- `Dark Legion Armor`, `4x Abyss`
- `Reaper Axe`, `3x Amulet`
- `Crystal Maul`, `3x Amulet`
- `Bio`, `3x Pink`
- `Bio`, `3x Orange`
- `650 HP`, all trainable points into dodge

Important: this live build **cannot currently be represented exactly** in legacy-sim because the compile path uses one **global crystal slot count**. Mixed `4-slot armor + 3-slot weapons/miscs` fails normalization. So this live build is a **useful signal** but **not usable as direct calibration truth yet**. fileciteturn64file6 fileciteturn64file8

---

## What was tested and what it showed

### 1) Broad Bio+Pink scope hypothesis
Initial idea: some narrower Bio+Pink-family condition was responsible for target-lane mismatches.

What happened:
- Broad Bio+Pink-related changes helped some target lanes but caused collateral damage elsewhere.
- That led to a scope-localization effort.

What was learned:
- Broad global Bio/Pink changes were not justified.
- The original handoff correctly pushed toward more diagnosis, not more broad patching. fileciteturn64file10

### 2) Shell-specific exact-match helper patch
A narrow exact-shell helper was tried for `Dark Legion + (Rift/Rift or Core/Rift) + double Bio[P4]`.

What happened:
- That patch either failed to help cleanly or helped only with collateral effects.
- Follow-up microcheck showed the helper was **not leaking** into unintended rows.
- But the patch surface was still wrong.

Conclusion:
- **Abandon this patch surface.**
- Exact-shell flat `defSkill` patching was not the right abstraction.

### 3) Slot-order hypothesis
Truth pack with left/right Bio slot order variants.

What happened:
- Truth showed only **weak** slot-order effects.
- Compile path is effectively order-insensitive for those swaps.

Conclusion:
- **Slot order is not the main issue.**
- Do not spend more time on slot-order theory for this mismatch.

### 4) Duplicate/second-Bio and Pink-vs-Orange theory
A long series of temp-only modeling passes explored:
- first-copy vs second-copy Bio
- Pink vs Orange
- mixed `P4+O4`
- duplicate-specific scaling

What happened:
- The strongest suspect became **missing duplicate/second-Bio scaling**, especially for duplicate Pink.
- Pink-vs-Orange mattered somewhat, but less than duplicate Pink.
- Eventually a temp-only rule family suggested:
  - `Rule B`: second Pink Bio crystal-derived delta scaled by `1.5x`

### 5) Rule B patch
A tracked patch implemented Rule B.

What happened next:
- First diagnosis showed the patch seemed incomplete.
- Then a revision diagnosis proved the first version was actually **dead code in real replay** because the activation check only looked at `variant.crystalMix`, while the real replay path often used `crystalName === "Perfect Pink Crystal"` with `crystalMix === null`. fileciteturn38file0

### 6) Rule B activation fix
A minimal fix was made so duplicate-Pink detection works for either:
- exact pink `crystalMix`
- or uniform `crystalName === "Perfect Pink Crystal"`

What happened:
- The activation fix was real.
- Exact duplicate `Bio[P4]+Bio[P4]` rows finally moved.
- No-Bio containment stayed good.
- This proved duplicate-Pink behavior is **directionally relevant**, but still not the whole answer.

### 7) Follow-up modeling on top of live Rule B
More temp-only modeling tested:
- first-copy follow-up
- second-Orange / mixed-color follow-up
- combined rules
- duplicate-Pink magnitude rebalance

Key conclusions:
- A combined helper rule that looked good offline failed badly when patched.
- The failed final helper extension caused broad overshoot and degraded meta to `meanAbsΔwin 4.71`, so it was reverted. fileciteturn64file3
- Reverting back to live Rule B activation-only restored the earlier usable profile. fileciteturn64file18

### 8) Single-misc in-game card anchor pass
User provided screenshots for:
- `Scout Drones + 4x Amulet`
- `Bio Spinal Enhancer + 4x Perfect Pink`

Expected in-game card stats:
- Scout + 4 Amulets: `acc 40`, `dodge 5`, `def 42`, `gun 42`, `melee 42`, `proj 70`
- Bio + 4 Perfect Pink: `acc 1`, `dodge 1`, `def 117`, `gun 65`, `melee 65`, `proj 65`

What happened:
- **Legacy** matched both anchors **exactly**.
- **Brute** did **not**; brute overshoots due to `iter4` stacking while legacy uses compare-style `sum4`. fileciteturn64file4 fileciteturn64file5

Conclusion:
- In **legacy**, basic single-misc crystal math looks correct.
- The first concrete mismatch is **not** at the basic single-card layer.
- There is a separate legacy-vs-brute parity issue at single-misc stacking.

### 9) Pair-context / aggregation check
Checked whether legacy behaves like:
- misc1 card total + misc2 card total
- plus any helper delta

What happened:
- For all non-duplicate Bio pairs, legacy behaved like simple additive misc totals.
- The **only** pair-context delta at that layer is the current Rule B helper on exact `Bio[P4]+Bio[P4]`, where it adds `defSkill +26`. fileciteturn64file16 fileciteturn64file19

Conclusion:
- **Pair-context aggregation looks correct** for non-duplicate states.
- If one-Bio or mixed rows still miss truth, suspicion moves **higher** than misc aggregation.

### 10) Full compiled snapshot check
Compiled full attacker and defender snapshots for the main Bio-family rows.

What happened:
- Attacker snapshot stayed constant across rows.
- Defender snapshots differed only by expected misc-driven stat deltas.
- No hidden weirdness surfaced at compile-time snapshot layer. fileciteturn64file13

Conclusion:
- Compile-time construction looked internally consistent.
- That pushed suspicion one layer higher again.

### 11) Deterministic roll dump
Compared deterministic turn traces with fixed RNG streams.

What happened:
- The first divergence appeared immediately because the **compiled inputs already differed**, not because combat resolution was taking a hidden different branch.
- Combat-resolution logic looked consistent with the compiled inputs. fileciteturn64file0

Conclusion:
- **Stop patching combat-resolution logic.**
- The mismatch was not explained by a hidden combat-resolution branch.
- Reevaluate suspect family / interpretation instead.

### 12) Live-build anchor check
Tried to compare a real user build with partial crystals against legacy-sim.

What happened:
- Legacy could not compile the live build exactly because it assumes one global crystal slot count.
- Mixed `4-slot armor + 3-slot weapons/miscs` fails normalization before any stat comparison is possible. fileciteturn64file6 fileciteturn64file8

Conclusion:
- This is a **real representational mismatch**.
- It does **not** prove Bio helper theory right or wrong.
- It means the live build screenshot is **too ambiguous** for direct calibration until mixed-slot partial-crystal handling is mirrored in a temp harness.

---

## What is ruled out / strongly weakened

### Ruled out or strongly weakened in legacy
- Broad global Bio/Pink patching
- Shell-specific exact-row `defSkill` helper as the main fix
- Slot-order as the main issue
- Basic single-misc crystal math for anchored items
- Non-duplicate misc pair aggregation as the first mismatch
- Hidden combat-resolution branch as the first mismatch
- Using the current live mixed-slot partial-crystal build as clean calibration truth

### Important caveat
This does **not** mean the overall problem is solved or that Bio-family theory is completely dead. It means:
- the current remaining mismatch is **not** showing up first at those lower layers,
- and the latest new concrete mismatch is now **representation of mixed slot counts / partial crystals** for live builds.

---

## What remains true / current best explanation

### In legacy-sim
- Single-card misc math looks correct for the anchored items.
- Non-duplicate Bio misc summation looks correct.
- Full compile snapshots look internally consistent.
- Deterministic combat resolution behaves consistently with compiled inputs.

### Latest concrete new mismatch
- Legacy cannot represent a build that mixes:
  - 4-crystal armor
  - 3-crystal weapons
  - 3-crystal miscs
- because current normalization expects one global crystal slot count. fileciteturn64file6

### Separate brute parity issue
- Brute still diverges from anchored item-card stats at the single-misc layer because of `iter4` vs legacy compare-style `sum4` stacking. fileciteturn64file5

---

## Current recommended next step

### Do **not** patch combat logic or Bio helper logic next.

### Do **not** use the live partial-crystal build as calibration truth yet.

### Next diagnosis target
Use a **temp-only instrumentation pass** to resolve the new representational mismatch:

> confirm how the live game treats partial crystal slots across armor, weapons, and miscs, then mirror that representation in a temp-only harness before drawing conclusions from the displayed live totals. fileciteturn64file6

That is now the cleanest next step because it is the first new concrete mismatch that has not yet been resolved.

### Suggested scope for the next Codex pass
The next Codex report should answer:
1. Can we build a temp-only harness that supports **mixed slot counts per part** instead of one global slot count?
2. If yes, does that harness reproduce the user’s live displayed totals approximately or closely?
3. If no, what is the first exact field category that still mismatches once mixed-slot representation is allowed?

The target is **representation / normalization**, not another Bio theory patch.

---

## Current files/reports that matter most

High-value recent reports:
- `codex-bio-revert-to-live-rule-b-report.md` — confirms safe current tracked state and revert success. fileciteturn64file18
- `codex-bio-card-anchor-instrumentation.md` — proves legacy single-card misc math matches in-game anchors, brute parity differs. fileciteturn64file4 fileciteturn64file5
- `codex-bio-pair-context-aggregation-check.md` — proves non-duplicate misc pair aggregation behaves like simple addition. fileciteturn64file16 fileciteturn64file19
- `codex-bio-full-compile-snapshot-check.md` — full snapshots look consistent. fileciteturn64file13
- `codex-bio-deterministic-roll-dump.md` — combat-resolution looks consistent; reevaluate suspect family. fileciteturn64file0
- `codex-live-build-anchor-check.md` — current live build cannot be represented exactly due to mixed-slot partial-crystal normalization mismatch. fileciteturn64file6

---

## Leading message for the new chat

Use this as the first message in the new chat, along with attaching this handoff markdown and the latest relevant report(s):

> Use the attached handoff as the source of truth. We are currently on the reverted live Rule B activation-only state and should not patch Bio/combat logic yet. The latest concrete new mismatch is that legacy-sim cannot represent my real live build because it uses one global crystal slot count, while my build mixes 4-slot armor with 3-slot weapons/miscs. Please read the handoff first, do not repeat ruled-out tests, and give me the next Codex CLI prompt for a temp-only mixed-slot / partial-crystal representation pass so we can compare my live displayed totals against a build the sim can actually represent.

---

## Final reminders for the next chat

- Preserve the current tracked state.
- Prefer temp-only instrumentation.
- Do not repeat:
  - broad Bio helper patching
  - slot-order theory work
  - shell-specific exact-match patching
  - combat-resolution patching
- Keep Codex outputs self-contained and quiet.
- If a future patch is proposed, it must come **after** the mixed-slot representation issue is resolved or explicitly ruled out as unrelated.

