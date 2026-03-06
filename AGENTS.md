# AGENTS.md

## Repository purpose

This repository contains a reverse-engineered Legacy combat simulator and a brute-force optimizer.

Core intent:
- `legacy-sim-*.js` is the canonical / verification-oriented simulator.
- `brute-sim-*.js` is the optimizer / search engine.
- `legacy-defs-*.js` is the shared source of truth for items, crystals, upgrades, and related stat data.
- `legacy-defenders-*.js` is defender payload / build data.

Preserve combat accuracy and parity above all else.

---

## Highest-priority rule

Combat logic parity between `legacy-sim` and `brute-sim` is critical.

If you change any of the following in one file, you must inspect the matching logic in the other file and explicitly state whether parity was preserved:
- stat compilation
- hit roll logic
- skill roll logic
- damage roll logic
- armor application
- shared-hit behavior
- shared-skill behavior
- stop-on-kill behavior
- payload parsing
- crystal / upgrade application
- mixed-weapon handling
- hidden-slot / misc-slot handling

Do not assume the two files are already equivalent just because names are similar.

---

## Edit policy

Prefer the smallest safe patch.

Do:
- make narrow, targeted edits
- preserve behavior unless the requested task is explicitly behavioral
- explain exactly what changed and why
- call out any parity-risk area touched
- keep existing file naming/versioning patterns unless explicitly asked to rename
- keep output compact and copy/paste-friendly

Do not:
- do broad cleanup refactors unless explicitly requested
- silently change combat formulas
- silently change RNG consumption order
- silently change caching behavior
- silently change defender payload schema handling
- update any `latest` file unless explicitly asked

---

## Accuracy and verification rules

When modifying combat or stat logic:
1. Identify the exact functions/files affected.
2. Identify the corresponding parity-sensitive location in the other simulator.
3. State whether the patch is:
   - instrumentation-only
   - refactor-only
   - behavior-changing
4. Propose a verification command or verification plan.
5. Do not claim parity is preserved unless it was actually checked.

If verification was not run, say so clearly.

If a requested change is risky, prefer adding instrumentation first.

---

## Safe first-choice workflow

For ambiguous combat mismatches, prefer this order:
1. add compile-time snapshot instrumentation
2. compare compiled attacker/defender stats
3. add deterministic roll dumps
4. isolate the first divergence
5. make the smallest targeted fix
6. re-check parity

Prefer debugging before refactoring.

---

## Variant / data handling rules

Treat `legacy-defs-*` as the source of truth for shared item/crystal/upgrade data.

If variant math or payload parsing is duplicated across files:
- do not merge or refactor it automatically unless explicitly asked
- first explain the risk of drift
- if extracting shared helpers, keep the extraction minimal
- prefer extracting schema/parsing helpers before combat-core helpers

Do not introduce new data formats unless explicitly requested.

---

## Output style

Keep responses concise and technical.

When reporting findings:
- name the exact files/functions touched
- summarize drift risks clearly
- avoid long JSON dumps unless explicitly requested
- prefer compact bullet lists or compact tables
- when sharing run results, keep them easy to copy/paste

When proposing a patch:
- list changed files
- summarize the behavioral risk
- mention any unverified assumptions

---

## Versioning rules

This repo uses versioned simulator files.

Unless explicitly told otherwise:
- treat versioned files as the working source
- do not overwrite or rename stable files casually
- do not update `latest` files unless explicitly requested
- preserve code identity when making version-copy files unless the task explicitly includes logic changes

---

## What to do before major edits

Before any medium or high-risk change:
- first explain the relevant code path
- identify likely drift points
- propose the smallest safe patch
- avoid unrelated cleanup in the same edit

For large changes, prefer a staged approach:
- stage 1: instrumentation
- stage 2: diagnosis
- stage 3: fix
- stage 4: verification

---

## User preferences

The user prefers:
- minimal-risk changes
- full updated scripts when a full-file response is needed
- compact simulator output
- explicit version names
- clear, reproducible commands
- no hidden behavior changes

Optimize for correctness, reproducibility, and clarity over cleverness.