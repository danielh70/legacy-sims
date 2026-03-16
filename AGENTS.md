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

## Calibration workflow rules

When calibrating against in-game simulator output:
- treat provided in-game JSON / baseline files as the external source of truth
- prefer baselines that cover multiple defender archetypes over a single matchup
- do not declare success from one matchup if other checked matchups regress
- use deterministic mode, fixed seeds, and stable trial counts before comparing runs
- keep compare output compact, but always preserve worst-delta visibility
- after each behavior-changing patch, rerun the same verification command before making another theory-driven change
- if two consecutive behavior-changing patches do not materially improve the target mismatch, stop patching and switch back to instrumentation / diagnosis
- do not “solve” a mismatch by only changing trial counts, noise thresholds, or search heuristics unless the task is explicitly about those systems

When reporting calibration progress, prefer:
- worst delta
- median or average delta across the checked set
- which defenders improved
- which defenders regressed

---

## Codex-specific execution rules

If running inside Codex / Codex CLI / Codex IDE:
- read `AGENTS.md` first and follow it strictly
- prefer existing verify / compare commands if present
- if no reusable verification command exists, create the smallest safe helper command or script only if it does not change combat logic
- inspect command output before making another edit; do not chain speculative edits without rerunning verification
- for long calibration loops, keep a short running log of: command used, files changed, before/after worst delta, and open questions
- stop and explain uncertainty instead of making broad formula changes when the root cause is not isolated
- prefer `gpt-5.4` for most Codex tasks unless there is a specific reason to use another model

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

---

## Repo cleanup rules

When the task is repo cleanup / deleting debug artifacts:
- Never delete on the first pass. First classify files into:
  - KEEP
  - SAFE TO DELETE
  - REVIEW BEFORE DELETE
- Be conservative with JSON, results, and data files.
- Do not blindly delete all files under `results/` or all `*.json`.
- Preserve these unless explicitly told otherwise:
  - `legacy-sim-v1.0.4-clean.js`
  - `brute-sim-v1.4.6.js`
  - `tools/legacy-truth-replay-compare.js`
  - `tools/legacy-truth-collector-v0.1.1.user.js`
  - `data/legacy-defenders.js`
  - `data/legacy-defenders-meta-v2-curated.js`
  - `data/legacy-defs.js`
  - `data/truth/legacy-truth-targeted-3x2-maul-crystal-check.json`
  - `data/truth/legacy-truth-current-attacker-vs-meta.json`
  - `data/truth/legacy-truth-meta16-two-attackers.json`
  - `data/truth/legacy-truth-original15-two-attackers.json`
- Prefer deleting only clearly temporary debug artifacts:
  - summary markdowns
  - temp sim / exact copies
  - compile/diag/replay temp text files
  - ad hoc debug result folders such as `results/debug-maul-path/`
  - replay outputs not in the preserved regression set
- Before deleting, check whether each file is tracked:
  - use `git rm` for tracked files
  - use `rm -rf` for untracked or ignored files
- After cleanup, always show:
  - exact commands run
  - final `git status --short`
  - short summary of what was removed
- Do not commit unless explicitly asked.
