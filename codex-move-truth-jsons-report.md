# codex-move-truth-jsons-report

## Files moved

- `legacy-truth-current-attacker-vs-meta.json` -> `data/truth/legacy-truth-current-attacker-vs-meta.json`
- `legacy-truth-droid-shell-probe-2x4.json` -> `data/truth/legacy-truth-droid-shell-probe-2x4.json`
- `legacy-truth-hf-scythe-shell-probe-2x4.json` -> `data/truth/legacy-truth-hf-scythe-shell-probe-2x4.json`
- `legacy-truth-meta16-two-attackers.json` -> `data/truth/legacy-truth-meta16-two-attackers.json`
- `legacy-truth-original15-two-attackers.json` -> `data/truth/legacy-truth-original15-two-attackers.json`
- `legacy-truth-targeted-3x2-maul-crystal-check.json` -> `data/truth/legacy-truth-targeted-3x2-maul-crystal-check.json`
- `legacy-truth-v4-custom-cstaff-full15-merged.json` -> `data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json`
- `legacy-truth-v4-custom-cstaff-gap6.json` -> `data/truth/legacy-truth-v4-custom-cstaff-gap6.json`
- `legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json` -> `data/truth/legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json`
- `legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json` -> `data/truth/legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json`

## Files edited to update references / paths

- `AGENTS.md`
- `legacy-chat-handoff-2026-03-15-continuation.md`
- `tools/legacy-truth-collector-v0.1.1.user.js`
- `codex-final-repo-cleanup-report.md`
- `data/truth/legacy-truth-meta16-two-attackers.json`
- `data/truth/legacy-truth-original15-two-attackers.json`
- `data/truth/legacy-truth-v4-custom-cstaff-full15-merged.json`

## Exact commands run

