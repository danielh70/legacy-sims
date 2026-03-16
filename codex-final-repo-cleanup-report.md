# codex-final-repo-cleanup-report

## Files deleted

Exact root files deleted:

- `.DS_Store`
- `results.txt`
- `codex-dl-riftcore-bio-diagnosis-report.md`
- `codex-dl-riftcore-bio-harness-report.md`
- `codex-droid-applied-damage-proof-report.md`
- `codex-droid-lane-diagnosis-report.md`
- `codex-droid-shared-hit-family-proof-report.md`
- `codex-droid-split-decomposition-report.md`
- `codex-droid-truth-pack-reconciliation-report.md`
- `codex-droid-vs-hf-shell-diff-report.md`
- `codex-final-post-parking-go-no-go-report.md`
- `codex-global-armor-k-sanity-report.md`
- `codex-hf-truth-pack-stop-go-report.md`
- `codex-lane-probe-harness-reaper-report.md`
- `codex-port-rollback-winner-c-to-brute-report.md`
- `codex-post-bio-restore-residual-ranking-report.md`
- `codex-post-droid-residual-ranking-report.md`
- `codex-reaper-first-attacker-sensitivity-report.md`
- `codex-reaper-first-mixed-melee-diagnosis-report.md`
- `codex-sg1-bombs-cluster-harness-report.md`
- `codex-sg1-bombs-downstream-refinement-report.md`
- `codex-sg1-bombs-landing-sanity-report.md`
- `codex-sg1-bombs-remaining-regression-report.md`

Removed recursively:

- `tmp/` — all investigation-only probe configs, temp sims, replay outputs, logs, helper scripts, and generated truth/debug artifacts under that tree
- `results/` — generated replay output tree

Tracked deletion snapshot after cleanup:

- `23` deleted root files
- `1211` deleted tracked files under `tmp/`

## Files moved / renamed

- `data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json` was retained as the normalized location for the merged cstaff full-15 truth pack

## Files edited only to update references / paths

- `legacy-chat-handoff-2026-03-15-continuation.md`
- `codex-full-rollback-vs-k-report.md`
- `codex-apply-rollback-winner-c-report.md`

## Exact commands run

