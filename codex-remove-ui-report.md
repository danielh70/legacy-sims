# codex-remove-ui-report

## Files deleted

25 tracked files removed via `git rm -r sim_ui/`:

- `sim_ui/.gitignore`
- `sim_ui/app/api/sim/route.ts`
- `sim_ui/app/globals.css`
- `sim_ui/app/layout.tsx`
- `sim_ui/app/page.tsx`
- `sim_ui/components/build-panel.tsx`
- `sim_ui/components/legacy-icon.tsx`
- `sim_ui/components/result-card.tsx`
- `sim_ui/components/sim-workbench.tsx`
- `sim_ui/components/slot-editor.tsx`
- `sim_ui/lib/engine/catalogs.ts`
- `sim_ui/lib/engine/legacy-source.ts`
- `sim_ui/lib/engine/sim-engine.ts`
- `sim_ui/lib/engine/types.ts`
- `sim_ui/lib/ui/build-ux.ts`
- `sim_ui/lib/ui/layout-system.ts`
- `sim_ui/lib/ui/legacy-icons.ts`
- `sim_ui/next-env.d.ts`
- `sim_ui/next.config.ts`
- `sim_ui/package-lock.json`
- `sim_ui/package.json`
- `sim_ui/postcss.config.mjs`
- `sim_ui/scripts/sanity-check.mjs`
- `sim_ui/tailwind.config.ts`
- `sim_ui/tsconfig.json`

Untracked artifacts removed via `rm -rf sim_ui/`:

- `sim_ui/.next/` (build cache)
- `sim_ui/node_modules/` (dependencies)
- `sim_ui/tsconfig.tsbuildinfo`

## Files edited

3 root files edited:

### `package.json`

Removed 3 scripts:
- `"ui": "npm --prefix sim_ui run dev"`
- `"ui:build": "npm --prefix sim_ui run build"`
- `"ui:typecheck": "npm --prefix sim_ui run typecheck"`

Remaining scripts untouched: `legacy`, `brute`, `compare`, `verify`.

### `README.md`

Removed:
- Description suffix: `plus the \`sim_ui\` Next.js workbench`
- Repo layout entry: `- \`sim_ui/\`: canonical Next.js UI app.`
- Entire "Install UI dependencies once" section (npm --prefix sim_ui install)
- Entire "Run the UI" section (npm run ui)
- Entire "Build or typecheck the UI" section (npm run ui:build, npm run ui:typecheck)

### `.gitignore`

Removed 4 lines:
- `sim_ui/.next/`
- `sim_ui/node_modules/`
- `sim_ui/out/`
- `sim_ui/*.tsbuildinfo`

## References coupled to UI outside `sim_ui/`

Only occurrence: `codex-final-repo-cleanup-report.md` mentions `sim_ui` in two historical grep commands (lines 60 and 83) and once as "UI/app code" (line 118). These are historical records of a past cleanup, not live dependencies. **Left untouched.**

## Non-UI files touched

None. No simulator, data, tools, or archive files were modified.

## Verification commands run

```bash
# 1. Confirm sim_ui/ directory is gone
ls -d sim_ui  # -> No such file or directory

# 2. Search for remaining "sim_ui" references (excluding historical report)
rg -n "sim_ui" .
# Only matches: codex-final-repo-cleanup-report.md lines 60, 83 (historical grep commands)

# 3. Search for remaining UI script references
rg -n "ui:build|ui:typecheck|npm run ui\b|npm --prefix sim_ui" .
# No matches

# 4. Search for "Next.js workbench" references
rg -n "Next\.js.*workbench" .
# No matches

# 5. Validate package.json is valid JSON
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json valid')"
# -> package.json valid
```

## Final `git status --short`

```
 M .gitignore
 M README.md
 M package.json
D  sim_ui/.gitignore
D  sim_ui/app/api/sim/route.ts
D  sim_ui/app/globals.css
D  sim_ui/app/layout.tsx
D  sim_ui/app/page.tsx
D  sim_ui/components/build-panel.tsx
D  sim_ui/components/legacy-icon.tsx
D  sim_ui/components/result-card.tsx
D  sim_ui/components/sim-workbench.tsx
D  sim_ui/components/slot-editor.tsx
D  sim_ui/lib/engine/catalogs.ts
D  sim_ui/lib/engine/legacy-source.ts
D  sim_ui/lib/engine/sim-engine.ts
D  sim_ui/lib/engine/types.ts
D  sim_ui/lib/ui/build-ux.ts
D  sim_ui/lib/ui/layout-system.ts
D  sim_ui/lib/ui/legacy-icons.ts
D  sim_ui/next-env.d.ts
D  sim_ui/next.config.ts
D  sim_ui/package-lock.json
D  sim_ui/package.json
D  sim_ui/postcss.config.mjs
D  sim_ui/scripts/sanity-check.mjs
D  sim_ui/tailwind.config.ts
D  sim_ui/tsconfig.json
```

## Verdict

The repo is now cleanly UI-free. All `sim_ui/` files are deleted, all root-level UI references are removed, and no simulator/brute/combat logic was touched. The only remaining `sim_ui` string is in a historical cleanup report documenting past grep commands — this is not a live dependency.