```bash
sed -n '1,260p' ./AGENTS.md
find . -maxdepth 1 -type f \( -name 'legacy-truth-*.json' \) | sort
find ./data/truth -maxdepth 1 -type f | sort
rg -n "legacy-truth-current-attacker-vs-meta\.json|legacy-truth-droid-shell-probe-2x4\.json|legacy-truth-hf-scythe-shell-probe-2x4\.json|legacy-truth-meta16-two-attackers\.json|legacy-truth-original15-two-attackers\.json|legacy-truth-targeted-3x2-maul-crystal-check\.json|legacy-truth-v4-custom-cstaff-full15-merged\.json|legacy-truth-v4-custom-cstaff-gap6\.json|legacy-truth-v4-custom-maul-a4-dl-abyss-full15\.json|legacy-truth-v4-custom-maul-a4-sg1-pink-full15\.json" .

sed -n '210,222p' ./AGENTS.md
sed -n '1088,1112p' ./tools/legacy-truth-collector-v0.1.1.user.js
node - <<'NODE'
const fs=require('fs');
const files=['legacy-truth-current-attacker-vs-meta.json','legacy-truth-droid-shell-probe-2x4.json','legacy-truth-hf-scythe-shell-probe-2x4.json','legacy-truth-meta16-two-attackers.json','legacy-truth-original15-two-attackers.json','legacy-truth-targeted-3x2-maul-crystal-check.json','legacy-truth-v4-custom-cstaff-full15-merged.json','legacy-truth-v4-custom-cstaff-gap6.json','legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json','legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json'];
for(const f of files){
 const s=fs.readFileSync(f,'utf8');
 const m=s.match(/"outputFile"\s*:\s*"([^"]+)"/);
 console.log(f+'\t'+(m?m[1]:'<none>'));
}
NODE
sed -n '35,110p' ./codex-final-repo-cleanup-report.md

mkdir -p ./data/truth
mv ./legacy-truth-current-attacker-vs-meta.json ./legacy-truth-droid-shell-probe-2x4.json ./legacy-truth-hf-scythe-shell-probe-2x4.json ./legacy-truth-meta16-two-attackers.json ./legacy-truth-original15-two-attackers.json ./legacy-truth-targeted-3x2-maul-crystal-check.json ./legacy-truth-v4-custom-cstaff-full15-merged.json ./legacy-truth-v4-custom-cstaff-gap6.json ./legacy-truth-v4-custom-maul-a4-dl-abyss-full15.json ./legacy-truth-v4-custom-maul-a4-sg1-pink-full15.json ./data/truth/

rg -n "\./legacy-truth-current-attacker-vs-meta\.json|\./legacy-truth-droid-shell-probe-2x4\.json|\./legacy-truth-hf-scythe-shell-probe-2x4\.json|\./legacy-truth-meta16-two-attackers\.json|\./legacy-truth-original15-two-attackers\.json|\./legacy-truth-targeted-3x2-maul-crystal-check\.json|\./legacy-truth-v4-custom-cstaff-full15-merged\.json|\./legacy-truth-v4-custom-cstaff-gap6\.json|\./legacy-truth-v4-custom-maul-a4-dl-abyss-full15\.json|\./legacy-truth-v4-custom-maul-a4-sg1-pink-full15\.json|tmp/legacy-truth-current-attacker-vs-meta\.json|tmp/legacy-truth-v4-custom-cstaff-full15-merged\.json" .
rg -n "legacy-truth-current-attacker-vs-meta\.json|legacy-truth-droid-shell-probe-2x4\.json|legacy-truth-hf-scythe-shell-probe-2x4\.json|legacy-truth-meta16-two-attackers\.json|legacy-truth-original15-two-attackers\.json|legacy-truth-targeted-3x2-maul-crystal-check\.json|legacy-truth-v4-custom-cstaff-full15-merged\.json|legacy-truth-v4-custom-cstaff-gap6\.json|legacy-truth-v4-custom-maul-a4-dl-abyss-full15\.json|legacy-truth-v4-custom-maul-a4-sg1-pink-full15\.json" .

node --check ./legacy-sim-v1.0.4-clean.js
node --check ./brute-sim-v1.4.6.js
rg -n "\./legacy-truth-current-attacker-vs-meta\.json|\./legacy-truth-droid-shell-probe-2x4\.json|\./legacy-truth-hf-scythe-shell-probe-2x4\.json|\./legacy-truth-meta16-two-attackers\.json|\./legacy-truth-original15-two-attackers\.json|\./legacy-truth-targeted-3x2-maul-crystal-check\.json|\./legacy-truth-v4-custom-cstaff-full15-merged\.json|\./legacy-truth-v4-custom-cstaff-gap6\.json|\./legacy-truth-v4-custom-maul-a4-dl-abyss-full15\.json|\./legacy-truth-v4-custom-maul-a4-sg1-pink-full15\.json|tmp/legacy-truth-current-attacker-vs-meta\.json|tmp/legacy-truth-v4-custom-cstaff-full15-merged\.json" .
find ./data/truth -maxdepth 1 -type f | sort | sed 's#^./##'
git status --short
```

## Reference update confirmation

Updated:

- `AGENTS.md` preserved-path list now points at `data/truth/...`
- `legacy-chat-handoff-2026-03-15-continuation.md` now points at `./data/truth/...`
- `tools/legacy-truth-collector-v0.1.1.user.js` example output path now points at `data/truth/...`
- retained cleanup documentation now points at the normalized `data/truth/...` location
- truth-pack self-metadata `outputFile` values were updated where present

Lightweight grep verification:

- the final old-path grep returned exit code `1`, which means no retained references still point at the old root-level or `tmp/` paths for the moved truth JSONs

## Verification

Passed:

- `node --check ./legacy-sim-v1.0.4-clean.js`
- `node --check ./brute-sim-v1.4.6.js`

Current truth-pack location check:

- all requested files now live under `data/truth/`

truth JSONs moved to data/truth and references updated