```bash
git status --short
find . -maxdepth 1 -mindepth 1 | sort
find . -maxdepth 2 \( -name '.DS_Store' -o -name 'codex-*.md' -o -path './tmp/*' -o -name 'legacy-truth-*.json' \) | sort
git ls-files

rg -n "codex-[^ ]+\.md|tmp/|legacy-truth-[^ )\\]]+\.json" ./AGENTS.md ./README.md ./legacy-chat-handoff-2026-03-15-continuation.md ./codex-full-rollback-vs-k-report.md ./codex-apply-rollback-winner-c-report.md
rg -n "legacy-truth-v4-custom-cstaff-full15-merged.json|legacy-truth-current-attacker-vs-meta.json" ./README.md ./tools ./sim_ui ./simulator ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./data ./package.json
find ./results -maxdepth 2 -type f | sort | sed 's#^./##'

rg -n "legacy-defs\.js|legacy-defenders\.js|results/|results\.txt|codex-port-rollback-winner-c-to-brute-report\.md|legacy-truth-v4-custom-cstaff-full15-merged\.json" .
sed -n '1,40p' ./legacy-chat-handoff-2026-03-15-continuation.md
sed -n '130,180p' ./legacy-chat-handoff-2026-03-15-continuation.md
sed -n '260,325p' ./legacy-chat-handoff-2026-03-15-continuation.md
rg -n "codex-[^ ]+\.md" ./legacy-chat-handoff-2026-03-15-continuation.md

git mv ./data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json ./data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json
git rm -f ./.DS_Store ...
git rm -r -f ./results ./tmp

mv ./data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json ./data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json
find . -maxdepth 1 \( -name '.DS_Store' -o -name 'results.txt' -o -name 'codex-dl-riftcore-bio-diagnosis-report.md' -o -name 'codex-dl-riftcore-bio-harness-report.md' -o -name 'codex-droid-applied-damage-proof-report.md' -o -name 'codex-droid-lane-diagnosis-report.md' -o -name 'codex-droid-shared-hit-family-proof-report.md' -o -name 'codex-droid-split-decomposition-report.md' -o -name 'codex-droid-truth-pack-reconciliation-report.md' -o -name 'codex-droid-vs-hf-shell-diff-report.md' -o -name 'codex-final-post-parking-go-no-go-report.md' -o -name 'codex-global-armor-k-sanity-report.md' -o -name 'codex-hf-truth-pack-stop-go-report.md' -o -name 'codex-lane-probe-harness-reaper-report.md' -o -name 'codex-port-rollback-winner-c-to-brute-report.md' -o -name 'codex-post-bio-restore-residual-ranking-report.md' -o -name 'codex-post-droid-residual-ranking-report.md' -o -name 'codex-reaper-first-attacker-sensitivity-report.md' -o -name 'codex-reaper-first-mixed-melee-diagnosis-report.md' -o -name 'codex-sg1-bombs-cluster-harness-report.md' -o -name 'codex-sg1-bombs-downstream-refinement-report.md' -o -name 'codex-sg1-bombs-landing-sanity-report.md' -o -name 'codex-sg1-bombs-remaining-regression-report.md' \) -delete
find ./results -depth -mindepth 1 -delete
find ./tmp -depth -mindepth 1 -delete
rmdir ./results
rmdir ./tmp

node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
node -e "require('./legacy-defs.js'); require('./legacy-defenders.js'); console.log('wrapper-path-ok')"
rg -n "codex-(dl-riftcore-bio-diagnosis|dl-riftcore-bio-harness|droid-applied-damage-proof|droid-lane-diagnosis|droid-shared-hit-family-proof|droid-split-decomposition|droid-truth-pack-reconciliation|droid-vs-hf-shell-diff|final-post-parking-go-no-go|global-armor-k-sanity|hf-truth-pack-stop-go|lane-probe-harness-reaper|port-rollback-winner-c-to-brute|post-bio-restore-residual-ranking|post-droid-residual-ranking|reaper-first-attacker-sensitivity|reaper-first-mixed-melee-diagnosis|sg1-bombs-cluster-harness|sg1-bombs-downstream-refinement|sg1-bombs-landing-sanity|sg1-bombs-remaining-regression)\.md|tmp/legacy-truth-current-attacker-vs-meta\.json|tmp/legacy-truth-v4-custom-cstaff-full15-merged\.json" ./AGENTS.md ./README.md ./legacy-chat-handoff-2026-03-15-continuation.md ./codex-full-rollback-vs-k-report.md ./codex-apply-rollback-winner-c-report.md ./legacy-sim-v1.0.4-clean.js ./brute-sim-v1.4.6.js ./tools ./sim_ui ./simulator ./package.json
git status --short
```

Sandbox note:

- `git mv` / `git rm` were attempted first, but the sandbox blocked `.git/index.lock` creation
- cleanup was therefore applied with plain filesystem move/delete commands inside the working tree

## Reference / path update confirmation

Updated where needed:

- the kept handoff no longer points at deleted intermediate reports
- the kept handoff now references:
  - `data/truth/legacy-truth-current-attacker-vs-meta.json`
  - `data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json`
- the two retained final reports now explicitly mark their `tmp` probe paths as historical cleanup-removed artifacts

Dead-reference check:

- the final `rg` sweep over retained docs/code returned no matches for deleted root reports or the old `tmp` truth paths

## Verification

Passed:

- `node --check ./legacy-sim-v1.0.4-clean.js`
- `node --check ./brute-sim-v1.4.6.js`
- `node -e "require('./legacy-defs.js'); require('./legacy-defenders.js'); console.log('wrapper-path-ok')"`

## Rationale

Kept:

- live simulators, branch docs, data, tools, UI/app code, compatibility wrappers, and truth JSONs that still serve as reference artifacts
- the two retained final-state reports:
  - `codex-full-rollback-vs-k-report.md`
  - `codex-apply-rollback-winner-c-report.md`

Removed:

- intermediate Codex investigation reports that no longer drive the accepted branch state
- generated replay output, probe configs, temp sim copies, debug logs, one-off helper scripts, and other `tmp/` / `results/` artifacts

Did not do:

- no simulator behavior changes
- no import/path changes outside the kept documentation/reference surfaces
- no git history rewrites

repo cleanup applied and verified
