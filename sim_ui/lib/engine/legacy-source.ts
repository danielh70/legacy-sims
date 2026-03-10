import 'server-only';

import path from 'node:path';
import { pathToFileURL } from 'node:url';

declare global {
  var __legacyModulesPromise:
    | Promise<{
        legacySim: any;
        legacyDefs: any;
        legacyDefenders: any;
        repoRoot: string;
      }>
    | undefined;
}

const repoRoot = path.resolve(process.cwd(), '..');

function unwrapModule<T>(mod: T): T {
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    return ((mod as unknown as { default: T }).default);
  }
  return mod;
}

export async function loadLegacyModules() {
  if (!globalThis.__legacyModulesPromise) {
    globalThis.__legacyModulesPromise = (async () => {
      const [legacySimMod, legacyDefsMod, legacyDefendersMod] = await Promise.all([
        import(
          /* webpackIgnore: true */ pathToFileURL(
            path.join(repoRoot, 'archive', 'legacy-sim-v1.0.4-ui.js'),
          ).href
        ),
        import(
          /* webpackIgnore: true */ pathToFileURL(
            path.join(repoRoot, 'data', 'legacy-defs.js'),
          ).href
        ),
        import(
          /* webpackIgnore: true */ pathToFileURL(
            path.join(repoRoot, 'data', 'legacy-defenders.js'),
          ).href
        ),
      ]);

      return {
        legacySim: unwrapModule(legacySimMod),
        legacyDefs: unwrapModule(legacyDefsMod),
        legacyDefenders: unwrapModule(legacyDefendersMod),
        repoRoot,
      };
    })();
  }

  return globalThis.__legacyModulesPromise;
}
